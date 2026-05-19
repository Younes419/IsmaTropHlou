import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import questionsData from "@/data/questions.json";
import { AVATARS, BOT_NAMES, loadSettings, sfx, type Settings } from "@/lib/quiz-store";

export const Route = createFileRoute("/play")({
  component: PlayPage,
  head: () => ({ meta: [{ title: "Partie — Questions pour un Champion" }] }),
});

type Question = { q: string; choices: string[]; answer: number };
interface Player {
  id: number;
  name: string;
  avatar: string;
  score: number;
  isHuman: boolean;
  eliminated: boolean;
}

const QUESTIONS_PER_ROUND = 4;
const ROUND_TIME = 15;

function PlayPage() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [round, setRound] = useState(1);
  const [phase, setPhase] = useState<"intro" | "question" | "scoreboard" | "results">("intro");
  const [qIndex, setQIndex] = useState(0);
  const [pool, setPool] = useState<Question[]>([]);
  const [timer, setTimer] = useState(ROUND_TIME);
  const [buzzed, setBuzzed] = useState<number | null>(null);
  const [revealed, setRevealed] = useState<number | null>(null);
  const [timeUp, setTimeUp] = useState(false);
  const [startedAt] = useState(() => Date.now());
  const [endedAt, setEndedAt] = useState<number | null>(null);
  const botTimers = useRef<number[]>([]);

  useEffect(() => {
    const s = loadSettings();
    setSettings(s);
    const all = (questionsData as Record<string, Question[]>)[s.difficulty];
    setPool(shuffle(all));
    // build 4 players: human + 3 bots
    const usedAvatars = new Set([s.avatar]);
    const bots: Player[] = [];
    const names = shuffle(BOT_NAMES);
    for (let i = 0; i < 3; i++) {
      let av = AVATARS[Math.floor(Math.random()*AVATARS.length)];
      while (usedAvatars.has(av)) av = AVATARS[Math.floor(Math.random()*AVATARS.length)];
      usedAvatars.add(av);
      bots.push({ id: i+1, name: names[i], avatar: av, score: 0, isHuman: false, eliminated: false });
    }
    setPlayers([{ id: 0, name: s.pseudo, avatar: s.avatar, score: 0, isHuman: true, eliminated: false }, ...bots]);
  }, []);

  const current = pool[qIndex];
  const activePlayers = useMemo(() => players.filter(p => !p.eliminated), [players]);
  const leftPlayers = activePlayers.slice(0, Math.ceil(activePlayers.length/2));
  const rightPlayers = activePlayers.slice(Math.ceil(activePlayers.length/2));

  // Timer
  useEffect(() => {
    if (phase !== "question" || revealed !== null || timeUp) return;
    if (timer <= 0) {
      setTimeUp(true);
      if (settings?.soundEnabled) sfx.wrong(settings.sfxVolume);
      window.setTimeout(() => nextQuestion(), 1400);
      return;
    }
    const id = window.setTimeout(() => {
      if (timer <= 6 && timer > 1 && settings?.soundEnabled) sfx.beep(settings.sfxVolume);
      setTimer(t => t - 1);
    }, 1000);
    return () => window.clearTimeout(id);
  }, [timer, phase, revealed, timeUp, settings]);

  // Bot buzz logic
  useEffect(() => {
    if (phase !== "question" || buzzed !== null || timeUp) return;
    botTimers.current.forEach(t => window.clearTimeout(t));
    botTimers.current = [];
    activePlayers.filter(p => !p.isHuman).forEach(bot => {
      const delay = 1500 + Math.random() * 6000;
      const id = window.setTimeout(() => {
        setBuzzed(prev => prev === null ? bot.id : prev);
      }, delay);
      botTimers.current.push(id);
    });
    return () => { botTimers.current.forEach(t => window.clearTimeout(t)); };
  }, [qIndex, phase]);

  // Bot answers after buzzing
  useEffect(() => {
    if (buzzed === null || revealed !== null) return;
    const player = players.find(p => p.id === buzzed);
    if (!player || player.isHuman) return;
    if (settings?.soundEnabled) sfx.buzz(settings.sfxVolume);
    const t = window.setTimeout(() => {
      const correctProb = settings?.difficulty === "facile" ? 0.55 : settings?.difficulty === "moyen" ? 0.45 : 0.35;
      const guess = Math.random() < correctProb ? current.answer : Math.floor(Math.random() * current.choices.length);
      handleAnswer(guess, player.id);
    }, 1200);
    return () => window.clearTimeout(t);
  }, [buzzed]);

  function handleBuzz() {
    if (phase !== "question" || buzzed !== null || timeUp) return;
    if (settings?.soundEnabled) sfx.buzz(settings.sfxVolume);
    setBuzzed(0);
  }

  function handleAnswer(choice: number, playerId: number) {
    if (revealed !== null) return;
    setRevealed(choice);
    const correct = choice === current.answer;
    const penalty = settings?.difficulty === "difficile" ? -50 : settings?.difficulty === "moyen" ? -20 : 0;
    setPlayers(prev => prev.map(p => p.id === playerId
      ? { ...p, score: p.score + (correct ? 100 : penalty) } : p));
    if (settings?.soundEnabled) correct ? sfx.correct(settings.sfxVolume) : sfx.wrong(settings.sfxVolume);
    window.setTimeout(() => nextQuestion(), 1800);
  }

  function nextQuestion() {
    botTimers.current.forEach(t => window.clearTimeout(t));
    setBuzzed(null); setRevealed(null); setTimeUp(false); setTimer(ROUND_TIME);
    const nextIndex = qIndex + 1;
    if (nextIndex >= QUESTIONS_PER_ROUND * round) {
      setPhase("scoreboard");
    } else {
      setQIndex(nextIndex);
    }
  }

  function startRound() {
    setPhase("question"); setTimer(ROUND_TIME); setBuzzed(null); setRevealed(null); setTimeUp(false);
  }

  function continueAfterScoreboard() {
    const remaining = players.filter(p => !p.eliminated);
    if (remaining.length <= 1 || round >= 3) {
      setEndedAt(Date.now());
      const human = players.find(p => p.isHuman)!;
      const sorted = [...remaining].sort((a,b)=>b.score-a.score);
      if (settings?.soundEnabled) {
        sorted[0]?.id === human.id ? sfx.victory(settings.sfxVolume) : sfx.defeat(settings.sfxVolume);
      }
      setPhase("results");
      return;
    }
    // eliminate lowest
    const lowest = [...remaining].sort((a,b)=>a.score-b.score)[0];
    setPlayers(prev => prev.map(p => p.id === lowest.id ? { ...p, eliminated: true } : p));
    setRound(r => r + 1);
    setPhase("intro");
  }

  if (!settings || !current) return null;

  if (phase === "intro") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center animate-float-in max-w-xl">
          <div className="text-sm uppercase tracking-[0.3em] text-primary mb-3">Manche {round}</div>
          <h1 className="text-5xl md:text-6xl text-gradient-gold mb-6">
            {round === 1 ? "Première manche" : round === 2 ? "Demi-finale" : "Finale"}
          </h1>
          <p className="text-muted-foreground mb-2">{QUESTIONS_PER_ROUND} questions · {ROUND_TIME}s par question</p>
          <p className="text-muted-foreground mb-8">Buzzez en premier pour répondre. À la fin de la manche, le candidat avec le moins de points est éliminé.</p>
          <button onClick={startRound} className="bg-gradient-gold text-primary-foreground font-semibold px-10 py-4 rounded-2xl shadow-glow hover:scale-105 transition text-lg">
            Commencer
          </button>
        </div>
      </div>
    );
  }

  if (phase === "scoreboard") {
    const sorted = [...players].sort((a,b)=>b.score-a.score);
    const lowest = [...players.filter(p=>!p.eliminated)].sort((a,b)=>a.score-b.score)[0];
    return (
      <div className="min-h-screen px-4 py-12 flex items-center justify-center">
        <div className="max-w-2xl w-full bg-gradient-card rounded-3xl shadow-card p-8 animate-float-in">
          <h2 className="text-4xl text-gradient-gold text-center mb-2">Classement</h2>
          <p className="text-center text-muted-foreground mb-8">Fin de la manche {round}</p>
          <div className="space-y-3 mb-8">
            {sorted.map((p, i) => (
              <div key={p.id} className={`flex items-center gap-4 p-4 rounded-2xl transition ${p.eliminated ? "opacity-40 bg-destructive/10" : lowest && p.id === lowest.id && round < 3 ? "bg-destructive/20 border border-destructive/50 animate-shake" : "bg-secondary/40"}`}>
                <div className="text-xl font-bold text-primary w-8">{i+1}</div>
                <div className="text-3xl">{p.avatar}</div>
                <div className="flex-1">
                  <div className="font-semibold">{p.name} {p.isHuman && <span className="text-xs text-primary">(vous)</span>}</div>
                  {p.eliminated && <div className="text-xs text-destructive">Éliminé</div>}
                </div>
                <div className="text-2xl font-bold text-gradient-gold">{p.score}</div>
              </div>
            ))}
          </div>
          <button onClick={continueAfterScoreboard} className="w-full bg-gradient-gold text-primary-foreground font-semibold py-4 rounded-2xl shadow-glow hover:scale-[1.02] transition">
            {round >= 3 || players.filter(p=>!p.eliminated).length <= 2 ? "Voir les résultats" : "Manche suivante"}
          </button>
        </div>
      </div>
    );
  }

  if (phase === "results") {
    const sorted = [...players].sort((a,b)=>b.score-a.score);
    const winner = sorted[0];
    const totalSec = Math.round(((endedAt ?? Date.now()) - startedAt)/1000);
    const m = Math.floor(totalSec/60), s = totalSec%60;
    return (
      <div className="min-h-screen px-4 py-12 flex items-center justify-center relative overflow-hidden">
        {Array.from({length:24}).map((_,i)=>(
          <span key={i} className="absolute text-3xl animate-confetti" style={{
            top: `${Math.random()*100}%`, left: `${Math.random()*100}%`,
            animationDelay: `${Math.random()*1.2}s`
          }}>{["✨","🎉","⭐","🏆"][i%4]}</span>
        ))}
        <div className="relative max-w-xl w-full bg-gradient-card rounded-3xl shadow-card p-10 text-center animate-float-in">
          <div className="text-sm uppercase tracking-[0.3em] text-primary mb-3">Champion</div>
          <div className="text-8xl mb-4">{winner.avatar}</div>
          <h2 className="text-5xl text-gradient-gold mb-2">{winner.name}</h2>
          <p className="text-muted-foreground mb-6">{winner.isHuman ? "Bravo, vous remportez la partie !" : "Le bot a gagné cette fois-ci."}</p>
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-secondary/40 rounded-2xl p-4">
              <div className="text-xs text-muted-foreground uppercase">Score final</div>
              <div className="text-3xl font-bold text-gradient-gold">{winner.score}</div>
            </div>
            <div className="bg-secondary/40 rounded-2xl p-4">
              <div className="text-xs text-muted-foreground uppercase">Durée</div>
              <div className="text-3xl font-bold">{m}:{s.toString().padStart(2,"0")}</div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button onClick={() => navigate({ to: "/play" })} className="flex-1 bg-gradient-gold text-primary-foreground font-semibold py-3 rounded-2xl shadow-glow hover:scale-[1.02] transition">Rejouer</button>
            <Link to="/" className="flex-1 bg-secondary/60 hover:bg-secondary font-semibold py-3 rounded-2xl transition">Accueil</Link>
          </div>
        </div>
      </div>
    );
  }

  // Question phase
  const buzzedPlayer = buzzed !== null ? players.find(p => p.id === buzzed) : null;
  const canHumanAnswer = buzzed === 0 && revealed === null;

  return (
    <div className="min-h-screen px-3 md:px-6 py-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-4 text-sm">
          <Link to="/" className="text-muted-foreground hover:text-foreground">← Quitter</Link>
          <div className="text-muted-foreground">Manche {round} · Question {(qIndex % QUESTIONS_PER_ROUND) + 1}/{QUESTIONS_PER_ROUND}</div>
        </div>

        <div className="grid grid-cols-[1fr_2fr_1fr] gap-3 md:gap-6 items-start">
          <div className="space-y-3">{leftPlayers.map(p => <PlayerCard key={p.id} p={p} buzzed={buzzed===p.id} />)}</div>

          <div className="bg-gradient-card rounded-3xl shadow-card p-5 md:p-8 animate-float-in">
            <div className="flex items-center justify-between mb-4">
              <div className={`text-3xl md:text-5xl font-bold tabular-nums ${timer<=5?"text-destructive animate-pulse":"text-primary"}`}>{timer}s</div>
              {timeUp && <div className="text-destructive font-bold animate-shake">Temps écoulé !</div>}
              {buzzedPlayer && !timeUp && <div className="text-accent font-semibold text-sm md:text-base">{buzzedPlayer.name} a buzzé !</div>}
            </div>
            <h2 className="text-xl md:text-3xl font-display mb-6 leading-snug min-h-[3em]">{current.q}</h2>

            <button onClick={handleBuzz} disabled={buzzed !== null || timeUp}
              className={`w-full py-5 rounded-2xl font-bold text-lg uppercase tracking-wider mb-6 transition relative overflow-hidden
              ${timeUp ? "bg-destructive text-destructive-foreground cursor-not-allowed" :
                buzzed !== null ? "bg-muted text-muted-foreground cursor-not-allowed" :
                "bg-gradient-gold text-primary-foreground shadow-glow hover:scale-[1.02] active:scale-95"}`}>
              {timeUp ? "Temps écoulé" : buzzed !== null ? `${buzzedPlayer?.name} a buzzé` : "BUZZ !"}
            </button>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {current.choices.map((c, i) => {
                const isCorrect = revealed !== null && i === current.answer;
                const isWrongPick = revealed === i && i !== current.answer;
                return (
                  <button key={i} onClick={() => canHumanAnswer && handleAnswer(i, 0)}
                    disabled={!canHumanAnswer}
                    className={`text-left p-4 rounded-2xl font-medium transition border-2 ${
                      isCorrect ? "bg-success/20 border-success text-foreground" :
                      isWrongPick ? "bg-destructive/20 border-destructive animate-shake" :
                      canHumanAnswer ? "bg-secondary/60 border-transparent hover:bg-secondary hover:border-primary cursor-pointer" :
                      "bg-secondary/30 border-transparent opacity-60 cursor-not-allowed"
                    }`}>
                    <span className="text-primary font-bold mr-2">{String.fromCharCode(65+i)}.</span>{c}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-3">{rightPlayers.map(p => <PlayerCard key={p.id} p={p} buzzed={buzzed===p.id} />)}</div>
        </div>
      </div>
    </div>
  );
}

function PlayerCard({ p, buzzed }: { p: Player; buzzed: boolean }) {
  return (
    <div className={`bg-gradient-card rounded-2xl p-3 md:p-4 text-center transition ${buzzed ? "glow-ring" : "shadow-card"}`}>
      <div className="text-3xl md:text-5xl mb-1">{p.avatar}</div>
      <div className="font-semibold text-sm md:text-base truncate">{p.name}{p.isHuman && " ★"}</div>
      <div className="text-xs text-muted-foreground mb-1">{buzzed ? "Buzzé !" : "En attente"}</div>
      <div className="text-lg md:text-2xl font-bold text-gradient-gold tabular-nums">{p.score}</div>
    </div>
  );
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
