using System.ComponentModel.DataAnnotations;

namespace OracleDigitalWorker.Models;

/// <summary>
/// A granular, named capability in the system, e.g. "PO.APPROVE" or
/// "DRAWING.RELEASE". Permissions are grouped by EPC module + action.
/// </summary>
public class Permission
{
    public int Id { get; set; }

    /// <summary>Stable machine code, e.g. "PROCUREMENT.PO.APPROVE".</summary>
    [Required, MaxLength(100)]
    public string Code { get; set; } = string.Empty;

    [Required, MaxLength(120)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(300)]
    public string? Description { get; set; }

    public PermissionModule Module { get; set; }

    public PermissionAction Action { get; set; }

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public ICollection<RolePermission> RolePermissions { get; set; } = new List<RolePermission>();
}
