import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function dayKey(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function fromDayKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function daysBetween(a: string, b: string): number {
  return Math.round((fromDayKey(b).getTime() - fromDayKey(a).getTime()) / 86_400_000);
}

async function main() {
  const users = await prisma.user.findMany({ select: { id: true, username: true } });
  console.log(`${users.length} compte(s) à traiter\n`);

  for (const user of users) {
    const reviews = await prisma.review.findMany({
      where: { userId: user.id },
      select: { reviewedAt: true, score: true },
      orderBy: { reviewedAt: "asc" },
    });

    const items = await prisma.studyItem.findMany({
      where: { userId: user.id },
      select: { createdAt: true },
    });

    const days = new Map<string, { reviews: number; correct: number; learned: number }>();
    const bump = (key: string) => {
      let row = days.get(key);
      if (!row) days.set(key, (row = { reviews: 0, correct: 0, learned: 0 }));
      return row;
    };

    for (const r of reviews) {
      const row = bump(dayKey(r.reviewedAt));
      row.reviews++;
      if (r.score >= 3) row.correct++;
    }
    for (const it of items) bump(dayKey(it.createdAt)).learned++;

    await prisma.dailyActivity.deleteMany({ where: { userId: user.id } });
    const rows = [...days.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, v]) => ({ userId: user.id, day, ...v }));
    if (rows.length) await prisma.dailyActivity.createMany({ data: rows });

    const studied = rows.filter((r) => r.reviews > 0).map((r) => r.day);
    let longest = 0;
    let run = 0;
    let prev: string | null = null;
    for (const day of studied) {
      run = prev && daysBetween(prev, day) === 1 ? run + 1 : 1;
      longest = Math.max(longest, run);
      prev = day;
    }
    const last = studied[studied.length - 1] ?? null;
    const current = last ? run : 0;

    await prisma.user.update({
      where: { id: user.id },
      data: {
        currentStreak: current,
        longestStreak: longest,
        lastStudyDay: last,
      },
    });

    console.log(
      `  ${user.username.padEnd(16)} ${String(studied.length).padStart(4)} jour(s) étudié(s) · ` +
        `série ${current} · record ${longest} · dernier ${last ?? "—"}`
    );
  }

  console.log("\nTerminé.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
