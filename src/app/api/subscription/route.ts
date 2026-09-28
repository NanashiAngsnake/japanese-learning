import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  hasActiveSubscription,
  billingMode,
  FREE_GRAMMAR_LIMIT,
  PRO_PRICE_LABEL,
} from "@/lib/billing";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const userId = session.user.id;
  const isAdmin = session.user.role === "ADMIN";
  const sub = await prisma.subscription.findUnique({ where: { userId } });
  const active = isAdmin || (await hasActiveSubscription(userId));

  return NextResponse.json({
    active,
    isAdmin,
    status: sub?.status ?? "inactive",
    plan: sub?.plan ?? null,
    currentPeriodEnd: sub?.currentPeriodEnd ?? null,
    cancelAtPeriodEnd: sub?.cancelAtPeriodEnd ?? false,
    mode: billingMode(),
    freeLimit: FREE_GRAMMAR_LIMIT,
    priceLabel: PRO_PRICE_LABEL,
  });
}
