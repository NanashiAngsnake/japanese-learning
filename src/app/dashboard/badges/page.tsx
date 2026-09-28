"use client";

import { useEffect, useMemo, useState } from "react";
import { Award, RefreshCw, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Medal, MedalCard } from "@/components/profile/Medal";
import {
  BADGES_BY_ID,
  CATEGORY_META,
  TIER_META,
  type BadgeCategory,
  type BadgeState,
} from "@/lib/badges";
import type { ProfileSnapshot } from "@/lib/profile";

const CATEGORY_ORDER: BadgeCategory[] = [
  "serie",
  "volume",
  "revision",
  "maitrise",
  "jlpt",
  "rituel",
];

type StatusFilter = "tous" | "obtenus" | "restants";

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: "tous", label: "Tous" },
  { key: "obtenus", label: "Obtenus" },
  { key: "restants", label: "À gagner" },
];

function byEarnedThenRatio(a: BadgeState, b: BadgeState): number {
  if (a.earned !== b.earned) return a.earned ? -1 : 1;
  return b.ratio - a.ratio;
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "chip cursor-pointer transition-all duration-200",
        active
          ? "bg-accent/15 border-accent/40 text-accent"
          : "hover:bg-line/[0.09] hover:text-fg"
      )}
    >
      {children}
    </button>
  );
}

