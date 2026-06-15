using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using OracleDigitalWorker.Data;

var builder = WebApplication.CreateBuilder(args);

// ---- Services ----
builder.Services.AddControllers()
    .AddJsonOptions(o =>
    {
        // Serialize enums as their string names in API responses.
        o.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    });

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// ---- M2M auth: validate Keycloak-issued JWTs on protected (write) endpoints ----
// Keycloak advertises a browser-facing issuer (localhost:8081), but this service
// reaches Keycloak internally (keycloak:8080). So we fetch signing keys from the
// INTERNAL metadata URL while validating the issuer against the PUBLIC value.
var keycloakInternal = builder.Configuration["Keycloak:MetadataUrl"]
    ?? "http://keycloak:8080/realms/aichat";
var keycloakIssuer = builder.Configuration["Keycloak:Issuer"]
    ?? "http://localhost:8081/realms/aichat";
var apiAudience = builder.Configuration["Keycloak:Audience"] ?? "oracle-api";

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.MetadataAddress = $"{keycloakInternal}/.well-known/openid-configuration";
        options.RequireHttpsMetadata = false; // local dev over HTTP
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = keycloakIssuer,
            ValidateAudience = true,
            ValidAudience = apiAudience,
            ValidateLifetime = true,
        };
    });
builder.Services.AddAuthorization();

// EF Core + Oracle. Connection string lives in appsettings.json.
var connectionString = builder.Configuration.GetConnectionString("OracleDb");
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseOracle(connectionString));

var app = builder.Build();

// ---- Auto-migrate + seed on startup (dev convenience) ----
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.MigrateAsync();   // applies pending migrations (creates schema)
    await DbSeeder.SeedAsync(db);       // seeds EPC dummy data if empty
}

// ---- Pipeline ----
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();
