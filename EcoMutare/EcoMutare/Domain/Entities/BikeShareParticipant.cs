using System.ComponentModel.DataAnnotations;

namespace EcoMutare.Domain.Entities;

///Prijava korisnika na BikeShare vožnju. Jedan redak po (vožnja, korisnik); odjava samo gasi IsActive.
public class BikeShareParticipant
{
    public int Id { get; set; }

    public int BikeShareRideId { get; set; }
    public BikeShareRide BikeShareRide { get; set; } = null!;

    public int UserId { get; set; }
    public User User { get; set; } = null!;

    [MaxLength(100)]
    public string DisplayName { get; set; } = string.Empty;

    public bool IsActive { get; set; } = true;
    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;

    public double Co2SavedGrams { get; set; }
    public int PointsEarned { get; set; }
}
