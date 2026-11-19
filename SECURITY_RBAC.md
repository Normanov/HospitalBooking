# DentaCore — Security Policies & RBAC Implementation

**Applies to:** ASP.NET Core 8 API, React client, PostgreSQL.  
**Repository status:** the API enforces JWT authentication and policy-based RBAC, and React uses the server-issued identity instead of a role switcher. Public booking and the authenticated patient portal use the API. Staff CRM screens still use mock data and are not production workflows.

## 1. Security invariants

1. Deny by default. Authenticate and authorize every non-public API endpoint.
2. Authorization is enforced by the API and data query; React route guards only improve navigation UX.
3. Every clinic-owned read/write is scoped to the clinic derived from the validated identity, never from an untrusted request body/query parameter.
4. Doctor access additionally requires assignment to the patient/encounter. Patient access additionally requires ownership. Return role-specific DTO projections, not EF entities.
5. Staff permissions are explicit module/action grants and are audited. An owner cannot grant access outside the owner's clinic. A role claim alone does not grant data access.
6. Runtime business data access uses EF Core LINQ and parameterized EF operations only. PostgreSQL-specific RLS/index definitions may use fixed, reviewed migration DDL; never interpolate request input into SQL.
7. Secrets, refresh tokens, passwords, health records and payment credentials are never written to logs.

## 2. Authentication and browser token handling

- Use a short-lived JWT access token (about 10–15 minutes) held only in JavaScript memory. Never place it in `localStorage`, `sessionStorage`, URL parameters, or logs.
- Use an opaque, rotating refresh token in a `Secure; HttpOnly; SameSite=Strict; Path=/api/v1/auth` cookie. Persist only its cryptographic hash server-side. Revoke the full token family on reuse, logout, password reset, or account disable.
- Deploy the browser and API on the same site where possible. If cross-site cookies are required, use `SameSite=None; Secure`, strict origin allow-lists, and mandatory anti-CSRF checks.
- Use HTTPS only in production, HSTS, exact CORS origins, CSP, `frame-ancestors 'none'`, `X-Content-Type-Options: nosniff`, and `Referrer-Policy: no-referrer`.
- Login errors do not reveal whether the account exists. Passwords are hashed with ASP.NET Core Identity's configured password hasher; enforce account lockout and MFA for SuperAdmin before production.

## 3. ASP.NET Core 8 configuration

The following is a composition-root pattern; bind secrets from a secret manager/environment, not committed `appsettings.json`.

```csharp
using System.Security.Claims;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddProblemDetails();
builder.Services.AddCors(options => options.AddPolicy("web", policy =>
    policy.WithOrigins(builder.Configuration.GetSection("Web:AllowedOrigins").Get<string[]>() ?? [])
          .AllowAnyHeader()
          .AllowAnyMethod()));

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidateAudience = true,
            ValidAudience = builder.Configuration["Jwt:Audience"],
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(
                Convert.FromBase64String(builder.Configuration["Jwt:SigningKey"]!)),
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromSeconds(30),
            RoleClaimType = ClaimTypes.Role,
            NameClaimType = ClaimTypes.NameIdentifier
        };
    });

builder.Services.AddAuthorization(options =>
{
    options.FallbackPolicy = options.DefaultPolicy; // Require an authenticated user by default.
    options.AddPolicy("ClinicalWrite", policy =>
        policy.RequireAuthenticatedUser()
              .RequireRole("Doctor", "SuperAdmin")
              .AddRequirements(new ClinicPermissionRequirement("odontogram.write")));
});
builder.Services.AddScoped<IAuthorizationHandler, ClinicPermissionHandler>();

builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddPolicy("login", context =>
        RateLimitPartition.GetFixedWindowLimiter(
            context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 5,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0,
                AutoReplenishment = true
            }));
    options.AddPolicy("public-booking", context =>
        RateLimitPartition.GetFixedWindowLimiter(
            context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 5,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0,
                AutoReplenishment = true
            }));
});

builder.Services.AddAntiforgery(options =>
{
    options.HeaderName = "X-CSRF-TOKEN";
    options.Cookie.Name = "__Host-DentaCore-CSRF";
    options.Cookie.HttpOnly = false; // Request token is also returned to the caller.
    options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
    options.Cookie.SameSite = SameSiteMode.Strict;
    options.Cookie.Path = "/";
});

var app = builder.Build();
app.UseExceptionHandler();
app.UseHsts();
app.UseHttpsRedirection();
app.Use(async (context, next) =>
{
    context.Response.Headers["Content-Security-Policy"] =
        "default-src 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'self'";
    context.Response.Headers["X-Content-Type-Options"] = "nosniff";
    context.Response.Headers["Referrer-Policy"] = "no-referrer";
    context.Response.Headers["X-Frame-Options"] = "DENY";
    await next();
});
app.UseRouting();
app.UseCors("web");
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.Run();
```

