import { h } from '../core/dom.js';
import { sfx, vibrate } from '../core/sfx.js';
import { makeRng, todayKey } from '../core/rng.js';

const E = (a, b) => [a.split(' '), b.split(' ')];
const RULES = [
  { l: '🍎 Fruit', r: '🥕 Légume', sets: E('🍎 🍌 🍇 🍓 🍒 🍍 🥝 🍑 🍉 🍐 🍋 🥭', '🥕 🥦 🌽 🥒 🍆 🥬 🧅 🫑 🥔 🧄 🫛 🍅') },
  { l: '🔥 Chaud', r: '❄️ Froid', sets: E('🔥 ☀️ 🌶️ ☕ 🌋 🍲 🏜️ ♨️ 🫖 🧯', '❄️ 🧊 ⛄ 🍦 🐧 🥶 🏔️ 🌨️ 🐻‍❄️ 🍧') },
  { l: '🐄 Ferme', r: '🌴 Jungle', sets: E('🐄 🐖 🐑 🐓 🐴 🐐 🦆 🐇 🦃 🐕', '🐒 🦜 🐍 🐆 🦍 🐊 🦥 🐘 🦛 🐅') },
  { l: '☁️ Ciel', r: '🌊 Mer', sets: E('✈️ 🚁 🪁 🎈 🦅 🛸 🚀 🪂 🕊️ 🌤️', '🐟 🐙 🐳 ⛵ 🚤 🦀 🐠 🪸 🦈 🐚') },
  { l: 'Pair', r: 'Impair', num: (n) => n % 2 === 1 },
  { l: '< 50', r: '> 50', num: (n) => n > 50, skip: 50 },
  { l: 'Voyelle', r: 'Consonne', letters: true },
];

