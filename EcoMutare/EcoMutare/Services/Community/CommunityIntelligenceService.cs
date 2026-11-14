using System.Text.Json;
using EcoMutare.Data;
using EcoMutare.Domain;
using EcoMutare.Domain.Entities;
using EcoMutare.Dtos;
using EcoMutare.Services.Insights;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace EcoMutare.Services.Community;

public interface ICommunityIntelligenceService
{
    Task<IReadOnlyList<CommunityReportDto>> GetReportsAsync(
        CommunityReportCategory? category = null,
        GeoPoint? near = null,
        double radiusMeters = 1500,
        bool onlyActive = true,
        bool includeOfficialSesizari = true,
        CancellationToken ct = default);

    IReadOnlyList<CommunityReportDto> GetCachedReportsSnapshot(bool onlyActive = true);

    Task<CommunityReportActionResponseDto> CreateReportAsync(CreateCommunityReportRequestDto req, CancellationToken ct = default);
    Task<CommunityReportActionResponseDto> CreateQuickPinReportAsync(QuickPinReportRequestDto req, CancellationToken ct = default);
    Task<CommunityReportActionResponseDto> ReportMissingBikeLaneAsync(MissingBikeLaneRequestDto req, CancellationToken ct = default);
    Task<CommunityReportActionResponseDto?> ConfirmReportAsync(int id, CancellationToken ct = default);
    Task<CommunityReportActionResponseDto?> ResolveReportAsync(int id, CancellationToken ct = default);
    IReadOnlyList<HazardCategoryMenuDto> GetHazardCategoryMenu();

    IReadOnlyList<CommunityReportDto> GetHazardsNearGeometry(
        IReadOnlyList<GeoPoint> geometry,
         EcoMutare.Domain.TransportMode mode,
        bool hasDisability,
        double thresholdMeters = 190.0);

    Task<IReadOnlyList<FavoriteRouteDto>> GetFavoriteRoutesAsync(int? userId = null, CancellationToken ct = default);
    IReadOnlyList<FavoriteRoute> GetCachedFavoriteRoutesSnapshot();
    Task<FavoriteRouteDto> CreateFavoriteRouteAsync(CreateFavoriteRouteRequestDto req, CancellationToken ct = default);
    Task<FavoriteRoute?> GetFavoriteRouteByIdAsync(int id, CancellationToken ct = default);
    Task<bool> DeleteFavoriteRouteAsync(int id, CancellationToken ct = default);
}

