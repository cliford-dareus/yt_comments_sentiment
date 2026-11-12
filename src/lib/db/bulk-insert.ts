import { db } from "@/lib/db";

/**
 * Multi-row INSERT via Drizzle `.values([...])`.
 *
 * At typical volumes (≤500 comments) one or two round-trips beat
 * per-row inserts by a wide margin. Chunking avoids oversized
 * parameter lists / query packets on hosted Postgres.
 *
 * Measured shape (local Postgres, ~same region):
 * - 500× single-row insert:   ~500 round-trips, high latency
 * - 5× 100-row multi-insert:  ~5 round-trips  (current)
 * - 2× 250-row multi-insert:  ~2 round-trips  (this helper default)
 * - 1× 500-row multi-insert:  ~1 round-trip   (fine under ~1–2k rows)
 *
 * COPY is faster still for 10k+ rows but needs a raw stream and is
 * overkill for YouTube comment caps.
 */
export const BULK_INSERT_CHUNK = Number(
  process.env.DB_BULK_INSERT_CHUNK ?? 250,
);

export async function bulkInsert<T extends Record<string, unknown>>(
  table: Parameters<typeof db.insert>[0],
  rows: T[],
  chunkSize = BULK_INSERT_CHUNK,
) {
  if (!rows.length) return;

  const size = Math.max(1, Math.min(1000, chunkSize));

  for (let i = 0; i < rows.length; i += size) {
    const slice = rows.slice(i, i + size);
    // Drizzle generates INSERT … VALUES (…), (…), …
    await db.insert(table).values(slice as never);
  }
}
