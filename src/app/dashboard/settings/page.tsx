"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signOut } from "next-auth/react";
import {
  User, Palette, BookOpen, ShieldAlert, Check, Loader2,
  Eye, Volume2, ListOrdered, Sparkles, Trash2, KeyRound, Download,
  UserRound, Globe, Trophy, ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ACCENT_META, THEME_META, type Accent, type Theme } from "@/lib/settings";

interface Settings {
  username: string;
  email: string;
  createdAt: string;
  showFurigana: boolean;
  autoplayAudio: boolean;
  dailyReviewLimit: number;
  reviewOrder: string;
  accent: Accent;
  theme: Theme;
  hasBunproToken: boolean;
  displayName: string | null;
  bio: string | null;
  avatarEmoji: string;
  profilePublic: boolean;
  showOnLeaderboard: boolean;
}

interface AccountPatch {
  displayName?: string | null;
  bio?: string | null;
  avatarEmoji?: string;
  profilePublic?: boolean;
  showOnLeaderboard?: boolean;
}

const AVATAR_EMOJIS = ["🌸", "🍁", "🗻", "🍵", "🦊", "🐉", "🌊", "🎌", "📚", "⛩️", "🌙", "🔥"] as const;

const NAME_MAX = 24;
const BIO_MAX = 160;

function Section({
  icon: Icon, title, desc, children,
}: {
  icon: React.ElementType; title: string; desc?: string; children: React.ReactNode;
}) {
  return (
    <section className="surface p-6 animate-fade-up">
      <div className="flex items-start gap-3 mb-5">
        <div className="w-9 h-9 rounded-xl bg-accent/15 border border-accent/25 flex items-center justify-center shrink-0">
          <Icon size={17} className="text-accent" />
        </div>
        <div>
          <h2 className="font-semibold text-fg">{title}</h2>
          {desc && <p className="text-sm text-dim mt-0.5">{desc}</p>}
        </div>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Toggle({
  label, hint, checked, onChange, icon: Icon,
}: {
  label: string; hint?: string; checked: boolean;
  onChange: (v: boolean) => void; icon?: React.ElementType;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="w-full flex items-center gap-3 text-left group"
    >
      {Icon && <Icon size={16} className="text-dim shrink-0" />}
      <span className="flex-1 min-w-0">
        <span className="block text-sm text-fg">{label}</span>
        {hint && <span className="block text-xs text-dim mt-0.5">{hint}</span>}
      </span>
      <span
        className={cn(
          "relative w-11 h-6 rounded-full transition-colors shrink-0 border",
          checked ? "bg-accent/80 border-accent/50" : "bg-line/10 border-line/15"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform shadow",
            checked ? "translate-x-[22px]" : "translate-x-0.5"
          )}
        />
      </span>
    </button>
  );
}

function Choice<T extends string>({
  label, value, options, onChange,
}: {
  label: string; value: T;
  options: { value: T; label: string; hint?: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div>
      <div className="text-sm text-fg mb-2">{label}</div>
      <div className="grid grid-cols-3 gap-2">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={cn(
              "px-3 py-2.5 rounded-xl text-xs font-medium border transition-all text-center",
              value === o.value
                ? "bg-accent/15 border-accent/40 text-fg"
                : "bg-line/[0.04] border-line/10 text-muted hover:text-fg hover:border-line/20"
            )}
          >
            <div>{o.label}</div>
            {o.hint && <div className="text-[10px] text-dim mt-0.5">{o.hint}</div>}
          </button>
        ))}
      </div>
    </div>
  );
}

