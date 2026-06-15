using Microsoft.EntityFrameworkCore;
using OracleDigitalWorker.Models;

namespace OracleDigitalWorker.Data;

/// <summary>
/// Seeds the EPC RBAC schema with realistic dummy data:
/// standard EPC permissions, roles (with permission sets), and users (with roles).
/// Idempotent — only seeds when the tables are empty.
/// </summary>
public static class DbSeeder
{
    public static async Task SeedAsync(AppDbContext db)
    {
        // Use Count (not Any) — EF's AnyAsync emits a FALSE literal that Oracle
        // rejects with ORA-00904 when bool is mapped to NUMBER(1).
        if (await db.Permissions.CountAsync() > 0 ||
            await db.Roles.CountAsync() > 0 ||
            await db.Users.CountAsync() > 0)
        {
            return; // already seeded
        }

        // ---------- 1. Permissions (standard EPC capabilities) ----------
        var permissions = new List<Permission>
        {
            // Projects
            P("PROJECT.VIEW", "View Projects", PermissionModule.Projects, PermissionAction.Read),
            P("PROJECT.CREATE", "Create Project", PermissionModule.Projects, PermissionAction.Create),
            P("PROJECT.UPDATE", "Update Project", PermissionModule.Projects, PermissionAction.Update),
            P("PROJECT.APPROVE", "Approve Project Baseline", PermissionModule.Projects, PermissionAction.Approve),
            // Engineering
            P("DRAWING.VIEW", "View Drawings", PermissionModule.Engineering, PermissionAction.Read),
            P("DRAWING.CREATE", "Create Drawing", PermissionModule.Engineering, PermissionAction.Create),
            P("DRAWING.RELEASE", "Release Drawing (IFC)", PermissionModule.Engineering, PermissionAction.Release),
            P("DESIGN.SUBMIT", "Submit Design Package", PermissionModule.Engineering, PermissionAction.Submit),
            // Procurement
            P("RFQ.CREATE", "Create RFQ", PermissionModule.Procurement, PermissionAction.Create),
            P("PO.CREATE", "Create Purchase Order", PermissionModule.Procurement, PermissionAction.Create),
            P("PO.APPROVE", "Approve Purchase Order", PermissionModule.Procurement, PermissionAction.Approve),
            P("VENDOR.MANAGE", "Manage Vendors", PermissionModule.Procurement, PermissionAction.Update),
            // Construction
            P("WORKPACK.VIEW", "View Work Packages", PermissionModule.Construction, PermissionAction.Read),
            P("WORKPACK.ISSUE", "Issue Work Package", PermissionModule.Construction, PermissionAction.Release),
            P("SITE.PROGRESS.UPDATE", "Update Site Progress", PermissionModule.Construction, PermissionAction.Update),
            // Quality Control
            P("ITP.CREATE", "Create Inspection Test Plan", PermissionModule.QualityControl, PermissionAction.Create),
            P("NCR.RAISE", "Raise Non-Conformance Report", PermissionModule.QualityControl, PermissionAction.Create),
            P("INSPECTION.APPROVE", "Approve Inspection", PermissionModule.QualityControl, PermissionAction.Approve),
            // HSE
            P("PERMIT.ISSUE", "Issue Work Permit", PermissionModule.HSE, PermissionAction.Release),
            P("INCIDENT.REPORT", "Report HSE Incident", PermissionModule.HSE, PermissionAction.Create),
            // Document Control
            P("DOC.VIEW", "View Documents", PermissionModule.DocumentControl, PermissionAction.Read),
            P("DOC.CONTROL", "Control Documents", PermissionModule.DocumentControl, PermissionAction.Update),
            // Finance
            P("INVOICE.APPROVE", "Approve Invoice", PermissionModule.Finance, PermissionAction.Approve),
            // Administration
            P("USER.MANAGE", "Manage Users", PermissionModule.Administration, PermissionAction.Update),
            P("ROLE.MANAGE", "Manage Roles & Permissions", PermissionModule.Administration, PermissionAction.Update),
        };
        await db.Permissions.AddRangeAsync(permissions);
        await db.SaveChangesAsync();

        var pById = permissions.ToDictionary(p => p.Code, p => p.Id);
        int[] Perms(params string[] codes) => codes.Select(c => pById[c]).ToArray();

        // ---------- 2. Roles (with permission sets) ----------
        var roleDefs = new (string Name, string Desc, int Level, Department Dept, bool System, string[] Perms)[]
        {
            ("Project Director", "Overall accountability for project delivery", 1, Department.ProjectControls, true,
                new[] { "PROJECT.VIEW","PROJECT.CREATE","PROJECT.UPDATE","PROJECT.APPROVE","PO.APPROVE","INVOICE.APPROVE","DOC.VIEW" }),
            ("Project Manager", "Day-to-day project management", 2, Department.ProjectControls, true,
                new[] { "PROJECT.VIEW","PROJECT.UPDATE","PO.APPROVE","WORKPACK.VIEW","SITE.PROGRESS.UPDATE","DOC.VIEW","INVOICE.APPROVE" }),
            ("Lead Engineer", "Discipline engineering lead", 3, Department.Engineering, true,
                new[] { "DRAWING.VIEW","DRAWING.CREATE","DRAWING.RELEASE","DESIGN.SUBMIT","DOC.VIEW","PROJECT.VIEW" }),
            ("Design Engineer", "Produces engineering deliverables", 4, Department.Engineering, false,
                new[] { "DRAWING.VIEW","DRAWING.CREATE","DESIGN.SUBMIT","DOC.VIEW" }),
            ("Procurement Manager", "Leads procurement & contracts", 3, Department.Procurement, true,
                new[] { "RFQ.CREATE","PO.CREATE","PO.APPROVE","VENDOR.MANAGE","DOC.VIEW","PROJECT.VIEW" }),
            ("Procurement Officer", "Executes purchasing activities", 4, Department.Procurement, false,
                new[] { "RFQ.CREATE","PO.CREATE","VENDOR.MANAGE","DOC.VIEW" }),
            ("Construction Manager", "Leads site construction", 2, Department.Construction, true,
                new[] { "WORKPACK.VIEW","WORKPACK.ISSUE","SITE.PROGRESS.UPDATE","PERMIT.ISSUE","DOC.VIEW","PROJECT.VIEW" }),
            ("Site Supervisor", "Supervises field crews", 4, Department.Construction, false,
                new[] { "WORKPACK.VIEW","SITE.PROGRESS.UPDATE","DOC.VIEW" }),
            ("QA/QC Inspector", "Quality inspection & control", 4, Department.QualityAssurance, true,
                new[] { "ITP.CREATE","NCR.RAISE","INSPECTION.APPROVE","DOC.VIEW","WORKPACK.VIEW" }),
            ("HSE Officer", "Health, safety & environment", 4, Department.HealthSafetyEnvironment, true,
                new[] { "PERMIT.ISSUE","INCIDENT.REPORT","DOC.VIEW","WORKPACK.VIEW" }),
            ("Document Controller", "Manages controlled documents", 5, Department.Administration, false,
                new[] { "DOC.VIEW","DOC.CONTROL","DRAWING.VIEW" }),
            ("System Administrator", "Manages users, roles and permissions", 1, Department.Administration, true,
                new[] { "USER.MANAGE","ROLE.MANAGE","DOC.VIEW","PROJECT.VIEW" }),
        };

        var roles = new List<Role>();
        foreach (var rd in roleDefs)
        {
            var role = new Role
            {
                Name = rd.Name,
                Description = rd.Desc,
                RoleLevel = rd.Level,
                Department = rd.Dept,
                IsSystemRole = rd.System,
                IsActive = true,
                RolePermissions = Perms(rd.Perms)
                    .Select(pid => new RolePermission { PermissionId = pid }).ToList()
            };
            roles.Add(role);
        }
        await db.Roles.AddRangeAsync(roles);
        await db.SaveChangesAsync();

        var rByName = roles.ToDictionary(r => r.Name, r => r.Id);

        // ---------- 3. Users (with role assignments) ----------
        var userDefs = new (string Code, string First, string Last, string Title, Department Dept,
            Discipline Disc, EmploymentType Emp, string Site, string Loc, string Role)[]
        {
            ("EPC-0001","Rajesh","Menon","Project Director",Department.ProjectControls,Discipline.Multidiscipline,EmploymentType.Permanent,"Refinery Expansion - Phase 2","Mumbai HO","Project Director"),
            ("EPC-0002","Anita","Desai","Project Manager",Department.ProjectControls,Discipline.Multidiscipline,EmploymentType.Permanent,"Refinery Expansion - Phase 2","Jamnagar Site","Project Manager"),
            ("EPC-0003","Vikram","Singh","Lead Piping Engineer",Department.Engineering,Discipline.Piping,EmploymentType.Permanent,"Refinery Expansion - Phase 2","Mumbai HO","Lead Engineer"),
            ("EPC-0004","Priya","Nair","Lead Electrical Engineer",Department.Engineering,Discipline.Electrical,EmploymentType.Permanent,"LNG Terminal Project","Chennai HO","Lead Engineer"),
            ("EPC-0005","Arjun","Reddy","Design Engineer - Civil",Department.Engineering,Discipline.Civil,EmploymentType.Permanent,"LNG Terminal Project","Chennai HO","Design Engineer"),
            ("EPC-0006","Sneha","Iyer","Design Engineer - Mechanical",Department.Engineering,Discipline.Mechanical,EmploymentType.Contract,"Refinery Expansion - Phase 2","Mumbai HO","Design Engineer"),
            ("EPC-0007","Mohammed","Khan","Instrumentation Engineer",Department.Engineering,Discipline.Instrumentation,EmploymentType.Permanent,"LNG Terminal Project","Chennai HO","Design Engineer"),
            ("EPC-0008","Deepa","Krishnan","Procurement Manager",Department.Procurement,Discipline.Multidiscipline,EmploymentType.Permanent,"Refinery Expansion - Phase 2","Mumbai HO","Procurement Manager"),
            ("EPC-0009","Suresh","Pillai","Procurement Officer",Department.Procurement,Discipline.Multidiscipline,EmploymentType.Permanent,"LNG Terminal Project","Chennai HO","Procurement Officer"),
            ("EPC-0010","Kavya","Rao","Procurement Officer",Department.Procurement,Discipline.Multidiscipline,EmploymentType.Contract,"Refinery Expansion - Phase 2","Mumbai HO","Procurement Officer"),
            ("EPC-0011","Ramesh","Gupta","Construction Manager",Department.Construction,Discipline.Multidiscipline,EmploymentType.Permanent,"Refinery Expansion - Phase 2","Jamnagar Site","Construction Manager"),
            ("EPC-0012","Lakshmi","Subramanian","Site Supervisor - Civil",Department.Construction,Discipline.Civil,EmploymentType.Permanent,"Refinery Expansion - Phase 2","Jamnagar Site","Site Supervisor"),
            ("EPC-0013","Imran","Sheikh","Site Supervisor - Mechanical",Department.Construction,Discipline.Mechanical,EmploymentType.Contract,"LNG Terminal Project","Dahej Site","Site Supervisor"),
            ("EPC-0014","Geeta","Banerjee","QA/QC Inspector - Welding",Department.QualityAssurance,Discipline.Mechanical,EmploymentType.Permanent,"Refinery Expansion - Phase 2","Jamnagar Site","QA/QC Inspector"),
            ("EPC-0015","Sanjay","Verma","QA/QC Inspector - Civil",Department.QualityAssurance,Discipline.Civil,EmploymentType.Contract,"LNG Terminal Project","Dahej Site","QA/QC Inspector"),
            ("EPC-0016","Fatima","Ansari","HSE Officer",Department.HealthSafetyEnvironment,Discipline.HSE,EmploymentType.Permanent,"Refinery Expansion - Phase 2","Jamnagar Site","HSE Officer"),
            ("EPC-0017","Nikhil","Joshi","Document Controller",Department.Administration,Discipline.Multidiscipline,EmploymentType.Permanent,"LNG Terminal Project","Chennai HO","Document Controller"),
            ("EPC-0018","Admin","User","System Administrator",Department.Administration,Discipline.Multidiscipline,EmploymentType.Permanent,"All Projects","Mumbai HO","System Administrator"),
        };

        var rnd = new Random(42);
        var users = new List<User>();
        foreach (var ud in userDefs)
        {
            users.Add(new User
            {
                EmployeeCode = ud.Code,
                FirstName = ud.First,
                LastName = ud.Last,
                Email = $"{ud.First}.{ud.Last}@epc-demo.com".ToLowerInvariant(),
                PhoneNumber = $"+91-9{rnd.Next(100000000, 999999999)}",
                JobTitle = ud.Title,
                Department = ud.Dept,
                Discipline = ud.Disc,
                EmploymentType = ud.Emp,
                ProjectSite = ud.Site,
                Location = ud.Loc,
                DateOfJoining = DateTime.UtcNow.AddDays(-rnd.Next(120, 1500)),
                IsActive = true,
                UserRoles = new List<UserRole>
                {
                    new() { RoleId = rByName[ud.Role], AssignedBy = "SEED" }
                }
            });
        }
        await db.Users.AddRangeAsync(users);
        await db.SaveChangesAsync();

        // ---------- 4. An initial audit entry ----------
        await db.AuditLogs.AddAsync(new AuditLog
        {
            EntityName = "System",
            Action = "SEED",
            PerformedBy = "SEED",
            Details = $"Seeded {permissions.Count} permissions, {roles.Count} roles, {users.Count} users."
        });
        await db.SaveChangesAsync();
    }

    private static Permission P(string code, string name, PermissionModule m, PermissionAction a) =>
        new() { Code = code, Name = name, Module = m, Action = a, IsActive = true };
}
