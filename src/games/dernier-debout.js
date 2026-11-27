import { h } from '../core/dom.js';
import { createCanvas, loop } from '../core/canvas.js';
import { sfx, vibrate } from '../core/sfx.js';
import { PCOLORS, PEMOJI } from '../core/players.js';

const KEYS = [['Space', 'KeyA'], ['Enter', 'KeyL'], ['KeyQ'], ['KeyP']];
const KEYLBL = ['Espace', 'Entrée', 'Q', 'P'];

export default {
  async start(ctx) {
    const humans = Number(ctx.mode || 1);
    const view = createCanvas(ctx.stage);
    ctx.onCleanup(view.destroy);
    const { g } = view;
    const N = 4;
    let R0, R, scale;
    const setup = () => { scale = Math.min(view.w, view.h) / 100; R0 = 42; };
    setup(); R = R0;
    const sumos = Array.from({ length: N }, (_, i) => {
      const a = (i / N) * Math.PI * 2 + Math.PI / 4;
      return { id: i, x: Math.cos(a) * 24, y: Math.sin(a) * 24, vx: 0, vy: 0, ang: a + Math.PI, spin: (i % 2 ? -1 : 1) * 3.2, r: 6.2, cd: 0, alive: true, fall: 0, human: i < humans, color: PCOLORS[i], emoji: PEMOJI[i], name: i < humans ? `Joueur ${i + 1}` : `Bot ${PEMOJI[i]}`, outAt: 0, flash: 0 };
    });
    let t = 0;
    const dash = (s) => {
      if (!s.alive || s.cd > 0) return;
      s.vx += Math.cos(s.ang) * 62; s.vy += Math.sin(s.ang) * 62; s.cd = 0.55; s.spin *= -1; s.flash = 0.2;
      if (s.human) { sfx.pop(); vibrate(12); }
    };
    // Boutons : un par joueur humain, dans un coin
    const corners = [{ left: '12px', bottom: '12px' }, { right: '12px', top: '12px', transform: 'rotate(180deg)' }, { right: '12px', bottom: '12px' }, { left: '12px', top: '12px', transform: 'rotate(180deg)' }];
    for (let i = 0; i < humans; i++) {
      const s = sumos[i];
      ctx.stage.append(h('button', { 'aria-label': `Foncer, ${s.name}`, onpointerdown: (e) => { e.preventDefault(); dash(s); },
        style: { position: 'absolute', zIndex: 3, width: 'clamp(84px,22vmin,130px)', aspectRatio: '1', borderRadius: '50%', border: `3px solid ${s.color}`, background: `radial-gradient(circle at 35% 30%, ${s.color}aa, ${s.color}33)`, color: '#fff', fontWeight: 800, fontSize: '15px', boxShadow: `0 0 30px ${s.color}55`, touchAction: 'none', ...corners[i] } },
        h('div', { style: { fontSize: '30px' } }, s.emoji), KEYLBL[i]));
    }
    ctx.on(window, 'keydown', (e) => { if (e.repeat) return; KEYS.forEach((ks, i) => { if (i < humans && ks.includes(e.code)) { e.preventDefault(); dash(sumos[i]); } }); });

    const bot = (s, dt) => {
      if (s.cd > 0) return;
      const d = Math.hypot(s.x, s.y);
      const facing = (tx, ty) => { const a = Math.atan2(ty - s.y, tx - s.x); let diff = Math.abs(((a - s.ang + Math.PI * 3) % (Math.PI * 2)) - Math.PI); return diff; };
      if (d > R - 12 && facing(0, 0) < 0.35) return dash(s);
      for (const o of sumos) if (o !== s && o.alive && Math.hypot(o.x - s.x, o.y - s.y) < 40 && facing(o.x, o.y) < 0.18 && Math.random() < dt * 8) return dash(s);
    };

    const draw = () => {
      const cx = view.w / 2, cy = view.h / 2; scale = Math.min(view.w, view.h) / 100;
      g.clearRect(0, 0, view.w, view.h);
      // Arène
      g.save(); g.translate(cx, cy); g.scale(scale, scale);
      const grd = g.createRadialGradient(0, 0, 0, 0, 0, R);
      grd.addColorStop(0, '#ffe1b0'); grd.addColorStop(0.85, '#f1b770'); grd.addColorStop(1, '#c57b3a');
      g.shadowColor = 'rgba(255,170,80,.5)'; g.shadowBlur = 40; g.fillStyle = grd; g.beginPath(); g.arc(0, 0, R, 0, 7); g.fill(); g.shadowBlur = 0;
      g.strokeStyle = '#fff6'; g.lineWidth = 0.8; g.beginPath(); g.arc(0, 0, R - 2.5, 0, 7); g.stroke();
      g.strokeStyle = '#8a4a1a55'; g.lineWidth = 0.6; g.beginPath(); g.moveTo(-6, -4); g.lineTo(-6, 4); g.moveTo(6, -4); g.lineTo(6, 4); g.stroke();
      // Sumos
      for (const s of [...sumos].sort((a, b) => a.alive - b.alive)) {
        const k = s.alive ? 1 : Math.max(0, 1 - s.fall * 1.5);
        if (k <= 0) continue;
        g.save(); g.translate(s.x, s.y); g.scale(k, k); g.globalAlpha = k;
        if (s.alive) { g.fillStyle = 'rgba(0,0,0,.18)'; g.beginPath(); g.ellipse(1, 2, s.r, s.r * 0.9, 0, 0, 7); g.fill(); }
        // flèche de visée
        g.save(); g.rotate(s.ang); g.fillStyle = s.color; g.globalAlpha = k * (s.cd > 0 ? 0.35 : 0.95);
        g.beginPath(); g.moveTo(s.r + 5.5, 0); g.lineTo(s.r + 1.5, -2.6); g.lineTo(s.r + 1.5, 2.6); g.fill(); g.restore();
        g.fillStyle = s.color; g.beginPath(); g.arc(0, 0, s.r, 0, 7); g.fill();
        g.strokeStyle = s.flash > 0 ? '#fff' : 'rgba(0,0,0,.25)'; g.lineWidth = 1; g.stroke();
        g.font = `${s.r * 1.25}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(s.emoji, 0, 0.5);
        g.restore();
      }
      g.restore();
    };

    draw();
    await ctx.countdown();
    if (!ctx.alive) return;
    let over = false;
    const stop = loop((dt) => {
      t += dt;
      R = Math.max(20, R0 - Math.max(0, t - 6) * 0.55);
      for (const s of sumos) {
        if (!s.alive) { s.fall += dt; s.x += s.vx * dt * 0.3; s.y += s.vy * dt * 0.3; continue; }
        s.ang += s.spin * dt; s.cd -= dt; s.flash -= dt;
        if (!s.human) bot(s, dt);
        s.x += s.vx * dt; s.y += s.vy * dt; const f = Math.pow(0.06, dt); s.vx *= f; s.vy *= f;
      }
      // Collisions
      for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
        const a = sumos[i], b = sumos[j]; if (!a.alive || !b.alive) continue;
        const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), m = a.r + b.r;
        if (d < m && d > 0) {
          const nx = dx / d, ny = dy / d, over2 = (m - d) / 2;
          a.x -= nx * over2; a.y -= ny * over2; b.x += nx * over2; b.y += ny * over2;
          const rel = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
          if (rel > 0) { const imp = rel * 1.15; a.vx -= imp * nx; a.vy -= imp * ny; b.vx += imp * nx; b.vy += imp * ny; if (rel > 25) { sfx.tap(); if (a.human || b.human) vibrate(20); } }
        }
      }
      for (const s of sumos) if (s.alive && Math.hypot(s.x, s.y) > R + s.r * 0.3) { s.alive = false; s.outAt = t; sfx.bad(); vibrate(60); }
      draw();
      const alive = sumos.filter((s) => s.alive);
      ctx.hud({ alive: `${alive.length} en piste` });
      const humanAlive = sumos.some((s) => s.human && s.alive);
      if (!over && (alive.length <= 1 || (!humanAlive && humans === 1))) { over = true; ctx.timeout(() => { stop(); finish(alive); }, 900); }
    });
    ctx.onCleanup(stop);

    function finish(alive) {
      const winner = alive.length === 1 ? alive[0] : null;
      if (humans === 1) {
        const me = sumos[0]; const won = winner === me;
        const rank = won ? 1 : 1 + sumos.filter((s) => s !== me && (s.alive || s.outAt > me.outAt)).length;
        const score = won ? 1000 + Math.round(t * 5) : Math.round((me.outAt || t) * 10);
        return ctx.end({ score, display: won ? 'Victoire' : `${rank}e`, emoji: won ? '🏆' : '🌊', win: won, title: won ? 'Dernier debout !' : 'Éjecté de l’arène', label: `Tenu ${(me.outAt || t).toFixed(1).replace('.', ',')} s`, share: `🤼 Le Dernier Debout : ${won ? 'victoire' : rank + 'e place'} ! Qui me pousse dehors ?` });
      }
      ctx.end({ title: winner ? `${winner.name} gagne !` : 'Tout le monde dehors !', emoji: winner ? winner.emoji : '🌊', display: winner ? '🏆' : '=', label: winner?.human === false ? 'Les bots ont gagné cette fois…' : 'Revanche ?', win: !!winner?.human });
    }
  },
};
