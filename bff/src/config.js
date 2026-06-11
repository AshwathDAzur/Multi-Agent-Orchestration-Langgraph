// BFF configuration — all from environment (injected by docker-compose).

export const config = {
  port: parseInt(process.env.PORT || "4000", 10),

  // Public URL of the app (through nginx) — used to build redirect URIs.
  publicUrl: process.env.PUBLIC_URL || "http://localhost:8080",

  // Keycloak (OIDC provider)
  keycloak: {
    // The PUBLIC issuer — what the browser sees and what tokens are signed with.
    // Must equal Keycloak's advertised issuer exactly (KC_HOSTNAME).
    issuer:
      process.env.KEYCLOAK_ISSUER || "http://localhost:8081/realms/aichat",
    // The INTERNAL base URL the BFF uses for backchannel calls (discovery,
    // token exchange). Reaches Keycloak from inside the docker network.
    internalUrl:
      process.env.KEYCLOAK_INTERNAL_URL ||
      "http://host.docker.internal:8081/realms/aichat",
    clientId: process.env.KEYCLOAK_CLIENT_ID || "bff-client",
    clientSecret: process.env.KEYCLOAK_CLIENT_SECRET || "bff-secret",
  },

  // Where the BFF forwards authenticated API calls (internal only).
  aiBackendUrl: process.env.AI_BACKEND_URL || "http://aibackend:2424",

  // Session
  session: {
    secret: process.env.SESSION_SECRET || "dev-session-secret-change-me",
    redisUrl: process.env.REDIS_URL || "redis://bff-redis:6379",
    // Set COOKIE_SECURE=true in production (HTTPS) so the cookie is only sent
    // over TLS. Must be false for plain-HTTP local dev or the cookie is dropped.
    cookieSecure: process.env.COOKIE_SECURE === "true",
    // cookie lifetime (ms)
    maxAge: 1000 * 60 * 60 * 8, // 8 hours
  },
};

// Derived redirect URI registered with Keycloak.
export const REDIRECT_URI = `${config.publicUrl}/auth/callback`;
// Where to send the user after login / after logout.
export const POST_LOGIN = `${config.publicUrl}/`;
export const POST_LOGOUT = `${config.publicUrl}/`;
