using EcoMutare.Domain;
using EcoMutare.Dtos;

namespace EcoMutare.Dtos;

/// <summary>
/// Jedno anonimno ili sintetičko putovanje koje ulazi u prostorni izračun gradskih praznina (Green Intelligence).
/// </summary>
public class CityTripRecordDto
{
    public string Id { get; set; } = string.Empty;
    public GeoPoint Origin { get; set; } = new();
    public GeoPoint Destination { get; set; } = new();
    public TransportMode Mode { get; set; }
    public double DistanceKm { get; set; }
    public double Co2SavedGrams { get; set; }
    public bool IsSynthetic { get; set; } = true;
}

/// <summary>
/// Jedna ćelija rešetke grada (~500 m × 500 m) s izračunatom potražnjom, udjelom osobnih automobila,
/// udaljenošću do najbliže biciklističke staze i stanice javnog prijevoza te rangom prioriteta.
/// </summary>
public class GapCellDto
{
    public string CellId { get; set; } = string.Empty;
    public string ZoneName { get; set; } = string.Empty;
    public GeoPoint Center { get; set; } = new();

    /// <summary>Poligon ćelije (4 kuta) za crtanje rešetke/heatmapa na karti.</summary>
    public List<GeoPoint> Bounds { get; set; } = new();

    public int TotalTrips { get; set; }
    public int CarTrips { get; set; }
    public int GreenTrips { get; set; }

    /// <summary>Udio putovanja osobnim automobilom (0..1).</summary>
    public double CarShare { get; set; }

    /// <summary>Udaljenost središta ćelije do najbližeg biciklističkog koridora (u metrima).</summary>
    public double DistanceToNearestBikeLaneMeters { get; set; }
    public string NearestBikeLaneName { get; set; } = string.Empty;

    /// <summary>Udaljenost središta ćelije do najbliže STPT stanice javnog prijevoza (u metrima).</summary>
    public double DistanceToNearestTransitStopMeters { get; set; }
    public string NearestTransitStopName { get; set; } = string.Empty;

    /// <summary>Udaljenost do najbliže niskopodne / wheelchair-accessible STPT stanice (u metrima).</summary>
    public double DistanceToAccessibleTransitStopMeters { get; set; }

    /// <summary>Kompozitni indeks prioriteta ulaganja (0..100): visoka potražnja + velik auto-udio + daleko od staze/JPP-a.</summary>
    public double GapScore { get; set; }

    /// <summary>Rang prioriteta (1 = najveći infrastrukturni deficit u gradu).</summary>
    public int PriorityRank { get; set; }

    /// <summary>True ako ćelija predstavlja izraženu prazninu u zelenoj infrastrukturi.</summary>
    public bool IsInfrastructureGap { get; set; }

    public string RecommendedIntervention { get; set; } = string.Empty;
}

/// <summary>
/// Odgovor za GET /insights/gaps (karta biciklističkih staza + označene praznine u mreži).
/// </summary>
public class InsightsGapsResponseDto
{
    public bool IsSimulationData { get; set; } = true;
    public string SimulationDisclaimer { get; set; } =
        "Simulacija (Green Intelligence): Agregirana anonimna putovanja su sintetička, generirana prema stvarnim zonama Timișoare i stvarnim STPT/VeloTM/OSM koridorima.";
    public int GridCellSizeMeters { get; set; } = 500;
    public List<Services.BikeCorridorDto> BikeCorridors { get; set; } = new();
    public List<GapCellDto> Cells { get; set; } = new();
}

/// <summary>
/// Top zona za ulaganje u novu biciklističku stazu ili liniju javnog prijevoza.
/// </summary>
public class PriorityZoneDto
{
    public int Rank { get; set; }
    public string CellId { get; set; } = string.Empty;
    public string ZoneName { get; set; } = string.Empty;
    public GeoPoint Center { get; set; } = new();
    public double GapScore { get; set; }
    public int TotalTrips { get; set; }
    public double CarSharePercent { get; set; }
    public double DistanceToBikeLaneMeters { get; set; }
    public double DistanceToTransitStopMeters { get; set; }
    public string Reason { get; set; } = string.Empty;
    public string ProposedAction { get; set; } = string.Empty;
}

/// <summary>
/// Odgovor za GET /insights/summary (tri ključna broja za gradski dashboard: ušteđeni CO₂, broj putovanja, top 3 zone).
/// </summary>
public class InsightsSummaryResponseDto
{
    public bool IsSimulationData { get; set; } = true;
    public string SimulationDisclaimer { get; set; } =
        "Simulacija (Green Intelligence): Podaci o putovanjima su sintetički ali realistični za potrebe prikaza gradskog dashboarda.";
    public double TotalSavedCo2Kg { get; set; }
    public int TotalTripsCount { get; set; }
    public int GreenTripsCount { get; set; }
    public double GreenModalSplitPercent { get; set; }
    public int IdentifiedGapCellsCount { get; set; }
    public List<PriorityZoneDto> TopInvestmentZones { get; set; } = new();
}

/// <summary>
/// Odgovor za provjeru udaljenosti bilo koje točke u gradu do najbliže zelene infrastrukture.
/// </summary>
public class InfrastructureProximityDto
{
    public GeoPoint Location { get; set; } = new();
    public double DistanceToNearestBikeLaneMeters { get; set; }
    public string NearestBikeLaneId { get; set; } = string.Empty;
    public string NearestBikeLaneName { get; set; } = string.Empty;

    public double DistanceToNearestTransitStopMeters { get; set; }
    public string NearestTransitStopId { get; set; } = string.Empty;
    public string NearestTransitStopName { get; set; } = string.Empty;

    public double DistanceToNearestAccessibleStopMeters { get; set; }
    public string NearestAccessibleStopName { get; set; } = string.Empty;

    public double DistanceToNearestBikeStationMeters { get; set; }
    public string NearestBikeStationName { get; set; } = string.Empty;
}
