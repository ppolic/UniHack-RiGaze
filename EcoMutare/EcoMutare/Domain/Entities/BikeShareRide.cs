using System.ComponentModel.DataAnnotations;

namespace EcoMutare.Domain.Entities;

/// Oglas za zajedničku biciklističku vožnju (BikeShare): organizator objavi polazište, odredište i vrijeme,
/// a drugi se prijave. Bodovi se dodjeljuju kad organizator označi vožnju završenom (POST .../complete).

public class BikeShareRide
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

    public RideLevel Level { get; set; } = RideLevel.Beginner;

    /// <summary>True ako se okupljanje održava na VeloTM stanici i bicikli se iznajmljuju na licu mjesta.</summary>
    public bool UsesStationBikes { get; set; }

    [MaxLength(300)]
    public string? Notes { get; set; }

    public MeetupStatus Status { get; set; } = MeetupStatus.Scheduled;

    /// <summary>Bodovi koje je organizator dobio pri završetku (0 dok vožnja nije završena).</summary>
    public int OrganizerPointsEarned { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? CompletedAt { get; set; }

    public List<BikeShareParticipant> Participants { get; set; } = new();
}
