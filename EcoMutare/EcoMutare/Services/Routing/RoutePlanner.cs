using EcoMutare.Domain;
using EcoMutare.Dtos;
using EcoMutare.Services.Community;
using Microsoft.Extensions.Options;

namespace EcoMutare.Services.Routing;

/// <summary>
/// Glavni multimodalni planer ruta za Timișoaru (sat 12–24).
/// Spaja OpenRouteService profile, Open-Meteo prognozu i elevaciju, javne podatke Timișoare
/// (VeloTM stanice, STPT javni prijevoz, TimPark parkirališta, biciklističke staze),
/// Waze-style prijave građana u stvarnom vremenu i RulesEngine.
/// </summary>
public class RoutePlanner : IRoutePlanner
{
    private readonly IRoutingProvider _routing;
    private readonly IWeatherProvider _weather;
    private readonly IRulesEngine _rules;
    private readonly ICommunityIntelligenceService _community;
    private readonly MockRoutePlanner _mockFallback;
    private readonly RoutingOptions _options;

    public RoutePlanner(
        IRoutingProvider routing,
        IWeatherProvider weather,
        IRulesEngine rules,
        ICommunityIntelligenceService community,
        MockRoutePlanner mockFallback,
        IOptions<RoutingOptions> options)
    {
        _routing = routing;
        _weather = weather;
        _rules = rules;
        _community = community;
        _mockFallback = mockFallback;
        _options = options.Value;
    }

    public async Task<RoutePlanResponse> PlanAsync(RoutePlanRequest request, CancellationToken ct = default)
    {
        if (_options.UseMock)
        {
            return await _mockFallback.PlanAsync(request, ct);
        }

        NormalizeRequestForSwaggerDefaults(request);

        var departure = request.DepartureTime ?? DateTimeOffset.UtcNow;
        var profile = request.Profile;
        var walkProfile = profile.HasDisability ? RoutingProfile.Wheelchair : RoutingProfile.FootWalking;

        // Paralelni dohvat prognoze i osnovnih ORS ruta (cilj < 3s ukupno)
        var weatherTask = _weather.GetWeatherAsync(request.Origin, departure, ct);
        var walkRouteTask = _routing.GetRouteAsync(request.Origin, request.Destination, walkProfile, ct);
        var bikeRouteTask = _routing.GetRouteAsync(request.Origin, request.Destination, RoutingProfile.CyclingRegular, ct);
        var carRouteTask = _routing.GetRouteAsync(request.Origin, request.Destination, RoutingProfile.DrivingCar, ct);

        await Task.WhenAll(weatherTask, walkRouteTask, bikeRouteTask, carRouteTask);

        var weather = await weatherTask;
        var directWalk = await walkRouteTask;
        var directBike = await bikeRouteTask;
        var directCar = await carRouteTask;

        double baselineCarKm = directCar is not null
            ? Math.Max(0.2, directCar.DistanceMeters / 1000.0)
            : Math.Max(0.2, TimisoaraPublicData.HaversineMeters(request.Origin, request.Destination) / 1000.0 * 1.25);

        var options = new List<RouteOptionDto>();

        // 1. Pješke (samo za korisnike bez invaliditeta; za HasDisability nudi se isključivo pristupačni JPP i vožnje)
        if (!profile.HasDisability && IsModeRequested(request, TransportMode.Walk) && directWalk is not null)
        {
            var walkEval = _rules.Evaluate(profile, TransportMode.Walk, weather, directWalk);
            if (walkEval.Allowed)
            {
                double km = Math.Round(directWalk.DistanceMeters / 1000.0, 2);
                double mins = Math.Round(directWalk.DurationSeconds / 60.0, 1);
                double co2 = EcoScoreCalculator.CalculateCo2Grams(TransportMode.Walk, km);
                int pts = EcoScoreCalculator.CalculateEcoPoints(TransportMode.Walk, km, baselineCarKm, co2);

                options.Add(new RouteOptionDto
                {
                    Id = "walk",
                    Mode = TransportMode.Walk,
                    Title = profile.HasDisability ? "Pješke / pristupačna ruta bez barijera" : "Pješke",
                    DurationMinutes = mins,
                    DistanceKm = km,
                    CostRon = 0m,
                    Co2Grams = co2,
                    EcoPoints = pts,
                    Segments = new List<RouteSegmentDto>
                    {
                        new()
                        {
                            Mode = TransportMode.Walk,
                            Description = profile.HasDisability
                                ? "Pristupačna pješačka ruta prilagođena osobama s invaliditetom"
                                : "Pješačka ruta do odredišta",
                            DurationMinutes = mins,
                            DistanceKm = km,
                            Geometry = directWalk.Geometry
                        }
                    },
                    Warnings = walkEval.Warnings
                });
            }
        }

        // 2. Bicikl (vlastiti ili najam preko VeloTM stanice)
        if (IsModeRequested(request, TransportMode.Bike))
        {
            var bikeOption = await BuildBikeOptionAsync(request.Origin, request.Destination, profile, weather, directBike, walkProfile, baselineCarKm, ct);
            if (bikeOption is not null)
            {
                options.Add(bikeOption);
            }
        }

        // 3. Romobil (vlastiti ili najam, zakonski < 25 km/h)
        if (IsModeRequested(request, TransportMode.Scooter))
        {
            var scooterOption = await BuildScooterOptionAsync(request.Origin, request.Destination, profile, weather, directBike, walkProfile, baselineCarKm, ct);
            if (scooterOption is not null)
            {
                options.Add(scooterOption);
            }
        }

        // 4. Javni prijevoz (STPT Timișoara: tramvaji, trolejbusi, autobuzi)
        if (IsModeRequested(request, TransportMode.PublicTransport))
        {
            var transitOption = await BuildTransitOptionAsync(request.Origin, request.Destination, profile, weather, walkProfile, baselineCarKm, ct);
            if (transitOption is not null)
            {
                options.Add(transitOption);
            }
        }

        // 5. Green Intelligence kombinirana ruta (Bicikl + STPT javni prijevoz)
        if (IsModeRequested(request, TransportMode.Combined))
        {
            var combinedOption = await BuildCombinedOptionAsync(request.Origin, request.Destination, profile, weather, directBike, walkProfile, baselineCarKm, ct);
            if (combinedOption is not null)
            {
                options.Add(combinedOption);
            }
        }

        // 6. Vlastito vozilo + TimPark parkiralište blizu odredišta
        if (IsModeRequested(request, TransportMode.Car))
        {
            var carOption = await BuildCarOptionAsync(request.Origin, request.Destination, profile, weather, directCar, walkProfile, baselineCarKm, ct);
            if (carOption is not null)
            {
                options.Add(carOption);
            }
        }

        // Sigurnosno pravilo: ako je sve filtrirano (npr. dijete < 14 bez JPP linije) i korisnik nema invaliditet, vrati pješke
        if (options.Count == 0 && !profile.HasDisability && directWalk is not null)
        {
            double km = Math.Round(directWalk.DistanceMeters / 1000.0, 2);
            double mins = Math.Round(directWalk.DurationSeconds / 60.0, 1);
            options.Add(new RouteOptionDto
            {
                Id = "walk",
                Mode = TransportMode.Walk,
                Title = "Pješke",
                DurationMinutes = mins,
                DistanceKm = km,
                CostRon = 0m,
                Co2Grams = 0,
                EcoPoints = EcoScoreCalculator.CalculateEcoPoints(TransportMode.Walk, km, baselineCarKm, 0),
                Segments = new List<RouteSegmentDto>
                {
                    new()
                    {
                        Mode = TransportMode.Walk,
                        Description = "Pješke do odredišta",
                        DurationMinutes = mins,
                        DistanceKm = km,
                        Geometry = directWalk.Geometry
                    }
                }
            });
        }

        ApplyCommunityWazeHazards(options, profile.HasDisability);
        RankAndMarkRecommended(options);

        return new RoutePlanResponse
        {
            Weather = weather,
            Options = options,
            IsMock = false
        };
    }

