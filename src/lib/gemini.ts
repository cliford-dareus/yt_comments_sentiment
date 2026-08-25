import { GoogleGenAI } from "@google/genai";

/**
 * Unified Gemini client (@google/genai).
 * Prefer GOOGLE_API_KEY; fall back to GEMINI_API_KEY for AI Studio keys.
 */
const apiKey =
  process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || "";

export const gemini = new GoogleGenAI({ apiKey });

/** High-volume text tasks (labeling, drafts). Override with GEMINI_MODEL. */
export const GEMINI_MODEL =
  process.env.GEMINI_MODEL || "gemini-2.5-flash";

export function assertGeminiConfigured() {
  if (!apiKey) {
    throw new Error(
      "GOOGLE_API_KEY (or GEMINI_API_KEY) is not configured — cannot call Gemini",
    );
  }
}

export async function generateText(params: {
  prompt: string;
  temperature?: number;
  /** Force JSON object/array in the response body */
  json?: boolean;
  maxOutputTokens?: number;
}): Promise<string> {
  assertGeminiConfigured();

  const response = await gemini.models.generateContent({
    model: GEMINI_MODEL,
    contents: params.prompt,
    config: {
      temperature: params.temperature ?? 0.2,
      maxOutputTokens: params.maxOutputTokens ?? 8192,
      ...(params.json
        ? { responseMimeType: "application/json" as const }
        : {}),
    },
  });

  const text = response.text?.trim() ?? "";
  if (!text) {
    throw new Error("Gemini returned an empty response");
  }
  return text;
}

/** Simple retry wrapper for transient Gemini / network errors. */
export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: { retries?: number; baseDelayMs?: number; label?: string } = {},
): Promise<T> {
  const retries = opts.retries ?? 3;
  const base = opts.baseDelayMs ?? 800;
  let lastErr: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const msg = err instanceof Error ? err.message : String(err);
      const retryable =
        /429|500|503|timeout|ECONNRESET|fetch failed|RESOURCE_EXHAUSTED|overloaded/i.test(
          msg,
        );

      if (!retryable || attempt === retries) break;

      const delay = base * Math.pow(2, attempt);
      console.warn(
        `[gemini] ${opts.label ?? "call"} failed (attempt ${attempt + 1}/${retries + 1}): ${msg}. retry in ${delay}ms`,
      );
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  throw lastErr;
}
