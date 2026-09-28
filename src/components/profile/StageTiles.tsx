"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { ALL_STAGES, type StageKey } from "@/lib/srs";

const STAGE_KANJI: Record<StageKey, string> = {
  new: "未",
  relearning: "再",
  apprentice: "初",
  confirmed: "中",
  mastered: "熟",
  anchored: "礎",
};

const STAGE_SKIN: Record<StageKey, string> = {
  new: "stage-mastered",
  relearning: "stage-relearning",
  apprentice: "stage-apprentice",
  confirmed: "stage-confirmed",
  mastered: "stage-mastered",
  anchored: "stage-anchored",
};

const ORDER: StageKey[] = ["relearning", "apprentice", "confirmed", "mastered", "anchored"];

export default function StageTiles({
  stages,
  href,
  className,
}: {
  stages: Partial<Record<StageKey, number>>;
  href?: string;
  className?: string;
}) {
  const total = ORDER.reduce((s, k) => s + (stages[k] ?? 0), 0);

  return (
    <div className={cn("grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3", className)}>
      {ORDER.map((key) => {
        const stage = ALL_STAGES.find((s) => s.key === key)!;
        const count = stages[key] ?? 0;
        const share = total > 0 ? (count / total) * 100 : 0;

        const inner = (
          <>
            <span
              className="stage-halo absolute -right-1 -bottom-3 jp-serif text-6xl leading-none select-none pointer-events-none"
              aria-hidden
            >
              {STAGE_KANJI[key]}
            </span>
            <div className="relative">
              <div className="stage-fg text-[11px] font-medium mb-1">{stage.label}</div>
              <div className="text-2xl font-bold text-fg tnum leading-none">{count}</div>
              <div className="h-1 mt-3 rounded-full bg-line/[0.06] overflow-hidden">
                <div
                  className="stage-bar h-full rounded-full transition-all duration-700"
                  style={{ width: `${share}%` }}
                />
              </div>
            </div>
          </>
        );

        const skin = STAGE_SKIN[key];

        return href ? (
          <Link
            key={key}
            href={`${href}?stage=${key}`}
            className={cn("surface-flat lift relative overflow-hidden p-3.5", skin)}
          >
            {inner}
          </Link>
        ) : (
          <div key={key} className={cn("surface-flat relative overflow-hidden p-3.5", skin)}>
            {inner}
          </div>
        );
      })}
    </div>
  );
}
