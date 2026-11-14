using System.ComponentModel.DataAnnotations;

namespace EcoMutare.Domain.Entities;

/// <summary>
/// Oglas za dijeljenje vožnje (Carpool) u Timișoari (sat 24–36).
/// Cijena po km i po sjedalu je procjena udjela u gorivu (bez naplate / transakcija).
/// </summary>
public class CarpoolRide
{
    public int Id { get; set; }

    public int? DriverId { get; set; }
    public User? Driver { get; set; }

    [MaxLength(100)]
    public string DriverName { get; set; } = string.Empty;

    [MaxLength(150)]
    public string OriginName { get; set; } = string.Empty;
    public double OriginLatitude { get; set; }
    public double OriginLongitude { get; set; }

    [MaxLength(150)]
    public string DestinationName { get; set; } = string.Empty;
    public double DestinationLatitude { get; set; }
    public double DestinationLongitude { get; set; }

    public DateTime DepartureTime { get; set; }

    public int TotalSeats { get; set; } = 3;
    public int AvailableSeats { get; set; } = 3;

    public double DistanceKm { get; set; }

    /// <summary>Procijenjeni trošak goriva po kilometru u RON (informativni prikaz bez naplate).</summary>
    public decimal EstimatedFuelCostPerKmRon { get; set; }

    /// <summary>Preporučeni udio troška goriva po sjedalu u RON (informativno, bez stvarnog plaćanja).</summary>
    public decimal RecommendedPricePerSeatRon { get; set; }

    /// <summary>True ako vozač može primiti sklopiva invalidska kolica / osobu s invaliditetom.</summary>
    public bool WheelchairFriendly { get; set; }

    [MaxLength(300)]
    public string? Notes { get; set; }

    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public List<CarpoolBooking> Bookings { get; set; } = new();
}
