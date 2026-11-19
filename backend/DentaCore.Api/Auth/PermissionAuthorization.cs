using System.Security.Claims;
using DentaCore.Domain;
using DentaCore.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace DentaCore.Api.Auth;

public sealed record PermissionRequirement(string Code) : IAuthorizationRequirement;

public sealed class PermissionPolicyProvider : IAuthorizationPolicyProvider
{
    private readonly DefaultAuthorizationPolicyProvider _fallback;

    public PermissionPolicyProvider(IOptions<AuthorizationOptions> options) =>
        _fallback = new DefaultAuthorizationPolicyProvider(options);

    public Task<AuthorizationPolicy> GetDefaultPolicyAsync() => _fallback.GetDefaultPolicyAsync();
    public Task<AuthorizationPolicy?> GetFallbackPolicyAsync() => _fallback.GetFallbackPolicyAsync();

    public Task<AuthorizationPolicy?> GetPolicyAsync(string policyName)
    {
        if (!IsPermissionPolicy(policyName))
            return _fallback.GetPolicyAsync(policyName);

        var policy = new AuthorizationPolicyBuilder()
            .RequireAuthenticatedUser()
            .AddRequirements(new PermissionRequirement(policyName))
            .Build();
        return Task.FromResult<AuthorizationPolicy?>(policy);
    }

    private static bool IsPermissionPolicy(string policyName)
    {
        var parts = policyName.Split('.', StringSplitOptions.RemoveEmptyEntries);
        return parts.Length == 2 &&
            PermissionModules.All.Contains(parts[0], StringComparer.Ordinal) &&
            PermissionActions.All.Contains(parts[1], StringComparer.Ordinal);
    }
}

public sealed class PermissionAuthorizationHandler(AppDbContext db)
    : AuthorizationHandler<PermissionRequirement>
{
    protected override async Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        PermissionRequirement requirement)
    {
        var userId = context.User.UserId();
        var role = context.User.Role();
        if (!userId.HasValue || string.IsNullOrEmpty(role))
            return;

        var user = await db.Users.AsNoTracking()
            .Where(item => item.Id == userId.Value && item.IsActive && item.Role.Name == role)
            .Select(item => new { item.RoleId, RoleName = item.Role.Name })
            .SingleOrDefaultAsync();
        if (user is null)
            return;

        if (user.RoleName == RoleNames.SuperAdmin ||
            await HasPermissionAsync(userId.Value, user.RoleId, requirement.Code))
        {
            context.Succeed(requirement);
        }
    }

    private async Task<bool> HasPermissionAsync(Guid userId, int roleId, string permissionCode)
    {
        var permissionId = await db.Permissions.AsNoTracking()
            .Where(item => item.Code == permissionCode)
            .Select(item => (int?)item.Id)
            .SingleOrDefaultAsync();
        if (!permissionId.HasValue)
            return false;

        var userOverride = await db.UserPermissions.AsNoTracking()
            .Where(item => item.UserId == userId && item.PermissionId == permissionId.Value)
            .Select(item => (bool?)item.IsGranted)
            .SingleOrDefaultAsync();
        if (userOverride.HasValue)
            return userOverride.Value;

        return await db.RolePermissions.AsNoTracking()
            .Where(item => item.RoleId == roleId && item.PermissionId == permissionId.Value)
            .Select(item => (bool?)item.IsGranted)
            .SingleOrDefaultAsync() ?? false;
    }
}

public static class AuthClaims
{
    public static Guid? UserId(this ClaimsPrincipal user) =>
        Guid.TryParse(user.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : null;

    public static string Role(this ClaimsPrincipal user) =>
        user.FindFirstValue(ClaimTypes.Role) ?? string.Empty;
}

public sealed class ApiExceptionHandler(ILogger<ApiExceptionHandler> logger) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken cancellationToken)
    {
        logger.LogError(exception, "Unhandled API error. TraceId: {TraceId}", httpContext.TraceIdentifier);
        httpContext.Response.StatusCode = StatusCodes.Status500InternalServerError;
        await httpContext.Response.WriteAsJsonAsync(new ProblemDetails
        {
            Status = StatusCodes.Status500InternalServerError,
            Title = "Kutilmagan server xatosi",
            Type = "https://httpstatuses.com/500",
            Extensions = { ["traceId"] = httpContext.TraceIdentifier }
        }, cancellationToken);
        return true;
    }
}
