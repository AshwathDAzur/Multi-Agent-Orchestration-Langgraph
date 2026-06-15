using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OracleDigitalWorker.Data;
using OracleDigitalWorker.DTOs;
using OracleDigitalWorker.Models;

namespace OracleDigitalWorker.Controllers;

[ApiController]
[Route("api/[controller]")]
public class UsersController : ControllerBase
{
    private readonly AppDbContext _db;
    public UsersController(AppDbContext db) => _db = db;

    // GET /api/users
    [HttpGet]
    public async Task<ActionResult<IEnumerable<UserDto>>> GetAll()
    {
        var users = await _db.Users
            .Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
            .AsNoTracking()
            .ToListAsync();
        return Ok(users.Select(ToDto));
    }

    // GET /api/users/5
    [HttpGet("{id:int}")]
    public async Task<ActionResult<UserDto>> GetById(int id)
    {
        var user = await _db.Users
            .Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == id);
        return user is null ? NotFound() : Ok(ToDto(user));
    }

    // POST /api/users
    [HttpPost]
    public async Task<ActionResult<UserDto>> Create(CreateUserDto dto)
    {
        if (await _db.Users.AnyAsync(u => u.EmployeeCode == dto.EmployeeCode))
            return Conflict($"EmployeeCode '{dto.EmployeeCode}' already exists.");
        if (await _db.Users.AnyAsync(u => u.Email == dto.Email))
            return Conflict($"Email '{dto.Email}' already exists.");

        var user = new User
        {
            EmployeeCode = dto.EmployeeCode,
            FirstName = dto.FirstName,
            LastName = dto.LastName,
            Email = dto.Email,
            PhoneNumber = dto.PhoneNumber,
            JobTitle = dto.JobTitle,
            Department = dto.Department,
            Discipline = dto.Discipline,
            EmploymentType = dto.EmploymentType,
            ProjectSite = dto.ProjectSite,
            Location = dto.Location,
            DateOfJoining = dto.DateOfJoining,
            IsActive = dto.IsActive
        };
        _db.Users.Add(user);
        await _db.SaveChangesAsync();
        await Audit("User", user.Id.ToString(), "CREATE", $"Created user {user.EmployeeCode}");

        return CreatedAtAction(nameof(GetById), new { id = user.Id }, ToDto(user));
    }

    // PUT /api/users/5
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, UpdateUserDto dto)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == id);
        if (user is null) return NotFound();

        if (await _db.Users.AnyAsync(u => u.Email == dto.Email && u.Id != id))
            return Conflict($"Email '{dto.Email}' already in use.");

        user.FirstName = dto.FirstName;
        user.LastName = dto.LastName;
        user.Email = dto.Email;
        user.PhoneNumber = dto.PhoneNumber;
        user.JobTitle = dto.JobTitle;
        user.Department = dto.Department;
        user.Discipline = dto.Discipline;
        user.EmploymentType = dto.EmploymentType;
        user.ProjectSite = dto.ProjectSite;
        user.Location = dto.Location;
        user.DateOfJoining = dto.DateOfJoining;
        user.IsActive = dto.IsActive;
        user.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        await Audit("User", id.ToString(), "UPDATE", $"Updated user {user.EmployeeCode}");
        return NoContent();
    }

    // DELETE /api/users/5
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == id);
        if (user is null) return NotFound();
        _db.Users.Remove(user);
        await _db.SaveChangesAsync();
        await Audit("User", id.ToString(), "DELETE", $"Deleted user {user.EmployeeCode}");
        return NoContent();
    }

    // POST /api/users/5/roles  -> assign a role
    [HttpPost("{id:int}/roles")]
    public async Task<IActionResult> AssignRole(int id, AssignRoleDto dto)
    {
        var user = await _db.Users.FindAsync(id);
        if (user is null) return NotFound("User not found.");
        if (!await _db.Roles.AnyAsync(r => r.Id == dto.RoleId))
            return NotFound("Role not found.");
        if (await _db.UserRoles.AnyAsync(ur => ur.UserId == id && ur.RoleId == dto.RoleId))
            return Conflict("User already has this role.");

        _db.UserRoles.Add(new UserRole
        {
            UserId = id,
            RoleId = dto.RoleId,
            AssignedBy = dto.AssignedBy ?? "API"
        });
        await _db.SaveChangesAsync();
        await Audit("User", id.ToString(), "ASSIGN_ROLE", $"Assigned role {dto.RoleId} to user {id}");
        return NoContent();
    }

    // DELETE /api/users/5/roles/3  -> remove a role
    [HttpDelete("{id:int}/roles/{roleId:int}")]
    public async Task<IActionResult> RemoveRole(int id, int roleId)
    {
        var link = await _db.UserRoles.FirstOrDefaultAsync(ur => ur.UserId == id && ur.RoleId == roleId);
        if (link is null) return NotFound("User does not have this role.");
        _db.UserRoles.Remove(link);
        await _db.SaveChangesAsync();
        await Audit("User", id.ToString(), "REMOVE_ROLE", $"Removed role {roleId} from user {id}");
        return NoContent();
    }

    private static UserDto ToDto(User u) => new(
        u.Id, u.EmployeeCode, u.FirstName, u.LastName, u.Email, u.PhoneNumber,
        u.JobTitle, u.Department, u.Discipline, u.EmploymentType, u.ProjectSite,
        u.Location, u.DateOfJoining, u.IsActive, u.CreatedAt, u.UpdatedAt,
        u.UserRoles.Select(ur => ur.Role.Name).ToList());

    private async Task Audit(string entity, string entityId, string action, string details)
    {
        _db.AuditLogs.Add(new AuditLog
        {
            EntityName = entity, EntityId = entityId, Action = action,
            PerformedBy = "API", Details = details
        });
        await _db.SaveChangesAsync();
    }
}
