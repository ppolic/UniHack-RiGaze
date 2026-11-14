using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using EcoMutare.Dtos;
using EcoMutare.Services.Routing;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;

namespace EcoMutare.Integrations.OpenRouteService;

public class OpenRouteServiceClient : IRoutingProvider
{
    private readonly HttpClient _http;
    private readonly OpenRouteServiceOptions _options;
    private readonly IMemoryCache _cache;
    private readonly IElevationProvider _elevation;
    private readonly ILogger<OpenRouteServiceClient> _logger;

    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNameCaseInsensitive = true,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    public OpenRouteServiceClient(
        HttpClient http,
        IOptions<OpenRouteServiceOptions> options,
        IMemoryCache cache,
        IElevationProvider elevation,
        ILogger<OpenRouteServiceClient> logger)
    {
        _http = http;
        _options = options.Value;
        _cache = cache;
        _elevation = elevation;
        _logger = logger;
    }

    public async Task<RoutingResult?> GetRouteAsync(
        GeoPoint from,
        GeoPoint to,
        RoutingProfile profile,
        CancellationToken ct = default)
    {
        var cacheKey = BuildCacheKey(from, to, profile);
        if (_cache.TryGetValue<RoutingResult>(cacheKey, out var cached) && cached is not null)
        {
            return cached;
        }

        RoutingResult? result = null;

        if (!string.IsNullOrWhiteSpace(_options.ApiKey))
        {
            result = await TryCallOrsAsync(from, to, profile, ct);
        }

        // Ako ORS nije konfiguriran, koristi javni OSRM za precizne cestovne rute po Timișoari
        result ??= await TryCallOsrmAsync(from, to, profile, ct);

        // Fallback na lokalnu uličnu mrežu i mostove Bege
        result ??= await BuildFallbackRouteAsync(from, to, profile, ct);

        _cache.Set(cacheKey, result, TimeSpan.FromHours(1));
        return result;
    }

