# CLAUDE.md

Guidance for working in this repository.

## What this is

A **secured, observable, multi-agent AI chatbot** with a real database digital
worker. A LangGraph supervisor routes requests to specialist agents; a
Backend-for-Frontend (BFF) handles Keycloak OIDC login (HttpOnly cookies); one
specialist performs **read + write** operations on an Oracle database via a .NET
API, with **human-in-the-loop (HITL) approval** on writes. Everything runs
locally via Docker Compose.

## Architecture

```
Browser ──► NGINX (:8080) ─┬─ /        → frontend (static React)
                           ├─ /api/*   → BFF  🔒 (session-guarded proxy)
                           └─ /auth/*  → BFF  (Keycloak OIDC login)

BFF ──► aiBackend (:2424, internal only)        BFF ──► Redis (sessions)
BFF ⇄ Keycloak (:8081 public / keycloak:8080 internal)   Keycloak ──► Postgres

aiBackend (supervisor) ──► DataAccessAgent ──► OracleDigitalWorker (.NET :5216/8080)
   │  (M2M client-credentials token for writes)        └─► Oracle 21c XE (host :1521)
   └─► OpenRouter (LLM)        └─► Langfuse (tracing, separate stack :3000)
```

## Components (each a top-level folder)

| Folder | Tech | Role |
| ------ | ---- | ---- |
| `UI/` | React + Vite | Chat UI (black/white theme); built → served by nginx |
| `bff/` | Node/Express | OIDC login, Redis sessions, HttpOnly cookie, proxies `/api/*` to aiBackend |
| `aiBackend/` | Node + LangGraph | Multi-agent supervisor + specialists + HITL |
| `OracleDigitalWorker/` | .NET 8 + EF Core | EPC RBAC CRUD API over Oracle; JWT-protected writes |
| `keycloak/` | realm JSON | IdP config: `bff-client` (login) + `aibackend-service` (M2M) |
| `nginx/` | nginx conf | Reverse proxy (single public entry) |
| `langfuse/` | compose | Self-hosted tracing — **separate stack**, not in main compose |

## Run it

```powershell
cd multiAgentBoilerplate
docker compose --env-file .env up -d --build
# Open http://localhost:8080  → login: demo / demo
```

Optional tracing (separate stack):
```powershell
cd langfuse && docker compose up -d   # http://localhost:3000
```

Production override (parameterized domains/secrets/HTTPS):
```powershell
docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.prod up -d
```

## Ports

| URL | What |
| --- | ---- |
| http://localhost:8080 | The app (via nginx) |
| http://localhost:8081 | Keycloak admin (admin / admin) |
| http://localhost:5216 | OracleDigitalWorker Swagger (exposed for convenience) |
| http://localhost:3000 | Langfuse (if its stack is up) |
| (internal) :2424 | aiBackend — NOT published to host; only the BFF reaches it |

Test users / clients: app login `demo`/`demo`; M2M client `aibackend-service` /
`aibackend-secret`; BFF client `bff-client` / `bff-secret`.

## How the agent system works (aiBackend)

- **Supervisor pattern**: `graph/supervisorGraph.js` compiles a hub-and-spoke
  graph. The `supervisor` node routes (via a forced `route` tool call) to one
  specialist, which loops back; repeats until `done`. State + routing live in
  `graph/state.js` (`messages`, `next`, `visited`) and `graph/router.js`.
- **Specialists are nested subgraphs**: each agent (`agents/*.js`) is built by
  `agents/createToolAgent.js` (a reusable `llmCall ⇄ toolNode` loop) and invoked
  as a node in `graph/nodes.js`. `mathAgent`, `weatherAgent`, `dataAccessAgent`.
- **Tools** (`tools/*.js`) are thin wrappers. Read tools call the Oracle API;
  write tools (`tools/oracleWrites.js`) `interrupt()` for HITL approval first.
- **Model** is configured once in `llm/model.js` (OpenRouter, `maxTokens` capped
  to avoid 402s). Model name from `DEFAULT_MODEL` env.
- **HITL**: writes pause via `interrupt()`; a `MemorySaver` checkpointer + a
  `thread_id` persist the pause. `service.js` returns `awaiting_approval`;
  `/chat/resume` continues with `Command({ resume: decision })`. The parent
  `config` is threaded through `runSpecialist` so subgraph interrupts propagate.

