import { h } from '../core/dom.js';
import { sfx, vibrate } from '../core/sfx.js';

// [question, bonne réponse, 3 fausses]
const QS = [
  ['Quelle est la plus grande planète du Système solaire ?', 'Jupiter', 'Saturne', 'Neptune', 'La Terre'], ['Combien de pattes a une araignée ?', '8', '6', '10', '12'],
  ['Quel est le plus long fleuve de France ?', 'La Loire', 'La Seine', 'Le Rhône', 'La Garonne'], ['Dans quel pays se trouve Machu Picchu ?', 'Pérou', 'Mexique', 'Chili', 'Bolivie'],
  ['Combien de cantons compte la Suisse ?', '26', '23', '20', '30'], ['Quel gaz les plantes absorbent-elles pour la photosynthèse ?', 'Le dioxyde de carbone', 'L’oxygène', 'L’azote', 'L’hélium'],
  ['Qui a peint « La Joconde » ?', 'Léonard de Vinci', 'Michel-Ange', 'Raphaël', 'Botticelli'], ['Quelle est la capitale du Canada ?', 'Ottawa', 'Toronto', 'Montréal', 'Vancouver'],
  ['Quel est l’animal terrestre le plus rapide ?', 'Le guépard', 'Le lion', 'L’antilope', 'Le lévrier'], ['Combien de minutes dans une journée ?', '1440', '1240', '1600', '960'],
  ['Quel océan borde la côte ouest des États-Unis ?', 'Pacifique', 'Atlantique', 'Indien', 'Arctique'], ['Quel est le symbole chimique de l’or ?', 'Au', 'Or', 'Ag', 'Go'],
  ['Combien de joueurs dans une équipe de football sur le terrain ?', '11', '10', '9', '12'], ['Quelle langue parle-t-on au Brésil ?', 'Le portugais', 'L’espagnol', 'Le brésilien', 'L’italien'],
  ['Quel est le plus haut sommet de Suisse ?', 'La pointe Dufour', 'Le Cervin', 'La Jungfrau', 'Le mont Blanc'], ['En quelle année l’homme a-t-il marché sur la Lune pour la première fois ?', '1969', '1959', '1972', '1965'],
  ['Quel instrument a 88 touches ?', 'Le piano', 'L’orgue', 'L’accordéon', 'Le synthétiseur'], ['Quelle est la capitale de l’Australie ?', 'Canberra', 'Sydney', 'Melbourne', 'Perth'],
  ['Combien de côtés a un hexagone ?', '6', '5', '7', '8'], ['Quel est le plus grand désert chaud du monde ?', 'Le Sahara', 'Le Kalahari', 'Le désert de Gobi', 'L’Atacama'],
  ['Quel organe pompe le sang dans le corps ?', 'Le cœur', 'Les poumons', 'Le foie', 'Les reins'], ['Dans quelle ville se trouve le siège de la Croix-Rouge internationale ?', 'Genève', 'Berne', 'Bruxelles', 'Vienne'],
  ['Qui a écrit « Les Misérables » ?', 'Victor Hugo', 'Émile Zola', 'Alexandre Dumas', 'Gustave Flaubert'], ['Quel est le plus petit pays du monde ?', 'Le Vatican', 'Monaco', 'Le Liechtenstein', 'Saint-Marin'],
  ['Combien de couleurs a un arc-en-ciel (traditionnellement) ?', '7', '6', '5', '8'], ['Quelle planète est surnommée la planète rouge ?', 'Mars', 'Vénus', 'Mercure', 'Jupiter'],
  ['Quel animal est le symbole du WWF ?', 'Le panda', 'Le tigre', 'L’ours polaire', 'L’éléphant'], ['Quel est le plus grand lac entièrement suisse ?', 'Le lac de Neuchâtel', 'Le Léman', 'Le lac de Constance', 'Le lac des Quatre-Cantons'],
  ['Quelle est la monnaie du Japon ?', 'Le yen', 'Le yuan', 'Le won', 'Le dong'], ['Combien d’os environ dans le corps humain adulte ?', '206', '150', '300', '412'],
  ['Quel pays a la forme d’une botte ?', 'L’Italie', 'La Grèce', 'Le Portugal', 'La Croatie'], ['À quelle température l’eau bout-elle au niveau de la mer ?', '100 °C', '90 °C', '120 °C', '80 °C'],
  ['Qui a formulé la théorie de la relativité ?', 'Albert Einstein', 'Isaac Newton', 'Niels Bohr', 'Galilée'], ['Quel est le plus grand mammifère ?', 'La baleine bleue', 'L’éléphant d’Afrique', 'Le cachalot', 'La girafe'],
  ['Quelle est la capitale du Portugal ?', 'Lisbonne', 'Porto', 'Coimbra', 'Faro'], ['Quelle est la langue la plus parlée en Suisse ?', 'L’allemand', 'Le français', 'L’italien', 'Le romanche'],
  ['Quel sport pratique-t-on à Wimbledon ?', 'Le tennis', 'Le golf', 'Le cricket', 'Le polo'], ['Quel est l’ingrédient principal du guacamole ?', 'L’avocat', 'La tomate', 'Le concombre', 'Le poivron'],
  ['Combien de cordes a une guitare classique ?', '6', '4', '5', '7'], ['Dans quel pays se trouvent les pyramides de Gizeh ?', 'Égypte', 'Soudan', 'Mexique', 'Jordanie'],
  ['Quel est le métal liquide à température ambiante ?', 'Le mercure', 'Le plomb', 'L’étain', 'Le zinc'], ['Combien d’heures dure une semaine ?', '168', '144', '180', '120'],
  ['Quel pays a offert la statue de la Liberté aux États-Unis ?', 'La France', 'Le Royaume-Uni', 'L’Espagne', 'L’Italie'], ['Quelle est la capitale de l’Espagne ?', 'Madrid', 'Barcelone', 'Séville', 'Valence'],
  ['Quel fruit est traditionnellement associé à Isaac Newton ?', 'La pomme', 'La poire', 'L’orange', 'La cerise'], ['Combien de zéros dans un million ?', '6', '5', '7', '9'],
  ['Quel tunnel ferroviaire suisse est le plus long du monde ?', 'Le Gothard (base)', 'Le Lötschberg', 'Le Simplon', 'Le Furka'], ['Quel oiseau ne peut pas voler ?', 'L’autruche', 'Le cygne', 'Le héron', 'La mouette'],
];

