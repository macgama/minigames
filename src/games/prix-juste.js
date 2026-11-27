import { h } from '../core/dom.js';
import { sfx, vibrate } from '../core/sfx.js';
import { makeRng, todayKey } from '../core/rng.js';
import { playerSetup } from '../core/players.js';
import { passTo, scoreTable } from './kit.js';

// Prix indicatifs en francs suisses (ordre de grandeur courant)
const ITEMS = [
  ['☕', 'Un café au bistrot', 4.5], ['🥖', 'Une baguette', 2.5], ['🥛', 'Un litre de lait', 1.7], ['🍫', 'Une tablette de chocolat au lait (100 g)', 2], ['🎬', 'Un billet de cinéma adulte', 19],
  ['🍔', 'Un menu burger dans un fast-food', 14], ['🛣️', 'La vignette autoroutière suisse', 40], ['🚆', 'Un abonnement demi-tarif CFF (1 an)', 190], ['🍕', 'Une pizza margherita au restaurant', 20], ['🧀', 'Un kilo de gruyère', 25],
  ['🍌', 'Un kilo de bananes', 2.5], ['🥚', 'Une boîte de 6 œufs', 4], ['🍺', 'Une bière pression (3 dl) au bar', 6], ['🧻', '12 rouleaux de papier toilette', 9], ['🪥', 'Une brosse à dents simple', 3],
  ['👟', 'Une paire de baskets de marque', 130], ['🚲', 'Un vélo électrique de ville', 2800], ['📺', 'Un téléviseur 55 pouces (milieu de gamme)', 700], ['🎮', 'Une console de jeux de salon', 500], ['🎧', 'Des écouteurs sans fil de marque', 200],
  ['⛽', 'Un litre d’essence', 1.9], ['🚗', 'Une petite voiture neuve', 22000], ['🏠', 'Un loyer moyen de 3 pièces à Lausanne (par mois)', 1900], ['✂️', 'Une coupe chez le coiffeur (homme)', 40], ['💐', 'Un bouquet de roses chez le fleuriste', 50],
  ['🎿', 'Une journée de ski adulte dans une grande station', 80], ['🏊', 'Une entrée à la piscine municipale', 7], ['🍦', 'Une boule de glace', 4], ['🥐', 'Un croissant', 1.8], ['🍷', 'Une bouteille de vin rouge suisse ordinaire', 15],
  ['📱', 'Un forfait mobile illimité (par mois)', 40], ['🧸', 'Une grande peluche', 35], ['🎁', 'Un jeu de société familial', 45], ['🔋', '4 piles AA', 6], ['💡', 'Une ampoule LED', 5],
  ['🪑', 'Une chaise de bureau simple', 150], ['🛏️', 'Un matelas double', 800], ['🧺', 'Une machine à laver', 1200], ['🍝', 'Un paquet de spaghetti (500 g)', 1.5], ['🧃', 'Un jus d’orange (1 l)', 2.5],
  ['📚', 'Un roman en livre de poche', 14], ['✈️', 'Un vol Genève–Barcelone aller simple (à l’avance)', 80], ['🎢', 'Une entrée adulte dans un grand parc d’attractions', 75], ['🐕', 'Un sac de croquettes de 10 kg', 50], ['🧴', 'Une crème solaire', 15],
  ['⌚', 'Une montre suisse de luxe d’entrée de gamme', 4000], ['🍫', 'Une boîte de pralinés (250 g)', 25], ['🚕', 'Un trajet de taxi de 5 km en ville', 30], ['🎂', 'Un gâteau d’anniversaire chez le pâtissier', 45], ['🪴', 'Une plante verte d’intérieur', 25],
];
const fmt = (v) => (v >= 100 ? Math.round(v).toLocaleString('fr-CH') : v.toFixed(2).replace('.', ',')).replace(/ |\s/g, ' ') + ' CHF';
const ptsFor = (g, p) => { const e = Math.abs(g - p) / p; return Math.max(0, Math.round(100 * (1 - e * 1.4))) + (e <= 0.05 ? 20 : 0); };

