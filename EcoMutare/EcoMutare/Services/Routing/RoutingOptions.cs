namespace EcoMutare.Services.Routing;

public class RoutingOptions
{
    public const string SectionName = "Routing";

    // Ako je true, POST /routes/plan vraća fiksni MockRoutePlanner (sigurnosni prekidač za demo).
    public bool UseMock { get; set; } = false;

    // Zakonsko ograničenje za e-romobile je < 25 km/h; koristimo realnu prosječnu brzinu od 19 km/h.
    public double ScooterAverageSpeedKmh { get; set; } = 19.0;
    public double ScooterMaxLegalSpeedKmh { get; set; } = 25.0;

    // Cijene u RON (prema tarifama u Timișoari: STPT, VeloTM / mikro-mobilnost, gorivo)
    public decimal BikeUnlockRon { get; set; } = 1.50m;
    public decimal BikePerMinuteRon { get; set; } = 0.20m;

    public decimal ScooterUnlockRon { get; set; } = 2.50m;
    public decimal ScooterPerMinuteRon { get; set; } = 0.65m;

    public decimal StptTicketRon { get; set; } = 4.00m;

    public decimal FuelPriceRonPerLiter { get; set; } = 7.30m;
    public double CarConsumptionLitersPer100Km { get; set; } = 7.5;
}
