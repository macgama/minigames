import { h } from '../core/dom.js';
import { createCanvas, loop } from '../core/canvas.js';
import { sfx, vibrate } from '../core/sfx.js';

const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]]; // haut, droite, bas, gauche
const COLORS = ['#4cc9f0', '#ff3d5a', '#3ddc97', '#ffc857'];
const NAMES = ['Toi', 'Rouge', 'Vert', 'Jaune'];

export default {
  async start(ctx) {
    const duo = ctx.mode === 'duo';
    const view = createCanvas(ctx.stage, { onResize: () => draw() });
    ctx.onCleanup(view.destroy);
    const { g } = view;
    const cell = Math.max(9, Math.floor(Math.min(view.w, view.h) / 42));
    const cols = Math.floor(view.w / cell), rows = Math.floor(view.h / cell);
    const grid = new Uint8Array(cols * rows); // 0 libre, sinon id+1
    const idx = (x, y) => y * cols + x;
    const free = (x, y) => x >= 0 && y >= 0 && x < cols && y < rows && !grid[idx(x, y)];
    const starts = [[0.2, 0.5, 1], [0.8, 0.5, 3], [0.5, 0.2, 2], [0.5, 0.8, 0]];
    const n = duo ? 2 : 4;
    const bikes = Array.from({ length: n }, (_, i) => {
      const [fx, fy, d] = starts[i];
      return { id: i, x: Math.floor(cols * fx), y: Math.floor(rows * fy), d, nd: d, alive: true, human: i === 0 || (duo && i === 1), color: COLORS[i], name: duo ? `Joueur ${i + 1}` : NAMES[i], trail: [], diedAt: 0 };
    });
    bikes.forEach((b) => { grid[idx(b.x, b.y)] = b.id + 1; b.trail.push([b.x, b.y]); });
    let t = 0, step = 0;
    ctx.hud({ time: '0,0 s', alive: `${n} en vie` });

    // Commandes
    const turn = (b, dir) => { if (!b.alive) return; if ((dir + 2) % 4 !== b.d) b.nd = dir; };
    const rel = (b, s) => turn(b, (b.d + s + 4) % 4);
    const keys = { ArrowUp: [0, 0], ArrowRight: [0, 1], ArrowDown: [0, 2], ArrowLeft: [0, 3], KeyW: [0, 0], KeyD: [0, 1], KeyS: [0, 2], KeyA: [0, 3] };
    if (duo) Object.assign(keys, { ArrowUp: [1, 0], ArrowRight: [1, 1], ArrowDown: [1, 2], ArrowLeft: [1, 3] });
    ctx.on(window, 'keydown', (e) => { const k = keys[e.code]; if (k) { e.preventDefault(); turn(bikes[k[0]], k[1]); } });
    if (!duo) {
      let sx = 0, sy = 0, down = false;
      ctx.on(view.canvas, 'pointerdown', (e) => { down = true; sx = e.clientX; sy = e.clientY; });
      ctx.on(view.canvas, 'pointermove', (e) => {
        if (!down) return; const dx = e.clientX - sx, dy = e.clientY - sy;
        if (Math.hypot(dx, dy) > 24) { turn(bikes[0], Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0)); sx = e.clientX; sy = e.clientY; }
      });
      ctx.on(window, 'pointerup', () => (down = false));
    } else {
      // Boutons tactiles relatifs : J1 en bas, J2 en haut (retourné)
      const pad = (b, top) => h('div', { style: { position: 'absolute', left: 0, right: 0, [top ? 'top' : 'bottom']: '10px', display: 'flex', justifyContent: 'space-between', padding: '0 10px', transform: top ? 'rotate(180deg)' : '', zIndex: 3, pointerEvents: 'none' } },
        ...[['↺', -1], ['↻', 1]].map(([s, v]) => h('button.btn', { style: { width: '72px', height: '72px', fontSize: '28px', borderColor: b.color, color: b.color, background: 'rgba(0,0,0,.45)', pointerEvents: 'auto' }, onpointerdown: (e) => { e.preventDefault(); rel(b, v); } }, s)));
      ctx.stage.append(pad(bikes[0], false), pad(bikes[1], true));
    }

    // IA : choisit la direction qui laisse le plus d'espace (remplissage limité)
    const space = (x, y, limit = 120) => {
      if (!free(x, y)) return 0;
      const seen = new Set([idx(x, y)]); const q = [[x, y]]; let c = 0;
      while (q.length && c < limit) { const [cx, cy] = q.shift(); c++; for (const [dx, dy] of DIRS) { const nx = cx + dx, ny = cy + dy, k = idx(nx, ny); if (free(nx, ny) && !seen.has(k)) { seen.add(k); q.push([nx, ny]); } } }
      return c;
    };
    const think = (b) => {
      let best = b.d, bestScore = -1;
      for (const s of [0, -1, 1]) {
        const d = (b.d + s + 4) % 4; const [dx, dy] = DIRS[d];
        let sc = space(b.x + dx, b.y + dy) + (s === 0 ? 3 : 0) + Math.random() * 6;
        if (sc > bestScore) { bestScore = sc; best = d; }
      }
      if (Math.random() < 0.03) { const d = (b.d + (Math.random() < 0.5 ? 1 : 3)) % 4; const [dx, dy] = DIRS[d]; if (space(b.x + dx, b.y + dy) > 40) best = d; }
      b.nd = best;
    };

    // Rendu
    const draw = () => {
      if (!g) return;
      const ox = (view.w - cols * cell) / 2, oy = (view.h - rows * cell) / 2;
      g.clearRect(0, 0, view.w, view.h);
      g.fillStyle = 'rgba(255,255,255,0.035)';
      for (let x = 0; x <= cols; x += 2) g.fillRect(ox + x * cell, oy, 1, rows * cell);
      for (let y = 0; y <= rows; y += 2) g.fillRect(ox, oy + y * cell, cols * cell, 1);
      g.strokeStyle = 'rgba(255,255,255,.15)'; g.lineWidth = 2; g.strokeRect(ox, oy, cols * cell, rows * cell);
      g.lineCap = 'round'; g.lineJoin = 'round';
      for (const b of bikes) {
        g.strokeStyle = b.color; g.globalAlpha = b.alive ? 1 : 0.35; g.lineWidth = cell * 0.55;
        g.shadowColor = b.color; g.shadowBlur = b.alive ? 14 : 0;
        g.beginPath(); b.trail.forEach(([x, y], i) => { const px = ox + (x + 0.5) * cell, py = oy + (y + 0.5) * cell; i ? g.lineTo(px, py) : g.moveTo(px, py); }); g.stroke();
        if (b.alive) { g.fillStyle = '#fff'; g.beginPath(); g.arc(ox + (b.x + 0.5) * cell, oy + (b.y + 0.5) * cell, cell * 0.55, 0, 7); g.fill(); }
        g.shadowBlur = 0; g.globalAlpha = 1;
      }
    };
    draw();
    await ctx.countdown();
    if (!ctx.alive) return;

    let acc = 0; const STEP = 0.07;
    const stop = loop((dt) => {
      t += dt; acc += dt;
      while (acc >= STEP) { acc -= STEP; tick(); }
      draw();
      ctx.hud({ time: t.toFixed(1).replace('.', ',') + ' s' });
    });
    ctx.onCleanup(stop);

    function tick() {
      step++;
      const live = bikes.filter((b) => b.alive);
      live.forEach((b) => { if (!b.human) think(b); b.d = b.nd; });
      const next = live.map((b) => [b, b.x + DIRS[b.d][0], b.y + DIRS[b.d][1]]);
      for (const [b, nx, ny] of next) {
        const headOn = next.some(([o, ox2, oy2]) => o !== b && ox2 === nx && oy2 === ny);
        if (!free(nx, ny) || headOn) { b.alive = false; b.diedAt = t; if (b.id === 0 || b.human) { sfx.boom(); vibrate(80); } else sfx.bad(); }
      }
      for (const [b, nx, ny] of next) if (b.alive) { b.x = nx; b.y = ny; grid[idx(nx, ny)] = b.id + 1; b.trail.push([nx, ny]); }
      const still = bikes.filter((b) => b.alive);
      ctx.hud({ alive: `${still.length} en vie` });
      const meDead = !bikes[0].alive && !duo;
      if (still.length <= 1 || meDead) { stop(); ctx.timeout(() => finish(still[0]), 700); }
    }

    function finish(winner) {
      if (duo) {
        return ctx.end({ title: winner ? `${winner.name} gagne !` : 'Égalité !', emoji: winner ? '🏆' : '🤝', display: winner ? (winner.id === 0 ? 'Bleu' : 'Rouge') : '=', label: `Partie de ${t.toFixed(1).replace('.', ',')} s`, win: true });
      }
      const me = bikes[0];
      const rank = 1 + bikes.filter((b) => b !== me && (b.alive || b.diedAt > me.diedAt)).length;
      const secs = me.alive ? t : me.diedAt;
      const score = Math.round(secs * 10) + (rank === 1 ? 300 : 0);
      ctx.end({
        score, display: `${score} pts`, emoji: rank === 1 ? '🏆' : '💥', win: rank === 1,
        title: rank === 1 ? 'Dernier en lice !' : `Mur percuté · ${rank}e place`, label: `Survie : ${secs.toFixed(1).replace('.', ',')} s · score ${score}`,
        share: `🏍️ Ligne Rouge : ${rank === 1 ? 'victoire' : rank + 'e place'} après ${secs.toFixed(1)} s. À toi !`,
      });
    }
  },
};
