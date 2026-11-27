import { h, sleep } from '../core/dom.js';
import { sfx, vibrate } from '../core/sfx.js';
import { makeRng, todayKey } from '../core/rng.js';

const COLORS = [['ROUGE', '#ff3d5a'], ['BLEU', '#3a8bff'], ['VERT', '#2ecc71'], ['JAUNE', '#ffd23f']];
const ODD = [['😀', '😃'], ['🐶', '🐱'], ['🍎', '🍅'], ['⭐', '🌟'], ['🔵', '🟣'], ['🌲', '🌳'], ['😺', '😸'], ['🚗', '🚙'], ['🌕', '🌝'], ['🐟', '🐠'], ['💙', '💜'], ['🍩', '🍪']];
const COUNT_EMO = ['🐞', '⭐', '🍒', '🐸', '💎', '🎈'];
const ARROWS = [['⬆️', 'haut', '⬇️'], ['➡️', 'droite', '⬅️'], ['⬇️', 'bas', '⬆️'], ['⬅️', 'gauche', '➡️']];
const TYPES = {
  green: { name: 'Touche quand c’est VERT', tag: 'Réflexe', base: 0.34, fail: 0.06 },
  target: { name: 'Touche la cible', tag: 'Précision', base: 0.6, fail: 0.04 },
  stroop: { name: 'Touche la couleur ÉCRITE', tag: 'Attention', base: 0.95, fail: 0.12 },
  mash: { name: 'Tape 12 fois, vite !', tag: 'Endurance', base: 1.9, fail: 0.02 },
  odd: { name: 'Trouve l’intrus', tag: 'Œil de lynx', base: 1.3, fail: 0.08 },
  count: { name: 'Combien en as-tu vu ?', tag: 'Mémoire flash', base: 1.2, fail: 0.14 },
  math: { name: 'Calcul éclair', tag: 'Cerveau', base: 1.5, fail: 0.1 },
  arrow: { name: 'Suis la flèche… ou pas', tag: 'Réflexe inversé', base: 0.8, fail: 0.12 },
  memory: { name: 'Répète la séquence', tag: 'Mémoire', base: 2.2, fail: 0.15 },
};

