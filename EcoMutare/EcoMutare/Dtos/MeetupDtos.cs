using System.ComponentModel;
using System.ComponentModel.DataAnnotations;
using EcoMutare.Domain.Entities;

namespace EcoMutare.Dtos;

// === BikeShare i WalkBuddy DTO-ovi (zajednički dio + specifična polja) ===

public class MeetupDtoBase
{
    public int Id { get; set; }
    public int? OrganizerId { get; set; }
    public string OrganizerName { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string OriginName { get; set; } = string.Empty;
    public double OriginLatitude { get; set; }
    public double OriginLongitude { get; set; }
    public string DestinationName { get; set; } = string.Empty;
    public double DestinationLatitude { get; set; }
    public double DestinationLongitude { get; set; }
    public DateTime DepartureTime { get; set; }
    public int MaxParticipants { get; set; }
    public int ParticipantCount { get; set; }
    public int SpotsLeft { get; set; }
    public double DistanceKm { get; set; }
    public int EstimatedDurationMinutes { get; set; }
    public string? Notes { get; set; }
    public MeetupStatus Status { get; set; }
    public double? DistanceFromSearchOriginM { get; set; }
    public double EstimatedCo2SavedGrams { get; set; }
    public int EstimatedEcoPoints { get; set; }
    /// <summary>Popunjeno samo na GET /{id}.</summary>
    public List<MeetupParticipantDto>? Participants { get; set; }
}

public class BikeShareRideDto : MeetupDtoBase
{
    public RideLevel Level { get; set; }
    public bool UsesStationBikes { get; set; }
}

public class WalkBuddyWalkDto : MeetupDtoBase
{
    public WalkPace Pace { get; set; }
    public bool StepFree { get; set; }
}

public class MeetupParticipantDto
{
    public int UserId { get; set; }
    public string DisplayName { get; set; } = string.Empty;
    public DateTime JoinedAt { get; set; }
}

public class CreateMeetupRequestBase
{
    [Required, MaxLength(120)]
    [DefaultValue("Jutarnja tura uz Begu")]
    public string Title { get; set; } = string.Empty;

    [Required, MaxLength(150)]
    [DefaultValue("Piața Victoriei")]
    public string OriginName { get; set; } = string.Empty;

    [Range(-90, 90)]
    [DefaultValue(45.7537)]
    public double OriginLatitude { get; set; } = 45.7537;

    [Range(-180, 180)]
    [DefaultValue(21.2257)]
    public double OriginLongitude { get; set; } = 21.2257;

    [Required, MaxLength(150)]
    [DefaultValue("Parcul Rozelor")]
    public string DestinationName { get; set; } = string.Empty;

    [Range(-90, 90)]
    [DefaultValue(45.7478)]
    public double DestinationLatitude { get; set; } = 45.7478;

    [Range(-180, 180)]
    [DefaultValue(21.2330)]
    public double DestinationLongitude { get; set; } = 21.2330;

    /// <summary>Neobavezno. Ako se izostavi, računa se iz koordinata; za kružnu rutu (isto polazište i odredište) je obavezno.</summary>
    [Range(0.2, 200)]
    public double? DistanceKm { get; set; }

    [Required]
    public DateTime? DepartureTime { get; set; }

    /// <summary>Broj mjesta za druge sudionike (bez organizatora).</summary>
    [Range(1, 20)]
    [DefaultValue(4)]
    public int MaxParticipants { get; set; } = 4;

    [MaxLength(300)]
    public string? Notes { get; set; }
}

public class CreateBikeShareRideRequest : CreateMeetupRequestBase
{
    public RideLevel Level { get; set; } = RideLevel.Beginner;
    public bool UsesStationBikes { get; set; }
}

public class CreateWalkBuddyWalkRequest : CreateMeetupRequestBase
{
    public WalkPace Pace { get; set; } = WalkPace.Normal;
    public bool StepFree { get; set; }
}

public class JoinMeetupResponse
{
    public int ParticipantId { get; set; }
    public int ActivityId { get; set; }
    public string Title { get; set; } = string.Empty;
    public DateTime DepartureTime { get; set; }
    public int SpotsLeft { get; set; }
    public string Message { get; set; } = string.Empty;
}

public class CompleteMeetupResponse
{
    public int ActivityId { get; set; }
    public int ParticipantsRewarded { get; set; }
    public double Co2SavedPerPersonGrams { get; set; }
    public int PointsPerParticipant { get; set; }
    public int OrganizerPointsEarned { get; set; }
    public string Message { get; set; } = string.Empty;
}

public class MeetupMessageResponse
{
    public string Message { get; set; } = string.Empty;
}

public class MeetupSummaryDto
{
    public string Kind { get; set; } = string.Empty;
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string OriginName { get; set; } = string.Empty;
    public string DestinationName { get; set; } = string.Empty;
    public DateTime DepartureTime { get; set; }
    public MeetupStatus Status { get; set; }
    public int ParticipantCount { get; set; }
    public int MaxParticipants { get; set; }
    /// <summary>"Organizer" ili "Participant".</summary>
    public string Role { get; set; } = string.Empty;
    public int PointsEarned { get; set; }
}

public class MeetupEligibilityResponse
{
    public bool Eligible { get; set; }
    /// <summary>Razlog zabrane (null ako je dopušteno).</summary>
    public string? Reason { get; set; }
}
