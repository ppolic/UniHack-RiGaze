using EcoMutare.Data;
using EcoMutare.Domain.Entities;
using EcoMutare.Dtos;
using EcoMutare.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EcoMutare.Controllers;

[ApiController]
[Route("catalog/stations")]
public class StationsController : ControllerBase
{
    private readonly AppDbContext _db;
    public StationsController(AppDbContext db) => _db = db;

    ///Stanice bicikala/romobila. Filteri: type, onlyAvailable, includeInactive; lat+lng za sortiranje po udaljenosti.
    [HttpGet]
    [ProducesResponseType(typeof(List<StationDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<List<StationDto>>> GetAll(
        [FromQuery] StationType? type, [FromQuery] bool onlyAvailable = false, [FromQuery] bool includeInactive = false,
        [FromQuery] double? lat = null, [FromQuery] double? lng = null, CancellationToken ct = default)
    {
        var q = _db.Stations.AsNoTracking().AsQueryable();
        if (!includeInactive) q = q.Where(s => s.IsActive);
        if (type is not null) q = q.Where(s => s.Type == type);
        if (onlyAvailable) q = q.Where(s => s.AvailableUnits > 0);

        var list = (await q.OrderBy(s => s.Id).ToListAsync(ct)).Select(s => ToDto(s, lat, lng)).ToList();
        if (lat is not null && lng is not null) list = list.OrderBy(s => s.DistanceM).ToList();
        return Ok(list);
    }

    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(StationDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<StationDto>> GetById(int id, CancellationToken ct)
    {
        var s = await _db.Stations.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct);
        return s is null ? NotFound() : Ok(ToDto(s, null, null));
    }

    private static StationDto ToDto(Station s, double? lat, double? lng) => new()
    {
        Id = s.Id,
        Name = s.Name,
        Type = s.Type,
        Latitude = s.Latitude,
        Longitude = s.Longitude,
        Capacity = s.Capacity,
        AvailableUnits = s.AvailableUnits,
        IsActive = s.IsActive,
        DistanceM = lat is not null && lng is not null ? Geo.DistanceM(lat.Value, lng.Value, s.Latitude, s.Longitude) : null,
    };
}
