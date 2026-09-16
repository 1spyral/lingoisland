"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, MoreHorizontal, Target } from "lucide-react";
import { scoreTier, type WeakSoundRow } from "@/lib/pronunciation/weakSoundTypes";
import { guideForTone, primaryGuide, weakSoundLabel } from "@/lib/pronunciation/soundGuides";
import { toneGlyph } from "@/lib/pronunciation/encouragement";

type Bucket = "needs" | "improving" | "mastered";
type Filter = "all" | Bucket;

const PAGE_SIZE = 10;

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "needs", label: "Needs attention" },
  { id: "improving", label: "Improving" },
  { id: "mastered", label: "Mastered" },
];

function bucketFor(row: WeakSoundRow): Bucket {
  if (row.status === "mastered") return "mastered";
  if (row.consecutive_good >= 1) return "improving";
  return "needs";
}

function recentTime(iso: string) {
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : 0;
}

export default function WeakSoundsReviewPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<WeakSoundRow[]>([]);
  const [updating, setUpdating] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/pronunciation/weak-sounds?status=all&order=recent&limit=200", {
      cache: "no-store",
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data) {
      setError(typeof data?.error === "string" ? data.error : "Couldn't load your sounds.");
      setRows([]);
    } else {
      setRows(data.weakSounds ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
    setMenuOpen(null);
  }, [filter]);

  const filtered = useMemo(() => {
    const sorted = [...rows].sort((a, b) => recentTime(b.last_seen_at) - recentTime(a.last_seen_at));
    if (filter === "all") return sorted;
    return sorted.filter((row) => bucketFor(row) === filter);
  }, [rows, filter]);

  const visible = filtered.slice(0, visibleCount);
  const hiddenCount = Math.max(0, filtered.length - visible.length);
  const activeCount = rows.filter((row) => row.status === "active").length;

  const setStatus = async (id: string, status: "active" | "mastered") => {
    setUpdating(id);
    setMenuOpen(null);
    await fetch(`/api/pronunciation/weak-sounds/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    }).catch(() => {});
    await load();
    setUpdating(null);
  };

  const startFocus = async (ids?: string[]) => {
    setStarting(true);
    setError(null);
    try {
      const res = await fetch("/api/pronunciation/session/focus", {
        method: "POST",
        ...(ids
          ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify({ weakSoundIds: ids }) }
          : {}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.sessionId) {
        throw new Error(typeof data?.error === "string" ? data.error : "Unable to start practice.");
      }
      router.push(`/app/pronunciation/session/${data.sessionId}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to start practice.");
      setStarting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-6">
      <Link
        href="/app/pronunciation"
        className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--lingo-text-muted)] hover:text-[var(--lingo-navy)]"
      >
        <ArrowLeft size={13} /> Pronunciation
      </Link>

      <div className="relative mb-6 h-44 overflow-hidden rounded-[28px] sm:h-52">
        <Image
          src="/animation-photos/pronunciation-weak-spots.png"
          alt=""
          fill
          priority
          sizes="(max-width: 768px) 100vw, 768px"
          className="object-cover object-[center_42%]"
        />
      </div>

      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--lingo-blue)]">Your sounds</p>
          <h1 className="lingo-display mt-1 text-3xl font-bold text-[var(--lingo-navy)]">Sounds we&apos;re working on</h1>
          <p className="mt-1.5 max-w-md text-sm text-[var(--lingo-text-muted)]">
            These are the patterns we&apos;ve noticed while you practice — temporary, and fixable.
          </p>
        </div>
        {activeCount > 0 && (
          <button
            type="button"
            onClick={() => void startFocus()}
            disabled={starting}
            className="inline-flex items-center gap-1.5 rounded-2xl bg-[var(--lingo-navy)] px-4 py-2.5 text-xs font-bold text-white disabled:opacity-60"
          >
            <Target size={13} />
            {starting ? "Preparing…" : "Practice my weak sounds"}
          </button>
        )}
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {loading ? (
        <div className="flex min-h-[30vh] items-center justify-center text-[var(--lingo-text-muted)]">Loading…</div>
      ) : rows.length === 0 ? (
        <div
          className="flex flex-col items-center rounded-[28px] border bg-white px-6 py-12 text-center"
          style={{ borderColor: "var(--lingo-border)" }}
        >
          <p className="max-w-sm text-sm text-[var(--lingo-text-muted)]">
            Nothing flagged yet. Keep practicing — anything you consistently miss will show up here.
          </p>
          <Link
            href="/app/pronunciation"
            className="mt-5 rounded-2xl px-4 py-2.5 text-sm font-bold text-white"
            style={{ background: "var(--lingo-accent-gradient)" }}
          >
            Back to practice
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map((option) => {
              const selected = filter === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setFilter(option.id)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                    selected
                      ? "bg-[var(--lingo-navy)] text-white"
                      : "border border-[var(--lingo-accent-border)] bg-white text-[var(--lingo-navy)] hover:bg-[var(--lingo-sky-pale)]"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>

          {filtered.length === 0 ? (
            <p className="rounded-[22px] border bg-white px-5 py-8 text-center text-sm text-[var(--lingo-text-muted)]" style={{ borderColor: "var(--lingo-border)" }}>
              Nothing in this filter yet.
            </p>
          ) : (
            <>
              <p className="text-xs font-semibold text-[var(--lingo-text-muted)]">
                Showing {visible.length} of {filtered.length} most recent
              </p>
              <div className="flex flex-col gap-3">
                {visible.map((w) => {
                  const bucket = bucketFor(w);
                  const tier = scoreTier(w.last_score);
                  const guide = primaryGuide({ tone: w.target_tone, pinyin: w.pinyin });
                  const toneTitle = guideForTone(w.target_tone)?.title;
                  return (
                    <div
                      key={w.id}
                      className="relative rounded-[22px] border bg-white p-4 sm:p-5"
                      style={{ borderColor: "var(--lingo-border)", boxShadow: "var(--lingo-shadow-card)" }}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span
                            className="lingo-display flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl text-lg"
                            style={{ background: tier.bg, color: tier.text, border: `1px solid ${tier.border}` }}
                          >
                            {w.syllable}
                          </span>
                          <div>
                            <p className="text-sm font-bold text-[var(--lingo-navy)]">
                              {weakSoundLabel(w.syllable, w.pinyin, w.target_tone)}
                            </p>
                            <p className="text-xs text-[var(--lingo-text-muted)]">
                              {toneTitle ? `${toneTitle} · ` : ""}
                              {w.pinyin ?? w.syllable} {toneGlyph(w.target_tone)}
                              {bucket === "improving" ? " · Improving" : bucket === "mastered" ? " · Mastered" : ""}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {bucket !== "mastered" && (
                            <>
                              <Link
                                href={`/app/pronunciation/deep-dive/${w.id}?from=/app/pronunciation/review`}
                                className="rounded-xl border border-[var(--lingo-accent-border)] bg-white px-3 py-2 text-xs font-bold text-[var(--lingo-navy)]"
                              >
                                Deep dive
                              </Link>
                              <button
                                type="button"
                                disabled={starting}
                                onClick={() => void startFocus([w.id])}
                                className="rounded-xl bg-[var(--lingo-navy)] px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                              >
                                Practice →
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => setMenuOpen((v) => (v === w.id ? null : w.id))}
                            className="rounded-xl border border-[var(--lingo-accent-border)] p-2 text-[var(--lingo-text-muted)]"
                          >
                            <MoreHorizontal size={14} />
                          </button>
                        </div>
                      </div>
                      <p className="mt-3 text-sm text-[var(--lingo-text)]">
                        {guide?.shortTip ?? "We'll keep an eye on this sound in your practice."}
                      </p>
                      <p className="mt-2 text-xs text-[var(--lingo-text-muted)]">
                        {w.consecutive_good > 0
                          ? `${w.consecutive_good} good attempt${w.consecutive_good === 1 ? "" : "s"} in a row`
                          : `Missed ${w.times_wrong} of ${w.times_seen}`}
                        {w.last_score != null ? ` · last score ${Math.round(w.last_score)}` : ""}
                      </p>
                      {w.example_sentence && (
                        <div className="mt-3 rounded-2xl p-3" style={{ background: "var(--lingo-sky-pale)" }}>
                          <p className="text-sm font-semibold text-[var(--lingo-navy)]">{w.example_sentence}</p>
                          {(w.example_sentence_pinyin || w.example_sentence_english) && (
                            <p className="mt-1 text-xs text-[var(--lingo-text-muted)]">
                              {[w.example_sentence_pinyin, w.example_sentence_english].filter(Boolean).join(" · ")}
                            </p>
                          )}
                        </div>
                      )}
                      {menuOpen === w.id && (
                        <div
                          className="absolute right-4 top-14 z-10 min-w-[160px] rounded-xl border bg-white p-1 shadow-lg"
                          style={{ borderColor: "var(--lingo-border)" }}
                        >
                          <button
                            type="button"
                            disabled={updating === w.id}
                            onClick={() => void setStatus(w.id, bucket === "mastered" ? "active" : "mastered")}
                            className="w-full rounded-lg px-3 py-2 text-left text-xs font-bold text-[var(--lingo-navy)] hover:bg-[var(--lingo-sky-pale)]"
                          >
                            {bucket === "mastered" ? "Move back to active" : "Mark mastered"}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {hiddenCount > 0 && (
                <button
                  type="button"
                  onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
                  className="mx-auto rounded-2xl border border-[var(--lingo-accent-border)] bg-white px-4 py-2.5 text-xs font-bold text-[var(--lingo-navy)] hover:bg-[var(--lingo-sky-pale)]"
                >
                  Show {Math.min(PAGE_SIZE, hiddenCount)} more
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
