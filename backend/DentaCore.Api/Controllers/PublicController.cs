using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using DentaCore.Api.Auth;
using DentaCore.Infrastructure.Persistence;
using DentaCore.Domain;
using DentaCore.Api.Realtime;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace DentaCore.Api.Controllers;

[ApiController]
[Route("api/v1/public")]
public sealed class PublicController(
    AppDbContext db,
    IHubContext<ClinicHub> hub) : ControllerBase
{
    [HttpGet("doctors")]
    [AllowAnonymous]
    public async Task<IActionResult> Doctors(CancellationToken cancellationToken)
    {
        var doctors = await db.Doctors.AsNoTracking().Where(item => item.IsActive)
            .OrderBy(item => item.FullName)
            .Select(item => new
            {
                item.Id, item.FullName, item.Specialty, item.ColorCode,
                item.ExperienceYears, item.Rating
            }).ToListAsync(cancellationToken);
        return Ok(doctors);
    }

    [HttpGet("services")]
    [AllowAnonymous]
    public async Task<IActionResult> Services(CancellationToken cancellationToken)
    {
        var services = await db.Services.AsNoTracking().Where(item => item.IsActive)
            .OrderBy(item => item.Category).ThenBy(item => item.Name)
            .Select(item => new { item.Id, item.Name, item.Category, item.Price, item.DurationMinutes, item.Description })
            .ToListAsync(cancellationToken);
        return Ok(services);
    }

    [HttpGet("slots")]
    [AllowAnonymous]
    public async Task<IActionResult> Slots(
        [FromQuery] Guid doctorId,
        [FromQuery] DateOnly date,
        [FromQuery] Guid serviceId,
        CancellationToken cancellationToken)
    {
        var doctor = await db.Doctors.AsNoTracking().SingleOrDefaultAsync(
            item => item.Id == doctorId && item.IsActive, cancellationToken);
        var service = await db.Services.AsNoTracking().SingleOrDefaultAsync(
            item => item.Id == serviceId && item.IsActive, cancellationToken);
        if (doctor is null || service is null)
            return NotFound();
        if (!ValidDuration(service.DurationMinutes))
            return UnprocessableEntity(new ProblemDetails { Status = 422, Title = "Xizmat davomiyligi yaroqsiz." });
        if (!doctor.WorksOn(date.DayOfWeek))
            return Ok(Array.Empty<string>());

        var duration = service.DurationMinutes;
        var occupied = await db.BookedSlots.AsNoTracking()
            .Where(item => item.DoctorId == doctorId && item.Date == date)
            .Select(item => item.StartTime)
            .ToListAsync(cancellationToken);
        var busy = occupied.ToHashSet();
        var result = new List<string>();
        for (var start = doctor.StartHour; start.AddMinutes(duration) <= doctor.EndHour; start = start.AddMinutes(30))
        {
            var end = start.AddMinutes(duration);
            if (CrossesLunch(doctor, start, end))
                continue;
            if (date == DateOnly.FromDateTime(DateTime.UtcNow) && start <= TimeOnly.FromDateTime(DateTime.UtcNow))
                continue;
            var hasConflict = Enumerable.Range(0, duration / 30)
                .Any(index => busy.Contains(start.AddMinutes(index * 30)));
            if (!hasConflict)
                result.Add(start.ToString("HH:mm"));
        }
        return Ok(result);
    }

    [HttpPost("bookings")]
    [AllowAnonymous]
    [EnableRateLimiting("booking")]
    public async Task<IActionResult> Book(
        CreatePublicBookingRequest request,
        [FromHeader(Name = "Idempotency-Key")] string? idempotencyKey,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(idempotencyKey) || idempotencyKey.Length > 128)
            return BadRequest(new ProblemDetails { Status = 400, Title = "Idempotency-Key sarlavhasi talab qilinadi." });
        var authenticatedPatient = User.IsInRole(RoleNames.Patient);
        if ((!authenticatedPatient &&
             (string.IsNullOrWhiteSpace(request.FullName) || request.FullName.Trim().Length > 160 ||
              string.IsNullOrWhiteSpace(request.PhoneNumber) || request.PhoneNumber.Trim().Length > 32)) ||
            request.Notes?.Length > 1000)
            return UnprocessableEntity(new ValidationProblemDetails(new Dictionary<string, string[]>
            {
                ["request"] = ["Bemor ma’lumotlari noto‘g‘ri yoki juda uzun."]
            }));

        Guid? authenticatedPatientId = null;
        if (authenticatedPatient)
        {
            if (!Guid.TryParse(User.FindFirstValue("patientId"), out var patientId))
                return Forbid();
            authenticatedPatientId = patientId;
        }

        var operation = "public-booking";
        var payloadHash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(
            JsonSerializer.Serialize(request))));
        var prior = await db.IdempotencyRecords.AsNoTracking().SingleOrDefaultAsync(
            item => item.Operation == operation && item.Key == idempotencyKey, cancellationToken);
        if (prior is not null)
        {
            if (prior.PayloadHash != payloadHash)
                return Conflict(new ProblemDetails { Status = 409, Title = "Idempotency kaliti boshqa so‘rov uchun ishlatilgan." });
            return await BookingResponseAsync(prior.ResponseId, cancellationToken);
        }

        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        var doctor = await db.Doctors.SingleOrDefaultAsync(
            item => item.Id == request.DoctorId && item.IsActive, cancellationToken);
        var service = await db.Services.SingleOrDefaultAsync(
            item => item.Id == request.ServiceId && item.IsActive, cancellationToken);
        if (doctor is null || service is null)
            return NotFound();
        if (!ValidDuration(service.DurationMinutes) || !IsValidStart(request.StartTime) ||
            !doctor.WorksOn(request.Date.DayOfWeek) ||
            request.StartTime < doctor.StartHour ||
            request.StartTime.AddMinutes(service.DurationMinutes) > doctor.EndHour ||
            CrossesLunch(doctor, request.StartTime, request.StartTime.AddMinutes(service.DurationMinutes)))
            return UnprocessableEntity(new ProblemDetails { Status = 422, Title = "Tanlangan vaqt shifokor grafigiga mos emas." });
        if (request.Date < DateOnly.FromDateTime(DateTime.UtcNow) ||
            request.Date == DateOnly.FromDateTime(DateTime.UtcNow) &&
            request.StartTime <= TimeOnly.FromDateTime(DateTime.UtcNow))
            return UnprocessableEntity(new ProblemDetails { Status = 422, Title = "O‘tgan vaqtga yozilish mumkin emas." });

        Patient? patient;
        if (authenticatedPatientId.HasValue)
        {
            patient = await db.Patients.SingleOrDefaultAsync(
                item => item.Id == authenticatedPatientId.Value, cancellationToken);
            if (patient is null)
                return Forbid();
        }
        else
        {
            var phone = request.PhoneNumber!.Trim();
            patient = await db.Patients.SingleOrDefaultAsync(item => item.PhoneNumber == phone, cancellationToken);
            if (patient is null)
            {
                patient = new Patient { FullName = request.FullName!.Trim(), PhoneNumber = phone };
                db.Patients.Add(patient);
            }
        }

        var appointment = new Appointment
        {
            DoctorId = doctor.Id,
            Patient = patient,
            ServiceId = service.Id,
            Date = request.Date,
            StartTime = request.StartTime,
            EndTime = request.StartTime.AddMinutes(service.DurationMinutes),
            Status = AppointmentStatus.Pending,
            Source = AppointmentSource.Online,
            Notes = request.Notes?.Trim(),
            BookingCode = $"DC-{Convert.ToHexString(RandomNumberGenerator.GetBytes(3))}"
        };
        db.Appointments.Add(appointment);
        foreach (var offset in Enumerable.Range(0, service.DurationMinutes / 30))
        {
            db.BookedSlots.Add(new BookedSlot
            {
                DoctorId = doctor.Id,
                Date = request.Date,
                StartTime = request.StartTime.AddMinutes(offset * 30),
                AppointmentId = appointment.Id
            });
        }
        db.IdempotencyRecords.Add(new IdempotencyRecord
        {
            Operation = operation,
            Key = idempotencyKey,
            PayloadHash = payloadHash,
            ResponseId = appointment.Id
        });
        db.AuditLogs.Add(new AuditLog
        {
            Actor = "Anonymous",
            Action = "appointment.public-booking",
            Resource = appointment.Id.ToString(),
            IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? string.Empty,
            Status = AuditStatus.Success
        });

        try
        {
            await db.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
        }
        catch (DbUpdateException exception) when (IsUniqueConstraintViolation(exception))
        {
            await transaction.RollbackAsync(cancellationToken);
            return Conflict(new ProblemDetails
            {
                Status = 409,
                Title = "Bu vaqt oralig‘i hozirgina band qilindi.",
                Type = "https://httpstatuses.com/409"
            });
        }

        await NotifyBookingAsync(appointment, cancellationToken);
        return CreatedAtAction(nameof(Slots), new { doctorId = doctor.Id, date = request.Date, serviceId = service.Id },
            new { appointment.Id, appointment.BookingCode, appointment.Date, appointment.StartTime, appointment.EndTime, appointment.Status });
    }

    private async Task<IActionResult> BookingResponseAsync(Guid appointmentId, CancellationToken cancellationToken)
    {
        var appointment = await db.Appointments.AsNoTracking()
            .Where(item => item.Id == appointmentId)
            .Select(item => new { item.Id, item.BookingCode, item.Date, item.StartTime, item.EndTime, item.Status })
            .SingleOrDefaultAsync(cancellationToken);
        return appointment is null ? Conflict() : Ok(appointment);
    }

    private Task NotifyBookingAsync(Appointment appointment, CancellationToken cancellationToken) =>
        hub.Clients.Groups(["staff:SuperAdmin", "staff:Receptionist", $"doctor:{appointment.DoctorId}"])
            .SendAsync("AppointmentChanged", new
            {
                appointmentId = appointment.Id,
                doctorId = appointment.DoctorId,
                date = appointment.Date,
                startTime = appointment.StartTime,
                status = appointment.Status
            }, cancellationToken);

    internal static bool ValidDuration(int minutes) => minutes > 0 && minutes % 30 == 0;
    internal static bool IsValidStart(TimeOnly start) => start.Minute % 30 == 0 && start.Second == 0;
    internal static bool CrossesLunch(Doctor doctor, TimeOnly start, TimeOnly end) =>
        doctor.LunchEnd > doctor.LunchStart && start < doctor.LunchEnd && end > doctor.LunchStart;

    internal static bool IsUniqueConstraintViolation(DbUpdateException exception) =>
        exception.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation } ||
        exception.InnerException is SqliteException { SqliteErrorCode: 19 };
}

public sealed record CreatePublicBookingRequest(
    Guid DoctorId,
    Guid ServiceId,
    DateOnly Date,
    TimeOnly StartTime,
    string? FullName,
    string? PhoneNumber,
    string? Notes);
