import { h } from '../core/dom.js';
import { createCanvas, loop } from '../core/canvas.js';
import { sfx, vibrate, tone } from '../core/sfx.js';
import { makeRng, todayKey } from '../core/rng.js';

const WW = 300, WH = 420, THRUST = 24;
const MISSIONS = [
  { name: 'La Lune', g: 1.62, fuel: 10, pad: 60, rough: 30, sky: ['#05060f', '#1b1f3a'], ground: '#9a9aa6' },
  { name: 'Mars', g: 3.7, fuel: 12, pad: 50, rough: 50, sky: ['#2a0f0a', '#a8502c'], ground: '#b5532b', wind: 1.2 },
  { name: 'Mercure', g: 3.7, fuel: 10, pad: 36, rough: 70, sky: ['#08070a', '#3b3030'], ground: '#7d6e66' },
  { name: 'Titan', g: 1.35, fuel: 8, pad: 34, rough: 60, sky: ['#3a2a05', '#c79a3c'], ground: '#7a5a22', wind: 2.5 },
  { name: 'La Terre', g: 9.8, fuel: 14, pad: 44, rough: 45, sky: ['#2a6fdb', '#8ec5ff'], ground: '#3f7a4a', wind: 1.5 },
  { name: 'Io (Jupiter)', g: 1.8, fuel: 9, pad: 32, rough: 80, sky: ['#120a00', '#5a3a10'], ground: '#d9c24a', move: 22 },
];

