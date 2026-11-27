import { h } from '../core/dom.js';
import { sfx, vibrate } from '../core/sfx.js';
import { playerSetup } from '../core/players.js';
import { passTo, scoreTable } from './kit.js';

const Q = [
  ['Vacances idéales ?', ['🏖️ Plage', '🏔️ Montagne']], ['Petit-déj ?', ['🥐 Sucré', '🍳 Salé']], ['Super-pouvoir ?', ['🕊️ Voler', '👻 Invisible', '⏱️ Arrêter le temps']],
  ['Plutôt…', ['🐶 Chien', '🐱 Chat']], ['Le meilleur moment de la journée ?', ['🌅 Matin', '☀️ Après-midi', '🌙 Soir', '🌌 Nuit']], ['Pizza ananas ?', ['🍍 Oui !', '🚫 Jamais']],
  ['Film du dimanche soir ?', ['😂 Comédie', '😱 Horreur', '💥 Action', '💘 Romance']], ['Tu préfères…', ['📚 Lire le livre', '🎬 Voir le film']], ['Saison préférée ?', ['🌸 Printemps', '☀️ Été', '🍂 Automne', '❄️ Hiver']],
  ['Glace : ', ['🍫 Chocolat', '🍓 Fraise', '🍦 Vanille', '🍋 Citron']], ['Plutôt fête…', ['🏠 À la maison', '🪩 En boîte']], ['La fondue, c’est…', ['🧀 Moitié-moitié', '🫕 Vacherin', '🍅 Tomate']],
  ['Voyager dans…', ['⏪ Le passé', '⏩ Le futur']], ['Dormir avec…', ['🪟 Fenêtre ouverte', '🔒 Fenêtre fermée']], ['Les chaussettes au lit ?', ['🧦 Oui', '🦶 Non']],
  ['Ton animal de jungle ?', ['🦁 Lion', '🐘 Éléphant', '🐒 Singe', '🐍 Serpent']], ['Chocolat…', ['🍫 Noir', '🥛 Au lait', '🤍 Blanc']], ['Pour se déplacer en ville ?', ['🚲 Vélo', '🚶 À pied', '🚌 Bus', '🚗 Voiture']],
  ['Plutôt…', ['🎤 Karaoké', '🎲 Jeux de société']], ['Si tu gagnes au loto…', ['🏝️ Je pars', '💼 Je continue à bosser']], ['Les frites avec…', ['🍅 Ketchup', '🥚 Mayo', '🧂 Rien']],
  ['Mieux vaut être…', ['🧠 Très intelligent', '😄 Très drôle']], ['Ton sport à regarder ?', ['⚽ Foot', '🎾 Tennis', '⛷️ Ski', '🏒 Hockey']], ['Plutôt…', ['☕ Café', '🍵 Thé', '🧃 Ni l’un ni l’autre']],
  ['Le plus effrayant ?', ['🕷️ Araignées', '🐍 Serpents', '🤡 Clowns', '🌊 Requins']], ['On t’offre…', ['🎁 Une surprise', '📝 Ce qui est sur ta liste']], ['Plutôt…', ['🌧️ Pluie dehors, cocon dedans', '☀️ Grand soleil']],
  ['Tes vacances…', ['🗺️ Tout prévu', '🎒 À l’improviste']], ['Le meilleur repas ?', ['🍕 Pizza', '🍔 Burger', '🍣 Sushi', '🍝 Pâtes']], ['Plutôt…', ['📱 Message', '📞 Appel']],
  ['Dans un groupe tu es…', ['🗣️ Je parle', '👂 J’écoute']], ['Ta maison de rêve ?', ['🏰 Château', '🌲 Cabane', '🏙️ Loft en ville', '⛵ Bateau']], ['Superhéros ou méchant ?', ['🦸 Héros', '🦹 Méchant']],
  ['Douche…', ['🌅 Le matin', '🌙 Le soir']], ['Plutôt…', ['🎢 Montagnes russes', '🎠 Manège tranquille']], ['Ton dessert ?', ['🍰 Gâteau', '🍨 Glace', '🍎 Fruit', '🧀 Fromage']],
];
const ROUNDS = 8;

