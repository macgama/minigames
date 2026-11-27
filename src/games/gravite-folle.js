import { h } from '../core/dom.js';
import { createCanvas, loop, clamp } from '../core/canvas.js';
import { sfx, vibrate } from '../core/sfx.js';
import { makeRng, todayKey } from '../core/rng.js';
import { store } from '../core/store.js';

const R = 0.27, G = 22, LEVELS = 10;
function maze(seed, N) {
  const r = makeRng(seed);
  // murs[y][x] = {t, r, b, l}
  const cells = Array.from({ length: N }, () => Array.from({ length: N }, () => ({ t: 1, r: 1, b: 1, l: 1, v: 0 })));
  const stack = [[0, 0]]; cells[0][0].v = 1;
  while (stack.length) {
    const [x, y] = stack[stack.length - 1];
    const nb = [[0, -1, 't', 'b'], [1, 0, 'r', 'l'], [0, 1, 'b', 't'], [-1, 0, 'l', 'r']].filter(([dx, dy]) => cells[y + dy]?.[x + dx] && !cells[y + dy][x + dx].v);
    if (!nb.length) { stack.pop(); continue; }
    const [dx, dy, a, b] = r.pick(nb); cells[y][x][a] = 0; cells[y + dy][x + dx][b] = 0; cells[y + dy][x + dx].v = 1; stack.push([x + dx, y + dy]);
  }
  const segs = [];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const c = cells[y][x]; if (c.t) segs.push([x, y, x + 1, y]); if (c.l) segs.push([x, y, x, y + 1]); if (x === N - 1 && c.r) segs.push([x + 1, y, x + 1, y + 1]); if (y === N - 1 && c.b) segs.push([x, y + 1, x + 1, y + 1]); }
  // Plus court chemin (BFS) de l'entrée à la sortie : sert au temps de référence et à placer trous et gemmes.
  const key = (x, y) => y * N + x, prev = new Map([[0, -1]]), q = [[0, 0]], dist = { 0: 0 };
  const open = (x, y) => [[0, -1, 't'], [1, 0, 'r'], [0, 1, 'b'], [-1, 0, 'l']].filter(([, , w]) => !cells[y][x][w]).map(([dx, dy]) => [x + dx, y + dy]);
  while (q.length) { const [x, y] = q.shift(); for (const [nx, ny] of open(x, y)) if (!prev.has(key(nx, ny))) { prev.set(key(nx, ny), key(x, y)); dist[key(nx, ny)] = dist[key(x, y)] + 1; q.push([nx, ny]); } }
  const sol = new Set(); for (let k = key(N - 1, N - 1); k !== -1; k = prev.get(k)) sol.add(k);
  const off = []; for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (!sol.has(key(x, y)) && x + y > 1) off.push([x, y, open(x, y).length]);
  // Gemmes dans les culs-de-sac les plus éloignés, trous sur d'autres cases hors du chemin
  const deadEnds = r.shuffle(off.filter((c) => c[2] === 1));
  const gems = deadEnds.slice(0, 3).map(([x, y]) => ({ x: x + 0.5, y: y + 0.5, got: false }));
  const rest = r.shuffle(off.filter((c) => !gems.some((g) => g.x === c[0] + 0.5 && g.y === c[1] + 0.5)));
  return { segs, sol: sol.size, gems, holeCells: rest };
}