export default {
  start(ctx) {
    const { stage } = ctx;
    const daily = ctx.mode === 'jour';
    const R = daily ? makeRng('royale-' + todayKey()) : ctx.rng;
    // L'ordre des épreuves : jamais deux fois la même de suite, les plus dures arrivent ensuite.
    const easy = ['green', 'target', 'stroop', 'mash', 'odd'], hard = ['count', 'math', 'arrow', 'memory', 'odd', 'stroop'];
    const plan = []; for (let i = 0; i < 14; i++) { const pool = i < 3 ? easy : [...easy, ...hard, ...hard]; let t; do t = R.pick(pool); while (t === plan[i - 1]); plan.push(t); }
    const bots = Array.from({ length: 99 }, () => ({ skill: R.float(0.72, 1.38), alive: true }));
    let round = 0, alive = 100, eliminatedAt = 0, bestMs = Infinity, perfect = true, clutch = false;
    const times = [];
    const dots = h('div', { 'aria-hidden': 'true', style: { display: 'grid', gridTemplateColumns: 'repeat(20,1fr)', gap: '3px', width: 'min(92vw,420px)' } },
      Array.from({ length: 100 }, (_, i) => h('i', { style: { aspectRatio: '1', borderRadius: '50%', background: i === 0 ? '#fff' : 'var(--p4)', transition: 'all .4s', display: 'block' } })));
    const head = h('div', { style: { textAlign: 'center' } });
    const arena = h('div', { style: { position: 'relative', width: 'min(92vw,520px)', flex: 1, maxHeight: '420px', minHeight: '270px', borderRadius: '28px', background: 'rgba(255,255,255,.05)', border: '1px solid var(--border)', overflow: 'hidden', display: 'grid', placeItems: 'center', touchAction: 'manipulation', userSelect: 'none' } });
    const bar = h('div', { style: { position: 'absolute', left: 0, bottom: 0, height: '5px', background: 'linear-gradient(90deg,#ffd23f,#ff3d77)', width: '100%', zIndex: 3 } });
    stage.append(h('div.center-stage', { style: { justifyContent: 'flex-start', paddingTop: '18px', gap: '14px' } }, head, dots, arena));

    const paintDots = () => [...dots.children].forEach((d, i) => { const on = i === 0 ? !eliminatedAt : bots[i - 1].alive; d.style.background = on ? (i === 0 ? '#fff' : 'var(--p4)') : 'rgba(255,255,255,.08)'; d.style.transform = on ? '' : 'scale(.6)'; });
    const setHead = (title, sub) => head.replaceChildren(h('div', { style: { fontSize: '13px', letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--text-3)', fontWeight: 700 } }, sub), h('div.big-msg', { style: { fontSize: 'clamp(22px,6vw,36px)' } }, title));
    const btnStyle = (bg = 'rgba(255,255,255,.08)') => ({ minHeight: '62px', borderRadius: '18px', border: '1px solid var(--border)', background: bg, color: '#fff', fontSize: '26px', fontWeight: 800 });
    const grid = (cols, kids) => h('div', { style: { display: 'grid', gridTemplateColumns: `repeat(${cols},1fr)`, gap: '10px', width: '100%', padding: '16px' } }, kids);

    // Chaque épreuve résout avec le temps du joueur en s (Infinity = raté). Le temps limite baisse avec les manches.
    const play = (type) => new Promise((res) => {
      let t0 = 0, done = false;
      const limit = Math.max(2600, 5000 - round * 180);
      const finish = (v) => { if (done) return; done = true; bar.getAnimations().forEach((a) => a.cancel()); res(v); };
      const go = () => { t0 = performance.now(); arena.append(bar); bar.animate([{ width: '100%' }, { width: '0%' }], { duration: limit, fill: 'forwards' }); ctx.timeout(() => finish(Infinity), limit); };
      const ok = () => { sfx.ok(); finish((performance.now() - t0) / 1000); };
      const ko = () => { sfx.bad(); vibrate(40); finish(Infinity); };
      const T = TYPES[type]; setHead(T.name, T.tag);
      if (type === 'green') {
        const fake = round > 3 && R.chance(0.5);
        const pad = h('button', { style: { position: 'absolute', inset: 0, border: 0, background: '#ff3d5a', color: '#fff', fontSize: '30px', fontWeight: 800 } }, 'Attends…');
        arena.replaceChildren(pad);
        let green = false;
        if (fake) ctx.timeout(() => { if (!done && !green) { pad.style.background = '#2ec4cc'; pad.textContent = 'Pas encore…'; } }, R.float(500, 1000));
        ctx.timeout(() => { if (done) return; green = true; pad.style.background = '#2ecc71'; pad.textContent = 'MAINTENANT !'; go(); }, R.float(1300, 2900));
        pad.onpointerdown = () => { if (!green) { pad.textContent = 'Trop tôt !'; ko(); } else ok(); };
      } else if (type === 'target') {
        const size = Math.max(40, 70 - round * 3);
        arena.replaceChildren(h('p.muted', 'Prépare-toi…'));
        ctx.timeout(() => {
          const x = R.float(12, 88), y = R.float(15, 82);
          const tg = h('button', { 'aria-label': 'Cible', onpointerdown: (e) => { e.stopPropagation(); sfx.pop(); ok(); },
            style: { position: 'absolute', left: x + '%', top: y + '%', transform: 'translate(-50%,-50%)', width: size + 'px', height: size + 'px', borderRadius: '50%', border: '0', background: 'radial-gradient(circle,#fff 0 18%,#ff3d5a 19% 42%,#fff 43% 60%,#ff3d5a 61%)', boxShadow: '0 0 30px #ff3d5a88', animation: 'pop .25s var(--spring) both' } });
          arena.replaceChildren(tg);
          arena.onpointerdown = ko;
          // Plus tard, la cible bouge.
          if (round > 4) { let a = 0; const iv = ctx.interval(() => { if (done) return clearInterval(iv); a += 0.12; tg.style.left = `${Math.min(90, Math.max(10, x + Math.sin(a) * 18))}%`; }, 30); }
          go();
        }, R.float(500, 1200));
      } else if (type === 'stroop') {
        const [word, col] = R.pick(COLORS); const ink = R.pick(COLORS.filter((c) => c[0] !== word))[1];
        arena.replaceChildren(h('div', { style: { display: 'grid', gap: '14px', placeItems: 'center', width: '100%' } },
          h('div', { style: { fontSize: 'clamp(44px,12vw,72px)', fontWeight: 900, color: ink, letterSpacing: '.04em' } }, word),
          grid(2, R.shuffle(COLORS).map(([n, c]) => h('button', { 'aria-label': n, style: { ...btnStyle(c), border: 0 }, onpointerdown: () => (c === col ? ok() : ko()) })))));
        go();
      } else if (type === 'mash') {
        let n = 0; const cnt = h('div', { style: { fontSize: '64px', fontWeight: 900 } }, '0/12');
        const btn = h('button', { style: { position: 'absolute', inset: 0, border: 0, color: '#fff', background: 'radial-gradient(circle at 50% 40%,#ffd23f55,transparent 70%)' } }, cnt);
        btn.onpointerdown = () => { n++; cnt.textContent = `${n}/12`; sfx.tick(); vibrate(5); cnt.animate([{ transform: 'scale(1.15)' }, { transform: 'scale(1)' }], { duration: 90 }); if (n >= 12) ok(); };
        arena.replaceChildren(btn); go();
      } else if (type === 'odd') {
        const [a, b] = R.pick(ODD); const n = round > 5 ? 25 : 16; const k = R.int(0, n - 1);
        arena.replaceChildren(grid(Math.sqrt(n), Array.from({ length: n }, (_, i) => h('button', { style: { ...btnStyle(), minHeight: '44px', fontSize: n > 16 ? '24px' : '30px', padding: 0 }, onpointerdown: () => (i === k ? ok() : ko()) }, i === k ? b : a))));
        go();
      } else if (type === 'count') {
        const n = R.int(4, 6 + Math.min(6, round)); const e = R.pick(COUNT_EMO);
        arena.replaceChildren(...Array.from({ length: n }, () => h('span', { style: { position: 'absolute', left: R.float(8, 86) + '%', top: R.float(8, 80) + '%', fontSize: '34px' } }, e)));
        ctx.timeout(() => {
          if (done) return;
          const opts = R.shuffle([n, n + 1, n - 1, n + 2].filter((v) => v > 0)).slice(0, 4);
          if (!opts.includes(n)) opts[0] = n;
          arena.replaceChildren(grid(2, R.shuffle(opts).map((v) => h('button', { style: btnStyle(), onpointerdown: () => (v === n ? ok() : ko()) }, `${v} ${e}`))));
          go();
        }, Math.max(650, 1300 - round * 50));
      } else if (type === 'math') {
        const big = round > 6; const a = R.int(2, big ? 15 : 9), b = R.int(2, big ? 12 : 9); const op = R.pick(big ? ['+', '−', '×'] : ['+', '−']);
        const v = op === '+' ? a + b : op === '−' ? a - b : a * b;
        const opts = R.shuffle([...new Set([v, v + 1, v - 1, v + 10, v - 2])]).slice(0, 4); if (!opts.includes(v)) opts[0] = v;
        arena.replaceChildren(h('div', { style: { display: 'grid', gap: '10px', placeItems: 'center', width: '100%' } },
          h('div', { style: { fontSize: '56px', fontWeight: 900 } }, `${a} ${op} ${b}`),
          grid(2, R.shuffle(opts).map((o) => h('button', { style: btnStyle(), onpointerdown: () => (o === v ? ok() : ko()) }, String(o))))));
        go();
      } else if (type === 'arrow') {
        const [icon, , opp] = R.pick(ARROWS); const inverse = R.chance(round > 3 ? 0.5 : 0.25);
        const want = inverse ? opp : icon;
        arena.replaceChildren(h('div', { style: { display: 'grid', gap: '8px', placeItems: 'center', width: '100%' } },
          h('div', { style: { fontSize: '76px', filter: inverse ? 'drop-shadow(0 0 16px #ff3d5a) hue-rotate(140deg)' : 'none' } }, icon),
          h('div', { style: { fontWeight: 800, color: inverse ? '#ff5c7a' : '#3ddc97' } }, inverse ? 'INVERSE : touche le contraire' : 'Touche la même'),
          grid(4, ARROWS.map(([ic]) => h('button', { style: { ...btnStyle(), fontSize: '30px', padding: 0 }, onpointerdown: () => (ic === want ? ok() : ko()) }, ic)))));
        go();
      } else if (type === 'memory') {
        const len = round > 7 ? 5 : 4; const seq = Array.from({ length: len }, () => R.int(0, 8));
        const cells = Array.from({ length: 9 }, (_, i) => h('button', { style: { ...btnStyle(), minHeight: '58px' }, 'aria-label': `Case ${i + 1}` }));
        arena.replaceChildren(grid(3, cells));
        let step = 0, input = false;
        cells.forEach((c, i) => (c.onpointerdown = () => { if (!input) return; c.animate([{ background: '#ffd23f' }, { background: 'rgba(255,255,255,.08)' }], { duration: 220 }); if (seq[step] !== i) return ko(); sfx.tick(); if (++step >= len) ok(); }));
        (async () => {
          await sleep(400);
          for (const i of seq) { if (done || !ctx.alive) return; cells[i].animate([{ background: '#ffd23f', transform: 'scale(1.06)' }, { background: 'rgba(255,255,255,.08)' }], { duration: 420 }); sfx.tick(); await sleep(Math.max(330, 520 - round * 15)); }
          input = true; setHead('À toi !', 'Mémoire'); go();
        })();
      }
    });
    const botTime = (type, skill) => {
      const T = TYPES[type]; const late = 1 + round * 0.04; // les survivants sont aussi les meilleurs
      if (R.next() < T.fail / skill / late) return Infinity;
      return T.base / (skill * late) + Math.abs(R.float(-0.12, 0.28)) * T.base;
    };

    const loopRounds = async () => {
      await ctx.countdown(3);
      while (ctx.alive) {
        round++;
        const type = plan[(round - 1) % plan.length];
        ctx.hud({ round: `Manche ${round}`, alive: `${alive} en lice` });
        setHead(alive <= 3 ? 'FINALE' : `Manche ${round}`, `${alive} joueurs · ${TYPES[type].tag}`);
        arena.replaceChildren(h('div.countdown', { style: { fontSize: '80px' } }, alive <= 3 ? '🔥' : '⚡'));
        await sleep(850); if (!ctx.alive) return;
        arena.onpointerdown = null;
        const mine = await play(type); if (!ctx.alive) return;
        arena.onpointerdown = null; bar.remove();
        if (mine === Infinity) perfect = false; else { times.push(mine); if (type === 'green') bestMs = Math.min(bestMs, mine * 1000); }
        const live = bots.filter((b) => b.alive).map((b) => ({ b, t: botTime(type, b.skill) }));
        const all = [...live, { me: true, t: mine }].sort((a, b) => a.t - b.t);
        const keep = alive <= 3 ? alive - 1 : Math.max(2, Math.round(alive * 0.6));
        const survivors = new Set(all.slice(0, keep).filter((x) => x.t < Infinity));
        if (survivors.size === 0 && mine < Infinity) survivors.add(all.find((x) => x.me));
        live.forEach((x) => { if (!survivors.has(x)) x.b.alive = false; });
        const meOk = [...survivors].some((x) => x.me);
        const myRank = all.findIndex((x) => x.me) + 1;
        if (meOk && myRank === keep) clutch = true;
        const before = alive; alive = survivors.size; paintDots();
        arena.replaceChildren(h('div', { style: { textAlign: 'center', display: 'grid', gap: '8px', padding: '12px' } },
          h('div', { style: { fontSize: '56px', animation: 'pop .3s var(--spring) both' } }, meOk ? '✅' : '❌'),
          h('div.big-msg', { style: { fontSize: '28px' } }, mine === Infinity ? 'Raté !' : `${(mine * 1000) | 0} ms`),
          h('p.muted', meOk ? `${myRank}e sur ${all.length}. Qualifié !${myRank === keep ? ' De justesse 😅' : myRank === 1 ? ' Le plus rapide ⚡' : ''}` : `${myRank}e sur ${all.length}. Éliminé…`),
          meOk ? h('p', { style: { color: 'var(--text-3)', fontSize: '14px' } }, `${before - alive} éliminés cette manche`) : null));
        if (meOk) { sfx.ok(); if (myRank === 1) ctx.pop('⚡ LE PLUS RAPIDE', stage.clientWidth / 2, stage.clientHeight * 0.3, '#ffd23f', 26); }
        else { sfx.boom(); vibrate(120); ctx.shake(8); ctx.flash('rgba(255,61,90,.35)'); }
        await sleep(1600); if (!ctx.alive) return;
        if (!meOk) { eliminatedAt = alive + 1; paintDots(); return end(alive + 1); }
        if (alive <= 1) return end(1);
      }
    };
    const end = (rank) => {
      const avg = times.length ? Math.round((times.reduce((a, b) => a + b, 0) / times.length) * 1000) : null;
      ctx.end({
        score: 101 - rank, display: `#${rank}`, emoji: rank === 1 ? '👑' : rank <= 10 ? '🥈' : '💀', win: rank === 1,
        board: daily ? 'jour' : null,
        title: rank === 1 ? 'TOP 1 ! Couronné !' : rank <= 3 ? 'Sur le podium !' : rank <= 10 ? 'Top 10, respect' : 'Éliminé',
        label: `${daily ? 'Royale du jour · ' : ''}Classement final sur 100 · ${round} manches${avg ? ` · moyenne ${avg} ms` : ''}`,
        feats: [rank === 1 && 'couronne', rank === 1 && perfect && round >= 6 && 'parfait', bestMs < 260 && 'eclair', clutch && rank <= 10 && 'justesse'].filter(Boolean),
        shareTail: daily ? 'Même épreuves pour tout le monde aujourd’hui.' : undefined,
      });
    };
    loopRounds();
  },
};