export default {
  start(ctx) {
    const mode = ctx.mode || 'classic', chrono = mode === 'chrono';
    const R = mode === 'jour' ? makeRng('tri-' + todayKey()) : ctx.rng;
    let rule = R.pick(RULES.slice(0, 4)), n = 0, lives = 3, left = 60, streak = 0, best = 0, switches = 0, card = null, deadline = 0, over = false;
    const ruleEl = h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', width: 'min(94vw,520px)' } });
    const stack = h('div', { style: { position: 'relative', width: 'min(70vw,260px)', aspectRatio: '3/4' } });
    const timer = h('div.bar', { style: { width: 'min(70vw,260px)' } }, h('i', { style: { width: '100%' } }));
    const msg = h('p', { style: { minHeight: '1.4em', fontWeight: 800 } });
    const zone = h('div.center-stage', { style: { gap: '14px' } }, ruleEl, msg, stack, timer); ctx.stage.append(zone);
    const paintRule = () => ruleEl.replaceChildren(...[['←', rule.l], ['→', rule.r]].map(([a, t]) => h('div', { style: { padding: '12px', borderRadius: '16px', background: 'rgba(255,255,255,.07)', border: '1px solid var(--border-strong)', fontWeight: 800, fontSize: '20px', textAlign: 'center' } }, `${a === '←' ? '← ' : ''}${t}${a === '→' ? ' →' : ''}`)));
    const make = () => {
      let face, side;
      if (rule.num) { let v; do v = R.int(1, 99); while (v === rule.skip); face = String(v); side = rule.num(v) ? 1 : 0; }
      else if (rule.letters) { const L = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'; face = R.pick(L.split('')); side = 'AEIOUY'.includes(face) ? 0 : 1; }
      else { side = R.int(0, 1); face = R.pick(rule.sets[side]); }
      return { face, side };
    };
    const window_ = () => Math.max(0.85, 2.6 - n * 0.03) * 1000;
    const deal = () => {
      if (over) return;
      if (n > 0 && n % 10 === 0) {
        let nr; do nr = R.pick(RULES); while (nr === rule); rule = nr; switches++; paintRule();
        ruleEl.animate([{ transform: 'scale(1.1)', filter: 'brightness(1.8)' }, { transform: 'none', filter: 'none' }], { duration: 500 });
        msg.textContent = '🔄 Nouvelle règle !'; msg.style.color = '#ffd23f'; sfx.go();
      }
      card = make();
      const el = h('div', { style: { position: 'absolute', inset: 0, borderRadius: '24px', background: 'linear-gradient(160deg,#fff,#e4e0ff)', color: '#1b1450', display: 'grid', placeItems: 'center', fontSize: card.face.length > 2 ? '80px' : '110px', fontWeight: 900, boxShadow: '0 20px 50px rgba(0,0,0,.4)', touchAction: 'none', animation: 'pop .25s var(--spring) both' } }, card.face);
      stack.replaceChildren(el); card.el = el;
      deadline = performance.now() + window_();
    };
    const answer = (side) => {
      if (over || !card) return;
      const ok = side === card.side, el = card.el; card = null;
      el.animate([{ transform: 'none' }, { transform: `translateX(${side ? 140 : -140}%) rotate(${side ? 20 : -20}deg)`, opacity: 0 }], { duration: 220, fill: 'forwards' });
      if (ok) { n++; streak++; best = Math.max(best, streak); sfx.tick(); vibrate(6); if (streak % 10 === 0) { ctx.pop(`🔥 ${streak} d’affilée`, ctx.stage.clientWidth / 2, ctx.stage.clientHeight * 0.3, '#ffd23f', 26); sfx.ok(); } if (!msg.textContent.startsWith('🔄')) msg.textContent = ''; }
      else miss();
      ctx.hud({ n: `${n} cartes`, lives: chrono ? null : '❤️'.repeat(lives) + '🖤'.repeat(3 - lives) });
      ctx.timeout(deal, 160);
    };
    const miss = () => {
      streak = 0; sfx.bad(); vibrate([40, 30, 40]); ctx.shake(6); ctx.flash('rgba(255,61,90,.25)');
      if (chrono) { left -= 3; msg.textContent = 'Raté ! −3 s'; } else { lives--; msg.textContent = lives ? 'Raté !' : 'Plus de vies…'; if (lives <= 0) end(); }
      msg.style.color = 'var(--bad)';
    };
    // Glisser, toucher une moitié, ou flèches
    let sx = null;
    ctx.on(ctx.stage, 'pointerdown', (e) => (sx = e.clientX));
    ctx.on(ctx.stage, 'pointerup', (e) => { if (sx == null) return; const dx = e.clientX - sx; sx = null; if (Math.abs(dx) > 30) answer(dx > 0 ? 1 : 0); else answer(e.clientX > ctx.stage.getBoundingClientRect().left + ctx.stage.clientWidth / 2 ? 1 : 0); });
    ctx.on(window, 'keydown', (e) => { if (e.key === 'ArrowLeft') answer(0); if (e.key === 'ArrowRight') answer(1); });
    ctx.interval(() => {
      if (over) return;
      if (chrono) { left -= 0.05; ctx.hud({ time: `${Math.max(0, Math.ceil(left))} s` }); if (left <= 0) return end(); }
      if (card) { const k = (deadline - performance.now()) / window_(); timer.firstChild.style.width = Math.max(0, k * 100) + '%'; if (k <= 0) { const el = card.el; card = null; el.animate([{ opacity: 1 }, { opacity: 0, transform: 'translateY(40%)' }], { duration: 200, fill: 'forwards' }); msg.textContent = 'Trop lent !'; miss(); ctx.hud({ lives: chrono ? null : '❤️'.repeat(Math.max(0, lives)) + '🖤'.repeat(3 - Math.max(0, lives)) }); ctx.timeout(deal, 300); } }
    }, 50);
    const end = () => {
      if (over) return; over = true;
      ctx.timeout(() => ctx.end({
        score: n, display: `${n} cartes`, emoji: '↔️', board: mode === 'classic' ? null : mode,
        title: n >= 65 ? 'Trieur fou' : n >= 40 ? 'Rapide et précis' : 'Le tri, ça s’apprend',
        label: `Meilleure série : ${best} · ${switches} changement${switches > 1 ? 's' : ''} de règle`,
        feats: [n >= 50 && 'cinquante', best >= 30 && 'parfait', switches >= 5 && 'regles'].filter(Boolean),
      }), 600);
    };
    paintRule(); ctx.hud({ n: '0 cartes', lives: chrono ? null : '❤️❤️❤️' });
    ctx.countdown().then(() => ctx.alive && deal());
  },
};
