import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";

export type DnareaderVariant = "setup" | "websetup" | "portable";

export interface DnareaderAsset {
  variant: DnareaderVariant;
  filename: string;
  size: number | null;
  sha256: string | null;
  path?: string;
  url?: string;
}

export interface DnareaderOffer {
  source: "url" | "local" | "github" | "none";
  version: string | null;
  publishedAt: string | null;
  assets: DnareaderAsset[];
  releasesUrl: string;
  siteUrl: string;
  error: string | null;
}

export interface DnareaderPublicAsset {
  variant: DnareaderVariant;
  filename: string;
  size: number | null;
  sha256: string | null;
  label: string;
  description: string;
  href: string;
}

export interface DnareaderPublicOffer {
  source: DnareaderOffer["source"];
  version: string | null;
  publishedAt: string | null;
  assets: DnareaderPublicAsset[];
  releasesUrl: string;
  siteUrl: string;
  error: string | null;
}

const REPO = process.env.DNAREADER_GITHUB_REPO ?? "NanashiAngsnake/dnareader-releases";

export const DNAREADER_RELEASES_URL = `https://github.com/${REPO}/releases/latest`;
export const DNAREADER_SITE_URL =
  process.env.DNAREADER_SITE_URL ?? "https://dnareader.example.com";

export const VARIANT_INFO: Record<DnareaderVariant, { label: string; description: string }> = {
  setup: {
    label: "Installateur Windows",
    description: "Tout est dedans : double-clic, et l'application est installée.",
  },
  websetup: {
    label: "Installateur web",
    description:
      "Quelques mégaoctets : il télécharge le reste, vérifie son empreinte, puis installe. Assez léger pour être envoyé par message.",
  },
  portable: {
    label: "Archive portable",
    description: "Rien n'est installé : on décompresse le dossier et on lance.",
  },
};

const ORDRE: DnareaderVariant[] = ["setup", "websetup", "portable"];

const MOTIFS: { variant: DnareaderVariant; motif: RegExp }[] = [
  { variant: "websetup", motif: /^DNAreader-WebSetup-(\d+(?:\.\d+)*)\.exe$/i },
  { variant: "setup", motif: /^DNAreader-Setup-(\d+(?:\.\d+)*)\.exe$/i },
  { variant: "portable", motif: /^DNAreader-(\d+(?:\.\d+)*)-portable\.zip$/i },
];

export function dnareaderDistDir(): string {
  const impose = process.env.DNAREADER_DIST_DIR?.trim();
  if (impose) return path.resolve(impose);
  return path.resolve(process.cwd(), "..", "kanji-game-reader", "dist");
}

function reconnaitre(nom: string): { variant: DnareaderVariant; version: string } | null {
  for (const { variant, motif } of MOTIFS) {
    const m = motif.exec(nom);
    if (m) return { variant, version: m[1] };
  }
  return null;
}

function comparerVersions(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}

function extraireEmpreinte(contenu: string): string | null {
  const m = /\b([a-f0-9]{64})\b/i.exec(contenu);
  return m ? m[1].toLowerCase() : null;
}

async function lireLocal(dir: string): Promise<DnareaderOffer | null> {
  let noms: string[];
  try {
    noms = await readdir(dir);
  } catch {
    return null;
  }

  const parVersion = new Map<string, Map<DnareaderVariant, string>>();
  for (const nom of noms) {
    const trouve = reconnaitre(nom);
    if (!trouve) continue;
    const variantes = parVersion.get(trouve.version) ?? new Map<DnareaderVariant, string>();
    variantes.set(trouve.variant, nom);
    parVersion.set(trouve.version, variantes);
  }

  const version = [...parVersion.keys()]
    .filter((v) => parVersion.get(v)!.has("setup"))
    .sort(comparerVersions)
    .pop();
  if (!version) return null;

  const assets: DnareaderAsset[] = [];
  for (const variant of ORDRE) {
    const nom = parVersion.get(version)!.get(variant);
    if (!nom) continue;
    const chemin = path.join(dir, nom);
    let taille: number | null = null;
    try {
      const s = await stat(chemin);
      if (!s.isFile()) continue;
      taille = s.size;
    } catch {
      continue;
    }
    let empreinte: string | null = null;
    try {
      empreinte = extraireEmpreinte(await readFile(`${chemin}.sha256`, "utf8"));
    } catch {
    }
    assets.push({ variant, filename: nom, size: taille, sha256: empreinte, path: chemin });
  }

  if (assets.length === 0) return null;
  return {
    source: "local",
    version,
    publishedAt: null,
    assets,
    releasesUrl: DNAREADER_RELEASES_URL,
    siteUrl: DNAREADER_SITE_URL,
    error: null,
  };
}

