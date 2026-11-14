using EcoMutare.Data;
using EcoMutare.Dtos;
using EcoMutare.Services.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EcoMutare.Controllers;

[ApiController]
[Route("points")]
[Authorize]
public class PointsController : ControllerBase
{
    private readonly AppDbContext _db;
    public PointsController(AppDbContext db) => _db = db;

    /// Stanje bodova (zbroj PointTransactions) i povijest transakcija, od najnovije. Paginacija: skip, take (najviše 200).
    [HttpGet]
    [ProducesResponseType(typeof(PointsResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<PointsResponse>> Get([FromQuery] int skip = 0, [FromQuery] int take = 50, CancellationToken ct = default)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();

        skip = Math.Max(0, skip);
        take = Math.Clamp(take, 1, 200);

        var q = _db.PointTransactions.AsNoTracking().Where(t => t.UserId == userId);
        var balance = await q.SumAsync(t => (int?)t.Points, ct) ?? 0;
        var count = await q.CountAsync(ct);
        var items = await q.OrderByDescending(t => t.CreatedAt).ThenByDescending(t => t.Id)
            .Skip(skip).Take(take)
            .Select(t => new PointTransactionDto
            {
                Id = t.Id,
                Points = t.Points,
                Type = t.Type,
                Description = t.Description,
                TripHistoryId = t.TripHistoryId,
                RewardId = t.RewardId,
                CreatedAt = t.CreatedAt,
            }).ToListAsync(ct);

        return Ok(new PointsResponse { Balance = balance, TotalCount = count, Transactions = items });
    }
}
