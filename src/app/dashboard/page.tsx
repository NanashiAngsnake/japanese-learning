"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  ArrowRight,
  Award,
  BookOpen,
  Flame,
  Layers,
  RotateCcw,
  Star,
  Target,
  TriangleAlert,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import ProfileCard from "@/components/profile/ProfileCard";
import StageTiles from "@/components/profile/StageTiles";
import { ForecastPanel, ActivityPanel } from "@/components/profile/Insights";
import type { ProfileSnapshot } from "@/lib/profile";

function SectionTitle({
  children,
  aside,
}: {
  children: React.ReactNode;
  aside?: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 mb-3">
      <h2 className="text-[11px] uppercase tracking-[0.14em] text-dim">{children}</h2>
      {aside}
    </div>
  );
}

function CountTile({
  icon: Icon,
  value,
  label,
  sub,
}: {
  icon: React.ElementType;
  value: string;
  label: string;
  sub: string;
}) {
  return (
    <div className="surface-flat p-4">
      <div className="w-8 h-8 rounded-lg bg-accent/15 flex items-center justify-center mb-3">
        <Icon size={15} className="text-accent" />
      </div>
      <div className="text-2xl font-bold text-fg tnum leading-none">{value}</div>
      <div className="text-[11px] text-muted mt-1.5 leading-tight">{label}</div>
      <div className="text-[10px] text-dim mt-0.5 leading-tight">{sub}</div>
    </div>
  );
}

function Watermark({ glyph, muted }: { glyph: string; muted?: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "absolute -right-2 -bottom-8 jp-serif text-[7.5rem] leading-none select-none pointer-events-none",
        muted ? "text-line/[0.05]" : "text-accent/[0.10]"
      )}
    >
      {glyph}
    </span>
  );
}

function LockNote({ children }: { children: React.ReactNode }) {
  return <div className="mt-2.5 text-right text-[10px] leading-tight text-dim">{children}</div>;
}

