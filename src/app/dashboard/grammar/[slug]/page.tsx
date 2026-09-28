"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Plus, CheckCircle, BookOpen, AlertCircle, Info,
  Zap, ChevronRight, Languages, Lock, Sparkles, PenLine,
} from "lucide-react";
import { jlptColor, jlptLabel, cn } from "@/lib/utils";
import { formatNextReview, getStage } from "@/lib/srs";
import Furigana from "@/components/Furigana";

interface RelatedPoint {
  slug: string;
  title: string;
  meaning: string;
  level: number;
  kind: "proche" | "contraste";
}

interface Example {
  id: string;
  japanese: string;
  reading?: string;
  english: string;
  audio?: string;
  order: number;
  source?: string;
  verified?: boolean;
}

interface GrammarDetail {
  id: string;
  title: string;
  meaning: string;
  structure?: string;
  jlptLevel: number;
  lesson?: number;
  explanation: string;
  caution?: string;
  nuance?: string;
  partOfSpeech?: string;
  wordType?: string;
  register?: string;
  relatedGrammar?: string;
  locked?: boolean;
  ownWriteup?: boolean;
  exampleCount?: number;
  examples: Example[];
  studyItem: {
    id: string;
    repetitions: number;
    interval: number;
    nextReview: string;
    streak: number;
    easeFactor: number;
    lapsed?: boolean;
  } | null;
}

