using EcoMutare.Data;
using EcoMutare.Domain.Entities;
using EcoMutare.Dtos;
using EcoMutare.Services;
using EcoMutare.Services.Insights;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EcoMutare.Controllers;

/// <summary>
/// Green Intelligence (sat 24–32): gradski analitički pogled za Timișoaru (BE1 + BE2).
/// Prikazuje biciklističke koridore, izračunate praznine u mreži (~500m rešetka),
/// agregirana anonimna putovanja, Waze prijave građana, ušteđeni CO₂ i top 3 zone za ulaganje,
/// te sinkronizira izračunate ćelije u MySQL tablicu GapCells.
/// </summary>
[ApiController]
[Route("insights")]
public class InsightsController : ControllerBase
{
    private readonly IGreenIntelligenceService _insights;
    private readonly AppDbContext _db;
    private readonly ILogger<InsightsController> _logger;

    public InsightsController(
        IGreenIntelligenceService insights,
        AppDbContext db,
        ILogger<InsightsController> logger)
    {
        _insights = insights;
        _db = db;
        _logger = logger;
    }

    /// <summary>
    /// Vraća kartu biciklističkih staza i rešetku grada (~500m ćelije) s izračunatim prazninama (GapCells),
    /// potražnjom, udjelom automobila, Waze prijavama građana i udaljenošću do najbliže staze/stanice.
    /// </summary>
    [HttpGet("gaps")]
    [ProducesResponseType(typeof(InsightsGapsResponseDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<InsightsGapsResponseDto>> GetGaps(
        [FromQuery] bool onlyGaps = false,
        CancellationToken ct = default)
    {
        var report = _insights.GetGapsReport();
        await TryPersistGapCellsToMySqlAsync(report.Cells, ct);

        if (onlyGaps)
        {
            report.Cells = report.Cells.Where(c => c.IsInfrastructureGap).ToList();
        }
        return Ok(report);
    }

    /// <summary>
    /// Vraća ključne brojke za gradski dashboard: ukupno ušteđeni CO₂ (kg), broj putovanja,
    /// Waze prijave za nedostajuće biciklističke staze i top 3 zone za novu stazu/liniju (uz nacrt za decidem.primariatm.ro).
    /// </summary>
    [HttpGet("summary")]
    [ProducesResponseType(typeof(InsightsSummaryResponseDto), StatusCodes.Status200OK)]
    public ActionResult<InsightsSummaryResponseDto> GetSummary() =>
        Ok(_insights.GetSummaryReport());

    /// <summary>
    /// Eksplicitno preračunava sve 500m GapCells ćelije (uključujući vožnje iz MySQL TripHistories tablice)
    /// i sprema ih u MySQL tablicu GapCells (sat 24–32 BE2).
    /// </summary>
    [HttpPost("recalculate")]
    [ProducesResponseType(typeof(List<GapCell>), StatusCodes.Status200OK)]
    public async Task<ActionResult<List<GapCell>>> RecalculateGapCells(CancellationToken ct = default)
    {
        var report = _insights.GetGapsReport();
        var saved = await TryPersistGapCellsToMySqlAsync(report.Cells, ct);
        return Ok(saved);
    }

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

    private async Task<List<GapCell>> TryPersistGapCellsToMySqlAsync(List<GapCellDto> dtoCells, CancellationToken ct)
    {
        var result = new List<GapCell>();
        try
        {
            var existing = await _db.GapCells.ToListAsync(ct);

            for (int i = 0; i < dtoCells.Count; i++)
            {
                var c = dtoCells[i];
                int gx = i % 4;
                int gy = i / 4;

                int nearStops = TimisoaraPublicData.TransitStops.Count(s =>
                    Geo.DistanceM(c.Center.Lat, c.Center.Lng, s.Lat, s.Lng) <= 500);
                int nearStations = TimisoaraPublicData.Stations.Count(s =>
                    Geo.DistanceM(c.Center.Lat, c.Center.Lng, s.Lat, s.Lng) <= 500);
                int nearParkings = TimisoaraPublicData.Parkings.Count(p =>
                    Geo.DistanceM(c.Center.Lat, c.Center.Lng, p.Lat, p.Lng) <= 500);

                var row = existing.FirstOrDefault(e => e.GridX == gx && e.GridY == gy);
                if (row is null)
                {
                    row = new GapCell
                    {
                        GridX = gx,
                        GridY = gy,
                        CenterLatitude = c.Center.Lat,
                        CenterLongitude = c.Center.Lng,
                        CellSizeMeters = 500,
                        StopCount = nearStops,
                        StationCount = nearStations,
                        ParkingCount = nearParkings,
                        GapScore = c.GapScore,
                        UpdatedAt = DateTime.UtcNow
                    };
                    _db.GapCells.Add(row);
                }
                else
                {
                    row.CenterLatitude = c.Center.Lat;
                    row.CenterLongitude = c.Center.Lng;
                    row.CellSizeMeters = 500;
                    row.StopCount = nearStops;
                    row.StationCount = nearStations;
                    row.ParkingCount = nearParkings;
                    row.GapScore = c.GapScore;
                    row.UpdatedAt = DateTime.UtcNow;
                }
                result.Add(row);
            }

            await _db.SaveChangesAsync(ct);
        }
        catch (Exception ex)
        {
            _logger.LogDebug("Sinkronizacija GapCells u MySQL bazu nije uspjela: {Msg}", ex.Message);
        }

        return result;
    }
}
