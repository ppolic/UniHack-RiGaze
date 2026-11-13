using System.ComponentModel.DataAnnotations;

namespace EcoMutare.Integrations.OpenRouteService;

public class OpenRouteServiceOptions
{
    public const string SectionName = "OpenRouteService";

    [Required]
    public string BaseUrl { get; set; } = "https://api.openrouteservice.org";

    // Dolazi iz User Secrets (lokalno) ili varijable okruženja (server). Nikad u Git.
    public string ApiKey { get; set; } = string.Empty;

    public int TimeoutSeconds { get; set; } = 8;
}
