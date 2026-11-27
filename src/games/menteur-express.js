import { h } from '../core/dom.js';
import { sfx, vibrate } from '../core/sfx.js';
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
  ['Combien de temps passes-tu dans la salle de bain le matin ?', 'Combien de temps mets-tu pour aller au travail ou à l’école ?'],
  ['Quel est ton emoji préféré ?', 'Quel emoji utilises-tu pour être sarcastique ?'],
  ['Quel animal ferait le meilleur président ?', 'Quel animal aimerais-tu adopter ?'],
  ['Quelle est la meilleure garniture de pizza ?', 'Quel ingrédient détestes-tu le plus ?'],
  ['Où partirais-tu pour un week-end improvisé ?', 'Où as-tu passé tes dernières vacances ?'],
  ['Quel est le pire cadeau qu’on puisse offrir ?', 'Quel cadeau as-tu offert récemment ?'],
  ['Combien de fois par jour regardes-tu l’heure ?', 'Combien de verres d’eau bois-tu par jour ?'],
  ['Quel personnage de fiction épouserais-tu ?', 'Quel personnage de fiction te ressemble le plus ?'],
  ['Quelle est ta boisson préférée en soirée ?', 'Que bois-tu au petit-déjeuner ?'],
  ['Quel est le meilleur jour de la semaine ?', 'Quel jour fais-tu les courses ?'],
  ['Quel talent caché as-tu ?', 'Quel talent aurais-tu aimé avoir enfant ?'],
  ['Quelle appli ouvres-tu en premier le matin ?', 'Quelle appli devrais-tu supprimer ?'],
  ['Combien de bougies sur ton gâteau idéal ?', 'Combien de personnes inviterais-tu à ton mariage ?'],
  ['Quel est le meilleur bruit du monde ?', 'Quel bruit t’empêche de dormir ?'],
  ['Quelle est la chose la plus chère que tu aies achetée ?', 'Quelle est la chose la plus inutile que tu aies achetée ?'],
  ['Quel est ton plat de fête préféré ?', 'Quel plat ratais-tu toujours ?'],
  ['Quel est ton record de jours sans téléphone ?', 'Quel est ton record de jours sans sport ?'],
  ['Quel film regarderais-tu en boucle ?', 'Quel film as-tu détesté au cinéma ?'],
  ['Quelle odeur te rappelle ton enfance ?', 'Quelle odeur détestes-tu ?'],
  ['Si tu étais un dessert, lequel serais-tu ?', 'Quel dessert commandes-tu au restaurant ?'],
  ['Quel est ton mot préféré en français ?', 'Quel mot prononces-tu toujours mal ?'],
  ['Combien de minutes peux-tu rester sans parler ?', 'Combien de minutes faut-il pour cuire des pâtes ?'],
  ['Quelle époque aurais-tu aimé connaître ?', 'À quelle époque aurais-tu détesté vivre ?'],
  ['Quel instrument aimerais-tu maîtriser ?', 'Quel instrument te casse les oreilles ?'],
  ['Quel est le meilleur jeu de société ?', 'À quel jeu de société triches-tu ?'],
  ['Quelle est ta saison des fruits préférée ?', 'Quel mois de l’année préfères-tu ?'],
  ['Combien de selfies prends-tu par semaine ?', 'Combien de fois par semaine manges-tu des pâtes ?'],
  ['Quel est ton surnom secret ?', 'Quel surnom donnerais-tu à ton voisin de gauche ?'],
];

