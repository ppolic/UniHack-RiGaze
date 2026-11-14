using EcoMutare.Data;
using EcoMutare.Domain.Entities;
using EcoMutare.Dtos;
using EcoMutare.Services.Auth;
using EcoMutare.Services.Trips;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EcoMutare.Controllers;

[ApiController]
[Route("trips")]
[Authorize]
public class TripsController : ControllerBase
{
    private readonly AppDbContext _db;
    public TripsController(AppDbContext db) => _db = db;

    /// Sprema završeno putovanje prijavljenog korisnika, računa ušteđeni CO₂ i dodjeljuje bodove (formula je opisana u CarbonCalculator). Sve se sprema u jednoj transakciji.
    
    [HttpPost]
    [ProducesResponseType(typeof(TripResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<TripResponse>> Create([FromBody] CreateTripRequest req, CancellationToken ct)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();

        var mode = req.Mode!.Value;
        if (!Enum.IsDefined(mode))
        {
            ModelState.AddModelError(nameof(req.Mode), "Nepoznat način prijevoza.");
            return ValidationProblem(ModelState);
        }

        var started = Utc(req.StartedAt!.Value);
        var ended = req.EndedAt is null ? (DateTime?)null : Utc(req.EndedAt.Value);
        var now = DateTime.UtcNow;
        if (started > now.AddMinutes(5))
            ModelState.AddModelError(nameof(req.StartedAt), "Početak ne može biti u budućnosti.");
        if (started < now.AddDays(-30))
            ModelState.AddModelError(nameof(req.StartedAt), "Putovanje ne smije biti starije od 30 dana.");
        if (ended is not null && ended < started)
            ModelState.AddModelError(nameof(req.EndedAt), "Kraj ne može biti prije početka.");
        if (!ModelState.IsValid) return ValidationProblem(ModelState);

        var co2 = CarbonCalculator.SavedGrams(mode, req.DistanceKm);
        var points = CarbonCalculator.Points(co2);

        await using var tx = await _db.Database.BeginTransactionAsync(ct);

        if (!await _db.Users.AnyAsync(u => u.Id == userId, ct)) return Unauthorized();

        var trip = new TripHistory
        {
            UserId = userId.Value,
            Mode = mode,
            OriginName = req.OriginName,
            DestinationName = req.DestinationName,
            OriginLatitude = req.OriginLatitude,
            OriginLongitude = req.OriginLongitude,
            DestinationLatitude = req.DestinationLatitude,
            DestinationLongitude = req.DestinationLongitude,
            DistanceKm = req.DistanceKm,
            DurationMinutes = req.DurationMinutes,
            Co2SavedGrams = co2,
            PointsEarned = points,
            StartedAt = started,
            EndedAt = ended,
        };
        _db.TripHistories.Add(trip);

        if (points > 0)
        {
            _db.PointTransactions.Add(new PointTransaction
            {
                UserId = userId.Value,
                Points = points,
                Type = PointTransactionType.Earned,
                Description = $"Putovanje: {mode}, {req.DistanceKm:0.##} km",
                TripHistory = trip,
            });
        }
        await _db.SaveChangesAsync(ct);

        // Atomarno povećanje (bez read-modify-write): sigurno i uz istodobne zahtjeve.
        if (points > 0)
        {
            await _db.Users.Where(u => u.Id == userId)
                .ExecuteUpdateAsync(s => s.SetProperty(u => u.PointsBalance, u => u.PointsBalance + points), ct);
        }
        await tx.CommitAsync(ct);

        var balance = await _db.Users.AsNoTracking().Where(u => u.Id == userId)
            .Select(u => u.PointsBalance).FirstAsync(ct);

        var response = new TripResponse
        {
            Id = trip.Id,
            Mode = mode,
            DistanceKm = trip.DistanceKm,
            DurationMinutes = trip.DurationMinutes,
            Co2SavedGrams = co2,
            PointsEarned = points,
            NewBalance = balance,
            StartedAt = started,
        };
        return StatusCode(StatusCodes.Status201Created, response);
    }

    private static DateTime Utc(DateTime d) =>
        d.Kind == DateTimeKind.Unspecified ? DateTime.SpecifyKind(d, DateTimeKind.Utc) : d.ToUniversalTime();
}
