import { h } from '../core/dom.js';
import { sfx, vibrate } from '../core/sfx.js';
import { playerSetup } from '../core/players.js';

const THEMES = {
  classic: ['Un fruit', 'Un pays', 'Un animal de la ferme', 'Un métier', 'Une marque de voiture', 'Un sport', 'Un instrument de musique', 'Un légume', 'Un super-héros', 'Une couleur', 'Un mot qui finit par « -tion »', 'Une capitale', 'Un dessert', 'Un prénom en M', 'Un objet de la cuisine', 'Un animal marin', 'Un film Disney', 'Une ville suisse', 'Un fromage', 'Un vêtement', 'Un moyen de transport', 'Un mot de 3 lettres', 'Une boisson', 'Une partie du corps', 'Un jeu de société', 'Un insecte', 'Un chanteur ou une chanteuse', 'Une fleur',
    'Une marque de téléphone', 'Un pays d’Afrique', 'Un oiseau', 'Un plat italien', 'Un sport d’hiver', 'Un personnage de dessin animé', 'Une application sur ton téléphone', 'Un mot anglais utilisé en français', 'Un objet dans une salle de bain', 'Une série télé', 'Un arbre', 'Un mot qui rime avec « bateau »', 'Une émotion', 'Un jeu vidéo', 'Un métal', 'Un mot de plus de 10 lettres', 'Un dinosaure', 'Une planète ou une étoile', 'Une épice', 'Un monument célèbre', 'Une langue', 'Quelque chose de rond', 'Quelque chose qui colle', 'Quelque chose qu’on trouve à la plage', 'Un club de foot', 'Un outil', 'Un mot qui commence par « super »', 'Un chiffre en toutes lettres'],
  enfants: ['Un animal', 'Une couleur', 'Un fruit', 'Un jouet', 'Un dessin animé', 'Un objet de l’école', 'Un animal qui vole', 'Quelque chose de rouge', 'Un prénom', 'Un aliment du petit-déjeuner', 'Un vêtement', 'Un animal de la jungle', 'Un véhicule', 'Quelque chose de froid', 'Une pièce de la maison', 'Un métier', 'Un sport', 'Un bonbon ou un gâteau', 'Quelque chose de jaune', 'Un animal de la ferme', 'Un personnage de conte', 'Un instrument de musique', 'Quelque chose qui fait du bruit', 'Un légume'],
  lettre: ['Un animal', 'Un prénom', 'Un pays ou une ville', 'Un objet', 'Un aliment', 'Un métier', 'Un verbe', 'Un mot de plus de 6 lettres', 'Une marque', 'Un mot qui se mange', 'Un vêtement ou accessoire', 'N’importe quel mot'],
};
const LETTERS = 'ABCDEFGHIJLMNOPRSTV';
const LIVES = 2;