export default {
  async start(ctx) {
    const { stage } = ctx;
    const players = await playerSetup(stage, { min: 3, max: 8, title: 'Qui joue ?', cta: 'Distribuer les questions' });
    if (!ctx.alive) return;
    const rounds = Math.min(players.length, 5);
    players.forEach((p) => (p.pts = 0));
    const used = new Set(); const liars = ctx.rng.shuffle(players);
    const scene = h('div.center-stage'); ctx.stage.append(scene);
    const show = (...kids) => scene.replaceChildren(h('div.card', ...kids.filter(Boolean)));
    const board = () => h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'center' } }, [...players].sort((a, b) => b.pts - a.pts).map((p) => h('span.chip', { style: { borderColor: p.color } }, `${p.emoji} ${p.name} · ${p.pts}`)));
    for (let r = 0; r < rounds && ctx.alive; r++) {
      ctx.hud({ round: `Manche ${r + 1}/${rounds}` });
      let pair; do pair = ctx.rng.pick(PAIRS); while (used.has(pair[0])); used.add(pair[0]);
      const [truth, lie] = pair; const liar = liars[r % liars.length];
      for (const p of players) {
        await new Promise((res) => show(h('div.tile', { style: { background: p.color } }, p.emoji), h('h2', `Passe le téléphone à ${p.name}`), h('p.muted', 'Les autres ne regardent pas l’écran 🙈'), h('button.btn.btn-primary.btn-lg.btn-block', { onclick: res }, `Je suis ${p.name}, voir ma question`)));
        if (!ctx.alive) return; sfx.tap();
        await new Promise((res) => show(h('p.faint', 'Ta question secrète'), h('h2', { style: { fontSize: 'clamp(22px,5vw,30px)', lineHeight: 1.25 } }, p === liar ? lie : truth), h('p.muted', 'Retiens-la. Tu répondras à voix haute, sans répéter la question.'), h('button.btn.btn-lg.btn-block', { onclick: res }, 'C’est bon, cacher')));
        if (!ctx.alive) return;
      }
      let left = 90; const timer = h('div.big-msg.mono', '1:30');
      await new Promise((res) => {
        show(h('div.tile', '🗣️'), h('h2', 'Répondez chacun à voix haute'), h('p.muted', 'Puis révélez la question de la majorité. Qui a répondu à côté ? Le menteur, lui, doit improviser.'),
          h('details', { style: { textAlign: 'left' } }, h('summary', { style: { cursor: 'pointer', fontWeight: 700 } }, 'Révéler la question de la majorité'), h('p', { style: { marginTop: '10px', fontSize: '20px', fontWeight: 700 } }, truth)),
          timer, h('button.btn.btn-primary.btn-lg.btn-block', { onclick: res }, 'Passer au vote'));
        const id = setInterval(() => { if (!ctx.alive) return clearInterval(id); left--; timer.textContent = `${Math.floor(Math.max(0, left) / 60)}:${String(Math.max(0, left) % 60).padStart(2, '0')}`; if (left <= 10 && left > 0) sfx.tick(); if (left === 0) { sfx.bad(); clearInterval(id); res(); } }, 1000);
        ctx.onCleanup(() => clearInterval(id));
      });
      if (!ctx.alive) return;
      const pick = await new Promise((res) => show(h('h2', 'Qui est le menteur ?'), h('p.muted', 'Mettez-vous d’accord, puis touchez le suspect.'),
        h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(120px,1fr))', gap: '10px' } },
          players.map((p) => h('button.btn.btn-lg', { style: { borderColor: p.color, flexDirection: 'column', height: 'auto', padding: '14px', whiteSpace: 'normal' }, onclick: () => res(p) }, h('span', { style: { fontSize: '30px' } }, p.emoji), p.name)))));
      if (!ctx.alive) return;
      const caught = pick === liar;
      if (caught) players.forEach((p) => { if (p !== liar) p.pts += 1; }); else liar.pts += 3;
      caught ? sfx.win() : sfx.boom(); vibrate(caught ? 30 : [50, 40, 50]);
      await new Promise((res) => show(h('div.tile', caught ? '🕵️' : '🤥'), h('h2', caught ? `${liar.name} démasqué·e !` : `${liar.name} vous a bien eus !`),
        h('p.muted', `Sa question était : « ${lie} »`), h('p', caught ? '+1 point pour chaque détective' : '+3 points pour le menteur'), board(),
        h('button.btn.btn-primary.btn-lg.btn-block', { onclick: res }, r < rounds - 1 ? 'Manche suivante' : 'Résultats')));
    }
    if (!ctx.alive) return;
    const top = [...players].sort((a, b) => b.pts - a.pts)[0];
    ctx.end({ multi: true, emoji: '🏆', display: top.emoji, title: `${top.name} gagne avec ${top.pts} pts !`, label: `${rounds} manches de mensonges`, win: true, extra: board() });
  },
};
