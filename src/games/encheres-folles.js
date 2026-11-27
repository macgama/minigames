import { h } from '../core/dom.js';
import { sfx, vibrate } from '../core/sfx.js';
import { playerSetup } from '../core/players.js';
import { passTo, scoreTable } from './kit.js';

// [indice, contenu révélé, valeur]
const LOTS = [
  ['📦 Une vieille malle de grenier, très lourde', '🪙 Une collection de pièces anciennes', 850], ['📦 Une malle de grenier, très lourde', '🧱 Des briques… juste des briques', 0],
  ['🖼️ Un tableau couvert d’un drap', '🎨 Une toile d’un peintre reconnu', 900], ['🖼️ Un cadre doré sous un drap', '🖍️ Un dessin d’enfant (très réussi)', 20],
  ['🎻 Un étui à violon', '🎻 Un violon de maître', 700], ['🎻 Un étui à violon cabossé', '🐀 Une famille de souris', 0],
  ['💍 Un petit écrin de velours', '💎 Une bague en diamant', 800], ['💍 Un écrin de velours', '🍬 Un bonbon à la menthe', 5],
  ['🚗 Une clé de voiture', '🚗 Une vieille voiture de collection', 950], ['🚗 Une clé de voiture rouillée', '🛞 Une roue de secours', 60],
  ['📚 Un carton de livres', '📜 Une édition originale signée', 600], ['📚 Un carton de livres humide', '📰 Des journaux de 1998', 10],
  ['⌚ Une boîte de montre', '⌚ Une montre suisse ancienne', 650], ['⌚ Une boîte de montre neuve', '⌚ Une montre en plastique', 15],
  ['🍷 Une caisse de bouteilles', '🍷 Des grands crus', 500], ['🍷 Une caisse poussiéreuse', '🥤 Du sirop de grenadine', 25],
  ['🎮 Un carton marqué « jeux »', '🕹️ Une console rare encore emballée', 450], ['🎮 Un carton marqué « jeux »', '🧩 Un puzzle à qui il manque des pièces', 5],
  ['🧳 Une valise oubliée à l’aéroport', '📷 Un appareil photo professionnel', 400], ['🧳 Une valise oubliée', '🧦 Des chaussettes dépareillées', 2],
  ['🗝️ La clé d’un garde-meuble', '🛋️ Des meubles design', 550], ['🗝️ La clé d’une cave', '🥔 Des sacs de pommes de terre', 30],
];
const ROUNDS = 8, START = 1000;
const BOTS = [{ name: 'Mme Prudence', emoji: '🧐', color: '#4cc9f0', style: 'prudent' }, { name: 'Le Flambeur', emoji: '🤑', color: '#ff9f43', style: 'joueur' }, { name: 'Oncle Radin', emoji: '🧓', color: '#3ddc97', style: 'radin' }];

