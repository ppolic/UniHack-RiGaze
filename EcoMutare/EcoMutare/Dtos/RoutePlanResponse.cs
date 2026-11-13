using EcoMutare.Domain;

namespace EcoMutare.Dtos;

public class WeatherInfoDto
{
    public WeatherCondition Condition { get; set; }
    public double TemperatureC { get; set; }
    public double PrecipitationMm { get; set; }
}

public class RouteWarningDto
{
    public WarningType Type { get; set; }
    public string Message { get; set; } = string.Empty;
}

public class RouteSegmentDto
{
    public TransportMode Mode { get; set; }
    public string Description { get; set; } = string.Empty;
    public double DurationMinutes { get; set; }
    public double DistanceKm { get; set; }

    // Točke za crtanje na karti (FE crta izravno, bez dekodiranja polylinea).
    public List<GeoPoint> Geometry { get; set; } = new();
}

public class RouteOptionDto
{
    public string Id { get; set; } = string.Empty;
    public TransportMode Mode { get; set; }
    public string Title { get; set; } = string.Empty;
    public double DurationMinutes { get; set; }
    public double DistanceKm { get; set; }
    public decimal CostRon { get; set; }
    public double Co2Grams { get; set; }
    public int EcoPoints { get; set; }

    // 1 = najzelenija dopuštena opcija
    public int EcoRank { get; set; }
    public bool IsRecommended { get; set; }

    public List<RouteSegmentDto> Segments { get; set; } = new();
    public List<RouteWarningDto> Warnings { get; set; } = new();
}

public class RoutePlanResponse
{
    public WeatherInfoDto Weather { get; set; } = new();
    public List<RouteOptionDto> Options { get; set; } = new();

    // True dok planer vraća testne podatke (FE može prikazati oznaku "demo").
    public bool IsMock { get; set; }
}
