using EcoMutare.Dtos;
using EcoMutare.Services.Routing;

namespace EcoMutare.Services;

/// <summary>
/// Javno dostupni podaci grada Timișoare (Primăria Municipiului Timișoara / data.primariatm.ro,
/// STPT VeloTM stanice, TimPark zone parkiranja, STPT javni prijevoz i OSM biciklistički koridori).
/// </summary>
public static class TimisoaraPublicData
{
    // Stvarne VeloTM (STPT) stanice za bicikle i mikro-mobilnost u Timișoari
    public static IReadOnlyList<MobilityStationDto> Stations { get; } = new List<MobilityStationDto>
    {
        new("velotm-victoriei", "VeloTM Piața Victoriei (Opere)", "Bike", 45.7537, 21.2257, 9, 1.5m),
        new("velotm-libertatii", "VeloTM Piața Libertății", "Bike", 45.7556, 21.2274, 7, 1.5m),
        new("velotm-unirii", "VeloTM Piața Unirii", "Bike", 45.7580, 21.2290, 11, 1.5m),
        new("velotm-catedrala", "VeloTM Catedrala Mitropolitană", "Bike", 45.7509, 21.2242, 6, 1.5m),
        new("velotm-upt-parvan", "VeloTM Politehnica (Bd. Vasile Pârvan)", "Bike", 45.7474, 21.2263, 12, 1.5m),
        new("velotm-complex", "VeloTM Complexul Studențesc (Aleea Studenților)", "Bike", 45.7489, 21.2398, 10, 1.5m),
        new("velotm-uvt", "VeloTM Universitatea de Vest (UVT)", "Bike", 45.7471, 21.2316, 8, 1.5m),
        new("velotm-iulius", "VeloTM Iulius Town / Piața Consiliul Europei", "Bike", 45.7662, 21.2286, 14, 1.5m),
        new("velotm-gara-nord", "VeloTM Gara Timișoara Nord", "Bike", 45.7508, 21.2076, 8, 1.5m),
        new("velotm-spital-judetean", "VeloTM Spitalul Județean (Bd. Liviu Rebreanu)", "Bike", 45.7368, 21.2415, 5, 1.5m),
        new("scooter-victoriei", "Trotinete Piața Victoriei", "Scooter", 45.7541, 21.2261, 6, 2.5m),
        new("scooter-complex", "Trotinete Complexul Studențesc", "Scooter", 45.7492, 21.2385, 8, 2.5m),
        new("scooter-iulius", "Trotinete Iulius Town", "Scooter", 45.7658, 21.2292, 10, 2.5m),
        new("scooter-gara-nord", "Trotinete Gara de Nord", "Scooter", 45.7510, 21.2082, 5, 2.5m)
    };

    // Stvarne TimPark javne zone parkiranja i cijene u RON/h (data.primariatm.ro / timpark.ro)
    public static IReadOnlyList<ParkingLotDto> Parkings { get; } = new List<ParkingLotDto>
    {
        new("timpark-modex", "TimPark Piața Iancu Huniade (Modex)", "Zona 0 (Verde - Progresiv)", 45.7544, 21.2285, 4.50m, 24, 4, true),
        new("timpark-telbisz", "TimPark Str. Carol Telbisz / Bratianu", "Zona 0 (Verde)", 45.7551, 21.2305, 4.07m, 18, 3, true),
        new("timpark-loga", "TimPark Bd. C. D. Loga", "Zona I (Roșie)", 45.7518, 21.2310, 2.03m, 32, 4, true),
        new("timpark-parvan", "TimPark Bd. Vasile Pârvan (UPT / Bega)", "Zona II (Galbenă)", 45.7475, 21.2280, 1.52m, 45, 5, true),
        new("timpark-cluj", "TimPark Str. Cluj (Sala Olimpia / Complex)", "Zona II (Galbenă)", 45.7458, 21.2388, 1.52m, 38, 3, true),
        new("timpark-gara", "TimPark Gara Timișoara Nord", "Zona II (Galbenă)", 45.7505, 21.2085, 1.52m, 50, 6, true),
        new("timpark-circumvalatiunii", "TimPark Calea Circumvalațiunii", "Zona III (Albastră)", 45.7630, 21.2190, 1.02m, 60, 4, true),
        new("parking-iulius", "Iulius Town Multilevel Parking", "Privat / Public", 45.7668, 21.2295, 3.00m, 180, 12, true),
        new("timpark-traian-narrow", "TimPark Str. Ștefan cel Mare (bočni parking uz kolnik)", "Zona II (Galbenă)", 45.7574, 21.2502, 1.52m, 14, 0, false)
    };

