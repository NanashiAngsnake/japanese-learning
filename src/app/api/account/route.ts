import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { publicProfileSchema, PROFILE_SELECT } from "@/lib/settings";

const accountSchema = z
  .object({
    username: z
      .string()
      .min(3, "Minimum 3 caractères")
      .max(20, "Maximum 20 caractères")
      .regex(/^[a-zA-Z0-9_]+$/, "Lettres, chiffres et _ uniquement")
      .optional(),
    email: z.string().email("Email invalide").optional(),
  })
  .merge(publicProfileSchema);

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const parsed = accountSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }
  const { username, email, ...profile } = parsed.data;
  if (!username && !email && Object.keys(profile).length === 0) {
    return NextResponse.json({ error: "Aucun changement" }, { status: 400 });
  }

  if (username || email) {
    const clash = await prisma.user.findFirst({
      where: {
        id: { not: session.user.id },
        OR: [...(email ? [{ email }] : []), ...(username ? [{ username }] : [])],
      },
      select: { email: true, username: true },
    });
    if (clash) {
      const field = clash.email === email ? "email" : "nom d'utilisateur";
      return NextResponse.json({ error: `Ce ${field} est déjà utilisé` }, { status: 409 });
    }
  }

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: { ...(username ? { username } : {}), ...(email ? { email } : {}), ...profile },
    select: { username: true, email: true, ...PROFILE_SELECT },
  });

  return NextResponse.json(user);
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { password } = await req.json().catch(() => ({}));
  if (!password) {
    return NextResponse.json({ error: "Mot de passe requis" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return NextResponse.json({ error: "Mot de passe incorrect" }, { status: 403 });

  await prisma.user.delete({ where: { id: user.id } });

  return NextResponse.json({ ok: true });
}