function ActionBar({ counts }: { counts: ProfileSnapshot["counts"] }) {
  const { unstarted, dueNow, dueLocked, lockedTotal } = counts;
  const rien = dueNow === 0;

  return (
    <div className="grid sm:grid-cols-2 gap-4">

      <div className="group surface lift relative overflow-hidden p-5 flex items-center min-h-[132px]">
        <span
          aria-hidden
          className="absolute inset-0 pointer-events-none bg-gradient-to-br from-accent/[0.16] via-accent/[0.04] to-transparent"
        />
        <Watermark glyph="学" />
        <Link
          href="/dashboard/grammar"
          aria-label="Apprendre de nouveaux points"
          className="absolute inset-0 z-10"
        />
        <div className="relative w-full">
          <div className="flex items-center gap-4 w-full">
            <span className="w-11 h-11 rounded-xl bg-accent/20 border border-accent/25 flex items-center justify-center shrink-0">
              <BookOpen size={20} className="text-accent" />
            </span>
            <div className="min-w-0">
              <div className="text-fg font-semibold text-[15px] flex items-center gap-1.5">
                Apprendre
                <ArrowRight
                  size={15}
                  className="text-dim group-hover:text-accent group-hover:translate-x-0.5 transition-all"
                />
              </div>
              <p className="text-xs text-dim mt-0.5 leading-snug">
                {unstarted > 0
                  ? "Ajoutez de nouveaux points à votre liste"
                  : "Tout ce qui vous est accessible est déjà à l'étude"}
              </p>
            </div>
            <div className="ml-auto text-right shrink-0 pl-2">
              <div className="text-[2rem] font-bold text-fg tnum leading-none">{unstarted}</div>
              <div className="text-[10px] text-dim mt-1">à découvrir</div>
            </div>
          </div>

          {lockedTotal > 0 && (
            <LockNote>
              <Link
                href="/dashboard/pricing"
                className="relative z-20 underline decoration-line/[0.25] underline-offset-2 hover:text-accent transition-colors"
              >
                + {lockedTotal} verrouillés
              </Link>
            </LockNote>
          )}
        </div>
      </div>

      {rien ? (
        <div className="surface-flat relative overflow-hidden p-5 flex items-center min-h-[132px]">
          <Watermark glyph="復" muted />
          <div className="relative w-full">
            <div className="flex items-center gap-4 w-full">
              <span className="w-11 h-11 rounded-xl bg-line/[0.06] border border-line/[0.08] flex items-center justify-center shrink-0">
                <RotateCcw size={20} className="text-dim" />
              </span>
              <div className="min-w-0">
                <div className="text-muted font-semibold text-[15px]">Réviser</div>
                <p className="text-xs text-dim mt-0.5 leading-snug">
                  {dueLocked > 0
                    ? "Rien de disponible dans votre offre."
                    : "Rien à réviser — revenez plus tard."}
                </p>
              </div>
              <div className="ml-auto text-right shrink-0 pl-2">
                <div className="text-[2rem] font-bold text-dim tnum leading-none">0</div>
                <div className="text-[10px] text-dim mt-1">en attente</div>
              </div>
            </div>
            {dueLocked > 0 && (
              <LockNote>
                {dueLocked} carte{dueLocked > 1 ? "s" : ""} en attente d&apos;abonnement
              </LockNote>
            )}
          </div>
        </div>
      ) : (
        <Link
          href="/dashboard/review"
          className="group surface lift relative overflow-hidden p-5 flex items-center min-h-[132px] border-accent/25"
        >
          <span
            aria-hidden
            className="absolute inset-0 pointer-events-none bg-gradient-to-br from-accent/[0.24] via-accent/[0.06] to-transparent"
          />
          <Watermark glyph="復" />
          <div className="relative w-full">
            <div className="flex items-center gap-4 w-full">
              <span className="w-11 h-11 rounded-xl bg-accent/25 border border-accent/30 flex items-center justify-center shrink-0">
                <RotateCcw size={20} className="text-accent" />
              </span>
              <div className="min-w-0">
                <div className="text-fg font-semibold text-[15px] flex items-center gap-1.5">
                  Réviser
                  <ArrowRight
                    size={15}
                    className="text-dim group-hover:text-accent group-hover:translate-x-0.5 transition-all"
                  />
                </div>
                <p className="text-xs text-muted mt-0.5 leading-snug">
                  {dueNow > 1 ? "Cartes prêtes maintenant" : "Une carte est prête maintenant"}
                </p>
              </div>
              <div className="ml-auto shrink-0 pl-2">
                <span className="flex flex-col items-center justify-center min-w-[5rem] px-4 py-2.5 rounded-2xl bg-accent text-white glow">
                  <span className="text-[2rem] font-bold tnum leading-none">{dueNow}</span>
                  <span className="text-[10px] mt-1 opacity-85">en attente</span>
                </span>
              </div>
            </div>

            {dueLocked > 0 && (
              <LockNote>
                {dueLocked} carte{dueLocked > 1 ? "s" : ""} en attente d&apos;abonnement
              </LockNote>
            )}
          </div>
        </Link>
      )}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-hidden>
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="skeleton h-[132px] rounded-2xl" />
        <div className="skeleton h-[132px] rounded-2xl" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6 min-w-0">
          <div>
            <div className="skeleton h-3 w-24 rounded mb-3" />
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <div className="skeleton h-[196px] rounded-xl" />
              <div className="skeleton h-[196px] rounded-xl" />
            </div>
          </div>

          <div>
            <div className="skeleton h-3 w-20 rounded mb-3" />
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {Array.from({ length: 5 }, (_, i) => (
                <div key={i} className="skeleton h-[104px] rounded-xl" />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="skeleton h-[128px] rounded-xl" />
            ))}
          </div>
        </div>

        <div className="skeleton h-[640px] rounded-2xl" />
      </div>
    </div>
  );
}

