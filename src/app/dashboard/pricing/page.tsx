"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Lock, Sparkles, Crown, Loader2, ExternalLink, AlertCircle } from "lucide-react";

interface SubInfo {
  active: boolean;
  isAdmin: boolean;
  status: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  mode: "mock" | "test" | "live";
  freeLimit: number;
  priceLabel: string;
}

export default function PricingPage() {
  const [sub, setSub] = useState<SubInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/subscription");
    setSub(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
    const q = new URLSearchParams(window.location.search);
    if (q.get("success")) setNotice("🎉 Abonnement activé — tout le catalogue est débloqué !");
    else if (q.get("canceled")) setNotice("Paiement annulé. Vous pouvez réessayer quand vous voulez.");
  }, []);

  async function subscribe() {
    setWorking(true);
    const res = await fetch("/api/billing/checkout", { method: "POST" });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    else { setNotice(data.error ?? "Erreur lors du paiement"); setWorking(false); }
  }

  async function managePortal() {
    setWorking(true);
    const res = await fetch("/api/billing/portal", { method: "POST" });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    else { setNotice(data.error ?? "Portail indisponible"); setWorking(false); }
  }

  async function cancelMock() {
    setWorking(true);
    await fetch("/api/billing/mock", { method: "DELETE" });
    await load();
    setWorking(false);
    setNotice("Abonnement (démo) annulé.");
  }

  const active = sub?.active ?? false;
  const freeLimit = sub?.freeLimit ?? 20;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-fg mb-2">Abonnement</h1>
        <p className="text-muted">Débloquez les 979 points de grammaire et les révisions illimitées.</p>
      </div>

      {notice && (
        <div className="mb-6 p-4 rounded-xl bg-accent/10 border border-accent/30 text-sm text-fg text-center">
          {notice}
        </div>
      )}

      {sub && sub.mode !== "live" && (
        <div className="mb-6 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-xs text-yellow-300 flex items-center gap-2 justify-center text-center">
          <AlertCircle size={14} className="shrink-0" />
          {sub.mode === "mock"
            ? "Mode démo — aucun paiement réel. Ajoutez vos clés Stripe pour encaisser."
            : "Mode test Stripe — carte de test : 4242 4242 4242 4242."}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-dim" /></div>
      ) : active ? (
        <div className="bg-gradient-to-br from-green-500/15 to-surface rounded-2xl p-8 border border-green-500/30 text-center">
          <div className="w-16 h-16 rounded-2xl bg-green-500/20 border border-green-500/40 flex items-center justify-center mx-auto mb-4">
            <Crown size={28} className="text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-fg mb-1">
            {sub?.isAdmin ? "Accès administrateur" : "Abonnement Pro actif"}
          </h2>
          <p className="text-muted mb-6">
            {sub?.isAdmin
              ? "Vous avez accès à l'intégralité du catalogue."
              : sub?.currentPeriodEnd
                ? `Renouvellement le ${new Date(sub.currentPeriodEnd).toLocaleDateString("fr-FR")}${sub?.cancelAtPeriodEnd ? " · annulation prévue" : ""}`
                : "Accès complet débloqué."}
          </p>
          {!sub?.isAdmin && (
            sub?.mode === "mock" ? (
              <button onClick={cancelMock} disabled={working}
                className="px-6 py-3 bg-line/[0.10] hover:bg-line/[0.15] disabled:opacity-50 text-fg rounded-xl text-sm transition-all">
                {working ? "…" : "Annuler (démo)"}
              </button>
            ) : (
              <button onClick={managePortal} disabled={working}
                className="inline-flex items-center gap-2 px-6 py-3 bg-line/[0.10] hover:bg-line/[0.15] disabled:opacity-50 text-fg rounded-xl text-sm transition-all">
                {working ? <Loader2 size={16} className="animate-spin" /> : <ExternalLink size={16} />}
                Gérer mon abonnement
              </button>
            )
          )}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-5">
          <div className="bg-surface rounded-2xl p-6 border border-line/[0.10] flex flex-col">
            <div className="text-sm text-muted mb-1">Gratuit</div>
            <div className="text-3xl font-bold text-fg mb-5">0 €</div>
            <ul className="space-y-2.5 text-sm text-muted mb-6 flex-1">
              <li className="flex gap-2"><Check size={16} className="text-green-400 shrink-0" /> Les {freeLimit} premiers points (N5)</li>
              <li className="flex gap-2"><Check size={16} className="text-green-400 shrink-0" /> Révisions SRS sur ces points</li>
              <li className="flex gap-2"><Check size={16} className="text-green-400 shrink-0" /> Suivi de progression</li>
              <li className="flex gap-2 text-dim"><Lock size={16} className="shrink-0" /> Reste du catalogue verrouillé</li>
            </ul>
            <div className="text-center text-xs text-dim py-2.5 border border-line/[0.05] rounded-xl">Votre offre actuelle</div>
          </div>

          <div className="bg-gradient-to-br from-accent/15 to-surface rounded-2xl p-6 border border-accent/40 relative flex flex-col">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-accent text-white text-xs font-semibold">
              Recommandé
            </div>
            <div className="text-sm text-accent font-medium mb-1 flex items-center gap-1.5"><Sparkles size={14} /> Pro</div>
            <div className="text-3xl font-bold text-fg mb-5">{sub?.priceLabel}</div>
            <ul className="space-y-2.5 text-sm text-muted mb-6 flex-1">
              <li className="flex gap-2"><Check size={16} className="text-green-400 shrink-0" /> Les 979 points (N5 → N1)</li>
              <li className="flex gap-2"><Check size={16} className="text-green-400 shrink-0" /> 16 600+ exemples avec audio H/F</li>
              <li className="flex gap-2"><Check size={16} className="text-green-400 shrink-0" /> Révisions SRS illimitées</li>
              <li className="flex gap-2"><Check size={16} className="text-green-400 shrink-0" /> Statistiques détaillées</li>
            </ul>
            <button onClick={subscribe} disabled={working}
              className="w-full py-3 bg-accent hover:bg-accent-deep disabled:opacity-50 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 glow-red">
              {working ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
              Passer à Pro
            </button>
          </div>
        </div>
      )}

      <div className="text-center mt-8">
        <Link href="/dashboard/grammar" className="text-sm text-dim hover:text-fg transition-colors">
          ← Retour à la grammaire
        </Link>
      </div>
    </div>
  );
}
