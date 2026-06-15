# Architecture — Multi-Agent AI Solution

Architecture documentation for the secured, observable multi-agent chatbot with
an Oracle database digital worker and human-in-the-loop (HITL) approvals.

> **Note on agents:** This system has three specialists. **DataAccessAgent** is
> shown in detail (it performs read/write DB operations with HITL). The other two
> (originally *math* and *weather*) are generalized as **Agent 1** and **Agent 2**
> — interchangeable tool-using specialists with no side effects.

---

## 1. Detailed Architecture Diagram

```mermaid
flowchart TB
    user([User / Browser])

    subgraph EDGE["Edge Layer"]
        nginx["NGINX<br/>Reverse Proxy :8080"]
    end

    subgraph FRONT["Presentation"]
        ui["Frontend (React/Vite)<br/>Chat UI + Approval Cards"]
    end

    subgraph AUTHN["Auth / Session"]
        bff["BFF (Node/Express)<br/>OIDC + HttpOnly Cookie"]
        redis[("Redis<br/>Session Store")]
        kc["Keycloak<br/>IdP :8081"]
        kcdb[("Postgres<br/>Keycloak DB")]
    end

    subgraph BRAIN["Agent Orchestration — aiBackend :2424"]
        svc["service.js<br/>run / resume"]
        supervisor{{"Supervisor Node<br/>(router)"}}
        cp[("MemorySaver<br/>Checkpointer")]
        a1["Agent 1<br/>(generic specialist)"]
        a2["Agent 2<br/>(generic specialist)"]

        subgraph DAA["DataAccessAgent (detailed)"]
            daLLM["llmCall<br/>(reason)"]
            daTools["toolNode"]
            rTools["Read Tools<br/>list/get users,roles,perms"]
            wTools["Write Tools<br/>assign/remove (interrupt!)"]
            daLLM <--> daTools
            daTools --> rTools
            daTools --> wTools
        end
    end

    subgraph DATA["Data Layer"]
        odw["OracleDigitalWorker<br/>.NET 8 API :5216"]
        oracle[("Oracle 21c XE<br/>EPC RBAC Schema")]
    end

    subgraph EXT["External"]
        llm["OpenRouter<br/>LLM"]
        lf["Langfuse<br/>Tracing :3000"]
    end

    user -->|HTTPS| nginx
    nginx -->|"/"| ui
    nginx -->|"/auth/*"| bff
    nginx -->|"/api/*"| bff
    ui -.->|fetch| nginx

    bff <-->|OIDC PKCE| kc
    bff <--> redis
    kc --> kcdb
    bff -->|"/chat, /chat/resume"| svc

    svc --> supervisor
    svc <--> cp
    supervisor --> a1
    supervisor --> a2
    supervisor --> daLLM
    a1 -.-> supervisor
    a2 -.-> supervisor
    daTools -.-> supervisor

    daLLM -->|prompt| llm
    a1 -->|prompt| llm
    a2 -->|prompt| llm
    supervisor -->|route| llm

    rTools -->|GET| odw
    wTools -->|"M2M Bearer<br/>POST/DELETE"| odw
    wTools <-->|client-credentials token| kc
    odw --> oracle

    svc -.->|OTel spans| lf

    classDef ext fill:#2d2d2d,stroke:#888,color:#fff
    classDef data fill:#1a3a4a,stroke:#4a9,color:#fff
    classDef brain fill:#2a1a3a,stroke:#a4f,color:#fff
    class llm,lf ext
    class odw,oracle data
    class supervisor,daLLM,daTools,a1,a2 brain
```

---

## 2. Context Diagram (C4 Level 1)

```mermaid
flowchart TB
    user([End User])
    admin([System Admin])

    system["<b>Multi-Agent AI System</b><br/>Secured chatbot that answers questions<br/>and performs DB access changes<br/>with human approval"]

    llm["OpenRouter<br/>(LLM Provider)"]
    idp["Keycloak<br/>(Identity Provider)"]
    db[("Oracle Database<br/>(EPC RBAC Data)")]
    obs["Langfuse<br/>(Observability)"]

    user -->|"Asks questions,<br/>approves write actions"| system
    admin -->|"Manages users/roles<br/>via chat"| system

    system -->|"Sends prompts,<br/>gets completions"| llm
    system -->|"Authenticates users<br/>& service (M2M)"| idp
    system -->|"Reads & writes<br/>EPC records"| db
    system -->|"Emits traces"| obs

    classDef sys fill:#2a1a3a,stroke:#a4f,color:#fff,font-weight:bold
    classDef person fill:#1a3a2a,stroke:#4a8,color:#fff
    classDef ext fill:#2d2d2d,stroke:#888,color:#fff
    class system sys
    class user,admin person
    class llm,idp,db,obs ext
```