    private async Task<RouteOptionDto?> BuildBikeOptionAsync(
        GeoPoint origin,
        GeoPoint destination,
        UserProfileDto profile,
        WeatherInfoDto weather,
        RoutingResult? directBike,
        RoutingProfile walkProfile,
        double baselineCarKm,
        CancellationToken ct)
    {
        var eval = _rules.Evaluate(profile, TransportMode.Bike, weather, directBike);
        if (!eval.Allowed) return null;

        // Ako korisnik ima vlastiti bicikl -> kreće direktno s polazišta bez naknade za najam
        if (profile.OwnsBike && directBike is not null)
        {
            double km = Math.Round(directBike.DistanceMeters / 1000.0, 2);
            double mins = Math.Round(directBike.DurationSeconds / 60.0, 1);
            double co2 = EcoScoreCalculator.CalculateCo2Grams(TransportMode.Bike, km);
            int pts = EcoScoreCalculator.CalculateEcoPoints(TransportMode.Bike, km, baselineCarKm, co2);
            int lanePct = (int)Math.Round((directBike.BikeLaneShare ?? 0.75) * 100);

            return new RouteOptionDto
            {
                Id = "bike-own",
                Mode = TransportMode.Bike,
                Title = "Vlastiti bicikl (designated bike lanes)",
                DurationMinutes = mins,
                DistanceKm = km,
                CostRon = 0m,
                Co2Grams = co2,
                EcoPoints = pts,
                Segments = new List<RouteSegmentDto>
                {
                    new()
                    {
                        Mode = TransportMode.Bike,
                        Description = $"Vožnja vlastitim biciklom ({lanePct}% po biciklističkim stazama Timișoare)",
                        DurationMinutes = mins,
                        DistanceKm = km,
                        Geometry = directBike.Geometry
                    }
                },
                Warnings = eval.Warnings
            };
        }

        // Najam bicikla: pronađi najbližu dostupnu VeloTM stanicu
        var station = TimisoaraPublicData.Stations
            .Where(s => s.VehicleType.Equals("Bike", StringComparison.OrdinalIgnoreCase) && s.AvailableVehicles > 0)
            .OrderBy(s => TimisoaraPublicData.HaversineMeters(origin, new GeoPoint { Lat = s.Lat, Lng = s.Lng }))
            .FirstOrDefault();

        if (station is null) return null;

        var stationPt = new GeoPoint { Lat = station.Lat, Lng = station.Lng };
        var walkToStation = await _routing.GetRouteAsync(origin, stationPt, walkProfile, ct);
        var rideToDest = await _routing.GetRouteAsync(stationPt, destination, RoutingProfile.CyclingRegular, ct) ?? directBike;

        if (walkToStation is null || rideToDest is null) return null;

        var rideEval = _rules.Evaluate(profile, TransportMode.Bike, weather, rideToDest);
        if (!rideEval.Allowed) return null;

        double walkMins = Math.Max(1.0, Math.Round(walkToStation.DurationSeconds / 60.0, 1));
        double walkKm = Math.Round(walkToStation.DistanceMeters / 1000.0, 2);
        double rideMins = Math.Max(1.0, Math.Round(rideToDest.DurationSeconds / 60.0, 1));
        double rideKm = Math.Round(rideToDest.DistanceMeters / 1000.0, 2);

        double totalMins = Math.Round(walkMins + rideMins, 1);
        double totalKm = Math.Round(walkKm + rideKm, 2);
        decimal cost = Math.Round(station.UnlockCostRon + (decimal)rideMins * _options.BikePerMinuteRon, 2);
        double co2Total = EcoScoreCalculator.CalculateCo2Grams(TransportMode.Bike, totalKm);
        int ecoPts = EcoScoreCalculator.CalculateEcoPoints(TransportMode.Bike, totalKm, baselineCarKm, co2Total);

        var segments = new List<RouteSegmentDto>();
        if (walkKm >= 0.03)
        {
            segments.Add(new RouteSegmentDto
            {
                Mode = TransportMode.Walk,
                Description = $"Pješke do stanice {station.Name} ({station.AvailableVehicles} dostupnih bicikala)",
                DurationMinutes = walkMins,
                DistanceKm = walkKm,
                Geometry = walkToStation.Geometry
            });
        }

        segments.Add(new RouteSegmentDto
        {
            Mode = TransportMode.Bike,
            Description = $"Vožnja biciklom od {station.Name} do odredišta",
            DurationMinutes = rideMins,
            DistanceKm = rideKm,
            Geometry = rideToDest.Geometry
        });

        return new RouteOptionDto
        {
            Id = "bike-rental",
            Mode = TransportMode.Bike,
            Title = $"Najam bicikla – {station.Name}",
            DurationMinutes = totalMins,
            DistanceKm = totalKm,
            CostRon = cost,
            Co2Grams = co2Total,
            EcoPoints = ecoPts,
            Segments = segments,
            Warnings = rideEval.Warnings
        };
    }

