using System.ComponentModel.DataAnnotations;

namespace OracleDigitalWorker.Models;

/// <summary>
/// An EPC organization member (engineer, procurement officer, site staff, etc.).
/// </summary>
public class User
{
    public int Id { get; set; }

    /// <summary>HR employee code, e.g. "EPC-0042".</summary>
    [Required, MaxLength(20)]
    public string EmployeeCode { get; set; } = string.Empty;

    [Required, MaxLength(60)]
    public string FirstName { get; set; } = string.Empty;

    [Required, MaxLength(60)]
    public string LastName { get; set; } = string.Empty;

    [Required, MaxLength(150)]
    public string Email { get; set; } = string.Empty;

    [MaxLength(30)]
    public string? PhoneNumber { get; set; }

    /// <summary>Position title, e.g. "Lead Piping Engineer".</summary>
    [MaxLength(100)]
    public string? JobTitle { get; set; }

    public Department Department { get; set; }

    public Discipline Discipline { get; set; }

    public EmploymentType EmploymentType { get; set; }

    /// <summary>Project or site the person is assigned to, e.g. "Refinery Expansion - Phase 2".</summary>
    [MaxLength(120)]
    public string? ProjectSite { get; set; }

    /// <summary>Office or site base location, e.g. "Chennai HO" / "Jamnagar Site".</summary>
    [MaxLength(120)]
    public string? Location { get; set; }

    public DateTime? DateOfJoining { get; set; }

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    // Navigation: a user has many roles (via join).
    public ICollection<UserRole> UserRoles { get; set; } = new List<UserRole>();
}
