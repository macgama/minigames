import { h } from '../core/dom.js';
import { sfx, vibrate, tone } from '../core/sfx.js';

// S départ · B cloche · # mur · A/a portails reliés
const LEVELS = [
  ['........', '...B....', '........', '........', '........', '........', '........', '........', '...S....', '........'],
  ['.B....B.', '........', '........', '........', '........', '........', '........', '........', '...S....', '........'],
  ['....B...', '........', '#####.##', '........', '........', '........', '........', '........', '.S......', '........'],
  ['B......B', '........', '...##...', '...##...', '...##...', '........', '........', '........', '...S....', '........'],
  ['...B....', '.......a', '########', '........', '........', '........', '..A.....', '........', '.....S..', '........'],
  ['B.#..#.B', '..#..#..', '..#..#..', '..#..#..', '........', '........', '##.##.##', '........', '...S....', '........'],
  ['...B....', '.######.', '.#....#.', '.#.B..#.', '.#....#.', '.##.###.', '........', '........', '......S.', '........'],
  ['B..a...B', '........', '########', '........', 'B.....B.', '........', '.####...', '.#..A...', '.#S.....', '........'],
  ['B.......', '.#######', '........', '#######.', '........', '.#######', '........', '#######.', '......S.', 'B.......'],
  ['B..#..B.', '...#....', 'a..#..##', '####....', '...B....', '.##.##.#', '......#.', 'B##.A..#', '...#..S.', 'B..#....'],
];
const W = 8, H = 10;
const KEY = 'mg:domino';
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
const save = (s) => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {} };
const N8 = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];

function parse(rows) {
  const L = { walls: new Set(), bells: [], start: null, A: null, a: null };
  rows.forEach((r, y) => [...r].forEach((c, x) => { const k = y * W + x; if (c === '#') L.walls.add(k); if (c === 'B') L.bells.push(k); if (c === 'S') L.start = k; if (c === 'A') L.A = k; if (c === 'a') L.a = k; }));
  return L;
}
const nbrs = (k) => { const x = k % W, y = Math.floor(k / W); return N8.map(([dx, dy]) => [x + dx, y + dy]).filter(([a, b]) => a >= 0 && b >= 0 && a < W && b < H).map(([a, b]) => b * W + a); };
// Estimation du nombre minimal de dominos (arbre glouton vers chaque cloche)
function estimate(L) {
  const blocked = (k) => L.walls.has(k) || L.bells.includes(k) || k === L.A || k === L.a;
  const tree = new Set([L.start]); let cost = 0; const rung = new Set();
  const portalOf = (k) => (k === L.A ? L.a : k === L.a ? L.A : null);
  for (let guard = 0; guard < 10 && rung.size < L.bells.length; guard++) {
    // Sources : arbre + portails activés
    const src = new Set(tree); for (const k of [...tree]) for (const n of nbrs(k)) { const p = portalOf(n); if (p != null) src.add(p); }
    for (const k of [...src]) for (const n of nbrs(k)) if (L.bells.includes(n)) rung.add(n);
    if (rung.size >= L.bells.length) break;
    const prev = new Map(), q = [...src]; src.forEach((k) => prev.set(k, null)); let hitK = null;
    while (q.length && hitK == null) { const k = q.shift(); for (const n of nbrs(k)) { if (prev.has(n) || blocked(n)) continue; prev.set(n, k); if (nbrs(n).some((b) => L.bells.includes(b) && !rung.has(b)) || nbrs(n).some((b) => portalOf(b) != null && !src.has(portalOf(b)))) { hitK = n; break; } q.push(n); } }
    if (hitK == null) return 99;
    for (let k = hitK; k != null && !src.has(k); k = prev.get(k)) { tree.add(k); cost++; }
  }
  return cost;
}

