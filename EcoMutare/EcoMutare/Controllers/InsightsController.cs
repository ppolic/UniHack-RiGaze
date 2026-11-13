using EcoMutare.Dtos;
using EcoMutare.Services.Insights;
using Microsoft.AspNetCore.Mvc;

namespace EcoMutare.Controllers;

/// <summary>
/// Green Intelligence (sat 24–30): gradski analitički pogled za Timișoaru.
/// Prikazuje biciklističke koridore, izračunate praznine u mreži (~500m rešetka),
/// agregirana anonimna putovanja, ušteđeni CO₂ i top 3 zone za ulaganje.
/// </summary>
[ApiController]
[Route("insights")]
public class InsightsController : ControllerBase
{
    private readonly IGreenIntelligenceService _insights;

    public InsightsController(IGreenIntelligenceService insights)
    {
        _insights = insights;
    }

    /// <summary>
    /// Vraća kartu biciklističkih staza i rešetku grada (~500m ćelije) s izračunatim prazninama (GapCells),
    /// potražnjom, udjelom automobila i udaljenošću do najbliže staze/stanice.
    /// </summary>
    [HttpGet("gaps")]
    [ProducesResponseType(typeof(InsightsGapsResponseDto), StatusCodes.Status200OK)]
    public ActionResult<InsightsGapsResponseDto> GetGaps([FromQuery] bool onlyGaps = false)
    {
        var report = _insights.GetGapsReport();
        if (onlyGaps)
        {
            report.Cells = report.Cells.Where(c => c.IsInfrastructureGap).ToList();
        }
        return Ok(report);
    }

    /// <summary>
    /// Vraća tri ključna broja za gradski dashboard: ukupno ušteđeni CO₂ (kg), broj putovanja i top 3 zone za novu stazu/liniju.
    /// </summary>
    [HttpGet("summary")]
    [ProducesResponseType(typeof(InsightsSummaryResponseDto), StatusCodes.Status200OK)]
    public ActionResult<InsightsSummaryResponseDto> GetSummary() =>
        Ok(_insights.GetSummaryReport());

    /// <summary>
    /// Helper endpoint (BE1 -> BE2 / FE): računa točnu udaljenost bilo koje točke u Timișoari do najbliže
    /// biciklističke staze (piste de biciclete), STPT stanice, niskopodne stanice i VeloTM stanice.
    /// </summary>
    [HttpGet("proximity")]
    [ProducesResponseType(typeof(InfrastructureProximityDto), StatusCodes.Status200OK)]
    public ActionResult<InfrastructureProximityDto> GetProximity(
        [FromQuery] double lat = 45.7537,
        [FromQuery] double lng = 21.2257)
    {
        var pt = new GeoPoint { Lat = lat, Lng = lng };
        return Ok(_insights.GetInfrastructureProximity(pt));
    }
}