export default {
  start(ctx) {
    const mode = ctx.mode || 'missions';
    const R = mode === 'jour' ? makeRng('fusee-' + todayKey()) : ctx.rng;
    const view = createCanvas(ctx.stage, { onResize: () => {} }); ctx.onCleanup(view.destroy);
    const { g } = view;
    const label = h('div', { style: { position: 'absolute', top: '8px', left: 0, right: 0, textAlign: 'center', zIndex: 3, pointerEvents: 'none', fontWeight: 800 } });
    const next = h('button.btn.btn-primary.btn-lg', { style: { position: 'absolute', bottom: '18px', left: '50%', transform: 'translateX(-50%)', zIndex: 3, display: 'none' } });
    ctx.stage.append(label, next);
    let mi = 0, M, ship, terrain, pad, phase = 'fly', total = 0, ok = 0, plume = false, eco = false, finger = null, thrusting = false, parts = [], t = 0, msg = '', windNow = 0;
    const geo = () => { const s = Math.min(view.w / WW, (view.h - 60) / WH); return { s, ox: (view.w - WW * s) / 2, oy: 50 + (view.h - 60 - WH * s) / 2 }; };
    const toW = (p) => { const { s, ox, oy } = geo(); return { x: (p.x - ox) / s, y: WH - (p.y - oy) / s }; };
    const groundAt = (x) => { if (x >= pad.x && x <= pad.x + pad.w) return pad.y; const i = Math.max(0, Math.min(terrain.length - 2, Math.floor(x / 10))); const k = (x - i * 10) / 10; return terrain[i] + (terrain[i + 1] - terrain[i]) * k; };
    const setup = () => {
      M = MISSIONS[mi];
      const pw = M.pad, px = R.float(30, WW - 30 - pw), py = R.float(30, 80);
      terrain = Array.from({ length: WW / 10 + 1 }, (_, i) => { const x = i * 10; return Math.max(8, py + R.float(-1, 1) * M.rough * 0.5 + Math.sin(x / 37 + R.float(0, 6)) * M.rough * 0.6 + (Math.abs(x - (px + pw / 2)) / WW) * M.rough * 1.2); });
      pad = { x: px, w: pw, y: py, vx: M.move ? M.move : 0 };
      ship = { x: R.float(40, WW - 40), y: WH - 30, vx: R.float(-6, 6), vy: 0, a: 0, fuel: M.fuel };
      phase = 'fly'; next.style.display = 'none'; parts = []; msg = '';
      label.replaceChildren(h('div.faint', { style: { fontSize: '12px', letterSpacing: '.1em' } }, `MISSION ${mi + 1}/6 · GRAVITÉ ${M.g.toString().replace('.', ',')} m/s²`), h('div', { style: { fontSize: '20px' } }, `🚀 ${M.name}${M.wind ? ' · 🌬️ vent' : ''}${M.move ? ' · plateforme mobile' : ''}`));
      ctx.hud({ pts: `${total} pts` });
    };
    ctx.on(view.canvas, 'pointerdown', (e) => { e.preventDefault(); finger = toW(view.pos(e)); thrusting = true; view.canvas.setPointerCapture?.(e.pointerId); });
    ctx.on(view.canvas, 'pointermove', (e) => { if (thrusting) finger = toW(view.pos(e)); });
    const up = () => { thrusting = false; finger = null; }; ctx.on(view.canvas, 'pointerup', up); ctx.on(view.canvas, 'pointercancel', up);
    const keys = {}; ctx.on(window, 'keydown', (e) => { keys[e.key] = true; if (e.key === ' ' || e.key.startsWith('Arrow')) e.preventDefault(); }); ctx.on(window, 'keyup', (e) => (keys[e.key] = false));

    const step = (dt) => {
      t += dt;
      if (pad.vx) { pad.x += pad.vx * dt; if (pad.x < 20 || pad.x + pad.w > WW - 20) pad.vx *= -1; }
      if (phase !== 'fly') return;
      const on = (thrusting || keys[' '] || keys.ArrowUp) && ship.fuel > 0;
      let target = 0;
      if (finger) target = Math.max(-1, Math.min(1, (finger.x - ship.x) / 70)) * 0.7;
      if (keys.ArrowLeft) target = -0.6; if (keys.ArrowRight) target = 0.6;
      ship.a += (target - ship.a) * Math.min(1, dt * 4);
      windNow = M.wind ? Math.sin(t * 0.7) * M.wind + Math.sin(t * 2.3) * M.wind * 0.4 : 0;
      ship.vx += windNow * dt; ship.vy -= M.g * dt;
      if (on) { ship.vx += Math.sin(ship.a) * THRUST * dt; ship.vy += Math.cos(ship.a) * THRUST * dt; ship.fuel = Math.max(0, ship.fuel - dt); if (R.float(0, 1) < 0.9) parts.push({ x: ship.x - Math.sin(ship.a) * 14, y: ship.y - Math.cos(ship.a) * 14, vx: -Math.sin(ship.a) * 40 + R.float(-10, 10), vy: -Math.cos(ship.a) * 40 + R.float(-10, 10), life: 0.5 }); if (Math.floor(t * 20) % 3 === 0) tone(70 + R.float(0, 30), 0.05, { type: 'sawtooth', vol: 0.03 }); }
      ship.x += ship.vx * dt; ship.y += ship.vy * dt;
      if (ship.x < 8) { ship.x = 8; ship.vx = Math.abs(ship.vx) * 0.3; } if (ship.x > WW - 8) { ship.x = WW - 8; ship.vx = -Math.abs(ship.vx) * 0.3; }
      if (ship.y > WH + 40) ship.vy = Math.min(ship.vy, 0);
      for (const p of parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; } parts = parts.filter((p) => p.life > 0);
      const feet = ship.y - 12;
      if (feet <= groundAt(ship.x - 7) || feet <= groundAt(ship.x + 7) || feet <= groundAt(ship.x)) land();
      ctx.hud({ pts: `${total} pts`, fuel: `⛽ ${Math.round((ship.fuel / M.fuel) * 100)} %` });
    };
    const land = () => {
      const onPad = ship.x - 6 >= pad.x && ship.x + 6 <= pad.x + pad.w;
      const vy = -ship.vy, vx = Math.abs(ship.vx - pad.vx * (onPad ? 1 : 0)), a = Math.abs(ship.a);
      const good = onPad && vy < 4 && vx < 2.5 && a < 0.25;
      phase = 'done'; ship.y = groundAt(ship.x) + 12;
      if (good) {
        const fuelK = ship.fuel / M.fuel, soft = Math.max(0, (4 - vy) / 4);
        const p = Math.round(300 + fuelK * 400 + soft * 200); total += p; ok++;
        if (vy < 0.5) plume = true; if (fuelK > 0.6) eco = true;
        ship.vx = ship.vy = 0; sfx.win(); ctx.flash('rgba(61,220,151,.3)'); vibrate([20, 40, 20]);
        msg = `✅ Posé à ${vy.toFixed(1).replace('.', ',')} m/s · +${p}`;
      } else {
        sfx.bad(); ctx.shake(10); vibrate([60, 40, 100]);
        for (let i = 0; i < 40; i++) parts.push({ x: ship.x, y: ship.y, vx: R.float(-60, 60), vy: R.float(0, 90), life: R.float(0.5, 1.4), boom: true });
        msg = !onPad ? '💥 Hors de la plateforme' : vy >= 4 ? `💥 Trop rapide (${vy.toFixed(1).replace('.', ',')} m/s)` : a >= 0.25 ? '💥 Pas assez droit' : '💥 Glissade';
        ship.dead = true;
      }
      ctx.hud({ pts: `${total} pts` });
      next.textContent = mi < MISSIONS.length - 1 ? 'Mission suivante' : 'Résultats';
      ctx.timeout(() => (next.style.display = ''), 700);
    };
    next.onclick = () => { mi++; if (mi < MISSIONS.length) setup(); else finish(); };
    const finish = () => ctx.end({
      score: total, display: `${total} pts`, emoji: '🚀', board: mode === 'jour' ? 'jour' : null,
      title: ok === 6 ? 'Astronaute confirmé' : ok >= 4 ? 'Pilote fiable' : ok >= 2 ? 'Quelques cratères en plus' : 'Houston, on a un problème',
      label: `${ok}/6 atterrissages réussis`,
      feats: [plume && 'plume', eco && 'econome', ok === 6 && 'toutes'].filter(Boolean),
    });
    const draw = (dt) => {
      const { s, ox, oy } = geo(); const X = (x) => ox + x * s, Y = (y) => oy + (WH - y) * s;
      const sky = g.createLinearGradient(0, 0, 0, view.h); sky.addColorStop(0, M.sky[0]); sky.addColorStop(1, M.sky[1]); g.fillStyle = sky; g.fillRect(0, 0, view.w, view.h);
      g.fillStyle = 'rgba(255,255,255,.6)'; for (let i = 0; i < 30; i++) g.fillRect((i * 97) % view.w, (i * 53) % (view.h * 0.5), 1.5, 1.5);
      g.fillStyle = M.ground; g.beginPath(); g.moveTo(X(0), view.h);
      for (let x = 0; x <= WW; x += 2) g.lineTo(X(x), Y(groundAt(x))); g.lineTo(X(WW), view.h); g.lineTo(0, view.h); g.fill();
      g.fillStyle = '#3ddc97'; g.fillRect(X(pad.x), Y(pad.y) - 2, pad.w * s, 5); g.fillStyle = '#ffd23f'; for (const k of [0, 1]) g.fillRect(X(pad.x + k * pad.w) - 2, Y(pad.y) - 12, 4, 12);
      for (const p of parts) { p.x += 0; g.globalAlpha = Math.max(0, p.life * 2); g.fillStyle = p.boom ? (Math.random() < 0.5 ? '#ff9f43' : '#ff3d5a') : '#ffd23f'; g.fillRect(X(p.x) - 2, Y(p.y) - 2, 4, 4); } g.globalAlpha = 1;
      if (phase !== 'fly') { for (const p of parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy -= 60 * dt; p.life -= dt; } parts = parts.filter((p) => p.life > 0); }
      if (!ship.dead) {
        g.save(); g.translate(X(ship.x), Y(ship.y)); g.rotate(ship.a);
        g.fillStyle = '#eaf4ff'; g.beginPath(); g.moveTo(0, -16 * s * 1.25); g.lineTo(7 * s * 1.25, 6 * s * 1.25); g.lineTo(-7 * s * 1.25, 6 * s * 1.25); g.fill();
        g.fillStyle = '#ff3d5a'; g.fillRect(-9 * s * 1.25, 4 * s * 1.25, 18 * s * 1.25, 4 * s * 1.25);
        g.strokeStyle = '#ccc'; g.lineWidth = 2; g.beginPath(); g.moveTo(-6 * s * 1.25, 8 * s * 1.25); g.lineTo(-10 * s * 1.25, 14 * s * 1.25); g.moveTo(6 * s * 1.25, 8 * s * 1.25); g.lineTo(10 * s * 1.25, 14 * s * 1.25); g.stroke();
        g.fillStyle = '#4cc9f0'; g.beginPath(); g.arc(0, -4 * s * 1.25, 2.5 * s * 1.25, 0, 7); g.fill();
        g.restore();
      }
      // Instruments
      const vy = -ship.vy, okV = vy < 4;
      g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(8, view.h - 64, 150, 54);
      g.font = '700 13px Outfit, sans-serif'; g.textAlign = 'left'; g.textBaseline = 'top';
      g.fillStyle = okV ? '#3ddc97' : '#ff5c7a'; g.fillText(`↓ ${Math.max(0, vy).toFixed(1).replace('.', ',')} m/s`, 16, view.h - 58);
      g.fillStyle = Math.abs(ship.vx) < 2.5 ? '#3ddc97' : '#ff5c7a'; g.fillText(`↔ ${Math.abs(ship.vx).toFixed(1).replace('.', ',')} m/s`, 16, view.h - 40);
      g.fillStyle = '#ffd23f'; g.fillRect(90, view.h - 56, 60 * (ship.fuel / M.fuel), 10); g.strokeStyle = '#fff'; g.strokeRect(90, view.h - 56, 60, 10);
      g.fillStyle = '#fff'; g.fillText('⛽', 72, view.h - 58);
      if (M.wind) { g.fillStyle = '#fff'; g.fillText(`🌬️ ${windNow > 0 ? '→' : '←'}`, 90, view.h - 40); }
      if (msg) { g.font = '800 18px Outfit, sans-serif'; g.textAlign = 'center'; g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(0, view.h * 0.35 - 22, view.w, 44); g.fillStyle = msg.startsWith('✅') ? '#3ddc97' : '#ff5c7a'; g.textBaseline = 'middle'; g.fillText(msg, view.w / 2, view.h * 0.35); }
      if (phase === 'fly' && t < 2.5 && mi === 0) { g.font = '700 15px Outfit, sans-serif'; g.textAlign = 'center'; g.fillStyle = '#fff'; g.fillText('Maintiens pour pousser · la fusée penche vers ton doigt', view.w / 2, view.h * 0.3); }
    };
    setup();
    const stop = loop((dt) => { for (let i = 0; i < 2; i++) step((dt / 2) * 1.5); draw(dt); });
    ctx.onCleanup(stop);
  },
};
