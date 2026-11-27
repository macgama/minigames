import { h } from '../core/dom.js';
import { sfx, vibrate } from '../core/sfx.js';
import { makeRng, todayKey, dayNumber } from '../core/rng.js';
import { store, submitScore } from '../core/store.js';
import { share } from '../core/share.js';
import { isPremium } from '../core/premium.js';
import { confetti } from '../core/fx.js';

const COLORS = ['#ff3d5a', '#ffb547', '#ffe14d', '#3ddc97', '#4cc9f0', '#b388ff'];
const NAMES = ['rouge', 'orange', 'jaune', 'vert', 'bleu', 'violet'];
const LEN = 4, TRIES = 6;
const grade = (guess, code) => {
  let g = 0, y = 0; const cg = [], cc = [];
  guess.forEach((c, i) => (c === code[i] ? g++ : (cg.push(c), cc.push(code[i]))));
  cg.forEach((c) => { const k = cc.indexOf(c); if (k >= 0) { y++; cc.splice(k, 1); } });
  return [g, y];
};

export default {
  start(ctx) {
    const day = todayKey(), num = dayNumber();
    const r = makeRng('manigames-daily-' + day);
    const code = Array.from({ length: LEN }, () => r.int(0, COLORS.length - 1));
    const saved = store.get('daily:' + day, { rows: [], done: false, won: false });
    let rows = saved.rows, current = [];
    const board = h('div', { style: { display: 'grid', gap: '8px', width: 'min(92vw,360px)' } });
    const palette = h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: '8px', width: 'min(92vw,360px)' } });
    const actions = h('div.btn-row');
    const status = h('p.muted', { style: { minHeight: '1.4em' } });
    ctx.stage.append(h('div.center-stage', { style: { justifyContent: 'flex-start', paddingTop: '20px', gap: '14px', overflowY: 'auto' } },
      h('div', { style: { textAlign: 'center' } }, h('div.faint', { style: { fontWeight: 700, letterSpacing: '.12em', fontSize: '12px' } }, `DÉFI #${num}`), h('div.big-msg', { style: { fontSize: '26px' } }, 'Trouve le code secret')), board, status, palette, actions));
    ctx.hud({ day: `#${num}` });

    const peg = (c, big = true) => h('span', { style: { width: big ? '100%' : '12px', aspectRatio: '1', borderRadius: '50%', display: 'block', background: c == null ? 'rgba(255,255,255,.07)' : COLORS[c], boxShadow: c == null ? 'inset 0 0 0 2px rgba(255,255,255,.08)' : `inset 0 -4px 0 rgba(0,0,0,.2), 0 4px 14px ${COLORS[c]}55` } });
    const fb = ([gg, yy]) => h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(2,12px)', gap: '4px', placeContent: 'center' } },
      Array.from({ length: LEN }, (_, i) => h('span', { style: { width: '12px', height: '12px', borderRadius: '3px', background: i < gg ? '#3ddc97' : i < gg + yy ? '#ffc857' : 'rgba(255,255,255,.12)' } })));
    const paint = () => {
      board.replaceChildren(...Array.from({ length: TRIES }, (_, i) => {
        const row = rows[i]; const isCur = i === rows.length && !saved.done;
        const cells = row ? row.guess : isCur ? [...current, ...Array(LEN - current.length).fill(null)] : Array(LEN).fill(null);
        return h('div', { style: { display: 'grid', gridTemplateColumns: `repeat(${LEN},1fr) 44px`, gap: '10px', padding: '8px', borderRadius: '16px', background: isCur ? 'rgba(255,255,255,.07)' : 'transparent', border: isCur ? '1px solid var(--border-strong)' : '1px solid transparent' } },
          ...cells.map((c) => peg(c)), row ? fb(row.res) : h('span'));
      }));
      palette.replaceChildren(...COLORS.map((c, i) => h('button', { 'aria-label': NAMES[i], disabled: saved.done, onclick: () => add(i), style: { aspectRatio: '1', borderRadius: '50%', border: '3px solid rgba(255,255,255,.15)', background: c, opacity: saved.done ? 0.4 : 1 } })));
      actions.replaceChildren(...[saved.done
        ? h('button.btn.btn-primary', { onclick: doShare }, 'Partager ma grille')
        : h('button.btn', { onclick: () => { current.pop(); sfx.click(); paint(); }, disabled: !current.length }, '⌫ Effacer'),
        !saved.done && h('button.btn.btn-primary', { onclick: submit, disabled: current.length < LEN }, 'Valider')].filter(Boolean));
      if (saved.done) {
        const left = new Date(); left.setHours(24, 0, 0, 0); const mins = Math.round((left - Date.now()) / 60000);
        status.replaceChildren(h('b', { style: { color: saved.won ? 'var(--ok)' : 'var(--bad)' } }, saved.won ? `Trouvé en ${rows.length}/${TRIES} ! ` : 'Raté pour aujourd’hui. '), `Prochain défi dans ${Math.floor(mins / 60)} h ${mins % 60} min.`);
        if (!saved.won) board.append(h('div', { style: { display: 'grid', gridTemplateColumns: `repeat(${LEN},1fr) 44px`, gap: '10px', padding: '8px' } }, ...code.map((c) => peg(c)), h('span.faint', { style: { fontSize: '12px', alignSelf: 'center' } }, 'code')));
        if (!actions.querySelector('.archives')) actions.append(h(isPremium() ? 'button.btn.archives' : 'a.btn.archives', isPremium() ? { onclick: () => alert('Archives : à venir dans la version complète.') } : { href: '#/premium' }, isPremium() ? '📚 Archives' : '🔒 Archives (Premium)'));
      } else status.textContent = `Essai ${rows.length + 1} sur ${TRIES}`;
    };
    const add = (c) => { if (current.length < LEN) { current.push(c); sfx.note(c); vibrate(8); paint(); } };
    const submit = () => {
      if (current.length < LEN) return;
      const res = grade(current, code); rows.push({ guess: current, res }); current = [];
      const won = res[0] === LEN;
      if (won || rows.length >= TRIES) {
        saved.done = true; saved.won = won;
        submitScore('daily-defi', won ? TRIES + 1 - rows.length : 0, won ? `${rows.length}/${TRIES}` : `X/${TRIES}`);
        const st = store.get('dailyStreak', { last: null, n: 0 }); const y = new Date(); y.setDate(y.getDate() - 1);
        store.set('dailyStreak', { last: day, n: won ? (st.last === todayKey(y) ? st.n + 1 : 1) : 0 });
        won ? (confetti(), sfx.win()) : sfx.lose();
      } else { res[0] + res[1] ? sfx.ok() : sfx.bad(); }
      saved.rows = rows; store.set('daily:' + day, saved); paint();
    };
    const doShare = () => {
      const grid = rows.map((r) => '🟩'.repeat(r.res[0]) + '🟨'.repeat(r.res[1]) + '⬛'.repeat(LEN - r.res[0] - r.res[1])).join('\n');
      const streak = store.get('dailyStreak', { n: 0 }).n;
      share(`📅 Défi du jour #${num} : ${saved.won ? rows.length : 'X'}/${TRIES}${streak > 1 ? ` · série ${streak} 🔥` : ''}\n${grid}`, 'jeu/daily-defi');
    };
    ctx.on(window, 'keydown', (e) => { const k = Number(e.key); if (k >= 1 && k <= 6) add(k - 1); if (e.key === 'Backspace') { current.pop(); paint(); } if (e.key === 'Enter') submit(); });
    paint();
  },
};