---

## 3. High-Level System / Container Diagram (C4 Level 2)

```mermaid
flowchart TB
    user([User])

    subgraph boundary["Multi-Agent AI System"]
        nginx["NGINX<br/>[Container]<br/>Reverse proxy"]
        frontend["Frontend<br/>[Container: React]<br/>Chat UI"]
        bff["BFF<br/>[Container: Node]<br/>Auth + API gateway"]
        redis[("Redis<br/>[Container]<br/>Sessions")]
        aibackend["aiBackend<br/>[Container: Node/LangGraph]<br/>Agent supervisor"]
        odw["OracleDigitalWorker<br/>[Container: .NET 8]<br/>EPC data API"]
        keycloak["Keycloak<br/>[Container]<br/>IdP"]
        kcdb[("Keycloak DB<br/>[Container: Postgres]")]
    end

    oracle[("Oracle 21c<br/>[Host]")]
    llm["OpenRouter"]
    langfuse["Langfuse<br/>[Separate Stack]"]

    user -->|HTTPS :8080| nginx
    nginx --> frontend
    nginx --> bff
    bff --> redis
    bff <--> keycloak
    bff -->|internal| aibackend
    keycloak --> kcdb
    aibackend -->|read/write| odw
    aibackend <-->|M2M token| keycloak
    aibackend --> llm
    aibackend -.-> langfuse
    odw --> oracle

    classDef c fill:#1a2a3a,stroke:#48a,color:#fff
    classDef ext fill:#2d2d2d,stroke:#888,color:#fff
    class nginx,frontend,bff,redis,aibackend,odw,keycloak,kcdb c
    class oracle,llm,langfuse ext
```

---

## 4. Block / Functional Diagram

```mermaid
flowchart LR
    subgraph PRES["Presentation"]
        F1["Chat Interface"]
        F2["Approval UI"]
        F3["Auth Guard"]
    end

    subgraph SEC["Security / Session"]
        S1["OIDC Login"]
        S2["Session Mgmt"]
        S3["API Proxy"]
        S4["M2M Token"]
    end

    subgraph ORCH["Orchestration"]
        O1["Routing"]
        O2["State Mgmt"]
        O3["Checkpointing"]
        O4["HITL Interrupt"]
    end

    subgraph SPEC["Specialists"]
        SP1["Agent 1"]
        SP2["Agent 2"]
        SP3["DataAccessAgent"]
    end

    subgraph DATAF["Data Functions"]
        D1["Read Ops"]
        D2["Write Ops (auth)"]
        D3["Audit Logging"]
        D4["RBAC Schema"]
    end

    subgraph CROSS["Cross-Cutting"]
        C1["Observability"]
        C2["Error Handling"]
    end

    PRES --> SEC --> ORCH --> SPEC --> DATAF
    ORCH -.-> CROSS
    DATAF -.-> CROSS

    classDef blk fill:#1a2a3a,stroke:#48a,color:#fff
    class F1,F2,F3,S1,S2,S3,S4,O1,O2,O3,O4,SP1,SP2,SP3,D1,D2,D3,D4,C1,C2 blk
```

---

## 5. Component Diagram (DataAccessAgent — detailed)