    // Glavne STPT stanice javnog prijevoza s oznakom pristupačnosti za osobe s invaliditetom
    public static IReadOnlyList<TransitStopDto> TransitStops { get; } = new List<TransitStopDto>
    {
        new("stpt-catedrala", "Catedrala Mitropolitană", 45.7510, 21.2244, true, new[] { "Troleibuz 16", "Autobuz E3", "Autobuz 33", "Tramvai 1", "Tramvai 2" }),
        new("stpt-regina-maria", "Piața Regina Maria", 45.7548, 21.2238, true, new[] { "Tramvai 1", "Tramvai 2", "Troleibuz 16", "Autobuz E8" }),
        new("stpt-libertatii", "Piața Libertății", 45.7556, 21.2273, true, new[] { "Tramvai 1", "Tramvai 2", "Tramvai 6" }),
        new("stpt-parvan", "Universitatea Politehnica / Vasile Pârvan", 45.7472, 21.2266, true, new[] { "Troleibuz 16", "Autobuz E8" }),
        new("stpt-complex", "Complexul Studențesc", 45.7486, 21.2395, true, new[] { "Troleibuz 15", "Troleibuz 16", "Autobuz E8" }),
        new("stpt-cluj", "Strada Cluj (Sala Olimpia)", 45.7448, 21.2385, true, new[] { "Tramvai 8", "Tramvai 9", "Troleibuz 15", "Autobuz E3" }),
        new("stpt-gara-nord", "Gara Timișoara Nord", 45.7507, 21.2079, true, new[] { "Tramvai 1", "Tramvai 2", "Tramvai 8", "Troleibuz 11", "Troleibuz 14", "Autobuz E3" }),
        new("stpt-consiliul-europei", "Piața Consiliul Europei (Iulius Town)", 45.7652, 21.2280, true, new[] { "Troleibuz 14", "Autobuz E2", "Autobuz 40" }),
        new("stpt-spital", "Spitalul Județean", 45.7370, 21.2412, true, new[] { "Tramvai 8", "Tramvai 9", "Autobuz E3", "Troleibuz 15" }),
        new("stpt-traian-old", "Piața Traian (stari peron bez rampe)", 45.7576, 21.2508, false, new[] { "Tramvai 1", "Tramvai 2", "Tramvai 4" }),
        new("stpt-iosefin-old", "Piața Iosefin (visoki rubnjak / bez pristupa za kolica)", 45.7432, 21.2122, false, new[] { "Tramvai 1", "Tramvai 7" })
    };

