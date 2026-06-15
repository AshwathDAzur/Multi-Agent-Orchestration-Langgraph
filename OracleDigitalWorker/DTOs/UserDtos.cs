using System.ComponentModel.DataAnnotations;
using OracleDigitalWorker.Models;

namespace OracleDigitalWorker.DTOs;

public record UserDto(
    int Id,
    string EmployeeCode,
    string FirstName,
    string LastName,
    string Email,
    string? PhoneNumber,
    string? JobTitle,
    Department Department,
    Discipline Discipline,
    EmploymentType EmploymentType,
    string? ProjectSite,
    string? Location,
    DateTime? DateOfJoining,
    bool IsActive,
    DateTime CreatedAt,
    DateTime? UpdatedAt,
    List<string> Roles
);

public class CreateUserDto
{
    [Required, MaxLength(20)] public string EmployeeCode { get; set; } = string.Empty;
    [Required, MaxLength(60)] public string FirstName { get; set; } = string.Empty;
    [Required, MaxLength(60)] public string LastName { get; set; } = string.Empty;
    [Required, EmailAddress, MaxLength(150)] public string Email { get; set; } = string.Empty;
    [MaxLength(30)] public string? PhoneNumber { get; set; }
    [MaxLength(100)] public string? JobTitle { get; set; }
    public Department Department { get; set; }
    public Discipline Discipline { get; set; }
    public EmploymentType EmploymentType { get; set; }
    [MaxLength(120)] public string? ProjectSite { get; set; }
    [MaxLength(120)] public string? Location { get; set; }
    public DateTime? DateOfJoining { get; set; }
    public bool IsActive { get; set; } = true;
}

public class UpdateUserDto
{
    [Required, MaxLength(60)] public string FirstName { get; set; } = string.Empty;
    [Required, MaxLength(60)] public string LastName { get; set; } = string.Empty;
    [Required, EmailAddress, MaxLength(150)] public string Email { get; set; } = string.Empty;
    [MaxLength(30)] public string? PhoneNumber { get; set; }
    [MaxLength(100)] public string? JobTitle { get; set; }
    public Department Department { get; set; }
    public Discipline Discipline { get; set; }
    public EmploymentType EmploymentType { get; set; }
    [MaxLength(120)] public string? ProjectSite { get; set; }
    [MaxLength(120)] public string? Location { get; set; }
    public DateTime? DateOfJoining { get; set; }
    public bool IsActive { get; set; }
}

/// <summary>Assign a role to a user.</summary>
public class AssignRoleDto
{
    [Required] public int RoleId { get; set; }
    public string? AssignedBy { get; set; }
}
