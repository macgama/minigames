import { h } from '../core/dom.js';
import { createCanvas, loop } from '../core/canvas.js';
import { sfx, vibrate } from '../core/sfx.js';
import { makeRng, todayKey } from '../core/rng.js';

const DIRS = { up: [0, -1, 1], right: [1, 0, 2], down: [0, 1, 4], left: [-1, 0, 8] }; // bit du mur ouvert

export default {
  start(ctx) {
    const mode = ctx.mode || 'classic', candle = mode === 'bougie';
    const R = mode === 'jour' ? makeRng('laby-' + todayKey()) : ctx.rng;
    const view = createCanvas(ctx.stage, { onResize: () => {} }); ctx.onCleanup(view.destroy);
    const { g } = view;
    let lvl = 0, C, Rw, open, me, exit, piles, seen, battery = 100, exits = 0, nPiles = 0, over = false, t = 0, left = 150, anim = null;
    const make = () => {
      C = Math.min(13, 5 + lvl); Rw = Math.min(17, 7 + Math.floor(lvl * 1.3));
      open = new Uint8Array(C * Rw); const vis = new Uint8Array(C * Rw); const st = [0]; vis[0] = 1;
      while (st.length) { const c = st.at(-1), x = c % C, y = Math.floor(c / C); const opts = Object.values(DIRS).filter(([dx, dy]) => { const nx = x + dx, ny = y + dy; return nx >= 0 && ny >= 0 && nx < C && ny < Rw && !vis[ny * C + nx]; }); if (!opts.length) { st.pop(); continue; } const [dx, dy, b] = R.pick(opts); const n = (y + dy) * C + x + dx; open[c] |= b; open[n] |= b === 1 ? 4 : b === 4 ? 1 : b === 2 ? 8 : 2; vis[n] = 1; st.push(n); }
      // Quelques boucles pour ne pas être un pur arbre
      for (let k = 0; k < lvl + 1; k++) { const c = R.int(0, C * Rw - 1), x = c % C, y = Math.floor(c / C); if (x < C - 1) { open[c] |= 2; open[c + 1] |= 8; } }
      me = { x: 0, y: 0, px: 0, py: 0 }; exit = { x: C - 1, y: Rw - 1 };
      piles = []; const np = candle ? 0 : 2 + Math.floor(lvl / 2); while (piles.length < np) { const p = { x: R.int(0, C - 1), y: R.int(0, Rw - 1) }; if ((p.x || p.y) && !(p.x === exit.x && p.y === exit.y) && !piles.some((q) => q.x === p.x && q.y === p.y)) piles.push(p); }
      seen = new Uint8Array(C * Rw); seen[0] = 1;
    };
    const can = (x, y, d) => open[y * C + x] & DIRS[d][2];
    const move = (d, slide) => {
      if (over || anim) return;
      let { x, y } = me, steps = 0;
      do { if (!can(x, y, d)) break; x += DIRS[d][0]; y += DIRS[d][1]; steps++; seen[y * C + x] = 1; if (!slide) break; const exitsN = Object.keys(DIRS).filter((k) => can(x, y, k)).length; if (exitsN !== 2 || (x === exit.x && y === exit.y) || piles.some((p) => p.x === x && p.y === y)) break; } while (steps < 40);
      if (!steps) { vibrate(10); return; }
      anim = { fx: me.x, fy: me.y, tx: x, ty: y, k: 0, dur: Math.min(0.35, 0.07 * steps + 0.05) }; me.x = x; me.y = y; sfx.tick();
      if (!candle) battery -= 0.6 * steps;
    };
    const arrive = () => {
      const pi = piles.findIndex((p) => p.x === me.x && p.y === me.y);
      if (pi >= 0) { piles.splice(pi, 1); battery = Math.min(100, battery + 35); nPiles++; sfx.ok(); vibrate(12); ctx.flash('rgba(255,210,63,.2)'); }
      if (me.x === exit.x && me.y === exit.y) { exits++; lvl++; sfx.win(); vibrate([20, 30, 20]); ctx.flash('rgba(61,220,151,.3)'); ctx.pop(`Sortie ${exits} !`, view.w / 2, view.h * 0.4, '#3ddc97', 30); if (!candle) battery = Math.min(100, battery + 15); make(); }
    };
    // Glisser = avancer jusqu'au prochain carrefour
    let s0 = null;
    ctx.on(view.canvas, 'pointerdown', (e) => (s0 = view.pos(e)));
    ctx.on(view.canvas, 'pointerup', (e) => { if (!s0) return; const p = view.pos(e), dx = p.x - s0.x, dy = p.y - s0.y; s0 = null; if (Math.hypot(dx, dy) < 20) return; move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up', true); });
    const KEYS = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right' };
    ctx.on(window, 'keydown', (e) => { const d = KEYS[e.key]; if (d) { e.preventDefault(); move(d, e.shiftKey); } });
    const pad = h('div', { style: { position: 'absolute', bottom: '10px', left: '50%', transform: 'translateX(-50%)', display: 'grid', gridTemplateColumns: 'repeat(3,52px)', gap: '4px', zIndex: 3, opacity: 0.85 } },
      ...[['', null], ['▲', 'up'], ['', null], ['◀', 'left'], ['', null], ['▶', 'right'], ['', null], ['▼', 'down'], ['', null]].map(([l, d]) => d ? h('button.btn', { style: { minHeight: '46px', padding: 0 }, onpointerdown: (e) => { e.preventDefault(); move(d, false); } }, l) : h('span')));
    ctx.stage.append(pad);

    const step = (dt) => {
      t += dt;
      if (anim) { anim.k += dt / anim.dur; if (anim.k >= 1) { anim = null; arrive(); } }
      if (!candle) battery -= dt * (2.2 + lvl * 0.15); else left -= dt;
      ctx.hud({ exits: `🚪 ${exits}`, bat: candle ? `⏱️ ${Math.max(0, Math.ceil(left))} s` : `🔋 ${Math.max(0, Math.round(battery))} %` });
      if ((!candle && battery <= 0) || (candle && left <= 0)) end();
    };
    const end = () => {
      if (over) return; over = true; sfx.bad();
      ctx.timeout(() => ctx.end({
        score: exits, display: `${exits} sortie${exits > 1 ? 's' : ''}`, emoji: '🔦', board: mode === 'classic' ? null : mode,
        title: exits >= 10 ? 'Boussole humaine' : exits >= 5 ? 'Explorateur des ténèbres' : exits >= 2 ? 'On y voit plus clair' : 'Noir complet',
        label: `${nPiles} pile${nPiles > 1 ? 's' : ''} ramassée${nPiles > 1 ? 's' : ''} · labyrinthe ${C} × ${Rw}`,
        feats: [nPiles >= 10 && 'piles', exits >= 10 && 'dix', candle && exits >= 5 && 'bougie'].filter(Boolean),
      }), 900);
    };
    const draw = () => {
      const top = 50, bot = 170, cs = Math.min((view.w - 16) / C, (view.h - top - bot) / Rw), ox = (view.w - C * cs) / 2, oy = top + (view.h - top - bot - Rw * cs) / 2;
      const ex = anim ? anim.fx + (anim.tx - anim.fx) * Math.min(1, anim.k) : me.x, ey = anim ? anim.fy + (anim.ty - anim.fy) * Math.min(1, anim.k) : me.y;
      const px = ox + (ex + 0.5) * cs, py = oy + (ey + 0.5) * cs;
      g.fillStyle = '#05040a'; g.fillRect(0, 0, view.w, view.h);
      g.fillStyle = '#1b1830'; g.fillRect(ox, oy, C * cs, Rw * cs);
      // Cases déjà vues (souvenir)
      g.fillStyle = 'rgba(124,92,255,.12)'; for (let k = 0; k < C * Rw; k++) if (seen[k]) g.fillRect(ox + (k % C) * cs, oy + Math.floor(k / C) * cs, cs, cs);
      g.strokeStyle = '#8a80c8'; g.lineWidth = Math.max(2, cs * 0.12); g.lineCap = 'round'; g.beginPath();
      for (let y = 0; y < Rw; y++) for (let x = 0; x < C; x++) { const o = open[y * C + x], X = ox + x * cs, Y = oy + y * cs; if (!(o & 1)) { g.moveTo(X, Y); g.lineTo(X + cs, Y); } if (!(o & 8)) { g.moveTo(X, Y); g.lineTo(X, Y + cs); } if (x === C - 1 && !(o & 2)) { g.moveTo(X + cs, Y); g.lineTo(X + cs, Y + cs); } if (y === Rw - 1 && !(o & 4)) { g.moveTo(X, Y + cs); g.lineTo(X + cs, Y + cs); } }
      g.stroke();
      g.font = `${cs * 0.7}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('🚪', ox + (exit.x + 0.5) * cs, oy + (exit.y + 0.5) * cs);
      for (const p of piles) g.fillText('🔋', ox + (p.x + 0.5) * cs, oy + (p.y + 0.5) * cs);
      // Obscurité : un trou de lumière autour du joueur
      const rad = (candle ? 1.4 : 0.9 + (Math.max(0, battery) / 100) * 2.6) * cs * (1 + Math.sin(t * 9) * 0.03);
      const dark = g.createRadialGradient(px, py, rad * 0.35, px, py, rad);
      dark.addColorStop(0, 'rgba(0,0,0,0)'); dark.addColorStop(1, 'rgba(2,2,6,.985)');
      g.fillStyle = dark; g.fillRect(0, 0, view.w, view.h);
      g.fillStyle = 'rgba(255,210,63,.08)'; g.beginPath(); g.arc(px, py, rad * 0.6, 0, 7); g.fill();
      g.font = `${cs * 0.75}px sans-serif`; g.fillText(candle ? '🕯️' : '🔦', px, py);
      if (!candle && battery < 25) { g.fillStyle = `rgba(255,61,90,${0.15 + Math.sin(t * 8) * 0.1})`; g.fillRect(0, 0, view.w, view.h); }
      if (t < 3 && exits === 0) { g.fillStyle = '#fff'; g.font = '700 15px Outfit, sans-serif'; g.fillText('Glisse pour filer · la sortie 🚪 est en bas à droite', view.w / 2, top + 10); }
    };
    make();
    const stop = loop((dt) => { if (!over) step(dt); draw(); }); ctx.onCleanup(stop);
  },
};
