import { createCanvas, loop, roundRect } from '../core/canvas.js';
import { sfx, vibrate, tone } from '../core/sfx.js';
import { makeRng, todayKey } from '../core/rng.js';

// [emoji, points, vitesse, profondeur min-max (0..1), force, rareté, rare ?]
const FISH = [
  ['🐟', 30, 40, [0.05, 0.6], 0.25, 30, false], ['🐠', 60, 55, [0.2, 0.7], 0.35, 22, false], ['🐡', 80, 35, [0.4, 0.85], 0.45, 14, false],
  ['🦀', 50, 20, [0.85, 0.97], 0.3, 10, false], ['🦑', 140, 85, [0.5, 0.95], 0.6, 6, true], ['🦈', 220, 110, [0.3, 0.9], 0.85, 3, true], ['🐉', 500, 140, [0.75, 0.97], 1, 0.6, true],
];

export default {
  start(ctx) {
    const mode = ctx.mode || 'classic', night = mode === 'nuit';
    const R = mode === 'jour' ? makeRng('peche-' + todayKey()) : ctx.rng;
    const view = createCanvas(ctx.stage, { onResize: () => {} }); ctx.onCleanup(view.destroy);
    const { g } = view;
    const fish = []; let left = 60, score = 0, caught = 0, rares = 0, legend = false, over = false, t = 0, spawnT = 0, bubbles = [];
    const boat = { x: 0.5, tx: 0.5 };
    const hook = { state: 'idle', x: 0.5, y: 0, ty: 0, fish: null, tension: 0.4, prog: 0, slack: 0 };
    let holding = false;
    const waterTop = () => view.h * 0.26, waterH = () => view.h * 0.7;
    const spawn = () => {
      const pool = FISH.map((f) => [f, f[5] * (night && f[6] ? 2.5 : 1)]); const tot = pool.reduce((s, [, w]) => s + w, 0); let r = R.float(0, tot), F = pool[0][0];
      for (const [f, w] of pool) { r -= w; if (r <= 0) { F = f; break; } }
      const dir = R.pick([-1, 1]);
      fish.push({ F, x: dir > 0 ? -0.1 : 1.1, d: R.float(F[3][0], F[3][1]), dir, sp: (F[2] / 400) * R.float(0.8, 1.2), wob: R.float(0, 6) });
    };
    for (let i = 0; i < 6; i++) { spawn(); fish.at(-1).x = R.float(0.1, 0.9); }
    ctx.on(view.canvas, 'pointerdown', (e) => {
      e.preventDefault(); const p = view.pos(e);
      if (hook.state === 'reel') { holding = true; return; }
      if (hook.state !== 'idle' && hook.state !== 'wait') return;
      if (p.y < waterTop()) return;
      boat.tx = Math.max(0.06, Math.min(0.94, p.x / view.w)); hook.x = boat.tx; hook.y = 0; hook.ty = Math.min(0.97, (p.y - waterTop()) / waterH()); hook.state = 'drop'; sfx.pop();
    });
    const rel = () => (holding = false); ctx.on(window, 'pointerup', rel); ctx.on(window, 'pointercancel', rel);
    ctx.on(window, 'keydown', (e) => { if (e.code === 'Space') { e.preventDefault(); holding = true; } }); ctx.on(window, 'keyup', (e) => { if (e.code === 'Space') holding = false; });
    const msg = { txt: '', c: '#fff', life: 0 }; const say = (txt, c = '#fff') => Object.assign(msg, { txt, c, life: 1.8 });

    const step = (dt) => {
      t += dt; left -= dt;
      boat.x += (boat.tx - boat.x) * Math.min(1, dt * 4);
      spawnT -= dt; if (spawnT <= 0 && fish.length < 9) { spawn(); spawnT = R.float(0.6, 1.6); }
      for (const f of fish) { if (f === hook.fish) continue; f.x += f.dir * f.sp * dt; }
      for (let i = fish.length - 1; i >= 0; i--) if (fish[i] !== hook.fish && (fish[i].x < -0.15 || fish[i].x > 1.15)) fish.splice(i, 1);
      if (hook.state === 'drop') { hook.y += dt * 1.2; if (hook.y >= hook.ty) { hook.y = hook.ty; hook.state = 'wait'; } }
      if (hook.state === 'wait' || hook.state === 'drop') {
        for (const f of fish) if (Math.abs(f.x - hook.x) < 0.05 && Math.abs(f.d - hook.y) < 0.06 && R.float(0, 1) < dt * 6) { hook.state = 'reel'; hook.fish = f; hook.tension = 0.45; hook.prog = 0; hook.slack = 0; sfx.go(); vibrate([30, 20, 30]); say('Ça mord ! Maintiens pour remonter', '#ffd23f'); break; }
      }
      if (hook.state === 'reel') {
        const f = hook.fish, force = f.F[4];
        const jerk = (Math.sin(t * (3 + force * 6) + f.wob) * 0.5 + 0.5) * force * 1.25;
        hook.tension += (holding ? 0.95 : -0.85) * dt + jerk * dt * (holding ? 1 : 0.3);
        hook.tension = Math.max(0, hook.tension);
        const inZone = hook.tension > 0.3 && hook.tension < 0.85;
        if (holding && inZone) hook.prog += dt * (0.55 - force * 0.25);
        f.x = hook.x + Math.sin(t * 6) * 0.02; f.d = hook.y; hook.y = Math.max(0, hook.ty * (1 - hook.prog));
        if (hook.tension >= 1) { say('💥 La ligne a cassé !', '#ff5c7a'); sfx.bad(); vibrate([60, 40, 60]); ctx.shake(6); fish.splice(fish.indexOf(f), 1); hook.state = 'idle'; hook.fish = null; }
        else if (hook.tension < 0.08) { hook.slack += dt; if (hook.slack > 1.3) { say('Le poisson a filé…', '#4cc9f0'); sfx.bad(); hook.state = 'idle'; f.dir = R.pick([-1, 1]); hook.fish = null; } }
        else hook.slack = 0;
        if (hook.state === 'reel' && hook.prog >= 1) {
          const [e, p, , , , , rare] = f.F; score += p; caught++; if (rare) rares++; if (e === '🐉') legend = true;
          fish.splice(fish.indexOf(f), 1); hook.state = 'idle'; hook.fish = null;
          sfx.win(); vibrate([20, 30, 20]); ctx.flash(rare ? 'rgba(255,210,63,.35)' : 'rgba(61,220,151,.2)'); ctx.pop(`${e} +${p}`, view.w / 2, view.h * 0.2, rare ? '#ffd23f' : '#3ddc97', rare ? 36 : 28);
          if (e === '🐉') say('🐉 LA LÉGENDE DU LAC !', '#ffd23f');
        }
        if (Math.floor(t * 12) % 2 === 0 && holding) tone(200 + hook.tension * 300, 0.03, { type: 'triangle', vol: 0.04 });
      }
      if (R.float(0, 1) < dt * 4) bubbles.push({ x: R.float(0, 1), y: 1, life: 3 });
      for (const b of bubbles) { b.y -= dt * 0.15; b.life -= dt; } bubbles = bubbles.filter((b) => b.life > 0 && b.y > 0);
      msg.life -= dt;
      ctx.hud({ pts: `${score} pts`, time: `${Math.max(0, Math.ceil(left))} s`, n: `🎣 ${caught}` });
      if (left <= 0 && hook.state !== 'reel') end();
    };
    const end = () => {
      over = true; sfx.win();
      ctx.timeout(() => ctx.end({
        score, display: `${score} pts`, emoji: '🎣', board: mode === 'classic' ? null : mode,
        title: legend ? 'Légende du lac' : score >= 900 ? 'Pêcheur d’exception' : score >= 500 ? 'Belle pêche' : 'Ça ne mordait pas trop',
        label: `${caught} prise${caught > 1 ? 's' : ''} · ${rares} rare${rares > 1 ? 's' : ''}`,
        feats: [legend && 'legende', caught >= 12 && 'filet', rares >= 3 && 'rare'].filter(Boolean),
      }), 600);
    };
    const draw = () => {
      const W = view.w, H = view.h, wt = waterTop(), wh = waterH();
      const sky = g.createLinearGradient(0, 0, 0, wt); sky.addColorStop(0, night ? '#0b0f2a' : '#7cc6ff'); sky.addColorStop(1, night ? '#24305a' : '#cfe9ff'); g.fillStyle = sky; g.fillRect(0, 0, W, wt);
      if (night) { g.fillStyle = '#fff8d0'; g.beginPath(); g.arc(W * 0.8, wt * 0.35, 18, 0, 7); g.fill(); }
      const wa = g.createLinearGradient(0, wt, 0, H); wa.addColorStop(0, night ? '#123a6b' : '#2b8bd9'); wa.addColorStop(1, night ? '#020814' : '#0b2a55'); g.fillStyle = wa; g.fillRect(0, wt, W, H - wt);
      g.fillStyle = '#5a4630'; g.fillRect(0, wt + wh, W, H - wt - wh);
      g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 2; g.beginPath(); for (let x = 0; x <= W; x += 6) g.lineTo(x, wt + Math.sin(x * 0.04 + t * 2) * 3); g.stroke();
      g.fillStyle = 'rgba(255,255,255,.25)'; for (const b of bubbles) { g.beginPath(); g.arc(b.x * W, wt + b.y * wh, 2.5, 0, 7); g.fill(); }
      g.textAlign = 'center'; g.textBaseline = 'middle';
      for (const f of fish) { const vis = night ? Math.max(0.25, 1 - Math.abs(f.x - hook.x) * 2.2) : 1; g.globalAlpha = vis; g.save(); g.translate(f.x * W, wt + f.d * wh + Math.sin(t * 3 + f.wob) * 3); if (f.dir > 0) g.scale(-1, 1); g.font = `${f.F[0] === '🐉' ? 40 : f.F[0] === '🦈' ? 36 : 26}px sans-serif`; g.fillText(f.F[0], 0, 0); g.restore(); }
      g.globalAlpha = 1;
      // Bateau + ligne
      const bx = boat.x * W; g.font = '40px sans-serif'; g.fillText('🛶', bx, wt - 10); g.font = '26px sans-serif'; g.fillText('🧑', bx + 4, wt - 34);
      if (hook.state !== 'idle') { const hx = hook.x * W, hy = wt + hook.y * wh; g.strokeStyle = hook.state === 'reel' ? `hsl(${120 - Math.min(1, hook.tension) * 120},90%,60%)` : 'rgba(255,255,255,.7)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(bx + 14, wt - 40); g.lineTo(hx, hy); g.stroke(); g.fillStyle = '#ddd'; g.beginPath(); g.arc(hx, hy, 3, 0, 7); g.fill(); }
      // Jauge de tension
      if (hook.state === 'reel') {
        const gw = Math.min(W - 40, 360), gx = (W - gw) / 2, gy = H - 70;
        g.fillStyle = 'rgba(0,0,0,.5)'; roundRect(g, gx - 8, gy - 30, gw + 16, 60, 14); g.fill();
        g.fillStyle = '#ff5c7a'; g.fillRect(gx, gy, gw, 14); g.fillStyle = '#3ddc97'; g.fillRect(gx + gw * 0.3, gy, gw * 0.55, 14);
        g.fillStyle = '#fff'; g.fillRect(gx + gw * Math.min(1, hook.tension) - 2, gy - 4, 4, 22);
        g.fillStyle = '#ffd23f'; g.fillRect(gx, gy + 18, gw * hook.prog, 6);
        g.font = '700 13px Outfit, sans-serif'; g.fillStyle = '#fff'; g.fillText(holding ? 'Garde l’aiguille dans le vert' : 'Maintiens pour remonter', W / 2, gy - 16);
      }
      if (msg.life > 0) { g.globalAlpha = Math.min(1, msg.life); g.font = '800 18px Outfit, sans-serif'; g.fillStyle = msg.c; g.fillText(msg.txt, W / 2, wt + 30); g.globalAlpha = 1; }
      if (t < 3 && !caught && hook.state === 'idle') { g.font = '700 15px Outfit, sans-serif'; g.fillStyle = '#fff'; g.fillText('Touche l’eau pour lancer à cette profondeur', W / 2, wt + 60); }
    };
    const stop = loop((dt) => { if (!over) step(dt); draw(); }); ctx.onCleanup(stop);
  },
};
