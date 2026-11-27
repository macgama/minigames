import { h } from '../core/dom.js';
import { sfx, vibrate } from '../core/sfx.js';
import { makeRng, todayKey } from '../core/rng.js';

const COLS = [['ROUGE', '#ff3d5a'], ['BLEU', '#3a8bff'], ['VERT', '#2fd27a'], ['JAUNE', '#ffd23f'], ['VIOLET', '#a45cff'], ['ORANGE', '#ff8a1f']];

export default {
  start(ctx) {
    const mode = ctx.mode || 'classic', chaos = mode === 'chaos';
    const R = mode === 'jour' ? makeRng('piege-' + todayKey()) : ctx.rng;
    let rule = 'encre', left = 20, n = 0, streak = 0, best = 0, card = null, over = false, sinceSwitch = 0, nextSwitch = 6;
    const ruleEl = h('div', { style: { padding: '10px 20px', borderRadius: '999px', fontWeight: 900, fontSize: '20px', letterSpacing: '.04em', transition: 'background .2s' } });
    const word = h('div', { style: { fontSize: 'clamp(54px,17vw,96px)', fontWeight: 900, letterSpacing: '.02em', minHeight: '1.2em', textShadow: '0 4px 0 rgba(0,0,0,.25)' } });
    const pads = h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px', width: 'min(88vw,360px)' } });
    const bar = h('div.bar', { style: { width: 'min(88vw,360px)' } }, h('i'));
    const zone = h('div.center-stage', { style: { gap: '18px', transition: 'background .3s' } }, ruleEl, word, bar, pads);
    ctx.stage.append(zone);
    const paintRule = () => {
      ruleEl.textContent = rule === 'encre' ? '🖌️ Couleur de l’ENCRE' : '🔤 Couleur du MOT';
      ruleEl.style.background = rule === 'encre' ? 'linear-gradient(90deg,#ff4fa3,#7c5cff)' : 'linear-gradient(90deg,#00c2ff,#3ddc97)';
      ruleEl.animate([{ transform: 'scale(1.25)' }, { transform: 'none' }], { duration: 350, easing: 'cubic-bezier(.3,1.6,.5,1)' });
    };
    const deal = () => {
      if (over) return;
      const k = Math.min(COLS.length, 3 + Math.floor(n / 12));
      const set = COLS.slice(0, k);
      // Changement de règle
      sinceSwitch++;
      if (chaos ? R.float(0, 1) < 0.5 : sinceSwitch >= nextSwitch) { const nr = rule === 'encre' ? 'mot' : 'encre'; if (nr !== rule) { rule = nr; paintRule(); sfx.go(); } sinceSwitch = 0; nextSwitch = R.int(4, 9); }
      let w, ink; do { w = R.int(0, k - 1); ink = R.int(0, k - 1); } while (w === ink && R.float(0, 1) < 0.85);
      card = { w, ink, ans: rule === 'encre' ? ink : w };
      word.textContent = set[w][0]; word.style.color = set[ink][1];
      word.animate([{ transform: 'translateY(-14px) scale(.9)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 160 });
      if (chaos) zone.style.background = `radial-gradient(circle at 50% 40%, ${set[R.int(0, k - 1)][1]}33, transparent 70%)`;
      // Les boutons changent de place à partir de 15 bonnes réponses
      const order = n >= 15 ? R.shuffle(set.map((_, i) => i)) : set.map((_, i) => i);
      pads.style.gridTemplateColumns = `repeat(${k === 4 ? 2 : 3},1fr)`;
      pads.replaceChildren(...order.map((i) => h('button', { style: { height: '74px', borderRadius: '18px', border: '3px solid rgba(255,255,255,.18)', background: set[i][1], cursor: 'pointer', boxShadow: '0 6px 0 rgba(0,0,0,.25)' }, 'aria-label': set[i][0], onpointerdown: (e) => { e.preventDefault(); answer(i, e.currentTarget); } })));
    };
    const answer = (i, el) => {
      if (over || !card) return;
      if (i === card.ans) {
        n++; streak++; best = Math.max(best, streak); left = Math.min(30, left + 1); sfx.tick(); vibrate(5);
        el.animate([{ transform: 'scale(.9)' }, { transform: 'none' }], { duration: 150 });
        if (streak % 10 === 0) { ctx.pop(`🔥 ${streak}`, ctx.stage.clientWidth / 2, ctx.stage.clientHeight * 0.3, '#ffd23f', 30); sfx.ok(); }
      } else {
        streak = 0; left -= 2; sfx.bad(); vibrate([30, 20, 30]); ctx.shake(6); ctx.flash('rgba(255,61,90,.25)');
        ctx.pop('−2 s', ctx.stage.clientWidth / 2, ctx.stage.clientHeight * 0.45, '#ff5c7a', 26);
      }
      ctx.hud({ n: `${n} bonnes`, streak: streak >= 3 ? `🔥 ${streak}` : null });
      deal();
    };
    ctx.on(window, 'keydown', (e) => { const i = +e.key - 1; if (i >= 0 && i < 6 && pads.children[i]) answer(COLS.findIndex((c) => c[0] === pads.children[i].getAttribute('aria-label')), pads.children[i]); });
    ctx.interval(() => {
      if (over || !card) return;
      left -= 0.05; bar.firstChild.style.width = `${Math.max(0, left / 30) * 100}%`; bar.firstChild.style.background = left < 5 ? 'var(--bad)' : '';
      ctx.hud({ time: `${Math.max(0, Math.ceil(left))} s` });
      if (left <= 0) end();
    }, 50);
    const end = () => {
      over = true; card = null; sfx.win();
      ctx.timeout(() => ctx.end({
        score: n, display: `${n} bonnes`, emoji: '🎨', board: mode === 'classic' ? null : mode,
        title: n >= 50 ? 'Cerveau à l’épreuve des pièges' : n >= 30 ? 'Bien concentré' : 'Le cerveau a été piégé',
        label: `Meilleure série : ${best}`,
        feats: [best >= 20 && 'serie', mode === 'classic' && n >= 50 && 'cerveau', chaos && n >= 40 && 'chaos'].filter(Boolean),
      }), 500);
    };
    paintRule(); ctx.hud({ n: '0 bonnes', time: '20 s' });
    ctx.countdown().then(() => ctx.alive && deal());
  },
};