Trust forwarded client IP headers only from configured reverse proxies; otherwise IP rate limits can be spoofed. The built-in limiter is process-local, not DDoS protection: enforce edge WAF/gateway limits and use a distributed limiter when running multiple API instances. Apply endpoint-specific rate limits and account-based lockout as well as IP limits. Production secrets must be rotated and signing keys must not be checked into source control.

Issue the CSRF request token from a same-origin endpoint and validate it on cookie-authenticated refresh/logout actions. Set and clear the refresh cookie only on the server:

```csharp
[ApiController]
[Route("api/v1/auth")]
public sealed class AuthController(
    IAntiforgery antiforgery,
    IRefreshTokenService refreshTokens) : ControllerBase
{
    [HttpGet("csrf")]
    [AllowAnonymous]
    public IActionResult GetCsrfToken()
    {
        var tokens = antiforgery.GetAndStoreTokens(HttpContext);
        return Ok(new { requestToken = tokens.RequestToken });
    }

    [HttpPost("refresh")]
    [AllowAnonymous]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Refresh(CancellationToken cancellationToken)
    {
        // Read/rotate the opaque refresh cookie through the token service; never return it in JSON.
        var result = await refreshTokens.RotateAsync(
            Request.Cookies["DentaCore-Refresh"], cancellationToken);
        if (result is null)
            return Unauthorized();

        Response.Cookies.Append("DentaCore-Refresh", result.RefreshToken, new CookieOptions
        {
            HttpOnly = true,
            Secure = true,
            SameSite = SameSiteMode.Strict,
            Path = "/api/v1/auth",
            Expires = result.ExpiresAt
        });
        return Ok(new { accessToken = result.AccessToken, expiresAt = result.AccessTokenExpiresAt });
    }
}
```

`IRefreshTokenService` stores only a hash and rotates/revokes tokens transactionally. Apply the same antiforgery validation to logout and clear the cookie with matching path/options. Add anti-forgery validation to every cookie-authenticated state-changing endpoint.

### 3.1 Endpoint and record-level authorization

Role attributes are coarse gates. The handler and query must still enforce the clinic, assignment, patient ownership, and current permission grant.

```csharp
[ApiController]
[Route("api/v1/crm/patients")]
[Authorize(Roles = "Doctor,SuperAdmin")]
public sealed class OdontogramController(
    AppDbContext db,
    ICurrentActor actor,
    IAuthorizationService authorization) : ControllerBase
{
    [HttpPut("{patientId:guid}/odontogram")]
    [Authorize(Policy = "ClinicalWrite")]
    public async Task<IActionResult> Update(
        Guid patientId,
        UpdateOdontogramRequest request,
        CancellationToken cancellationToken)
    {
        var patient = await db.Patients
            .Where(p => p.ClinicId == actor.ClinicId && p.Id == patientId)
            .Where(p => actor.Role == "SuperAdmin" ||
                        p.Appointments.Any(a => a.DoctorId == actor.UserId))
            .SingleOrDefaultAsync(cancellationToken);

        if (patient is null)
            return NotFound(); // Do not disclose whether an out-of-scope patient exists.

        var result = await authorization.AuthorizeAsync(
            User, patient, new ClinicPermissionRequirement("odontogram.write"));
        if (!result.Succeeded)
            return Forbid();

        // Validate FDI numbers/surfaces and apply through a domain method.
        patient.UpdateOdontogram(request.Teeth, actor.UserId, TimeProvider.System.GetUtcNow());
        await db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }
}
```

