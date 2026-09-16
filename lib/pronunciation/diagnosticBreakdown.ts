import {
  DIAGNOSTIC_TAG_LABELS,
  type DiagnosticTag,
} from "@/lib/pronunciation/diagnosticBank";

export type DiagnosticAttemptRow = {
  target_tags: string[] | null;
  overall_score: number | null;
};

export type TagScore = {
  tag: DiagnosticTag;
  label: string;
  score: number;
};

export function avgScores(scores: number[]): number | null {
  if (scores.length === 0) return null;
  return Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;
}

function numericScores(rows: DiagnosticAttemptRow[]): Map<string, number[]> {
  const buckets = new Map<string, number[]>();
  for (const row of rows) {
    if (typeof row.overall_score !== "number") continue;
    for (const tag of row.target_tags ?? []) {
      const list = buckets.get(tag) ?? [];
      list.push(row.overall_score);
      buckets.set(tag, list);
    }
  }
  return buckets;
}

/** Per-tag averages, weakest first. */
export function tagBreakdown(rows: DiagnosticAttemptRow[]): TagScore[] {
  return Array.from(numericScores(rows).entries())
    .map(([tag, scores]) => ({
      tag: tag as DiagnosticTag,
      label: DIAGNOSTIC_TAG_LABELS[tag as DiagnosticTag] ?? tag,
      score: avgScores(scores) ?? 0,
    }))
    .sort((a, b) => a.score - b.score);
}

export function tagScoreMap(rows: DiagnosticAttemptRow[]): Map<string, number> {
  const out = new Map<string, number>();
  numericScores(rows).forEach((scores, tag) => {
    out.set(tag, avgScores(scores) ?? 0);
  });
  return out;
}
