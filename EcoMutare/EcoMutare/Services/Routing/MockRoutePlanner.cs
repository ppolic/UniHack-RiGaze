using EcoMutare.Domain;
using EcoMutare.Dtos;

namespace EcoMutare.Services.Routing;

// Testni planer: vraća prilagođene podatke na temelju koordinata, profila, preferiranih modova i vremena.
// Zamjenjuje se stvarnim RoutePlannerom u satima 12–24.
public class MockRoutePlanner : IRoutePlanner
{
    public Task<RoutePlanResponse> PlanAsync(RoutePlanRequest request, CancellationToken ct = default)
    {
        var origin = request.Origin;
        var destination = request.Destination;
        var mid = new GeoPoint
        {
            Lat = Math.Round((origin.Lat + destination.Lat) / 2, 6),
            Lng = Math.Round((origin.Lng + destination.Lng) / 2, 6)
        };

        var baseKm = CalculateDistanceKm(origin, destination);
        if (baseKm < 0.1)
        {
            baseKm = 1.4;
        }

        var profile = request.Profile;
        var canRideTwoWheel = !profile.HasDisability && profile.AgeCategory != AgeCategory.Under14;
        var canDrive = profile.AgeCategory == AgeCategory.Adult;
        var weather = new WeatherInfoDto { Condition = WeatherCondition.Rain, TemperatureC = 9, PrecipitationMm = 1.2 };

        var options = new List<RouteOptionDto>();

        if (!profile.HasDisability && IsPreferred(request.PreferredModes, TransportMode.Walk))
        {
            var walkKm = Math.Round(baseKm, 2);
            var walkMinutes = Math.Max(1, Math.Round(walkKm * 12));
            options.Add(Option("walk", TransportMode.Walk, "Pješke", walkMinutes, walkKm, 0, 0, 100,
                Walk(walkMinutes, walkKm, origin, destination)));
        }

        if (canRideTwoWheel && IsPreferred(request.PreferredModes, TransportMode.Bike))
        {
            var bikeKm = Math.Round(baseKm * 1.07, 2);
            var bikeMinutes = Math.Max(3, Math.Round(bikeKm * 5.3));
            var bikeCost = profile.OwnsBike ? 0m : 3.5m;
            var bikeTitle = profile.OwnsBike ? "Vlastiti bicikl" : "Najam bicikla";
            var bike = Option("bike", TransportMode.Bike, bikeTitle, bikeMinutes, bikeKm, bikeCost, 0, 90,
                Ride(TransportMode.Bike, bikeMinutes, bikeKm, origin, mid, destination, profile.OwnsBike));
            AddTwoWheelWarnings(bike, weather.Condition, profile.AgeCategory);
            options.Add(bike);
        }

        if (canRideTwoWheel && IsPreferred(request.PreferredModes, TransportMode.Scooter))
        {
            var scooterKm = Math.Round(baseKm * 1.07, 2);
            var scooterMinutes = Math.Max(3, Math.Round(scooterKm * 4.7));
            var scooterCost = profile.OwnsScooter ? 0m : 4.2m;
            var scooterTitle = profile.OwnsScooter ? "Vlastiti romobil" : "Najam romobila";
            var scooterCo2 = Math.Round(13.3 * scooterKm, 1);
            var scooter = Option("scooter", TransportMode.Scooter, scooterTitle, scooterMinutes, scooterKm, scooterCost, scooterCo2, 70,
                Ride(TransportMode.Scooter, scooterMinutes, scooterKm, origin, mid, destination, profile.OwnsScooter));
            AddTwoWheelWarnings(scooter, weather.Condition, profile.AgeCategory);
            options.Add(scooter);
        }

        if (IsPreferred(request.PreferredModes, TransportMode.PublicTransport))
        {
            var transitKm = Math.Round(baseKm * 1.14, 2);
            var rideKm = Math.Max(0.1, Math.Round(transitKm - 0.4, 2));
            var rideMinutes = Math.Max(2, Math.Round(rideKm * 5.8));
            var transitMinutes = rideMinutes + 5;
            var transitCo2 = Math.Round(70 * transitKm, 1);
            var transit = Option("transit", TransportMode.PublicTransport,
                profile.HasDisability ? "Tramvaj 8 (pristupačno vozilo)" : "Tramvaj 8",
                transitMinutes, transitKm, 2.5m, transitCo2, 60,
                new List<RouteSegmentDto>
                {
                    Segment(TransportMode.Walk, "Pješke do stanice", 3, 0.2, origin, mid),
                    Segment(TransportMode.PublicTransport, "Tramvaj 8 do odredišta", rideMinutes, rideKm, mid, destination),
                    Segment(TransportMode.Walk, "Pješke do odredišta", 2, 0.2, destination, destination)
                });
            options.Add(transit);
        }

        if (canDrive && IsPreferred(request.PreferredModes, TransportMode.Car))
        {
            var carKm = Math.Round(baseKm * 1.35, 2);
            var driveKm = Math.Max(0.1, Math.Round(carKm - 0.1, 2));
            var driveMinutes = Math.Max(2, Math.Round(driveKm * 3.9));
            var carMinutes = driveMinutes + 2;
            var carCo2 = Math.Round(170 * carKm, 1);
            var car = Option("car", TransportMode.Car,
                profile.HasDisability ? "Auto + invalidsko parkirno mjesto" : "Auto + parking",
                carMinutes, carKm, 8m, carCo2, 0,
                new List<RouteSegmentDto>
                {
                    Segment(TransportMode.Car, "Vožnja do parkinga", driveMinutes, driveKm, origin, destination),
                    Segment(TransportMode.Walk, "Pješke od parkinga", 2, 0.1, destination, destination)
                });
            options.Add(car);
        }

        // Rang po CO2 (rastuće), pa po trajanju
        var ranked = options.OrderBy(o => o.Co2Grams).ThenBy(o => o.DurationMinutes).ToList();
        for (var i = 0; i < ranked.Count; i++)
        {
            ranked[i].EcoRank = i + 1;
        }

        // Preporuka: najzelenija opcija čije trajanje nije dulje od 2x najbrže
        if (ranked.Count > 0)
        {
            var fastest = ranked.Min(o => o.DurationMinutes);
            (ranked.FirstOrDefault(o => o.DurationMinutes <= 2 * fastest) ?? ranked[0]).IsRecommended = true;
        }

        return Task.FromResult(new RoutePlanResponse { Weather = weather, Options = ranked, IsMock = true });
    }

