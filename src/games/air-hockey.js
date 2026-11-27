import { createCanvas, loop, roundRect } from '../core/canvas.js';
import { sfx, vibrate } from '../core/sfx.js';

const TW = 300, TH = 520, GW = 110, PR = 14, MR = 24, WIN = 7;
const AI = { facile: { spd: 300, react: 0.25, aim: 0.3 }, normal: { spd: 520, react: 0.12, aim: 0.7 }, expert: { spd: 820, react: 0.04, aim: 1 } };

export default {
  start(ctx) {
    const mode = ctx.mode || 'duo', duo = mode === 'duo', ai = AI[mode] || AI.normal;
    const view = createCanvas(ctx.stage, { onResize: () => {} }); ctx.onCleanup(view.destroy);
    const { g } = view;
    const puck = { x: TW / 2, y: TH / 2, vx: 0, vy: 0 };
    const M = [{ x: TW / 2, y: TH - 70, vx: 0, vy: 0, tx: TW / 2, ty: TH - 70, c: '#4cc9f0' }, { x: TW / 2, y: 70, vx: 0, vy: 0, tx: TW / 2, ty: 70, c: '#ff3d77' }];
    const sc = [0, 0];
    let t = 0, pause = 1.2, over = false, fastGoal = false, flashK = 0, lastSpeed = 0, trail = [], aiT = 0;
    const geo = () => { const s = Math.min(view.w / TW, view.h / TH) * 0.98; return { s, ox: (view.w - TW * s) / 2, oy: (view.h - TH * s) / 2 }; };
    const toT = (p) => { const { s, ox, oy } = geo(); return { x: (p.x - ox) / s, y: (p.y - oy) / s }; };
    const serve = (towards) => { puck.x = TW / 2; puck.y = TH / 2 + (towards === 0 ? 40 : -40); puck.vx = 0; puck.vy = 0; pause = 0.9; trail = []; };
    const ptrs = new Map();
    const own = (k, p) => { M[k].tx = Math.max(MR, Math.min(TW - MR, p.x)); M[k].ty = k === 0 ? Math.max(TH / 2 + MR, Math.min(TH - MR, p.y)) : Math.max(MR, Math.min(TH / 2 - MR, p.y)); };
    ctx.on(view.canvas, 'pointerdown', (e) => { const p = toT(view.pos(e)); const k = duo && p.y < TH / 2 ? 1 : 0; ptrs.set(e.pointerId, k); own(k, p); view.canvas.setPointerCapture?.(e.pointerId); });
    ctx.on(view.canvas, 'pointermove', (e) => { const p = toT(view.pos(e)); let k = ptrs.get(e.pointerId); if (k == null) { if (e.pointerType !== 'mouse') return; k = duo && p.y < TH / 2 ? 1 : 0; } own(k, p); });
    const up = (e) => ptrs.delete(e.pointerId); ctx.on(view.canvas, 'pointerup', up); ctx.on(view.canvas, 'pointercancel', up);

    const think = (dt) => {
      aiT -= dt; if (aiT > 0) return; aiT = ai.react;
      const m = M[1];
      if (puck.y < TH / 2 + PR + MR - 6 && (puck.vy < 200 || puck.y < m.y + 40)) {
        // Attaque : se placer au-dessus du palet, puis le traverser vers le but adverse
        const gx = TW / 2 + ctx.rng.float(-1, 1) * (1 - ai.aim) * 90, dx = gx - puck.x, dy = TH - puck.y, d = Math.hypot(dx, dy) || 1;
        if (m.y < puck.y - 6) { m.tx = puck.x + (dx / d) * 30; m.ty = puck.y + (dy / d) * 30; }
        else { m.tx = puck.x + (puck.x < TW / 2 ? 40 : -40); m.ty = puck.y - 45; }
      } else {
        // Défense : entre le palet et le but
        const k = 0.25; m.tx = TW / 2 + (puck.x - TW / 2) * (0.5 + ai.aim * 0.3); m.ty = 40 + k * 60;
      }
      m.tx = Math.max(MR, Math.min(TW - MR, m.tx)); m.ty = Math.max(MR, Math.min(TH / 2 - MR, m.ty));
    };
    const step = (dt) => {
      t += dt;
      if (!duo) think(dt);
      M.forEach((m, k) => {
        const px = m.x, py = m.y;
        if (!duo && k === 1) { const dx = m.tx - m.x, dy = m.ty - m.y, d = Math.hypot(dx, dy), mv = Math.min(d, ai.spd * dt); if (d > 0) { m.x += (dx / d) * mv; m.y += (dy / d) * mv; } }
        else { m.x += (m.tx - m.x) * Math.min(1, dt * 30); m.y += (m.ty - m.y) * Math.min(1, dt * 30); }
        m.vx = (m.x - px) / dt; m.vy = (m.y - py) / dt;
      });
      if (pause > 0) { pause -= dt; return; }
      puck.x += puck.vx * dt; puck.y += puck.vy * dt;
      const f = Math.exp(-0.35 * dt); puck.vx *= f; puck.vy *= f;
      const sp = Math.hypot(puck.vx, puck.vy); if (sp > 1600) { puck.vx *= 1600 / sp; puck.vy *= 1600 / sp; }
      if (puck.x < PR) { puck.x = PR; puck.vx = Math.abs(puck.vx) * 0.92; sfx.tick(); } if (puck.x > TW - PR) { puck.x = TW - PR; puck.vx = -Math.abs(puck.vx) * 0.92; sfx.tick(); }
      const inGoal = Math.abs(puck.x - TW / 2) < GW / 2;
      if (puck.y < PR && !inGoal) { puck.y = PR; puck.vy = Math.abs(puck.vy) * 0.92; sfx.tick(); }
      if (puck.y > TH - PR && !inGoal) { puck.y = TH - PR; puck.vy = -Math.abs(puck.vy) * 0.92; sfx.tick(); }
      if (puck.y < -PR) return goal(0); if (puck.y > TH + PR) return goal(1);
      for (const m of M) {
        const dx = puck.x - m.x, dy = puck.y - m.y, d = Math.hypot(dx, dy);
        if (d < PR + MR && d > 0) {
          const nx = dx / d, ny = dy / d; puck.x = m.x + nx * (PR + MR); puck.y = m.y + ny * (PR + MR);
          const rv = (puck.vx - m.vx) * nx + (puck.vy - m.vy) * ny;
          if (rv < 0) { puck.vx -= 1.9 * rv * nx; puck.vy -= 1.9 * rv * ny; const hit = Math.hypot(puck.vx, puck.vy); lastSpeed = hit; sfx.pop(); vibrate(Math.min(30, hit / 50)); if (hit > 1100) flashK = 0.4; }
          else if (Math.hypot(puck.vx, puck.vy) < 90) { puck.vx = nx * 140; puck.vy = ny * 140; } // poussée lente
        }
      }
      trail.push([puck.x, puck.y]); if (trail.length > 12) trail.shift();
    };
    const goal = (k) => {
      sc[k]++; sfx.win(); vibrate([30, 40, 30]); ctx.shake(7); ctx.flash(k === 0 ? 'rgba(76,201,240,.3)' : 'rgba(255,61,119,.3)');
      if (k === 0 && lastSpeed > 1300) { fastGoal = true; ctx.pop('💥 Boulet de canon !', view.w / 2, view.h * 0.5, '#ffd23f', 28); }
      ctx.hud({ score: `${sc[0]} – ${sc[1]}` });
      if (sc[k] >= WIN) return end();
      serve(1 - k);
    };
    const end = () => {
      over = true;
      const w = sc[0] > sc[1] ? 0 : 1;
      ctx.timeout(() => ctx.end(duo
        ? { multi: true, win: true, emoji: '🏒', display: `${sc[0]} – ${sc[1]}`, title: `${w === 0 ? 'Bleu' : 'Rose'} gagne !`, label: `Premier à ${WIN} buts` }
        : { score: Math.max(0, sc[0] - sc[1]), record: true, board: mode === 'facile' ? null : mode, win: w === 0, emoji: w === 0 ? '🏆' : '🤖', display: `${sc[0]} – ${sc[1]}`, title: w === 0 ? (sc[1] === 0 ? 'Le mur !' : 'Victoire sur la glace') : 'L’ordi t’a eu', label: `Ordi ${mode}`,
          feats: [w === 0 && sc[1] === 0 && 'blanchi', w === 0 && mode === 'expert' && 'expert', fastGoal && 'canon'].filter(Boolean) }), 900);
    };
    const draw = () => {
      const { s, ox, oy } = geo();
      g.fillStyle = '#081226'; g.fillRect(0, 0, view.w, view.h);
      g.save(); g.translate(ox, oy); g.scale(s, s);
      g.fillStyle = '#eaf4ff'; roundRect(g, 0, 0, TW, TH, 26); g.fill();
      g.strokeStyle = '#ff3d77'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, TH / 2); g.lineTo(TW, TH / 2); g.stroke();
      g.strokeStyle = 'rgba(58,139,255,.5)'; g.beginPath(); g.arc(TW / 2, TH / 2, 50, 0, 7); g.stroke();
      g.beginPath(); g.arc(TW / 2, 0, 70, 0, Math.PI); g.stroke(); g.beginPath(); g.arc(TW / 2, TH, 70, Math.PI, 0); g.stroke();
      g.fillStyle = '#111b33'; g.fillRect(TW / 2 - GW / 2, -6, GW, 10); g.fillRect(TW / 2 - GW / 2, TH - 4, GW, 10);
      // Score géant en filigrane
      g.font = '900 90px Outfit, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = 'rgba(255,61,119,.1)'; g.fillText(sc[1], TW / 2, TH / 4); g.fillStyle = 'rgba(76,201,240,.15)'; g.fillText(sc[0], TW / 2, (TH * 3) / 4);
      trail.forEach(([x, y], i) => { g.fillStyle = `rgba(17,27,51,${(i / trail.length) * 0.15})`; g.beginPath(); g.arc(x, y, PR * (i / trail.length), 0, 7); g.fill(); });
      g.fillStyle = '#111b33'; g.beginPath(); g.arc(puck.x, puck.y, PR, 0, 7); g.fill(); g.strokeStyle = '#ffd23f'; g.lineWidth = 2; g.beginPath(); g.arc(puck.x, puck.y, PR - 4, 0, 7); g.stroke();
      for (const m of M) { g.fillStyle = 'rgba(0,0,0,.15)'; g.beginPath(); g.arc(m.x + 3, m.y + 4, MR, 0, 7); g.fill(); g.fillStyle = m.c; g.beginPath(); g.arc(m.x, m.y, MR, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,.45)'; g.beginPath(); g.arc(m.x, m.y, MR * 0.45, 0, 7); g.fill(); }
      if (pause > 0 && !over) { g.fillStyle = 'rgba(8,18,38,.7)'; g.font = '800 22px Outfit, sans-serif'; g.fillText(t < 1.3 ? (duo ? 'Bleu en bas · Rose en haut' : 'Tu joues en bas') : 'Prêt ?', TW / 2, TH / 2 - 26); }
      g.restore();
      if (flashK > 0) { g.fillStyle = `rgba(255,210,63,${flashK * 0.4})`; g.fillRect(0, 0, view.w, view.h); flashK -= 0.03; }
    };
    ctx.hud({ score: '0 – 0' });
    const stop = loop((dt) => { if (!over) for (let i = 0; i < 4; i++) step(dt / 4); draw(); });
    ctx.onCleanup(stop);
  },
};
