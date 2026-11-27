import { h } from '../core/dom.js';
import { sfx, vibrate } from '../core/sfx.js';
import { PCOLORS } from '../core/players.js';

const ICONS = ['🍎', '🚀', '🐙', '🎸', '🌵', '🍩', '⚽', '🦄', '🎈', '🐢', '🍉', '👑', '🌈', '🔥', '🐝', '🎲', '🍄', '⭐', '🐳', '🍕', '🦊', '🎁', '🌙', '🧊'];
const LEVELS = [[3, 2], [4, 3], [4, 4], [5, 4], [6, 5]]; // colonnes × lignes (solo) ; 6×5 = 15 paires

export default {
  start(ctx) {
    const R = ctx.rng, mode = ctx.mode || 'solo';
    const solo = mode === 'solo', bot = mode === 'bot';
    const names = solo ? ['Toi'] : bot ? ['Toi', 'L’ordi'] : ['Joueur 1', 'Joueur 2'];
    let score = 0, level = 0, combo = 0, bestCombo = 0, cleanGrid = false, turn = 0, timeLeft = 0;
    const pairs = [0, 0];
    const head = h('div', { style: { textAlign: 'center' } });
    const grid = h('div', { style: { display: 'grid', gap: '8px', width: 'min(94vw,62vh,560px)' } });
    const bar = h('div.bar', { style: { width: 'min(94vw,560px)', visibility: solo ? 'visible' : 'hidden' } }, h('i', { style: { width: '100%' } }));
    ctx.stage.append(h('div.center-stage', { style: { gap: '12px' } }, head, grid, bar));
    const memory = new Map(); // mémoire imparfaite de l'ordi : index -> icône

    const runGrid = ([cols, rows]) => new Promise((done) => {
      const n = (cols * rows) / 2;
      const deck = R.shuffle(R.shuffle(ICONS).slice(0, n).flatMap((x) => [x, x]));
      const state = deck.map(() => 'hidden'); let open = [], lock = true, errors = 0;
      memory.clear();
      grid.style.gridTemplateColumns = `repeat(${cols},1fr)`;
      const cards = deck.map((ic, i) => h('button', { 'aria-label': `Carte ${i + 1}`, onclick: () => flip(i, true),
        style: { aspectRatio: '3/4', borderRadius: '14px', border: '1px solid var(--border-strong)', fontSize: `min(${44 / cols}vmin, ${170 / cols}px)`, background: 'linear-gradient(160deg,#2b2f66,#1b1f45)', transition: 'transform .25s, background .25s', display: 'grid', placeItems: 'center', padding: 0 } }));
      grid.replaceChildren(...cards);
      const show = (i, on) => { cards[i].textContent = on ? deck[i] : ''; cards[i].style.background = on ? 'linear-gradient(160deg,#fff,#dcd6ff)' : 'linear-gradient(160deg,#2b2f66,#1b1f45)'; cards[i].style.transform = on ? 'rotateY(0)' : ''; };
      const paintHead = () => head.replaceChildren(
        h('div.faint', { style: { fontSize: '12px', fontWeight: 700, letterSpacing: '.1em' } }, solo ? `GRILLE ${level + 1}/5` : 'PAIRES'),
        solo ? h('div.big-msg', { style: { fontSize: '26px' } }, `${score} pts${combo > 1 ? ` · combo ×${combo}` : ''}`)
          : h('div', { style: { display: 'flex', gap: '18px', fontSize: '22px', fontWeight: 800 } }, names.map((nm, k) => h('span', { style: { color: PCOLORS[k], opacity: k === turn ? 1 : 0.45, textDecoration: k === turn ? 'underline' : 'none' } }, `${nm} ${pairs[k]}`))));
      paintHead();
      // Aperçu flash au début de chaque grille
      deck.forEach((_, i) => show(i, true));
      ctx.timeout(() => { deck.forEach((_, i) => show(i, false)); lock = false; if (bot && turn === 1) botTurn(); }, 900 + n * 120);
      const flip = (i, human) => {
        if (lock || state[i] !== 'hidden' || open.includes(i) || (human && bot && turn === 1)) return;
        show(i, true); sfx.tick(); open.push(i);
        if (R.chance(0.7)) memory.set(i, deck[i]);
        if (open.length < 2) return;
        lock = true; const [a, b] = open;
        if (deck[a] === deck[b]) {
          state[a] = state[b] = 'done'; memory.delete(a); memory.delete(b);
          combo++; bestCombo = Math.max(bestCombo, combo);
          const gain = 50 * combo; if (solo) score += gain; else pairs[turn]++;
          [a, b].forEach((k) => { cards[k].style.background = 'rgba(61,220,151,.35)'; cards[k].animate([{ transform: 'scale(1.15)' }, { transform: 'scale(1)' }], { duration: 250 }); });
          sfx.ok(); vibrate(15);
          if (solo) { const r = cards[b].getBoundingClientRect(), s = ctx.stage.getBoundingClientRect(); ctx.pop(combo > 1 ? `+${gain} combo ×${combo}` : `+${gain}`, r.left - s.left + r.width / 2, r.top - s.top, combo > 1 ? '#ffd23f' : '#3ddc97', 24); }
          open = []; lock = false; paintHead();
          if (state.every((x) => x === 'done')) { cleanGrid = cleanGrid || errors === 0; ctx.timeout(() => done(errors), 500); return; }
          if (bot && turn === 1) ctx.timeout(botTurn, 700);
        } else {
          combo = 0; errors++; sfx.bad();
          ctx.timeout(() => { show(a, false); show(b, false); open = []; lock = false; if (!solo) turn = 1 - turn; paintHead(); if (bot && turn === 1) ctx.timeout(botTurn, 500); }, 750);
        }
      };
      // L'ordi : joue une paire connue s'il en voit une, sinon retourne au hasard
      const botTurn = () => {
        if (!ctx.alive || turn !== 1) return;
        const hidden = state.map((x, i) => (x === 'hidden' ? i : -1)).filter((i) => i >= 0);
        const known = [...memory.entries()].filter(([i]) => state[i] === 'hidden');
        let pair = null;
        for (const [i, ic] of known) { const j = known.find(([k, c]) => k !== i && c === ic); if (j) { pair = [i, j[0]]; break; } }
        const first = pair ? pair[0] : R.pick(hidden);
        flip(first, false);
        ctx.timeout(() => {
          const twin = pair ? pair[1] : [...memory.entries()].find(([k, c]) => k !== first && c === deck[first] && state[k] === 'hidden')?.[0];
          flip(twin ?? R.pick(hidden.filter((k) => k !== first)), false);
        }, 650);
      };
    });

    const play = async () => {
      if (solo) {
        timeLeft = 30;
        ctx.interval(() => { timeLeft -= 0.1; bar.firstChild.style.width = Math.max(0, (timeLeft / 60) * 100) + '%'; ctx.hud({ time: `${Math.max(0, Math.ceil(timeLeft))} s` }); if (timeLeft <= 0 && ctx.alive) finish(); }, 100);
        for (level = 0; level < LEVELS.length && ctx.alive; level++) {
          await runGrid(LEVELS[level]); if (!ctx.alive) return;
          const bonus = Math.round(timeLeft) * 10; score += bonus; timeLeft = Math.min(60, timeLeft + 12 + level * 4);
          ctx.pop(`Grille finie ! +${bonus} · +${12 + level * 4} s`, ctx.stage.clientWidth / 2, ctx.stage.clientHeight * 0.2, '#ffd23f', 24); sfx.win();
        }
        if (ctx.alive) finish(true);
      } else {
        ctx.hud({ mode: bot ? '🤖 Contre l’ordi' : '👥 Duel' });
        await runGrid([5, 4]); if (!ctx.alive) return;
        const d = pairs[0] - pairs[1];
        ctx.end({
          score: bot ? Math.max(0, d) : null, record: bot, board: bot ? 'bot' : null, multi: !bot, display: `${pairs[0]} – ${pairs[1]}`,
          emoji: d > 0 ? '🏆' : d < 0 ? (bot ? '🤖' : '🏆') : '🤝', win: bot ? d > 0 : true,
          title: d === 0 ? 'Égalité !' : `${names[d > 0 ? 0 : 1]} gagne !`, label: '10 paires, une seule mémoire',
          feats: [bestCombo >= 4 && 'combo', cleanGrid && 'eclair'].filter(Boolean),
        });
      }
    };
    let ended = false;
    const finish = (all = false) => {
      if (ended) return; ended = true;
      ctx.end({ score, display: `${score} pts`, emoji: '🃏', title: all ? 'Les 5 grilles !' : `Grille ${level + 1} atteinte`, label: `Combo max ×${bestCombo}`, win: all,
        feats: [all && 'cinq', bestCombo >= 4 && 'combo', cleanGrid && 'eclair'].filter(Boolean) });
    };
    play();
  },
};
