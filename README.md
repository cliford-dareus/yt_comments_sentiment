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

# Google OAuth (same console project as before is fine)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Existing app secrets
GOOGLE_API_KEY=
YOUTUBE_API_KEY=
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_KEY=
PINECONE_API_KEY=
PINECONE_INDEX_NAME=
```

In [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials → your OAuth client, add:

- Authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
- (Production) `https://YOUR_DOMAIN/api/auth/callback/google`

Generate `NEXTAUTH_SECRET` with:

```bash
openssl rand -base64 32
```

Users are upserted into the existing `$user` table on Google sign-in. Session strategy is JWT (no Lucia session table required).

## Recent fixes (2026-08)

- **Auth migrated from Lucia → NextAuth** (Google sign-in).
- Hardened `/api/youtube-comments`: video ID from URLs, 500-comment cap.
- Real Gemini sentiment summary.
- Fixed Pinecone embedding batching.
- Persist chat messages; inject sentiment into prompt + sidebar.
- Loading indicator in chat UI.

### Required DB migration (messages)

```sql
ALTER TYPE "public"."user_system_enum" ADD VALUE IF NOT EXISTS 'assistant';
```

## TODO

- [ ] Decide whether full Pinecone RAG is needed long-term vs. simpler DB + LLM approach
- [ ] Allow users to save / star favorite chats
- [ ] Clean up remaining non-null assertions and improve TypeScript strictness
- [ ] Add basic unit/integration tests for the YouTube + sentiment paths
- [ ] Proper rate-limit / quota handling around the YouTube Data API
- [ ] Consider storing comments directly in Postgres instead of (or in addition to) CSV
