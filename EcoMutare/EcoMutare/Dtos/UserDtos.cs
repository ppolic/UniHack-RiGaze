using System.ComponentModel;
using System.ComponentModel.DataAnnotations;
using EcoMutare.Domain.Entities;

namespace EcoMutare.Dtos;

public class AuthRegisterRequest
{
    [Required, EmailAddress, MaxLength(255)]
    [DefaultValue("student@upt.ro")]
    public string Email { get; set; } = string.Empty;

    [Required, MinLength(8), MaxLength(100)]
    [DefaultValue("Demo123!")]
    public string Password { get; set; } = string.Empty;

    [Required, MaxLength(100)]
    [DefaultValue("Student Politehnica")]
    public string DisplayName { get; set; } = string.Empty;

    [DefaultValue("2003-05-15")]
    public DateTime? BirthDate { get; set; }

    [DefaultValue(false)]
    public bool HasDisability { get; set; }

    [DefaultValue(true)]
    public bool OwnsBike { get; set; }

    [DefaultValue(false)]
    public bool OwnsScooter { get; set; }

    [DefaultValue(false)]
    public bool OwnsCar { get; set; }
}

public class AuthLoginRequest
{
    [Required]
    [DefaultValue("ana.student@upt.ro")]
    public string Email { get; set; } = string.Empty;

    [Required]
    [DefaultValue("Demo123!")]
    public string Password { get; set; } = string.Empty;
}

public class Auth0LoginRequest
{
    /// <summary>Opcionalni Auth0 Access Token ili ID Token (JWT) dobiven nakon prijave putem Auth0 Universal Logina.</summary>
    public string? AccessToken { get; set; }
    public string? IdToken { get; set; }

    /// <summary>Email korisnika iz Auth0 profila (npr. useAuth0().user.email).</summary>
    [DefaultValue("ana.auth0@upt.ro")]
    public string? Email { get; set; }

    /// <summary>Ime i prezime iz Auth0 profila (npr. useAuth0().user.name).</summary>
    [DefaultValue("Ana Popescu (Auth0)")]
    public string? DisplayName { get; set; }

    /// <summary>Auth0 identifikator korisnika (npr. "google-oauth2|10928374" ili "auth0|65f...").</summary>
    [DefaultValue("google-oauth2|1092837465")]
    public string? Auth0Sub { get; set; }

    /// <summary>1. Auth0 Organizations: Opcionalni naziv organizacije iz Auth0 tokena (npr. "Universitatea Politehnica Timișoara (UPT)").</summary>
    public string? OrganizationName { get; set; }

    /// <summary>2. Auth0 Passkeys (WebAuthn): True ako se korisnik prijavio biometrijom bez lozinke (FaceID / otisak prsta).</summary>
    [DefaultValue(true)]
    public bool? UsedPasskey { get; set; }

    /// <summary>3. Auth0 Zero-Knowledge Age Action: Anonimizirana dobna kategorija iz Auth0 Actiona bez slanja datuma rođenja (GDPR).</summary>
    public EcoMutare.Domain.AgeCategory? ZeroKnowledgeAgeCategory { get; set; }

    public DateTime? BirthDate { get; set; }
    public bool? HasDisability { get; set; }
    public bool? OwnsBike { get; set; }
    public bool? OwnsScooter { get; set; }
    public bool? OwnsCar { get; set; }
}

public class Auth0ConfigResponse
{
    public bool IsConfigured { get; set; }
    public string Domain { get; set; } = string.Empty;
    public string Audience { get; set; } = string.Empty;
    public string ClientId { get; set; } = string.Empty;
    public string ExchangeEndpoint { get; set; } = "/auth/auth0";
    public bool SupportsDirectAuth0BearerToken { get; set; } = true;
    public bool SupportsDemoAccountsLogin { get; set; } = true;
    public bool PasskeysWebAuthnEnabled { get; set; } = true;
    public bool OrganizationsHomeRealmDiscoveryEnabled { get; set; } = true;
    public bool ZeroKnowledgeAgeActionEnabled { get; set; } = true;
    public bool BotDetectionCrowdTrustShieldEnabled { get; set; } = true;
    public List<string> SupportedOrganizations { get; set; } = new()
    {
        "Universitatea Politehnica Timișoara (UPT) (@upt.ro / @student.upt.ro)",
        "Universitatea de Vest din Timișoara (UVT) (@uvt.ro / @e-uvt.ro)",
        "Continental Automotive Timișoara (@continental.ro / @continental.com)",
        "Nokia Campus Timișoara (@nokia.com)"
    };
}

