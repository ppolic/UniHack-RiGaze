namespace EcoMutare.Domain.Entities;

public class StopTime
{
    public long Id { get; set; }
    public int TransitTripId { get; set; }
    public TransitTrip TransitTrip { get; set; } = null!;
    public int StopId { get; set; }
    public Stop Stop { get; set; } = null!;
    public int StopSequence { get; set; }
    public TimeSpan ArrivalTime { get; set; }   // GTFS dopušta > 24:00:00
    public TimeSpan DepartureTime { get; set; }
}