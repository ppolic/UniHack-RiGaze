using EcoMutare.Data;
using EcoMutare.Domain.Entities;
using EcoMutare.Dtos;
using EcoMutare.Services;
using EcoMutare.Services.Auth;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EcoMutare.Controllers;

/// <summary>
/// EcoChallenges – gamifikacija održive mobilnosti u Timișoari:
/// 1) Osobni tjedni izazovi generirani na temelju putovanja i profila korisnika (uključujući prilagodbu za osobe s invaliditetom i dob).
/// 2) City vs City / Kvartovsko natjecanje ("Green Challenge – ovaj tjedan": Centar vs. Studentska zona vs. Industrijska zona...).
/// </summary>
[ApiController]
[Route("challenges")]
public class ChallengesController : ControllerBase
{
    private readonly AppDbContext _db;

    public ChallengesController(AppDbContext db)
    {
        _db = db;
    }

    /// <summary>
    /// Vraća kompletan pregled EcoChallenges ekrana: osobne izazove korisnika + tjednu ljestvicu kvartova Timișoare ("Green Challenge – ovaj tjedan").
    /// Radi s Bearer JWT tokenom ili opcionalnim ?userId=1 parametrom za brz demo u Swaggeru.
    /// </summary>
    [HttpGet]
    [HttpGet("overview")]
    public async Task<ActionResult<ChallengesOverviewResponseDto>> GetOverview([FromQuery] int? userId = null, CancellationToken ct = default)
    {
        int effectiveUserId = User.GetUserId() ?? userId ?? 1;
        var overview = await BuildOverviewAsync(effectiveUserId, ct);
        return Ok(overview);
    }

    /// <summary>
    /// Vraća listu osobnih tjednih izazova s trenutnim napretkom izračunatim iz stvarnih vožnji u bazi.
    /// </summary>
    [HttpGet("my")]
    public async Task<ActionResult<List<EcoChallengeDto>>> GetMyChallenges([FromQuery] int? userId = null, CancellationToken ct = default)
    {
        int effectiveUserId = User.GetUserId() ?? userId ?? 1;
        var overview = await BuildOverviewAsync(effectiveUserId, ct);
        return Ok(overview.PersonalChallenges);
    }

    /// <summary>
    /// Vraća "Green Challenge – ovaj tjedan" natjecanje kvartova Timișoare po zelenim kilometrima (Centar, Studentska zona, Industrijska zona...).
    /// Svaka nova zelena vožnja u POST /trips automatski povećava kilometre odgovarajućeg kvarta!
    /// </summary>
    [HttpGet("zones")]
    [HttpGet("leaderboard/zones")]
    public async Task<ActionResult<ZoneChallengeLeaderboardDto>> GetZonesLeaderboard(CancellationToken ct = default)
    {
        var leaderboard = await BuildZoneLeaderboardAsync(ct);
        return Ok(leaderboard);
    }