export default {
  async start(ctx) {
    const mode = ctx.mode || 'solo', party = mode === 'soiree';
    const R = mode === 'jour' ? makeRng('prix-' + todayKey()) : ctx.rng;
    let players = [{ name: 'Toi', emoji: '🙂', color: '#4cc9f0' }];
    if (party) { players = await playerSetup(ctx.stage, { min: 2, max: 6, title: 'Qui joue ?', cta: 'Faire les courses 🛒' }); if (!ctx.alive) return; }
    players.forEach((p) => (p.pts = 0));
    const ROUNDS = party ? 6 : 8;
    // Mélange des petits et des gros prix
    const pool = R.shuffle(ITEMS); const items = [...pool.filter((x) => x[2] < 50).slice(0, Math.ceil(ROUNDS / 2)), ...pool.filter((x) => x[2] >= 50).slice(0, Math.floor(ROUNDS / 2))];
    const order = R.shuffle(items);
    const scene = h('div.center-stage', { style: { gap: '14px' } }); ctx.stage.append(scene);
    let total = 0, nearPerfect = false;

    const keypad = (item, who) => new Promise((res) => {
      let s = '';
      const disp = h('div', { style: { fontSize: '46px', fontWeight: 900, minHeight: '56px', fontVariantNumeric: 'tabular-nums' } });
      const paint = () => { disp.textContent = (s || '0').replace('.', ',') + ' CHF'; ok.disabled = !(+s > 0); };
      const key = (k) => { if (k === '⌫') s = s.slice(0, -1); else if (k === ',') { if (!s.includes('.')) s = (s || '0') + '.'; } else if (s.replace('.', '').length < 6 && !(s.includes('.') && s.split('.')[1].length >= 2)) s += k; sfx.tick(); paint(); };
      const ok = h('button.btn.btn-primary.btn-lg.btn-block', { onclick: () => res(+s) }, 'Valider');
      scene.replaceChildren(
        who ? h('div.faint', `${who.emoji} ${who.name}`) : '',
        h('div', { style: { fontSize: '72px' }, class: 'anim-pop' }, item[0]), h('div.big-msg', { style: { fontSize: 'clamp(20px,5vw,30px)', maxWidth: '520px' } }, item[1]),
        disp,
        h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px', width: 'min(80vw,300px)' } }, ['1', '2', '3', '4', '5', '6', '7', '8', '9', ',', '0', '⌫'].map((k) => h('button.btn', { style: { minHeight: '54px', fontSize: '22px', fontWeight: 800 }, onclick: () => key(k) }, k))),
        h('div', { style: { width: 'min(80vw,300px)' } }, ok));
      paint();
      keyFn = (e) => { if (/^[0-9]$/.test(e.key)) key(e.key); if (e.key === ',' || e.key === '.') key(','); if (e.key === 'Backspace') key('⌫'); if (e.key === 'Enter' && +s > 0) res(+s); };
    });
    let keyFn = () => {};
    ctx.on(window, 'keydown', (e) => keyFn(e));

    for (let r = 0; r < ROUNDS && ctx.alive; r++) {
      const item = order[r];
      ctx.hud({ round: `${r + 1}/${ROUNDS}`, pts: party ? null : `${total} pts` });
      if (!party) {
        const g = await keypad(item); if (!ctx.alive) return; keyFn = () => {};
        const pts = ptsFor(g, item[2]); total += pts; if (Math.abs(g - item[2]) / item[2] <= 0.02) nearPerfect = true;
        const e = Math.round((Math.abs(g - item[2]) / item[2]) * 100);
        scene.replaceChildren(h('div', { style: { fontSize: '60px' } }, item[0]), h('div.muted', item[1]),
          h('div', { style: { fontSize: '18px' } }, `Ta réponse : ${fmt(g)}`),
          h('div.big-msg', { style: { fontSize: '40px' } }, fmt(item[2])),
          h('div', { style: { fontSize: '22px', fontWeight: 800, color: pts >= 80 ? 'var(--ok)' : pts >= 40 ? '#ffd23f' : 'var(--bad)' } }, `${g > item[2] ? 'Trop cher' : g < item[2] ? 'Trop bas' : 'Pile !'} · ${e} % d’écart · +${pts}`));
        if (pts >= 100) { ctx.flash('rgba(61,220,151,.3)'); sfx.win(); } else pts >= 60 ? sfx.ok() : sfx.bad();
        await ctx.wait(2300);
      } else {
        const guesses = [];
        for (const p of players) { await passTo(scene, p, 'Les autres ne regardent pas ton prix 👀'); if (!ctx.alive) return; guesses.push({ p, g: await keypad(item, p) }); if (!ctx.alive) return; keyFn = () => {}; }
        guesses.sort((a, b) => Math.abs(a.g - item[2]) - Math.abs(b.g - item[2]));
        guesses.forEach((x, i) => (x.p.pts += i === 0 ? 3 : i === 1 && guesses.length > 2 ? 1 : 0));
        sfx.win();
        await new Promise((res) => scene.replaceChildren(h('div', { style: { fontSize: '56px' } }, item[0]), h('div.big-msg', { style: { fontSize: '36px' } }, fmt(item[2])),
          h('div', { style: { display: 'grid', gap: '6px', width: 'min(92vw,420px)' } }, guesses.map((x, i) => h('div', { style: { display: 'flex', justifyContent: 'space-between', padding: '8px 12px', borderRadius: '12px', background: i === 0 ? 'rgba(61,220,151,.18)' : 'rgba(255,255,255,.05)' } }, h('span', `${x.p.emoji} ${x.p.name}`), h('b', fmt(x.g))))),
          h('p.faint', 'Le plus proche +3, le 2e +1'), h('button.btn.btn-primary.btn-lg', { onclick: res }, r < ROUNDS - 1 ? 'Objet suivant' : 'Résultats')));
      }
    }
    if (!ctx.alive) return;
    if (party) { const top = [...players].sort((a, b) => b.pts - a.pts)[0]; return ctx.end({ multi: true, emoji: '🏷️', display: top.emoji, title: `${top.name} connaît les prix !`, label: `${ROUNDS} objets`, win: true, extra: scoreTable(players) }); }
    ctx.end({
      score: total, display: `${total} pts`, emoji: '🏷️', board: mode === 'jour' ? 'jour' : null,
      title: total >= 700 ? 'Expert du caddie' : total >= 500 ? 'Bon œil' : 'Il est temps de faire les courses',
      label: `${ROUNDS} objets · prix indicatifs en Suisse`,
      feats: [nearPerfect && 'pile', total >= 700 && 'expert'].filter(Boolean),
    });
  },
};