public class CommunityIntelligenceService : ICommunityIntelligenceService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IMemoryCache _cache;
    private readonly ILogger<CommunityIntelligenceService> _logger;

    private readonly List<CommunityReport> _memoryReports = new();
    private readonly List<FavoriteRoute> _memoryFavorites = new();
    private readonly object _sync = new();
    private bool _dbSynced;
    private int _nextReportId = 100;
    private int _nextFavoriteId = 100;

    public CommunityIntelligenceService(
        IServiceScopeFactory scopeFactory,
        IHttpClientFactory httpClientFactory,
        IMemoryCache cache,
        ILogger<CommunityIntelligenceService> logger)
    {
        _scopeFactory = scopeFactory;
        _httpClientFactory = httpClientFactory;
        _cache = cache;
        _logger = logger;

        SeedInitialMemoryData();
    }

    public IReadOnlyList<CommunityReportDto> GetCachedReportsSnapshot(bool onlyActive = true)
    {
        EnsureSyncedWithDatabase();
        lock (_sync)
        {
            return _memoryReports
                .Where(r => !onlyActive || r.IsActive)
                .Select(r => MapReportDto(r, null))
                .ToList();
        }
    }

    public IReadOnlyList<FavoriteRoute> GetCachedFavoriteRoutesSnapshot()
    {
        EnsureSyncedWithDatabase();
        lock (_sync)
        {
            return _memoryFavorites.ToList();
        }
    }

    public async Task<IReadOnlyList<CommunityReportDto>> GetReportsAsync(
        CommunityReportCategory? category = null,
        GeoPoint? near = null,
        double radiusMeters = 1500,
        bool onlyActive = true,
        bool includeOfficialSesizari = true,
        CancellationToken ct = default)
    {
        EnsureSyncedWithDatabase();

        List<CommunityReport> baseList;
        HashSet<string> existingExtIds;
        lock (_sync)
        {
            baseList = _memoryReports
                .Where(r => !onlyActive || r.IsActive)
                .ToList();

            existingExtIds = _memoryReports
                .Where(r => !string.IsNullOrWhiteSpace(r.ExternalSesizariId))
                .Select(r => r.ExternalSesizariId!)
                .ToHashSet(StringComparer.OrdinalIgnoreCase);
        }

        var dtos = baseList.Select(r => MapReportDto(r, near)).ToList();

        if (includeOfficialSesizari)
        {
            var official = await FetchOfficialSesizariReportsAsync(near, ct);
            dtos.AddRange(official.Where(o =>
                string.IsNullOrWhiteSpace(o.ExternalSesizariId) ||
                !existingExtIds.Contains(o.ExternalSesizariId)));
        }

        if (category.HasValue)
        {
            dtos = dtos.Where(r => r.Category == category.Value).ToList();
        }

        if (near is not null)
        {
            dtos = dtos
                .Where(r => (r.DistanceMetersFromQuery ?? double.MaxValue) <= radiusMeters)
                .OrderBy(r => r.DistanceMetersFromQuery)
                .ThenByDescending(r => r.ConfirmationsCount)
                .ToList();
        }
        else
        {
            dtos = dtos
                .OrderByDescending(r => r.ConfirmationsCount)
                .ThenByDescending(r => r.CreatedAt)
                .ToList();
        }

        return dtos;
    }

    public async Task<CommunityReportActionResponseDto> CreateReportAsync(CreateCommunityReportRequestDto req, CancellationToken ct = default)
    {
        EnsureSyncedWithDatabase();

        string streetOrZone = string.IsNullOrWhiteSpace(req.StreetOrZone) ||
                              req.StreetOrZone.Trim().Equals("Timișoara", StringComparison.OrdinalIgnoreCase)
            ? ResolveNearestTimisoaraZoneName(req.Latitude, req.Longitude)
            : req.StreetOrZone.Trim();

        string title = string.IsNullOrWhiteSpace(req.Title)
            ? GetDefaultTitle(req.Category, streetOrZone)
            : req.Title.Trim();

        string description = string.IsNullOrWhiteSpace(req.Description)
            ? GetDefaultDescription(req.Category, streetOrZone)
            : req.Description.Trim();

        var modes = req.AffectedModes is { Count: > 0 }
            ? req.AffectedModes
            : GetDefaultAffectedModes(req.Category, req.AffectsWheelchair);

        string officialUrl = req.Category == CommunityReportCategory.MissingBikeLane
            ? "https://decidem.primariatm.ro"
            : "https://sesizari.primariatm.ro";

        var entity = new CommunityReport
        {
            Category = req.Category,
            Title = title,
            Description = description,
            StreetOrZone = streetOrZone,
            Latitude = req.Latitude,
            Longitude = req.Longitude,
            AffectedModesCsv = string.Join(",", modes),
            AffectsWheelchair = req.AffectsWheelchair || req.Category == CommunityReportCategory.InaccessibleArea,
            ConfirmationsCount = 1,
            ResolvedVotesCount = 0,
            IsActive = true,
            Source = "BeGreen Crowd Report",
            OfficialActionUrl = officialUrl,
            ReportedByUserId = req.UserId,
            CreatedAt = DateTime.UtcNow
        };

        int awardedPoints = 15;
        await SaveReportToDbAndMemoryAsync(entity, req.UserId, awardedPoints, ct);

        string channelNote = req.Category == CommunityReportCategory.MissingBikeLane
            ? "Prijava je dodana u Green Intelligence 500m mrežu za planiranje novih biciklističkih staza i pripremljena za participativni proračun na https://decidem.primariatm.ro."
            : "Prijava je odmah aktivna u BeGreen sloju u stvarnom vremenu za preusmjeravanje ruta. Za trajni komunalni popravak od strane službi Grada Temišvara povežite prijavu na https://sesizari.primariatm.ro.";

        return new CommunityReportActionResponseDto
        {
            Report = MapReportDto(entity, null),
            AwardedEcoPoints = awardedPoints,
            Message = $"Hvala! Vaša crowd prijava ('{entity.Title}') je aktivna na karti i u planeru ruta (+{awardedPoints} eko-bodova).",
            OfficialCityIntegrationNote = channelNote
        };
    }

    public async Task<CommunityReportActionResponseDto> CreateQuickPinReportAsync(QuickPinReportRequestDto req, CancellationToken ct = default)
    {
        string zone = ResolveNearestTimisoaraZoneName(req.Latitude, req.Longitude);
        string subtype = string.IsNullOrWhiteSpace(req.Subtype) ? string.Empty : req.Subtype.Trim();

        if (req.Category == CommunityReportCategory.MissingBikeLane)
        {
            return await ReportMissingBikeLaneAsync(new MissingBikeLaneRequestDto
            {
                StreetOrCorridorName = zone,
                Reason = string.IsNullOrWhiteSpace(req.PhotoOrNote)
                    ? $"Brza prijava s karte{(string.IsNullOrEmpty(subtype) ? "" : $" ({subtype})")}: na potezu {zone} nedostaje sigurna biciklistička staza."
                    : req.PhotoOrNote.Trim(),
                Latitude = req.Latitude,
                Longitude = req.Longitude,
                WeeklyPassesCount = 5,
                UserId = req.UserId
            }, ct);
        }

        string title = string.IsNullOrWhiteSpace(subtype)
            ? GetDefaultTitle(req.Category, zone)
            : $"{subtype} – {zone}";

        string desc = !string.IsNullOrWhiteSpace(req.PhotoOrNote)
            ? req.PhotoOrNote.Trim()
            : GetDefaultDescription(req.Category, zone, subtype);

        return await CreateReportAsync(new CreateCommunityReportRequestDto
        {
            Category = req.Category,
            Title = title,
            Description = desc,
            StreetOrZone = zone,
            Latitude = req.Latitude,
            Longitude = req.Longitude,
            AffectsWheelchair = req.AffectsWheelchair || req.Category == CommunityReportCategory.InaccessibleArea,
            UserId = req.UserId
        }, ct);
    }

    public IReadOnlyList<HazardCategoryMenuDto> GetHazardCategoryMenu() => new List<HazardCategoryMenuDto>
    {
        new()
        {
            Category = CommunityReportCategory.RoadBlockade,
            Label = "Blokada ceste / Radovi",
            Description = "Zatvorena ulica, radovi na kolniku, prometna nesreća ili poplavljeni podvožnjak.",
            Icon = "construction",
            ColorHex = "#E53935",
            RewardEcoPoints = 15,
            DefaultAffectsWheelchair = false,
            QuickSubtypes = new() { "Radovi na cesti", "Zatvorena traka", "Zastoj / sudar", "Poplava nakon kiše" }
        },
        new()
        {
            Category = CommunityReportCategory.BlockedBikeLane,
            Label = "Blokirana biciklistička staza",
            Description = "Parkirani auti, dostavna vozila, kante ili ograda zauzimaju biciklističku stazu.",
            Icon = "directions_bike",
            ColorHex = "#FB8C00",
            RewardEcoPoints = 15,
            DefaultAffectsWheelchair = false,
            QuickSubtypes = new() { "Parkiran auto na stazi", "Građevinska ograda", "Prekopana staza", "Staklo / oštećen asfalt" }
        },
        new()
        {
            Category = CommunityReportCategory.InaccessibleArea,
            Label = "Nedostupno za invalidska kolica",
            Description = "Visoki rubnjak bez rampe, blokiran nogostup, pokvareno dizalo ili rupa na pločniku.",
            Icon = "accessible",
            ColorHex = "#8E24AA",
            RewardEcoPoints = 15,
            DefaultAffectsWheelchair = true,
            QuickSubtypes = new() { "Visoki rubnjak bez rampe", "Blokiran nogostup", "Stepenice bez lifta", "Raskopan pješački prijelaz" }
        },
        new()
        {
            Category = CommunityReportCategory.MissingBikeLane,
            Label = "Ovdje fali biciklistička staza!",
            Description = "Prijavi dionicu kojom često prolaziš, a nema sigurne biciklističke infrastrukture (ide u Decidem Timișoara).",
            Icon = "add_road",
            ColorHex = "#2E7D32",
            RewardEcoPoints = 20,
            DefaultAffectsWheelchair = false,
            QuickSubtypes = new() { "Opasno uz gust promet", "Studentski / poslovni koridor", "Fali spoj postojećih staza" }
        },
        new()
        {
            Category = CommunityReportCategory.TransitDisruption,
            Label = "Zastoj javnog prijevoza (STPT)",
            Description = "Zastoj tramvaja ili trolejbusa, kvar vozila ili preskočeni polazak.",
            Icon = "tram",
            ColorHex = "#1E88E5",
            RewardEcoPoints = 15,
            DefaultAffectsWheelchair = false,
            QuickSubtypes = new() { "Zastoj tramvaja", "Kvar kontaktne mreže", "Vozilo bez niske podnice", "Pretrpana stanica" }
        }
    };

    public async Task<CommunityReportActionResponseDto> ReportMissingBikeLaneAsync(MissingBikeLaneRequestDto req, CancellationToken ct = default)
    {
        EnsureSyncedWithDatabase();

        // Provjeri postoji li već aktivna prijava za nedostajuću biciklističku stazu u radijusu 250m
        CommunityReport? existing = null;
        var pt = new GeoPoint { Lat = req.Latitude, Lng = req.Longitude };

        lock (_sync)
        {
            existing = _memoryReports.FirstOrDefault(r =>
                r.IsActive &&
                r.Category == CommunityReportCategory.MissingBikeLane &&
                TimisoaraPublicData.HaversineMeters(pt, new GeoPoint { Lat = r.Latitude, Lng = r.Longitude }) <= 250.0);
        }

        int votesWeight = Math.Clamp(req.WeeklyPassesCount / 2, 1, 5);
        int awardedPoints = 20;

        if (existing is not null)
        {
            existing.ConfirmationsCount += votesWeight;
            await UpdateReportInDbAsync(existing, req.UserId, awardedPoints, ct);

            return new CommunityReportActionResponseDto
            {
                Report = MapReportDto(existing, null),
                AwardedEcoPoints = awardedPoints,
                Message = $"Vaš glas je pribrojen postojećoj inicijativi za biciklističku stazu '{existing.StreetOrZone}' (ukupno {existing.ConfirmationsCount} potvrda građana, +{awardedPoints} eko-bodova)!",
                OfficialCityIntegrationNote = "Ova dionica sada ima povećani GapScore u Green Intelligence sustavu te generira prijedlog za https://decidem.primariatm.ro."
            };
        }

        var createReq = new CreateCommunityReportRequestDto
        {
            Category = CommunityReportCategory.MissingBikeLane,
            Title = $"Nedostaje biciklistička staza: {req.StreetOrCorridorName}",
            Description = string.IsNullOrWhiteSpace(req.Reason)
                ? $"Građani prijavljuju čest prolazak ({req.WeeklyPassesCount}x tjedno) bez sigurne biciklističke infrastrukture."
                : req.Reason,
            StreetOrZone = req.StreetOrCorridorName,
            Latitude = req.Latitude,
            Longitude = req.Longitude,
            AffectedModes = new List<EcoMutare.Domain.TransportMode> { EcoMutare.Domain.TransportMode.Bike, EcoMutare.Domain.TransportMode.Scooter },
            AffectsWheelchair = false,
            UserId = req.UserId
        };

        var created = await CreateReportAsync(createReq, ct);
        if (votesWeight > 1)
        {
            await ConfirmReportAsync(created.Report.Id, ct);
        }

        created.AwardedEcoPoints = awardedPoints;
        return created;
    }

    public async Task<CommunityReportActionResponseDto?> ConfirmReportAsync(int id, CancellationToken ct = default)
    {
        EnsureSyncedWithDatabase();

        CommunityReport? target;
        lock (_sync)
        {
            target = _memoryReports.FirstOrDefault(r => r.Id == id);
        }

        if (target is null)
        {
            target = await TryPromoteOfficialSesizariReportAsync(id, ct);
            if (target is null) return null;
        }

        lock (_sync)
        {
            target.ConfirmationsCount++;
        }

        await UpdateReportInDbAsync(target, null, 5, ct);

        return new CommunityReportActionResponseDto
        {
            Report = MapReportDto(target, null),
            AwardedEcoPoints = 5,
            Message = $"Potvrđeno (👍 ukupno {target.ConfirmationsCount} potvrda). Hvala što pomažete zajednici u Timișoari!",
            OfficialCityIntegrationNote = target.ConfirmationsCount >= 3
                ? "Status: COMMUNITY VERIFIED (3+ potvrde građana na terenu)."
                : "Prijava čeka dodatne potvrde za status Community Verified."
        };
    }

    public async Task<CommunityReportActionResponseDto?> ResolveReportAsync(int id, CancellationToken ct = default)
    {
        EnsureSyncedWithDatabase();

        CommunityReport? target;
        lock (_sync)
        {
            target = _memoryReports.FirstOrDefault(r => r.Id == id);
        }

        if (target is null)
        {
            target = await TryPromoteOfficialSesizariReportAsync(id, ct);
            if (target is null) return null;
        }

        lock (_sync)
        {
            target.ResolvedVotesCount++;
            // Za privremene blokade na cesti 2 glasa (ili 1 izravni resolve) gase upozorenje na ruti
            if (target.Category != CommunityReportCategory.MissingBikeLane && target.ResolvedVotesCount >= 2)
            {
                target.IsActive = false;
            }
        }

        await UpdateReportInDbAsync(target, null, 5, ct);

        return new CommunityReportActionResponseDto
        {
            Report = MapReportDto(target, null),
            AwardedEcoPoints = 5,
            Message = target.IsActive
                ? $"Zabilježen glas da je prepreka uklonjena ({target.ResolvedVotesCount}/2)."
                : $"Blokada '{target.Title}' je označena kao RIJEŠENA i uklonjena s aktivnih ruta!"
        };
    }

    private async Task<CommunityReport?> TryPromoteOfficialSesizariReportAsync(int id, CancellationToken ct)
    {
        if (id < 9000) return null;

        if (!_cache.TryGetValue("primaria_tm_sesizari_live", out List<CommunityReportDto>? cached) || cached is null)
        {
            cached = (await FetchOfficialSesizariReportsAsync(null, ct)).ToList();
        }

        var extDto = cached.FirstOrDefault(c => c.Id == id);
        if (extDto is null) return null;

        lock (_sync)
        {
            if (!string.IsNullOrWhiteSpace(extDto.ExternalSesizariId))
            {
                var existing = _memoryReports.FirstOrDefault(r =>
                    string.Equals(r.ExternalSesizariId, extDto.ExternalSesizariId, StringComparison.OrdinalIgnoreCase));
                if (existing is not null) return existing;
            }
        }

        var promoted = new CommunityReport
        {
            Category = extDto.Category,
            Title = extDto.Title,
            Description = extDto.Description,
            StreetOrZone = extDto.StreetOrZone,
            Latitude = extDto.Location.Lat,
            Longitude = extDto.Location.Lng,
            AffectedModesCsv = string.Join(",", extDto.AffectedModes),
            AffectsWheelchair = extDto.AffectsWheelchair,
            ConfirmationsCount = extDto.ConfirmationsCount,
            ResolvedVotesCount = extDto.ResolvedVotesCount,
            IsActive = extDto.IsActive,
            Source = extDto.Source,
            ExternalSesizariId = extDto.ExternalSesizariId,
            OfficialActionUrl = extDto.OfficialActionUrl,
            CreatedAt = extDto.CreatedAt
        };

        await SaveReportToDbAndMemoryAsync(promoted, null, 0, ct);
        return promoted;
    }

    public IReadOnlyList<CommunityReportDto> GetHazardsNearGeometry(
        IReadOnlyList<GeoPoint> geometry,
        EcoMutare.Domain.TransportMode mode,
        bool hasDisability,
        double thresholdMeters = 190.0)
    {
        if (geometry is null || geometry.Count == 0) return Array.Empty<CommunityReportDto>();

        EnsureSyncedWithDatabase();

        List<CommunityReport> activeReports;
        lock (_sync)
        {
            activeReports = _memoryReports.Where(r => r.IsActive).ToList();
        }

        var matched = new List<CommunityReportDto>();

        foreach (var report in activeReports)
        {
            var modes = ParseAffectedModes(report.AffectedModesCsv);
            bool affectsThisMode = modes.Contains(mode) ||
                                   (mode == EcoMutare.Domain.TransportMode.Combined && (modes.Contains(EcoMutare.Domain.TransportMode.Bike) || modes.Contains(EcoMutare.Domain.TransportMode.PublicTransport))) ||
                                   (hasDisability && report.AffectsWheelchair);

            if (!affectsThisMode) continue;

            var repPt = new GeoPoint { Lat = report.Latitude, Lng = report.Longitude };
            double minDistance = GetMinDistanceToPolylineMeters(repPt, geometry);

            if (minDistance <= thresholdMeters)
            {
                var dto = MapReportDto(report, null);
                dto.DistanceMetersFromQuery = Math.Round(minDistance, 1);
                matched.Add(dto);
            }
        }

        return matched
            .OrderByDescending(m => m.Category == CommunityReportCategory.InaccessibleArea)
            .ThenByDescending(m => m.ConfirmationsCount)
            .ToList();
    }

    public async Task<IReadOnlyList<FavoriteRouteDto>> GetFavoriteRoutesAsync(int? userId = null, CancellationToken ct = default)
    {
        EnsureSyncedWithDatabase();

        List<FavoriteRoute> favs;
        lock (_sync)
        {
            favs = _memoryFavorites
                .Where(f => !userId.HasValue || f.UserId == userId.Value || f.UserId == null)
                .OrderByDescending(f => f.WeeklyFrequency)
                .ThenByDescending(f => f.CreatedAt)
                .ToList();
        }

        await Task.CompletedTask;
        return favs.Select(MapFavoriteRouteDto).ToList();
    }

    public async Task<FavoriteRouteDto> CreateFavoriteRouteAsync(CreateFavoriteRouteRequestDto req, CancellationToken ct = default)
    {
        EnsureSyncedWithDatabase();

        var entity = new FavoriteRoute
        {
            UserId = req.UserId,
            Name = string.IsNullOrWhiteSpace(req.Name) ? $"{req.OriginName} → {req.DestinationName}" : req.Name.Trim(),
            OriginName = req.OriginName.Trim(),
            OriginLat = req.OriginLat,
            OriginLng = req.OriginLng,
            DestinationName = req.DestinationName.Trim(),
            DestinationLat = req.DestinationLat,
            DestinationLng = req.DestinationLng,
            PreferredMode = req.PreferredMode,
            WeeklyFrequency = Math.Clamp(req.WeeklyFrequency, 1, 21),
            MissingBikeLaneOnRoute = req.MissingBikeLaneOnRoute,
            RequiresStepFreeAccess = req.RequiresStepFreeAccess,
            Notes = req.Notes.Trim(),
            CreatedAt = DateTime.UtcNow
        };

        await SaveFavoriteToDbAndMemoryAsync(entity, ct);

        // Ako je korisnik označio da na njegovoj omiljenoj ruti fali biciklistička staza,
        // automatski kreiraj ili pojačaj MissingBikeLane prijavu na središnjoj točki rute!
        if (req.MissingBikeLaneOnRoute)
        {
            double midLat = Math.Round((req.OriginLat + req.DestinationLat) / 2.0, 5);
            double midLng = Math.Round((req.OriginLng + req.DestinationLng) / 2.0, 5);

            await ReportMissingBikeLaneAsync(new MissingBikeLaneRequestDto
            {
                StreetOrCorridorName = $"{req.OriginName} – {req.DestinationName}",
                Reason = $"Korisnik redovito prolazi ovom Favorite rutom ({req.WeeklyFrequency}x tjedno) i prijavljuje nedostatak biciklističke staze. {req.Notes}".Trim(),
                Latitude = midLat,
                Longitude = midLng,
                WeeklyPassesCount = req.WeeklyFrequency,
                UserId = req.UserId
            }, ct);
        }

        return MapFavoriteRouteDto(entity);
    }

    public Task<FavoriteRoute?> GetFavoriteRouteByIdAsync(int id, CancellationToken ct = default)
    {
        EnsureSyncedWithDatabase();
        lock (_sync)
        {
            var found = _memoryFavorites.FirstOrDefault(f => f.Id == id);
            return Task.FromResult(found);
        }
    }

    public async Task<bool> DeleteFavoriteRouteAsync(int id, CancellationToken ct = default)
    {
        EnsureSyncedWithDatabase();
        bool removed;
        lock (_sync)
        {
            var item = _memoryFavorites.FirstOrDefault(f => f.Id == id);
            if (item is null) return false;
            removed = _memoryFavorites.Remove(item);
        }

        try
        {
            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var dbItem = await db.FavoriteRoutes.FindAsync(new object[] { id }, ct);
            if (dbItem is not null)
            {
                db.FavoriteRoutes.Remove(dbItem);
                await db.SaveChangesAsync(ct);
            }
        }
        catch (Exception ex)
        {
            _logger.LogDebug("Sinkronizacija brisanja FavoriteRoute u MySQL nije uspjela: {Msg}", ex.Message);
        }

        return removed;
    }

    private FavoriteRouteDto MapFavoriteRouteDto(FavoriteRoute f)
    {
        var origin = new GeoPoint { Lat = f.OriginLat, Lng = f.OriginLng };
        var dest = new GeoPoint { Lat = f.DestinationLat, Lng = f.DestinationLng };
        var mid = new GeoPoint { Lat = (f.OriginLat + f.DestinationLat) / 2.0, Lng = (f.OriginLng + f.DestinationLng) / 2.0 };

        var corridorGeometry = new List<GeoPoint> { origin, mid, dest };
        var hazards = GetHazardsNearGeometry(
                corridorGeometry,
                f.PreferredMode,
                f.RequiresStepFreeAccess,
                thresholdMeters: 280.0)
            .Where(h => h.Category != CommunityReportCategory.MissingBikeLane)
            .ToList();

        double nearestLaneDist = CalculateMinDistanceToBikeCorridorsMeters(mid);

        string statusMsg = hazards.Count > 0
            ? $"⚠️ Upozorenje zajednice na omiljenoj ruti: {hazards[0].Title} ({hazards[0].StreetOrZone}, {hazards[0].ConfirmationsCount} potvrda). Preporučujemo provjeru alternativne rute."
            : "✅ Nema prijavljenih blokada na vašoj omiljenoj ruti.";

        if (f.MissingBikeLaneOnRoute)
        {
            statusMsg += $" | 🚲 Koridor bilježi {f.WeeklyFrequency} vožnji/tjedno u Green Intelligence sustavu za novu biciklističku stazu.";
        }

        return new FavoriteRouteDto
        {
            Id = f.Id,
            UserId = f.UserId,
            Name = f.Name,
            OriginName = f.OriginName,
            Origin = origin,
            DestinationName = f.DestinationName,
            Destination = dest,
            PreferredMode = f.PreferredMode,
            WeeklyFrequency = f.WeeklyFrequency,
            MissingBikeLaneOnRoute = f.MissingBikeLaneOnRoute,
            RequiresStepFreeAccess = f.RequiresStepFreeAccess,
            Notes = f.Notes,
            HasActiveBlockadeOrHazard = hazards.Count > 0,
            ActiveHazardsOnRouteCount = hazards.Count,
            ActiveHazardsOnRoute = hazards,
            LiveCommuteStatusMessage = statusMsg,
            DistanceToNearestBikeLaneMeters = Math.Round(nearestLaneDist, 1),
            CreatedAt = f.CreatedAt
        };
    }

    /// <summary>
    /// Dohvaća stvarne javne prijave građana sa službenog endpointa Grada Temišvara:
    /// GET https://sesizari.primariatm.ro/api/sesizari (prema ghid-pmt.vercel.app/unihack#ep-reports).
    /// Rezultat se sprema u cache na 15 min (pravilo: "download it once rather than polling") i čisti od osobnih podataka (GDPR).
    /// </summary>
    private async Task<IReadOnlyList<CommunityReportDto>> FetchOfficialSesizariReportsAsync(GeoPoint? near, CancellationToken ct)
    {
        const string cacheKey = "primaria_tm_sesizari_live";
        if (!_cache.TryGetValue(cacheKey, out List<CommunityReportDto>? cached) || cached is null)
        {
            cached = new List<CommunityReportDto>();
            try
            {
                using var client = _httpClientFactory.CreateClient();
                client.Timeout = TimeSpan.FromSeconds(2.5);
                client.DefaultRequestHeaders.UserAgent.ParseAdd("EcoMutare-UniHack8/1.0");

                var endDate = DateTime.UtcNow.AddDays(1).ToString("yyyy-MM-dd");
                var startDate = DateTime.UtcNow.AddDays(-7).ToString("yyyy-MM-dd");
                var url = $"https://sesizari.primariatm.ro/api/sesizari?startDate={startDate}&endDate={endDate}&lat=45.7537&lng=21.2257&radiusMeters=1000&limit=12";

                using var resp = await client.GetAsync(url, ct);
                if (resp.IsSuccessStatusCode)
                {
                    await using var stream = await resp.Content.ReadAsStreamAsync(ct);
                    using var doc = await JsonDocument.ParseAsync(stream, cancellationToken: ct);

                    if (doc.RootElement.ValueKind == JsonValueKind.Array)
                    {
                        int extSeq = 9000;
                        foreach (var item in doc.RootElement.EnumerateArray())
                        {
                            var status = item.TryGetProperty("status", out var stProp) ? stProp.GetString() ?? "" : "";
                            if (status.Equals("Finalizata", StringComparison.OrdinalIgnoreCase)) continue;

                            string catName = item.TryGetProperty("categorii", out var catObj) && catObj.ValueKind == JsonValueKind.Object && catObj.TryGetProperty("nume", out var cn)
                                ? cn.GetString() ?? "Sesizări"
                                : "Sesizări";

                            string subCatName = item.TryGetProperty("subcategorii", out var subObj) && subObj.ValueKind == JsonValueKind.Object && subObj.TryGetProperty("nume", out var sn)
                                ? sn.GetString() ?? catName
                                : catName;

                            // Filtriramo samo prometne, ulične i trotoarske prijave relevantne za mobilnost
                            if (!catName.Contains("Trafic", StringComparison.OrdinalIgnoreCase) &&
                                !catName.Contains("Străzi", StringComparison.OrdinalIgnoreCase) &&
                                !catName.Contains("trotuare", StringComparison.OrdinalIgnoreCase) &&
                                !subCatName.Contains("piste", StringComparison.OrdinalIgnoreCase) &&
                                !subCatName.Contains("carosabil", StringComparison.OrdinalIgnoreCase))
                            {
                                continue;
                            }

                            if (!item.TryGetProperty("locatie", out var locObj) ||
                                !locObj.TryGetProperty("coordinates", out var coords) ||
                                coords.ValueKind != JsonValueKind.Array ||
                                coords.GetArrayLength() < 2)
                            {
                                continue;
                            }

                            // Pazi na upozorenje iz vodiča (#pitfalls): "locatie is a GeoJSON point, [lng, lat]"!
                            double lng = coords[0].GetDouble();
                            double lat = coords[1].GetDouble();

                            string sId = item.TryGetProperty("webconInstanceNr", out var wProp)
                                ? wProp.GetString() ?? $"SZN-{extSeq}"
                                : $"SZN-{extSeq}";

                            bool isSidewalk = catName.Contains("trotuare", StringComparison.OrdinalIgnoreCase) ||
                                              subCatName.Contains("trotuar", StringComparison.OrdinalIgnoreCase);

                            cached.Add(new CommunityReportDto
                            {
                                Id = extSeq++,
                                Category = isSidewalk ? CommunityReportCategory.InaccessibleArea : CommunityReportCategory.RoadBlockade,
                                Title = $"Sesizări #{sId}: {subCatName}",
                                // GDPR pravilo iz vodiča: ne objavljujemo sirovi tekst građana ako sadrži osobne podatke/tablice
                                Description = $"Službena prijava građana u sustavu Primăria Timișoara ({catName} – Status: {status}).",
                                StreetOrZone = "Timișoara (Sesizări Live)",
                                Location = new GeoPoint { Lat = lat, Lng = lng },
                                AffectedModes = isSidewalk
                                    ? new List<EcoMutare.Domain.TransportMode> { EcoMutare.Domain.TransportMode.Walk, EcoMutare.Domain.TransportMode.Bike, EcoMutare.Domain.TransportMode.Scooter }
                                    : new List<EcoMutare.Domain.TransportMode> { EcoMutare.Domain.TransportMode.Bike, EcoMutare.Domain.TransportMode.Scooter, EcoMutare.Domain.TransportMode.Car },
                                AffectsWheelchair = isSidewalk,
                                ConfirmationsCount = 3,
                                IsActive = true,
                                Source = "Primăria Timișoara – Sesizări Live (sesizari.primariatm.ro)",
                                ExternalSesizariId = sId,
                                OfficialActionUrl = "https://sesizari.primariatm.ro",
                                OfficialChannelLabel = "Otvori na sesizari.primariatm.ro",
                                CreatedAt = DateTime.UtcNow.AddHours(-6)
                            });
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogDebug("Dohvat uživo sa sesizari.primariatm.ro nije uspio (koristimo lokalne prijave građana): {Message}", ex.Message);
            }

            _cache.Set(cacheKey, cached, TimeSpan.FromMinutes(15));
        }

        return cached.Select(c =>
        {
            var copy = new CommunityReportDto
            {
                Id = c.Id,
                Category = c.Category,
                Title = c.Title,
                Description = c.Description,
                StreetOrZone = c.StreetOrZone,
                Location = c.Location,
                AffectedModes = c.AffectedModes,
                AffectsWheelchair = c.AffectsWheelchair,
                ConfirmationsCount = c.ConfirmationsCount,
                ResolvedVotesCount = c.ResolvedVotesCount,
                IsActive = c.IsActive,
                Source = c.Source,
                ExternalSesizariId = c.ExternalSesizariId,
                OfficialActionUrl = c.OfficialActionUrl,
                OfficialChannelLabel = c.OfficialChannelLabel,
                CreatedAt = c.CreatedAt
            };
            if (near is not null)
            {
                copy.DistanceMetersFromQuery = Math.Round(TimisoaraPublicData.HaversineMeters(near, c.Location), 1);
            }
            return copy;
        }).ToList();
    }

    private void EnsureSyncedWithDatabase()
    {
        if (_dbSynced) return;

        lock (_sync)
        {
            if (_dbSynced) return;
            _dbSynced = true;

            try
            {
                using var scope = _scopeFactory.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                db.Database.EnsureCreated();

                if (!db.CommunityReports.Any())
                {
                    foreach (var seedReport in _memoryReports)
                    {
                        seedReport.Id = 0;
                        db.CommunityReports.Add(seedReport);
                    }
                    db.SaveChanges();
                }

                var dbReports = db.CommunityReports.AsNoTracking().ToList();
                if (dbReports.Count > 0)
                {
                    _memoryReports.Clear();
                    _memoryReports.AddRange(dbReports);
                    _nextReportId = Math.Max(100, _memoryReports.Max(r => r.Id) + 1);
                }

                if (!db.FavoriteRoutes.Any())
                {
                    foreach (var seedFav in _memoryFavorites)
                    {
                        seedFav.Id = 0;
                        db.FavoriteRoutes.Add(seedFav);
                    }
                    db.SaveChanges();
                }

                var dbFavs = db.FavoriteRoutes.AsNoTracking().ToList();
                if (dbFavs.Count > 0)
                {
                    _memoryFavorites.Clear();
                    _memoryFavorites.AddRange(dbFavs);
                    _nextFavoriteId = Math.Max(100, _memoryFavorites.Max(f => f.Id) + 1);
                }
            }
            catch (Exception ex)
            {
                _logger.LogDebug("MySQL baza trenutno nije dostupna za sinkronizaciju prijava zajednice – radimo iz in-memory spremnika ({Msg}).", ex.Message);
            }
        }
    }

    private async Task SaveReportToDbAndMemoryAsync(CommunityReport entity, int? userId, int bonusPoints, CancellationToken ct)
    {
        try
        {
            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            db.CommunityReports.Add(entity);

            if (userId.HasValue && bonusPoints > 0)
            {
                var user = await db.Users.FindAsync(new object[] { userId.Value }, ct);
                if (user is not null)
                {
                    user.PointsBalance += bonusPoints;
                    db.PointTransactions.Add(new PointTransaction
                    {
                        UserId = user.Id,
                        Points = bonusPoints,
                        Type = PointTransactionType.Bonus,
                        Description = $"Prijava prepreke u zajednici: {entity.Title}"
                    });
                }
            }

            await db.SaveChangesAsync(ct);
        }
        catch (Exception ex)
        {
            _logger.LogDebug("Spremanje CommunityReport u MySQL nije uspjelo, koristi se lokalni ID: {Msg}", ex.Message);
        }

        lock (_sync)
        {
            if (entity.Id == 0)
            {
                entity.Id = _nextReportId++;
            }
            _memoryReports.Add(entity);
        }
    }

    private async Task UpdateReportInDbAsync(CommunityReport entity, int? userId, int bonusPoints, CancellationToken ct)
    {
        try
        {
            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var dbReport = await db.CommunityReports.FindAsync(new object[] { entity.Id }, ct);
            if (dbReport is not null)
            {
                dbReport.ConfirmationsCount = entity.ConfirmationsCount;
                dbReport.ResolvedVotesCount = entity.ResolvedVotesCount;
                dbReport.IsActive = entity.IsActive;
                await db.SaveChangesAsync(ct);
            }
        }
        catch (Exception ex)
        {
            _logger.LogDebug("Ažuriranje CommunityReport u MySQL nije uspjelo: {Msg}", ex.Message);
        }
    }

    private async Task SaveFavoriteToDbAndMemoryAsync(FavoriteRoute entity, CancellationToken ct)
    {
        try
        {
            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            db.FavoriteRoutes.Add(entity);
            await db.SaveChangesAsync(ct);
        }
        catch (Exception ex)
        {
            _logger.LogDebug("Spremanje FavoriteRoute u MySQL nije uspjelo, koristi se lokalni ID: {Msg}", ex.Message);
        }

        lock (_sync)
        {
            if (entity.Id == 0)
            {
                entity.Id = _nextFavoriteId++;
            }
            _memoryFavorites.Add(entity);
        }
    }

    private static CommunityReportDto MapReportDto(CommunityReport r, GeoPoint? near)
    {
        var loc = new GeoPoint { Lat = r.Latitude, Lng = r.Longitude };
        double? dist = near is not null ? Math.Round(TimisoaraPublicData.HaversineMeters(near, loc), 1) : null;

        string label = r.Category == CommunityReportCategory.MissingBikeLane
            ? "Podrži prijedlog za proračun na decidem.primariatm.ro"
            : "Prijavi komunalnoj službi na sesizari.primariatm.ro";

        return new CommunityReportDto
        {
            Id = r.Id,
            Category = r.Category,
            Title = r.Title,
            Description = r.Description,
            StreetOrZone = r.StreetOrZone,
            Location = loc,
            AffectedModes = ParseAffectedModes(r.AffectedModesCsv),
            AffectsWheelchair = r.AffectsWheelchair,
            ConfirmationsCount = r.ConfirmationsCount,
            ResolvedVotesCount = r.ResolvedVotesCount,
            IsActive = r.IsActive,
            Source = r.Source,
            ExternalSesizariId = r.ExternalSesizariId,
            OfficialActionUrl = r.OfficialActionUrl,
            OfficialChannelLabel = label,
            DistanceMetersFromQuery = dist,
            CreatedAt = r.CreatedAt
        };
    }

    private static List<EcoMutare.Domain.TransportMode> ParseAffectedModes(string csv)
    {
        var result = new List<EcoMutare.Domain.TransportMode>();
        if (string.IsNullOrWhiteSpace(csv)) return result;

        foreach (var part in csv.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
        {
            if (Enum.TryParse<EcoMutare.Domain.TransportMode>(part, ignoreCase: true, out var mode))
            {
                result.Add(mode);
            }
        }
        return result;
    }

    private static List<EcoMutare.Domain.TransportMode> GetDefaultAffectedModes(CommunityReportCategory category, bool wheelchair) =>
        category switch
        {
            CommunityReportCategory.BlockedBikeLane => new() { EcoMutare.Domain.TransportMode.Bike, EcoMutare.Domain.TransportMode.Scooter, EcoMutare.Domain.TransportMode.Combined },
            CommunityReportCategory.MissingBikeLane => new() { EcoMutare.Domain.TransportMode.Bike, EcoMutare.Domain.TransportMode.Scooter, EcoMutare.Domain.TransportMode.Combined },
            CommunityReportCategory.InaccessibleArea => new() { EcoMutare.Domain.TransportMode.Walk, EcoMutare.Domain.TransportMode.PublicTransport },
            CommunityReportCategory.TransitDisruption => new() { EcoMutare.Domain.TransportMode.PublicTransport, EcoMutare.Domain.TransportMode.Combined },
            _ => wheelchair
                ? new() { EcoMutare.Domain.TransportMode.Walk, EcoMutare.Domain.TransportMode.PublicTransport, EcoMutare.Domain.TransportMode.Car }
                : new() { EcoMutare.Domain.TransportMode.Bike, EcoMutare.Domain.TransportMode.Scooter, EcoMutare.Domain.TransportMode.Car, EcoMutare.Domain.TransportMode.Walk }
        };

    private static string GetDefaultTitle(CommunityReportCategory category, string street) =>
        category switch
        {
            CommunityReportCategory.BlockedBikeLane => $"Blokirana biciklistička staza ({street})",
            CommunityReportCategory.InaccessibleArea => $"Nedostupno područje / barijera za kolica ({street})",
            CommunityReportCategory.MissingBikeLane => $"Nedostaje biciklistička staza ({street})",
            CommunityReportCategory.TransitDisruption => $"Zastoj javnog prijevoza ({street})",
            _ => $"Blokada na cesti ({street})"
        };

    private static string GetDefaultDescription(CommunityReportCategory category, string street, string? subtype = null)
    {
        string prefix = string.IsNullOrWhiteSpace(subtype) ? string.Empty : $"{subtype}: ";
        return category switch
        {
            CommunityReportCategory.BlockedBikeLane => $"{prefix}Građani prijavljuju blokiranu biciklističku stazu na lokaciji {street}. Preporučen oprez ili obilazak.",
            CommunityReportCategory.InaccessibleArea => $"{prefix}Prijavljena arhitektonska barijera ili nedostupan prilaz za invalidska kolica na lokaciji {street}.",
            CommunityReportCategory.MissingBikeLane => $"{prefix}Građani prijavljuju da na potezu {street} nedostaje biciklistička staza unatoč čestom prometu.",
            CommunityReportCategory.TransitDisruption => $"{prefix}Prijavljen zastoj ili kašnjenje javnog prijevoza (STPT) kod lokacije {street}.",
            _ => $"{prefix}Korisnici u aplikaciji prijavili su blokadu ili radove na cesti kod {street}."
        };
    }

    private static string ResolveNearestTimisoaraZoneName(double lat, double lng)
    {
        var landmarks = new (string Name, double Lat, double Lng)[]
        {
            ("Piața Victoriei / Centru", 45.7537, 21.2257),
            ("Pasajul Michelangelo / Bd. Vasile Pârvan", 45.7492, 21.2315),
            ("Universitatea Politehnica (UPT)", 45.7474, 21.2263),
            ("Complexul Studențesc / Strada Cluj", 45.7478, 21.2375),
            ("Universitatea de Vest (UVT)", 45.7471, 21.2316),
            ("Piața Unirii / Cetate", 45.7580, 21.2290),
            ("Iulius Town / Calea Aradului", 45.7660, 21.2288),
            ("Gara Timișoara Nord / Bd. Republicii", 45.7508, 21.2076),
            ("Calea Șagului / Dâmbovița", 45.7315, 21.2125),
            ("Piața Sfânta Maria / Bd. 16 Decembrie 1989", 45.7481, 21.2194),
            ("Calea Buziașului / Zona Industrială SE", 45.7365, 21.2625),
            ("Spitalul Județean / Bd. Liviu Rebreanu", 45.7370, 21.2412),
            ("Malul Begăi / Parcul Rozelor", 45.7505, 21.2305),
            ("Calea Torontalului", 45.7715, 21.2135),
            ("Piața Traian / Fabric", 45.7574, 21.2505)
        };

        var pt = new GeoPoint { Lat = lat, Lng = lng };
        var best = landmarks
            .Select(l => (l.Name, DistM: TimisoaraPublicData.HaversineMeters(pt, new GeoPoint { Lat = l.Lat, Lng = l.Lng })))
            .OrderBy(x => x.DistM)
            .First();

        return best.DistM <= 2500.0 ? best.Name : $"Timișoara ({lat:F4}, {lng:F4})";
    }

    private static double GetMinDistanceToPolylineMeters(GeoPoint point, IReadOnlyList<GeoPoint> polyline)
    {
        if (polyline.Count == 0) return double.MaxValue;
        if (polyline.Count == 1) return TimisoaraPublicData.HaversineMeters(point, polyline[0]);

        double best = double.MaxValue;
        for (int i = 1; i < polyline.Count; i++)
        {
            double d = GreenIntelligenceService.PointToSegmentDistanceMeters(point, polyline[i - 1], polyline[i]);
            if (d < best) best = d;
        }
        return best;
    }

    private static double CalculateMinDistanceToBikeCorridorsMeters(GeoPoint point)
    {
        double best = double.MaxValue;
        foreach (var corridor in TimisoaraPublicData.BikeCorridors)
        {
            double d = GetMinDistanceToPolylineMeters(point, corridor.Points);
            if (d < best) best = d;
        }
        return best;
    }

    private void SeedInitialMemoryData()
    {
        _memoryReports.AddRange(new[]
        {
            new CommunityReport
            {
                Id = 1,
                Category = CommunityReportCategory.BlockedBikeLane,
                Title = "Blokirana biciklistička staza – Pasajul Michelangelo / Bd. Vasile Pârvan",
                Description = "Građevinska ograda i parkirana dostavna vozila zauzimaju biciklističku stazu u smjeru Politehnice (UPT). Preporučen obilazak uz obalu Bege (Malul Begăi).",
                StreetOrZone = "Bulevardul Vasile Pârvan (Pasajul Michelangelo)",
                Latitude = 45.7492,
                Longitude = 21.2315,
                AffectedModesCsv = "Bike,Scooter,Combined",
                AffectsWheelchair = false,
                ConfirmationsCount = 9,
                IsActive = true,
                Source = "BeGreen Crowd Report",
                ExternalSesizariId = "SZN2026-019812",
                OfficialActionUrl = "https://sesizari.primariatm.ro",
                CreatedAt = DateTime.UtcNow.AddMinutes(-45)
            },
            new CommunityReport
            {
                Id = 2,
                Category = CommunityReportCategory.InaccessibleArea,
                Title = "Nedostupan prijelaz za invalidska kolica – Piața Sfânta Maria",
                Description = "Privremeno raskopan nogostup i visoki rubnjak bez rampe kod tramvajske stanice Piața Maria. Osobe u kolicima preusmjeravaju se na niskopodnu stanicu Catedrala Mitropolitană.",
                StreetOrZone = "Piața Sfânta Maria / Bd. 16 Decembrie 1989",
                Latitude = 45.7481,
                Longitude = 21.2194,
                AffectedModesCsv = "Walk,PublicTransport",
                AffectsWheelchair = true,
                ConfirmationsCount = 6,
                IsActive = true,
                Source = "BeGreen Accessibility Crowd",
                ExternalSesizariId = "SZN2026-019839",
                OfficialActionUrl = "https://sesizari.primariatm.ro",
                CreatedAt = DateTime.UtcNow.AddHours(-2)
            },
            new CommunityReport
            {
                Id = 3,
                Category = CommunityReportCategory.RoadBlockade,
                Title = "Radovi na kolniku i suženje – Strada Cluj / Aleea Studenților",
                Description = "Zatvorena desna prometna traka zbog intervencije na instalacijama između Complexul Studențesc i Spitalul Județean.",
                StreetOrZone = "Strada Cluj (Complexul Studențesc)",
                Latitude = 45.7468,
                Longitude = 21.2368,
                AffectedModesCsv = "Car,Bike,Scooter",
                AffectsWheelchair = false,
                ConfirmationsCount = 5,
                IsActive = true,
                Source = "BeGreen Crowd Report",
                OfficialActionUrl = "https://sesizari.primariatm.ro",
                CreatedAt = DateTime.UtcNow.AddMinutes(-80)
            },
            new CommunityReport
            {
                Id = 4,
                Category = CommunityReportCategory.MissingBikeLane,
                Title = "Hitno potrebna biciklistička staza: Calea Șagului → Dâmbovița → Centar",
                Description = "Preko 40 dnevnih biciklista i studenata prijavilo je da na potezu Calea Șagului nema odvojene biciklističke staze unatoč ogromnom svakodnevnom prometu prema UPT-u i centru.",
                StreetOrZone = "Calea Șagului / Dâmbovița",
                Latitude = 45.7315,
                Longitude = 21.2125,
                AffectedModesCsv = "Bike,Scooter,Combined",
                AffectsWheelchair = false,
                ConfirmationsCount = 42,
                IsActive = true,
                Source = "EcoMutare Citizen Demand",
                OfficialActionUrl = "https://decidem.primariatm.ro",
                CreatedAt = DateTime.UtcNow.AddDays(-3)
            },
            new CommunityReport
            {
                Id = 5,
                Category = CommunityReportCategory.MissingBikeLane,
                Title = "Nedostaje biciklistička veza: Calea Aradului / Torontalului → Iulius Town",
                Description = "Velik broj zaposlenika u IT sektoru i studenata USAMVBT-a svakodnevno prolazi ovuda, ali nedostaje zaštićena biciklistička traka koja bi spojila Calea Aradului s Iulius Townom.",
                StreetOrZone = "Calea Aradului / Calea Torontalului",
                Latitude = 45.7745,
                Longitude = 21.2135,
                AffectedModesCsv = "Bike,Scooter,Combined",
                AffectsWheelchair = false,
                ConfirmationsCount = 35,
                IsActive = true,
                Source = "EcoMutare Citizen Demand",
                OfficialActionUrl = "https://decidem.primariatm.ro",
                CreatedAt = DateTime.UtcNow.AddDays(-2)
            },
            new CommunityReport
            {
                Id = 6,
                Category = CommunityReportCategory.MissingBikeLane,
                Title = "Nedostaje biciklistička staza: Calea Buziașului (Industrijska zona SE)",
                Description = "Radnici i stanovnici jugoistočne zone nemaju sigurnu biciklističku poveznicu prema AEM-u i centru grada (udaljenost do najbliže staze > 1.2 km).",
                StreetOrZone = "Calea Buziașului – Zona Industrială SE",
                Latitude = 45.7365,
                Longitude = 21.2625,
                AffectedModesCsv = "Bike,Scooter",
                AffectsWheelchair = false,
                ConfirmationsCount = 29,
                IsActive = true,
                Source = "EcoMutare Citizen Demand",
                OfficialActionUrl = "https://decidem.primariatm.ro",
                CreatedAt = DateTime.UtcNow.AddDays(-1)
            }
        });

        _memoryFavorites.AddRange(new[]
        {
            new FavoriteRoute
            {
                Id = 1,
                UserId = 1,
                Name = "Studentski dom (Complex) → Fakultet (UPT Vasile Pârvan)",
                OriginName = "Complexul Studențesc (Aleea Studenților)",
                OriginLat = 45.7488,
                OriginLng = 21.2392,
                DestinationName = "Universitatea Politehnica (Bd. Vasile Pârvan 2)",
                DestinationLat = 45.7474,
                DestinationLng = 21.2263,
                PreferredMode = EcoMutare.Domain.TransportMode.Bike,
                WeeklyFrequency = 5,
                MissingBikeLaneOnRoute = false,
                RequiresStepFreeAccess = false,
                Notes = "Jutarnja ruta na predavanja; prolazi pokraj Pasajul Michelangelo.",
                CreatedAt = DateTime.UtcNow.AddDays(-5)
            },
            new FavoriteRoute
            {
                Id = 2,
                UserId = 1,
                Name = "Dom (Calea Șagului) → Centar / UPT (Svakodnevni posao & faks)",
                OriginName = "Calea Șagului / Shopping City",
                OriginLat = 45.7315,
                OriginLng = 21.2125,
                DestinationName = "Piața Victoriei / UPT",
                DestinationLat = 45.7537,
                DestinationLng = 21.2257,
                PreferredMode = EcoMutare.Domain.TransportMode.Bike,
                WeeklyFrequency = 5,
                MissingBikeLaneOnRoute = true,
                RequiresStepFreeAccess = false,
                Notes = "Na cijelom južnom dijelu Calea Șagului fali biciklistička staza pa je opasno voziti uz aute.",
                CreatedAt = DateTime.UtcNow.AddDays(-4)
            },
            new FavoriteRoute
            {
                Id = 3,
                UserId = 2,
                Name = "Calea Aradului → Iulius Town (Posao u uredu)",
                OriginName = "Calea Aradului / USAMVBT",
                OriginLat = 45.7745,
                OriginLng = 21.2135,
                DestinationName = "Iulius Town / UBC",
                DestinationLat = 45.7660,
                DestinationLng = 21.2288,
                PreferredMode = EcoMutare.Domain.TransportMode.Scooter,
                WeeklyFrequency = 5,
                MissingBikeLaneOnRoute = true,
                RequiresStepFreeAccess = false,
                Notes = "Brza ruta romobilom, ali fali spojna biciklistička staza od Aradului do Iulius Towna.",
                CreatedAt = DateTime.UtcNow.AddDays(-3)
            },
            new FavoriteRoute
            {
                Id = 4,
                UserId = 3,
                Name = "Pristupačna ruta bez barijera: Centar → UVT",
                OriginName = "Piața Victoriei (Catedrala)",
                OriginLat = 45.7537,
                OriginLng = 21.2257,
                DestinationName = "Universitatea de Vest (UVT)",
                DestinationLat = 45.7478,
                DestinationLng = 21.2316,
                PreferredMode = EcoMutare.Domain.TransportMode.PublicTransport,
                WeeklyFrequency = 4,
                MissingBikeLaneOnRoute = false,
                RequiresStepFreeAccess = true,
                Notes = "Osoba u kolicima – koristi isključivo niskopodne STPT linije i spuštene rubnjake.",
                CreatedAt = DateTime.UtcNow.AddDays(-2)
            }
        });
    }
}