    /// <summary>
    /// Preuzima nagradu (+bodove) za ispunjeni osobni izazov (npr. "bike-3x", "car-free-day", "walk-10km", "try-transit", "save-5kg-co2")
    /// i upisuje bodove u MySQL tablicu Users i PointTransactions.
    /// </summary>
    [HttpPost("{id}/claim")]
    public async Task<ActionResult<ClaimChallengeResponseDto>> ClaimChallenge(
        string id,
        [FromQuery] int? userId = null,
        CancellationToken ct = default)
    {
        int effectiveUserId = User.GetUserId() ?? userId ?? 1;
        var overview = await BuildOverviewAsync(effectiveUserId, ct);

        var challenge = overview.PersonalChallenges
            .FirstOrDefault(c => c.Id.Equals(id, StringComparison.OrdinalIgnoreCase));

        if (challenge is null)
        {
            return NotFound(new { error = $"Izazov '{id}' nije pronađen." });
        }

        if (challenge.IsClaimed)
        {
            return Ok(new ClaimChallengeResponseDto
            {
                ChallengeId = challenge.Id,
                Title = challenge.Title,
                AwardedPoints = 0,
                NewPointsBalance = overview.CurrentPointsBalance,
                AlreadyClaimed = true,
                Message = $"Nagrada za izazov '{challenge.Title}' je već preuzeta ovaj tjedan."
            });
        }

        try
        {
            var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == effectiveUserId, ct);
            if (user is not null)
            {
                user.PointsBalance += challenge.RewardPoints;
                _db.PointTransactions.Add(new PointTransaction
                {
                    UserId = user.Id,
                    Points = challenge.RewardPoints,
                    Type = PointTransactionType.Bonus,
                    Description = $"[Challenge:{challenge.Id}] Osvojen izazov: {challenge.Title}",
                    CreatedAt = DateTime.UtcNow
                });
                await _db.SaveChangesAsync(ct);

                return Ok(new ClaimChallengeResponseDto
                {
                    ChallengeId = challenge.Id,
                    Title = challenge.Title,
                    AwardedPoints = challenge.RewardPoints,
                    NewPointsBalance = user.PointsBalance,
                    AlreadyClaimed = false,
                    Message = $"Čestitamo! Osvojili ste +{challenge.RewardPoints} EcoPoints za izazov '{challenge.Title}'!"
                });
            }
        }
        catch
        {
            // Fallback ako MySQL trenutno nije dostupan
        }

