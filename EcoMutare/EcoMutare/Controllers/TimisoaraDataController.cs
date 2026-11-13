using EcoMutare.Dtos;
using EcoMutare.Services;
using EcoMutare.Services.Routing;
using Microsoft.AspNetCore.Mvc;

namespace EcoMutare.Controllers;

/// <summary>
/// Javni podaci grada Timișoare (VeloTM stanice, TimPark parkirališta, STPT stanice, biciklistički koridori)
/// te dijagnostički endpoint za provjeru ORS + Open-Meteo + elevation integracije (sat 4–12).
/// </summary>
[ApiController]
public class TimisoaraDataController : ControllerBase
{
    private readonly IRoutingProvider _routing;
    private readonly IWeatherProvider _weather;
    private readonly IElevationProvider _elevation;

    public TimisoaraDataController(
        IRoutingProvider routing,
        IWeatherProvider weather,
        IElevationProvider elevation)
    {
        _routing = routing;
        _weather = weather;
        _elevation = elevation;
    }

    /// <summary>Vraća VeloTM biciklističke i romobilske stanice u Timișoari.</summary>
    [HttpGet("stations")]
    [ProducesResponseType(typeof(IEnumerable<MobilityStationDto>), StatusCodes.Status200OK)]
    public ActionResult<IEnumerable<MobilityStationDto>> GetStations([FromQuery] string? type = null)
    {
        var items = TimisoaraPublicData.Stations.AsEnumerable();
        if (!string.IsNullOrWhiteSpace(type))
        {
            items = items.Where(s => s.VehicleType.Equals(type, StringComparison.OrdinalIgnoreCase));
        }
        return Ok(items);
    }

    /// <summary>Vraća TimPark javna parkirališta u Timișoari (sortirana po udaljenosti ako su zadani lat/lng).</summary>
    [HttpGet("parkings")]
    [ProducesResponseType(typeof(IEnumerable<ParkingLotDto>), StatusCodes.Status200OK)]
    public ActionResult<IEnumerable<ParkingLotDto>> GetParkings(
        [FromQuery] double? lat = null,
        [FromQuery] double? lng = null,
        [FromQuery] bool onlyAccessible = false)
    {
        var items = TimisoaraPublicData.Parkings.AsEnumerable();
        if (onlyAccessible)
        {
            items = items.Where(p => p.HasDisabledAccess && p.AccessibleSpots > 0);
        }

        if (lat.HasValue && lng.HasValue)
        {
            var target = new GeoPoint { Lat = lat.Value, Lng = lng.Value };
            items = items.OrderBy(p => TimisoaraPublicData.HaversineMeters(target, new GeoPoint { Lat = p.Lat, Lng = p.Lng }));
        }
        return Ok(items);
    }

    /// <summary>Vraća najbliže STPT stanice javnog prijevoza u Timișoari.</summary>
    [HttpGet("transit/stops/nearby")]
    [ProducesResponseType(typeof(IEnumerable<TransitStopDto>), StatusCodes.Status200OK)]
    public ActionResult<IEnumerable<TransitStopDto>> GetNearbyStops(
        [FromQuery] double lat = 45.7537,
        [FromQuery] double lng = 21.2257,
        [FromQuery] bool onlyWheelchairAccessible = false)
    {
        var origin = new GeoPoint { Lat = lat, Lng = lng };
        var stops = TimisoaraPublicData.TransitStops.AsEnumerable();
        if (onlyWheelchairAccessible)
        {
            stops = stops.Where(s => s.WheelchairAccessible);
        }

        return Ok(stops.OrderBy(s => TimisoaraPublicData.HaversineMeters(origin, new GeoPoint { Lat = s.Lat, Lng = s.Lng })));
    }

    /// <summary>Vraća glavne biciklističke koridore (piste de biciclete) u Timișoari za crtanje na karti.</summary>
    [HttpGet("bikelanes")]
    [ProducesResponseType(typeof(IEnumerable<BikeCorridorDto>), StatusCodes.Status200OK)]
    public ActionResult<IEnumerable<BikeCorridorDto>> GetBikeLanes() =>
        Ok(TimisoaraPublicData.BikeCorridors);

    /// <summary>Vraća javne mjerne postaje kvalitete zraka (RNMCA / calitateaer.ro) i prometne točke u Timișoari.</summary>
    [HttpGet("air-quality/stations")]
    [ProducesResponseType(typeof(IEnumerable<TimisoaraPublicData.AirQualityStationDto>), StatusCodes.Status200OK)]
    public ActionResult<IEnumerable<TimisoaraPublicData.AirQualityStationDto>> GetAirQualityStations() =>
        Ok(TimisoaraPublicData.AirQualityStations);

    /// <summary>Dijagnostički endpoint (sat 4–12): testira ORS profile, Open-Meteo vrijeme i elevaciju na stvarnoj ruti u Timișoari.</summary>
    [HttpGet("debug/ors-test")]
    public async Task<IActionResult> TestIntegrations(
        [FromQuery] double fromLat = 45.7537,
        [FromQuery] double fromLng = 21.2257,
        [FromQuery] double toLat = 45.7474,
        [FromQuery] double toLng = 21.2263,
        [FromQuery] RoutingProfile profile = RoutingProfile.CyclingRegular,
        CancellationToken ct = default)
    {
        var from = new GeoPoint { Lat = fromLat, Lng = fromLng };
        var to = new GeoPoint { Lat = toLat, Lng = toLng };

        var routeTask = _routing.GetRouteAsync(from, to, profile, ct);
        var weatherTask = _weather.GetWeatherAsync(from, DateTimeOffset.UtcNow, ct);
        await Task.WhenAll(routeTask, weatherTask);

        var route = await routeTask;
        var elevations = route is not null && route.Geometry.Count > 0
            ? await _elevation.GetElevationsAsync(route.Geometry, ct)
            : Array.Empty<double>();

        return Ok(new
        {
            profile = profile.ToString(),
            from,
            to,
            weather = await weatherTask,
            route,
            sampleElevationsMeters = elevations.Take(10)
        });
    }
}
