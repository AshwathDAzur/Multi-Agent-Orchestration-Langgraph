# multiAgentBoilerplate — secured multi-agent chatbot

Full local stack: React UI → NGINX → BFF (Keycloak auth) → aiBackend (multi-agent).

## Architecture

```
Browser ──► NGINX (:8080) ─┬─ /        → frontend (static React)
                           ├─ /api/*   → bff   (session-guarded proxy)
                           └─ /auth/*  → bff   (Keycloak OIDC login)

bff ──► aibackend (:2424, internal)      bff ──► redis (sessions)
bff ⇄ keycloak (:8081, OIDC)             keycloak ──► postgres
```

- **NGINX** — single public entry point, reverse proxy.
- **BFF** — Backend-for-Frontend. Does OIDC login against Keycloak, keeps tokens
  **server-side** (Redis), gives the browser only an **HttpOnly session cookie**,
  and forwards authenticated `/api/*` calls to the aiBackend with a Bearer token.
- **aiBackend** — the multi-agent supervisor. **Not exposed publicly** — only the
  BFF can reach it on the internal network.
- **Keycloak** — identity provider; realm + client + a test user auto-imported.

## Prerequisites

- Docker Desktop running.
- A `.env` file in this directory (copy from `.env.example`).

## Run

```powershell
cd c:\ArtificialIntelligence\multiAgentBoilerplate
docker compose --env-file .env up -d --build      # first run builds images
docker compose ps                                  # check services
docker compose logs -f bff                         # watch BFF (waits for Keycloak)
```

First boot takes a few minutes (image builds + Keycloak realm import).

Then open **http://localhost:8080**:
1. You'll see a **Sign in** screen.
2. Click **Sign in with Keycloak** → redirected to Keycloak.
3. Log in with the seeded test user:  **username `demo` / password `demo`**
4. You're returned to the chat, authenticated. Send a message.

## Stop / reset

```powershell
docker compose down        # stop, keep data
docker compose down -v     # stop and wipe volumes (fresh Keycloak)
```

## Ports

| URL                      | What                                  |
| ------------------------ | ------------------------------------- |
| http://localhost:8080    | The app (through nginx)               |
| http://localhost:8081    | Keycloak admin (admin / admin)        |

aiBackend (:2424) and Redis are internal-only — not published to the host.

## How auth works (BFF pattern)

1. Browser → `/auth/login` → BFF redirects to Keycloak.
2. User logs in → Keycloak redirects to `/auth/callback`.
3. BFF exchanges the code for tokens, stores them in **Redis**, sets an
   **HttpOnly cookie** (`sid`). The browser never sees a token.
4. Browser → `/api/chat` with the cookie → BFF validates the session, attaches
   the Keycloak **access token** as a Bearer, forwards to aiBackend.

This keeps tokens out of JavaScript (XSS-safe) — the production-correct approach.

## Notes

- Secrets here are **dev defaults** — change `SESSION_SECRET`,
  `KEYCLOAK_CLIENT_SECRET`, and Keycloak admin creds for anything real.
- Observability: aiBackend traces to the host Langfuse stack (`:3000`) if it's
  running; otherwise tracing simply no-ops (non-fatal).
