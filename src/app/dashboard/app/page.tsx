"use client";

import { useEffect, useState } from "react";
import {
  Download, ShieldCheck, KeyRound, AlertCircle, ExternalLink,
  ScanText, Languages, BookOpen, Hash,
} from "lucide-react";
import { formatOctets } from "@/lib/utils";
import type { DnareaderPublicOffer } from "@/lib/dnareader";

const SOURCE_LABEL: Record<DnareaderPublicOffer["source"], string> = {
  local: "servi par ce serveur",
  github: "GitHub Releases",
  url: "miroir",
  none: "—",
};

const PAGE_VERSIONS = "https://github.com/NanashiAngsnake/dnareader-releases/releases/latest";

const ATOUTS = [
  {
    icon: ScanText,
    titre: "Lecture à l'écran",
    texte: "Le texte du jeu n'a pas à être sélectionnable : il est lu à l'image, caractère par caractère.",
  },
  {
    icon: Languages,
    titre: "Dictionnaire JMdict",
    texte: "Déconjugaison façon Yomitan : 食べさせられた → 食べる, 行かなければ → 行く.",
  },
  {
    icon: BookOpen,
    titre: "Ton vocabulaire",
    texte: "Ce que tu survoles se garde, et les corrections partagées profitent aux joueurs suivants.",
  },
];

