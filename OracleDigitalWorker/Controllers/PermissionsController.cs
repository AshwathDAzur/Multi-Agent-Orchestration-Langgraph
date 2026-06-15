using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OracleDigitalWorker.Data;
using OracleDigitalWorker.DTOs;
using OracleDigitalWorker.Models;

namespace OracleDigitalWorker.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PermissionsController : ControllerBase
{
    private readonly AppDbContext _db;
    public PermissionsController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<ActionResult<IEnumerable<PermissionDto>>> GetAll()
    {
        var perms = await _db.Permissions.AsNoTracking().ToListAsync();
        return Ok(perms.Select(ToDto));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<PermissionDto>> GetById(int id)
    {
        var p = await _db.Permissions.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
        return p is null ? NotFound() : Ok(ToDto(p));
    }

    [HttpPost]
    public async Task<ActionResult<PermissionDto>> Create(CreatePermissionDto dto)
    {
        if (await _db.Permissions.AnyAsync(p => p.Code == dto.Code))
            return Conflict($"Permission code '{dto.Code}' already exists.");

        var p = new Permission
        {
            Code = dto.Code,
            Name = dto.Name,
            Description = dto.Description,
            Module = dto.Module,
            Action = dto.Action,
            IsActive = dto.IsActive
        };
        _db.Permissions.Add(p);
        await _db.SaveChangesAsync();
        await Audit("Permission", p.Id.ToString(), "CREATE", $"Created permission {p.Code}");
        return CreatedAtAction(nameof(GetById), new { id = p.Id }, ToDto(p));
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, UpdatePermissionDto dto)
    {
        var p = await _db.Permissions.FirstOrDefaultAsync(x => x.Id == id);
        if (p is null) return NotFound();
        p.Name = dto.Name;
        p.Description = dto.Description;
        p.Module = dto.Module;
        p.Action = dto.Action;
        p.IsActive = dto.IsActive;
        await _db.SaveChangesAsync();
        await Audit("Permission", id.ToString(), "UPDATE", $"Updated permission {p.Code}");
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var p = await _db.Permissions.FirstOrDefaultAsync(x => x.Id == id);
        if (p is null) return NotFound();
        _db.Permissions.Remove(p);
        await _db.SaveChangesAsync();
        await Audit("Permission", id.ToString(), "DELETE", $"Deleted permission {p.Code}");
        return NoContent();
    }

    private static PermissionDto ToDto(Permission p) => new(
        p.Id, p.Code, p.Name, p.Description, p.Module, p.Action, p.IsActive, p.CreatedAt);

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
