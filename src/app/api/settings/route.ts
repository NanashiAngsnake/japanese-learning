import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { settingsSchema, SETTINGS_SELECT, PROFILE_SELECT } from "@/lib/settings";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      ...SETTINGS_SELECT, ...PROFILE_SELECT,
      username: true, email: true, createdAt: true,
      bunproToken: true,
    },
  });
  if (!user) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const { bunproToken, ...rest } = user;
  return NextResponse.json({ ...rest, hasBunproToken: Boolean(bunproToken) });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const parsed = settingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }
  if (Object.keys(parsed.data).length === 0) {
    return NextResponse.json({ error: "Aucun changement" }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: parsed.data,
    select: SETTINGS_SELECT,
  });

  return NextResponse.json(user);
}
