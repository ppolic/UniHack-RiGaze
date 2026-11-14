using EcoMutare.Domain.Entities;

namespace EcoMutare.Dtos;

public class StationDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public StationType Type { get; set; }
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public int Capacity { get; set; }
    public int AvailableUnits { get; set; }
    public bool IsActive { get; set; }
    /// <summary>Udaljenost u metrima; samo ako su poslani lat i lng.</summary>
    public double? DistanceM { get; set; }
}

public class ParkingDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Address { get; set; }
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public int TotalSpaces { get; set; }
    public int FreeSpaces { get; set; }
    public decimal HourlyPrice { get; set; }
    public bool IsParkAndRide { get; set; }
    public double? DistanceM { get; set; }
}

public class RewardDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int PointsCost { get; set; }
    public bool IsActive { get; set; }
}

public class TransitRouteDto
{
    public int Id { get; set; }
    public string GtfsRouteId { get; set; } = string.Empty;
    public string ShortName { get; set; } = string.Empty;
    public string? LongName { get; set; }
    public int RouteType { get; set; }
    public string Mode { get; set; } = "Other";
    public string? Color { get; set; }
}

public class StopDto
{
    public int Id { get; set; }
    public string GtfsStopId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public double? DistanceM { get; set; }
}

public class TransitTripDto
{
    public int Id { get; set; }
    public string GtfsTripId { get; set; } = string.Empty;
    public int RouteId { get; set; }
    public string RouteShortName { get; set; } = string.Empty;
    public string ServiceId { get; set; } = string.Empty;
    public string? Headsign { get; set; }
    public int DirectionId { get; set; }
}

public class StopTimeDto
{
    public long Id { get; set; }
    public int TripId { get; set; }
    public int RouteId { get; set; }
    public string RouteShortName { get; set; } = string.Empty;
    public string? Headsign { get; set; }
    public int StopId { get; set; }
    public string StopName { get; set; } = string.Empty;
    public int StopSequence { get; set; }
    /// HH:mm:ss; sati mogu biti &gt; 24 (GTFS konvencija za vožnje poslije ponoći).
    public string ArrivalTime { get; set; } = string.Empty;
    public string DepartureTime { get; set; } = string.Empty;
}
