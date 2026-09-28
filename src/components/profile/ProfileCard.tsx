"use client";

import { Flame, CalendarCheck, Layers, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { MedalShelf } from "@/components/profile/Medal";
import type { ProfileSnapshot, StreakDay, JlptRow } from "@/lib/profile";

export function StreakStrip({ week }: { week: StreakDay[] }) {
  return (
    <div className="flex items-end justify-between gap-1">
      {week.map((d) => (
        <div key={d.day} className="flex flex-col items-center gap-1.5 flex-1">
          <span
            className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-semibold transition-all",
              d.active
                ? "bg-accent text-white shadow-[0_0_16px_-4px_rgb(var(--accent-rgb))]"
                : "bg-line/[0.06] text-dim",
              d.isToday && !d.active && "ring-1 ring-accent/45 text-muted"
            )}
            title={d.day}
          >
            {d.active ? <Flame size={14} /> : d.dayOfMonth}
          </span>
          <span className={cn("text-[10px] japanese", d.isToday ? "text-accent" : "text-dim")}>
            {d.kanji}
          </span>
        </div>
      ))}
    </div>
  );
}

const JLPT_BAR: Record<number, string> = {
  5: "bg-green-500",
  4: "bg-blue-500",
  3: "bg-yellow-500",
  2: "bg-orange-500",
  1: "bg-red-500",
};

export function JlptProgress({ rows, compact }: { rows: JlptRow[]; compact?: boolean }) {
  return (
    <div className={cn("space-y-2", compact && "space-y-1.5")}>
      {rows.map((r) => {
        const learnedPct = r.total > 0 ? (r.learned / r.total) * 100 : 0;
        const masteredPct = r.total > 0 ? (r.mastered / r.total) * 100 : 0;
        return (
          <div key={r.level} className="flex items-center gap-2.5">
            <span className="w-6 text-[11px] font-bold text-muted tnum">{r.label}</span>
            <div
              className="relative flex-1 h-2 rounded-full bg-line/[0.06] overflow-hidden"
              title={`${r.mastered} maîtrisé(s) · ${r.learned} à l'étude · ${r.total} au total`}
            >
              <div
                className={cn("absolute inset-y-0 left-0 rounded-full opacity-35 transition-all duration-500", JLPT_BAR[r.level])}
                style={{ width: `${learnedPct}%` }}
              />
              <div
                className={cn("absolute inset-y-0 left-0 rounded-full transition-all duration-700", JLPT_BAR[r.level])}
                style={{ width: `${masteredPct}%` }}
              />
            </div>
            <span className="w-16 text-right text-[11px] text-dim tnum">
              {r.learned}/{r.total}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function Avatar({
  emoji,
  size = 64,
  ring = true,
}: {
  emoji: string;
  size?: number;
  ring?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center shrink-0 bg-gradient-to-br from-accent/25 to-accent-deep/15",
        ring && "border border-accent/35"
      )}
      style={{ width: size, height: size, fontSize: size * 0.5 }}
    >
      <span className="leading-none select-none" aria-hidden>
        {emoji}
      </span>
    </div>
  );
}

export default function ProfileCard({
  snapshot,
  actions,
  className,
}: {
  snapshot: ProfileSnapshot;
  actions?: React.ReactNode;
  className?: string;
}) {
  const { user, rank, streak, counts, recentBadges } = snapshot;
  const name = user.displayName || user.username;

  return (
    <aside className={cn("surface p-5 space-y-5", className)}>
      <div className="flex items-center gap-3.5">
        <Avatar emoji={user.avatarEmoji} size={60} />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-fg truncate">{name}</h2>
            {user.isPro && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-accent/20 text-accent border border-accent/30">
                PRO
              </span>
            )}
          </div>
          <div className="text-xs text-dim truncate">@{user.username}</div>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="jp-serif text-sm text-accent">{rank.kanji}</span>
            <span className="text-xs text-muted">
              {rank.title} · Niv. {rank.level}
            </span>
          </div>
        </div>
      </div>

      {user.bio && <p className="text-sm text-muted leading-relaxed">{user.bio}</p>}

      <div>
        <div className="flex items-baseline justify-between mb-1.5">
          <span className="text-[11px] uppercase tracking-[0.14em] text-dim">Expérience</span>
          <span className="text-[11px] text-dim tnum">
            {rank.intoLevel} / {rank.span}
          </span>
        </div>
        <div className="h-2 rounded-full bg-line/[0.06] overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-accent-deep to-accent transition-all duration-700"
            style={{ width: `${Math.round(rank.ratio * 100)}%` }}
          />
        </div>
      </div>

      <div className="surface-flat p-3.5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-muted">Série en cours</span>
          <span className="flex items-center gap-1.5 text-sm font-bold text-fg tnum">
            <Flame size={14} className={streak.current > 0 ? "text-accent" : "text-dim"} />
            {streak.current} j
          </span>
        </div>
        <StreakStrip week={streak.week} />
        {streak.longest > 0 && (
          <div className="text-[11px] text-dim mt-2.5 text-center">
            Record : {streak.longest} jour{streak.longest > 1 ? "s" : ""}
          </div>
        )}
      </div>

      <div>
        <div className="text-[11px] uppercase tracking-[0.14em] text-dim mb-2.5">
          Progression JLPT
        </div>
        {snapshot.jlpt.length > 0 ? (
          <JlptProgress rows={snapshot.jlpt} />
        ) : (
          <div className="text-xs text-dim">Aucun point de grammaire en base.</div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[11px] uppercase tracking-[0.14em] text-dim">Badges récents</span>
          <span className="text-[11px] text-dim tnum">{recentBadges.length}</span>
        </div>
        <MedalShelf ids={recentBadges.map((b) => b.id)} max={5} size="md" />
      </div>

      <div className="grid grid-cols-3 gap-2 pt-1">
        {[
          { icon: CalendarCheck, value: streak.daysStudied, label: "Jours étudiés" },
          { icon: Layers, value: counts.learned, label: "Points étudiés" },
          { icon: RotateCcw, value: counts.reviews, label: "Révisions" },
        ].map(({ icon: Icon, value, label }) => (
          <div key={label} className="surface-flat py-2.5 px-1 text-center">
            <Icon size={14} className="mx-auto mb-1 text-accent/80" />
            <div className="text-base font-bold text-fg tnum leading-none">{value}</div>
            <div className="text-[10px] text-dim mt-1 leading-tight">{label}</div>
          </div>
        ))}
      </div>

      {actions && <div className="pt-1">{actions}</div>}
    </aside>
  );
}
