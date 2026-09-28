import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStripe, isStripeConfigured } from "@/lib/billing";

const appUrl = () => process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export async function POST() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const userId = session.user.id;

  const stripe = getStripe();

  if (!stripe || !isStripeConfigured()) {
    return NextResponse.json({ url: `${appUrl()}/dashboard/billing/mock`, mock: true });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });

  let customerId = user.stripeCustomerId ?? undefined;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { userId },
    });
    customerId = customer.id;
    await prisma.user.update({ where: { id: userId }, data: { stripeCustomerId: customerId } });
  }

  const checkout = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: process.env.STRIPE_PRICE_ID!, quantity: 1 }],
    client_reference_id: userId,
    metadata: { userId },
    subscription_data: { metadata: { userId } },
    allow_promotion_codes: true,
    success_url: `${appUrl()}/dashboard/pricing?success=1`,
    cancel_url: `${appUrl()}/dashboard/pricing?canceled=1`,
  });

  return NextResponse.json({ url: checkout.url });
}
