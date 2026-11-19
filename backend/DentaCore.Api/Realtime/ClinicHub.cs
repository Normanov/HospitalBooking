using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace DentaCore.Api.Realtime;

[Authorize]
public sealed class ClinicHub : Hub
{
    public override async Task OnConnectedAsync()
    {
        var role = Context.User?.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
        if (role is "SuperAdmin" or "Receptionist")
            await Groups.AddToGroupAsync(Context.ConnectionId, $"staff:{role}");

        var doctorId = Context.User?.FindFirst("doctorId")?.Value;
        if (Guid.TryParse(doctorId, out var doctor))
            await Groups.AddToGroupAsync(Context.ConnectionId, $"doctor:{doctor}");

        var patientId = Context.User?.FindFirst("patientId")?.Value;
        if (Guid.TryParse(patientId, out var patient))
            await Groups.AddToGroupAsync(Context.ConnectionId, $"patient:{patient}");

        await base.OnConnectedAsync();
    }
}
