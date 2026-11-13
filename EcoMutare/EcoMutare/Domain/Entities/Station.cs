using System.ComponentModel.DataAnnotations;

namespace EcoMutare.Domain.Entities;

public class Station
{
    public int Id { get; set; }
    [MaxLength(150)] public string Name { get; set; } = string.Empty;
    public StationType Type { get; set; }
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public int Capacity { get; set; }
    public int AvailableUnits { get; set; }
    public bool IsActive { get; set; } = true;
}