using System.ComponentModel.DataAnnotations;
using EcoMutare.Domain.Entities;

namespace EcoMutare.Dtos;

public class AuthRegisterRequest
{
    [Required, EmailAddress, MaxLength(255)] public string Email { get; set; } = string.Empty;
    [Required, MinLength(8), MaxLength(100)] public string Password { get; set; } = string.Empty;
    [Required, MaxLength(100)] public string DisplayName { get; set; } = string.Empty;
}

public class AuthLoginRequest
{
    [Required] public string Email { get; set; } = string.Empty;
    [Required] public string Password { get; set; } = string.Empty;
}

public class AuthResponse
{
    public string Token { get; set; } = string.Empty;
    public DateTime ExpiresAtUtc { get; set; }
    public int UserId { get; set; }
    public string Email { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
}

public class CreateTripRequest
{
    [Required] public TransportMode? Mode { get; set; }
    [MaxLength(150)] public string? OriginName { get; set; }
    [MaxLength(150)] public string? DestinationName { get; set; }
    [Range(-90, 90)] public double OriginLatitude { get; set; }
    [Range(-180, 180)] public double OriginLongitude { get; set; }
    [Range(-90, 90)] public double DestinationLatitude { get; set; }
    [Range(-180, 180)] public double DestinationLongitude { get; set; }
    [Range(0.01, 500)] public double DistanceKm { get; set; }
    [Range(1, 1440)] public int DurationMinutes { get; set; }
    [Required] public DateTime? StartedAt { get; set; }
    public DateTime? EndedAt { get; set; }
}

public class TripResponse
{
    public int Id { get; set; }
    public TransportMode Mode { get; set; }
    public double DistanceKm { get; set; }
    public int DurationMinutes { get; set; }
    public double Co2SavedGrams { get; set; }
    public int PointsEarned { get; set; }
    public int NewBalance { get; set; }
    public DateTime StartedAt { get; set; }
}

public class PointTransactionDto
{
    public int Id { get; set; }
    public int Points { get; set; }
    public PointTransactionType Type { get; set; }
    public string? Description { get; set; }
    public int? TripHistoryId { get; set; }
    public int? RewardId { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class PointsResponse
{
    /// Zbroj svih PointTransactions (izvor istine).
    public int Balance { get; set; }
    public int TotalCount { get; set; }
    public List<PointTransactionDto> Transactions { get; set; } = new();
}

public class RedeemResponse
{
    public int RewardId { get; set; }
    public string RewardName { get; set; } = string.Empty;
    public int PointsSpent { get; set; }
    public int NewBalance { get; set; }
    public int TransactionId { get; set; }
}
