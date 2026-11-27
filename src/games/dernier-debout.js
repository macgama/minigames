import { h } from '../core/dom.js';
import { createCanvas, loop } from '../core/canvas.js';
import { sfx, vibrate } from '../core/sfx.js';
import { PCOLORS, PEMOJI } from '../core/players.js';

const KEYS = [['Space', 'KeyA'], ['Enter', 'KeyL'], ['KeyQ'], ['KeyP']];
const KEYLBL = ['Espace', 'Entrée', 'Q', 'P'];
const WIN_ROUNDS = 3, N = 4;
const POWERS = [{ id: 'big', icon: '💪', name: 'Costaud' }, { id: 'turbo', icon: '⚡', name: 'Turbo' }, { id: 'ice', icon: '🧊', name: 'Glissant' }];

export default {
  async start(ctx) {
    const humans = Number(ctx.mode || 1);
    const view = createCanvas(ctx.stage); ctx.onCleanup(view.destroy);
    const { g } = view;
    const wins = Array(N).fill(0);
    let roundNo = 0, survival = 0, pushes = 0, sumos = null, R0 = 42, R = 42, items = [], parts = [];
    const name = (i) => (i < humans ? (humans === 1 ? 'Toi' : `Joueur ${i + 1}`) : `Bot ${PEMOJI[i]}`);
    const dash = (s) => {
      if (!s?.alive || s.cd > 0) return;
      const pow = s.pw === 'turbo' ? 88 : 62;
      s.vx += Math.cos(s.ang) * pow; s.vy += Math.sin(s.ang) * pow; s.cd = s.pw === 'turbo' ? 0.3 : 0.55; s.spin *= -1; s.flash = 0.2;
      if (s.human) { sfx.pop(); vibrate(12); }
    };
    const corners = [{ left: '12px', bottom: '12px' }, { right: '12px', top: '12px', transform: 'rotate(180deg)' }, { right: '12px', bottom: '12px' }, { left: '12px', top: '12px', transform: 'rotate(180deg)' }];
    const score = h('div', { style: { position: 'absolute', top: '8px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '6px', zIndex: 3, pointerEvents: 'none' } });
    ctx.stage.append(score);
    const paintScore = () => score.replaceChildren(...wins.map((w, i) => h('span.chip', { style: { borderColor: PCOLORS[i] } }, `${PEMOJI[i]} ${'★'.repeat(w)}${'☆'.repeat(WIN_ROUNDS - w)}`)));
    for (let i = 0; i < humans; i++) {
      ctx.stage.append(h('button', { 'aria-label': `Foncer, ${name(i)}`, onpointerdown: (e) => { e.preventDefault(); dash(sumos?.[i]); },
        style: { position: 'absolute', zIndex: 3, width: 'clamp(84px,22vmin,130px)', aspectRatio: '1', borderRadius: '50%', border: `3px solid ${PCOLORS[i]}`, background: `radial-gradient(circle at 35% 30%, ${PCOLORS[i]}aa, ${PCOLORS[i]}33)`, color: '#fff', fontWeight: 800, fontSize: '15px', boxShadow: `0 0 30px ${PCOLORS[i]}55`, touchAction: 'none', ...corners[i] } },
        h('div', { style: { fontSize: '30px' } }, PEMOJI[i]), KEYLBL[i]));
    }
    ctx.on(window, 'keydown', (e) => { if (e.repeat || !sumos) return; KEYS.forEach((ks, i) => { if (i < humans && ks.includes(e.code)) { e.preventDefault(); dash(sumos[i]); } }); });

    const bot = (s, dt) => {
      if (s.cd > 0) return;
      const d = Math.hypot(s.x, s.y);
      const facing = (tx, ty) => { const a = Math.atan2(ty - s.y, tx - s.x); return Math.abs(((a - s.ang + Math.PI * 3) % (Math.PI * 2)) - Math.PI); };
      if (d > R - 12 && facing(0, 0) < 0.35) return dash(s);
      const skill = 0.6 + roundNo * 0.12;
      for (const it of items) if (Math.hypot(it.x - s.x, it.y - s.y) < 30 && facing(it.x, it.y) < 0.2 && Math.random() < dt * 6 * skill) return dash(s);
      for (const o of sumos) if (o !== s && o.alive && Math.hypot(o.x - s.x, o.y - s.y) < 40 && facing(o.x, o.y) < 0.12 + 0.1 * skill && Math.random() < dt * 8 * skill) return dash(s);
    };
    const draw = () => {
      const cx = view.w / 2, cy = view.h / 2 + 10, scale = Math.min(view.w, view.h - 40) / 100;
      g.clearRect(0, 0, view.w, view.h);
      g.save(); g.translate(cx, cy); g.scale(scale, scale);
      const grd = g.createRadialGradient(0, 0, 0, 0, 0, R);
      grd.addColorStop(0, '#ffe1b0'); grd.addColorStop(0.85, '#f1b770'); grd.addColorStop(1, '#c57b3a');
      g.shadowColor = 'rgba(255,170,80,.5)'; g.shadowBlur = 40; g.fillStyle = grd; g.beginPath(); g.arc(0, 0, R, 0, 7); g.fill(); g.shadowBlur = 0;
      g.strokeStyle = '#fff6'; g.lineWidth = 0.8; g.beginPath(); g.arc(0, 0, R - 2.5, 0, 7); g.stroke();
      if (R < 30) { g.strokeStyle = `rgba(255,60,90,${0.4 + 0.3 * Math.sin(performance.now() / 120)})`; g.lineWidth = 1.5; g.beginPath(); g.arc(0, 0, R, 0, 7); g.stroke(); }
      g.font = `7px ${'"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'}`; g.textAlign = 'center'; g.textBaseline = 'middle';
      for (const it of items) { g.fillStyle = 'rgba(255,255,255,.6)'; g.beginPath(); g.arc(it.x, it.y, 4.5 + Math.sin(performance.now() / 200) * 0.5, 0, 7); g.fill(); g.fillText(it.p.icon, it.x, it.y + 0.4); }
      for (const p of parts) { g.globalAlpha = Math.max(0, p.life); g.fillStyle = p.c; g.beginPath(); g.arc(p.x, p.y, 0.9, 0, 7); g.fill(); } g.globalAlpha = 1;
      for (const s of [...sumos].sort((a, b) => a.alive - b.alive)) {
        const k = s.alive ? 1 : Math.max(0, 1 - s.fall * 1.5); if (k <= 0) continue;
        const r = s.r * (s.pw === 'big' ? 1.35 : 1);
        g.save(); g.translate(s.x, s.y); g.scale(k, k); g.globalAlpha = k;
        if (s.alive) { g.fillStyle = 'rgba(0,0,0,.18)'; g.beginPath(); g.ellipse(1, 2, r, r * 0.9, 0, 0, 7); g.fill(); }
        g.save(); g.rotate(s.ang); g.fillStyle = s.color; g.globalAlpha = k * (s.cd > 0 ? 0.35 : 0.95);
        g.beginPath(); g.moveTo(r + 5.5, 0); g.lineTo(r + 1.5, -2.6); g.lineTo(r + 1.5, 2.6); g.fill(); g.restore();
        g.fillStyle = s.color; g.beginPath(); g.arc(0, 0, r, 0, 7); g.fill();
        g.strokeStyle = s.flash > 0 ? '#fff' : s.pw ? '#ffd23f' : 'rgba(0,0,0,.25)'; g.lineWidth = s.pw ? 1.6 : 1; g.stroke();
        g.font = `${r * 1.25}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`; g.fillText(s.emoji, 0, 0.5);
        if (s.pw) { g.font = `${r * 0.7}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`; g.fillText(POWERS.find((p) => p.id === s.pw).icon, r * 0.8, -r * 0.8); }
        g.restore();
      }
      g.restore();
    };

    while (ctx.alive && Math.max(...wins) < WIN_ROUNDS) {
      roundNo++; R = R0; items = []; parts = [];
      sumos = Array.from({ length: N }, (_, i) => {
        const a = (i / N) * Math.PI * 2 + Math.PI / 4;
        return { id: i, x: Math.cos(a) * 24, y: Math.sin(a) * 24, vx: 0, vy: 0, ang: a + Math.PI, spin: (i % 2 ? -1 : 1) * (3.2 + roundNo * 0.15), r: 6.2, cd: 0, alive: true, fall: 0, human: i < humans, color: PCOLORS[i], emoji: PEMOJI[i], outAt: 0, flash: 0, pw: null, pwT: 0, lastHit: -1 };
      });
      paintScore(); ctx.hud({ round: `Manche ${roundNo}` });
      draw();
      await ctx.countdown(roundNo === 1 ? 3 : 2);
      if (!ctx.alive) return;
      const winner = await new Promise((resolve) => {
        let t = 0, over = false, nextItem = 4;
        const stop = loop((dt) => {
          t += dt;
          R = Math.max(18, R0 - Math.max(0, t - 5) * 0.6);
          nextItem -= dt;
          if (nextItem <= 0 && items.length < 2) { nextItem = ctx.rng.float(4, 7); const a = ctx.rng.float(0, 7), d = ctx.rng.float(0, R * 0.6); items.push({ x: Math.cos(a) * d, y: Math.sin(a) * d, p: ctx.rng.pick(POWERS) }); }
          for (const s of sumos) {
            if (!s.alive) { s.fall += dt; s.x += s.vx * dt * 0.3; s.y += s.vy * dt * 0.3; continue; }
            s.ang += s.spin * dt; s.cd -= dt; s.flash -= dt;
            if (s.pw && (s.pwT -= dt) <= 0) s.pw = null;
            if (!s.human) bot(s, dt);
            s.x += s.vx * dt; s.y += s.vy * dt; const f = Math.pow(s.pw === 'ice' ? 0.35 : 0.06, dt); s.vx *= f; s.vy *= f;
            for (let i = items.length - 1; i >= 0; i--) if (Math.hypot(items[i].x - s.x, items[i].y - s.y) < s.r + 3) { s.pw = items[i].p.id; s.pwT = 6; items.splice(i, 1); if (s.human) { sfx.ok(); vibrate(20); } else sfx.tick(); }
          }
          for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
            const a = sumos[i], b = sumos[j]; if (!a.alive || !b.alive) continue;
            const ra = a.r * (a.pw === 'big' ? 1.35 : 1), rb = b.r * (b.pw === 'big' ? 1.35 : 1);
            const ma = a.pw === 'big' ? 2.2 : 1, mb = b.pw === 'big' ? 2.2 : 1;
            const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), m = ra + rb;
            if (d < m && d > 0) {
              const nx = dx / d, ny = dy / d, o2 = (m - d) / 2;
              a.x -= nx * o2; a.y -= ny * o2; b.x += nx * o2; b.y += ny * o2;
              const rel = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
              if (rel > 0) {
                const imp = (2 * rel) / (ma + mb) * 1.15; a.vx -= imp * mb * nx; a.vy -= imp * mb * ny; b.vx += imp * ma * nx; b.vy += imp * ma * ny;
                a.lastHit = b.id; b.lastHit = a.id;
                if (rel > 25) { sfx.tap(); if (a.human || b.human) vibrate(20); for (let k = 0; k < 8; k++) parts.push({ x: a.x + nx * ra, y: a.y + ny * ra, vx: (Math.random() - 0.5) * 40, vy: (Math.random() - 0.5) * 40, life: 0.6, c: '#fff' }); }
              }
            }
          }
          for (const p of parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 1.5; }
          parts = parts.filter((p) => p.life > 0);
          for (const s of sumos) if (s.alive && Math.hypot(s.x, s.y) > R + s.r * 0.3) {
            s.alive = false; s.outAt = t; sfx.bad(); vibrate(60);
            if (s.lastHit === 0 && humans === 1) pushes++;
            const sc = Math.min(view.w, view.h - 40) / 100; ctx.pop(s.human ? 'Éjecté !' : 'Dehors !', view.w / 2 + s.x * sc, view.h / 2 + 10 + s.y * sc, s.color, 20);
          }
          draw();
          const alive = sumos.filter((s) => s.alive);
          const humanAlive = sumos.some((s) => s.human && s.alive);
          if (!over && (alive.length <= 1 || (!humanAlive && humans === 1))) {
            over = true;
            if (humans === 1) survival += sumos[0].alive ? t : sumos[0].outAt;
            ctx.timeout(() => { stop(); resolve(alive.length === 1 ? alive[0] : alive.length && humans === 1 ? alive[ctx.rng.int(0, alive.length - 1)] : null); }, 900);
          }
        });
        ctx.onCleanup(stop);
      });
      if (!ctx.alive) return;
      if (winner) wins[winner.id]++;
      paintScore();
      const o = ctx.overlay(h('div', { style: { fontSize: '60px' } }, winner ? winner.emoji : '🌊'), h('div.big-msg', { style: { fontSize: '26px' } }, winner ? `${name(winner.id)} ${winner.id === 0 && humans === 1 ? 'gagnes' : 'gagne'} la manche` : 'Tout le monde dehors !'), h('p.muted', `Premier à ${WIN_ROUNDS} manches`));
      if (winner?.human) sfx.win();
      await ctx.wait(1700); o.remove();
    }
    if (!ctx.alive) return;
    const champ = wins.indexOf(Math.max(...wins));
    if (humans === 1) {
      const won = champ === 0;
      const sc = wins[0] * 300 + pushes * 60 + Math.round(survival * 3) + (won ? 300 : 0);
      return ctx.end({ score: sc, display: `${sc} pts`, emoji: won ? '🏆' : '🌊', win: won, title: won ? 'Yokozuna !' : `${name(champ)} remporte le tournoi`, label: `${wins[0]} manche${wins[0] > 1 ? 's' : ''} gagnée${wins[0] > 1 ? 's' : ''} · ${pushes} adversaire${pushes > 1 ? 's' : ''} éjecté${pushes > 1 ? 's' : ''}`,
        feats: [won && wins.slice(1).every((w) => w === 0) && 'invaincu', pushes >= 6 && 'bulldozer', won && 'yokozuna'].filter(Boolean) });
    }
    ctx.end({ multi: true, title: `${name(champ)} remporte le tournoi !`, emoji: PEMOJI[champ], display: '🏆', label: wins.map((w, i) => `${PEMOJI[i]} ${w}`).join('   '), win: champ < humans });
  },
};
