using EcoMutare.Domain;
using EcoMutare.Dtos;
using EcoMutare.Services.Routing;

namespace EcoMutare.Services.Insights;

/// <summary>
/// BE1 servis (sat 24–30) koji predaje BE2-u i gradskom dashboardu:
/// 1) Izračun točne ortogonalne udaljenosti bilo koje točke do najbliže biciklističke staze (segment polylinea) i STPT stanice,
/// 2) Podjelu Timișoare u ~500m prostornu rešetku i mapiranje putovanja na ćelije,
/// 3) Izračun indeksa praznine (GapCells: visoka potražnja + velik auto-udio + udaljenost od staze/JPP-a) i top 3 zone za ulaganje.
/// </summary>
public interface IGreenIntelligenceService
{
    InfrastructureProximityDto GetInfrastructureProximity(GeoPoint point);
    (double DistanceMeters, string CorridorId, string CorridorName) GetNearestBikeLaneDistance(GeoPoint point);
    (double DistanceMeters, TransitStopDto Stop) GetNearestTransitStopDistance(GeoPoint point, bool onlyWheelchairAccessible = false);
    IReadOnlyList<GapCellDto> CalculateGapCells(IEnumerable<CityTripRecordDto>? customTrips = null);
    InsightsGapsResponseDto GetGapsReport(IEnumerable<CityTripRecordDto>? customTrips = null);
    InsightsSummaryResponseDto GetSummaryReport(IEnumerable<CityTripRecordDto>? customTrips = null);
    void RecordTrip(CityTripRecordDto trip);
}

public class GreenIntelligenceService : IGreenIntelligenceService
{
    // ~500m korak rešetke na zemljopisnoj širini Timișoare (45.75° N):
    // 1° lat ≈ 111,132 m -> 500 m ≈ 0.0045° lat
    // 1° lng ≈ 77,600 m  -> 500 m ≈ 0.0064° lng
    private const double CellLatStep = 0.0045;
    private const double CellLngStep = 0.0064;

    private readonly List<CityTripRecordDto> _recordedTrips = new();
    private readonly object _sync = new();

    public GreenIntelligenceService()
    {
        _recordedTrips.AddRange(GenerateRealisticTimisoaraSeedTrips());
    }

    public void RecordTrip(CityTripRecordDto trip)
    {
        lock (_sync)
        {
            _recordedTrips.Add(trip);
        }
    }

    public InfrastructureProximityDto GetInfrastructureProximity(GeoPoint point)
    {
        var (bikeDist, bikeId, bikeName) = GetNearestBikeLaneDistance(point);
        var (stopDist, stop) = GetNearestTransitStopDistance(point, onlyWheelchairAccessible: false);
        var (accStopDist, accStop) = GetNearestTransitStopDistance(point, onlyWheelchairAccessible: true);

        var nearestBikeStation = TimisoaraPublicData.Stations
            .Where(s => s.VehicleType.Equals("Bike", StringComparison.OrdinalIgnoreCase))
            .Select(s => (Station: s, Dist: TimisoaraPublicData.HaversineMeters(point, new GeoPoint { Lat = s.Lat, Lng = s.Lng })))
            .OrderBy(x => x.Dist)
            .First();

        return new InfrastructureProximityDto
        {
            Location = point,
            DistanceToNearestBikeLaneMeters = Math.Round(bikeDist, 1),
            NearestBikeLaneId = bikeId,
            NearestBikeLaneName = bikeName,
            DistanceToNearestTransitStopMeters = Math.Round(stopDist, 1),
            NearestTransitStopId = stop.Id,
            NearestTransitStopName = stop.Name,
            DistanceToNearestAccessibleStopMeters = Math.Round(accStopDist, 1),
            NearestAccessibleStopName = accStop.Name,
            DistanceToNearestBikeStationMeters = Math.Round(nearestBikeStation.Dist, 1),
            NearestBikeStationName = nearestBikeStation.Station.Name
        };
    }

    public (double DistanceMeters, string CorridorId, string CorridorName) GetNearestBikeLaneDistance(GeoPoint point)
    {
        double bestDist = double.MaxValue;
        string bestId = string.Empty;
        string bestName = string.Empty;

        foreach (var corridor in TimisoaraPublicData.BikeCorridors)
        {
            var pts = corridor.Points;
            if (pts.Count == 0) continue;

            if (pts.Count == 1)
            {
                double d = TimisoaraPublicData.HaversineMeters(point, pts[0]);
                if (d < bestDist)
                {
                    bestDist = d;
                    bestId = corridor.Id;
                    bestName = corridor.Name;
                }
                continue;
            }

            for (int i = 1; i < pts.Count; i++)
            {
                double d = PointToSegmentDistanceMeters(point, pts[i - 1], pts[i]);
                if (d < bestDist)
                {
                    bestDist = d;
                    bestId = corridor.Id;
                    bestName = corridor.Name;
                }
            }
        }

        return (Math.Round(bestDist, 1), bestId, bestName);
    }

