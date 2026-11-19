using DentaCore.Api.Auth;
using DentaCore.Infrastructure.Persistence;
using DentaCore.Domain;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DentaCore.Api.Controllers;

[ApiController]
[Route("api/v1/admin")]
[Authorize(Roles = RoleNames.SuperAdmin)]
public sealed class AdminController(AppDbContext db) : ControllerBase
{
    [HttpGet("staff")]
    [Authorize(Policy = "Staff.View")]
    public async Task<IActionResult> Staff(CancellationToken cancellationToken)
    {
        var users = await db.Users.AsNoTracking().Where(item => item.Role.Name != RoleNames.Patient)
            .OrderBy(item => item.FullName)
            .Select(item => new
            {
                item.Id, item.FullName, item.Email, item.PhoneNumber,
                role = item.Role.Name, item.DoctorId, item.IsActive, item.CreatedAt
            }).ToListAsync(cancellationToken);
        return Ok(users);
    }

    [HttpPost("staff")]
    [Authorize(Policy = "Staff.Edit")]
    public async Task<IActionResult> CreateStaff(CreateStaffRequest request, CancellationToken cancellationToken)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        if (request.Password.Length < 12 ||
            request.Role is not (RoleNames.Doctor or RoleNames.Receptionist) ||
            string.IsNullOrWhiteSpace(request.FullName) || request.FullName.Trim().Length > 160 ||
            request.PhoneNumber?.Length > 32)
            return UnprocessableEntity(new ProblemDetails { Status = 422, Title = "Xodim ma’lumotlari noto‘g‘ri." });
        if (await db.Users.AnyAsync(item => item.Email == email, cancellationToken))
            return Conflict(new ProblemDetails { Status = 409, Title = "Bu email ro‘yxatdan o‘tgan." });
        if (request.Role == RoleNames.Doctor && request.Doctor is null)
            return UnprocessableEntity(new ProblemDetails { Status = 422, Title = "Shifokor uchun ish grafigi majburiy." });

