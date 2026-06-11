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

## Observability — Langfuse (co-located, SEPARATE stack)

The `langfuse/` folder is a **self-hosted Langfuse** stack for tracing the
multi-agent runs. It lives inside this project for convenience but is its **own
Docker Compose project and network** — it is NOT part of the main
`docker-compose.yml` and is started/stopped independently.

```powershell
# Start / stop Langfuse (from its own folder)
cd c:\ArtificialIntelligence\multiAgentBoilerplate\langfuse
docker compose up -d        # dashboard at http://localhost:3000
docker compose down         # stop (keeps traces/account in volumes)
```

- The aiBackend reaches it at **`http://host.docker.internal:3000`**
  (set via `LANGFUSE_BASEURL` in the main compose) — because the two stacks are
  on different networks, it goes out through the host.
- Tracing is **fire-and-forget**: if the Langfuse stack is down, the app keeps
  working and tracing simply no-ops (non-fatal).
- Langfuse keys live in the main `.env` (`LANGFUSE_PUBLIC_KEY` /
  `LANGFUSE_SECRET_KEY`); see `langfuse/README.md` for first-time setup.

> The two stacks are intentionally separate so the heavy Langfuse services
> (ClickHouse, MinIO, etc.) can be started only when you want traces.

## Notes

- Secrets here are **dev defaults** — change `SESSION_SECRET`,
  `KEYCLOAK_CLIENT_SECRET`, and Keycloak admin creds for anything real.
