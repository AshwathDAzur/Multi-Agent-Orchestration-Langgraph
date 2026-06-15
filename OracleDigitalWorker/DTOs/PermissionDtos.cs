using System.ComponentModel.DataAnnotations;
using OracleDigitalWorker.Models;

namespace OracleDigitalWorker.DTOs;

public record PermissionDto(
    int Id,
    string Code,
    string Name,
    string? Description,
    PermissionModule Module,
    PermissionAction Action,
    bool IsActive,
    DateTime CreatedAt
);

public class CreatePermissionDto
{
    [Required, MaxLength(100)] public string Code { get; set; } = string.Empty;
    [Required, MaxLength(120)] public string Name { get; set; } = string.Empty;
    [MaxLength(300)] public string? Description { get; set; }
    public PermissionModule Module { get; set; }
    public PermissionAction Action { get; set; }
    public bool IsActive { get; set; } = true;
}

public class UpdatePermissionDto
{
    [Required, MaxLength(120)] public string Name { get; set; } = string.Empty;
    [MaxLength(300)] public string? Description { get; set; }
    public PermissionModule Module { get; set; }
    public PermissionAction Action { get; set; }
    public bool IsActive { get; set; }
}
