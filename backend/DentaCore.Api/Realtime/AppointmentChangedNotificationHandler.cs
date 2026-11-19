using DentaCore.Application.Appointments;
using Microsoft.AspNetCore.SignalR;
using MediatR;

namespace DentaCore.Api.Realtime;

public sealed class AppointmentChangedNotificationHandler(IHubContext<ClinicHub> hub)
    : INotificationHandler<AppointmentChangedNotification>
{
    public Task Handle(
        AppointmentChangedNotification notification,
        CancellationToken cancellationToken) =>
        hub.Clients.Groups([
            "staff:SuperAdmin",
            "staff:Receptionist",
            $"doctor:{notification.DoctorId}",
            $"patient:{notification.PatientId}"
        ]).SendAsync("AppointmentChanged", new
        {
            appointmentId = notification.AppointmentId,
            doctorId = notification.DoctorId,
            patientId = notification.PatientId,
            notification.Date,
            notification.StartTime,
            notification.Status
        }, cancellationToken);
}
