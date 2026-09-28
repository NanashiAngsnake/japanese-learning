"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", username: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirm) {
      setError("Les mots de passe ne correspondent pas");
      return;
    }

    setLoading(true);

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: form.email, username: form.username, password: form.password }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Erreur lors de l'inscription");
      setLoading(false);
      return;
    }

    await signIn("credentials", {
      email: form.email,
      password: form.password,
      redirect: false,
    });

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-ink px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <div className="text-4xl japanese mb-2">日</div>
          </Link>
          <h1 className="text-2xl font-bold text-fg">Créer un compte</h1>
          <p className="text-dim text-sm mt-1">
            Le premier compte créé sera administrateur
          </p>
        </div>

        <div className="bg-surface rounded-2xl p-8 border border-line/[0.10]">
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-muted mb-1.5">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full bg-line/[0.05] border border-line/[0.10] rounded-lg px-4 py-2.5 text-fg placeholder-dim focus:outline-none focus:border-accent/60 transition-colors"
                placeholder="vous@example.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-muted mb-1.5">Nom d&apos;utilisateur</label>
              <input
                type="text"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                className="w-full bg-line/[0.05] border border-line/[0.10] rounded-lg px-4 py-2.5 text-fg placeholder-dim focus:outline-none focus:border-accent/60 transition-colors"
                placeholder="tanaka_taro"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-muted mb-1.5">Mot de passe</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full bg-line/[0.05] border border-line/[0.10] rounded-lg px-4 py-2.5 text-fg placeholder-dim focus:outline-none focus:border-accent/60 transition-colors"
                placeholder="Minimum 8 caractères"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-muted mb-1.5">Confirmer le mot de passe</label>
              <input
                type="password"
                value={form.confirm}
                onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                className="w-full bg-line/[0.05] border border-line/[0.10] rounded-lg px-4 py-2.5 text-fg placeholder-dim focus:outline-none focus:border-accent/60 transition-colors"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-accent hover:bg-accent-deep disabled:opacity-50 text-white font-semibold rounded-xl transition-all duration-200 mt-2"
            >
              {loading ? "Inscription..." : "Créer le compte"}
            </button>
          </form>

          <p className="text-center text-dim text-sm mt-6">
            Déjà un compte ?{" "}
            <Link href="/login" className="text-accent hover:text-accent-soft transition-colors">
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
