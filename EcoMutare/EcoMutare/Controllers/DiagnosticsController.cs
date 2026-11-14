using EcoMutare.Data;
using EcoMutare.Domain;
using EcoMutare.Dtos;
using EcoMutare.Services.Insights;
using EcoMutare.Services.Routing;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EcoMutare.Controllers;

/// <summary>
/// Dijagnostički kontroler i čuvar infrastrukture za demo (BE1 + BE2 sat 36–48):
/// - Jedinični testovi planera i pravila (/debug/tests/run-all),
/// - Health check i status MySQL baze (/health, /debug/tests/db-status),
/// - 1-click punjenje/reset svih demo podataka u MySQL bazi (/admin/seed-demo).
/// </summary>
[ApiController]
[Route("debug/tests")]
public class DiagnosticsController : ControllerBase
{
    private readonly IRulesEngine _rules;
    private readonly IGreenIntelligenceService _insights;
    private readonly AppDbContext _db;
    private readonly ILogger<DiagnosticsController> _logger;

    public DiagnosticsController(
        IRulesEngine rules,
        IGreenIntelligenceService insights,
        AppDbContext db,
        ILogger<DiagnosticsController> logger)
    {
        _rules = rules;
        _insights = insights;
        _db = db;
        _logger = logger;
    }

    /// <summary>Health check endpoint za produkcijski server i brzu provjeru statusa MySQL baze prije demoa.</summary>
    [HttpGet("/health")]
    [HttpGet("db-status")]
    public async Task<ActionResult<object>> GetHealthAndDatabaseStatus(CancellationToken ct)
    {
        try
        {
            bool canConnect = await _db.Database.CanConnectAsync(ct);
            if (!canConnect)
            {
                return Ok(new
                {
                    Status = "Degraded (In-Memory Fallback Active)",
                    MySqlConnected = false,
                    Message = "API radi normalno preko in-memory fallbacka, ali MySQL baza trenutno nije dostupna."
                });
            }

            return Ok(new
            {
                Status = "Healthy (Production Ready)",
                MySqlConnected = true,
                ServerTimeUtc = DateTime.UtcNow,
                TableCounts = new
                {
                    Users = await _db.Users.CountAsync(ct),
                    Stations = await _db.Stations.CountAsync(ct),
                    Parkings = await _db.Parkings.CountAsync(ct),
                    TransitRoutes = await _db.Routes.CountAsync(ct),
                    TransitStops = await _db.Stops.CountAsync(ct),
                    TransitTrips = await _db.TransitTrips.CountAsync(ct),
                    TransitStopTimes = await _db.StopTimes.CountAsync(ct),
                    CarpoolRides = await _db.CarpoolRides.CountAsync(ct),
                    CarpoolBookings = await _db.CarpoolBookings.CountAsync(ct),
                    CommunityWazeReports = await _db.CommunityReports.CountAsync(ct),
                    FavoriteRoutes = await _db.FavoriteRoutes.CountAsync(ct),
                    GapCells = await _db.GapCells.CountAsync(ct),
                    Rewards = await _db.Rewards.CountAsync(ct),
                    TripHistories = await _db.TripHistories.CountAsync(ct),
                    PointTransactions = await _db.PointTransactions.CountAsync(ct)
                }
            });
        }
        catch (Exception ex)
        {
            return Ok(new
            {
                Status = "Degraded (In-Memory Fallback Active)",
                MySqlConnected = false,
                Error = ex.Message
            });
        }
    }

    /// <summary>
    /// 1-Click Demo Seeder (sat 38–48 BE2): osigurava sve tablice u MySQL-u i puni 5 demo računa (lozinka Demo123!),
    /// GTFS vozni red, VeloTM stanice, TimPark parkinge, Carpool vožnje, Waze prijave, Favorite rute i GapCells.
    /// </summary>
    [HttpPost("/admin/seed-demo")]
    [HttpPost("seed-demo")]
    public async Task<ActionResult<object>> SeedDemoDatabase(CancellationToken ct)
    {
        await DatabaseSeeder.SeedAllAsync(_db, _insights, _logger, ct);
        return await GetHealthAndDatabaseStatus(ct);
    }

