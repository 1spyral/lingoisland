/**
 * Curated diagnostic / progress-check bank.
 * Fixed phonetic coverage so baseline vs remeasure comparisons stay meaningful.
 */

export type DiagnosticTag =
  | "tone1"
  | "tone2"
  | "tone3"
  | "tone4"
  | "tone_combo"
  | "initial_zh_ch_sh"
  | "initial_j_q_x"
  | "initial_z_c_s"
  | "final_an_ang"
  | "bu_yi_sandhi";

export type DiagnosticItem = {
  index: number;
  hanzi: string;
  pinyin: string;
  english: string;
  tags: DiagnosticTag[];
};

/** Human-readable labels for profile breakdown chips. */
export const DIAGNOSTIC_TAG_LABELS: Record<DiagnosticTag, string> = {
  tone1: "1st tone",
  tone2: "2nd tone",
  tone3: "3rd tone",
  tone4: "4th tone",
  tone_combo: "Tone changes",
  initial_zh_ch_sh: "zh / ch / sh",
  initial_j_q_x: "j / q / x",
  initial_z_c_s: "z / c / s",
  final_an_ang: "an vs ang",
  bu_yi_sandhi: "不 / 一 sandhi",
};

/** How to actually practice each diagnostic tag in generated drills. */
export const TAG_PRACTICE_HINTS: Record<DiagnosticTag, string> = {
  tone1: "Include first-tone (high, flat) syllables such as 天, 他, 三, 一 (citation).",
  tone2: "Include second-tone (rising) syllables such as 人, 学, 来, 还.",
  tone3: "Include third-tone (low/dipping) syllables such as 我, 很, 好, 想, 请.",
  tone4: "Include fourth-tone (falling) syllables such as 是, 去, 看, 饭.",
  tone_combo: "Include tone-change pairs, especially 3rd-tone sequences (很好, 可以, 你好) or other sandhi pairs.",
  initial_zh_ch_sh: "Target words with zh / ch / sh initials (中国, 是, 吃, 这, 声).",
  initial_j_q_x: "Target words with j / q / x initials (去, 请, 休息, 小, 学).",
  initial_z_c_s: "Target words with z / c / s initials (坐, 再, 次, 从, 三, 四).",
  final_an_ang: "Contrast -an vs -ang finals (南/方, 饭, 看 vs 帮, 忙).",
  bu_yi_sandhi: "Include 不 or 一 in sandhi contexts (不是, 一个, 一次, 不对, 一杯).",
};

/**
 * Eight controlled sentences covering the tags above.
 * Keep this list stable — remeasure uses the same item_index texts.
 */
export const DIAGNOSTIC_BANK: DiagnosticItem[] = [
  {
    index: 0,
    hanzi: "今天天气很好。",
    pinyin: "Jīntiān tiānqì hěn hǎo.",
    english: "The weather is very nice today.",
    tags: ["tone1", "tone3", "tone_combo"],
  },
  {
    index: 1,
    hanzi: "我想买一杯咖啡。",
    pinyin: "Wǒ xiǎng mǎi yì bēi kāfēi.",
    english: "I'd like to buy a cup of coffee.",
    tags: ["tone3", "bu_yi_sandhi", "tone_combo"],
  },
  {
    index: 2,
    hanzi: "他是不是中国人？",
    pinyin: "Tā shì bu shì Zhōngguó rén?",
    english: "Is he Chinese?",
    tags: ["tone1", "tone4", "initial_zh_ch_sh"],
  },
  {
    index: 3,
    hanzi: "请坐，休息一下。",
    pinyin: "Qǐng zuò, xiūxi yíxià.",
    english: "Please sit and rest a bit.",
    tags: ["initial_j_q_x", "initial_z_c_s", "bu_yi_sandhi"],
  },
  {
    index: 4,
    hanzi: "这个声音很好听。",
    pinyin: "Zhège shēngyīn hěn hǎotīng.",
    english: "This sound is very pleasant.",
    tags: ["initial_zh_ch_sh", "tone1", "tone3"],
  },
  {
    index: 5,
    hanzi: "小李去学校了。",
    pinyin: "Xiǎo Lǐ qù xuéxiào le.",
    english: "Little Li went to school.",
    tags: ["initial_j_q_x", "tone3", "tone4"],
  },
  {
    index: 6,
    hanzi: "南方的饭很好吃。",
    pinyin: "Nánfāng de fàn hěn hǎochī.",
    english: "Southern food is delicious.",
    tags: ["final_an_ang", "tone2", "tone4"],
  },
  {
    index: 7,
    hanzi: "不对，再试一次。",
    pinyin: "Bú duì, zài shì yí cì.",
    english: "That's not right — try once more.",
    tags: ["bu_yi_sandhi", "tone4", "initial_z_c_s"],
  },
];

export const DIAGNOSTIC_ITEM_COUNT = DIAGNOSTIC_BANK.length;

export function diagnosticItemAt(index: number): DiagnosticItem | null {
  return DIAGNOSTIC_BANK.find((item) => item.index === index) ?? null;
}
