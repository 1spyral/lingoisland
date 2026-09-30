/**
 * Illustrated Journey map layout.
 *
 * The desktop stage matches journey-ocean-background.png (1891×831).
 * Open water begins at y ≈ 349px (42%): above that line are sky, mountains,
 * and distant scenic islands. Interactive artwork is anchored by the
 * bottom-center of its opaque silhouette and kept below that horizon.
 *
 * Coordinates inside this module are stage pixels on a 1000-wide desktop
 * stage. The component scales them to the measured map width.
 */

export const STAGE_WIDTH = 1000;
export const OCEAN_WIDTH = 1891;
export const OCEAN_HEIGHT = 831;
export const IMAGE_HEIGHT = Math.round((STAGE_WIDTH * OCEAN_HEIGHT) / OCEAN_WIDTH);

/** Normalized Y where open water takes over. Measured from the source PNG. */
export const HORIZON_FRACTION = 0.42;
export const HORIZON_Y = Math.round(IMAGE_HEIGHT * HORIZON_FRACTION);

/** Switch to the vertical map when the roadmap container is narrower than this. */
export const DESKTOP_MAP_MIN_WIDTH = 920;

export const OCEAN_SRC = "/journey/journey-ocean-background.png";
export const SOURCE_W = 1448;
export const SOURCE_H = 1086;

/** Near-horizon water and the pale foreground shallows, sampled from the ocean PNG. */
export const OCEAN_HORIZON_COLOR = "#95ddfc";
export const OCEAN_SHALLOW_COLOR = "#b9f3f1";

export type ArtworkId =
  | "gazebo-lounge"
  | "study-cottage"
  | "bank"
  | "teaching-board"
  | "observatory"
  | "library"
  | "grand-library";

export type JourneyMapNodeType = "island" | "story" | "tone_practice";

export type JourneyMapNode = {
  id: string;
  type: JourneyMapNodeType;
};

/** Opaque pixel bounds of each transparent illustration (source 1448×1086). */
export const ART_PIXELS: Record<ArtworkId, { l: number; t: number; r: number; b: number }> = {
  "gazebo-lounge": { l: 55, t: 32, r: 1403, b: 1016 },
  "study-cottage": { l: 107, t: 34, r: 1350, b: 983 },
  bank: { l: 58, t: 81, r: 1395, b: 1030 },
  "teaching-board": { l: 61, t: 67, r: 1399, b: 1003 },
  observatory: { l: 144, t: 83, r: 1380, b: 1027 },
  library: { l: 91, t: 72, r: 1358, b: 1016 },
  "grand-library": { l: 77, t: 112, r: 1399, b: 988 },
};

const TOPIC_ARTWORK: ArtworkId[] = [
  "gazebo-lounge",
  "study-cottage",
  "bank",
  "teaching-board",
  "observatory",
];

const STORY_ARTWORK: ArtworkId[] = ["library", "grand-library"];

/** Visible footprint. About 50% larger than the previous 112px stage width. */
const ISLAND_W = 168;
const STORY_W = 154;
const LABEL_W = 132;
const LABEL_H = 58;
export const LABEL_GAP = 8;
/**
 * Water between an upper island's bottom and the next lower island's top.
 * Holds the upper nameplate and the pronunciation button beneath it.
 */
const CHANNEL = LABEL_GAP + LABEL_H + 12 + 42 + 6 + 26 + 12;
/** Top of the tallest upper-row island. Stays below HORIZON_Y. */
const ART_TOP = 200;
const BAND_GAP = 72;
const MIC = 42;
const MIC_LABEL_W = 118;
const MIC_LABEL_H = 26;
const EDGE_PAD = 10;
/** Kept so shoreline overlays can still be measured if a label uses that side. */
export const LABEL_HANG = 8;

export type LabelSide = "above" | "below" | "left" | "right" | "overlay";

export type StageRect = { x: number; y: number; w: number; h: number };

export type PlacedJourneyNode = {
  id: string;
  type: JourneyMapNodeType;
  artwork: ArtworkId | null;
  /** Bottom-center of the illustration or microphone, in stage pixels. */
  anchorX: number;
  anchorY: number;
  width: number;
  height: number;
  labelSide: LabelSide;
  labelWidth: number;
  labelHeight: number;
  /** Horizontal shift of the label center relative to the anchor. */
  labelShiftX: number;
  /** 1-based position in the real Journey path, including pronunciation steps. */
  step: number;
};

