using EcoMutare.Domain;
using EcoMutare.Dtos;
using EcoMutare.Services.Community;
using EcoMutare.Services.Routing;
using Microsoft.AspNetCore.Mvc;

namespace EcoMutare.Controllers;

/// <summary>
/// Upravljanje omiljenim (svakodnevnim) rutama korisnika u Timișoari:
/// - Spremanje Favorite ruta (dom -> faks/posao),
/// - Provjera uživo postoje li Waze blokade ili nedostupna područja na omiljenoj ruti,
/// - Automatsko mapiranje potražnje za novim biciklističkim stazama u Green Intelligence sustav,
/// - 1-Click izračun plana putovanja za omiljenu rutu.
/// </summary>
[ApiController]
[Route("favorites")]
public class FavoriteRoutesController : ControllerBase
{
    private readonly ICommunityIntelligenceService _community;
    private readonly IRoutePlanner _routePlanner;

    public FavoriteRoutesController(
        ICommunityIntelligenceService community,
        IRoutePlanner routePlanner)
    {
        _community = community;
        _routePlanner = routePlanner;
    }

    /// <summary>
    /// Vraća sve spremljene omiljene rute (s opcionalnim filtriranjem po userId)
    /// zajedno s trenutnim Waze statusom blokada na svakoj ruti!
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<FavoriteRouteDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<FavoriteRouteDto>>> GetFavorites(
        [FromQuery] int? userId = null,
        CancellationToken ct = default)
    {
        var list = await _community.GetFavoriteRoutesAsync(userId, ct);
        return Ok(list);
    }

    /// <summary>
    /// Sprema novu omiljenu rutu korisnika u MySQL bazu.
    /// Ako je označeno missingBikeLaneOnRoute = true, sustav automatski bilježi i građansku potrebu
    /// za biciklističkom stazom na tom koridoru u Green Intelligence (/insights/gaps).
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(FavoriteRouteDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<FavoriteRouteDto>> CreateFavorite(
        [FromBody] CreateFavoriteRouteRequestDto request,
        CancellationToken ct = default)
    {
        var created = await _community.CreateFavoriteRouteAsync(request, ct);
        return Ok(created);
    }

    /// <summary>
    /// 1-Click Smart Commute: Izračunava multimodalni plan putovanja za spremljenu omiljenu rutu
    /// uz trenutno vrijeme (Open-Meteo) i aktivne Waze blokade na terenu.
    /// </summary>
    [HttpGet("{id:int}/plan")]
    [HttpPost("{id:int}/plan")]
    [ProducesResponseType(typeof(RoutePlanResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<RoutePlanResponse>> PlanFavoriteRoute(
        int id,
        [FromQuery] bool? hasDisability = null,
        CancellationToken ct = default)
    {
        var fav = await _community.GetFavoriteRouteByIdAsync(id, ct);
        if (fav is null)
        {
            return NotFound(new { Message = $"Omiljena ruta #{id} nije pronađena." });
        }

        bool stepFree = hasDisability ?? fav.RequiresStepFreeAccess;

        var planReq = new RoutePlanRequest
        {
            Origin = new GeoPoint { Lat = fav.OriginLat, Lng = fav.OriginLng },
            Destination = new GeoPoint { Lat = fav.DestinationLat, Lng = fav.DestinationLng },
            DepartureTime = DateTimeOffset.UtcNow,
            Profile = new UserProfileDto
            {
                AgeCategory = AgeCategory.Adult,
                HasDisability = stepFree,
                OwnsBike = fav.PreferredMode == TransportMode.Bike,
                OwnsScooter = fav.PreferredMode == TransportMode.Scooter,
                OwnsCar = true
            }
        };

        var plan = await _routePlanner.PlanAsync(planReq, ct);
        return Ok(plan);
    }

    /// <summary>
    /// Briše omiljenu rutu korisnika.
    /// </summary>
    [HttpDelete("{id:int}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteFavorite(int id, CancellationToken ct = default)
    {
        bool ok = await _community.DeleteFavoriteRouteAsync(id, ct);
        if (!ok) return NotFound(new { Message = $"Omiljena ruta #{id} nije pronađena." });
        return Ok(new { Message = $"Omiljena ruta #{id} je uspješno obrisana." });
    }
}
