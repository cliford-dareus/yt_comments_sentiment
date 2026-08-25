/** Canonical theme keys — safe to import from client components. */
export const THEME_CATALOG: Record<
  string,
  { label: string; polarity: "negative" | "positive" | "mixed" }
> = {
  audio: { label: "Audio / mic quality", polarity: "negative" },
  video_quality: { label: "Video / visuals", polarity: "negative" },
  pacing: { label: "Pacing / length", polarity: "negative" },
  thumbnail_title: { label: "Thumbnail / title mismatch", polarity: "negative" },
  sponsorship: { label: "Sponsorship / ads", polarity: "negative" },
  accuracy: { label: "Facts / accuracy", polarity: "negative" },
  tone_attitude: { label: "Tone / attitude", polarity: "negative" },
  editing: { label: "Editing / production", polarity: "negative" },
  accessibility: { label: "Captions / accessibility", polarity: "negative" },
  controversy: { label: "Controversy / drama", polarity: "negative" },
  question: { label: "Genuine question", polarity: "mixed" },
  praise_content: { label: "Praise — content", polarity: "positive" },
  praise_style: { label: "Praise — style / personality", polarity: "positive" },
  request: { label: "Content request", polarity: "mixed" },
  other: { label: "Other", polarity: "mixed" },
};
