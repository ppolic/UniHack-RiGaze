using System.ComponentModel.DataAnnotations;

namespace EcoMutare.Domain.Entities;

public class TripHistory
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public User User { get; set; } = null!;

    public TransportMode Mode { get; set; }
    [MaxLength(150)] public string? OriginName { get; set; }
    [MaxLength(150)] public string? DestinationName { get; set; }
    public double OriginLatitude { get; set; }
    public double OriginLongitude { get; set; }
    public double DestinationLatitude { get; set; }
    public double DestinationLongitude { get; set; }
    public double DistanceKm { get; set; }
    public int DurationMinutes { get; set; }
    public double Co2SavedGrams { get; set; }
    public int PointsEarned { get; set; }
    public DateTime StartedAt { get; set; }
    public DateTime? EndedAt { get; set; }
}