export default function GrammarDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const [point, setPoint] = useState<GrammarDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [showFuri, setShowFuri] = useState(true);

  useEffect(() => {
    fetch(`/api/grammar/${slug}`)
      .then((r) => r.json())
      .then((d) => { setPoint(d); setLoading(false); });
    fetch("/api/settings")
      .then((r) => r.json())
      .then((s) => { if (typeof s?.showFurigana === "boolean") setShowFuri(s.showFurigana); })
      .catch(() => {});
  }, [slug]);

  async function addToStudy() {
    if (!point) return;
    setAdding(true);
    await fetch("/api/study", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ grammarPointId: point.id }),
    });
    const res = await fetch(`/api/grammar/${slug}`);
    setPoint(await res.json());
    setAdding(false);
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-4 animate-pulse">
        <div className="h-6 bg-line/[0.05] rounded w-32" />
        <div className="h-40 bg-surface rounded-2xl" />
        <div className="h-24 bg-surface rounded-2xl" />
      </div>
    );
  }

  if (!point) {
    return <div className="text-center py-16 text-dim">Point de grammaire introuvable</div>;
  }

  if (point.locked) {
    return (
      <div className="max-w-3xl mx-auto">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-dim hover:text-fg transition-colors mb-6 text-sm"
        >
          <ArrowLeft size={16} /> Retour à la liste
        </button>

        <div className="bg-surface rounded-2xl p-6 border border-line/[0.08] mb-4">
          <div className="flex items-center gap-2 flex-wrap mb-4">
            <span className={cn("text-xs px-2.5 py-1 rounded-md border font-medium", jlptColor(point.jlptLevel))}>
              {jlptLabel(point.jlptLevel)}
            </span>
            {point.lesson && (
              <span className="text-xs text-dim bg-line/[0.05] px-2.5 py-1 rounded-md">Leçon {point.lesson}</span>
            )}
            {point.partOfSpeech && (
              <span className="text-xs text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-md border border-blue-500/20">
                {point.partOfSpeech}
              </span>
            )}
          </div>
          <h1 className="text-5xl font-bold text-fg japanese mb-3 leading-tight">{point.title}</h1>
          <p className="text-muted text-lg">{point.meaning}</p>
        </div>

        <div className="bg-gradient-to-br from-accent/15 to-surface rounded-2xl p-8 border border-accent/30 text-center">
          <div className="w-16 h-16 rounded-2xl bg-accent/20 border border-accent/40 flex items-center justify-center mx-auto mb-4">
            <Lock size={28} className="text-accent" />
          </div>
          <h2 className="text-2xl font-bold text-fg mb-2">Point de grammaire Pro</h2>
          <p className="text-muted max-w-md mx-auto mb-6">
            Ce point fait partie de l&apos;abonnement Pro. Débloquez son explication complète,
            ses exemples audio et les révisions — ainsi que les 950+ autres points.
          </p>
          <ul className="text-sm text-muted space-y-2 max-w-xs mx-auto mb-6 text-left">
            <li className="flex items-center gap-2"><CheckCircle size={15} className="text-green-400 shrink-0" /> Explication détaillée complète</li>
            <li className="flex items-center gap-2"><CheckCircle size={15} className="text-green-400 shrink-0" /> {point.exampleCount ?? "Tous les"} exemples avec audio</li>
            <li className="flex items-center gap-2"><CheckCircle size={15} className="text-green-400 shrink-0" /> Révisions SRS illimitées</li>
          </ul>
          <Link
            href="/dashboard/pricing"
            className="inline-flex items-center gap-2 px-6 py-3 bg-accent hover:bg-accent-deep text-white font-semibold rounded-xl transition-all glow-red"
          >
            <Sparkles size={18} /> Passer à Pro
          </Link>
        </div>
      </div>
    );
  }

  let relatedList: RelatedPoint[] = [];
  if (point.relatedGrammar) {
    try { relatedList = JSON.parse(point.relatedGrammar); } catch {  }
  }

  const sortedExamples = [...point.examples].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const originalExamples = sortedExamples.filter((e) => e.source === "original");
  const originalsPending = originalExamples.some((e) => e.verified === false);

  return (
    <div className="max-w-3xl mx-auto">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-dim hover:text-fg transition-colors mb-6 text-sm"
      >
        <ArrowLeft size={16} /> Retour à la liste
      </button>

      <div className="bg-surface rounded-2xl p-6 border border-line/[0.08] mb-4">
        <div className="flex items-start justify-between mb-4 gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn("text-xs px-2.5 py-1 rounded-md border font-medium", jlptColor(point.jlptLevel))}>
              {jlptLabel(point.jlptLevel)}
            </span>
            {point.lesson && (
              <span className="text-xs text-dim bg-line/[0.05] px-2.5 py-1 rounded-md">
                Leçon {point.lesson}
              </span>
            )}
            {point.partOfSpeech && (
              <span className="text-xs text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-md border border-blue-500/20">
                {point.partOfSpeech}
              </span>
            )}
            {point.register && (
              <span className="text-xs text-purple-400 bg-purple-500/10 px-2.5 py-1 rounded-md border border-purple-500/20">
                {point.register}
              </span>
            )}
            {point.wordType && (
              <span className="text-xs text-muted bg-line/[0.05] px-2.5 py-1 rounded-md border border-line/[0.10]">
                {point.wordType}
              </span>
            )}
          </div>
          {!point.studyItem ? (
            <button
              onClick={addToStudy}
              disabled={adding}
              className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-deep disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-all shrink-0"
            >
              <Plus size={16} />
              {adding ? "Ajout..." : "Étudier"}
            </button>
          ) : (
            <div className="flex items-center gap-2 shrink-0">
              <span className={cn("chip text-xs px-2.5 py-1", getStage(point.studyItem).className)}>
                {getStage(point.studyItem).label}
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-line/[0.05] border border-line/[0.10] text-muted text-xs rounded-xl">
                <CheckCircle size={13} className="text-green-400" />
                {formatNextReview(new Date(point.studyItem.nextReview))}
              </span>
            </div>
          )}
        </div>

        <h1 className="text-5xl font-bold text-fg japanese mb-3 leading-tight">{point.title}</h1>
        <p className="text-muted text-lg">{point.meaning}</p>

        {point.structure && (
          <div className="mt-4 p-3.5 bg-line/[0.05] rounded-xl border border-line/[0.08]">
            <div className="text-xs text-dim uppercase tracking-wider mb-1.5">Structure</div>
            <div className="text-fg font-mono japanese text-sm">{point.structure}</div>
          </div>
        )}
      </div>

      {point.studyItem && (
        <div className="grid grid-cols-4 gap-3 mb-4">
          {[
            { label: "Répétitions", value: point.studyItem.repetitions },
            { label: "Intervalle", value: `${point.studyItem.interval}j` },
            { label: "Série", value: `🔥 ${point.studyItem.streak}` },
            { label: "Facilité", value: point.studyItem.easeFactor.toFixed(2) },
          ].map(({ label, value }) => (
            <div key={label} className="bg-surface rounded-xl p-3 border border-line/[0.08] text-center">
              <div className="text-lg font-bold text-fg">{value}</div>
              <div className="text-xs text-dim mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      )}

      <div className="surface p-6 mb-4">
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <div className="flex items-center gap-2 text-blue-400">
            <BookOpen size={16} />
            <span className="font-semibold text-sm uppercase tracking-wider">Explication</span>
          </div>
          {point.ownWriteup ? (
            <span className="chip text-accent bg-accent/10 border-accent/25">
              <PenLine size={11} /> écrite pour l&apos;app
            </span>
          ) : (
            <span className="chip">importée</span>
          )}
        </div>
        <div className="text-muted leading-relaxed whitespace-pre-wrap text-sm">
          {point.explanation}
        </div>
      </div>

      {point.caution && (
        <div className="bg-surface rounded-2xl p-6 border border-orange-500/20 mb-4">
          <div className="flex items-center gap-2 mb-3 text-orange-400">
            <AlertCircle size={16} />
            <span className="font-semibold text-sm uppercase tracking-wider">Attention</span>
          </div>
          <p className="text-muted text-sm leading-relaxed">{point.caution}</p>
        </div>
      )}

      {point.nuance && (
        <div className="bg-surface rounded-2xl p-6 border border-purple-500/20 mb-4">
          <div className="flex items-center gap-2 mb-3 text-purple-400">
            <Info size={16} />
            <span className="font-semibold text-sm uppercase tracking-wider">Nuance</span>
          </div>
          <p className="text-muted text-sm leading-relaxed">{point.nuance}</p>
        </div>
      )}

      {originalExamples.length > 0 && (
        <div className="surface p-6 mb-4 border-accent/20">
          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
            <div className="flex items-center gap-2 text-accent">
              <PenLine size={16} />
              <span className="font-semibold text-sm uppercase tracking-wider">
                Exemples ({originalExamples.length})
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {originalsPending && (
                <span className="chip border-amber-500/25 bg-amber-500/10 text-amber-300">
                  <AlertCircle size={11} /> En relecture — hors révisions
                </span>
              )}
              <button
                onClick={() => setShowFuri((v) => !v)}
                title={showFuri ? "Masquer les furigana" : "Afficher les furigana"}
                className={cn(
                  "flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg transition-all",
                  showFuri ? "text-accent bg-accent/10" : "text-dim hover:text-fg hover:bg-line/[0.05]"
                )}
              >
                <Languages size={14} />
                Furigana
              </button>
            </div>
          </div>
          <div className="space-y-4">
            {originalExamples.map((ex, i) => (
              <div key={ex.id ?? i} className="pb-4 border-b border-line/[0.05] last:border-0 last:pb-0">
                <div className="text-xs text-dim mb-1 tnum">#{i + 1}</div>
                <div className="text-fg japanese text-lg mb-1 leading-loose">
                  <Furigana text={ex.japanese} show={showFuri} />
                </div>
                <div className="text-muted text-sm">{ex.english}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {relatedList.length > 0 && (
        <div className="surface p-6 mb-4">
          <div className="flex items-center gap-2 mb-1 text-yellow-400">
            <Zap size={16} />
            <span className="font-semibold text-sm uppercase tracking-wider">
              Grammaires proches ({relatedList.length})
            </span>
          </div>
          <p className="text-xs text-dim mb-4">
            Points au sens ou à la forme voisins. « Contraste » signale une nuance
            opposée — à confronter plutôt qu'à confondre.
          </p>
          <div className="grid sm:grid-cols-2 gap-2">
            {relatedList.map((r) => (
              <Link
                key={r.slug}
                href={`/dashboard/grammar/${encodeURIComponent(r.slug)}`}
                className="group flex items-start gap-2 p-3 rounded-xl bg-line/[0.04] border border-line/[0.08] hover:border-accent/35 transition-all"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="japanese text-fg group-hover:text-accent transition-colors">
                      {r.title}
                    </span>
                    <span className={cn("chip text-[10px]", jlptColor(r.level))}>
                      {jlptLabel(r.level)}
                    </span>
                    {r.kind === "contraste" && (
                      <span className="chip text-[10px] text-amber-300 bg-amber-500/10 border-amber-500/25">
                        contraste
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-dim mt-0.5 line-clamp-1">{r.meaning}</div>
                </div>
                <ChevronRight size={14} className="text-dim shrink-0 mt-0.5" />
              </Link>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