    private async Task<RouteOptionDto?> BuildScooterOptionAsync(
        GeoPoint origin,
        GeoPoint destination,
        UserProfileDto profile,
        WeatherInfoDto weather,
        RoutingResult? directBike,
        RoutingProfile walkProfile,
        double baselineCarKm,
        CancellationToken ct)
    {
        var eval = _rules.Evaluate(profile, TransportMode.Scooter, weather, directBike);
        if (!eval.Allowed) return null;

        // Zakonska brzina romobila: mora biti < 25 km/h (koristimo prosjek iz konfiguracije, npr. 19 km/h)
        double legalSpeedKmh = Math.Min(_options.ScooterAverageSpeedKmh, _options.ScooterMaxLegalSpeedKmh - 0.5);

        if (profile.OwnsScooter && directBike is not null)
        {
            double km = Math.Round(directBike.DistanceMeters / 1000.0, 2);
            double mins = Math.Max(1.0, Math.Round((km / legalSpeedKmh) * 60.0, 1));
            double co2 = EcoScoreCalculator.CalculateCo2Grams(TransportMode.Scooter, km);
            int pts = EcoScoreCalculator.CalculateEcoPoints(TransportMode.Scooter, km, baselineCarKm, co2);

            return new RouteOptionDto
            {
                Id = "scooter-own",
                Mode = TransportMode.Scooter,
                Title = "Vlastiti e-romobil (ograničenje < 25 km/h)",
                DurationMinutes = mins,
                DistanceKm = km,
                CostRon = 0m,
                Co2Grams = co2,
                EcoPoints = pts,
                Segments = new List<RouteSegmentDto>
                {
                    new()
                    {
                        Mode = TransportMode.Scooter,
                        Description = $"Vožnja vlastitim e-romobilom (maks. zakonska brzina < 25 km/h, prosjek {legalSpeedKmh:F0} km/h)",
                        DurationMinutes = mins,
                        DistanceKm = km,
                        Geometry = directBike.Geometry
                    }
                },
                Warnings = eval.Warnings
            };
        }

        var station = TimisoaraPublicData.Stations
            .Where(s => s.VehicleType.Equals("Scooter", StringComparison.OrdinalIgnoreCase) && s.AvailableVehicles > 0)
            .OrderBy(s => TimisoaraPublicData.HaversineMeters(origin, new GeoPoint { Lat = s.Lat, Lng = s.Lng }))
            .FirstOrDefault();

        if (station is null) return null;

        var stationPt = new GeoPoint { Lat = station.Lat, Lng = station.Lng };
        var walkToStation = await _routing.GetRouteAsync(origin, stationPt, walkProfile, ct);
        var rideToDest = await _routing.GetRouteAsync(stationPt, destination, RoutingProfile.CyclingRegular, ct) ?? directBike;

        if (walkToStation is null || rideToDest is null) return null;

        var rideEval = _rules.Evaluate(profile, TransportMode.Scooter, weather, rideToDest);
        if (!rideEval.Allowed) return null;

        double walkMins = Math.Max(1.0, Math.Round(walkToStation.DurationSeconds / 60.0, 1));
        double walkKm = Math.Round(walkToStation.DistanceMeters / 1000.0, 2);
        double rideKm = Math.Round(rideToDest.DistanceMeters / 1000.0, 2);
        double rideMins = Math.Max(1.0, Math.Round((rideKm / legalSpeedKmh) * 60.0, 1));

        double totalMins = Math.Round(walkMins + rideMins, 1);
        double totalKm = Math.Round(walkKm + rideKm, 2);
        decimal cost = Math.Round(station.UnlockCostRon + (decimal)rideMins * _options.ScooterPerMinuteRon, 2);
        double co2Total = EcoScoreCalculator.CalculateCo2Grams(TransportMode.Scooter, totalKm);
        int ecoPts = EcoScoreCalculator.CalculateEcoPoints(TransportMode.Scooter, totalKm, baselineCarKm, co2Total);

        var segments = new List<RouteSegmentDto>();
        if (walkKm >= 0.03)
        {
            segments.Add(new RouteSegmentDto
            {
                Mode = TransportMode.Walk,
                Description = $"Pješke do lokacije {station.Name} ({station.AvailableVehicles} dostupnih romobila)",
                DurationMinutes = walkMins,
                DistanceKm = walkKm,
                Geometry = walkToStation.Geometry
            });
        }

        segments.Add(new RouteSegmentDto
        {
            Mode = TransportMode.Scooter,
            Description = $"Vožnja e-romobilom (< 25 km/h) od {station.Name} do odredišta",
            DurationMinutes = rideMins,
            DistanceKm = rideKm,
            Geometry = rideToDest.Geometry
        });

        return new RouteOptionDto
        {
            Id = "scooter-rental",
            Mode = TransportMode.Scooter,
            Title = $"Najam e-romobila – {station.Name}",
            DurationMinutes = totalMins,
            DistanceKm = totalKm,
            CostRon = cost,
            Co2Grams = co2Total,
            EcoPoints = ecoPts,
            Segments = segments,
            Warnings = rideEval.Warnings
        };
    }

