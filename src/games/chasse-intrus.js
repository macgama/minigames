import { h } from '../core/dom.js';
import { sfx, vibrate } from '../core/sfx.js';
import { rng } from '../core/rng.js';

const PAIRS = [['😀', '😃'], ['🐶', '🐕'], ['🍎', '🍅'], ['⭐', '🌟'], ['😐', '😑'], ['🙂', '🙃'], ['🐻', '🐨'], ['🌲', '🌳'], ['🔴', '🟠'], ['💙', '💜'], ['🚗', '🚙'], ['😺', '😸'], ['🐭', '🐹'], ['🔒', '🔓'], ['🌑', '🌚'], ['🍐', '🍏'], ['😴', '😪'], ['🕐', '🕑'], ['🟦', '🟪'], ['🐢', '🦎'], ['🥚', '🥔'], ['❄️', '✳️'], ['🎈', '🔴'], ['👀', '👁️']];
const TIME = 45;

export default {
  start(ctx) {
    let level = 0, left = TIME, lastTap = 0;
    const grid = h('div', { style: { display: 'grid', gap: '6px', width: 'min(94vw,68vh,560px)', aspectRatio: '1' } });
    const bar = h('div.bar', { style: { width: 'min(94vw,560px)' } }, h('i', { style: { width: '100%' } }));
    const msg = h('div.big-msg', { style: { fontSize: 'clamp(20px,4.5vw,28px)' } }, 'Trouve l’intrus');
    ctx.stage.append(h('div.center-stage', { style: { gap: '14px' } }, msg, grid, bar));
    const next = () => {
      level++;
      const n = Math.min(9, 3 + Math.floor(level / 2));
      let [a, b] = rng.pick(PAIRS); if (rng.chance(0.5)) [a, b] = [b, a];
      const odd = rng.int(0, n * n - 1);
      grid.style.gridTemplateColumns = `repeat(${n},1fr)`;
      grid.replaceChildren(...Array.from({ length: n * n }, (_, i) => h('button', { 'aria-label': `Case ${i + 1}`, onpointerdown: (e) => tap(i === odd, e.currentTarget),
        style: { border: 0, borderRadius: '14px', background: 'rgba(255,255,255,.06)', fontSize: `min(${56 / n}vmin, ${280 / n}px)`, display: 'grid', placeItems: 'center', transition: 'transform .1s, background .2s', animation: `pop .3s var(--spring) ${(i % n + Math.floor(i / n)) * 12}ms both`, touchAction: 'manipulation' } }, i === odd ? b : a)));
      ctx.hud({ lvl: `Niveau ${level}` });
      lastTap = performance.now();
    };
    const tap = (ok, el) => {
      if (ok) {
        const speed = (performance.now() - lastTap) / 1000;
        el.style.background = 'rgba(61,220,151,.5)'; el.style.transform = 'scale(1.15)'; sfx.ok(); vibrate(12);
        if (speed < 1.2) { left = Math.min(TIME, left + 1); msg.textContent = '⚡ Éclair ! +1 s'; } else msg.textContent = 'Trouvé !';
        ctx.timeout(next, 220);
      } else { el.style.background = 'rgba(255,92,122,.45)'; el.classList.add('anim-shake'); left -= 3; sfx.bad(); vibrate([40, 30, 40]); msg.textContent = 'Raté ! −3 s'; }
    };
    ctx.interval(() => {
      left -= 0.1; bar.firstChild.style.width = Math.max(0, left / TIME * 100) + '%';
      bar.firstChild.style.background = left < 10 ? 'var(--bad)' : '';
      ctx.hud({ time: `${Math.max(0, left).toFixed(0)} s` });
      if (left <= 0) {
        const n = level - 1;
        ctx.end({ score: n, display: `${n}`, emoji: '🔍', title: n >= 30 ? 'Œil de faucon' : n >= 18 ? 'Très observateur' : 'Ça pique les yeux', label: 'intrus trouvés', share: `🔍 Chasse à l’Intrus : ${n} intrus trouvés en 45 s. À toi de jouer !` });
      }
    }, 100);
    next();
  },
};
