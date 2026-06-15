using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OracleDigitalWorker.Data;
using OracleDigitalWorker.DTOs;
using OracleDigitalWorker.Models;

namespace OracleDigitalWorker.Controllers;

[ApiController]
[Route("api/[controller]")]
public class RolesController : ControllerBase
{
    private readonly AppDbContext _db;
    public RolesController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<ActionResult<IEnumerable<RoleDto>>> GetAll()
    {
        var roles = await _db.Roles
            .Include(r => r.RolePermissions).ThenInclude(rp => rp.Permission)
            .AsNoTracking().ToListAsync();
        return Ok(roles.Select(ToDto));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<RoleDto>> GetById(int id)
    {
        var role = await _db.Roles
            .Include(r => r.RolePermissions).ThenInclude(rp => rp.Permission)
            .AsNoTracking().FirstOrDefaultAsync(r => r.Id == id);
        return role is null ? NotFound() : Ok(ToDto(role));
    }

    [Authorize]
    [HttpPost]
    public async Task<ActionResult<RoleDto>> Create(CreateRoleDto dto)
    {
        if (await _db.Roles.CountAsync(r => r.Name == dto.Name) > 0)
            return Conflict($"Role '{dto.Name}' already exists.");

        var role = new Role
        {
            Name = dto.Name,
            Description = dto.Description,
            RoleLevel = dto.RoleLevel,
            Department = dto.Department,
            IsActive = dto.IsActive,
            IsSystemRole = false
        };
        _db.Roles.Add(role);
        await _db.SaveChangesAsync();
        await Audit("Role", role.Id.ToString(), "CREATE", $"Created role {role.Name}");
        return CreatedAtAction(nameof(GetById), new { id = role.Id }, ToDto(role));
    }

    [Authorize]
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, UpdateRoleDto dto)
    {
        var role = await _db.Roles.FirstOrDefaultAsync(r => r.Id == id);
        if (role is null) return NotFound();
        if (await _db.Roles.CountAsync(r => r.Name == dto.Name && r.Id != id) > 0)
            return Conflict($"Role '{dto.Name}' already in use.");

        role.Name = dto.Name;
        role.Description = dto.Description;
        role.RoleLevel = dto.RoleLevel;
        role.Department = dto.Department;
        role.IsActive = dto.IsActive;
        role.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        await Audit("Role", id.ToString(), "UPDATE", $"Updated role {role.Name}");
        return NoContent();
    }

    [Authorize]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var role = await _db.Roles.FirstOrDefaultAsync(r => r.Id == id);
        if (role is null) return NotFound();
        if (role.IsSystemRole) return BadRequest("System roles cannot be deleted.");
        _db.Roles.Remove(role);
        await _db.SaveChangesAsync();
        await Audit("Role", id.ToString(), "DELETE", $"Deleted role {role.Name}");
        return NoContent();
    }

    // POST /api/roles/3/permissions -> grant a permission to a role
    [Authorize]
    [HttpPost("{id:int}/permissions")]
    public async Task<IActionResult> AssignPermission(int id, AssignPermissionDto dto)
    {
        if (await _db.Roles.CountAsync(r => r.Id == id) == 0) return NotFound("Role not found.");
        if (await _db.Permissions.CountAsync(p => p.Id == dto.PermissionId) == 0)
            return NotFound("Permission not found.");
        if (await _db.RolePermissions.CountAsync(rp => rp.RoleId == id && rp.PermissionId == dto.PermissionId) > 0)
            return Conflict("Role already has this permission.");

        _db.RolePermissions.Add(new RolePermission { RoleId = id, PermissionId = dto.PermissionId });
        await _db.SaveChangesAsync();
        await Audit("Role", id.ToString(), "GRANT_PERMISSION", $"Granted permission {dto.PermissionId} to role {id}");
        return NoContent();
    }

    // DELETE /api/roles/3/permissions/7 -> revoke a permission
    [Authorize]
    [HttpDelete("{id:int}/permissions/{permissionId:int}")]
    public async Task<IActionResult> RevokePermission(int id, int permissionId)
    {
        var link = await _db.RolePermissions
            .FirstOrDefaultAsync(rp => rp.RoleId == id && rp.PermissionId == permissionId);
        if (link is null) return NotFound("Role does not have this permission.");
        _db.RolePermissions.Remove(link);
        await _db.SaveChangesAsync();
        await Audit("Role", id.ToString(), "REVOKE_PERMISSION", $"Revoked permission {permissionId} from role {id}");
        return NoContent();
    }

    private static RoleDto ToDto(Role r) => new(
        r.Id, r.Name, r.Description, r.RoleLevel, r.Department, r.IsSystemRole,
        r.IsActive, r.CreatedAt, r.UpdatedAt,
        r.RolePermissions.Select(rp => rp.Permission.Code).ToList());

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
