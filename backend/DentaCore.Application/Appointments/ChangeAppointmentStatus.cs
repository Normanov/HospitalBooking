using DentaCore.Domain;
using MediatR;

namespace DentaCore.Application.Appointments;

public sealed record ChangeAppointmentStatusCommand(
    Guid AppointmentId,
    string Status,
    Guid? DoctorId,
    Guid? ActorUserId,
    string ActorName,
    string ActorRole,
    string IpAddress) : IRequest<ChangeAppointmentStatusResult>;

public enum ChangeAppointmentStatusResult
{
    Changed,
    NotFound,
    InvalidTransition,
    Conflict
}

public interface IAppointmentStatusRepository
{
    Task<Appointment?> FindForStatusChangeAsync(Guid appointmentId, CancellationToken cancellationToken);
    Task ReleaseBookedSlotsAsync(Guid appointmentId, CancellationToken cancellationToken);
    void AddAudit(AuditLog auditLog);
    Task<bool> SaveChangesAsync(CancellationToken cancellationToken);
}

public sealed record AppointmentChangedNotification(
    Guid AppointmentId,
    Guid DoctorId,
    Guid PatientId,
    DateOnly Date,
    TimeOnly StartTime,
    string Status) : INotification;

public sealed class ChangeAppointmentStatusHandler(
    IAppointmentStatusRepository repository,
    IPublisher publisher)
    : IRequestHandler<ChangeAppointmentStatusCommand, ChangeAppointmentStatusResult>
{
    public async Task<ChangeAppointmentStatusResult> Handle(
        ChangeAppointmentStatusCommand command,
        CancellationToken cancellationToken)
    {
        var appointment = await repository.FindForStatusChangeAsync(
            command.AppointmentId, cancellationToken);
        if (appointment is null || command.DoctorId.HasValue && appointment.DoctorId != command.DoctorId.Value)
            return ChangeAppointmentStatusResult.NotFound;

        if (!IsAllowedTransition(appointment.Status, command.Status))
            return ChangeAppointmentStatusResult.InvalidTransition;

        appointment.Status = command.Status;
        appointment.Version++;
        if (command.Status == AppointmentStatus.Completed)
            appointment.CompletedAt = DateTime.UtcNow;
        if (command.Status is AppointmentStatus.Cancelled or AppointmentStatus.NoShow)
            await repository.ReleaseBookedSlotsAsync(appointment.Id, cancellationToken);

        repository.AddAudit(new AuditLog
        {
            ActorUserId = command.ActorUserId,
            Actor = command.ActorName,
            ActorRole = command.ActorRole,
            Action = "appointment.status-changed",
            Resource = appointment.Id.ToString(),
            IpAddress = command.IpAddress,
            Status = AuditStatus.Success
        });

        if (!await repository.SaveChangesAsync(cancellationToken))
            return ChangeAppointmentStatusResult.Conflict;

        await publisher.Publish(new AppointmentChangedNotification(
            appointment.Id,
            appointment.DoctorId,
            appointment.PatientId,
            appointment.Date,
            appointment.StartTime,
            appointment.Status), cancellationToken);

        return ChangeAppointmentStatusResult.Changed;
    }

    private static bool IsAllowedTransition(string from, string to) =>
        from == AppointmentStatus.Pending && to is AppointmentStatus.Confirmed or AppointmentStatus.Cancelled ||
        from == AppointmentStatus.Confirmed && to is AppointmentStatus.InProgress or AppointmentStatus.Cancelled or AppointmentStatus.NoShow ||
        from == AppointmentStatus.InProgress && to is AppointmentStatus.Completed or AppointmentStatus.Cancelled;
}
