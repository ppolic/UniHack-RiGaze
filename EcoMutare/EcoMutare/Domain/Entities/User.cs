using System.ComponentModel.DataAnnotations;

namespace EcoMutare.Domain.Entities;

public class User
{
    public int Id { get; set; }
    [MaxLength(255)] public string Email { get; set; } = string.Empty;
    [MaxLength(255)] public string PasswordHash { get; set; } = string.Empty;
    [MaxLength(100)] public string DisplayName { get; set; } = string.Empty;
    public int PointsBalance { get; set; }

    // Profilne postavke za pravila rutiranja (dobna kategorija iz datuma rođenja, invaliditet, vlastita vozila)
    public DateTime? BirthDate { get; set; }
    public EcoMutare.Domain.AgeCategory AgeCategory { get; set; } = EcoMutare.Domain.AgeCategory.Adult;
    public bool HasDisability { get; set; }
    public bool OwnsBike { get; set; }
    public bool OwnsScooter { get; set; }
    public bool OwnsCar { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public List<TripHistory> TripHistories { get; set; } = new();
    public List<PointTransaction> PointTransactions { get; set; } = new();
}
