using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using OracleDigitalWorker.Models;

namespace OracleDigitalWorker.Data;

/// <summary>EF Core context for the EPC RBAC schema (created under the QUANTA schema).</summary>
public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<Role> Roles => Set<Role>();
    public DbSet<Permission> Permissions => Set<Permission>();
    public DbSet<UserRole> UserRoles => Set<UserRole>();
    public DbSet<RolePermission> RolePermissions => Set<RolePermission>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        // ---- Users ----
        b.Entity<User>(e =>
        {
            e.ToTable("USERS");
            e.HasKey(x => x.Id);
            e.HasIndex(x => x.EmployeeCode).IsUnique();
            e.HasIndex(x => x.Email).IsUnique();
            // store enums as their string name for readability in the DB
            e.Property(x => x.Department).HasConversion<string>().HasMaxLength(40);
            e.Property(x => x.Discipline).HasConversion<string>().HasMaxLength(40);
            e.Property(x => x.EmploymentType).HasConversion<string>().HasMaxLength(40);
        });

        // ---- Roles ----
        b.Entity<Role>(e =>
        {
            e.ToTable("ROLES");
            e.HasKey(x => x.Id);
            e.HasIndex(x => x.Name).IsUnique();
            e.Property(x => x.Department).HasConversion<string>().HasMaxLength(40);
        });

        // ---- Permissions ----
        b.Entity<Permission>(e =>
        {
            e.ToTable("PERMISSIONS");
            e.HasKey(x => x.Id);
            e.HasIndex(x => x.Code).IsUnique();
            e.Property(x => x.Module).HasConversion<string>().HasMaxLength(40);
            e.Property(x => x.Action).HasConversion<string>().HasMaxLength(40);
        });

        // ---- UserRoles (M:N) ----
        b.Entity<UserRole>(e =>
        {
            e.ToTable("USER_ROLES");
            e.HasKey(x => new { x.UserId, x.RoleId });
            e.HasOne(x => x.User)
                .WithMany(u => u.UserRoles)
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Role)
                .WithMany(r => r.UserRoles)
                .HasForeignKey(x => x.RoleId)
                .OnDelete(DeleteBehavior.Cascade);
            e.Property(x => x.AssignedBy).HasMaxLength(120);
        });

        // ---- RolePermissions (M:N) ----
        b.Entity<RolePermission>(e =>
        {
            e.ToTable("ROLE_PERMISSIONS");
            e.HasKey(x => new { x.RoleId, x.PermissionId });
            e.HasOne(x => x.Role)
                .WithMany(r => r.RolePermissions)
                .HasForeignKey(x => x.RoleId)
                .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Permission)
                .WithMany(p => p.RolePermissions)
                .HasForeignKey(x => x.PermissionId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // ---- AuditLogs ----
        b.Entity<AuditLog>(e =>
        {
            e.ToTable("AUDIT_LOGS");
            e.HasKey(x => x.Id);
            e.HasIndex(x => x.EntityName);
            e.HasIndex(x => x.Timestamp);
        });

        // Oracle 21c has no native SQL BOOLEAN type (added only in 23ai), so map
        // every bool property to NUMBER(1) (0/1) to avoid ORA-00902.
        var boolToNumber = new BoolToZeroOneConverter<int>();
        foreach (var entity in b.Model.GetEntityTypes())
        {
            foreach (var prop in entity.GetProperties())
            {
                if (prop.ClrType == typeof(bool) || prop.ClrType == typeof(bool?))
                {
                    prop.SetValueConverter(boolToNumber);
                    prop.SetColumnType("NUMBER(1)");
                }
            }
        }

        base.OnModelCreating(b);
    }
}
