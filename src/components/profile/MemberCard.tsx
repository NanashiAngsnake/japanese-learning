"use client";

import Link from "next/link";
import { Flame, Lock, Medal as MedalIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/profile/ProfileCard";
import type { CommunityMember } from "@/lib/profile";

function rankSkin(position: number): string {
  if (position === 1) return "rank-chip tier-or";
  if (position === 2) return "rank-chip tier-argent";
  if (position === 3) return "rank-chip tier-bronze";
  return "rank-chip-plain";
}

export default function MemberCard({
  member,
  position,
  isMe,
}: {
  member: CommunityMember;
  position: number;
  isMe?: boolean;
}) {
  const name = member.displayName || member.username;
  const open = member.profilePublic;

  const body = (
    <div
      className={cn(
        "surface-flat relative isolate p-4 flex items-center gap-4 transition-all",
        open ? "lift" : "opacity-80",
        isMe && "border-accent/40"
      )}
    >

      {isMe && <span className="is-me-tint" aria-hidden />}

      <span
        className={cn(
          "relative w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold tnum shrink-0",
          rankSkin(position)
        )}
      >
        {position}
      </span>

      <Avatar emoji={member.avatarEmoji} size={44} />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-fg truncate">{name}</span>
          {isMe && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-accent/20 text-accent border border-accent/30">
              VOUS
            </span>
          )}
          {!open && <Lock size={12} className="text-dim shrink-0" />}
        </div>
        <div className="flex items-center gap-2 text-[11px] text-dim mt-0.5">
          <span className="jp-serif text-accent/90">{member.kanji}</span>
          <span>
            {member.title} · Niv. {member.level}
          </span>
        </div>
      </div>

      <div className="hidden sm:flex items-center gap-5 shrink-0">
        {[
          { label: "Points", value: member.learned, hint: "Points de grammaire à l'étude" },
          {
            label: "Maîtrisés",
            value: member.mastered,
            hint: "Points au stade Maîtrisé ou Ancré",
          },
          { label: "Révisions", value: member.reviews, hint: "Révisions effectuées" },
        ].map((s) => (
          <div key={s.label} className="text-center w-16" title={s.hint}>
            <div className="text-sm font-bold text-fg tnum leading-none">{s.value}</div>
            <div className="text-[10px] text-dim mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <span
          className="flex items-center gap-1 text-sm font-semibold tnum"
          title={`Série : ${member.currentStreak} jour(s) — record ${member.longestStreak}`}
        >
          <Flame size={14} className={member.currentStreak > 0 ? "text-accent" : "text-dim"} />
          <span className={member.currentStreak > 0 ? "text-fg" : "text-dim"}>
            {member.currentStreak}
          </span>
        </span>
        <span
          className="flex items-center gap-1 text-sm font-semibold tnum text-muted"
          title={`${member.badges} badge(s)`}
        >
          <MedalIcon size={14} className="text-dim" />
          {member.badges}
        </span>
      </div>
    </div>
  );

  return open ? (
    <Link href={`/dashboard/u/${member.username}`} className="block">
      {body}
    </Link>
  ) : (
    <div title="Profil privé">{body}</div>
  );
}
