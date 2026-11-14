using EcoMutare.Data;
using EcoMutare.Domain.Entities;
using EcoMutare.Dtos;
using EcoMutare.Services.Auth;
using EcoMutare.Services.Insights;
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
    private readonly IGreenIntelligenceService _insights;

    public TripsController(AppDbContext db, IGreenIntelligenceService insights)
    {
        _db = db;
        _insights = insights;
    }

    /// <summary>
    /// Dohvaća povijest putovanja prijavljenog korisnika, ukupnu kilometražu i ušteđeni CO₂ (kg) (sat 24–36).
    /// </summary>
    [HttpGet]
    [HttpGet("history")]
    [ProducesResponseType(typeof(TripHistorySummaryResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<TripHistorySummaryResponse>> GetHistory(
        [FromQuery] int skip = 0,
        [FromQuery] int take = 50,
        CancellationToken ct = default)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();

        skip = Math.Max(0, skip);
        take = Math.Clamp(take, 1, 200);

        var user = await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId.Value, ct);
        if (user is null) return Unauthorized();

        var q = _db.TripHistories.AsNoTracking().Where(t => t.UserId == userId.Value);
        int totalCount = await q.CountAsync(ct);
        double totalKm = Math.Round(await q.SumAsync(t => (double?)t.DistanceKm, ct) ?? 0.0, 2);
        double totalCo2Grams = await q.SumAsync(t => (double?)t.Co2SavedGrams, ct) ?? 0.0;

        var rows = await q
            .OrderByDescending(t => t.StartedAt)
            .ThenByDescending(t => t.Id)
            .Skip(skip)
            .Take(take)
            .Select(t => new TripResponse
            {
                Id = t.Id,
                Mode = t.Mode,
                OriginName = t.OriginName,
                DestinationName = t.DestinationName,
                OriginLatitude = t.OriginLatitude,
                OriginLongitude = t.OriginLongitude,
                DestinationLatitude = t.DestinationLatitude,
                DestinationLongitude = t.DestinationLongitude,
                DistanceKm = t.DistanceKm,
                DurationMinutes = t.DurationMinutes,
                Co2SavedGrams = t.Co2SavedGrams,
                PointsEarned = t.PointsEarned,
                NewBalance = user.PointsBalance,
                StartedAt = t.StartedAt,
                EndedAt = t.EndedAt
            })
            .ToListAsync(ct);

        return Ok(new TripHistorySummaryResponse
        {
            UserId = user.Id,
            TotalTripsCount = totalCount,
            TotalDistanceKm = totalKm,
            TotalCo2SavedKg = Math.Round(totalCo2Grams / 1000.0, 2),
            CurrentPointsBalance = user.PointsBalance,
            Trips = rows
        });
    }

    /// <summary>
    /// Sprema završeno putovanje prijavljenog korisnika, računa ušteđeni CO₂ i dodjeljuje bodove
    /// (formula u CarbonCalculator) te prosljeđuje anonimizirani zapis u Green Intelligence 500m mrežu.
    /// </summary>
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

        var started = Utc(req.StartedAt ?? DateTime.UtcNow.AddMinutes(-10));
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

        if (points > 0)
        {
            await _db.Users.Where(u => u.Id == userId)
                .ExecuteUpdateAsync(s => s.SetProperty(u => u.PointsBalance, u => u.PointsBalance + points), ct);
        }
        await tx.CommitAsync(ct);

        // Anonimno proslijedi putovanje u Green Intelligence 500m mrežu za izračun GapCells!
        _insights.RecordTrip(new CityTripRecordDto
        {
            Id = $"trip-db-{trip.Id}",
            Origin = new GeoPoint { Lat = req.OriginLatitude, Lng = req.OriginLongitude },
            Destination = new GeoPoint { Lat = req.DestinationLatitude, Lng = req.DestinationLongitude },
            Mode = MapEntityModeToRoutingMode(mode),
            DistanceKm = req.DistanceKm,
            Co2SavedGrams = co2,
            IsSynthetic = false
        });

        var balance = await _db.Users.AsNoTracking().Where(u => u.Id == userId)
            .Select(u => u.PointsBalance).FirstAsync(ct);

        var response = new TripResponse
        {
            Id = trip.Id,
            Mode = mode,
            OriginName = trip.OriginName,
            DestinationName = trip.DestinationName,
            OriginLatitude = trip.OriginLatitude,
            OriginLongitude = trip.OriginLongitude,
            DestinationLatitude = trip.DestinationLatitude,
            DestinationLongitude = trip.DestinationLongitude,
            DistanceKm = trip.DistanceKm,
            DurationMinutes = trip.DurationMinutes,
            Co2SavedGrams = co2,
            PointsEarned = points,
            NewBalance = balance,
            StartedAt = started,
            EndedAt = ended
        };
        return StatusCode(StatusCodes.Status201Created, response);
    }

    private static EcoMutare.Domain.TransportMode MapEntityModeToRoutingMode(TransportMode mode) => mode switch
    {
        TransportMode.Walk => EcoMutare.Domain.TransportMode.Walk,
        TransportMode.Bike => EcoMutare.Domain.TransportMode.Bike,
        TransportMode.Scooter => EcoMutare.Domain.TransportMode.Scooter,
        TransportMode.Car => EcoMutare.Domain.TransportMode.Car,
        TransportMode.Carpool => EcoMutare.Domain.TransportMode.Carpool,
        _ => EcoMutare.Domain.TransportMode.PublicTransport
    };

    private static DateTime Utc(DateTime d) =>
        d.Kind == DateTimeKind.Unspecified ? DateTime.SpecifyKind(d, DateTimeKind.Utc) : d.ToUniversalTime();
}
