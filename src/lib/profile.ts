import { prisma } from "@/lib/prisma";
import { getStage, type StageKey } from "@/lib/srs";
import { FREE_GRAMMAR_LIMIT } from "@/lib/billing";
import {
  badgeStates,
  earnedBadgeIds,
  BADGES_BY_ID,
  type BadgeContext,
  type BadgeState,
} from "@/lib/badges";

export function dayKey(d: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function fromDayKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function shiftDay(key: string, n: number): string {
  const d = fromDayKey(key);
  d.setDate(d.getDate() + n);
  return dayKey(d);
}

export function daysBetween(a: string, b: string): number {
  const ms = fromDayKey(b).getTime() - fromDayKey(a).getTime();
  return Math.round(ms / 86_400_000);
}

export const WEEKDAY_KANJI = ["日", "月", "火", "水", "木", "金", "土"] as const;

const STAGE_XP: Record<StageKey, number> = {
  new: 0,
  relearning: 1,
  apprentice: 2,
  confirmed: 6,
  mastered: 14,
  anchored: 25,
};

const XP_PER_REVIEW = 1;
const XP_PER_DAY_STUDIED = 5;

export function xpForLevel(n: number): number {
  if (n <= 1) return 0;
  return Math.round(60 * Math.pow(n - 1, 1.7));
}

export interface RankInfo {
  level: number;
  xp: number;
  intoLevel: number;
  span: number;
  ratio: number;
  title: string;
  kanji: string;
}

const TITLES: { min: number; title: string; kanji: string }[] = [
  { min: 70, title: "Virtuose", kanji: "達人" },
  { min: 50, title: "Maître", kanji: "師範" },
  { min: 35, title: "Avancé", kanji: "上級" },
  { min: 20, title: "Intermédiaire", kanji: "中級" },
  { min: 10, title: "En chemin", kanji: "修行" },
  { min: 5, title: "Novice", kanji: "初心" },
  { min: 1, title: "Débutant", kanji: "入門" },
];

export function rankFromXp(xp: number): RankInfo {
  let level = 1;
  while (level < 200 && xp >= xpForLevel(level + 1)) level++;
  const base = xpForLevel(level);
  const next = xpForLevel(level + 1);
  const span = Math.max(1, next - base);
  const t = TITLES.find((x) => level >= x.min) ?? TITLES[TITLES.length - 1];
  return {
    level,
    xp,
    intoLevel: xp - base,
    span,
    ratio: Math.min(1, (xp - base) / span),
    title: t.title,
    kanji: t.kanji,
  };
}

export interface JlptRow {
  level: number;
  label: string;
  learned: number;
  mastered: number;
  total: number;
}

export interface ForecastDay {
  day: string;
  label: string;
  count: number;
}

export interface ActivityDay {
  day: string;
  reviews: number;
  correct: number;
}

export interface StreakDay {
  day: string;
  kanji: string;
  dayOfMonth: number;
  active: boolean;
  isToday: boolean;
}

export interface ProfileIdentity {
  id?: string;
  username: string;
  displayName: string | null;
  avatarEmoji: string;
  bio: string | null;
  createdAt: string;
  role: string;
  isPro: boolean;
  profilePublic: boolean;
}

export interface ProfileSnapshot {
  user: ProfileIdentity;
  rank: RankInfo;
  streak: {
    current: number;
    longest: number;
    daysStudied: number;
    week: StreakDay[];
  };
  counts: {
    learned: number;
    totalGrammar: number;
    reviews: number;
    reviewsToday: number;
    dueNow: number;
    dueLocked: number;
    unstarted: number;
    lockedTotal: number;
    avgScore: number;
    accuracy: number;
    bestDayReviews: number;
    lastStudyDay: string | null;
  };
  stages: Record<StageKey, number>;
  jlpt: JlptRow[];
  forecast: ForecastDay[];
  activity: ActivityDay[];
  badges: BadgeState[];
  recentBadges: { id: string; earnedAt: string }[];
}

const ACTIVITY_WINDOW = 91;
const FORECAST_DAYS = 14;

interface RawProfile {
  user: {
    id: string;
    username: string;
    displayName: string | null;
    avatarEmoji: string;
    bio: string | null;
    createdAt: Date;
    role: string;
    profilePublic: boolean;
    showOnLeaderboard: boolean;
    currentStreak: number;
    longestStreak: number;
    lastStudyDay: string | null;
    subscription: { status: string; currentPeriodEnd: Date | null } | null;
  };
  items: {
    interval: number;
    repetitions: number;
    nextReview: Date;
    createdAt: Date;
    updatedAt: Date;
    grammarPoint: { jlptLevel: number; order: number };
  }[];
  totalGrammar: number;

  unlockedTotal: number;
  fullAccess: boolean;
  totalByLevel: Record<number, number>;
  reviews: number;
  reviewsToday: number;
  recentScores: number[];
  activity: { day: string; reviews: number; correct: number }[];
  daysStudied: number;
  bestDayReviews: number;
  ownedBadges: { badgeId: string; earnedAt: Date }[];
}

const ACTIVE_STATUSES = new Set(["active", "trialing"]);

function computeFullAccess(u: {
  role: string;
  subscription: { status: string; currentPeriodEnd: Date | null } | null;
}): boolean {
  if (u.role === "ADMIN") return true;
  const s = u.subscription;
  return Boolean(
    s &&
      ACTIVE_STATUSES.has(s.status) &&
      (!s.currentPeriodEnd || s.currentPeriodEnd.getTime() >= Date.now())
  );
}

async function loadRaw(userId: string): Promise<RawProfile | null> {
  const today = dayKey();
  const startOfToday = fromDayKey(today);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      displayName: true,
      avatarEmoji: true,
      bio: true,
      createdAt: true,
      role: true,
      profilePublic: true,
      showOnLeaderboard: true,
      currentStreak: true,
      longestStreak: true,
      lastStudyDay: true,
      subscription: { select: { status: true, currentPeriodEnd: true } },
    },
  });
  if (!user) return null;

  const [
    items,
    totalGrammar,
    totalsRaw,
    reviews,
    reviewsToday,
    recent,
    activity,
    daysStudied,
    bestDay,
    ownedBadges,
  ] = await Promise.all([
      prisma.studyItem.findMany({
        where: { userId },
        select: {
          interval: true,
          repetitions: true,
          nextReview: true,
          createdAt: true,
          updatedAt: true,
          grammarPoint: { select: { jlptLevel: true, order: true } },
        },
      }),
      prisma.grammarPoint.count(),
      prisma.grammarPoint.groupBy({ by: ["jlptLevel"], _count: true }),
      prisma.review.count({ where: { userId } }),
      prisma.review.count({ where: { userId, reviewedAt: { gte: startOfToday } } }),
      prisma.review.findMany({
        where: { userId },
        orderBy: { reviewedAt: "desc" },
        take: 100,
        select: { score: true },
      }),
      prisma.dailyActivity.findMany({
        where: { userId, day: { gte: shiftDay(today, -(ACTIVITY_WINDOW - 1)) } },
        orderBy: { day: "asc" },
        select: { day: true, reviews: true, correct: true },
      }),
      prisma.dailyActivity.count({ where: { userId, reviews: { gt: 0 } } }),
      prisma.dailyActivity.aggregate({ where: { userId }, _max: { reviews: true } }),
      prisma.userBadge.findMany({
        where: { userId },
        orderBy: { earnedAt: "desc" },
        select: { badgeId: true, earnedAt: true },
      }),
    ]);

  const totalByLevel: Record<number, number> = {};
  for (const t of totalsRaw) totalByLevel[t.jlptLevel] = t._count;

  const fullAccess = computeFullAccess(user);
  const unlockedTotal = fullAccess
    ? totalGrammar
    : await prisma.grammarPoint.count({ where: { order: { lte: FREE_GRAMMAR_LIMIT } } });

  return {
    user,
    items,
    totalGrammar,
    unlockedTotal,
    fullAccess,
    totalByLevel,
    reviews,
    reviewsToday,
    recentScores: recent.map((r) => r.score),
    activity,
    daysStudied,
    bestDayReviews: bestDay._max.reviews ?? 0,
    ownedBadges,
  };
}

