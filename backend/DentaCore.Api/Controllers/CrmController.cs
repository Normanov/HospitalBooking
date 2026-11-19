using System.Security.Claims;
using System.Text.Json;
using DentaCore.Api.Auth;
using DentaCore.Infrastructure.Persistence;
using DentaCore.Domain;
using DentaCore.Api.Realtime;
using DentaCore.Application.Appointments;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace DentaCore.Api.Controllers;

[ApiController]
[Route("api/v1/crm")]
[Authorize(Policy = "Staff")]
public sealed class CrmController(
    AppDbContext db,
    IHubContext<ClinicHub> hub,
    ISender sender) : ControllerBase
{
    [HttpGet("me/permissions")]
    public async Task<IActionResult> MyPermissions(CancellationToken cancellationToken)
    {
        var userId = User.UserId();
        if (!userId.HasValue)
            return Forbid();
        if (User.Role() == RoleNames.SuperAdmin)
        {
            var all = await db.Permissions.AsNoTracking()
                .ToDictionaryAsync(item => item.Code, _ => true, cancellationToken);
            return Ok(all);
        }

        var roleId = await db.Users.AsNoTracking()
            .Where(item => item.Id == userId.Value && item.IsActive)
            .Select(item => (int?)item.RoleId)
            .SingleOrDefaultAsync(cancellationToken);
        if (!roleId.HasValue)
            return Forbid();

        var permissions = await db.Permissions.AsNoTracking()
            .Select(item => new { item.Id, item.Code })
            .ToListAsync(cancellationToken);
        var roleGrants = await db.RolePermissions.AsNoTracking()
            .Where(item => item.RoleId == roleId.Value)
            .ToDictionaryAsync(item => item.PermissionId, item => item.IsGranted, cancellationToken);
        var userGrants = await db.UserPermissions.AsNoTracking()
            .Where(item => item.UserId == userId.Value)
            .ToDictionaryAsync(item => item.PermissionId, item => item.IsGranted, cancellationToken);
        return Ok(permissions.ToDictionary(
            item => item.Code,
            item => userGrants.TryGetValue(item.Id, out var userGrant)
                ? userGrant
                : roleGrants.GetValueOrDefault(item.Id)));
    }

    [HttpGet("me/compensation")]
    [Authorize(Roles = RoleNames.Doctor)]
    [Authorize(Policy = "Billing.View")]
    public async Task<IActionResult> MyCompensation(CancellationToken cancellationToken)
    {
        if (!Guid.TryParse(User.FindFirstValue("doctorId"), out var doctorId))
                return Forbid();
        var doctor = await db.Doctors.AsNoTracking()
                .Where(item => item.Id == doctorId)
                .Select(item => new { item.FullName, item.BaseSalary, item.ProfitSharePercent })
                .SingleOrDefaultAsync(cancellationToken);
        if (doctor is null)
                return NotFound();

        var now = DateTime.UtcNow;
        var monthStart = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var nextMonth = monthStart.AddMonths(1);
        var paymentAmounts = await db.Payments.AsNoTracking()
                .Where(item => item.Invoice.DoctorId == doctorId &&
                    item.CreatedAt >= monthStart && item.CreatedAt < nextMonth)
                .Select(item => item.Amount)
                .ToListAsync(cancellationToken);
        var paidRevenue = paymentAmounts.Sum();
        return Ok(new
        {
                doctor = doctor.FullName,
                month = monthStart.ToString("yyyy-MM"),
                doctor.BaseSalary,
                paidRevenue,
                revenueShare = paidRevenue * doctor.ProfitSharePercent / 100m
        });
    }

    [HttpGet("appointments")]
    [Authorize(Policy = "Calendar.View")]
    public async Task<IActionResult> Appointments(
        [FromQuery] DateOnly? from,
        [FromQuery] DateOnly? to,
        CancellationToken cancellationToken)
    {
        var query = db.Appointments.AsNoTracking().AsQueryable();
        if (from.HasValue)
            query = query.Where(item => item.Date >= from.Value);
        if (to.HasValue)
            query = query.Where(item => item.Date <= to.Value);
        if (User.Role() == RoleNames.Doctor)
        {
            var doctorId = User.FindFirstValue("doctorId");
            if (!Guid.TryParse(doctorId, out var ownDoctorId))
                return Forbid();
            query = query.Where(item => item.DoctorId == ownDoctorId);
        }

        var canReadContact = await UserCanReadContactAsync(cancellationToken);
        var appointments = await query.OrderBy(item => item.Date).ThenBy(item => item.StartTime)
            .Select(item => new
            {
                item.Id, item.DoctorId, doctorName = item.Doctor.FullName,
                item.PatientId, patientName = item.Patient.FullName,
                patientPhone = canReadContact ? item.Patient.PhoneNumber : null,
                item.ServiceId, serviceName = item.Service == null ? null : item.Service.Name,
                item.Date, item.StartTime, item.EndTime, item.Status, item.Source,
                item.BookingCode, item.CreatedAt
            }).ToListAsync(cancellationToken);
        return Ok(appointments);
    }

    [HttpGet("patients")]
    [Authorize(Policy = "PatientsDb.View")]
    public async Task<IActionResult> Patients(
        [FromQuery] string? search,
        CancellationToken cancellationToken)
    {
        var query = db.Patients.AsNoTracking().AsQueryable();
        if (User.Role() == RoleNames.Doctor)
        {
            if (!Guid.TryParse(User.FindFirstValue("doctorId"), out var doctorId))
                return Forbid();
            query = query.Where(patient => db.Appointments.Any(appointment =>
                appointment.PatientId == patient.Id && appointment.DoctorId == doctorId));
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            query = query.Where(patient =>
                patient.FullName.Contains(term) || patient.PhoneNumber.Contains(term));
        }

        var canReadContact = await UserCanReadContactAsync(cancellationToken);
        var patientRows = await query.OrderBy(patient => patient.FullName)
            .Select(patient => new
            {
                patient.Id,
                patient.FullName,
                phoneNumber = canReadContact ? patient.PhoneNumber : null,
                patient.BirthDate,
                patient.Gender,
                patient.CreatedAt,
                patient.LastVisit
            }).ToListAsync(cancellationToken);
        var patientIds = patientRows.Select(item => item.Id).ToArray();
        var debtRows = await db.Invoices.AsNoTracking()
            .Where(invoice => patientIds.Contains(invoice.PatientId) && invoice.Status != InvoiceStatus.Cancelled)
            .Select(invoice => new { invoice.PatientId, invoice.DebtAmount })
            .ToListAsync(cancellationToken);
        var debts = debtRows.GroupBy(item => item.PatientId)
            .ToDictionary(group => group.Key, group => group.Sum(item => item.DebtAmount));
        return Ok(patientRows.Select(patient => new
        {
            patient.Id,
            patient.FullName,
            patient.phoneNumber,
            patient.BirthDate,
            patient.Gender,
            patient.CreatedAt,
            patient.LastVisit,
            totalDebt = debts.GetValueOrDefault(patient.Id)
        }));
    }

    [HttpPost("patients")]
    [Authorize(Roles = "SuperAdmin,Receptionist")]
    [Authorize(Policy = "PatientsDb.Edit")]
    public async Task<IActionResult> CreatePatient(
        CreatePatientRequest request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.FullName) || request.FullName.Trim().Length > 160 ||
            string.IsNullOrWhiteSpace(request.PhoneNumber) || request.PhoneNumber.Trim().Length > 32 ||
            request.Notes?.Length > 2000)
            return UnprocessableEntity(new ProblemDetails { Status = 422, Title = "Bemor ma’lumotlari noto‘g‘ri." });

        var patient = new Patient
        {
            FullName = request.FullName.Trim(),
            PhoneNumber = request.PhoneNumber.Trim(),
            Gender = request.Gender is "Erkak" or "Ayol" ? request.Gender : "Erkak",
            BirthDate = request.BirthDate,
            Notes = request.Notes?.Trim()
        };
        db.Patients.Add(patient);
        await AddAuditAsync("patient.created", patient.Id.ToString(), cancellationToken);
        try
        {
            await db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException exception) when (PublicController.IsUniqueConstraintViolation(exception))
        {
            return Conflict(new ProblemDetails { Status = 409, Title = "Bu telefon raqami bilan bemor mavjud." });
        }

        return StatusCode(StatusCodes.Status201Created, new
        {
            patient.Id, patient.FullName, patient.PhoneNumber, patient.BirthDate,
            patient.Gender, patient.CreatedAt, patient.LastVisit, totalDebt = 0m
        });
    }

    [HttpGet("invoices")]
    [Authorize(Roles = "SuperAdmin,Receptionist")]
    [Authorize(Policy = "Billing.View")]
    public async Task<IActionResult> Invoices(CancellationToken cancellationToken)
    {
        var invoices = await db.Invoices.AsNoTracking()
            .OrderByDescending(invoice => invoice.CreatedAt)
            .Select(invoice => new
            {
                invoice.Id,
                invoice.AppointmentId,
                invoice.PatientId,
                patientName = invoice.Patient.FullName,
                invoice.DoctorId,
                doctorName = invoice.Doctor == null ? null : invoice.Doctor.FullName,
                invoice.ReceiptNumber,
                invoice.TotalAmount,
                invoice.DiscountAmount,
                invoice.PaidAmount,
                invoice.DebtAmount,
                invoice.Status,
                invoice.CreatedAt,
                items = invoice.Items.Select(item => new
                {
                    item.ServiceName, item.Quantity, item.UnitPrice
                }),
                payments = invoice.Payments.OrderBy(payment => payment.CreatedAt).Select(payment => new
                {
                    payment.Id, payment.Amount, payment.Method, payment.CreatedAt, payment.ReferenceCode
                })
            }).ToListAsync(cancellationToken);
        return Ok(invoices);
    }

    [HttpPost("appointments/{appointmentId:guid}/prescriptions")]
    [Authorize(Roles = "SuperAdmin,Doctor")]
    [Authorize(Policy = "Prescriptions.Edit")]
    public async Task<IActionResult> CreatePrescription(
        Guid appointmentId,
        CreatePrescriptionRequest request,
        CancellationToken cancellationToken)
    {
        if (request.Notes?.Length > 2000 || request.Items.Count is < 1 or > 30 ||
            request.Items.Any(item =>
                string.IsNullOrWhiteSpace(item.MedicineName) || item.MedicineName.Trim().Length > 200 ||
                string.IsNullOrWhiteSpace(item.Dosage) || item.Dosage.Trim().Length > 200 ||
                string.IsNullOrWhiteSpace(item.Duration) || item.Duration.Trim().Length > 120 ||
                item.Instructions?.Length > 1000))
            return UnprocessableEntity(new ProblemDetails { Status = 422, Title = "Retsept ma’lumotlari noto‘g‘ri." });

        var appointment = await db.Appointments.SingleOrDefaultAsync(
            item => item.Id == appointmentId, cancellationToken);
        if (appointment is null ||
            User.Role() == RoleNames.Doctor &&
            (!Guid.TryParse(User.FindFirstValue("doctorId"), out var doctorId) || appointment.DoctorId != doctorId))
            return NotFound();

        var prescription = new Prescription
        {
            PatientId = appointment.PatientId,
            DoctorId = appointment.DoctorId,
            AppointmentId = appointment.Id,
            Notes = request.Notes?.Trim(),
            Items = request.Items.Select(item => new PrescriptionItem
            {
                MedicineName = item.MedicineName.Trim(),
                Dosage = item.Dosage.Trim(),
                Duration = item.Duration.Trim(),
                Instructions = item.Instructions?.Trim() ?? string.Empty
            }).ToList()
        };
        db.Prescriptions.Add(prescription);
        await AddAuditAsync("prescription.created", prescription.Id.ToString(), cancellationToken);
        await db.SaveChangesAsync(cancellationToken);
        return StatusCode(StatusCodes.Status201Created, new
        {
            prescription.Id, prescription.PatientId, prescription.AppointmentId, prescription.IssuedAt
        });
    }

    [HttpPost("appointments")]
    [Authorize(Roles = "SuperAdmin,Receptionist")]
    [Authorize(Policy = "Calendar.Edit")]
    public async Task<IActionResult> CreateAppointment(
        CreateStaffAppointmentRequest request,
        CancellationToken cancellationToken)
    {
        var doctor = await db.Doctors.SingleOrDefaultAsync(
            item => item.Id == request.DoctorId && item.IsActive, cancellationToken);
        var patient = await db.Patients.SingleOrDefaultAsync(
            item => item.Id == request.PatientId, cancellationToken);
        var service = await db.Services.SingleOrDefaultAsync(
            item => item.Id == request.ServiceId && item.IsActive, cancellationToken);
        if (doctor is null || patient is null || service is null)
            return NotFound();
        if (!PublicController.ValidDuration(service.DurationMinutes) ||
            !PublicController.IsValidStart(request.StartTime) ||
            !doctor.WorksOn(request.Date.DayOfWeek) ||
            request.StartTime < doctor.StartHour ||
            request.StartTime.AddMinutes(service.DurationMinutes) > doctor.EndHour ||
            PublicController.CrossesLunch(doctor, request.StartTime, request.StartTime.AddMinutes(service.DurationMinutes)))
            return UnprocessableEntity(new ProblemDetails { Status = 422, Title = "Tanlangan vaqt shifokor grafigiga mos emas." });

        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        var appointment = new Appointment
        {
            DoctorId = doctor.Id,
            PatientId = patient.Id,
            ServiceId = service.Id,
            Date = request.Date,
            StartTime = request.StartTime,
            EndTime = request.StartTime.AddMinutes(service.DurationMinutes),
            Status = AppointmentStatus.Confirmed,
            Source = AppointmentSource.Crm,
            Notes = request.Notes?.Trim(),
            BookingCode = $"DC-{Guid.NewGuid():N}"[..9].ToUpperInvariant(),
            CreatedByUserId = User.UserId()
        };
        db.Appointments.Add(appointment);
        AddReservations(appointment, service.DurationMinutes);
        await AddAuditAsync("appointment.created", appointment.Id.ToString(), cancellationToken);
        try
        {
            await db.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
        }
        catch (DbUpdateException exception) when (PublicController.IsUniqueConstraintViolation(exception))
        {
            await transaction.RollbackAsync(cancellationToken);
            return Conflict(new ProblemDetails { Status = 409, Title = "Bu vaqt oralig‘i hozirgina band qilindi." });
        }

        await NotifyAppointmentAsync(appointment, cancellationToken);
        return StatusCode(StatusCodes.Status201Created, new
        {
            appointment.Id, appointment.DoctorId, appointment.PatientId, appointment.ServiceId,
            appointment.Date, appointment.StartTime, appointment.EndTime, appointment.Status, appointment.BookingCode
        });
    }

    [HttpPatch("appointments/{appointmentId:guid}/status")]
    [Authorize(Policy = "Calendar.Edit")]
    public async Task<IActionResult> ChangeStatus(
        Guid appointmentId,
        ChangeAppointmentStatusRequest request,
        CancellationToken cancellationToken)
    {
        Guid? doctorId = null;
        if (User.Role() == RoleNames.Doctor)
        {
            if (!Guid.TryParse(User.FindFirstValue("doctorId"), out var ownDoctorId))
                return Forbid();
            doctorId = ownDoctorId;
        }

        var result = await sender.Send(new ChangeAppointmentStatusCommand(
            appointmentId,
            request.Status,
            doctorId,
            User.UserId(),
            User.Identity?.Name ?? string.Empty,
            User.Role(),
            HttpContext.Connection.RemoteIpAddress?.ToString() ?? string.Empty), cancellationToken);

        return result switch
        {
            ChangeAppointmentStatusResult.Changed => NoContent(),
            ChangeAppointmentStatusResult.NotFound => NotFound(),
            ChangeAppointmentStatusResult.InvalidTransition => UnprocessableEntity(
                new ProblemDetails { Status = 422, Title = "Qabul holati uchun bu o‘zgarish ruxsat etilmagan." }),
            ChangeAppointmentStatusResult.Conflict => Conflict(
                new ProblemDetails { Status = 409, Title = "Qabul boshqa foydalanuvchi tomonidan o‘zgartirilgan." }),
            _ => throw new InvalidOperationException($"Unexpected appointment status result: {result}.")
        };
    }

    [HttpGet("patients/{patientId:guid}")]
    [Authorize(Policy = "PatientsDb.View")]
    public async Task<IActionResult> Patient(Guid patientId, CancellationToken cancellationToken)
    {
        if (!await CanAccessPatientAsync(patientId, cancellationToken))
            return NotFound();
        var query = db.Patients.AsNoTracking().Where(item => item.Id == patientId);
        var canReadContact = await UserCanReadContactAsync(cancellationToken);
        var patient = await query.Select(item => new
        {
            item.Id,
            item.FullName,
            phoneNumber = canReadContact ? item.PhoneNumber : null,
            item.BirthDate,
            item.Gender,
            item.CreatedAt,
            item.LastVisit
        }).SingleOrDefaultAsync(cancellationToken);
        if (patient is null)
            return NotFound();
        await AddAuditAsync("patient.read", patientId.ToString(), cancellationToken);
        await db.SaveChangesAsync(cancellationToken);
        return Ok(patient);
    }

    [HttpGet("patients/{patientId:guid}/odontogram")]
    [Authorize(Roles = "SuperAdmin,Doctor")]
    [Authorize(Policy = "Odontogram.View")]
    public async Task<IActionResult> Odontogram(Guid patientId, CancellationToken cancellationToken)
    {
        if (!await CanAccessPatientAsync(patientId, cancellationToken))
            return NotFound();
        var teeth = await db.ToothRecords.AsNoTracking().Where(item => item.PatientId == patientId)
            .OrderBy(item => item.ToothNumber)
            .Select(item => new ToothDto(item.ToothNumber, item.Condition, item.SurfacesJson,
                item.Diagnosis, item.TreatmentPlan, item.Cost, item.UpdatedAt))
            .ToListAsync(cancellationToken);
        await AddAuditAsync("odontogram.read", patientId.ToString(), cancellationToken);
        await db.SaveChangesAsync(cancellationToken);
        return Ok(teeth);
    }

    [HttpPut("patients/{patientId:guid}/odontogram")]
    [Authorize(Roles = "SuperAdmin,Doctor")]
    [Authorize(Policy = "Odontogram.Edit")]
    public async Task<IActionResult> UpdateOdontogram(
        Guid patientId,
        UpdateOdontogramRequest request,
        CancellationToken cancellationToken)
    {
        if (!await CanAccessPatientAsync(patientId, cancellationToken))
            return NotFound();
        if (request.Teeth.Count > 32 || request.Teeth.Any(tooth =>
                !ValidFdi(tooth.ToothNumber) ||
                !ToothCondition.All.Contains(tooth.Condition, StringComparer.Ordinal) ||
                tooth.Surfaces.Except(AllowedSurfaces).Any() ||
                tooth.Cost < 0 ||
                tooth.Diagnosis?.Length > 2000 ||
                tooth.TreatmentPlan?.Length > 2000) ||
            request.Teeth.Select(item => item.ToothNumber).Distinct().Count() != request.Teeth.Count)
            return UnprocessableEntity(new ProblemDetails { Status = 422, Title = "Tish formulasi ma’lumotlari noto‘g‘ri." });

        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        var existing = await db.ToothRecords.Where(item => item.PatientId == patientId).ToListAsync(cancellationToken);
        var existingByNumber = existing.ToDictionary(item => item.ToothNumber);
        foreach (var tooth in request.Teeth)
        {
            var surfacesJson = JsonSerializer.Serialize(tooth.Surfaces);
            if (existingByNumber.TryGetValue(tooth.ToothNumber, out var record))
            {
                db.ToothRecordHistory.Add(Snapshot(record));
                record.Condition = tooth.Condition;
                record.SurfacesJson = surfacesJson;
                record.Diagnosis = tooth.Diagnosis?.Trim();
                record.TreatmentPlan = tooth.TreatmentPlan?.Trim();
                record.Cost = tooth.Cost;
                record.UpdatedByUserId = User.UserId();
                record.UpdatedAt = DateTime.UtcNow;
            }
            else
            {
                record = new ToothRecord
                {
                    PatientId = patientId,
                    ToothNumber = tooth.ToothNumber,
                    Condition = tooth.Condition,
                    SurfacesJson = surfacesJson,
                    Diagnosis = tooth.Diagnosis?.Trim(),
                    TreatmentPlan = tooth.TreatmentPlan?.Trim(),
                    Cost = tooth.Cost,
                    UpdatedByUserId = User.UserId()
                };
                db.ToothRecords.Add(record);
                db.ToothRecordHistory.Add(new ToothRecordHistory
                {
                    ToothRecord = record,
                    PatientId = patientId,
                    ToothNumber = tooth.ToothNumber,
                    SnapshotJson = JsonSerializer.Serialize(tooth),
                    ChangedByUserId = User.UserId(),
                    ChangedByName = User.Identity?.Name ?? string.Empty
                });
            }
        }
        await AddAuditAsync("odontogram.updated", patientId.ToString(), cancellationToken);
        await db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return NoContent();
    }

    [HttpPost("appointments/{appointmentId:guid}/invoice")]
    [Authorize(Roles = "SuperAdmin,Receptionist")]
    [Authorize(Policy = "Billing.Edit")]
    public async Task<IActionResult> CreateInvoice(Guid appointmentId, CancellationToken cancellationToken)
    {
        var appointment = await db.Appointments.Include(item => item.Service).SingleOrDefaultAsync(
            item => item.Id == appointmentId, cancellationToken);
        if (appointment?.Service is null)
            return NotFound();
        if (await db.Invoices.AnyAsync(item => item.AppointmentId == appointmentId, cancellationToken))
            return Conflict(new ProblemDetails { Status = 409, Title = "Bu qabul uchun hisob-faktura mavjud." });

        var invoice = new Invoice
        {
            PatientId = appointment.PatientId,
            AppointmentId = appointment.Id,
            DoctorId = appointment.DoctorId,
            TotalAmount = appointment.Service.Price,
            DebtAmount = appointment.Service.Price,
            CreatedByUserId = User.UserId(),
            ReceiptNumber = $"DC-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid():N}"[..20].ToUpperInvariant(),
            Items =
            {
                new InvoiceItem
                {
                    ServiceId = appointment.ServiceId,
                    ServiceName = appointment.Service.Name,
                    UnitPrice = appointment.Service.Price,
                    Quantity = 1
                }
            }
        };
        db.Invoices.Add(invoice);
        await AddAuditAsync("invoice.created", invoice.Id.ToString(), cancellationToken);
        await db.SaveChangesAsync(cancellationToken);
        return StatusCode(StatusCodes.Status201Created, new
        {
            invoice.Id, invoice.ReceiptNumber, invoice.TotalAmount, invoice.DebtAmount, invoice.Status
        });
    }

    [HttpPost("invoices/{invoiceId:guid}/payments")]
    [Authorize(Roles = "SuperAdmin,Receptionist")]
    [Authorize(Policy = "Billing.Edit")]
    public async Task<IActionResult> AddPayment(
        Guid invoiceId,
        CreatePaymentRequest request,
        CancellationToken cancellationToken)
    {
        if (request.Amount <= 0 || !PaymentMethods.All.Contains(request.Method, StringComparer.Ordinal) ||
            request.ReferenceCode?.Length > 100)
            return UnprocessableEntity(new ProblemDetails { Status = 422, Title = "To‘lov ma’lumotlari noto‘g‘ri." });

        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        var invoice = await db.Invoices.AsNoTracking()
            .SingleOrDefaultAsync(item => item.Id == invoiceId, cancellationToken);
        if (invoice is null)
            return NotFound();
        if (invoice.Status == InvoiceStatus.Cancelled || request.Amount > invoice.DebtAmount)
            return UnprocessableEntity(new ProblemDetails { Status = 422, Title = "Bekor qilingan hisob yoki qarzdan ortiq to‘lov." });

        var updated = await db.Invoices
            .Where(item => item.Id == invoiceId && item.Status != InvoiceStatus.Cancelled &&
                item.DebtAmount >= request.Amount)
            .ExecuteUpdateAsync(update => update
                .SetProperty(item => item.PaidAmount, item => item.PaidAmount + request.Amount)
                .SetProperty(item => item.DebtAmount, item => item.DebtAmount - request.Amount)
                .SetProperty(item => item.Status, item =>
                    item.DebtAmount - request.Amount == 0 ? InvoiceStatus.Paid : InvoiceStatus.PartiallyPaid),
                cancellationToken);
        if (updated != 1)
        {
            await transaction.RollbackAsync(cancellationToken);
            return Conflict(new ProblemDetails { Status = 409, Title = "Hisob boshqa xodim tomonidan yangilandi; qoldiqni tekshiring." });
        }

        var payment = new Payment
        {
            InvoiceId = invoice.Id,
            PatientId = invoice.PatientId,
            Amount = request.Amount,
            Method = request.Method,
            ReferenceCode = request.ReferenceCode?.Trim() ?? string.Empty,
            ReceivedByUserId = User.UserId(),
            ReceivedByName = User.Identity?.Name ?? string.Empty
        };
        db.Payments.Add(payment);
        await AddAuditAsync("payment.created", payment.Id.ToString(), cancellationToken);
        await db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        var updatedInvoice = await db.Invoices.AsNoTracking()
            .Where(item => item.Id == invoiceId)
            .Select(item => new { item.PaidAmount, item.DebtAmount, item.Status })
            .SingleAsync(cancellationToken);
        await hub.Clients.Groups(["staff:SuperAdmin", "staff:Receptionist"])
            .SendAsync("BillingChanged", new { invoiceId, paymentId = payment.Id }, cancellationToken);
        return StatusCode(StatusCodes.Status201Created, new
        {
            payment.Id, payment.InvoiceId, payment.Amount, payment.Method, payment.CreatedAt,
            updatedInvoice.PaidAmount, updatedInvoice.DebtAmount, updatedInvoice.Status
        });
    }

    private Task<bool> CanAccessPatientAsync(Guid patientId, CancellationToken cancellationToken) =>
        User.Role() != RoleNames.Doctor
            ? Task.FromResult(true)
            : Guid.TryParse(User.FindFirstValue("doctorId"), out var doctorId)
                ? db.Appointments.AnyAsync(item => item.PatientId == patientId && item.DoctorId == doctorId, cancellationToken)
                : Task.FromResult(false);

    private async Task<bool> UserCanReadContactAsync(CancellationToken cancellationToken)
    {
        if (User.Role() == RoleNames.SuperAdmin)
            return true;
        if (User.UserId() is not Guid userId)
            return false;

        var permissionId = await db.Permissions.AsNoTracking()
            .Where(item => item.Code == "PatientContact.View")
            .Select(item => (int?)item.Id)
            .SingleOrDefaultAsync(cancellationToken);
        if (!permissionId.HasValue)
            return false;

        var userOverride = await db.UserPermissions.AsNoTracking()
            .Where(item => item.UserId == userId && item.PermissionId == permissionId.Value)
            .Select(item => (bool?)item.IsGranted)
            .SingleOrDefaultAsync(cancellationToken);
        if (userOverride.HasValue)
            return userOverride.Value;

        return await db.RolePermissions.AsNoTracking()
            .AnyAsync(item => item.Role.Name == User.Role() &&
                item.PermissionId == permissionId.Value && item.IsGranted, cancellationToken);
    }

    private void AddReservations(Appointment appointment, int duration)
    {
        foreach (var offset in Enumerable.Range(0, duration / 30))
            db.BookedSlots.Add(new BookedSlot
            {
                DoctorId = appointment.DoctorId,
                Date = appointment.Date,
                StartTime = appointment.StartTime.AddMinutes(offset * 30),
                AppointmentId = appointment.Id
            });
    }

    private ToothRecordHistory Snapshot(ToothRecord record) => new()
    {
        ToothRecordId = record.Id,
        PatientId = record.PatientId,
        ToothNumber = record.ToothNumber,
        SnapshotJson = JsonSerializer.Serialize(new
        {
            record.Condition,
            surfaces = JsonSerializer.Deserialize<JsonElement>(record.SurfacesJson),
            record.Diagnosis,
            record.TreatmentPlan,
            record.Cost,
            record.UpdatedAt
        }),
        ChangedByUserId = User.UserId(),
        ChangedByName = User.Identity?.Name ?? string.Empty
    };

    private async Task AddAuditAsync(string action, string resource, CancellationToken cancellationToken)
    {
        db.AuditLogs.Add(new AuditLog
        {
            ActorUserId = User.UserId(),
            Actor = User.Identity?.Name ?? string.Empty,
            ActorRole = User.Role(),
            Action = action,
            Resource = resource,
            IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? string.Empty,
            Status = AuditStatus.Success
        });
        await Task.CompletedTask;
    }

    private Task NotifyAppointmentAsync(Appointment appointment, CancellationToken cancellationToken) =>
        hub.Clients.Groups([
            "staff:SuperAdmin", "staff:Receptionist",
            $"doctor:{appointment.DoctorId}", $"patient:{appointment.PatientId}"
        ]).SendAsync("AppointmentChanged", new
        {
            appointmentId = appointment.Id,
            doctorId = appointment.DoctorId,
            patientId = appointment.PatientId,
            appointment.Date,
            appointment.StartTime,
            appointment.Status
        }, cancellationToken);

    private static bool ValidFdi(int number) =>
        number / 10 is >= 1 and <= 4 && number % 10 is >= 1 and <= 8;

    private static readonly string[] AllowedSurfaces =
        ["Occlusal", "Mesial", "Distal", "Buccal", "Lingual"];
}

public sealed record CreateStaffAppointmentRequest(
    Guid DoctorId, Guid PatientId, Guid ServiceId, DateOnly Date, TimeOnly StartTime, string? Notes);
public sealed record CreatePatientRequest(
    string FullName, string PhoneNumber, string? Gender, DateOnly? BirthDate, string? Notes);
public sealed record ChangeAppointmentStatusRequest(string Status);
public sealed record CreatePrescriptionItemRequest(
    string MedicineName, string Dosage, string Duration, string? Instructions);
public sealed record CreatePrescriptionRequest(string? Notes, List<CreatePrescriptionItemRequest> Items);
public sealed record ToothUpdateRequest(
    int ToothNumber, string Condition, string[] Surfaces, string? Diagnosis, string? TreatmentPlan, decimal Cost);
public sealed record UpdateOdontogramRequest(List<ToothUpdateRequest> Teeth);
public sealed record ToothDto(
    int ToothNumber, string Condition, string SurfacesJson, string? Diagnosis, string? TreatmentPlan,
    decimal Cost, DateTime UpdatedAt);
public sealed record CreatePaymentRequest(decimal Amount, string Method, string? ReferenceCode);
