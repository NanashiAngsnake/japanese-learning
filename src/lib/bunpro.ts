import { calculateSRS } from "@/lib/srs";

const BASE = "https://bunpro.jp/api/v3/user";

const PATHS = ["all_review_data", "recent_items", "study_queue"] as const;

export interface BunproItem {
  bunproId: number;
  streak: number;
}

export interface FetchResult {
  ok: boolean;
  path?: string;
  items: BunproItem[];
  error?: string;
  sample?: unknown;
}

function asNumber(v: unknown): number | null {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) ? n : null;
}

export function extractItems(payload: unknown): BunproItem[] {
  const out = new Map<number, number>();

  const visit = (node: unknown, depth = 0) => {
    if (!node || depth > 6) return;
    if (Array.isArray(node)) {
      for (const n of node) visit(n, depth + 1);
      return;
    }
    if (typeof node !== "object") return;

    const o = node as Record<string, unknown>;
    const id =
      asNumber(o.grammar_point_id) ??
      asNumber(o.grammar_id) ??
      (o.type === "grammar_point" || o.grammar_point ? asNumber(o.id) : null);

    if (id !== null) {
      const streak =
        asNumber(o.streak) ??
        asNumber(o.times_correct) ??
        asNumber(o.srs_level) ??
        asNumber(o.level) ??
        0;
      out.set(id, Math.max(out.get(id) ?? 0, Math.max(0, streak ?? 0)));
    }

    for (const v of Object.values(o)) visit(v, depth + 1);
  };

  visit(payload);
  return [...out].map(([bunproId, streak]) => ({ bunproId, streak }));
}

export async function fetchBunproProgress(token: string): Promise<FetchResult> {
  const clean = token.trim();
  if (!clean) return { ok: false, items: [], error: "Jeton vide." };

  let lastError = "Aucun chemin d'API n'a répondu.";

  for (const path of PATHS) {
    try {
      const res = await fetch(`${BASE}/${encodeURIComponent(clean)}/${path}`, {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });

      if (res.status === 401 || res.status === 403) {
        return {
          ok: false,
          items: [],
          error:
            "Bunpro refuse le jeton (401/403). Vérifiez que l'API est activée " +
            "sur votre compte et que le jeton est celui affiché dans vos réglages Bunpro.",
        };
      }
      if (!res.ok) { lastError = `${path} → HTTP ${res.status}`; continue; }

      const text = await res.text();
      let json: unknown;
      try { json = JSON.parse(text); }
      catch { lastError = `${path} → réponse non JSON`; continue; }

      const items = extractItems(json);
      if (items.length) return { ok: true, path, items };

      lastError = `${path} → JSON reçu mais aucun point de grammaire reconnu`;
      return { ok: false, items: [], error: lastError, sample: json };
    } catch (e) {
      lastError = `${path} → ${(e as Error).message}`;
    }
  }

  return { ok: false, items: [], error: lastError };
}

export function srsFromStreak(streak: number) {
  let card = { easeFactor: 2.5, interval: 1, repetitions: 0, nextReview: new Date(), streak: 0 };
  for (let i = 0; i < Math.min(streak, 12); i++) {
    const r = calculateSRS(card, 4);
    card = {
      easeFactor: r.easeFactor, interval: r.interval, repetitions: r.repetitions,
      nextReview: r.nextReview, streak: r.streak,
    };
  }
  return card;
}
