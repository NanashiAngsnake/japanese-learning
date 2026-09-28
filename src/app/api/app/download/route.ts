import { NextResponse } from "next/server";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { auth } from "@/lib/auth";
import { dnareaderRequiresLogin, parseVariant, resolveDnareader } from "@/lib/dnareader";

export const dynamic = "force-dynamic";

const TYPES: Record<string, string> = {
  ".exe": "application/octet-stream",
  ".zip": "application/zip",
};

export async function GET(request: Request) {
  if (dnareaderRequiresLogin() && !(await auth())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const demande = new URL(request.url).searchParams.get("variant");
  const variant = parseVariant(demande ?? "setup");
  if (!variant) {
    return NextResponse.json({ error: `Variante inconnue : ${demande}` }, { status: 400 });
  }

  const offre = await resolveDnareader();
  const asset = offre.assets.find((a) => a.variant === variant);
  if (!asset) {
    return NextResponse.json(
      { error: offre.error ?? "Aucun fichier de ce type dans la dernière version." },
      { status: 404 },
    );
  }

  if (asset.url) return NextResponse.redirect(asset.url, 307);
  if (!asset.path) {
    return NextResponse.json({ error: "Fichier introuvable." }, { status: 404 });
  }

  let taille: number;
  try {
    taille = (await stat(asset.path)).size;
  } catch {
    return NextResponse.json({ error: "Fichier introuvable." }, { status: 404 });
  }

  let debut = 0;
  let fin = taille - 1;
  let statut = 200;

  const plage = request.headers.get("range");
  if (plage) {
    const m = /^bytes=(\d*)-(\d*)$/.exec(plage.trim());
    if (m && (m[1] !== "" || m[2] !== "")) {
      if (m[1] === "") {
        debut = Math.max(0, taille - Number(m[2]));
      } else {
        debut = Number(m[1]);
        if (m[2] !== "") fin = Math.min(Number(m[2]), taille - 1);
      }
      if (debut > fin || debut >= taille) {
        return new Response(null, {
          status: 416,
          headers: { "Content-Range": `bytes */${taille}`, "Accept-Ranges": "bytes" },
        });
      }
      statut = 206;
    }
  }

  const extension = asset.filename.slice(asset.filename.lastIndexOf(".")).toLowerCase();
  const entetes = new Headers({
    "Content-Type": TYPES[extension] ?? "application/octet-stream",
    "Content-Length": String(fin - debut + 1),
    "Content-Disposition": `attachment; filename="${asset.filename}"`,
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, max-age=0, must-revalidate",
  });
  if (statut === 206) entetes.set("Content-Range", `bytes ${debut}-${fin}/${taille}`);

  const flux = Readable.toWeb(
    createReadStream(asset.path, { start: debut, end: fin }),
  ) as unknown as ReadableStream<Uint8Array>;

  return new Response(flux, { status: statut, headers: entetes });
}
