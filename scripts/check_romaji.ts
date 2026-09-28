import { PrismaClient } from "@prisma/client";
import { romajiToKana, answerReading, matchesAnswer } from "../src/lib/romaji";

const prisma = new PrismaClient();

const CASES: [string, string][] = [
  ["da", "だ"],
  ["watashi", "わたし"],
  ["konnichiha", "こんにちは"],
  ["gakusei", "がくせい"],
  ["kitte", "きって"],
  ["zasshi", "ざっし"],
  ["shinbun", "しんぶん"],
  ["ryokou", "りょこう"],
  ["kya", "きゃ"],
  ["jugyou", "じゅぎょう"],
  ["chotto", "ちょっと"],
  ["tsukue", "つくえ"],
  ["fuyu", "ふゆ"],
  ["sensei", "せんせい"],
  ["kin'en", "きんえん"],
  ["kinen", "きねん"],
  ["hon", "ほん"],
  ["honn", "ほん"],
  ["sannen", "さんねん"],
  ["annai", "あんない"],
  ["nyuugaku", "にゅうがく"],
  ["nihon", "にほん"],
  ["sakka", "さっか"],
  ["shashin", "しゃしん"],
  ["dekiru", "できる"],
  ["si", "し"], ["ti", "ち"], ["tu", "つ"], ["hu", "ふ"], ["zi", "じ"],
  ["syashin", "しゃしん"], ["jyugyou", "じゅぎょう"],
];

async function main() {
  let bad = 0;
  console.log("── conversion rōmaji → kana ──");
  for (const [input, expected] of CASES) {
    const got = romajiToKana(input);
    if (got !== expected) { console.log(`   ✗ ${input} → ${got}   (attendu ${expected})`); bad++; }
  }
  console.log(`   ${CASES.length - bad}/${CASES.length} conversions correctes`);

  console.log("\n── acceptation des réponses réelles ──");
  const rows = await prisma.example.findMany({
    where: { source: "original", answer: { not: "" } },
    select: { japanese: true, answer: true },
  });

  let noReading = 0, rejected = 0, kanjiAnswers = 0;
  const samples: string[] = [];

  for (const r of rows) {
    const hasKanji = /[一-鿿々]/.test(r.answer);
    if (hasKanji) kanjiAnswers++;

    const reading = answerReading(r.japanese, r.answer);
    if (hasKanji && !reading) {
      noReading++;
      if (samples.length < 5) samples.push(`lecture introuvable : ${r.answer}  ←  ${r.japanese.slice(0, 40)}`);
      continue;
    }
    const probe = reading ?? r.answer;
    if (!matchesAnswer(probe, r.answer, r.japanese)) {
      rejected++;
      if (samples.length < 5) samples.push(`refusee : « ${probe} » pour ${r.answer}`);
    }
  }

  console.log(`   ${rows.length} réponses · ${kanjiAnswers} contiennent des kanji`);
  console.log(`   lectures introuvables : ${noReading}`);
  console.log(`   lectures refusées     : ${rejected}`);
  for (const s of samples) console.log(`      ${s}`);

  const exact = rows.filter((r) => !matchesAnswer(r.answer, r.answer, r.japanese)).length;
  console.log(`   forme exacte refusée  : ${exact}`);

  const total = bad + noReading + rejected + exact;
  console.log(total === 0 ? "\n✅ Tout passe." : `\n❌ ${total} problème(s).`);
  await prisma.$disconnect();
  process.exit(total === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
