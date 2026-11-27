import { h } from '../core/dom.js';
import { createCanvas, loop, clamp } from '../core/canvas.js';
import { sfx, vibrate } from '../core/sfx.js';
import { rng } from '../core/rng.js';

export default {
  async start(ctx) {
    const view = createCanvas(ctx.stage); ctx.onCleanup(view.destroy);
    const { g } = view;
    let phi = 0.02, w = 0, t = 0, u = 0, tiltU = null, wind = 0, windT = 0, fallen = false, fallT = 0;
    const keys = new Set();
    ctx.on(window, 'keydown', (e) => keys.add(e.code)); ctx.on(window, 'keyup', (e) => keys.delete(e.code));
    let hold = 0;
    const btn = (d) => h('button.btn', { 'aria-label': d < 0 ? 'Pencher à gauche' : 'Pencher à droite', style: { width: '84px', height: '84px', fontSize: '30px', pointerEvents: 'auto', touchAction: 'none' }, onpointerdown: (e) => { e.preventDefault(); hold = d; }, onpointerup: () => (hold = 0), onpointerleave: () => (hold = 0), onpointercancel: () => (hold = 0) }, d < 0 ? '←' : '→');
    const tiltBtn = h('button.btn.btn-sm', { style: { pointerEvents: 'auto' }, onclick: async () => {
      try { if (typeof DeviceOrientationEvent?.requestPermission === 'function' && (await DeviceOrientationEvent.requestPermission()) !== 'granted') return; ctx.on(window, 'deviceorientation', (e) => { if (e.gamma != null) tiltU = clamp(e.gamma / 25, -1, 1); }); tiltBtn.textContent = '📱 Inclinaison active'; } catch { tiltBtn.textContent = 'Indisponible'; }
    } }, '📱 Activer l’inclinaison');
    ctx.stage.append(h('div', { style: { position: 'absolute', left: 0, right: 0, bottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 14px', zIndex: 3, pointerEvents: 'none' } }, btn(-1), 'DeviceOrientationEvent' in window ? tiltBtn : h('span'), btn(1)));
    const clouds = Array.from({ length: 6 }, () => ({ x: rng.float(0, 1), y: rng.float(0.05, 0.45), s: rng.float(0.6, 1.4) }));
    draw();
    await ctx.countdown();
    if (!ctx.alive) return;
    const stop = loop((dt) => {
      if (!fallen) {
        t += dt;
        const k = (keys.has('ArrowRight') || keys.has('KeyD')) - (keys.has('ArrowLeft') || keys.has('KeyA'));
        const target = tiltU ?? (k || hold);
        u += (target - u) * Math.min(1, dt * 10);
        windT -= dt; if (windT <= 0) { windT = rng.float(1, 2.6); wind = rng.float(-1, 1) * (0.6 + t * 0.06); }
        const acc = 3.2 * Math.sin(phi) + 5.2 * u * Math.cos(phi) + wind - 0.9 * w;
        w += acc * dt; phi += w * dt;
        if (Math.abs(phi) > 1.15) { fallen = true; sfx.lose(); vibrate([80, 40, 200]); }
        ctx.hud({ time: t.toFixed(1).replace('.', ',') + ' s', wind: `💨 ${wind > 0 ? '→' : '←'} ${Math.abs(wind).toFixed(1)}` });
        if (Math.abs(phi) > 0.75 && (t * 6 | 0) % 2) sfx.tick();
      } else {
        fallT += dt; w += 6 * Math.sign(phi) * dt; phi += w * dt;
        if (fallT > 1.1) { stop(); return finish(); }
      }
      clouds.forEach((c) => (c.x = (c.x + wind * dt * 0.02 + 1.2) % 1.2 - 0.1));
      draw();
    });
    ctx.onCleanup(stop);
    function draw() {
      const W = view.w, H = view.h, base = { x: W / 2, y: H * 0.62 }, L = Math.min(H * 0.32, 220);
      const sky = g.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#1d2a6b'); sky.addColorStop(1, '#ff8fa3'); g.fillStyle = sky; g.fillRect(0, 0, W, H);
      g.fillStyle = 'rgba(255,255,255,.18)'; clouds.forEach((c) => { const x = c.x * W, y = c.y * H; for (const [dx, r] of [[0, 26], [26, 20], [-24, 18]]) { g.beginPath(); g.arc(x + dx * c.s, y, r * c.s, 0, 7); g.fill(); } });
      g.fillStyle = '#141838'; g.beginPath(); g.moveTo(0, H); g.lineTo(0, H * 0.78); g.lineTo(W * 0.18, H * 0.7); g.lineTo(W * 0.32, H * 0.8); g.lineTo(W * 0.55, H * 0.68); g.lineTo(W * 0.8, H * 0.79); g.lineTo(W, H * 0.72); g.lineTo(W, H); g.fill();
      g.strokeStyle = '#e8e8ff'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, base.y + 4); g.quadraticCurveTo(W / 2, base.y + 18, W, base.y + 4); g.stroke();
      g.save(); g.translate(base.x, base.y + 10); g.rotate(phi);
      g.strokeStyle = '#fff'; g.lineCap = 'round'; g.lineWidth = 7;
      g.beginPath(); g.moveTo(-10, 0); g.lineTo(0, -L * 0.45); g.lineTo(10, 0); g.stroke();
      g.beginPath(); g.moveTo(0, -L * 0.45); g.lineTo(0, -L * 0.85); g.stroke();
      g.strokeStyle = '#ffb547'; g.lineWidth = 5; g.beginPath(); g.moveTo(-L * 0.7, -L * 0.7 - u * 12); g.lineTo(L * 0.7, -L * 0.7 + u * 12); g.stroke();
      g.fillStyle = '#ff4fa3'; [-1, 1].forEach((s) => { g.beginPath(); g.arc(s * L * 0.7, -L * 0.7 + s * u * 12, 8, 0, 7); g.fill(); });
      g.fillStyle = '#fff'; g.beginPath(); g.arc(0, -L * 0.85 - 18, 18, 0, 7); g.fill();
      g.restore();
      const danger = Math.min(1, Math.abs(phi) / 1.15);
      g.fillStyle = `rgba(255,60,90,${danger * danger * 0.35})`; g.fillRect(0, 0, W, H);
    }
    function finish() {
      ctx.end({ score: Math.round(t * 10), display: `${t.toFixed(1).replace('.', ',')} s`, emoji: '🤸', title: t > 40 ? 'Funambule pro' : t > 20 ? 'Bel équilibre' : 'Plouf', label: 'Temps tenu sur le fil', win: t > 30, share: `🤸 Équilibriste : ${t.toFixed(1)} s sur le fil. Tu tiens plus longtemps ?` });
    }
  },
};
