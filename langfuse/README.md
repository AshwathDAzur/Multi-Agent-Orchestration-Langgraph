# Self-hosted Langfuse (local dev)

Local, Docker-based [Langfuse](https://langfuse.com) — an open-source LangSmith
alternative for tracing LLM/agent runs. Data stays on your machine.

## Start / stop

```powershell
cd c:\ArtificialIntelligence\langfuse

docker compose up -d        # start (first run pulls images + migrates — give it a few min)
docker compose ps           # check all services are healthy
docker compose logs -f langfuse-web   # follow web logs
docker compose down         # stop (KEEPS data — volumes persist)
docker compose down -v      # stop and DELETE all data (fresh start)
```

## First-time setup

1. Open **http://localhost:3000**
2. Sign up (local account — stored in your local Postgres).
3. Create an **Organization** → a **Project**.
4. Go to **Project Settings → API Keys → Create** and copy the
   **Public Key** (`pk-lf-...`) and **Secret Key** (`sk-lf-...`).
5. Put those keys in `multiAgent/.env` (see that project's setup).

## Ports

| Service        | URL / Port                | Notes                          |
| -------------- | ------------------------- | ------------------------------ |
| Langfuse UI    | http://localhost:3000     | dashboard + ingestion API      |
| MinIO console  | http://localhost:9091     | blob storage admin (minio/...) |
| Postgres       | 127.0.0.1:5432            | metadata DB                    |
| ClickHouse     | 127.0.0.1:8123 / 9000     | trace analytics store          |
| Redis          | 127.0.0.1:6379            | queue/cache                    |

> Your `multiAgent` Express app runs on **2424** to avoid clashing with
> Langfuse on **3000**.

## Persistence

All stateful services use named volumes (`langfuse_postgres_data`,
`langfuse_clickhouse_data`, `langfuse_clickhouse_logs`, `langfuse_minio_data`,
`langfuse_redis_data`). `docker compose down` keeps them; only `down -v` wipes.

## Note on secrets

The secrets in `docker-compose.yml` are **dev-only defaults** for localhost.
Never reuse them in a real deployment.
