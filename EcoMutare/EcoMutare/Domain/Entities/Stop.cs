using System.ComponentModel.DataAnnotations;

namespace EcoMutare.Domain.Entities;

public class Stop
{
    public int Id { get; set; }
    [MaxLength(64)] public string GtfsStopId { get; set; } = string.Empty;
    [MaxLength(150)] public string Name { get; set; } = string.Empty;
    public double Latitude { get; set; }
    public double Longitude { get; set; }

    public List<StopTime> StopTimes { get; set; } = new();
}