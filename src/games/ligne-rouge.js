import { h } from '../core/dom.js';
import { createCanvas, loop } from '../core/canvas.js';
import { sfx, vibrate } from '../core/sfx.js';

const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];
const COLORS = ['#4cc9f0', '#ff3d5a', '#3ddc97', '#ffc857'];
const NAMES = ['Toi', 'Rouge', 'Vert', 'Jaune'];
const ROUNDS = 3, PTS = [3, 2, 1, 0];

export default {
  async start(ctx) {
    const duo = ctx.mode === 'duo';
    const n = duo ? 2 : 4;
    const totals = Array(n).fill(0);
    let survival = 0, wins = 0, longest = 0;
    const view = createCanvas(ctx.stage, { onResize: () => state && draw() });
    ctx.onCleanup(view.destroy);
    const { g } = view;
    let state = null;

    // Commandes (communes à toutes les manches)
    const turn = (b, dir) => { if (b?.alive && (dir + 2) % 4 !== b.d) b.nd = dir; };
    const rel = (b, s) => b && turn(b, (b.nd + s + 4) % 4);
    const boost = (b) => { if (b?.alive && b.charges > 0 && b.boost <= 0) { b.charges--; b.boost = 1.1; sfx.pop(); vibrate(15); paintCharges(); } };
    const keys = duo
      ? { KeyW: [0, 0], KeyD: [0, 1], KeyS: [0, 2], KeyA: [0, 3], ArrowUp: [1, 0], ArrowRight: [1, 1], ArrowDown: [1, 2], ArrowLeft: [1, 3] }
      : { ArrowUp: [0, 0], ArrowRight: [0, 1], ArrowDown: [0, 2], ArrowLeft: [0, 3], KeyW: [0, 0], KeyD: [0, 1], KeyS: [0, 2], KeyA: [0, 3] };
    ctx.on(window, 'keydown', (e) => {
      if (!state) return;
      const k = keys[e.code]; if (k) { e.preventDefault(); turn(state.bikes[k[0]], k[1]); }
      if (e.code === 'Space' || e.code === 'ShiftLeft') { e.preventDefault(); boost(state.bikes[0]); }
      if (duo && (e.code === 'Enter' || e.code === 'ShiftRight')) boost(state.bikes[1]);
    });
    const charges = h('div', { style: { position: 'absolute', top: '10px', left: '50%', transform: 'translateX(-50%)', zIndex: 3, display: 'flex', gap: '6px', pointerEvents: 'none' } });
    ctx.stage.append(charges);
    const paintCharges = () => { if (!state) return; charges.replaceChildren(...state.bikes.filter((b) => b.human).map((b) => h('span.chip', { style: { borderColor: b.color } }, `${duo ? b.name + ' ' : ''}⚡${'●'.repeat(b.charges)}${'○'.repeat(3 - b.charges)}`))); };
    if (!duo) {
      let sx = 0, sy = 0, down = false, moved = false, lastTap = 0;
      ctx.on(view.canvas, 'pointerdown', (e) => { down = true; moved = false; sx = e.clientX; sy = e.clientY; });
      ctx.on(view.canvas, 'pointermove', (e) => {
        if (!down || !state) return; const dx = e.clientX - sx, dy = e.clientY - sy;
        if (Math.hypot(dx, dy) > 22) { moved = true; turn(state.bikes[0], Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0)); sx = e.clientX; sy = e.clientY; }
      });
      ctx.on(window, 'pointerup', () => { if (down && !moved && state) { const now = performance.now(); if (now - lastTap < 300) boost(state.bikes[0]); lastTap = now; } down = false; });
    } else {
      const pad = (i, top) => h('div', { style: { position: 'absolute', left: 0, right: 0, [top ? 'top' : 'bottom']: '10px', display: 'flex', justifyContent: 'space-between', padding: '0 10px', transform: top ? 'rotate(180deg)' : '', zIndex: 3, pointerEvents: 'none' } },
        ...[['↺', -1], ['⚡', 0], ['↻', 1]].map(([s, v]) => h('button.btn', { style: { width: '68px', height: '68px', fontSize: '26px', borderColor: COLORS[i], color: COLORS[i], background: 'rgba(0,0,0,.45)', pointerEvents: 'auto' }, onpointerdown: (e) => { e.preventDefault(); const b = state?.bikes[i]; v ? rel(b, v) : boost(b); } }, s)));
      ctx.stage.append(pad(0, false), pad(1, true));
    }

    for (let r = 0; r < ROUNDS && ctx.alive; r++) {
      const ranking = await round(r);
      if (!ctx.alive) return;
      ranking.forEach((b, i) => { totals[b.id] += PTS[i]; });
      if (ranking[0].id === 0) wins++;
      // Tableau entre les manches
      const order = [...Array(n).keys()].sort((a, b) => totals[b] - totals[a]);
      const o = ctx.overlay(h('div.big-msg', { style: { fontSize: '28px' } }, ranking[0].id === 0 && !duo ? 'Manche gagnée !' : `${ranking[0].name} gagne la manche`),
        h('p.faint', `Manche ${r + 1} sur ${ROUNDS}`),
        h('div', { style: { display: 'grid', gap: '6px' } }, order.map((id) => h('div', { style: { display: 'flex', justifyContent: 'space-between', padding: '8px 12px', borderRadius: '12px', background: 'rgba(255,255,255,.05)', borderLeft: `4px solid ${COLORS[id]}` } }, h('b', duo ? `Joueur ${id + 1}` : NAMES[id]), h('span', `${totals[id]} pts`)))),
        r < ROUNDS - 1 ? h('p.muted', r === 0 ? 'Manche 2 : les bots sont plus malins, des murs apparaissent.' : 'Dernière manche : arène piégée !') : null);
      await ctx.wait(2300); o.remove();
    }
    if (!ctx.alive) return;
    if (duo) {
      const w = totals[0] === totals[1] ? null : totals[0] > totals[1] ? 0 : 1;
      return ctx.end({ multi: true, title: w == null ? 'Égalité parfaite !' : `Joueur ${w + 1} gagne !`, emoji: '🏆', display: `${totals[0]} – ${totals[1]}`, label: `${ROUNDS} manches`, win: true });
    }
    const score = totals[0] * 100 + Math.round(survival * 2);
    const rank = 1 + totals.slice(1).filter((t) => t > totals[0]).length;
    ctx.end({
      score, display: `${score} pts`, emoji: rank === 1 ? '🏆' : '🏍️', win: rank === 1,
      title: rank === 1 ? (wins === 3 ? 'Grand chelem !' : 'Champion·ne de l’arène !') : `${rank}e au classement`,
      label: `${totals[0]} pts de classement · ${Math.round(survival)} s de survie`,
      feats: [wins === 3 && 'chelem', longest >= 45 && 'survie', rank === 1 && 'champion'].filter(Boolean),
    });

    async function round(r) {
      const cell = Math.max(9, Math.floor(Math.min(view.w, view.h) / 42));
      const cols = Math.floor(view.w / cell), rows = Math.floor(view.h / cell);
      const grid = new Uint8Array(cols * rows);
      const idx = (x, y) => y * cols + x;
      const free = (x, y) => x >= 0 && y >= 0 && x < cols && y < rows && !grid[idx(x, y)];
      // Obstacles des manches 2 et 3
      const walls = [];
      if (r >= 1) {
        const k = r === 1 ? 4 : 9;
        for (let i = 0; i < k; i++) {
          const horiz = ctx.rng.chance(0.5), len = ctx.rng.int(4, 9);
          const x0 = ctx.rng.int(4, cols - 12), y0 = ctx.rng.int(4, rows - 12);
          for (let j = 0; j < len; j++) { const x = x0 + (horiz ? j : 0), y = y0 + (horiz ? 0 : j); if (Math.abs(x - cols / 2) > 3 || Math.abs(y - rows / 2) > 3) { grid[idx(x, y)] = 9; walls.push([x, y]); } }
        }
      }
      const starts = [[0.2, 0.5, 1], [0.8, 0.5, 3], [0.5, 0.2, 2], [0.5, 0.8, 0]];
      const bikes = Array.from({ length: n }, (_, i) => {
        const [fx, fy, d] = starts[i];
        const b = { id: i, x: Math.floor(cols * fx), y: Math.floor(rows * fy), d, nd: d, alive: true, human: i === 0 || duo, color: COLORS[i], name: duo ? `Joueur ${i + 1}` : NAMES[i], trail: [], diedAt: 0, charges: 3, boost: 0, acc: 0, smart: 0.5 + r * 0.25 };
        grid[idx(b.x, b.y)] = 0; return b;
      });
      bikes.forEach((b) => { grid[idx(b.x, b.y)] = b.id + 1; b.trail.push([b.x, b.y]); });
      const sparks = [];
      state = { bikes, cols, rows, cell, walls, sparks };
      paintCharges();
      let t = 0;
      ctx.hud({ round: `Manche ${r + 1}/${ROUNDS}`, alive: `${n} en vie` });
      const space = (x, y, limit = 140) => {
        if (!free(x, y)) return 0;
        const seen = new Set([idx(x, y)]); const q = [[x, y]]; let c = 0;
        while (q.length && c < limit) { const [cx, cy] = q.shift(); c++; for (const [dx, dy] of DIRS) { const nx = cx + dx, ny = cy + dy, k = idx(nx, ny); if (free(nx, ny) && !seen.has(k)) { seen.add(k); q.push([nx, ny]); } } }
        return c;
      };
      const think = (b) => {
        let best = b.d, bestScore = -1;
        const me = bikes[0];
        for (const s of [0, -1, 1]) {
          const d = (b.d + s + 4) % 4; const [dx, dy] = DIRS[d];
          let sc = space(b.x + dx, b.y + dy, 60 + b.smart * 120) + (s === 0 ? 3 : 0) + Math.random() * (10 - b.smart * 6);
          // Bots agressifs : se rapprochent pour couper la route du joueur
          if (me.alive && b.smart > 0.7 && sc > 60) sc += 8 - Math.min(8, Math.hypot(b.x + dx - (me.x + DIRS[me.d][0] * 4), b.y + dy - (me.y + DIRS[me.d][1] * 4)) / 3);
          if (sc > bestScore) { bestScore = sc; best = d; }
        }
        b.nd = best;
        if (b.charges > 0 && b.boost <= 0 && Math.random() < 0.004 * b.smart) { b.charges--; b.boost = 1.1; }
      };
      draw();
      await ctx.countdown(r === 0 ? 3 : 2);
      if (!ctx.alive) return [];
      return new Promise((resolve) => {
        let over = false;
        const stop = loop((dt) => {
          t += dt;
          for (const b of bikes) {
            if (!b.alive) continue;
            b.boost -= dt;
            b.acc += dt * (b.boost > 0 ? 2 : 1);
          }
          // On avance case par case, au rythme de chacun
          let moved = true;
          while (moved && !over) {
            moved = false;
            const ready = bikes.filter((b) => b.alive && b.acc >= 0.068);
            if (!ready.length) break;
            moved = true;
            ready.forEach((b) => { b.acc -= 0.068; if (!b.human) think(b); b.d = b.nd; });
            const next = ready.map((b) => [b, b.x + DIRS[b.d][0], b.y + DIRS[b.d][1]]);
            for (const [b, nx, ny] of next) {
              const headOn = next.some(([o, x2, y2]) => o !== b && x2 === nx && y2 === ny);
              if (!free(nx, ny) || headOn) crash(b);
            }
            for (const [b, nx, ny] of next) if (b.alive) { b.x = nx; b.y = ny; grid[idx(nx, ny)] = b.id + 1; b.trail.push([nx, ny]); }
            const still = bikes.filter((b) => b.alive);
            const meDead = !duo && !bikes[0].alive;
            if (still.length <= 1 || meDead) {
              over = true;
              if (!duo) { survival += bikes[0].alive ? t : bikes[0].diedAt; longest = Math.max(longest, bikes[0].alive ? t : bikes[0].diedAt); }
              if (meDead) { // les bots restants finissent la manche instantanément (ordre au hasard)
                still.forEach((b, i) => (b.diedAt = t + 1 + i * 0.01));
              }
              ctx.timeout(() => { stop(); const order = [...bikes].sort((a, b) => (b.alive ? 1e9 : b.diedAt) - (a.alive ? 1e9 : a.diedAt)); state = null; resolve(order); }, 900);
            }
          }
          for (const s of sparks) { s.x += s.vx * dt; s.y += s.vy * dt; s.vx *= 0.94; s.vy *= 0.94; s.life -= dt; }
          for (let i = sparks.length - 1; i >= 0; i--) if (sparks[i].life <= 0) sparks.splice(i, 1);
          draw();
          ctx.hud({ alive: `${bikes.filter((b) => b.alive).length} en vie`, time: t.toFixed(1).replace('.', ',') + ' s' });
        });
        ctx.onCleanup(stop);
        function crash(b) {
          if (!b.alive) return;
          b.alive = false; b.diedAt = t;
          for (let i = 0; i < 26; i++) { const a = Math.random() * 7, v = 60 + Math.random() * 220; sparks.push({ x: (b.x + 0.5) * cell, y: (b.y + 0.5) * cell, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.5 + Math.random() * 0.5, c: b.color }); }
          if (b.human) { sfx.boom(); vibrate(100); ctx.shake(10); } else { sfx.bad(); ctx.pop(`${b.name} K.O.`, (b.x + 0.5) * cell, (b.y + 0.5) * cell, b.color, 18); }
        }
      });
    }

    function draw() {
      if (!state) return;
      const { bikes, cols, rows, cell, walls, sparks } = state;
      const ox = (view.w - cols * cell) / 2, oy = (view.h - rows * cell) / 2;
      g.clearRect(0, 0, view.w, view.h);
      g.fillStyle = 'rgba(255,255,255,0.035)';
      for (let x = 0; x <= cols; x += 2) g.fillRect(ox + x * cell, oy, 1, rows * cell);
      for (let y = 0; y <= rows; y += 2) g.fillRect(ox, oy + y * cell, cols * cell, 1);
      g.strokeStyle = 'rgba(255,255,255,.18)'; g.lineWidth = 2; g.strokeRect(ox, oy, cols * cell, rows * cell);
      g.fillStyle = '#8a8fb8'; for (const [x, y] of walls) { g.beginPath(); g.roundRect(ox + x * cell + 1, oy + y * cell + 1, cell - 2, cell - 2, 3); g.fill(); }
      g.lineCap = 'round'; g.lineJoin = 'round';
      for (const b of bikes) {
        g.strokeStyle = b.color; g.globalAlpha = b.alive ? 1 : 0.3; g.lineWidth = cell * 0.55;
        g.shadowColor = b.color; g.shadowBlur = b.alive ? (b.boost > 0 ? 26 : 14) : 0;
        g.beginPath(); b.trail.forEach(([x, y], i) => { const px = ox + (x + 0.5) * cell, py = oy + (y + 0.5) * cell; i ? g.lineTo(px, py) : g.moveTo(px, py); }); g.stroke();
        if (b.alive) { g.fillStyle = b.boost > 0 ? '#fff' : b.color; g.beginPath(); g.arc(ox + (b.x + 0.5) * cell, oy + (b.y + 0.5) * cell, cell * (b.boost > 0 ? 0.75 : 0.6), 0, 7); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(ox + (b.x + 0.5) * cell, oy + (b.y + 0.5) * cell, cell * 0.3, 0, 7); g.fill(); }
        g.shadowBlur = 0; g.globalAlpha = 1;
      }
      for (const s of sparks) { g.globalAlpha = Math.max(0, s.life * 2); g.fillStyle = s.c; g.fillRect(ox + s.x - 2, oy + s.y - 2, 4, 4); } g.globalAlpha = 1;
    }
  },
};
