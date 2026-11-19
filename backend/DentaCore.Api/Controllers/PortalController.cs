using System.Security.Claims;
using DentaCore.Api.Auth;
using DentaCore.Infrastructure.Persistence;
using DentaCore.Domain;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DentaCore.Api.Controllers;

[ApiController]
[Route("api/v1/portal/me")]
[Authorize(Roles = RoleNames.Patient)]
public sealed class PortalController(AppDbContext db) : ControllerBase
{
    [HttpGet("appointments")]
    public async Task<IActionResult> MyAppointments(CancellationToken cancellationToken)
    {
        if (!Guid.TryParse(User.FindFirstValue("patientId"), out var patientId))
            return Forbid();

        var rows = await db.Appointments.AsNoTracking().Where(item => item.PatientId == patientId)
            .OrderByDescending(item => item.Date).ThenByDescending(item => item.StartTime)
            .Select(item => new
            {
                item.Id, item.Date, item.StartTime, item.EndTime, item.Status,
                doctorName = item.Doctor.FullName,
                serviceName = item.Service == null ? null : item.Service.Name
            }).ToListAsync(cancellationToken);
        return Ok(rows);
    }

    [HttpGet("records")]
    public async Task<IActionResult> MyRecords(CancellationToken cancellationToken)
    {
        if (!Guid.TryParse(User.FindFirstValue("patientId"), out var patientId))
            return Forbid();

        var teeth = await db.ToothRecords.AsNoTracking().Where(item => item.PatientId == patientId)
            .OrderBy(item => item.ToothNumber)
            .Select(item => new ToothDto(item.ToothNumber, item.Condition, item.SurfacesJson,
                item.Diagnosis, item.TreatmentPlan, item.Cost, item.UpdatedAt))
            .ToListAsync(cancellationToken);
        var prescriptions = await db.Prescriptions.AsNoTracking().Where(item => item.PatientId == patientId)
            .OrderByDescending(item => item.IssuedAt)
            .Select(item => new
            {
                item.Id, item.IssuedAt, item.Notes, doctorName = item.Doctor.FullName,
                items = item.Items.Select(line => new
                {
                    line.MedicineName, line.Dosage, line.Duration, line.Instructions
                })
            }).ToListAsync(cancellationToken);
        var invoices = await db.Invoices.AsNoTracking().Where(item => item.PatientId == patientId)
            .OrderByDescending(item => item.CreatedAt)
            .Select(item => new
            {
                item.Id, item.ReceiptNumber, item.TotalAmount, item.DiscountAmount, item.PaidAmount,
                item.DebtAmount, item.Status, item.CreatedAt,
                payments = item.Payments.Select(payment => new
                {
                    payment.Amount, payment.Method, payment.CreatedAt, payment.ReferenceCode
                })
            }).ToListAsync(cancellationToken);
        return Ok(new { odontogram = teeth, prescriptions, invoices });
    }
}
