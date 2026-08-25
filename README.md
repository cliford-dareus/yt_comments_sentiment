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

# Optional quotas / limits
YOUTUBE_DAILY_QUOTA_LIMIT=8000   # soft daily unit budget (default 8000 of 10k)
YOUTUBE_MAX_COMMENTS=500        # max comments per video analysis
```

Google OAuth redirect URI: `http://localhost:3000/api/auth/callback/google`

## Features

- Fetch YouTube comments (capped) and store them in **Postgres**
- **Background analysis jobs** with progress bar (fetch → label → index)
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

## Jobs API

| Endpoint | Purpose |
|----------|--------|
| `POST /api/jobs/start` | Create job `{ videoId }` → `{ jobId }` |
| `POST /api/jobs/:id/run` | Process job (idempotent claim) |
| `GET /api/jobs/:id` | Poll status / progress |

## Recent work (2026-08)

- Auth: Lucia → NextAuth
- Comments in Postgres + per-comment labels
- Insights dashboard + reply assistant
- Background jobs + YouTube quota handling

## TODO

- [ ] Star / rename projects
- [ ] Export summary CSV/PDF
- [ ] Decide long-term Pinecone vs DB-only context
- [ ] Optional: draft a community-post / pinned comment from insights
