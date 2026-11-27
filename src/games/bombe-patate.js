import { h } from '../core/dom.js';
import { sfx, vibrate } from '../core/sfx.js';
import { rng } from '../core/rng.js';
import { playerSetup } from '../core/players.js';

const THEMES = ['Un fruit', 'Un pays', 'Un animal de la ferme', 'Un métier', 'Une marque de voiture', 'Un sport', 'Un instrument de musique', 'Un légume', 'Un super-héros', 'Une couleur', 'Un mot qui finit par « -tion »', 'Une capitale', 'Un dessert', 'Un prénom en M', 'Un objet de la cuisine', 'Un animal marin', 'Un film Disney', 'Une ville suisse', 'Un fromage', 'Un vêtement', 'Un moyen de transport', 'Un mot de 3 lettres', 'Une boisson', 'Une partie du corps', 'Un jeu de société', 'Un insecte', 'Un chanteur ou une chanteuse', 'Une fleur'];
const LIVES = 2;

export default {
  async start(ctx) {
    const players = await playerSetup(ctx.stage, { min: 2, max: 8, title: 'Qui joue ?', cta: 'Allumer la mèche 🔥' });
    if (!ctx.alive) return;
    players.forEach((p) => (p.lives = LIVES));
    let cur = rng.int(0, players.length - 1), themes = rng.shuffle(THEMES), ti = 0;
    const scene = h('div.center-stage', { style: { gap: '18px' } }); ctx.stage.append(scene);
    const nextAlive = (i) => { let j = i; do j = (j + 1) % players.length; while (players[j].lives <= 0); return j; };

    const roundLoop = async () => {
      while (ctx.alive) {
        const theme = themes[ti++ % themes.length];
        const fuse = rng.float(12, 32) * 1000;
        let start = performance.now(), exploded = false, tickT = 0;
        const who = h('div.big-msg'), themeEl = h('div', { style: { fontSize: 'clamp(26px,6vw,40px)', fontWeight: 800, padding: '10px 22px', borderRadius: '18px', background: 'rgba(255,255,255,.08)', border: '1px solid var(--border-strong)' } }, theme);
        const bomb = h('button', { 'aria-label': 'Passer la bombe', style: { fontSize: 'clamp(110px,32vmin,200px)', lineHeight: 1, background: 'none', border: 0, filter: 'drop-shadow(0 20px 40px rgba(255,92,58,.45))', transition: 'transform .1s', touchAction: 'manipulation' } }, '💣');
        const lives = h('div', { style: { display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' } });
        const paintWho = () => {
          const p = players[cur]; who.replaceChildren(h('span', { style: { color: p.color } }, `${p.emoji} ${p.name}`));
          lives.replaceChildren(...players.map((q) => h('span.chip', { style: { opacity: q.lives > 0 ? 1 : 0.35, borderColor: q === p ? q.color : '' } }, `${q.emoji} ${'❤️'.repeat(Math.max(0, q.lives))}${q.lives <= 0 ? '☠️' : ''}`)));
        };
        scene.replaceChildren(h('p.faint', 'Thème'), themeEl, bomb, who, h('p.muted', 'Dis un mot du thème, puis touche la bombe pour la passer'), lives);
        paintWho();
        bomb.onpointerdown = (e) => { e.preventDefault(); if (exploded) return; cur = nextAlive(cur); paintWho(); sfx.pop(); vibrate(15); bomb.style.transform = 'scale(.85) rotate(-15deg)'; setTimeout(() => (bomb.style.transform = ''), 120); };
        await new Promise((res) => {
          const step = () => {
            if (!ctx.alive) return res();
            const el = performance.now() - start, p = el / fuse;
            const period = 600 - 480 * p;
            if (el - tickT > period) { tickT = el; sfx.tick(); bomb.animate([{ transform: 'scale(1)' }, { transform: `scale(${1.05 + p * 0.1})` }, { transform: 'scale(1)' }], { duration: 160 }); }
            if (el >= fuse) { exploded = true; return res(); }
            requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        });
        if (!ctx.alive) return;
        const loser = players[cur]; loser.lives--;
        sfx.boom(); vibrate([100, 50, 200]);
        scene.replaceChildren(h('div', { style: { fontSize: '150px' }, class: 'anim-pop' }, '💥'), h('div.big-msg', `${loser.emoji} ${loser.name} a explosé !`), h('p.muted', loser.lives > 0 ? `Plus que ${loser.lives} vie.` : 'Éliminé·e !'));
        ctx.stage.animate([{ transform: 'translate(0,0)' }, { transform: 'translate(-10px,6px)' }, { transform: 'translate(8px,-6px)' }, { transform: 'translate(0,0)' }], { duration: 350 });
        await ctx.wait(2200); if (!ctx.alive) return;
        const left = players.filter((p) => p.lives > 0);
        if (left.length <= 1) return ctx.end({ emoji: '🏆', title: `${left[0].name} survit !`, display: left[0].emoji, label: 'Dernier·e joueur·se avec la tête sur les épaules', win: true });
        if (loser.lives <= 0) cur = nextAlive(cur);
      }
    };
    roundLoop();
  },
};
