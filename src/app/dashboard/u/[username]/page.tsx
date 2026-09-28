"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, CalendarDays, Lock, UserX } from "lucide-react";
import { MedalCard } from "@/components/profile/Medal";
import ProfileCard from "@/components/profile/ProfileCard";
import StageTiles from "@/components/profile/StageTiles";
import { ForecastPanel, ActivityPanel } from "@/components/profile/Insights";
import type { ProfileSnapshot } from "@/lib/profile";

type Etat =
  | { kind: "chargement" }
  | { kind: "ok"; snapshot: ProfileSnapshot }
  | { kind: "introuvable" }
  | { kind: "prive" }
  | { kind: "erreur" };

function RetourCommunaute({ className }: { className?: string }) {
  return (
    <Link
      href="/dashboard/community"
      className={className ?? "inline-flex items-center gap-1.5 text-sm text-dim hover:text-fg transition-colors"}
    >
      <ArrowLeft size={15} />
      Communauté
    </Link>
  );
}

function EcranMessage({
  icone: Icone,
  titre,
  detail,
}: {
  icone: React.ElementType;
  titre: string;
  detail: string;
}) {
  return (
    <div className="max-w-2xl mx-auto animate-fade-up">
      <RetourCommunaute />
      <div className="surface p-10 mt-5 text-center">
        <div className="w-14 h-14 rounded-full bg-line/[0.05] border border-line/[0.08] flex items-center justify-center mx-auto mb-4">
          <Icone size={22} className="text-dim" />
        </div>
        <h1 className="text-lg font-bold text-fg">{titre}</h1>
        <p className="text-dim text-sm mt-1.5 max-w-sm mx-auto leading-relaxed">{detail}</p>
        <Link href="/dashboard/community" className="btn btn-ghost mt-6">
          <ArrowLeft size={15} />
          Retour à la communauté
        </Link>
      </div>
    </div>
  );
}

export default function MemberProfilePage() {
  const params = useParams();
  const brut = params?.username;
  const username = decodeURIComponent(
    typeof brut === "string" ? brut : Array.isArray(brut) ? brut[0] ?? "" : ""
  );

  const [etat, setEtat] = useState<Etat>({ kind: "chargement" });

  useEffect(() => {
    if (!username) {
      setEtat({ kind: "introuvable" });
      return;
    }
    let annule = false;
    setEtat({ kind: "chargement" });

    (async () => {
      try {
        const res = await fetch(`/api/profile/${encodeURIComponent(username)}`);
        if (annule) return;
        if (res.status === 404) return setEtat({ kind: "introuvable" });
        if (res.status === 403) return setEtat({ kind: "prive" });
        if (!res.ok) return setEtat({ kind: "erreur" });
        const data = (await res.json()) as { snapshot?: ProfileSnapshot };
        if (annule) return;
        if (!data.snapshot) return setEtat({ kind: "erreur" });
        setEtat({ kind: "ok", snapshot: data.snapshot });
      } catch {
        if (!annule) setEtat({ kind: "erreur" });
      }
    })();

    return () => {
      annule = true;
    };
  }, [username]);

  if (etat.kind === "chargement") {
    return (
      <div className="max-w-6xl mx-auto space-y-5">
        <div className="skeleton h-5 w-32 rounded" />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 lg:order-1 space-y-5">
            <div className="skeleton h-8 w-56 rounded-lg" />
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="skeleton h-24 rounded-[14px]" />
              ))}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="skeleton h-48 rounded-[14px]" />
              <div className="skeleton h-48 rounded-[14px]" />
            </div>
          </div>
          <div className="lg:order-2">
            <div className="skeleton h-[560px] rounded-[20px]" />
          </div>
        </div>
      </div>
    );
  }

  if (etat.kind === "introuvable") {
    return (
      <EcranMessage
        icone={UserX}
        titre="Ce membre n'existe pas"
        detail={`Aucun compte ne porte le pseudo « ${username} ». Il a peut-être été renommé depuis.`}
      />
    );
  }

  if (etat.kind === "prive") {
    return (
      <EcranMessage
        icone={Lock}
        titre="Ce profil est privé"
        detail="Ce membre figure au classement mais garde le détail de sa progression pour lui."
      />
    );
  }

  if (etat.kind === "erreur") {
    return (
      <EcranMessage
        icone={UserX}
        titre="Profil indisponible"
        detail="La fiche n'a pas pu être chargée. Réessayez dans un instant."
      />
    );
  }

  const { snapshot } = etat;
  const nom = snapshot.user.displayName || snapshot.user.username;
  const inscrit = new Date(snapshot.user.createdAt).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const obtenus = snapshot.badges
    .filter((b) => b.earned)
    .sort((a, b) => (b.earnedAt ?? "").localeCompare(a.earnedAt ?? ""));

  return (
    <div className="max-w-6xl mx-auto animate-fade-up">
      <RetourCommunaute className="inline-flex items-center gap-1.5 text-sm text-dim hover:text-fg transition-colors mb-5" />

      <div className="grid gap-6 lg:grid-cols-3 lg:items-start">
        <div className="lg:order-2">
          <ProfileCard snapshot={snapshot} className="lg:sticky lg:top-8" />
        </div>

        <div className="lg:col-span-2 lg:order-1 space-y-6">
          <header className="flex items-start gap-3">
            <span className="rule-accent self-stretch mt-1" aria-hidden />
            <div>
              <h1 className="text-2xl font-bold text-fg display">{nom}</h1>
              <p className="flex items-center gap-1.5 text-dim text-sm mt-0.5">
                <CalendarDays size={13} />
                Membre depuis le {inscrit}
              </p>
            </div>
          </header>

          <section>
            <h2 className="text-[11px] uppercase tracking-[0.14em] text-dim mb-2.5">
              Paliers de maîtrise
            </h2>
            <StageTiles stages={snapshot.stages} />
          </section>

          <div className="grid gap-4 sm:grid-cols-2">
            <ForecastPanel forecast={snapshot.forecast} dueNow={snapshot.counts.dueNow} />

            <ActivityPanel activity={snapshot.activity} today={snapshot.forecast[0].day} />
          </div>

          <section className="surface-flat relative overflow-hidden p-4">
            <span
              className="absolute -right-4 -bottom-8 jp-serif text-8xl leading-none select-none pointer-events-none text-line/[0.05]"
              aria-hidden
            >
              章
            </span>
            <header className="relative flex items-baseline justify-between mb-4">
              <h2 className="text-sm font-semibold text-fg">Badges obtenus</h2>
              <span className="text-[11px] text-dim tnum">
                {obtenus.length} / {snapshot.badges.length} badges
              </span>
            </header>

            {obtenus.length === 0 ? (
              <p className="relative text-sm text-dim py-6 text-center">
                Aucun badge obtenu pour l&apos;instant.
              </p>
            ) : (
              <div className="relative grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {obtenus.map((state) => (
                  <MedalCard key={state.id} state={state} />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
