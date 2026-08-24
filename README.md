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
```

Google OAuth redirect URI: `http://localhost:3000/api/auth/callback/google`

## Features

- Fetch YouTube comments (capped) and store them in **Postgres**
- **Per-comment sentiment** labels (`positive` / `negative` / `neutral`) via Gemini batches
- Overall **insights** summary + distribution bar in the sidebar
- Filterable comments panel (search + sentiment tabs)
- Chat with comment context (RAG via Pinecone still available)

## Required DB migrations

```sql
-- messages role
ALTER TYPE "public"."user_system_enum" ADD VALUE IF NOT EXISTS 'assistant';

-- comments table + enum (or run supabase/migrations/0004_comments_table.sql)
```

Apply `supabase/migrations/0004_comments_table.sql` before creating new projects.

## Recent work (2026-08)

- Auth: Lucia → NextAuth
- Comments stored in `comments` table (not only CSV)
- Per-comment labeling + insights sidebar
- Chat message persistence, sentiment in system prompt

## TODO

- [ ] Reply assistant (draft replies to comments)
- [ ] Star / rename projects
- [ ] Export summary CSV/PDF
- [ ] Background jobs for large comment sets
- [ ] Decide long-term Pinecone vs DB-only context
