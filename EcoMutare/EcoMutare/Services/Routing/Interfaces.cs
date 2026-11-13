using EcoMutare.Domain;
using EcoMutare.Dtos;

namespace EcoMutare.Services.Routing;

// Rezultat jedne rute za jedan profil (iz ORS-a ili slično).
public class RoutingResult
{
    public double DistanceMeters { get; set; }
    public double DurationSeconds { get; set; }
    public List<GeoPoint> Geometry { get; set; } = new();
    public double AscentMeters { get; set; }
    public double DescentMeters { get; set; }
    public double AverageGradePercent { get; set; }

    // Udio rute na biciklističkoj stazi (0..1), ako je poznat.
    public double? BikeLaneShare { get; set; }
}

public enum RoutingProfile
{
    FootWalking,
    CyclingRegular,
    DrivingCar,
    Wheelchair
}

public interface IRoutingProvider
{
    Task<RoutingResult?> GetRouteAsync(GeoPoint from, GeoPoint to, RoutingProfile profile, CancellationToken ct = default);
}

public interface IWeatherProvider
{
    Task<WeatherInfoDto> GetWeatherAsync(GeoPoint at, DateTimeOffset time, CancellationToken ct = default);
}

public interface IElevationProvider
{
    Task<IReadOnlyList<double>> GetElevationsAsync(IReadOnlyList<GeoPoint> points, CancellationToken ct = default);
}

public interface IRoutePlanner
{
    Task<RoutePlanResponse> PlanAsync(RoutePlanRequest request, CancellationToken ct = default);
}