export default function AppPage() {
  const [offre, setOffre] = useState<DnareaderPublicOffer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/app/release")
      .then((r) => r.json())
      .then((d: DnareaderPublicOffer) => setOffre(d))
      .catch(() => setOffre(null))
      .finally(() => setLoading(false));
  }, []);

  const assets = offre?.assets ?? [];
  const principal = assets.find((a) => a.variant === "setup") ?? assets[0] ?? null;
  const autres = assets.filter((a) => a !== principal);

  return (
    <div className="max-w-4xl mx-auto animate-fade-up">
      <div className="mb-8">
        <h1 className="text-3xl font-bold display text-fg">Application PC</h1>
        <p className="text-dim mt-1">
          DNAreader lit le japonais de tes jeux pendant que tu joues.
        </p>
      </div>

      <section className="surface p-6 md:p-7 mb-6">
        <div className="flex items-start gap-5">
          <div className="w-14 h-14 rounded-2xl bg-accent/15 border border-accent/30 flex items-center justify-center shrink-0">
            <span className="jp-serif text-2xl text-accent">漢</span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-semibold text-fg">DNAreader</h2>
              {offre?.version && <span className="chip tnum">v{offre.version}</span>}
              <span className="chip">Windows 10 / 11 · 64 bits</span>
            </div>

            <p className="text-muted text-sm mt-2 max-w-xl leading-relaxed">
              La lecture, le sens et le vocabulaire s&apos;affichent dans une bulle posée à
              côté du texte — sans capture manuelle, sans quitter la partie.
            </p>

            <div className="mt-5">
              {loading ? (
                <div className="space-y-3">
                  <div className="skeleton h-11 w-64 rounded-xl" />
                  <div className="skeleton h-3 w-48 rounded-full" />
                </div>
              ) : principal ? (
                <>
                  <a href={principal.href} download className="btn btn-primary">
                    <Download size={18} />
                    Télécharger pour Windows
                  </a>

                  <div className="mt-3 text-xs text-dim flex items-center gap-x-2 gap-y-1 flex-wrap tnum">
                    <span className="text-muted">{principal.filename}</span>
                    <span aria-hidden>·</span>
                    <span>{formatOctets(principal.size)}</span>
                    <span aria-hidden>·</span>
                    <span>{SOURCE_LABEL[offre!.source]}</span>
                    {offre?.publishedAt && (
                      <>
                        <span aria-hidden>·</span>
                        <span>
                          publié le{" "}
                          {new Date(offre.publishedAt).toLocaleDateString("fr-FR", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })}
                        </span>
                      </>
                    )}
                  </div>

                  {principal.sha256 && (
                    <div className="mt-3 flex items-start gap-2 text-[11px] text-dim">
                      <Hash size={13} className="mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <span className="uppercase tracking-[0.12em]">Empreinte SHA-256</span>
                        <code className="block mt-0.5 font-mono text-muted break-all">
                          {principal.sha256}
                        </code>
                      </div>
                    </div>
                  )}

                  {autres.length > 0 && (
                    <div className="mt-5 pt-5 border-t border-line/[0.07] space-y-3">
                      {autres.map((a) => (
                        <div key={a.variant} className="flex items-start gap-3">
                          <a href={a.href} download className="btn btn-ghost shrink-0 text-xs">
                            <Download size={14} />
                            {a.label}
                          </a>
                          <p className="text-xs text-dim leading-relaxed pt-2">
                            {a.description} <span className="tnum">({formatOctets(a.size)})</span>
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
                  <div className="flex items-start gap-2.5 text-sm text-fg">
                    <AlertCircle size={16} className="text-amber-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium">Aucun installateur à proposer pour l&apos;instant.</p>
                      <p className="text-muted text-xs mt-1">
                        {offre?.error ?? "Le service de téléchargement n'a pas répondu."}
                      </p>
                    </div>
                  </div>
                  <a
                    href={offre?.releasesUrl ?? PAGE_VERSIONS}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-ghost mt-4 text-xs"
                  >
                    Voir la page des versions
                    <ExternalLink size={14} />
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="grid md:grid-cols-2 gap-5 mb-6">
        <section className="surface-flat p-5">
          <h3 className="text-fg font-semibold text-sm flex items-center gap-2 mb-3">
            <ShieldCheck size={16} className="text-muted" />
            Avant d&apos;installer
          </h3>
          <ul className="space-y-2.5 text-sm text-muted">
            <li>Windows 10 ou 11, 64 bits. Aucun droit administrateur n&apos;est demandé.</li>
            <li>
              Windows affichera «&nbsp;Windows a protégé votre ordinateur&nbsp;» :
              l&apos;application n&apos;est pas encore signée.{" "}
              <span className="text-dim">
                Informations complémentaires › Exécuter quand même.
              </span>
            </li>
            <li>
              Ton vocabulaire et tes réglages vivent dans{" "}
              <code className="font-mono text-xs text-dim">%LOCALAPPDATA%\DNAreader</code> :
              désinstaller ne les efface pas.
            </li>
          </ul>
        </section>

        <section className="surface-flat p-5">
          <h3 className="text-fg font-semibold text-sm flex items-center gap-2 mb-3">
            <KeyRound size={16} className="text-muted" />
            L&apos;accès
          </h3>
          <ul className="space-y-2.5 text-sm text-muted">
            <li>Sept jours d&apos;essai gratuit, sans carte bancaire.</li>
            <li>
              Ensuite 5&nbsp;€ par mois, résiliable à tout moment — l&apos;abonnement se
              prend depuis l&apos;application. Deux machines, et quatorze jours
              d&apos;autonomie sans réseau.
            </li>
            <li className="text-dim">
              DNAreader est un service distinct : l&apos;abonnement Pro de 日本語学習 ne le
              couvre pas, et l&apos;inverse non plus.
            </li>
          </ul>
          <a
            href={offre?.siteUrl ?? "https://dnareader.example.com"}
            target="_blank"
            rel="noreferrer"
            className="btn btn-ghost mt-4 text-xs"
          >
            Le site de DNAreader
            <ExternalLink size={14} />
          </a>
        </section>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        {ATOUTS.map(({ icon: Icon, titre, texte }) => (
          <div key={titre} className="surface-flat p-5 card-hover">
            <div className="w-9 h-9 rounded-xl bg-accent/12 border border-accent/25 flex items-center justify-center mb-3">
              <Icon size={16} className="text-accent" />
            </div>
            <div className="text-fg font-medium text-sm mb-1">{titre}</div>
            <p className="text-xs text-dim leading-relaxed japanese">{texte}</p>
          </div>
        ))}
      </div>

      <p className="text-center text-dim text-xs mt-8">
        Dictionnaire JMdict de l&apos;EDRDG, sous licence CC BY-SA 4.0.
      </p>
    </div>
  );
}
