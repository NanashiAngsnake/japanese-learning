import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { calculateSRS, capUntilProven, intervalToDate } from "@/lib/srs";
import { hasFullAccess, FREE_GRAMMAR_LIMIT } from "@/lib/billing";
import { recordActivity, syncBadges } from "@/lib/profile";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { dailyReviewLimit: true, reviewOrder: true },
  });

  const limit = user?.dailyReviewLimit ?? 50;
  const order = user?.reviewOrder ?? "due";

  const fullAccess = await hasFullAccess(session.user.id, session.user.role);

  const items = await prisma.studyItem.findMany({
    where: {
      userId: session.user.id,
      nextReview: { lte: new Date() },
      ...(fullAccess ? {} : { grammarPoint: { order: { lte: FREE_GRAMMAR_LIMIT } } }),
    },
    include: {
      grammarPoint: {
        include: {
          examples: {
            where: { verified: true },
            orderBy: { order: "asc" },
          },
        },
      },
    },
    orderBy:
      order === "level"
        ? [{ grammarPoint: { order: "asc" } }]
        : [{ nextReview: "asc" }],
    take: limit,
  });

  return NextResponse.json(order === "random" ? shuffle(items) : items);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { studyItemId, score, exampleId } = await req.json();

  if (typeof studyItemId !== "string" || studyItemId.length === 0) {
    return NextResponse.json(
      { error: "L'identifiant de la carte est requis" },
      { status: 400 }
    );
  }
  if (!Number.isInteger(score) || score < 0 || score > 5) {
    return NextResponse.json(
      { error: "Le score doit être un entier compris entre 0 et 5" },
      { status: 400 }
    );
  }

  const item = await prisma.studyItem.findUnique({
    where: { id: studyItemId, userId: session.user.id },
  });

  if (!item) return NextResponse.json({ error: "Item introuvable" }, { status: 404 });

  const result = calculateSRS(item, score);

  const passed = await prisma.review.findMany({
    where: { studyItemId, score: { gte: 3 }, exampleId: { not: null } },
    select: { exampleId: true },
    distinct: ["exampleId"],
  });
  const distinctPassed = new Set(passed.map((r) => r.exampleId));
  if (result.passed && exampleId) distinctPassed.add(exampleId);
  const interval = capUntilProven(result.interval, distinctPassed.size);

  const [updated] = await prisma.$transaction([
    prisma.studyItem.update({
      where: { id: studyItemId },
      data: {
        easeFactor: result.easeFactor,
        interval,
        repetitions: result.repetitions,
        nextReview: intervalToDate(interval),
        streak: result.streak,
        totalReviews: { increment: 1 },
      },
    }),
    prisma.review.create({
      data: { userId: session.user.id, studyItemId, score, exampleId: exampleId ?? null },
    }),
  ]);

  let streak = { current: 0, longest: 0 };
  let newBadges: { id: string; name: string; kanji: string; description: string }[] = [];

  try {
    const now = new Date();
    const activity = await recordActivity(session.user.id, { correct: score >= 3 });
    streak = { current: activity.currentStreak, longest: activity.longestStreak };

    newBadges = await syncBadges(session.user.id, {
      hourOfDay: now.getHours(),
      weekend: [0, 6].includes(now.getDay()),
    });
  } catch (err) {
    console.error("[review] assiduité / badges :", err);
  }

  return NextResponse.json({ ...updated, streak, newBadges });
}
