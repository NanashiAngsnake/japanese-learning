"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { CheckCircle, XCircle, RotateCcw, Trophy, Volume2, Eye, Languages, Flame, X } from "lucide-react";
import { getScoreLabel, getScoreColor } from "@/lib/srs";
import { matchesAnswer, romajiToKana } from "@/lib/romaji";
import { jlptColor, jlptLabel, cn } from "@/lib/utils";
import Furigana from "@/components/Furigana";
import { Medal } from "@/components/profile/Medal";

interface Example {
  id: string;
  japanese: string;
  cloze: string | null;
  answer: string | null;
  reading: string | null;
  english: string;
  audio: string | null;
}

interface ReviewItem {
  id: string;
  grammarPoint: {
    id: string;
    slug: string;
    title: string;
    meaning: string;
    structure: string | null;
    jlptLevel: number;
    explanation: string;
    examples: Example[];
  };
  repetitions: number;
  totalReviews?: number;
  streak: number;
}

type Phase = "loading" | "idle" | "reviewing" | "done" | "error";

interface EarnedBadge {
  id: string;
  name: string;
  kanji: string;
  description: string;
}
interface ReviewResponse {
  streak?: { current: number; longest: number };
  newBadges?: EarnedBadge[];
}

type ToastBody =
  | { kind: "badge"; badge: EarnedBadge }
  | { kind: "streak"; days: number };
type Toast = ToastBody & { id: number };

const TOAST_MS = 6000;

function parseReviewResponse(data: unknown): ReviewResponse {
  if (typeof data !== "object" || data === null) return {};
  const raw = data as Record<string, unknown>;
  const out: ReviewResponse = {};

  const streak = raw.streak;
  if (typeof streak === "object" && streak !== null) {
    const st = streak as Record<string, unknown>;
    if (typeof st.current === "number" && typeof st.longest === "number") {
      out.streak = { current: st.current, longest: st.longest };
    }
  }

  if (Array.isArray(raw.newBadges)) {
    out.newBadges = raw.newBadges.filter((b): b is EarnedBadge => {
      if (typeof b !== "object" || b === null) return false;
      const badge = b as Record<string, unknown>;
      return (
        typeof badge.id === "string" &&
        typeof badge.name === "string" &&
        typeof badge.kanji === "string" &&
        typeof badge.description === "string"
      );
    });
  }

  return out;
}

function pickExample(item: ReviewItem): Example | null {
  const withCloze = item.grammarPoint.examples.filter((e) => e.cloze && e.answer);
  if (withCloze.length === 0) return null;
  return withCloze[(item.totalReviews ?? 0) % withCloze.length];
}

function AudioButton({ url }: { url: string }) {
  const [playing, setPlaying] = useState(false);
  function play() {
    if (playing) return;
    setPlaying(true);
    const audio = new Audio(url);
    audio.onended = () => setPlaying(false);
    audio.onerror = () => setPlaying(false);
    audio.play().catch(() => setPlaying(false));
  }
  return (
    <button
      onClick={play}
      className={cn(
        "p-2 rounded-lg transition-all",
        playing ? "bg-blue-500/30 text-blue-300" : "text-dim hover:text-blue-400 hover:bg-blue-500/10"
      )}
      title="Écouter"
    >
      <Volume2 size={18} />
    </button>
  );
}

