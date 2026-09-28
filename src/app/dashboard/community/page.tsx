"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Flame, Lock, Medal as MedalIcon, Search, Sparkles, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import MemberCard from "@/components/profile/MemberCard";
import { Avatar } from "@/components/profile/ProfileCard";
import type { CommunityMember } from "@/lib/profile";

interface CommunityResponse {
  members: CommunityMember[];
  me: string;
}

type SortKey = "xp" | "learned" | "reviews" | "streak" | "badges";

interface SortDef {
  key: SortKey;
  label: string;
  value: (m: CommunityMember) => number;
  format: (m: CommunityMember) => string;
}

const SORTS: SortDef[] = [
  { key: "xp", label: "Expérience", value: (m) => m.xp, format: (m) => `${nombre(m.xp)} XP` },
  {
    key: "learned",
    label: "Points appris",
    value: (m) => m.learned,
    format: (m) => `${nombre(m.learned)} point${m.learned > 1 ? "s" : ""}`,
  },
  {
    key: "reviews",
    label: "Révisions",
    value: (m) => m.reviews,
    format: (m) => `${nombre(m.reviews)} révision${m.reviews > 1 ? "s" : ""}`,
  },
  {
    key: "streak",
    label: "Série",
    value: (m) => m.currentStreak,
    format: (m) => `${m.currentStreak} jour${m.currentStreak > 1 ? "s" : ""}`,
  },
  {
    key: "badges",
    label: "Badges",
    value: (m) => m.badges,
    format: (m) => `${m.badges} badge${m.badges > 1 ? "s" : ""}`,
  },
];

function nombre(n: number): string {
  return n.toLocaleString("fr-FR");
}

function replier(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

const PODIUM = [
  { glyphe: "金", cls: "tier-or", libelle: "1re place" },
  { glyphe: "銀", cls: "tier-argent", libelle: "2e place" },
  { glyphe: "銅", cls: "tier-bronze", libelle: "3e place" },
] as const;

const ORDRE_PODIUM = ["md:order-2", "md:order-1", "md:order-3"] as const;

function PodiumCard({
  member,
  position,
  isMe,
  mesure,
}: {
  member: CommunityMember;
  position: number;
  isMe: boolean;
  mesure: string;
}) {
  const skin = PODIUM[position - 1];
  const nom = member.displayName || member.username;
  const ouvert = member.profilePublic;
  const premier = position === 1;
  const pastille = skin ? "rank-chip" : "rank-chip-plain";

  const corps = (
    <div
      className={cn(
        "surface relative overflow-hidden h-full p-5 flex flex-col items-center text-center gap-2.5",
        skin?.cls,
        ouvert && "lift",
        premier ? "md:pt-7 md:pb-6" : "md:mt-5",
        isMe && "border-accent/45"
      )}
    >
      <span
        className={cn(
          "absolute -right-3 -bottom-6 jp-serif text-8xl leading-none select-none pointer-events-none",
          skin ? "tier-fg opacity-[0.12]" : "text-line/[0.05]"
        )}
        aria-hidden
      >
        {skin?.glyphe ?? "位"}
      </span>

      <div
        className={cn(
          "relative inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-[0.14em]",
          pastille
        )}
      >
        <MedalIcon size={premier ? 15 : 13} />
        {skin?.libelle ?? `${position}e place`}
      </div>

      <div className={cn("relative rounded-full p-1", pastille)}>
        <Avatar emoji={member.avatarEmoji} size={premier ? 76 : 62} ring={false} />
      </div>

      <div className="relative min-w-0 w-full">
        <div className="flex items-center justify-center gap-1.5">
          <span className={cn("font-bold text-fg truncate", premier ? "text-lg" : "text-base")}>
            {nom}
          </span>
          {isMe && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-accent/20 text-accent border border-accent/30 shrink-0">
              VOUS
            </span>
          )}
          {!ouvert && <Lock size={12} className="text-dim shrink-0" />}
        </div>
        <div className="text-[11px] text-dim truncate">@{member.username}</div>
      </div>

      <div className="relative flex items-center gap-1.5 text-xs text-muted">
        <span className="jp-serif text-accent">{member.kanji}</span>
        <span>
          {member.title} · Niv. {member.level}
        </span>
      </div>

      <div className="relative flex items-center justify-center gap-2 mt-auto pt-1">
        <span className="chip tnum">{mesure}</span>
        <span
          className="chip tnum"
          title={`Série en cours : ${member.currentStreak} jour(s) — record ${member.longestStreak}`}
        >
          <Flame size={12} className={member.currentStreak > 0 ? "text-accent" : "text-dim"} />
          {member.currentStreak} j
        </span>
      </div>
    </div>
  );

  return ouvert ? (
    <Link href={`/dashboard/u/${member.username}`} className="block h-full">
      {corps}
    </Link>
  ) : (
    <div className="h-full" title="Profil privé">
      {corps}
    </div>
  );
}

