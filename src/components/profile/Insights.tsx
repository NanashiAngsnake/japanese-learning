"use client";

import { CalendarRange, Activity as ActivityIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ForecastDay, ActivityDay } from "@/lib/profile";

function PanelShell({
  icon: Icon,
  title,
  aside,
  children,
}: {
  icon: React.ElementType;
  title: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="surface-flat p-4">
      <header className="flex items-center justify-between mb-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-fg">
          <Icon size={15} className="text-accent/80" />
          {title}
        </h3>
        {aside}
      </header>
      {children}
    </section>
  );
}

export function ForecastPanel({
  forecast,
  dueNow,
  hint = "Ajoutez des points pour remplir le calendrier.",
}: {
  forecast: ForecastDay[];
  dueNow: number;
  hint?: string;
}) {
  const max = Math.max(1, ...forecast.map((f) => f.count));
  const total = forecast.reduce((s, f) => s + f.count, 0);
  const upcoming = Math.max(0, total - dueNow);
  const empty = total === 0;

  return (
    <PanelShell
      icon={CalendarRange}
      title="Prévisions"
      aside={
        <span className="text-[11px] text-dim tnum">
          {upcoming} à venir sur 14 j
        </span>
      }
    >
      {empty ? (
        <div className="h-[112px] flex flex-col items-center justify-center text-center gap-1">
          <p className="text-sm text-muted">Rien à réviser dans les deux semaines.</p>
          <p className="text-xs text-dim">{hint}</p>
        </div>
      ) : (
        <div className="flex items-end gap-1 h-[112px]">
          {forecast.map((f, i) => {
            const h = f.count > 0 ? Math.max(6, (f.count / max) * 88) : 2;
            return (
              <div key={f.day} className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
                <span className="text-[10px] text-dim tnum leading-none h-3">
                  {f.count > 0 ? f.count : ""}
                </span>
                <div
                  className={cn(
                    "w-full rounded-md transition-all duration-500",
                    i === 0 ? "bg-accent" : f.count > 0 ? "bg-accent/45" : "bg-line/[0.07]"
                  )}
                  style={{ height: h }}
                  title={`${f.day} — ${f.count} révision(s)`}
                />
                <span
                  className={cn(
                    "text-[9px] leading-none truncate w-full text-center",
                    i === 0 ? "text-accent" : "text-dim"
                  )}
                >
                  {f.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </PanelShell>
  );
}

function heat(reviews: number, max: number): string {
  if (reviews <= 0) return "bg-line/[0.05]";
  const r = reviews / Math.max(1, max);
  if (r > 0.75) return "bg-accent";
  if (r > 0.5) return "bg-accent/75";
  if (r > 0.25) return "bg-accent/50";
  return "bg-accent/30";
}

const pad = (n: number) => String(n).padStart(2, "0");

function keyToDate(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

function shiftKey(key: string, n: number): string {
  const d = keyToDate(key);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const WINDOW = 91;

export function ActivityPanel({
  activity,
  today,
}: {
  activity: ActivityDay[];
  today: string;
}) {
  const byDay = new Map(activity.map((a) => [a.day, a]));
  const max = Math.max(1, ...activity.map((a) => a.reviews));
  const total = activity.reduce((s, a) => s + a.reviews, 0);

  const start = shiftKey(today, -(WINDOW - 1));

  const lead = keyToDate(start).getDay();
  const cells: ({ day: string; reviews: number } | null)[] = Array.from(
    { length: lead },
    () => null
  );
  for (let i = 0; i < WINDOW; i++) {
    const key = shiftKey(start, i);
    cells.push({ day: key, reviews: byDay.get(key)?.reviews ?? 0 });
  }

  const weeks: ({ day: string; reviews: number } | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  return (
    <PanelShell
      icon={ActivityIcon}
      title="Activité"
      aside={<span className="text-[11px] text-dim tnum">{total} révisions sur 13 sem.</span>}
    >
      {total === 0 ? (
        <div className="h-[112px] flex flex-col items-center justify-center text-center gap-1">
          <p className="text-sm text-muted">Aucune révision ce trimestre.</p>
          <p className="text-xs text-dim">Une série démarre à la première carte.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex gap-[3px] overflow-x-auto pb-1">
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-[3px] shrink-0">
                {week.map((c, ci) =>
                  c ? (
                    <span
                      key={c.day}
                      title={`${c.day} — ${c.reviews} révision(s)`}
                      className={cn("w-3 h-3 rounded-[3px]", heat(c.reviews, max))}
                    />
                  ) : (
                    <span key={`vide-${wi}-${ci}`} className="w-3 h-3" aria-hidden />
                  )
                )}
              </div>
            ))}
          </div>
          <div className="flex items-center justify-end gap-1.5 text-[10px] text-dim">
            <span>Moins</span>
            {["bg-line/[0.05]", "bg-accent/30", "bg-accent/50", "bg-accent/75", "bg-accent"].map((c) => (
              <span key={c} className={cn("w-3 h-3 rounded-[3px]", c)} />
            ))}
            <span>Plus</span>
          </div>
        </div>
      )}
    </PanelShell>
  );
}
