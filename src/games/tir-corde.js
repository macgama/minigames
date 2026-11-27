import { h } from '../core/dom.js';
import { sfx, vibrate, tone } from '../core/sfx.js';
import { createCanvas, loop } from '../core/canvas.js';

export default {
  start(ctx) {
    const bot = ctx.mode === 'bot', R = ctx.rng;
    const view = createCanvas(ctx.stage, { onResize: () => {} }); ctx.onCleanup(view.destroy);
    const { g } = view;
    const wins = [0, 0]; let pos = 0, vel = 0, state = 'wait', taps = [0, 0], t = 0, roundT = 0, bestRate = 0, multi = [false, false], teamWin = false, botAcc = 0, roundN = 0;
    const active = [new Set(), new Set()]; const fx = [];
    const side = (y) => (y > view.h / 2 ? 0 : 1); // 0 = bleu (bas), 1 = rouge (haut)
    const pull = (k) => {
      if (state !== 'go') return;
      taps[k]++; vel += (k === 0 ? 1 : -1) * 0.022; vibrate(4);
      if (taps[k] % 2 === 0) tone(k ? 330 : 260, 0.03, { type: 'square', vol: 0.04 });
    };
    ctx.on(view.canvas, 'pointerdown', (e) => { e.preventDefault(); const k = side(view.pos(e).y); if (bot && k === 1) return; active[k].add(e.pointerId); if (active[k].size >= 2) multi[k] = true; pull(k); const p = view.pos(e); fx.push({ x: p.x, y: p.y, life: 0.4, k }); });
    const up = (e) => { active[0].delete(e.pointerId); active[1].delete(e.pointerId); };
    ctx.on(view.canvas, 'pointerup', up); ctx.on(view.canvas, 'pointercancel', up);
    ctx.on(window, 'keydown', (e) => { if (e.repeat) return; if (e.code === 'Space' || e.key === 'ArrowUp') pull(0); if (!bot && (e.key === 'a' || e.key === 'q')) pull(1); });
    const startRound = async () => {
      roundN++; pos = 0; vel = 0; taps = [0, 0]; multi = [false, false]; roundT = 0; state = 'count';
      for (const n of ['3', '2', '1']) { cd = n; sfx.count?.(); tone(500, 0.08, { vol: 0.1 }); await ctx.wait(600); if (!ctx.alive) return; }
      cd = 'TIREZ !'; state = 'go'; sfx.go(); ctx.timeout(() => (cd = ''), 600);
    };
    let cd = '';
    const endRound = (k) => {
      state = 'done'; wins[k]++;
      const rate = taps[0] / Math.max(1, roundT); bestRate = Math.max(bestRate, rate);
      if (multi[k] && !bot) teamWin = true; if (bot && k === 0 && multi[0]) teamWin = true;
      sfx.win(); ctx.flash(k === 0 ? 'rgba(76,201,240,.3)' : 'rgba(255,61,90,.3)'); ctx.shake(6); vibrate([30, 40, 30]);
      ctx.hud({ score: `🔵 ${wins[0]} – ${wins[1]} 🔴` });
      ctx.timeout(() => { if (wins[0] >= 2 || wins[1] >= 2) finish(); else startRound(); }, 1800);
    };
    const step = (dt) => {
      t += dt;
      if (state !== 'go') return;
      roundT += dt;
      if (bot) { const rate = 5.5 + roundN * 1.3 + Math.sin(t * 1.7) * 0.8; botAcc += rate * dt; while (botAcc >= 1) { botAcc--; taps[1]++; vel -= 0.022; } }
      vel *= Math.exp(-3 * dt); pos += vel * dt * 6;
      if (pos >= 1) endRound(0); else if (pos <= -1) endRound(1);
      else if (roundT > 25) endRound(pos >= 0 ? 0 : 1);
    };
    const finish = () => {
      state = 'over'; const w = wins[0] > wins[1] ? 0 : 1; const rate = Math.round(bestRate * 10);
      if (!bot) return ctx.end({ multi: true, win: true, emoji: '🪢', display: `${wins[0]} – ${wins[1]}`, title: `${w === 0 ? '🔵 Les Bleus' : '🔴 Les Rouges'} gagnent !`, label: 'Au meilleur des 3 manches', feats: [teamWin && 'equipe'].filter(Boolean) });
      ctx.end({ score: rate, record: true, win: w === 0, emoji: w === 0 ? '💪' : '🤖', display: `${wins[0]} – ${wins[1]}`, title: w === 0 ? 'Plus costaud que la machine !' : 'La machine ne fatigue jamais…', label: `Record : ${(rate / 10).toFixed(1).replace('.', ',')} tapes/s`, feats: [w === 0 && wins[1] === 0 && 'costaud', bestRate > 10 && 'turbo', teamWin && w === 0 && 'equipe'].filter(Boolean) });
    };
    const draw = (dt) => {
      const W = view.w, H = view.h, cy = H / 2;
      g.fillStyle = '#10213d'; g.fillRect(0, cy, W, cy); g.fillStyle = '#3d1020'; g.fillRect(0, 0, W, cy);
      // Zones de victoire
      const off = pos * (H * 0.32);
      g.fillStyle = 'rgba(76,201,240,.25)'; g.fillRect(0, cy + H * 0.32 - 4, W, 8); g.fillStyle = 'rgba(255,92,122,.25)'; g.fillRect(0, cy - H * 0.32 - 4, W, 8);
      // Corde
      g.strokeStyle = '#d9b26f'; g.lineWidth = 10; g.setLineDash([14, 6]); g.lineDashOffset = -off; g.beginPath(); g.moveTo(W / 2, 0); g.lineTo(W / 2, H); g.stroke(); g.setLineDash([]);
      // Foulard
      g.fillStyle = '#ffd23f'; g.beginPath(); g.moveTo(W / 2 - 22, cy + off); g.lineTo(W / 2 + 22, cy + off - 10); g.lineTo(W / 2 + 22, cy + off + 10); g.fill();
      g.strokeStyle = 'rgba(255,255,255,.3)'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, cy); g.lineTo(W, cy); g.stroke();
      // Équipes
      g.font = '42px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      for (let i = 0; i < 3; i++) { g.fillText('🧍', W / 2 - 40 + i * 40, H - 50 + Math.sin(t * 20 + i) * (state === 'go' ? 3 : 0) + off * 0.2); g.fillText(bot ? '🤖' : '🧍', W / 2 - 40 + i * 40, 50 + Math.sin(t * 20 + i + 1) * (state === 'go' ? 3 : 0) + off * 0.2); }
      for (const f of fx) { f.life -= dt; g.globalAlpha = Math.max(0, f.life * 2.5); g.strokeStyle = f.k ? '#ff5c7a' : '#4cc9f0'; g.lineWidth = 3; g.beginPath(); g.arc(f.x, f.y, 40 * (1 - f.life * 2), 0, 7); g.stroke(); } g.globalAlpha = 1;
      for (let i = fx.length - 1; i >= 0; i--) if (fx[i].life <= 0) fx.splice(i, 1);
      g.font = '800 16px Outfit, sans-serif'; g.fillStyle = 'rgba(255,255,255,.75)';
      g.fillText(`🔵 ${taps[0]} tapes`, W / 2, H * 0.62); g.save(); g.translate(W / 2, H * 0.38); g.rotate(Math.PI); g.fillText(`🔴 ${taps[1]} tapes`, 0, 0); g.restore();
      if (cd) { g.font = '900 54px Outfit, sans-serif'; g.fillStyle = '#fff'; g.fillText(cd, W / 2, cy); }
      if (state === 'wait') { g.font = '800 18px Outfit, sans-serif'; g.fillStyle = '#fff'; g.fillText(bot ? 'Tape le plus vite possible en bas !' : 'Bleus en bas, Rouges en haut · plusieurs doigts OK', W / 2, cy, W - 20); }
    };
    ctx.hud({ score: '🔵 0 – 0 🔴' });
    const stop = loop((dt) => { step(dt); draw(dt); }); ctx.onCleanup(stop);
    ctx.timeout(startRound, 1200);
  },
};