export default function CommunityPage() {
  const [members, setMembers] = useState<CommunityMember[]>([]);
  const [me, setMe] = useState("");
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("xp");
  const [recherche, setRecherche] = useState("");

  const charger = useCallback(async () => {
    setLoading(true);
    setErreur(null);
    try {
      const res = await fetch("/api/community");
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as CommunityResponse;
      setMembers(Array.isArray(data.members) ? data.members : []);
      setMe(typeof data.me === "string" ? data.me : "");
    } catch {
      setErreur("Le classement n'a pas pu être chargé.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void charger();
  }, [charger]);

  const tri = SORTS.find((s) => s.key === sortKey) ?? SORTS[0];

  const classement = useMemo(() => {
    return [...members]
      .sort(
        (a, b) =>
          tri.value(b) - tri.value(a) ||
          b.xp - a.xp ||
          a.username.localeCompare(b.username, "fr")
      )
      .map((member, i) => ({ member, position: i + 1 }));
  }, [members, tri]);

  const aiguille = replier(recherche.trim());
  const visibles = aiguille
    ? classement.filter(
        ({ member }) =>
          replier(member.username).includes(aiguille) ||
          replier(member.displayName ?? "").includes(aiguille)
      )
    : classement;

  const podium = classement.slice(0, 3);
  const moi = classement.find((e) => e.member.username === me);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="space-y-2">
          <div className="skeleton h-7 w-52 rounded-lg" />
          <div className="skeleton h-4 w-80 rounded" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton h-56 rounded-[20px]" />
          ))}
        </div>
        <div className="skeleton h-12 rounded-[14px]" />
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton h-[82px] rounded-[14px]" />
          ))}
        </div>
      </div>
    );
  }

  if (erreur) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="surface p-8 text-center animate-fade-up">
          <Users size={26} className="mx-auto mb-3 text-dim" />
          <p className="text-fg font-semibold">{erreur}</p>
          <p className="text-dim text-sm mt-1">Vérifiez votre connexion, puis réessayez.</p>
          <button type="button" className="btn btn-ghost mt-5" onClick={() => void charger()}>
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto animate-fade-up">
      <header className="mb-7 flex items-start gap-3">
        <span className="rule-accent self-stretch mt-1" aria-hidden />
        <div>
          <h1 className="text-2xl font-bold text-fg display">Communauté</h1>
          <p className="text-dim text-sm mt-0.5">
            {members.length === 0
              ? "Aucun membre au classement pour l'instant."
              : `${nombre(members.length)} membre${members.length > 1 ? "s" : ""} au classement.`}{" "}
            Vous pouvez vous en retirer à tout moment depuis les{" "}
            <Link href="/dashboard/settings" className="text-accent hover:underline">
              Réglages
            </Link>
            .
          </p>
        </div>
      </header>

      {members.length === 0 ? (
        <div className="surface p-10 text-center">
          <Sparkles size={28} className="mx-auto mb-3 text-accent/70" />
          <p className="text-fg font-semibold">Personne d&apos;autre pour l&apos;instant</p>
          <p className="text-dim text-sm mt-1.5 max-w-sm mx-auto leading-relaxed">
            Le classement se remplira à mesure que des membres rejoindront l&apos;aventure.
            En attendant, chaque révision compte déjà.
          </p>
          <Link href="/dashboard/review" className="btn btn-primary mt-6">
            Réviser maintenant
          </Link>
        </div>
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 md:items-end mb-5">
            {podium.map(({ member, position }) => (
              <div key={member.username} className={cn("h-full", ORDRE_PODIUM[position - 1])}>
                <PodiumCard
                  member={member}
                  position={position}
                  isMe={member.username === me}
                  mesure={tri.format(member)}
                />
              </div>
            ))}
          </section>

          {moi && moi.position > 3 && (
            <p className="text-center text-sm text-muted mb-5">
              Vous êtes{" "}
              <span className="text-accent font-bold tnum">{moi.position}</span>
              <sup className="text-accent font-bold">e</sup> sur{" "}
              <span className="tnum">{nombre(classement.length)}</span> au classement{" "}
              <span className="text-dim">« {tri.label.toLowerCase()} »</span>.
            </p>
          )}
          <div className="surface-flat p-3 mb-4 flex flex-col lg:flex-row lg:items-center gap-3">
            <div className="relative lg:w-64 shrink-0">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-dim pointer-events-none"
              />
              <input
                type="search"
                className="field pl-9 py-2 text-sm"
                placeholder="Rechercher un membre"
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
                aria-label="Rechercher un membre"
              />
            </div>

            <div className="flex items-center gap-1.5 flex-wrap lg:ml-auto">
              <span className="text-[11px] uppercase tracking-[0.14em] text-dim mr-1 hidden sm:inline">
                Trier par
              </span>
              {SORTS.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setSortKey(s.key)}
                  aria-pressed={s.key === sortKey}
                  className={cn(
                    "chip transition-colors",
                    s.key === sortKey
                      ? "bg-accent/20 text-accent border-accent/40"
                      : "hover:text-fg hover:border-line/20"
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {visibles.length === 0 ? (
            <div className="surface-flat p-8 text-center">
              <p className="text-muted text-sm">
                Aucun membre ne correspond à «&nbsp;{recherche.trim()}&nbsp;».
              </p>
              <button
                type="button"
                className="btn btn-ghost mt-4"
                onClick={() => setRecherche("")}
              >
                Effacer la recherche
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {visibles.map(({ member, position }) => (
                <MemberCard
                  key={member.username}
                  member={member}
                  position={position}
                  isMe={member.username === me}
                />
              ))}
            </div>
          )}

          {members.length === 1 && (
            <p className="text-center text-sm text-dim mt-6">
              Personne d&apos;autre pour l&apos;instant — vous ouvrez le bal.
            </p>
          )}
        </>
      )}
    </div>
  );
}