    public (double DistanceMeters, TransitStopDto Stop) GetNearestTransitStopDistance(GeoPoint point, bool onlyWheelchairAccessible = false)
    {
        var candidates = TimisoaraPublicData.TransitStops
            .Where(s => !onlyWheelchairAccessible || s.WheelchairAccessible)
            .ToList();

        if (candidates.Count == 0)
        {
            candidates = TimisoaraPublicData.TransitStops.ToList();
        }

        var nearest = candidates
            .Select(s => (Stop: s, Dist: TimisoaraPublicData.HaversineMeters(point, new GeoPoint { Lat = s.Lat, Lng = s.Lng })))
            .OrderBy(x => x.Dist)
            .First();

        return (Math.Round(nearest.Dist, 1), nearest.Stop);
    }

    public IReadOnlyList<GapCellDto> CalculateGapCells(IEnumerable<CityTripRecordDto>? customTrips = null)
    {
        IReadOnlyList<CityTripRecordDto> trips;
        if (customTrips is not null)
        {
            trips = customTrips.ToList();
        }
        else
        {
            lock (_sync)
            {
                trips = _recordedTrips.ToList();
            }
        }

        var zones = GetTimisoaraGridZones();
        var cells = new List<GapCellDto>(zones.Count);

        foreach (var zone in zones)
        {
            var halfLat = CellLatStep / 2.0;
            var halfLng = CellLngStep / 2.0;

            var bounds = new List<GeoPoint>
            {
                new() { Lat = Math.Round(zone.Center.Lat - halfLat, 6), Lng = Math.Round(zone.Center.Lng - halfLng, 6) },
                new() { Lat = Math.Round(zone.Center.Lat - halfLat, 6), Lng = Math.Round(zone.Center.Lng + halfLng, 6) },
                new() { Lat = Math.Round(zone.Center.Lat + halfLat, 6), Lng = Math.Round(zone.Center.Lng + halfLng, 6) },
                new() { Lat = Math.Round(zone.Center.Lat + halfLat, 6), Lng = Math.Round(zone.Center.Lng - halfLng, 6) }
            };

            // Putovanje pripada ili prolazi kroz ćeliju ako polazište, odredište ili linija kretanja siječe radijus ćelije (~380m)
            var matchingTrips = trips.Where(t => TripPassesThroughCell(t, zone.Center, 390.0)).ToList();

            int total = matchingTrips.Count;
            int carCount = matchingTrips.Count(t => t.Mode == TransportMode.Car);
            int greenCount = total - carCount;
            double carShare = total > 0 ? Math.Round((double)carCount / total, 2) : 0.0;

            var (bikeDist, _, bikeName) = GetNearestBikeLaneDistance(zone.Center);
            var (stopDist, stop) = GetNearestTransitStopDistance(zone.Center, onlyWheelchairAccessible: false);
            var (accStopDist, _) = GetNearestTransitStopDistance(zone.Center, onlyWheelchairAccessible: true);

            // Formula za GapScore (0..100):
            // Visoka potražnja (do 35 bodova) + visok udio automobila (do 35 bodova) + udaljenost od staze i JPP-a (do 30 bodova)
            double demandFactor = Math.Clamp(total / 48.0, 0.0, 1.0) * 35.0;
            double carFactor = carShare * 35.0;
            double bikeDeficitFactor = Math.Clamp((bikeDist - 120.0) / 850.0, 0.0, 1.0) * 20.0;
            double transitDeficitFactor = Math.Clamp((stopDist - 150.0) / 750.0, 0.0, 1.0) * 10.0;

            double gapScore = Math.Round(Math.Clamp(demandFactor + carFactor + bikeDeficitFactor + transitDeficitFactor, 0.0, 100.0), 1);
            bool isGap = gapScore >= 58.0 && (bikeDist >= 350.0 || carShare >= 0.55);

            cells.Add(new GapCellDto
            {
                CellId = zone.CellId,
                ZoneName = zone.ZoneName,
                Center = zone.Center,
                Bounds = bounds,
                TotalTrips = total,
                CarTrips = carCount,
                GreenTrips = greenCount,
                CarShare = carShare,
                DistanceToNearestBikeLaneMeters = bikeDist,
                NearestBikeLaneName = bikeName,
                DistanceToNearestTransitStopMeters = stopDist,
                NearestTransitStopName = stop.Name,
                DistanceToAccessibleTransitStopMeters = accStopDist,
                GapScore = gapScore,
                IsInfrastructureGap = isGap,
                RecommendedIntervention = BuildInterventionRecommendation(zone.ZoneName, bikeDist, stopDist, carShare)
            });
        }

        var ranked = cells
            .OrderByDescending(c => c.GapScore)
            .ThenByDescending(c => c.TotalTrips)
            .ToList();

        for (int i = 0; i < ranked.Count; i++)
        {
            ranked[i].PriorityRank = i + 1;
        }

        return ranked;
    }

