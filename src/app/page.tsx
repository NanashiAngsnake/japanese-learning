import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Download } from "lucide-react";
import { dnareaderRequiresLogin, resolveDnareader, toPublicOffer } from "@/lib/dnareader";
import { formatOctets } from "@/lib/utils";

const ATOUTS_APP: [string, string][] = [
  ["Lecture à l'écran", "Le texte du jeu n'a pas à être sélectionnable."],
  ["Dictionnaire JMdict", "Déconjugaison façon Yomitan, au survol."],
  ["Ton vocabulaire", "Ce que tu survoles se garde, et se révise."],
];

export default async function HomePage() {
  const session = await auth();
  if (session) redirect("/dashboard");

  const freeLimit = Number(process.env.FREE_GRAMMAR_LIMIT ?? 20);
  const priceLabel = process.env.NEXT_PUBLIC_PRO_PRICE_LABEL ?? "8 € / mois";

  const app = toPublicOffer(await resolveDnareader());
  const installateur = app.assets.find((a) => a.variant === "setup") ?? app.assets[0] ?? null;
  const surCompte = dnareaderRequiresLogin();

  return (
    <main className="min-h-screen bg-gradient-to-br from-ink via-surface to-ink text-fg">
      <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden px-4">
        <div className="absolute inset-0 opacity-5 pointer-events-none select-none">
          <div className="absolute top-20 left-20 text-9xl text-red-500 japanese">日</div>
          <div className="absolute top-40 right-32 text-7xl text-red-500 japanese">本</div>
          <div className="absolute bottom-32 left-40 text-8xl text-red-500 japanese">語</div>
          <div className="absolute bottom-20 right-20 text-6xl text-red-500 japanese">学</div>
          <div className="absolute top-1/2 left-1/4 text-5xl text-red-500 japanese">習</div>
        </div>

        <div className="relative z-10 text-center max-w-2xl mx-auto">
          <div className="mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-accent/20 border border-accent/40 mb-4 glow-red">
              <span className="text-4xl japanese">日</span>
            </div>
            <h1 className="text-5xl font-bold text-fg mb-2">
              日本語<span className="text-accent">学習</span>
            </h1>
            <p className="text-muted text-lg">Maîtrisez la grammaire japonaise avec la répétition espacée</p>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-10">
            {[
              { icon: "📚", title: "979 points", desc: "N5 → N1" },
              { icon: "🔁", title: "SRS intelligent", desc: "Algorithme SM-2" },
              { icon: "🎧", title: "16 600+ exemples", desc: "Audio H/F" },
            ].map((f) => (
              <div key={f.title} className="bg-line/[0.05] rounded-xl p-4 border border-line/[0.10]">
                <div className="text-2xl mb-2">{f.icon}</div>
                <div className="font-semibold text-fg text-sm">{f.title}</div>
                <div className="text-dim text-xs">{f.desc}</div>
              </div>
            ))}
          </div>

          <div className="flex gap-4 justify-center">
            <Link
              href="/register"
              className="px-8 py-3 bg-accent hover:bg-accent-deep text-white font-semibold rounded-xl transition-all duration-200 hover:scale-105 glow-red"
            >
              Commencer gratuitement
            </Link>
            <Link
              href="/login"
              className="px-8 py-3 bg-line/[0.10] hover:bg-line/[0.15] text-fg font-semibold rounded-xl border border-line/[0.20] transition-all duration-200"
            >
              Se connecter
            </Link>
          </div>
          <p className="mt-6 text-sm text-dim">
            Les <span className="text-fg font-medium">{freeLimit} premiers points</span> sont gratuits — sans carte bancaire.
          </p>
        </div>

        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-dim text-xs animate-pulse">
          ↓ Tarifs &amp; application PC
        </div>
      </section>

      <section className="py-20 px-4 border-t border-line/[0.05]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold mb-2">Tarifs simples</h2>
            <p className="text-muted">Commencez gratuitement. Passez à Pro quand vous êtes prêt.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            <div className="bg-surface rounded-2xl p-6 border border-line/[0.10] flex flex-col">
              <div className="text-sm text-muted mb-1">Gratuit</div>
              <div className="text-4xl font-bold text-fg mb-5">0 €</div>
              <ul className="space-y-2.5 text-sm text-muted mb-6 flex-1">
                <li className="flex gap-2"><span className="text-green-400">✓</span> Les {freeLimit} premiers points (N5)</li>
                <li className="flex gap-2"><span className="text-green-400">✓</span> Révisions SRS sur ces points</li>
                <li className="flex gap-2"><span className="text-green-400">✓</span> Suivi de progression</li>
                <li className="flex gap-2 text-dim"><span>🔒</span> Reste du catalogue verrouillé</li>
              </ul>
              <Link href="/register" className="text-center py-3 bg-line/[0.10] hover:bg-line/[0.15] text-fg font-semibold rounded-xl transition-all">
                Créer un compte
              </Link>
            </div>

            <div className="bg-gradient-to-br from-accent/15 to-surface rounded-2xl p-6 border border-accent/40 relative flex flex-col">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-accent text-white text-xs font-semibold">
                Recommandé
              </div>
              <div className="text-sm text-accent font-medium mb-1">✨ Pro</div>
              <div className="text-4xl font-bold text-fg mb-5">{priceLabel}</div>
              <ul className="space-y-2.5 text-sm text-muted mb-6 flex-1">
                <li className="flex gap-2"><span className="text-green-400">✓</span> Les 979 points (N5 → N1)</li>
                <li className="flex gap-2"><span className="text-green-400">✓</span> 16 600+ exemples avec audio</li>
                <li className="flex gap-2"><span className="text-green-400">✓</span> Révisions SRS illimitées</li>
                <li className="flex gap-2"><span className="text-green-400">✓</span> Statistiques détaillées</li>
              </ul>
              <Link href="/register" className="text-center py-3 bg-accent hover:bg-accent-deep text-white font-semibold rounded-xl transition-all glow-red">
                Commencer gratuitement
              </Link>
            </div>
          </div>

          <p className="text-center text-dim text-xs mt-8">
            Créez un compte, apprenez les {freeLimit} premiers points gratuitement, puis passez à Pro depuis votre tableau de bord.
          </p>
        </div>
      </section>

      <section id="app" className="py-20 px-4 border-t border-line/[0.05]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold mb-2">L&apos;application PC</h2>
            <p className="text-muted">
              Le japonais de vos jeux, lu à l&apos;écran pendant que vous jouez.
            </p>
          </div>

          <div className="bg-surface rounded-2xl p-6 md:p-8 border border-line/[0.10]">
            <div className="flex flex-col sm:flex-row items-start gap-5">
              <div className="w-14 h-14 rounded-2xl bg-accent/15 border border-accent/30 flex items-center justify-center shrink-0">
                <span className="jp-serif text-2xl text-accent">漢</span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <h3 className="text-xl font-semibold text-fg">DNAreader</h3>
                  {app.version && <span className="chip tnum">v{app.version}</span>}
                  <span className="chip">Windows 10 / 11 · 64 bits</span>
                </div>

                <p className="text-muted text-sm leading-relaxed max-w-xl">
                  La lecture, le sens et le vocabulaire s&apos;affichent dans une bulle posée
                  à côté du texte — sans capture manuelle, sans quitter la partie.
                </p>

                <div className="grid sm:grid-cols-3 gap-3 mt-5">
                  {ATOUTS_APP.map(([titre, texte]) => (
                    <div key={titre} className="bg-line/[0.05] rounded-xl p-3 border border-line/[0.10]">
                      <div className="text-fg text-xs font-semibold mb-0.5">{titre}</div>
                      <div className="text-dim text-xs leading-relaxed">{texte}</div>
                    </div>
                  ))}
                </div>

                {installateur ? (
                  <div className="mt-6">
                    {surCompte ? (
                      <Link href="/login?callbackUrl=/dashboard/app" className="btn btn-primary">
                        <Download size={18} />
                        Se connecter pour télécharger
                      </Link>
                    ) : (
                      <a href={installateur.href} download className="btn btn-primary">
                        <Download size={18} />
                        Télécharger pour Windows
                      </a>
                    )}
                    <p className="text-dim text-xs mt-3 tnum">
                      {installateur.filename} · {formatOctets(installateur.size)} · sept jours
                      d&apos;essai, sans carte bancaire
                    </p>
                  </div>
                ) : (
                  <a
                    href={app.releasesUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-ghost mt-6 text-xs"
                  >
                    Voir la page des versions
                  </a>
                )}
              </div>
            </div>
          </div>

          <p className="text-center text-dim text-xs mt-6">
            DNAreader est un service distinct : l&apos;abonnement Pro de 日本語学習 ne le couvre pas.
          </p>
        </div>
      </section>
    </main>
  );
}