export default {
  async start(ctx) {
    const R = ctx.rng, mode = ctx.mode || 'classic';
    const players = await playerSetup(ctx.stage, { min: 2, max: 8, title: 'Qui joue ?', cta: 'Allumer la mèche 🔥' });
    if (!ctx.alive) return;
    players.forEach((p) => Object.assign(p, { lives: LIVES, passes: 0, held: 0, out: 0 }));
    let cur = R.int(0, players.length - 1), dir = 1, ti = 0, roundN = 0, outOrder = 0, longest = 0, fastest = Infinity;
    const themes = R.shuffle(THEMES[mode] || THEMES.classic);
    const scene = h('div.center-stage', { style: { gap: '14px' } }); ctx.stage.append(scene);
    const nextAlive = (i) => { let j = i; do j = (j + dir + players.length) % players.length; while (players[j].lives <= 0); return j; };
    const newTheme = () => { const t = themes[ti++ % themes.length]; return mode === 'lettre' ? `${t} en ${R.pick(LETTERS)}` : t; };

    const roundLoop = async () => {
      while (ctx.alive) {
        roundN++;
        let theme = newTheme();
        const fuse = R.float(mode === 'enfants' ? 16 : 11, mode === 'enfants' ? 34 : 30) * 1000;
        // Événements surprises pendant la manche (à partir de la 2e)
        const events = roundN < 2 ? [] : R.shuffle(['sens', 'theme', 'collante', 'sens']).slice(0, R.int(1, 2)).map((k) => ({ k, at: R.float(0.25, 0.8) * fuse, done: false }));
        const start = performance.now(); let exploded = false, tickT = 0, sticky = 0, holdT = start;
        const who = h('div.big-msg'), themeEl = h('div', { style: { fontSize: 'clamp(24px,6vw,38px)', fontWeight: 800, padding: '10px 22px', borderRadius: '18px', background: 'rgba(255,255,255,.08)', border: '1px solid var(--border-strong)', textAlign: 'center', maxWidth: '92vw' } }, theme);
        const spark = h('span', { style: { position: 'absolute', right: '8%', top: '2%', fontSize: '0.32em', filter: 'drop-shadow(0 0 10px #ffb547)' } }, '✨');
        const bomb = h('button', { 'aria-label': 'Passer la bombe', style: { position: 'relative', fontSize: 'clamp(100px,30vmin,190px)', lineHeight: 1, background: 'none', border: 0, filter: 'drop-shadow(0 20px 40px rgba(255,92,58,.45))', transition: 'transform .1s', touchAction: 'manipulation' } }, '💣', spark);
        const banner = h('div', { style: { minHeight: '28px', fontWeight: 800, color: '#ffd23f', textAlign: 'center' } });
        const hint = h('p.muted', { style: { textAlign: 'center' } }, 'Dis un mot du thème, puis touche la bombe pour la passer');
        const lives = h('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center', maxWidth: '520px' } });
        const paintWho = () => {
          const p = players[cur]; who.replaceChildren(h('span', { style: { color: p.color } }, `${p.emoji} ${p.name}`));
          lives.replaceChildren(...players.map((q) => h('span.chip', { style: { opacity: q.lives > 0 ? 1 : 0.35, borderColor: q === p ? q.color : '' } }, `${q.emoji} ${'❤️'.repeat(Math.max(0, q.lives))}${q.lives <= 0 ? '☠️' : ''}`)));
        };
        scene.replaceChildren(h('p.faint', `Manche ${roundN} · ${dir === 1 ? 'sens horaire ↻' : 'sens inverse ↺'}`), themeEl, banner, bomb, who, hint, lives);
        paintWho();
        const say = (txt, color = '#ffd23f') => { banner.textContent = txt; banner.style.color = color; banner.animate([{ transform: 'scale(1.4)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], { duration: 300, easing: 'cubic-bezier(.2,1.6,.4,1)' }); };
        bomb.onpointerdown = (e) => {
          e.preventDefault(); if (exploded) return;
          if (sticky > 0) { sticky--; sfx.tick(); vibrate(8); bomb.animate([{ transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'none' }], { duration: 120 }); hint.textContent = sticky ? `Bombe collante ! Encore ${sticky} tape${sticky > 1 ? 's' : ''}` : 'Décollée !'; return; }
          const now = performance.now(); const held = now - holdT; fastest = Math.min(fastest, held); holdT = now;
          players[cur].passes++;
          cur = nextAlive(cur); paintWho(); sfx.pop(); vibrate(15);
          bomb.style.transform = `scale(.85) rotate(${dir * -15}deg)`; setTimeout(() => (bomb.style.transform = ''), 120);
          hint.textContent = 'Dis un mot du thème, puis touche la bombe pour la passer';
        };
        await new Promise((res) => {
          const step = () => {
            if (!ctx.alive) return res();
            const el = performance.now() - start, p = el / fuse;
            const period = 600 - 480 * p;
            if (el - tickT > period) { tickT = el; sfx.tick(); bomb.animate([{ transform: 'scale(1)' }, { transform: `scale(${1.05 + p * 0.12})` }, { transform: 'scale(1)' }], { duration: 160 }); spark.style.opacity = Math.random() > 0.3 ? 1 : 0.4; }
            for (const ev of events) if (!ev.done && el >= ev.at) {
              ev.done = true; sfx.go(); vibrate([20, 30, 20]);
              if (ev.k === 'sens') { dir = -dir; say(`🔄 Changement de sens ! ${dir === 1 ? '↻' : '↺'}`); }
              else if (ev.k === 'theme') { theme = newTheme(); themeEl.textContent = theme; themeEl.animate([{ background: 'rgba(255,210,63,.5)' }, { background: 'rgba(255,255,255,.08)' }], { duration: 700 }); say('🎲 Nouveau thème !'); }
              else { sticky = 3; say('🍯 Bombe collante : 4 tapes pour la passer', '#ff9f43'); hint.textContent = 'Bombe collante ! Encore 3 tapes'; }
            }
            if (el >= fuse) { exploded = true; return res(); }
            requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        });
        if (!ctx.alive) return;
        longest = Math.max(longest, fuse);
        const loser = players[cur]; loser.lives--;
        if (loser.lives <= 0) loser.out = ++outOrder;
        sfx.boom(); vibrate([100, 50, 200]); ctx.flash('rgba(255,140,40,.55)'); ctx.shake(12);
        scene.replaceChildren(h('div', { style: { fontSize: '150px' }, class: 'anim-pop' }, '💥'), h('div.big-msg', `${loser.emoji} ${loser.name} a explosé !`), h('p.muted', loser.lives > 0 ? `Plus que ${loser.lives} vie.` : 'Éliminé·e !'), h('p.faint', `La mèche a tenu ${(fuse / 1000).toFixed(1).replace('.', ',')} s`));
        await ctx.wait(2200); if (!ctx.alive) return;
        const left = players.filter((p) => p.lives > 0);
        if (left.length <= 1) return finish(left[0]);
        if (loser.lives <= 0) cur = nextAlive(cur);
      }
    };
    const finish = (winner) => {
      winner.out = 99;
      const ranking = [...players].sort((a, b) => b.out - a.out);
      const hot = [...players].sort((a, b) => b.passes - a.passes)[0];
      ctx.end({
        emoji: '🏆', title: `${winner.name} survit !`, display: winner.emoji, win: true, multi: true,
        label: `${roundN} manches · ${players.length} joueurs`,
        extra: h('div', { style: { display: 'grid', gap: '8px', width: '100%' } },
          h('div', { style: { display: 'grid', gap: '6px' } }, ranking.map((p, i) => h('div', { style: { display: 'flex', justifyContent: 'space-between', gap: '10px', padding: '8px 12px', borderRadius: '12px', background: i === 0 ? 'rgba(255,210,63,.14)' : 'rgba(255,255,255,.05)' } },
            h('span', `${['🥇', '🥈', '🥉'][i] || `${i + 1}.`} ${p.emoji} ${p.name}`), h('span.muted', `${p.passes} passes`)))),
          h('p.faint', { style: { textAlign: 'center' } }, `🔥 Patate chaude : ${hot.emoji} ${hot.name} (${hot.passes} passes)${fastest < Infinity ? ` · passe la plus rapide : ${(fastest / 1000).toFixed(1).replace('.', ',')} s` : ''}`)),
      });
    };
    roundLoop();
  },
};
