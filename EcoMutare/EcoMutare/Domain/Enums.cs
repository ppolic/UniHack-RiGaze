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
    RoadHazard,
    Estimate
}

// Dobna kategorija (bez prave verifikacije dobi, izvodi se iz datuma rođenja pri registraciji)
public enum AgeCategory
{
    Under14,
    From14To15,
    Adult
}

// Kategorija građanske prijave na terenu u stvarnom vremenu u Timișoari
public enum CommunityReportCategory
{
    RoadBlockade,
    BlockedBikeLane,
    InaccessibleArea,
    MissingBikeLane,
    TransitDisruption
}