    private static bool IsPreferred(List<TransportMode>? preferredModes, TransportMode mode) =>
        preferredModes is null ||
        preferredModes.Count == 0 ||
        (preferredModes.Count == 1 && preferredModes[0] == TransportMode.Walk) ||
        preferredModes.Contains(mode);

    private static void AddTwoWheelWarnings(RouteOptionDto option, WeatherCondition weather, AgeCategory ageCategory)
    {
        var isBike = option.Mode == TransportMode.Bike;
        switch (weather)
        {
            case WeatherCondition.Rain:
                option.Warnings.Add(new RouteWarningDto
                {
                    Type = WarningType.Rain,
                    Message = isBike
                        ? "Kiša: vožnja bicikla je manje ugodna i sigurna."
                        : "Kiša: vožnja romobila nije preporučena."
                });
                break;
            case WeatherCondition.Snow:
                option.Warnings.Add(new RouteWarningDto
                {
                    Type = WarningType.Snow,
                    Message = isBike
                        ? "Snijeg: klizav kolnik, vožnja bicikla se ne preporučuje."
                        : "Snijeg: vožnja romobila je opasna zbog klizavog kolnika."
                });
                break;
            case WeatherCondition.Cold:
                option.Warnings.Add(new RouteWarningDto
                {
                    Type = WarningType.Cold,
                    Message = "Niske temperature: preporučena je topla odjeća i rukavice."
                });
                break;
            case WeatherCondition.Windy:
                option.Warnings.Add(new RouteWarningDto
                {
                    Type = WarningType.Windy,
                    Message = "Jak vjetar: otežana vožnja i smanjena stabilnost."
                });
                break;
        }

        if (ageCategory == AgeCategory.From14To15)
        {
            option.Warnings.Add(new RouteWarningDto
            {
                Type = WarningType.Helmet,
                Message = "Kaciga je obavezna za osobe mlađe od 16 godina."
            });
        }
    }

    private static double CalculateDistanceKm(GeoPoint a, GeoPoint b)
    {
        const double earthRadiusKm = 6371.0;
        var dLat = ToRadians(b.Lat - a.Lat);
        var dLng = ToRadians(b.Lng - a.Lng);
        var sinLat = Math.Sin(dLat / 2);
        var sinLng = Math.Sin(dLng / 2);
        var h = sinLat * sinLat + Math.Cos(ToRadians(a.Lat)) * Math.Cos(ToRadians(b.Lat)) * sinLng * sinLng;
        var c = 2 * Math.Atan2(Math.Sqrt(h), Math.Sqrt(1 - h));
        // Faktor ~1.9 aproksimira gradsku cestovnu udaljenost iz zračne linije (npr. 0.735 km -> ~1.4 km)
        return Math.Round(earthRadiusKm * c * 1.9, 2);
    }

    private static double ToRadians(double deg) => deg * (Math.PI / 180.0);

    private static RouteOptionDto Option(string id, TransportMode mode, string title, double minutes, double km,
        decimal cost, double co2, int points, List<RouteSegmentDto> segments) => new()
    {
        Id = id,
        Mode = mode,
        Title = title,
        DurationMinutes = minutes,
        DistanceKm = km,
        CostRon = cost,
        Co2Grams = co2,
        EcoPoints = points,
        Segments = segments
    };

    private static List<RouteSegmentDto> Walk(double minutes, double km, GeoPoint origin, GeoPoint destination) =>
        new() { Segment(TransportMode.Walk, "Pješke do odredišta", minutes, km, origin, destination) };

    private static List<RouteSegmentDto> Ride(TransportMode mode, double minutes, double km, GeoPoint origin, GeoPoint mid, GeoPoint destination, bool ownsVehicle)
    {
        var rideDesc = mode == TransportMode.Bike ? "Vožnja biciklom" : "Vožnja romobilom";
        if (ownsVehicle)
        {
            return new() { Segment(mode, rideDesc, minutes, km, origin, destination) };
        }

        return new()
        {
            Segment(TransportMode.Walk, "Pješke do stanice", 2, 0.1, origin, mid),
            Segment(mode, rideDesc, Math.Max(1, minutes - 2), Math.Max(0.1, Math.Round(km - 0.1, 2)), mid, destination)
        };
    }

    private static RouteSegmentDto Segment(TransportMode mode, string description, double minutes, double km, GeoPoint a, GeoPoint b) => new()
    {
        Mode = mode,
        Description = description,
        DurationMinutes = minutes,
        DistanceKm = km,
        Geometry = new List<GeoPoint> { a, b }
    };
}
