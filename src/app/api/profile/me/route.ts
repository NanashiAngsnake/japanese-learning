import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getProfileSnapshot } from "@/lib/profile";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const snapshot = await getProfileSnapshot(session.user.id);
  if (!snapshot) return NextResponse.json({ error: "Profil introuvable" }, { status: 404 });

  return NextResponse.json(snapshot);
}
