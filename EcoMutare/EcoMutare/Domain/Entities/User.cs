using System.ComponentModel.DataAnnotations;

namespace EcoMutare.Domain.Entities;

public class User
{
    public int Id { get; set; }
    [MaxLength(255)] public string Email { get; set; } = string.Empty;
    [MaxLength(255)] public string PasswordHash { get; set; } = string.Empty; // za kasnije (auth)
    [MaxLength(100)] public string DisplayName { get; set; } = string.Empty;
    public int PointsBalance { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public List<TripHistory> TripHistories { get; set; } = new();
    public List<PointTransaction> PointTransactions { get; set; } = new();
}