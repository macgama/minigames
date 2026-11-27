import { h } from '../core/dom.js';
import { sfx, vibrate } from '../core/sfx.js';
import { makeRng, todayKey } from '../core/rng.js';

const SCENES = [['🦁', '#ffb547', '#ff5c3a', '🌿'], ['🐙', '#00c2ff', '#3a1cff', '🫧'], ['🚀', '#1b1450', '#7c5cff', '⭐'], ['🦄', '#ff4fa3', '#b388ff', '✨'], ['🐸', '#3ddc97', '#00a86b', '🪷'], ['🍉', '#ff5c7a', '#3ddc97', '🌱'], ['🐧', '#4cc9f0', '#eaf4ff', '❄️'], ['🌋', '#ff3d5a', '#ffb547', '🔥']];

export default {
  start(ctx) {
    const mode = ctx.mode || '3';
    const N = mode === 'jour' ? 4 : +mode || 3;
    const R = mode === 'jour' ? makeRng('puzzle-' + todayKey()) : ctx.rng;
    const [emo, c1, c2, deco] = R.pick(SCENES);
    // Image générée : dégradé + gros emoji + motifs
    const S = 600, cv = document.createElement('canvas'); cv.width = cv.height = S; const g = cv.getContext('2d');
    const gr = g.createLinearGradient(0, 0, S, S); gr.addColorStop(0, c1); gr.addColorStop(1, c2); g.fillStyle = gr; g.fillRect(0, 0, S, S);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    for (let i = 0; i < 14; i++) { g.globalAlpha = 0.5; g.font = `${R.int(30, 70)}px sans-serif`; g.fillText(deco, R.float(20, S - 20), R.float(20, S - 20)); }
    g.globalAlpha = 0.18; g.fillStyle = '#fff'; for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(R.float(0, S), R.float(0, S), R.float(40, 120), 0, 7); g.fill(); }
    g.globalAlpha = 1; g.font = '360px sans-serif'; g.fillText(emo, S / 2, S / 2 + 20);
    const url = cv.toDataURL('image/jpeg', 0.85);

    // Mélange par coups légaux (toujours soluble)
    const tiles = Array.from({ length: N * N }, (_, i) => i); // tiles[pos] = n° de pièce ; N*N-1 = case vide
    let empty = N * N - 1;
    const nb = (p) => [p - N, p + N, p % N ? p - 1 : -1, (p + 1) % N ? p + 1 : -1].filter((q) => q >= 0 && q < N * N);
    let prev = -1;
    for (let k = 0; k < N * N * 30; k++) { const opts = nb(empty).filter((q) => q !== prev); const q = R.pick(opts); tiles[empty] = tiles[q]; tiles[q] = N * N - 1; prev = empty; empty = q; }
    let moves = 0, t0 = 0, started = false, done = false;
    const SZ = `min(92vw, calc(100dvh - 260px), 460px)`;
    const board = h('div', { style: { position: 'relative', width: SZ, height: SZ, borderRadius: '18px', background: 'rgba(0,0,0,.35)', boxShadow: '0 16px 40px rgba(0,0,0,.35)', touchAction: 'none' } });
    const ghost = h('img', { src: url, style: { width: '84px', height: '84px', borderRadius: '12px', boxShadow: '0 6px 18px rgba(0,0,0,.4)' } });
    const els = [];
    for (let n = 0; n < N * N - 1; n++) {
      const el = h('div', { style: { position: 'absolute', width: `calc(${100 / N}% - 4px)`, height: `calc(${100 / N}% - 4px)`, borderRadius: '10px', backgroundImage: `url(${url})`, backgroundSize: `${N * 100}% ${N * 100}%`, backgroundPosition: `${((n % N) / (N - 1)) * 100}% ${(Math.floor(n / N) / (N - 1)) * 100}%`, transition: 'left .12s ease-out, top .12s ease-out', cursor: 'pointer', boxShadow: 'inset 0 0 0 2px rgba(255,255,255,.35)' } },
        h('span', { style: { position: 'absolute', top: '3px', left: '6px', fontSize: '12px', fontWeight: 900, color: '#fff', textShadow: '0 1px 3px #000' } }, n + 1));
      el.addEventListener('pointerdown', (e) => { e.preventDefault(); tap(n); });
      els[n] = el; board.append(el);
    }
    const place = () => tiles.forEach((n, p) => { if (n === N * N - 1) return; els[n].style.left = `calc(${(p % N) * (100 / N)}% + 2px)`; els[n].style.top = `calc(${Math.floor(p / N) * (100 / N)}% + 2px)`; });
    const tap = (n) => {
      if (done) return;
      const p = tiles.indexOf(n);
      // On peut aussi faire glisser toute une ligne/colonne d'un coup
      const er = Math.floor(empty / N), ec = empty % N, pr = Math.floor(p / N), pc = p % N;
      if (er !== pr && ec !== pc) { sfx.tick(); els[n].animate([{ transform: 'translateX(-3px)' }, { transform: 'translateX(3px)' }, { transform: 'none' }], { duration: 120 }); return; }
      if (!started) { started = true; t0 = performance.now(); }
      const step = er === pr ? (pc > ec ? 1 : -1) : (pr > er ? N : -N);
      while (empty !== p) { const q = empty + step; tiles[empty] = tiles[q]; tiles[q] = N * N - 1; empty = q; moves++; }
      place(); sfx.tap(); vibrate(4); hud();
      if (tiles.every((x, i) => x === i)) win();
    };
    const hud = () => ctx.hud({ moves: `${moves} coups`, time: started ? `${Math.floor((performance.now() - t0) / 1000)} s` : '0 s' });
    ctx.interval(() => { if (started && !done) hud(); }, 250);
    const keys = { ArrowUp: N, ArrowDown: -N, ArrowLeft: 1, ArrowRight: -1 };
    ctx.on(window, 'keydown', (e) => { const d = keys[e.key]; if (d == null) return; e.preventDefault(); const q = empty + d; if (q < 0 || q >= N * N || (Math.abs(d) === 1 && Math.floor(q / N) !== Math.floor(empty / N))) return; tap(tiles[q]); });
    const win = () => {
      done = true; const sec = (performance.now() - t0) / 1000;
      const k = { 3: 8, 4: 3.5, 5: 2 }[N]; const score = Math.max(0, Math.round(1000 - sec * k - moves * (N === 3 ? 4 : 2)));
      els.forEach((el) => (el.style.boxShadow = 'none')); sfx.win(); ctx.flash('rgba(61,220,151,.3)'); vibrate([20, 40, 20]);
      board.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.04)' }, { transform: 'scale(1)' }], { duration: 500 });
      ctx.timeout(() => ctx.end({
        score, display: `${score} pts`, emoji: '🧩', board: N === 3 && mode !== 'jour' ? null : mode,
        title: score >= 750 ? 'Doigts de fée' : score >= 450 ? 'Joli puzzle' : 'Reconstitué, c’est l’essentiel',
        label: `${N} × ${N} · ${Math.round(sec)} s · ${moves} coups`,
        feats: [N === 3 && sec < 30 && 'rapide', N === 4 && 'quatre', N === 5 && 'cinq'].filter(Boolean),
      }), 1100);
    };
    ctx.stage.append(h('div.center-stage', { style: { gap: '12px' } }, h('div', { style: { display: 'flex', gap: '12px', alignItems: 'center' } }, ghost, h('div.muted', { style: { maxWidth: '200px' } }, 'Touche une pièce sur la ligne ou la colonne de la case vide.')), board));
    place(); hud();
  },
};
