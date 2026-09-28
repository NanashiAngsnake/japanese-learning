import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fetchBunproProgress, srsFromStreak } from "@/lib/bunpro";
import { hasFullAccess, isUnlocked } from "@/lib/billing";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const token = new URL(req.url).searchParams.get("token") ?? "";
  const r = await fetchBunproProgress(token);

  return NextResponse.json({
    ok: r.ok,
    path: r.path ?? null,
    found: r.items.length,
    error: r.error ?? null,
    sample: r.sample ? JSON.stringify(r.sample).slice(0, 400) : null,
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const userId = session.user.id;

  const { token, overwrite } = await req.json().catch(() => ({ token: "" }));
  const r = await fetchBunproProgress(String(token ?? ""));
  if (!r.ok) return NextResponse.json({ error: r.error ?? "Échec" }, { status: 400 });

  const fullAccess = await hasFullAccess(userId, session.user.role);

  const points = await prisma.grammarPoint.findMany({
    where: { bunproId: { in: r.items.map((i) => i.bunproId) } },
    select: { id: true, bunproId: true, order: true },
  });
  const byBunproId = new Map(points.map((p) => [p.bunproId!, p]));

  const existing = await prisma.studyItem.findMany({
    where: { userId },
    select: { grammarPointId: true },
  });
  const already = new Set(existing.map((e) => e.grammarPointId));

  let created = 0, updated = 0, skippedLocked = 0, unmatched = 0;

  for (const item of r.items) {
    const gp = byBunproId.get(item.bunproId);
    if (!gp) { unmatched++; continue; }
    if (!isUnlocked(gp.order, fullAccess)) { skippedLocked++; continue; }

    const card = srsFromStreak(item.streak);
    const data = {
      easeFactor: card.easeFactor,
      interval: card.interval,
      repetitions: card.repetitions,
      streak: card.streak,
      nextReview: card.nextReview,
    };

    if (already.has(gp.id)) {
      if (!overwrite) continue;
      await prisma.studyItem.update({ where: { userId_grammarPointId: { userId, grammarPointId: gp.id } }, data });
      updated++;
    } else {
      await prisma.studyItem.create({ data: { userId, grammarPointId: gp.id, ...data } });
      created++;
    }
  }

  await prisma.user.update({ where: { id: userId }, data: { bunproToken: String(token) } });

  return NextResponse.json({
    ok: true,
    source: r.path,
    received: r.items.length,
    created,
    updated,
    skippedLocked,
    unmatched,
  });
}

export async function DELETE() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  await prisma.user.update({ where: { id: session.user.id }, data: { bunproToken: null } });
  return NextResponse.json({ ok: true });
}
