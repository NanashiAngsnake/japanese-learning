import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";

const schema = z.object({
  email: z.string().email("Email invalide"),
  username: z
    .string()
    .min(3, "Minimum 3 caractères")
    .max(20, "Maximum 20 caractères")
    .regex(/^[a-zA-Z0-9_]+$/, "Lettres, chiffres et _ uniquement"),
  password: z.string().min(8, "Minimum 8 caractères"),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0].message },
      { status: 400 }
    );
  }

  const { email, username, password } = parsed.data;

  const exists = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }] },
  });

  if (exists) {
    const field = exists.email === email ? "email" : "username";
    return NextResponse.json(
      { error: `Ce ${field} est déjà utilisé` },
      { status: 409 }
    );
  }

  const hashed = await bcrypt.hash(password, 12);

  const userCount = await prisma.user.count();

  const user = await prisma.user.create({
    data: {
      email,
      username,
      password: hashed,
      role: userCount === 0 ? "ADMIN" : "USER",
    },
  });

  return NextResponse.json(
    { id: user.id, email: user.email, username: user.username, role: user.role },
    { status: 201 }
  );
}