export type JourneyMapLayout = {
  stageWidth: number;
  stageHeight: number;
  imageHeight: number;
  horizonY: number;
  placements: PlacedJourneyNode[];
};

export function artworkSrc(id: ArtworkId) {
  return `/journey/journey-island-${id}.png`;
}

export function visibleArtSize(art: ArtworkId, visualWidth: number) {
  const pixels = ART_PIXELS[art];
  const srcW = pixels.r - pixels.l;
  const srcH = pixels.b - pixels.t;
  return { width: visualWidth, height: (visualWidth * srcH) / srcW };
}

export function assignArtwork(nodes: readonly JourneyMapNode[]) {
  const assigned = new Map<string, ArtworkId>();
  let islandIndex = 0;
  let storyIndex = 0;
  for (const node of nodes) {
    if (node.type === "island") {
      assigned.set(node.id, TOPIC_ARTWORK[islandIndex % TOPIC_ARTWORK.length]);
      islandIndex += 1;
    } else if (node.type === "story") {
      assigned.set(node.id, STORY_ARTWORK[storyIndex % STORY_ARTWORK.length]);
      storyIndex += 1;
    }
  }
  return assigned;
}

export function placedNodeRects(node: PlacedJourneyNode): { art: StageRect; label: StageRect } {
  const art: StageRect = {
    x: node.anchorX - node.width / 2,
    y: node.anchorY - node.height,
    w: node.width,
    h: node.height,
  };
  const labelX = node.anchorX + node.labelShiftX - node.labelWidth / 2;
  const label: StageRect = {
    x: labelX,
    y: node.anchorY + LABEL_GAP,
    w: node.labelWidth,
    h: node.labelHeight,
  };
  if (node.labelSide === "above") {
    label.y = art.y - LABEL_GAP - node.labelHeight;
  } else if (node.labelSide === "overlay") {
    label.y = node.anchorY - (node.labelHeight - LABEL_HANG);
  } else if (node.labelSide === "left" || node.labelSide === "right") {
    label.y = art.y + art.h / 2 - node.labelHeight / 2;
  }
  return { art, label };
}

function rectsOverlap(a: StageRect, b: StageRect, pad = 0) {
  return (
    a.x < b.x + b.w + pad &&
    a.x + a.w + pad > b.x &&
    a.y < b.y + b.h + pad &&
    a.y + a.h + pad > b.y
  );
}

function insideStage(rect: StageRect, stageW: number, stageH: number, topLimit: number) {
  return rect.x >= 4 && rect.y >= topLimit && rect.x + rect.w <= stageW - 4 && rect.y + rect.h <= stageH - 4;
}

function bandCountFor(illustratedCount: number) {
  if (illustratedCount <= 7) return 1;
  if (illustratedCount <= 14) return 2;
  return Math.ceil(illustratedCount / 7);
}

function xPositions(count: number, itemW: number) {
  if (count <= 0) return [];
  if (count === 1) return [STAGE_WIDTH / 2];
  const edge = itemW / 2 + EDGE_PAD;
  const maxSpan = STAGE_WIDTH - edge * 2;
  const natural = (count - 1) * (itemW + 30);
  const fill =
    count >= 7 ? 1 : count === 6 ? 0.94 : count === 5 ? 0.86 : count === 4 ? 0.74 : count === 3 ? 0.58 : 0.44;
  const span = Math.min(maxSpan, Math.max(natural, maxSpan * fill));
  const start = (STAGE_WIDTH - span) / 2;
  return Array.from({ length: count }, (_, index) => start + (span * index) / (count - 1));
}

function illustratedWidth(type: JourneyMapNodeType) {
  return type === "story" ? STORY_W : ISLAND_W;
}

type Draft = PlacedJourneyNode;

