import type { Metadata } from "next";
import "./globals.css";
import { SessionProvider } from "next-auth/react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "日本語学習 — Japanese Learning",
  description:
    "Maîtrisez la grammaire japonaise avec la répétition espacée : 979 points, exemples audio et révisions intelligentes.",
  other: {
    "darkreader-lock": "true",
  },
};

const ACCENTS = new Set(["momiji", "sakura", "matcha", "ai", "kin", "sumi"]);
const THEMES = new Set(["ink", "washi"]);

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let accent = "momiji";
  let theme = "ink";
  try {
    const session = await auth();
    if (session?.user?.id) {
      const u = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { accent: true, theme: true },
      });
      if (u?.accent && ACCENTS.has(u.accent)) accent = u.accent;
      if (u?.theme && THEMES.has(u.theme)) theme = u.theme;
    }
  } catch {
  }

  return (
    <html lang="fr" data-accent={accent} data-theme={theme} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
