using System.ComponentModel.DataAnnotations;

namespace EcoMutare.Domain.Entities;

public class TransitTrip
{
    public int Id { get; set; }
    [MaxLength(64)] public string GtfsTripId { get; set; } = string.Empty;
    public int TransitRouteId { get; set; }
    public TransitRoute TransitRoute { get; set; } = null!;
    [MaxLength(64)] public string ServiceId { get; set; } = string.Empty;
    [MaxLength(150)] public string? Headsign { get; set; }
    public int DirectionId { get; set; }

    public List<StopTime> StopTimes { get; set; } = new();
}