    private async Task<RoutingResult?> TryCallOsrmAsync(
        GeoPoint from,
        GeoPoint to,
        RoutingProfile profile,
        CancellationToken ct)
    {
        try
        {
            var osrmProfile = profile switch
            {
                RoutingProfile.FootWalking => "foot",
                RoutingProfile.Wheelchair => "foot",
                RoutingProfile.CyclingRegular => "bike",
                RoutingProfile.DrivingCar => "driving",
                _ => "foot"
            };

            var fromLng = from.Lng.ToString(System.Globalization.CultureInfo.InvariantCulture);
            var fromLat = from.Lat.ToString(System.Globalization.CultureInfo.InvariantCulture);
            var toLng = to.Lng.ToString(System.Globalization.CultureInfo.InvariantCulture);
            var toLat = to.Lat.ToString(System.Globalization.CultureInfo.InvariantCulture);

            var url = $"https://router.project-osrm.org/route/v1/{osrmProfile}/{fromLng},{fromLat};{toLng},{toLat}?overview=full&geometries=geojson";

            using var req = new HttpRequestMessage(HttpMethod.Get, url);
            req.Headers.UserAgent.ParseAdd("BeGreen/1.0");

            using var resp = await _http.SendAsync(req, ct);
            if (!resp.IsSuccessStatusCode)
            {
                return null;
            }

            using var stream = await resp.Content.ReadAsStreamAsync(ct);
            using var doc = await JsonDocument.ParseAsync(stream, cancellationToken: ct);
            var root = doc.RootElement;
            if (!root.TryGetProperty("routes", out var routes) || routes.GetArrayLength() == 0)
            {
                return null;
            }

            var route = routes[0];
            double distanceMeters = route.GetProperty("distance").GetDouble();
            double durationSeconds = route.GetProperty("duration").GetDouble();

            var coords = route.GetProperty("geometry").GetProperty("coordinates");
            var geometry = new List<GeoPoint>();
            foreach (var coord in coords.EnumerateArray())
            {
                geometry.Add(new GeoPoint
                {
                    Lng = Math.Round(coord[0].GetDouble(), 6),
                    Lat = Math.Round(coord[1].GetDouble(), 6)
                });
            }

            if (geometry.Count < 2) return null;

            double? bikeShare = profile == RoutingProfile.CyclingRegular ? 0.8 : null;

            return new RoutingResult
            {
                DistanceMeters = Math.Round(distanceMeters, 1),
                DurationSeconds = Math.Round(durationSeconds, 1),
                Geometry = geometry,
                AscentMeters = 0,
                DescentMeters = 0,
                AverageGradePercent = 0,
                BikeLaneShare = bikeShare
            };
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "OSRM routing fallback failed, using realistic street corridor fallback");
            return null;
        }
    }

    private async Task<RoutingResult?> TryCallOrsAsync(
        GeoPoint from,
        GeoPoint to,
        RoutingProfile profile,
        CancellationToken ct)
    {
        try
        {
            var orsProfile = MapProfile(profile);
            var url = $"{_options.BaseUrl.TrimEnd('/')}/v2/directions/{orsProfile}/geojson";

            // ORS koristi redoslijed [lng, lat]!
            var payload = new
            {
                coordinates = new[]
                {
                    new[] { from.Lng, from.Lat },
                    new[] { to.Lng, to.Lat }
                },
                elevation = true,
                extra_info = new[] { "waytype", "steepness", "suitability" }
            };

            using var req = new HttpRequestMessage(HttpMethod.Post, url)
            {
                Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json")
            };
            req.Headers.TryAddWithoutValidation("Authorization", _options.ApiKey);
            req.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/geo+json"));
            req.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

            using var resp = await _http.SendAsync(req, ct);
            if (!resp.IsSuccessStatusCode)
            {
                _logger.LogWarning("ORS vratio status {Status} za profil {Profile}. Prebacujem na fallback.",
                    (int)resp.StatusCode, orsProfile);
                return null;
            }

            await using var stream = await resp.Content.ReadAsStreamAsync(ct);
            using var doc = await JsonDocument.ParseAsync(stream, cancellationToken: ct);
            return ParseGeoJsonResponse(doc.RootElement, profile);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Greška pri pozivu OpenRouteService-a za profil {Profile}. Prebacujem na fallback.", profile);
            return null;
        }
    }

    private static RoutingResult? ParseGeoJsonResponse(JsonElement root, RoutingProfile profile)
    {
        if (!root.TryGetProperty("features", out var features) || features.GetArrayLength() == 0)
        {
            return null;
        }

        var feature = features[0];
        var props = feature.GetProperty("properties");
        var summary = props.GetProperty("summary");

        var distanceMeters = summary.TryGetProperty("distance", out var dEl) ? dEl.GetDouble() : 0;
        var durationSeconds = summary.TryGetProperty("duration", out var tEl) ? tEl.GetDouble() : 0;

        double ascent = props.TryGetProperty("ascent", out var ascEl) ? ascEl.GetDouble() : 0;
        double descent = props.TryGetProperty("descent", out var descEl) ? descEl.GetDouble() : 0;

        // Geometrija iz GeoJSON LineString: coordinates = [[lng, lat, elev?], ...]
        var geometry = new List<GeoPoint>();
        var elevations = new List<double>();
        if (feature.TryGetProperty("geometry", out var geom) &&
            geom.TryGetProperty("coordinates", out var coords))
        {
            foreach (var coord in coords.EnumerateArray())
            {
                var lng = coord[0].GetDouble();
                var lat = coord[1].GetDouble();
                geometry.Add(new GeoPoint { Lat = lat, Lng = lng });
                if (coord.GetArrayLength() >= 3)
                {
                    elevations.Add(coord[2].GetDouble());
                }
            }
        }

        // Ako ORS nije vratio ascent/descent u properties, izračunaj iz 3D koordinata
        if (ascent == 0 && descent == 0 && elevations.Count > 1)
        {
            (ascent, descent) = ComputeAscentDescent(elevations);
        }

        var avgGrade = distanceMeters > 1
            ? Math.Round((ascent / distanceMeters) * 100.0, 2)
            : 0;

        double? bikeLaneShare = ComputeBikeLaneShareFromExtras(props, geometry.Count, profile);
        if (bikeLaneShare is null && profile == RoutingProfile.CyclingRegular)
        {
            bikeLaneShare = Services.TimisoaraPublicData.EstimateBikeLaneCoverage(geometry);
        }

        return new RoutingResult
        {
            DistanceMeters = Math.Round(distanceMeters, 1),
            DurationSeconds = Math.Round(durationSeconds, 1),
            Geometry = geometry,
            AscentMeters = Math.Round(ascent, 1),
            DescentMeters = Math.Round(descent, 1),
            AverageGradePercent = avgGrade,
            BikeLaneShare = bikeLaneShare
        };
    }

    // ORS extra_info.waytype.values = [[startIdx, endIdx, wayTypeCode], ...]
    // wayTypeCode: 6 = Cycleway, 4 = Path, 7 = Footway, 1 = StateRoad, 2 = Road, 3 = Street
    private static double? ComputeBikeLaneShareFromExtras(JsonElement props, int pointCount, RoutingProfile profile)
    {
        if (profile != RoutingProfile.CyclingRegular || pointCount <= 1)
        {
            return null;
        }

        if (!props.TryGetProperty("extras", out var extras) ||
            !extras.TryGetProperty("waytype", out var waytype) ||
            !waytype.TryGetProperty("values", out var values))
        {
            return null;
        }

        int totalSegments = 0;
        double safeWeighted = 0;
        foreach (var entry in values.EnumerateArray())
        {
            if (entry.GetArrayLength() < 3) continue;
            var start = entry[0].GetInt32();
            var end = entry[1].GetInt32();
            var code = entry[2].GetInt32();
            var segLen = Math.Max(0, end - start);
            totalSegments += segLen;

            // 6 = Cycleway (100%), 4 = Path / 5 = Track (75%)
            if (code == 6) safeWeighted += segLen * 1.0;
            else if (code is 4 or 5) safeWeighted += segLen * 0.75;
        }

        return totalSegments > 0 ? Math.Round(safeWeighted / totalSegments, 2) : null;
    }

    private async Task<RoutingResult> BuildFallbackRouteAsync(
        GeoPoint from,
        GeoPoint to,
        RoutingProfile profile,
        CancellationToken ct)
    {
        // Interpoliramo rutu kroz uličnu mrežu / koridore Timișoare (Manhattan-stil skretanja + međutočke)
        var geometry = Services.TimisoaraPublicData.BuildRealisticStreetGeometry(from, to, profile, steps: 12);
        double distanceMeters = Services.TimisoaraPublicData.ComputePolylineLengthMeters(geometry);

        // Prosječne gradske brzine u m/s po profilu
        double speedMps = profile switch
        {
            RoutingProfile.FootWalking => 1.35,   // ~4.9 km/h
            RoutingProfile.Wheelchair => 1.15,    // ~4.1 km/h
            RoutingProfile.CyclingRegular => 4.4, // ~15.8 km/h
            RoutingProfile.DrivingCar => 7.8,     // ~28 km/h u gradskom prometu
            _ => 1.35
        };

        var elevations = await _elevation.GetElevationsAsync(geometry, ct);
        var (ascent, descent) = ComputeAscentDescent(elevations);
        var avgGrade = distanceMeters > 1
            ? Math.Round((ascent / distanceMeters) * 100.0, 2)
            : 0;

        double? bikeShare = profile == RoutingProfile.CyclingRegular
            ? Services.TimisoaraPublicData.EstimateBikeLaneCoverage(geometry)
            : null;

        return new RoutingResult
        {
            DistanceMeters = Math.Round(distanceMeters, 1),
            DurationSeconds = Math.Round(distanceMeters / speedMps, 1),
            Geometry = geometry,
            AscentMeters = Math.Round(ascent, 1),
            DescentMeters = Math.Round(descent, 1),
            AverageGradePercent = avgGrade,
            BikeLaneShare = bikeShare
        };
    }

    private static (double Ascent, double Descent) ComputeAscentDescent(IReadOnlyList<double> elevations)
    {
        double asc = 0, desc = 0;
        for (int i = 1; i < elevations.Count; i++)
        {
            var diff = elevations[i] - elevations[i - 1];
            if (diff > 0) asc += diff;
            else desc += -diff;
        }
        return (asc, desc);
    }

    private static string MapProfile(RoutingProfile profile) => profile switch
    {
        RoutingProfile.FootWalking => "foot-walking",
        RoutingProfile.CyclingRegular => "cycling-regular",
        RoutingProfile.DrivingCar => "driving-car",
        RoutingProfile.Wheelchair => "wheelchair",
        _ => "foot-walking"
    };

    private static string BuildCacheKey(GeoPoint from, GeoPoint to, RoutingProfile profile) =>
        $"ors:{profile}:{Math.Round(from.Lat, 4):F4},{Math.Round(from.Lng, 4):F4}->{Math.Round(to.Lat, 4):F4},{Math.Round(to.Lng, 4):F4}";
}
