using System.ComponentModel.DataAnnotations;

namespace OracleDigitalWorker.Models;

/// <summary>
/// A job role in the EPC organization (e.g. Project Manager, Lead Engineer).
/// Roles are granted a set of permissions, and users are granted roles.
/// </summary>
public class Role
{
    public int Id { get; set; }

    [Required, MaxLength(80)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(300)]
    public string? Description { get; set; }

    /// <summary>
    /// Seniority/authority level (1 = highest, e.g. Project Director).
    /// Useful for approval hierarchies.
    /// </summary>
    public int RoleLevel { get; set; }

    /// <summary>The department this role primarily belongs to.</summary>
    public Department Department { get; set; }

    /// <summary>System roles are seeded/protected and shouldn't be deleted via API.</summary>
    public bool IsSystemRole { get; set; }

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    // Navigation
    public ICollection<UserRole> UserRoles { get; set; } = new List<UserRole>();
    public ICollection<RolePermission> RolePermissions { get; set; } = new List<RolePermission>();
}