```mermaid
flowchart TB
    subgraph aiBackend["aiBackend (Node / LangGraph)"]
        direction TB

        subgraph graph["graph/"]
            sg["supervisorGraph.js<br/>(compiled + checkpointer)"]
            nodes["nodes.js<br/>(supervisor + specialist nodes)"]
            router["router.js<br/>(route → node)"]
            state["state.js<br/>(messages, next, visited)"]
        end

        subgraph agents["agents/"]
            cta["createToolAgent.js<br/>(llmCall ⇄ toolNode factory)"]
            daa["dataAccessAgent.js<br/>(read+write tools, persona)"]
            a1a["agent1.js / agent2.js<br/>(generic specialists)"]
        end

        subgraph daTools["DataAccessAgent Tools"]
            ot["tools/oracle.js<br/>list_users, get_user,<br/>list_roles, get_role,<br/>list_permissions"]
            owt["tools/oracleWrites.js<br/>assign/remove role-perm,<br/>assign/remove user-role<br/>(each calls interrupt())"]
        end

        subgraph infra["Infra"]
            oc["clients/oracleClient.js<br/>(HTTP + cached M2M token)"]
            model["llm/model.js<br/>(OpenRouter factory)"]
            obs["observability.js<br/>(Langfuse/LangSmith switch)"]
            svc["service.js<br/>(run / resume)"]
            srv["server.js<br/>(/chat, /chat/resume)"]
        end
    end

    srv --> svc --> sg
    sg --> nodes --> router
    nodes --> state
    nodes --> daa & a1a
    daa --> cta
    daa --> ot & owt
    a1a --> cta
    ot --> oc
    owt --> oc
    owt -.->|interrupt| svc
    cta --> model
    svc --> obs

    classDef comp fill:#2a1a3a,stroke:#a4f,color:#fff
    classDef tool fill:#1a3a4a,stroke:#4a9,color:#fff
    class sg,nodes,router,state,cta,daa,a1a,oc,model,obs,svc,srv comp
    class ot,owt tool
```

---

## 6. Deployment Diagram

```mermaid
flowchart TB
    subgraph host["Developer Host (Windows + Docker Desktop)"]
        subgraph oracleDB["Native Process"]
            ora[("Oracle 21c XE<br/>:1521 / XEPDB1")]
        end

        subgraph net["Docker Network: multiagentboilerplate"]
            nginx["nginx:8080→80"]
            fe["frontend:80"]
            bff["bff:4000"]
            redis["bff-redis:6379"]
            aib["aibackend:2424<br/>(unpublished)"]
            odw["oracledigitalworker<br/>:5216→8080"]
            kc["keycloak:8081→8080"]
            kcdb["keycloak-db:5432"]
        end

        subgraph lfnet["Docker Network: langfuse (separate)"]
            lfweb["langfuse-web:3000"]
            lfworker["langfuse-worker"]
            lfch[("clickhouse")]
            lfpg[("postgres")]
            lfminio["minio"]
            lfredis["redis"]
        end
    end

    cloud["OpenRouter API<br/>(Cloud)"]

    odw -->|host.docker.internal:1521| ora
    aib -->|host.docker.internal:3000| lfweb
    aib -->|HTTPS| cloud

    nginx --> fe & bff
    bff --> redis & kc & aib
    kc --> kcdb
    aib --> odw & kc
    lfweb --> lfch & lfpg & lfminio & lfredis
    lfworker --> lfch & lfpg

    classDef proc fill:#1a3a2a,stroke:#4a8,color:#fff
    classDef main fill:#1a2a3a,stroke:#48a,color:#fff
    classDef lf fill:#3a2a1a,stroke:#a84,color:#fff
    classDef cloud fill:#2d2d2d,stroke:#888,color:#fff
    class ora proc
    class nginx,fe,bff,redis,aib,odw,kc,kcdb main
    class lfweb,lfworker,lfch,lfpg,lfminio,lfredis lf
    class cloud cloud
```

---

## 7. Data-Flow Diagram (DFD)

```mermaid
flowchart LR
    user([User])
    p1["P1<br/>Authenticate"]
    p2["P2<br/>Route Request"]
    p3["P3<br/>Reason + Call Tools"]
    p4["P4<br/>Read Data"]
    p5["P5<br/>Approve Write (HITL)"]
    p6["P6<br/>Write Data"]

    d1[("D1: Session Store<br/>Redis")]
    d2[("D2: Checkpoint<br/>MemorySaver")]
    d3[("D3: Oracle DB")]
    d4[("D4: Audit Log")]

    user -->|credentials| p1
    p1 -->|tokens| d1
    p1 -->|prompt| p2
    p2 -->|routed msg| p3
    p3 -->|query| p4
    p4 -->|rows| d3
    d3 -->|rows| p4
    p4 -->|facts| p3
    p3 -->|proposed change| p5
    p5 -->|pause state| d2
    p5 -->|decision| user
    user -->|approve/reject| p5
    d2 -->|resumed state| p5
    p5 -->|approved| p6
    p6 -->|mutation| d3
    p6 -->|who/what| d4
    p3 -->|answer| user

    classDef proc fill:#2a1a3a,stroke:#a4f,color:#fff
    classDef store fill:#1a3a4a,stroke:#4a9,color:#fff
    class p1,p2,p3,p4,p5,p6 proc
    class d1,d2,d3,d4 store
```

