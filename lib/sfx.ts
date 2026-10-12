// Tiny synthesized sound effects (WebAudio). No audio files, nothing to download.
let ctx: AudioContext | null = null;
let muted = false;
let loaded = false;
const KEY = "chog-sfx-muted";

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try { muted = localStorage.getItem(KEY) === "1"; } catch { muted = false; }
}

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  load();
  if (!ctx) {
    const C = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!C) return null;
    ctx = new C();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function tone(freq: number, at: number, dur: number, type: OscillatorType = "sine", vol = 0.12, slideTo?: number) {
  const c = ac(); if (!c || muted) return;
  const o = c.createOscillator(), g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, c.currentTime + at);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, c.currentTime + at + dur);
  g.gain.setValueAtTime(0.0001, c.currentTime + at);
  g.gain.exponentialRampToValueAtTime(vol, c.currentTime + at + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + at + dur);
  o.connect(g).connect(c.destination);
  o.start(c.currentTime + at); o.stop(c.currentTime + at + dur + 0.05);
}

function noise(at: number, dur: number, vol = 0.2, cutoff = 1800) {
  const c = ac(); if (!c || muted) return;
  const len = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const s = c.createBufferSource(); s.buffer = buf;
  const f = c.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = cutoff;
  const g = c.createGain(); g.gain.value = vol;
  s.connect(f).connect(g).connect(c.destination);
  s.start(c.currentTime + at);
}

export const sfx = {
  /** Call from a user gesture so the browser allows audio. */
  unlock() { ac(); },
  isMuted(): boolean { load(); return muted; },
  setMuted(m: boolean) {
    load(); muted = m;
    try { localStorage.setItem(KEY, m ? "1" : "0"); } catch { /* ignore */ }
  },
  arm() { tone(220, 0, 0.12, "triangle", 0.08, 330); },
  hum() { tone(70, 0, 0.8, "sawtooth", 0.07, 140); tone(105, 0, 0.8, "sine", 0.06, 210); },
  fail() { noise(0, 0.5, 0.28, 1400); tone(110, 0, 0.45, "square", 0.12, 40); tone(70, 0.05, 0.5, "sine", 0.18, 35); },
  win() { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.09, 0.35, "triangle", 0.11)); },
  milestone() { tone(880, 0, 0.18, "sine", 0.1); tone(1320, 0.12, 0.3, "sine", 0.08); },
  standing() { [392, 523, 659, 784].forEach((f, i) => tone(f, i * 0.12, 0.5, "triangle", 0.12)); },
};
