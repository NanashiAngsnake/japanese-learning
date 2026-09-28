import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isStripeConfigured } from "@/lib/billing";

function mockAllowed(): boolean {
  return !isStripeConfigured() || process.env.ALLOW_MOCK_BILLING === "true";
}

export async function POST() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  if (!mockAllowed()) {
    return NextResponse.json({ error: "Mode démo désactivé (Stripe configuré)" }, { status: 403 });
  }

  const userId = session.user.id;
  const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await prisma.subscription.upsert({
    where: { userId },
    create: {
      userId,
      status: "active",
      plan: "pro",
      stripePriceId: "mock_demo",
      currentPeriodEnd: periodEnd,
    },
    update: {
      status: "active",
      plan: "pro",
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: false,
    },
  });

  return NextResponse.json({ ok: true, mock: true });
}

export async function DELETE() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  if (!mockAllowed()) {
    return NextResponse.json({ error: "Mode démo désactivé" }, { status: 403 });
  }

  await prisma.subscription.updateMany({
    where: { userId: session.user.id },
    data: { status: "canceled", cancelAtPeriodEnd: true },
  });

  return NextResponse.json({ ok: true, mock: true });
}
