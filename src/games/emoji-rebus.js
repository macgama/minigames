import { h } from '../core/dom.js';
import { sfx, vibrate } from '../core/sfx.js';

const FILMS = [
  ['🦁👑', 'Le Roi Lion'], ['🧊👸❄️', 'La Reine des neiges'], ['🚢🧊💔', 'Titanic'], ['🦖🏝️', 'Jurassic Park'], ['🧙‍♂️💍🌋', 'Le Seigneur des anneaux'],
  ['🐠🔍', 'Le Monde de Nemo'], ['👽📞🏠', 'E.T.'], ['🕷️🧑', 'Spider-Man'], ['🦇🧑', 'Batman'], ['🧸🤠🚀', 'Toy Story'],
  ['🐭👨‍🍳🇫🇷', 'Ratatouille'], ['🏠🎈👴', 'Là-haut'], ['🦈🏖️', 'Les Dents de la mer'], ['⚡👓🧙', 'Harry Potter'], ['🍫🏭🎫', 'Charlie et la chocolaterie'],
  ['🐼🥋', 'Kung Fu Panda'], ['🚗⚡🏁', 'Cars'], ['🧞‍♂️🪔🐒', 'Aladdin'], ['🧜‍♀️🌊🦀', 'La Petite Sirène'], ['🐘👂🎪', 'Dumbo'],
  ['🤖🌱🗑️', 'WALL-E'], ['👻🚫📞', 'SOS Fantômes'], ['🕰️🚗🔙', 'Retour vers le futur'], ['🦍🏙️✈️', 'King Kong'], ['💤🧠🌀', 'Inception'],
  ['👸🍎🪞', 'Blanche-Neige'], ['🧹🧙‍♀️🌪️', 'Le Magicien d’Oz'], ['🐺🧒🌴', 'Le Livre de la jungle'], ['👠🎃🕛', 'Cendrillon'], ['🌹🐻‍❄️👸', 'La Belle et la Bête'],
  ['🏴‍☠️🦜🌊', 'Pirates des Caraïbes'], ['🐉🔥🧑', 'Dragons'], ['🥷🐢🍕', 'Les Tortues Ninja'], ['🚀⭐⚔️', 'La Guerre des étoiles'], ['😀😢😡🧠', 'Vice-Versa'],
];
const EXPRESSIONS = [
  ['🐱👅', 'Donner sa langue au chat'], ['🌧️🪢', 'Il pleut des cordes'], ['🥚🧺', 'Mettre tous ses œufs dans le même panier'], ['🐮🇪🇸🗣️', 'Parler français comme une vache espagnole'], ['🥕🥕♨️', 'Les carottes sont cuites'],
  ['🐟🗓️', 'Poisson d’avril'], ['🐰🎩', 'Sortir un lapin du chapeau'], ['🐔🦷', 'Quand les poules auront des dents'], ['🍰🍒', 'La cerise sur le gâteau'], ['🐘🧠', 'Une mémoire d’éléphant'],
  ['😴🐿️', 'Dormir comme une marmotte'], ['🔨🧊', 'Briser la glace'], ['☁️7️⃣', 'Être au septième ciel'], ['🦆🥶', 'Un froid de canard'], ['🐺😋', 'Avoir une faim de loup'],
  ['🍎🌳', 'La pomme ne tombe jamais loin de l’arbre'], ['💰🌳🚫', 'L’argent ne pousse pas sur les arbres'], ['🔪🧈', 'Comme dans du beurre'], ['⏰💰', 'Le temps, c’est de l’argent'], ['🧑🌙', 'Être dans la lune'],
  ['🐑⚫', 'Le mouton noir'], ['🦁🍰', 'La part du lion'], ['🐛🍎', 'Le ver est dans le fruit'], ['💣💥', 'Faire l’effet d’une bombe'], ['🐓🌅', 'Se lever avec les poules'],
  ['🥖🧑‍🌾', 'Gagner son pain'], ['🦃🎭', 'Être le dindon de la farce'], ['🐱😷', 'Avoir un chat dans la gorge'], ['🌶️👅', 'Avoir la langue bien pendue'], ['🧀🐭', 'Être comme un rat dans un fromage'],
  ['🌊🥛🥤', 'Une goutte d’eau dans la mer'], ['🔥🛢️', 'Jeter de l’huile sur le feu'], ['🦷😠', 'Avoir une dent contre quelqu’un'], ['🎯👁️', 'Taper dans l’œil'], ['🍋🧃', 'Presser comme un citron'],
];
const QN = 10, TIME = 12;

