"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

function destination(callbackUrl: string | null): string {
  if (!callbackUrl) return "/dashboard";
  if (!callbackUrl.startsWith("/") || callbackUrl.startsWith("//")) return "/dashboard";
  return callbackUrl;
}

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await signIn("credentials", {
      email: form.email,
      password: form.password,
      redirect: false,
    });

    setLoading(false);

    if (res?.error) {
      setError("Email ou mot de passe incorrect");
    } else {
      const params = new URLSearchParams(window.location.search);
      router.push(destination(params.get("callbackUrl")));
      router.refresh();
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-ink px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <div className="text-4xl japanese mb-2">日</div>
          </Link>
          <h1 className="text-2xl font-bold text-fg">Connexion</h1>
          <p className="text-dim text-sm mt-1">Continuez votre apprentissage</p>
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
              <label className="block text-sm text-muted mb-1.5">Mot de passe</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
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
              {loading ? "Connexion..." : "Se connecter"}
            </button>
          </form>

          <p className="text-center text-dim text-sm mt-6">
            Pas encore de compte ?{" "}
            <Link href="/register" className="text-accent hover:text-accent-soft transition-colors">
              Créer un compte
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
