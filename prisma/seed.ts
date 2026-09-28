import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@japanese.local";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "admin123";

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`✓ Admin déjà présent : ${email}`);
  } else {
    await prisma.user.create({
      data: {
        email,
        username: "admin",
        password: await bcrypt.hash(password, 12),
        role: "ADMIN",
      },
    });
    console.log(`✓ Admin créé : ${email} / ${password}  (pensez à changer le mot de passe)`);
  }

  const count = await prisma.grammarPoint.count();
  if (count === 0) {
    console.log("ℹ️  Aucun point de grammaire. Importez-les :  npm run import");
  } else {
    console.log(`ℹ️  ${count} points de grammaire présents.`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
