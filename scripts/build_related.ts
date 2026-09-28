import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const num = (n: string, d: number) => {
  const i = process.argv.indexOf(`--${n}`);
  return i !== -1 && process.argv[i + 1] ? Number(process.argv[i + 1]) : d;
};
const DRY = process.argv.includes("--dry");

const STOP = new Set([
  "the", "a", "an", "to", "be", "is", "are", "was", "were", "of", "in", "on", "at",
  "for", "and", "or", "but", "that", "this", "it", "as", "by", "with", "from",
  "do", "does", "did", "done", "have", "has", "had", "will", "would", "can",
  "something", "someone", "somebody", "thing", "way", "used", "use", "using",
  "form", "expression", "particle", "verb", "noun", "adjective", "sentence",
  "you", "your", "one", "also", "very", "more", "than", "when", "which", "who",
]);

const NEG = /\b(not|n't|never|without|un\w+|non-?\w+|no longer|nothing|neither)\b/i;

function tokens(meaning: string): Set<string> {
  return new Set(
    meaning
      .toLowerCase()
      .split(/[^a-z']+/)
      .filter((w) => w.length >= 3 && !STOP.has(w))
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

function coreTitle(t: string): string {
  return t.replace(/[〜～\s・（）()]/g, "").replace(/[①②③④⑤⑥⑦⑧⑨⑩⑪⑫]/g, "").trim();
}

function longestCommon(a: string, b: string): string {
  if (!a || !b) return "";
  let best = "";
  for (let i = 0; i < a.length; i++) {
    for (let j = i + best.length + 1; j <= a.length; j++) {
      const sub = a.slice(i, j);
      if (b.includes(sub)) best = sub;
      else break;
    }
  }
  return best;
}

function formScore(a: string, b: string, df: Map<string, number>): number {
  const lcs = longestCommon(a, b);
  if (lcs.length < 2) return 0;
  const freq = df.get(lcs) ?? 1;
  const rarity = 1 / Math.sqrt(freq);
  return (lcs.length / Math.min(a.length, b.length)) * rarity;
}

function buildDf(cores: string[]): Map<string, number> {
  const df = new Map<string, number>();
  for (const c of cores) {
    const seen = new Set<string>();
    for (let len = 2; len <= 5; len++) {
      for (let i = 0; i + len <= c.length; i++) seen.add(c.slice(i, i + len));
    }
    for (const s of seen) df.set(s, (df.get(s) ?? 0) + 1);
  }
  return df;
}

async function main() {
  const top = num("top", 6);

  const points = await prisma.grammarPoint.findMany({
    select: {
      id: true, order: true, slug: true, title: true, meaning: true,
      jlptLevel: true, lesson: true, partOfSpeech: true,
    },
    orderBy: { order: "asc" },
  });

  const df = buildDf(points.map((p) => coreTitle(p.title)));

  const prepared = points.map((p) => ({
    ...p,
    toks: tokens(p.meaning),
    core: coreTitle(p.title),
    neg: NEG.test(p.meaning),
  }));

  let written = 0, totalLinks = 0, withNone = 0;
  const sample: string[] = [];

  for (const p of prepared) {
    const scored: { p: (typeof prepared)[number]; score: number; kind: string }[] = [];

    for (const q of prepared) {
      if (q.id === p.id) continue;

      const meaningScore = jaccard(p.toks, q.toks);
      const formS = formScore(p.core, q.core, df);
      if (meaningScore === 0 && formS === 0) continue;

      let score = meaningScore * 0.62 + formS * 0.38;
      if (p.lesson && p.lesson === q.lesson) score += 0.06;
      if (p.partOfSpeech && p.partOfSpeech === q.partOfSpeech) score += 0.04;

      if (score < 0.1) continue;
      scored.push({
        p: q,
        score,
        kind: meaningScore >= 0.2 && p.neg !== q.neg ? "contraste" : "proche",
      });
    }

    scored.sort((a, b) => b.score - a.score);
    const solid = scored.filter((s) => s.score >= 0.22);
    const kept = solid.length ? solid.slice(0, top) : scored.slice(0, 3);
    if (!kept.length) withNone++;

    const payload = kept.map((k) => ({
      slug: k.p.slug,
      title: k.p.title,
      meaning: k.p.meaning,
      level: k.p.jlptLevel,
      kind: k.kind,
    }));

    totalLinks += payload.length;
    if (sample.length < 4 && payload.length >= 3) {
      sample.push(
        `   ${p.title} → ${payload.map((x) => `${x.title}${x.kind === "contraste" ? " (contraste)" : ""}`).join(" · ")}`
      );
    }

    if (!DRY) {
      await prisma.grammarPoint.update({
        where: { id: p.id },
        data: { relatedGrammar: payload.length ? JSON.stringify(payload) : null },
      });
    }
    written++;
  }

  console.log(`\n🔗 ${written} points traités`);
  console.log(`   ${totalLinks} liens (${(totalLinks / written).toFixed(1)} par point en moyenne)`);
  console.log(`   ${withNone} points sans voisin au-dessus du seuil`);
  console.log(`\n🔍 Échantillon :`);
  sample.forEach((s) => console.log(s));
  if (DRY) console.log(`\n(dry-run : rien n'a été écrit)`);

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
