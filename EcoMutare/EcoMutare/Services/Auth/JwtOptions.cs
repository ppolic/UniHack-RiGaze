namespace EcoMutare.Services.Auth;

public class JwtOptions
{
    public const string SectionName = "Jwt";
    public string Issuer { get; set; } = "EcoMutare";
    public string Audience { get; set; } = "EcoMutare.App";
    /// <summary>Tajni ključ (min. 32 znaka). Postavi preko user-secrets / env varijable Jwt__Key.</summary>
    public string Key { get; set; } = string.Empty;
    public int ExpiresMinutes { get; set; } = 1440;
}
