import { h } from '../core/dom.js';
import { sfx, vibrate } from '../core/sfx.js';
import { makeRng, todayKey } from '../core/rng.js';

// Grille n×n avec des blocs br×bc
function solve(grid, n, br, bc, limit = 2) {
  let count = 0; const g = grid.slice();
  const ok = (i, v) => { const r = Math.floor(i / n), c = i % n; for (let k = 0; k < n; k++) if (g[r * n + k] === v || g[k * n + c] === v) return false; const r0 = r - (r % br), c0 = c - (c % bc); for (let a = 0; a < br; a++) for (let b = 0; b < bc; b++) if (g[(r0 + a) * n + c0 + b] === v) return false; return true; };
  const rec = () => { const i = g.indexOf(0); if (i < 0) { count++; return count >= limit; } for (let v = 1; v <= n; v++) if (ok(i, v)) { g[i] = v; if (rec()) return true; g[i] = 0; } return false; };
  rec(); return count;
}
function make(R, n, givensTarget) {
  const br = n === 4 ? 2 : 2, bc = n === 4 ? 2 : 3;
  // Solution de base par motif, puis mélanges qui la gardent valide
  const base = Array.from({ length: n * n }, (_, i) => { const r = Math.floor(i / n), c = i % n; return ((r % br) * bc + Math.floor(r / br) + c) % n + 1; });
  const digits = R.shuffle(Array.from({ length: n }, (_, i) => i + 1));
  const bands = R.shuffle([...Array(n / br).keys()]), rows = bands.flatMap((b) => R.shuffle([...Array(br).keys()]).map((k) => b * br + k));
  const stacks = R.shuffle([...Array(n / bc).keys()]), cols = stacks.flatMap((s) => R.shuffle([...Array(bc).keys()]).map((k) => s * bc + k));
  const sol = Array.from({ length: n * n }, (_, i) => digits[base[rows[Math.floor(i / n)] * n + cols[i % n]] - 1]);
  const puz = sol.slice();
  for (const i of R.shuffle([...Array(n * n).keys()])) { if (puz.filter(Boolean).length <= givensTarget) break; const keep = puz[i]; puz[i] = 0; if (solve(puz, n, br, bc) !== 1) puz[i] = keep; }
  return { sol, puz, n, br, bc };
}

