import { h } from '../core/dom.js';
import { sfx, vibrate } from '../core/sfx.js';
import { rng } from '../core/rng.js';
import { playerSetup } from '../core/players.js';

// [question de tous, question de l'intrus] : les réponses doivent pouvoir se ressembler
const PAIRS = [
  ['Combien d’heures dors-tu par nuit ?', 'Combien d’heures passes-tu sur ton téléphone par jour ?'],
  ['Quel animal aimerais-tu être ?', 'Quel animal te fait le plus peur ?'],
  ['Quel est ton plat préféré ?', 'Quel plat sais-tu cuisiner ?'],
  ['À quel âge as-tu eu ton premier téléphone ?', 'À quel âge aimerais-tu prendre ta retraite ?'],
  ['Dans quel pays rêves-tu de voyager ?', 'Dans quel pays ne voudrais-tu jamais vivre ?'],
  ['Combien de cafés bois-tu par semaine ?', 'Combien de fois par semaine fais-tu du sport ?'],
  ['Quel super-pouvoir voudrais-tu ?', 'Quel talent aimerais-tu avoir ?'],
  ['Quelle célébrité inviterais-tu à dîner ?', 'Quelle célébrité t’énerve le plus ?'],
  ['Quel est le meilleur film de tous les temps ?', 'Quel film t’a fait pleurer ?'],
  ['Quelle couleur représente ton humeur aujourd’hui ?', 'Quelle est la couleur de ta brosse à dents ?'],
  ['Combien de paires de chaussures as-tu ?', 'Combien de pays as-tu visités ?'],
  ['Quel objet emporterais-tu sur une île déserte ?', 'Quel objet as-tu perdu récemment ?'],
  ['Quelle est la meilleure saison ?', 'Quelle saison te rend grognon ?'],
  ['Quel métier faisais-tu rêver enfant ?', 'Quel métier ne ferais-tu pour rien au monde ?'],
  ['Quel fruit est le plus délicieux ?', 'Quel fruit est le plus difficile à manger ?'],
  ['Combien de temps peux-tu tenir sans sucre ?', 'Combien de temps peux-tu retenir ta respiration ?'],
  ['Quel est le meilleur dessin animé ?', 'Quel dessin animé regardais-tu en cachette ?'],
  ['Quel sport regarderais-tu à la télé ?', 'Quel sport serais-tu nul à pratiquer ?'],
  ['À quelle heure te lèves-tu le week-end ?', 'À quelle heure manges-tu le soir ?'],
  ['Quel est le pire légume ?', 'Quel légume pousse dans ton jardin idéal ?'],
  ['Quelle chanson chantes-tu sous la douche ?', 'Quelle chanson te reste toujours dans la tête ?'],
  ['Combien de personnes étaient à ton dernier anniversaire ?', 'Combien de contacts as-tu vraiment appelés ce mois-ci ?'],
];

export default {
  async start(ctx) {
    const { stage } = ctx;
    const players = await playerSetup(stage, { min: 3, max: 8, title: 'Qui joue ?', cta: 'Distribuer les questions' });
    if (!ctx.alive) return;
    const [truth, lie] = rng.pick(PAIRS);
    const liar = rng.pick(players);
    const scene = h('div.center-stage'); stage.append(scene);
    const show = (...kids) => scene.replaceChildren(h('div.card', ...kids));

    for (const p of players) {
      await new Promise((res) => show(
        h('div.tile', { style: { background: p.color } }, p.emoji),
        h('h2', `Passe le téléphone à ${p.name}`), h('p.muted', 'Les autres ne regardent pas l’écran 🙈'),
        h('button.btn.btn-primary.btn-lg.btn-block', { onclick: res }, `Je suis ${p.name}, voir ma question`)));
      if (!ctx.alive) return;
      sfx.tap();
      await new Promise((res) => show(
        h('p.faint', 'Ta question secrète'), h('h2', { style: { fontSize: 'clamp(22px,5vw,30px)', lineHeight: 1.25 } }, p === liar ? lie : truth),
        h('p.muted', 'Retiens-la, tu répondras à voix haute.'),
        h('button.btn.btn-lg.btn-block', { onclick: res }, 'C’est bon, cacher')));
      if (!ctx.alive) return;
    }
    // Débat
    let left = 90;
    const timer = h('div.big-msg.mono', '1:30');
    const debate = new Promise((res) => {
      show(h('div.tile', '🗣️'), h('h2', 'Répondez chacun à voix haute'),
        h('p.muted', 'Puis on révèle la vraie question. Qui a répondu à côté ?'),
        h('details', { style: { textAlign: 'left' } }, h('summary', { style: { cursor: 'pointer', fontWeight: 700 } }, 'Révéler la question de la majorité'), h('p', { style: { marginTop: '10px', fontSize: '20px', fontWeight: 700 } }, truth)),
        timer, h('button.btn.btn-primary.btn-lg.btn-block', { onclick: res }, 'Passer au vote'));
      ctx.interval(() => { left--; timer.textContent = `${Math.floor(Math.max(0, left) / 60)}:${String(Math.max(0, left) % 60).padStart(2, '0')}`; if (left <= 10 && left > 0) sfx.tick(); if (left === 0) { sfx.bad(); res(); } }, 1000);
    });
    await debate;
    if (!ctx.alive) return;
    // Vote collectif
    const pick = await new Promise((res) => show(h('h2', 'Qui est le menteur ?'), h('p.muted', 'Mettez-vous d’accord, puis touchez le suspect.'),
      h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(130px,1fr))', gap: '10px' } },
        players.map((p) => h('button.btn.btn-lg', { style: { borderColor: p.color, flexDirection: 'column', height: 'auto', padding: '14px', whiteSpace: 'normal' }, onclick: () => res(p) }, h('span', { style: { fontSize: '30px' } }, p.emoji), p.name)))));
    if (!ctx.alive) return;
    const caught = pick === liar; vibrate(caught ? 30 : [50, 40, 50]);
    ctx.end({
      emoji: caught ? '🕵️' : '🤥', display: liar.name, title: caught ? 'Menteur démasqué !' : 'Le menteur s’en sort !',
      label: `Le menteur avait : « ${lie} »`, win: true,
      extra: h('p.muted', caught ? `Bien joué l’équipe. ${liar.name} n’a pas su bluffer.` : `${pick.name} était innocent·e. ${liar.name} remporte la manche.`),
    });
  },
};
