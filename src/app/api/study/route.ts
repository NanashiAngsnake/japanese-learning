import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hasFullAccess, isUnlocked } from "@/lib/billing";
import { recordLearned } from "@/lib/profile";

const MAX_BULK = 500;

async function logLearned(userId: string, count: number) {
  try {
    await recordLearned(userId, count);
  } catch (err) {
    console.error("[study] journal des ajouts :", err);
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const userId = session.user.id;
  const fullAccess = await hasFullAccess(userId, session.user.role);

  const body = await req.json().catch(() => ({}));
  const { grammarPointId, grammarPointIds, level, lesson, limit } = body;

  if (grammarPointId) {
    const gp = await prisma.grammarPoint.findUnique({
      where: { id: grammarPointId },
      select: { id: true, order: true },
    });
    if (!gp) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
    if (!isUnlocked(gp.order, fullAccess)) {
      return NextResponse.json(
        { error: "Point verrouillé — abonnement requis", locked: true },
        { status: 403 }
      );
    }

    const exists = await prisma.studyItem.findUnique({
      where: { userId_grammarPointId: { userId, grammarPointId } },
    });
    if (exists) return NextResponse.json({ added: 0, item: exists });

    const item = await prisma.studyItem.create({
      data: { userId, grammarPointId, nextReview: new Date() },
    });
    await logLearned(userId, 1);
    return NextResponse.json({ added: 1, item }, { status: 201 });
  }

  let candidates: { id: string; order: number }[] = [];

  if (Array.isArray(grammarPointIds) && grammarPointIds.length) {
    candidates = await prisma.grammarPoint.findMany({
      where: { id: { in: grammarPointIds.slice(0, MAX_BULK) } },
      select: { id: true, order: true },
    });
  } else if (level !== undefined || lesson !== undefined) {
    candidates = await prisma.grammarPoint.findMany({
      where: {
        ...(level !== undefined ? { jlptLevel: Number(level) } : {}),
        ...(lesson !== undefined ? { lesson: Number(lesson) } : {}),
      },
      orderBy: [{ order: "asc" }],
      take: Math.min(Number(limit) || MAX_BULK, MAX_BULK),
      select: { id: true, order: true },
    });
  } else {
    return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
  }

  const unlocked = candidates.filter((c) => isUnlocked(c.order, fullAccess));
  const lockedCount = candidates.length - unlocked.length;
  const ids = unlocked.map((c) => c.id);

  if (ids.length === 0) {
    return NextResponse.json({ added: 0, locked: lockedCount > 0, lockedCount });
  }

  const already = await prisma.studyItem.findMany({
    where: { userId, grammarPointId: { in: ids } },
    select: { grammarPointId: true },
  });
  const alreadySet = new Set(already.map((a) => a.grammarPointId));
  const toAdd = ids.filter((id) => !alreadySet.has(id));

  if (toAdd.length === 0) return NextResponse.json({ added: 0, lockedCount });

  const now = new Date();
  await prisma.studyItem.createMany({
    data: toAdd.map((id) => ({ userId, grammarPointId: id, nextReview: now })),
  });
  await logLearned(userId, toAdd.length);

  return NextResponse.json({ added: toAdd.length, lockedCount }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const userId = session.user.id;

  const body = await req.json().catch(() => ({}));
  const { grammarPointId, grammarPointIds } = body;

  const ids: string[] = grammarPointId
    ? [grammarPointId]
    : Array.isArray(grammarPointIds)
    ? grammarPointIds
    : [];

  if (ids.length === 0) return NextResponse.json({ error: "grammarPointId requis" }, { status: 400 });

  const res = await prisma.studyItem.deleteMany({
    where: { userId, grammarPointId: { in: ids } },
  });

  return NextResponse.json({ removed: res.count });
}
