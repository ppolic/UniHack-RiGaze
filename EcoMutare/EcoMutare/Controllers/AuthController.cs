using EcoMutare.Data;
using EcoMutare.Domain.Entities;
using EcoMutare.Dtos;
using EcoMutare.Services.Auth;
using Microsoft.AspNetCore.Identity.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EcoMutare.Controllers;

/// <summary>Minimalna registracija i prijava (JWT). Potrebno za zaštićene endpointe (trips, points, redeem).</summary>
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

        var user = new User
        {
            Email = email,
            DisplayName = req.DisplayName.Trim(),
            PasswordHash = PasswordHelper.Hash(req.Password),
        };
        _db.Users.Add(user);
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

    private AuthResponse ToResponse(User u)
    {
        var (token, exp) = _jwt.Create(u);
        return new AuthResponse { Token = token, ExpiresAtUtc = exp, UserId = u.Id, Email = u.Email, DisplayName = u.DisplayName };
    }
}
