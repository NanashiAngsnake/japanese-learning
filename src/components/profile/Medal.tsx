"use client";

import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { BADGES_BY_ID, TIER_META, type BadgeState } from "@/lib/badges";

const SIZES = {
  sm: { box: "w-10 h-10", kanji: "text-base", ring: "inset-[2px]" },
  md: { box: "w-14 h-14", kanji: "text-xl", ring: "inset-[3px]" },
  lg: { box: "w-20 h-20", kanji: "text-3xl", ring: "inset-[4px]" },
} as const;

export type MedalSize = keyof typeof SIZES;

export function Medal({
  id,
  earned,
  size = "md",
  title,
}: {
  id: string;
  earned: boolean;
  size?: MedalSize;
  title?: string;
}) {
  const def = BADGES_BY_ID[id];
  if (!def) return null;
  const tier = TIER_META[def.tier];
  const s = SIZES[size];

  return (
    <div
      title={title ?? `${def.name} — ${def.description}`}
      className={cn(
        "relative shrink-0 rounded-full flex items-center justify-center transition-all duration-300",
        s.box,
        earned ? cn("medal", tier.cls) : "medal-locked"
      )}
    >
      <span
        className={cn(
          "absolute rounded-full border pointer-events-none",
          s.ring,
          earned ? "border-white/15" : "border-line/[0.06]"
        )}
        aria-hidden
      />
      {earned ? (
        <span className={cn("jp-serif leading-none tier-fg", s.kanji)}>{def.kanji}</span>
      ) : (
        <Lock size={size === "lg" ? 22 : size === "md" ? 16 : 13} className="text-dim/70" />
      )}
    </div>
  );
}

export function MedalCard({ state }: { state: BadgeState }) {
  const def = BADGES_BY_ID[state.id];
  if (!def) return null;
  const tier = TIER_META[def.tier];
  const pct = Math.round(state.ratio * 100);
  const showBar = !state.earned && !def.moment && def.goal > 1;

  return (
    <div
      className={cn(
        "surface-flat p-4 flex flex-col items-center text-center gap-2.5 transition-all",
        state.earned ? "lift" : "opacity-75 hover:opacity-100"
      )}
    >
      <Medal id={state.id} earned={state.earned} size="lg" />
      <div className="min-w-0 w-full">
        <div className={cn("font-semibold text-sm truncate", state.earned ? "text-fg" : "text-muted")}>
          {def.name}
        </div>
        <div className="text-[11px] text-dim leading-snug mt-0.5">{def.description}</div>
      </div>

      {state.earned ? (
        <span className={cn("chip tier-fg", tier.cls)}>
          {state.earnedAt
            ? new Date(state.earnedAt).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })
            : tier.label}
        </span>
      ) : showBar ? (
        <div className="w-full">
          <div className="h-1.5 rounded-full bg-line/[0.07] overflow-hidden">
            <div
              className="h-full rounded-full bg-accent/70 transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="text-[10px] text-dim mt-1 tnum">
            {Math.min(state.current, def.goal)} / {def.goal}
          </div>
        </div>
      ) : (
        <span className="chip">{def.moment ? "Au bon moment" : tier.label}</span>
      )}
    </div>
  );
}

export function MedalShelf({
  ids,
  max = 5,
  size = "md",
  emptyLabel = "Aucun badge pour l'instant",
}: {
  ids: string[];
  max?: number;
  size?: MedalSize;
  emptyLabel?: string;
}) {
  if (ids.length === 0) {
    return <div className="text-xs text-dim py-2">{emptyLabel}</div>;
  }
  const shown = ids.slice(0, max);
  const rest = ids.length - shown.length;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {shown.map((id) => (
        <Medal key={id} id={id} earned size={size} />
      ))}
      {rest > 0 && (
        <span className="text-xs text-dim font-medium tnum px-1">+{rest}</span>
      )}
    </div>
  );
}