    // Glavni biciklistički koridori Timișoare (Piste de biciclete: Malul Begăi, Bd. Vasile Pârvan,
    // Bd. Mihai Viteazul, Calea Aradului, Bd. Take Ionescu, Bd. Liviu Rebreanu, Str. Cluj, Calea Sever Bocu)
    public static IReadOnlyList<BikeCorridorDto> BikeCorridors { get; } = new List<BikeCorridorDto>
    {
        new("bega-trail", "Pista Malul Begăi (Uzina de Apă – Centru – Iosefin)", new List<GeoPoint>
        {
            new() { Lat = 45.7438, Lng = 21.2015 },
            new() { Lat = 45.7475, Lng = 21.2165 },
            new() { Lat = 45.7495, Lng = 21.2248 },
            new() { Lat = 45.7512, Lng = 21.2335 },
            new() { Lat = 45.7555, Lng = 21.2485 },
            new() { Lat = 45.7580, Lng = 21.2620 }
        }),
        new("parvan-cluj", "Pista Bd. Vasile Pârvan – Pasaj Michelangelo – Str. Cluj", new List<GeoPoint>
        {
            new() { Lat = 45.7482, Lng = 21.2215 },
            new() { Lat = 45.7473, Lng = 21.2275 },
            new() { Lat = 45.7478, Lng = 21.2345 },
            new() { Lat = 45.7450, Lng = 21.2385 },
            new() { Lat = 45.7372, Lng = 21.2412 }
        }),
        new("victoriei-sever-bocu", "Pista Centru (Piața Victoriei) – Piața Unirii – Iulius Town – Calea Sever Bocu", new List<GeoPoint>
        {
            new() { Lat = 45.7509, Lng = 21.2242 },
            new() { Lat = 45.7537, Lng = 21.2257 },
            new() { Lat = 45.7580, Lng = 21.2290 },
            new() { Lat = 45.7658, Lng = 21.2288 },
            new() { Lat = 45.7745, Lng = 21.2325 }
        }),
        new("republicii-gara", "Pista Bd. Republicii – Gara Timișoara Nord", new List<GeoPoint>
        {
            new() { Lat = 45.7537, Lng = 21.2257 },
            new() { Lat = 45.7525, Lng = 21.2170 },
            new() { Lat = 45.7508, Lng = 21.2076 }
        }),
        new("take-ionescu", "Pista Bd. Take Ionescu – Piața Badea Cârțan", new List<GeoPoint>
        {
            new() { Lat = 45.7568, Lng = 21.2320 },
            new() { Lat = 45.7588, Lng = 21.2435 },
            new() { Lat = 45.7605, Lng = 21.2545 }
        })
    };

    /// <summary>Procjenjuje koji udio točaka rute (0..1) leži unutar ~220 m od poznatih biciklističkih koridora Timișoare (mjereno ortogonalno na segmente staze).</summary>
    public static double EstimateBikeLaneCoverage(IReadOnlyList<GeoPoint> geometry)
    {
        if (geometry.Count == 0) return 0;

        int covered = 0;
        foreach (var pt in geometry)
        {
            double minMeters = double.MaxValue;
            foreach (var corridor in BikeCorridors)
            {
                for (int i = 1; i < corridor.Points.Count; i++)
                {
                    double d = Services.Insights.GreenIntelligenceService.PointToSegmentDistanceMeters(pt, corridor.Points[i - 1], corridor.Points[i]);
                    if (d < minMeters) minMeters = d;
                }
            }

            if (minMeters <= 220.0)
            {
                covered++;
            }
        }
        return Math.Round((double)covered / geometry.Count, 2);
    }

    /// <summary>Gradi realističnu geometriju kroz gradske koridore kada vanjski ORS nije dostupan.</summary>
    public static List<GeoPoint> BuildRealisticStreetGeometry(GeoPoint from, GeoPoint to, RoutingProfile profile, int steps = 12)
    {
        var points = new List<GeoPoint>(steps + 1);

        // Za bicikl pokušavamo usmjeriti preko najbliže točke na Bega/centralnom biciklističkom koridoru
        var midLat = (from.Lat + to.Lat) / 2.0 + (to.Lng - from.Lng) * 0.12;
        var midLng = (from.Lng + to.Lng) / 2.0 - (to.Lat - from.Lat) * 0.12;

        if (profile == RoutingProfile.CyclingRegular)
        {
            var nearestCorridorPt = BikeCorridors
                .SelectMany(c => c.Points)
                .OrderBy(p => HaversineMeters(p, new GeoPoint { Lat = (from.Lat + to.Lat) / 2.0, Lng = (from.Lng + to.Lng) / 2.0 }))
                .FirstOrDefault();

            if (nearestCorridorPt is not null &&
                HaversineMeters(nearestCorridorPt, from) < HaversineMeters(from, to) * 1.1)
            {
                midLat = nearestCorridorPt.Lat;
                midLng = nearestCorridorPt.Lng;
            }
        }

        for (int i = 0; i <= steps; i++)
        {
            double t = (double)i / steps;
            // Kvadratna Bézierova krivulja kroz međutočku
            double u = 1.0 - t;
            double lat = u * u * from.Lat + 2 * u * t * midLat + t * t * to.Lat;
            double lng = u * u * from.Lng + 2 * u * t * midLng + t * t * to.Lng;
            points.Add(new GeoPoint { Lat = Math.Round(lat, 6), Lng = Math.Round(lng, 6) });
        }

        return points;
    }

