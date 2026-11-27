/** Petits sons synthétisés (aucun fichier audio : léger et hors ligne). */
import { store } from './store.js';
let ac = null;
let muted = store.get('muted', false);
function ctx() {
  if (!ac) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return null; ac = new C(); }
  if (ac.state === 'suspended') ac.resume();
  return ac;
}
/** Contexte audio partagé (pour les jeux qui ont besoin du son lui-même). */
export const audioCtx = () => ctx();
export function tone(freq = 440, dur = 0.12, { type = 'sine', vol = 0.18, slide = 0, delay = 0 } = {}) {
  if (muted) return;
  const a = ctx(); if (!a) return;
  const t = a.currentTime + delay;
  const o = a.createOscillator(); const g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + 0.02);
}
function noise(dur = 0.3, vol = 0.3) {
  if (muted) return; const a = ctx(); if (!a) return;
  const len = Math.floor(a.sampleRate * dur); const b = a.createBuffer(1, len, a.sampleRate); const d = b.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2;
  const s = a.createBufferSource(); s.buffer = b; const g = a.createGain(); g.gain.value = vol;
  const f = a.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 900;
  s.connect(f).connect(g).connect(a.destination); s.start();
}
export const sfx = {
  tap: () => tone(660, 0.06, { type: 'triangle', vol: 0.12 }),
  click: () => tone(1200, 0.03, { type: 'square', vol: 0.05 }),
  ok: () => { tone(660, 0.09, { type: 'triangle' }); tone(990, 0.14, { type: 'triangle', delay: 0.07 }); },
  bad: () => tone(220, 0.25, { type: 'sawtooth', vol: 0.1, slide: -120 }),
  tick: () => tone(1500, 0.025, { type: 'square', vol: 0.06 }),
  go: () => tone(880, 0.25, { type: 'triangle', vol: 0.2 }),
  count: () => tone(440, 0.12, { type: 'triangle', vol: 0.15 }),
  pop: () => tone(500, 0.08, { type: 'sine', vol: 0.15, slide: 500 }),
  boom: () => { noise(0.7, 0.5); tone(90, 0.5, { type: 'sine', vol: 0.4, slide: -60 }); },
  win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.18, { type: 'triangle', vol: 0.16, delay: i * 0.09 })),
  lose: () => [392, 330, 262].forEach((f, i) => tone(f, 0.22, { type: 'triangle', vol: 0.14, delay: i * 0.12 })),
  note: (i) => tone([329.6, 392, 523.3, 659.3, 784, 880][i % 6], 0.3, { type: 'triangle', vol: 0.2 }),
  whoosh: () => { noise(0.18, 0.12); tone(300, 0.18, { type: 'sine', vol: 0.12, slide: 500 }); },
  combo: (n) => tone(660 + n * 110, 0.12, { type: 'triangle', vol: 0.18 }),
  unlock() { ctx(); },
  get muted() { return muted; },
  setMuted(v) { muted = v; store.set('muted', v); },
};
export const vibrate = (p = 15) => { try { navigator.vibrate?.(p); } catch { /* ignore */ } };