    public InsightsGapsResponseDto GetGapsReport(IEnumerable<CityTripRecordDto>? customTrips = null)
    {
        var cells = CalculateGapCells(customTrips).ToList();
        return new InsightsGapsResponseDto
        {
            IsSimulationData = true,
            GridCellSizeMeters = 500,
            BikeCorridors = TimisoaraPublicData.BikeCorridors.ToList(),
            Cells = cells
        };
    }

    public InsightsSummaryResponseDto GetSummaryReport(IEnumerable<CityTripRecordDto>? customTrips = null)
    {
        IReadOnlyList<CityTripRecordDto> trips;
        if (customTrips is not null)
        {
            trips = customTrips.ToList();
        }
        else
        {
            lock (_sync)
            {
                trips = _recordedTrips.ToList();
            }
        }

        var cells = CalculateGapCells(trips);

        int totalTrips = trips.Count;
        int greenTrips = trips.Count(t => t.Mode != TransportMode.Car);
        double totalSavedCo2Kg = Math.Round(trips.Sum(t => t.Co2SavedGrams) / 1000.0, 1);
        double greenSplitPct = totalTrips > 0 ? Math.Round((double)greenTrips / totalTrips * 100.0, 1) : 0.0;

        var top3 = cells
            .Take(3)
            .Select(c => new PriorityZoneDto
            {
                Rank = c.PriorityRank,
                CellId = c.CellId,
                ZoneName = c.ZoneName,
                Center = c.Center,
                GapScore = c.GapScore,
                TotalTrips = c.TotalTrips,
                CarSharePercent = Math.Round(c.CarShare * 100.0, 1),
                DistanceToBikeLaneMeters = c.DistanceToNearestBikeLaneMeters,
                DistanceToTransitStopMeters = c.DistanceToNearestTransitStopMeters,
                Reason = $"{c.TotalTrips} putovanja ({Math.Round(c.CarShare * 100)}% osobnim vozilom), {c.DistanceToNearestBikeLaneMeters:F0} m do najbliže biciklističke staze.",
                ProposedAction = c.RecommendedIntervention
            })
            .ToList();

        return new InsightsSummaryResponseDto
        {
            IsSimulationData = true,
            TotalSavedCo2Kg = totalSavedCo2Kg,
            TotalTripsCount = totalTrips,
            GreenTripsCount = greenTrips,
            GreenModalSplitPercent = greenSplitPct,
            IdentifiedGapCellsCount = cells.Count(c => c.IsInfrastructureGap),
            TopInvestmentZones = top3
        };
    }

    /// <summary>
    /// Računa ortogonalnu udaljenost točke P do linijskog segmenta AB u metrima (ekvidistantna projekcija na širini Timișoare).
    /// </summary>
    public static double PointToSegmentDistanceMeters(GeoPoint p, GeoPoint a, GeoPoint b)
    {
        const double metersPerDegLat = 111_132.0;
        double metersPerDegLng = 111_320.0 * Math.Cos(p.Lat * Math.PI / 180.0);

        double ax = (a.Lng - p.Lng) * metersPerDegLng;
        double ay = (a.Lat - p.Lat) * metersPerDegLat;
        double bx = (b.Lng - p.Lng) * metersPerDegLng;
        double by = (b.Lat - p.Lat) * metersPerDegLat;

        double dx = bx - ax;
        double dy = by - ay;
        double lenSq = dx * dx + dy * dy;

        if (lenSq < 1e-6)
        {
            return Math.Sqrt(ax * ax + ay * ay);
        }

        // Projekcija ishodišta (0,0) na segment A->B
        double t = Math.Clamp(-(ax * dx + ay * dy) / lenSq, 0.0, 1.0);
        double projX = ax + t * dx;
        double projY = ay + t * dy;

        return Math.Sqrt(projX * projX + projY * projY);
    }