```csharp
[ApiController]
[Route("api/v1/crm/doctor")]
[Authorize(Roles = "Doctor")]
public sealed class DoctorScheduleController(
    IScheduleService scheduleService,
    ICurrentActor actor) : ControllerBase
{
    [HttpGet("schedule")]
    public Task<IReadOnlyList<AppointmentDto>> GetMySchedule(
        CancellationToken cancellationToken) =>
        scheduleService.GetDoctorScheduleAsync(actor.UserId, actor.ClinicId, cancellationToken);
}
```

`ClinicPermissionRequirement` must resolve the current grant from the server-side permission store and verify `ClinicId`; it must not trust a permission list supplied by the browser. Restrict its `SuperAdmin` bypass to the same clinic and only permissions allowed by policy. In production, avoid loading an unscoped entity before checking access; project a DTO from the scoped query, and use resource authorization before mutation.

For staff/patient list endpoints, build the visibility predicate before projection:

```csharp
var query = db.Patients.Where(p => p.ClinicId == actor.ClinicId);
if (actor.Role == "Doctor")
    query = query.Where(p => p.Appointments.Any(a => a.DoctorId == actor.UserId));
else if (actor.Role == "Patient")
    query = query.Where(p => p.UserId == actor.UserId);
else if (actor.Role == "Receptionist" &&
         !await permissions.HasAsync(actor, "patients.read", cancellationToken))
    return Forbid();
else if (actor.Role != "SuperAdmin" && actor.Role != "Doctor" &&
         actor.Role != "Patient" && actor.Role != "Receptionist")
    return Forbid();

var canReadPatientContact = actor.CanReadPatientContact;
var rows = await query
    .OrderBy(p => p.FullName)
    .Select(p => new PatientSummaryDto(
        p.Id,
        p.FullName,
        canReadPatientContact ? p.PhoneNumber : null))
    .ToListAsync(cancellationToken);
```

Use separate DTOs and explicit grants for patient contact, clinical notes, odontogram, and billing. Do not rely on JSON serialization settings to hide fields.

### 3.2 Dynamic permission data

Persist grants with a unique key on `(ClinicId, StaffUserId, PermissionKey)` and an explicit allow/deny or enabled flag. Validate permission keys against a server-owned registry. SuperAdmin changes require authorization, audit before/after values, and invalidate any permission cache. Never accept arbitrary permission names from an untrusted client.

Example endpoint attribute:

```csharp
[HttpGet("reports/revenue")]
[Authorize(Roles = "SuperAdmin")]
[Authorize(Policy = "billing.reports.read")]
public Task<RevenueReportDto> GetRevenue(CancellationToken cancellationToken) =>
    reportService.GetClinicRevenueAsync(currentActor.ClinicId, cancellationToken);
```

In the production API, register named permission policies with an `IAuthorizationPolicyProvider` and a permission requirement/handler. Return `403` for authenticated callers lacking a grant. For an inaccessible record, use a consistent `404` to avoid identifier enumeration.

## 4. React route guard (UX only)

The repository currently has no React Router or server-backed auth context. Add `react-router-dom` and implement a session provider before using this pattern. A changed client role, route, or JavaScript state must never grant API access.

```tsx
import { Navigate, Outlet, useLocation } from "react-router-dom";

type Role = "SuperAdmin" | "Doctor" | "Receptionist" | "Patient";
type SessionUser = { id: string; role: Role };

type ProtectedRouteProps = {
  user: SessionUser | null;
  isLoading: boolean;
  allowedRoles: readonly Role[];
};

const homeByRole: Record<Role, string> = {
  SuperAdmin: "/admin/overview",
  Doctor: "/doctor/schedule",
  Receptionist: "/reception/queue",
  Patient: "/portal/appointments",
};

export function ProtectedRoute({
  user,
  isLoading,
  allowedRoles,
}: ProtectedRouteProps) {
  const location = useLocation();

  if (isLoading) return <div role="status">Yuklanmoqda...</div>;
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if (!allowedRoles.includes(user.role)) {
    return <Navigate to={homeByRole[user.role]} replace />;
  }
  return <Outlet />;
}
```

Create separate route layouts for `/admin`, `/doctor`, `/reception`, and `/portal`. Hide unavailable UI actions using server-provided capabilities, but still let the API reject forbidden actions. Never allow the user to select their authenticated role from a menu.

## 5. CSRF, XSS, CORS and headers

