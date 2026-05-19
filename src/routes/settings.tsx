import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AVATARS, loadSettings, saveSettings, type Settings } from "@/lib/quiz-store";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
  head: () => ({ meta: [{ title: "Paramètres — Questions pour un Champion" }] }),
});

function SettingsPage() {
  const [s, setS] = useState<Settings | null>(null);
  useEffect(() => setS(loadSettings()), []);
  if (!s) return null;
  const update = (patch: Partial<Settings>) => {
    const next = { ...s, ...patch };
    setS(next); saveSettings(next);
  };

  return (
    <div className="min-h-screen px-4 py-10 md:py-16">
      <div className="mx-auto max-w-2xl bg-gradient-card rounded-3xl shadow-card p-6 md:p-10 animate-float-in">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl md:text-4xl text-gradient-gold">Paramètres</h1>
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition">← Retour</Link>
        </div>

        <Section title="Profil">
          <Field label="Pseudo">
            <input value={s.pseudo} onChange={(e) => update({ pseudo: e.target.value })}
              className="w-full bg-input/60 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-ring" />
          </Field>
          <Field label="Avatar">
            <div className="flex flex-wrap gap-2">
              {AVATARS.map(a => (
                <button key={a} onClick={() => update({ avatar: a })}
                  className={`text-3xl h-14 w-14 rounded-2xl bg-secondary/60 hover:scale-110 transition ${s.avatar === a ? "ring-2 ring-primary shadow-glow" : ""}`}>{a}</button>
              ))}
            </div>
          </Field>
        </Section>

        <Section title="Jeu">
          <Field label="Difficulté">
            <div className="grid grid-cols-3 gap-2">
              {(["facile","moyen","difficile"] as const).map(d => (
                <button key={d} onClick={() => update({ difficulty: d })}
                  className={`py-3 rounded-xl capitalize font-medium transition ${s.difficulty===d?"bg-gradient-gold text-primary-foreground shadow-glow":"bg-secondary/60 hover:bg-secondary"}`}>{d}</button>
              ))}
            </div>
          </Field>
          <Field label="Langue">
            <div className="grid grid-cols-2 gap-2">
              {(["fr","en"] as const).map(l => (
                <button key={l} onClick={() => update({ language: l })}
                  className={`py-3 rounded-xl uppercase font-medium transition ${s.language===l?"bg-accent text-accent-foreground shadow-accent":"bg-secondary/60 hover:bg-secondary"}`}>{l === "fr" ? "Français" : "English"}</button>
              ))}
            </div>
          </Field>
        </Section>

        <Section title="Son">
          <Field label="Activer le son">
            <button onClick={() => update({ soundEnabled: !s.soundEnabled })}
              className={`px-5 py-2 rounded-full font-medium transition ${s.soundEnabled?"bg-success text-primary-foreground":"bg-muted text-muted-foreground"}`}>
              {s.soundEnabled ? "Activé" : "Désactivé"}
            </button>
          </Field>
          <Field label={`Volume musique — ${Math.round(s.musicVolume*100)}%`}>
            <input type="range" min={0} max={1} step={0.05} value={s.musicVolume}
              onChange={e => update({ musicVolume: parseFloat(e.target.value) })} className="w-full accent-primary" />
          </Field>
          <Field label={`Volume effets — ${Math.round(s.sfxVolume*100)}%`}>
            <input type="range" min={0} max={1} step={0.05} value={s.sfxVolume}
              onChange={e => update({ sfxVolume: parseFloat(e.target.value) })} className="w-full accent-primary" />
          </Field>
        </Section>

        <Link to="/" className="block mt-8 text-center bg-gradient-gold text-primary-foreground font-semibold py-3 rounded-2xl shadow-glow hover:scale-[1.02] transition">
          Enregistrer et retourner
        </Link>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h2 className="text-xs uppercase tracking-widest text-muted-foreground mb-3">{title}</h2>
      <div className="space-y-5">{children}</div>
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm mb-2 text-foreground/80">{label}</label>
      {children}
    </div>
  );
}
