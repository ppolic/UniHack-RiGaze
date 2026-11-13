using EcoMutare.Dtos;
using EcoMutare.Services.Routing;
using Microsoft.AspNetCore.Mvc;

namespace EcoMutare.Controllers;

[ApiController]
[Route("routes")]
public class RoutesController : ControllerBase
{
    private readonly IRoutePlanner _planner;

    public RoutesController(IRoutePlanner planner) => _planner = planner;

    /// <summary>Planira opcije puta od A do B prema profilu korisnika, vremenu i pravilima.</summary>
    [HttpPost("plan")]
    [ProducesResponseType(typeof(RoutePlanResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<RoutePlanResponse>> Plan([FromBody] RoutePlanRequest request, CancellationToken ct)
    {
        var response = await _planner.PlanAsync(request, ct);
        return Ok(response);
    }
}
