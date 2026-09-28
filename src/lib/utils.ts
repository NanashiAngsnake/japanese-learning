import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function jlptLabel(level: number): string {
  if (level === 6) return "Kansai";
  if (level === 0) return "Non-JLPT";
  return `N${level}`;
}

export function jlptColor(level: number): string {
  const colors: Record<number, string> = {
    5: "bg-green-500/20 text-green-400 border-green-500/30",
    4: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    3: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    2: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    1: "bg-red-500/20 text-red-400 border-red-500/30",
    6: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    0: "bg-gray-500/20 text-muted border-gray-500/30",
  };
  return colors[level] ?? "bg-gray-500/20 text-muted";
}

export function formatOctets(octets: number | null | undefined): string {
  if (octets == null || !Number.isFinite(octets)) return "—";
  const unites = ["o", "Ko", "Mo", "Go"];
  let valeur = octets;
  let i = 0;
  while (valeur >= 1024 && i < unites.length - 1) {
    valeur /= 1024;
    i++;
  }
  const decimales = i >= 2 ? 1 : 0;
  return `${valeur.toFixed(decimales).replace(".", ",")} ${unites[i]}`;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
