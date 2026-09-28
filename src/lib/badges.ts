import type { StageKey } from "@/lib/srs";

export type BadgeTier = "bronze" | "argent" | "or" | "jade";

export type BadgeCategory =
  | "serie"
  | "volume"
  | "revision"
  | "maitrise"
  | "jlpt"
  | "rituel";

export interface BadgeContext {
  learned: number;
  totalGrammar: number;
  reviews: number;
  correctReviews: number;
  currentStreak: number;
  longestStreak: number;
  daysStudied: number;
  bestDayReviews: number;
  stages: Partial<Record<StageKey, number>>;
  learnedByLevel: Record<number, number>;
  masteredByLevel: Record<number, number>;
  totalByLevel: Record<number, number>;
  accuracy: number;
  accuracySample: number;

  hourOfDay?: number;
  weekend?: boolean;
}

export interface BadgeDef {
  id: string;
  name: string;
  kanji: string;
  description: string;
  tier: BadgeTier;
  category: BadgeCategory;
  goal: number;
  progress: (c: BadgeContext) => number;

  moment?: boolean;
}

const masteredTotal = (c: BadgeContext) =>
  (c.stages.mastered ?? 0) + (c.stages.anchored ?? 0);

const levelDone = (c: BadgeContext, lvl: number) => {
  const total = c.totalByLevel[lvl] ?? 0;
  if (total === 0) return 0;
  return (c.masteredByLevel[lvl] ?? 0) >= total ? 1 : 0;
};

const bestStreak = (c: BadgeContext) => Math.max(c.currentStreak, c.longestStreak);

export const BADGES: BadgeDef[] = [
  { id: "streak-3",   name: "Trois jours",      kanji: "三", description: "3 jours d'affilée",          tier: "bronze", category: "serie", goal: 3,   progress: bestStreak },
  { id: "streak-7",   name: "Une semaine",      kanji: "週", description: "7 jours d'affilée",          tier: "bronze", category: "serie", goal: 7,   progress: bestStreak },
  { id: "streak-30",  name: "Un mois",          kanji: "月", description: "30 jours d'affilée",         tier: "argent", category: "serie", goal: 30,  progress: bestStreak },
  { id: "streak-100", name: "Cent jours",       kanji: "百", description: "100 jours d'affilée",        tier: "or",     category: "serie", goal: 100, progress: bestStreak },
  { id: "streak-365", name: "Une année",        kanji: "年", description: "365 jours d'affilée",        tier: "jade",   category: "serie", goal: 365, progress: bestStreak },
  { id: "days-50",    name: "Cinquante jours",  kanji: "五", description: "50 jours étudiés au total",  tier: "bronze", category: "serie", goal: 50,  progress: (c) => c.daysStudied },
  { id: "days-200",   name: "Deux cents jours", kanji: "積", description: "200 jours étudiés au total", tier: "or",     category: "serie", goal: 200, progress: (c) => c.daysStudied },

  { id: "learn-1",   name: "Premier pas",      kanji: "初", description: "Un premier point mis à l'étude", tier: "bronze", category: "volume", goal: 1,   progress: (c) => c.learned },
  { id: "learn-25",  name: "Vingt-cinq",       kanji: "廿", description: "25 points à l'étude",            tier: "bronze", category: "volume", goal: 25,  progress: (c) => c.learned },
  { id: "learn-100", name: "Cent points",      kanji: "百", description: "100 points à l'étude",           tier: "argent", category: "volume", goal: 100, progress: (c) => c.learned },
  { id: "learn-300", name: "Trois cents",      kanji: "参", description: "300 points à l'étude",           tier: "or",     category: "volume", goal: 300, progress: (c) => c.learned },
  { id: "learn-all", name: "Catalogue entier", kanji: "全", description: "Tout le catalogue à l'étude",    tier: "jade",   category: "volume", goal: 1,   progress: (c) => (c.totalGrammar > 0 && c.learned >= c.totalGrammar ? 1 : 0) },

  { id: "rev-100",   name: "Cent révisions", kanji: "反", description: "100 révisions",                     tier: "bronze", category: "revision", goal: 100,   progress: (c) => c.reviews },
  { id: "rev-500",   name: "Cinq cents",     kanji: "復", description: "500 révisions",                     tier: "argent", category: "revision", goal: 500,   progress: (c) => c.reviews },
  { id: "rev-2000",  name: "Deux mille",     kanji: "千", description: "2 000 révisions",                   tier: "or",     category: "revision", goal: 2000,  progress: (c) => c.reviews },
  { id: "rev-10000", name: "Dix mille",      kanji: "万", description: "10 000 révisions",                  tier: "jade",   category: "revision", goal: 10000, progress: (c) => c.reviews },
  { id: "day-100",   name: "Grosse journée", kanji: "励", description: "100 révisions dans la même journée", tier: "argent", category: "revision", goal: 100,  progress: (c) => c.bestDayReviews },
  { id: "sharp",     name: "Main sûre",      kanji: "精", description: "90 % de réussite sur 100 révisions", tier: "or",    category: "revision", goal: 90,    progress: (c) => (c.accuracySample >= 100 ? Math.round(c.accuracy * 100) : 0) },

  { id: "master-10",  name: "Dix maîtrisés", kanji: "得", description: "10 points maîtrisés",  tier: "bronze", category: "maitrise", goal: 10,  progress: masteredTotal },
  { id: "master-50",  name: "Cinquante",     kanji: "熟", description: "50 points maîtrisés",  tier: "argent", category: "maitrise", goal: 50,  progress: masteredTotal },
  { id: "master-200", name: "Deux cents",    kanji: "極", description: "200 points maîtrisés", tier: "or",     category: "maitrise", goal: 200, progress: masteredTotal },
  { id: "anchor-50",  name: "Ancré",         kanji: "礎", description: "50 points ancrés (plus de quatre mois d'intervalle)", tier: "jade", category: "maitrise", goal: 50, progress: (c) => c.stages.anchored ?? 0 },

  { id: "jlpt-n5", name: "N5 terminé", kanji: "五", description: "Tous les points N5 maîtrisés", tier: "bronze", category: "jlpt", goal: 1, progress: (c) => levelDone(c, 5) },
  { id: "jlpt-n4", name: "N4 terminé", kanji: "四", description: "Tous les points N4 maîtrisés", tier: "argent", category: "jlpt", goal: 1, progress: (c) => levelDone(c, 4) },
  { id: "jlpt-n3", name: "N3 terminé", kanji: "三", description: "Tous les points N3 maîtrisés", tier: "or",     category: "jlpt", goal: 1, progress: (c) => levelDone(c, 3) },
  { id: "jlpt-n2", name: "N2 terminé", kanji: "二", description: "Tous les points N2 maîtrisés", tier: "or",     category: "jlpt", goal: 1, progress: (c) => levelDone(c, 2) },
  { id: "jlpt-n1", name: "N1 terminé", kanji: "一", description: "Tous les points N1 maîtrisés", tier: "jade",   category: "jlpt", goal: 1, progress: (c) => levelDone(c, 1) },

  { id: "night-owl",  name: "Oiseau de nuit",    kanji: "夜", description: "Réviser entre minuit et 4 h",   tier: "bronze", category: "rituel", goal: 1, moment: true, progress: (c) => (c.hourOfDay !== undefined && c.hourOfDay < 4 ? 1 : 0) },
  { id: "early-bird", name: "Lève-tôt",          kanji: "朝", description: "Réviser avant 7 h du matin",    tier: "bronze", category: "rituel", goal: 1, moment: true, progress: (c) => (c.hourOfDay !== undefined && c.hourOfDay >= 4 && c.hourOfDay < 7 ? 1 : 0) },
  { id: "weekend",    name: "Week-end studieux", kanji: "土", description: "Réviser un samedi ou un dimanche", tier: "bronze", category: "rituel", goal: 1, moment: true, progress: (c) => (c.weekend ? 1 : 0) },
];