        var role = await db.Roles.SingleAsync(item => item.Name == request.Role, cancellationToken);
        var user = new AppUser
        {
            FullName = request.FullName.Trim(),
            Email = email,
            PhoneNumber = request.PhoneNumber?.Trim() ?? string.Empty,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            RoleId = role.Id
        };
        if (request.Doctor is not null)
        {
            if (request.Doctor.StartHour >= request.Doctor.EndHour ||
                request.Doctor.ProfitSharePercent is < 0 or > 100)
                return UnprocessableEntity(new ProblemDetails { Status = 422, Title = "Shifokor jadvali yoki ulushi noto‘g‘ri." });
            var doctor = new Doctor
            {
                FullName = user.FullName,
                Email = email,
                PhoneNumber = user.PhoneNumber,
                Specialty = request.Doctor.Specialty.Trim(),
                StartHour = request.Doctor.StartHour,
                EndHour = request.Doctor.EndHour,
                LunchStart = request.Doctor.LunchStart,
                LunchEnd = request.Doctor.LunchEnd,
                WorkingDays = string.Join(',', request.Doctor.WorkingDays.Distinct().Order()),
                ProfitSharePercent = request.Doctor.ProfitSharePercent
            };
            if (request.Doctor.WorkingDays.Any(day => day is < 1 or > 7) ||
                request.Doctor.WorkingDays.Length == 0 ||
                request.Doctor.LunchEnd > request.Doctor.LunchStart &&
                (request.Doctor.LunchStart < doctor.StartHour || request.Doctor.LunchEnd > doctor.EndHour))
                return UnprocessableEntity(new ProblemDetails { Status = 422, Title = "Ish kunlari yoki tanaffus noto‘g‘ri." });
            db.Doctors.Add(doctor);
            user.DoctorId = doctor.Id;
        }
        db.Users.Add(user);
        AddAudit("staff.created", user.Id.ToString());
        await db.SaveChangesAsync(cancellationToken);
        return StatusCode(StatusCodes.Status201Created, new
        {
            user.Id, user.FullName, user.Email, role = request.Role, user.DoctorId
        });
    }

    [HttpGet("permissions")]
    [Authorize(Policy = "Permissions.View")]
    public async Task<IActionResult> PermissionMatrix(CancellationToken cancellationToken)
    {
        var users = await db.Users.AsNoTracking()
            .Where(item => item.Role.Name == RoleNames.Doctor || item.Role.Name == RoleNames.Receptionist)
            .OrderBy(item => item.FullName)
            .Select(item => new
            {
                item.Id, item.FullName, role = item.Role.Name, item.RoleId
            }).ToListAsync(cancellationToken);
        var permissions = await db.Permissions.AsNoTracking()
            .OrderBy(item => item.Module).ThenBy(item => item.Action)
            .Select(item => new { item.Id, item.Module, item.Action })
            .ToListAsync(cancellationToken);
        var roleIds = users.Select(item => item.RoleId).Distinct().ToArray();
        var userIds = users.Select(item => item.Id).ToArray();
        var roleGrants = await db.RolePermissions.AsNoTracking()
            .Where(item => roleIds.Contains(item.RoleId))
            .Select(item => new { item.RoleId, item.PermissionId, item.IsGranted })
            .ToListAsync(cancellationToken);
        var userGrants = await db.UserPermissions.AsNoTracking()
            .Where(item => userIds.Contains(item.UserId))
            .Select(item => new { item.UserId, item.PermissionId, item.IsGranted })
            .ToListAsync(cancellationToken);
        var roleGrantMap = roleGrants.ToDictionary(item => (item.RoleId, item.PermissionId), item => item.IsGranted);
        var userGrantMap = userGrants.ToDictionary(item => (item.UserId, item.PermissionId), item => item.IsGranted);

        return Ok(users.Select(user => new
        {
            user.Id,
            user.FullName,
            user.role,
            grants = permissions.Select(permission => new
            {
                permission.Module,
                permission.Action,
                roleGrant = roleGrantMap.TryGetValue((user.RoleId, permission.Id), out var roleGrant) && roleGrant,
                userOverride = userGrantMap.TryGetValue((user.Id, permission.Id), out var userGrant)
                    ? (bool?)userGrant
                    : null
            })
        }));
    }

    [HttpPut("permissions/{staffId:guid}")]
    [Authorize(Policy = "Permissions.Edit")]
    public async Task<IActionResult> UpdatePermissions(
        Guid staffId,
        UpdatePermissionsRequest request,
        CancellationToken cancellationToken)
    {
        var staff = await db.Users.Include(item => item.Role)
            .SingleOrDefaultAsync(item => item.Id == staffId, cancellationToken);
        if (staff is null || staff.Role.Name is RoleNames.SuperAdmin or RoleNames.Patient)
            return NotFound();
        if (request.Grants.Count > PermissionModules.All.Length * PermissionActions.All.Length ||
            request.Grants.Any(item =>
                !PermissionModules.All.Contains(item.Module, StringComparer.Ordinal) ||
                !PermissionActions.All.Contains(item.Action, StringComparer.Ordinal)) ||
            request.Grants.Select(item => $"{item.Module}.{item.Action}").Distinct().Count() != request.Grants.Count)
            return UnprocessableEntity(new ProblemDetails { Status = 422, Title = "Ruxsatlar ro‘yxatida noto‘g‘ri yoki takroriy qiymat bor." });

        var before = await db.UserPermissions.Where(item => item.UserId == staffId)
            .ToDictionaryAsync(item => item.PermissionId, item => item.IsGranted, cancellationToken);
        var permissions = await db.Permissions.ToDictionaryAsync(item => item.Code, cancellationToken);
        var requested = request.Grants.ToDictionary(
            item => permissions[$"{item.Module}.{item.Action}"].Id, item => item.IsGranted);
        var current = await db.UserPermissions.Where(item => item.UserId == staffId).ToListAsync(cancellationToken);
        foreach (var grant in current)
        {
            if (!requested.ContainsKey(grant.PermissionId))
                db.UserPermissions.Remove(grant);
        }
        foreach (var (permissionId, isGranted) in requested)
        {
            var grant = current.SingleOrDefault(item => item.PermissionId == permissionId);
            if (grant is null)
                db.UserPermissions.Add(new UserPermission
                {
                    UserId = staffId, PermissionId = permissionId, IsGranted = isGranted
                });
            else
            {
                grant.IsGranted = isGranted;
                grant.UpdatedAt = DateTime.UtcNow;
            }
        }
        AddAudit("permissions.updated", staffId.ToString(),
            System.Text.Json.JsonSerializer.Serialize(new { before, after = requested }));
        await db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    [HttpPost("services")]
    [Authorize(Policy = "Services.Edit")]
    public async Task<IActionResult> CreateService(CreateServiceRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Name) || request.Name.Trim().Length > 200 ||
            request.Price < 0 || !PublicController.ValidDuration(request.DurationMinutes) ||
            request.Description?.Length > 2000)
            return UnprocessableEntity(new ProblemDetails { Status = 422, Title = "Xizmat ma’lumotlari noto‘g‘ri." });
        var service = new ServiceItem
        {
            Name = request.Name.Trim(),
            Category = request.Category.Trim(),
            Price = request.Price,
            DurationMinutes = request.DurationMinutes,
            Description = request.Description?.Trim() ?? string.Empty
        };
        db.Services.Add(service);
        AddAudit("service.created", service.Id.ToString());
        await db.SaveChangesAsync(cancellationToken);
        return StatusCode(StatusCodes.Status201Created, new
        {
            service.Id, service.Name, service.Category, service.Price, service.DurationMinutes
        });
    }

    [HttpGet("reports/revenue")]
    [Authorize(Policy = "Reports.View")]
    public async Task<IActionResult> Revenue([FromQuery] DateOnly date, CancellationToken cancellationToken)
    {
        var start = date.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
        var end = date.AddDays(1).ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
        var paymentRows = await db.Payments.AsNoTracking()
            .Where(item => item.CreatedAt >= start && item.CreatedAt < end)
            .Select(item => new { item.Method, item.Amount, item.Invoice.DoctorId })
            .ToListAsync(cancellationToken);
        var payments = paymentRows.GroupBy(item => item.Method)
            .Select(group => new { method = group.Key, amount = group.Sum(item => item.Amount), count = group.Count() })
            .ToList();
        var doctorIds = paymentRows.Where(item => item.DoctorId.HasValue)
            .Select(item => item.DoctorId!.Value).Distinct().ToArray();
        var doctors = await db.Doctors.AsNoTracking().Where(item => doctorIds.Contains(item.Id))
            .Select(item => new { item.Id, item.FullName, item.ProfitSharePercent })
            .ToDictionaryAsync(item => item.Id, cancellationToken);
        var doctorShares = paymentRows.Where(item => item.DoctorId.HasValue)
            .GroupBy(item => item.DoctorId!.Value)
            .Where(group => doctors.ContainsKey(group.Key))
            .Select(group => new
            {
                doctor = doctors[group.Key].FullName,
                revenueShare = group.Sum(item => item.Amount) * doctors[group.Key].ProfitSharePercent / 100m
            }).ToList();
        return Ok(new { date, payments, doctorShares, total = payments.Sum(item => item.amount) });
    }

    [HttpGet("audit")]
    [Authorize(Policy = "Reports.View")]
    public async Task<IActionResult> Audit(CancellationToken cancellationToken)
    {
        var entries = await db.AuditLogs.AsNoTracking()
            .OrderByDescending(item => item.Timestamp)
            .Take(100)
            .Select(item => new
            {
                item.Id, item.Timestamp, item.Actor, item.ActorRole, item.Action,
                item.Resource, item.Status
            }).ToListAsync(cancellationToken);
        return Ok(entries);
    }

    private void AddAudit(string action, string resource, string? details = null)
    {
        var user = HttpContext.User;
        db.AuditLogs.Add(new AuditLog
        {
            ActorUserId = user.UserId(),
            Actor = user.Identity?.Name ?? string.Empty,
            ActorRole = user.Role(),
            Action = action,
            Resource = resource,
            IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? string.Empty,
            Status = AuditStatus.Success
        });
    }
}

public sealed record CreateStaffRequest(
    string FullName, string Email, string Password, string Role, string? PhoneNumber, DoctorSetupRequest? Doctor);
public sealed record DoctorSetupRequest(
    string Specialty, TimeOnly StartHour, TimeOnly EndHour, TimeOnly LunchStart, TimeOnly LunchEnd,
    int[] WorkingDays, decimal ProfitSharePercent);
public sealed record PermissionGrantRequest(string Module, string Action, bool IsGranted);
public sealed record UpdatePermissionsRequest(List<PermissionGrantRequest> Grants);
public sealed record CreateServiceRequest(
    string Name, string Category, decimal Price, int DurationMinutes, string? Description);