- Bearer access-token API calls are not automatically attached by the browser, but refresh/logout endpoints using cookies require CSRF defense. Issue an ASP.NET antiforgery request token from a same-origin endpoint; send it in `X-CSRF-TOKEN` on refresh/logout and verify with `IAntiforgery.ValidateRequestAsync`.
- Keep refresh token cookie `HttpOnly`; the CSRF request token is not an authentication credential. Rotate tokens on every successful refresh and reject refresh reuse.
- Use React's escaped text rendering; do not render untrusted HTML with `dangerouslySetInnerHTML`. Sanitize approved rich text with a maintained allow-list sanitizer.
- Set a restrictive CSP including nonces/hashes for scripts; avoid `unsafe-inline`. Configure CSP against the actual deployment assets before enabling enforcement.
- CORS allow-list exact trusted origins; never combine wildcard origins with credentials. Validate `Origin` on cookie-authenticated endpoints.
- Add `Cache-Control: no-store` to authentication, clinical and financial responses. Avoid caching sensitive data in service workers or browser persistence.

## 6. PostgreSQL isolation and EF Core

Use EF Core/Npgsql for all application queries, with global clinic query filters as defense-in-depth and explicit clinic predicates in sensitive use cases. Query filters are not a replacement for authorization and must not be bypassed casually. App connections use a least-privileged database role that is not table owner and has no `BYPASSRLS`.

PostgreSQL RLS is an additional database boundary. Apply reviewed, fixed policy DDL in EF migrations after tables/roles are defined. Example policy shape (rename identifiers to match the actual schema):

```sql
ALTER TABLE "Appointments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Appointments" FORCE ROW LEVEL SECURITY;

CREATE POLICY appointment_clinic_scope ON "Appointments"
FOR SELECT
USING (
  "ClinicId" = NULLIF(current_setting('dentacore.clinic_id', true), '')::uuid
  AND (
    current_setting('dentacore.role', true) IN ('SuperAdmin', 'Receptionist')
    OR (
      current_setting('dentacore.role', true) = 'Doctor'
      AND "DoctorId" = NULLIF(current_setting('dentacore.user_id', true), '')::uuid
    )
    OR (
      current_setting('dentacore.role', true) = 'Patient'
      AND EXISTS (
        SELECT 1 FROM "Patients" p
        WHERE p."Id" = "Appointments"."PatientId"
          AND p."UserId" = NULLIF(current_setting('dentacore.user_id', true), '')::uuid
      )
    )
  )
);
```

Apply equivalent patient/clinical/payment policies, plus separate write policies that restrict mutations to authorized staff/service roles; a `SELECT` policy alone does not authorize writes. Establish request context from validated claims with transaction-local database settings before executing queries; never set persistent session state on a pooled connection. If this context-setting integration and write policies are not implemented and integration-tested, do not claim RLS is active. The SQL above is schema-policy DDL only; business data reads/writes remain EF Core LINQ.

Never build dynamic SQL from search terms, sort fields, IDs, or role values. Whitelist sortable columns in LINQ. Use EF migrations for schema changes and unique slot-reservation indexes; test migrations against PostgreSQL, not only an in-memory provider.

## 7. Booking race and error handling

Create an appointment and all its unique `(ClinicId, DoctorId, SlotStartUtc)` reservation rows in one EF transaction. On a PostgreSQL unique-constraint violation for the reservation index, roll back and return `409 Conflict` with a stable Problem Details type. Map only the known constraint; rethrow/log unexpected database failures as server errors. Do not expose SQL, stack traces, patient names or other request details in the response.

## 8. Operational controls and release gates

- TLS, HSTS, trusted-proxy configuration, secret manager, encrypted backups and tested restore.
- Centralized structured logs with correlation IDs and PHI-safe field allow-list; tamper-resistant audit retention policy.
- Dependency and container scanning in CI; pinned production images and minimal runtime permissions.
- Alerts for repeated login failures, refresh-token reuse, authorization denials spikes, backup failures and unexpected admin permission changes.
- Integration tests prove `401`, `403`/scoped `404`, doctor assignment boundaries, patient ownership, receptionist clinical-write denial, RLS behavior using the production DB role, CSRF rejection, refresh rotation, and exactly-one-winner concurrent booking.
- Do not release until SuperAdmin MFA, production secrets, database least privilege, RLS context propagation, CORS/CSP, and backup restore have been verified in the target environment.
