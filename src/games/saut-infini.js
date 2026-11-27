import { createCanvas, loop, roundRect } from '../core/canvas.js';
import { sfx, vibrate } from '../core/sfx.js';
import { makeRng, todayKey } from '../core/rng.js';

const W = 360, PX_M = 40; // monde : 360 unités de large, 40 unités = 1 m

export default {
  start(ctx) {
    const mode = ctx.mode || 'classic', turbo = mode === 'turbo';
    const R = mode === 'jour' ? makeRng('saut-' + todayKey()) : ctx.rng;
    const view = createCanvas(ctx.stage, { onResize: () => {} }); ctx.onCleanup(view.destroy);
    const { g } = view;
    const me = { x: W / 2, y: -20, vx: 150, vy: 0, jumps: 0, on: null, squash: 0 };
    const plats = [{ x: 0, y: 0, w: W, kind: 'floor' }];
    const coins = [], parts = [];
    let topGen = 0, camY = -500, best = 0, nCoins = 0, over = false, started = false, t = 0;
    const height = () => Math.max(0, Math.round(-me.y / PX_M));
    const gen = () => {
      while (topGen > camY - 900) {
        const m = -topGen / PX_M;
        const gap = 70 + Math.min(55, m * 0.25) + R.float(0, 25);
        topGen -= gap;
        const w = Math.max(52, 110 - m * 0.18) * R.float(0.8, 1.15);
        const p = { x: R.float(8, W - w - 8), y: topGen, w, kind: 'n', vx: 0 };
        const r = R.float(0, 1);
        if (m > 25 && r < Math.min(0.35, 0.12 + m * 0.001)) { p.kind = 'move'; p.vx = R.pick([-1, 1]) * (40 + Math.min(80, m * 0.3)); }
        else if (m > 50 && r < 0.55) p.kind = 'break';
        if (p.kind !== 'break' && R.float(0, 1) < 0.08) p.spring = R.float(0.2, 0.8);
        plats.push(p);
        if (R.float(0, 1) < 0.32) coins.push({ x: p.x + p.w / 2 + R.float(-30, 30), y: p.y - 46 - R.float(0, 40), got: false });
      }
      // Nettoyage sous l'écran
      while (plats.length && plats[0].y > camY + 1600) plats.shift();
    };
    gen();
    const jump = () => {
      if (over) return;
      if (!started) { started = true; }
      if (me.jumps >= 2) return;
      me.vy = me.jumps === 0 ? -720 : -640; me.jumps++; me.on = null; me.squash = -0.25;
      sfx.tick(); vibrate(5);
      for (let i = 0; i < 6; i++) parts.push({ x: me.x, y: me.y, vx: R.float(-80, 80), vy: R.float(20, 120), life: 0.4, c: 'rgba(255,255,255,.7)' });
    };
    ctx.on(view.canvas, 'pointerdown', (e) => { e.preventDefault(); jump(); });
    ctx.on(window, 'keydown', (e) => { if (e.code === 'Space' || e.key === 'ArrowUp') { e.preventDefault(); jump(); } });

    const step = (dt) => {
      t += dt;
      for (const p of plats) if (p.kind === 'move') { p.x += p.vx * dt; if (p.x < 4 || p.x + p.w > W - 4) p.vx *= -1; }
      if (me.on) {
        const p = me.on;
        if (p.kind === 'move') me.x += p.vx * dt;
        me.x += me.vx * dt;
        if (me.x < p.x - 6 || me.x > p.x + p.w + 6) { me.on = null; me.jumps = Math.max(me.jumps, 1); }
      } else {
        const py = me.y; me.vy = Math.min(1100, me.vy + 1800 * dt); me.y += me.vy * dt; me.x += me.vx * dt;
        if (me.vy > 0) for (const p of plats) {
          if (p.gone || me.x < p.x - 6 || me.x > p.x + p.w + 6) continue;
          if (py <= p.y && me.y >= p.y) {
            me.y = p.y; me.squash = 0.3;
            if (p.spring && Math.abs(me.x - (p.x + p.w * p.spring)) < 16) { me.vy = -1150; me.jumps = 1; sfx.go(); vibrate(15); p.boing = 0.3; break; }
            if (p.kind === 'break') { p.gone = true; me.vy = -420; me.jumps = 1; sfx.pop(); for (let i = 0; i < 10; i++) parts.push({ x: p.x + R.float(0, p.w), y: p.y, vx: R.float(-60, 60), vy: R.float(-60, 40), life: 0.8, c: '#b07a4a' }); break; }
            me.vy = 0; me.on = p; me.jumps = 0; break;
          }
        }
      }
      if (me.x < 12) { me.x = 12; me.vx = Math.abs(me.vx); } if (me.x > W - 12) { me.x = W - 12; me.vx = -Math.abs(me.vx); }
      for (const c of coins) if (!c.got && Math.hypot(c.x - me.x, c.y - (me.y - 14)) < 24) { c.got = true; nCoins++; sfx.ok(); ctx.hud({ coins: `🪙 ${nCoins}` }); }
      const hgt = height(); if (hgt > best) { if (Math.floor(hgt / 50) > Math.floor(best / 50)) { ctx.flash('rgba(255,210,63,.18)'); sfx.win(); } best = hgt; ctx.hud({ m: `${best} m` }); }
      // Caméra : suit vers le haut, puis monte toute seule pour mettre la pression
      const viewH = view.h / (view.w / W);
      const target = me.y - viewH * 0.55; if (target < camY) camY += (target - camY) * Math.min(1, dt * 6);
      if (started && best > 5) camY -= (14 + Math.min(70, best * 0.22)) * dt;
      gen();
      for (const q of parts) { q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 400 * dt; q.life -= dt; }
      for (let i = parts.length - 1; i >= 0; i--) if (parts[i].life <= 0) parts.splice(i, 1);
      me.squash *= 0.85;
      if (me.y > camY + viewH + 40) die();
    };
    const die = () => {
      if (over) return; over = true; sfx.bad(); vibrate([40, 40, 80]); ctx.shake(8);
      ctx.timeout(() => ctx.end({
        score: best, display: `${best} m`, emoji: '🦘', board: mode === 'classic' ? null : mode,
        title: best >= 250 ? 'Au-dessus des nuages' : best >= 120 ? 'Grimpeur aguerri' : best >= 50 ? 'Belle ascension' : 'Ça monte doucement',
        label: `${nCoins} pièce${nCoins > 1 ? 's' : ''} · ${mode === 'turbo' ? 'Turbo' : mode === 'jour' ? 'Tour du jour' : 'Ascension'}`,
        feats: [best >= 100 && 'cent', nCoins >= 30 && 'riche', best >= 250 && 'nuages'].filter(Boolean),
      }), 700);
    };

    const draw = () => {
      const k = view.w / W; const viewH = view.h / k;
      const m = -camY / PX_M;
      const sky = g.createLinearGradient(0, 0, 0, view.h);
      const hue = 205 + Math.min(60, m * 0.25), lum = Math.max(8, 48 - m * 0.14);
      sky.addColorStop(0, `hsl(${hue},70%,${lum}%)`); sky.addColorStop(1, `hsl(${hue - 15},70%,${lum + 14}%)`);
      g.fillStyle = sky; g.fillRect(0, 0, view.w, view.h);
      g.save(); g.scale(k, k); g.translate(0, -camY);
      // Étoiles, puis nuages
      if (m > 120) { g.fillStyle = `rgba(255,255,255,${Math.min(0.8, (m - 120) / 100)})`; for (let i = 0; i < 40; i++) { const sx = (i * 97) % W, sy = camY + ((i * 151 - camY * 0.3) % viewH + viewH) % viewH; g.fillRect(sx, sy, 2, 2); } }
      g.fillStyle = 'rgba(255,255,255,.12)';
      for (let i = 0; i < 6; i++) { const cy = Math.floor(camY / 400) * 400 + i * 260 - ((camY * 0.4) % 260); const cx = (i * 131) % W; g.beginPath(); g.ellipse(cx, cy, 60, 18, 0, 0, 7); g.fill(); }
      // Repères de hauteur
      g.font = '700 11px Outfit, sans-serif'; g.fillStyle = 'rgba(255,255,255,.35)'; g.textAlign = 'left';
      for (let mm = Math.ceil(-(camY + viewH) / PX_M / 25) * 25; mm * PX_M < -camY; mm += 25) if (mm > 0) { const yy = -mm * PX_M; g.fillRect(0, yy, 14, 1); g.fillText(`${mm} m`, 4, yy - 4); }
      for (const p of plats) {
        if (p.gone) continue;
        if (p.kind === 'floor') { g.fillStyle = '#3ddc97'; g.fillRect(0, p.y, W, 600); continue; }
        g.fillStyle = p.kind === 'move' ? '#4cc9f0' : p.kind === 'break' ? '#b07a4a' : '#f5f5f5';
        roundRect(g, p.x, p.y, p.w, 12, 6); g.fill();
        if (p.kind === 'break') { g.strokeStyle = 'rgba(0,0,0,.4)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(p.x + p.w * 0.4, p.y); g.lineTo(p.x + p.w * 0.5, p.y + 12); g.lineTo(p.x + p.w * 0.6, p.y + 4); g.stroke(); }
        if (p.spring) { const sx = p.x + p.w * p.spring; p.boing = Math.max(0, (p.boing || 0) - 1 / 60); g.fillStyle = '#ff5c7a'; g.fillRect(sx - 9, p.y - 10 - p.boing * 30, 18, 6); g.strokeStyle = '#ffd23f'; g.lineWidth = 2; g.beginPath(); for (let i = 0; i <= 4; i++) g.lineTo(sx + (i % 2 ? 6 : -6), p.y - (i / 4) * (10 + p.boing * 30)); g.stroke(); }
      }
      g.font = '20px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      for (const c of coins) if (!c.got && c.y > camY - 30 && c.y < camY + viewH + 30) { g.save(); g.translate(c.x, c.y); g.scale(Math.abs(Math.cos(t * 3 + c.x)), 1); g.fillText('🪙', 0, 0); g.restore(); }
      for (const q of parts) { g.globalAlpha = Math.max(0, q.life * 2); g.fillStyle = q.c; g.fillRect(q.x - 2, q.y - 2, 4, 4); } g.globalAlpha = 1;
      g.save(); g.translate(me.x, me.y); g.scale((me.vx > 0 ? -1 : 1) * (1 + me.squash), 1 - me.squash); g.font = '34px sans-serif'; g.textBaseline = 'bottom'; g.fillText('🦘', 0, 4); g.restore();
      g.restore();
      // Zone de danger en bas
      const grd = g.createLinearGradient(0, view.h - 40, 0, view.h); grd.addColorStop(0, 'rgba(255,61,90,0)'); grd.addColorStop(1, 'rgba(255,61,90,.35)'); g.fillStyle = grd; g.fillRect(0, view.h - 40, view.w, 40);
      if (!started) { g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(0, view.h * 0.3 - 30, view.w, 60); g.fillStyle = '#fff'; g.font = '800 20px Outfit, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('Touche pour sauter · 2× = double saut', view.w / 2, view.h * 0.3); }
    };
    ctx.hud({ m: '0 m', coins: '🪙 0' });
    const stop = loop((dt) => { if (!over) { const s = turbo ? 1.45 : 1; step(dt * s / 2); step(dt * s / 2); } draw(); });
    ctx.onCleanup(stop);
  },
};