const EMPTY_STAGES: Record<StageKey, number> = {
  new: 0,
  relearning: 0,
  apprentice: 0,
  confirmed: 0,
  mastered: 0,
  anchored: 0,
};

interface Derived {
  stages: Record<StageKey, number>;
  learnedByLevel: Record<number, number>;
  masteredByLevel: Record<number, number>;
  xp: number;
  dueNow: number;
  dueLocked: number;
  unstarted: number;
  lockedTotal: number;
  forecast: ForecastDay[];
  daysStudied: number;
  bestDayReviews: number;
  accuracy: number;
}

function derive(raw: RawProfile): Derived {
  const stages: Record<StageKey, number> = { ...EMPTY_STAGES };
  const learnedByLevel: Record<number, number> = {};
  const masteredByLevel: Record<number, number> = {};
  const now = Date.now();
  const today = dayKey();

  let xp = 0;
  let dueNow = 0;
  let dueLocked = 0;
  let unlockedItems = 0;
  const buckets: Record<string, number> = {};

  for (const it of raw.items) {
    const stage = getStage({
      interval: it.interval,
      repetitions: it.repetitions,
      lapsed: it.updatedAt.getTime() !== it.createdAt.getTime(),
    });
    stages[stage.key] = (stages[stage.key] ?? 0) + 1;
    xp += STAGE_XP[stage.key];

    const lvl = it.grammarPoint.jlptLevel;
    learnedByLevel[lvl] = (learnedByLevel[lvl] ?? 0) + 1;
    if (stage.key === "mastered" || stage.key === "anchored") {
      masteredByLevel[lvl] = (masteredByLevel[lvl] ?? 0) + 1;
    }

    const unlocked = raw.fullAccess || it.grammarPoint.order <= FREE_GRAMMAR_LIMIT;
    if (unlocked) unlockedItems++;

    const due = it.nextReview.getTime();
    if (due <= now) {
      if (unlocked) dueNow++;
      else dueLocked++;
    } else if (unlocked) {
      const k = dayKey(it.nextReview);
      buckets[k] = (buckets[k] ?? 0) + 1;
    }
  }

  stages.new = Math.max(0, raw.totalGrammar - raw.items.length);

  const forecast: ForecastDay[] = [];
  for (let i = 0; i < FORECAST_DAYS; i++) {
    const day = shiftDay(today, i);
    const d = fromDayKey(day);
    forecast.push({
      day,
      label:
        i === 0
          ? "Auj."
          : i === 1
          ? "Dem."
          : `${WEEKDAY_KANJI[d.getDay()]} ${d.getDate()}`,
      count: (i === 0 ? dueNow : 0) + (buckets[day] ?? 0),
    });
  }

  const sample = raw.recentScores.length;
  const accuracy = sample > 0 ? raw.recentScores.filter((s) => s >= 3).length / sample : 0;

  xp += raw.reviews * XP_PER_REVIEW + raw.daysStudied * XP_PER_DAY_STUDIED;

  return {
    stages,
    learnedByLevel,
    masteredByLevel,
    xp,
    dueNow,
    dueLocked,
    unstarted: Math.max(0, raw.unlockedTotal - unlockedItems),
    lockedTotal: Math.max(0, raw.totalGrammar - raw.unlockedTotal),
    forecast,
    daysStudied: raw.daysStudied,
    bestDayReviews: raw.bestDayReviews,
    accuracy,
  };
}