public class AuthResponse
{
    public string Token { get; set; } = string.Empty;
    public DateTime ExpiresAtUtc { get; set; }
    public int UserId { get; set; }
    public string Email { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public int PointsBalance { get; set; }
    public DateTime? BirthDate { get; set; }
    public EcoMutare.Domain.AgeCategory AgeCategory { get; set; } = EcoMutare.Domain.AgeCategory.Adult;
    public bool HasDisability { get; set; }
    public bool OwnsBike { get; set; }
    public bool OwnsScooter { get; set; }
    public bool OwnsCar { get; set; }

    // === Inovativne Auth0 značajke (1: Organizations, 2: Passkeys, 3: Zero-Knowledge Age, 5: Crowd Trust Score) ===
    public string? VerifiedOrganization { get; set; }
    public string OrganizationBadge { get; set; } = string.Empty;
    public bool PasskeyEnabled { get; set; }
    public string AuthenticationMethod { get; set; } = string.Empty;
    public bool ZeroKnowledgeAgeVerified { get; set; }
    public string GdprPrivacyStatus { get; set; } = string.Empty;
    public bool EmailVerified { get; set; } = true;
    public int TrustScore { get; set; }
    public string TrustBadge { get; set; } = string.Empty;
    public int ReportVoteWeight { get; set; } = 1;
}

public class UpdateUserProfileRequest
{
    [MaxLength(100)]
    public string? DisplayName { get; set; }
    public DateTime? BirthDate { get; set; }
    public bool? HasDisability { get; set; }
    public bool? OwnsBike { get; set; }
    public bool? OwnsScooter { get; set; }
    public bool? OwnsCar { get; set; }
}

public class CreateTripRequest
{
    [Required]
    [DefaultValue(TransportMode.Bike)]
    public TransportMode? Mode { get; set; }

    [MaxLength(150)]
    [DefaultValue("Piața Victoriei")]
    public string? OriginName { get; set; }

    [MaxLength(150)]
    [DefaultValue("Universitatea Politehnica (UPT)")]
    public string? DestinationName { get; set; }

    [Range(-90, 90)]
    [DefaultValue(45.7537)]
    public double OriginLatitude { get; set; } = 45.7537;

    [Range(-180, 180)]
    [DefaultValue(21.2257)]
    public double OriginLongitude { get; set; } = 21.2257;

    [Range(-90, 90)]
    [DefaultValue(45.7474)]
    public double DestinationLatitude { get; set; } = 45.7474;

    [Range(-180, 180)]
    [DefaultValue(21.2263)]
    public double DestinationLongitude { get; set; } = 21.2263;

    [Range(0.01, 500)]
    [DefaultValue(2.4)]
    public double DistanceKm { get; set; } = 2.4;

    [Range(1, 1440)]
    [DefaultValue(11)]
    public int DurationMinutes { get; set; } = 11;

    [Required]
    public DateTime? StartedAt { get; set; } = DateTime.UtcNow.AddMinutes(-12);