function isSettings(d: unknown): d is Settings {
  if (typeof d !== "object" || d === null) return false;
  const raw = d as Record<string, unknown>;
  return (
    typeof raw.username === "string" &&
    typeof raw.email === "string" &&
    typeof raw.profilePublic === "boolean" &&
    typeof raw.showOnLeaderboard === "boolean"
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const [s, setS] = useState<Settings | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [profileMsg, setProfileMsg] = useState<string | null>(null);

  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [publicMsg, setPublicMsg] = useState<string | null>(null);

  const [curPw, setCurPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [pwMsg, setPwMsg] = useState<string | null>(null);

  const [bpToken, setBpToken] = useState("");
  const [bpBusy, setBpBusy] = useState(false);
  const [bpMsg, setBpMsg] = useState<string | null>(null);

  const [delOpen, setDelOpen] = useState(false);
  const [delPw, setDelPw] = useState("");
  const [delMsg, setDelMsg] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    setLoadError(false);
    try {
      const res = await fetch("/api/settings");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const d: unknown = await res.json();
      if (!isSettings(d)) throw new Error("Réponse inattendue");

      setS(d);
      setUsername(d.username);
      setEmail(d.email);
      setDisplayName(d.displayName ?? "");
      setBio(d.bio ?? "");
    } catch {
      setS(null);
      setLoadError(true);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const save = useCallback(async (patch: Partial<Settings>) => {
    setS((prev) => (prev ? { ...prev, ...patch } : prev));
    setSaving(true);
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    setSaving(false);
    if (res.ok) {
      setSavedAt(Date.now());
      if (patch.accent || patch.theme) router.refresh();
    }
  }, [router]);

  const saveAccount = useCallback(
    async (patch: AccountPatch) => {
      setS((prev) => (prev ? { ...prev, ...patch } : prev));
      setPublicMsg(null);
      setSaving(true);
      const res = await fetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      }).catch(() => null);
      setSaving(false);

      if (res && res.ok) {
        setSavedAt(Date.now());
        return;
      }

      const d: { error?: string } = res ? await res.json().catch(() => ({})) : {};
      setPublicMsg(d.error ?? "Enregistrement impossible.");

      await loadSettings();
    },
    [loadSettings]
  );

  async function saveProfile() {
    setProfileMsg(null);
    const res = await fetch("/api/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email }),
    });
    const d = await res.json();
    setProfileMsg(res.ok ? "Profil mis à jour." : d.error ?? "Erreur");
  }

  async function changePassword() {
    setPwMsg(null);
    const res = await fetch("/api/account/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: curPw, newPassword: newPw }),
    });
    const d = await res.json();
    if (res.ok) { setCurPw(""); setNewPw(""); setPwMsg("Mot de passe modifié."); }
    else setPwMsg(d.error ?? "Erreur");
  }

  async function bunproTest() {
    setBpBusy(true); setBpMsg(null);
    const r = await fetch(`/api/bunpro?token=${encodeURIComponent(bpToken)}`).then((x) => x.json());
    setBpBusy(false);
    setBpMsg(
      r.ok
        ? `Connexion réussie (${r.path}) — ${r.found} points trouvés sur votre compte.`
        : `Échec : ${r.error}${r.sample ? ` — réponse reçue : ${r.sample}` : ""}`
    );
  }

  async function bunproImport() {
    setBpBusy(true); setBpMsg(null);
    const r = await fetch("/api/bunpro", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: bpToken, overwrite: false }),
    }).then((x) => x.json());
    setBpBusy(false);
    if (!r.ok) { setBpMsg(`Échec : ${r.error}`); return; }
    setBpMsg(
      `${r.created} points importés, ${r.updated} mis à jour. ` +
      `${r.skippedLocked ? `${r.skippedLocked} ignorés (verrouillés). ` : ""}` +
      `${r.unmatched ? `${r.unmatched} sans correspondance.` : ""}`
    );
  }

  async function deleteAccount() {
    setDelMsg(null);
    const res = await fetch("/api/account", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: delPw }),
    });
    const d = await res.json();
    if (res.ok) signOut({ callbackUrl: "/" });
    else setDelMsg(d.error ?? "Erreur");
  }

  if (loadError) {
    return (
      <div className="max-w-3xl mx-auto">
        <section className="surface p-6 animate-fade-up">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-500/15 border border-red-500/25 flex items-center justify-center shrink-0">
              <ShieldAlert size={17} className="text-red-400" />
            </div>
            <div className="min-w-0">
              <h2 className="font-semibold text-fg">Réglages indisponibles</h2>
              <p className="text-sm text-dim mt-1 leading-relaxed">
                Vos réglages n&apos;ont pas pu être chargés : rien n&apos;est affiché plutôt que
                des valeurs fausses — vos options de confidentialité restent celles enregistrées.
                Vérifiez votre connexion et réessayez ; si cela persiste, reconnectez-vous.
              </p>
              <div className="flex items-center gap-2 mt-4">
                <button onClick={loadSettings} className="btn btn-primary">Réessayer</button>
                <Link href="/dashboard" className="btn btn-ghost">Tableau de bord</Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  if (!s) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        {[0, 1, 2].map((i) => <div key={i} className="skeleton h-44 rounded-2xl" />)}
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <header className="mb-7 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold display text-fg">Réglages</h1>
          <p className="text-dim text-sm mt-1">
            Membre depuis {new Date(s.createdAt).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
          </p>
        </div>
        <div className="text-xs text-dim h-5 flex items-center gap-1.5">
          {saving ? (
            <><Loader2 size={13} className="animate-spin" /> Enregistrement…</>
          ) : savedAt ? (
            <><Check size={13} className="text-accent" /> Enregistré</>
          ) : null}
        </div>
      </header>

      <div className="space-y-5">
        <Section icon={User} title="Profil">
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs text-dim block mb-1.5">Nom d&apos;utilisateur</span>
              <input className="field" value={username} onChange={(e) => setUsername(e.target.value)} />
            </label>
            <label className="block">
              <span className="text-xs text-dim block mb-1.5">Email</span>
              <input className="field" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={saveProfile} className="btn btn-primary">Mettre à jour</button>
            {profileMsg && <span className="text-xs text-muted">{profileMsg}</span>}
          </div>
        </Section>

        <Section
          icon={UserRound}
          title="Profil public"
          desc="Ce que les autres membres voient : avatar, nom affiché et présentation."
        >
          <div>
            <div className="text-sm text-fg mb-2">Avatar</div>
            <div className="flex flex-wrap gap-2">
              {AVATAR_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => saveAccount({ avatarEmoji: emoji })}
                  aria-pressed={s.avatarEmoji === emoji}
                  title={`Choisir ${emoji}`}
                  className={cn(
                    "w-11 h-11 rounded-xl border text-xl leading-none flex items-center justify-center transition-all",
                    s.avatarEmoji === emoji
                      ? "border-accent/60 bg-accent/15"
                      : "border-line/10 bg-line/[0.03] hover:border-line/25"
                  )}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs text-dim block mb-1.5">Nom affiché</span>
              <input
                className="field"
                value={displayName}
                maxLength={NAME_MAX}
                placeholder={s.username}
                onChange={(e) => setDisplayName(e.target.value.slice(0, NAME_MAX))}
              />
              <span className="text-[11px] text-dim block mt-1.5">
                Laissez vide pour afficher votre pseudo
              </span>
            </label>
          </div>

          <label className="block">
            <span className="text-xs text-dim block mb-1.5">Bio</span>
            <textarea
              className="field resize-none"
              rows={3}
              value={bio}
              maxLength={BIO_MAX}
              placeholder="Objectif, niveau visé, ce que vous étudiez en ce moment…"
              onChange={(e) => setBio(e.target.value.slice(0, BIO_MAX))}
            />
            <span className="text-[11px] text-dim block mt-1.5 tnum">
              {BIO_MAX - bio.length} caractères restants
            </span>
          </label>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() =>
                saveAccount({
                  displayName: displayName.trim() || null,
                  bio: bio.trim() || null,
                })
              }
              className="btn btn-primary"
            >
              Enregistrer
            </button>
          </div>

          <div className="pt-1 space-y-4 border-t border-line/[0.08]">
            <div className="pt-4">
              <Toggle
                icon={Globe}
                label="Profil visible par les autres membres"
                hint="Désactivé, votre page reste accessible à vous seul"
                checked={s.profilePublic}
                onChange={(v) => saveAccount({ profilePublic: v })}
              />
            </div>
            <Toggle
              icon={Trophy}
              label="Apparaître dans le classement"
              hint="Désactivé, vous disparaissez de la page Communauté"
              checked={s.showOnLeaderboard}
              onChange={(v) => saveAccount({ showOnLeaderboard: v })}
            />
          </div>

          {publicMsg && (
            <p role="alert" className="text-xs font-medium text-red-500">
              {publicMsg}
            </p>
          )}

          <Link
            href={`/dashboard/u/${s.username}`}
            className="inline-flex items-center gap-1.5 text-xs text-dim hover:text-accent transition-colors"
          >
            <ExternalLink size={12} /> Voir mon profil public
          </Link>
        </Section>

        <Section icon={Palette} title="Apparence" desc="Thème et couleur d'accent de toute l'interface.">
          <div className="grid grid-cols-2 gap-2">
            {THEME_META.map((t) => (
              <button
                key={t.value}
                onClick={() => save({ theme: t.value })}
                className={cn(
                  "rounded-xl p-3 border transition-all flex items-center gap-3 text-left",
                  s.theme === t.value
                    ? "border-accent/50 bg-accent/10"
                    : "border-line/10 bg-line/[0.03] hover:border-line/25"
                )}
              >
                <span className="jp-serif text-xl text-accent shrink-0">{t.kanji}</span>
                <span className="min-w-0">
                  <span className="block text-sm text-fg">{t.label}</span>
                  <span className="block text-[11px] text-dim">{t.desc}</span>
                </span>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {ACCENT_META.map((a) => (
              <button
                key={a.value}
                onClick={() => save({ accent: a.value })}
                className={cn(
                  "rounded-xl p-3 border transition-all flex flex-col items-center gap-1.5",
                  s.accent === a.value
                    ? "border-accent/50 bg-accent/10"
                    : "border-line/10 bg-line/[0.03] hover:border-line/25"
                )}
                title={a.label}
              >
                <span
                  className="w-7 h-7 rounded-full border border-line/[0.20]"
                  style={{ background: a.swatch }}
                />
                <span className="japanese text-xs text-muted">{a.kanji}</span>
              </button>
            ))}
          </div>
        </Section>

        <Section icon={BookOpen} title="Étude & révisions" desc="Comment les cartes vous sont présentées.">
          <Toggle
            icon={Eye}
            label="Afficher les furigana"
            hint="Les lectures au-dessus des kanji. Masqués, ils réapparaissent au survol."
            checked={s.showFurigana}
            onChange={(v) => save({ showFurigana: v })}
          />
          <Toggle
            icon={Volume2}
            label="Lecture audio automatique"
            hint="Joue la prononciation dès que la réponse est révélée."
            checked={s.autoplayAudio}
            onChange={(v) => save({ autoplayAudio: v })}
          />

          <div>
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-fg flex items-center gap-2">
                <ListOrdered size={16} className="text-dim" /> Cartes par session
              </span>
              <span className="tnum text-accent font-semibold">{s.dailyReviewLimit}</span>
            </div>
            <input
              type="range" min={5} max={200} step={5}
              value={s.dailyReviewLimit}
              onChange={(e) => setS({ ...s, dailyReviewLimit: Number(e.target.value) })}
              onMouseUp={(e) => save({ dailyReviewLimit: Number((e.target as HTMLInputElement).value) })}
              onTouchEnd={(e) => save({ dailyReviewLimit: Number((e.target as HTMLInputElement).value) })}
              className="w-full accent-[rgb(var(--accent-rgb))]"
            />
          </div>

          <Choice
            label="Ordre des révisions"
            value={s.reviewOrder}
            onChange={(v) => save({ reviewOrder: v })}
            options={[
              { value: "due", label: "Échéance", hint: "les plus urgentes" },
              { value: "random", label: "Aléatoire", hint: "mélangé" },
              { value: "level", label: "Niveau", hint: "N5 → N1" },
            ]}
          />

        </Section>

        <Section
          icon={Download}
          title="Importer ma progression Bunpro"
          desc="Récupère VOTRE avancement (points déjà appris et leur série) pour ne pas repartir de zéro."
        >
          <label className="block">
            <span className="text-xs text-dim block mb-1.5">
              Jeton d&apos;API Bunpro {s.hasBunproToken && <span className="text-green-400">· un jeton est enregistré</span>}
            </span>
            <input
              className="field font-mono text-sm"
              type="password"
              value={bpToken}
              onChange={(e) => setBpToken(e.target.value)}
              placeholder="collez le jeton affiché dans vos réglages Bunpro"
            />
          </label>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={bunproTest} disabled={!bpToken || bpBusy} className="btn btn-ghost">
              {bpBusy ? <Loader2 size={15} className="animate-spin" /> : null} Tester la connexion
            </button>
            <button onClick={bunproImport} disabled={!bpToken || bpBusy} className="btn btn-primary">
              Importer
            </button>
          </div>
          {bpMsg && <p className="text-xs text-muted leading-relaxed">{bpMsg}</p>}
          <p className="text-[11px] text-dim leading-relaxed">
            L&apos;import n&apos;écrase jamais une progression déjà faite ici, et ne débloque pas
            les points réservés à l&apos;abonnement. L&apos;API Bunpro n&apos;étant pas
            publiquement documentée, commencez par « Tester la connexion » : le message
            indiquera précisément ce que leur serveur a répondu.
          </p>
        </Section>

        <Section icon={KeyRound} title="Mot de passe">
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs text-dim block mb-1.5">Mot de passe actuel</span>
              <input className="field" type="password" value={curPw} onChange={(e) => setCurPw(e.target.value)} />
            </label>
            <label className="block">
              <span className="text-xs text-dim block mb-1.5">Nouveau mot de passe</span>
              <input className="field" type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="Minimum 8 caractères" />
            </label>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={changePassword} disabled={!curPw || !newPw} className="btn btn-ghost">
              Changer le mot de passe
            </button>
            {pwMsg && <span className="text-xs text-muted">{pwMsg}</span>}
          </div>
        </Section>

        <section className="surface p-6 border-red-500/20">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-red-500/15 border border-red-500/25 flex items-center justify-center shrink-0">
              <ShieldAlert size={17} className="text-red-400" />
            </div>
            <div>
              <h2 className="font-semibold text-fg">Zone dangereuse</h2>
              <p className="text-sm text-dim mt-0.5">
                La suppression du compte efface définitivement votre progression et vos révisions.
              </p>
            </div>
          </div>

          {!delOpen ? (
            <button onClick={() => setDelOpen(true)} className="btn btn-ghost text-red-300 hover:text-red-200">
              <Trash2 size={15} /> Supprimer mon compte
            </button>
          ) : (
            <div className="space-y-3">
              <input
                className="field"
                type="password"
                placeholder="Confirmez avec votre mot de passe"
                value={delPw}
                onChange={(e) => setDelPw(e.target.value)}
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={deleteAccount}
                  disabled={!delPw}
                  className="btn bg-red-600 hover:bg-red-500 text-white disabled:opacity-50"
                >
                  Supprimer définitivement
                </button>
                <button onClick={() => { setDelOpen(false); setDelPw(""); setDelMsg(null); }} className="btn btn-ghost">
                  Annuler
                </button>
                {delMsg && <span className="text-xs text-red-300">{delMsg}</span>}
              </div>
            </div>
          )}
        </section>

        <p className="text-center text-xs text-dim pt-2 flex items-center justify-center gap-1.5">
          <Sparkles size={12} /> Les préférences sont enregistrées automatiquement.
        </p>
      </div>
    </div>
  );
}
