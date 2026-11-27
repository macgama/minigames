import { createCanvas, loop, clamp } from '../core/canvas.js';
import { sfx, vibrate } from '../core/sfx.js';
import { rng } from '../core/rng.js';

const W = 2400, H = 2400, DURATION = 120;
const PAL = ['#4cc9f0', '#ff5c7a', '#3ddc97', '#ffc857', '#b388ff', '#ff9f43', '#00d1b2', '#f72585'];
const BOTN = ['Hexa', 'Tri', 'Carré', 'Penta', 'Losange', 'Octo', 'Prisme', 'Cube', 'Delta', 'Sigma', 'Pixel'];
const rad = (m) => Math.sqrt(m) * 4;

export default {
  start(ctx) {
    const view = createCanvas(ctx.stage); ctx.onCleanup(view.destroy);
    const { g } = view;
    const mk = (name, mass, color, sides, bot = true) => ({ name, mass, color, sides, bot, x: rng.float(100, W - 100), y: rng.float(100, H - 100), vx: 0, vy: 0, rot: rng.float(0, 6), tx: 0, ty: 0, alive: true });
    const me = mk('Toi', 20, '#ffffff', 6, false); me.x = W / 2; me.y = H / 2;
    const bots = BOTN.map((n, i) => mk(n, rng.float(12, 70), PAL[i % PAL.length], 3 + (i % 5)));
    const food = Array.from({ length: 260 }, () => ({ x: rng.float(0, W), y: rng.float(0, H), m: rng.float(1, 2.6), c: rng.pick(PAL), s: rng.int(3, 6), r: rng.float(0, 6) }));
    let pointer = null, t = 0, peak = me.mass, cam = { x: me.x, y: me.y, z: 1 };
    const keys = new Set();
    ctx.on(view.canvas, 'pointerdown', (e) => (pointer = view.pos(e)));
    ctx.on(view.canvas, 'pointermove', (e) => { if (e.pointerType === 'mouse' || e.buttons) pointer = view.pos(e); });
    ctx.on(window, 'keydown', (e) => keys.add(e.code)); ctx.on(window, 'keyup', (e) => keys.delete(e.code));

    const poly = (x, y, r, sides, rot) => { g.beginPath(); for (let i = 0; i <= sides; i++) { const a = rot + (i / sides) * Math.PI * 2; i ? g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r) : g.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } g.closePath(); };
    const all = () => [me, ...bots].filter((b) => b.alive);
    const speed = (b) => 260 / Math.pow(b.mass, 0.22);

    const stop = loop((dt) => {
      t += dt;
      // Joueur
      let dx = 0, dy = 0;
      if (keys.size) { dx = (keys.has('ArrowRight') || keys.has('KeyD')) - (keys.has('ArrowLeft') || keys.has('KeyA')); dy = (keys.has('ArrowDown') || keys.has('KeyS')) - (keys.has('ArrowUp') || keys.has('KeyW')); }
      else if (pointer) { dx = (pointer.x - view.w / 2) / cam.z; dy = (pointer.y - view.h / 2) / cam.z; const d = Math.hypot(dx, dy); if (d < 8) dx = dy = 0; else { const k = Math.min(1, d / 120); dx = (dx / d) * k; dy = (dy / d) * k; } }
      const n = Math.hypot(dx, dy) || 1; if (Math.hypot(dx, dy) > 1) { dx /= n; dy /= n; }
      me.x += dx * speed(me) * dt; me.y += dy * speed(me) * dt;
      // Bots
      for (const b of bots) {
        if (!b.alive) continue;
        let goal = null, best = Infinity, danger = null, dd = Infinity;
        for (const o of all()) { if (o === b) continue; const d = Math.hypot(o.x - b.x, o.y - b.y); if (o.mass > b.mass * 1.15 && d < 260 + rad(o.mass) && d < dd) { danger = o; dd = d; } if (b.mass > o.mass * 1.15 && d < 400 && d < best) { goal = o; best = d; } }
        if (!goal) for (const f of food) { const d = Math.hypot(f.x - b.x, f.y - b.y); if (d < best) { best = d; goal = f; } }
        let ax = 0, ay = 0;
        if (danger) { ax = b.x - danger.x; ay = b.y - danger.y; } else if (goal) { ax = goal.x - b.x; ay = goal.y - b.y; }
        const l = Math.hypot(ax, ay) || 1; b.vx += ((ax / l) * speed(b) * 0.85 - b.vx) * dt * 3; b.vy += ((ay / l) * speed(b) * 0.85 - b.vy) * dt * 3;
        b.x += b.vx * dt; b.y += b.vy * dt;
      }
      for (const b of all()) { const r = rad(b.mass); b.x = clamp(b.x, r * 0.5, W - r * 0.5); b.y = clamp(b.y, r * 0.5, H - r * 0.5); b.rot += dt * 0.6; b.mass = Math.max(10, b.mass * (1 - dt * 0.002)); }
      // Nourriture
      for (const b of all()) { const r = rad(b.mass); for (const f of food) if (Math.abs(f.x - b.x) < r && Math.abs(f.y - b.y) < r && Math.hypot(f.x - b.x, f.y - b.y) < r) { b.mass += f.m; f.x = rng.float(0, W); f.y = rng.float(0, H); if (b === me) sfx.tick(); } }
      // Dévorer
      const live = all();
      for (const a of live) for (const b of live) {
        if (a === b || !a.alive || !b.alive || a.mass < b.mass * 1.15) continue;
        if (Math.hypot(a.x - b.x, a.y - b.y) < rad(a.mass) - rad(b.mass) * 0.4) {
          a.mass += b.mass * 0.85; b.alive = false;
          if (a === me) { sfx.ok(); vibrate(25); }
          if (b === me) { sfx.boom(); vibrate(150); }
          if (b.bot) ctx.timeout(() => { Object.assign(b, mk(b.name, rng.float(10, 30), b.color, b.sides)); }, 2500);
        }
      }
      peak = Math.max(peak, me.mass);
      // Caméra
      const targetZ = clamp(1.25 * Math.min(view.w, view.h) / 700 / Math.pow(rad(me.mass) / 18, 0.45), 0.25, 2);
      cam.x += (me.x - cam.x) * Math.min(1, dt * 8); cam.y += (me.y - cam.y) * Math.min(1, dt * 8); cam.z += (targetZ - cam.z) * Math.min(1, dt * 2);
      draw();
      const left = Math.max(0, DURATION - t);
      ctx.hud({ time: `${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, '0')}`, mass: `${Math.round(me.mass)} kg` });
      if (!me.alive || left <= 0) { stop(); ctx.timeout(finish, me.alive ? 200 : 900); }
    });
    ctx.onCleanup(stop);

    function draw() {
      g.fillStyle = '#0b0e20'; g.fillRect(0, 0, view.w, view.h);
      g.save(); g.translate(view.w / 2, view.h / 2); g.scale(cam.z, cam.z); g.translate(-cam.x, -cam.y);
      g.strokeStyle = 'rgba(255,255,255,.05)'; g.lineWidth = 1 / cam.z;
      for (let x = 0; x <= W; x += 60) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
      for (let y = 0; y <= H; y += 60) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
      g.strokeStyle = 'rgba(255,79,163,.6)'; g.lineWidth = 6; g.strokeRect(0, 0, W, H);
      for (const f of food) { g.fillStyle = f.c; poly(f.x, f.y, 5 + f.m * 2, f.s, f.r); g.fill(); }
      for (const b of all().sort((a, c) => a.mass - c.mass)) {
        const r = rad(b.mass);
        g.shadowColor = b.color; g.shadowBlur = 20; g.fillStyle = b === me ? '#ffffff' : b.color; poly(b.x, b.y, r, b.sides, b.rot); g.fill(); g.shadowBlur = 0;
        g.lineWidth = Math.max(2, r * 0.08); g.strokeStyle = b === me ? '#7c5cff' : 'rgba(0,0,0,.25)'; g.stroke();
        g.fillStyle = b === me ? '#1b1450' : 'rgba(0,0,0,.65)'; g.font = `700 ${Math.max(12, r * 0.38)}px Outfit Variable, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(b.name, b.x, b.y);
        if (b !== me && b.mass > me.mass * 1.15) { g.strokeStyle = 'rgba(255,92,122,.8)'; g.lineWidth = 3 / cam.z; g.setLineDash([8, 6]); g.beginPath(); g.arc(b.x, b.y, r + 8, 0, 7); g.stroke(); g.setLineDash([]); }
      }
      g.restore();
      // Classement
      const top = all().sort((a, b) => b.mass - a.mass).slice(0, 5);
      g.font = '600 13px Outfit Variable, sans-serif'; g.textAlign = 'left'; g.textBaseline = 'top';
      g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.roundRect(12, 12, 150, 24 + top.length * 20, 12); g.fill();
      g.fillStyle = '#b6b9d6'; g.fillText('CLASSEMENT', 24, 20);
      top.forEach((b, i) => { g.fillStyle = b === me ? '#ffb547' : '#fff'; g.fillText(`${i + 1}. ${b.name}`, 24, 40 + i * 20); g.textAlign = 'right'; g.fillText(Math.round(b.mass), 150, 40 + i * 20); g.textAlign = 'left'; });
    }
    function finish() {
      const score = Math.round(me.alive ? me.mass : peak);
      ctx.end({ score, display: `${score} kg`, emoji: me.alive ? '🔷' : '💀', win: me.alive && all().every((b) => b === me || b.mass < me.mass), title: me.alive ? 'Temps écoulé !' : 'Dévoré !', label: me.alive ? `Masse finale (record de la partie : ${Math.round(peak)} kg)` : `Ta masse maximale avant d’être avalé`, share: `🔷 Glouton Géométrique : ${score} kg. Qui est le plus gros ?` });
    }
  },
};
