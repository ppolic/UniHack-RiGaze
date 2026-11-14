using System.ComponentModel.DataAnnotations;

namespace EcoMutare.Domain.Entities;

/// <summary>Prijava korisnika na WalkBuddy šetnju. Jedan redak po (šetnja, korisnik); odjava samo gasi IsActive.</summary>
public class WalkBuddyParticipant
{
    public int Id { get; set; }

    public int WalkBuddyWalkId { get; set; }
    public WalkBuddyWalk WalkBuddyWalk { get; set; } = null!;

    public int UserId { get; set; }
    public User User { get; set; } = null!;

    [MaxLength(100)]
    public string DisplayName { get; set; } = string.Empty;

    public bool IsActive { get; set; } = true;
    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;

    public double Co2SavedGrams { get; set; }
    public int PointsEarned { get; set; }
}