export function effectiveStreak(lastStudyDay: string | null, stored: number): number {
  if (!lastStudyDay) return 0;
  const gap = daysBetween(lastStudyDay, dayKey());
  return gap <= 1 ? stored : 0;
}

function buildContext(raw: RawProfile, d: Derived, moment?: { hourOfDay: number; weekend: boolean }): BadgeContext {
  return {
    learned: raw.items.length,
    totalGrammar: raw.totalGrammar,
    reviews: raw.reviews,
    correctReviews: Math.round(d.accuracy * raw.recentScores.length),
    currentStreak: effectiveStreak(raw.user.lastStudyDay, raw.user.currentStreak),
    longestStreak: raw.user.longestStreak,
    daysStudied: d.daysStudied,
    bestDayReviews: d.bestDayReviews,
    stages: d.stages,
    learnedByLevel: d.learnedByLevel,
    masteredByLevel: d.masteredByLevel,
    totalByLevel: raw.totalByLevel,
    accuracy: d.accuracy,
    accuracySample: raw.recentScores.length,
    ...(moment ?? {}),
  };
}

const JLPT_ORDER = [5, 4, 3, 2, 1];

async function persistEarned(
  raw: RawProfile,
  moment?: { hourOfDay: number; weekend: boolean }
): Promise<string[]> {
  const d = derive(raw);
  const ctx = buildContext(raw, d, moment);
  const owned = new Set(raw.ownedBadges.map((b) => b.badgeId));
  const missing = earnedBadgeIds(ctx).filter((id) => !owned.has(id));
  if (missing.length === 0) return [];

  const earnedAt = new Date();
  try {
    await prisma.userBadge.createMany({
      data: missing.map((badgeId) => ({ userId: raw.user.id, badgeId, earnedAt })),
    });
  } catch {
    return [];
  }

  raw.ownedBadges = [...missing.map((badgeId) => ({ badgeId, earnedAt })), ...raw.ownedBadges];
  return missing;
}

