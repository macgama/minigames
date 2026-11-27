import { h } from '../core/dom.js';
import { sfx, vibrate } from '../core/sfx.js';
import { makeRng, todayKey } from '../core/rng.js';

const PAIRS = [['😀', '😃'], ['🐶', '🐕'], ['🍎', '🍅'], ['⭐', '🌟'], ['😐', '😑'], ['🙂', '🙃'], ['🐻', '🐨'], ['🌲', '🌳'], ['🔴', '🟠'], ['💙', '💜'], ['🚗', '🚙'], ['😺', '😸'], ['🐭', '🐹'], ['🔒', '🔓'], ['🌑', '🌚'], ['🍐', '🍏'], ['😴', '😪'], ['🕐', '🕑'], ['🟦', '🟪'], ['🐢', '🦎'], ['🥚', '🥔'], ['❄️', '✳️'], ['🎈', '🔴'], ['👀', '👁️'], ['🍪', '🍩'], ['🐸', '🐢'], ['🌸', '🌺'], ['🍋', '🍌'], ['🐝', '🪲'], ['🧀', '🍰'], ['🦁', '🐯'], ['🐧', '🐦'], ['☁️', '🌫️'], ['🎃', '🍊'], ['🐙', '🦑'], ['⚽', '🏐'], ['🌙', '🌛'], ['🍇', '🫐'], ['🦊', '🐺'], ['🎵', '🎶'], ['💎', '🔷'], ['🍄', '🌂'], ['🐳', '🐋'], ['🔔', '🛎️']];
const SAME = ['🐶', '🍎', '⭐', '🚗', '🐢', '🍄', '🎈', '🐟', '🦒', '🍕', '🚀', '🐌', '🦉', '⛵', '🍦'];
const TIME = 45;
// Types d'intrus, débloqués au fil des niveaux
const kindFor = (level, R) => { const pool = ['pair']; if (level >= 6) pool.push('miroir', 'pair'); if (level >= 10) pool.push('taille'); if (level >= 14) pool.push('teinte', 'tourne'); return R.pick(pool); };

