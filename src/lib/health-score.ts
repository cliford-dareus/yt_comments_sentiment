/**
 * Creator “health score” (0–100) for a single video’s comment section.
 *
 * Weighted blend of:
 * 1. Sentiment balance (share of positive vs negative among labeled)
 * 2. Like-weighted sentiment (do positive comments get more likes?)
 * 3. Criticism pressure (highly liked negatives hurt more)
 * 4. Coverage (how much of the sample is labeled)
 *
 * Not a channel-wide metric — scoped to one analyzed video.
 */

export type HealthScoreInput = {
  positive: number;
  negative: number;
  neutral: number;
  unlabeled: number;
  /** Sum of likeCount for positive comments */
  positiveLikes: number;
  negativeLikes: number;
  neutralLikes: number;
};

export type HealthScoreResult = {
  score: number; // 0–100
  grade: "Excellent" | "Good" | "Fair" | "Needs attention" | "Critical";
  color: "emerald" | "lime" | "amber" | "orange" | "red";
  summary: string;
  components: {
    sentimentBalance: number; // 0–100
    engagementQuality: number;
    criticismPressure: number; // higher = healthier (less pressure)
    coverage: number;
  };
};

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n));
}

function gradeFromScore(score: number): HealthScoreResult["grade"] {
  if (score >= 85) return "Excellent";
  if (score >= 70) return "Good";
  if (score >= 55) return "Fair";
  if (score >= 40) return "Needs attention";
  return "Critical";
}

function colorFromScore(score: number): HealthScoreResult["color"] {
  if (score >= 85) return "emerald";
  if (score >= 70) return "lime";
  if (score >= 55) return "amber";
  if (score >= 40) return "orange";
  return "red";
}

export function computeHealthScore(input: HealthScoreInput): HealthScoreResult | null {
  const labeled =
    input.positive + input.negative + input.neutral;
  const total = labeled + input.unlabeled;

  if (total === 0 || labeled === 0) {
    return null;
  }

  // --- 1. Sentiment balance (0–100)
  // Map net polarity onto 0–100. Pure positive → 100, pure negative → 0.
  const posShare = input.positive / labeled;
  const negShare = input.negative / labeled;
  const net = posShare - negShare; // -1 … 1
  const sentimentBalance = clamp(((net + 1) / 2) * 100);

  // --- 2. Engagement quality (like-weighted)
  const totalLikes =
    input.positiveLikes + input.negativeLikes + input.neutralLikes;
  let engagementQuality = sentimentBalance; // fallback if no likes
  if (totalLikes > 0) {
    const likeNet =
      (input.positiveLikes - input.negativeLikes) / totalLikes; // -1 … 1
    engagementQuality = clamp(((likeNet + 1) / 2) * 100);
  }

  // --- 3. Criticism pressure (inverse of liked-negative concentration)
  // If negatives carry a large share of total likes → pressure is high.
  let criticismPressure = 80;
  if (totalLikes > 0) {
    const negLikeShare = input.negativeLikes / totalLikes;
    criticismPressure = clamp(100 - negLikeShare * 100);
  } else if (negShare > 0) {
    criticismPressure = clamp(100 - negShare * 90);
  }

  // --- 4. Coverage
  const coverage = clamp((labeled / total) * 100);

  // Weights (sum = 1)
  const score = clamp(
    Math.round(
      sentimentBalance * 0.4 +
        engagementQuality * 0.3 +
        criticismPressure * 0.2 +
        coverage * 0.1,
    ),
  );

  const grade = gradeFromScore(score);
  const color = colorFromScore(score);

  let summary = "";
  if (score >= 85) {
    summary =
      "Audience reaction is strongly favorable. Keep doing what this video does.";
  } else if (score >= 70) {
    summary =
      "Solid reception with room to sharpen a few recurring notes.";
  } else if (score >= 55) {
    summary =
      "Mixed signals — address the top criticisms and amplify what people liked.";
  } else if (score >= 40) {
    summary =
      "Criticism is loud relative to praise. Prioritize the highest-liked complaints.";
  } else {
    summary =
      "Comment section health is weak. Treat this as a signal to rethink packaging or claims.";
  }

  return {
    score,
    grade,
    color,
    summary,
    components: {
      sentimentBalance: Math.round(sentimentBalance),
      engagementQuality: Math.round(engagementQuality),
      criticismPressure: Math.round(criticismPressure),
      coverage: Math.round(coverage),
    },
  };
}
