import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") return null;
  return session;
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const { id } = await params;

  await prisma.grammarPoint.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();

  const { examples, ...data } = body;

  const point = await prisma.grammarPoint.update({
    where: { id },
    data: {
      ...data,
      ...(examples !== undefined
        ? {
            examples: {
              deleteMany: {},
              create: examples,
            },
          }
        : {}),
    },
    include: { examples: true },
  });

  return NextResponse.json(point);
}