export default {
  start(ctx) {
    const mode = ctx.mode || 'classic', zen = mode === 'zen';
    const rng = mode === 'jour' ? makeRng('intrus-' + todayKey()) : ctx.rng;
    let level = 0, left = TIME, lastTap = 0, combo = 0, bestCombo = 0, lives = 3, misses = 0;
    const kindLabel = { pair: 'Trouve l’intrus', miroir: 'Un est à l’envers ↔', taille: 'Un est plus petit 🔎', teinte: 'Une couleur cloche 🎨', tourne: 'Un a tourné ↻' };
    const grid = h('div', { style: { display: 'grid', gap: '6px', width: 'min(94vw,64vh,560px)', aspectRatio: '1' } });
    const bar = h('div.bar', { style: { width: 'min(94vw,560px)', visibility: zen ? 'hidden' : 'visible' } }, h('i', { style: { width: '100%' } }));
    const msg = h('div.big-msg', { style: { fontSize: 'clamp(20px,4.5vw,28px)' } }, 'Trouve l’intrus');
    ctx.stage.append(h('div.center-stage', { style: { gap: '14px' } }, msg, grid, bar));
    const next = () => {
      level++;
      const n = Math.min(9, 3 + Math.floor(level / 2));
      const kind = level < 3 ? 'pair' : kindFor(level, rng);
      let [a, b] = rng.pick(PAIRS); if (rng.chance(0.5)) [a, b] = [b, a];
      if (kind !== 'pair') { a = rng.pick(SAME); b = a; }
      const oddStyle = { miroir: { transform: 'scaleX(-1)' }, taille: { transform: `scale(${Math.max(0.72, 0.85 - level * 0.004)})` }, teinte: { filter: `hue-rotate(${Math.max(40, 120 - level * 3)}deg)` }, tourne: { transform: 'rotate(180deg)' } }[kind] || {};
      const odd = rng.int(0, n * n - 1);
      msg.textContent = kindLabel[kind];
      grid.style.gridTemplateColumns = `repeat(${n},1fr)`;
      grid.replaceChildren(...Array.from({ length: n * n }, (_, i) => h('button', { 'aria-label': `Case ${i + 1}`, onpointerdown: (e) => tap(i === odd, e.currentTarget),
        style: { border: 0, borderRadius: '14px', background: 'rgba(255,255,255,.06)', fontSize: `min(${56 / n}vmin, ${280 / n}px)`, display: 'grid', placeItems: 'center', transition: 'background .2s', animation: `pop .3s var(--spring) ${(i % n + Math.floor(i / n)) * 12}ms both`, touchAction: 'manipulation', padding: 0 } },
        h('span', { style: { display: 'inline-block', ...(i === odd ? oddStyle : {}) } }, i === odd ? b : a))));
      ctx.hud({ lvl: `Niveau ${level}`, combo: combo >= 3 ? `🔥 ×${combo}` : null, lives: zen ? '❤️'.repeat(lives) + '🖤'.repeat(3 - lives) : null });
      lastTap = performance.now();
    };
    const tap = (ok, el) => {
      if (!ctx.alive) return;
      if (ok) {
        const speed = (performance.now() - lastTap) / 1000;
        el.style.background = 'rgba(61,220,151,.5)'; el.animate([{ transform: 'scale(1.2)' }, { transform: 'scale(1)' }], { duration: 200 }); sfx.ok(); vibrate(12);
        combo = speed < 1.6 ? combo + 1 : 0; bestCombo = Math.max(bestCombo, combo);
        const r = el.getBoundingClientRect(), s = ctx.stage.getBoundingClientRect();
        if (!zen && speed < 1.2) { left = Math.min(TIME, left + 1); ctx.pop(combo >= 3 ? `⚡ +1 s · combo ×${combo}` : '⚡ +1 s', r.left - s.left + r.width / 2, r.top - s.top, '#ffd23f', 22); }
        if (combo > 0 && combo % 5 === 0) { ctx.flash('rgba(255,210,63,.25)'); if (!zen) left = Math.min(TIME, left + 2); }
        ctx.timeout(next, 200);
      } else {
        el.style.background = 'rgba(255,92,122,.45)'; el.animate([{ transform: 'translateX(-4px)' }, { transform: 'translateX(4px)' }, { transform: 'none' }], { duration: 160 }); combo = 0; misses++; sfx.bad(); vibrate([40, 30, 40]);
        if (zen) { lives--; msg.textContent = lives ? `Raté ! Plus que ${lives} vie${lives > 1 ? 's' : ''}` : 'Plus de vies…'; ctx.hud({ lives: '❤️'.repeat(lives) + '🖤'.repeat(3 - lives) }); if (lives <= 0) return ctx.timeout(over, 500); }
        else { left -= 3; msg.textContent = 'Raté ! −3 s'; }
      }
    };
    const over = () => {
      const n = level - 1;
      ctx.end({
        score: n, display: `${n}`, emoji: '🔍', board: mode === 'classic' ? null : mode,
        title: n >= 30 ? 'Œil de faucon' : n >= 18 ? 'Très observateur' : 'Ça pique les yeux',
        label: `intrus trouvés${bestCombo >= 3 ? ` · combo max ${bestCombo}` : ''}${!zen && misses === 0 ? ' · aucune erreur' : ''}`,
        feats: [n >= 30 && 'faucon', bestCombo >= 10 && 'combo', zen && n >= 40 && 'zen', !zen && misses === 0 && n >= 15 && 'precis'].filter(Boolean),
      });
    };
    if (!zen) ctx.interval(() => {
      left -= 0.1; bar.firstChild.style.width = Math.max(0, left / TIME * 100) + '%';
      bar.firstChild.style.background = left < 10 ? 'var(--bad)' : '';
      ctx.hud({ time: `${Math.max(0, left).toFixed(0)} s` });
      if (left <= 0 && ctx.alive) over();
    }, 100);
    next();
  },
};
