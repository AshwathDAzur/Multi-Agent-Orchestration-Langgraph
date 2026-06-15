namespace OracleDigitalWorker.Models;

/// <summary>Join entity: which roles a user has (many-to-many).</summary>
public class UserRole
{
    public int UserId { get; set; }
    public User User { get; set; } = null!;

    public int RoleId { get; set; }
    public Role Role { get; set; } = null!;

    public DateTime AssignedAt { get; set; } = DateTime.UtcNow;

    /// <summary>Employee code / name of whoever granted the role.</summary>
    public string? AssignedBy { get; set; }
}
