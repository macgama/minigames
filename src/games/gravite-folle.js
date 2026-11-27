import { h } from '../core/dom.js';
import { createCanvas, loop, clamp } from '../core/canvas.js';
import { sfx, vibrate } from '../core/sfx.js';
import { makeRng } from '../core/rng.js';
import { store } from '../core/store.js';

const N = 8, R = 0.27, G = 22;
function maze(seed) {
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
  return segs;
}

export default {
  start(ctx) {
    const SEED = 'gravite-folle-v1';
    const segs = maze(SEED);
    const view = createCanvas(ctx.stage); ctx.onCleanup(view.destroy);
    const { g } = view;
    const ball = { x: 0.5, y: 0.5, vx: 0, vy: 0 };
    const goal = { x: N - 0.5, y: N - 0.5 };
    let theta = 0, omega = 0, t = 0, started = false, done = false, tilt = null;
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
        ctx.hud({ time: t.toFixed(1).replace('.', ',') + ' s', ghost: ghost ? `👻 ${ghost.time.toFixed(1).replace('.', ',')} s` : null });
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
      ctx.timeout(() => ctx.end({ score: Math.round(t * 100), lowerIsBetter: true, display: `${t.toFixed(2).replace('.', ',')} s`, emoji: '⭐', win: beat, title: beat && prev ? 'Fantôme battu !' : 'Sortie trouvée !', label: prev ? (beat ? `Ancien fantôme : ${prev.toFixed(2).replace('.', ',')} s` : `Le fantôme reste devant (${prev.toFixed(2).replace('.', ',')} s)`) : 'Ton parcours devient ton fantôme', share: `🌀 Gravité Folle : sortie en ${t.toFixed(2)} s. Bats mon fantôme !` }), 400);
    }
  },
};
