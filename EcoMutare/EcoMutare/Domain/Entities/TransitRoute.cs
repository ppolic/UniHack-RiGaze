using System.ComponentModel.DataAnnotations;

namespace EcoMutare.Domain.Entities;

public class TransitRoute
{
    public int Id { get; set; }
    [MaxLength(64)] public string GtfsRouteId { get; set; } = string.Empty;
    [MaxLength(32)] public string ShortName { get; set; } = string.Empty;
    [MaxLength(200)] public string? LongName { get; set; }
    public int RouteType { get; set; } // GTFS: 0 tram, 3 bus, 11 trolejbus
    [MaxLength(6)] public string? Color { get; set; }

    public List<TransitTrip> Trips { get; set; } = new();
}