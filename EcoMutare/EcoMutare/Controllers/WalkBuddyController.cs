using EcoMutare.Data;
using EcoMutare.Domain.Entities;
using EcoMutare.Dtos;
using EcoMutare.Services;
using EcoMutare.Services.Auth;
using EcoMutare.Services.Insights;
using EcoMutare.Services.Meetups;
using EcoMutare.Services.Trips;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EcoMutare.Controllers;

/// WalkBuddy API: pronađi društvo za zajedničku šetnju u Timișoari.
/// Pretraga i pregled su javni; kreiranje, prijava, odjava, otkazivanje i završetak traže prijavu (JWT).
/// Bodovi se dodjeljuju pri završetku (POST walkbuddy/walks/{id}/complete), ne pri prijavi, da se ne mogu zarađivati prijavom i odjavom.

[ApiController]
[Route("walkbuddy")]
public class WalkBuddyController : ControllerBase
{
    private const double AverageSpeedKmh = 4.5;
    private const double RoadFactor = 1.2;

    private readonly AppDbContext _db;
    private readonly IGreenIntelligenceService _insights;

    public WalkBuddyController(AppDbContext db, IGreenIntelligenceService insights)
    {
        _db = db;
        _insights = insights;
    }

    /// Smije li prijavljeni korisnik koristiti ovu opciju? Frontend ga koristi da sakrije opciju (invaliditet, dob).
    [HttpGet("eligibility")]
    [Authorize]
    [ProducesResponseType(typeof(MeetupEligibilityResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<MeetupEligibilityResponse>> GetEligibility(CancellationToken ct)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();
        var user = await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId.Value, ct);
        if (user is null) return Unauthorized();

        var denial = MeetupEligibility.WalkBuddyDenial(user);
        return Ok(new MeetupEligibilityResponse { Eligible = denial is null, Reason = denial });
    }

    /// Pretraga nadolazećih oglasa. Filteri: blizina polazišta (originLat/originLng/radiusKm), vrijeme, slobodna mjesta, tempo (pace) i ruta bez stepenica (stepFree).
    [HttpGet("walks")]
    [ProducesResponseType(typeof(List<WalkBuddyWalkDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<List<WalkBuddyWalkDto>>> GetAll(
        [FromQuery] double? originLat = null,
        [FromQuery] double? originLng = null,
        [FromQuery] double radiusKm = 5.0,
        [FromQuery] DateTime? fromTime = null,
        [FromQuery] DateTime? toTime = null,
        [FromQuery] bool onlyWithSpots = true,
        [FromQuery] WalkPace? pace = null,
        [FromQuery] bool? stepFree = null,
        CancellationToken ct = default)
    {
        var now = DateTime.UtcNow;
        var q = _db.WalkBuddyWalks.AsNoTracking()
            .Where(r => r.Status == MeetupStatus.Scheduled && r.DepartureTime >= now);

        if (onlyWithSpots) q = q.Where(r => r.ParticipantCount < r.MaxParticipants);
        if (pace.HasValue) q = q.Where(r => r.Pace == pace.Value);
        if (stepFree == true) q = q.Where(r => r.StepFree);

        if (fromTime.HasValue)
        {
            var ft = ToUtc(fromTime.Value);
            q = q.Where(r => r.DepartureTime >= ft);
        }
        if (toTime.HasValue)
        {
            var tt = ToUtc(toTime.Value);
            q = q.Where(r => r.DepartureTime <= tt);
        }

        var items = await q.OrderBy(r => r.DepartureTime).ToListAsync(ct);
        var dtos = items.Select(r => ToDto(r, originLat, originLng)).ToList();

        if (originLat.HasValue && originLng.HasValue)
        {
            double maxM = Math.Max(100, radiusKm * 1000.0);
            dtos = dtos
                .Where(d => (d.DistanceFromSearchOriginM ?? 0) <= maxM)
                .OrderBy(d => d.DistanceFromSearchOriginM)
                .ThenBy(d => d.DepartureTime)
                .ToList();
        }

        return Ok(dtos);
    }

    [HttpGet("walks/{id:int}")]
    [ProducesResponseType(typeof(WalkBuddyWalkDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<WalkBuddyWalkDto>> GetById(int id, CancellationToken ct)
    {
        var r = await _db.WalkBuddyWalks.AsNoTracking()
            .Include(x => x.Participants)
            .FirstOrDefaultAsync(x => x.Id == id, ct);
        if (r is null) return NotFound();

        var dto = ToDto(r, null, null);
        dto.Participants = r.Participants
            .Where(p => p.IsActive)
            .OrderBy(p => p.JoinedAt)
            .Select(p => new MeetupParticipantDto { UserId = p.UserId, DisplayName = p.DisplayName, JoinedAt = p.JoinedAt })
            .ToList();
        return Ok(dto);
    }

    ///Objavljuje novi oglas. Udaljenost i trajanje se računaju iz koordinata ako DistanceKm nije poslan.
    [HttpPost("walks")]
    [Authorize]
    [ProducesResponseType(typeof(WalkBuddyWalkDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<WalkBuddyWalkDto>> Create([FromBody] CreateWalkBuddyWalkRequest req, CancellationToken ct)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();
        var user = await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId.Value, ct);
        if (user is null) return Unauthorized();

        var denial = MeetupEligibility.WalkBuddyDenial(user);
        if (denial is not null)
            return StatusCode(StatusCodes.Status403Forbidden, new ProblemDetails { Status = 403, Title = denial });

        var departure = ToUtc(req.DepartureTime!.Value);
        var now = DateTime.UtcNow;
        if (departure < now.AddMinutes(-5))
            ModelState.AddModelError(nameof(req.DepartureTime), "Polazak ne može biti u prošlosti.");
        if (departure > now.AddDays(90))
            ModelState.AddModelError(nameof(req.DepartureTime), "Polazak može biti najviše 90 dana unaprijed.");

        double straightM = Geo.DistanceM(req.OriginLatitude, req.OriginLongitude, req.DestinationLatitude, req.DestinationLongitude);
        double km = req.DistanceKm ?? Math.Round(straightM / 1000.0 * RoadFactor, 2);
        if (km < 0.2)
            ModelState.AddModelError(nameof(req.DistanceKm), "Polazište i odredište su preblizu (kružna ruta): unesite DistanceKm.");
        if (!ModelState.IsValid) return ValidationProblem(ModelState);

        var entity = new WalkBuddyWalk
        {
            OrganizerId = user.Id,
            OrganizerName = user.DisplayName,
            Title = req.Title.Trim(),
            OriginName = req.OriginName.Trim(),
            OriginLatitude = req.OriginLatitude,
            OriginLongitude = req.OriginLongitude,
            DestinationName = req.DestinationName.Trim(),
            DestinationLatitude = req.DestinationLatitude,
            DestinationLongitude = req.DestinationLongitude,
            DepartureTime = departure,
            MaxParticipants = req.MaxParticipants,
            ParticipantCount = 0,
            DistanceKm = km,
            EstimatedDurationMinutes = Math.Max(5, (int)Math.Round(km / AverageSpeedKmh * 60.0)),
            Pace = req.Pace,
            StepFree = req.StepFree,
            Notes = req.Notes?.Trim(),
            Status = MeetupStatus.Scheduled,
            CreatedAt = now
        };

        _db.WalkBuddyWalks.Add(entity);
        await _db.SaveChangesAsync(ct);

        return StatusCode(StatusCodes.Status201Created, ToDto(entity, null, null));
    }

    /// Prijava na oglas. Mjesto se zauzima jednim uvjetnim UPDATE-om (ParticipantCount &lt; MaxParticipants),
    /// pa se oglas ne može prepuniti ni uz istodobne prijave. 409 ako nema mjesta ili je već prijavljen.

    [HttpPost("walks/{id:int}/join")]
    [Authorize]
    [ProducesResponseType(typeof(JoinMeetupResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<JoinMeetupResponse>> Join(int id, CancellationToken ct)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();
        var user = await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId.Value, ct);
        if (user is null) return Unauthorized();

        var denial = MeetupEligibility.WalkBuddyDenial(user);
        if (denial is not null)
            return StatusCode(StatusCodes.Status403Forbidden, new ProblemDetails { Status = 403, Title = denial });

        var item = await _db.WalkBuddyWalks.AsNoTracking().FirstOrDefaultAsync(r => r.Id == id, ct);
        if (item is null)
            return NotFound(new ProblemDetails { Status = 404, Title = "Oglas nije pronađen." });
        if (item.OrganizerId == userId.Value)
            return BadRequest(new ProblemDetails { Status = 400, Title = "Organizator se ne može prijaviti na vlastiti oglas." });

        var now = DateTime.UtcNow;
        var note = string.Empty;
        await using var tx = await _db.Database.BeginTransactionAsync(ct);

        var existing = await _db.WalkBuddyParticipants
            .FirstOrDefaultAsync(p => p.WalkBuddyWalkId == id && p.UserId == userId.Value, ct);
        if (existing is { IsActive: true })
            return Conflict(new ProblemDetails { Status = 409, Title = "Već ste prijavljeni." });

        var claimed = await _db.WalkBuddyWalks
            .Where(r => r.Id == id && r.Status == MeetupStatus.Scheduled && r.DepartureTime > now && r.ParticipantCount < r.MaxParticipants)
            .ExecuteUpdateAsync(s => s.SetProperty(r => r.ParticipantCount, r => r.ParticipantCount + 1), ct);
        if (claimed == 0)
            return Conflict(new ProblemDetails { Status = 409, Title = "Nema slobodnih mjesta ili je oglas završen, otkazan ili je već počeo." });

        WalkBuddyParticipant participant;
        if (existing is not null)
        {
            existing.IsActive = true;
            existing.JoinedAt = now;
            participant = existing;
        }
        else
        {
            participant = new WalkBuddyParticipant
            {
                WalkBuddyWalkId = id,
                UserId = userId.Value,
                DisplayName = user.DisplayName,
                IsActive = true,
                JoinedAt = now
            };
            _db.WalkBuddyParticipants.Add(participant);
        }

        try
        {
            await _db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException)
        {
            return Conflict(new ProblemDetails { Status = 409, Title = "Već ste prijavljeni." });
        }
        await tx.CommitAsync(ct);

        var count = await _db.WalkBuddyWalks.AsNoTracking().Where(r => r.Id == id).Select(r => r.ParticipantCount).FirstAsync(ct);
        return Ok(new JoinMeetupResponse
        {
            ParticipantId = participant.Id,
            ActivityId = id,
            Title = item.Title,
            DepartureTime = item.DepartureTime,
            SpotsLeft = Math.Max(0, item.MaxParticipants - count),
            Message = $"Prijavljeni ste: {item.Title} ({item.OriginName} → {item.DestinationName}). Organizator: {item.OrganizerName}.{note}"
        });
    }

    /// <summary>Odjava s oglasa (samo dok je oglas zakazan). Mjesto se oslobađa; bodovi se ionako dodjeljuju tek pri završetku.</summary>
    [HttpPost("walks/{id:int}/leave")]
    [Authorize]
    [ProducesResponseType(typeof(MeetupMessageResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<MeetupMessageResponse>> Leave(int id, CancellationToken ct)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();

        var participant = await _db.WalkBuddyParticipants
            .Include(p => p.WalkBuddyWalk)
            .FirstOrDefaultAsync(p => p.WalkBuddyWalkId == id && p.UserId == userId.Value && p.IsActive, ct);
        if (participant is null)
            return NotFound(new ProblemDetails { Status = 404, Title = "Niste prijavljeni na ovaj oglas." });
        if (participant.WalkBuddyWalk.Status != MeetupStatus.Scheduled)
            return Conflict(new ProblemDetails { Status = 409, Title = "Odjava nije moguća: oglas je završen ili otkazan." });

        await using var tx = await _db.Database.BeginTransactionAsync(ct);
        participant.IsActive = false;
        await _db.SaveChangesAsync(ct);
        await _db.WalkBuddyWalks
            .Where(r => r.Id == id && r.ParticipantCount > 0)
            .ExecuteUpdateAsync(s => s.SetProperty(r => r.ParticipantCount, r => r.ParticipantCount - 1), ct);
        await tx.CommitAsync(ct);

        return Ok(new MeetupMessageResponse { Message = "Odjavljeni ste." });
    }

    /// <summary>Otkazivanje oglasa (samo organizator, samo dok je zakazan).</summary>
    [HttpPost("walks/{id:int}/cancel")]
    [Authorize]
    [ProducesResponseType(typeof(MeetupMessageResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<MeetupMessageResponse>> Cancel(int id, CancellationToken ct)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();

        var item = await _db.WalkBuddyWalks.AsNoTracking().FirstOrDefaultAsync(r => r.Id == id, ct);
        if (item is null)
            return NotFound(new ProblemDetails { Status = 404, Title = "Oglas nije pronađen." });
        if (item.OrganizerId != userId.Value)
            return StatusCode(StatusCodes.Status403Forbidden, new ProblemDetails { Status = 403, Title = "Samo organizator može otkazati oglas." });

        var rows = await _db.WalkBuddyWalks
            .Where(r => r.Id == id && r.Status == MeetupStatus.Scheduled)
            .ExecuteUpdateAsync(s => s.SetProperty(r => r.Status, MeetupStatus.Cancelled), ct);
        if (rows == 0)
            return Conflict(new ProblemDetails { Status = 409, Title = "Oglas je već završen ili otkazan." });

        return Ok(new MeetupMessageResponse { Message = "Oglas je otkazan." });
    }

    /// <summary>
    /// Završetak (samo organizator, tek nakon vremena polaska). Svi aktivni sudionici i organizator dobivaju TripHistory,
    /// ušteđeni CO₂ i bodove (vidi MeetupRewards). Ako nitko nije prijavljen, oglas se samo zatvara bez bodova.
    /// Status se mijenja uvjetnim UPDATE-om, pa se bodovi ne mogu dodijeliti dvaput.
    /// </summary>
    [HttpPost("walks/{id:int}/complete")]
    [Authorize]
    [ProducesResponseType(typeof(CompleteMeetupResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<CompleteMeetupResponse>> Complete(int id, CancellationToken ct)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();

        var item = await _db.WalkBuddyWalks.AsNoTracking().FirstOrDefaultAsync(r => r.Id == id, ct);
        if (item is null)
            return NotFound(new ProblemDetails { Status = 404, Title = "Oglas nije pronađen." });
        if (item.OrganizerId != userId.Value)
            return StatusCode(StatusCodes.Status403Forbidden, new ProblemDetails { Status = 403, Title = "Samo organizator može označiti oglas završenim." });
        if (item.Status != MeetupStatus.Scheduled)
            return Conflict(new ProblemDetails { Status = 409, Title = "Oglas je već završen ili otkazan." });

        var now = DateTime.UtcNow;
        if (now < item.DepartureTime)
            return BadRequest(new ProblemDetails { Status = 400, Title = "Oglas se može završiti tek nakon vremena polaska.", Detail = $"Polazak: {item.DepartureTime:u}." });

        await using var tx = await _db.Database.BeginTransactionAsync(ct);

        var closed = await _db.WalkBuddyWalks
            .Where(r => r.Id == id && r.Status == MeetupStatus.Scheduled)
            .ExecuteUpdateAsync(s => s
                .SetProperty(r => r.Status, MeetupStatus.Completed)
                .SetProperty(r => r.CompletedAt, (DateTime?)now), ct);
        if (closed == 0)
            return Conflict(new ProblemDetails { Status = 409, Title = "Oglas je već završen ili otkazan." });

        var participants = await _db.WalkBuddyParticipants
            .Where(p => p.WalkBuddyWalkId == id && p.IsActive)
            .ToListAsync(ct);

        double co2 = CarbonCalculator.SavedGrams(TransportMode.Walk, item.DistanceKm);
        int tripPoints = CarbonCalculator.Points(co2);
        int participantPoints = tripPoints + MeetupRewards.ParticipantBonusPoints;
        int organizerPoints = 0;

        if (participants.Count > 0)
        {
            organizerPoints = tripPoints + Math.Min(MeetupRewards.OrganizerBonusCap, participants.Count * MeetupRewards.OrganizerBonusPerParticipant);

            foreach (var p in participants)
            {
                p.Co2SavedGrams = co2;
                p.PointsEarned = participantPoints;
                await MeetupRewards.AwardAsync(_db, p.UserId, TransportMode.Walk,
                    item.OriginName, item.OriginLatitude, item.OriginLongitude,
                    item.DestinationName, item.DestinationLatitude, item.DestinationLongitude,
                    item.DistanceKm, item.EstimatedDurationMinutes, co2, participantPoints,
                    item.DepartureTime, $"WalkBuddy šetnja: {item.Title}", ct);
            }

            await MeetupRewards.AwardAsync(_db, userId.Value, TransportMode.Walk,
                item.OriginName, item.OriginLatitude, item.OriginLongitude,
                item.DestinationName, item.DestinationLatitude, item.DestinationLongitude,
                item.DistanceKm, item.EstimatedDurationMinutes, co2, organizerPoints,
                item.DepartureTime, $"WalkBuddy šetnja (organizator): {item.Title}", ct);

            await _db.WalkBuddyWalks
                .Where(r => r.Id == id)
                .ExecuteUpdateAsync(s => s.SetProperty(r => r.OrganizerPointsEarned, organizerPoints), ct);
        }

        await _db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);

        // Proslijedi završene aktivnosti u Green Intelligence (jedan zapis po osobi)
        if (participants.Count > 0)
        {
            foreach (var uid in participants.Select(p => p.UserId).Append(userId.Value))
            {
                _insights.RecordTrip(new CityTripRecordDto
                {
                    Id = $"walkbuddy-{id}-{uid}",
                    Origin = new GeoPoint { Lat = item.OriginLatitude, Lng = item.OriginLongitude },
                    Destination = new GeoPoint { Lat = item.DestinationLatitude, Lng = item.DestinationLongitude },
                    Mode = EcoMutare.Domain.TransportMode.Walk,
                    DistanceKm = item.DistanceKm,
                    Co2SavedGrams = co2,
                    IsSynthetic = false
                });
            }
        }

        return Ok(new CompleteMeetupResponse
        {
            ActivityId = id,
            ParticipantsRewarded = participants.Count,
            Co2SavedPerPersonGrams = co2,
            PointsPerParticipant = participants.Count > 0 ? participantPoints : 0,
            OrganizerPointsEarned = organizerPoints,
            Message = participants.Count > 0
                ? $"Završeno. Nagrađeno sudionika: {participants.Count}."
                : "Završeno bez sudionika, bodovi se ne dodjeljuju."
        });
    }

    /// <summary>Moji oglasi: oni koje organiziram i oni na koje sam prijavljen (najnoviji prvo, najviše 50 + 50).</summary>
    [HttpGet("my")]
    [Authorize]
    [ProducesResponseType(typeof(List<MeetupSummaryDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<List<MeetupSummaryDto>>> GetMine(CancellationToken ct)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();

        var organized = await _db.WalkBuddyWalks.AsNoTracking()
            .Where(r => r.OrganizerId == userId.Value)
            .OrderByDescending(r => r.DepartureTime).Take(50)
            .ToListAsync(ct);

        var joined = await _db.WalkBuddyParticipants.AsNoTracking()
            .Where(p => p.UserId == userId.Value && p.IsActive)
            .Include(p => p.WalkBuddyWalk)
            .OrderByDescending(p => p.WalkBuddyWalk.DepartureTime).Take(50)
            .ToListAsync(ct);

        var list = organized.Select(r => Summary(r, "Organizer", r.OrganizerPointsEarned))
            .Concat(joined.Select(p => Summary(p.WalkBuddyWalk, "Participant", p.PointsEarned)))
            .OrderByDescending(s => s.DepartureTime)
            .ToList();

        return Ok(list);
    }

    private static DateTime ToUtc(DateTime d) =>
        d.Kind == DateTimeKind.Unspecified ? DateTime.SpecifyKind(d, DateTimeKind.Utc) : d.ToUniversalTime();

    private static MeetupSummaryDto Summary(WalkBuddyWalk r, string role, int points) => new()
    {
        Kind = "WalkBuddy",
        Id = r.Id,
        Title = r.Title,
        OriginName = r.OriginName,
        DestinationName = r.DestinationName,
        DepartureTime = r.DepartureTime,
        Status = r.Status,
        ParticipantCount = r.ParticipantCount,
        MaxParticipants = r.MaxParticipants,
        Role = role,
        PointsEarned = points
    };

    private static WalkBuddyWalkDto ToDto(WalkBuddyWalk r, double? searchLat, double? searchLng)
    {
        double co2 = CarbonCalculator.SavedGrams(TransportMode.Walk, r.DistanceKm);
        return new WalkBuddyWalkDto
        {
            Id = r.Id,
            OrganizerId = r.OrganizerId,
            OrganizerName = r.OrganizerName,
            Title = r.Title,
            OriginName = r.OriginName,
            OriginLatitude = r.OriginLatitude,
            OriginLongitude = r.OriginLongitude,
            DestinationName = r.DestinationName,
            DestinationLatitude = r.DestinationLatitude,
            DestinationLongitude = r.DestinationLongitude,
            DepartureTime = r.DepartureTime,
            MaxParticipants = r.MaxParticipants,
            ParticipantCount = r.ParticipantCount,
            SpotsLeft = Math.Max(0, r.MaxParticipants - r.ParticipantCount),
            DistanceKm = r.DistanceKm,
            EstimatedDurationMinutes = r.EstimatedDurationMinutes,
            Pace = r.Pace,
            StepFree = r.StepFree,
            Notes = r.Notes,
            Status = r.Status,
            DistanceFromSearchOriginM = searchLat.HasValue && searchLng.HasValue
                ? Math.Round(Geo.DistanceM(searchLat.Value, searchLng.Value, r.OriginLatitude, r.OriginLongitude), 1)
                : null,
            EstimatedCo2SavedGrams = co2,
            EstimatedEcoPoints = CarbonCalculator.Points(co2) + MeetupRewards.ParticipantBonusPoints
        };
    }
}