    private async Task<RouteOptionDto?> BuildTransitOptionAsync(
        GeoPoint origin,
        GeoPoint destination,
        UserProfileDto profile,
        WeatherInfoDto weather,
        RoutingProfile walkProfile,
        double baselineCarKm,
        CancellationToken ct)
    {
        var eval = _rules.Evaluate(profile, TransportMode.PublicTransport, weather);
        if (!eval.Allowed) return null;

        var candidateStops = TimisoaraPublicData.TransitStops
            .Where(s => !profile.HasDisability || s.WheelchairAccessible)
            .ToList();

        if (candidateStops.Count < 2) return null;

        // Provjeri je li najbliža opća stanica nepristupačna u odnosu na odabranu wheelchair-accessible stanicu
        var nearestAnyStart = TimisoaraPublicData.TransitStops
            .OrderBy(s => TimisoaraPublicData.HaversineMeters(origin, new GeoPoint { Lat = s.Lat, Lng = s.Lng }))
            .First();
        var nearestAnyEnd = TimisoaraPublicData.TransitStops
            .Where(s => s.Id != nearestAnyStart.Id)
            .OrderBy(s => TimisoaraPublicData.HaversineMeters(destination, new GeoPoint { Lat = s.Lat, Lng = s.Lng }))
            .First();

        var startStop = candidateStops
            .OrderBy(s => TimisoaraPublicData.HaversineMeters(origin, new GeoPoint { Lat = s.Lat, Lng = s.Lng }))
            .First();

        var endStop = candidateStops
            .Where(s => s.Id != startStop.Id)
            .OrderBy(s => TimisoaraPublicData.HaversineMeters(destination, new GeoPoint { Lat = s.Lat, Lng = s.Lng }))
            .First();

        var warnings = new List<RouteWarningDto>(eval.Warnings);
        if (profile.HasDisability && (nearestAnyStart.Id != startStop.Id || nearestAnyEnd.Id != endStop.Id))
        {
            var skippedName = nearestAnyStart.Id != startStop.Id ? nearestAnyStart.Name : nearestAnyEnd.Name;
            warnings.Add(new RouteWarningDto
            {
                Type = WarningType.NotAccessible,
                Message = $"Wheelchair filtriranje: Stanica '{skippedName}' nema pristup za kolica – ruta je preusmjerena na najbližu niskopodnu STPT stanicu ({startStop.Name} → {endStop.Name})."
            });
        }

        var startPt = new GeoPoint { Lat = startStop.Lat, Lng = startStop.Lng };
        var endPt = new GeoPoint { Lat = endStop.Lat, Lng = endStop.Lng };

        var walkToStartTask = _routing.GetRouteAsync(origin, startPt, walkProfile, ct);
        var transitLegTask = _routing.GetRouteAsync(startPt, endPt, RoutingProfile.DrivingCar, ct);
        var walkFromEndTask = _routing.GetRouteAsync(endPt, destination, walkProfile, ct);

        await Task.WhenAll(walkToStartTask, transitLegTask, walkFromEndTask);

        var walk1 = await walkToStartTask;
        var transitLeg = await transitLegTask;
        var walk2 = await walkFromEndTask;

        if (walk1 is null || transitLeg is null || walk2 is null) return null;

        // Odaberi zajedničku STPT liniju između stanica ili prikaži glavnu liniju
        var sharedLine = startStop.Lines.Intersect(endStop.Lines, StringComparer.OrdinalIgnoreCase).FirstOrDefault()
                         ?? $"{startStop.Lines.FirstOrDefault() ?? "STPT"} → {endStop.Lines.FirstOrDefault() ?? "STPT"}";

        double w1Mins = Math.Max(1.0, Math.Round(walk1.DurationSeconds / 60.0, 1));
        double w1Km = Math.Round(walk1.DistanceMeters / 1000.0, 2);

        // Prosječna brzina STPT tramvaja/trolejbusa uključujući stajanja + ~3 min čekanja
        double transitKm = Math.Max(0.3, Math.Round(transitLeg.DistanceMeters / 1000.0, 2));
        double transitMins = Math.Round(3.0 + (transitKm / 21.0) * 60.0, 1);

        double w2Mins = Math.Max(1.0, Math.Round(walk2.DurationSeconds / 60.0, 1));
        double w2Km = Math.Round(walk2.DistanceMeters / 1000.0, 2);

        double totalMins = Math.Round(w1Mins + transitMins + w2Mins, 1);
        double totalKm = Math.Round(w1Km + transitKm + w2Km, 2);
        double co2 = EcoScoreCalculator.CalculateCo2Grams(TransportMode.PublicTransport, transitKm);
        int pts = EcoScoreCalculator.CalculateEcoPoints(TransportMode.PublicTransport, totalKm, baselineCarKm, co2);

        var title = profile.HasDisability
            ? $"STPT {sharedLine} (niskopodno / pristupačno vozilo)"
            : $"Javni prijevoz STPT – {sharedLine}";

        return new RouteOptionDto
        {
            Id = "transit-stpt",
            Mode = TransportMode.PublicTransport,
            Title = title,
            DurationMinutes = totalMins,
            DistanceKm = totalKm,
            CostRon = _options.StptTicketRon,
            Co2Grams = co2,
            EcoPoints = pts,
            Segments = new List<RouteSegmentDto>
            {
                new()
                {
                    Mode = TransportMode.Walk,
                    Description = $"Pješke do STPT stanice {startStop.Name}",
                    DurationMinutes = w1Mins,
                    DistanceKm = w1Km,
                    Geometry = walk1.Geometry
                },
                new()
                {
                    Mode = TransportMode.PublicTransport,
                    Description = $"{sharedLine}: {startStop.Name} → {endStop.Name} (polasci svakih 6–10 min)",
                    DurationMinutes = transitMins,
                    DistanceKm = transitKm,
                    Geometry = transitLeg.Geometry
                },
                new()
                {
                    Mode = TransportMode.Walk,
                    Description = $"Pješke od stanice {endStop.Name} do odredišta",
                    DurationMinutes = w2Mins,
                    DistanceKm = w2Km,
                    Geometry = walk2.Geometry
                }
            },
            Warnings = warnings
        };
    }