function ErrorPanel({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="surface p-10 flex flex-col items-center text-center gap-3 animate-fade-up">
      <span className="w-12 h-12 rounded-xl bg-line/[0.06] border border-line/[0.08] flex items-center justify-center">
        <TriangleAlert size={22} className="text-muted" />
      </span>
      <div>
        <p className="text-fg font-semibold">Profil indisponible</p>
        <p className="text-sm text-dim mt-1">{message}</p>
      </div>
      <button type="button" onClick={onRetry} className="btn btn-ghost mt-1">
        <RotateCcw size={15} />
        Réessayer
      </button>
    </div>
  );
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const [snapshot, setSnapshot] = useState<ProfileSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const charger = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/profile/me", { cache: "no-store" });
      if (!res.ok) {
        throw new Error(
          res.status === 401
            ? "Votre session a expiré. Reconnectez-vous pour retrouver votre profil."
            : `Le serveur a répondu ${res.status}.`
        );
      }
      const data: ProfileSnapshot = await res.json();
      setSnapshot(data);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "La connexion au serveur n'a pas abouti."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void charger();
  }, [charger]);

  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => setNow(new Date()), []);
  const greeting = now
    ? now.getHours() < 12
      ? "おはよう"
      : now.getHours() < 18
        ? "こんにちは"
        : "こんばんは"
    : null;

  const prenom =
    snapshot?.user.displayName || snapshot?.user.username || session?.user.username || "";

  return (
    <div className="max-w-6xl mx-auto">
      <header className="mb-5 animate-fade-up">

        <div className="flex items-baseline gap-2 flex-wrap min-h-[1.75rem]">
          {now ? (
            <>
              <span className="japanese text-muted">{greeting}、</span>
              <span className="text-fg font-semibold">{prenom}</span>
              <span className="text-dim text-sm">
                {now.toLocaleDateString("fr-FR", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </span>
            </>
          ) : (
            <span className="skeleton h-4 w-64 max-w-full rounded self-center" aria-hidden />
          )}
        </div>
      </header>

      {loading && !snapshot ? (
        <DashboardSkeleton />
      ) : error && !snapshot ? (
        <ErrorPanel message={error} onRetry={charger} />
      ) : snapshot ? (
        <div className="space-y-6">
          <section className="animate-fade-up">
            <ActionBar counts={snapshot.counts} />
          </section>

          <div className="grid gap-6 lg:grid-cols-[1fr_320px] items-start">
            <div className="space-y-6 min-w-0">
              <section className="animate-fade-up">
                <SectionTitle
                  aside={
                    <span className="text-[11px] text-dim tnum">
                      {snapshot.counts.reviews} révisions au total
                    </span>
                  }
                >
                  Aperçu
                </SectionTitle>

                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                  <ForecastPanel
                    forecast={snapshot.forecast}
                    dueNow={snapshot.counts.dueNow}
                    hint={
                      snapshot.counts.dueLocked > 0
                        ? "Des cartes vous attendent, mais votre offre ne les débloque pas."
                        : undefined
                    }
                  />

                  <ActivityPanel
                    activity={snapshot.activity}
                    today={snapshot.forecast[0].day}
                  />
                </div>
              </section>

              <section className="animate-fade-up">
                <SectionTitle
                  aside={
                    <span className="text-[11px] text-dim tnum">
                      {snapshot.counts.learned} / {snapshot.counts.totalGrammar} points
                    </span>
                  }
                >
                  Maîtrise
                </SectionTitle>
                <StageTiles stages={snapshot.stages} href="/dashboard/grammar" />
              </section>

              <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 animate-fade-up">
                <CountTile
                  icon={Layers}
                  value={String(snapshot.counts.learned)}
                  label="Points à l'étude"
                  sub={`sur ${snapshot.counts.totalGrammar} au catalogue`}
                />
                <CountTile
                  icon={Flame}
                  value={String(snapshot.counts.reviewsToday)}
                  label="Révisions aujourd'hui"
                  sub={`série de ${snapshot.streak.current} j`}
                />
                <CountTile
                  icon={Star}
                  value={snapshot.counts.avgScore.toFixed(1)}
                  label="Score moyen"
                  sub="sur 5,0"
                />
                <CountTile
                  icon={Target}
                  value={`${Math.round(snapshot.counts.accuracy * 100)} %`}
                  label="Précision"
                  sub="100 dernières révisions"
                />
              </section>
            </div>

            <div className="lg:sticky lg:top-8 animate-fade-up min-w-0">
              <ProfileCard
                snapshot={snapshot}
                actions={
                  <div className="grid gap-2">
                    <Link
                      href={`/dashboard/u/${snapshot.user.username}`}
                      className="btn btn-ghost w-full"
                    >
                      <User size={15} />
                      Mon profil public
                    </Link>
                    <Link href="/dashboard/badges" className="btn btn-ghost w-full">
                      <Award size={15} />
                      Tous les badges
                    </Link>
                  </div>
                }
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