export default {
  async start(ctx) {
    const party = ctx.mode === 'soiree', R = ctx.rng;
    let players;
    if (party) { players = await playerSetup(ctx.stage, { min: 2, max: 6, title: 'Qui enchérit ?', cta: 'Ouvrir la salle des ventes 🔨' }); if (!ctx.alive) return; }
    else players = [{ name: 'Toi', emoji: '🙂', color: '#ff4fa3', human: true }, ...BOTS.map((b) => ({ ...b }))];
    if (party) players.forEach((p) => (p.human = true));
    players.forEach((p) => { p.cash = START; p.items = []; p.pts = 0; });
    const lots = R.shuffle(LOTS).slice(0, ROUNDS).map(([hint, what, v]) => {
      // L'expert donne une fourchette… pas toujours fiable
      const fake = R.float(0, 1) < 0.25, mid = fake ? R.float(250, 700) : Math.max(60, v * R.float(0.75, 1.25));
      return { hint, what, v, lo: Math.round((mid * 0.6) / 10) * 10, hi: Math.round((mid * 1.4) / 10) * 10 };
    });
    const scene = h('div.center-stage', { style: { gap: '12px' } }); ctx.stage.append(scene);
    const me = players[0]; let deal = false, trap = false;
    const fmt = (v) => `${v.toLocaleString('fr-CH')} 🪙`;
    const lotCard = (L, i) => h('div', { style: { padding: '16px', borderRadius: '20px', background: 'linear-gradient(160deg,#3a2a6b,#1b1450)', border: '1px solid var(--border-strong)', textAlign: 'center', width: 'min(92vw,420px)' } },
      h('div.faint', { style: { fontSize: '12px', letterSpacing: '.1em' } }, `LOT ${i + 1}/${ROUNDS}`), h('div', { style: { fontSize: '22px', fontWeight: 800, margin: '6px 0' } }, L.hint), h('div.muted', `🧑‍⚖️ L’expert estime : ${fmt(L.lo)} à ${fmt(L.hi)}`));
    const bidPad = (p, L, i) => new Promise((res) => {
      let v = 0; const val = h('div', { style: { fontSize: '40px', fontWeight: 900, fontVariantNumeric: 'tabular-nums' } });
      const range = h('input', { type: 'range', min: 0, max: p.cash, step: 10, value: 0, style: { width: 'min(84vw,340px)' }, oninput: (e) => { v = +e.target.value; paint(); } });
      const paint = () => { val.textContent = fmt(v); range.value = v; };
      const adj = (d) => h('button.btn', { onclick: () => { v = Math.max(0, Math.min(p.cash, v + d)); sfx.tick(); paint(); } }, d > 0 ? `+${d}` : `${d}`);
      scene.replaceChildren(lotCard(L, i), h('div.faint', `${p.emoji} ${p.name} · tu as ${fmt(p.cash)}`), val, range,
        h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'center' } }, adj(-100), adj(-10), adj(10), adj(100)),
        h('div', { style: { display: 'flex', gap: '8px' } }, h('button.btn', { onclick: () => res(0) }, 'Je passe'), h('button.btn.btn-primary.btn-lg', { onclick: () => res(v) }, 'Miser en secret')));
      paint();
    });
    const botBid = (b, L) => {
      const mid = (L.lo + L.hi) / 2; const left = ROUNDS - lots.indexOf(L);
      const k = b.style === 'prudent' ? R.float(0.45, 0.75) : b.style === 'joueur' ? R.float(0.3, 1.25) : R.float(0.25, 0.55);
      const cap = b.style === 'joueur' ? b.cash : Math.min(b.cash, (b.cash / Math.max(1, left)) * 2.5);
      return Math.max(0, Math.min(cap, Math.round((mid * k) / 10) * 10));
    };
    for (let i = 0; i < ROUNDS && ctx.alive; i++) {
      const L = lots[i]; ctx.hud({ lot: `📦 ${i + 1}/${ROUNDS}`, cash: party ? null : `💰 ${me.cash}` });
      const bids = new Map();
      if (!party) { await new Promise((res) => { scene.replaceChildren(lotCard(L, i), h('p.muted', 'Les enchérisseurs examinent la caisse…')); ctx.timeout(res, 900); }); if (!ctx.alive) return; }
      for (const p of players) {
        if (p.human) { if (party) { await passTo(scene, p, 'Mise en secret 🤫'); if (!ctx.alive) return; } bids.set(p, await bidPad(p, L, i)); if (!ctx.alive) return; }
        else bids.set(p, botBid(p, L));
      }
      const order = [...bids].sort((a, b) => b[1] - a[1]); const [win, price] = order[0] || [];
      const top = order.filter(([, b]) => b === price && b > 0); const winner = top.length ? R.pick(top)[0] : null;
      if (winner) { winner.cash -= price; winner.items.push({ ...L, price }); if (winner === me && !party) { if (L.v > 0 && price < L.v * 0.3) deal = true; if (L.v < 50) trap = true; } }
      sfx.go(); ctx.shake(3);
      await new Promise((res) => {
        scene.replaceChildren(h('div', { style: { fontSize: '48px' } }, '🔨'),
          h('div.big-msg', { style: { fontSize: '22px', textAlign: 'center' } }, winner ? `Adjugé à ${winner.emoji} ${winner.name} pour ${fmt(price)} !` : 'Personne n’a misé !'),
          h('div', { style: { display: 'grid', gap: '4px', width: 'min(92vw,380px)' } }, order.map(([p, b]) => h('div', { style: { display: 'flex', justifyContent: 'space-between', opacity: p === winner ? 1 : 0.6, fontWeight: p === winner ? 800 : 500 } }, h('span', `${p.emoji} ${p.name}`), h('span', b ? fmt(b) : 'passe')))),
          h('button.btn.btn-primary.btn-lg', { onclick: () => { reveal(); } }, '📦 Ouvrir la caisse'));
        const reveal = () => {
          const good = L.v >= (price || 0) && L.v > 50;
          good ? (sfx.win(), ctx.flash('rgba(61,220,151,.25)')) : (sfx.bad(), ctx.shake(5)); vibrate(good ? [20, 30, 20] : [50, 30, 50]);
          scene.replaceChildren(h('div', { style: { fontSize: '56px' } }, L.what.split(' ')[0]), h('div.big-msg', { style: { fontSize: '22px', textAlign: 'center' } }, L.what.slice(L.what.indexOf(' ') + 1)),
            h('div', { style: { fontSize: '26px', fontWeight: 900, color: good ? 'var(--ok)' : 'var(--bad)' } }, `Valeur : ${fmt(L.v)}`),
            winner ? h('div', { style: { fontWeight: 700 } }, `${winner.name} ${L.v - price >= 0 ? 'gagne' : 'perd'} ${fmt(Math.abs(L.v - price))}`) : '',
            h('button.btn.btn-primary.btn-lg', { onclick: res }, i < ROUNDS - 1 ? 'Lot suivant' : 'Bilan'));
        };
      });
    }
    if (!ctx.alive) return;
    players.forEach((p) => (p.pts = p.cash + p.items.reduce((s, x) => s + x.v, 0)));
    const ranked = [...players].sort((a, b) => b.pts - a.pts);
    const table = scoreTable(players, 'pts', '🪙');
    if (party) return ctx.end({ multi: true, win: true, emoji: '🔨', display: ranked[0].emoji, title: `${ranked[0].name} fait fortune !`, label: `${ROUNDS} lots`, extra: table });
    const rank = ranked.indexOf(me) + 1;
    ctx.end({
      score: me.pts, display: fmt(me.pts), emoji: '🔨', win: rank === 1, extra: table,
      title: rank === 1 ? 'Roi des enchères' : me.pts >= START ? `${rank}e, mais dans le vert` : 'La salle des ventes t’a plumé',
      label: `${me.items.length} lot${me.items.length > 1 ? 's' : ''} acheté${me.items.length > 1 ? 's' : ''} · ${rank}e sur ${players.length}`,
      feats: [deal && 'affaire', me.items.length >= 2 && !trap && 'flair', me.pts >= 2000 && 'magnat'].filter(Boolean),
    });
  },
};