---

## 8. Sequence Diagram (HITL Write Flow — DataAccessAgent)

```mermaid
sequenceDiagram
    actor U as User
    participant N as NGINX
    participant B as BFF
    participant A as aiBackend
    participant S as Supervisor
    participant D as DataAccessAgent
    participant K as Keycloak
    participant O as OracleDigitalWorker
    participant DB as Oracle

    U->>N: POST /api/chat "remove X access for User"
    N->>B: forward (session cookie)
    B->>B: verify session
    B->>A: POST /chat {prompt}
    A->>S: invoke(thread_id)
    S->>D: route to data
    D->>O: GET /api/users,/roles (read tools)
    O->>DB: SELECT
    DB-->>O: rows
    O-->>D: data (ids resolved)
    D->>D: call remove_role_permission
    Note over D: interrupt() — PAUSE
    D-->>A: __interrupt__
    A-->>B: {awaiting_approval, threadId}
    B-->>N: relay
    N-->>U: Show Approval Card

    U->>N: POST /api/chat/resume {threadId, approved}
    N->>B: forward
    B->>A: /chat/resume {threadId, approved, approver=session.user}
    A->>S: Command(resume=decision)
    S->>D: resume paused tool
    D->>K: client_credentials token
    K-->>D: JWT (M2M)
    D->>O: DELETE /roles/{id}/permissions/{pid} (Bearer)
    O->>O: validate JWT
    O->>DB: DELETE + audit
    DB-->>O: ok
    O-->>D: 204
    D-->>A: "done (approved by ...)"
    A-->>B: {completed, answer}
    B-->>U: Confirmation
```

---

## 9. User-Flow / Journey Diagram

```mermaid
flowchart TD
    start([User opens app]) --> auth{Logged in?}
    auth -->|No| login["Redirect to Keycloak login"]
    login --> creds["Enter credentials"]
    creds --> back["Return to chat (cookie set)"]
    auth -->|Yes| chat
    back --> chat["Chat interface"]

    chat --> ask["Type a request"]
    ask --> kind{Type of request?}

    kind -->|Question / read| answer["Agent answers<br/>from data"]
    kind -->|Write / change| pause["Approval card appears"]

    pause --> decide{User decision}
    decide -->|Approve| exec["Change applied<br/>+ confirmation"]
    decide -->|Reject| cancel["Action cancelled<br/>no change"]

    answer --> more{Continue?}
    exec --> more
    cancel --> more
    more -->|Yes| ask
    more -->|No| logout([Sign out])

    classDef start fill:#1a3a2a,stroke:#4a8,color:#fff
    classDef decision fill:#3a3a1a,stroke:#aa4,color:#fff
    classDef action fill:#1a2a3a,stroke:#48a,color:#fff
    class start,logout start
    class auth,kind,decide,more decision
    class login,creds,back,chat,ask,answer,pause,exec,cancel action
```

---

## 10. Network Connectivity Diagram

```mermaid
flowchart TB
    subgraph public["Public / Host-Exposed Ports"]
        p8080["8080 → nginx"]
        p8081["8081 → keycloak"]
        p5216["5216 → oracledigitalworker"]
        p3000["3000 → langfuse"]
    end

    subgraph internal["Internal Docker Network (service DNS)"]
        n_nginx["nginx:80"]
        n_fe["frontend:80"]
        n_bff["bff:4000"]
        n_redis["bff-redis:6379"]
        n_aib["aibackend:2424"]
        n_odw["oracledigitalworker:8080"]
        n_kc["keycloak:8080"]
        n_kcdb["keycloak-db:5432"]
    end

    subgraph hostgw["host-gateway (host.docker.internal)"]
        h_ora["Oracle :1521"]
        h_lf["Langfuse :3000"]
    end

    p8080 --- n_nginx
    p8081 --- n_kc
    p5216 --- n_odw

    n_nginx -->|http| n_fe
    n_nginx -->|http| n_bff
    n_bff -->|tcp| n_redis
    n_bff -->|http| n_aib
    n_bff -->|oidc| n_kc
    n_kc -->|jdbc| n_kcdb
    n_aib -->|http| n_odw
    n_aib -->|token| n_kc
    n_odw -.->|jdbc| h_ora
    n_aib -.->|otlp| h_lf

    classDef pub fill:#1a3a2a,stroke:#4a8,color:#fff
    classDef int fill:#1a2a3a,stroke:#48a,color:#fff
    classDef gw fill:#3a2a1a,stroke:#a84,color:#fff
    class p8080,p8081,p5216,p3000 pub
    class n_nginx,n_fe,n_bff,n_redis,n_aib,n_odw,n_kc,n_kcdb int
    class h_ora,h_lf gw
```

