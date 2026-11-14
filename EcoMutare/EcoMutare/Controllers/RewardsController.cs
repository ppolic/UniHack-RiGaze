using EcoMutare.Data;
using EcoMutare.Domain.Entities;
using EcoMutare.Dtos;
using EcoMutare.Services.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EcoMutare.Controllers;

[ApiController]
[Route("rewards")]
public class RewardsController : ControllerBase
{
    /// Zaštita od dvostrukog klika: ista nagrada ne može se otkupiti dvaput unutar ovog razdoblja.
    private static readonly TimeSpan DuplicateWindow = TimeSpan.FromSeconds(10);

    private readonly AppDbContext _db;
    public RewardsController(AppDbContext db) => _db = db;

    /// Aktivne nagrade (javno). includeInactive=true vraća i neaktivne.
    [HttpGet]
    [ProducesResponseType(typeof(List<RewardDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<List<RewardDto>>> GetAll([FromQuery] bool includeInactive = false, CancellationToken ct = default)
    {
        var q = _db.Rewards.AsNoTracking().AsQueryable();
        if (!includeInactive) q = q.Where(r => r.IsActive);
        var rewards = await q.OrderBy(r => r.PointsCost).ToListAsync(ct);
        return Ok(rewards.Select(ToDto).ToList());
    }

    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(RewardDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<RewardDto>> GetById(int id, CancellationToken ct)
    {
        var r = await _db.Rewards.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct);
        return r is null ? NotFound() : Ok(ToDto(r));
    }

    /// Otkup nagrade za prijavljenog korisnika. Oduzimanje bodova je jedan uvjetni UPDATE (balance &gt;= cijena) u transakciji zajedno sa zapisom u PointTransactions,
    /// pa dva istodobno zahtjeva ne mogu potrošiti iste bodove. 404 nepoznata nagrada, 409 neaktivna ili ponovljeni zahtjev,  400 nedovoljno bodova.

    [HttpPost("{id:int}/redeem")]
    [Authorize]
    [ProducesResponseType(typeof(RedeemResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<RedeemResponse>> Redeem(int id, CancellationToken ct)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();

        var reward = await _db.Rewards.AsNoTracking().FirstOrDefaultAsync(r => r.Id == id, ct);
        if (reward is null) return NotFound();
        if (!reward.IsActive)
            return Conflict(new ProblemDetails { Status = 409, Title = "Nagrada nije aktivna." });

        var since = DateTime.UtcNow - DuplicateWindow;
        var duplicate = await _db.PointTransactions.AnyAsync(t =>
            t.UserId == userId && t.RewardId == id && t.Type == PointTransactionType.Redeemed && t.CreatedAt > since, ct);
        if (duplicate)
            return Conflict(new ProblemDetails { Status = 409, Title = "Nagrada je upravo otkupljena. Pričekaj nekoliko sekundi." });

        var cost = reward.PointsCost;
        await using var tx = await _db.Database.BeginTransactionAsync(ct);

        var updated = await _db.Users.Where(u => u.Id == userId && u.PointsBalance >= cost)
            .ExecuteUpdateAsync(s => s.SetProperty(u => u.PointsBalance, u => u.PointsBalance - cost), ct);
        if (updated == 0)
        {
            await tx.RollbackAsync(ct);
            if (!await _db.Users.AnyAsync(u => u.Id == userId, ct)) return Unauthorized();
            return BadRequest(new ProblemDetails { Status = 400, Title = "Nedovoljno bodova.", Detail = $"Potrebno: {cost}." });
        }

        var txn = new PointTransaction
        {
            UserId = userId.Value,
            Points = -cost,
            Type = PointTransactionType.Redeemed,
            RewardId = reward.Id,
            Description = $"Otkup: {reward.Name}",
        };
        _db.PointTransactions.Add(txn);
        await _db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);

        var balance = await _db.Users.AsNoTracking().Where(u => u.Id == userId)
            .Select(u => u.PointsBalance).FirstAsync(ct);
        return Ok(new RedeemResponse
        {
            RewardId = reward.Id,
            RewardName = reward.Name,
            PointsSpent = cost,
            NewBalance = balance,
            TransactionId = txn.Id,
            DiscountCode = $"ECOMUTARE-TM-{reward.Id:D2}-{txn.Id:D4}"
        });
    }

    private static RewardDto ToDto(Reward r) => new()
    {
        Id = r.Id,
        Name = r.Name,
        Description = r.Description,
        PointsCost = r.PointsCost,
        IsActive = r.IsActive,
    };
}
