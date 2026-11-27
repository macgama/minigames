import { h } from '../core/dom.js';
import { sfx, vibrate } from '../core/sfx.js';
import { makeRng, todayKey } from '../core/rng.js';

const COLS = 7, ROWS = 9, BAT = 180, COST = 3;
const ROOMS = ['🛋️ Salon', '🍳 Cuisine', '📚 Bibliothèque', '🕯️ Cave', '🏰 Grenier'];

export default {
  start(ctx) {
    const mode = ctx.mode || 'classic', duel = mode === 'duel';
    const R = mode === 'jour' ? makeRng('radar-' + todayKey()) : ctx.rng;
    const NR = duel ? 3 : 5;
    let room = 0, battery = BAT, score = 0, caught = 0, ghosts = [], cells = [], scans = 0, firstHit = false, cleared = 0, over = false, turn = 0, busy = false;
    const pts = [0, 0];
    const head = h('div', { style: { textAlign: 'center' } });
    const grid = h('div', { style: { display: 'grid', gridTemplateColumns: `repeat(${COLS},1fr)`, gap: '4px', width: `min(94vw, calc((100dvh - 230px) * ${COLS / ROWS}), 420px)`, touchAction: 'manipulation' } });
    const batEl = h('div.bar', { style: { width: 'min(94vw,420px)' } }, h('i'));
    const msg = h('div', { style: { minHeight: '22px', fontWeight: 800 } });
    ctx.stage.append(h('div.center-stage', { style: { gap: '10px' } }, head, duel ? '' : batEl, grid, msg));
    const dist = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
    const heat = (d) => `hsl(${Math.min(220, d * 34)},85%,${d <= 1 ? 55 : 45}%)`;

    const startRoom = () => {
      const n = duel ? 4 : room + 1;
      ghosts = []; while (ghosts.length < n) { const p = [R.int(0, COLS - 1), R.int(0, ROWS - 1)]; if (!ghosts.some((q) => q[0] === p[0] && q[1] === p[1])) ghosts.push(p); }
      ghosts = ghosts.map((p) => ({ p, got: false }));
      cells = Array.from({ length: COLS * ROWS }, () => ({ d: null, age: 0, ghost: false })); scans = 0;
      grid.replaceChildren(...cells.map((c, i) => { const el = h('button', { style: { aspectRatio: '1', borderRadius: '8px', border: 0, background: 'rgba(255,255,255,.07)', color: '#fff', fontWeight: 900, fontSize: '16px', cursor: 'pointer', padding: 0, transition: 'background .2s, opacity .4s' }, onclick: () => scan(i) }); c.el = el; return el; }));
      paintHead(); msg.textContent = room >= 3 && !duel ? '⚠️ Ici, les fantômes se déplacent !' : ''; msg.style.color = '#ffd23f';
    };
    const paintHead = () => {
      const left = ghosts.filter((g) => !g.got).length;
      head.replaceChildren(h('div.faint', { style: { fontSize: '12px', fontWeight: 700, letterSpacing: '.1em' } }, `PIÈCE ${room + 1}/${NR} · ${ROOMS[room]}`),
        h('div', { style: { fontSize: '20px', fontWeight: 800 } }, duel ? h('span', h('span', { style: { color: turn === 0 ? '#4cc9f0' : 'inherit', opacity: turn === 0 ? 1 : 0.5 } }, `🔵 ${pts[0]}`), '  ·  ', `👻 ${left}`, '  ·  ', h('span', { style: { color: turn === 1 ? '#ff5c7a' : 'inherit', opacity: turn === 1 ? 1 : 0.5 } }, `${pts[1]} 🔴`)) : `👻 ${'👻'.repeat(left)}${'✅'.repeat(ghosts.length - left)}`));
      if (!duel) { batEl.firstChild.style.width = `${(battery / BAT) * 100}%`; batEl.firstChild.style.background = battery < BAT * 0.2 ? 'var(--bad)' : ''; ctx.hud({ pts: `${score} pts`, bat: `🔋 ${Math.round((battery / BAT) * 100)} %` }); }
    };
    const scan = (i) => {
      if (over || busy) return; const c = cells[i]; if (c.ghost) return;
      if (!duel) { if (battery < COST) return; battery -= COST; }
      scans++;
      const p = [i % COLS, Math.floor(i / COLS)];
      const g = ghosts.find((q) => !q.got && q.p[0] === p[0] && q.p[1] === p[1]);
      if (g) {
        g.got = true; c.ghost = true; c.el.textContent = '👻'; c.el.style.background = 'linear-gradient(160deg,#3ddc97,#00c2ff)'; c.el.style.fontSize = '22px';
        c.el.animate([{ transform: 'scale(1.6)' }, { transform: 'scale(1)' }], { duration: 300 });
        sfx.win(); vibrate([20, 30, 20]); ctx.flash('rgba(61,220,151,.2)');
        if (duel) pts[turn]++; else { caught++; score += 50; if (scans === 1) firstHit = true; }
        msg.textContent = scans === 1 ? '🎯 Du premier coup !' : 'Attrapé !'; msg.style.color = 'var(--ok)';
      } else {
        const alive = ghosts.filter((q) => !q.got); const d = Math.min(...alive.map((q) => dist(q.p, p)));
        c.d = d; c.age = 0; c.el.textContent = d; c.el.style.background = heat(d); c.el.style.opacity = 1;
        d <= 1 ? sfx.ok() : sfx.tick(); vibrate(d <= 1 ? 12 : 4);
        msg.textContent = d === 1 ? '🔥 Brûlant !' : d <= 3 ? 'Chaud…' : d <= 5 ? 'Tiède' : 'Froid ❄️'; msg.style.color = heat(d);
        if (duel) turn = 1 - turn;
      }
      // Les fantômes des dernières pièces bougent tous les 4 scans
      if (!duel && room >= 3 && scans % 4 === 0) {
        for (const q of ghosts) if (!q.got) { const opts = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [q.p[0] + dx, q.p[1] + dy]).filter(([x, y]) => x >= 0 && y >= 0 && x < COLS && y < ROWS && !cells[y * COLS + x].ghost); if (opts.length) q.p = R.pick(opts); }
        for (const k of cells) if (k.d != null) { k.age++; k.el.style.opacity = Math.max(0.25, 1 - k.age * 0.35); }
        msg.textContent = '👻 Les fantômes ont bougé…'; msg.style.color = '#b388ff';
      }
      paintHead();
      if (ghosts.every((q) => q.got)) return roomDone();
      if (!duel && battery < COST) return end();
    };
    const roomDone = () => {
      busy = true; cleared++; if (!duel) score += 100;
      sfx.go(); ctx.pop(duel ? 'Pièce vidée !' : 'Pièce vidée ! +100', ctx.stage.clientWidth / 2, ctx.stage.clientHeight * 0.4, '#ffd23f', 28);
      ctx.timeout(() => { busy = false; room++; if (room >= NR) end(); else startRoom(); }, 1400);
    };
    const end = () => {
      if (over) return; over = true;
      if (duel) {
        const w = pts[0] === pts[1] ? null : pts[0] > pts[1] ? 0 : 1;
        return ctx.timeout(() => ctx.end({ multi: true, win: true, emoji: '👻', display: `${pts[0]} – ${pts[1]}`, title: w == null ? 'Égalité chez les chasseurs' : `${w === 0 ? '🔵 Bleu' : '🔴 Rouge'} attrape le plus de fantômes !`, label: `${NR} pièces` }), 800);
      }
      const all = cleared === NR; if (all) score += Math.round(battery * 2);
      sfx[all ? 'win' : 'bad']();
      ctx.timeout(() => ctx.end({
        score, display: `${score} pts`, emoji: '👻', board: mode === 'jour' ? 'jour' : null,
        title: all ? 'Manoir désenvoûté !' : cleared >= 3 ? 'Batterie à plat, si près du but' : 'Les fantômes rigolent encore',
        label: `${caught} fantôme${caught > 1 ? 's' : ''} · ${cleared}/${NR} pièces${all ? ` · 🔋 ${Math.round((battery / BAT) * 100)} % restant` : ''}`,
        feats: [firstHit && 'sniper', all && battery > BAT * 0.4 && 'econome', all && 'chasseur'].filter(Boolean),
      }), 900);
    };
    startRoom();
  },
};
