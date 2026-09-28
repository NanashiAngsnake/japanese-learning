import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hasFullAccess, isUnlocked } from "@/lib/billing";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const level = searchParams.get("level");
  const search = searchParams.get("search");
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "20");

  const where = {
    ...(level ? { jlptLevel: parseInt(level) } : {}),
    ...(search
      ? {
          OR: [
            { title: { contains: search } },
            { meaning: { contains: search } },
          ],
        }
      : {}),
  };

  const fullAccess = await hasFullAccess(session.user.id, session.user.role);

  const [points, total, studiedInFilter] = await Promise.all([
    prisma.grammarPoint.findMany({
      where,
      select: {
        id: true,
        title: true,
        slug: true,
        meaning: true,
        jlptLevel: true,
        lesson: true,
        order: true,
        examples: { select: { japanese: true, english: true }, take: 1 },
      },
      orderBy: [{ order: "asc" }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.grammarPoint.count({ where }),
    prisma.studyItem.count({ where: { userId: session.user.id, grammarPoint: where } }),
  ]);

  const userStudyItems = await prisma.studyItem.findMany({
    where: { userId: session.user.id },
    select: {
      grammarPointId: true, nextReview: true,
      repetitions: true, interval: true,
      createdAt: true, updatedAt: true,
    },
  });

  const studyMap = new Map(userStudyItems.map((s) => [s.grammarPointId, s]));

  const enriched = points.map((p) => {
    const locked = !isUnlocked(p.order, fullAccess);
    const item = studyMap.get(p.id);
    return {
      ...p,
      examples: locked ? [] : p.examples,
      locked,
      srs: item
        ? {
            interval: item.interval,
            repetitions: item.repetitions,
            lapsed: item.updatedAt.getTime() !== item.createdAt.getTime(),
          }
        : null,
      studyStatus: item
        ? new Date(item.nextReview) <= new Date()
          ? "review"
          : "learned"
        : "new",
    };
  });

  return NextResponse.json({ points: enriched, total, studiedInFilter, page, limit });
}