    private async Task<RouteOptionDto?> BuildCombinedOptionAsync(
        GeoPoint origin,
        GeoPoint destination,
        UserProfileDto profile,
        WeatherInfoDto weather,
        RoutingResult? directBike,
        RoutingProfile walkProfile,
        double baselineCarKm,
        CancellationToken ct)
    {
        var eval = _rules.Evaluate(profile, TransportMode.Combined, weather, directBike);
        if (!eval.Allowed) return null;

        // Green Intelligence: nudi kombinaciju Bicikl + STPT javni prijevoz za relacije > 1.1 km
        if (baselineCarKm < 1.1) return null;

        var destStop = TimisoaraPublicData.TransitStops
            .OrderBy(s => TimisoaraPublicData.HaversineMeters(destination, new GeoPoint { Lat = s.Lat, Lng = s.Lng }))
            .FirstOrDefault();

        if (destStop is null) return null;

        // Pronađi prijelaznu STPT stanicu koja je blizu biciklističkog koridora na pola puta
        var midRef = new GeoPoint
        {
            Lat = (origin.Lat + destination.Lat) / 2.0,
            Lng = (origin.Lng + destination.Lng) / 2.0
        };

        var hubStop = TimisoaraPublicData.TransitStops
            .Where(s => s.Id != destStop.Id)
            .OrderBy(s => TimisoaraPublicData.HaversineMeters(midRef, new GeoPoint { Lat = s.Lat, Lng = s.Lng }))
            .FirstOrDefault();

        if (hubStop is null) return null;

        var hubPt = new GeoPoint { Lat = hubStop.Lat, Lng = hubStop.Lng };
        var destStopPt = new GeoPoint { Lat = destStop.Lat, Lng = destStop.Lng };

        var bikeLegTask = _routing.GetRouteAsync(origin, hubPt, RoutingProfile.CyclingRegular, ct);
        var transitLegTask = _routing.GetRouteAsync(hubPt, destStopPt, RoutingProfile.DrivingCar, ct);
        var finalWalkTask = _routing.GetRouteAsync(destStopPt, destination, walkProfile, ct);

        await Task.WhenAll(bikeLegTask, transitLegTask, finalWalkTask);

        var bikeLeg = await bikeLegTask;
        var transitLeg = await transitLegTask;
        var finalWalk = await finalWalkTask;

        if (bikeLeg is null || transitLeg is null || finalWalk is null) return null;

        double bikeKm = Math.Round(bikeLeg.DistanceMeters / 1000.0, 2);
        double bikeMins = Math.Max(2.0, Math.Round(bikeLeg.DurationSeconds / 60.0, 1));
        double transitKm = Math.Max(0.3, Math.Round(transitLeg.DistanceMeters / 1000.0, 2));
        double transitMins = Math.Round(2.5 + (transitKm / 22.0) * 60.0, 1);
        double walkKm = Math.Round(finalWalk.DistanceMeters / 1000.0, 2);
        double walkMins = Math.Max(1.0, Math.Round(finalWalk.DurationSeconds / 60.0, 1));

        double totalKm = Math.Round(bikeKm + transitKm + walkKm, 2);
        double totalMins = Math.Round(bikeMins + transitMins + walkMins, 1);

        var lineName = hubStop.Lines.Intersect(destStop.Lines, StringComparer.OrdinalIgnoreCase).FirstOrDefault()
                       ?? hubStop.Lines.FirstOrDefault()
                       ?? "STPT";

        decimal cost = profile.OwnsBike
            ? _options.StptTicketRon
            : Math.Round(_options.BikeUnlockRon + _options.StptTicketRon, 2);

        double co2 = EcoScoreCalculator.CalculateCo2Grams(TransportMode.Combined, transitKm);
        int pts = EcoScoreCalculator.CalculateEcoPoints(TransportMode.Combined, totalKm, baselineCarKm, co2);

        return new RouteOptionDto
        {
            Id = "combined-green-intelligence",
            Mode = TransportMode.Combined,
            Title = $"Green Intelligence: Bicikl + {lineName}",
            DurationMinutes = totalMins,
            DistanceKm = totalKm,
            CostRon = cost,
            Co2Grams = co2,
            EcoPoints = pts,
            Segments = new List<RouteSegmentDto>
            {
                new()
                {
                    Mode = TransportMode.Bike,
                    Description = $"Biciklističkom stazom do čvorišta {hubStop.Name}",
                    DurationMinutes = bikeMins,
                    DistanceKm = bikeKm,
                    Geometry = bikeLeg.Geometry
                },
                new()
                {
                    Mode = TransportMode.PublicTransport,
                    Description = $"{lineName} od {hubStop.Name} do {destStop.Name} (izbjegava dionicu bez biciklističke staze)",
                    DurationMinutes = transitMins,
                    DistanceKm = transitKm,
                    Geometry = transitLeg.Geometry
                },
                new()
                {
                    Mode = TransportMode.Walk,
                    Description = $"Pješke od stanice {destStop.Name} do odredišta",
                    DurationMinutes = walkMins,
                    DistanceKm = walkKm,
                    Geometry = finalWalk.Geometry
                }
            },
            Warnings = eval.Warnings
        };
    }

