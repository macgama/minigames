import { h } from '../core/dom.js';
import { sfx, vibrate } from '../core/sfx.js';
import { makeRng, todayKey } from '../core/rng.js';

const ING = { pain: '🍞', steak: '🥩', fromage: '🧀', salade: '🥬', tomate: '🍅', bacon: '🥓', oeuf: '🍳', pate: '🫓', sauce: '🥫', champi: '🍄', olive: '🫒', poivron: '🫑' };
const BURGER_FILL = ['steak', 'fromage', 'salade', 'tomate', 'bacon', 'oeuf'];
const PIZZA_TOP = ['fromage', 'champi', 'olive', 'poivron', 'bacon'];

export default {
  start(ctx) {
    const mode = ctx.mode || 'classic', rush = mode === 'rush';
    const R = mode === 'jour' ? makeRng('cuisine-' + todayKey()) : ctx.rng;
    let left = 90, score = 0, served = 0, streak = 0, bestStreak = 0, maxTips = 0, missed = 0, over = false, spawnT = 0.5, t = 0, plate = [];
    const orders = [];
    const keys = rush ? ['pain', 'steak', 'fromage', 'salade', 'tomate', 'bacon', 'pate', 'sauce', 'champi', 'olive', 'poivron', 'oeuf'] : ['pain', 'steak', 'fromage', 'salade', 'tomate', 'bacon', 'oeuf'];
    const ordersEl = h('div', { style: { display: 'flex', gap: '6px', justifyContent: 'center', minHeight: '150px', alignItems: 'flex-end', width: '100%' } });
    const plateEl = h('div', { style: { display: 'flex', flexDirection: 'column-reverse', alignItems: 'center', minHeight: '150px', width: '150px', paddingBottom: '18px', background: 'radial-gradient(ellipse 70px 14px at 50% calc(100% - 10px), #fff 96%, transparent), radial-gradient(ellipse 76px 18px at 50% calc(100% - 7px), #c9c3e6 96%, transparent)', fontSize: '34px', lineHeight: '22px' } });
    const pad = h('div', { style: { display: 'grid', gridTemplateColumns: `repeat(${rush ? 6 : 4},1fr)`, gap: '6px', width: 'min(96vw,460px)' } },
      keys.map((k) => h('button.btn', { style: { minHeight: '54px', fontSize: '28px', padding: 0 }, onpointerdown: (e) => { e.preventDefault(); add(k); } }, ING[k])),
      h('button.btn', { style: { minHeight: '54px', fontSize: '24px', padding: 0, background: 'rgba(255,61,90,.2)' }, onpointerdown: (e) => { e.preventDefault(); trash(); } }, '🗑️'));
    const hint = h('div.faint', { style: { fontSize: '13px' } }, 'Empile de bas en haut, puis touche la commande');
    ctx.stage.append(h('div.center-stage', { style: { gap: '10px', justifyContent: 'space-between', padding: '10px 6px 14px' } }, ordersEl, hint, plateEl, pad));

    const recipe = () => {
      const lvl = Math.min(3, Math.floor(t / 25));
      if (rush && R.float(0, 1) < 0.4) return ['pate', 'sauce', ...R.shuffle(PIZZA_TOP).slice(0, 1 + R.int(0, 1 + Math.min(2, lvl)))];
      if (R.float(0, 1) < 0.2 && lvl < 2) return ['pain', 'steak', 'pain'];
      const fill = ['steak', ...R.shuffle(BURGER_FILL.filter((x) => x !== 'steak')).slice(0, 1 + R.int(0, 1 + lvl))];
      return ['pain', ...R.shuffle(fill), 'pain'];
    };
    const spawn = () => { const r = recipe(); const pat = (rush ? 20 : 26) + r.length * 1.5; orders.push({ r, pat, max: pat, id: Math.random() }); sfx.tick(); };
    const paintPlate = () => plateEl.replaceChildren(...plate.map((k) => h('span', { style: { animation: 'pop .2s var(--spring) both' } }, ING[k])));
    const paintOrders = () => ordersEl.replaceChildren(...orders.map((o) => {
      const k = o.pat / o.max;
      return h('button', { style: { display: 'flex', flexDirection: 'column-reverse', alignItems: 'center', gap: 0, padding: '6px 4px 4px', width: '76px', borderRadius: '14px', background: '#fff8e6', border: `3px solid hsl(${k * 120},80%,50%)`, cursor: 'pointer', fontSize: '20px', lineHeight: '18px', position: 'relative' }, onpointerdown: (e) => { e.preventDefault(); serve(o); } },
        h('i', { style: { position: 'absolute', left: 0, bottom: 0, height: '4px', width: `${k * 100}%`, background: `hsl(${k * 120},80%,50%)`, borderRadius: '0 0 0 10px' } }),
        ...o.r.map((x) => h('span', ING[x])));
    }));
    const add = (k) => { if (over || plate.length >= 8) return; plate.push(k); sfx.tap(); vibrate(4); paintPlate(); };
    const trash = () => { if (!plate.length) return; plate = []; sfx.bad(); paintPlate(); };
    const serve = (o) => {
      if (over) return;
      if (!plate.length) { hint.textContent = 'Prépare d’abord l’assiette !'; return; }
      const ok = plate.length === o.r.length && plate.every((x, i) => x === o.r[i]);
      if (ok) {
        const k = o.pat / o.max, tip = Math.round(30 * k); if (k > 0.7) maxTips++;
        const p = 40 + o.r.length * 10 + tip + Math.min(5, streak) * 5; score += p; served++; streak++; bestStreak = Math.max(bestStreak, streak);
        orders.splice(orders.indexOf(o), 1);
        sfx.ok(); vibrate(10); ctx.pop(`+${p}${k > 0.7 ? ' 💰' : ''}`, ctx.stage.clientWidth / 2, ctx.stage.clientHeight * 0.2, '#3ddc97', 24);
        if (streak % 5 === 0) { sfx.win(); ctx.flash('rgba(61,220,151,.2)'); }
        hint.textContent = streak >= 3 ? `🔥 ${streak} commandes parfaites` : 'Empile de bas en haut, puis touche la commande';
      } else { streak = 0; score = Math.max(0, score - 20); sfx.bad(); ctx.shake(5); vibrate([30, 30, 30]); hint.textContent = '❌ Mauvaise commande : assiette jetée (−20)'; }
      plate = []; paintPlate(); paintOrders(); hud();
    };
    const hud = () => ctx.hud({ pts: `${score} pts`, time: `${Math.max(0, Math.ceil(left))} s`, n: `🍽️ ${served}` });
    ctx.interval(() => {
      if (over) return; const dt = 0.1; t += dt; left -= dt;
      spawnT -= dt; if (spawnT <= 0 && orders.length < 4) { spawn(); spawnT = Math.max(rush ? 3.2 : 4.5, (rush ? 6 : 8) - t * 0.04); }
      if (!orders.length && spawnT > 1) spawnT = 1;
      for (const o of [...orders]) { o.pat -= dt; if (o.pat <= 0) { orders.splice(orders.indexOf(o), 1); missed++; streak = 0; score = Math.max(0, score - 30); sfx.bad(); ctx.shake(4); hint.textContent = '😤 Un client est parti (−30)'; } }
      paintOrders(); if (Math.round(t * 10) % 5 === 0) hud();
      if (left <= 0) end();
    }, 100);
    const end = () => {
      over = true; sfx.win();
      ctx.timeout(() => ctx.end({
        score, display: `${score} pts`, emoji: '🍔', board: mode === 'classic' ? null : mode,
        title: score >= 900 ? 'Chef étoilé' : score >= 550 ? 'Bonne brigade' : 'La cuisine a chauffé',
        label: `${served} commande${served > 1 ? 's' : ''} servie${served > 1 ? 's' : ''} · ${missed} client${missed > 1 ? 's' : ''} parti${missed > 1 ? 's' : ''}`,
        feats: [bestStreak >= 10 && 'chef', maxTips >= 5 && 'pourboire', rush && score >= 900 && 'rush'].filter(Boolean),
      }), 500);
    };
    hud(); paintPlate();
  },
};
