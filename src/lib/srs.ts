export interface SRSCard {
  easeFactor: number;
  interval: number;
  repetitions: number;
  nextReview: Date;
  streak: number;
}

export interface SRSResult extends SRSCard {
  passed: boolean;
}

export function calculateSRS(card: SRSCard, quality: number): SRSResult {
  const passed = quality >= 3;

  let { easeFactor, interval, repetitions, streak } = card;

  if (!passed) {
    repetitions = 0;
    interval = 1;
    streak = 0;
  } else {
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
    repetitions += 1;
    streak += 1;
  }

  easeFactor = Math.max(
    1.3,
    easeFactor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)
  );

  return { easeFactor, interval, repetitions, nextReview: intervalToDate(interval), streak, passed };
}

export function intervalToDate(interval: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + interval);
  d.setHours(0, 0, 0, 0);
  return d;
}

export type StageKey =
  | "new"
  | "relearning"
  | "apprentice"
  | "confirmed"
  | "mastered"
  | "anchored";

export interface Stage {
  key: StageKey;
  label: string;
  index: number;
  className: string;
}

const STAGES: Record<StageKey, Stage> = {
  new:        { key: "new",        label: "Nouveau",    index: 0, className: "text-dim bg-line/[0.05] border-line/[0.10]" },
  relearning: { key: "relearning", label: "À revoir",   index: 1, className: "text-red-400 bg-red-500/10 border-red-500/20" },
  apprentice: { key: "apprentice", label: "Apprenti",   index: 2, className: "text-orange-400 bg-orange-500/10 border-orange-500/20" },
  confirmed:  { key: "confirmed",  label: "Confirmé",   index: 3, className: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
  mastered:   { key: "mastered",   label: "Maîtrisé",   index: 4, className: "text-green-400 bg-green-500/10 border-green-500/20" },
  anchored:   { key: "anchored",   label: "Ancré",      index: 5, className: "text-purple-400 bg-purple-500/10 border-purple-500/20" },
};

export function getStage(
  item?: {
    interval?: number | null;
    repetitions?: number | null;

    lapsed?: boolean | null;
  } | null
): Stage {
  if (!item) return STAGES.new;
  const interval = item.interval ?? 0;
  const repetitions = item.repetitions ?? 0;

  if (repetitions === 0) return item.lapsed ? STAGES.relearning : STAGES.apprentice;

  if (interval < 7) return STAGES.apprentice;
  if (interval < 30) return STAGES.confirmed;
  if (interval < 120) return STAGES.mastered;
  return STAGES.anchored;
}

export const ALL_STAGES: Stage[] = Object.values(STAGES);

export const DISTINCT_SENTENCES_TO_TRUST = 3;

export function capUntilProven(interval: number, distinctPassed: number): number {
  if (distinctPassed >= DISTINCT_SENTENCES_TO_TRUST) return interval;
  return Math.min(interval, 7);
}

export function getScoreLabel(score: number): string {
  const labels: Record<number, string> = {
    0: "Oubli total",
    1: "Très difficile",
    2: "Difficile",
    3: "Correct",
    4: "Facile",
    5: "Parfait",
  };
  return labels[score] ?? "Inconnu";
}

export function getScoreColor(score: number): string {
  if (score <= 2) return "text-red-500";
  if (score === 3) return "text-yellow-500";
  if (score === 4) return "text-green-400";
  return "text-green-500";
}

export function formatNextReview(date: Date): string {
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

  if (days <= 0) return "Maintenant";
  if (days === 1) return "Demain";
  if (days < 7) return `Dans ${days} jours`;
  if (days < 30) return `Dans ${Math.ceil(days / 7)} semaine(s)`;
  return `Dans ${Math.ceil(days / 30)} mois`;
}