export async function getProfileSnapshot(
  userId: string,
  { persist = true }: { persist?: boolean } = {}
): Promise<ProfileSnapshot | null> {
  const raw = await loadRaw(userId);
  if (!raw) return null;
  if (persist) await persistEarned(raw);
  return snapshotFrom(raw);
}

function snapshotFrom(raw: RawProfile): ProfileSnapshot {
  const d = derive(raw);
  const ctx = buildContext(raw, d);
  const today = dayKey();

  const activeDays = new Set(raw.activity.filter((a) => a.reviews > 0).map((a) => a.day));
  const week: StreakDay[] = [];
  for (let i = 6; i >= 0; i--) {
    const day = shiftDay(today, -i);
    const dt = fromDayKey(day);
    week.push({
      day,
      kanji: WEEKDAY_KANJI[dt.getDay()],
      dayOfMonth: dt.getDate(),
      active: activeDays.has(day),
      isToday: i === 0,
    });
  }

  const isPro = raw.fullAccess;

  const avgScore =
    raw.recentScores.length > 0
      ? raw.recentScores.reduce((s, v) => s + v, 0) / raw.recentScores.length
      : 0;

  const states = badgeStates(ctx, raw.ownedBadges);

  return {
    user: {
      id: raw.user.id,
      username: raw.user.username,
      displayName: raw.user.displayName,
      avatarEmoji: raw.user.avatarEmoji,
      bio: raw.user.bio,
      createdAt: raw.user.createdAt.toISOString(),
      role: raw.user.role,
      isPro,
      profilePublic: raw.user.profilePublic,
    },
    rank: rankFromXp(d.xp),
    streak: {
      current: ctx.currentStreak,
      longest: raw.user.longestStreak,
      daysStudied: d.daysStudied,
      week,
    },
    counts: {
      learned: raw.items.length,
      totalGrammar: raw.totalGrammar,
      reviews: raw.reviews,
      reviewsToday: raw.reviewsToday,
      dueNow: d.dueNow,
      dueLocked: d.dueLocked,
      unstarted: d.unstarted,
      lockedTotal: d.lockedTotal,
      avgScore: Math.round(avgScore * 10) / 10,
      accuracy: Math.round(d.accuracy * 100) / 100,
      bestDayReviews: d.bestDayReviews,
      lastStudyDay: raw.user.lastStudyDay,
    },
    stages: d.stages,
    jlpt: JLPT_ORDER.map((level) => ({
      level,
      label: `N${level}`,
      learned: d.learnedByLevel[level] ?? 0,
      mastered: d.masteredByLevel[level] ?? 0,
      total: raw.totalByLevel[level] ?? 0,
    })).filter((r) => r.total > 0),
    forecast: d.forecast,
    activity: raw.activity,
    badges: states,
    recentBadges: raw.ownedBadges.map((b) => ({
      id: b.badgeId,
      earnedAt: b.earnedAt.toISOString(),
    })),
  };
}

