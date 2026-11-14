using System.ComponentModel.DataAnnotations;

namespace EcoMutare.Domain.Entities;

public class Reward
{
    public int Id { get; set; }
    [MaxLength(150)] public string Name { get; set; } = string.Empty;
    [MaxLength(500)] public string? Description { get; set; }
    public int PointsCost { get; set; }
    public bool IsActive { get; set; } = true;
}