    public DateTime? EndedAt { get; set; } = DateTime.UtcNow;
}

public class TripResponse
{
    public int Id { get; set; }
    public TransportMode Mode { get; set; }
    public string? OriginName { get; set; }
    public string? DestinationName { get; set; }
    public double OriginLatitude { get; set; }
    public double OriginLongitude { get; set; }
    public double DestinationLatitude { get; set; }
    public double DestinationLongitude { get; set; }
    public double DistanceKm { get; set; }
    public int DurationMinutes { get; set; }
    public double Co2SavedGrams { get; set; }
    public int PointsEarned { get; set; }
    public int NewBalance { get; set; }
    public DateTime StartedAt { get; set; }
    public DateTime? EndedAt { get; set; }
}

public class TripHistorySummaryResponse
{
    public int UserId { get; set; }
    public int TotalTripsCount { get; set; }
    public double TotalDistanceKm { get; set; }
    public double TotalCo2SavedKg { get; set; }
    public int CurrentPointsBalance { get; set; }
    public List<TripResponse> Trips { get; set; } = new();
}

public class PointTransactionDto
{
    public int Id { get; set; }
    public int Points { get; set; }
    public PointTransactionType Type { get; set; }
    public string? Description { get; set; }
    public int? TripHistoryId { get; set; }
    public int? RewardId { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class PointsResponse
{
    /// <summary>Zbroj svih PointTransactions (izvor istine).</summary>
    public int Balance { get; set; }
    public int TotalCount { get; set; }
    public List<PointTransactionDto> Transactions { get; set; } = new();
}

public class RedeemResponse
{
    public int RewardId { get; set; }
    public string RewardName { get; set; } = string.Empty;
    public int PointsSpent { get; set; }
    public int NewBalance { get; set; }
    public int TransactionId { get; set; }
    public string DiscountCode { get; set; } = string.Empty;
}

// === Carpool DTOs (BE2 sat 24–38) ===

public class CarpoolRideDto
{
    public int Id { get; set; }
    public int? DriverId { get; set; }
    public string DriverName { get; set; } = string.Empty;
    public string? DriverOrganization { get; set; }
    public string DriverTrustBadge { get; set; } = string.Empty;
    public string OriginName { get; set; } = string.Empty;
    public double OriginLatitude { get; set; }
    public double OriginLongitude { get; set; }
    public string DestinationName { get; set; } = string.Empty;
    public double DestinationLatitude { get; set; }
    public double DestinationLongitude { get; set; }
    public DateTime DepartureTime { get; set; }
    public int TotalSeats { get; set; }
    public int AvailableSeats { get; set; }
    public double DistanceKm { get; set; }
    public decimal EstimatedFuelCostPerKmRon { get; set; }
    public decimal RecommendedPricePerSeatRon { get; set; }
    public bool WheelchairFriendly { get; set; }
    public string? Notes { get; set; }
    public bool IsActive { get; set; }
    public double? DistanceFromSearchOriginM { get; set; }
    public double EstimatedCo2SavedPerPassengerGrams { get; set; }
    public int EstimatedEcoPointsPerPassenger { get; set; }
}

public class CreateCarpoolRideRequest
{
    [DefaultValue("Vlad Ionescu (Continental)")]
    [MaxLength(100)]
    public string? DriverName { get; set; }

    [Required, MaxLength(150)]
    [DefaultValue("Calea Șagului / Shopping City")]
    public string OriginName { get; set; } = "Calea Șagului / Shopping City";

    [Range(-90, 90)]
    [DefaultValue(45.7315)]
    public double OriginLatitude { get; set; } = 45.7315;

    [Range(-180, 180)]
    [DefaultValue(21.2125)]
    public double OriginLongitude { get; set; } = 21.2125;

    [Required, MaxLength(150)]
    [DefaultValue("Iulius Town / UBC Business Center")]
    public string DestinationName { get; set; } = "Iulius Town / UBC Business Center";

    [Range(-90, 90)]
    [DefaultValue(45.7660)]
    public double DestinationLatitude { get; set; } = 45.7660;

    [Range(-180, 180)]
    [DefaultValue(21.2288)]
    public double DestinationLongitude { get; set; } = 21.2288;

    public DateTime? DepartureTime { get; set; }

    [Range(1, 7)]
    [DefaultValue(3)]
    public int AvailableSeats { get; set; } = 3;

    [DefaultValue(false)]
    public bool WheelchairFriendly { get; set; } = false;

    [MaxLength(300)]
    [DefaultValue("Idem svako jutro prema Iulius Townu, dijelimo simboličan trošak goriva (bez naplate u aplikaciji).")]
    public string? Notes { get; set; }
}

public class JoinCarpoolRideRequest
{
    [Range(1, 4)]
    [DefaultValue(1)]
    public int Seats { get; set; } = 1;

    [MaxLength(100)]
    [DefaultValue("Ana Popescu")]
    public string? PassengerName { get; set; }
}

public class JoinCarpoolRideResponse
{
    public int BookingId { get; set; }
    public int RideId { get; set; }
    public string DriverName { get; set; } = string.Empty;
    public string RouteSummary { get; set; } = string.Empty;
    public DateTime DepartureTime { get; set; }
    public int SeatsBooked { get; set; }
    public int RemainingSeats { get; set; }
    public decimal EstimatedFuelShareRon { get; set; }
    public double Co2SavedGrams { get; set; }
    public int PointsEarned { get; set; }
    public int? NewPointsBalance { get; set; }
    public string Message { get; set; } = string.Empty;
}
