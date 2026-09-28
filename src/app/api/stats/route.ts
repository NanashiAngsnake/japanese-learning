import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getStage } from "@/lib/srs";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const userId = session.user.id;

  const [
    totalStudied,
    dueCount,
    reviewsToday,
    recentReviews,
    levelBreakdown,
  ] = await Promise.all([
    prisma.studyItem.count({ where: { userId } }),
    prisma.studyItem.count({ where: { userId, nextReview: { lte: new Date() } } }),
    prisma.review.count({
      where: {
        userId,
        reviewedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      },
    }),
    prisma.review.findMany({
      where: { userId },
      orderBy: { reviewedAt: "desc" },
      take: 30,
      select: { score: true, reviewedAt: true },
    }),
    prisma.studyItem.groupBy({
      by: ["grammarPointId"],
      where: { userId },
      _count: true,
    }),
  ]);

  const grammarLevels = await prisma.grammarPoint.findMany({
    where: {
      studyItems: { some: { userId } },
    },
    select: { jlptLevel: true },
  });

  const byLevel: Record<number, number> = {};
  grammarLevels.forEach((g) => {
    byLevel[g.jlptLevel] = (byLevel[g.jlptLevel] ?? 0) + 1;
  });

  const totalsRaw = await prisma.grammarPoint.groupBy({
    by: ["jlptLevel"],
    _count: true,
  });
  const totalByLevel: Record<number, number> = {};
  totalsRaw.forEach((t) => { totalByLevel[t.jlptLevel] = t._count; });

  const totalGrammar = await prisma.grammarPoint.count();

  const allItems = await prisma.studyItem.findMany({
    where: { userId },
    select: { interval: true, repetitions: true, createdAt: true, updatedAt: true },
  });
  const byStage: Record<string, number> = {};
  for (const it of allItems) {
    const k = getStage({
      ...it,
      lapsed: it.updatedAt.getTime() !== it.createdAt.getTime(),
    }).key;
    byStage[k] = (byStage[k] ?? 0) + 1;
  }
  byStage.new = totalGrammar - allItems.length;

  const avgScore =
    recentReviews.length > 0
      ? recentReviews.reduce((s, r) => s + r.score, 0) / recentReviews.length
      : 0;

  return NextResponse.json({
    totalStudied,
    dueCount,
    reviewsToday,
    avgScore: Math.round(avgScore * 10) / 10,
    totalGrammar,
    byLevel,
    totalByLevel,
    byStage,
    recentReviews,
  });
}
