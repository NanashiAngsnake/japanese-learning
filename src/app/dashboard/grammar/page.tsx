"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Filter, Plus, Check, Clock, Loader2, BookOpen, Lock } from "lucide-react";
import { jlptColor, jlptLabel, cn } from "@/lib/utils";
import { getStage } from "@/lib/srs";

interface GrammarPoint {
  id: string;
  title: string;
  slug: string;
  meaning: string;
  jlptLevel: number;
  lesson: number | null;
  order: number;
  locked: boolean;
  examples: { japanese: string; english: string }[];
  studyStatus: "new" | "learned" | "review";
  srs: { interval: number; repetitions: number } | null;
}

const LEVEL_FILTERS = [
  { label: "Tous", value: "" },
  { label: "N5", value: "5" },
  { label: "N4", value: "4" },
  { label: "N3", value: "3" },
  { label: "N2", value: "2" },
  { label: "N1", value: "1" },
  { label: "Kansai", value: "6" },
  { label: "Non-JLPT", value: "0" },
];


export default function GrammarPage() {
  const router = useRouter();
  const [points, setPoints] = useState<GrammarPoint[]>([]);
  const [total, setTotal] = useState(0);
  const [studiedInFilter, setStudiedInFilter] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [level, setLevel] = useState("");
  const [page, setPage] = useState(1);
  const [studied, setStudied] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("search");
    if (q) setSearch(q);
  }, []);

  const fetchPoints = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "24" });
    if (level) params.set("level", level);
    if (search) params.set("search", search);

    const res = await fetch(`/api/grammar?${params}`);
    const data = await res.json();
    setPoints(data.points ?? []);
    setTotal(data.total ?? 0);
    setStudiedInFilter(data.studiedInFilter ?? 0);
    const s = new Set<string>();
    (data.points ?? []).forEach((p: GrammarPoint) => {
      if (p.studyStatus !== "new") s.add(p.id);
    });
    setStudied(s);
    setLoading(false);
  }, [page, level, search]);

  useEffect(() => {
    const t = setTimeout(fetchPoints, 300);
    return () => clearTimeout(t);
  }, [fetchPoints]);

  async function toggleStudy(p: GrammarPoint) {
    if (busy.has(p.id)) return;
    const isStudied = studied.has(p.id);
    setBusy((b) => new Set(b).add(p.id));

    await fetch("/api/study", {
      method: isStudied ? "DELETE" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ grammarPointId: p.id }),
    });

    setStudied((s) => {
      const n = new Set(s);
      if (isStudied) n.delete(p.id);
      else n.add(p.id);
      return n;
    });
    setStudiedInFilter((c) => c + (isStudied ? -1 : 1));
    setBusy((b) => {
      const n = new Set(b);
      n.delete(p.id);
      return n;
    });
  }

  async function studyWholeLevel() {
    if (!level || bulkLoading) return;
    setBulkLoading(true);
    const res = await fetch("/api/study", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ level: Number(level) }),
    });
    const data = await res.json();
    setBulkLoading(false);
    if (data.added > 0) fetchPoints();
    else if (data.lockedCount) router.push("/dashboard/pricing");
  }

  const totalPages = Math.ceil(total / 24);
  const levelName = LEVEL_FILTERS.find((f) => f.value === level)?.label ?? "";
  const remaining = total - studiedInFilter;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-fg">Grammaire</h1>
          <p className="text-dim text-sm mt-0.5">
            {total} points{level ? ` · ${studiedInFilter} en étude` : ""}
          </p>
        </div>
        {level && remaining > 0 && (
          <button
            onClick={studyWholeLevel}
            disabled={bulkLoading}
            className="flex items-center gap-2 px-4 py-2.5 bg-accent hover:bg-accent-deep disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-all"
          >
            {bulkLoading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            Étudier {levelName} ({remaining})
          </button>
        )}
      </div>

      <div className="flex gap-3 mb-6 flex-wrap">
        <div className="flex-1 min-w-[200px] relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dim" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Rechercher un point de grammaire..."
            className="w-full bg-surface border border-line/[0.10] rounded-xl pl-9 pr-4 py-2.5 text-fg placeholder-dim focus:outline-none focus:border-accent/50 text-sm"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <Filter size={16} className="text-dim self-center ml-1" />
          {LEVEL_FILTERS.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => { setLevel(value); setPage(1); }}
              className={cn(
                "px-3 py-2 rounded-lg text-xs font-medium transition-all",
                level === value
                  ? "bg-accent text-white"
                  : "bg-surface text-muted hover:text-fg border border-line/[0.10]"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="bg-surface rounded-xl p-4 border border-line/[0.08] animate-pulse h-28" />
          ))}
        </div>
      ) : points.length === 0 ? (
        <div className="text-center py-16 text-dim">
          <BookOpen size={48} className="mx-auto mb-3 opacity-30" />
          <p>Aucun point de grammaire trouvé</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {points.map((p) => {
            if (p.locked) {
              return (
                <Link
                  key={p.id}
                  href="/dashboard/pricing"
                  className="bg-surface rounded-xl p-4 border border-line/[0.08] hover:border-accent/40 transition-all group relative block"
                >
                  <div className="flex items-start justify-between mb-2 pr-9">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn("text-xs px-2 py-0.5 rounded-md border font-medium", jlptColor(p.jlptLevel))}>
                        {jlptLabel(p.jlptLevel)}
                      </span>
                      {p.lesson && <span className="text-xs text-dim">Leçon {p.lesson}</span>}
                    </div>
                  </div>
                  <div className="text-fg font-semibold japanese text-lg group-hover:text-accent transition-colors">
                    {p.title}
                  </div>
                  <div className="text-muted text-sm mt-0.5 line-clamp-1">{p.meaning}</div>
                  <div className="mt-2 pt-2 border-t border-line/[0.05] flex items-center gap-1.5 text-xs text-accent/90">
                    <Lock size={12} />
                    <span>Débloquer avec Pro</span>
                  </div>
                  <div className="absolute top-3 right-3 w-7 h-7 rounded-lg flex items-center justify-center bg-accent/15 text-accent">
                    <Lock size={13} />
                  </div>
                </Link>
              );
            }

            const isStudied = studied.has(p.id);
            const stage = getStage(p.srs);
            const due = p.studyStatus === "review";
            return (
              <div
                key={p.id}
                className="bg-surface rounded-xl p-4 border border-line/[0.08] hover:border-line/[0.20] transition-all card-hover group relative"
              >
                <Link href={`/dashboard/grammar/${p.slug}`} className="block">
                  <div className="flex items-start justify-between mb-2 pr-9">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn("text-xs px-2 py-0.5 rounded-md border font-medium", jlptColor(p.jlptLevel))}>
                        {jlptLabel(p.jlptLevel)}
                      </span>
                      {p.lesson && <span className="text-xs text-dim">Leçon {p.lesson}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className={cn("chip", stage.className)}>{stage.label}</span>
                    {due && (
                      <span className="chip text-orange-300 bg-orange-500/10 border-orange-500/25">
                        <Clock size={10} /> à réviser
                      </span>
                    )}
                  </div>
                  <div className="text-fg font-semibold japanese text-lg group-hover:text-accent transition-colors">
                    {p.title}
                  </div>
                  <div className="text-muted text-sm mt-0.5 line-clamp-1">{p.meaning}</div>
                  {p.examples[0] && (
                    <div className="mt-2 pt-2 border-t border-line/[0.05]">
                      <div className="text-xs text-dim japanese line-clamp-1">{p.examples[0].japanese}</div>
                    </div>
                  )}
                </Link>
                <button
                  onClick={() => toggleStudy(p)}
                  disabled={busy.has(p.id)}
                  title={isStudied ? "Retirer de l'étude" : "Ajouter à l'étude"}
                  className={cn(
                    "absolute top-3 right-3 w-7 h-7 rounded-lg flex items-center justify-center transition-all disabled:opacity-50",
                    isStudied
                      ? "bg-green-500/20 text-green-400 hover:bg-red-500/20 hover:text-red-400"
                      : "bg-line/[0.05] text-dim hover:bg-accent/20 hover:text-accent"
                  )}
                >
                  {busy.has(p.id) ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : isStudied ? (
                    <Check size={14} />
                  ) : (
                    <Plus size={14} />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-8">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 rounded-lg bg-surface border border-line/[0.10] text-muted disabled:opacity-30 hover:text-fg transition-colors text-sm"
          >
            ← Précédent
          </button>
          <span className="px-4 py-2 text-dim text-sm">Page {page} / {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 rounded-lg bg-surface border border-line/[0.10] text-muted disabled:opacity-30 hover:text-fg transition-colors text-sm"
          >
            Suivant →
          </button>
        </div>
      )}
    </div>
  );
}
