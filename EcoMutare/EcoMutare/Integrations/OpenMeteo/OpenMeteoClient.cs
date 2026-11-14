using System.Globalization;
using System.Text.Json;
using EcoMutare.Domain;
using EcoMutare.Dtos;
using EcoMutare.Services;
using EcoMutare.Services.Routing;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;

namespace EcoMutare.Integrations.OpenMeteo;

public class OpenMeteoClient : IWeatherProvider, IElevationProvider
{
    private readonly HttpClient _http;
    private readonly OpenMeteoOptions _options;
    private readonly IMemoryCache _cache;
    private readonly ILogger<OpenMeteoClient> _logger;

    public OpenMeteoClient(
        HttpClient http,
        IOptions<OpenMeteoOptions> options,
        IMemoryCache cache,
        ILogger<OpenMeteoClient> logger)
    {
        _http = http;
        _options = options.Value;
        _cache = cache;
        _logger = logger;
    }

    public async Task<WeatherInfoDto> GetWeatherAsync(GeoPoint at, DateTimeOffset time, CancellationToken ct = default)
    {
        // Zaokruživanje na 0.05° (~5 km rešetka oko Timișoare) + sat u Europe/Bucharest
        var latKey = Math.Round(at.Lat * 20) / 20.0;
        var lngKey = Math.Round(at.Lng * 20) / 20.0;
        var bucharestTime = ToBucharestTime(time);
        var cacheKey = $"meteo:{latKey:F2},{lngKey:F2}:{bucharestTime:yyyy-MM-dd-HH}";

        if (_cache.TryGetValue<WeatherInfoDto>(cacheKey, out var cached) && cached is not null)
        {
            return cached;
        }

        var weatherInfo = new WeatherInfoDto
        {
            Condition = WeatherCondition.Clear,
            TemperatureC = 14.0,
            PrecipitationMm = 0.0
        };

        try
        {
            var latStr = at.Lat.ToString("F4", CultureInfo.InvariantCulture);
            var lngStr = at.Lng.ToString("F4", CultureInfo.InvariantCulture);
            var url = $"/v1/forecast?latitude={latStr}&longitude={lngStr}" +
                      "&hourly=temperature_2m,precipitation,snowfall,wind_speed_10m" +
                      "&timezone=Europe%2FBucharest&forecast_days=3";

            var forecastTask = _http.GetAsync(url, ct);
            var aqiTask = TryFetchAirQualityAsync(latStr, lngStr, bucharestTime, ct);

            await Task.WhenAll(forecastTask, aqiTask);

            using var resp = await forecastTask;
            resp.EnsureSuccessStatusCode();

            await using var stream = await resp.Content.ReadAsStreamAsync(ct);
            using var doc = await JsonDocument.ParseAsync(stream, cancellationToken: ct);

            var hourly = doc.RootElement.GetProperty("hourly");
            var times = hourly.GetProperty("time");
            var temps = hourly.GetProperty("temperature_2m");
            var precips = hourly.GetProperty("precipitation");
            var snows = hourly.GetProperty("snowfall");
            var winds = hourly.GetProperty("wind_speed_10m");

            var targetHourPrefix = bucharestTime.ToString("yyyy-MM-ddTHH", CultureInfo.InvariantCulture);
            int idx = 0;
            for (int i = 0; i < times.GetArrayLength(); i++)
            {
                var t = times[i].GetString();
                if (t is not null && t.StartsWith(targetHourPrefix, StringComparison.Ordinal))
                {
                    idx = i;
                    break;
                }
            }

            double tempC = temps[idx].GetDouble();
            double precipMm = precips[idx].GetDouble();
            double snowCm = snows[idx].GetDouble();
            double windKmh = winds[idx].GetDouble();

            var (aqi, pm25, pm10) = await aqiTask;

            weatherInfo = new WeatherInfoDto
            {
                Condition = ClassifyWeather(tempC, precipMm, snowCm, windKmh),
                TemperatureC = Math.Round(tempC, 1),
                PrecipitationMm = Math.Round(precipMm, 2),
                EuropeanAqi = aqi,
                Pm25 = Math.Round(pm25, 1),
                Pm10 = Math.Round(pm10, 1),
                AirQualityCategory = TimisoaraPublicData.ClassifyAqiCategory(aqi)
            };

            _cache.Set(cacheKey, weatherInfo, TimeSpan.FromMinutes(30));
            return weatherInfo;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Open-Meteo forecast nije dostupan, vraćam zadane uvjete i procjenu kvalitete zraka za Timișoaru.");
            var nearestStation = TimisoaraPublicData.AirQualityStations
                .OrderBy(s => TimisoaraPublicData.HaversineMeters(at, new GeoPoint { Lat = s.Lat, Lng = s.Lng }))
                .First();

            weatherInfo.EuropeanAqi = nearestStation.TypicalEuropeanAqi;
            weatherInfo.Pm25 = nearestStation.TypicalPm25;
            weatherInfo.Pm10 = nearestStation.TypicalPm10;
            weatherInfo.AirQualityCategory = TimisoaraPublicData.ClassifyAqiCategory(nearestStation.TypicalEuropeanAqi);
            return weatherInfo;
        }
    }

