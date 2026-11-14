using EcoMutare.Data;
using EcoMutare.Domain.Entities;
using EcoMutare.Dtos;
using EcoMutare.Services;
using EcoMutare.Services.Auth;
using EcoMutare.Services.Insights;
using EcoMutare.Services.Trips;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EcoMutare.Controllers;

/// <summary>
/// Carpool API (BE2 sat 24–38):
/// Kreiranje oglasa za dijeljenje vožnje u Timișoari, pretraga po blizini i vremenu polaska,
/// pridruživanje vožnji (rezervacija sjedala) te izračun procijenjenog troška goriva po km i po sjedalu (bez stvarne naplate).
/// </summary>
[ApiController]
[Route("carpool")]
public class CarpoolController : ControllerBase
{
    // Prosječna potrošnja 7.5 L/100km × 7.30 RON/L ≈ 0.55 RON/km
    private const decimal DefaultFuelCostPerKmRon = 0.55m;

    private readonly AppDbContext _db;
    private readonly IGreenIntelligenceService _insights;

    public CarpoolController(AppDbContext db, IGreenIntelligenceService insights)
    {
        _db = db;
        _insights = insights;
    }

    /// <summary>
    /// Pretraga aktivnih Carpool oglasa u Timișoari po blizini polazišta/odredišta, vremenu polaska i slobodnim mjestima.
    /// </summary>
    [HttpGet("rides")]
    [ProducesResponseType(typeof(List<CarpoolRideDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<List<CarpoolRideDto>>> GetRides(
        [FromQuery] double? originLat = null,
        [FromQuery] double? originLng = null,
        [FromQuery] double radiusKm = 5.0,
        [FromQuery] double? destLat = null,
        [FromQuery] double? destLng = null,
        [FromQuery] double destRadiusKm = 5.0,
        [FromQuery] DateTime? fromTime = null,
        [FromQuery] DateTime? toTime = null,
        [FromQuery] int minSeats = 1,
        [FromQuery] bool? wheelchairFriendly = null,
        CancellationToken ct = default)
    {
        var q = _db.CarpoolRides.AsNoTracking()
            .Where(r => r.IsActive && r.AvailableSeats >= Math.Max(1, minSeats));

        if (wheelchairFriendly.HasValue && wheelchairFriendly.Value)
        {
            q = q.Where(r => r.WheelchairFriendly);
        }

        if (fromTime.HasValue)
        {
            var ft = fromTime.Value.Kind == DateTimeKind.Unspecified
                ? DateTime.SpecifyKind(fromTime.Value, DateTimeKind.Utc)
                : fromTime.Value.ToUniversalTime();
            q = q.Where(r => r.DepartureTime >= ft);
        }

        if (toTime.HasValue)
        {
            var tt = toTime.Value.Kind == DateTimeKind.Unspecified
                ? DateTime.SpecifyKind(toTime.Value, DateTimeKind.Utc)
                : toTime.Value.ToUniversalTime();
            q = q.Where(r => r.DepartureTime <= tt);
        }

        var rides = await q.OrderBy(r => r.DepartureTime).ToListAsync(ct);

        var dtos = rides.Select(r => ToDto(r, originLat, originLng)).ToList();

        if (originLat.HasValue && originLng.HasValue)
        {
            double maxOriginM = Math.Max(100, radiusKm * 1000.0);
            dtos = dtos
                .Where(d => (d.DistanceFromSearchOriginM ?? 0) <= maxOriginM)
                .OrderBy(d => d.DistanceFromSearchOriginM)
                .ThenBy(d => d.DepartureTime)
                .ToList();
        }

        if (destLat.HasValue && destLng.HasValue)
        {
            double maxDestM = Math.Max(100, destRadiusKm * 1000.0);
            dtos = dtos
                .Where(d => Geo.DistanceM(destLat.Value, destLng.Value, d.DestinationLatitude, d.DestinationLongitude) <= maxDestM)
                .ToList();
        }

        return Ok(dtos);
    }

    [HttpGet("rides/{id:int}")]
    [ProducesResponseType(typeof(CarpoolRideDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<CarpoolRideDto>> GetById(int id, CancellationToken ct)
    {
        var ride = await _db.CarpoolRides.AsNoTracking().FirstOrDefaultAsync(r => r.Id == id, ct);
        return ride is null ? NotFound() : Ok(ToDto(ride, null, null));
    }

    /// <summary>
    /// Kreiranje novog Carpool oglasa. Automatski izračunava udaljenost (km), cijenu goriva po km (0.55 RON/km)
    /// i preporučeni udio troška goriva po sjedalu (informativni prikaz bez naplate).
    /// </summary>
    [HttpPost("rides")]
    [ProducesResponseType(typeof(CarpoolRideDto), StatusCodes.Status201Created)]
    public async Task<ActionResult<CarpoolRideDto>> CreateRide([FromBody] CreateCarpoolRideRequest req, CancellationToken ct)
    {
        int? driverId = User.GetUserId();
        string driverName = req.DriverName?.Trim() ?? string.Empty;

        if (driverId.HasValue)
        {
            var user = await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == driverId.Value, ct);
            if (user is not null && string.IsNullOrWhiteSpace(driverName))
            {
                driverName = user.DisplayName;
            }
        }

        if (string.IsNullOrWhiteSpace(driverName))
        {
            driverName = "Vozač Timișoara";
        }

        double straightMeters = Geo.DistanceM(req.OriginLatitude, req.OriginLongitude, req.DestinationLatitude, req.DestinationLongitude);
        double distKm = Math.Max(0.8, Math.Round((straightMeters / 1000.0) * 1.28, 2));

        decimal totalFuelRon = (decimal)distKm * DefaultFuelCostPerKmRon;
        int seats = Math.Clamp(req.AvailableSeats, 1, 7);
        // Dijeljenje troška goriva između vozača i putnika (informativno, bez naplate)
        decimal pricePerSeat = Math.Round(Math.Max(1.50m, totalFuelRon / (seats + 1)), 2);

        var dep = req.DepartureTime.HasValue
            ? (req.DepartureTime.Value.Kind == DateTimeKind.Unspecified
                ? DateTime.SpecifyKind(req.DepartureTime.Value, DateTimeKind.Utc)
                : req.DepartureTime.Value.ToUniversalTime())
            : DateTime.UtcNow.AddHours(1);

        var entity = new CarpoolRide
        {
            DriverId = driverId,
            DriverName = driverName,
            OriginName = req.OriginName.Trim(),
            OriginLatitude = req.OriginLatitude,
            OriginLongitude = req.OriginLongitude,
            DestinationName = req.DestinationName.Trim(),
            DestinationLatitude = req.DestinationLatitude,
            DestinationLongitude = req.DestinationLongitude,
            DepartureTime = dep,
            TotalSeats = seats,
            AvailableSeats = seats,
            DistanceKm = distKm,
            EstimatedFuelCostPerKmRon = DefaultFuelCostPerKmRon,
            RecommendedPricePerSeatRon = pricePerSeat,
            WheelchairFriendly = req.WheelchairFriendly,
            Notes = req.Notes?.Trim(),
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        _db.CarpoolRides.Add(entity);
        await _db.SaveChangesAsync(ct);

        return StatusCode(StatusCodes.Status201Created, ToDto(entity, null, null));
    }

    /// <summary>
    /// Pridruživanje Carpool vožnji (rezervacija sjedala).
    /// Smanjuje broj slobodnih mjesta, bilježi ušteđeni CO₂ i dodjeljuje eko-bodove putniku i vozaču!
    /// </summary>
    [HttpPost("rides/{id:int}/join")]
    [ProducesResponseType(typeof(JoinCarpoolRideResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<JoinCarpoolRideResponse>> JoinRide(
        int id,
        [FromBody] JoinCarpoolRideRequest? req,
        CancellationToken ct)
    {
        req ??= new JoinCarpoolRideRequest();
        int seats = Math.Clamp(req.Seats, 1, 4);

        var ride = await _db.CarpoolRides.FirstOrDefaultAsync(r => r.Id == id, ct);
        if (ride is null || !ride.IsActive)
        {
            return NotFound(new ProblemDetails { Status = 404, Title = "Carpool vožnja nije pronađena ili je završena." });
        }

        int? passengerId = User.GetUserId();
        if (passengerId.HasValue && ride.DriverId.HasValue && passengerId.Value == ride.DriverId.Value)
        {
            return BadRequest(new ProblemDetails { Status = 400, Title = "Vozač se ne može pridružiti vlastitom oglasu kao putnik." });
        }

        if (ride.AvailableSeats < seats)
        {
            return BadRequest(new ProblemDetails
            {
                Status = 400,
                Title = "Nema dovoljno slobodnih sjedala.",
                Detail = $"Preostalo slobodnih mjesta: {ride.AvailableSeats}, traženo: {seats}."
            });
        }

        string passengerName = req.PassengerName?.Trim() ?? string.Empty;
        if (passengerId.HasValue)
        {
            var pUser = await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == passengerId.Value, ct);
            if (pUser is not null && string.IsNullOrWhiteSpace(passengerName))
            {
                passengerName = pUser.DisplayName;
            }
        }
        if (string.IsNullOrWhiteSpace(passengerName))
        {
            passengerName = "Putnik EcoMutare";
        }

        double co2Saved = CarbonCalculator.SavedGrams(TransportMode.Carpool, ride.DistanceKm) * seats;
        int points = CarbonCalculator.Points(co2Saved) + 10; // +10 bonus za dijeljenje vožnje

        await using var tx = await _db.Database.BeginTransactionAsync(ct);

        ride.AvailableSeats -= seats;
        if (ride.AvailableSeats <= 0)
        {
            ride.AvailableSeats = 0;
        }

        var booking = new CarpoolBooking
        {
            CarpoolRideId = ride.Id,
            PassengerId = passengerId,
            PassengerName = passengerName,
            SeatsBooked = seats,
            Co2SavedGrams = co2Saved,
            PointsEarned = points,
            BookedAt = DateTime.UtcNow
        };
        _db.CarpoolBookings.Add(booking);

        int? newBalance = null;
        if (passengerId.HasValue)
        {
            var trip = new TripHistory
            {
                UserId = passengerId.Value,
                Mode = TransportMode.Carpool,
                OriginName = ride.OriginName,
                DestinationName = ride.DestinationName,
                OriginLatitude = ride.OriginLatitude,
                OriginLongitude = ride.OriginLongitude,
                DestinationLatitude = ride.DestinationLatitude,
                DestinationLongitude = ride.DestinationLongitude,
                DistanceKm = ride.DistanceKm,
                DurationMinutes = Math.Max(5, (int)Math.Round(ride.DistanceKm / 28.0 * 60.0)),
                Co2SavedGrams = co2Saved,
                PointsEarned = points,
                StartedAt = DateTime.UtcNow,
                EndedAt = DateTime.UtcNow
            };
            _db.TripHistories.Add(trip);

            _db.PointTransactions.Add(new PointTransaction
            {
                UserId = passengerId.Value,
                Points = points,
                Type = PointTransactionType.Earned,
                Description = $"Carpool vožnja ({ride.OriginName} → {ride.DestinationName})",
                TripHistory = trip
            });

            await _db.Users.Where(u => u.Id == passengerId.Value)
                .ExecuteUpdateAsync(s => s.SetProperty(u => u.PointsBalance, u => u.PointsBalance + points), ct);
        }

        // Nagradi i vozača s +15 eko-bodova što je povezao suputnika!
        if (ride.DriverId.HasValue)
        {
            _db.PointTransactions.Add(new PointTransaction
            {
                UserId = ride.DriverId.Value,
                Points = 15,
                Type = PointTransactionType.Bonus,
                Description = $"Carpool vozač bonus ({passengerName} se pridružio vožnji)"
            });

            await _db.Users.Where(u => u.Id == ride.DriverId.Value)
                .ExecuteUpdateAsync(s => s.SetProperty(u => u.PointsBalance, u => u.PointsBalance + 15), ct);
        }

        await _db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);

        if (passengerId.HasValue)
        {
            newBalance = await _db.Users.AsNoTracking()
                .Where(u => u.Id == passengerId.Value)
                .Select(u => (int?)u.PointsBalance)
                .FirstOrDefaultAsync(ct);
        }

        // Proslijedi Carpool vožnju u Green Intelligence
        _insights.RecordTrip(new CityTripRecordDto
        {
            Id = $"carpool-booking-{booking.Id}",
            Origin = new GeoPoint { Lat = ride.OriginLatitude, Lng = ride.OriginLongitude },
            Destination = new GeoPoint { Lat = ride.DestinationLatitude, Lng = ride.DestinationLongitude },
            Mode = EcoMutare.Domain.TransportMode.Carpool,
            DistanceKm = ride.DistanceKm,
            Co2SavedGrams = co2Saved,
            IsSynthetic = false
        });

        decimal shareRon = Math.Round(ride.RecommendedPricePerSeatRon * seats, 2);

        return Ok(new JoinCarpoolRideResponse
        {
            BookingId = booking.Id,
            RideId = ride.Id,
            DriverName = ride.DriverName,
            RouteSummary = $"{ride.OriginName} → {ride.DestinationName}",
            DepartureTime = ride.DepartureTime,
            SeatsBooked = seats,
            RemainingSeats = ride.AvailableSeats,
            EstimatedFuelShareRon = shareRon,
            Co2SavedGrams = co2Saved,
            PointsEarned = points,
            NewPointsBalance = newBalance,
            Message = $"Uspješno rezervirano {seats} mjesto kod vozača {ride.DriverName}! Procijenjeni udio u gorivu: {shareRon:0.00} RON (bez naplate u aplikaciji). Osvojeno +{points} eko-bodova!"
        });
    }

    /// <summary>Dohvaća sve Carpool rezervacije prijavljenog korisnika (ili po userId parametru).</summary>
    [HttpGet("my-bookings")]
    public async Task<ActionResult<object>> GetMyBookings([FromQuery] int? userId = null, CancellationToken ct = default)
    {
        var uid = userId ?? User.GetUserId();
        var q = _db.CarpoolBookings.AsNoTracking().Include(b => b.CarpoolRide).AsQueryable();
        if (uid.HasValue)
        {
            q = q.Where(b => b.PassengerId == uid.Value);
        }

        var list = await q.OrderByDescending(b => b.BookedAt).Take(50)
            .Select(b => new
            {
                b.Id,
                b.CarpoolRideId,
                b.CarpoolRide.DriverName,
                b.CarpoolRide.OriginName,
                b.CarpoolRide.DestinationName,
                b.CarpoolRide.DepartureTime,
                b.SeatsBooked,
                EstimatedFuelShareRon = b.CarpoolRide.RecommendedPricePerSeatRon * b.SeatsBooked,
                b.Co2SavedGrams,
                b.PointsEarned,
                b.BookedAt
            })
            .ToListAsync(ct);

        return Ok(list);
    }

    private static CarpoolRideDto ToDto(CarpoolRide r, double? searchLat, double? searchLng)
    {
        double co2 = CarbonCalculator.SavedGrams(TransportMode.Carpool, r.DistanceKm);
        int pts = CarbonCalculator.Points(co2) + 10;

        return new CarpoolRideDto
        {
            Id = r.Id,
            DriverId = r.DriverId,
            DriverName = r.DriverName,
            OriginName = r.OriginName,
            OriginLatitude = r.OriginLatitude,
            OriginLongitude = r.OriginLongitude,
            DestinationName = r.DestinationName,
            DestinationLatitude = r.DestinationLatitude,
            DestinationLongitude = r.DestinationLongitude,
            DepartureTime = r.DepartureTime,
            TotalSeats = r.TotalSeats,
            AvailableSeats = r.AvailableSeats,
            DistanceKm = r.DistanceKm,
            EstimatedFuelCostPerKmRon = r.EstimatedFuelCostPerKmRon,
            RecommendedPricePerSeatRon = r.RecommendedPricePerSeatRon,
            WheelchairFriendly = r.WheelchairFriendly,
            Notes = r.Notes,
            IsActive = r.IsActive,
            DistanceFromSearchOriginM = searchLat.HasValue && searchLng.HasValue
                ? Math.Round(Geo.DistanceM(searchLat.Value, searchLng.Value, r.OriginLatitude, r.OriginLongitude), 1)
                : null,
            EstimatedCo2SavedPerPassengerGrams = co2,
            EstimatedEcoPointsPerPassenger = pts
        };
    }
}