export default function ReviewPage() {
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [current, setCurrent] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [phase, setPhase] = useState<Phase>("loading");
  const [sessionResults, setSessionResults] = useState<{ score: number; title: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [failedScore, setFailedScore] = useState<number | null>(null);
  const [input, setInput] = useState("");
  const [showFuri, setShowFuri] = useState(true);
  const [autoplay, setAutoplay] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastSeq = useRef(0);
  const toastTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const knownStreak = useRef<number | null>(null);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const pushToast = useCallback((body: ToastBody) => {
    const id = ++toastSeq.current;
    setToasts((prev) => [...prev, { ...body, id }]);
    const timer = setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, TOAST_MS);
    toastTimers.current.push(timer);
  }, []);

  useEffect(() => {
    const timers = toastTimers.current;
    return () => { timers.forEach(clearTimeout); };
  }, []);

  useEffect(() => {
    fetch("/api/profile/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: unknown) => {
        if (typeof d !== "object" || d === null) return;
        const streak = (d as Record<string, unknown>).streak;
        if (typeof streak !== "object" || streak === null) return;
        const current = (streak as Record<string, unknown>).current;
        if (typeof current === "number") knownStreak.current = current;
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => (r.ok ? r.json() : null))
      .then((s) => {
        if (typeof s?.showFurigana === "boolean") setShowFuri(s.showFurigana);
        if (typeof s?.autoplayAudio === "boolean") setAutoplay(s.autoplayAudio);
      })
      .catch(() => {});
  }, []);

  const loadReviews = useCallback(async () => {
    setPhase("loading");
    setFailedScore(null);
    try {
      const res = await fetch("/api/review");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: unknown = await res.json();
      if (!Array.isArray(data)) throw new Error("Réponse inattendue");

      setItems(data as ReviewItem[]);
      setCurrent(0);
      setRevealed(false);
      setInput("");
      setSessionResults([]);
      setPhase(data.length === 0 ? "idle" : "reviewing");
    } catch {
      setItems([]);
      setPhase("error");
    }
  }, []);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  useEffect(() => {
    if (phase === "reviewing" && !revealed) inputRef.current?.focus();
  }, [phase, current, revealed]);

  useEffect(() => {
    if (phase !== "reviewing") return;
    function onKey(e: KeyboardEvent) {
      const typingInInput = (e.target as HTMLElement)?.tagName === "INPUT";
      if (!revealed) {
        if (e.key === "Enter" || (e.key === " " && !typingInInput)) {
          e.preventDefault();
          setRevealed(true);
        }
      } else if (e.key >= "0" && e.key <= "5") {
        e.preventDefault();
        submitScore(Number(e.key));
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, revealed, submitting, current]);

  async function submitScore(score: number) {
    if (submitting) return;
    setSubmitting(true);
    setFailedScore(null);

    const item = items[current];
    const res = await fetch("/api/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studyItemId: item.id, score, exampleId: pickExample(item)?.id }),
    }).catch(() => null);

    if (!res || !res.ok) {
      setFailedScore(score);
      setSubmitting(false);
      return;
    }

    const payload = parseReviewResponse(await res.json().catch(() => null));
    payload.newBadges?.forEach((badge) => pushToast({ kind: "badge", badge }));
    if (payload.streak) {
      const previous = knownStreak.current;
      if (previous !== null && payload.streak.current > previous) {
        pushToast({ kind: "streak", days: payload.streak.current });
      }
      knownStreak.current = payload.streak.current;
    }

    setSessionResults((prev) => [...prev, { score, title: item.grammarPoint.title }]);

    const next = current + 1;
    if (next >= items.length) {
      setPhase("done");
    } else {
      setCurrent(next);
      setRevealed(false);
      setInput("");
    }
    setSubmitting(false);
  }

  const progress = items.length > 0 ? (current / items.length) * 100 : 0;

  const toastLayer = toasts.length > 0 && (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 w-[min(20rem,calc(100vw-2.5rem))]">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="surface p-3.5 flex items-start gap-3 animate-fade-up shadow-lg"
          role="status"
        >
          {t.kind === "badge" ? (
            <Medal id={t.badge.id} earned size="md" />
          ) : (
            <div className="w-14 h-14 rounded-full bg-accent/15 border border-accent/25 flex items-center justify-center shrink-0">
              <Flame size={22} className="text-accent" />
            </div>
          )}

          <div className="min-w-0 flex-1">
            {t.kind === "badge" ? (
              <>
                <div className="text-[10px] uppercase tracking-wider text-accent font-semibold">
                  Badge obtenu
                </div>
                <div className="text-sm font-semibold text-fg mt-0.5 truncate">{t.badge.name}</div>
                <div className="text-xs text-dim mt-0.5 leading-snug">{t.badge.description}</div>
              </>
            ) : (
              <>
                <div className="text-[10px] uppercase tracking-wider text-accent font-semibold">
                  Régularité
                </div>
                <div className="text-sm font-semibold text-fg mt-0.5 tnum">
                  Série : {t.days} jours
                </div>
                <div className="text-xs text-dim mt-0.5 leading-snug">
                  Un jour d&apos;étude de plus à la suite.
                </div>
              </>
            )}
          </div>

          <button
            onClick={() => dismissToast(t.id)}
            className="text-dim hover:text-fg transition-colors shrink-0 -mt-0.5"
            title="Fermer"
            aria-label="Fermer la notification"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );

  if (phase === "loading") {
    return (
      <div className="max-w-2xl mx-auto flex items-center justify-center min-h-[60vh]">
        <div className="text-center text-dim">
          <RotateCcw size={32} className="mx-auto mb-3 animate-spin opacity-50" />
          <p>Chargement des révisions...</p>
        </div>
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="max-w-2xl mx-auto flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 rounded-full bg-red-500/15 border border-red-500/25 flex items-center justify-center mx-auto mb-4">
            <XCircle size={38} className="text-red-400" />
          </div>
          <h2 className="text-2xl font-bold text-fg mb-2">Révisions indisponibles</h2>
          <p className="text-dim mb-6">
            Impossible de charger vos cartes. Vérifiez votre connexion et réessayez ;
            si cela persiste, reconnectez-vous.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={loadReviews}
              className="px-6 py-3 bg-accent hover:bg-accent-deep text-white font-semibold rounded-xl transition-all"
            >
              Réessayer
            </button>
            <Link
              href="/dashboard"
              className="px-6 py-3 bg-line/[0.10] hover:bg-line/[0.15] text-fg font-semibold rounded-xl transition-all"
            >
              Tableau de bord
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "idle") {
    return (
      <div className="max-w-2xl mx-auto flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={40} className="text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-fg mb-2">Tout est à jour !</h2>
          <p className="text-dim mb-6">
            Vous n&apos;avez aucune révision en attente pour le moment.
          </p>
          <Link
            href="/dashboard/grammar"
            className="px-6 py-3 bg-accent hover:bg-accent-deep text-white font-semibold rounded-xl transition-all"
          >
            Apprendre de nouveaux points
          </Link>
        </div>
      </div>
    );
  }

  if (phase === "done") {
    const avgScore = sessionResults.reduce((s, r) => s + r.score, 0) / sessionResults.length;
    const passed = sessionResults.filter((r) => r.score >= 3).length;

    return (
      <>
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-full bg-yellow-500/20 flex items-center justify-center mx-auto mb-4">
            <Trophy size={40} className="text-yellow-400" />
          </div>
          <h2 className="text-2xl font-bold text-fg mb-1">Session terminée !</h2>
          <p className="text-dim">{sessionResults.length} révisions complétées</p>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: "Révisées", value: sessionResults.length, color: "text-blue-400" },
            { label: "Réussies", value: passed, color: "text-green-400" },
            { label: "Score moyen", value: avgScore.toFixed(1) + "/5", color: "text-yellow-400" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-surface rounded-xl p-4 border border-line/[0.08] text-center">
              <div className={cn("text-2xl font-bold", color)}>{value}</div>
              <div className="text-dim text-xs mt-0.5">{label}</div>
            </div>
          ))}
        </div>

        <div className="bg-surface rounded-xl p-4 border border-line/[0.08] mb-6">
          <div className="text-sm font-medium text-muted mb-3">Détail de la session</div>
          <div className="space-y-2">
            {sessionResults.map((r, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <div className={cn("w-6 h-6 rounded-full flex items-center justify-center",
                  r.score >= 3 ? "bg-green-500/20" : "bg-red-500/20"
                )}>
                  {r.score >= 3
                    ? <CheckCircle size={12} className="text-green-400" />
                    : <XCircle size={12} className="text-red-400" />
                  }
                </div>
                <span className="text-fg japanese flex-1">{r.title}</span>
                <span className={cn("font-medium text-xs", getScoreColor(r.score))}>
                  {getScoreLabel(r.score)} ({r.score}/5)
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={loadReviews}
            className="flex-1 py-3 bg-accent hover:bg-accent-deep text-white font-semibold rounded-xl transition-all"
          >
            Nouvelle session
          </button>
          <Link
            href="/dashboard"
            className="flex-1 py-3 bg-line/[0.10] hover:bg-line/[0.15] text-fg font-semibold rounded-xl text-center transition-all"
          >
            Tableau de bord
          </Link>
        </div>
      </div>
      {toastLayer}
      </>
    );
  }

  const item = items[current];
  const gp = item.grammarPoint;
  const ex = pickExample(item);

  const isCorrect = ex?.answer ? matchesAnswer(input, ex.answer, ex.japanese) : false;

  const kanaPreview = (() => {
    if (!input.trim()) return null;
    const kana = romajiToKana(input);
    return kana && kana !== input.trim() ? kana : null;
  })();

  function reveal() {
    if (revealed) return;
    setRevealed(true);
    if (autoplay && ex?.audio) {
      try {
        new Audio(ex.audio).play().catch(() => {});
      } catch {  }
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") reveal();
  }

  const parts = ex?.cloze ? ex.cloze.split("____") : null;

  return (
    <>
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 h-2 bg-line/[0.05] rounded-full overflow-hidden">
          <div
            className="h-full bg-accent rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-dim text-sm whitespace-nowrap">
          {current + 1} / {items.length}
        </span>
      </div>

      <div className="bg-surface rounded-2xl border border-line/[0.08] overflow-hidden mb-4">
        <div className="flex items-center justify-between px-6 pt-5">
          <div className="flex items-center gap-2">
            <span className={cn("text-xs px-2.5 py-1 rounded-md border font-medium", jlptColor(gp.jlptLevel))}>
              {jlptLabel(gp.jlptLevel)}
            </span>
            {item.streak > 0 && (
              <span className="text-xs text-accent bg-accent/10 px-2 py-1 rounded-md tnum">
                🔥 {item.streak}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowFuri((v) => !v)}
              title={showFuri ? "Masquer les furigana" : "Afficher les furigana"}
              className={cn(
                "p-1.5 rounded-lg transition-all",
                showFuri ? "text-blue-400 bg-blue-500/10" : "text-dim hover:text-fg hover:bg-line/[0.05]"
              )}
            >
              <Languages size={15} />
            </button>
            <Link
              href={`/dashboard/grammar/${gp.slug}`}
              className="text-xs text-dim hover:text-fg transition-colors max-w-[180px] truncate"
              title="Voir le point de grammaire"
            >
              {gp.meaning}
            </Link>
          </div>
        </div>

        {parts ? (
          <>
            <div className="px-6 py-8 border-b border-line/[0.08]">
              <div className="text-xs text-dim uppercase tracking-wider mb-3 text-center">
                Complétez la phrase
              </div>
              <div className="text-3xl font-semibold text-fg japanese leading-loose text-center flex flex-wrap items-center justify-center gap-x-1 gap-y-2">
                <Furigana text={parts[0]} show={showFuri} />
                {revealed ? (
                  <span className="px-2 rounded-md font-bold text-green-400 bg-green-500/15">
                    <Furigana text={ex!.answer ?? ""} show={showFuri} />
                  </span>
                ) : (
                  <span className="inline-block min-w-[3ch] border-b-2 border-dashed border-accent/60 mx-1">&nbsp;</span>
                )}
                <Furigana text={parts.slice(1).join("____")} show={showFuri} />
              </div>

              <div className="text-muted text-sm text-center mt-4">{ex!.english}</div>

              {!revealed && (
                <div className="mt-6 max-w-sm mx-auto">
                  <input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={onKeyDown}
                    placeholder="Tapez la réponse (kana ou rōmaji)…"
                    className="w-full bg-line/[0.05] border border-line/[0.15] rounded-xl px-4 py-3 text-fg japanese text-lg text-center placeholder-dim focus:outline-none focus:border-accent/60"
                  />

                  {kanaPreview && (
                    <div className="mt-2 text-center text-sm text-dim">
                      <span className="japanese text-accent text-base">{kanaPreview}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {revealed && (
              <div className="p-6 space-y-4">
                {input && (
                  <div className={cn(
                    "flex items-center justify-center gap-2 text-sm font-medium",
                    isCorrect ? "text-green-400" : "text-red-400"
                  )}>
                    {isCorrect ? <CheckCircle size={16} /> : <XCircle size={16} />}
                    {isCorrect ? "Correct !" : <span>Votre réponse : <span className="japanese">{input}</span></span>}
                  </div>
                )}

                <div className="bg-line/[0.05] rounded-xl p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-fg japanese text-lg leading-loose flex-1">
                      <Furigana text={ex!.japanese} show={showFuri} />
                    </div>
                    {ex!.audio && <AudioButton url={ex!.audio} />}
                  </div>
                  <div className="text-muted text-sm mt-1">{ex!.english}</div>
                </div>

                {gp.structure && (
                  <div className="text-center">
                    <span className="text-xs text-dim uppercase tracking-wider">Structure : </span>
                    <span className="text-muted text-sm font-mono japanese">{gp.structure}</span>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="px-6 py-10 text-center border-b border-line/[0.08]">
            <h2 className="text-5xl font-bold text-fg japanese mb-3">{gp.title}</h2>
            {gp.structure && <div className="text-dim text-sm font-mono mt-2">{gp.structure}</div>}
            {revealed && (
              <div className="mt-6 text-left bg-line/[0.05] rounded-xl p-4">
                <div className="text-fg text-lg font-medium">{gp.meaning}</div>
                <div className="text-muted text-sm mt-2 line-clamp-3">{gp.explanation}</div>
              </div>
            )}
          </div>
        )}
      </div>

      {!revealed ? (
        <button
          onClick={reveal}
          className="w-full py-4 bg-line/[0.10] hover:bg-line/[0.15] text-fg font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
        >
          <Eye size={20} />
          Vérifier la réponse
          <kbd className="ml-1 text-xs text-dim border border-line/[0.15] rounded px-1.5 py-0.5">Espace</kbd>
        </button>
      ) : (
        <div className="space-y-3">
          {failedScore !== null && (
            <div
              role="alert"
              className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <div className="text-sm font-medium text-red-300">
                  Réponse non enregistrée — vérifiez votre connexion
                </div>
                <div className="text-xs text-dim mt-0.5">
                  Votre note ({failedScore}/5) n&apos;a pas été prise en compte : la carte reste à réviser.
                </div>
              </div>
              <button
                onClick={() => submitScore(failedScore)}
                disabled={submitting}
                className="btn btn-ghost shrink-0 disabled:opacity-50"
              >
                <RotateCcw size={14} className={cn(submitting && "animate-spin")} />
                Réessayer
              </button>
            </div>
          )}

          <div className="text-center text-dim text-sm mb-2">
            Comment ça s&apos;est passé ? <span className="text-dim">— touches 0–5</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { score: 0, label: "Oubli total", color: "bg-red-900/50 hover:bg-red-800/50 border-red-700/50 text-red-300" },
              { score: 1, label: "Très dur", color: "bg-red-800/40 hover:bg-red-700/40 border-red-600/40 text-red-300" },
              { score: 2, label: "Difficile", color: "bg-orange-800/40 hover:bg-orange-700/40 border-orange-600/40 text-orange-300" },
            ].map(({ score, label, color }) => (
              <button
                key={score}
                onClick={() => submitScore(score)}
                disabled={submitting}
                className={cn("py-3 rounded-xl border text-sm font-medium transition-all disabled:opacity-50", color)}
              >
                <XCircle size={16} className="mx-auto mb-1" />
                {label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { score: 3, label: "Correct", color: "bg-yellow-800/40 hover:bg-yellow-700/40 border-yellow-600/40 text-yellow-300" },
              { score: 4, label: "Facile", color: "bg-green-800/40 hover:bg-green-700/40 border-green-600/40 text-green-300" },
              { score: 5, label: "Parfait !", color: "bg-green-700/50 hover:bg-green-600/50 border-green-500/50 text-green-200" },
            ].map(({ score, label, color }) => (
              <button
                key={score}
                onClick={() => submitScore(score)}
                disabled={submitting}
                className={cn("py-3 rounded-xl border text-sm font-medium transition-all disabled:opacity-50", color)}
              >
                <CheckCircle size={16} className="mx-auto mb-1" />
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
    {toastLayer}
    </>
  );
}
