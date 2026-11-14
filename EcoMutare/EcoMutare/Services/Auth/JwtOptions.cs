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

public class Auth0Options
{
    public const string SectionName = "Auth0";
    /// <summary>Auth0 tenant domena bez https:// (npr. "dev-xyz123.eu.auth0.com").</summary>
    public string Domain { get; set; } = string.Empty;
    /// <summary>API Identifier u Auth0 Dashboardu (npr. "https://api.begreen.tm.ro").</summary>
    public string Audience { get; set; } = "https://api.begreen.tm.ro";
    /// <summary>Opcionalni SPA ClientId za frontend (@auth0/auth0-react).</summary>
    public string ClientId { get; set; } = string.Empty;
}
