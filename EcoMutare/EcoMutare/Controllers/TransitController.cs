using EcoMutare.Data;
using EcoMutare.Domain.Entities;
using EcoMutare.Dtos;
using EcoMutare.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EcoMutare.Controllers;

/// Javni prijevoz iz već uvezenih GTFS podataka (samo čitanje).
[ApiController]
[Route("transit")]
public class TransitController : ControllerBase
{
    private const int DefaultLimit = 100;
    private const int MaxLimit = 1000;

    private readonly AppDbContext _db;
    public TransitController(AppDbContext db) => _db = db;

    /// Linije. Filter: routeType (GTFS: 0 tramvaj, 3 autobus, 11 trolejbus), q (kratki/dugi naziv).
    [HttpGet("routes")]
    [ProducesResponseType(typeof(List<TransitRouteDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<List<TransitRouteDto>>> GetRoutes(
        [FromQuery] int? routeType, [FromQuery] string? q, CancellationToken ct)
    {
        var query = _db.Routes.AsNoTracking().AsQueryable();
        if (routeType is not null) query = query.Where(r => r.RouteType == routeType);
        if (!string.IsNullOrWhiteSpace(q))
            query = query.Where(r => r.ShortName.Contains(q) || (r.LongName != null && r.LongName.Contains(q)));

        var routes = await query.OrderBy(r => r.ShortName).ToListAsync(ct);
        return Ok(routes.Select(ToDto).ToList());
    }

    [HttpGet("routes/{id:int}")]
    [ProducesResponseType(typeof(TransitRouteDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<TransitRouteDto>> GetRoute(int id, CancellationToken ct)
    {
        var r = await _db.Routes.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct);
        return r is null ? NotFound() : Ok(ToDto(r));
    }
    /// Stajališta. Filteri: routeId (stajališta koja ta linija opslužuje), q (naziv), lat+lng+radiusM (u blizini, zadano 500 m), limit (zadano 100, najviše 1000).
    
    [HttpGet("stops")]
    [ProducesResponseType(typeof(List<StopDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<List<StopDto>>> GetStops(
        [FromQuery] int? routeId, [FromQuery] string? q,
        [FromQuery] double? lat, [FromQuery] double? lng, [FromQuery] double radiusM = 500,
        [FromQuery] int limit = DefaultLimit, CancellationToken ct = default)
    {
        limit = Math.Clamp(limit, 1, MaxLimit);
        var query = _db.Stops.AsNoTracking().AsQueryable();
        if (routeId is not null)
            query = query.Where(s => s.StopTimes.Any(st => st.TransitTrip.TransitRouteId == routeId));
        if (!string.IsNullOrWhiteSpace(q)) query = query.Where(s => s.Name.Contains(q));

        if (lat is not null && lng is not null)
        {
            radiusM = Math.Clamp(radiusM, 10, 5000);
            var dLat = radiusM / 111_320.0;
            var dLng = radiusM / (111_320.0 * Math.Cos(lat.Value * Math.PI / 180));
            query = query.Where(s => s.Latitude >= lat - dLat && s.Latitude <= lat + dLat &&
                                     s.Longitude >= lng - dLng && s.Longitude <= lng + dLng);
            var near = (await query.ToListAsync(ct))
                .Select(s => ToDto(s, Geo.DistanceM(lat.Value, lng.Value, s.Latitude, s.Longitude)))
                .Where(s => s.DistanceM <= radiusM)
                .OrderBy(s => s.DistanceM).Take(limit).ToList();
            return Ok(near);
        }

        var stops = await query.OrderBy(s => s.Name).Take(limit).ToListAsync(ct);
        return Ok(stops.Select(s => ToDto(s, null)).ToList());
    }

    [HttpGet("stops/{id:int}")]
    [ProducesResponseType(typeof(StopDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<StopDto>> GetStop(int id, CancellationToken ct)
    {
        var s = await _db.Stops.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct);
        return s is null ? NotFound() : Ok(ToDto(s, null));
    }

    /// Vožnje (GTFS trips). Filteri: routeId, stopId (vožnje koje staju na stajalištu), serviceId, directionId, limit.
    [HttpGet("trips")]
    [ProducesResponseType(typeof(List<TransitTripDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<List<TransitTripDto>>> GetTrips(
        [FromQuery] int? routeId, [FromQuery] int? stopId, [FromQuery] string? serviceId,
        [FromQuery] int? directionId, [FromQuery] int limit = DefaultLimit, CancellationToken ct = default)
    {
        limit = Math.Clamp(limit, 1, MaxLimit);
        var query = _db.TransitTrips.AsNoTracking().AsQueryable();
        if (routeId is not null) query = query.Where(t => t.TransitRouteId == routeId);
        if (stopId is not null) query = query.Where(t => t.StopTimes.Any(st => st.StopId == stopId));
        if (!string.IsNullOrWhiteSpace(serviceId)) query = query.Where(t => t.ServiceId == serviceId);
        if (directionId is not null) query = query.Where(t => t.DirectionId == directionId);

        var trips = await query.OrderBy(t => t.Id).Take(limit)
            .Select(t => new TransitTripDto
            {
                Id = t.Id,
                GtfsTripId = t.GtfsTripId,
                RouteId = t.TransitRouteId,
                RouteShortName = t.TransitRoute.ShortName,
                ServiceId = t.ServiceId,
                Headsign = t.Headsign,
                DirectionId = t.DirectionId,
            }).ToListAsync(ct);
        return Ok(trips);
    }
    /// Vozni red (stop times). Obavezno je poslati stopId ili tripId (bez toga bi odgovor bio ogroman).
    /// Dodatni filteri: routeId, serviceId, after (HH:mm — samo dolasci nakon tog vremena), limit.
    /// Za stopId sortirano po vremenu dolaska, za tripId po redoslijedu stajališta.

    [HttpGet("stop-times")]
    [ProducesResponseType(typeof(List<StopTimeDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<List<StopTimeDto>>> GetStopTimes(
        [FromQuery] int? stopId, [FromQuery] int? tripId, [FromQuery] int? routeId,
        [FromQuery] string? serviceId, [FromQuery] string? after,
        [FromQuery] int limit = DefaultLimit, CancellationToken ct = default)
    {
        if (stopId is null && tripId is null)
        {
            ModelState.AddModelError("filter", "Obavezan je stopId ili tripId.");
            return ValidationProblem(ModelState);
        }
        TimeSpan? afterTime = null;
        if (!string.IsNullOrWhiteSpace(after))
        {
            if (!TimeSpan.TryParse(after, out var t) || t < TimeSpan.Zero)
            {
                ModelState.AddModelError(nameof(after), "Format mora biti HH:mm.");
                return ValidationProblem(ModelState);
            }
            afterTime = t;
        }

        limit = Math.Clamp(limit, 1, MaxLimit);
        var query = _db.StopTimes.AsNoTracking().AsQueryable();
        if (stopId is not null) query = query.Where(st => st.StopId == stopId);
        if (tripId is not null) query = query.Where(st => st.TransitTripId == tripId);
        if (routeId is not null) query = query.Where(st => st.TransitTrip.TransitRouteId == routeId);
        if (!string.IsNullOrWhiteSpace(serviceId)) query = query.Where(st => st.TransitTrip.ServiceId == serviceId);
        if (afterTime is not null) query = query.Where(st => st.ArrivalTime >= afterTime);

        query = tripId is not null
            ? query.OrderBy(st => st.StopSequence)
            : query.OrderBy(st => st.ArrivalTime).ThenBy(st => st.Id);

        var rows = await query.Take(limit).Select(st => new
        {
            st.Id,
            st.TransitTripId,
            RouteId = st.TransitTrip.TransitRouteId,
            RouteShortName = st.TransitTrip.TransitRoute.ShortName,
            st.TransitTrip.Headsign,
            st.StopId,
            StopName = st.Stop.Name,
            st.StopSequence,
            st.ArrivalTime,
            st.DepartureTime,
        }).ToListAsync(ct);

        return Ok(rows.Select(r => new StopTimeDto
        {
            Id = r.Id,
            TripId = r.TransitTripId,
            RouteId = r.RouteId,
            RouteShortName = r.RouteShortName,
            Headsign = r.Headsign,
            StopId = r.StopId,
            StopName = r.StopName,
            StopSequence = r.StopSequence,
            ArrivalTime = Fmt(r.ArrivalTime),
            DepartureTime = Fmt(r.DepartureTime),
        }).ToList());
    }

    /// <summary>
    /// Nadolazeći polasci po statičkom voznom redu (bez realtime kašnjenja) za zadano stajalište (stopId) ili najbliže koordinate (lat/lng).
    /// </summary>
    [HttpGet("departures")]
    [ProducesResponseType(typeof(List<StopTimeDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<List<StopTimeDto>>> GetDepartures(
        [FromQuery] int? stopId = null,
        [FromQuery] double? lat = null,
        [FromQuery] double? lng = null,
        [FromQuery] string? after = null,
        [FromQuery] int limit = 20,
        CancellationToken ct = default)
    {
        int? resolvedStopId = stopId;
        if (resolvedStopId is null && lat.HasValue && lng.HasValue)
        {
            var stops = await _db.Stops.AsNoTracking().ToListAsync(ct);
            var nearest = stops
                .OrderBy(s => Geo.DistanceM(lat.Value, lng.Value, s.Latitude, s.Longitude))
                .FirstOrDefault();
            resolvedStopId = nearest?.Id;
        }

        if (resolvedStopId is null)
        {
            var firstStop = await _db.Stops.AsNoTracking().OrderBy(s => s.Id).FirstOrDefaultAsync(ct);
            resolvedStopId = firstStop?.Id ?? 1;
        }

        string effectiveAfter = string.IsNullOrWhiteSpace(after)
            ? DateTime.UtcNow.AddHours(2).ToString("HH:mm")
            : after;

        return await GetStopTimes(resolvedStopId, null, null, null, effectiveAfter, limit, ct);
    }

    private static string Fmt(TimeSpan t) => $"{(int)t.TotalHours:00}:{t.Minutes:00}:{t.Seconds:00}";

    private static TransitRouteDto ToDto(TransitRoute r) => new()
    {
        Id = r.Id,
        GtfsRouteId = r.GtfsRouteId,
        ShortName = r.ShortName,
        LongName = r.LongName,
        RouteType = r.RouteType,
        Color = r.Color,
        Mode = r.RouteType switch { 0 => "Tram", 3 => "Bus", 11 => "Trolleybus", _ => "Other" },
    };

    private static StopDto ToDto(Stop s, double? distanceM) => new()
    {
        Id = s.Id,
        GtfsStopId = s.GtfsStopId,
        Name = s.Name,
        Latitude = s.Latitude,
        Longitude = s.Longitude,
        DistanceM = distanceM,
    };
}
