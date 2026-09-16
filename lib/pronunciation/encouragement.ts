/**
 * Calmer coaching copy for the redesigned pronunciation product.
 * Keeps the original band helpers for compatibility.
 */

export type ScoreBand = "strong" | "close" | "rough";

export function bandForScore(score: number | null): ScoreBand | null {
  if (score === null) return null;
  return score >= 80 ? "strong" : score >= 60 ? "close" : "rough";
}

const ENCOURAGEMENT: Record<ScoreBand, string[]> = {
  strong: [
    "Nice — that landed clearly.",
    "Great match. Your tones stayed steady.",
    "That sounded natural.",
  ],
  close: [
    "Almost — one small adjustment will get it.",
    "Close. Let's clean up one sound.",
    "You're nearly there — give the tone a little more shape.",
  ],
  rough: [
    "No worries — let's try that one again, slowly.",
    "We'll fix this one sound at a time.",
    "Take another pass — focus on the tone shape.",
  ],
};

export function pickEncouragement(band: ScoreBand, seed: number): string {
  const lines = ENCOURAGEMENT[band];
  return lines[seed % lines.length];
}

const TONE_SHAPE_TIPS: Record<1 | 2 | 3 | 4, string> = {
  1: "Keep this tone flat and steady the whole way through — no rise or fall.",
  2: "Let this tone rise clearly from low to high, like you're asking \"huh?\"",
  3: "Let this tone dip low first, then come back up — if it stays high, it can sound like a 2nd tone.",
  4: "Make this tone fall sharply and quickly from high to low, like a firm command.",
};

export function toneShapeTip(targetTone: number | null): string | null {
  if (targetTone === 1 || targetTone === 2 || targetTone === 3 || targetTone === 4) {
    return TONE_SHAPE_TIPS[targetTone];
  }
  return null;
}

export function toneName(tone: number | null | undefined): string {
  if (tone === 1) return "1st tone";
  if (tone === 2) return "2nd tone";
  if (tone === 3) return "3rd tone";
  if (tone === 4) return "4th tone";
  return "this tone";
}

export function toneGlyph(tone: number | null | undefined) {
  return tone === 1 ? "→" : tone === 2 ? "↗" : tone === 3 ? "∨" : tone === 4 ? "↘" : "—";
}

export function feedbackHeadline(band: ScoreBand | null): string {
  if (band === "strong") return "Nice!";
  if (band === "close") return "Almost!";
  if (band === "rough") return "Let's fix one sound";
  return "Here's your result";
}
