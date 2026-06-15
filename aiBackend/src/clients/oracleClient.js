// Thin HTTP client for the OracleDigitalWorker .NET API (the EPC data layer).
//
// The DataAccess agent's tools call THIS — never the database directly. All DB
// access goes through the .NET API's safe, parameterized endpoints. This is the
// one place the base URL (and, later, service auth) lives.

const BASE_URL = process.env.ORACLE_API_URL || "http://localhost:5216";

async function get(path) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Oracle API ${path} failed (${res.status}): ${body.slice(0, 200)}`);
  }
  return res.json();
}

export const oracleClient = {
  // Users
  listUsers: () => get("/api/users"),
  getUser: (id) => get(`/api/users/${id}`),

  // Roles (include their permission codes)
  listRoles: () => get("/api/roles"),
  getRole: (id) => get(`/api/roles/${id}`),

  // Permissions
  listPermissions: () => get("/api/permissions"),
  getPermission: (id) => get(`/api/permissions/${id}`),
};