    private static bool TripPassesThroughCell(CityTripRecordDto trip, GeoPoint cellCenter, double radiusMeters)
    {
        if (TimisoaraPublicData.HaversineMeters(trip.Origin, cellCenter) <= radiusMeters ||
            TimisoaraPublicData.HaversineMeters(trip.Destination, cellCenter) <= radiusMeters)
        {
            return true;
        }

        return PointToSegmentDistanceMeters(cellCenter, trip.Origin, trip.Destination) <= radiusMeters;
    }

    private static string BuildInterventionRecommendation(string zoneName, double bikeDist, double stopDist, double carShare)
    {
        if (bikeDist >= 550 && stopDist >= 450)
        {
            return $"Izgradnja spojne biciklističke staze (piste de biciclete) i uvođenje nove VeloTM / STPT stanice u zoni {zoneName}.";
        }
        if (bikeDist >= 400)
        {
            return $"Prioritetna izgradnja zaštićene biciklističke trake za povezivanje zone {zoneName} s glavnom mrežom koridora.";
        }
        if (carShare >= 0.60)
        {
            return $"Pojačanje frekvencije STPT javnog prijevoza i postavljanje VeloTM mikro-mobilnost stanice u zoni {zoneName}.";
        }
        return $"Dobro pokrivena zona – održavanje postojećih biciklističkih koridora i pristupačnih prijelaza.";
    }

    private record GridZoneDefinition(string CellId, string ZoneName, GeoPoint Center);

    private static IReadOnlyList<GridZoneDefinition> GetTimisoaraGridZones() => new List<GridZoneDefinition>
    {
        // Zone s visokim deficitom infrastrukture (Top 3 kandidati za ulaganje)
        new("cell-sagului-dambovita", "Calea Șagului / Dâmbovița", new GeoPoint { Lat = 45.7315, Lng = 21.2125 }),
        new("cell-aradului-vest", "Calea Aradului / Torontalului", new GeoPoint { Lat = 45.7745, Lng = 21.2135 }),
        new("cell-buziasului-ind", "Calea Buziașului – Zona Industrială SE", new GeoPoint { Lat = 45.7365, Lng = 21.2625 }),
        new("cell-girocului-soarelui", "Calea Martirilor / Zona Soarelui", new GeoPoint { Lat = 45.7320, Lng = 21.2495 }),
        new("cell-circumvalatiunii", "Calea Circumvalațiunii / Dacia", new GeoPoint { Lat = 45.7630, Lng = 21.2185 }),
        new("cell-lipovei-nord", "Calea Lipovei / Ion Ionescu de la Brad", new GeoPoint { Lat = 45.7765, Lng = 21.2420 }),

        // Središnje i sveučilišne zone s dobrom pokrivenošću
        new("cell-victoriei-centru", "Piața Victoriei / Centru Istoric", new GeoPoint { Lat = 45.7537, Lng = 21.2257 }),
        new("cell-upt-parvan", "Universitatea Politehnica (Bd. Vasile Pârvan)", new GeoPoint { Lat = 45.7474, Lng = 21.2263 }),
        new("cell-complex-studentesc", "Complexul Studențesc / UVT", new GeoPoint { Lat = 45.7488, Lng = 21.2392 }),
        new("cell-iulius-town", "Iulius Town / Piața Consiliul Europei", new GeoPoint { Lat = 45.7660, Lng = 21.2288 }),
        new("cell-gara-nord", "Gara Timișoara Nord / Bd. Republicii", new GeoPoint { Lat = 45.7508, Lng = 21.2080 }),
        new("cell-fabric-traian", "Cartierul Fabric / Piața Traian", new GeoPoint { Lat = 45.7575, Lng = 21.2505 })
    };

