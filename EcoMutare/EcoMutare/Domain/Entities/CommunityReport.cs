using System.ComponentModel.DataAnnotations;

namespace EcoMutare.Domain.Entities;

/// Građanska prijava na terenu u stvarnom vremenu u Timișoari:
/// blokade cesta, nedostupna područja za osobe s invaliditetom, blokirane biciklističke staze
/// ili prijava koridora gdje nedostaje biciklistička staza unatoč čestom prolasku građana.

public class CommunityReport
{
    public int Id { get; set; }

    public EcoMutare.Domain.CommunityReportCategory Category { get; set; }

    [MaxLength(160)]
    public string Title { get; set; } = string.Empty;

    [MaxLength(600)]
    public string Description { get; set; } = string.Empty;

    [MaxLength(150)]
    public string StreetOrZone { get; set; } = string.Empty;

    public double Latitude { get; set; }
    public double Longitude { get; set; }

    /// <summary>Načini prijevoza na koje prijava utječe (npr. "Bike,Scooter", "Walk,PublicTransport").</summary>
    [MaxLength(120)]
    public string AffectedModesCsv { get; set; } = "Bike,Scooter";

    /// <summary>True ako prepreka izravno blokira osobe u invalidskim kolicima (hasDisability: true).</summary>
    public bool AffectsWheelchair { get; set; }

    /// <summary>Broj potvrda građana ("Još je tamo 👍" ili "I meni ovdje fali biciklistička staza 👍").</summary>
    public int ConfirmationsCount { get; set; } = 1;

    /// <summary>Broj glasova da je prepreka uklonjena ("Riješeno 👎").</summary>
    public int ResolvedVotesCount { get; set; } = 0;

    public bool IsActive { get; set; } = true;

    /// <summary>Izvor podatka (npr. "BeGreen Crowd Report" ili "Primăria Timișoara – Sesizări Live").</summary>
    [MaxLength(100)]
    public string Source { get; set; } = "BeGreen Crowd Report";

    /// <summary>Opcionalni broj predmeta u sustavu Sesizări Grada Temišvara (npr. "SZN2026-019847").</summary>
    [MaxLength(60)]
    public string? ExternalSesizariId { get; set; }

    /// <summary>
    /// Službeni kanal Grada Temišvara prema smjernicama (https://sesizari.primariatm.ro za kvarove,
    /// odnosno https://decidem.primariatm.ro za prijedloge novih biciklističkih staza).
    /// </summary>
    [MaxLength(255)]
    public string OfficialActionUrl { get; set; } = "https://sesizari.primariatm.ro";

    /// <summary>Relativni URL fotografije prijave (npr. /reports/photos/ab12...jpg); null ako nema fotografije.</summary>
    [MaxLength(255)]
    public string? PhotoUrl { get; set; }

    public int? ReportedByUserId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
