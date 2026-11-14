using System.ComponentModel;
using EcoMutare.Domain;

namespace EcoMutare.Dtos;

/// <summary>
/// Prikaz jedne Waze-style građanske prijave (blokada ceste, nepristupačno područje, blokirana staza ili nedostajuća biciklistička staza)
/// ili prijave povučene uživo sa službenog portala Grada Temišvara (sesizari.primariatm.ro).
/// </summary>
public class CommunityReportDto
{
    public int Id { get; set; }
    public CommunityReportCategory Category { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string StreetOrZone { get; set; } = string.Empty;
    public GeoPoint Location { get; set; } = new();
    public List<TransportMode> AffectedModes { get; set; } = new();
    public bool AffectsWheelchair { get; set; }
    public int ConfirmationsCount { get; set; }
    public int ResolvedVotesCount { get; set; }
    public bool IsCommunityVerified => ConfirmationsCount >= 3;
    public bool IsActive { get; set; }
    public string Source { get; set; } = string.Empty;
    public string? ExternalSesizariId { get; set; }
    public string OfficialActionUrl { get; set; } = string.Empty;
    public string OfficialChannelLabel { get; set; } = string.Empty;
    public double? DistanceMetersFromQuery { get; set; }
    public DateTime CreatedAt { get; set; }
}

/// <summary>
/// Zahtjev za kreiranje nove Waze-style prijave u Timișoari.
/// </summary>
public class CreateCommunityReportRequestDto
{
    [DefaultValue(CommunityReportCategory.RoadBlockade)]
    public CommunityReportCategory Category { get; set; } = CommunityReportCategory.RoadBlockade;

    [DefaultValue("Radovi i zatvoren prolaz na Bulevardul Vasile Pârvan")]
    public string Title { get; set; } = string.Empty;

    [DefaultValue("Desna traka i biciklistički prijelaz kod podvožnjaka Michelangelo su ograđeni zbog radova.")]
    public string Description { get; set; } = string.Empty;

    [DefaultValue("Bulevardul Vasile Pârvan / Pasajul Michelangelo")]
    public string StreetOrZone { get; set; } = string.Empty;

    [DefaultValue(45.7495)]
    public double Latitude { get; set; } = 45.7495;

    [DefaultValue(21.2312)]
    public double Longitude { get; set; } = 21.2312;

    public List<TransportMode>? AffectedModes { get; set; }

    [DefaultValue(false)]
    public bool AffectsWheelchair { get; set; } = false;

    public int? UserId { get; set; }
}

/// <summary>
/// Specijalizirani zahtjev kada građanin prijavljuje:
/// "Ovdje često prolazim (biciklom/romobilom/pješke), a nema biciklističke staze i prijeko je potrebna!"
/// </summary>
public class MissingBikeLaneRequestDto
{
    [DefaultValue("Calea Șagului (prema Dâmboviți i centru)")]
    public string StreetOrCorridorName { get; set; } = "Calea Șagului";

    [DefaultValue("Svako jutro ovdje prolazi velik broj studenata i radnika biciklom i romobilom uz gust kamionski i automobilski promet, a nema odvojene biciklističke staze.")]
    public string Reason { get; set; } = string.Empty;

    [DefaultValue(45.7345)]
    public double Latitude { get; set; } = 45.7345;

    [DefaultValue(21.2145)]
    public double Longitude { get; set; } = 21.2145;

    /// <summary>Opcionalno odredište ako korisnik označava cijeli potez od A do B.</summary>
    public GeoPoint? CorridorEnd { get; set; }

    [DefaultValue(5)]
    public int WeeklyPassesCount { get; set; } = 5;

    public int? UserId { get; set; }
}

/// <summary>
/// Odgovor nakon prijave ili Waze potvrde ("Još je tamo 👍" / "Riješeno 👎").
/// </summary>
public class CommunityReportActionResponseDto
{
    public CommunityReportDto Report { get; set; } = new();
    public int AwardedEcoPoints { get; set; }
    public string Message { get; set; } = string.Empty;
    public string OfficialCityIntegrationNote { get; set; } = string.Empty;
}

/// <summary>
/// Prikaz omiljene (svakodnevne) rute korisnika uz trenutni Waze status blokada na toj ruti.
/// </summary>
public class FavoriteRouteDto
{
    public int Id { get; set; }
    public int? UserId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string OriginName { get; set; } = string.Empty;
    public GeoPoint Origin { get; set; } = new();
    public string DestinationName { get; set; } = string.Empty;
    public GeoPoint Destination { get; set; } = new();
    public TransportMode PreferredMode { get; set; }
    public int WeeklyFrequency { get; set; }
    public bool MissingBikeLaneOnRoute { get; set; }
    public bool RequiresStepFreeAccess { get; set; }
    public string Notes { get; set; } = string.Empty;

    // Live Waze Intelligence status na omiljenoj ruti:
    public bool HasActiveBlockadeOrHazard { get; set; }
    public int ActiveHazardsOnRouteCount { get; set; }
    public List<CommunityReportDto> ActiveHazardsOnRoute { get; set; } = new();
    public string LiveCommuteStatusMessage { get; set; } = string.Empty;
    public double DistanceToNearestBikeLaneMeters { get; set; }
    public DateTime CreatedAt { get; set; }
}

/// <summary>
/// Zahtjev za dodavanje nove omiljene rute korisnika.
/// </summary>
public class CreateFavoriteRouteRequestDto
{
    public int? UserId { get; set; }

    [DefaultValue("Dom (Calea Șagului) → Fakultet (UPT Vasile Pârvan)")]
    public string Name { get; set; } = "Dom (Calea Șagului) → Fakultet (UPT Vasile Pârvan)";

    [DefaultValue("Calea Șagului / Dâmbovița")]
    public string OriginName { get; set; } = "Calea Șagului / Dâmbovița";

    [DefaultValue(45.7315)]
    public double OriginLat { get; set; } = 45.7315;

    [DefaultValue(21.2125)]
    public double OriginLng { get; set; } = 21.2125;

    [DefaultValue("Universitatea Politehnica Timișoara (Bd. Vasile Pârvan)")]
    public string DestinationName { get; set; } = "Universitatea Politehnica Timișoara (Bd. Vasile Pârvan)";

    [DefaultValue(45.7474)]
    public double DestinationLat { get; set; } = 45.7474;

    [DefaultValue(21.2263)]
    public double DestinationLng { get; set; } = 21.2263;

    [DefaultValue(TransportMode.Bike)]
    public TransportMode PreferredMode { get; set; } = TransportMode.Bike;

    [DefaultValue(5)]
    public int WeeklyFrequency { get; set; } = 5;

    /// <summary>
    /// Ako korisnik označi true, sustav automatski bilježi i građansku prijavu da na ovom čvorištu/pravcu
    /// nedostaje biciklistička staza te hrani GreenIntelligenceService za Grad Temišvar!
    /// </summary>
    [DefaultValue(true)]
    public bool MissingBikeLaneOnRoute { get; set; } = true;

    [DefaultValue(false)]
    public bool RequiresStepFreeAccess { get; set; } = false;

    [DefaultValue("Svakodnevni odlazak na predavanja u 08:00; na južnom dijelu fali biciklistička staza.")]
    public string Notes { get; set; } = string.Empty;
}
