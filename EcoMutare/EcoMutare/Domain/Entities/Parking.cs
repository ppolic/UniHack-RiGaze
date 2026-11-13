using System.ComponentModel.DataAnnotations;

namespace EcoMutare.Domain.Entities;

public class Parking
{
    public int Id { get; set; }
    [MaxLength(150)] public string Name { get; set; } = string.Empty;
    [MaxLength(255)] public string? Address { get; set; }
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public int TotalSpaces { get; set; }
    public int FreeSpaces { get; set; }
    public decimal HourlyPrice { get; set; }
    public bool IsParkAndRide { get; set; }
}