function BadgesSkeleton() {
  return (
    <div className="max-w-5xl mx-auto">
      <div className="surface p-5 mb-6">
        <div className="skeleton h-6 w-40 rounded-lg" />
        <div className="skeleton h-3 w-56 rounded mt-3" />
        <div className="skeleton h-1.5 w-full rounded-full mt-5" />
      </div>
      <div className="flex gap-2 mb-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="skeleton h-6 w-20 rounded-lg" />
        ))}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="surface-flat p-4 flex flex-col items-center gap-2.5">
            <div className="skeleton w-20 h-20 rounded-full" />
            <div className="skeleton h-3 w-20 rounded" />
            <div className="skeleton h-2.5 w-24 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function BadgesPage() {
  const [snapshot, setSnapshot] = useState<ProfileSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [status, setStatus] = useState<StatusFilter>("tous");
  const [categorie, setCategorie] = useState<BadgeCategory | null>(null);

  useEffect(() => {
    let annule = false;
    setLoading(true);
    fetch("/api/profile/me")
      .then(async (r) => {
        if (!r.ok) throw new Error("Chargement impossible");
        return (await r.json()) as ProfileSnapshot;
      })
      .then((data) => {
        if (annule) return;
        setSnapshot(data);
        setErreur(null);
      })
      .catch(() => {
        if (!annule) setErreur("Impossible de charger vos badges pour le moment.");
      })
      .finally(() => {
        if (!annule) setLoading(false);
      });
    return () => {
      annule = true;
    };
  }, []);

  const badges = snapshot?.badges ?? [];
  const total = badges.length;
  const obtenus = useMemo(() => badges.filter((b) => b.earned).length, [badges]);
  const pctGlobal = total > 0 ? Math.round((obtenus / total) * 100) : 0;

  const bientot = useMemo(
    () =>
      badges
        .filter((b) => !b.earned && !BADGES_BY_ID[b.id]?.moment)
        .sort((a, b) => b.ratio - a.ratio)
        .slice(0, 3),
    [badges]
  );

  const compteurs = useMemo(() => {
    const map = new Map<BadgeCategory, { total: number; earned: number }>();
    for (const key of CATEGORY_ORDER) map.set(key, { total: 0, earned: 0 });
    for (const state of badges) {
      const def = BADGES_BY_ID[state.id];
      if (!def) continue;
      const entry = map.get(def.category);
      if (!entry) continue;
      entry.total += 1;
      if (state.earned) entry.earned += 1;
    }
    return map;
  }, [badges]);

  const sections = useMemo(() => {
    return CATEGORY_ORDER.filter((key) => categorie === null || key === categorie)
      .map((key) => {
        const visibles = badges
          .filter((state) => {
            const def = BADGES_BY_ID[state.id];
            if (!def || def.category !== key) return false;
            if (status === "obtenus") return state.earned;
            if (status === "restants") return !state.earned;
            return true;
          })
          .sort(byEarnedThenRatio);
        const compte = compteurs.get(key) ?? { total: 0, earned: 0 };
        return { key, meta: CATEGORY_META[key], visibles, ...compte };
      })
      .filter((section) => section.visibles.length > 0);
  }, [badges, status, categorie, compteurs]);

  if (loading) return <BadgesSkeleton />;

  if (erreur || !snapshot) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="surface p-8 text-center">
          <Award size={28} className="mx-auto text-dim mb-3" />
          <p className="text-muted text-sm">{erreur ?? "Aucune donnée disponible."}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="btn btn-ghost mt-4 mx-auto"
          >
            <RefreshCw size={15} />
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  const rank = snapshot.rank;

  return (
    <div className="max-w-5xl mx-auto animate-fade-up">
      <div className="surface p-5 mb-6 relative overflow-hidden">
        <span
          className="jp-serif absolute -right-4 -top-6 text-[7rem] leading-none text-line/[0.05] select-none pointer-events-none"
          aria-hidden
        >
          勲
        </span>

        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-5">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-fg flex items-center gap-2">
              <Award size={22} className="text-accent" />
              Badges
            </h1>
            <p className="text-dim text-sm mt-0.5">
              <span className="tnum text-muted font-medium">{obtenus}</span> sur{" "}
              <span className="tnum">{total}</span> obtenus
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="w-12 h-12 rounded-xl bg-accent/[0.12] border border-accent/25 flex items-center justify-center">
              <span className="jp-serif text-lg text-accent leading-none">{rank.kanji}</span>
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold text-fg">
                Niveau <span className="tnum">{rank.level}</span> · {rank.title}
              </div>
              <div className="text-[11px] text-dim tnum mt-0.5">
                {rank.xp.toLocaleString("fr-FR")} XP · {rank.intoLevel.toLocaleString("fr-FR")}/
                {rank.span.toLocaleString("fr-FR")} vers le niveau suivant
              </div>
              <div className="mt-1.5 h-1 w-44 rounded-full bg-line/[0.07] overflow-hidden">
                <div
                  className="h-full rounded-full bg-accent/70 transition-all duration-700"
                  style={{ width: `${Math.round(rank.ratio * 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="relative mt-5">
          <div className="h-1 rounded-full bg-line/[0.07] overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-accent to-accent-deep transition-all duration-700"
              style={{ width: `${pctGlobal}%` }}
            />
          </div>
          <div className="text-[10px] text-dim mt-1.5 tnum">{pctGlobal} % du mur complété</div>
        </div>
      </div>

      {bientot.length > 0 && (
        <div className="surface-flat p-5 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={15} className="text-accent" />
            <h2 className="text-sm font-semibold text-fg">Bientôt à vous</h2>
            <span className="text-[11px] text-dim">les plus proches du but</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {bientot.map((state) => {
              const def = BADGES_BY_ID[state.id];
              if (!def) return null;
              const pct = Math.round(state.ratio * 100);
              return (
                <div key={state.id} className="flex items-center gap-3 min-w-0">
                  <Medal id={state.id} earned={false} size="md" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-fg truncate">{def.name}</div>
                    <div className="text-[11px] text-dim truncate">{def.description}</div>
                    <div className="mt-1.5 h-1.5 rounded-full bg-line/[0.07] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-accent/70 transition-all duration-700"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="text-[10px] text-dim mt-1 tnum">
                      {Math.min(state.current, def.goal).toLocaleString("fr-FR")} /{" "}
                      {def.goal.toLocaleString("fr-FR")}
                      <span className="text-dim/70"> · {pct} %</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="space-y-2.5 mb-6">
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((f) => (
            <FilterChip key={f.key} active={status === f.key} onClick={() => setStatus(f.key)}>
              {f.label}
              {f.key === "obtenus" && <span className="tnum opacity-70">{obtenus}</span>}
              {f.key === "restants" && (
                <span className="tnum opacity-70">{total - obtenus}</span>
              )}
            </FilterChip>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <FilterChip active={categorie === null} onClick={() => setCategorie(null)}>
            Toutes catégories
          </FilterChip>
          {CATEGORY_ORDER.map((key) => {
            const compte = compteurs.get(key) ?? { total: 0, earned: 0 };
            return (
              <FilterChip
                key={key}
                active={categorie === key}
                onClick={() => setCategorie(categorie === key ? null : key)}
              >
                <span className="jp-serif">{CATEGORY_META[key].kanji}</span>
                {CATEGORY_META[key].label}
                <span className="tnum opacity-70">
                  {compte.earned}/{compte.total}
                </span>
              </FilterChip>
            );
          })}
        </div>
      </div>

      {sections.length === 0 ? (
        <div className="surface-flat p-10 text-center">
          <Award size={26} className="mx-auto text-dim mb-3" />
          <p className="text-muted text-sm">Aucun badge ne correspond à ces filtres.</p>
          <button
            type="button"
            onClick={() => {
              setStatus("tous");
              setCategorie(null);
            }}
            className="btn btn-ghost mt-4 mx-auto"
          >
            Tout afficher
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {sections.map((section) => (
            <section key={section.key}>
              <div className="flex items-center gap-3 mb-3">
                <span className="jp-serif text-xl text-accent/80 leading-none">
                  {section.meta.kanji}
                </span>
                <h2 className="text-fg font-semibold">{section.meta.label}</h2>
                <span className="h-px flex-1 bg-line/[0.08]" aria-hidden />
                <span className="text-xs text-dim tnum">
                  {section.earned}/{section.total}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {section.visibles.map((state) => (
                  <MedalCard key={state.id} state={state} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 mt-8 pt-5 border-t border-line/[0.07]">
        <span className="text-[11px] text-dim">Paliers :</span>
        {(["bronze", "argent", "or", "jade"] as const).map((tier) => (
          <span key={tier} className={cn("chip tier-fg", TIER_META[tier].cls)}>
            {TIER_META[tier].label}
          </span>
        ))}
      </div>
    </div>
  );
}
