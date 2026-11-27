import { createCanvas, loop, clamp } from '../core/canvas.js';
import { sfx, vibrate } from '../core/sfx.js';

const W = 2400, H = 2400, DURATION = 120;
const PAL = ['#4cc9f0', '#ff5c7a', '#3ddc97', '#ffc857', '#b388ff', '#ff9f43', '#00d1b2', '#f72585'];
const BOTN = ['Hexa', 'Tri', 'Carré', 'Penta', 'Losange', 'Octo', 'Prisme', 'Cube', 'Delta', 'Sigma', 'Pixel'];
const rad = (m) => Math.sqrt(m) * 4;

export default {
  start(ctx) {
    const view = createCanvas(ctx.stage); ctx.onCleanup(view.destroy);
    const { g } = view;
    const rng = ctx.rng;
    const titans = ctx.mode === 'titans';
    const PW = { aimant: { icon: '🧲', name: 'Aimant', dur: 6 }, turbo: { icon: '⚡', name: 'Turbo', dur: 4 }, bouclier: { icon: '🛡️', name: 'Bouclier', dur: 5 }, x2: { icon: '✖️2', name: 'Double ration', dur: 7 } };
    const powers = Array.from({ length: 5 }, () => ({ k: rng.pick(Object.keys(PW)), x: rng.float(150, W - 150), y: rng.float(150, H - 150) }));
    const fx = {}; // pouvoirs actifs du joueur : clé -> secondes restantes
    let kills = 0, combo = 0, comboT = 0, dashCd = 0, dashT = 0, eatenBy = null, killFeed = [];
    const mk = (name, mass, color, sides, bot = true) => ({ name, mass, color, sides, bot, x: rng.float(100, W - 100), y: rng.float(100, H - 100), vx: 0, vy: 0, rot: rng.float(0, 6), tx: 0, ty: 0, alive: true });
    const me = mk('Toi', 20, '#ffffff', 6, false); me.x = W / 2; me.y = H / 2;
    const bots = BOTN.map((n, i) => mk(n, titans ? rng.float(30, 150) : rng.float(12, 70), PAL[i % PAL.length], 3 + (i % 5)));
    for (const b of bots) while (Math.hypot(b.x - me.x, b.y - me.y) < 600) { b.x = rng.float(100, W - 100); b.y = rng.float(100, H - 100); }
    fx.bouclier = 3;
    for (const b of bots) b.iq = titans ? rng.float(0.9, 1.15) : rng.float(0.7, 1);
    const food = Array.from({ length: 260 }, () => ({ x: rng.float(0, W), y: rng.float(0, H), m: rng.float(1, 2.6), c: rng.pick(PAL), s: rng.int(3, 6), r: rng.float(0, 6) }));
    let pointer = null, t = 0, peak = me.mass, cam = { x: me.x, y: me.y, z: 1 };
    const keys = new Set();
    ctx.on(view.canvas, 'pointerdown', (e) => (pointer = view.pos(e)));
    ctx.on(view.canvas, 'pointermove', (e) => { if (e.pointerType === 'mouse' || e.buttons) pointer = view.pos(e); });
    let lastTap = 0;
    ctx.on(view.canvas, 'pointerdown', () => { const n = performance.now(); if (n - lastTap < 300) dash(); lastTap = n; });
    ctx.on(window, 'keydown', (e) => { if (e.code === 'Space') { e.preventDefault(); dash(); } });
    ctx.on(window, 'keydown', (e) => keys.add(e.code)); ctx.on(window, 'keyup', (e) => keys.delete(e.code));

    const poly = (x, y, r, sides, rot) => { g.beginPath(); for (let i = 0; i <= sides; i++) { const a = rot + (i / sides) * Math.PI * 2; i ? g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r) : g.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } g.closePath(); };
    const all = () => [me, ...bots].filter((b) => b.alive);
    const speed = (b) => 260 / Math.pow(b.mass, 0.22) * (b === me && fx.turbo ? 1.6 : 1) * (b === me && dashT > 0 ? 2.4 : 1) * (b.bot ? b.iq * 0.25 + 0.78 : 1);
    function dash() { if (!me.alive || dashCd > 0 || me.mass < 25) return; dashCd = 4; dashT = 0.35; me.mass *= 0.94; sfx.whoosh(); vibrate(15); }
    const sx = (x) => (x - cam.x) * cam.z + view.w / 2, sy = (y) => (y - cam.y) * cam.z + view.h / 2;
    const feed = (txt) => { killFeed.unshift({ txt, t: 3 }); killFeed = killFeed.slice(0, 3); };

    const stop = loop((dt) => {
      t += dt; dashCd = Math.max(0, dashCd - dt); dashT = Math.max(0, dashT - dt); comboT -= dt; if (comboT <= 0) combo = 0;
      for (const k in fx) { fx[k] -= dt; if (fx[k] <= 0) delete fx[k]; }
      killFeed.forEach((f) => (f.t -= dt)); killFeed = killFeed.filter((f) => f.t > 0);
      // Bonus
      for (const p of powers) if (me.alive && Math.hypot(p.x - me.x, p.y - me.y) < rad(me.mass) + 24) {
        fx[p.k] = PW[p.k].dur; sfx.ok(); vibrate(20); ctx.pop(`${PW[p.k].icon} ${PW[p.k].name}`, view.w / 2, view.h / 2 - 60, '#ffd23f', 26);
        Object.assign(p, { k: rng.pick(Object.keys(PW)), x: rng.float(150, W - 150), y: rng.float(150, H - 150) });
      }
      if (fx.aimant) for (const f of food) { const d = Math.hypot(f.x - me.x, f.y - me.y); if (d < 320 && d > 1) { f.x += ((me.x - f.x) / d) * 380 * dt; f.y += ((me.y - f.y) / d) * 380 * dt; } }
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
        for (const o of all()) { if (o === b) continue; const d = Math.hypot(o.x - b.x, o.y - b.y); if (o.mass > b.mass * 1.15 && d < (200 + 120 * b.iq) + rad(o.mass) && d < dd) { danger = o; dd = d; } if (b.mass > o.mass * 1.15 && !(o === me && fx.bouclier) && d < 300 + 200 * b.iq && d < best) { goal = o; best = d; } }
        if (!goal) for (const f of food) { const d = Math.hypot(f.x - b.x, f.y - b.y); if (d < best) { best = d; goal = f; } }
        let ax = 0, ay = 0;
        if (danger) { ax = b.x - danger.x; ay = b.y - danger.y; } else if (goal) { ax = goal.x - b.x; ay = goal.y - b.y; }
        const l = Math.hypot(ax, ay) || 1; b.vx += ((ax / l) * speed(b) * 0.85 - b.vx) * dt * 3; b.vy += ((ay / l) * speed(b) * 0.85 - b.vy) * dt * 3;
        b.x += b.vx * dt; b.y += b.vy * dt;
      }
      for (const b of all()) { const r = rad(b.mass); b.x = clamp(b.x, r * 0.5, W - r * 0.5); b.y = clamp(b.y, r * 0.5, H - r * 0.5); b.rot += dt * 0.6; b.mass = Math.max(10, b.mass * (1 - dt * 0.002)); }
      // Nourriture
      for (const b of all()) { const r = rad(b.mass); for (const f of food) if (Math.abs(f.x - b.x) < r && Math.abs(f.y - b.y) < r && Math.hypot(f.x - b.x, f.y - b.y) < r) { b.mass += f.m * (b === me && fx.x2 ? 2 : 1); f.x = rng.float(0, W); f.y = rng.float(0, H); if (b === me) sfx.tick(); } }
      // Dévorer
      const live = all();
      for (const a of live) for (const b of live) {
        if (a === b || !a.alive || !b.alive || a.mass < b.mass * 1.15 || (b === me && fx.bouclier)) continue;
        if (Math.hypot(a.x - b.x, a.y - b.y) < rad(a.mass) - rad(b.mass) * 0.4) {
          a.mass += b.mass * 0.85; b.alive = false;
          if (a === me) {
            kills++; combo++; comboT = 2.5; const bonus = combo > 1 ? Math.round(b.mass * 0.25 * (combo - 1)) : 0; me.mass += bonus;
            sfx.ok(); vibrate(25); ctx.pop(combo > 1 ? `COMBO ×${combo} +${bonus}` : `Miam ! ${b.name}`, sx(me.x), sy(me.y) - rad(me.mass) * cam.z - 20, combo > 1 ? '#ffd23f' : '#3ddc97', combo > 1 ? 30 : 24);
            feed(`Tu as avalé ${b.name}`);
          } else if (b !== me && Math.hypot(b.x - me.x, b.y - me.y) < 900) feed(`${a.name} a avalé ${b.name}`);
          if (b === me) { eatenBy = a.name; sfx.boom(); vibrate(150); ctx.shake(10); ctx.flash('rgba(255,61,90,.4)'); }
          if (b.bot) ctx.timeout(() => { const iq = b.iq; Object.assign(b, mk(b.name, titans ? rng.float(25, 60) : rng.float(10, 30), b.color, b.sides), { iq: Math.min(1.25, iq + 0.05) }); }, 2500);
        }
      }
      peak = Math.max(peak, me.mass);
      // Caméra
      const targetZ = clamp(1.25 * Math.min(view.w, view.h) / 700 / Math.pow(rad(me.mass) / 18, 0.45), 0.25, 2);
      cam.x += (me.x - cam.x) * Math.min(1, dt * 8); cam.y += (me.y - cam.y) * Math.min(1, dt * 8); cam.z += (targetZ - cam.z) * Math.min(1, dt * 2);
      draw();
      const left = Math.max(0, DURATION - t);
      ctx.hud({ time: `${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, '0')}`, mass: `${Math.round(me.mass)} kg`, kills: kills ? `🍽️ ${kills}` : null, dash: dashCd > 0 ? `💨 ${Math.ceil(dashCd)} s` : '💨 prêt', fx: Object.keys(fx).map((k) => PW[k].icon).join(' ') || null });
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
      g.font = '34px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      for (const p of powers) { const k = 1 + Math.sin(t * 4 + p.x) * 0.12; g.fillStyle = 'rgba(255,210,63,.18)'; g.beginPath(); g.arc(p.x, p.y, 26 * k, 0, 7); g.fill(); g.fillStyle = '#fff'; g.fillText(PW[p.k].icon, p.x, p.y); }
      for (const b of all().sort((a, c) => a.mass - c.mass)) {
        const r = rad(b.mass);
        g.shadowColor = b.color; g.shadowBlur = 20; g.fillStyle = b === me ? '#ffffff' : b.color; poly(b.x, b.y, r, b.sides, b.rot); g.fill(); g.shadowBlur = 0;
        g.lineWidth = Math.max(2, r * 0.08); g.strokeStyle = b === me ? '#7c5cff' : 'rgba(0,0,0,.25)'; g.stroke();
        if (b === me && fx.bouclier) { g.strokeStyle = `rgba(76,201,240,${0.5 + Math.sin(t * 10) * 0.3})`; g.lineWidth = 6 / cam.z; g.beginPath(); g.arc(b.x, b.y, r + 14, 0, 7); g.stroke(); }
        if (b === me && fx.aimant) { g.strokeStyle = 'rgba(255,92,122,.25)'; g.lineWidth = 2 / cam.z; g.beginPath(); g.arc(b.x, b.y, 320, 0, 7); g.stroke(); }
        g.fillStyle = b === me ? '#1b1450' : 'rgba(0,0,0,.65)'; g.font = `700 ${Math.max(12, r * 0.38)}px Outfit Variable, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(b.name, b.x, b.y);
        if (b !== me && b.mass > me.mass * 1.15) { g.strokeStyle = 'rgba(255,92,122,.8)'; g.lineWidth = 3 / cam.z; g.setLineDash([8, 6]); g.beginPath(); g.arc(b.x, b.y, r + 8, 0, 7); g.stroke(); g.setLineDash([]); }
      }
      g.restore();
      // Fil des repas
      g.font = '600 13px Outfit Variable, sans-serif'; g.textAlign = 'right'; g.textBaseline = 'top';
      killFeed.forEach((f, i) => { g.globalAlpha = Math.min(1, f.t); g.fillStyle = f.txt.startsWith('Tu') ? '#3ddc97' : '#b6b9d6'; g.fillText(f.txt, view.w - 14, 14 + i * 18); }); g.globalAlpha = 1;
      // Flèche vers le bonus le plus proche
      const np = powers.reduce((a, p) => (Math.hypot(p.x - me.x, p.y - me.y) < Math.hypot(a.x - me.x, a.y - me.y) ? p : a), powers[0]);
      const px = sx(np.x), py = sy(np.y);
      if (me.alive && (px < 0 || py < 0 || px > view.w || py > view.h)) { const an = Math.atan2(py - view.h / 2, px - view.w / 2); const rr = Math.min(view.w, view.h) / 2 - 30; g.font = '22px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.globalAlpha = 0.7; g.fillText(PW[np.k].icon, view.w / 2 + Math.cos(an) * rr, view.h / 2 + Math.sin(an) * rr); g.globalAlpha = 1; }
      // Classement
      const top = all().sort((a, b) => b.mass - a.mass).slice(0, 5);
      g.font = '600 13px Outfit Variable, sans-serif'; g.textAlign = 'left'; g.textBaseline = 'top';
      g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.roundRect(12, 12, 150, 24 + top.length * 20, 12); g.fill();
      g.fillStyle = '#b6b9d6'; g.fillText('CLASSEMENT', 24, 20);
      top.forEach((b, i) => { g.fillStyle = b === me ? '#ffb547' : '#fff'; g.fillText(`${i + 1}. ${b.name}`, 24, 40 + i * 20); g.textAlign = 'right'; g.fillText(Math.round(b.mass), 150, 40 + i * 20); g.textAlign = 'left'; });
    }
    function finish() {
      const mass = Math.round(me.alive ? me.mass : peak);
      const ranking = all().sort((a, b) => b.mass - a.mass);
      const first = me.alive && ranking[0] === me;
      const score = mass + kills * 15 + (first ? 100 : 0) + (me.alive ? 50 : 0);
      ctx.end({
        score, display: `${score} pts`, emoji: first ? '👑' : me.alive ? '🔷' : '💀', win: first, board: titans ? 'titans' : null,
        title: first ? 'Le plus gros de l’arène !' : me.alive ? 'Temps écoulé !' : `Dévoré par ${eatenBy || 'un plus gros'} !`,
        label: `${mass} kg${me.alive ? '' : ' (max)'} · ${kills} forme${kills > 1 ? 's' : ''} avalée${kills > 1 ? 's' : ''}${first ? ' · 1er +100' : ''}${me.alive ? ' · vivant +50' : ''}`,
        feats: [first && 'roi', kills >= 5 && 'cannibale', peak >= 500 && 'titan', titans && me.alive && 'survivant'].filter(Boolean),
      });
    }
  },
};
