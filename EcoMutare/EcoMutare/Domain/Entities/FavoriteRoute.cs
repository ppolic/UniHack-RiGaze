using System.ComponentModel.DataAnnotations;

namespace EcoMutare.Domain.Entities;

/// <summary>
/// Spremljena omiljena (svakodnevna) ruta korisnika u Timișoari.
/// Služi za 1-click planiranje s alarmima za blokade u stvarnom vremenu i kao ulazni signal stvarne potražnje
/// za Green Intelligence (gdje građani svakodnevno putuju, a nedostaje biciklistička staza).
/// </summary>
public class FavoriteRoute
{
    public int Id { get; set; }

    public int? UserId { get; set; }
    public User? User { get; set; }

    [MaxLength(120)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(120)]
    public string OriginName { get; set; } = string.Empty;
    public double OriginLat { get; set; }
    public double OriginLng { get; set; }

    [MaxLength(120)]
    public string DestinationName { get; set; } = string.Empty;
    public double DestinationLat { get; set; }
    public double DestinationLng { get; set; }

    public EcoMutare.Domain.TransportMode PreferredMode { get; set; } = EcoMutare.Domain.TransportMode.Bike;

    /// <summary>Koliko puta tjedno korisnik prolazi ovom rutom (npr. 5 za posao/fakultet).</summary>
    public int WeeklyFrequency { get; set; } = 5;

    /// <summary>
    /// Korisnička oznaka: "Na ovoj mojoj omiljenoj ruti fali sigurna biciklistička staza!"
    /// Izravno podiže prioritet koridora u GreenIntelligenceService.
    /// </summary>
    public bool MissingBikeLaneOnRoute { get; set; }

    /// <summary>True ako ovu rutu koristi osoba s invaliditetom (zahtijeva step-free pristup bez barijera).</summary>
    public bool RequiresStepFreeAccess { get; set; }

    [MaxLength(300)]
    public string Notes { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
