using EcoMutare.Domain;

namespace EcoMutare.Services.Routing;

/// <summary>
/// Zajednička formula (BE1 + BE2) za izračun emisije CO₂ (u gramima) i eko-bodova po ruti.
/// Baseline osobnog automobila u gradskom prometu: 170 g CO₂ / km.
/// </summary>
public static class EcoScoreCalculator
{
    public const double CarBaselineCo2PerKm = 170.0;

    public static double CalculateCo2Grams(TransportMode mode, double distanceKm)
    {
        double gramsPerKm = mode switch
        {
            TransportMode.Walk => 0.0,
            TransportMode.Bike => 0.0,
            TransportMode.Scooter => 18.0,         // električno punjenje i amortizacija baterije
            TransportMode.Combined => 32.0,        // kombinacija bicikl/pješke (0 g) + STPT električni tramvaj/trolejbus
            TransportMode.PublicTransport => 55.0, // STPT javni prijevoz po putniku
            TransportMode.Carpool => 85.0,         // dijeljenje vožnje (2+ putnika)
            TransportMode.Car => CarBaselineCo2PerKm,
            _ => 0.0
        };

        return Math.Round(Math.Max(0.1, distanceKm) * gramsPerKm, 1);
    }

    public static int CalculateEcoPoints(TransportMode mode, double optionDistanceKm, double baselineCarDistanceKm, double optionCo2Grams)
    {
        if (mode == TransportMode.Car)
        {
            return 0;
        }

        double refKm = Math.Max(optionDistanceKm, baselineCarDistanceKm);
        double carBaselineGrams = refKm * CarBaselineCo2PerKm;
        double savedKg = Math.Max(0.0, (carBaselineGrams - optionCo2Grams) / 1000.0);

        (double factor, int baseBonus) = mode switch
        {
            TransportMode.Walk => (1.40, 45),
            TransportMode.Bike => (1.30, 40),
            TransportMode.Combined => (1.15, 32),
            TransportMode.Scooter => (1.05, 25),
            TransportMode.PublicTransport => (0.95, 22),
            TransportMode.Carpool => (0.65, 12),
            _ => (1.0, 10)
        };

        int pts = (int)Math.Round(savedKg * 180.0 * factor) + baseBonus;
        return Math.Clamp(pts, 5, 250);
    }
}