interface GithubAsset {
  name: string;
  size: number;
  browser_download_url: string;
}

async function lireGithub(): Promise<DnareaderOffer | null> {
  let release: { tag_name?: string; published_at?: string; assets?: GithubAsset[] };
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "japanese-learning",
        ...(process.env.GITHUB_TOKEN
          ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
          : {}),
      },
      next: { revalidate: 1800 },
    });
    if (!res.ok) return null;
    release = await res.json();
  } catch {
    return null;
  }

  const bruts = release.assets ?? [];
  const parNom = new Map(bruts.map((a) => [a.name, a]));

  const assets: DnareaderAsset[] = [];
  for (const variant of ORDRE) {
    const trouve = bruts.find((a) => reconnaitre(a.name)?.variant === variant);
    if (!trouve) continue;
    assets.push({
      variant,
      filename: trouve.name,
      size: trouve.size,
      sha256: await lireEmpreinteDistante(parNom.get(`${trouve.name}.sha256`)),
      url: trouve.browser_download_url,
    });
  }

  if (assets.length === 0) return null;
  return {
    source: "github",
    version: (release.tag_name ?? "").replace(/^v/i, "") || null,
    publishedAt: release.published_at ?? null,
    assets,
    releasesUrl: DNAREADER_RELEASES_URL,
    siteUrl: DNAREADER_SITE_URL,
    error: null,
  };
}

async function lireEmpreinteDistante(asset: GithubAsset | undefined): Promise<string | null> {
  if (!asset) return null;
  try {
    const res = await fetch(asset.browser_download_url, { next: { revalidate: 1800 } });
    if (!res.ok) return null;
    return extraireEmpreinte(await res.text());
  } catch {
    return null;
  }
}

function rien(error: string): DnareaderOffer {
  return {
    source: "none",
    version: null,
    publishedAt: null,
    assets: [],
    releasesUrl: DNAREADER_RELEASES_URL,
    siteUrl: DNAREADER_SITE_URL,
    error,
  };
}

export async function resolveDnareader(): Promise<DnareaderOffer> {
  const impose = process.env.DNAREADER_DOWNLOAD_URL?.trim();
  if (impose) {
    const nom = decodeURIComponent(impose.split("?")[0].split("/").pop() || "DNAreader-Setup.exe");
    const version = process.env.DNAREADER_VERSION?.trim() || reconnaitre(nom)?.version || null;
    return {
      source: "url",
      version,
      publishedAt: null,
      assets: [
        {
          variant: reconnaitre(nom)?.variant ?? "setup",
          filename: nom,
          size: null,
          sha256: process.env.DNAREADER_SHA256?.trim() || null,
          url: impose,
        },
      ],
      releasesUrl: DNAREADER_RELEASES_URL,
      siteUrl: DNAREADER_SITE_URL,
      error: null,
    };
  }

  const source = (process.env.DNAREADER_SOURCE ?? "auto").trim().toLowerCase();

  if (source !== "github") {
    const local = await lireLocal(dnareaderDistDir());
    if (local) return local;
    if (source === "local") {
      return rien(`Aucun installateur dans ${dnareaderDistDir()}.`);
    }
  }

  const github = await lireGithub();
  if (github) return github;

  return rien("La dernière version n'a pas pu être lue — GitHub est peut-être injoignable.");
}

export function toPublicOffer(offre: DnareaderOffer): DnareaderPublicOffer {
  return {
    source: offre.source,
    version: offre.version,
    publishedAt: offre.publishedAt,
    releasesUrl: offre.releasesUrl,
    siteUrl: offre.siteUrl,
    error: offre.error,
    assets: offre.assets.map((a) => ({
      variant: a.variant,
      filename: a.filename,
      size: a.size,
      sha256: a.sha256,
      label: VARIANT_INFO[a.variant].label,
      description: VARIANT_INFO[a.variant].description,
      href: `/api/app/download?variant=${a.variant}`,
    })),
  };
}

export function dnareaderRequiresLogin(): boolean {
  return /^(1|true|oui)$/i.test(process.env.DNAREADER_REQUIRE_LOGIN?.trim() ?? "");
}

export function parseVariant(valeur: string | null): DnareaderVariant | null {
  return ORDRE.includes(valeur as DnareaderVariant) ? (valeur as DnareaderVariant) : null;
}
