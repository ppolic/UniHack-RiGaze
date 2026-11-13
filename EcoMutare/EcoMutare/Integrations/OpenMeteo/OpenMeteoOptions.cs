using System.ComponentModel.DataAnnotations;

namespace EcoMutare.Integrations.OpenMeteo;

public class OpenMeteoOptions
{
    public const string SectionName = "OpenMeteo";

    [Required]
    public string BaseUrl { get; set; } = "https://api.open-meteo.com";

    public int TimeoutSeconds { get; set; } = 8;
}
