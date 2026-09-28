import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const total = await prisma.example.count();
  const points = await prisma.grammarPoint.count();

  const htmlLeft = await prisma.example.count({
    where: { OR: [{ japanese: { contains: "<" } }, { cloze: { contains: "<" } }, { english: { contains: "<" } }] },
  });
  const entities = await prisma.example.count({
    where: { OR: [{ japanese: { contains: "&amp;" } }, { japanese: { contains: "&lt;" } }, { japanese: { contains: "&#" } }] },
  });
  const reviewable = await prisma.example.count({ where: { cloze: { not: null } } });
  const noEnglish = await prisma.example.count({ where: { english: "" } });
  const withAudio = await prisma.example.count({ where: { audio: { not: null } } });
  const badCloze = await prisma.example.count({
    where: { cloze: { not: null }, NOT: { cloze: { contains: "____" } } },
  });
  const bySource = await prisma.example.groupBy({ by: ["source"], _count: true });
  const noBunproId = await prisma.grammarPoint.count({ where: { bunproId: null } });
  const pointsNoExample = await prisma.grammarPoint.count({ where: { examples: { none: {} } } });

  const problems: string[] = [];
  if (htmlLeft) problems.push(`${htmlLeft} phrases contiennent encore une balise HTML`);
  if (entities) problems.push(`${entities} phrases contiennent une entité HTML non décodée`);
  if (badCloze) problems.push(`${badCloze} clozes sans marqueur ____`);
  if (pointsNoExample) problems.push(`${pointsNoExample} points sans aucun exemple`);

  console.log(`\n📊 Contenu`);
  console.log(`   points de grammaire : ${points} (sans bunproId : ${noBunproId})`);
  console.log(`   exemples            : ${total}`);
  console.log(`   par source          : ${bySource.map((s) => `${s.source}=${s._count}`).join(" · ") || "—"}`);
  console.log(`   révisables (cloze)  : ${reviewable}  (${((reviewable / total) * 100).toFixed(1)} %)`);
  console.log(`   avec audio          : ${withAudio}`);
  console.log(`   sans traduction     : ${noEnglish}`);

  console.log(`\n🧪 Intégrité`);
  console.log(`   balises HTML restantes : ${htmlLeft}`);
  console.log(`   entités non décodées   : ${entities}`);

  const samples = await prisma.example.findMany({
    where: { cloze: { not: null } },
    take: 4,
    orderBy: { id: "asc" },
    select: { japanese: true, cloze: true, answer: true, english: true, source: true },
  });
  console.log(`\n🔍 Échantillons`);
  for (const s of samples) {
    console.log(`   [${s.source}] ${s.japanese}`);
    console.log(`        trou : ${s.cloze}   → « ${s.answer} »`);
    console.log(`        en   : ${s.english}`);
  }

  if (problems.length) {
    console.log(`\n❌ ${problems.length} problème(s) :`);
    problems.forEach((p) => console.log(`   - ${p}`));
    process.exitCode = 1;
  } else {
    console.log(`\n✅ Aucun problème d'intégrité détecté.`);
  }

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