    public static double ComputePolylineLengthMeters(IReadOnlyList<GeoPoint> pts)
    {
        double total = 0;
        for (int i = 1; i < pts.Count; i++)
        {
            total += HaversineMeters(pts[i - 1], pts[i]);
        }
        return total;
    }

    public static double HaversineMeters(GeoPoint a, GeoPoint b)
    {
        const double R = 6_371_000.0;
        double dLat = DegreesToRadians(b.Lat - a.Lat);
        double dLng = DegreesToRadians(b.Lng - a.Lng);
        double lat1 = DegreesToRadians(a.Lat);
        double lat2 = DegreesToRadians(b.Lat);

        double sinLat = Math.Sin(dLat / 2);
        double sinLng = Math.Sin(dLng / 2);
        double h = sinLat * sinLat + Math.Cos(lat1) * Math.Cos(lat2) * sinLng * sinLng;
        return 2 * R * Math.Asin(Math.Min(1.0, Math.Sqrt(h)));
    }

    // Reljef Timișoare: ~87 m uz Begu, blagi porast prema sjeveru (Calea Aradului / Lipovei ~95 m)
    public static double EstimateLocalElevationMeters(GeoPoint p)
    {
        double baseElev = 88.0;
        double northSlope = (p.Lat - 45.7500) * 140.0;
        double eastUndulation = Math.Sin((p.Lng - 21.2250) * 180.0) * 1.8;
        return Math.Round(baseElev + northSlope + eastUndulation, 1);
    }

    // Javne RNMCA (calitateaer.ro) mjerne postaje kvalitete zraka u Timișoari i poznate prometne točke
    // s povišenim česticama PM2.5 / PM10 i NO2 (TM-1 Calea Șagului, TM-2 Bd. C.D. Loga, TM-4 Carani, TM-5 Calea Aradului, Pasaj Michelangelo, Gara de Nord).
    public record AirQualityStationDto(
        string StationCode,
        string Name,
        double Lat,
        double Lng,
        int TypicalEuropeanAqi,
        double TypicalPm25,
        double TypicalPm10,
        string TrafficNote);

    public static IReadOnlyList<AirQualityStationDto> AirQualityStations { get; } = new List<AirQualityStationDto>
    {
        new("TM-1", "RNMCA TM-1 Calea Șagului (prometni koridor)", 45.7335, 21.2130, 58, 23.5, 42.0, "gust tranzitni promet i povišene čestice PM10/PM2.5"),
        new("TM-5", "RNMCA TM-5 Calea Aradului / Torontalului", 45.7710, 21.2210, 54, 21.0, 38.5, "ulazni prometni pravac s povišenom razinom ispušnih plinova"),
        new("TM-MICHELANGELO", "Čvorište Pasaj Michelangelo / Bd. Vasile Pârvan", 45.7476, 21.2315, 48, 18.5, 34.0, "pojačan promet kroz podvožnjak i križanje uz kampus"),
        new("TM-GARA", "Zona Gara Timișoara Nord / Bd. Republicii", 45.7512, 21.2120, 46, 17.5, 32.0, "pojačana koncentracija PM2.5 čestica uz željezničko i autobusno čvorište"),
        new("TM-BUZIAS", "Calea Buziașului – Industrijska zona", 45.7380, 21.2580, 62, 25.0, 46.0, "industrijska i teretna zona s nižom kvalitetom zraka"),
        new("TM-2", "RNMCA TM-2 Bd. C. D. Loga / Parcul Rozelor (zelena zona)", 45.7515, 21.2295, 22, 8.5, 16.0, "parkovni pojas uz Begu – dobra kvaliteta zraka")
    };

