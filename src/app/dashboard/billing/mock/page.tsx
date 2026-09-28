"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, CreditCard, ShieldCheck, Lock } from "lucide-react";

export default function MockCheckoutPage() {
  const router = useRouter();
  const [working, setWorking] = useState(false);

  async function pay() {
    setWorking(true);
    await fetch("/api/billing/mock", { method: "POST" });
    router.push("/dashboard/pricing?success=1");
  }

  return (
    <div className="max-w-md mx-auto py-8">
      <div className="bg-surface rounded-2xl border border-line/[0.10] overflow-hidden">
        <div className="p-4 border-b border-line/[0.08] flex items-center gap-2 text-yellow-300 text-xs bg-yellow-500/5">
          <Lock size={14} className="shrink-0" />
          Paiement simulé — démonstration, aucun débit réel.
        </div>
        <div className="p-6">
          <div className="flex items-center gap-2 text-muted text-sm mb-4">
            <CreditCard size={16} /> Abonnement
          </div>
          <div className="flex items-baseline justify-between mb-6">
            <span className="text-fg font-semibold japanese">日本語学習 Pro</span>
            <span className="text-2xl font-bold text-fg">
              8,00 €<span className="text-sm text-dim font-normal"> / mois</span>
            </span>
          </div>

          <div className="space-y-3 mb-6 opacity-60 pointer-events-none select-none">
            <div className="h-11 rounded-lg bg-line/[0.05] border border-line/[0.10] flex items-center px-3 text-dim text-sm">
              4242 4242 4242 4242
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="h-11 rounded-lg bg-line/[0.05] border border-line/[0.10] flex items-center px-3 text-dim text-sm">12 / 34</div>
              <div className="h-11 rounded-lg bg-line/[0.05] border border-line/[0.10] flex items-center px-3 text-dim text-sm">CVC 123</div>
            </div>
          </div>

          <button
            onClick={pay}
            disabled={working}
            className="w-full py-3 bg-accent hover:bg-accent-deep disabled:opacity-50 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
          >
            {working ? <Loader2 size={18} className="animate-spin" /> : <ShieldCheck size={18} />}
            {working ? "Traitement…" : "Payer 8,00 € (démo)"}
          </button>
          <Link
            href="/dashboard/pricing?canceled=1"
            className="block text-center text-sm text-dim hover:text-fg mt-4 transition-colors"
          >
            Annuler
          </Link>
        </div>
      </div>
    </div>
  );
}
