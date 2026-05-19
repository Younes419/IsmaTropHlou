export type Difficulty = "facile" | "moyen" | "difficile";
export type Language = "fr" | "en";

export interface Settings {
  pseudo: string;
  avatar: string;
  difficulty: Difficulty;
  language: Language;
  soundEnabled: boolean;
  musicVolume: number;
  sfxVolume: number;
}

export const AVATARS = ["🦊", "🦁", "🐼", "🐯", "🦉", "🐸", "🐙", "🦄", "🐺", "🐨"];

export const BOT_NAMES = ["Camille", "Lucas", "Sofia", "Marco", "Léa", "Hugo", "Nora", "Théo"];

const KEY = "qpc_settings_v1";

export const defaultSettings: Settings = {
  pseudo: "Champion",
  avatar: "🦊",
  difficulty: "moyen",
  language: "fr",
  soundEnabled: true,
  musicVolume: 0.4,
  sfxVolume: 0.7,
};

export function loadSettings(): Settings {
  if (typeof window === "undefined") return defaultSettings;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultSettings;
    return { ...defaultSettings, ...JSON.parse(raw) };
  } catch {
    return defaultSettings;
  }
}

export function saveSettings(s: Settings) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(s));
}

// Lightweight web-audio "sound effect" generator (no asset files needed)
class SfxEngine {
  private ctx: AudioContext | null = null;
  private get audio() {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      try {
        this.ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      } catch { return null; }
    }
    return this.ctx;
  }
  private tone(freq: number, dur: number, type: OscillatorType, vol: number) {
    const ctx = this.audio; if (!ctx) return;
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    o.connect(g).connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + dur);
  }
  buzz(vol = 0.7) { this.tone(180, 0.18, "square", 0.25 * vol); }
  beep(vol = 0.7) { this.tone(880, 0.1, "sine", 0.2 * vol); }
  correct(vol = 0.7) {
    this.tone(660, 0.12, "triangle", 0.25 * vol);
    setTimeout(() => this.tone(880, 0.18, "triangle", 0.25 * vol), 110);
  }
  wrong(vol = 0.7) {
    this.tone(220, 0.18, "sawtooth", 0.25 * vol);
    setTimeout(() => this.tone(160, 0.22, "sawtooth", 0.25 * vol), 150);
  }
  victory(vol = 0.7) {
    [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.tone(f, 0.22, "triangle", 0.3 * vol), i * 130));
  }
  defeat(vol = 0.7) {
    [392, 330, 262].forEach((f, i) => setTimeout(() => this.tone(f, 0.3, "sine", 0.25 * vol), i * 180));
  }
}
export const sfx = new SfxEngine();
