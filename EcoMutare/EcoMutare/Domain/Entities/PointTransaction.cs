using System.ComponentModel.DataAnnotations;

namespace EcoMutare.Domain.Entities;

public class PointTransaction
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public User User { get; set; } = null!;

    public int Points { get; set; } // pozitivno = zarada, negativno = potrošnja
    public PointTransactionType Type { get; set; }
    [MaxLength(255)] public string? Description { get; set; }

    public int? TripHistoryId { get; set; }
    public TripHistory? TripHistory { get; set; }
    public int? RewardId { get; set; }
    public Reward? Reward { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}