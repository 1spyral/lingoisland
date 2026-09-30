export function toJourneyUserError(raw: unknown, fallback: string) {
  if (typeof raw !== "string" || !raw.trim()) return fallback;
  if (/deepseek|no content in/i.test(raw)) {
    console.warn("[journey]", raw);
    return fallback;
  }
  return raw;
}
