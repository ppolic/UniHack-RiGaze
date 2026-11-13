namespace EcoMutare.Integrations.Gemini;

public class GeminiOptions
{
    public const string SectionName = "Gemini";

    public string BaseUrl { get; set; } = "https://generativelanguage.googleapis.com";

    // Dolazi iz User Secrets (lokalno) ili varijable okruženja Gemini__ApiKey (server). Nikad u Git.
    public string ApiKey { get; set; } = string.Empty;

    public string Model { get; set; } = "gemini-2.5-flash";

    public int TimeoutSeconds { get; set; } = 15;
}
