import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AVATARS, loadSettings, saveSettings, type Difficulty, type Settings } from "@/lib/quiz-store";

export const Route = createFileRoute("/")({
  component: Home,
  head: () => ({
    meta: [
      { title: "Questions pour un Champion — Le quiz TV" },
      { name: "description", content: "Buzzez plus vite que vos adversaires dans ce quiz inspiré de l'émission culte. 4 candidats, plusieurs manches, un seul champion." },
    ],
  }),
});

function Home() {
  const [s, setS] = useState<Settings | null>(null);
  useEffect(() => setS(loadSettings()), []);
  if (!s) return null;
  const update = (patch: Partial<Settings>) => { const next = {...s, ...patch}; setS(next); saveSettings(next); };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10 relative overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_20%_20%,oklch(0.72_0.18_210_/_0.4),transparent_50%),radial-gradient(circle_at_80%_80%,oklch(0.82_0.16_85_/_0.3),transparent_50%)]" />

      <div className="relative max-w-3xl w-full text-center animate-float-in">
        <div className="inline-block text-xs uppercase tracking-[0.4em] text-primary mb-4 px-4 py-1 rounded-full border border-primary/40">Le quiz télé</div>
        <h1 className="text-5xl md:text-7xl lg:text-8xl text-gradient-gold mb-4 leading-[1.05]">
          Questions<br/>pour un Champion
        </h1>
        <p className="text-muted-foreground max-w-xl mx-auto mb-10 text-lg">
          Buzzez avant les autres, répondez juste, éliminez les adversaires. Devenez le champion.
        </p>

        <div className="bg-gradient-card rounded-3xl shadow-card p-6 md:p-8 mb-6 max-w-xl mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <button onClick={() => update({ avatar: AVATARS[(AVATARS.indexOf(s.avatar)+1)%AVATARS.length] })}
              className="text-5xl h-16 w-16 rounded-2xl bg-secondary/60 hover:scale-110 transition shadow-glow">
              {s.avatar}
            </button>
            <input value={s.pseudo} onChange={e => update({ pseudo: e.target.value })}
              placeholder="Votre pseudo"
              className="flex-1 bg-input/60 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-ring text-lg" />
          </div>

          <div className="mb-2 text-xs uppercase tracking-widest text-muted-foreground text-left">Difficulté</div>
          <div className="grid grid-cols-3 gap-2 mb-6">
            {(["facile","moyen","difficile"] as Difficulty[]).map(d => (
              <button key={d} onClick={() => update({ difficulty: d })}
                className={`py-3 rounded-xl capitalize font-medium transition ${s.difficulty===d?"bg-gradient-gold text-primary-foreground shadow-glow":"bg-secondary/60 hover:bg-secondary"}`}>{d}</button>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Link to="/play" className="flex-1 bg-gradient-gold text-primary-foreground font-bold text-lg py-4 rounded-2xl shadow-glow hover:scale-[1.03] transition">
              Jouer
            </Link>
            <Link to="/settings" className="flex-1 bg-secondary/60 hover:bg-secondary font-semibold py-4 rounded-2xl transition">
              Paramètres
            </Link>
          </div>
        </div>

        <p className="text-xs text-muted-foreground/60">
          Astuce : appuyez sur BUZZ avant les bots pour pouvoir répondre.
        </p>
      </div>
    </div>
  );
}
