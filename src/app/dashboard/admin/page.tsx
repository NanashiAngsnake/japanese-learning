"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Users, BookOpen, Plus, Trash2, Edit, Shield, AlertTriangle } from "lucide-react";
import { jlptColor, jlptLabel, cn } from "@/lib/utils";

interface User {
  id: string;
  email: string;
  username: string;
  role: string;
  createdAt: string;
  _count: { studyItems: number; reviews: number };
}

interface GrammarPoint {
  id: string;
  title: string;
  meaning: string;
  jlptLevel: number;
  lesson: number | null;
  _count: { examples: number; studyItems: number };
}

type Tab = "users" | "content" | "add";

export default function AdminPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("content");
  const [users, setUsers] = useState<User[]>([]);
  const [grammar, setGrammar] = useState<GrammarPoint[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingGrammar, setLoadingGrammar] = useState(false);

  const [form, setForm] = useState({
    title: "", meaning: "", structure: "",
    jlptLevel: 5, lesson: "", explanation: "",
    caution: "", nuance: "",
    examples: [{ japanese: "", reading: "", english: "" }],
  });
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  useEffect(() => {
    if (session && session.user.role !== "ADMIN") router.push("/dashboard");
  }, [session, router]);

  useEffect(() => {
    if (tab === "users") {
      setLoadingUsers(true);
      fetch("/api/admin/users").then((r) => r.json()).then((d) => {
        setUsers(d);
        setLoadingUsers(false);
      });
    }
    if (tab === "content") {
      setLoadingGrammar(true);
      fetch("/api/admin/grammar").then((r) => r.json()).then((d) => {
        setGrammar(d);
        setLoadingGrammar(false);
      });
    }
  }, [tab]);

  async function deleteGrammar(id: string, title: string) {
    if (!confirm(`Supprimer "${title}" ?`)) return;
    await fetch(`/api/admin/grammar/${id}`, { method: "DELETE" });
    setGrammar((prev) => prev.filter((g) => g.id !== id));
  }

  async function saveGrammar(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveMsg("");

    const examples = form.examples.filter((ex) => ex.japanese && ex.english);
    const res = await fetch("/api/admin/grammar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        jlptLevel: Number(form.jlptLevel),
        lesson: form.lesson ? Number(form.lesson) : undefined,
        structure: form.structure || undefined,
        caution: form.caution || undefined,
        nuance: form.nuance || undefined,
        examples,
      }),
    });

    if (res.ok) {
      setSaveMsg("✓ Point de grammaire ajouté !");
      setForm({
        title: "", meaning: "", structure: "",
        jlptLevel: 5, lesson: "", explanation: "",
        caution: "", nuance: "",
        examples: [{ japanese: "", reading: "", english: "" }],
      });
    } else {
      const d = await res.json();
      setSaveMsg(`Erreur: ${d.error}`);
    }
    setSaving(false);
  }

  if (!session || session.user.role !== "ADMIN") return null;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
          <Shield size={20} className="text-purple-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-fg">Administration</h1>
          <p className="text-dim text-sm">Gérer le contenu et les utilisateurs</p>
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        {[
          { id: "content" as Tab, label: "Contenu", icon: BookOpen },
          { id: "add" as Tab, label: "Ajouter un point", icon: Plus },
          { id: "users" as Tab, label: "Utilisateurs", icon: Users },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all",
              tab === id
                ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                : "bg-surface text-muted hover:text-fg border border-line/[0.08]"
            )}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {tab === "users" && (
        <div className="bg-surface rounded-xl border border-line/[0.08] overflow-hidden">
          <div className="p-4 border-b border-line/[0.08] flex items-center justify-between">
            <span className="text-fg font-medium">{users.length} utilisateurs</span>
          </div>
          {loadingUsers ? (
            <div className="p-8 text-center text-dim">Chargement...</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-line/[0.05]">
                  {["Utilisateur", "Email", "Rôle", "Points appris", "Révisions", "Inscrit le"].map((h) => (
                    <th key={h} className="text-left text-xs text-dim px-4 py-3 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-line/[0.05] hover:bg-line/[0.03] transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-accent/30 flex items-center justify-center text-xs font-bold text-fg">
                          {u.username[0].toUpperCase()}
                        </div>
                        <span className="text-fg text-sm font-medium">{u.username}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted text-sm">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "text-xs px-2 py-0.5 rounded-md font-medium",
                        u.role === "ADMIN"
                          ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                          : "bg-line/[0.05] text-muted"
                      )}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted text-sm">{u._count.studyItems}</td>
                    <td className="px-4 py-3 text-muted text-sm">{u._count.reviews}</td>
                    <td className="px-4 py-3 text-dim text-xs">
                      {new Date(u.createdAt).toLocaleDateString("fr-FR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === "content" && (
        <div className="bg-surface rounded-xl border border-line/[0.08] overflow-hidden">
          <div className="p-4 border-b border-line/[0.08]">
            <span className="text-fg font-medium">{grammar.length} points de grammaire</span>
          </div>
          {loadingGrammar ? (
            <div className="p-8 text-center text-dim">Chargement...</div>
          ) : grammar.length === 0 ? (
            <div className="p-12 text-center">
              <AlertTriangle size={32} className="mx-auto mb-3 text-yellow-500 opacity-50" />
              <p className="text-dim mb-3">Aucun contenu. Ajoutez des points ou lancez l&apos;import du catalogue.</p>
              <button onClick={() => setTab("add")} className="px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg text-sm border border-purple-500/30 hover:bg-purple-500/30 transition-colors">
                Ajouter manuellement
              </button>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-line/[0.05]">
                  {["Titre", "Signification", "Niveau", "Exemples", "Appris par", ""].map((h) => (
                    <th key={h} className="text-left text-xs text-dim px-4 py-3 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {grammar.map((g) => (
                  <tr key={g.id} className="border-b border-line/[0.05] hover:bg-line/[0.03] group transition-colors">
                    <td className="px-4 py-3 text-fg japanese font-medium text-sm">{g.title}</td>
                    <td className="px-4 py-3 text-muted text-sm max-w-[200px] truncate">{g.meaning}</td>
                    <td className="px-4 py-3">
                      <span className={cn("text-xs px-2 py-0.5 rounded-md border font-medium", jlptColor(g.jlptLevel))}>
                        {jlptLabel(g.jlptLevel)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-dim text-sm">{g._count.examples}</td>
                    <td className="px-4 py-3 text-dim text-sm">{g._count.studyItems}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => deleteGrammar(g.id, g.title)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 text-red-500/60 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === "add" && (
        <form onSubmit={saveGrammar} className="space-y-5 max-w-2xl">
          {saveMsg && (
            <div className={cn(
              "p-3 rounded-lg border text-sm",
              saveMsg.startsWith("✓")
                ? "bg-green-500/10 border-green-500/30 text-green-400"
                : "bg-red-500/10 border-red-500/30 text-red-400"
            )}>
              {saveMsg}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-muted mb-1.5">Titre *</label>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full bg-surface border border-line/[0.10] rounded-lg px-3 py-2 text-fg text-sm focus:outline-none focus:border-purple-500/50"
                placeholder="〜は〜です"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-muted mb-1.5">Niveau JLPT *</label>
              <select
                value={form.jlptLevel}
                onChange={(e) => setForm({ ...form, jlptLevel: Number(e.target.value) })}
                className="w-full bg-surface border border-line/[0.10] rounded-lg px-3 py-2 text-fg text-sm focus:outline-none focus:border-purple-500/50"
              >
                {[5, 4, 3, 2, 1].map((l) => <option key={l} value={l}>N{l}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-muted mb-1.5">Signification *</label>
              <input
                value={form.meaning}
                onChange={(e) => setForm({ ...form, meaning: e.target.value })}
                className="w-full bg-surface border border-line/[0.10] rounded-lg px-3 py-2 text-fg text-sm focus:outline-none focus:border-purple-500/50"
                placeholder="to be; is"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-muted mb-1.5">Leçon</label>
              <input
                type="number"
                value={form.lesson}
                onChange={(e) => setForm({ ...form, lesson: e.target.value })}
                className="w-full bg-surface border border-line/[0.10] rounded-lg px-3 py-2 text-fg text-sm focus:outline-none focus:border-purple-500/50"
                placeholder="1"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-muted mb-1.5">Structure</label>
            <input
              value={form.structure}
              onChange={(e) => setForm({ ...form, structure: e.target.value })}
              className="w-full bg-surface border border-line/[0.10] rounded-lg px-3 py-2 text-fg text-sm font-mono focus:outline-none focus:border-purple-500/50"
              placeholder="Noun + は + Noun + です"
            />
          </div>

          <div>
            <label className="block text-sm text-muted mb-1.5">Explication *</label>
            <textarea
              value={form.explanation}
              onChange={(e) => setForm({ ...form, explanation: e.target.value })}
              rows={4}
              className="w-full bg-surface border border-line/[0.10] rounded-lg px-3 py-2 text-fg text-sm focus:outline-none focus:border-purple-500/50 resize-none"
              placeholder="Expliquer le point de grammaire en détail..."
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-muted mb-1.5">Attention</label>
              <textarea
                value={form.caution}
                onChange={(e) => setForm({ ...form, caution: e.target.value })}
                rows={2}
                className="w-full bg-surface border border-line/[0.10] rounded-lg px-3 py-2 text-fg text-sm focus:outline-none focus:border-purple-500/50 resize-none"
                placeholder="Points à retenir..."
              />
            </div>
            <div>
              <label className="block text-sm text-muted mb-1.5">Nuance</label>
              <textarea
                value={form.nuance}
                onChange={(e) => setForm({ ...form, nuance: e.target.value })}
                rows={2}
                className="w-full bg-surface border border-line/[0.10] rounded-lg px-3 py-2 text-fg text-sm focus:outline-none focus:border-purple-500/50 resize-none"
                placeholder="Nuances de sens..."
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm text-muted">Exemples</label>
              <button
                type="button"
                onClick={() => setForm({ ...form, examples: [...form.examples, { japanese: "", reading: "", english: "" }] })}
                className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1"
              >
                <Plus size={12} /> Ajouter
              </button>
            </div>
            <div className="space-y-3">
              {form.examples.map((ex, i) => (
                <div key={i} className="p-3 bg-line/[0.03] rounded-xl border border-line/[0.08] space-y-2">
                  <input
                    value={ex.japanese}
                    onChange={(e) => {
                      const updated = [...form.examples];
                      updated[i] = { ...updated[i], japanese: e.target.value };
                      setForm({ ...form, examples: updated });
                    }}
                    className="w-full bg-surface border border-line/[0.10] rounded-lg px-3 py-1.5 text-fg text-sm japanese focus:outline-none focus:border-purple-500/50"
                    placeholder="Japanese sentence"
                  />
                  <input
                    value={ex.reading}
                    onChange={(e) => {
                      const updated = [...form.examples];
                      updated[i] = { ...updated[i], reading: e.target.value };
                      setForm({ ...form, examples: updated });
                    }}
                    className="w-full bg-surface border border-line/[0.10] rounded-lg px-3 py-1.5 text-fg text-sm japanese focus:outline-none focus:border-purple-500/50"
                    placeholder="Reading (hiragana/romaji)"
                  />
                  <input
                    value={ex.english}
                    onChange={(e) => {
                      const updated = [...form.examples];
                      updated[i] = { ...updated[i], english: e.target.value };
                      setForm({ ...form, examples: updated });
                    }}
                    className="w-full bg-surface border border-line/[0.10] rounded-lg px-3 py-1.5 text-fg text-sm focus:outline-none focus:border-purple-500/50"
                    placeholder="English translation"
                  />
                </div>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-fg font-semibold rounded-xl transition-all"
          >
            {saving ? "Enregistrement..." : "Enregistrer le point de grammaire"}
          </button>
        </form>
      )}
    </div>
  );
}
