using System.ComponentModel.DataAnnotations;
using EcoMutare.Domain;

namespace EcoMutare.Dtos;

public class GeoPoint
{
    [Range(-90, 90)]
    public double Lat { get; set; }

    [Range(-180, 180)]
    public double Lng { get; set; }
}

public class UserProfileDto
{
    public AgeCategory AgeCategory { get; set; } = AgeCategory.Adult;
    public bool HasDisability { get; set; }
    public bool OwnsBike { get; set; }
    public bool OwnsScooter { get; set; }
    public bool OwnsCar { get; set; }
}

public class RoutePlanRequest
{
    [Required]
    public GeoPoint Origin { get; set; } = new();

    [Required]
    public GeoPoint Destination { get; set; } = new();

    // Ako nije zadano, koristi se trenutno vrijeme.
    public DateTimeOffset? DepartureTime { get; set; }

    [Required]
    public UserProfileDto Profile { get; set; } = new();

    // Opcionalno: ako je prazno, planer razmatra sve modove.
    public List<TransportMode>? PreferredModes { get; set; }
}