export default {
  start(ctx) {
    const daily = ctx.mode === 'jour';
    const prog = store.get('gravite:prog', {}); // niveau -> { stars, time }
    if (daily) return play(ctx, { k: 0, N: 9, seed: 'gravite-jour-' + todayKey(), holes: 3, daily: true });
    // Sélecteur de niveau
    const unlocked = (k) => k === 1 || !!prog[k - 1];
    const total = Object.values(prog).reduce((a, p) => a + p.stars, 0);
    const grid = h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: '10px', width: 'min(92vw,440px)' } },
      Array.from({ length: LEVELS }, (_, i) => { const k = i + 1, p = prog[k];
        return h('button.btn', { disabled: !unlocked(k), style: { flexDirection: 'column', height: '78px', padding: '6px', gap: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center' }, onclick: () => { wrap.remove(); play(ctx, { k, N: 5 + Math.floor((k - 1) / 2), seed: 'gravite-folle-' + k, holes: k >= 4 ? Math.min(5, k - 3) : 0 }); } },
          h('b', { style: { fontSize: '22px' } }, unlocked(k) ? String(k) : '🔒'), h('small', { style: { fontSize: '12px', letterSpacing: '1px' } }, p ? '⭐'.repeat(p.stars) + '☆'.repeat(3 - p.stars) : unlocked(k) ? 'nouveau' : ''));
      }));
    const wrap = h('div.center-stage', { style: { gap: '14px' } }, h('div.big-msg', { style: { fontSize: '26px' } }, 'Choisis un niveau'), h('p.muted', `${total}/${LEVELS * 3} ⭐ · ⭐ sortie, ⭐ les 3 gemmes 💎, ⭐ temps record`), grid);
    ctx.stage.append(wrap);
  },
};

