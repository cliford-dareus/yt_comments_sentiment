import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

/**
 * Apply many per-row comment field updates in one round-trip.
 * Uses UPDATE … FROM (VALUES …) so N labels cost ~1 query instead of N.
 */

export type SentimentBatchRow = {
  id: string;
  label: "positive" | "negative" | "neutral";
  score: number;
};

export async function batchUpdateSentimentLabels(rows: SentimentBatchRow[]) {
  if (!rows.length) return;

  // Chunk to keep query size reasonable at high volumes
  const CHUNK = 200;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);
    const values = sql.join(
      slice.map(
        (r) =>
          sql`(${r.id}::text, ${r.label}::text, ${Math.max(0, Math.min(100, Math.round(r.score)))}::integer)`,
      ),
      sql`, `,
    );

    await db.execute(sql`
      UPDATE comments AS c
      SET
        sentiment_label = v.label::sentiment_label,
        sentiment_score = v.score
      FROM (VALUES ${values}) AS v(id, label, score)
      WHERE c.id = v.id
    `);
  }
}

export type ThemeBatchRow = {
  id: string;
  themeKey: string;
};

export async function batchUpdateThemeKeys(rows: ThemeBatchRow[]) {
  if (!rows.length) return;

  const CHUNK = 200;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);
    const values = sql.join(
      slice.map((r) => sql`(${r.id}::text, ${r.themeKey}::text)`),
      sql`, `,
    );

    await db.execute(sql`
      UPDATE comments AS c
      SET theme_key = v.theme_key
      FROM (VALUES ${values}) AS v(id, theme_key)
      WHERE c.id = v.id
    `);
  }
}

export type TriageBatchRow = {
  id: string;
  status: "open" | "drafted" | "done" | "skipped" | null;
  priority: number | null;
  reason: string | null;
};

export async function batchUpdateTriage(rows: TriageBatchRow[]) {
  if (!rows.length) return;

  const CHUNK = 200;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);
    const values = sql.join(
      slice.map((r) => {
        const status =
          r.status === null ? sql`NULL::text` : sql`${r.status}::text`;
        const priority =
          r.priority === null
            ? sql`NULL::integer`
            : sql`${Math.min(100, Math.max(0, Math.round(r.priority)))}::integer`;
        const reason =
          r.reason === null ? sql`NULL::text` : sql`${r.reason}::text`;
        return sql`(${r.id}::text, ${status}, ${priority}, ${reason})`;
      }),
      sql`, `,
    );

    await db.execute(sql`
      UPDATE comments AS c
      SET
        triage_status = CASE
          WHEN v.status IS NULL THEN NULL
          ELSE v.status::triage_status
        END,
        triage_priority = v.priority,
        triage_reason = v.reason
      FROM (VALUES ${values}) AS v(id, status, priority, reason)
      WHERE c.id = v.id
    `);
  }
}
