import { h } from '../core/dom.js';
import { sfx, vibrate } from '../core/sfx.js';
import { makeRng, todayKey } from '../core/rng.js';

// [affirmation, vrai ?, explication]
const FACTS = [
  ['Les pieuvres ont trois cœurs.', true, 'Deux cœurs pompent le sang vers les branchies, le troisième vers le reste du corps.'],
  ['Le miel peut se conserver des milliers d’années.', true, 'Des pots de miel encore comestibles ont été retrouvés dans des tombes égyptiennes.'],
  ['Les bananes sont très légèrement radioactives.', true, 'À cause du potassium 40 qu’elles contiennent. Aucun danger, rassure-toi.'],
  ['Un éclair est plus chaud que la surface du Soleil.', true, 'Environ 30 000 °C pour l’éclair, contre environ 5 500 °C à la surface du Soleil.'],
  ['Les flamants roses doivent leur couleur à ce qu’ils mangent.', true, 'Les pigments des petites crevettes et algues qu’ils mangent les colorent.'],
  ['La tour Eiffel peut grandir d’une dizaine de centimètres en été.', true, 'Le métal se dilate avec la chaleur.'],
  ['Les koalas ont des empreintes digitales très proches des nôtres.', true, 'Au point qu’on peut les confondre au microscope.'],
  ['Le cœur d’une crevette se trouve dans sa tête.', true, 'Ses organes vitaux sont regroupés dans la partie avant de son corps.'],
  ['Les loutres de mer se tiennent par la patte en dormant.', true, 'Pour ne pas dériver chacune de son côté.'],
  ['Sur Vénus, un jour dure plus longtemps qu’une année.', true, 'Vénus tourne très lentement sur elle-même : 243 jours terrestres pour un tour, contre 225 pour faire le tour du Soleil.'],
  ['Les requins existaient avant les arbres.', true, 'Les premiers requins ont plus de 400 millions d’années, les premiers arbres environ 385 millions.'],
  ['Cléopâtre a vécu plus près de notre époque que de la construction de la grande pyramide de Gizeh.', true, 'La pyramide a été bâtie environ 2500 ans avant Cléopâtre, qui a vécu il y a environ 2050 ans.'],
  ['Le chocolat blanc contient du beurre de cacao.', true, 'Il ne contient pas de poudre de cacao, mais bien du beurre de cacao.'],
  ['Une girafe a le même nombre de vertèbres dans le cou qu’un humain.', true, 'Sept, comme nous. Les siennes sont juste beaucoup plus longues.'],
  ['Les escargots ont des milliers de dents.', true, 'Minuscules, alignées sur une sorte de langue râpeuse.'],
  ['Une année sur Mercure dure 88 jours terrestres.', true, 'C’est la planète la plus proche du Soleil, elle en fait le tour très vite.'],
  ['Le diamant est fait de carbone, comme le charbon.', true, 'Même élément, mais des atomes organisés autrement.'],
  ['Le son va plus vite dans l’eau que dans l’air.', true, 'Environ 4 fois plus vite.'],
  ['Les dauphins dorment avec la moitié du cerveau éveillée.', true, 'Ils gardent souvent un œil ouvert pour respirer et surveiller.'],
  ['Botaniquement, la banane est une baie, mais pas la fraise.', true, 'Les « graines » de la fraise sont en fait ses vrais fruits.'],
  ['Le Rhône prend sa source en Suisse.', true, 'Au glacier du Rhône, dans le Valais.'],
  ['Il y a plus d’arbres sur Terre que d’étoiles dans la Voie lactée.', true, 'Environ 3000 milliards d’arbres, contre quelques centaines de milliards d’étoiles.'],
  ['Un petit nuage peut peser plusieurs centaines de tonnes.', true, 'Toute cette eau en gouttelettes flotte grâce aux courants d’air.'],
  ['Les lapins mangent une partie de leurs crottes.', true, 'Des crottes molles spéciales, pleines de nutriments qu’ils digèrent une seconde fois.'],
  ['Certaines tortues peuvent respirer par le derrière.', true, 'Quelques espèces absorbent l’oxygène de l’eau par leur cloaque pendant l’hiver.'],
  ['Les abeilles peuvent apprendre à reconnaître des visages humains.', true, 'Des expériences l’ont montré, avec une récompense sucrée à la clé.'],
  ['Le mont Blanc se trouve entièrement en Suisse.', false, 'Il est à la frontière entre la France et l’Italie.'],
  ['Un poisson rouge a une mémoire de trois secondes.', false, 'Il peut se souvenir de choses pendant des mois.'],
  ['On n’utilise que 10 % de notre cerveau.', false, 'L’imagerie montre que tout le cerveau travaille, pas en même temps.'],
  ['La Grande Muraille de Chine se voit à l’œil nu depuis la Lune.', false, 'Elle est bien trop étroite. Même depuis l’orbite basse, c’est très difficile.'],
  ['Les chauves-souris sont aveugles.', false, 'Elles voient, et beaucoup utilisent en plus l’écholocation.'],
  ['Les autruches cachent leur tête dans le sable quand elles ont peur.', false, 'Elles s’aplatissent au sol ou s’enfuient (très vite).'],
  ['Napoléon était particulièrement petit.', false, 'Environ 1,69 m, une taille normale pour son époque.'],
  ['Le sang est bleu dans les veines.', false, 'Il est toujours rouge, plus foncé dans les veines. Les veines paraissent bleues à travers la peau.'],
  ['Les taureaux s’énervent à cause de la couleur rouge.', false, 'Ils voient mal le rouge : c’est le mouvement de la cape qui les provoque.'],
  ['La foudre ne tombe jamais deux fois au même endroit.', false, 'Les grands bâtiments sont frappés des dizaines de fois par an.'],
  ['La tomate est un légume au sens botanique.', false, 'C’est un fruit : elle contient les graines de la plante.'],
  ['Le caméléon change surtout de couleur pour se camoufler.', false, 'Il change surtout pour communiquer et gérer sa température.'],
  ['La Constitution suisse désigne Berne comme capitale.', false, 'Elle ne nomme aucune capitale. Berne est la « ville fédérale ».'],
  ['L’éléphant est le seul animal qui ne peut pas sauter.', false, 'Il ne saute pas, mais d’autres non plus, comme l’hippopotame ou le paresseux.'],
  ['Les pingouins vivent en Antarctique.', false, 'Ce sont les manchots ! Les pingouins vivent dans l’hémisphère Nord.'],
  ['L’Everest est le sommet le plus éloigné du centre de la Terre.', false, 'C’est le Chimborazo en Équateur, grâce au renflement de la Terre à l’équateur.'],
  ['Les ongles continuent de pousser après la mort.', false, 'C’est la peau qui se rétracte et donne cette impression.'],
  ['Le cri du canard ne fait pas d’écho.', false, 'Il en fait un, simplement difficile à remarquer.'],
  ['Le verre est un liquide qui coule très lentement.', false, 'C’est un solide amorphe. Les vieux vitraux plus épais en bas ont été fabriqués comme ça.'],
  ['Les humains ont seulement cinq sens… et c’est prouvé.', false, 'On compte aussi l’équilibre, la température, la douleur, la position du corps…'],
  ['Les vaches dorment debout.', false, 'Elles peuvent somnoler debout, mais pour dormir profondément, elles se couchent.'],
  ['Le dromadaire stocke de l’eau dans sa bosse.', false, 'Sa bosse est surtout une réserve de graisse.'],
];
const QN = 12, TIME = 8;