export async function recordActivity(
  userId: string,
  opts: { correct: boolean; learned?: number; at?: Date } = { correct: true }
): Promise<{ currentStreak: number; longestStreak: number; firstOfDay: boolean }> {
  const at = opts.at ?? new Date();
  const today = dayKey(at);

  return prisma.$transaction(async (tx) => {
    const existing = await tx.dailyActivity.findUnique({
      where: { userId_day: { userId, day: today } },
      select: { id: true },
    });

    await tx.dailyActivity.upsert({
      where: { userId_day: { userId, day: today } },
      create: {
        userId,
        day: today,
        reviews: 1,
        correct: opts.correct ? 1 : 0,
        learned: opts.learned ?? 0,
      },
      update: {
        reviews: { increment: 1 },
        correct: { increment: opts.correct ? 1 : 0 },
        ...(opts.learned ? { learned: { increment: opts.learned } } : {}),
      },
    });

    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { currentStreak: true, longestStreak: true, lastStudyDay: true },
    });
    if (!user) return { currentStreak: 0, longestStreak: 0, firstOfDay: false };

    if (user.lastStudyDay === today) {
      return {
        currentStreak: user.currentStreak,
        longestStreak: user.longestStreak,
        firstOfDay: !existing,
      };
    }

    const continues = user.lastStudyDay ? daysBetween(user.lastStudyDay, today) === 1 : false;
    const currentStreak = continues ? user.currentStreak + 1 : 1;
    const longestStreak = Math.max(user.longestStreak, currentStreak);

    await tx.user.update({
      where: { id: userId },
      data: { currentStreak, longestStreak, lastStudyDay: today },
    });

    return { currentStreak, longestStreak, firstOfDay: true };
  });
}

export async function recordLearned(userId: string, count: number, at: Date = new Date()) {
  if (count <= 0) return;
  const day = dayKey(at);
  await prisma.dailyActivity.upsert({
    where: { userId_day: { userId, day } },
    create: { userId, day, reviews: 0, correct: 0, learned: count },
    update: { learned: { increment: count } },
  });
}

export async function syncBadges(
  userId: string,
  moment?: { hourOfDay: number; weekend: boolean }
): Promise<{ id: string; name: string; kanji: string; description: string }[]> {
  const raw = await loadRaw(userId);
  if (!raw) return [];

  const missing = await persistEarned(raw, moment);

  return missing
    .map((id) => BADGES_BY_ID[id])
    .filter(Boolean)
    .map((b) => ({ id: b.id, name: b.name, kanji: b.kanji, description: b.description }));
}

export interface CommunityMember {
  username: string;
  displayName: string | null;
  avatarEmoji: string;
  bio: string | null;
  role: string;
  profilePublic: boolean;
  level: number;
  title: string;
  kanji: string;
  xp: number;
  learned: number;
  mastered: number;
  reviews: number;
  currentStreak: number;
  longestStreak: number;
  daysStudied: number;
  badges: number;
  lastStudyDay: string | null;
  joinedAt: string;
}

