/**
 * Progress-island artwork paths. Stages 1–4 are fixed; stage 5 has several
 * city/car variants and we pick one at random each time the learner reaches
 * stage 5 (stable for the rest of that visit so dashboard, strip, and popup match).
 */
import { useEffect, useState } from "react";

export const STAGE_5_VARIANTS = ["byd", "byd-suv", "zeekr", "xpeng", "geely"] as const;

const STAGE_5_STORAGE_KEY = "lingo-progress-island-stage-5";
const LAST_STAGE_STORAGE_KEY = "lingo-progress-island-last-stage";
const ASSET_VERSION = "alpha";

function islandAsset(path: string): string {
  return `${path}?v=${ASSET_VERSION}`;
}

function safeIslandStage(stage: number): number {
  return Math.min(5, Math.max(1, Math.round(stage) || 1));
}

export function progressIslandFallbackSrc(stage: number): string {
  const safe = safeIslandStage(stage);
  if (safe !== 5) return islandAsset(`/progress-islands/stage-${safe}.png`);
  return islandAsset("/progress-islands/stage-5-byd.png");
}

export function progressIslandSrc(stage: number): string {
  const safe = safeIslandStage(stage);
  if (typeof window === "undefined") {
    return progressIslandFallbackSrc(safe);
  }

  const last = window.sessionStorage.getItem(LAST_STAGE_STORAGE_KEY);
  window.sessionStorage.setItem(LAST_STAGE_STORAGE_KEY, String(safe));

  if (safe !== 5) return islandAsset(`/progress-islands/stage-${safe}.png`);

  const existing = window.sessionStorage.getItem(STAGE_5_STORAGE_KEY);
  const valid = STAGE_5_VARIANTS.find((id) => id === existing);
  const arrivedAtStage5 = last !== "5";

  if (!arrivedAtStage5 && valid) {
    return islandAsset(`/progress-islands/stage-5-${valid}.png`);
  }

  const picked = STAGE_5_VARIANTS[Math.floor(Math.random() * STAGE_5_VARIANTS.length)];
  window.sessionStorage.setItem(STAGE_5_STORAGE_KEY, picked);
  return islandAsset(`/progress-islands/stage-5-${picked}.png`);
}

/** Client hook so Stage 5 randomization does not mismatch SSR. */
export function useProgressIslandSrc(stage: number): string {
  const safe = safeIslandStage(stage);
  const [src, setSrc] = useState(() => progressIslandFallbackSrc(safe));

  useEffect(() => {
    setSrc(progressIslandSrc(safe));
  }, [safe]);

  return src;
}
