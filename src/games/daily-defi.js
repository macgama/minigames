import { h } from '../core/dom.js';
import { sfx, vibrate } from '../core/sfx.js';
import { makeRng, todayKey, dayNumber } from '../core/rng.js';
import { store } from '../core/store.js';
import { share } from '../core/share.js';
import { isPremium } from '../core/premium.js';

const COLORS = ['#ff3d5a', '#ffb547', '#ffe14d', '#3ddc97', '#4cc9f0', '#b388ff'];
const NAMES = ['rouge', 'orange', 'jaune', 'vert', 'bleu', 'violet'];
const CFG = {
  jour: { len: 4, tries: 6, label: 'Défi', board: null },
  expert: { len: 5, tries: 7, label: 'Expert', board: 'expert' },
  libre: { len: 4, tries: 6, label: 'Entraînement', board: 'libre' },
};
const grade = (guess, code) => {
  let g = 0, y = 0; const cg = [], cc = [];
  guess.forEach((c, i) => (c === code[i] ? g++ : (cg.push(c), cc.push(code[i]))));
  cg.forEach((c) => { const k = cc.indexOf(c); if (k >= 0) { y++; cc.splice(k, 1); } });
  return [g, y];
};
const dayOffset = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d; };

export default {
  start(ctx) {
    const mode = CFG[ctx.mode] ? ctx.mode : 'jour';
    const C = CFG[mode]; const LEN = C.len, TRIES = C.tries;
    let dayDate = new Date();
    const wrap = h('div.center-stage', { style: { justifyContent: 'flex-start', paddingTop: '20px', gap: '12px', overflowY: 'auto' } });
    ctx.stage.append(wrap);

    function run() {
      const day = todayKey(dayDate), num = dayNumber(dayDate), archive = day !== todayKey();
      const daily = mode !== 'libre';
      const r = daily ? makeRng(`manigames-daily-${mode === 'expert' ? 'x-' : ''}${day}`) : ctx.rng;
      const code = Array.from({ length: LEN }, () => r.int(0, COLORS.length - 1));
      const key = `daily:${mode === 'expert' ? 'x:' : ''}${day}`;
      const saved = daily ? store.get(key, { rows: [], done: false, won: false }) : { rows: [], done: false, won: false };
      let rows = saved.rows, current = [], hints = 0;
      const board = h('div', { style: { display: 'grid', gap: '6px', width: `min(92vw,${LEN === 5 ? 400 : 360}px)` } });
      const palette = h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: '8px', width: 'min(92vw,360px)' } });
      const actions = h('div.btn-row', { style: { flexWrap: 'wrap', justifyContent: 'center' } });
      const status = h('p.muted', { style: { minHeight: '1.4em', textAlign: 'center' } });
      const title = daily ? `${C.label.toUpperCase()} #${num}${archive ? ' · archive' : ''}` : 'ENTRAÎNEMENT · code au hasard';
      wrap.replaceChildren(h('div', { style: { textAlign: 'center' } }, h('div.faint', { style: { fontWeight: 700, letterSpacing: '.12em', fontSize: '12px' } }, title), h('div.big-msg', { style: { fontSize: '24px' } }, `Trouve le code de ${LEN} couleurs`)), board, status, palette, actions);
      ctx.hud({ day: daily ? `#${num}` : '∞', tries: null });

      const peg = (c) => h('span', { style: { width: '100%', aspectRatio: '1', borderRadius: '50%', display: 'block', background: c == null ? 'rgba(255,255,255,.07)' : COLORS[c], boxShadow: c == null ? 'inset 0 0 0 2px rgba(255,255,255,.08)' : `inset 0 -4px 0 rgba(0,0,0,.2), 0 4px 14px ${COLORS[c]}55` } });
      const fb = ([gg, yy]) => h('div', { style: { display: 'grid', gridTemplateColumns: `repeat(${LEN === 4 ? 2 : 3},11px)`, gap: '3px', placeContent: 'center' } },
        Array.from({ length: LEN }, (_, i) => h('span', { style: { width: '11px', height: '11px', borderRadius: '3px', background: i < gg ? '#3ddc97' : i < gg + yy ? '#ffc857' : 'rgba(255,255,255,.12)' } })));
      // Couleurs déjà exclues (réponse 0/0) : on les grise pour aider à raisonner.
      const excluded = () => new Set(rows.filter((x) => x.res[0] + x.res[1] === 0).flatMap((x) => x.guess));
      const paint = () => {
        board.replaceChildren(...Array.from({ length: TRIES }, (_, i) => {
          const row = rows[i]; const isCur = i === rows.length && !saved.done;
          const cells = row ? row.guess : isCur ? [...current, ...Array(LEN - current.length).fill(null)] : Array(LEN).fill(null);
          return h('div', { style: { display: 'grid', gridTemplateColumns: `repeat(${LEN},1fr) 44px`, gap: '8px', padding: '6px 8px', borderRadius: '16px', background: isCur ? 'rgba(255,255,255,.07)' : 'transparent', border: isCur ? '1px solid var(--border-strong)' : '1px solid transparent' } },
            ...cells.map((c) => peg(c)), row ? fb(row.res) : h('span'));
        }));
        const ex = excluded();
        palette.replaceChildren(...COLORS.map((c, i) => h('button', { 'aria-label': NAMES[i], disabled: saved.done, onclick: () => add(i), style: { aspectRatio: '1', borderRadius: '50%', border: '3px solid rgba(255,255,255,.15)', background: c, opacity: saved.done ? 0.4 : ex.has(i) ? 0.3 : 1, position: 'relative' } }, ex.has(i) ? '✕' : '')));
        actions.replaceChildren(...[
          !saved.done && h('button.btn', { onclick: () => { current.pop(); sfx.click(); paint(); }, disabled: !current.length }, '⌫'),
          !saved.done && !daily && h('button.btn', { onclick: hint, disabled: hints >= 2 }, `💡 Indice (${2 - hints})`),
          !saved.done && h('button.btn.btn-primary', { onclick: submit, disabled: current.length < LEN }, 'Valider'),
          saved.done && daily && h('button.btn.btn-primary', { onclick: doShare }, 'Partager ma grille'),
          saved.done && daily && h('button.btn', { onclick: showStats }, '📊 Mes stats'),
        ].filter(Boolean));
        if (saved.done) {
          const left = new Date(); left.setHours(24, 0, 0, 0); const mins = Math.round((left - Date.now()) / 60000);
          status.replaceChildren(h('b', { style: { color: saved.won ? 'var(--ok)' : 'var(--bad)' } }, saved.won ? `Trouvé en ${rows.length}/${TRIES} ! ` : 'Raté. '), daily && !archive ? `Prochain défi dans ${Math.floor(mins / 60)} h ${mins % 60} min.` : '');
          if (!saved.won) board.append(h('div', { style: { display: 'grid', gridTemplateColumns: `repeat(${LEN},1fr) 44px`, gap: '8px', padding: '6px 8px' } }, ...code.map((c) => peg(c)), h('span.faint', { style: { fontSize: '12px', alignSelf: 'center' } }, 'code')));
          if (daily) actions.append(archivesUI());
        } else status.textContent = `Essai ${rows.length + 1} sur ${TRIES}${known.length ? ` · 💡 ${known.map((k) => `case ${k + 1} = ${NAMES[code[k]]}`).join(', ')}` : ''}`;
      };
      const add = (c) => { if (current.length < LEN && !saved.done) { current.push(c); sfx.note(c); vibrate(8); paint(); } };
      const known = [];
      const hint = () => {
        if (hints >= 2) return; hints++;
        const i = [...Array(LEN).keys()].find((k) => !known.includes(k) && !rows.some((x) => x.guess[k] === code[k])) ?? 0;
        known.push(i);
        ctx.pop(`Case ${i + 1} : ${NAMES[code[i]]}`, ctx.stage.clientWidth / 2, ctx.stage.clientHeight * 0.45, COLORS[code[i]], 24);
        sfx.ok(); paint();
      };
      const submit = () => {
        if (current.length < LEN || saved.done) return;
        const res = grade(current, code); rows.push({ guess: current, res }); current = [];
        const won = res[0] === LEN;
        // Animation de la ligne qui vient d'être jouée
        if (won || rows.length >= TRIES) {
          saved.done = true; saved.won = won;
          if (daily) {
            store.set(key, saved);
            if (!archive) {
              const dk = `dailyDist:${mode}`; const dist = store.get(dk, Array(TRIES + 1).fill(0)); dist[won ? rows.length - 1 : TRIES]++; store.set(dk, dist);
              const sk = mode === 'expert' ? 'dailyStreakX' : 'dailyStreak'; const st = store.get(sk, { last: null, n: 0, best: 0 }); const y = new Date(); y.setDate(y.getDate() - 1);
              const n = won ? (st.last === todayKey(y) ? st.n + 1 : 1) : 0; store.set(sk, { last: day, n, best: Math.max(st.best || 0, n) });
            }
          }
          paint(); won ? sfx.win() : sfx.lose();
          const score = won ? TRIES + 1 - rows.length - hints : 0;
          ctx.timeout(() => ctx.end({
            score: Math.max(0, score), display: won ? `${rows.length}/${TRIES}` : `X/${TRIES}`, board: C.board, emoji: won ? '🔓' : '🔒', win: won,
            record: !archive, challenge: !daily,
            title: won ? (rows.length <= 2 ? 'Génie du code !' : rows.length <= 4 ? 'Bien joué !' : 'Ouf, trouvé !') : 'Code non trouvé',
            label: daily ? `${C.label} #${num}${archive ? ' (archive)' : ''} · ${won ? `trouvé en ${rows.length} essais` : 'raté'}` : `Entraînement${hints ? ` · ${hints} indice(s)` : ''}`,
            feats: [won && rows.length <= 2 && !hints && 'devin', mode === 'expert' && won && 'expert', store.get('dailyStreak', { n: 0 }).n >= 7 && 'semaine'].filter(Boolean),
            extra: daily ? statsBlock() : null,
          }), 1100);
        } else {
          res[0] + res[1] ? sfx.ok() : sfx.bad();
          if (res[0] === LEN - 1) ctx.pop('Tout près ! 🔥', ctx.stage.clientWidth / 2, ctx.stage.clientHeight * 0.4, '#ffd23f', 26);
          paint();
        }
        if (daily) { saved.rows = rows; store.set(key, saved); }
      };
      const gridText = () => rows.map((x) => '🟩'.repeat(x.res[0]) + '🟨'.repeat(x.res[1]) + '⬛'.repeat(LEN - x.res[0] - x.res[1])).join('\n');
      const doShare = () => {
        const streak = store.get(mode === 'expert' ? 'dailyStreakX' : 'dailyStreak', { n: 0 }).n;
        share(`📅 ${C.label} du jour #${num} : ${saved.won ? rows.length : 'X'}/${TRIES}${streak > 1 ? ` · série ${streak} 🔥` : ''}\n${gridText()}`, 'jeu/daily-defi');
      };
      const statsBlock = () => {
        const dist = store.get(`dailyDist:${mode}`, Array(TRIES + 1).fill(0)); const max = Math.max(1, ...dist);
        const played = dist.reduce((a, b) => a + b, 0), wins = played - dist[TRIES];
        const st = store.get(mode === 'expert' ? 'dailyStreakX' : 'dailyStreak', { n: 0, best: 0 });
        return h('div', { style: { display: 'grid', gap: '10px', width: '100%' } },
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', textAlign: 'center', gap: '6px' } },
            ...[[played, 'Joués'], [played ? Math.round((wins / played) * 100) + ' %' : '–', 'Réussis'], [st.n || 0, 'Série'], [st.best || 0, 'Record']].map(([v, l]) => h('div', h('div', { style: { fontSize: '22px', fontWeight: 800 } }, String(v)), h('div.faint', { style: { fontSize: '12px' } }, l)))),
          h('div', { style: { display: 'grid', gap: '4px' } }, dist.map((v, i) => h('div', { style: { display: 'grid', gridTemplateColumns: '22px 1fr', gap: '8px', alignItems: 'center', fontSize: '13px' } },
            h('span.faint', i === TRIES ? 'X' : String(i + 1)),
            h('span', { style: { width: `${Math.max(8, (v / max) * 100)}%`, background: saved.done && ((saved.won && i === rows.length - 1) || (!saved.won && i === TRIES)) ? 'var(--p1, #7c5cff)' : 'rgba(255,255,255,.14)', borderRadius: '6px', padding: '2px 8px', textAlign: 'right', fontWeight: 700 } }, String(v))))));
      };
      const showStats = () => { const o = ctx.overlay(h('h3', `📊 ${C.label} : mes stats`), statsBlock(), h('button.btn.btn-primary', { onclick: () => o.remove() }, 'Fermer')); };
      const archivesUI = () => {
        if (!isPremium()) return h('a.btn', { href: '#/premium' }, '🔒 Archives (Premium)');
        return h('button.btn', { onclick: () => {
          const o = ctx.overlay(h('h3', '📚 Archives'), h('p.muted', 'Rejoue les défis des 7 derniers jours.'),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '8px', width: '100%' } }, [1, 2, 3, 4, 5, 6, 7].map((k) => {
              const d = dayOffset(k); const s = store.get(`daily:${mode === 'expert' ? 'x:' : ''}${todayKey(d)}`, null);
              return h('button.btn', { onclick: () => { o.remove(); dayDate = d; run(); } }, `#${dayNumber(d)}${s?.done ? (s.won ? ' ✅' : ' ❌') : ''}`);
            })),
            h('button.btn', { onclick: () => o.remove() }, 'Fermer'));
        } }, '📚 Archives');
      };
      keys = (e) => { const k = Number(e.key); if (k >= 1 && k <= 6) add(k - 1); if (e.key === 'Backspace') { current.pop(); paint(); } if (e.key === 'Enter') submit(); };
      paint();
    }
    let keys = () => {};
    ctx.on(window, 'keydown', (e) => keys(e));
    run();
  },
};
