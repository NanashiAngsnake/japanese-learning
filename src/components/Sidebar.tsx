"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, BookOpen, RotateCcw, BarChart2, Shield,
  LogOut, Sparkles, Settings as SettingsIcon, MonitorDown,
  Users, Award,
} from "lucide-react";

interface SidebarProps {
  user: { username: string; email: string; role: string };
  isPro?: boolean;
}

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Tableau de bord" },
  { href: "/dashboard/grammar", icon: BookOpen, label: "Grammaire" },
  { href: "/dashboard/review", icon: RotateCcw, label: "Révisions" },
  { href: "/dashboard/stats", icon: BarChart2, label: "Statistiques" },
  { href: "/dashboard/community", icon: Users, label: "Communauté" },
  { href: "/dashboard/badges", icon: Award, label: "Badges" },
  { href: "/dashboard/app", icon: MonitorDown, label: "Application PC" },
];

const bottomItems = [
  { href: "/dashboard/pricing", icon: Sparkles, label: "Abonnement" },
  { href: "/dashboard/settings", icon: SettingsIcon, label: "Réglages" },
];

export default function Sidebar({ user, isPro }: SidebarProps) {
  const pathname = usePathname();

  const renderLink = ({
    href, icon: Icon, label,
  }: { href: string; icon: React.ElementType; label: string }) => {
    const active = href === "/dashboard" ? pathname === href : pathname.startsWith(href);
    return (
      <Link
        key={href}
        href={href}
        className={cn(
          "relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 ease-soft group",
          active ? "text-fg bg-accent/10" : "text-muted hover:text-fg hover:bg-line/[0.06]"
        )}
      >
        {active && (
          <span className="rule-accent absolute left-0 top-1.5 bottom-1.5 -ml-[9px]" aria-hidden />
        )}
        <Icon
          size={18}
          className={cn(
            "transition-colors",
            active ? "text-accent" : "text-dim group-hover:text-muted"
          )}
        />
        <span className={cn(active && "font-medium")}>{label}</span>
      </Link>
    );
  };

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-surface/70 backdrop-blur-xl border-r border-line/[0.07] flex flex-col z-40">
      <div className="px-5 py-6 border-b border-line/[0.07]">
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-accent/15 border border-accent/30 flex items-center justify-center transition-transform group-hover:scale-105">
            <span className="jp-serif text-xl text-accent">日</span>
          </div>
          <div className="leading-tight">
            <div className="text-fg font-semibold text-sm japanese">日本語学習</div>
            <div className="text-dim text-[11px] tracking-wide">JAPANESE&nbsp;LEARNING</div>
          </div>
        </Link>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
        {navItems.map(renderLink)}

        <div className="pt-4 pb-1.5">
          <div className="text-[10px] text-dim px-3 uppercase tracking-[0.14em]">Compte</div>
        </div>
        {bottomItems.map(renderLink)}

        {user.role === "ADMIN" && (
          <>
            <div className="pt-4 pb-1.5">
              <div className="text-[10px] text-dim px-3 uppercase tracking-[0.14em]">Admin</div>
            </div>
            {renderLink({ href: "/dashboard/admin", icon: Shield, label: "Administration" })}
          </>
        )}
      </nav>

      <div className="p-4 border-t border-line/[0.07]">
        <div className="flex items-center gap-3 mb-3 px-1">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-accent to-accent-deep flex items-center justify-center text-sm font-bold text-white shrink-0">
            {user.username[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-fg truncate">{user.username}</div>
            <div className="text-[11px] text-dim truncate">
              {user.role === "ADMIN" ? "Administrateur" : isPro ? "Membre Pro" : "Offre gratuite"}
            </div>
          </div>
          {isPro ? (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-accent/20 text-accent border border-accent/30">
              PRO
            </span>
          ) : user.role !== "ADMIN" ? (
            <Link
              href="/dashboard/pricing"
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-line/[0.06] text-muted border border-line/10 hover:text-fg hover:border-line/25 transition-colors"
            >
              Gratuit
            </Link>
          ) : null}
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-dim hover:text-red-300 hover:bg-red-500/10 text-sm transition-all"
        >
          <LogOut size={16} />
          <span>Déconnexion</span>
        </button>
      </div>
    </aside>
  );
}
