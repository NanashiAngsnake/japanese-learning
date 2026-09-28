import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { slugify } from "@/lib/utils";

const grammarSchema = z.object({
  title: z.string().min(1),
  meaning: z.string().min(1),
  structure: z.string().optional(),
  jlptLevel: z.number().min(1).max(5),
  lesson: z.number().optional(),
  explanation: z.string().min(1),
  caution: z.string().optional(),
  nuance: z.string().optional(),
  bunproUrl: z.string().optional(),
  examples: z
    .array(
      z.object({
        japanese: z.string(),
        reading: z.string().optional(),
        english: z.string(),
      })
    )
    .optional(),
});

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") return null;
  return session;
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const body = await req.json();
  const parsed = grammarSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }

  const { examples, ...data } = parsed.data;
  const slug = slugify(data.title);

  const maxOrder = await prisma.grammarPoint.aggregate({ _max: { order: true } });
  const nextOrder = (maxOrder._max.order ?? 0) + 1;

  const point = await prisma.grammarPoint.create({
    data: {
      ...data,
      order: nextOrder,
      slug,
      examples: examples ? { create: examples } : undefined,
    },
    include: { examples: true },
  });

  return NextResponse.json(point, { status: 201 });
}

export async function GET(_req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const points = await prisma.grammarPoint.findMany({
    include: { _count: { select: { examples: true, studyItems: true } } },
    orderBy: [{ jlptLevel: "desc" }, { lesson: "asc" }],
  });

  return NextResponse.json(points);
}