export default {
  start(ctx) {
    const mode = ctx.mode || 'solo', duel = mode === 'duel';
    const R = mode === 'jour' ? makeRng('vraifake-' + todayKey()) : ctx.rng;
    const qs = R.shuffle(FACTS).slice(0, QN);
    let i = 0, score = 0, lives = 3, streak = 0, best = 0, good = 0, fast = 0, t0 = 0, cur = null;
    const dp = [0, 0];
    const card = h('div', { style: { width: 'min(88vw,420px)', minHeight: '170px', padding: '22px', borderRadius: '24px', background: 'linear-gradient(160deg,#fff,#e4e0ff)', color: '#1b1450', fontSize: 'clamp(18px,5vw,22px)', fontWeight: 800, display: 'grid', placeItems: 'center', textAlign: 'center', boxShadow: '0 18px 40px rgba(0,0,0,.35)', touchAction: 'none' } });
    const expl = h('div', { style: { minHeight: '64px', maxWidth: '420px', textAlign: 'center', fontSize: '15px' } });
    const bar = h('div.bar', { style: { width: 'min(88vw,420px)' } }, h('i'));
    const head = h('div.faint', { style: { fontSize: '12px', fontWeight: 700, letterSpacing: '.1em' } });
    const pair = (k) => h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', width: 'min(88vw,420px)', transform: k === 1 ? 'rotate(180deg)' : '' } },
      h('button.btn.btn-lg', { style: { background: 'rgba(255,61,90,.25)', fontWeight: 900 }, onpointerdown: (e) => { e.preventDefault(); answer(false, k); } }, '❌ Fake'),
      h('button.btn.btn-lg', { style: { background: 'rgba(61,220,151,.25)', fontWeight: 900 }, onpointerdown: (e) => { e.preventDefault(); answer(true, k); } }, '✅ Vrai'));
    const topLabel = h('div.faint', { style: { transform: 'rotate(180deg)', fontWeight: 800 } });
    ctx.stage.append(h('div.center-stage', { style: { gap: '12px' } }, duel ? pair(1) : '', duel ? topLabel : '', head, card, bar, expl, pair(0)));
    const hud = () => duel ? ctx.hud({ score: `🔵 ${dp[0]} – ${dp[1]} 🔴` }) : ctx.hud({ pts: `${score} pts`, lives: '❤️'.repeat(lives) + '🖤'.repeat(3 - lives), streak: streak >= 3 ? `🔥 ${streak}` : null });
    // Glisser la carte (solo)
    let sx = null;
    card.addEventListener('pointerdown', (e) => (sx = e.clientX));
    card.addEventListener('pointerup', (e) => { if (sx == null) return; const dx = e.clientX - sx; sx = null; if (Math.abs(dx) > 50 && !duel) answer(dx > 0, 0); });
    ctx.on(window, 'keydown', (e) => { if (e.key === 'ArrowRight') answer(true, 0); if (e.key === 'ArrowLeft') answer(false, 0); });

    const ask = () => {
      if (i >= QN || (!duel && lives <= 0)) return finish();
      const [txt, truth, why] = qs[i];
      cur = { truth, why, ans: [null, null], at: [0, 0], done: false };
      head.textContent = `ANECDOTE ${i + 1}/${QN}`; card.textContent = txt; card.style.transform = ''; card.style.opacity = 1; expl.textContent = duel ? '' : 'Glisse à droite = vrai, à gauche = fake';
      expl.style.color = ''; card.animate([{ transform: 'scale(.85) rotate(-3deg)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 250, easing: 'cubic-bezier(.3,1.5,.5,1)' });
      if (duel) topLabel.textContent = 'Les deux répondent : le plus rapide qui a juste marque 2';
      t0 = performance.now(); hud();
    };
    const answer = (v, k) => {
      if (!cur || cur.done || cur.ans[k] != null) return;
      cur.ans[k] = v; cur.at[k] = performance.now() - t0; vibrate(6);
      if (!duel || (cur.ans[0] != null && cur.ans[1] != null)) reveal();
    };
    const reveal = () => {
      cur.done = true; const sec = (performance.now() - t0) / 1000;
      card.style.transition = 'transform .3s, opacity .3s'; card.style.transform = `translateX(${cur.truth ? 40 : -40}px) rotate(${cur.truth ? 6 : -6}deg)`;
      expl.replaceChildren(h('b', { style: { color: cur.truth ? 'var(--ok)' : 'var(--bad)', fontSize: '18px' } }, cur.truth ? '✅ VRAI' : '❌ FAKE'), h('div', cur.why));
      if (duel) {
        const right = [0, 1].filter((k) => cur.ans[k] === cur.truth).sort((a, b) => cur.at[a] - cur.at[b]);
        right.forEach((k, j) => (dp[k] += j === 0 ? 2 : 1)); right.length ? sfx.ok() : sfx.bad();
      } else if (cur.ans[0] === cur.truth) {
        good++; streak++; best = Math.max(best, streak); if (sec < 2) fast++;
        const p = Math.round((100 + Math.max(0, (1 - sec / TIME) * 50)) * (1 + Math.min(5, streak - 1) * 0.1)); score += p;
        sfx.ok(); ctx.pop(`+${p}`, ctx.stage.clientWidth / 2, ctx.stage.clientHeight * 0.25, '#3ddc97', 26); if (streak % 5 === 0) ctx.flash('rgba(61,220,151,.2)');
      } else { streak = 0; lives--; sfx.bad(); ctx.shake(5); vibrate([30, 30, 30]); }
      hud(); i++; ctx.timeout(ask, 2600);
    };
    ctx.interval(() => {
      if (!cur || cur.done) return;
      const k = 1 - (performance.now() - t0) / 1000 / TIME; bar.firstChild.style.width = `${Math.max(0, k) * 100}%`;
      if (k <= 0) { if (!duel) cur.ans[0] = null; reveal(); }
    }, 50);
    const finish = () => {
      cur = null;
      if (duel) { const w = dp[0] === dp[1] ? null : dp[0] > dp[1] ? 0 : 1; return ctx.end({ multi: true, win: true, emoji: '🤔', display: `${dp[0]} – ${dp[1]}`, title: w == null ? 'Égalité parfaite !' : `${w === 0 ? '🔵 Bas' : '🔴 Haut'} flaire les fakes !`, label: `${QN} anecdotes` }); }
      ctx.end({
        score, display: `${score} pts`, emoji: '🤔', board: mode === 'jour' ? 'jour' : null,
        title: good === QN ? 'Détecteur de fake' : score >= 1200 ? 'Esprit critique affûté' : score >= 600 ? 'Pas facile à berner' : 'Les fakes t’ont eu',
        label: `${good}/${QN} · meilleure série ${best}`,
        feats: [good === QN && 'parfait', fast >= 5 && 'eclair', best >= 8 && 'serie'].filter(Boolean),
      });
    };
    ctx.countdown().then(() => ctx.alive && ask());
  },
};
