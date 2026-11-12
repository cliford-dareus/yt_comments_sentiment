This is a [Next.js](https://nextjs.org/) project for analyzing YouTube comment sentiment.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Auth (NextAuth)

Lucia was replaced with **NextAuth (v4)** + Google provider.

### Required env vars

```env
# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=generate-a-long-random-string

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# App secrets
GOOGLE_API_KEY=
YOUTUBE_API_KEY=
DATABASE_URL=
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_KEY=
PINECONE_API_KEY=
PINECONE_INDEX_NAME=

# Durable jobs (recommended in production)
JOB_WORKER_SECRET=generate-a-long-random-string   # Bearer token for /api/jobs/worker
# Optional aliases also accepted: CRON_SECRET, or falls back to NEXTAUTH_SECRET

# Optional quotas / limits
YOUTUBE_DAILY_QUOTA_LIMIT=8000   # soft daily unit budget (default 8000 of 10k)
YOUTUBE_MAX_COMMENTS=500        # max comments per video analysis
JOB_STUCK_AFTER_MS=240000       # reclaim in-flight jobs quieter than this (default 4m)
GEMINI_MODEL=gemini-2.5-flash   # override default model
```

Google OAuth redirect URI: `http://localhost:3000/api/auth/callback/google`

## Features

- Fetch YouTube comments (capped) and store them in **Postgres**
- **Durable background analysis jobs** (DB queue + worker + cron safety net)
- **YouTube quota tracking** (daily unit budget + clear quota/rate-limit errors)
- **Per-comment sentiment** labels via Gemini batches
- Insights dashboard above chat + creator brief
- Filterable comments panel + **reply assistant**
- Chat with comment context (RAG via Pinecone still available)

## Required DB migrations

Apply in order:

1. `user_system_enum` + `assistant` value  
2. `supabase/migrations/0004_comments_table.sql`  
3. `supabase/migrations/0005_analysis_jobs.sql`  

## Jobs API (durable)

Jobs are **not** processed in the same serverless request that creates them.

Flow:

1. `POST /api/jobs/start` inserts a `pending` row and **dispatches** the worker
2. `POST /api/jobs/worker` (secret-protected) claims and runs the job in a **new** invocation
3. Client polls `GET /api/jobs/:id` for progress
4. Vercel Cron hits the worker every minute to reclaim stuck work and drain backlog

| Endpoint | Purpose |
|----------|--------|
| `POST /api/jobs/start` | Create job `{ videoId }` → `{ jobId }` (202) |
| `POST /api/jobs/:id/run` | Manually process job (user session) |
| `POST /api/jobs/:id/retry` | Reset failed/stuck → re-enqueue |
| `GET /api/jobs/:id` | Poll status / progress |
| `POST/GET /api/jobs/worker` | Internal worker (Bearer `JOB_WORKER_SECRET`) |

Worker auth header:

```http
Authorization: Bearer <JOB_WORKER_SECRET>
```

Locally, if no secret is set, the worker allows requests in development only.

Optional: install `@vercel/functions` so `waitUntil` keeps the dispatch fetch alive after the start route responds.

```bash
npm i @vercel/functions
```

## Recent work

- Auth: Lucia → NextAuth
- Comments in Postgres + per-comment labels
- Insights dashboard + reply assistant
- Background jobs + YouTube quota handling
- Gemini client standardized on `@google/genai`
- Durable job worker (dispatch + reclaim + cron)

## TODO

- [ ] Star / rename projects
- [ ] Export summary CSV/PDF
- [ ] Decide long-term Pinecone vs DB-only context
- [ ] Optional: draft a community-post / pinned comment from insights