    /// <summary>
    /// Generira realistična sintetička putovanja između glavnih generatora prometa u Timișoari
    /// (kampus, centar, industrijske zone, stambena naselja) kako bi gradski dashboard imao smislene brojke.
    /// </summary>
    private static List<CityTripRecordDto> GenerateRealisticTimisoaraSeedTrips()
    {
        var list = new List<CityTripRecordDto>();
        int seq = 1;

        void AddBatch(GeoPoint from, GeoPoint to, TransportMode mode, int count)
        {
            double distKm = Math.Max(0.8, Math.Round(TimisoaraPublicData.HaversineMeters(from, to) / 1000.0 * 1.28, 2));
            double modeCo2 = EcoScoreCalculator.CalculateCo2Grams(mode, distKm);
            double carCo2 = EcoScoreCalculator.CalculateCo2Grams(TransportMode.Car, distKm);
            double savedGrams = Math.Max(0.0, carCo2 - modeCo2);

            for (int i = 0; i < count; i++)
            {
                list.Add(new CityTripRecordDto
                {
                    Id = $"sim-trip-{seq++:D3}",
                    Origin = from,
                    Destination = to,
                    Mode = mode,
                    DistanceKm = distKm,
                    Co2SavedGrams = Math.Round(savedGrams, 1),
                    IsSynthetic = true
                });
            }
        }

        var sagului = new GeoPoint { Lat = 45.7315, Lng = 21.2125 };
        var aradului = new GeoPoint { Lat = 45.7745, Lng = 21.2135 };
        var buziasului = new GeoPoint { Lat = 45.7365, Lng = 21.2625 };
        var soarelui = new GeoPoint { Lat = 45.7320, Lng = 21.2495 };
        var circumvalatiunii = new GeoPoint { Lat = 45.7630, Lng = 21.2185 };
        var lipovei = new GeoPoint { Lat = 45.7765, Lng = 21.2420 };

        var victoriei = new GeoPoint { Lat = 45.7537, Lng = 21.2257 };
        var upt = new GeoPoint { Lat = 45.7474, Lng = 21.2263 };
        var complex = new GeoPoint { Lat = 45.7488, Lng = 21.2392 };
        var iulius = new GeoPoint { Lat = 45.7660, Lng = 21.2288 };
        var garaNord = new GeoPoint { Lat = 45.7508, Lng = 21.2080 };
        var fabric = new GeoPoint { Lat = 45.7575, Lng = 21.2505 };

        // 1. Calea Șagului -> Centar / UPT (velika potražnja, visoki auto-udio zbog prekida biciklističkog koridora)
        AddBatch(sagului, victoriei, TransportMode.Car, 32);
        AddBatch(sagului, upt, TransportMode.PublicTransport, 10);
        AddBatch(sagului, upt, TransportMode.Bike, 3);

        // 2. Calea Aradului -> Iulius Town / Centar (visoki auto-udio, nedostaje sigurna biciklistička veza zapadno)
        AddBatch(aradului, iulius, TransportMode.Car, 29);
        AddBatch(aradului, victoriei, TransportMode.PublicTransport, 9);
        AddBatch(aradului, iulius, TransportMode.Scooter, 4);

        // 3. Calea Buziașului (industrijska zona) -> Complex / Centar (daleko od bike lane-a, dominacija automobila)
        AddBatch(buziasului, complex, TransportMode.Car, 27);
        AddBatch(buziasului, fabric, TransportMode.PublicTransport, 7);
        AddBatch(buziasului, complex, TransportMode.Carpool, 4);

        // 4. Zona Soarelui / Martirilor -> UPT / Centar
        AddBatch(soarelui, upt, TransportMode.Car, 21);
        AddBatch(soarelui, victoriei, TransportMode.PublicTransport, 11);
        AddBatch(soarelui, upt, TransportMode.Bike, 5);

        // 5. Calea Circumvalațiunii -> Iulius Town / Gara de Nord
        AddBatch(circumvalatiunii, iulius, TransportMode.Car, 18);
        AddBatch(circumvalatiunii, garaNord, TransportMode.PublicTransport, 12);
        AddBatch(circumvalatiunii, victoriei, TransportMode.Bike, 6);

        // 6. Calea Lipovei -> Iulius Town
        AddBatch(lipovei, iulius, TransportMode.Car, 17);
        AddBatch(lipovei, iulius, TransportMode.PublicTransport, 8);
        AddBatch(lipovei, iulius, TransportMode.Bike, 5);

        // 7. Središnji zeleni koridori (Piața Victoriei <-> UPT <-> Complex <-> Iulius Town <-> Gara Nord)
        AddBatch(victoriei, upt, TransportMode.Bike, 26);
        AddBatch(victoriei, upt, TransportMode.Walk, 19);
        AddBatch(complex, upt, TransportMode.Bike, 24);
        AddBatch(complex, upt, TransportMode.Scooter, 14);
        AddBatch(victoriei, iulius, TransportMode.Bike, 18);
        AddBatch(victoriei, iulius, TransportMode.PublicTransport, 15);
        AddBatch(garaNord, victoriei, TransportMode.PublicTransport, 16);
        AddBatch(garaNord, upt, TransportMode.Combined, 11);
        AddBatch(fabric, victoriei, TransportMode.Bike, 12);

        return list;
    }
}