    private async Task<RouteOptionDto?> BuildCarOptionAsync(
        GeoPoint origin,
        GeoPoint destination,
        UserProfileDto profile,
        WeatherInfoDto weather,
        RoutingResult? directCar,
        RoutingProfile walkProfile,
        double baselineCarKm,
        CancellationToken ct)
    {
        var eval = _rules.Evaluate(profile, TransportMode.Car, weather, directCar);
        if (!eval.Allowed) return null;

        // Odaberi najbliže TimPark parkiralište uz odredište (ako osoba ima invaliditet -> samo s invalidskim mjestima)
        var nearestAnyParking = TimisoaraPublicData.Parkings
            .OrderBy(p => TimisoaraPublicData.HaversineMeters(destination, new GeoPoint { Lat = p.Lat, Lng = p.Lng }))
            .FirstOrDefault();

        var parking = TimisoaraPublicData.Parkings
            .Where(p => !profile.HasDisability || (p.HasDisabledAccess && p.AccessibleSpots > 0))
            .OrderBy(p => TimisoaraPublicData.HaversineMeters(destination, new GeoPoint { Lat = p.Lat, Lng = p.Lng }))
            .FirstOrDefault();

        if (parking is null) return null;

        var parkingPt = new GeoPoint { Lat = parking.Lat, Lng = parking.Lng };
        var driveToParking = await _routing.GetRouteAsync(origin, parkingPt, RoutingProfile.DrivingCar, ct) ?? directCar;
        var walkFromParking = await _routing.GetRouteAsync(parkingPt, destination, walkProfile, ct);

        if (driveToParking is null || walkFromParking is null) return null;

        var carWarnings = new List<RouteWarningDto>(eval.Warnings);
        if (profile.HasDisability && nearestAnyParking is not null && nearestAnyParking.Id != parking.Id)
        {
            carWarnings.Add(new RouteWarningDto
            {
                Type = WarningType.NotAccessible,
                Message = $"Wheelchair filtriranje: Najbliže parkiralište ({nearestAnyParking.Name}) nema označena invalidska mjesta – odabrano je prilagođeno parkiralište {parking.Name}."
            });
        }
        if (profile.HasDisability && walkFromParking.AverageGradePercent > 4.0)
        {
            carWarnings.Add(new RouteWarningDto
            {
                Type = WarningType.Slope,
                Message = $"Pristup u kolicima od parkirališta ima nagib {walkFromParking.AverageGradePercent:F1}%."
            });
        }

        double driveKm = Math.Round(driveToParking.DistanceMeters / 1000.0, 2);
        double driveMins = Math.Max(2.0, Math.Round(driveToParking.DurationSeconds / 60.0, 1));
        double walkKm = Math.Round(walkFromParking.DistanceMeters / 1000.0, 2);
        double walkMins = Math.Max(1.0, Math.Round(walkFromParking.DurationSeconds / 60.0, 1));

        double totalKm = Math.Round(driveKm + walkKm, 2);
        double totalMins = Math.Round(driveMins + walkMins, 1);

        decimal fuelCost = (decimal)(driveKm * (_options.CarConsumptionLitersPer100Km / 100.0)) * _options.FuelPriceRonPerLiter;
        decimal parkingCost = profile.HasDisability ? 0.00m : parking.HourlyRateRon; // Besplatno za osobe s invaliditetom na označenim mjestima
        decimal totalCost = Math.Round(fuelCost + parkingCost, 2);

        double co2 = EcoScoreCalculator.CalculateCo2Grams(TransportMode.Car, driveKm);
        int pts = EcoScoreCalculator.CalculateEcoPoints(TransportMode.Car, totalKm, baselineCarKm, co2);

        string spotsInfo = profile.HasDisability
            ? $"{parking.AccessibleSpots} slobodnih invalidskih mjesta (0 RON/h)"
            : $"{parking.AvailableSpots} slobodnih mjesta ({parking.HourlyRateRon:F2} RON/h, {parking.Zone})";

        return new RouteOptionDto
        {
            Id = "car-timpark",
            Mode = TransportMode.Car,
            Title = profile.HasDisability
                ? $"Osobno vozilo + invalidsko mjesto ({parking.Name})"
                : $"Osobno vozilo + {parking.Name}",
            DurationMinutes = totalMins,
            DistanceKm = totalKm,
            CostRon = totalCost,
            Co2Grams = co2,
            EcoPoints = pts,
            Segments = new List<RouteSegmentDto>
            {
                new()
                {
                    Mode = TransportMode.Car,
                    Description = $"Vožnja do parkirališta {parking.Name} – {spotsInfo}",
                    DurationMinutes = driveMins,
                    DistanceKm = driveKm,
                    Geometry = driveToParking.Geometry
                },
                new()
                {
                    Mode = TransportMode.Walk,
                    Description = profile.HasDisability
                        ? $"Pristupačan put bez barijera (wheelchair) od parkirališta {parking.Name} do odredišta"
                        : $"Pješke od parkirališta {parking.Name} do odredišta",
                    DurationMinutes = walkMins,
                    DistanceKm = walkKm,
                    Geometry = walkFromParking.Geometry
                }
            },
            Warnings = carWarnings
        };
    }

