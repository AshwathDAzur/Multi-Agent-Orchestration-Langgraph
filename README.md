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

## Production deployment

The base `docker-compose.yml` is wired for **localhost dev**. For a real server,
apply the `docker-compose.prod.yml` override, which parameterizes domain, HTTPS,
secrets, and uses pre-built images.

### Steps

1. **Build & push images in CI** (not on the server):
   ```bash
   docker build -t your-registry/aichat-frontend:TAG ./UI
   docker build -t your-registry/aichat-bff:TAG ./bff
   docker build -t your-registry/aichat-aibackend:TAG ./aiBackend
   docker push your-registry/aichat-*:TAG
   ```
2. **Configure env**: `cp .env.prod.example .env.prod` and fill in your real
   domains, image tags, and **strong** secrets (`openssl rand -hex 32`).
3. **Put a TLS proxy in front** (cloud LB / Traefik / external nginx) that
   terminates HTTPS and forwards `APP_PUBLIC_URL` → the `nginx` service and
   `KEYCLOAK_PUBLIC_URL` → the `keycloak` service.
4. **Deploy**:
   ```bash
   docker compose -f docker-compose.yml -f docker-compose.prod.yml \
                  --env-file .env.prod up -d
   ```

### What the prod override changes

| Concern | Dev (base) | Prod (override) |
| ------- | ---------- | --------------- |
| Images | `build:` on the host | pre-built `image:` pulled from registry |
| URLs | `localhost:8080/8081` | your domains (`APP_PUBLIC_URL`, `KEYCLOAK_PUBLIC_URL`) |
| Cookies | `COOKIE_SECURE=false` | `COOKIE_SECURE=true` (HTTPS-only) |
| Keycloak | `start-dev` | `start --optimized` (production mode) |
| BFF→Keycloak | `host.docker.internal` | internal service name |
| Keycloak port | published `:8081` | not published (behind the edge proxy) |

> **Still your job for prod:** terminate TLS at the edge, remove/replace the
> seeded `demo`/`demo` user, rotate every secret, and pull secrets from a
> manager rather than committing `.env.prod`.

## Notes

- Dev secrets in `.env` are **dev defaults** — change `SESSION_SECRET`,
  `KEYCLOAK_CLIENT_SECRET`, and Keycloak admin creds for anything real.
