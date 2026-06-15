# OracleDigitalWorker — .NET 8 Web API (EPC RBAC data layer)
# Multi-stage: build/publish with the SDK, run on the slim ASP.NET runtime.

# ---- Build ----
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Restore (layer cache on csproj)
COPY OracleDigitalWorker.csproj ./
RUN dotnet restore OracleDigitalWorker.csproj

# Build + publish
COPY . .
RUN dotnet publish OracleDigitalWorker.csproj -c Release -o /app/publish /p:UseAppHost=false

# ---- Runtime ----
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
COPY --from=build /app/publish .

# Listen on 8080 inside the container (HTTP only; TLS terminates at the edge).
ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Development
EXPOSE 8080

ENTRYPOINT ["dotnet", "OracleDigitalWorker.dll"]
