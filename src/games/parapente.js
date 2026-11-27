import { createCanvas, loop } from '../core/canvas.js';
import { sfx, vibrate } from '../core/sfx.js';
import { makeRng, todayKey } from '../core/rng.js';

const CEIL = 3300, VIEW_M = 1500;

export default {
  start(ctx) {
    const mode = ctx.mode || 'classic', vent = mode === 'vent';
    const R = mode === 'jour' ? makeRng('parapente-' + todayKey()) : ctx.rng;
    const view = createCanvas(ctx.stage, { onResize: () => {} }); ctx.onCleanup(view.destroy);
    const { g } = view;
    // Relief : somme de sinusoïdes tirées au sort
    const waves = Array.from({ length: 4 }, (_, i) => ({ a: [520, 300, 160, 70][i] * R.float(0.7, 1.2), f: [1 / 2600, 1 / 1100, 1 / 480, 1 / 170][i] * R.float(0.8, 1.2), p: R.float(0, 6.28) }));
    const ground = (x) => { const k = Math.min(1, x / 4000); let y = 900 + k * 500; for (const w of waves) y += w.a * Math.sin(x * w.f + w.p); return Math.max(150, y); };
    const thermals = [], storms = [];
    let genX = 600;
    const gen = (upTo) => {
      while (genX < upTo) {
        const k = genX / 1000;
        genX += (vent ? 1300 : 950) + R.float(0, vent ? 900 : 700) + k * 25;
        thermals.push({ x: genX, w: R.float(140, 260) * Math.max(0.6, 1 - k * 0.02), lift: R.float(70, 105) * Math.max(0.65, 1 - k * 0.015), ph: R.float(0, 6) });
        if (k > 1.5 && R.float(0, 1) < Math.min(0.75, 0.25 + k * 0.04)) storms.push({ x: genX + R.float(300, 600), y: R.float(1500, 2900), w: R.float(160, 300), h: R.float(140, 260) });
      }
    };
    gen(4000);
    const me = { x: 0, alt: 2100, vy: 0, dive: false, inThermal: null, gain: 0, bestGain: 0, shake: 0 };
    let over = false, t = 0, wind = 0, windT = 0, started = false, parts = [];
    const down = () => { me.dive = true; started = true; };
    const up = () => { me.dive = false; };
    ctx.on(view.canvas, 'pointerdown', (e) => { e.preventDefault(); down(); });
    ctx.on(window, 'pointerup', up); ctx.on(window, 'pointercancel', up);
    ctx.on(window, 'keydown', (e) => { if (e.code === 'Space' || e.key === 'ArrowDown') { e.preventDefault(); down(); } });
    ctx.on(window, 'keyup', (e) => { if (e.code === 'Space' || e.key === 'ArrowDown') up(); });

    const step = (dt) => {
      if (!started) { t += dt; return; }
      t += dt;
      if (vent) { windT -= dt; if (windT <= 0) { wind = R.float(-60, 25); windT = R.float(1.5, 4); } }
      const th = thermals.find((q) => Math.abs(q.x - me.x) < q.w / 2);
      // Dans un thermique, relâcher = spiraler (on avance peu, on monte)
      const vx = (me.dive ? 260 : th ? 45 : 165) + wind * (th && !me.dive ? 0.2 : 1);
      let lift = -(me.dive ? 60 : 28);
      if (th) { const center = 1 - Math.abs(q2(th.x - me.x)) / (th.w / 2); lift += th.lift * (0.5 + center * 0.5) * Math.max(0, 1 - me.alt / CEIL) * 1.5; if (me.inThermal !== th) { me.inThermal = th; me.gain = 0; sfx.ok(); } me.gain += Math.max(0, lift) * dt; me.bestGain = Math.max(me.bestGain, me.gain); }
      else me.inThermal = null;
      const st = storms.find((s) => Math.abs(s.x - me.x) < s.w / 2 && Math.abs(s.y - me.alt) < s.h / 2);
      if (st) { lift -= 160; me.shake = 1; if (R.float(0, 1) < 0.08) { sfx.bad(); vibrate(30); ctx.shake(5); } }
      if (vent) lift += Math.sin(t * 3.1) * 12 + Math.sin(t * 7.3) * 8;
      me.vy += (lift - me.vy) * Math.min(1, dt * 3);
      me.x += vx * dt; me.alt = Math.min(CEIL, me.alt + me.vy * dt);
      me.shake *= 0.9;
      gen(me.x + 4000);
      if (R.float(0, 1) < 0.5) for (const q of thermals) if (Math.abs(q.x - me.x) < VIEW_M) parts.push({ x: q.x + R.float(-q.w / 2, q.w / 2), alt: ground(q.x) + R.float(0, 300), life: 2.5 });
      for (const p of parts) { p.alt += 140 * dt; p.life -= dt; } parts = parts.filter((p) => p.life > 0);
      ctx.hud({ km: `${(me.x / 1000).toFixed(1).replace('.', ',')} km`, alt: `⛰️ ${Math.round(me.alt)} m` });
      if (me.alt <= ground(me.x) + 8) crash();
    };
    const q2 = (v) => v;
    const crash = () => {
      if (over) return; over = true; sfx.bad(); vibrate([50, 40, 80]); ctx.shake(8);
      const km = Math.round(me.x / 100) / 10;
      ctx.timeout(() => ctx.end({
        score: km, display: `${km.toFixed(1).replace('.', ',')} km`, emoji: '🪂', board: mode === 'classic' ? null : mode,
        title: km >= 10 ? 'Traversée des Alpes !' : km >= 5 ? 'Beau cross' : km >= 2 ? 'Joli vol' : 'Atterrissage un peu tôt',
        label: `Meilleur thermique : +${Math.round(me.bestGain)} m`,
        feats: [me.bestGain >= 400 && 'thermique', km >= 10 && 'dix', vent && km >= 5 && 'vent'].filter(Boolean),
      }), 800);
    };
    const draw = () => {
      const W = view.w, H = view.h, s = W / VIEW_M, camX = me.x - VIEW_M * 0.3;
      const Y = (alt) => H - (alt / (CEIL + 300)) * H;
      const sky = g.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#2a6fdb'); sky.addColorStop(0.7, '#8ec5ff'); sky.addColorStop(1, '#ffe2b8');
      g.fillStyle = sky; g.fillRect(0, 0, W, H);
      // Montagnes lointaines (parallaxe)
      g.fillStyle = 'rgba(70,100,160,.45)'; g.beginPath(); g.moveTo(0, H);
      for (let x = 0; x <= W; x += 8) { const wx = camX * 0.4 + x / s; g.lineTo(x, Y(ground(wx * 1.7 + 9000) * 0.9 + 300)); } g.lineTo(W, H); g.fill();
      // Thermiques
      for (const q of thermals) { const sx = (q.x - camX) * s; if (sx < -200 || sx > W + 200) continue; const gr = g.createLinearGradient(sx - q.w * s / 2, 0, sx + q.w * s / 2, 0); gr.addColorStop(0, 'rgba(255,200,80,0)'); gr.addColorStop(0.5, 'rgba(255,200,80,.18)'); gr.addColorStop(1, 'rgba(255,200,80,0)'); g.fillStyle = gr; g.fillRect(sx - q.w * s / 2, Y(CEIL), q.w * s, Y(0) - Y(CEIL)); }
      g.fillStyle = 'rgba(255,230,160,.8)'; for (const p of parts) { const sx = (p.x - camX) * s; g.globalAlpha = Math.min(1, p.life); g.fillRect(sx, Y(p.alt), 2, 6); } g.globalAlpha = 1;
      // Orages
      for (const st of storms) { const sx = (st.x - camX) * s; if (sx < -300 || sx > W + 300) continue; const sy = Y(st.y), rw = (st.w * s) / 2, rh = (st.h / (CEIL + 300)) * H / 2; g.fillStyle = '#3b3f55'; for (let k = -2; k <= 2; k++) { g.beginPath(); g.ellipse(sx + k * rw * 0.45, sy + Math.abs(k) * rh * 0.15, rw * 0.5, rh * 0.75, 0, 0, 7); g.fill(); } if (Math.sin(t * 9 + st.x) > 0.93) { g.strokeStyle = '#ffd23f'; g.lineWidth = 3; g.beginPath(); g.moveTo(sx, sy + rh * 0.5); g.lineTo(sx - 8, sy + rh * 1.2); g.lineTo(sx + 4, sy + rh * 1.2); g.lineTo(sx - 6, sy + rh * 2); g.stroke(); } }
      // Relief + neige
      g.beginPath(); g.moveTo(0, H); const pts = [];
      for (let x = 0; x <= W; x += 6) { const a = ground(camX + x / s); pts.push([x, a]); g.lineTo(x, Y(a)); }
      g.lineTo(W, H); const tg = g.createLinearGradient(0, Y(2400), 0, H); tg.addColorStop(0, '#5f6f5a'); tg.addColorStop(0.5, '#3f7a4a'); tg.addColorStop(1, '#2c5a35'); g.fillStyle = tg; g.fill();
      g.fillStyle = '#f4f8ff'; for (const [x, a] of pts) if (a > 1750) g.fillRect(x, Y(a), 6, Math.min(30, (a - 1750) / 10));
      // Repères de distance
      g.fillStyle = 'rgba(255,255,255,.8)'; g.font = '700 12px Outfit, sans-serif'; g.textAlign = 'center';
      for (let k = Math.ceil(camX / 1000); k * 1000 < camX + VIEW_M; k++) if (k > 0) { const sx = (k * 1000 - camX) * s; g.fillRect(sx - 1, Y(ground(k * 1000)) - 26, 2, 26); g.fillText(`${k} km`, sx, Y(ground(k * 1000)) - 30); }
      // Parapente
      const gx = (me.x - camX) * s + (me.shake ? R.float(-3, 3) * me.shake : 0), gy = Y(me.alt);
      g.save(); g.translate(gx, gy); g.rotate(me.dive ? 0.35 : 0.08);
      g.fillStyle = '#ff4fa3'; g.beginPath(); g.ellipse(0, -22, 26, 9, 0, Math.PI, 0); g.fill(); g.fillStyle = '#ffd23f'; g.fillRect(-26, -23, 52, 3);
      g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 1; g.beginPath(); g.moveTo(-22, -21); g.lineTo(0, 0); g.lineTo(22, -21); g.stroke();
      g.fillStyle = '#1b1450'; g.beginPath(); g.arc(0, 2, 5, 0, 7); g.fill();
      g.restore();
      if (me.inThermal) { g.fillStyle = '#ffd23f'; g.font = '800 14px Outfit, sans-serif'; g.fillText(`↑ +${Math.round(me.gain)} m`, gx, gy - 40); }
      if (!started) { g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(0, H * 0.18 - 34, W, 68); g.fillStyle = '#fff'; g.font = '800 18px Outfit, sans-serif'; g.fillText('Maintiens pour piquer · relâche pour planer', W / 2, H * 0.18 - 4); g.font = '600 14px Outfit, sans-serif'; g.fillText('Dans les colonnes dorées, relâche pour monter', W / 2, H * 0.18 + 20); }
    };
    ctx.hud({ km: '0,0 km', alt: '⛰️ 2100 m' });
    const stop = loop((dt) => { if (!over) { step(dt / 2); step(dt / 2); } draw(); });
    ctx.onCleanup(stop);
  },
};