function placeIllustrated(nodes: readonly JourneyMapNode[], artwork: Map<string, ArtworkId>) {
  const illustrated = nodes.filter((node) => node.type !== "tone_practice");
  const bands = bandCountFor(illustrated.length);
  const perBand = bands > 0 ? Math.ceil(illustrated.length / bands) : 0;
  const placed = new Map<string, Draft>();

  const bandNodes: JourneyMapNode[][] = [];
  for (let band = 0; band < bands; band += 1) {
    bandNodes.push(illustrated.slice(band * perBand, (band + 1) * perBand));
  }

  let cursorTop = ART_TOP;
  let lowest = ART_TOP;

  bandNodes.forEach((group, band) => {
    const heights = group.map((node) => {
      const art = artwork.get(node.id)!;
      return visibleArtSize(art, illustratedWidth(node.type)).height;
    });
    const highHeights = heights.filter((_, index) => index % 2 === 0);
    const lowHeights = heights.filter((_, index) => index % 2 === 1);
    const highH = highHeights.length ? Math.max(...highHeights) : 0;
    const lowH = lowHeights.length ? Math.max(...lowHeights) : 0;
    const artTop = band === 0 ? ART_TOP : cursorTop;
    const highBottom = artTop + highH;
    const lowBottom = lowH > 0 ? highBottom + CHANNEL + lowH : highBottom;
    const xs = xPositions(group.length, ISLAND_W);

    group.forEach((node, index) => {
      const high = index % 2 === 0;
      const width = illustratedWidth(node.type);
      const height = heights[index];
      const rowBottom = high ? highBottom : lowBottom;
      placed.set(node.id, {
        id: node.id,
        type: node.type,
        artwork: artwork.get(node.id) ?? null,
        anchorX: xs[index],
        anchorY: rowBottom,
        width,
        height,
        labelSide: "below",
        labelWidth: LABEL_W,
        labelHeight: LABEL_H,
        labelShiftX: clamp(xs[index], LABEL_W / 2 + 8, STAGE_WIDTH - LABEL_W / 2 - 8) - xs[index],
        step: 0,
      });
    });

    lowest = Math.max(lowest, lowBottom + LABEL_GAP + LABEL_H);
    cursorTop = lowBottom + LABEL_GAP + LABEL_H + BAND_GAP;
  });

  const stageHeight = Math.max(IMAGE_HEIGHT, Math.ceil(lowest + 18));
  return { placed, stageHeight };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function placeTone(options: {
  id: string;
  prev: Draft | null;
  next: Draft | null;
  frac: number;
  obstacles: StageRect[];
  stageW: number;
  stageH: number;
  topLimit: number;
}): Draft {
  const { id, prev, next, frac, obstacles, stageW, stageH, topLimit } = options;
  const midX = prev && next ? prev.anchorX + (next.anchorX - prev.anchorX) * frac : (prev ?? next)?.anchorX ?? stageW / 2;

  let channelTop = HORIZON_Y + 48;
  let channelBottom = stageH - 24;
  if (prev && next) {
    const upper = prev.anchorY <= next.anchorY ? prev : next;
    const lower = upper === prev ? next : prev;
    channelTop = upper.anchorY + LABEL_GAP + upper.labelHeight + 8;
    channelBottom = lower.anchorY - lower.height - 8;
  }

  const room = channelBottom - channelTop;
  const stack = MIC + 4 + MIC_LABEL_H;
  const labelBelow = room >= stack;
  const micBottom = labelBelow
    ? channelTop + Math.max(0, (room - stack) / 2) + MIC
    : channelTop + Math.max(MIC, Math.min(room, MIC + Math.max(0, room - MIC) / 2));

  const labelWidths = [MIC_LABEL_W, 88, 72];
  const labelSides: LabelSide[] = labelBelow ? ["below", "right", "left"] : ["right", "left"];

  let best: Draft | null = null;
  let bestScore = Number.POSITIVE_INFINITY;

  for (const labelWidth of labelWidths) {
    for (const labelSide of labelSides) {
      const draft: Draft = {
        id,
        type: "tone_practice",
        artwork: null,
        anchorX: clamp(midX, MIC / 2 + 8, stageW - MIC / 2 - 8),
        anchorY: micBottom,
        width: MIC,
        height: MIC,
        labelSide,
        labelWidth,
        labelHeight: MIC_LABEL_H,
        labelShiftX: 0,
        step: 0,
      };
      if (labelSide === "right" || labelSide === "left") {
        const half = labelWidth / 2;
        const desired = labelSide === "right" ? draft.anchorX + draft.width / 2 + LABEL_GAP + half : draft.anchorX - draft.width / 2 - LABEL_GAP - half;
        const center = clamp(desired, half + 6, stageW - half - 6);
        draft.labelShiftX = center - draft.anchorX;
      } else {
        const half = labelWidth / 2;
        const center = clamp(draft.anchorX, half + 6, stageW - half - 6);
        draft.labelShiftX = center - draft.anchorX;
      }

      const rects = placedNodeRects(draft);
      const pieces = [rects.art, rects.label];
      const fits = pieces.every((rect) => insideStage(rect, stageW, stageH, topLimit));
      const hits = pieces.some((rect) => obstacles.some((obstacle) => rectsOverlap(rect, obstacle, 4)));
      if (!fits || hits) continue;
      const score = Math.abs(draft.anchorX - midX) + (labelSide === "below" ? 0 : 12) + (labelWidth < MIC_LABEL_W ? 8 : 0);
      if (score < bestScore) {
        bestScore = score;
        best = draft;
      }
    }
  }

  if (best) return best;

  return {
    id,
    type: "tone_practice",
    artwork: null,
    anchorX: clamp(midX, MIC / 2 + 8, stageW - MIC / 2 - 8),
    anchorY: Math.min(stageH - 8, Math.max(topLimit + MIC, micBottom)),
    width: MIC,
    height: MIC,
    labelSide: "below",
    labelWidth: 72,
    labelHeight: MIC_LABEL_H,
    labelShiftX: 0,
    step: 0,
  };
}

function layoutDesktop(nodes: readonly JourneyMapNode[]): JourneyMapLayout {
  const artwork = assignArtwork(nodes);
  const { placed, stageHeight } = placeIllustrated(nodes, artwork);
  const obstacles: StageRect[] = [];
  for (const node of Array.from(placed.values())) {
    const rects = placedNodeRects(node);
    obstacles.push(rects.art, rects.label);
  }

  const placements: Draft[] = [];
  let index = 0;
  while (index < nodes.length) {
    const node = nodes[index];
    if (node.type !== "tone_practice") {
      placements.push(placed.get(node.id)!);
      index += 1;
      continue;
    }

    let end = index;
    while (end < nodes.length && nodes[end].type === "tone_practice") end += 1;
    const previousIllustrated = Array.from(placed.values())
      .reverse()
      .find((item) => {
      const previousIndex = nodes.findIndex((candidate) => candidate.id === item.id);
      return previousIndex >= 0 && previousIndex < index;
    });
    const nextNode = nodes.slice(end).find((candidate) => candidate.type !== "tone_practice");
    const nextIllustrated = nextNode ? placed.get(nextNode.id) ?? null : null;
    const group = nodes.slice(index, end);

    group.forEach((tone, toneIndex) => {
      const draft = placeTone({
        id: tone.id,
        prev: previousIllustrated ?? null,
        next: nextIllustrated,
        frac: (toneIndex + 1) / (group.length + 1),
        obstacles,
        stageW: STAGE_WIDTH,
        stageH: stageHeight,
        topLimit: HORIZON_Y + 4,
      });
      placements.push(draft);
      const rects = placedNodeRects(draft);
      obstacles.push(rects.art, rects.label);
    });

    index = end;
  }

  // Keep DOM/reading order identical to the journey path.
  const byId = new Map(placements.map((node) => [node.id, node]));
  return {
    stageWidth: STAGE_WIDTH,
    stageHeight,
    imageHeight: IMAGE_HEIGHT,
    horizonY: HORIZON_Y,
    placements: nodes.map((node, index) => ({ ...byId.get(node.id)!, step: index + 1 })),
  };
}

function clampCenter(center: number, size: number, stageW: number) {
  const half = size / 2;
  return clamp(center, half + 8, stageW - half - 8);
}

function layoutMobile(nodes: readonly JourneyMapNode[], width: number): JourneyMapLayout {
  const artwork = assignArtwork(nodes);
  const islandW = Math.min(200, Math.max(156, width * 0.5));
  const storyW = islandW * 0.94;
  const labelW = Math.min(156, Math.max(128, width * 0.42));
  const labelH = 54;
  const mic = 46;
  const micLabelH = 32;
  const placements: Draft[] = [];
  let cursor = 10;
  let illustratedIndex = 0;

  const illustratedX: number[] = [];
  for (const node of nodes) {
    if (node.type === "tone_practice") continue;
    const visualW = node.type === "story" ? storyW : islandW;
    const xPercent = illustratedIndex % 2 === 0 ? 0.32 : 0.68;
    illustratedX.push(clampCenter(width * xPercent, visualW, width));
    illustratedIndex += 1;
  }

  illustratedIndex = 0;
  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index];
    if (node.type !== "tone_practice") {
      const visualW = node.type === "story" ? storyW : islandW;
      const art = artwork.get(node.id)!;
      const height = visibleArtSize(art, visualW).height;
      const anchorX = illustratedX[illustratedIndex];
      const anchorY = cursor + height;
      placements.push({
        id: node.id,
        type: node.type,
        artwork: art,
        anchorX,
        anchorY,
        width: visualW,
        height,
        labelSide: "below",
        labelWidth: labelW,
        labelHeight: labelH,
        labelShiftX: clampCenter(anchorX, labelW, width) - anchorX,
        step: 0,
      });
      cursor = anchorY + LABEL_GAP + labelH + 40;
      illustratedIndex += 1;
      continue;
    }

    let runEnd = index;
    while (runEnd + 1 < nodes.length && nodes[runEnd + 1].type === "tone_practice") runEnd += 1;
    const runLength = runEnd - index + 1;
    const prevX = illustratedIndex > 0 ? illustratedX[illustratedIndex - 1] : width / 2;
    const nextX = illustratedIndex < illustratedX.length ? illustratedX[illustratedIndex] : prevX;

    for (let toneIndex = 0; toneIndex < runLength; toneIndex += 1) {
      const tone = nodes[index + toneIndex];
      const frac = (toneIndex + 1) / (runLength + 1);
      const anchorX = clampCenter(prevX + (nextX - prevX) * frac, mic, width);
      const anchorY = cursor + mic;
      placements.push({
        id: tone.id,
        type: tone.type,
        artwork: null,
        anchorX,
        anchorY,
        width: mic,
        height: mic,
        labelSide: "below",
        labelWidth: Math.min(132, labelW),
        labelHeight: micLabelH,
        labelShiftX: clampCenter(anchorX, Math.min(132, labelW), width) - anchorX,
        step: 0,
      });
      cursor = anchorY + LABEL_GAP + micLabelH + 22;
    }
    index = runEnd;
  }

  const lowest = placements.reduce((max, node) => {
    const rects = placedNodeRects(node);
    return Math.max(max, rects.art.y + rects.art.h, rects.label.y + rects.label.h);
  }, 48);

  return {
    stageWidth: width,
    stageHeight: Math.ceil(lowest + 16),
    imageHeight: 0,
    horizonY: 0,
    placements: placements.map((node, index) => ({ ...node, step: index + 1 })),
  };
}

