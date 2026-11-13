using System.ComponentModel;
using System.ComponentModel.DataAnnotations;
using EcoMutare.Domain;

namespace EcoMutare.Dtos;

public class GeoPoint
{
    [Range(-90, 90)]
    [DefaultValue(45.7537)]
    public double Lat { get; set; } = 45.7537;

    [Range(-180, 180)]
    [DefaultValue(21.2257)]
    public double Lng { get; set; } = 21.2257;
}

public class UserProfileDto
{
    [DefaultValue(AgeCategory.Adult)]
    public AgeCategory AgeCategory { get; set; } = AgeCategory.Adult;

    [DefaultValue(false)]
    public bool HasDisability { get; set; }

    [DefaultValue(false)]
    public bool OwnsBike { get; set; }

    [DefaultValue(false)]
    public bool OwnsScooter { get; set; }

    [DefaultValue(false)]
    public bool OwnsCar { get; set; }
}

public class RoutePlanRequest
{
    [Required]
    public GeoPoint Origin { get; set; } = new() { Lat = 45.7537, Lng = 21.2257 };

    [Required]
    public GeoPoint Destination { get; set; } = new() { Lat = 45.7474, Lng = 21.2263 };

    // Ako nije zadano, koristi se trenutno vrijeme.
    public DateTimeOffset? DepartureTime { get; set; }

    [Required]
    public UserProfileDto Profile { get; set; } = new();

    // Opcionalno: ako je null ili prazno, planer razmatra sve modove.
    [DefaultValue(null)]
    public List<TransportMode>? PreferredModes { get; set; }
}