export async function getCommunity(): Promise<CommunityMember[]> {
  const users = await prisma.user.findMany({
    where: { showOnLeaderboard: true },
    select: {
      id: true,
      username: true,
      displayName: true,
      avatarEmoji: true,
      bio: true,
      role: true,
      profilePublic: true,
      currentStreak: true,
      longestStreak: true,
      lastStudyDay: true,
      createdAt: true,
    },
  });
  if (users.length === 0) return [];

  const ids = users.map((u) => u.id);

  const [items, reviewCounts, badgeCounts, activityRows] = await Promise.all([
    prisma.studyItem.findMany({
      where: { userId: { in: ids } },
      select: {
        userId: true,
        interval: true,
        repetitions: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.review.groupBy({ by: ["userId"], where: { userId: { in: ids } }, _count: true }),
    prisma.userBadge.groupBy({ by: ["userId"], where: { userId: { in: ids } }, _count: true }),
    prisma.dailyActivity.groupBy({
      by: ["userId"],
      where: { userId: { in: ids }, reviews: { gt: 0 } },
      _count: true,
    }),
  ]);

  const perUser = new Map<
    string,
    { learned: number; mastered: number; xp: number }
  >(ids.map((id) => [id, { learned: 0, mastered: 0, xp: 0 }]));

  for (const it of items) {
    const acc = perUser.get(it.userId);
    if (!acc) continue;
    const stage = getStage({
      interval: it.interval,
      repetitions: it.repetitions,
      lapsed: it.updatedAt.getTime() !== it.createdAt.getTime(),
    });
    acc.learned++;
    acc.xp += STAGE_XP[stage.key];
    if (stage.key === "mastered" || stage.key === "anchored") acc.mastered++;
  }

  const reviewsBy = new Map(reviewCounts.map((r) => [r.userId, r._count]));
  const badgesBy = new Map(badgeCounts.map((b) => [b.userId, b._count]));
  const daysBy = new Map(activityRows.map((a) => [a.userId, a._count]));

  return users
    .map((u) => {
      const acc = perUser.get(u.id)!;
      const reviews = reviewsBy.get(u.id) ?? 0;
      const daysStudied = daysBy.get(u.id) ?? 0;
      const xp = acc.xp + reviews * XP_PER_REVIEW + daysStudied * XP_PER_DAY_STUDIED;
      const rank = rankFromXp(xp);
      return {
        username: u.username,
        displayName: u.displayName,
        avatarEmoji: u.avatarEmoji,
        bio: u.profilePublic ? u.bio : null,
        role: u.role,
        profilePublic: u.profilePublic,
        level: rank.level,
        title: rank.title,
        kanji: rank.kanji,
        xp,
        learned: acc.learned,
        mastered: acc.mastered,
        reviews,
        currentStreak: effectiveStreak(u.lastStudyDay, u.currentStreak),
        longestStreak: u.longestStreak,
        daysStudied,
        badges: badgesBy.get(u.id) ?? 0,
        lastStudyDay: u.lastStudyDay,
        joinedAt: u.createdAt.toISOString(),
      };
    })
    .sort((a, b) => b.xp - a.xp);
}

export async function getPublicSnapshot(
  username: string,
  viewerId?: string
): Promise<{ status: "ok" | "introuvable" | "prive"; snapshot?: ProfileSnapshot }> {
  const user = await prisma.user.findUnique({
    where: { username },
    select: { id: true, profilePublic: true },
  });
  if (!user) return { status: "introuvable" };

  const own = Boolean(viewerId) && viewerId === user.id;
  if (!user.profilePublic && !own) return { status: "prive" };

  const snapshot = await getProfileSnapshot(user.id, { persist: own });
  if (!snapshot) return { status: "introuvable" };

  return {
    status: "ok",
    snapshot: own ? snapshot : { ...snapshot, user: { ...snapshot.user, id: undefined } },
  };
}
