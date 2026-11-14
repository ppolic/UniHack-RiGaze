namespace EcoMutare.Domain;

public enum TransportMode
{
    Walk,
    Bike,
    Scooter,
    PublicTransport,
    Car,
    Carpool,
    Combined
}

public enum WeatherCondition
{
    Clear,
    Rain,
    Snow,
    Cold,
    Windy
}

public enum WarningType
{
    Rain,
    Snow,
    Cold,
    Windy,
    AirQuality,
    Slope,
    Helmet,
    NoBikeLane,
    NotAccessible,
<<<<<<< HEAD
    Estimate,
    RoadBlockade,
    InaccessibleArea,
    BlockedBikeLane,
    CrowdsourcedMissingBikeLane
}

/// <summary>
/// Kategorija Waze-style građanske prijave u Timișoari.
/// </summary>
public enum CommunityReportCategory
{
    /// <summary>Privremena blokada ceste, radovi ili zatvoren prolaz.</summary>
    RoadBlockade,

    /// <summary>Nedostupno područje za osobe u invalidskim kolicima ili s kolicima za bebe (visoki rubnjak, raskopan nogostup, neispravna rampa).</summary>
    InaccessibleArea,

    /// <summary>Prepreka, radovi ili parkirana vozila na postojećoj biciklističkoj stazi.</summary>
    BlockedBikeLane,

    /// <summary>Građanska prijava: "Ovdje često prolazim biciklom/romobilom, a nema biciklističke staze i prijeko je potrebna!"</summary>
    MissingBikeLane,

    /// <summary>Potvrđeni zastoj ili preusmjeravanje STPT javnog prijevoza na terenu.</summary>
    TransitDisruption
=======
    RoadHazard,
    Estimate
>>>>>>> BE2
}

// Dobna kategorija (bez prave verifikacije dobi, izvodi se iz datuma rođenja pri registraciji)
public enum AgeCategory
{
    Under14,
    From14To15,
    Adult
}

// Kategorija Waze-style građanske prijave na terenu u Timișoari
public enum CommunityReportCategory
{
    RoadBlockade,
    BlockedBikeLane,
    InaccessibleArea,
    MissingBikeLane,
    TransitDisruption
}
