using System.ComponentModel.DataAnnotations;

namespace OracleDigitalWorker.Models;

/// <summary>
/// Records who-changed-what across the system (create/update/delete on any entity).
/// Written by the controllers on mutating operations.
/// </summary>
public class AuditLog
{
    public long Id { get; set; }

    /// <summary>The entity affected, e.g. "User", "Role", "Permission".</summary>
    [Required, MaxLength(60)]
    public string EntityName { get; set; } = string.Empty;

    /// <summary>Primary key of the affected record (as text, since keys vary).</summary>
    [MaxLength(60)]
    public string? EntityId { get; set; }

    /// <summary>CREATE / UPDATE / DELETE / ASSIGN_ROLE / etc.</summary>
    [Required, MaxLength(40)]
    public string Action { get; set; } = string.Empty;

    /// <summary>Who performed it (employee code / username).</summary>
    [MaxLength(120)]
    public string? PerformedBy { get; set; }

    /// <summary>Optional human-readable change summary or JSON snapshot.</summary>
    [MaxLength(2000)]
    public string? Details { get; set; }

    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}
