using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OracleDigitalWorker.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AUDIT_LOGS",
                columns: table => new
                {
                    Id = table.Column<long>(type: "NUMBER(19)", nullable: false)
                        .Annotation("Oracle:Identity", "START WITH 1 INCREMENT BY 1"),
                    EntityName = table.Column<string>(type: "NVARCHAR2(60)", maxLength: 60, nullable: false),
                    EntityId = table.Column<string>(type: "NVARCHAR2(60)", maxLength: 60, nullable: true),
                    Action = table.Column<string>(type: "NVARCHAR2(40)", maxLength: 40, nullable: false),
                    PerformedBy = table.Column<string>(type: "NVARCHAR2(120)", maxLength: 120, nullable: true),
                    Details = table.Column<string>(type: "NVARCHAR2(2000)", maxLength: 2000, nullable: true),
                    Timestamp = table.Column<DateTime>(type: "TIMESTAMP(7)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AUDIT_LOGS", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "PERMISSIONS",
                columns: table => new
                {
                    Id = table.Column<int>(type: "NUMBER(10)", nullable: false)
                        .Annotation("Oracle:Identity", "START WITH 1 INCREMENT BY 1"),
                    Code = table.Column<string>(type: "NVARCHAR2(100)", maxLength: 100, nullable: false),
                    Name = table.Column<string>(type: "NVARCHAR2(120)", maxLength: 120, nullable: false),
                    Description = table.Column<string>(type: "NVARCHAR2(300)", maxLength: 300, nullable: true),
                    Module = table.Column<string>(type: "NVARCHAR2(40)", maxLength: 40, nullable: false),
                    Action = table.Column<string>(type: "NVARCHAR2(40)", maxLength: 40, nullable: false),
                    IsActive = table.Column<int>(type: "NUMBER(1)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TIMESTAMP(7)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PERMISSIONS", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ROLES",
                columns: table => new
                {
                    Id = table.Column<int>(type: "NUMBER(10)", nullable: false)
                        .Annotation("Oracle:Identity", "START WITH 1 INCREMENT BY 1"),
                    Name = table.Column<string>(type: "NVARCHAR2(80)", maxLength: 80, nullable: false),
                    Description = table.Column<string>(type: "NVARCHAR2(300)", maxLength: 300, nullable: true),
                    RoleLevel = table.Column<int>(type: "NUMBER(10)", nullable: false),
                    Department = table.Column<string>(type: "NVARCHAR2(40)", maxLength: 40, nullable: false),
                    IsSystemRole = table.Column<int>(type: "NUMBER(1)", nullable: false),
                    IsActive = table.Column<int>(type: "NUMBER(1)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TIMESTAMP(7)", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TIMESTAMP(7)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ROLES", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "USERS",
                columns: table => new
                {
                    Id = table.Column<int>(type: "NUMBER(10)", nullable: false)
                        .Annotation("Oracle:Identity", "START WITH 1 INCREMENT BY 1"),
                    EmployeeCode = table.Column<string>(type: "NVARCHAR2(20)", maxLength: 20, nullable: false),
                    FirstName = table.Column<string>(type: "NVARCHAR2(60)", maxLength: 60, nullable: false),
                    LastName = table.Column<string>(type: "NVARCHAR2(60)", maxLength: 60, nullable: false),
                    Email = table.Column<string>(type: "NVARCHAR2(150)", maxLength: 150, nullable: false),
                    PhoneNumber = table.Column<string>(type: "NVARCHAR2(30)", maxLength: 30, nullable: true),
                    JobTitle = table.Column<string>(type: "NVARCHAR2(100)", maxLength: 100, nullable: true),
                    Department = table.Column<string>(type: "NVARCHAR2(40)", maxLength: 40, nullable: false),
                    Discipline = table.Column<string>(type: "NVARCHAR2(40)", maxLength: 40, nullable: false),
                    EmploymentType = table.Column<string>(type: "NVARCHAR2(40)", maxLength: 40, nullable: false),
                    ProjectSite = table.Column<string>(type: "NVARCHAR2(120)", maxLength: 120, nullable: true),
                    Location = table.Column<string>(type: "NVARCHAR2(120)", maxLength: 120, nullable: true),
                    DateOfJoining = table.Column<DateTime>(type: "TIMESTAMP(7)", nullable: true),
                    IsActive = table.Column<int>(type: "NUMBER(1)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TIMESTAMP(7)", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TIMESTAMP(7)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_USERS", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ROLE_PERMISSIONS",
                columns: table => new
                {
                    RoleId = table.Column<int>(type: "NUMBER(10)", nullable: false),
                    PermissionId = table.Column<int>(type: "NUMBER(10)", nullable: false),
                    AssignedAt = table.Column<DateTime>(type: "TIMESTAMP(7)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ROLE_PERMISSIONS", x => new { x.RoleId, x.PermissionId });
                    table.ForeignKey(
                        name: "FK_ROLE_PERMISSIONS_PERMISSIONS_PermissionId",
                        column: x => x.PermissionId,
                        principalTable: "PERMISSIONS",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ROLE_PERMISSIONS_ROLES_RoleId",
                        column: x => x.RoleId,
                        principalTable: "ROLES",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "USER_ROLES",
                columns: table => new
                {
                    UserId = table.Column<int>(type: "NUMBER(10)", nullable: false),
                    RoleId = table.Column<int>(type: "NUMBER(10)", nullable: false),
                    AssignedAt = table.Column<DateTime>(type: "TIMESTAMP(7)", nullable: false),
                    AssignedBy = table.Column<string>(type: "NVARCHAR2(120)", maxLength: 120, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_USER_ROLES", x => new { x.UserId, x.RoleId });
                    table.ForeignKey(
                        name: "FK_USER_ROLES_ROLES_RoleId",
                        column: x => x.RoleId,
                        principalTable: "ROLES",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_USER_ROLES_USERS_UserId",
                        column: x => x.UserId,
                        principalTable: "USERS",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AUDIT_LOGS_EntityName",
                table: "AUDIT_LOGS",
                column: "EntityName");

            migrationBuilder.CreateIndex(
                name: "IX_AUDIT_LOGS_Timestamp",
                table: "AUDIT_LOGS",
                column: "Timestamp");

            migrationBuilder.CreateIndex(
                name: "IX_PERMISSIONS_Code",
                table: "PERMISSIONS",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ROLE_PERMISSIONS_PermissionId",
                table: "ROLE_PERMISSIONS",
                column: "PermissionId");

            migrationBuilder.CreateIndex(
                name: "IX_ROLES_Name",
                table: "ROLES",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_USER_ROLES_RoleId",
                table: "USER_ROLES",
                column: "RoleId");

            migrationBuilder.CreateIndex(
                name: "IX_USERS_Email",
                table: "USERS",
                column: "Email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_USERS_EmployeeCode",
                table: "USERS",
                column: "EmployeeCode",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AUDIT_LOGS");

            migrationBuilder.DropTable(
                name: "ROLE_PERMISSIONS");

            migrationBuilder.DropTable(
                name: "USER_ROLES");

            migrationBuilder.DropTable(
                name: "PERMISSIONS");

            migrationBuilder.DropTable(
                name: "ROLES");

            migrationBuilder.DropTable(
                name: "USERS");
        }
    }
}
