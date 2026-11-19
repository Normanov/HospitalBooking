using DentaCore.Application.Appointments;
using Microsoft.EntityFrameworkCore;

namespace DentaCore.Infrastructure.Persistence;

public sealed class AppointmentStatusRepository(AppDbContext db) : IAppointmentStatusRepository
{
    public Task<DentaCore.Domain.Appointment?> FindForStatusChangeAsync(
        Guid appointmentId,
        CancellationToken cancellationToken) =>
        db.Appointments.SingleOrDefaultAsync(item => item.Id == appointmentId, cancellationToken);

    public async Task ReleaseBookedSlotsAsync(Guid appointmentId, CancellationToken cancellationToken)
    {
        var slots = await db.BookedSlots
            .Where(item => item.AppointmentId == appointmentId)
            .ToListAsync(cancellationToken);
        db.BookedSlots.RemoveRange(slots);
    }

    public void AddAudit(DentaCore.Domain.AuditLog auditLog) => db.AuditLogs.Add(auditLog);

    public async Task<bool> SaveChangesAsync(CancellationToken cancellationToken)
    {
        try
        {
            await db.SaveChangesAsync(cancellationToken);
            return true;
        }
        catch (DbUpdateConcurrencyException)
        {
            return false;
        }
    }
}