export default {
  start(ctx) {
    const bot = ctx.mode === 'bot', R = ctx.rng, QN = 10;
    const names = bot ? ['Toi', 'L’ordi'] : ['Bleu', 'Rouge'];
    const pts = [0, 0], jok = [{ f: 1, d: 1, g: 1 }, { f: 1, d: 1, g: 1 }];
    let qi = 0, cur = null, fastOk = false, usedAll = false, botT = null;
    const qs = R.shuffle(QS).slice(0, QN).map(([q, a, ...w]) => ({ q, a, opts: R.shuffle([a, ...w]) }));
    const side = (k) => {
      const el = h('div', { style: { flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', justifyContent: 'center', alignItems: 'center', padding: '8px', transform: k === 1 ? 'rotate(180deg)' : '', background: k === 0 ? 'linear-gradient(180deg,transparent,rgba(76,201,240,.12))' : 'linear-gradient(180deg,transparent,rgba(255,92,122,.12))' } });
      return el;
    };
    const S = [side(0), side(1)];
    ctx.stage.append(h('div', { style: { position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column-reverse' } }, S[0], h('div', { style: { height: '3px', background: 'var(--brand-grad)' } }), S[1]));
    const hud = () => ctx.hud({ score: `🔵 ${pts[0]} – ${pts[1]} 🔴`, q: `❓ ${Math.min(qi + 1, QN)}/${QN}` });
    const paint = (k) => {
      const c = cur, st = c.st[k];
      const frozen = st.frozen > performance.now(), locked = st.wrong || c.done;
      if (bot && k === 1) { S[1].replaceChildren(h('div', { style: { fontSize: '44px' } }, '🤖'), h('div', { style: { fontWeight: 800 } }, c.done ? '' : frozen ? '❄️ Gelé !' : st.wrong ? '❌ Raté' : 'réfléchit…'), h('div.faint', `${pts[1]} pts`)); return; }
      S[k].replaceChildren(
        h('div', { style: { fontWeight: 800, fontSize: 'clamp(15px,4.2vw,19px)', textAlign: 'center', maxWidth: '440px' } }, c.q),
        h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', width: 'min(94vw,440px)' } }, c.opts.map((o) => {
          const hidden = st.cut.includes(o), right = c.done && o === c.a, mine = st.pick === o;
          return h('button.btn', { style: { minHeight: '46px', fontSize: '14px', fontWeight: 700, padding: '4px 6px', visibility: hidden ? 'hidden' : 'visible', pointerEvents: locked || frozen ? 'none' : '', opacity: frozen ? 0.4 : 1, background: right ? 'var(--ok)' : mine && o !== c.a ? 'var(--bad)' : '' }, onpointerdown: (e) => { e.preventDefault(); answer(k, o); } }, o);
        })),
        h('div', { style: { display: 'flex', gap: '6px', alignItems: 'center' } },
          h('span', { style: { fontWeight: 900, minWidth: '52px', color: k === 0 ? '#4cc9f0' : '#ff5c7a' } }, `${pts[k]} pts`),
          ...[['f', '50/50'], ['d', st.double ? '×2 ✓' : '×2'], ['g', '❄️ Gel']].map(([j, l]) => h('button.btn.btn-sm', { disabled: !jok[k][j] || locked || frozen, onpointerdown: (e) => { e.preventDefault(); joker(k, j); } }, l))),
        frozen ? h('div', { style: { fontWeight: 900, color: '#4cc9f0' } }, '❄️ Gelé !') : '');
    };
    const paintAll = () => { paint(0); paint(1); };
    const ask = () => {
      if (qi >= QN) return finish();
      const q = qs[qi]; cur = { ...q, t0: performance.now(), done: false, st: [0, 1].map(() => ({ wrong: false, cut: [], double: false, frozen: 0, pick: null })) };
      hud(); paintAll(); sfx.count?.();
      if (bot) { const id = qi, think = R.float(2.4, 6.5); botT = ctx.timeout(() => botMove(id), think * 1000); }
    };
    const botMove = (id) => {
      if (!cur || cur.done || id !== qi) return;
      const st = cur.st[1]; if (st.frozen > performance.now()) { botT = ctx.timeout(() => botMove(id), st.frozen - performance.now() + 300); return; }
      if (jok[1].g && R.float(0, 1) < 0.15) joker(1, 'g');
      if (jok[1].d && R.float(0, 1) < 0.2) joker(1, 'd');
      const ok = R.float(0, 1) < 0.68; const wrongs = cur.opts.filter((o) => o !== cur.a);
      answer(1, ok ? cur.a : R.pick(wrongs));
    };
    const joker = (k, j) => {
      if (!cur || cur.done || !jok[k][j]) return; jok[k][j] = 0; sfx.go(); vibrate(10);
      const st = cur.st[k];
      if (j === 'f') st.cut = R.shuffle(cur.opts.filter((o) => o !== cur.a)).slice(0, 2);
      if (j === 'd') st.double = true;
      if (j === 'g') { cur.st[1 - k].frozen = performance.now() + 3000; ctx.flash('rgba(76,201,240,.25)'); ctx.timeout(paintAll, 3050); }
      if (k === 0 && !jok[0].f && !jok[0].d && !jok[0].g) usedAll = true;
      paintAll();
    };
    const answer = (k, o) => {
      if (!cur || cur.done) return; const st = cur.st[k]; if (st.wrong || st.frozen > performance.now()) return;
      st.pick = o;
      if (o === cur.a) {
        cur.done = true; const sec = (performance.now() - cur.t0) / 1000; if (k === 0 && sec < 1.5) fastOk = true;
        const g = st.double ? 2 : 1; pts[k] += g; sfx.win(); vibrate([20, 30, 20]); ctx.flash(k === 0 ? 'rgba(76,201,240,.25)' : 'rgba(255,92,122,.25)');
        paintAll(); hud(); qi++; ctx.timeout(ask, 1800);
      } else {
        st.wrong = true; sfx.bad(); vibrate([40, 30, 40]); ctx.shake(4); paintAll();
        if (cur.st[0].wrong && cur.st[1].wrong) { cur.done = true; paintAll(); qi++; ctx.timeout(ask, 1800); }
      }
    };
    // Personne ne trouve en 15 s : question suivante
    ctx.interval(() => { if (cur && !cur.done && performance.now() - cur.t0 > 15000) { cur.done = true; paintAll(); qi++; ctx.timeout(ask, 1500); } }, 500);
    const finish = () => {
      cur = null; const w = pts[0] === pts[1] ? null : pts[0] > pts[1] ? 0 : 1;
      if (!bot) return ctx.end({ multi: true, win: true, emoji: '⚔️', display: `${pts[0]} – ${pts[1]}`, title: w == null ? 'Égalité parfaite !' : `${w === 0 ? '🔵 Bleu' : '🔴 Rouge'} remporte le duel !`, label: `${QN} questions` });
      const diff = Math.max(0, pts[0] - pts[1]);
      ctx.end({ score: diff, record: true, win: w === 0, emoji: w === 0 ? '🏆' : '🤖', display: `${pts[0]} – ${pts[1]}`, title: w === 0 ? (pts[1] === 0 ? 'Grand chelem !' : 'Plus rapide que l’ordi') : w == null ? 'Égalité avec la machine' : 'L’ordi a buzzé plus vite', label: `${QN} questions`, feats: [w === 0 && pts[1] === 0 && 'blanchi', w === 0 && usedAll && 'joker', fastOk && 'eclair'].filter(Boolean) });
    };
    hud(); ctx.timeout(ask, 600);
  },
};
