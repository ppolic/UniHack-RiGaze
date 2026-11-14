namespace EcoMutare.Domain.Entities;

public class GapCell
{
    public int Id { get; set; }
    public int GridX { get; set; }
    public int GridY { get; set; }
    public double CenterLatitude { get; set; }
    public double CenterLongitude { get; set; }
    public int CellSizeMeters { get; set; }
    public int StopCount { get; set; }
    public int StationCount { get; set; }
    public int ParkingCount { get; set; }
    public double GapScore { get; set; }
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}