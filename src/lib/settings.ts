import { z } from "zod";

export const ACCENTS = ["momiji", "sakura", "matcha", "ai", "kin", "sumi"] as const;
export const THEMES = ["ink", "washi"] as const;
export const REVIEW_ORDERS = ["due", "random", "level"] as const;

export type Accent = (typeof ACCENTS)[number];
export type Theme = (typeof THEMES)[number];

export const THEME_META: { value: Theme; label: string; kanji: string; desc: string }[] = [
  { value: "ink", label: "Encre", kanji: "墨", desc: "Sombre, contrasté" },
  { value: "washi", label: "Washi", kanji: "和紙", desc: "Clair, papier japonais" },
];

export const ACCENT_META: { value: Accent; label: string; kanji: string; swatch: string }[] = [
  { value: "momiji", label: "Momiji", kanji: "紅葉", swatch: "#E23A4E" },
  { value: "sakura", label: "Sakura", kanji: "桜", swatch: "#F472A0" },
  { value: "matcha", label: "Matcha", kanji: "抹茶", swatch: "#6BBF59" },
  { value: "ai", label: "Ai", kanji: "藍", swatch: "#4A7BD4" },
  { value: "kin", label: "Kin", kanji: "金", swatch: "#D4A63C" },
  { value: "sumi", label: "Sumi", kanji: "墨", swatch: "#969EB4" },
];

export const settingsSchema = z.object({
  showFurigana: z.boolean().optional(),
  autoplayAudio: z.boolean().optional(),
  dailyReviewLimit: z.number().int().min(5).max(200).optional(),
  reviewOrder: z.enum(REVIEW_ORDERS).optional(),
  accent: z.enum(ACCENTS).optional(),
  theme: z.enum(THEMES).optional(),
});

export type SettingsInput = z.infer<typeof settingsSchema>;

export const SETTINGS_SELECT = {
  showFurigana: true,
  autoplayAudio: true,
  dailyReviewLimit: true,
  reviewOrder: true,
  accent: true,
  theme: true,
} as const;

const blankToNull = (v: string) => {
  const t = v.trim();
  return t.length === 0 ? null : t;
};

const glyphCount = (v: string) => [...v].length;

export const publicProfileSchema = z.object({
  displayName: z
    .string()
    .max(24, "Le nom affiché ne peut pas dépasser 24 caractères")
    .transform(blankToNull)
    .nullable()
    .optional(),
  bio: z
    .string()
    .max(160, "La présentation ne peut pas dépasser 160 caractères")
    .transform(blankToNull)
    .nullable()
    .optional(),
  avatarEmoji: z
    .string()
    .trim()
    .refine((v) => glyphCount(v) >= 1 && glyphCount(v) <= 2, "Un ou deux caractères maximum")
    .refine((v) => !/^[a-zA-Z0-9 ]+$/.test(v), "Choisissez un emoji ou un caractère japonais")
    .optional(),
  profilePublic: z.boolean().optional(),
  showOnLeaderboard: z.boolean().optional(),
});

export type PublicProfileInput = z.infer<typeof publicProfileSchema>;

export const PROFILE_SELECT = {
  displayName: true,
  bio: true,
  avatarEmoji: true,
  profilePublic: true,
  showOnLeaderboard: true,
} as const;