export default {
  start(ctx) {
    const mode = ctx.mode || 'serie';
    const R = mode === 'jour' ? makeRng('sudoku-' + todayKey()) : ctx.rng;
    const plan = mode === 'six' ? [[6, 15], [6, 14], [6, 13], [6, 12]] : [[4, 7], [4, 6], [6, 16], [6, 14], [6, 13]];
    let gi = 0, total = 0, errors = 0, fastest6 = Infinity, sel = -1, cur, vals, t0 = 0, pen = 0, busy = false;
    const head = h('div.faint', { style: { fontSize: '12px', fontWeight: 700, letterSpacing: '.1em' } });
    const gridEl = h('div', { style: { display: 'grid', width: 'min(92vw, calc(100dvh - 330px), 400px)', aspectRatio: '1', borderRadius: '14px', overflow: 'hidden', border: '3px solid var(--border-strong)' } });
    const pad = h('div', { style: { display: 'grid', gap: '6px', width: 'min(92vw,400px)' } });
    const msg = h('div', { style: { minHeight: '22px', fontWeight: 800 } });
    ctx.stage.append(h('div.center-stage', { style: { gap: '10px' } }, head, gridEl, msg, pad));
    const paint = () => {
      const { n, br, bc, puz } = cur;
      gridEl.style.gridTemplateColumns = `repeat(${n},1fr)`;
      const same = sel >= 0 && vals[sel] ? vals[sel] : 0;
      gridEl.replaceChildren(...vals.map((v, i) => {
        const r = Math.floor(i / n), c = i % n, given = !!puz[i];
        const peer = sel >= 0 && (Math.floor(sel / n) === r || sel % n === c);
        return h('button', { style: { border: 0, padding: 0, fontSize: n === 4 ? 'clamp(28px,9vw,44px)' : 'clamp(20px,6vw,32px)', fontWeight: given ? 900 : 700, color: given ? '#fff' : '#4cc9f0', cursor: given ? 'default' : 'pointer',
          background: i === sel ? 'rgba(255,210,63,.45)' : same && v === same ? 'rgba(124,92,255,.35)' : peer ? 'rgba(255,255,255,.09)' : (Math.floor(r / br) + Math.floor(c / bc)) % 2 ? 'rgba(255,255,255,.03)' : 'rgba(255,255,255,.06)',
          borderRight: c % bc === bc - 1 && c < n - 1 ? '2px solid var(--border-strong)' : '1px solid rgba(255,255,255,.06)', borderBottom: r % br === br - 1 && r < n - 1 ? '2px solid var(--border-strong)' : '1px solid rgba(255,255,255,.06)' },
          onclick: () => { sel = i; sfx.tick(); paint(); } }, v || '');
      }));
    };
    const put = (v) => {
      if (busy || sel < 0 || cur.puz[sel]) return;
      if (v === 0) { vals[sel] = 0; return paint(); }
      if (cur.sol[sel] !== v) { errors++; pen += 3; sfx.bad(); vibrate([30, 30, 30]); ctx.shake(4); msg.textContent = `✗ Pas ${v} ici · −3 s`; msg.style.color = 'var(--bad)'; return; }
      vals[sel] = v; sfx.pop(); vibrate(5); msg.textContent = '';
      const nxt = vals.findIndex((x, i) => !x && i > sel); sel = nxt >= 0 ? nxt : vals.indexOf(0);
      paint();
      if (!vals.includes(0)) done();
    };
    ctx.on(window, 'keydown', (e) => { if (/^[1-6]$/.test(e.key)) put(+e.key); if (e.key === 'Backspace') put(0); const n = cur?.n; if (!n || sel < 0) return; const mv = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: n, ArrowUp: -n }[e.key]; if (mv) { e.preventDefault(); sel = Math.max(0, Math.min(n * n - 1, sel + mv)); paint(); } });
    const startGrid = () => {
      const [n, giv] = plan[gi]; cur = make(R, n, giv); vals = cur.puz.slice(); sel = vals.indexOf(0); pen = 0; t0 = performance.now(); busy = false;
      head.textContent = `GRILLE ${gi + 1}/${plan.length} · ${n} × ${n}`; msg.textContent = '';
      pad.style.gridTemplateColumns = `repeat(${n + 1},1fr)`;
      pad.replaceChildren(...Array.from({ length: n }, (_, k) => h('button.btn', { style: { minHeight: '54px', fontSize: '24px', fontWeight: 900, padding: 0 }, onclick: () => put(k + 1) }, k + 1)), h('button.btn', { style: { minHeight: '54px', padding: 0 }, onclick: () => put(0) }, '⌫'));
      paint();
    };
    const done = () => {
      busy = true; const sec = (performance.now() - t0) / 1000 + pen, n = cur.n;
      if (n === 6) fastest6 = Math.min(fastest6, sec);
      const p = Math.max(50, Math.round(300 - sec * (n === 4 ? 8 : 3))); total += p;
      sfx.win(); ctx.flash('rgba(61,220,151,.25)'); ctx.pop(`+${p} · ${Math.round(sec)} s`, ctx.stage.clientWidth / 2, ctx.stage.clientHeight * 0.3, '#3ddc97', 28);
      ctx.hud({ pts: `${total} pts` });
      ctx.timeout(() => { gi++; if (gi < plan.length) startGrid(); else finish(); }, 1300);
    };
    ctx.interval(() => { if (cur && !busy) ctx.hud({ pts: `${total} pts`, time: `${Math.floor((performance.now() - t0) / 1000 + pen)} s` }); }, 250);
    const finish = () => ctx.end({
      score: total, display: `${total} pts`, emoji: '🔢', board: mode === 'serie' ? null : mode,
      title: total >= 1000 ? 'Logicien éclair' : total >= 650 ? 'Bien raisonné' : 'Chaque case à sa place',
      label: `${plan.length} grilles · ${errors} erreur${errors > 1 ? 's' : ''}${fastest6 < Infinity ? ` · meilleure 6×6 : ${Math.round(fastest6)} s` : ''}`,
      feats: [errors === 0 && 'sans', fastest6 < 40 && 'eclair', mode === 'six' && total >= 900 && 'six'].filter(Boolean),
    });
    ctx.countdown().then(() => ctx.alive && startGrid());
  },
};
