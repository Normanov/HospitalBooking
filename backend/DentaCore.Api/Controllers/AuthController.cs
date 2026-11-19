using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using DentaCore.Api.Auth;
using DentaCore.Infrastructure.Persistence;
using DentaCore.Domain;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;

namespace DentaCore.Api.Controllers;

[ApiController]
[Route("api/v1/auth")]
public sealed class AuthController(
    AppDbContext db,
    IAntiforgery antiforgery,
    TokenSigningConfiguration tokenConfig,
    IConfiguration configuration,
    IWebHostEnvironment environment) : ControllerBase
{
    private const string RefreshCookie = "DentaCore-Refresh";

    [HttpGet("csrf")]
    [AllowAnonymous]
    public IActionResult Csrf()
    {
        var tokens = antiforgery.GetAndStoreTokens(HttpContext);
        return Ok(new { requestToken = tokens.RequestToken });
    }

    [HttpPost("login")]
    [AllowAnonymous]
    [EnableRateLimiting("login")]
    public async Task<IActionResult> Login(LoginRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrEmpty(request.Password))
            return Unauthorized(new ProblemDetails { Status = 401, Title = "Email yoki parol noto‘g‘ri." });
        var email = request.Email.Trim().ToLowerInvariant();
        var user = await db.Users.Include(item => item.Role)
            .SingleOrDefaultAsync(item => item.Email == email && item.IsActive, cancellationToken);
        if (user is null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            return Unauthorized(new ProblemDetails { Status = 401, Title = "Email yoki parol noto‘g‘ri." });

        user.LastLoginAt = DateTime.UtcNow;
        var refresh = CreateRefreshToken(user.Id);
        db.RefreshTokens.Add(refresh.Record);
        await db.SaveChangesAsync(cancellationToken);
        SetRefreshCookie(refresh.Token, refresh.Record.ExpiresAt);
        return Ok(new
        {
            accessToken = CreateAccessToken(user),
            expiresIn = tokenConfig.AccessTokenMinutes * 60,
            user = new { id = user.Id, user.FullName, user.Email, role = user.Role.Name }
        });
    }

    [HttpPost("register-patient")]
    [AllowAnonymous]
    [EnableRateLimiting("register")]
    public async Task<IActionResult> RegisterPatient(
        RegisterPatientRequest request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.FullName) || request.FullName.Trim().Length > 160 ||
            string.IsNullOrWhiteSpace(request.Email) || request.Email.Trim().Length > 160 ||
            string.IsNullOrWhiteSpace(request.PhoneNumber) || request.PhoneNumber.Trim().Length > 32 ||
            string.IsNullOrWhiteSpace(request.Password) || request.Password.Length < 12)
            return UnprocessableEntity(new ProblemDetails
            {
                Status = 422,
                Title = "Ro‘yxatdan o‘tish ma’lumotlari noto‘g‘ri. Parol kamida 12 ta belgidan iborat bo‘lishi kerak."
            });

        var email = request.Email.Trim().ToLowerInvariant();
        var phone = request.PhoneNumber.Trim();
        if (await db.Users.AnyAsync(user => user.Email == email, cancellationToken) ||
            await db.Patients.AnyAsync(patient => patient.PhoneNumber == phone, cancellationToken))
            return Conflict(new ProblemDetails { Status = 409, Title = "Bu email yoki telefon raqami allaqachon ro‘yxatdan o‘tgan." });

        var role = await db.Roles.SingleOrDefaultAsync(item => item.Name == RoleNames.Patient, cancellationToken)
            ?? throw new InvalidOperationException("Patient role has not been initialized.");
        var patient = new Patient { FullName = request.FullName.Trim(), PhoneNumber = phone };
        var user = new AppUser
        {
            FullName = patient.FullName,
            Email = email,
            PhoneNumber = phone,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            RoleId = role.Id,
            PatientId = patient.Id
        };
        db.Patients.Add(patient);
        db.Users.Add(user);
        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        try
        {
            await db.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
        }
        catch (DbUpdateException exception) when (PublicController.IsUniqueConstraintViolation(exception))
        {
            await transaction.RollbackAsync(cancellationToken);
            return Conflict(new ProblemDetails { Status = 409, Title = "Bu email yoki telefon raqami allaqachon ro‘yxatdan o‘tgan." });
        }

        return NoContent();
    }

    [HttpPost("refresh")]
    [AllowAnonymous]
    public async Task<IActionResult> Refresh(CancellationToken cancellationToken)
    {
        var csrfFailure = await ValidateCsrfAsync();
        if (csrfFailure is not null)
            return csrfFailure;

        var rawToken = Request.Cookies[GetRefreshCookieName()];
        if (string.IsNullOrEmpty(rawToken))
            return Unauthorized();

        var hashedToken = HashToken(rawToken);
        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        var record = await db.RefreshTokens.Include(item => item.User).ThenInclude(item => item.Role)
            .SingleOrDefaultAsync(item => item.Token == hashedToken, cancellationToken);
        if (record is null)
            return Unauthorized();

        if (!record.IsActive || !record.User.IsActive)
        {
            await db.RefreshTokens.Where(item => item.UserId == record.UserId && item.RevokedAt == null)
                .ExecuteUpdateAsync(update => update.SetProperty(item => item.RevokedAt, DateTime.UtcNow), cancellationToken);
            await transaction.CommitAsync(cancellationToken);
            ClearRefreshCookie();
            return Unauthorized();
        }

        record.RevokedAt = DateTime.UtcNow;
        var replacement = CreateRefreshToken(record.UserId);
        db.RefreshTokens.Add(replacement.Record);
        await db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        SetRefreshCookie(replacement.Token, replacement.Record.ExpiresAt);
        return Ok(new { accessToken = CreateAccessToken(record.User), expiresIn = tokenConfig.AccessTokenMinutes * 60 });
    }

    [HttpPost("logout")]
    [Authorize]
    public async Task<IActionResult> Logout(CancellationToken cancellationToken)
    {
        var csrfFailure = await ValidateCsrfAsync();
        if (csrfFailure is not null)
            return csrfFailure;

        var rawToken = Request.Cookies[GetRefreshCookieName()];
        if (!string.IsNullOrEmpty(rawToken))
        {
            var token = HashToken(rawToken);
            var record = await db.RefreshTokens.SingleOrDefaultAsync(item => item.Token == token, cancellationToken);
            if (record is not null && record.RevokedAt is null)
            {
                record.RevokedAt = DateTime.UtcNow;
                await db.SaveChangesAsync(cancellationToken);
            }
        }
        ClearRefreshCookie();
        return NoContent();
    }

    private string CreateAccessToken(AppUser user)
    {
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Name, user.FullName),
            new(ClaimTypes.Email, user.Email),
            new(ClaimTypes.Role, user.Role.Name)
        };
        if (user.DoctorId.HasValue)
            claims.Add(new Claim("doctorId", user.DoctorId.Value.ToString()));
        if (user.PatientId.HasValue)
            claims.Add(new Claim("patientId", user.PatientId.Value.ToString()));

        var credentials = new SigningCredentials(
            new SymmetricSecurityKey(tokenConfig.Key), SecurityAlgorithms.HmacSha256);
        var token = new JwtSecurityToken(
            tokenConfig.Issuer,
            tokenConfig.Audience,
            claims,
            expires: DateTime.UtcNow.AddMinutes(tokenConfig.AccessTokenMinutes),
            signingCredentials: credentials);
        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private (string Token, RefreshToken Record) CreateRefreshToken(Guid userId)
    {
        var token = WebEncoders.Base64UrlEncode(RandomNumberGenerator.GetBytes(48));
        return (token, new RefreshToken
        {
            UserId = userId,
            Token = HashToken(token),
            ExpiresAt = DateTime.UtcNow.AddDays(tokenConfig.RefreshTokenDays)
        });
    }

    private static string HashToken(string token) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token)));

    private async Task<IActionResult?> ValidateCsrfAsync()
    {
        try
        {
            await antiforgery.ValidateRequestAsync(HttpContext);
            return null;
        }
        catch (AntiforgeryValidationException)
        {
            return BadRequest(new ProblemDetails { Status = 400, Title = "CSRF token noto‘g‘ri yoki mavjud emas." });
        }
    }

    private string GetRefreshCookieName()
    {
        var originHeader = Request.Headers.Origin.ToString();
        if (!Uri.TryCreate(originHeader, UriKind.Absolute, out var origin) ||
            origin.Scheme is not ("http" or "https"))
            return RefreshCookie;

        var sameOriginHost =
            string.Equals(origin.Host, Request.Host.Host, StringComparison.OrdinalIgnoreCase) &&
            string.Equals(origin.Scheme, Request.Scheme, StringComparison.OrdinalIgnoreCase);
        var isConfiguredOrigin = (configuration.GetSection("Web:AllowedOrigins").Get<string[]>() ?? [])
            .Any(value =>
                Uri.TryCreate(value, UriKind.Absolute, out var allowedOrigin) &&
                string.Equals(
                    allowedOrigin.GetLeftPart(UriPartial.Authority),
                    origin.GetLeftPart(UriPartial.Authority),
                    StringComparison.OrdinalIgnoreCase));
        if (!sameOriginHost && !isConfiguredOrigin)
            return RefreshCookie;

        var normalizedOrigin = origin.GetLeftPart(UriPartial.Authority).ToLowerInvariant();
        var originHash = SHA256.HashData(Encoding.UTF8.GetBytes(normalizedOrigin));
        return $"{RefreshCookie}-{Convert.ToHexString(originHash.AsSpan(0, 8))}";
    }

    private void SetRefreshCookie(string token, DateTime expiresAt)
    {
        var options = new CookieOptions
        {
            HttpOnly = true,
            Secure = SecureCookies,
            SameSite = SameSiteMode.Strict,
            Path = "/api/v1/auth",
            Expires = expiresAt
        };
        var cookieName = GetRefreshCookieName();
        if (cookieName != RefreshCookie)
            Response.Cookies.Delete(RefreshCookie, options);
        Response.Cookies.Append(cookieName, token, options);
    }

    private void ClearRefreshCookie()
    {
        var options = new CookieOptions
        {
            HttpOnly = true,
            Secure = SecureCookies,
            SameSite = SameSiteMode.Strict,
            Path = "/api/v1/auth"
        };
        var cookieName = GetRefreshCookieName();
        Response.Cookies.Delete(cookieName, options);
        if (cookieName != RefreshCookie)
            Response.Cookies.Delete(RefreshCookie, options);
    }

    private bool SecureCookies =>
        (configuration.GetValue<bool?>("Security:CookiesRequireHttps") ?? !environment.IsDevelopment())
        || Request.IsHttps;
}

public sealed record LoginRequest(string Email, string Password);
public sealed record RegisterPatientRequest(string FullName, string Email, string PhoneNumber, string Password);
