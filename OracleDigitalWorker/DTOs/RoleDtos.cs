using System.ComponentModel.DataAnnotations;
using OracleDigitalWorker.Models;

namespace OracleDigitalWorker.DTOs;

public record RoleDto(
    int Id,
    string Name,
    string? Description,
    int RoleLevel,
    Department Department,
    bool IsSystemRole,
    bool IsActive,
    DateTime CreatedAt,
    DateTime? UpdatedAt,
    List<string> Permissions
);

public class CreateRoleDto
{
    [Required, MaxLength(80)] public string Name { get; set; } = string.Empty;
    [MaxLength(300)] public string? Description { get; set; }
    public int RoleLevel { get; set; }
    public Department Department { get; set; }
    public bool IsActive { get; set; } = true;
}

public class UpdateRoleDto
{
    [Required, MaxLength(80)] public string Name { get; set; } = string.Empty;
    [MaxLength(300)] public string? Description { get; set; }
    public int RoleLevel { get; set; }
    public Department Department { get; set; }
    public bool IsActive { get; set; }
}

/// <summary>Assign a permission to a role.</summary>
public class AssignPermissionDto
{
    [Required] public int PermissionId { get; set; }
}
