using EcoMutare.Domain;
using EcoMutare.Dtos;
using EcoMutare.Services.Auth;
using EcoMutare.Services.Community;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EcoMutare.Controllers;

/// Građanske prijave u stvarnom vremenu u Timișoari (1-Tap crowd prijava u aplikaciji + službene prijave):
/// - Blokade cesta i radovi (RoadBlockade),
/// - Nedostupna područja za osobe u invalidskim kolicima / kolica za bebe (InaccessibleArea),
/// - Blokirane biciklističke staze (BlockedBikeLane),
/// - Prijave dionica gdje nema biciklističke staze, a potrebna je zbog čestog prolaska (MissingBikeLane),
/// + čitanje i potvrđivanje pravih prijava sa službenog gradskog portala sesizari.primariatm.ro
/// + Auth0 Bot Detection & Citizen Trust Score (2x/3x težina glasa za verificirane Auth0 korisnike).

[ApiController]
public class CommunityReportsController : ControllerBase
{
    private const int MaxPhotoRequestBytes = 6 * 1024 * 1024;

    private readonly ICommunityIntelligenceService _community;
    private readonly ReportPhotoStore _photos;

    public CommunityReportsController(ICommunityIntelligenceService community, ReportPhotoStore photos)
    {
        _community = community;
        _photos = photos;
    }