        return Ok(new ClaimChallengeResponseDto
        {
            ChallengeId = challenge.Id,
            Title = challenge.Title,
            AwardedPoints = challenge.RewardPoints,
            NewPointsBalance = overview.CurrentPointsBalance + challenge.RewardPoints,
            AlreadyClaimed = false,
            Message = $"Čestitamo! Osvojili ste +{challenge.RewardPoints} EcoPoints za izazov '{challenge.Title}'!"
        });
    }

    private async Task<ChallengesOverviewResponseDto> BuildOverviewAsync(int userId, CancellationToken ct)
    {
        User? user = null;
        List<TripHistory> weeklyTrips = new();
        HashSet<string> claimedIds = new(StringComparer.OrdinalIgnoreCase);
        int userReportsCount = 0;

        DateTime weekStart = DateTime.UtcNow.Date.AddDays(-7);

        try
        {
            user = await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId, ct);
            weeklyTrips = await _db.TripHistories
                .AsNoTracking()
                .Where(t => t.UserId == userId && t.StartedAt >= weekStart)
                .ToListAsync(ct);

            var bonusDescriptions = await _db.PointTransactions
                .AsNoTracking()
                .Where(p => p.UserId == userId && p.Type == PointTransactionType.Bonus && p.CreatedAt >= weekStart)
                .Select(p => p.Description)
                .ToListAsync(ct);

            foreach (var desc in bonusDescriptions)
            {
                if (desc is not null && desc.StartsWith("[Challenge:", StringComparison.OrdinalIgnoreCase))
                {
                    int endBracket = desc.IndexOf(']');
                    if (endBracket > 11)
                    {
                        claimedIds.Add(desc.Substring(11, endBracket - 11));
                    }
                }
            }

            userReportsCount = await _db.CommunityReports
                .AsNoTracking()
                .CountAsync(r => r.ReportedByUserId == userId, ct);
        }
        catch
        {
            // Ako baza nije dostupna, koristimo realistične demo podatke
        }

        bool hasDisability = user?.HasDisability ?? false;
        var ageCategory = user?.AgeCategory ?? EcoMutare.Domain.AgeCategory.Adult;

        int bikeTripsCount = weeklyTrips.Count(t => t.Mode == TransportMode.Bike);

        double walkKm = Math.Round(weeklyTrips
            .Where(t => t.Mode == TransportMode.Walk)
            .Sum(t => t.DistanceKm), 1);

        int transitOrCarpoolCount = weeklyTrips.Count(t =>
            t.Mode is TransportMode.Bus or TransportMode.Tram or TransportMode.Trolleybus or TransportMode.Carpool);

        double accessibleKm = Math.Round(weeklyTrips
            .Where(t => t.Mode != TransportMode.Car)
            .Sum(t => t.DistanceKm), 1);

        int carFreeDays = weeklyTrips
            .Where(t => t.Mode != TransportMode.Car)
            .Select(t => t.StartedAt.Date)
            .Distinct()
            .Count();

        double co2SavedKg = Math.Round(weeklyTrips.Sum(t => t.Co2SavedGrams) / 1000.0, 2);

        // Ako nema vožnji u bazi (npr. baza ugašena), postavi ogledne vrijednosti za demo
        if (weeklyTrips.Count == 0 && user is null)
        {
            bikeTripsCount = 2;
            walkKm = 6.8;
            transitOrCarpoolCount = 1;
            carFreeDays = 1;
            co2SavedKg = 3.4;
            userReportsCount = 1;
        }

        var challenges = new List<EcoChallengeDto>();

        // 1. Izazov: Bicikl (ili Niskopodni JPP za osobe s invaliditetom)
        if (hasDisability)
        {
            challenges.Add(BuildChallenge(
                id: "accessible-transit-3x",
                title: "3 putovanja niskopodnim STPT javnim prijevozom ovaj tjedan",
                description: "Putuj niskopodnim tramvajima i autobusima bez barijera kroz Timișoaru.",
                category: "Accessibility",
                icon: "accessible",
                current: transitOrCarpoolCount,
                target: 3,
                unit: "vožnje",
                rewardPoints: 100,
                claimedIds: claimedIds,
                adaptedForAccessibility: true));
        }
        else
        {
            challenges.Add(BuildChallenge(
                id: "bike-3x",
                title: "3 puta biciklom ovaj tjedan",
                description: "Odaberi VeloTM ili vlastiti bicikl barem 3 puta za put na fakultet ili posao.",
                category: "Bike",
                icon: "directions_bike",
                current: bikeTripsCount,
                target: 3,
                unit: "vožnje",
                rewardPoints: 100,
                claimedIds: claimedIds));
        }

        // 2. Izazov: Jedan dan bez automobila
        challenges.Add(BuildChallenge(
            id: "car-free-day",
            title: "Jedan dan bez automobila",
            description: "Odradi sva dnevna putovanja bez osobnog automobila (pješice, biciklom, JPP-om ili Carpoolom).",
            category: "CarFree",
            icon: "no_crash",
            current: Math.Min(1, carFreeDays),
            target: 1,
            unit: "dan",
            rewardPoints: 50,
            claimedIds: claimedIds));

        // 3. Izazov: 10 km pješice (ili 10 km pristupačnog kretanja za osobe u kolicima)
        if (hasDisability)
        {
            challenges.Add(BuildChallenge(
                id: "accessible-10km",
                title: "10 km zelenog kretanja bez barijera",
                description: "Ostvari 10 km kretanja po step-free rutama, niskopodnim STPT linijama ili pristupačnim Carpoolom.",
                category: "Accessibility",
                icon: "route",
                current: accessibleKm,
                target: 10.0,
                unit: "km",
                rewardPoints: 80,
                claimedIds: claimedIds,
                adaptedForAccessibility: true));
        }
        else
        {
            challenges.Add(BuildChallenge(
                id: "walk-10km",
                title: "10 km pješice",
                description: "Prošeći ukupno 10 kilometara kroz zelene koridore uz Begu i pješačke zone centra.",
                category: "Walk",
                icon: "directions_walk",
                current: walkKm,
                target: 10.0,
                unit: "km",
                rewardPoints: 80,
                claimedIds: claimedIds));
        }

        // 4. Izazov: Isprobaj novu JPP liniju ili Carpool
        challenges.Add(BuildChallenge(
            id: "try-transit",
            title: "Isprobaj novu JPP liniju",
            description: "Koristi STPT javni prijevoz (tramvaj, trolejbus, vaporetto na Begi) ili podijeli Carpool vožnju.",
            category: "Transit",
            icon: "tram",
            current: Math.Min(1, transitOrCarpoolCount),
            target: 1,
            unit: "vožnja",
            rewardPoints: 60,
            claimedIds: claimedIds));

        // 5. Izazov: Uštedi 5 kg CO2
        challenges.Add(BuildChallenge(
            id: "save-5kg-co2",
            title: "Uštedi 5 kg CO₂",
            description: "Zamijeni vožnju automobilom održivim opcijama i uštedi ukupno 5 kg CO₂ emisija.",
            category: "Carbon",
            icon: "eco",
            current: co2SavedKg,
            target: 5.0,
            unit: "kg CO₂",
            rewardPoints: 150,
            claimedIds: claimedIds));

        // 6. Izazov: Čuvar zajednice
        challenges.Add(BuildChallenge(
            id: "crowd-guardian",
            title: "Prijavi ili potvrdi prepreku u gradu",
            description: "Pomozi sugrađanima prijavom blokirane staze, radova ili nedostupnog prilaza za kolica.",
            category: "Community",
            icon: "report_problem",
            current: Math.Min(1, Math.Max(userReportsCount, weeklyTrips.Count > 0 ? 1 : 0)),
            target: 1,
            unit: "prijava",
            rewardPoints: 40,
            claimedIds: claimedIds));

        var zoneLeaderboard = await BuildZoneLeaderboardAsync(ct);

        return new ChallengesOverviewResponseDto
        {
            UserId = user?.Id ?? userId,
            UserName = user?.DisplayName ?? "Ana Popescu (Demo)",
            CurrentPointsBalance = user?.PointsBalance ?? 340,
            PersonalizedForDisability = hasDisability,
            AgeCategory = ageCategory.ToString(),
            CompletedChallengesCount = challenges.Count(c => c.IsCompleted),
            TotalAvailableBonusPoints = challenges.Sum(c => c.RewardPoints),
            PersonalChallenges = challenges,
            CityZoneChallenge = zoneLeaderboard
        };
    }

    private async Task<ZoneChallengeLeaderboardDto> BuildZoneLeaderboardAsync(CancellationToken ct)
    {
        // Definicija glavnih zona Timișoare s baznim tjednim rezultatima zajednice (prema dizajnu: Centar 1.240 km, Studentska zona 980 km, Industrijska 640 km)
        var zones = new List<(string Id, string Name, string Subtitle, double Lat, double Lng, double BaseKm, double BaseCo2Kg, int BaseUsers)>
        {
            ("centru-cetate", "Centar", "Piața Victoriei, Piața Unirii & Malul Begăi", 45.7537, 21.2257, 1240.0, 228.5, 312),
            ("complexul-studentesc", "Studentska zona", "Complexul Studențesc, UPT & UVT kampus", 45.7478, 21.2316, 980.0, 184.0, 275),
            ("iulius-aradului", "Sjeverna zona (Iulius Town)", "Iulius Town, Calea Aradului & Torontalului", 45.7660, 21.2288, 790.0, 145.2, 198),
            ("zona-industriala-se", "Industrijska zona", "Calea Buziașului, AEM & Zona Industrială SE", 45.7365, 21.2625, 640.0, 118.4, 142),
            ("sagului-dambovita", "Južna zona (Șagului)", "Calea Șagului, Dâmbovița & Fratelia", 45.7315, 21.2125, 520.0, 96.0, 119)
        };

        var extraKmByZone = zones.ToDictionary(z => z.Id, _ => 0.0);
        var extraCo2ByZone = zones.ToDictionary(z => z.Id, _ => 0.0);
        var extraUsersByZone = zones.ToDictionary(z => z.Id, _ => 0);

        try
        {
            var greenTrips = await _db.TripHistories
                .AsNoTracking()
                .Where(t => t.Mode != TransportMode.Car)
                .ToListAsync(ct);

            foreach (var trip in greenTrips)
            {
                var nearestZone = zones
                    .OrderBy(z => Geo.DistanceM(trip.DestinationLatitude, trip.DestinationLongitude, z.Lat, z.Lng))
                    .First();

                extraKmByZone[nearestZone.Id] += trip.DistanceKm;
                extraCo2ByZone[nearestZone.Id] += trip.Co2SavedGrams / 1000.0;
                extraUsersByZone[nearestZone.Id] += 1;
            }
        }
        catch
        {
            // Ako MySQL nije dostupan, prikazujemo bazne tjedne brojke
        }

        var items = zones.Select(z =>
        {
            double totalKm = Math.Round(z.BaseKm + extraKmByZone[z.Id], 1);
            double totalCo2 = Math.Round(z.BaseCo2Kg + extraCo2ByZone[z.Id], 1);
            int participants = z.BaseUsers + extraUsersByZone[z.Id];

            return new ZoneChallengeItemDto
            {
                ZoneId = z.Id,
                ZoneName = z.Name,
                Subtitle = z.Subtitle,
                GreenKilometers = totalKm,
                Co2SavedKg = totalCo2,
                ActiveParticipants = participants
            };
        })
        .OrderByDescending(i => i.GreenKilometers)
        .ToList();

        double maxKm = items.Max(i => i.GreenKilometers);
        double scaleMax = Math.Max(1500.0, maxKm * 1.12);

        for (int i = 0; i < items.Count; i++)
        {
            items[i].Rank = i + 1;
            items[i].IsLeading = i == 0;
            items[i].ProgressPercent = (int)Math.Clamp(Math.Round((items[i].GreenKilometers / scaleMax) * 100.0), 5, 100);
            if (i == 0)
            {
                items[i].Badge = "Vodeći kvart tjedna (+1.5x EcoPoints vikend bonus)";
            }
            else if (i == 1)
            {
                double diff = Math.Round(items[0].GreenKilometers - items[1].GreenKilometers, 1);
                items[i].Badge = $"Samo {diff} km iza vodećeg kvarta!";
            }
        }

        // Ponos tjedna (od ponedjeljka do nedjelje)
        var today = DateTime.UtcNow.Date;
        int diffToMonday = ((int)today.DayOfWeek + 6) % 7;
        var monday = today.AddDays(-diffToMonday);
        var sunday = monday.AddDays(7).AddSeconds(-1);

        return new ZoneChallengeLeaderboardDto
        {
            Title = "Green Challenge – ovaj tjedan",
            Subtitle = "Natjecanje kvartova Timișoare u ostvarenim zelenim kilometrima (bicikl, pješačenje, JPP, romobil i Carpool)",
            WeekStartsAtUtc = monday,
            WeekEndsAtUtc = sunday,
            TotalCityGreenKilometers = Math.Round(items.Sum(i => i.GreenKilometers), 1),
            TotalCityCo2SavedKg = Math.Round(items.Sum(i => i.Co2SavedKg), 1),
            Zones = items
        };
    }

    private static EcoChallengeDto BuildChallenge(
        string id,
        string title,
        string description,
        string category,
        string icon,
        double current,
        double target,
        string unit,
        int rewardPoints,
        HashSet<string> claimedIds,
        bool adaptedForAccessibility = false)
    {
        double clampedCurrent = Math.Round(Math.Min(current, target), 1);
        int pct = target > 0
            ? (int)Math.Clamp(Math.Round((clampedCurrent / target) * 100.0), 0, 100)
            : 100;

        bool completed = current >= target;
        bool claimed = claimedIds.Contains(id);

        return new EcoChallengeDto
        {
            Id = id,
            Title = title,
            Description = description,
            Category = category,
            Icon = icon,
            CurrentValue = clampedCurrent,
            TargetValue = target,
            Unit = unit,
            ProgressPercent = pct,
            RewardPoints = rewardPoints,
            IsCompleted = completed,
            IsClaimed = claimed,
            AdaptedForAccessibility = adaptedForAccessibility
        };
    }
}
