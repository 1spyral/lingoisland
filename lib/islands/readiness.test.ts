import { getIslandReadiness } from "./readiness";

const words = [{ id: "first" }, { id: "second" }];
const completeSentences = [
  { word_id: "first", tier: "easy" },
  { word_id: "first", tier: "same" },
  { word_id: "first", tier: "hard" },
  { word_id: "second", tier: "easy" },
  { word_id: "second", tier: "same" },
  { word_id: "second", tier: "hard" },
];

describe("getIslandReadiness", () => {
  it("marks an island ready only when each saved word has every sentence tier", () => {
    expect(getIslandReadiness(words, completeSentences, 2)).toEqual({
      learnReady: true,
      incompleteWordIds: [],
      completedSentenceCount: 6,
      requiredSentenceCount: 6,
    });
  });

  it("does not let duplicate or unrelated sentences hide a missing tier", () => {
    const sentences = [
      ...completeSentences.filter(
        (sentence) => !(sentence.word_id === "second" && sentence.tier === "hard"),
      ),
      { word_id: "first", tier: "easy" },
      { word_id: "other", tier: "hard" },
    ];

    expect(getIslandReadiness(words, sentences, 2)).toEqual({
      learnReady: false,
      incompleteWordIds: ["second"],
      completedSentenceCount: 5,
      requiredSentenceCount: 6,
    });
  });

  it("keeps an island unready until the target number of words is saved", () => {
    expect(getIslandReadiness(words.slice(0, 1), completeSentences, 2)).toEqual({
      learnReady: false,
      incompleteWordIds: [],
      completedSentenceCount: 3,
      requiredSentenceCount: 6,
    });
  });
});