function play(ctx, L) {
  {
    const N = L.N, SEED = L.seed;
    const { segs, sol, gems, holeCells } = maze(SEED, N);
    const holes = holeCells.slice(0, L.holes).map(([x, y]) => ({ x: x + 0.5, y: y + 0.5 }));
    const par = Math.round(sol * 0.75 + 3);
    ctx.hud({ lvl: L.daily ? 'Labyrinthe du jour' : `Niveau ${L.k}`, gems: '💎 0/3' });
    const view = createCanvas(ctx.stage); ctx.onCleanup(view.destroy);
    const { g } = view;
    const ball = { x: 0.5, y: 0.5, vx: 0, vy: 0 };
    const goal = { x: N - 0.5, y: N - 0.5 };
    let theta = 0, omega = 0, t = 0, started = false, done = false, tilt = null, falls = 0;
    const ghost = store.get('ghost:' + SEED); // { time, path: [[x,y],...] } à 30 Hz
    const path = []; let rec = 0;
    const keys = new Set();
    ctx.on(window, 'keydown', (e) => { keys.add(e.code); if (e.code.startsWith('Arrow')) e.preventDefault(); });
    ctx.on(window, 'keyup', (e) => keys.delete(e.code));
    let dragX = null;
    ctx.on(view.canvas, 'pointerdown', (e) => { dragX = e.clientX; view.canvas.setPointerCapture(e.pointerId); });
    ctx.on(view.canvas, 'pointermove', (e) => { if (dragX == null) return; theta += (e.clientX - dragX) * 0.012; dragX = e.clientX; started = true; });
    ctx.on(view.canvas, 'pointerup', () => (dragX = null));
    const onOrient = (e) => { if (e.gamma != null) { tilt = clamp(e.gamma, -90, 90) * Math.PI / 180 * 1.6; started = true; } };
    const hold = (dir) => h('button.btn', { style: { width: '64px', height: '64px', fontSize: '26px', pointerEvents: 'auto' }, 'aria-label': dir < 0 ? 'Tourner à gauche' : 'Tourner à droite',
      onpointerdown: (e) => { e.preventDefault(); omega = dir * 2.6; started = true; }, onpointerup: () => (omega = 0), onpointerleave: () => (omega = 0) }, dir < 0 ? '↺' : '↻');
    const tiltBtn = h('button.btn.btn-sm', { style: { pointerEvents: 'auto' }, onclick: async () => {
      try { if (typeof DeviceOrientationEvent?.requestPermission === 'function') { const p = await DeviceOrientationEvent.requestPermission(); if (p !== 'granted') return; } ctx.on(window, 'deviceorientation', onOrient); tiltBtn.textContent = '📱 Inclinaison active'; } catch { tiltBtn.textContent = 'Inclinaison indisponible'; }
    } }, '📱 Inclinaison');
    ctx.stage.append(h('div', { style: { position: 'absolute', left: 0, right: 0, bottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 14px', zIndex: 3, pointerEvents: 'none' } }, hold(-1), 'DeviceOrientationEvent' in window ? tiltBtn : h('span.faint', 'Glisse ou ← →'), hold(1)));

    const collide = () => {
      for (const [x1, y1, x2, y2] of segs) {
        const dx = x2 - x1, dy = y2 - y1; const u = clamp(((ball.x - x1) * dx + (ball.y - y1) * dy) / (dx * dx + dy * dy), 0, 1);
        const px = x1 + u * dx, py = y1 + u * dy; let nx = ball.x - px, ny = ball.y - py; const d = Math.hypot(nx, ny);
        if (d < R && d > 1e-6) { nx /= d; ny /= d; ball.x = px + nx * R; ball.y = py + ny * R; const vn = ball.vx * nx + ball.vy * ny; if (vn < 0) { ball.vx -= 1.35 * vn * nx; ball.vy -= 1.35 * vn * ny; if (vn < -3) sfx.tick(); } }
      }
    };
    const stop = loop((dt) => {
      if (keys.has('ArrowLeft') || keys.has('KeyA')) { theta -= 2.6 * dt; started = true; }
      if (keys.has('ArrowRight') || keys.has('KeyD')) { theta += 2.6 * dt; started = true; }
      theta += omega * dt;
      if (tilt != null) theta += (tilt - theta) * Math.min(1, dt * 8);
      if (started && !done) {
        t += dt;
        const gx = -Math.sin(theta) * G, gy = Math.cos(theta) * G; // gravité dans le repère du labyrinthe
        const sub = 5;
        for (let i = 0; i < sub; i++) {
          ball.vx += gx * dt / sub; ball.vy += gy * dt / sub; const sp = Math.hypot(ball.vx, ball.vy); if (sp > 9) { ball.vx *= 9 / sp; ball.vy *= 9 / sp; }
          ball.vx *= 0.995; ball.vy *= 0.995;
          ball.x += ball.vx * dt / sub; ball.y += ball.vy * dt / sub; collide();
        }
        rec += dt; while (rec >= 1 / 30) { rec -= 1 / 30; path.push([+ball.x.toFixed(3), +ball.y.toFixed(3)]); }
        ctx.hud({ time: t.toFixed(1).replace('.', ',') + ' s', par: t < par ? `⏱️ ${par} s` : null, ghost: ghost ? `👻 ${ghost.time.toFixed(1).replace('.', ',')} s` : null });
        for (const gm of gems) if (!gm.got && Math.hypot(ball.x - gm.x, ball.y - gm.y) < 0.38) { gm.got = true; sfx.ok(); vibrate(15); const n = gems.filter((q) => q.got).length; ctx.hud({ gems: `💎 ${n}/3` }); ctx.pop(n === 3 ? '💎 Toutes les gemmes !' : '💎', view.w / 2, 70, '#4cc9f0', 26); }
        for (const ho of holes) if (Math.hypot(ball.x - ho.x, ball.y - ho.y) < 0.24) { ball.x = 0.5; ball.y = 0.5; ball.vx = ball.vy = 0; falls++; sfx.boom(); vibrate(80); ctx.shake(6); ctx.pop('Trou ! Retour au départ', view.w / 2, 70, '#ff5c7a', 22); }
        if (Math.hypot(ball.x - goal.x, ball.y - goal.y) < 0.4) win();
      }
      draw();
    });
    ctx.onCleanup(stop);

    function draw() {
      const size = Math.min(view.w, view.h - 90) * 0.68, cs = size / N;
      g.clearRect(0, 0, view.w, view.h);
      g.save(); g.translate(view.w / 2, (view.h - 70) / 2); g.rotate(-theta); g.translate(-size / 2, -size / 2);
      g.fillStyle = 'rgba(0,209,178,.07)'; g.beginPath(); g.roundRect(-14, -14, size + 28, size + 28, 22); g.fill();
      g.strokeStyle = '#5ff2dc'; g.lineWidth = Math.max(3, cs * 0.12); g.lineCap = 'round'; g.shadowColor = '#00d1b2'; g.shadowBlur = 14;
      g.beginPath(); for (const [x1, y1, x2, y2] of segs) { g.moveTo(x1 * cs, y1 * cs); g.lineTo(x2 * cs, y2 * cs); } g.stroke(); g.shadowBlur = 0;
      g.font = `${cs * 0.7}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.save(); g.translate(goal.x * cs, goal.y * cs); g.rotate(theta); g.shadowColor = '#ffd23f'; g.shadowBlur = 24; g.fillStyle = '#ffd23f'; g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = (i % 2 ? 0.16 : 0.36) * cs; g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } g.closePath(); g.fill(); g.shadowBlur = 0; g.restore();
      for (const ho of holes) { const gr = g.createRadialGradient(ho.x * cs, ho.y * cs, 1, ho.x * cs, ho.y * cs, cs * 0.32); gr.addColorStop(0, '#000'); gr.addColorStop(1, 'rgba(255,61,90,.35)'); g.fillStyle = gr; g.beginPath(); g.arc(ho.x * cs, ho.y * cs, cs * 0.3, 0, 7); g.fill(); }
      for (const gm of gems) if (!gm.got) { g.save(); g.translate(gm.x * cs, gm.y * cs); g.rotate(theta); g.font = `${cs * 0.5}px sans-serif`; g.fillText('💎', 0, 0); g.restore(); }
      if (ghost && started) { const k = Math.min(ghost.path.length - 1, Math.floor(t * 30)); const [gx, gy] = ghost.path[k]; g.globalAlpha = 0.4; g.fillStyle = '#b388ff'; g.beginPath(); g.arc(gx * cs, gy * cs, R * cs, 0, 7); g.fill(); g.globalAlpha = 1; }
      const grd = g.createRadialGradient(ball.x * cs - R * cs * 0.3, ball.y * cs - R * cs * 0.3, 1, ball.x * cs, ball.y * cs, R * cs);
      grd.addColorStop(0, '#fff'); grd.addColorStop(1, '#ff4fa3'); g.fillStyle = grd; g.shadowColor = '#ff4fa3'; g.shadowBlur = 18;
      g.beginPath(); g.arc(ball.x * cs, ball.y * cs, R * cs, 0, 7); g.fill(); g.shadowBlur = 0;
      g.restore();
      if (!started) { g.fillStyle = 'rgba(255,255,255,.7)'; g.font = '600 16px Outfit Variable, sans-serif'; g.textAlign = 'center'; g.fillText('Tourne le labyrinthe pour commencer', view.w / 2, 28); }
    }
    function win() {
      done = true; vibrate([30, 30, 60]);
      const prev = ghost?.time; const beat = !prev || t < prev;
      if (beat) store.set('ghost:' + SEED, { time: t, path });
      const nGems = gems.filter((q) => q.got).length;
      const stars = 1 + (nGems === 3 ? 1 : 0) + (t < par ? 1 : 0);
      const T = `${t.toFixed(2).replace('.', ',')} s`;
      if (L.daily) return ctx.timeout(() => ctx.end({ score: Math.round(t * 100), lowerIsBetter: true, board: 'jour', display: T, emoji: '🌀', win: beat, title: 'Labyrinthe du jour réussi !', label: `${nGems}/3 💎 · ${falls} chute${falls > 1 ? 's' : ''} · même labyrinthe pour tous aujourd’hui`, feats: [nGems === 3 && falls === 0 && 'propre'].filter(Boolean) }), 400);
      const prog = store.get('gravite:prog', {}); const old = prog[L.k];
      prog[L.k] = { stars: Math.max(stars, old?.stars || 0), time: Math.min(t, old?.time ?? Infinity) }; store.set('gravite:prog', prog);
      const total = Object.values(prog).reduce((a, p) => a + p.stars, 0);
      ctx.timeout(() => ctx.end({
        score: total, display: `${total} ⭐`, emoji: '⭐', win: stars === 3 || beat,
        title: `Niveau ${L.k} : ${'⭐'.repeat(stars)}${'☆'.repeat(3 - stars)}`,
        label: `${T} (référence ${par} s) · ${nGems}/3 💎${falls ? ` · ${falls} chute${falls > 1 ? 's' : ''}` : ''}${prev ? (beat ? ' · fantôme battu !' : ` · fantôme ${prev.toFixed(2).replace('.', ',')} s`) : ''} · total ${total}/${LEVELS * 3} ⭐`,
        feats: [stars === 3 && 'trois', total >= LEVELS * 3 && 'tout', L.k === LEVELS && 'dernier', nGems === 3 && falls === 0 && L.holes > 0 && 'propre'].filter(Boolean),
        challenge: false,
      }), 400);
    }
  }
}
