import { convert, pinyin } from "pinyin-pro";

/**
 * Mandarin third-tone sandhi: in a run of consecutive 3rd tones, every
 * syllable except the last becomes 2nd tone. Neutral/non-tone entries (null)
 * break the run — same textbook rule used by most teaching tools.
 */
export function applyThirdToneSandhi(tones: Array<number | null>): Array<number | null> {
  const result = tones.slice();
  let i = 0;
  while (i < result.length) {
    if (result[i] !== 3) {
      i += 1;
      continue;
    }
    let end = i;
    while (end < result.length && result[end] === 3) end += 1;
    for (let k = i; k < end - 1; k += 1) result[k] = 2;
    i = end;
  }
  return result;
}

function parseNumberedSyllable(token: string): { bare: string; tone: number } | null {
  const match = token.trim().match(/^([a-züv:]+)([0-5])$/i);
  if (!match) return null;
  return { bare: match[1].toLowerCase(), tone: Number(match[2]) };
}

/**
 * Spoken/surface pinyin for a Hanzi string.
 * Uses pinyin-pro for 不/一 sandhi, then applies third-tone sandhi.
 */
export function surfacePinyinForText(
  hanzi: string,
  { compact = false }: { compact?: boolean } = {},
): string {
  const text = hanzi.trim();
  if (!text) return "";

  const tokens = pinyin(text, {
    toneType: "num",
    type: "array",
    toneSandhi: true,
    nonZh: "consecutive",
  });

  if (!Array.isArray(tokens) || tokens.length === 0) return "";

  const parsed = tokens.map((token) => {
    if (typeof token !== "string") return { kind: "other" as const, text: String(token) };
    const syllable = parseNumberedSyllable(token);
    if (!syllable) return { kind: "other" as const, text: token };
    return { kind: "syllable" as const, bare: syllable.bare, tone: syllable.tone };
  });

  const citationTones = parsed.map((part) =>
    part.kind === "syllable" && part.tone >= 1 && part.tone <= 4 ? part.tone : null,
  );
  const spokenTones = applyThirdToneSandhi(citationTones);

  const pieces: Array<{ kind: "syl" | "other"; text: string }> = parsed.map((part, index) => {
    if (part.kind !== "syllable") return { kind: "other", text: part.text };
    const tone = spokenTones[index] ?? part.tone;
    if (tone === 0 || tone === 5) {
      return { kind: "syl", text: part.bare.replace(/v/g, "ü") };
    }
    const marked = convert(`${part.bare}${tone}`);
    return { kind: "syl", text: typeof marked === "string" ? marked : part.bare };
  });

  if (compact) {
    return pieces.map((piece) => piece.text).join("");
  }

  let out = "";
  for (const piece of pieces) {
    if (piece.kind === "other") {
      out += piece.text;
      continue;
    }
    if (out && !/[\s([{“‘]$/.test(out)) out += " ";
    out += piece.text;
  }

  // Match typical sentence-pinyin style: capitalize the first letter.
  return out.replace(/[a-zA-Zà-üÀ-Ü]/, (ch) => ch.toUpperCase());
}

export function withSurfaceDrillPinyin<
  T extends {
    wordHanzi: string;
    wordPinyin: string;
    sentenceHanzi: string;
    sentencePinyin: string;
  },
>(item: T): T {
  return {
    ...item,
    wordPinyin: surfacePinyinForText(item.wordHanzi, { compact: true }) || item.wordPinyin,
    sentencePinyin: surfacePinyinForText(item.sentenceHanzi) || item.sentencePinyin,
  };
}
