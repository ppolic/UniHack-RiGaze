using EcoMutare.Domain;
using EcoMutare.Dtos;
using EcoMutare.Services.Community;
using Microsoft.AspNetCore.Mvc;

namespace EcoMutare.Controllers;

/// <summary>
/// Waze-style građanske prijave u Timișoari:
/// - Blokade cesta i radovi (RoadBlockade),
/// - Nedostupna područja za osobe u invalidskim kolicima / kolica za bebe (InaccessibleArea),
/// - Blokirane biciklističke staze (BlockedBikeLane),
/// - Prijave dionica gdje nema biciklističke staze, a potrebna je zbog čestog prolaska (MissingBikeLane),
/// + čitanje pravih prijava sa službenog gradskog portala sesizari.primariatm.ro.
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
    /// Nova Waze-style prijava (blokada na cesti, nedostupno područje za invalide, blokirana biciklistička staza ili zastoj).
    /// Odmah utječe na POST /routes/plan i Favorite rute te dodjeljuje +15 eko-bodova.
    /// </summary>
    [HttpPost("hazards")]
    [HttpPost("reports")]
    [ProducesResponseType(typeof(CommunityReportActionResponseDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<CommunityReportActionResponseDto>> CreateReport(
        [FromBody] CreateCommunityReportRequestDto request,
        CancellationToken ct = default)
    {
        var result = await _community.CreateReportAsync(request, ct);
        return Ok(result);
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
        var result = await _community.ReportMissingBikeLaneAsync(request, ct);
        return Ok(result);
    }

    /// <summary>
    /// Waze potvrda zajednice ("Još uvijek je tamo 👍" za blokadu ili "I meni ovdje treba biciklistička staza 👍").
    /// </summary>
    [HttpPost("hazards/{id:int}/confirm")]
    [HttpPost("reports/{id:int}/confirm")]
    [ProducesResponseType(typeof(CommunityReportActionResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<CommunityReportActionResponseDto>> ConfirmReport(int id, CancellationToken ct = default)
    {
        var res = await _community.ConfirmReportAsync(id, ct);
        if (res is null) return NotFound(new { Message = $"Prijava #{id} nije pronađena." });
        return Ok(res);
    }

    /// <summary>
    /// Waze prijava da je blokada/prepreka na cesti uklonjena ("Riješeno 👎").
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
}
