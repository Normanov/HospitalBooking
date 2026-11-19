using System.Security.Claims;
using System.Net;
using System.Text;
using System.Threading.RateLimiting;
using DentaCore.Api.Auth;
using DentaCore.Application;
using DentaCore.Infrastructure;
using DentaCore.Infrastructure.Persistence;
using DentaCore.Domain;
using DentaCore.Api.Realtime;
using DentaCore.Api.Serialization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using FluentValidation;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);
builder.Logging.AddFilter("Microsoft.AspNetCore.Hosting.Diagnostics", LogLevel.Warning);
var requireSecureCookies = builder.Configuration.GetValue<bool?>("Security:CookiesRequireHttps")
    ?? !builder.Environment.IsDevelopment();

builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddMediatR(configuration =>
    configuration.RegisterServicesFromAssemblies(typeof(AssemblyMarker).Assembly, typeof(Program).Assembly));
builder.Services.AddValidatorsFromAssemblyContaining<AssemblyMarker>();

var jwtKey = builder.Configuration["Jwt:Key"]
    ?? throw new InvalidOperationException("Jwt:Key must be configured as a base64-encoded key.");
byte[] signingKey;
try
{
    signingKey = Convert.FromBase64String(jwtKey);
}
catch (FormatException exception)
{
    throw new InvalidOperationException("Jwt:Key must be a valid base64-encoded key.", exception);
}
if (signingKey.Length < 32)
    throw new InvalidOperationException("Jwt:Key must contain at least 256 bits.");

builder.Services.Configure<JwtOptions>(builder.Configuration.GetSection(JwtOptions.SectionName));
builder.Services.AddSingleton(new TokenSigningConfiguration(
    builder.Configuration["Jwt:Issuer"] ?? "DentaCore",
    builder.Configuration["Jwt:Audience"] ?? "DentaCore.Clients",
    signingKey,
    Math.Clamp(builder.Configuration.GetValue("Jwt:AccessTokenMinutes", 15), 5, 60),
    Math.Clamp(builder.Configuration.GetValue("Jwt:RefreshTokenDays", 14), 1, 30)));

builder.Services.AddControllers().AddJsonOptions(options =>
    options.JsonSerializerOptions.Converters.Add(new TimeOnlyJsonConverter()));
builder.Services.AddSignalR();
builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<ApiExceptionHandler>();
builder.Services.AddAntiforgery(options =>
{
    options.HeaderName = "X-CSRF-TOKEN";
    options.Cookie.Name = requireSecureCookies ? "__Host-DentaCore-CSRF" : "DentaCore-CSRF";
    options.Cookie.HttpOnly = false;
    options.Cookie.Path = "/";
    options.Cookie.SecurePolicy = requireSecureCookies
        ? CookieSecurePolicy.Always
        : CookieSecurePolicy.SameAsRequest;
    options.Cookie.SameSite = SameSiteMode.Strict;
});

builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.ForwardLimit = 1;
    var reverseProxyAddress = builder.Configuration["Web:ReverseProxyAddress"];
    if (!string.IsNullOrWhiteSpace(reverseProxyAddress))
    {
        if (!IPAddress.TryParse(reverseProxyAddress, out var address))
            throw new InvalidOperationException("Web:ReverseProxyAddress must be a valid IP address.");
        options.KnownProxies.Add(address);
    }
});

var origins = builder.Configuration.GetSection("Web:AllowedOrigins").Get<string[]>()
    ?? (builder.Environment.IsDevelopment()
        ? ["http://localhost:3000", "http://127.0.0.1:3000"]
        : []);
builder.Services.AddCors(options => options.AddPolicy("web", policy =>
    policy.WithOrigins(origins).AllowAnyHeader().AllowAnyMethod().AllowCredentials()));

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"] ?? "DentaCore",
            ValidateAudience = true,
            ValidAudience = builder.Configuration["Jwt:Audience"] ?? "DentaCore.Clients",
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(signingKey),
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromSeconds(30),
            RoleClaimType = ClaimTypes.Role,
            NameClaimType = ClaimTypes.NameIdentifier
        };
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var accessToken = context.Request.Query["access_token"];
                if (!string.IsNullOrEmpty(accessToken) &&
                    context.HttpContext.Request.Path.StartsWithSegments("/hubs/clinic"))
                    context.Token = accessToken;
                return Task.CompletedTask;
            }
        };
    });
builder.Services.AddAuthorization(options =>
{
    options.FallbackPolicy = options.DefaultPolicy;
    options.AddPolicy("Staff", policy => policy.RequireRole(
        RoleNames.SuperAdmin, RoleNames.Doctor, RoleNames.Receptionist));
});
builder.Services.AddSingleton<IAuthorizationPolicyProvider, PermissionPolicyProvider>();
builder.Services.AddScoped<IAuthorizationHandler, PermissionAuthorizationHandler>();

builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddPolicy("login", context => RateLimitPartition.GetFixedWindowLimiter(
        context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 5, Window = TimeSpan.FromMinutes(1), QueueLimit = 0, AutoReplenishment = true
        }));
    options.AddPolicy("register", context => RateLimitPartition.GetFixedWindowLimiter(
        context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 5, Window = TimeSpan.FromMinutes(1), QueueLimit = 0, AutoReplenishment = true
        }));
    options.AddPolicy("booking", context => RateLimitPartition.GetFixedWindowLimiter(
        context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 10, Window = TimeSpan.FromMinutes(1), QueueLimit = 0, AutoReplenishment = true
        }));
});