export default {
  start(ctx) {
    const mode = ctx.mode || 'mix', R = ctx.rng;
    const pool = mode === 'films' ? FILMS.map((x) => [...x, 'f']) : mode === 'expressions' ? EXPRESSIONS.map((x) => [...x, 'e']) : [...FILMS.map((x) => [...x, 'f']), ...EXPRESSIONS.map((x) => [...x, 'e'])];
    const qs = R.shuffle(pool).slice(0, QN);
    let i = 0, score = 0, lives = 3, streak = 0, good = 0, fast = 0, jokers = 2, usedJoker = false, t0 = 0, cur = null, locked = false;
    const head = h('div.faint', { style: { fontSize: '12px', fontWeight: 700, letterSpacing: '.1em' } });
    const kind = h('div.chip');
    const rebus = h('div', { style: { fontSize: 'clamp(48px,15vw,84px)', letterSpacing: '6px', minHeight: '1.3em', textAlign: 'center', filter: 'drop-shadow(0 8px 20px rgba(0,0,0,.35))' } });
    const timer = h('div.bar', { style: { width: 'min(86vw,420px)' } }, h('i', { style: { width: '100%' } }));
    const answers = h('div', { style: { display: 'grid', gap: '8px', width: 'min(92vw,460px)' } });
    const joker = h('button.btn', { onclick: () => fifty() });
    const msg = h('div', { style: { minHeight: '28px', fontWeight: 800, fontSize: '18px' } });
    ctx.stage.append(h('div.center-stage', { style: { gap: '12px' } }, head, kind, rebus, timer, answers, msg, joker));
    const hud = () => ctx.hud({ pts: `${score} pts`, lives: '❤️'.repeat(lives) + '🖤'.repeat(3 - lives), streak: streak >= 2 ? `🔥 ×${(1 + Math.min(streak, 5) * 0.1).toFixed(1).replace('.', ',')}` : null });
    const paintJoker = () => { joker.textContent = `50/50 · ${jokers} restant${jokers > 1 ? 's' : ''}`; joker.disabled = !jokers || locked; };

    const ask = () => {
      if (i >= QN || lives <= 0) return finish();
      const [emo, ans, k] = qs[i];
      const same = pool.filter((x) => x[2] === k && x[1] !== ans);
      const opts = R.shuffle([ans, ...R.shuffle(same).slice(0, 3).map((x) => x[1])]);
      cur = { ans, opts, btns: [] }; locked = false;
      head.textContent = `RÉBUS ${i + 1}/${QN}`; kind.textContent = k === 'f' ? '🎬 Film' : '💬 Expression';
      rebus.textContent = emo; rebus.animate([{ transform: 'scale(.6)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 300, easing: 'cubic-bezier(.3,1.5,.5,1)' });
      msg.textContent = '';
      cur.btns = opts.map((o) => h('button.btn', { style: { minHeight: '52px', fontWeight: 700, fontSize: '16px' }, onclick: () => pick(o) }, o));
      answers.replaceChildren(...cur.btns); paintJoker(); hud();
      t0 = performance.now();
    };
    const pick = (o) => {
      if (locked || !cur) return; locked = true; paintJoker();
      const sec = (performance.now() - t0) / 1000, ok = o === cur.ans;
      cur.btns.forEach((b) => { if (b.textContent === cur.ans) b.style.background = 'var(--ok)'; else if (b.textContent === o) b.style.background = 'var(--bad)'; b.disabled = true; });
      if (ok) {
        streak++; good++; if (sec < 3) fast++;
        const speed = Math.max(0, Math.round(((TIME - sec) / TIME) * 60)), mult = 1 + Math.min(streak, 5) * 0.1;
        const pts = Math.round((100 + speed) * mult); score += pts;
        msg.textContent = sec < 3 ? `⚡ Éclair ! +${pts}` : `Bien vu ! +${pts}`; msg.style.color = 'var(--ok)';
        sfx.ok(); vibrate(10); if (streak >= 3) ctx.flash('rgba(61,220,151,.18)');
      } else {
        streak = 0; lives--; msg.textContent = o ? 'Raté…' : '⏰ Trop tard !'; msg.style.color = 'var(--bad)';
        sfx.bad(); vibrate([30, 30, 30]); ctx.shake(5);
      }
      hud(); i++; ctx.timeout(ask, ok ? 1000 : 1700);
    };
    const fifty = () => {
      if (!jokers || locked || !cur) return; jokers--; usedJoker = true;
      R.shuffle(cur.btns.filter((b) => b.textContent !== cur.ans)).slice(0, 2).forEach((b) => { b.disabled = true; b.style.opacity = 0.25; });
      sfx.pop(); paintJoker();
    };
    ctx.interval(() => {
      if (!cur || locked) return;
      const k = 1 - (performance.now() - t0) / 1000 / TIME; timer.firstChild.style.width = Math.max(0, k * 100) + '%';
      timer.firstChild.style.background = k < 0.3 ? 'var(--bad)' : '';
      if (k <= 0) pick(null);
    }, 50);
    const finish = () => {
      cur = null;
      ctx.end({
        score, display: `${score} pts`, emoji: '🧩', board: mode === 'mix' ? null : mode,
        title: good === QN ? 'Déchiffreur absolu' : score >= 1000 ? 'Roi du rébus' : score >= 500 ? 'Bon décodeur' : 'Les emojis, c’est tout un art',
        label: `${good}/${QN} rébus · ${fast} éclair${fast > 1 ? 's' : ''}`,
        feats: [good === QN && 'parfait', fast >= 5 && 'eclair', !usedJoker && score >= 1000 && 'sans'].filter(Boolean),
      });
    };
    ctx.countdown().then(() => ctx.alive && ask());
  },
};
