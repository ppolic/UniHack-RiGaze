using EcoMutare.Data;
using EcoMutare.Domain.Entities;
using EcoMutare.Dtos;
using EcoMutare.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EcoMutare.Controllers;

[ApiController]
[Route("catalog/parkings")]
public class ParkingsController : ControllerBase
{
    private readonly AppDbContext _db;
    public ParkingsController(AppDbContext db) => _db = db;

    ///Parkirališta. Filteri: onlyFree, parkAndRide; lat+lng za sortiranje po udaljenosti.
    [HttpGet]
    [ProducesResponseType(typeof(List<ParkingDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<List<ParkingDto>>> GetAll(
        [FromQuery] bool onlyFree = false, [FromQuery] bool? parkAndRide = null,
        [FromQuery] double? lat = null, [FromQuery] double? lng = null, CancellationToken ct = default)
    {
        var q = _db.Parkings.AsNoTracking().AsQueryable();
        if (onlyFree) q = q.Where(p => p.FreeSpaces > 0);
        if (parkAndRide is not null) q = q.Where(p => p.IsParkAndRide == parkAndRide);

        var list = (await q.OrderBy(p => p.Id).ToListAsync(ct)).Select(p => ToDto(p, lat, lng)).ToList();
        if (lat is not null && lng is not null) list = list.OrderBy(p => p.DistanceM).ToList();
        return Ok(list);
    }

    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(ParkingDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ParkingDto>> GetById(int id, CancellationToken ct)
    {
        var p = await _db.Parkings.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct);
        return p is null ? NotFound() : Ok(ToDto(p, null, null));
    }

    private static ParkingDto ToDto(Parking p, double? lat, double? lng) => new()
    {
        Id = p.Id,
        Name = p.Name,
        Address = p.Address,
        Latitude = p.Latitude,
        Longitude = p.Longitude,
        TotalSpaces = p.TotalSpaces,
        FreeSpaces = p.FreeSpaces,
        HourlyPrice = p.HourlyPrice,
        IsParkAndRide = p.IsParkAndRide,
        DistanceM = lat is not null && lng is not null ? Geo.DistanceM(lat.Value, lng.Value, p.Latitude, p.Longitude) : null,
    };
}