### Adding a new specialist agent (the extension pattern)
1. `tools/<x>.js` — tools (thin; wrap a client).
2. `agents/<x>Agent.js` — `createToolAgent({ systemPrompt, tools })`.
3. `graph/nodes.js` — add `"<x>"` to the `route` enum, a `<x>Node`, and a line in `SUPERVISOR_PROMPT`.
4. `graph/router.js` — add `case "<x>": return "<x>Node"`.
5. `graph/supervisorGraph.js` — `.addNode` + add to `addConditionalEdges` + `.addEdge("<x>Node","supervisor")`.
Do NOT modify `createToolAgent.js`, `model.js`, `state.js` — extend, don't rewrite.

## Auth model

- **User → app**: OIDC Authorization Code + PKCE via the BFF. Tokens stay
  server-side in Redis; the browser holds only an HttpOnly `sid` cookie.
- **aiBackend → OracleDigitalWorker (writes)**: OAuth2 **Client Credentials**
  (M2M). `clients/oracleClient.js` fetches + caches a token from Keycloak and
  attaches it as Bearer. The .NET API validates the JWT (`[Authorize]` on
  writes; reads are open).
- **Approver** on a HITL write is taken from the **BFF session**, never the
  client body (`bff/apiRoutes.js`).

## Database (OracleDigitalWorker)

- **Code-first EF Core**, auto-migrate + seed on startup (idempotent).
- EPC RBAC schema: `USERS`, `ROLES`, `PERMISSIONS`, `USER_ROLES`,
  `ROLE_PERMISSIONS`, `AUDIT_LOGS` (under the `QUANTA` schema).
- Connection string: `appsettings.json` default = `localhost`; the container
  overrides via `ConnectionStrings__OracleDb` → `host.docker.internal:1521`.

## Oracle 21c gotchas (already handled — don't reintroduce)

- **No native SQL `BOOLEAN`** (only 23ai). All `bool` map to `NUMBER(1)` via a
  global converter in `Data/AppDbContext.cs`. Don't add raw bool columns.
- **`AnyAsync()` emits a `FALSE` literal** Oracle rejects (`ORA-00904`). Use
  `CountAsync() > 0` / `== 0` instead (all controllers + seeder already do).
- **QUANTA needs a tablespace quota** (DBA grant, one-time):
  `ALTER SESSION SET CONTAINER = XEPDB1; ALTER USER QUANTA QUOTA UNLIMITED ON USERS;`
- **Interrupted migrations** leave dirty/partial objects; drop them and re-run.

## Docker / networking gotchas (already handled)

- **Container → host services** (Oracle, Langfuse) use `host.docker.internal`,
  not `localhost`. `extra_hosts: host.docker.internal:host-gateway` is set.
- **nginx upstream caching**: nginx resolves service names per-request via the
  Docker resolver (`resolver 127.0.0.11` + hostname in a variable) so a
  restarting backend doesn't get a stale IP. Don't revert to static `upstream`.
- **Keycloak frontchannel vs backchannel**: Keycloak advertises `localhost:8081`
  (for browsers) but backends reach it at `keycloak:8080`. The BFF discovers via
  the internal URL but validates issuer = public URL; the .NET API uses
  `KC_HOSTNAME_BACKCHANNEL_DYNAMIC: true` so JWKS URLs are internally reachable.
  This is why M2M token validation works — don't undo it.

## Observability

- Switch in `aiBackend/src/observability.js`: `APP_ENV=development` → local
  Langfuse (OTel span processor); `production` → LangSmith (env vars).
- Langfuse is a **separate compose** in `langfuse/`; aiBackend reaches it at
  `host.docker.internal:3000`. Tracing is fire-and-forget (non-fatal if down).
- Langfuse SDK is **v5 (OpenTelemetry-based)** — needs `@langfuse/otel` +
  `NodeTracerProvider` (not `NodeSDK`, which adds a phantom OTLP exporter).

## Verifying changes

- aiBackend is **internal-only** — test via the BFF path (login → `/api/chat`),
  not `localhost:2424` (unreachable from host; returns HTTP 000).
- The full HITL flow: `POST /api/chat` (write request) → `awaiting_approval` →
  `POST /api/chat/resume {threadId, approved}` → verify the change in Oracle via
  `http://localhost:5216/api/...`.
- After testing writes, **restore seeded data** (re-grant the permission you
  removed) so the demo dataset stays clean.

## Conventions

- **Secrets** are dev defaults in `.env` / compose — rotate for real use. `.env`
  is git-ignored; `.env.example` / `.env.prod.example` document the vars.
- **Don't rewrite the boilerplate** — the agent system is designed to be
  *extended* (new agents/tools), following the patterns above.
- Node services are ESM (`"type": "module"`); the .NET project is .NET 8.