export function layoutJourneyMap(
  nodes: readonly JourneyMapNode[],
  options: { mode: "desktop" | "mobile"; width: number },
): JourneyMapLayout {
  if (options.mode === "mobile") return layoutMobile(nodes, Math.max(280, options.width));
  return layoutDesktop(nodes);
}

export function layoutIssues(layout: JourneyMapLayout, horizonY: number) {
  const issues: string[] = [];
  const occupied: Array<StageRect & { nodeId: string }> = [];
  for (const node of layout.placements) {
    const rects = placedNodeRects(node);
    for (const rect of [rects.art, rects.label]) {
      if (rect.y < horizonY - 0.5) {
        issues.push(`${node.id} rises above the horizon (${rect.y.toFixed(1)} < ${horizonY})`);
      }
      if (rect.x < -1 || rect.y < -1 || rect.x + rect.w > layout.stageWidth + 1 || rect.y + rect.h > layout.stageHeight + 1) {
        issues.push(`${node.id} is clipped by the stage`);
      }
      for (const other of occupied) {
        if (other.nodeId === node.id) continue;
        if (rectsOverlap(rect, other, 2)) {
          issues.push(`${node.id} overlaps ${other.nodeId}`);
          break;
        }
      }
      occupied.push({ ...rect, nodeId: node.id });
    }
  }
  return issues;
}
