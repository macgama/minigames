import { createCanvas, loop } from '../core/canvas.js';
import { sfx, vibrate } from '../core/sfx.js';
import { makeRng, todayKey } from '../core/rng.js';

const DURATION = 45, AMMO = 20;

export default {
  start(ctx) {
    const mode = ctx.mode || 'classic', sniper = mode === 'sniper';
    const R = mode === 'jour' ? makeRng('cible-' + todayKey()) : ctx.rng;
    const view = createCanvas(ctx.stage); ctx.onCleanup(view.destroy);
    const { g } = view;
    let t = 0, score = 0, shots = 0, hits = 0, bulls = 0, golds = 0, nextSpawn = 0.3, ammo = AMMO, over = false, combo = 0;
    const targets = [], fx = [];
    const spawn = () => {
      const k = Math.min(1, t / DURATION);
      const kind = R.chance(0.12 + k * 0.08) ? 'bomb' : R.chance(0.08) ? 'gold' : 'normal';
      const r = (kind === 'gold' ? 22 : R.float(26, 40)) * (1 - k * 0.3) * Math.min(1.2, view.w / 400);
      const side = R.pick(['l', 'r', 't']);
      const sp = R.float(70, 130) * (1 + k * 1.6) * (sniper ? 0.8 : 1);
      let x, y, vx, vy;
      if (side === 'l') { x = -r; y = R.float(0.15, 0.85) * view.h; vx = sp; vy = R.float(-30, 30); }
      else if (side === 'r') { x = view.w + r; y = R.float(0.15, 0.85) * view.h; vx = -sp; vy = R.float(-30, 30); }
      else { x = R.float(0.15, 0.85) * view.w; y = -r; vx = R.float(-40, 40); vy = sp * 0.8; }
      targets.push({ x, y, vx, vy, r, kind, wob: R.float(0, 6), zig: t > 15 && R.chance(0.4) });
    };
    ctx.on(view.canvas, 'pointerdown', (e) => {
      if (over) return;
      const p = view.pos(e); shots++;
      if (sniper) { ammo--; }
      let hit = null, d = Infinity;
      for (const tg of targets) { const dd = Math.hypot(tg.x - p.x, tg.y - p.y); if (dd < tg.r && dd < d) { hit = tg; d = dd; } }
      if (!hit) { combo = 0; if (!sniper) score = Math.max(0, score - 5); sfx.tick(); fx.push({ x: p.x, y: p.y, t: 0.3, miss: true }); }
      else if (hit.kind === 'bomb') { score = Math.max(0, score - 100); combo = 0; sfx.boom(); vibrate(120); ctx.shake(10); ctx.flash('rgba(255,61,90,.4)'); ctx.pop('💣 −100', p.x, p.y, '#ff5c7a', 28); targets.splice(targets.indexOf(hit), 1); }
      else {
        hits++; combo++;
        const ring = d / hit.r; let pts = ring < 0.2 ? 50 : ring < 0.55 ? 30 : 10;
        if (ring < 0.2) bulls++;
        if (hit.kind === 'gold') { pts *= 3; golds++; }
        const mult = combo >= 10 ? 2 : combo >= 5 ? 1.5 : 1; pts = Math.round(pts * mult);
        score += pts; sfx[ring < 0.2 ? 'ok' : 'pop'](); vibrate(10);
        ctx.pop(`${ring < 0.2 ? '🎯 ' : ''}+${pts}`, p.x, p.y, hit.kind === 'gold' ? '#ffd23f' : ring < 0.2 ? '#3ddc97' : '#fff', ring < 0.2 ? 30 : 22);
        for (let i = 0; i < 10; i++) fx.push({ x: hit.x, y: hit.y, vx: R.float(-200, 200), vy: R.float(-200, 200), t: 0.5, c: hit.kind === 'gold' ? '#ffd23f' : '#ff4f4f' });
        targets.splice(targets.indexOf(hit), 1);
      }
      if (sniper && ammo <= 0) finish();
    });
    const stop = loop((dt) => {
      if (over) return;
      t += dt; nextSpawn -= dt;
      if (nextSpawn <= 0) { spawn(); nextSpawn = Math.max(0.28, 0.9 - t * 0.014) * R.float(0.7, 1.3); }
      for (const tg of targets) { tg.x += tg.vx * dt; tg.y += tg.vy * dt + (tg.zig ? Math.sin(t * 5 + tg.wob) * 90 * dt : 0); }
      for (let i = targets.length - 1; i >= 0; i--) { const tg = targets[i]; if (tg.x < -80 || tg.x > view.w + 80 || tg.y > view.h + 80) targets.splice(i, 1); }
      fx.forEach((p) => { p.t -= dt; if (p.vx) { p.x += p.vx * dt; p.y += p.vy * dt; } });
      for (let i = fx.length - 1; i >= 0; i--) if (fx[i].t <= 0) fx.splice(i, 1);
      const left = DURATION - t;
      ctx.hud({ pts: `${score} pts`, time: sniper ? null : `${Math.max(0, Math.ceil(left))} s`, ammo: sniper ? `🔫 ${ammo}` : null, combo: combo >= 5 ? `🔥 ×${combo >= 10 ? 2 : 1.5}` : null });
      draw();
      if (!sniper && left <= 0) finish();
      if (sniper && t > 75) finish();
    });
    ctx.onCleanup(stop);
    function draw() {
      g.clearRect(0, 0, view.w, view.h);
      g.strokeStyle = 'rgba(255,255,255,.04)'; for (let x = 0; x < view.w; x += 40) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, view.h); g.stroke(); }
      for (const tg of targets) {
        if (tg.kind === 'bomb') { g.font = `${tg.r * 1.6}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('💣', tg.x, tg.y); continue; }
        const cols = tg.kind === 'gold' ? ['#ffd23f', '#fff', '#ffb547', '#fff'] : ['#ff4f4f', '#fff', '#ff4f4f', '#fff'];
        [1, 0.75, 0.55, 0.2].forEach((k, i) => { g.fillStyle = i === 3 ? (tg.kind === 'gold' ? '#ff9f43' : '#ff4f4f') : cols[i]; g.beginPath(); g.arc(tg.x, tg.y, tg.r * k, 0, 7); g.fill(); });
        if (tg.kind === 'gold') { g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.arc(tg.x, tg.y, tg.r + 4 + Math.sin(t * 10) * 2, 0, 7); g.stroke(); }
      }
      for (const p of fx) { g.globalAlpha = Math.max(0, p.t * 2); if (p.miss) { g.strokeStyle = '#fff'; g.beginPath(); g.arc(p.x, p.y, 14 - p.t * 20, 0, 7); g.stroke(); } else { g.fillStyle = p.c; g.beginPath(); g.arc(p.x, p.y, 4, 0, 7); g.fill(); } } g.globalAlpha = 1;
    }
    function finish() {
      if (over) return; over = true;
      const acc = shots ? Math.round((hits / shots) * 100) : 0;
      ctx.timeout(() => ctx.end({
        score, display: `${score} pts`, emoji: '🎯', board: mode === 'classic' ? null : mode,
        title: score >= 1700 ? 'Tireur d’élite' : score >= 1000 ? 'Bonne gâchette' : 'À l’entraînement',
        label: `${hits} cibles · précision ${acc} % · ${bulls} en plein centre`,
        feats: [bulls >= 5 && 'mouche', shots >= 20 && acc >= 90 && 'precis', golds >= 3 && 'dore'].filter(Boolean),
      }), 500);
    }
  },
};