    [HttpGet("run-all")]
    public ActionResult<object> RunAllUnitChecks()
    {
        var results = new List<TestOutcomeDto>();

        // 1. Test: Mlađi od 14 ne smiju voziti bicikl ni romobil
        var u14Profile = new UserProfileDto { AgeCategory = AgeCategory.Under14, HasDisability = false };
        var evalU14Bike = _rules.Evaluate(u14Profile, TransportMode.Bike, new WeatherInfoDto());
        var evalU14Scooter = _rules.Evaluate(u14Profile, TransportMode.Scooter, new WeatherInfoDto());
        var evalU14Car = _rules.Evaluate(u14Profile, TransportMode.Car, new WeatherInfoDto());

        results.Add(new TestOutcomeDto(
            "RulesEngine: Under14 zabrana bicikla/romobila/automobila",
            !evalU14Bike.Allowed && !evalU14Scooter.Allowed && !evalU14Car.Allowed,
            evalU14Bike.DeniedReason ?? "Ok"));

        // 2. Test: 14-15 godina dobiva obavezno upozorenje o kacigi
        var teenProfile = new UserProfileDto { AgeCategory = AgeCategory.From14To15, HasDisability = false };
        var evalTeenBike = _rules.Evaluate(teenProfile, TransportMode.Bike, new WeatherInfoDto());
        bool hasHelmetWarning = evalTeenBike.Warnings.Any(w => w.Type == WarningType.Helmet);

        results.Add(new TestOutcomeDto(
            "RulesEngine: 14-15 god. obavezna kaciga",
            evalTeenBike.Allowed && hasHelmetWarning,
            hasHelmetWarning ? "Helmet warning present" : "Missing helmet warning"));

        // 3. Test: Invaliditet isključuje Walk, Bike, Scooter
        var disProfile = new UserProfileDto { AgeCategory = AgeCategory.Adult, HasDisability = true };
        var evalDisWalk = _rules.Evaluate(disProfile, TransportMode.Walk, new WeatherInfoDto());
        var evalDisBike = _rules.Evaluate(disProfile, TransportMode.Bike, new WeatherInfoDto());
        var evalDisTransit = _rules.Evaluate(disProfile, TransportMode.PublicTransport, new WeatherInfoDto());

        results.Add(new TestOutcomeDto(
            "RulesEngine: Invaliditet isključuje pješke/bicikl i dopušta javni prijevoz",
            !evalDisWalk.Allowed && !evalDisBike.Allowed && evalDisTransit.Allowed,
            "Transit allowed, Walk/Bike denied"));

        // 4. Test: Snijeg isključuje bicikl i romobil
        var adultProfile = new UserProfileDto { AgeCategory = AgeCategory.Adult, HasDisability = false };
        var snowWeather = new WeatherInfoDto { Condition = WeatherCondition.Snow };
        var evalSnowBike = _rules.Evaluate(adultProfile, TransportMode.Bike, snowWeather);

        results.Add(new TestOutcomeDto(
            "RulesEngine: Snijeg zabranjuje vožnju biciklom",
            !evalSnowBike.Allowed,
            evalSnowBike.DeniedReason ?? "Ok"));

        // 5. Test: Eko-bodovi i CO2 kalkulacija
        double carCo2 = EcoScoreCalculator.CalculateCo2Grams(TransportMode.Car, 10.0);
        double bikeCo2 = EcoScoreCalculator.CalculateCo2Grams(TransportMode.Bike, 10.0);
        int bikePoints = EcoScoreCalculator.CalculateEcoPoints(TransportMode.Bike, 10.0, 10.0, bikeCo2);
        int carPoints = EcoScoreCalculator.CalculateEcoPoints(TransportMode.Car, 10.0, 10.0, carCo2);

        results.Add(new TestOutcomeDto(
            "EcoScoreCalculator: Auto 1700g CO2 / 0 pts; Bicikl 0g CO2 / visoki bodovi",
            Math.Abs(carCo2 - 1700.0) < 1.0 && bikeCo2 == 0.0 && bikePoints > 50 && carPoints == 0,
            $"Car={carCo2}g ({carPoints}pts), Bike={bikeCo2}g ({bikePoints}pts)"));

        // 6. Test: Ortogonalna udaljenost točke do segmenta
        var p = new GeoPoint { Lat = 45.7537, Lng = 21.2257 };
        var a = new GeoPoint { Lat = 45.7537, Lng = 21.2200 };
        var b = new GeoPoint { Lat = 45.7537, Lng = 21.2300 };
        double dist = GreenIntelligenceService.PointToSegmentDistanceMeters(p, a, b);

        results.Add(new TestOutcomeDto(
            "GreenIntelligence: Udaljenost točke na segmentu je ~0m",
            dist < 5.0,
            $"Dist={dist:F2}m"));

        // 7. Test: Rešetka i praznine u Timișoari
        var gaps = _insights.CalculateGapCells();
        bool hasGaps = gaps.Count > 0 && gaps.Any(g => g.IsInfrastructureGap);

        results.Add(new TestOutcomeDto(
            "GreenIntelligence: Generirana rešetka s identificiranim prazninama",
            hasGaps,
            $"Total cells={gaps.Count}, Top gap={gaps.First().ZoneName} (Score: {gaps.First().GapScore})"));

        bool allPassed = results.All(r => r.Passed);

        return Ok(new
        {
            AllPassed = allPassed,
            PassCount = results.Count(r => r.Passed),
            TotalCount = results.Count,
            Tests = results
        });
    }

    public record TestOutcomeDto(string Name, bool Passed, string Details);
}