    private async Task<(int Aqi, double Pm25, double Pm10)> TryFetchAirQualityAsync(
        string latStr,
        string lngStr,
        DateTimeOffset bucharestTime,
        CancellationToken ct)
    {
        try
        {
            var baseUrl = _options.AirQualityBaseUrl.TrimEnd('/');
            var url = $"{baseUrl}/v1/air-quality?latitude={latStr}&longitude={lngStr}" +
                      "&hourly=european_aqi,pm2_5,pm10" +
                      "&timezone=Europe%2FBucharest&forecast_days=2";

            using var resp = await _http.GetAsync(url, ct);
            if (!resp.IsSuccessStatusCode)
            {
                return (34, 12.5, 24.0);
            }

            await using var stream = await resp.Content.ReadAsStreamAsync(ct);
            using var doc = await JsonDocument.ParseAsync(stream, cancellationToken: ct);
            if (!doc.RootElement.TryGetProperty("hourly", out var hourly))
            {
                return (34, 12.5, 24.0);
            }

            var times = hourly.GetProperty("time");
            var aqis = hourly.GetProperty("european_aqi");
            var pm25s = hourly.GetProperty("pm2_5");
            var pm10s = hourly.GetProperty("pm10");

            var targetHourPrefix = bucharestTime.ToString("yyyy-MM-ddTHH", CultureInfo.InvariantCulture);
            int idx = 0;
            for (int i = 0; i < times.GetArrayLength(); i++)
            {
                var t = times[i].GetString();
                if (t is not null && t.StartsWith(targetHourPrefix, StringComparison.Ordinal))
                {
                    idx = i;
                    break;
                }
            }

            int aqi = aqis[idx].ValueKind == JsonValueKind.Number ? (int)Math.Round(aqis[idx].GetDouble()) : 34;
            double pm25 = pm25s[idx].ValueKind == JsonValueKind.Number ? pm25s[idx].GetDouble() : 12.5;
            double pm10 = pm10s[idx].ValueKind == JsonValueKind.Number ? pm10s[idx].GetDouble() : 24.0;

            return (aqi, pm25, pm10);
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "Open-Meteo Air Quality poziv nije uspio, koristim tipičan gradski indeks.");
            return (34, 12.5, 24.0);
        }
    }

    public async Task<IReadOnlyList<double>> GetElevationsAsync(
        IReadOnlyList<GeoPoint> points,
        CancellationToken ct = default)
    {
        if (points.Count == 0)
        {
            return Array.Empty<double>();
        }

        // Open-Meteo prima do ~100 koordinata u jednom pozivu
        var sample = points.Count > 50
            ? points.Where((_, i) => i % ((points.Count / 50) + 1) == 0).ToList()
            : points.ToList();

        var lats = string.Join(",", sample.Select(p => p.Lat.ToString("F5", CultureInfo.InvariantCulture)));
        var lngs = string.Join(",", sample.Select(p => p.Lng.ToString("F5", CultureInfo.InvariantCulture)));
        var cacheKey = $"elev:{sample.Count}:{sample[0].Lat:F4},{sample[0].Lng:F4}->{sample[^1].Lat:F4},{sample[^1].Lng:F4}";

        if (_cache.TryGetValue<IReadOnlyList<double>>(cacheKey, out var cached) && cached is not null)
        {
            return cached;
        }

        try
        {
            var url = $"/v1/elevation?latitude={lats}&longitude={lngs}";
            using var resp = await _http.GetAsync(url, ct);
            resp.EnsureSuccessStatusCode();

            await using var stream = await resp.Content.ReadAsStreamAsync(ct);
            using var doc = await JsonDocument.ParseAsync(stream, cancellationToken: ct);
            if (doc.RootElement.TryGetProperty("elevation", out var elevArr))
            {
                var list = new List<double>(elevArr.GetArrayLength());
                foreach (var e in elevArr.EnumerateArray())
                {
                    list.Add(e.GetDouble());
                }
                _cache.Set(cacheKey, (IReadOnlyList<double>)list, TimeSpan.FromHours(6));
                return list;
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Open-Meteo elevation nije dostupan, koristim model reljefa Timișoare (~88-96 m).");
        }

        // Timișoara je u Banatskoj nizini (~86–95 m n.v., blagi uspon prema sjeveroistoku / Calea Aradului - Aerodrom)
        return sample.Select(Services.TimisoaraPublicData.EstimateLocalElevationMeters).ToList();
    }

    // Pragovi iz BE1 vodiča: snijeg > 0 => Snow; oborina > 0.5 mm/h => Rain; temp < 0°C => Cold; vjetar > 36 km/h (10 m/s) => Windy
    public static WeatherCondition ClassifyWeather(double tempC, double precipMm, double snowCm, double windKmh)
    {
        if (snowCm > 0.05) return WeatherCondition.Snow;
        if (precipMm > 0.5) return WeatherCondition.Rain;
        if (tempC < 0.0) return WeatherCondition.Cold;
        if (windKmh > 36.0) return WeatherCondition.Windy;
        return WeatherCondition.Clear;
    }

    private static DateTimeOffset ToBucharestTime(DateTimeOffset time)
    {
        try
        {
            var tz = TimeZoneInfo.FindSystemTimeZoneById("Europe/Bucharest");
            return TimeZoneInfo.ConvertTime(time, tz);
        }
        catch
        {
            try
            {
                var tzWin = TimeZoneInfo.FindSystemTimeZoneById("GTB Standard Time");
                return TimeZoneInfo.ConvertTime(time, tzWin);
            }
            catch
            {
                return time.ToOffset(TimeSpan.FromHours(2));
            }
        }
    }
}