    private static void NormalizeRequestForSwaggerDefaults(RoutePlanRequest request)
    {
        // Ako su u Swaggeru ostavljene koordinate (0, 0), postavi Piața Victoriei -> Politehnica (UPT)
        if (Math.Abs(request.Origin.Lat) < 0.001 && Math.Abs(request.Origin.Lng) < 0.001)
        {
            request.Origin = new GeoPoint { Lat = 45.7537, Lng = 21.2257 };
        }
        if (Math.Abs(request.Destination.Lat) < 0.001 && Math.Abs(request.Destination.Lng) < 0.001)
        {
            request.Destination = new GeoPoint { Lat = 45.7474, Lng = 21.2263 };
        }

        // Swagger UI automatski popuni "preferredModes": ["Walk"] kao primjer; tretiraj to kao "svi modovi"
        // te ukloni filter ako bi isključio sve dopuštene opcije za osobe s invaliditetom ili djecu.
        if (request.PreferredModes is { Count: 1 } && request.PreferredModes[0] == TransportMode.Walk)
        {
            request.PreferredModes = null;
        }
        else if (request.Profile.HasDisability &&
                 request.PreferredModes is { Count: > 0 } &&
                 !request.PreferredModes.Contains(TransportMode.PublicTransport) &&
                 !request.PreferredModes.Contains(TransportMode.Car))
        {
            request.PreferredModes = null;
        }
    }