export default {
  async start(ctx) {
    const minority = ctx.mode === 'minorite', R = ctx.rng;
    const players = await playerSetup(ctx.stage, { min: 3, max: 10, title: 'Qui vote ?', cta: 'Aux urnes 🗳️' }); if (!ctx.alive) return;
    players.forEach((p) => (p.pts = 0));
    const scene = h('div.center-stage', { style: { gap: '14px' } }); ctx.stage.append(scene);
    const qs = R.shuffle(Q).slice(0, ROUNDS);
    let solo = 0;
    for (let r = 0; r < ROUNDS && ctx.alive; r++) {
      const [q, opts] = qs[r];
      ctx.hud({ round: `${r + 1}/${ROUNDS}` });
      const votes = new Map();
      for (const p of players) {
        await passTo(scene, p, 'Vote en secret 🤫'); if (!ctx.alive) return;
        const v = await new Promise((res) => scene.replaceChildren(
          h('div.faint', `${p.emoji} ${p.name} · Question ${r + 1}/${ROUNDS}`), h('div.big-msg', { style: { fontSize: 'clamp(22px,6vw,32px)', textAlign: 'center' } }, q),
          h('p.muted', minority ? 'Gagne avec le plus petit groupe… mais pas seul !' : 'Gagne en votant comme la majorité'),
          h('div', { style: { display: 'grid', gap: '8px', width: 'min(92vw,420px)' } }, opts.map((o, i) => h('button.btn.btn-lg', { style: { minHeight: '58px', fontSize: '19px' }, onclick: () => { sfx.pop(); vibrate(8); res(i); } }, o)))));
        if (!ctx.alive) return;
        votes.set(p, v);
      }
      // Dépouillement
      const counts = opts.map((_, i) => [...votes.values()].filter((v) => v === i).length);
      const nonEmpty = counts.filter((c) => c > 0);
      let winSize = null;
      if (minority) { const ok = nonEmpty.filter((c) => c >= 2); winSize = ok.length ? Math.min(...ok) : null; }
      else { const mx = Math.max(...counts); winSize = counts.filter((c) => c === mx).length === nonEmpty.length && nonEmpty.length > 1 ? null : mx; }
      const winners = players.filter((p) => winSize != null && counts[votes.get(p)] === winSize);
      winners.forEach((p) => p.pts++);
      if (minority && winners.length === 2) solo++;
      sfx.win(); if (winners.length) ctx.flash('rgba(61,220,151,.2)');
      const max = Math.max(...counts, 1);
      await new Promise((res) => {
        const bars = opts.map((o, i) => {
          const win = winSize != null && counts[i] === winSize;
          const fill = h('i', { style: { position: 'absolute', inset: 0, width: '0%', background: win ? 'linear-gradient(90deg,#3ddc97,#00c2ff)' : 'rgba(255,255,255,.12)', borderRadius: '12px', transition: 'width .8s cubic-bezier(.3,1.3,.5,1)' } });
          ctx.timeout(() => (fill.style.width = `${(counts[i] / max) * 100}%`), 80 + i * 150);
          const who = players.filter((p) => votes.get(p) === i).map((p) => p.emoji).join(' ');
          return h('div', { style: { position: 'relative', padding: '10px 14px', borderRadius: '12px', background: 'rgba(255,255,255,.04)', overflow: 'hidden' } }, fill,
            h('div', { style: { position: 'relative', display: 'flex', justifyContent: 'space-between', gap: '8px', fontWeight: 800 } }, h('span', o), h('span', `${counts[i]}`)),
            h('div', { style: { position: 'relative', fontSize: '18px', minHeight: '22px' } }, who));
        });
        scene.replaceChildren(h('div.faint', `Question ${r + 1}/${ROUNDS}`), h('div.big-msg', { style: { fontSize: '24px', textAlign: 'center' } }, q),
          h('div', { style: { display: 'grid', gap: '8px', width: 'min(92vw,440px)' } }, bars),
          h('div', { style: { fontWeight: 800, fontSize: '18px', color: winners.length ? 'var(--ok)' : 'var(--warn)', textAlign: 'center' } }, winners.length ? `+1 pour ${winners.map((p) => p.emoji + ' ' + p.name).join(', ')}` : minority ? 'Personne : aucun petit groupe d’au moins 2' : 'Égalité parfaite : personne ne marque'),
          scoreTable(players),
          h('button.btn.btn-primary.btn-lg', { onclick: res }, r < ROUNDS - 1 ? 'Question suivante' : 'Résultats'));
      });
    }
    if (!ctx.alive) return;
    const best = Math.max(...players.map((p) => p.pts)); const tops = players.filter((p) => p.pts === best);
    ctx.end({ multi: true, win: true, emoji: '🗳️', display: tops.map((p) => p.emoji).join(' '), title: tops.length > 1 ? `Égalité : ${tops.map((p) => p.name).join(' & ')}` : minority ? `${tops[0].name}, l’original !` : `${tops[0].name} pense comme tout le monde !`, label: `${ROUNDS} questions · mode ${minority ? 'Minorité' : 'Majorité'}${solo ? ` · ${solo} duo${solo > 1 ? 's' : ''} gagnant${solo > 1 ? 's' : ''}` : ''}`, extra: scoreTable(players) });
  },
};