export const BADGES_BY_ID: Record<string, BadgeDef> = Object.fromEntries(
  BADGES.map((b) => [b.id, b])
);

export const CATEGORY_META: Record<BadgeCategory, { label: string; kanji: string }> = {
  serie:    { label: "Assiduité", kanji: "続" },
  volume:   { label: "Volume",    kanji: "量" },
  revision: { label: "Révisions", kanji: "反" },
  maitrise: { label: "Maîtrise",  kanji: "極" },
  jlpt:     { label: "JLPT",      kanji: "級" },
  rituel:   { label: "Rituels",   kanji: "習" },
};

export const TIER_META: Record<BadgeTier, { label: string; cls: string }> = {
  bronze: { label: "Bronze", cls: "tier-bronze" },
  argent: { label: "Argent", cls: "tier-argent" },
  or: { label: "Or", cls: "tier-or" },
  jade: { label: "Jade", cls: "tier-jade" },
};

export interface BadgeState {
  id: string;

  earned: boolean;
  earnedAt?: string;
  ready: boolean;
  current: number;
  ratio: number;
}

export function earnedBadgeIds(ctx: BadgeContext): string[] {
  return BADGES.filter((b) => b.progress(ctx) >= b.goal).map((b) => b.id);
}

export function badgeStates(
  ctx: BadgeContext,
  owned: { badgeId: string; earnedAt: Date | string }[]
): BadgeState[] {
  const ownedMap = new Map(
    owned.map((o) => [
      o.badgeId,
      typeof o.earnedAt === "string" ? o.earnedAt : o.earnedAt.toISOString(),
    ])
  );
  return BADGES.map((def) => {
    const current = Math.max(0, def.progress(ctx));
    const earnedAt = ownedMap.get(def.id);
    return {
      id: def.id,
      earned: Boolean(earnedAt),
      earnedAt,
      ready: !earnedAt && current >= def.goal,
      current,
      ratio: def.goal > 0 ? Math.min(1, current / def.goal) : 0,
    };
  });
}