    /// <summary>
    /// Provjerava prolazi li zadana geometrija rute kroz zonu s nižom kvalitetom zraka u Timișoari ili je li opći AQI u gradu povišen.
    /// Vraća (HasPoorAir, WorstAqi, WorstPm25, StationOrZoneName, Reason).
    /// </summary>
    public static (bool HasNoticeableAirPollution, int EffectiveAqi, double EffectivePm25, string ZoneName, string Note)
        EvaluateRouteAirQuality(IReadOnlyList<GeoPoint> geometry, WeatherInfoDto cityWeather)
    {
        int maxAqi = cityWeather.EuropeanAqi;
        double maxPm25 = cityWeather.Pm25;
        string zoneName = "Gradsko područje Timișoare";
        string note = "povišena koncentracija lebdećih čestica u zraku";

        if (geometry.Count > 0)
        {
            foreach (var station in AirQualityStations.Where(s => s.TypicalEuropeanAqi >= 42))
            {
                var stPt = new GeoPoint { Lat = station.Lat, Lng = station.Lng };
                bool passesNear = geometry.Any(pt => HaversineMeters(pt, stPt) <= 550.0);
                if (!passesNear && geometry.Count >= 2)
                {
                    for (int i = 1; i < geometry.Count; i++)
                    {
                        if (Services.Insights.GreenIntelligenceService.PointToSegmentDistanceMeters(stPt, geometry[i - 1], geometry[i]) <= 500.0)
                        {
                            passesNear = true;
                            break;
                        }
                    }
                }

                if (passesNear)
                {
                    // Ako je u gradu trenutno kiša, oborine malo ispiru čestice (-6 AQI), inače uzimamo višu vrijednost između stanice i općeg AQI-ja
                    int localAqi = cityWeather.Condition == Domain.WeatherCondition.Rain
                        ? Math.Max(cityWeather.EuropeanAqi, station.TypicalEuropeanAqi - 6)
                        : Math.Max(cityWeather.EuropeanAqi, station.TypicalEuropeanAqi);

                    double localPm25 = Math.Max(cityWeather.Pm25, station.TypicalPm25);

                    if (localAqi >= maxAqi)
                    {
                        maxAqi = localAqi;
                        maxPm25 = localPm25;
                        zoneName = station.Name;
                        note = station.TrafficNote;
                    }
                }
            }
        }

        // Prag za upozorenje pješacima i biciklistima/romobilistima: EAQI >= 40 ili PM2.5 >= 15 µg/m³
        bool shouldWarn = maxAqi >= 40 || maxPm25 >= 15.0;
        return (shouldWarn, maxAqi, Math.Round(maxPm25, 1), zoneName, note);
    }

    public static string ClassifyAqiCategory(int europeanAqi) => europeanAqi switch
    {
        <= 20 => "Odlična",
        <= 40 => "Dobra",
        <= 60 => "Umjereno zagađen zrak",
        <= 80 => "Loša kvaliteta zraka",
        _ => "Vrlo loša kvaliteta zraka"
    };

    private static double DegreesToRadians(double deg) => deg * (Math.PI / 180.0);
}

public record MobilityStationDto(
    string Id,
    string Name,
    string VehicleType,
    double Lat,
    double Lng,
    int AvailableVehicles,
    decimal UnlockCostRon);

public record ParkingLotDto(
    string Id,
    string Name,
    string Zone,
    double Lat,
    double Lng,
    decimal HourlyRateRon,
    int AvailableSpots,
    int AccessibleSpots,
    bool HasDisabledAccess);

public record TransitStopDto(
    string Id,
    string Name,
    double Lat,
    double Lng,
    bool WheelchairAccessible,
    string[] Lines);

public record BikeCorridorDto(
    string Id,
    string Name,
    List<GeoPoint> Points);
