using System.ComponentModel.DataAnnotations;

namespace EcoMutare.Domain.Entities;

/// <summary>
/// Rezervacija sjedala u Carpool vožnji (sat 24–36).
/// </summary>
public class CarpoolBooking
{
    public int Id { get; set; }

    public int CarpoolRideId { get; set; }
    public CarpoolRide CarpoolRide { get; set; } = null!;

    public int? PassengerId { get; set; }
    public User? Passenger { get; set; }

    [MaxLength(100)]
    public string PassengerName { get; set; } = string.Empty;

    public int SeatsBooked { get; set; } = 1;
    public double Co2SavedGrams { get; set; }
    public int PointsEarned { get; set; }
    public DateTime BookedAt { get; set; } = DateTime.UtcNow;
}
