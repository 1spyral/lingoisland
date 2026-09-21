export const CAPYBARA_ISLANDS = [
  "airport.png",
  "beach.png",
  "temple.png",
  "shopping.png",
  "hiking.png",
  "city.png",
  "cafe.png",
  "cottage.png",
  "market.png",
  "school.png",
] as const;

const CATEGORY_ART: Record<string, readonly string[]> = {
  "Everyday errands": ["shopping.png", "cottage.png", "market.png"],
  Travel: ["airport.png", "beach.png", "hiking.png"],
  Health: ["hiking.png", "beach.png"],
  "Food & going out": ["cafe.png", "market.png"],
  "Social life": ["cottage.png", "cafe.png", "beach.png"],
  "Work/School": ["school.png", "city.png"],
  "Money & adulting": ["shopping.png", "city.png"],
  "Entertainment & hobbies": ["beach.png", "temple.png", "cafe.png"],
  "Opinions & hot takes": ["temple.png", "city.png"],
  "Unexpected problems": ["hiking.png", "airport.png"],
};

function pickFrom(pool: readonly string[], seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash + seed.charCodeAt(i)) % pool.length;
  }
  return `/capybara-islands/${pool[hash]}`;
}

export function capybaraIslandSrc(seed: string): string {
  return pickFrom(CAPYBARA_ISLANDS, seed);
}

export function capybaraIslandSrcForTopic(id: string, category?: string): string {
  return pickFrom(CATEGORY_ART[category ?? ""] ?? CAPYBARA_ISLANDS, id);
}
