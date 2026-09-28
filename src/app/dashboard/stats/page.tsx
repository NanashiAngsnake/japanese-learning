"use client";

import { useEffect, useState } from "react";
import { BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from "recharts";
import { TrendingUp, Star, BookOpen, RotateCcw } from "lucide-react";
import { ALL_STAGES } from "@/lib/srs";
import { cn } from "@/lib/utils";

interface Stats {
  totalStudied: number;
  dueCount: number;
  reviewsToday: number;
  avgScore: number;
  totalGrammar: number;
  byLevel: Record<string, number>;
  totalByLevel: Record<string, number>;
  byStage: Record<string, number>;
  recentReviews: { score: number; reviewedAt: string }[];
}

const LEVEL_COLORS: Record<string, string> = {
  "5": "#22c55e",
  "4": "#3b82f6",
  "3": "#eab308",
  "2": "#f97316",
  "1": "#ef4444",
};

export default function StatsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [c, setC] = useState({
    accent: "#E23A4E", fg: "#E8EAF2", dim: "#6B7189", surface: "#12122A", line: "255 255 255",
  });

  useEffect(() => {
    const cs = getComputedStyle(document.documentElement);
    const v = (n: string) => cs.getPropertyValue(n).trim();
    const rgb = (n: string, fb: string) => (v(n) ? `rgb(${v(n)})` : fb);
    setC({
      accent: rgb("--accent-rgb", "#E23A4E"),
      fg: rgb("--fg-rgb", "#E8EAF2"),
      dim: rgb("--dim-rgb", "#6B7189"),
      surface: rgb("--surface-rgb", "#12122A"),
      line: v("--line-rgb") || "255 255 255",
    });
  }, []);

  const tooltipStyle = {
    background: c.surface,
    border: `1px solid rgb(${c.line} / 0.12)`,
    borderRadius: 10,
  };

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then((d) => {
        setStats(d);
        setLoading(false);
      });
  }, []);

  const levelData = stats
    ? [5, 4, 3, 2, 1].map((l) => ({
        name: `N${l}`,
        count: stats.byLevel[l] ?? 0,
        fill: LEVEL_COLORS[String(l)],
      }))
    : [];

  const recentData = stats?.recentReviews
    .slice(0, 20)
    .reverse()
    .map((r, i) => ({
      index: i + 1,
      score: r.score,
    })) ?? [];

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto animate-pulse space-y-4">
        <div className="h-8 bg-line/[0.05] rounded w-48" />
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-surface rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-fg">Statistiques</h1>
        <p className="text-dim text-sm mt-0.5">Suivez votre progression</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          {
            icon: BookOpen,
            label: "Points appris",
            value: `${stats?.totalStudied} / ${stats?.totalGrammar}`,
            sub: `${Math.round(((stats?.totalStudied ?? 0) / (stats?.totalGrammar || 1)) * 100)}% du total`,
            color: "text-blue-400",
            bg: "bg-blue-500/10",
          },
          {
            icon: RotateCcw,
            label: "En attente",
            value: stats?.dueCount,
            sub: "révisions dues",
            color: "text-orange-400",
            bg: "bg-orange-500/10",
          },
          {
            icon: Star,
            label: "Score moyen",
            value: stats?.avgScore?.toFixed(1),
            sub: "sur 5.0",
            color: "text-yellow-400",
            bg: "bg-yellow-500/10",
          },
          {
            icon: TrendingUp,
            label: "Aujourd'hui",
            value: stats?.reviewsToday,
            sub: "révisions faites",
            color: "text-green-400",
            bg: "bg-green-500/10",
          },
        ].map(({ icon: Icon, label, value, sub, color, bg }) => (
          <div key={label} className="bg-surface rounded-xl p-4 border border-line/[0.08]">
            <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center mb-3`}>
              <Icon size={18} className={color} />
            </div>
            <div className={`text-2xl font-bold ${color}`}>{value}</div>
            <div className="text-muted text-xs mt-0.5">{label}</div>
            <div className="text-dim text-xs">{sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-surface rounded-xl p-5 border border-line/[0.08]">
          <h3 className="text-fg font-semibold mb-4">Points appris par niveau</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={levelData} barSize={32}>
              <XAxis dataKey="name" stroke={c.dim} tick={{ fill: c.dim, fontSize: 12 }} />
              <YAxis stroke={c.dim} tick={{ fill: c.dim, fontSize: 12 }} />
              <Tooltip
                cursor={{ fill: `rgb(${c.line} / 0.06)` }}
                contentStyle={tooltipStyle}
                labelStyle={{ color: c.fg }}
                itemStyle={{ color: c.dim }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {levelData.map((entry, index) => (
                  <Cell key={index} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-surface rounded-xl p-5 border border-line/[0.08]">
          <h3 className="text-fg font-semibold mb-4">Scores récents</h3>
          {recentData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={recentData}>
                <CartesianGrid strokeDasharray="3 3" stroke={`rgb(${c.line} / 0.07)`} />
                <XAxis dataKey="index" stroke={c.dim} tick={{ fill: c.dim, fontSize: 11 }} />
                <YAxis domain={[0, 5]} stroke={c.dim} tick={{ fill: c.dim, fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: c.fg }} itemStyle={{ color: c.dim }} />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke={c.accent}
                  strokeWidth={2}
                  dot={{ fill: c.accent, r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-dim text-sm">
              Aucune révision pour le moment
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 surface p-5">
        <h3 className="text-fg font-semibold mb-1">Progression par stage</h3>
        <p className="text-dim text-xs mb-4">
          Un point avance d&apos;un stage à mesure que son intervalle de révision s&apos;allonge.
        </p>
        <div className="flex h-3 rounded-full overflow-hidden bg-line/[0.05] mb-4">
          {ALL_STAGES.filter((s) => s.key !== "new").map((s) => {
            const n = stats?.byStage?.[s.key] ?? 0;
            const studied = ALL_STAGES.filter((x) => x.key !== "new")
              .reduce((a, x) => a + (stats?.byStage?.[x.key] ?? 0), 0);
            if (!n || !studied) return null;
            return (
              <div
                key={s.key}
                className={s.className.split(" ").find((c) => c.startsWith("bg-")) ?? "bg-line/20"}
                style={{ width: `${(n / studied) * 100}%` }}
                title={`${s.label} : ${n}`}
              />
            );
          })}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {ALL_STAGES.map((s) => (
            <div key={s.key} className={cn("rounded-xl border px-3 py-2", s.className)}>
              <div className="text-lg font-bold tnum">{stats?.byStage?.[s.key] ?? 0}</div>
              <div className="text-[11px] opacity-80">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 bg-surface rounded-xl p-5 border border-line/[0.08]">
        <h3 className="text-fg font-semibold mb-4">Progression JLPT</h3>
        <div className="grid grid-cols-5 gap-4">
          {[5, 4, 3, 2, 1].map((level) => {
            const count = stats?.byLevel[level] ?? 0;
            const total = stats?.totalByLevel?.[level] ?? 0;
            const pct = total > 0 ? Math.min(100, Math.round((count / total) * 100)) : 0;
            const color = LEVEL_COLORS[String(level)];

            return (
              <div key={level} className="text-center">
                <div className="relative w-20 h-20 mx-auto mb-2">
                  <svg viewBox="0 0 36 36" className="w-20 h-20 -rotate-90">
                    <circle cx="18" cy="18" r="15.9" fill="none" className="stroke-line/[0.08]" strokeWidth="2.5" />
                    <circle
                      cx="18" cy="18" r="15.9"
                      fill="none"
                      stroke={color}
                      strokeWidth="2.5"
                      strokeDasharray={`${pct} 100`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-fg font-bold text-sm">{pct}%</span>
                  </div>
                </div>
                <div className="text-fg font-medium text-sm">N{level}</div>
                <div className="text-dim text-xs">{count}/{total}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
