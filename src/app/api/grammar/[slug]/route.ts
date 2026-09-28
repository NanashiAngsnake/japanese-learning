import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hasFullAccess, isUnlocked } from "@/lib/billing";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { slug } = await params;

  const point = await prisma.grammarPoint.findUnique({
    where: { slug },
    include: { examples: { orderBy: { order: "asc" } } },
  });

  if (!point) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const fullAccess = await hasFullAccess(session.user.id, session.user.role);

  if (!isUnlocked(point.order, fullAccess)) {
    return NextResponse.json({
      id: point.id,
      slug: point.slug,
      order: point.order,
      title: point.title,
      meaning: point.meaning,
      jlptLevel: point.jlptLevel,
      lesson: point.lesson,
      partOfSpeech: point.partOfSpeech,
      register: point.register,
      wordType: point.wordType,
      exampleCount: point.examples.length,
      locked: true,
      studyItem: null,
    });
  }

  const studyItem = await prisma.studyItem.findUnique({
    where: { userId_grammarPointId: { userId: session.user.id, grammarPointId: point.id } },
  });

  const { explanationMine, cautionMine, nuanceMine, ...rest } = point;
  const ownWriteup = Boolean(explanationMine);

  return NextResponse.json({
    ...rest,
    explanation: explanationMine ?? point.explanation,
    caution: ownWriteup ? cautionMine : point.caution,
    nuance: ownWriteup ? nuanceMine : point.nuance,
    ownWriteup,
    locked: false,
    studyItem: studyItem
      ? { ...studyItem, lapsed: studyItem.updatedAt.getTime() !== studyItem.createdAt.getTime() }
      : null,
  });
}
