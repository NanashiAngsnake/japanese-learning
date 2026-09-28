import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getPublicSnapshot } from "@/lib/profile";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { username } = await params;

  const res = await getPublicSnapshot(username, session.user.id);

  if (res.status === "introuvable") {
    return NextResponse.json(
      { error: "Ce membre n'existe pas", status: "introuvable" },
      { status: 404 }
    );
  }

  if (res.status === "prive") {
    return NextResponse.json(
      { error: "Profil privé", status: "prive", private: true },
      { status: 403 }
    );
  }

  return NextResponse.json({ snapshot: res.snapshot });
}
