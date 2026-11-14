using EcoMutare.Domain;
using EcoMutare.Dtos;
using EcoMutare.Services.Auth;
using EcoMutare.Services.Community;
using Microsoft.AspNetCore.Mvc;

namespace EcoMutare.Controllers;

/// <summary>
/// Waze-style građanske prijave u Timișoari (1-Tap prijava izravno u aplikaciji + službene prijave):
/// - Blokade cesta i radovi (RoadBlockade),
/// - Nedostupna područja za osobe u invalidskim kolicima / kolica za bebe (InaccessibleArea),
/// - Blokirane biciklističke staze (BlockedBikeLane),
/// - Prijave dionica gdje nema biciklističke staze, a potrebna je zbog čestog prolaska (MissingBikeLane),
/// + čitanje i potvrđivanje pravih prijava sa službenog gradskog portala sesizari.primariatm.ro
/// + Auth0 Bot Detection & Waze Citizen Trust Score (2x/3x težina glasa za verificirane Auth0 korisnike).
/// </summary>
[ApiController]
public class CommunityReportsController : ControllerBase
{
    private readonly ICommunityIntelligenceService _community;

    public CommunityReportsController(ICommunityIntelligenceService community)
    {
        _community = community;
    }

    /// <summary>
    /// Vraća sve aktivne Waze-style prijave u Timișoari (blokade cesta, nedostupna područja, blokirane staze,
    /// prijave gdje fali biciklistička staza) te spaja službene prijave s sesizari.primariatm.ro.
    /// </summary>
    [HttpGet("hazards")]
    [HttpGet("reports")]
    [HttpGet("waze/reports")]
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
    /// Vraća Waze 1-Tap izbornik kategorija za gumb "+" u aplikaciji (ikone, boje, brze podkategorije i EcoPoints nagrade).
    /// </summary>
    [HttpGet("hazards/categories")]
    [HttpGet("waze/categories")]
    [ProducesResponseType(typeof(IEnumerable<WazeCategoryMenuDto>), StatusCodes.Status200OK)]
    public ActionResult<IEnumerable<WazeCategoryMenuDto>> GetWazeCategories() =>
        Ok(_community.GetWazeCategoryMenu());

    /// <summary>
    /// Nova Waze-style prijava u aplikaciji (blokada na cesti, nedostupno područje za invalide, blokirana biciklistička staza ili zastoj).
    /// Odmah utječe na POST /routes/plan i Favorite rute te dodjeljuje +15 eko-bodova.
    /// Verificirani Auth0 korisnici s visokim Trust Scoreom automatski nose 2x/3x težinu potvrde.
    /// </summary>
    [HttpPost("hazards")]
    [HttpPost("reports")]
    [HttpPost("waze/reports")]
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
    /// 1-Tap Waze brzi pin u aplikaciji: korisnik samo dodirne kategoriju na mapi i pošalje GPS koordinate,
    /// a backend sam prepoznaje najbližu ulicu/zonu u Timișoari, upisuje prijavu u MySQL i dijeli +15/+20 EcoPoints.
    /// </summary>
    [HttpPost("hazards/quick-pin")]
    [HttpPost("waze/pin")]
    [ProducesResponseType(typeof(CommunityReportActionResponseDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<CommunityReportActionResponseDto>> CreateQuickWazePin(
        [FromBody] QuickWazePinRequestDto request,
        CancellationToken ct = default)
    {
        request.UserId ??= User.GetUserId();
        var result = await _community.CreateQuickWazePinAsync(request, ct);
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

        int weight = User.GetWazeVoteWeight();
        if (weight > 1)
        {
            result.Message += $" [Auth0 Waze Trust Shield 🛡️: Verificirani akademski/građanski glas ({weight}x težina)]";
        }

        return Ok(result);
    }

    /// <summary>
    /// Waze potvrda zajednice ("Još uvijek je tamo 👍" za blokadu ili "I meni ovdje treba biciklistička staza 👍").
    /// Radi za sve prijave u aplikaciji kao i za pinove povučene sa sesizari.primariatm.ro.
    /// </summary>
    [HttpPost("hazards/{id:int}/confirm")]
    [HttpPost("reports/{id:int}/confirm")]
    [HttpPost("waze/reports/{id:int}/confirm")]
    [ProducesResponseType(typeof(CommunityReportActionResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<CommunityReportActionResponseDto>> ConfirmReport(int id, CancellationToken ct = default)
    {
        int weight = User.GetWazeVoteWeight();
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
    /// Waze prijava da je blokada/prepreka na cesti uklonjena ("Riješeno 👎").
    /// Radi za sve prijave u aplikaciji kao i za pinove povučene sa sesizari.primariatm.ro.
    /// </summary>
    [HttpPost("hazards/{id:int}/resolve")]
    [HttpPost("reports/{id:int}/resolve")]
    [HttpPost("waze/reports/{id:int}/resolve")]
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
        int weight = User.GetWazeVoteWeight();
        if (weight > 1)
        {
            for (int i = 1; i < weight; i++)
            {
                result = await _community.ConfirmReportAsync(result.Report.Id, ct) ?? result;
            }
            result.Message += $" [Auth0 Waze Trust Shield 🛡️: Verificirani glas nosi {weight}x težinu potvrde]";
        }

        return Ok(result);
    }
}
