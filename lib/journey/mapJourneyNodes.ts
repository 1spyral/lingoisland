export type JourneyNodeType = "island" | "story" | "tone_practice";

export function resolveJourneyNodeType(
  row: { node_type?: string | null },
  stepOrder: number,
): JourneyNodeType {
  const stored = row.node_type;
  if (stored === "tone_practice" || stored === "story" || stored === "island") {
    return stored;
  }
  if (stepOrder >= 200) return "tone_practice";
  if (stepOrder > 100) return "story";
  return "island";
}

export function mapJourneyIslandRow<T extends { node_type?: string | null; step_order?: number | null; position?: number | null }>(
  row: T,
) {
  const stepOrder = Number(row.step_order ?? 0);
  const nodeType = resolveJourneyNodeType(row, stepOrder);

  // Use stored position only when it's a valid path position (< 100).
  // Old rows were backfilled with position = step_order, giving 102/105 for stories.
  const storedPosition = row.position != null ? Number(row.position) : null;
  let position: number;
  if (storedPosition != null && storedPosition < 100) {
    position = storedPosition;
  } else if (nodeType === "tone_practice") {
    const toneMap: Record<number, number> = { 201: 2, 202: 5, 203: 7, 204: 9 };
    position = toneMap[stepOrder] ?? stepOrder;
  } else if (nodeType === "story") {
    position = stepOrder === 102 ? 3 : 7;
  } else {
    const map: Record<number, number> = { 1: 1, 2: 2, 3: 4, 4: 5, 5: 6 };
    position = map[stepOrder] ?? stepOrder;
  }

  return { ...row, order: stepOrder, node_type: nodeType, position };
}
