import Stripe from "stripe";
import * as fs from "fs";
import * as path from "path";

function loadEnv(file: string) {
  const p = path.join(process.cwd(), file);
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, "utf-8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m || line.trim().startsWith("#")) continue;
    let val = m[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!(m[1] in process.env)) process.env[m[1]] = val;
  }
}
loadEnv(".env.local");
loadEnv(".env");

async function main() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    console.error("❌ STRIPE_SECRET_KEY manquant. Décommentez/ajoutez-le dans .env.local puis relancez.");
    process.exit(1);
  }

  const stripe = new Stripe(key);
  const amount = Number(process.env.STRIPE_SETUP_AMOUNT ?? 800);
  const currency = (process.env.STRIPE_SETUP_CURRENCY ?? "eur").toLowerCase();
  const productName = process.env.STRIPE_SETUP_PRODUCT ?? "日本語学習 Pro";
  const live = key.startsWith("sk_live_");

  console.log(`\n▶ Mode ${live ? "LIVE ⚠️ (encaissement réel)" : "test"} — création du produit…`);

  const product = await stripe.products.create({ name: productName });
  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: amount,
    currency,
    recurring: { interval: "month" },
  });

  console.log(`\n✅ Produit : ${product.id}`);
  console.log(`✅ Price   : ${price.id}  (${(amount / 100).toFixed(2)} ${currency.toUpperCase()} / mois)`);
  console.log(`\n➡️  Collez dans .env.local :`);
  console.log(`   STRIPE_PRICE_ID="${price.id}"`);
  console.log(`\nPuis, pour recevoir les webhooks en local :`);
  console.log(`   stripe listen --forward-to localhost:3000/api/webhooks/stripe`);
  console.log(`   (copiez le whsec_… affiché dans STRIPE_WEBHOOK_SECRET)\n`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
