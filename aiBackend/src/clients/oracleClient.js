// Thin HTTP client for the OracleDigitalWorker .NET API (the EPC data layer).
//
// Reads (GET) are open. Writes (POST/DELETE) are protected by the .NET API and
// require a Keycloak client-credentials (M2M) token, which we fetch here, cache,
// and attach as a Bearer header. This is the one place auth + base URL live.

const BASE_URL = process.env.ORACLE_API_URL || "http://localhost:5216";
const TOKEN_URL =
  process.env.KEYCLOAK_TOKEN_URL ||
  "http://localhost:8081/realms/aichat/protocol/openid-connect/token";
const CLIENT_ID = process.env.ORACLE_CLIENT_ID || "aibackend-service";
const CLIENT_SECRET = process.env.ORACLE_CLIENT_SECRET || "aibackend-secret";

// ---- M2M token cache ----
let cachedToken = null;
let tokenExpiresAt = 0;

async function getAccessToken() {
  // Reuse the cached token until ~30s before expiry.
  if (cachedToken && Date.now() < tokenExpiresAt - 30_000) {
    return cachedToken;
  }
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
  });
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`Token request failed (${res.status}): ${t.slice(0, 200)}`);
  }
  const json = await res.json();
  cachedToken = json.access_token;
  tokenExpiresAt = Date.now() + (json.expires_in ?? 300) * 1000;
  return cachedToken;
}

// ---- HTTP helpers ----
async function get(path) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Oracle API GET ${path} failed (${res.status}): ${body.slice(0, 200)}`);
  }
  return res.json();
}

// Authenticated write. Returns parsed JSON if any, else null (204 No Content).
async function authed(method, path, payload) {
  const token = await getAccessToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(payload ? { "Content-Type": "application/json" } : {}),
      Accept: "application/json",
    },
    body: payload ? JSON.stringify(payload) : undefined,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Oracle API ${method} ${path} failed (${res.status}): ${body.slice(0, 200)}`);
  }
  if (res.status === 204) return null;
  return res.json().catch(() => null);
}

export const oracleClient = {
  // ---- Reads ----
  listUsers: () => get("/api/users"),
  getUser: (id) => get(`/api/users/${id}`),
  listRoles: () => get("/api/roles"),
  getRole: (id) => get(`/api/roles/${id}`),
  listPermissions: () => get("/api/permissions"),
  getPermission: (id) => get(`/api/permissions/${id}`),

  // ---- Writes (require M2M token) ----
  // Grant/revoke a permission on a role.
  assignPermissionToRole: (roleId, permissionId) =>
    authed("POST", `/api/roles/${roleId}/permissions`, { permissionId }),
  revokePermissionFromRole: (roleId, permissionId) =>
    authed("DELETE", `/api/roles/${roleId}/permissions/${permissionId}`),
  // Assign/remove a role on a user.
  assignRoleToUser: (userId, roleId, assignedBy) =>
    authed("POST", `/api/users/${userId}/roles`, { roleId, assignedBy }),
  removeRoleFromUser: (userId, roleId) =>
    authed("DELETE", `/api/users/${userId}/roles/${roleId}`),
};
