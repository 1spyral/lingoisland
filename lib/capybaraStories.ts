export const CAPYBARA_STORIES = [
  "cafe.jpg",
  "temple-walk.jpg",
  "rain.jpg",
  "concert.jpg",
  "dumplings.jpg",
  "market.jpg",
  "sketching.jpg",
  "train.jpg",
  "sunset.jpg",
  "chat.jpg",
] as const;

export function capybaraStorySrc(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash + seed.charCodeAt(i)) % CAPYBARA_STORIES.length;
  }
  return `/capybara-stories/${CAPYBARA_STORIES[hash]}`;
}
