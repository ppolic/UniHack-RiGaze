namespace EcoMutare.Dtos;

public class EcoChallengeDto
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty; // "Bike", "Walk", "Transit", "Carbon", "CarFree", "Community", "Accessibility"
    public string Icon { get; set; } = string.Empty;
    public double CurrentValue { get; set; }
    public double TargetValue { get; set; }
    public string Unit { get; set; } = string.Empty; // "vožnje", "km", "kg CO2", "dana", "prijava"
    public int ProgressPercent { get; set; }
    public int RewardPoints { get; set; }
    public bool IsCompleted { get; set; }
    public bool IsClaimed { get; set; }
    public bool AdaptedForAccessibility { get; set; }
}

public class ClaimChallengeResponseDto
{
    public string ChallengeId { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public int AwardedPoints { get; set; }
    public int NewPointsBalance { get; set; }
    public bool AlreadyClaimed { get; set; }
    public string Message { get; set; } = string.Empty;
}

public class ZoneChallengeItemDto
{
    public string ZoneId { get; set; } = string.Empty;
    public string ZoneName { get; set; } = string.Empty;
    public string Subtitle { get; set; } = string.Empty;
    public int Rank { get; set; }
    public double GreenKilometers { get; set; }
    public double Co2SavedKg { get; set; }
    public int ActiveParticipants { get; set; }
    public int ProgressPercent { get; set; }
    public bool IsLeading { get; set; }
    public string? Badge { get; set; }
}

public class ZoneChallengeLeaderboardDto
{
    public string Title { get; set; } = "Green Challenge – ovaj tjedan";
    public string Subtitle { get; set; } = "Koji dio Timișoare će tijekom tjedna ostvariti više zelenih kilometara?";
    public DateTime WeekStartsAtUtc { get; set; }
    public DateTime WeekEndsAtUtc { get; set; }
    public double TotalCityGreenKilometers { get; set; }
    public double TotalCityCo2SavedKg { get; set; }
    public string LeadingZoneReward { get; set; } = "Vodeći kvart osvaja 1.5x EcoPoints vikend bonus i prioritet u Decidem Timișoara izvještaju!";
    public List<ZoneChallengeItemDto> Zones { get; set; } = new();
}

public class ChallengesOverviewResponseDto
{
    public int? UserId { get; set; }
    public string UserName { get; set; } = "Gost (Demo prikaz)";
    public int CurrentPointsBalance { get; set; }
    public bool PersonalizedForDisability { get; set; }
    public string AgeCategory { get; set; } = "Adult";
    public int CompletedChallengesCount { get; set; }
    public int TotalAvailableBonusPoints { get; set; }
    public List<EcoChallengeDto> PersonalChallenges { get; set; } = new();
    public ZoneChallengeLeaderboardDto CityZoneChallenge { get; set; } = new();
}
