import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { dnareaderRequiresLogin, resolveDnareader, toPublicOffer } from "@/lib/dnareader";

export async function GET() {
  const prive = dnareaderRequiresLogin();
  if (prive && !(await auth())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const offre = await resolveDnareader();
  return NextResponse.json(toPublicOffer(offre), {
    headers: { "Cache-Control": `${prive ? "private" : "public"}, max-age=300` },
  });
}
