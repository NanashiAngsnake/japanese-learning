import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/billing";
import type Stripe from "stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function periodEnd(sub: Stripe.Subscription): Date | null {
  const anySub = sub as unknown as {
    current_period_end?: number;
    items?: { data?: { current_period_end?: number }[] };
  };
  const unix = anySub.current_period_end ?? anySub.items?.data?.[0]?.current_period_end;
  return unix ? new Date(unix * 1000) : null;
}

async function syncSubscription(customerId: string, sub: Stripe.Subscription) {
  const byCustomer = await prisma.user.findFirst({ where: { stripeCustomerId: customerId } });
  const userId = (sub.metadata?.userId as string | undefined) ?? byCustomer?.id;
  if (!userId) return;

  await prisma.user
    .update({ where: { id: userId }, data: { stripeCustomerId: customerId } })
    .catch(() => {});

  const data = {
    status: sub.status,
    plan: "pro",
    stripeSubscriptionId: sub.id,
    stripePriceId: sub.items.data[0]?.price.id ?? null,
    currentPeriodEnd: periodEnd(sub),
    cancelAtPeriodEnd: sub.cancel_at_period_end ?? false,
  };

  await prisma.subscription.upsert({
    where: { userId },
    create: { userId, ...data },
    update: data,
  });
}

export async function POST(req: NextRequest) {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !webhookSecret) {
    return NextResponse.json({ error: "Webhook Stripe non configuré" }, { status: 400 });
  }

  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "Signature manquante" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    return NextResponse.json(
      { error: `Signature invalide : ${(err as Error).message}` },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const cs = event.data.object as Stripe.Checkout.Session;
        const customerId = typeof cs.customer === "string" ? cs.customer : cs.customer?.id;
        if (cs.subscription && customerId) {
          const subId = typeof cs.subscription === "string" ? cs.subscription : cs.subscription.id;
          const sub = await stripe.subscriptions.retrieve(subId);
          const userId = (cs.metadata?.userId as string | undefined) ?? cs.client_reference_id ?? undefined;
          if (userId && !sub.metadata?.userId) sub.metadata = { ...sub.metadata, userId };
          await syncSubscription(customerId, sub);
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
        await syncSubscription(customerId, sub);
        break;
      }
    }
  } catch (err) {
    console.error("Erreur webhook Stripe:", err);
    return NextResponse.json({ error: "Erreur de traitement" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