    private static bool IsModeRequested(RoutePlanRequest request, TransportMode mode) =>
        request.PreferredModes is null ||
        request.PreferredModes.Count == 0 ||
        request.PreferredModes.Contains(mode);

    private void ApplyCommunityWazeHazards(List<RouteOptionDto> options, bool hasDisability)
    {
        foreach (var opt in options)
        {
            var allPoints = opt.Segments.SelectMany(s => s.Geometry).ToList();
            if (allPoints.Count == 0) continue;

            var hazards = _community.GetHazardsNearGeometry(allPoints, opt.Mode, hasDisability, thresholdMeters: 210.0);
            foreach (var h in hazards)
            {
                var wType = h.Category switch
                {
                    CommunityReportCategory.BlockedBikeLane => WarningType.BlockedBikeLane,
                    CommunityReportCategory.InaccessibleArea => WarningType.InaccessibleArea,
                    CommunityReportCategory.MissingBikeLane => WarningType.CrowdsourcedMissingBikeLane,
                    _ => WarningType.RoadBlockade
                };

                string msg = h.Category switch
                {
                    CommunityReportCategory.BlockedBikeLane =>
                        $"Waze upozorenje ({h.ConfirmationsCount}👍): {h.Title} ({h.StreetOrZone}). {h.Description}",
                    CommunityReportCategory.InaccessibleArea =>
                        $"Waze pristupačnost ({h.ConfirmationsCount}👍): {h.Title} ({h.StreetOrZone}). {h.Description}",
                    CommunityReportCategory.MissingBikeLane =>
                        $"Zajednica prijavljuje ({h.ConfirmationsCount}👍): Na dionici '{h.StreetOrZone}' nedostaje biciklistička staza unatoč čestom prolasku.",
                    _ =>
                        $"Waze blokada na ruti ({h.ConfirmationsCount}👍): {h.Title} ({h.StreetOrZone})."
                };

                if (!opt.Warnings.Any(w => w.Message == msg))
                {
                    opt.Warnings.Add(new RouteWarningDto
                    {
                        Type = wType,
                        Message = msg
                    });
                }
            }
        }
    }

    private static void RankAndMarkRecommended(List<RouteOptionDto> options)
    {
        if (options.Count == 0) return;

        // Sortiraj po CO2 rastuće, pa ima li aktivnu Waze blokadu na ruti, pa po eko-bodovima padajuće, pa po trajanju rastuće
        var sorted = options
            .OrderBy(o => o.Co2Grams)
            .ThenBy(o => o.Warnings.Any(w => w.Type is WarningType.RoadBlockade or WarningType.BlockedBikeLane or WarningType.InaccessibleArea) ? 1 : 0)
            .ThenByDescending(o => o.EcoPoints)
            .ThenBy(o => o.DurationMinutes)
            .ToList();

        options.Clear();
        options.AddRange(sorted);

        for (int i = 0; i < options.Count; i++)
        {
            options[i].EcoRank = i + 1;
            options[i].IsRecommended = false;
        }

        double fastest = options.Min(o => o.DurationMinutes);

        // Preporuči najzeleniju opciju bez nepovoljnih vremenskih/infrastrukturnih/Waze blokada čije trajanje je razumno
        var bestClean = options.FirstOrDefault(o =>
            o.Mode != TransportMode.Car &&
            o.DurationMinutes <= fastest * 2.2 &&
            !o.Warnings.Any(w => w.Type is WarningType.Rain or WarningType.Snow or WarningType.NoBikeLane
                or WarningType.AirQuality or WarningType.RoadBlockade or WarningType.BlockedBikeLane or WarningType.InaccessibleArea));

        var recommended = bestClean
                          ?? options.FirstOrDefault(o => o.Mode != TransportMode.Car && o.DurationMinutes <= fastest * 2.5)
                          ?? options[0];

        recommended.IsRecommended = true;
    }
}
