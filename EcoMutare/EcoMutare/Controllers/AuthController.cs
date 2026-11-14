using EcoMutare.Data;
using EcoMutare.Domain;
using EcoMutare.Domain.Entities;
using EcoMutare.Dtos;
using EcoMutare.Services.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EcoMutare.Controllers;

/// <summary>
/// Registracija, prijava (JWT) i upravljanje profilom korisnika (/auth/register, /auth/login, /auth/me, /me).
/// Iz datuma rođenja automatski se računa AgeCategory (Under14, From14To15, Adult) za sigurnosna pravila planera ruta.
/// </summary>
[ApiController]
[Route("auth")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly JwtTokenService _jwt;

    public AuthController(AppDbContext db, JwtTokenService jwt)
    {
        _db = db;
        _jwt = jwt;
    }

    [HttpPost("register")]
    [ProducesResponseType(typeof(AuthResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<AuthResponse>> Register([FromBody] AuthRegisterRequest req, CancellationToken ct)
    {
        var email = req.Email.Trim().ToLowerInvariant();
        if (await _db.Users.AnyAsync(u => u.Email == email, ct))
            return Conflict(new ProblemDetails { Status = 409, Title = "Email je već registriran." });

        var ageCat = CalculateAgeCategory(req.BirthDate);

        var user = new User
        {
            Email = email,
            DisplayName = req.DisplayName.Trim(),
            PasswordHash = PasswordHelper.Hash(req.Password),
            BirthDate = req.BirthDate,
            AgeCategory = ageCat,
            HasDisability = req.HasDisability,
            OwnsBike = req.OwnsBike,
            OwnsScooter = req.OwnsScooter,
            OwnsCar = req.OwnsCar,
            PointsBalance = 50,
        };
        _db.Users.Add(user);
        await _db.SaveChangesAsync(ct);

        _db.PointTransactions.Add(new PointTransaction
        {
            UserId = user.Id,
            Points = 50,
            Type = PointTransactionType.Bonus,
            Description = "Bonus добродошлице za registraciju u EcoMutare Timișoara"
        });
        await _db.SaveChangesAsync(ct);

        return StatusCode(StatusCodes.Status201Created, ToResponse(user));
    }

    [HttpPost("login")]
    [ProducesResponseType(typeof(AuthResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<AuthResponse>> Login([FromBody] AuthLoginRequest req, CancellationToken ct)
    {
        var email = req.Email.Trim().ToLowerInvariant();
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == email, ct);
        if (user is null || !PasswordHelper.Verify(req.Password, user.PasswordHash))
            return Unauthorized(new ProblemDetails { Status = 401, Title = "Pogrešan email ili lozinka." });
        return Ok(ToResponse(user));
    }

    /// <summary>Dohvaća profil prijavljenog korisnika (podržava i /auth/me i /me).</summary>
    [HttpGet("me")]
    [HttpGet("/me")]
    [Authorize]
    [ProducesResponseType(typeof(AuthResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<AuthResponse>> GetMe(CancellationToken ct)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();

        var user = await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId.Value, ct);
        if (user is null) return Unauthorized();

        return Ok(ToResponse(user));
    }

    /// <summary>Ažurira profilne postavke prijavljenog korisnika (invaliditet, vlastita vozila, datum rođenja).</summary>
    [HttpPut("me")]
    [HttpPut("/me")]
    [Authorize]
    [ProducesResponseType(typeof(AuthResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<AuthResponse>> UpdateMe([FromBody] UpdateUserProfileRequest req, CancellationToken ct)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId.Value, ct);
        if (user is null) return Unauthorized();

        if (!string.IsNullOrWhiteSpace(req.DisplayName))
            user.DisplayName = req.DisplayName.Trim();
        if (req.BirthDate.HasValue)
        {
            user.BirthDate = req.BirthDate.Value;
            user.AgeCategory = CalculateAgeCategory(req.BirthDate);
        }
        if (req.HasDisability.HasValue) user.HasDisability = req.HasDisability.Value;
        if (req.OwnsBike.HasValue) user.OwnsBike = req.OwnsBike.Value;
        if (req.OwnsScooter.HasValue) user.OwnsScooter = req.OwnsScooter.Value;
        if (req.OwnsCar.HasValue) user.OwnsCar = req.OwnsCar.Value;

        await _db.SaveChangesAsync(ct);
        return Ok(ToResponse(user));
    }

    /// <summary>Vraća popis spremnih demo računa u bazi (lozinka za sve: Demo123!) za brzi test scenarija pred žirijem.</summary>
    [HttpGet("demo-accounts")]
    public async Task<ActionResult<object>> GetDemoAccounts(CancellationToken ct)
    {
        var users = await _db.Users.AsNoTracking()
            .OrderBy(u => u.Id)
            .Select(u => new
            {
                u.Id,
                u.Email,
                PasswordForDemo = "Demo123!",
                u.DisplayName,
                u.AgeCategory,
                u.HasDisability,
                u.OwnsBike,
                u.OwnsScooter,
                u.OwnsCar,
                u.PointsBalance
            })
            .ToListAsync(ct);

        return Ok(users);
    }

    public static AgeCategory CalculateAgeCategory(DateTime? birthDate)
    {
        if (!birthDate.HasValue) return AgeCategory.Adult;
        var today = DateTime.UtcNow.Date;
        var age = today.Year - birthDate.Value.Year;
        if (birthDate.Value.Date > today.AddYears(-age)) age--;

        if (age < 14) return AgeCategory.Under14;
        if (age <= 15) return AgeCategory.From14To15;
        return AgeCategory.Adult;
    }

    private AuthResponse ToResponse(User u)
    {
        var (token, exp) = _jwt.Create(u);
        return new AuthResponse
        {
            Token = token,
            ExpiresAtUtc = exp,
            UserId = u.Id,
            Email = u.Email,
            DisplayName = u.DisplayName,
            PointsBalance = u.PointsBalance,
            BirthDate = u.BirthDate,
            AgeCategory = u.AgeCategory,
            HasDisability = u.HasDisability,
            OwnsBike = u.OwnsBike,
            OwnsScooter = u.OwnsScooter,
            OwnsCar = u.OwnsCar
        };
    }
}
