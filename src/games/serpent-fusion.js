import { h } from '../core/dom.js';
import { createCanvas } from '../core/canvas.js';
import { sfx, vibrate } from '../core/sfx.js';
import { makeRng, todayKey } from '../core/rng.js';

const N = 18;
const COLS = ['#ff5c7a', '#3ddc97', '#4cc9f0', '#ffd23f'];
const DIRS = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0], KeyW: [0, -1], KeyS: [0, 1], KeyA: [-1, 0], KeyD: [1, 0] };

export default {
  start(ctx) {
    const mode = ctx.mode || 'classic', wrap = mode === 'tore';
    const R = mode === 'jour' ? makeRng('serpent-' + todayKey()) : ctx.rng;
    const view = createCanvas(ctx.stage); ctx.onCleanup(view.destroy);
    const { g } = view;
    let snake = [{ x: 5, y: 9, c: '#fff' }, { x: 4, y: 9, c: '#fff' }, { x: 3, y: 9, c: '#fff' }];
    let dir = [1, 0], queue = [], score = 0, fusions = 0, chain = [], tick = 0, step = 0.16, over = false, maxLen = 3, fx = [];
    const fusedColors = new Set(), walls = [];
    const food = [];
    const free = (x, y) => !snake.some((s) => s.x === x && s.y === y) && !food.some((f) => f.x === x && f.y === y) && !walls.some((w) => w.x === x && w.y === y);
    const spawn = () => { let x, y, k = 0; do { x = R.int(0, N - 1); y = R.int(0, N - 1); } while (!free(x, y) && ++k < 500); food.push({ x, y, c: R.chance(0.08) ? 'joker' : R.int(0, 3) }); };
    for (let i = 0; i < 3; i++) spawn();
    const turn = (d) => { const last = queue[queue.length - 1] || dir; if (d[0] === -last[0] && d[1] === -last[1]) return; if (queue.length < 3) queue.push(d); };
    ctx.on(window, 'keydown', (e) => { if (DIRS[e.code]) { e.preventDefault(); turn(DIRS[e.code]); } });
    let sw = null;
    ctx.on(view.canvas, 'pointerdown', (e) => (sw = { x: e.clientX, y: e.clientY }));
    ctx.on(view.canvas, 'pointermove', (e) => { if (!sw) return; const dx = e.clientX - sw.x, dy = e.clientY - sw.y; if (Math.hypot(dx, dy) > 24) { turn(Math.abs(dx) > Math.abs(dy) ? [Math.sign(dx), 0] : [0, Math.sign(dy)]); sw = { x: e.clientX, y: e.clientY }; } });
    ctx.on(view.canvas, 'pointerup', () => (sw = null));
    const pad = h('div', { style: { position: 'absolute', right: '12px', bottom: '12px', display: 'grid', gridTemplateColumns: 'repeat(3,48px)', gap: '4px', zIndex: 3, opacity: 0.85 } },
      ...[[null], ['ArrowUp', '▲'], [null], ['ArrowLeft', '◀'], [null], ['ArrowRight', '▶'], [null], ['ArrowDown', '▼'], [null]].map(([k, l]) => (k ? h('button.btn', { style: { width: '48px', height: '48px', padding: 0 }, onpointerdown: (e) => { e.preventDefault(); turn(DIRS[k]); } }, l) : h('span'))));
    ctx.stage.append(pad);

    const geo = () => { const s = Math.min(view.w - 20, view.h - 150); const c = Math.floor(s / N); return { c, ox: (view.w - c * N) / 2, oy: Math.max(8, (view.h - 130 - c * N) / 2) }; };
    const fuse = (col) => {
      // Les 3 derniers anneaux de cette couleur disparaissent : le serpent raccourcit
      // On retire 3 anneaux de cette couleur (côté tête) puis on raccourcit la queue d'autant
      let removed = 0;
      for (let i = 1; i < snake.length && removed < 3; i++) if (snake[i].c === COLS[col]) { for (let j = i; j < snake.length - 1; j++) snake[j].c = snake[j + 1].c; snake.pop(); removed++; i--; }
      fusions++; fusedColors.add(col);
      const gain = 100 * Math.min(5, fusions % 5 || 5) + snake.length * 5; score += gain;
      const { c, ox, oy } = geo(); ctx.pop(`FUSION +${gain}`, ox + snake[0].x * c, oy + snake[0].y * c, COLS[col], 28);
      ctx.flash(COLS[col] + '44'); sfx.win(); vibrate([20, 30, 20]);
      for (let i = 0; i < 18; i++) fx.push({ x: snake[0].x + 0.5, y: snake[0].y + 0.5, vx: R.float(-6, 6), vy: R.float(-6, 6), t: 0.6, c: COLS[col] });
      // Tous les 4 fusions, un mur apparaît (mode classique)
      if (!wrap && fusions % 4 === 0) { let x, y; do { x = R.int(1, N - 2); y = R.int(1, N - 2); } while (!free(x, y) || Math.abs(x - snake[0].x) + Math.abs(y - snake[0].y) < 4); walls.push({ x, y }); }
      chain = [];
    };
    const advance = () => {
      if (queue.length) dir = queue.shift();
      let x = snake[0].x + dir[0], y = snake[0].y + dir[1];
      if (wrap) { x = (x + N) % N; y = (y + N) % N; }
      if (x < 0 || y < 0 || x >= N || y >= N || snake.slice(0, -1).some((s) => s.x === x && s.y === y) || walls.some((w) => w.x === x && w.y === y)) return die();
      const fi = food.findIndex((f) => f.x === x && f.y === y);
      // Les couleurs suivent le corps : on décale les positions, pas les couleurs
      const cols = snake.map((s) => s.c);
      snake.unshift({ x, y });
      if (fi >= 0) {
        const f = food.splice(fi, 1)[0];
        const col = f.c === 'joker' ? (chain[chain.length - 1] ?? R.int(0, 3)) : f.c;
        cols.splice(1, 0, COLS[col]);
        snake.forEach((sg, i) => (sg.c = cols[i]));
        chain.push(col); chain = chain.slice(-3); score += 10; sfx.tick();
        if (chain.length === 3 && chain.every((k) => k === col)) fuse(col);
        spawn(); step = Math.max(0.065, step - 0.003);
      } else { snake.pop(); snake.forEach((sg, i) => (sg.c = cols[i])); }
      maxLen = Math.max(maxLen, snake.length);
      ctx.hud({ pts: `${score} pts`, len: `📏 ${snake.length}`, chain: chain.length ? chain.map((k) => ['🔴', '🟢', '🔵', '🟡'][k]).join('') : null });
    };
    const die = () => {
      over = true; sfx.boom(); vibrate([80, 40, 150]); ctx.shake(10);
      ctx.timeout(() => ctx.end({
        score, display: `${score} pts`, emoji: '🐍', board: mode === 'classic' ? null : mode,
        title: score >= 1500 ? 'Serpent légendaire' : score >= 700 ? 'Beau reptile' : 'Ssssi court…',
        label: `${fusions} fusion${fusions > 1 ? 's' : ''} · longueur max ${maxLen}`,
        feats: [fusions >= 5 && 'fusion', fusedColors.size >= 4 && 'arcenciel', maxLen >= 25 && 'long'].filter(Boolean),
      }), 900);
    };
    let last = performance.now();
    const frame = (now) => {
      if (!ctx.alive) return;
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (!over) { tick += dt; while (tick >= step) { tick -= step; advance(); if (over) break; } }
      fx.forEach((p) => { p.x += p.vx * dt; p.y += p.vy * dt; p.t -= dt; }); fx = fx.filter((p) => p.t > 0);
      draw(); requestAnimationFrame(frame);
    };
    function draw() {
      const { c, ox, oy } = geo();
      g.clearRect(0, 0, view.w, view.h);
      g.fillStyle = 'rgba(255,255,255,.04)'; g.beginPath(); g.roundRect(ox - 6, oy - 6, c * N + 12, c * N + 12, 14); g.fill();
      g.strokeStyle = wrap ? 'rgba(179,136,255,.35)' : 'rgba(255,92,122,.5)'; g.lineWidth = 2; g.setLineDash(wrap ? [6, 6] : []); g.stroke(); g.setLineDash([]);
      for (const w of walls) { g.fillStyle = '#3a3f6b'; g.beginPath(); g.roundRect(ox + w.x * c + 1, oy + w.y * c + 1, c - 2, c - 2, 4); g.fill(); }
      const t = performance.now() / 300;
      for (const f of food) {
        const cx = ox + f.x * c + c / 2, cy = oy + f.y * c + c / 2, r = c * 0.36 * (1 + Math.sin(t + f.x) * 0.08);
        if (f.c === 'joker') { const gr = g.createConicGradient(t, cx, cy); COLS.forEach((cc, i) => gr.addColorStop(i / 4, cc)); gr.addColorStop(1, COLS[0]); g.fillStyle = gr; } else g.fillStyle = COLS[f.c];
        g.shadowColor = f.c === 'joker' ? '#fff' : COLS[f.c]; g.shadowBlur = 14; g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fill(); g.shadowBlur = 0;
      }
      snake.forEach((s, i) => {
        g.fillStyle = i === 0 ? '#ffffff' : s.c === '#fff' ? '#c9c4ff' : s.c;
        const p = i === 0 ? 0 : c * 0.08;
        g.beginPath(); g.roundRect(ox + s.x * c + p, oy + s.y * c + p, c - p * 2, c - p * 2, c * 0.3); g.fill();
        if (i === 0) { g.fillStyle = '#1b1450'; const ex = dir[0] * c * 0.15, ey = dir[1] * c * 0.15; [[-1, 1], [1, -1]].forEach(([a, b]) => { g.beginPath(); g.arc(ox + s.x * c + c / 2 + ex + (dir[1] ? a * c * 0.18 : 0), oy + s.y * c + c / 2 + ey + (dir[0] ? b * c * 0.18 : 0), c * 0.08, 0, 7); g.fill(); }); }
      });
      for (const p of fx) { g.globalAlpha = p.t / 0.6; g.fillStyle = p.c; g.beginPath(); g.arc(ox + p.x * c, oy + p.y * c, c * 0.15, 0, 7); g.fill(); } g.globalAlpha = 1;
    }
    ctx.countdown().then(() => { last = performance.now(); requestAnimationFrame(frame); });
    draw();
  },
};