var app = builder.Build();
app.UseForwardedHeaders();
app.UseExceptionHandler();
if (!app.Environment.IsDevelopment())
    app.UseHsts();
app.Use(async (context, next) =>
{
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
app.MapGet("/health", async (AppDbContext db, CancellationToken cancellationToken) =>
    await db.Database.CanConnectAsync(cancellationToken)
        ? Results.Ok(new { status = "healthy" })
        : Results.StatusCode(StatusCodes.Status503ServiceUnavailable)).AllowAnonymous();
app.MapControllers();
app.MapHub<ClinicHub>("/hubs/clinic").RequireAuthorization();

await using (var scope = app.Services.CreateAsyncScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    if (db.Database.IsNpgsql())
    {
        await db.Database.MigrateAsync();
        await BootstrapData.SeedAsync(db, builder.Configuration);
    }
    else if (app.Environment.IsDevelopment() && builder.Configuration.GetValue("Database:EnsureCreated", true))
    {
        await db.Database.EnsureCreatedAsync();
        await BootstrapData.SeedAsync(db, builder.Configuration);
    }
    else if (!app.Environment.IsDevelopment())
    {
        throw new InvalidOperationException("Production requires PostgreSQL so schema migrations can be applied safely.");
    }
}

app.Run();

public partial class Program;

public sealed record TokenSigningConfiguration(
    string Issuer,
    string Audience,
    byte[] Key,
    int AccessTokenMinutes,
    int RefreshTokenDays);

internal static class BootstrapData
{
    public static async Task SeedAsync(AppDbContext db, IConfiguration configuration)
    {
        foreach (var roleName in RoleNames.All)
        {
            if (!await db.Roles.AnyAsync(role => role.Name == roleName))
                db.Roles.Add(new Role { Name = roleName, DisplayName = roleName });
        }

        foreach (var module in PermissionModules.All)
        foreach (var action in PermissionActions.All)
        {
            var code = PermissionCode.For(module, action);
            if (!await db.Permissions.AnyAsync(permission => permission.Code == code))
                db.Permissions.Add(new Permission { Module = module, Action = action, Code = code });
        }
        await db.SaveChangesAsync();

        var roleIds = await db.Roles.ToDictionaryAsync(role => role.Name, role => role.Id);
        var permissions = await db.Permissions.ToListAsync();
        foreach (var permission in permissions)
        {
            var grants = permission.Module == PermissionModules.Calendar && permission.Action == PermissionActions.View ||
                         permission.Module == PermissionModules.PatientsDb && permission.Action == PermissionActions.View ||
                         permission.Module == PermissionModules.Odontogram && permission.Action == PermissionActions.View ||
                         permission.Module == PermissionModules.Odontogram && permission.Action == PermissionActions.Edit ||
                         permission.Module == PermissionModules.Prescriptions && permission.Action != PermissionActions.Delete;
            if (grants)
                await GrantRoleAsync(db, roleIds[RoleNames.Doctor], permission.Id);

            grants = permission.Module == PermissionModules.Calendar && permission.Action != PermissionActions.Delete ||
                     permission.Module == PermissionModules.PatientsDb && permission.Action != PermissionActions.Delete ||
                     permission.Module == PermissionModules.PatientContact && permission.Action == PermissionActions.View ||
                     permission.Module == PermissionModules.Billing && permission.Action == PermissionActions.View ||
                     permission.Module == PermissionModules.Billing && permission.Action == PermissionActions.Edit ||
                     permission.Module == PermissionModules.Services && permission.Action == PermissionActions.View;
            if (grants)
                await GrantRoleAsync(db, roleIds[RoleNames.Receptionist], permission.Id);
        }

        var email = configuration["DENTACORE_BOOTSTRAP_ADMIN_EMAIL"];
        var password = configuration["DENTACORE_BOOTSTRAP_ADMIN_PASSWORD"];
        if (!string.IsNullOrWhiteSpace(email) && !string.IsNullOrWhiteSpace(password) &&
            !await db.Users.AnyAsync(user => user.Email == email))
        {
            if (password.Length < 12)
                throw new InvalidOperationException("Bootstrap admin password must be at least 12 characters.");
            db.Users.Add(new AppUser
            {
                Email = email.Trim().ToLowerInvariant(),
                FullName = "Clinic Owner",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(password),
                RoleId = roleIds[RoleNames.SuperAdmin]
            });
        }
        await db.SaveChangesAsync();
    }

    private static async Task GrantRoleAsync(AppDbContext db, int roleId, int permissionId)
    {
        var grant = await db.RolePermissions.SingleOrDefaultAsync(item =>
            item.RoleId == roleId && item.PermissionId == permissionId);
        if (grant is null)
            db.RolePermissions.Add(new RolePermission { RoleId = roleId, PermissionId = permissionId, IsGranted = true });
        else
            grant.IsGranted = true;
    }
}
