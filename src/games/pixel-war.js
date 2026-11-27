import { h } from '../core/dom.js';
import { createCanvas, loop } from '../core/canvas.js';
import { sfx, vibrate } from '../core/sfx.js';
import { rng } from '../core/rng.js';

const S = 20, DURATION = 90, MAXE = 10, REGEN = 5; // énergie : 5 cases / s
const TEAMS = [{ name: 'Bleus (toi)', c: '#4cc9f0' }, { name: 'Rouges', c: '#ff3d5a' }, { name: 'Verts', c: '#3ddc97' }, { name: 'Jaunes', c: '#ffc857' }];

function largest(grid, team) {
  const seen = new Uint8Array(S * S); let best = 0;
  for (let i = 0; i < S * S; i++) {
    if (grid[i] !== team || seen[i]) continue;
    let n = 0; const st = [i]; seen[i] = 1;
    while (st.length) { const k = st.pop(); n++; const x = k % S, y = (k / S) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, j = ny * S + nx; if (nx >= 0 && ny >= 0 && nx < S && ny < S && !seen[j] && grid[j] === team) { seen[j] = 1; st.push(j); } } }
    best = Math.max(best, n);
  }
  return best;
}

export default {
  start(ctx) {
    const grid = new Int8Array(S * S).fill(-1);
    const flash = new Float32Array(S * S);
    [[0, 0], [S - 1, 0], [0, S - 1], [S - 1, S - 1]].forEach(([x, y], t) => { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const nx = x + dx, ny = y + dy; if (nx >= 0 && ny >= 0 && nx < S && ny < S) grid[ny * S + nx] = t; } });
    const view = createCanvas(ctx.stage); ctx.onCleanup(view.destroy);
    const { g } = view;
    let energy = MAXE, t = 0, painting = false, last = -1, scores = [9, 9, 9, 9];
    const bar = h('div.bar', { style: { width: 'min(80vw,300px)' } }, h('i', { style: { width: '100%', background: '#4cc9f0' } }));
    const legend = h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'center' } });
    ctx.stage.append(h('div', { style: { position: 'absolute', left: 0, right: 0, bottom: '12px', display: 'grid', placeItems: 'center', gap: '8px', zIndex: 2, pointerEvents: 'none' } }, legend, bar));
    const geo = () => { const size = Math.min(view.w - 24, view.h - 110); const c = size / S; return { c, ox: (view.w - size) / 2, oy: Math.max(10, (view.h - 90 - size) / 2) }; };
    const paint = (team, i) => { if (grid[i] === team) return false; grid[i] = team; flash[i] = 1; return true; };
    const at = (e) => { const p = view.pos(e), { c, ox, oy } = geo(); const x = Math.floor((p.x - ox) / c), y = Math.floor((p.y - oy) / c); return x >= 0 && y >= 0 && x < S && y < S ? y * S + x : -1; };
    const tryPaint = (e) => { const i = at(e); if (i < 0 || i === last) return; last = i; if (energy >= 1 && paint(0, i)) { energy -= 1; sfx.tick(); vibrate(5); } };
    ctx.on(view.canvas, 'pointerdown', (e) => { painting = true; last = -1; view.canvas.setPointerCapture(e.pointerId); tryPaint(e); });
    ctx.on(view.canvas, 'pointermove', (e) => painting && tryPaint(e));
    ctx.on(view.canvas, 'pointerup', () => (painting = false));

    // Bots : chaque équipe peint en bordure de son territoire, et attaque parfois
    const botMove = (team) => {
      const border = [];
      for (let i = 0; i < S * S; i++) { if (grid[i] === team) continue; const x = i % S, y = (i / S) | 0; if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => grid[(y + dy) * S + x + dx] === team && x + dx >= 0 && x + dx < S && y + dy >= 0 && y + dy < S)) border.push(i); }
      if (!border.length) { paint(team, rng.int(0, S * S - 1)); return; }
      const enemy = border.filter((i) => grid[i] >= 0);
      paint(team, rng.pick(enemy.length && rng.chance(0.35) ? enemy : border));
    };
    const rates = [1.6, 3.2, 3.0, 2.8]; // équipe 0 : coéquipiers bots en plus du joueur
    const acc = [0, 0, 0, 0];
    const stop = loop((dt) => {
      t += dt; energy = Math.min(MAXE, energy + REGEN * dt);
      acc.forEach((_, k) => { acc[k] += rates[k] * dt * (1 + t / DURATION); while (acc[k] >= 1) { acc[k]--; botMove(k); } });
      for (let i = 0; i < flash.length; i++) flash[i] = Math.max(0, flash[i] - dt * 3);
      if ((t * 4 | 0) !== ((t - dt) * 4 | 0)) { scores = TEAMS.map((_, k) => largest(grid, k)); legend.replaceChildren(...TEAMS.map((tm, k) => h('span.chip', { style: { borderColor: tm.c, color: '#fff', background: k === 0 ? tm.c + '44' : 'rgba(0,0,0,.35)' } }, `${tm.name.split(' ')[0]} ${scores[k]}`))); }
      bar.firstChild.style.width = (energy / MAXE * 100) + '%';
      const left = Math.max(0, DURATION - t);
      ctx.hud({ time: `${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, '0')}` });
      draw();
      if (left <= 0) { stop(); finish(); }
    });
    ctx.onCleanup(stop);
    function draw() {
      const { c, ox, oy } = geo();
      g.clearRect(0, 0, view.w, view.h);
      g.fillStyle = 'rgba(255,255,255,.04)'; g.beginPath(); g.roundRect(ox - 8, oy - 8, c * S + 16, c * S + 16, 16); g.fill();
      for (let i = 0; i < S * S; i++) {
        const x = i % S, y = (i / S) | 0, tm = grid[i];
        g.fillStyle = tm < 0 ? 'rgba(255,255,255,.06)' : TEAMS[tm].c;
        const pad = c * 0.06 * (1 - flash[i]);
        g.beginPath(); g.roundRect(ox + x * c + pad, oy + y * c + pad, c - pad * 2, c - pad * 2, c * 0.18); g.fill();
        if (flash[i] > 0) { g.fillStyle = `rgba(255,255,255,${flash[i] * 0.5})`; g.fill(); }
      }
    }
    function finish() {
      scores = TEAMS.map((_, k) => largest(grid, k));
      const order = TEAMS.map((tm, k) => ({ ...tm, k, s: scores[k] })).sort((a, b) => b.s - a.s);
      const rank = order.findIndex((o) => o.k === 0) + 1;
      ctx.end({ score: scores[0], display: `${scores[0]} cases`, emoji: rank === 1 ? '🏆' : '🟦', win: rank === 1, title: rank === 1 ? 'Les Bleus dominent !' : `Les ${order[0].name} gagnent`, label: `Plus grande zone de ton équipe · ${rank}e sur 4`,
        extra: h('div.btn-row', order.map((o) => h('span.chip', { style: { borderColor: o.c } }, `${o.name} : ${o.s}`))), share: `🟥 Pixel War Mini : mon équipe a tenu ${scores[0]} cases (${rank}e/4). Rejoins la guerre !` });
    }
  },
};
