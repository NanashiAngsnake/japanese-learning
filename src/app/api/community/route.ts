import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCommunity } from "@/lib/profile";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const [members, user] = await Promise.all([
    getCommunity(),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { username: true },
    }),
  ]);

  return NextResponse.json({ members, me: user?.username ?? "" });
}
