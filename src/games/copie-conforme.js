import { h } from '../core/dom.js';
import { createCanvas } from '../core/canvas.js';
import { sfx, vibrate } from '../core/sfx.js';

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
  Lune: () => [...Array.from({ length: 41 }, (_, i) => { const a = -1.9 + (i / 40) * 3.8; return [0.5 + 0.4 * Math.cos(a), 0.5 + 0.4 * Math.sin(a)]; }), ...Array.from({ length: 41 }, (_, i) => { const a = 1.387 - (i / 40) * 2.774; return [0.3 + 0.382 * Math.cos(a), 0.5 + 0.382 * Math.sin(a)]; })],
  Flèche: () => [[0.1, 0.42], [0.6, 0.42], [0.6, 0.25], [0.9, 0.5], [0.6, 0.75], [0.6, 0.58], [0.1, 0.58], [0.1, 0.42]],
  Escalier: () => [[0.1, 0.9], [0.1, 0.7], [0.3, 0.7], [0.3, 0.5], [0.5, 0.5], [0.5, 0.3], [0.7, 0.3], [0.7, 0.1], [0.9, 0.1]],
  Sablier: () => [[0.2, 0.1], [0.8, 0.1], [0.2, 0.9], [0.8, 0.9], [0.2, 0.1]],
  Diamant: () => [[0.3, 0.15], [0.7, 0.15], [0.9, 0.38], [0.5, 0.9], [0.1, 0.38], [0.3, 0.15]],
  Infini: () => ring(80, (a) => [0.5 + 0.38 * Math.cos(a) / (1 + Math.sin(a) ** 2), 0.5 + 0.38 * Math.sin(a) * Math.cos(a) / (1 + Math.sin(a) ** 2)]),
};
const TIERS = [['Cercle', 'Carré', 'Triangle', 'Zigzag', 'Vague'], ['Étoile', 'Maison', 'Éclair', 'Cœur', 'Flèche', 'Sablier', 'Diamant'], ['Spirale', 'Infini', 'Escalier', 'Lune']];
const ROUNDS = 6;
const stars = (p) => (p >= 90 ? 3 : p >= 75 ? 2 : p >= 55 ? 1 : 0);
function resample(pts, n = 96) {
  const d = [0]; for (let i = 1; i < pts.length; i++) d.push(d[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const L = d[d.length - 1] || 1, out = []; let j = 0;
  for (let k = 0; k < n; k++) { const t = (k / (n - 1)) * L; while (j < d.length - 2 && d[j + 1] < t) j++; const s = (t - d[j]) / ((d[j + 1] - d[j]) || 1); out.push([pts[j][0] + (pts[j + 1]?.[0] - pts[j][0] || 0) * s, pts[j][1] + (pts[j + 1]?.[1] - pts[j][1] || 0) * s]); }
  return out;
}
const chamfer = (A, B) => A.reduce((s, a) => s + Math.min(...B.map((b) => Math.hypot(a[0] - b[0], a[1] - b[1]))), 0) / A.length;

export default {
  start(ctx) {
    const R = ctx.rng, mode = ctx.mode || 'classic';
    const survie = mode === 'survie', miroir = mode === 'miroir';
    const view = createCanvas(ctx.stage, { onResize: () => paint() }); ctx.onCleanup(view.destroy);
    const { g } = view;
    // Classique et miroir : 2 faciles, 2 moyennes, 2 difficiles. Survie : tirage infini, de plus en plus dur.
    const pickShape = (r) => { const tier = survie ? Math.min(2, Math.floor(r / 3)) : Math.min(2, Math.floor(r / 2)); let n; do n = R.pick(TIERS[tier]); while (used.has(n) && used.size < 15); used.add(n); return n; };
    const used = new Set();
    let round = 0, phase = 'show', target = [], ref = [], drawn = [], scores = [], drawing = false, label = '', sub = '', name = '', lives = 3, total = 0, best = 0;
    const showTime = () => Math.max(1100, 2400 - round * (survie ? 90 : 220));
    const box = () => { const s = Math.min(view.w * 0.86, view.h * 0.66, 520); return { s, x: (view.w - s) / 2, y: (view.h - s) / 2 + 30 }; };
    const toPx = ([x, y]) => { const b = box(); return [b.x + x * b.s, b.y + y * b.s]; };
    const stroke = (pts, color, w, glow) => { if (pts.length < 2) return; g.strokeStyle = color; g.lineWidth = w; g.lineCap = g.lineJoin = 'round'; g.shadowColor = color; g.shadowBlur = glow; g.beginPath(); pts.forEach((p, i) => { const [x, y] = toPx(p); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke(); g.shadowBlur = 0; };
    let showT0 = 0;
    function paint() {
      const b = box(); g.clearRect(0, 0, view.w, view.h);
      g.fillStyle = 'rgba(255,255,255,.04)'; g.strokeStyle = 'rgba(255,255,255,.12)'; g.lineWidth = 1.5; g.beginPath(); g.roundRect(b.x - 10, b.y - 10, b.s + 20, b.s + 20, 28); g.fill(); g.stroke();
      g.fillStyle = 'rgba(255,255,255,.06)'; for (let i = 1; i < 4; i++) for (let j = 1; j < 4; j++) { g.beginPath(); g.arc(b.x + (b.s * i) / 4, b.y + (b.s * j) / 4, 2, 0, 7); g.fill(); }
      if (phase === 'show') {
        stroke(target, '#a06bff', 8, 24);
        // Jauge du temps de mémorisation
        const k = Math.max(0, 1 - (performance.now() - showT0) / showTime());
        g.fillStyle = 'rgba(160,107,255,.8)'; g.beginPath(); g.roundRect(b.x, b.y + b.s + 18, b.s * k, 6, 3); g.fill();
      }
      if (phase === 'result') stroke(ref, 'rgba(255,255,255,.35)', 10, 0);
      if (phase !== 'show') stroke(drawn, '#00d1b2', 6, 12);
      g.textAlign = 'center';
      g.fillStyle = '#fff'; g.font = '700 22px Outfit Variable, sans-serif'; g.fillText(label, view.w / 2, Math.max(30, b.y - 44));
      if (sub) { g.fillStyle = '#b6b9d6'; g.font = '500 15px Outfit Variable, sans-serif'; g.fillText(sub, view.w / 2, Math.max(52, b.y - 20)); }
    }
    const hud = () => ctx.hud({ round: survie ? `Forme ${round + 1}` : `${round + 1}/${ROUNDS}`, lives: survie ? '❤️'.repeat(lives) + '🖤'.repeat(3 - lives) : null, total: survie ? `${total} pts` : null });
    const need = () => Math.min(80, 50 + round * 2);
    const nextRound = () => {
      if (!survie && round >= ROUNDS) return finish();
      name = pickShape(round); target = SHAPES[name]();
      ref = miroir ? target.map(([x, y]) => [1 - x, y]) : target;
      drawn = []; phase = 'show'; label = `Mémorise : ${name}`; sub = miroir ? 'Tu devras la dessiner EN MIROIR ↔' : survie ? `Il faut ${need()} % pour passer` : '';
      hud(); sfx.count(); showT0 = performance.now();
      const anim = () => { if (phase !== 'show' || !ctx.alive) return; paint(); requestAnimationFrame(anim); }; anim();
      ctx.timeout(() => { phase = 'draw'; label = miroir ? 'Redessine-la en miroir ↔' : 'Redessine-la ✍️'; sub = 'D’un seul trait, au même endroit'; paint(); sfx.go(); }, showTime());
    };
    const toNorm = (e) => { const p = view.pos(e), b = box(); return [(p.x - b.x) / b.s, (p.y - b.y) / b.s]; };
    ctx.on(view.canvas, 'pointerdown', (e) => { if (phase !== 'draw') return; view.canvas.setPointerCapture(e.pointerId); drawing = true; drawn = [toNorm(e)]; });
    ctx.on(view.canvas, 'pointermove', (e) => { if (!drawing) return; for (const ce of e.getCoalescedEvents?.() || [e]) drawn.push(toNorm(ce)); paint(); });
    ctx.on(view.canvas, 'pointerup', () => {
      if (!drawing) return; drawing = false;
      if (drawn.length < 5) { drawn = []; paint(); return; }
      const A = resample(ref), B = resample(drawn);
      const err = (chamfer(A, B) + chamfer(B, A)) / 2;
      const pct = Math.max(0, Math.min(100, Math.round(100 - err * 380)));
      scores.push(pct); best = Math.max(best, pct); phase = 'result';
      const st = stars(pct);
      label = `${name} : ${pct} %  ${'⭐'.repeat(st) || '·'}`;
      const b = box();
      if (survie) {
        const okk = pct >= need(); const pts = okk ? pct * (1 + Math.floor(round / 3)) : 0; total += pts;
        sub = okk ? `Validé ! +${pts} pts` : `Raté, il fallait ${need()} %`;
        if (!okk) { lives--; ctx.shake(6); }
      } else sub = pct >= 90 ? 'Parfait !' : pct >= 75 ? 'Très ressemblant' : pct >= 55 ? 'Pas mal' : 'Hum… art abstrait';
      paint();
      if (pct >= 90) { ctx.flash('rgba(0,209,178,.3)'); ctx.pop('PARFAIT ✨', view.w / 2, b.y + b.s / 2, '#00d1b2', 34); sfx.win(); }
      else pct >= 75 ? sfx.ok() : pct >= 55 ? sfx.pop() : sfx.bad();
      vibrate(15);
      round++; hud();
      ctx.timeout(() => (survie && lives <= 0 ? finish() : nextRound()), 1600);
    });
    const finish = () => {
      const avg = Math.round(scores.reduce((a, b) => a + b, 0) / Math.max(1, scores.length));
      const nStars = scores.reduce((a, p) => a + stars(p), 0);
      if (survie) {
        const passed = round - 3;
        return ctx.end({ score: total, display: `${total} pts`, board: 'survie', title: passed >= 10 ? 'Mémoire d’éléphant' : passed >= 5 ? 'Bien tenu !' : 'Trop vite fini', label: `${passed} forme${passed > 1 ? 's' : ''} validée${passed > 1 ? 's' : ''} · moyenne ${avg} %`, feats: [passed >= 10 && 'survivant', best >= 95 && 'parfait'].filter(Boolean) });
      }
      ctx.end({
        score: avg, display: `${avg} %`, board: miroir ? 'miroir' : null,
        title: avg >= 85 ? 'Photocopieuse humaine' : avg >= 70 ? 'Belle mémoire' : avg >= 50 ? 'Ressemblant… de loin' : 'Art abstrait',
        label: `${nStars}/18 ★ · ${scores.map((s) => s + '%').join(' · ')}`,
        feats: [!miroir && avg >= 90 && 'photocopieuse', best >= 95 && 'parfait', miroir && avg >= 75 && 'miroir', nStars >= 15 && 'etoiles'].filter(Boolean),
      });
    };
    nextRound();
  },
};