    /// <summary>
    /// Vraća sve aktivne građanske prijave u Timișoari (blokade cesta, nedostupna područja, blokirane staze,
    /// prijave gdje fali biciklistička staza) te spaja službene prijave s sesizari.primariatm.ro.
    /// </summary>
    [HttpGet("hazards")]
    [HttpGet("reports")]
    [ProducesResponseType(typeof(IEnumerable<CommunityReportDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<CommunityReportDto>>> GetReports(
        [FromQuery] CommunityReportCategory? category = null,
        [FromQuery] double? lat = null,
        [FromQuery] double? lng = null,
        [FromQuery] double radiusMeters = 2500,
        [FromQuery] bool onlyActive = true,
        [FromQuery] bool includeOfficialSesizari = true,
        CancellationToken ct = default)
    {
        GeoPoint? near = lat.HasValue && lng.HasValue
            ? new GeoPoint { Lat = lat.Value, Lng = lng.Value }
            : null;

        var reports = await _community.GetReportsAsync(category, near, radiusMeters, onlyActive, includeOfficialSesizari, ct);
        return Ok(reports);
    }

    /// <summary>
    /// Vraća 1-Tap izbornik kategorija za gumb "+" u aplikaciji (ikone, boje, brze podkategorije i EcoPoints nagrade).
    /// </summary>
    [HttpGet("hazards/categories")]
    [HttpGet("reports/categories")]
    [ProducesResponseType(typeof(IEnumerable<HazardCategoryMenuDto>), StatusCodes.Status200OK)]
    public ActionResult<IEnumerable<HazardCategoryMenuDto>> GetHazardCategories() =>
        Ok(_community.GetHazardCategoryMenu());

    /// <summary>
    /// Nova crowd prijava u aplikaciji (blokada na cesti, nedostupno područje za invalide, blokirana biciklistička staza ili zastoj).
    /// Odmah utječe na POST /routes/plan i Favorite rute te dodjeljuje +15 eko-bodova.
    /// Verificirani Auth0 korisnici s visokim Trust Scoreom automatski nose 2x/3x težinu potvrde.
    /// </summary>
    [HttpPost("hazards")]
    [HttpPost("reports")]
    [ProducesResponseType(typeof(CommunityReportActionResponseDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<CommunityReportActionResponseDto>> CreateReport(
        [FromBody] CreateCommunityReportRequestDto request,
        CancellationToken ct = default)
    {
        request.UserId ??= User.GetUserId();
        var result = await _community.CreateReportAsync(request, ct);
        return await ApplyAuth0TrustWeightAsync(result, ct);
    }

    /// <summary>
    /// Nova prijava S FOTOGRAFIJOM u jednom zahtjevu (kamera u aplikaciji): multipart/form-data s istim poljima kao
    /// POST /reports (Category, Title, Description, StreetOrZone, Latitude, Longitude, AffectedModes, AffectsWheelchair)
    /// plus datoteka Photo (JPEG ili PNG, najviše 5 MB). Traži prijavu; autor prijave uvijek je prijavljeni korisnik.
    /// Fotografija se provjerava prije kreiranja, pa neispravna slika ne stvara prijavu ni bodove.
    /// Savjet za aplikaciju: prije slanja smanjite i ponovno spremite sliku (expo-image-manipulator, JPEG, ~0.7 kvalitete),
    /// čime se uklanjaju EXIF podaci (npr. GPS lokacija) i smanjuje potrošnja mobilnih podataka.
    /// </summary>
    [HttpPost("reports/with-photo")]
    [HttpPost("hazards/with-photo")]
    [Authorize]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(MaxPhotoRequestBytes)]
    [RequestFormLimits(MultipartBodyLengthLimit = MaxPhotoRequestBytes)]
    [ProducesResponseType(typeof(CommunityReportActionResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<CommunityReportActionResponseDto>> CreateReportWithPhoto(
        [FromForm] CreateCommunityReportWithPhotoRequest request,
        CancellationToken ct = default)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();

        var (error, extension) = await _photos.ValidateAsync(request.Photo, ct);
        if (error is not null)
            return BadRequest(new ProblemDetails { Status = 400, Title = error });

        request.UserId = userId;
        var result = await _community.CreateReportAsync(request, ct);

        var photoResult = await _community.SetReportPhotoAsync(
            result.Report.Id, userId.Value, token => _photos.SaveAsync(request.Photo!, extension, token), ct);
        if (photoResult.Status == ReportPhotoStatus.Ok && photoResult.Report is not null)
        {
            result.Report = photoResult.Report;
        }
        else
        {
            result.Message += " (Fotografija nije spremljena, pokušajte je dodati putem POST /reports/{id}/photo.)";
        }

        return await ApplyAuth0TrustWeightAsync(result, ct);
    }

    /// <summary>
    /// Dodaje ili zamjenjuje fotografiju na postojećoj prijavi (multipart/form-data, polje "photo": JPEG ili PNG, najviše 5 MB).
    /// Samo autor prijave smije dodati fotografiju (403 za druge, 404 ako prijava ne postoji). Radi za prijave stvorene s
    /// POST /reports, /reports/quick-pin i /reports/missing-bike-lane dok je korisnik prijavljen.
    /// </summary>
    [HttpPost("reports/{id:int}/photo")]
    [HttpPost("hazards/{id:int}/photo")]
    [Authorize]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(MaxPhotoRequestBytes)]
    [RequestFormLimits(MultipartBodyLengthLimit = MaxPhotoRequestBytes)]
    [ProducesResponseType(typeof(CommunityReportDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<CommunityReportDto>> UploadPhoto(
        int id,
        [FromForm] IFormFile photo,
        CancellationToken ct = default)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();

        var (error, extension) = await _photos.ValidateAsync(photo, ct);
        if (error is not null)
            return BadRequest(new ProblemDetails { Status = 400, Title = error });

        var result = await _community.SetReportPhotoAsync(
            id, userId.Value, token => _photos.SaveAsync(photo, extension, token), ct);

        if (result.Status == ReportPhotoStatus.NotFound)
            return NotFound(new { Message = $"Prijava #{id} nije pronađena." });
        if (result.Status == ReportPhotoStatus.Forbidden)
            return StatusCode(StatusCodes.Status403Forbidden,
                new ProblemDetails { Status = 403, Title = "Samo autor prijave može dodati fotografiju." });

        _photos.TryDelete(result.PreviousPhotoUrl);
        return Ok(result.Report);
    }

    /// <summary>Vraća fotografiju prijave (javno). Naziv datoteke dolazi iz polja photoUrl u prijavi.</summary>
    [HttpGet("reports/photos/{fileName}")]
    [AllowAnonymous]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public IActionResult GetPhoto(string fileName)
    {
        if (!_photos.TryGetFile(fileName, out var path, out var contentType))
            return NotFound();

        Response.Headers["X-Content-Type-Options"] = "nosniff";
        Response.Headers["Cache-Control"] = "public, max-age=86400";
        return PhysicalFile(path, contentType);
    }

    /// <summary>
    /// 1-Tap brzi pin na karti u aplikaciji: korisnik samo dodirne kategoriju na mapi i pošalje GPS koordinate,
    /// a backend sam prepoznaje najbližu ulicu/zonu u Timișoari, upisuje prijavu u MySQL i dijeli +15/+20 EcoPoints.
    /// </summary>
    [HttpPost("hazards/quick-pin")]
    [HttpPost("reports/quick-pin")]
    [ProducesResponseType(typeof(CommunityReportActionResponseDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<CommunityReportActionResponseDto>> CreateQuickPinReport(
        [FromBody] QuickPinReportRequestDto request,
        CancellationToken ct = default)
    {
        request.UserId ??= User.GetUserId();
        var result = await _community.CreateQuickPinReportAsync(request, ct);
        return await ApplyAuth0TrustWeightAsync(result, ct);
    }

    /// <summary>
    /// Specijalizirani endpoint: Građani prijavljuju dionicu u Timișoari gdje NEMA biciklističke staze,
    /// a prijeko je potrebna jer tuda redovito prolaze. Izravno hrani Green Intelligence (/insights/gaps i /insights/summary)
    /// te generira prijedlog za participativni proračun na https://decidem.primariatm.ro.
    /// </summary>
    [HttpPost("hazards/missing-bike-lane")]
    [HttpPost("insights/missing-bike-lane")]
    [ProducesResponseType(typeof(CommunityReportActionResponseDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<CommunityReportActionResponseDto>> ReportMissingBikeLane(
        [FromBody] MissingBikeLaneRequestDto request,
        CancellationToken ct = default)
    {
        request.UserId ??= User.GetUserId();
        var result = await _community.ReportMissingBikeLaneAsync(request, ct);

        int weight = User.GetReportVoteWeight();
        if (weight > 1)
        {
            result.Message += $" [Auth0 Crowd Trust Shield 🛡️: Verificirani akademski/građanski glas ({weight}x težina)]";
        }

        return Ok(result);
    }

    /// <summary>
    /// Potvrda zajednice ("Još uvijek je tamo 👍" za blokadu ili "I meni ovdje treba biciklistička staza 👍").
    /// Radi za sve prijave u aplikaciji kao i za pinove povučene sa sesizari.primariatm.ro.
    /// </summary>
    [HttpPost("hazards/{id:int}/confirm")]
    [HttpPost("reports/{id:int}/confirm")]
    [ProducesResponseType(typeof(CommunityReportActionResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<CommunityReportActionResponseDto>> ConfirmReport(int id, CancellationToken ct = default)
    {
        int weight = User.GetReportVoteWeight();
        CommunityReportActionResponseDto? res = null;

        for (int i = 0; i < weight; i++)
        {
            res = await _community.ConfirmReportAsync(id, ct);
            if (res is null) return NotFound(new { Message = $"Prijava #{id} nije pronađena." });
        }

        if (weight > 1 && res is not null)
        {
            res.Message += $" (Auth0 Trust Score bonus: +{weight} potvrde)";
        }

        return Ok(res);
    }

    /// <summary>
    /// Prijava zajednice da je blokada/prepreka na cesti uklonjena ("Riješeno 👎").
    /// Radi za sve prijave u aplikaciji kao i za pinove povučene sa sesizari.primariatm.ro.
    /// </summary>
    [HttpPost("hazards/{id:int}/resolve")]
    [HttpPost("reports/{id:int}/resolve")]
    [ProducesResponseType(typeof(CommunityReportActionResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<CommunityReportActionResponseDto>> ResolveReport(int id, CancellationToken ct = default)
    {
        var res = await _community.ResolveReportAsync(id, ct);
        if (res is null) return NotFound(new { Message = $"Prijava #{id} nije pronađena." });
        return Ok(res);
    }

    private async Task<ActionResult<CommunityReportActionResponseDto>> ApplyAuth0TrustWeightAsync(
        CommunityReportActionResponseDto result,
        CancellationToken ct)
    {
        int weight = User.GetReportVoteWeight();
        if (weight > 1)
        {
            for (int i = 1; i < weight; i++)
            {
                result = await _community.ConfirmReportAsync(result.Report.Id, ct) ?? result;
            }
            result.Message += $" [Auth0 Crowd Trust Shield 🛡️: Verificirani glas nosi {weight}x težinu potvrde]";
        }

        return Ok(result);
    }
}