---

## 11. State Diagram (Request / HITL Lifecycle)

```mermaid
stateDiagram-v2
    [*] --> Idle
    Idle --> Routing: prompt received
    Routing --> Agent1: route=agent1
    Routing --> Agent2: route=agent2
    Routing --> DataAccess: route=data
    Routing --> Done: route=done

    Agent1 --> Routing: result
    Agent2 --> Routing: result

    state DataAccess {
        [*] --> Reasoning
        Reasoning --> ToolCall
        ToolCall --> Reasoning: read result
        ToolCall --> AwaitingApproval: write tool (interrupt)
        AwaitingApproval --> Executing: approved
        AwaitingApproval --> Cancelled: rejected
        Executing --> Reasoning: write applied
        Cancelled --> Reasoning
        Reasoning --> [*]: answer ready
    }

    DataAccess --> Routing: result
    AwaitingApproval --> [*]: paused (persisted)
    Done --> [*]: final answer

    note right of AwaitingApproval
        State persisted via
        MemorySaver checkpoint.
        Resumes on /chat/resume.
    end note
```

---

## 12. Flowchart / Activity Diagram (Supervisor Loop + HITL)

```mermaid
flowchart TD
    start([Receive prompt]) --> sup["Supervisor: classify intent"]
    sup --> route{Route?}

    route -->|agent1| run1["Run Agent 1"]
    route -->|agent2| run2["Run Agent 2"]
    route -->|data| rundata["Run DataAccessAgent"]
    route -->|done| final["Return final answer"]

    run1 --> visited["Mark visited"]
    run2 --> visited
    rundata --> dataflow

    subgraph dataflow["DataAccessAgent Activity"]
        direction TB
        d_reason["LLM reasons"] --> d_tool{Tool type?}
        d_tool -->|read| d_read["Call read tool → API → DB"]
        d_read --> d_reason
        d_tool -->|write| d_int["interrupt() — request approval"]
        d_int --> d_pause(["PAUSE — return awaiting_approval"])
        d_pause -.->|resume: approved| d_token["Get M2M token"]
        d_token --> d_write["Authed write → API → DB → audit"]
        d_write --> d_done["Report result"]
        d_pause -.->|resume: rejected| d_cancel["Report cancelled"]
        d_tool -->|none| d_answer["Compose answer"]
    end

    dataflow --> visited
    visited --> guard{Already visited<br/>this specialist?}
    guard -->|yes| recheck["Supervisor → done"]
    guard -->|no| sup
    recheck --> final
    final --> stop([End])

    classDef start fill:#1a3a2a,stroke:#4a8,color:#fff
    classDef decision fill:#3a3a1a,stroke:#aa4,color:#fff
    classDef action fill:#1a2a3a,stroke:#48a,color:#fff
    classDef pause fill:#3a1a2a,stroke:#a48,color:#fff
    class start,stop start
    class route,d_tool,guard decision
    class sup,run1,run2,rundata,visited,final,recheck,d_reason,d_read,d_int,d_token,d_write,d_done,d_cancel,d_answer action
    class d_pause pause
```

---

## Legend

| Concept | Meaning |
| ------- | ------- |
| **Agent 1 / Agent 2** | Generic tool-using specialists (no side effects) — generalized from the math & weather agents |
| **DataAccessAgent** | The DB digital worker: read tools (open) + write tools (HITL-gated, M2M-authed) |
| **HITL** | Human-in-the-loop: `interrupt()` pauses a write; resumed on user approval |
| **M2M** | Machine-to-machine auth: aiBackend → OracleDigitalWorker via Keycloak client-credentials |
| **Checkpointer** | `MemorySaver` persists paused graph state, keyed by `thread_id` |
| `-.->` | Asynchronous / control-return / optional flow |
| `-->` | Primary request/data flow |
