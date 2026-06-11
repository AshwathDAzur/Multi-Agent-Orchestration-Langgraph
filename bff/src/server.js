// BFF (Backend-for-Frontend) entry point.
//
// Responsibilities:
//   - OIDC login against Keycloak (Authorization Code + PKCE)
//   - HttpOnly cookie session, tokens stored server-side in Redis
//   - Proxy authenticated /api/* calls to the internal aiBackend with a Bearer
//
// The browser only ever holds an opaque session cookie — never a token.

import express from "express";
import session from "express-session";
import RedisStore from "connect-redis";
import { createClient } from "redis";

import { config } from "./config.js";
import { initOidc } from "./oidc.js";
import { authRoutes } from "./authRoutes.js";
import { apiRoutes } from "./apiRoutes.js";

async function main() {
  const app = express();
  app.set("trust proxy", 1); // behind nginx
  app.use(express.json());

  // ---- Redis-backed session store ----
  const redisClient = createClient({ url: config.session.redisUrl });
  redisClient.on("error", (e) => console.error("[redis]", e.message));
  await redisClient.connect();
  console.log("[redis] connected.");

  app.use(
    session({
      name: "sid", // the HttpOnly cookie name
      store: new RedisStore({ client: redisClient }),
      secret: config.session.secret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true, // not accessible to JS — XSS-safe
        secure: config.session.cookieSecure, // true behind HTTPS (set in prod)
        sameSite: "lax",
        maxAge: config.session.maxAge,
      },
    })
  );

  // ---- OIDC client (retries until Keycloak is up) ----
  await initOidc();

  // ---- Routes ----
  app.get("/healthz", (_req, res) => res.json({ status: "ok" }));
  app.use("/auth", authRoutes);
  app.use("/api", apiRoutes);

  app.listen(config.port, () => {
    console.log(`[bff] listening on :${config.port}`);
    console.log(`[bff] public URL: ${config.publicUrl}`);
    console.log(`[bff] forwarding /api -> ${config.aiBackendUrl}`);
  });
}

main().catch((err) => {
  console.error("[bff] fatal:", err);
  process.exit(1);
});
