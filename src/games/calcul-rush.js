import { h } from '../core/dom.js';
import { sfx, vibrate } from '../core/sfx.js';
import { makeRng, todayKey } from '../core/rng.js';

export default {
  start(ctx) {
    const mode = ctx.mode || 'classic', tables = mode === 'tables', survie = mode === 'survie';
    const R = mode === 'jour' ? makeRng('calcul-' + todayKey()) : ctx.rng;
    let n = 0, score = 0, combo = 0, bestCombo = 0, left = 60, lives = 3, entry = '', q = null, over = false, maxLvl = 1, t0 = 0;
    const lvl = () => (tables ? 1 + Math.min(4, Math.floor(n / 10)) : n < 8 ? 1 : n < 16 ? 2 : n < 26 ? 3 : n < 36 ? 4 : 5);
    const make = () => {
      const L = lvl(); let a, b, op;
      if (tables) { a = R.int(2, Math.min(12, 5 + L * 2)); b = R.int(2, 10); return { t: `${a} × ${b}`, v: a * b }; }
      const ops = L === 1 ? ['+', '−'] : L === 2 ? ['+', '−', '×'] : ['+', '−', '×', '÷'];
      op = R.pick(ops);
      const big = L >= 4;
      if (op === '+') { a = R.int(big ? 15 : 2, big ? 99 : 20); b = R.int(big ? 15 : 2, big ? 99 : 20); return { t: `${a} + ${b}`, v: a + b }; }
      if (op === '−') { a = R.int(big ? 30 : 5, big ? 150 : 25); b = R.int(2, a - 1); return { t: `${a} − ${b}`, v: a - b }; }
      if (op === '×') { a = R.int(2, L >= 5 ? 25 : 10); b = R.int(2, L >= 5 ? 9 : 10); return { t: `${a} × ${b}`, v: a * b }; }
      b = R.int(2, L >= 5 ? 12 : 9); const v = R.int(2, L >= 5 ? 15 : 10); return { t: `${b * v} ÷ ${b}`, v };
    };
    const lvlEl = h('div.chip');
    const qEl = h('div', { style: { fontSize: 'clamp(44px,13vw,72px)', fontWeight: 900, fontVariantNumeric: 'tabular-nums' } });
    const aEl = h('div', { style: { fontSize: '40px', fontWeight: 900, minHeight: '50px', minWidth: '140px', textAlign: 'center', borderBottom: '3px solid var(--border-strong)', fontVariantNumeric: 'tabular-nums' } });
    const bar = h('div.bar', { style: { width: 'min(80vw,300px)', display: survie ? 'none' : '' } }, h('i'));
    const pad = h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px', width: 'min(80vw,300px)' } },
      ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⏭', '0', '⌫'].map((k) => h('button.btn', { style: { minHeight: '56px', fontSize: '24px', fontWeight: 800 }, onpointerdown: (e) => { e.preventDefault(); press(k); } }, k === '⏭' ? (survie ? '' : 'Passer') : k)));
    ctx.stage.append(h('div.center-stage', { style: { gap: '12px' } }, lvlEl, qEl, aEl, bar, pad));
    const hud = () => ctx.hud({ pts: `${score} pts`, time: survie ? null : `${Math.max(0, Math.ceil(left))} s`, lives: survie ? '❤️'.repeat(lives) + '🖤'.repeat(3 - lives) : null, combo: combo >= 5 ? `🔥 ×2` : null });
    const next = () => {
      q = make(); entry = ''; aEl.textContent = ''; qEl.textContent = q.t; t0 = performance.now();
      const L = lvl(); if (L > maxLvl) { maxLvl = L; sfx.go(); ctx.pop(`Niveau ${L} !`, ctx.stage.clientWidth / 2, ctx.stage.clientHeight * 0.2, '#ffd23f', 28); }
      lvlEl.textContent = tables ? `Tables · palier ${L}` : `Niveau ${L} · ${['', 'additions', '+ multiplications', '+ divisions', 'grands nombres', 'expert'][L]}`;
      qEl.animate([{ transform: 'scale(.85)', opacity: 0.3 }, { transform: 'none', opacity: 1 }], { duration: 140 });
    };
    const press = (k) => {
      if (over || !q) return;
      if (k === '⌫') { entry = entry.slice(0, -1); aEl.textContent = entry; return; }
      if (k === '⏭') { if (survie) return; left -= 2; combo = 0; sfx.bad(); ctx.pop('−2 s', ctx.stage.clientWidth / 2, ctx.stage.clientHeight * 0.4, '#ff5c7a', 24); hud(); return next(); }
      entry += k; aEl.textContent = entry; sfx.tick();
      const want = String(q.v);
      if (entry === want) {
        n++; combo++; bestCombo = Math.max(bestCombo, combo);
        const fast = performance.now() - t0 < 2000;
        const pts = 10 * lvl() * (combo >= 5 ? 2 : 1) + (fast ? 5 : 0); score += pts;
        aEl.style.color = 'var(--ok)'; ctx.timeout(() => (aEl.style.color = ''), 150); vibrate(6);
        if (combo % 5 === 0) { sfx.ok(); ctx.flash('rgba(255,210,63,.15)'); }
        hud(); next();
      } else if (entry.length >= want.length) {
        combo = 0; sfx.bad(); vibrate([30, 20, 30]); ctx.shake(6); aEl.style.color = 'var(--bad)';
        if (survie) { lives--; hud(); if (lives <= 0) return end(); ctx.timeout(() => { aEl.style.color = ''; next(); }, 400); q = null; }
        else ctx.timeout(() => { entry = ''; aEl.textContent = ''; aEl.style.color = ''; }, 250);
        hud();
      }
    };
    ctx.on(window, 'keydown', (e) => { if (/^[0-9]$/.test(e.key)) press(e.key); if (e.key === 'Backspace') press('⌫'); if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); press('⏭'); } });
    if (!survie) ctx.interval(() => { if (over || !q) return; left -= 0.05; bar.firstChild.style.width = `${(Math.max(0, left) / 60) * 100}%`; if (Math.round(left * 20) % 20 === 0) hud(); if (left <= 0) end(); }, 50);
    const end = () => {
      if (over) return; over = true; q = null; sfx.win();
      ctx.timeout(() => ctx.end({
        score, display: `${score} pts`, emoji: '➗', board: mode === 'classic' ? null : mode,
        title: score >= 480 ? 'Calculatrice humaine' : score >= 250 ? 'Bon en calcul' : 'Échauffement terminé',
        label: `${n} bonnes réponses · niveau ${maxLvl} · combo ${bestCombo}`,
        feats: [bestCombo >= 15 && 'combo', !tables && maxLvl >= 5 && 'cinq', tables && n >= 40 && 'tables'].filter(Boolean),
      }), 500);
    };
    hud(); ctx.countdown().then(() => ctx.alive && next());
  },
};