export default {
  start(ctx) {
    const stars = load();
    const total = () => LEVELS.reduce((s, _, i) => s + (stars[i] || 0), 0);
    let three = false, bigBells = false;
    const finish = () => { const done = LEVELS.filter((_, i) => stars[i] > 0).length; ctx.end({ score: total(), display: `${total()} ⭐`, emoji: '🁫', title: done === LEVELS.length ? 'Réaction totale !' : done >= 5 ? 'Belle mécanique' : 'Premiers dominos', label: `${done}/${LEVELS.length} tableaux · ${total()}/${LEVELS.length * 3} étoiles`, feats: [three && 'econome', bigBells && 'cloches', done === LEVELS.length && 'tout'].filter(Boolean) }); };
    const picker = () => {
      ctx.stage.replaceChildren(); ctx.hud({ stars: `${total()} ⭐` });
      ctx.stage.append(h('div.center-stage', { style: { gap: '12px', overflowY: 'auto' } }, h('div.big-msg', { style: { fontSize: '26px' } }, 'Choisis un tableau'),
        h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: '8px', width: 'min(94vw,460px)' } }, LEVELS.map((_, i) => { const open = i === 0 || stars[i - 1] > 0, s = stars[i] || 0; return h('button.btn', { disabled: !open, style: { flexDirection: 'column', minHeight: '74px', padding: '4px', opacity: open ? 1 : 0.45 }, onclick: () => play(i) }, h('b', { style: { fontSize: '20px' } }, open ? i + 1 : '🔒'), h('span', { style: { fontSize: '12px', letterSpacing: '1px' } }, '★'.repeat(s) + '☆'.repeat(3 - s))); })),
        h('p.faint', { style: { textAlign: 'center', maxWidth: '380px' } }, '3 ⭐ avec presque le minimum de dominos.'),
        h('button.btn.btn-primary.btn-lg', { onclick: finish }, `Terminer · ${total()} ⭐`)));
    };
    const play = (li) => {
      const L = parse(LEVELS[li]), est = estimate(L), MAX = Math.ceil(est * 1.6) + 2;
      const placed = new Set(); let mode = 'edit', paint = null;
      const cells = [];
      const grid = h('div', { style: { display: 'grid', gridTemplateColumns: `repeat(${W},1fr)`, gap: '3px', width: `min(94vw, calc((100dvh - 250px) * ${W / H}), 420px)`, touchAction: 'none', userSelect: 'none' } });
      for (let k = 0; k < W * H; k++) {
        const kind = L.walls.has(k) ? 'wall' : L.bells.includes(k) ? 'bell' : k === L.start ? 'start' : k === L.A || k === L.a ? 'portal' : 'empty';
        const el = h('div', { style: { aspectRatio: '1', borderRadius: '8px', display: 'grid', placeItems: 'center', fontSize: 'clamp(16px,5vw,24px)', background: kind === 'wall' ? '#3a3550' : 'rgba(255,255,255,.06)', transition: 'transform .15s, background .15s' } }, kind === 'bell' ? '🔔' : kind === 'start' ? '👉' : kind === 'portal' ? (k === L.A ? '🌀' : '🌀') : '');
        if (kind === 'portal') el.style.background = k === L.A ? 'rgba(124,92,255,.35)' : 'rgba(124,92,255,.2)';
        cells.push({ el, kind }); grid.append(el);
      }
      const info = h('div', { style: { fontWeight: 800, fontSize: '18px' } });
      const msg = h('div', { style: { minHeight: '22px', fontWeight: 700 } });
      const bar = h('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' } });
      const paintInfo = () => { info.textContent = `Tableau ${li + 1} · 🁫 ${placed.size}/${MAX}`; info.style.color = placed.size > MAX ? 'var(--bad)' : ''; };
      const paintCell = (k) => { const c = cells[k]; if (c.kind !== 'empty') return; c.el.textContent = placed.has(k) ? '▮' : ''; c.el.style.color = '#ffd23f'; c.el.style.background = placed.has(k) ? 'rgba(255,210,63,.18)' : 'rgba(255,255,255,.06)'; c.el.style.transform = ''; };
      const cellAt = (e) => { const r = grid.getBoundingClientRect(); const x = Math.floor(((e.clientX - r.left) / r.width) * W), y = Math.floor(((e.clientY - r.top) / r.height) * H); return x >= 0 && y >= 0 && x < W && y < H ? y * W + x : -1; };
      const apply = (k) => { if (k < 0 || cells[k].kind !== 'empty') return; if (paint === 'add' && !placed.has(k) && placed.size < MAX) { placed.add(k); sfx.tick(); vibrate(3); } else if (paint === 'del' && placed.has(k)) { placed.delete(k); } paintCell(k); paintInfo(); };
      grid.addEventListener('pointerdown', (e) => { if (mode !== 'edit') return; e.preventDefault(); grid.setPointerCapture(e.pointerId); const k = cellAt(e); if (k < 0) return; paint = placed.has(k) ? 'del' : 'add'; apply(k); });
      grid.addEventListener('pointermove', (e) => { if (paint) apply(cellAt(e)); });
      const stopPaint = () => (paint = null); grid.addEventListener('pointerup', stopPaint); grid.addEventListener('pointercancel', stopPaint);
      const editBar = () => bar.replaceChildren(h('button.btn', { onclick: picker }, '← Tableaux'), h('button.btn', { onclick: () => { placed.clear(); for (let k = 0; k < W * H; k++) paintCell(k); paintInfo(); } }, '↺ Effacer'), h('button.btn.btn-primary', { onclick: push }, '👉 Pousser'));
      const push = async () => {
        if (mode !== 'edit') return; mode = 'run'; bar.replaceChildren(); msg.textContent = '';
        const fallen = new Set(), rung = new Set(); let front = [L.start]; const used = placed.size;
        const portalOf = (k) => (k === L.A ? L.a : k === L.a ? L.A : null);
        cells[L.start].el.style.transform = 'rotate(-25deg) scale(.9)'; sfx.pop();
        while (front.length && ctx.alive) {
          await ctx.wait(110); const nxt = [];
          for (const k of front) for (const n of nbrs(k)) {
            if (L.bells.includes(n) && !rung.has(n)) { rung.add(n); cells[n].el.style.background = 'rgba(255,210,63,.6)'; cells[n].el.animate([{ transform: 'rotate(-20deg) scale(1.3)' }, { transform: 'rotate(20deg)' }, { transform: 'none' }], { duration: 400 }); tone(1100 + rung.size * 120, 0.35, { type: 'sine', vol: 0.2 }); vibrate(12); }
            const p = portalOf(n); if (p != null && !fallen.has(p)) { fallen.add(p); fallen.add(n); nxt.push(p); cells[n].el.animate([{ transform: 'scale(1.3)' }, { transform: 'none' }], { duration: 300 }); cells[p].el.animate([{ transform: 'scale(1.3)' }, { transform: 'none' }], { duration: 300 }); tone(500, 0.2, { type: 'triangle', vol: 0.15, slide: 400 }); }
            if (placed.has(n) && !fallen.has(n)) { fallen.add(n); nxt.push(n); cells[n].el.style.transform = `rotate(${R(n)}deg) scale(.9)`; cells[n].el.style.background = 'rgba(255,92,122,.35)'; tone(300 + (fallen.size % 12) * 40, 0.04, { type: 'square', vol: 0.05 }); }
          }
          front = nxt;
        }
        if (!ctx.alive) return;
        const ok = rung.size === L.bells.length;
        if (ok) {
          const st = used <= est + 1 ? 3 : used <= Math.ceil(est * 1.3) + 1 ? 2 : 1; if (st === 3) three = true; if (L.bells.length >= 5) bigBells = true;
          if (st > (stars[li] || 0)) { stars[li] = st; save(stars); }
          sfx.win(); ctx.flash('rgba(61,220,151,.3)'); ctx.pop('★'.repeat(st) + '☆'.repeat(3 - st), ctx.stage.clientWidth / 2, ctx.stage.clientHeight * 0.3, '#ffd23f', 40);
          msg.textContent = st === 3 ? `Parfait : ${used} dominos !` : `Réussi avec ${used} dominos. Essaie avec moins !`; msg.style.color = 'var(--ok)';
        } else { sfx.bad(); ctx.shake(5); msg.textContent = `${rung.size}/${L.bells.length} cloches. Il manque un maillon !`; msg.style.color = 'var(--bad)'; }
        ctx.hud({ stars: `${total()} ⭐` });
        bar.replaceChildren(...[h('button.btn', { onclick: picker }, '← Tableaux'), h('button.btn', { onclick: () => { mode = 'edit'; for (let k = 0; k < W * H; k++) { paintCell(k); if (cells[k].kind === 'bell') cells[k].el.style.background = 'rgba(255,255,255,.06)'; } cells[L.start].el.style.transform = ''; editBar(); msg.textContent = ''; } }, ok ? '🔧 Améliorer' : '🔧 Corriger'), ok && li < LEVELS.length - 1 ? h('button.btn.btn-primary', { onclick: () => play(li + 1) }, 'Suivant →') : null, ok && li === LEVELS.length - 1 ? h('button.btn.btn-primary', { onclick: finish }, 'Terminer') : null].filter(Boolean));
      };
      const R = (n) => ((n * 37) % 50) - 25;
      ctx.stage.replaceChildren(h('div.center-stage', { style: { gap: '10px' } }, info, h('div.faint', { style: { fontSize: '13px', textAlign: 'center' } }, 'Glisse le doigt pour poser des dominos ▮ · 🌀 relie deux portails'), grid, msg, bar));
      paintInfo(); editBar();
    };
    picker();
  },
};
