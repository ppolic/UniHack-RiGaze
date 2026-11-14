using EcoMutare.Domain.Entities;

namespace EcoMutare.Services.Trips;

/// <summary>
/// Jednostavna procjena ušteđenog CO₂ i bodova.
///
/// Formula:  uštedaGrama = max(0, 120 − faktor(način)) × udaljenostKm
///   120 g/km = referentni putnički automobil (jedna osoba).
///   Faktori (g CO₂e po putniku po km): Walk 0, Bike 0, Scooter 20, Tram 30, Trolleybus 30,
///   Bus 70, Carpool 60, Car 120. Vrijednosti su okvirne (procjena, ne mjerenje).
/// Bodovi:   floor(uštedaGrama / 10), najviše 200 po vožnji. Car donosi 0 bodova.
/// </summary>
public static class CarbonCalculator
{
    public const double CarBaselineGramsPerKm = 120;
    public const int GramsPerPoint = 10;
    public const int MaxPointsPerTrip = 200;

    public static double FactorGramsPerKm(TransportMode mode) => mode switch
    {
        TransportMode.Walk => 0,
        TransportMode.Bike => 0,
        TransportMode.Scooter => 20,
        TransportMode.Tram => 30,
        TransportMode.Trolleybus => 30,
        TransportMode.Bus => 70,
        TransportMode.Carpool => 60,
        TransportMode.Car => 120,
        _ => 120,
    };

    public static double SavedGrams(TransportMode mode, double distanceKm) =>
        Math.Round(Math.Max(0, CarBaselineGramsPerKm - FactorGramsPerKm(mode)) * distanceKm, 1);

    public static int Points(double savedGrams) =>
        Math.Min(MaxPointsPerTrip, (int)Math.Floor(savedGrams / GramsPerPoint));
}
