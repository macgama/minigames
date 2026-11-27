import { h } from '../core/dom.js';
import { createCanvas } from '../core/canvas.js';
import { sfx, vibrate } from '../core/sfx.js';
import { rng } from '../core/rng.js';

const ring = (n, f) => Array.from({ length: n + 1 }, (_, i) => f((i / n) * Math.PI * 2));
const SHAPES = {
  Cercle: () => ring(60, (a) => [0.5 + 0.4 * Math.cos(a), 0.5 + 0.4 * Math.sin(a)]),
  Triangle: () => [[0.5, 0.1], [0.9, 0.85], [0.1, 0.85], [0.5, 0.1]],
  Carré: () => [[0.15, 0.15], [0.85, 0.15], [0.85, 0.85], [0.15, 0.85], [0.15, 0.15]],
  Étoile: () => Array.from({ length: 11 }, (_, i) => { const a = -Math.PI / 2 + (i / 10) * Math.PI * 2, r = i % 2 ? 0.18 : 0.42; return [0.5 + r * Math.cos(a), 0.52 + r * Math.sin(a)]; }),
  Cœur: () => ring(80, (a) => { const x = 16 * Math.sin(a) ** 3, y = 13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a); return [0.5 + x / 40, 0.45 - y / 40]; }),
  Spirale: () => Array.from({ length: 90 }, (_, i) => { const a = i / 90 * Math.PI * 5, r = 0.03 + (i / 90) * 0.38; return [0.5 + r * Math.cos(a), 0.5 + r * Math.sin(a)]; }),
  Zigzag: () => [[0.1, 0.7], [0.3, 0.3], [0.5, 0.7], [0.7, 0.3], [0.9, 0.7]],
  Vague: () => Array.from({ length: 60 }, (_, i) => [0.1 + (i / 59) * 0.8, 0.5 + 0.25 * Math.sin((i / 59) * Math.PI * 3)]),
  Éclair: () => [[0.6, 0.08], [0.3, 0.52], [0.55, 0.52], [0.4, 0.92], [0.75, 0.42], [0.5, 0.42], [0.6, 0.08]],
  Maison: () => [[0.2, 0.9], [0.2, 0.45], [0.5, 0.15], [0.8, 0.45], [0.8, 0.9], [0.2, 0.9]],
  Infini: () => ring(80, (a) => [0.5 + 0.38 * Math.cos(a) / (1 + Math.sin(a) ** 2), 0.5 + 0.38 * Math.sin(a) * Math.cos(a) / (1 + Math.sin(a) ** 2)]),
};
const ROUNDS = 5;
function resample(pts, n = 96) {
  const d = [0]; for (let i = 1; i < pts.length; i++) d.push(d[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const L = d[d.length - 1] || 1, out = []; let j = 0;
  for (let k = 0; k < n; k++) { const t = (k / (n - 1)) * L; while (j < d.length - 2 && d[j + 1] < t) j++; const s = (t - d[j]) / ((d[j + 1] - d[j]) || 1); out.push([pts[j][0] + (pts[j + 1]?.[0] - pts[j][0] || 0) * s, pts[j][1] + (pts[j + 1]?.[1] - pts[j][1] || 0) * s]); }
  return out;
}
const chamfer = (A, B) => A.reduce((s, a) => s + Math.min(...B.map((b) => Math.hypot(a[0] - b[0], a[1] - b[1]))), 0) / A.length;

export default {
  start(ctx) {
    const view = createCanvas(ctx.stage, { onResize: () => paint() }); ctx.onCleanup(view.destroy);
    const { g } = view;
    const names = rng.shuffle(Object.keys(SHAPES)).slice(0, ROUNDS);
    let round = 0, phase = 'show', target = [], drawn = [], scores = [], drawing = false, label = '';
    const box = () => { const s = Math.min(view.w * 0.86, view.h * 0.7, 520); return { s, x: (view.w - s) / 2, y: (view.h - s) / 2 + 20 }; };
    const toPx = ([x, y]) => { const b = box(); return [b.x + x * b.s, b.y + y * b.s]; };
    const stroke = (pts, color, w, glow) => { if (pts.length < 2) return; g.strokeStyle = color; g.lineWidth = w; g.lineCap = g.lineJoin = 'round'; g.shadowColor = color; g.shadowBlur = glow; g.beginPath(); pts.forEach((p, i) => { const [x, y] = toPx(p); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke(); g.shadowBlur = 0; };
    function paint() {
      const b = box(); g.clearRect(0, 0, view.w, view.h);
      g.fillStyle = 'rgba(255,255,255,.04)'; g.strokeStyle = 'rgba(255,255,255,.12)'; g.lineWidth = 1.5; g.beginPath(); g.roundRect(b.x - 10, b.y - 10, b.s + 20, b.s + 20, 28); g.fill(); g.stroke();
      g.fillStyle = 'rgba(255,255,255,.06)'; for (let i = 1; i < 4; i++) for (let j = 1; j < 4; j++) { g.beginPath(); g.arc(b.x + (b.s * i) / 4, b.y + (b.s * j) / 4, 2, 0, 7); g.fill(); }
      if (phase === 'show' || phase === 'result') stroke(target, phase === 'result' ? 'rgba(255,255,255,.35)' : '#a06bff', phase === 'result' ? 10 : 8, phase === 'show' ? 24 : 0);
      if (phase !== 'show') stroke(drawn, '#00d1b2', 6, 12);
      g.fillStyle = '#fff'; g.font = '700 22px Outfit Variable, sans-serif'; g.textAlign = 'center'; g.fillText(label, view.w / 2, Math.max(28, b.y - 32));
    }
    const nextRound = () => {
      if (round >= ROUNDS) return finish();
      target = SHAPES[names[round]](); drawn = []; phase = 'show'; label = `Mémorise : ${names[round]}`;
      ctx.hud({ round: `${round + 1}/${ROUNDS}` }); paint(); sfx.count();
      ctx.timeout(() => { phase = 'draw'; label = 'Redessine-la ✍️'; paint(); sfx.go(); }, 2000);
    };
    const toNorm = (e) => { const p = view.pos(e), b = box(); return [(p.x - b.x) / b.s, (p.y - b.y) / b.s]; };
    ctx.on(view.canvas, 'pointerdown', (e) => { if (phase !== 'draw') return; view.canvas.setPointerCapture(e.pointerId); drawing = true; drawn = [toNorm(e)]; });
    ctx.on(view.canvas, 'pointermove', (e) => { if (!drawing) return; for (const ce of e.getCoalescedEvents?.() || [e]) drawn.push(toNorm(ce)); paint(); });
    ctx.on(view.canvas, 'pointerup', () => {
      if (!drawing) return; drawing = false;
      if (drawn.length < 5) { drawn = []; paint(); return; }
      const A = resample(target), B = resample(drawn);
      const err = (chamfer(A, B) + chamfer(B, A)) / 2;
      const pct = Math.max(0, Math.min(100, Math.round(100 - err * 380)));
      scores.push(pct); phase = 'result'; label = `${names[round]} : ${pct} %`; paint();
      pct >= 75 ? sfx.ok() : pct >= 50 ? sfx.pop() : sfx.bad(); vibrate(15);
      round++; ctx.timeout(nextRound, 1500);
    });
    const finish = () => {
      const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
      ctx.end({ score: avg, display: `${avg} %`, title: avg >= 85 ? 'Photocopieuse humaine' : avg >= 70 ? 'Belle mémoire' : avg >= 50 ? 'Ressemblant… de loin' : 'Art abstrait', label: `Précision moyenne · ${scores.map((s) => s + '%').join(' · ')}`, share: `✍️ Copie Conforme : ${avg} % de précision de mémoire. Fais mieux !` });
    };
    nextRound();
  },
};
