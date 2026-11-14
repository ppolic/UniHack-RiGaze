using System.ComponentModel.DataAnnotations;

namespace EcoMutare.Domain.Entities;


/// Oglas za zajedničku šetnju (WalkBuddy): organizator objavi polazište, odredište i vrijeme,
/// a drugi se prijave. Bodovi se dodjeljuju kad organizator označi šetnju završenom (POST .../complete).

public class WalkBuddyWalk
{
    public int Id { get; set; }

    public int? OrganizerId { get; set; }
    public User? Organizer { get; set; }

    [MaxLength(100)]
    public string OrganizerName { get; set; } = string.Empty;

    [MaxLength(120)]
    public string Title { get; set; } = string.Empty;

    /// Mjesto okupljanja.
    [MaxLength(150)]
    public string OriginName { get; set; } = string.Empty;
    public double OriginLatitude { get; set; }
    public double OriginLongitude { get; set; }

    [MaxLength(150)]
    public string DestinationName { get; set; } = string.Empty;
    public double DestinationLatitude { get; set; }
    public double DestinationLongitude { get; set; }

    public DateTime DepartureTime { get; set; }

    /// <summary>Broj mjesta za druge sudionike (organizator se ne računa).</summary>
    public int MaxParticipants { get; set; } = 4;
    public int ParticipantCount { get; set; }

    public double DistanceKm { get; set; }
    public int EstimatedDurationMinutes { get; set; }

    public WalkPace Pace { get; set; } = WalkPace.Normal;

    /// <summary>True ako je ruta bez stepenica (npr. kolica za bebe, starije osobe). Osobe s invaliditetom ne mogu koristiti WalkBuddy, vidi MeetupEligibility.</summary>
    public bool StepFree { get; set; }

    [MaxLength(300)]
    public string? Notes { get; set; }

    public MeetupStatus Status { get; set; } = MeetupStatus.Scheduled;

    /// <summary>Bodovi koje je organizator dobio pri završetku (0 dok šetnja nije završena).</summary>
    public int OrganizerPointsEarned { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? CompletedAt { get; set; }

    public List<WalkBuddyParticipant> Participants { get; set; } = new();
}
