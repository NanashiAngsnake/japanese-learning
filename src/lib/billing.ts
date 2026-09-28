import Stripe from "stripe";
import { prisma } from "@/lib/prisma";

export const FREE_GRAMMAR_LIMIT = Number(process.env.FREE_GRAMMAR_LIMIT ?? 20);

export const PRO_PRICE_LABEL = process.env.NEXT_PUBLIC_PRO_PRICE_LABEL ?? "8 € / mois";

let _stripe: Stripe | null | undefined;

export function getStripe(): Stripe | null {
  if (_stripe !== undefined) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  _stripe = key ? new Stripe(key) : null;
  return _stripe;
}

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_ID);
}

export function isStripeLive(): boolean {
  return (process.env.STRIPE_SECRET_KEY ?? "").startsWith("sk_live_");
}

export function billingMode(): "mock" | "test" | "live" {
  if (!isStripeConfigured()) return "mock";
  return isStripeLive() ? "live" : "test";
}

const ACTIVE_STATUSES = new Set(["active", "trialing"]);

export async function hasActiveSubscription(userId: string): Promise<boolean> {
  const sub = await prisma.subscription.findUnique({ where: { userId } });
  if (!sub || !ACTIVE_STATUSES.has(sub.status)) return false;
  if (sub.currentPeriodEnd && sub.currentPeriodEnd.getTime() < Date.now()) return false;
  return true;
}

export async function hasFullAccess(userId: string, role?: string): Promise<boolean> {
  if (role === "ADMIN") return true;
  return hasActiveSubscription(userId);
}

export function isUnlocked(order: number, fullAccess: boolean): boolean {
  return fullAccess || order <= FREE_GRAMMAR_LIMIT;
}
