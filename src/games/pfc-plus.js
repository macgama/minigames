import { h } from '../core/dom.js';
import { sfx, vibrate } from '../core/sfx.js';
import { rng } from '../core/rng.js';

const MOVES = [['pierre', '🪨'], ['feuille', '📄'], ['ciseaux', '✂️']];
const BEATS = { pierre: 'ciseaux', feuille: 'pierre', ciseaux: 'feuille' };
const POWERS = [
  { id: 'classic', name: 'Classique', desc: 'Aucun pouvoir. Les règles de base.', icon: '⚖️' },
  { id: 'double-cis', name: 'Ciseaux affûtés', desc: 'Gagner avec les ciseaux rapporte 2 points.', icon: '✂️' },
  { id: 'reverse', name: 'Monde à l’envers', desc: 'Le coup qui perd normalement gagne.', icon: '🙃' },
  { id: 'no-rock', name: 'Pierre interdite', desc: 'Personne ne peut jouer la pierre.', icon: '🚫' },
  { id: 'tie-pay', name: 'Égalité payante', desc: 'En cas d’égalité, chacun marque 1 point.', icon: '🤝' },
  { id: 'paper-shield', name: 'Feuille blindée', desc: 'La feuille ne peut pas perdre (égalité au pire).', icon: '🛡️' },
  { id: 'double', name: 'Coup double', desc: 'Cette manche vaut 2 points.', icon: '✖️2' },
  { id: 'spy', name: 'Espion', desc: 'L’adversaire annonce son coup… mais ment une fois sur trois.', icon: '🕵️', botOnly: true },
];
const TARGET = 4;

export default {
  start(ctx) {
    const duo = ctx.mode === 'duo';
    const names = duo ? ['Joueur 1', 'Joueur 2'] : ['Toi', 'L’ordi'];
    const score = [0, 0];
    let round = 0;
    const scene = h('div.center-stage', { style: { gap: '18px' } }); ctx.stage.append(scene);
    const board = () => h('div', { style: { display: 'flex', gap: '20px', alignItems: 'center', fontWeight: 800, fontSize: '22px' } }, h('span', { style: { color: 'var(--p1)' } }, `${names[0]} ${score[0]}`), h('span.faint', '–'), h('span', { style: { color: 'var(--p2)' } }, `${score[1]} ${names[1]}`));
    const powerCard = (pw) => h('div.panel', { style: { padding: '14px 18px', display: 'flex', gap: '14px', alignItems: 'center', maxWidth: '460px', textAlign: 'left', borderColor: 'rgba(255,181,71,.4)' } }, h('span', { style: { fontSize: '34px' } }, pw.icon), h('div', h('b', `Pouvoir : ${pw.name}`), h('p.muted', { style: { fontSize: '14px' } }, pw.desc)));
    const choose = (who, pw, hint) => new Promise((res) => {
      const allowed = MOVES.filter(([m]) => !(pw.id === 'no-rock' && m === 'pierre'));
      scene.replaceChildren(...[board(), powerCard(pw), hint && h('p', { style: { fontWeight: 700, color: 'var(--warn)' } }, hint),
        h('div.big-msg', { style: { fontSize: 'clamp(20px,5vw,30px)' } }, duo ? `${names[who]}, choisis en secret` : 'Ton coup ?'),
        h('div', { style: { display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' } }, allowed.map(([m, e]) => h('button', { onclick: () => { sfx.tap(); vibrate(10); res(m); }, 'aria-label': m,
          style: { width: 'clamp(96px,26vw,130px)', aspectRatio: '1', borderRadius: '28px', border: '1px solid var(--border-strong)', background: 'linear-gradient(160deg,rgba(255,255,255,.14),rgba(255,255,255,.03))', fontSize: 'clamp(44px,12vw,60px)', display: 'grid', placeItems: 'center', boxShadow: 'var(--shadow-1)' } }, e, h('small', { style: { fontSize: '13px', fontWeight: 700, marginTop: '-8px' } }, m))))].filter(Boolean));
    });
    const outcome = (a, b, pw) => {
      if (a === b) return 0;
      if (pw.id === 'paper-shield' && (a === 'feuille' || b === 'feuille')) return 0;
      let r = BEATS[a] === b ? 1 : -1;
      if (pw.id === 'reverse') r = -r;
      return r;
    };
    const play = async () => {
      while (ctx.alive) {
        round++;
        const pw = round === 1 ? POWERS[0] : rng.pick(POWERS.filter((p) => !(duo && p.botOnly)));
        ctx.hud({ round: `Manche ${round}` });
        scene.replaceChildren(board(), h('div.anim-pop', { style: { fontSize: '70px' } }, pw.icon), h('div.big-msg', pw.name), h('p.muted', pw.desc)); sfx.count();
        await ctx.wait(1700); if (!ctx.alive) return;
        let botMove = rng.pick(MOVES.filter(([m]) => !(pw.id === 'no-rock' && m === 'pierre')))[0];
        let hint = null;
        if (pw.id === 'spy') { const lie = rng.chance(1 / 3); const said = lie ? rng.pick(MOVES.filter(([m]) => m !== botMove))[0] : botMove; hint = `🕵️ L’ordi annonce : « ${said} »`; }
        const a = await choose(0, pw, hint); if (!ctx.alive) return;
        let b;
        if (duo) { await new Promise((res) => scene.replaceChildren(h('div.card', h('h2', 'Passe à Joueur 2'), h('p.muted', 'Joueur 1 ne regarde pas 👀'), h('button.btn.btn-primary.btn-lg', { onclick: res }, 'Je suis Joueur 2')))); b = await choose(1, pw); }
        else b = botMove;
        if (!ctx.alive) return;
        const r = outcome(a, b, pw);
        let pts = pw.id === 'double' ? 2 : 1;
        if (r === 1) { if (pw.id === 'double-cis' && a === 'ciseaux') pts = 2; score[0] += pts; }
        else if (r === -1) { if (pw.id === 'double-cis' && b === 'ciseaux') pts = 2; score[1] += pts; }
        else if (pw.id === 'tie-pay') { score[0]++; score[1]++; }
        const em = (m) => MOVES.find((x) => x[0] === m)[1];
        // révélation
        scene.replaceChildren(board(), h('div', { style: { display: 'flex', gap: 'clamp(20px,8vw,60px)', alignItems: 'center' } },
          h('div', { style: { textAlign: 'center' } }, h('div.anim-pop', { style: { fontSize: 'clamp(70px,20vw,110px)' } }, em(a)), h('b', names[0])), h('b.faint', 'VS'),
          h('div', { style: { textAlign: 'center' } }, h('div.anim-pop', { style: { fontSize: 'clamp(70px,20vw,110px)', animationDelay: '.15s' } }, em(b)), h('b', names[1]))),
          h('div.big-msg', { style: { color: r === 1 ? 'var(--p1)' : r === -1 ? 'var(--p2)' : 'var(--text-2)' } }, r === 0 ? (pw.id === 'tie-pay' ? 'Égalité payante ! +1 chacun' : 'Égalité') : `${!duo && r === 1 ? 'Tu gagnes' : names[r === 1 ? 0 : 1] + ' gagne'}${pts > 1 ? ` +${pts}` : ''}`));
        r === 1 || duo ? sfx.ok() : r === -1 ? sfx.bad() : sfx.pop();
        await ctx.wait(1900); if (!ctx.alive) return;
        if (score[0] >= TARGET || score[1] >= TARGET) {
          const w = score[0] === score[1] ? -1 : score[0] > score[1] ? 0 : 1;
          return ctx.end({
            score: duo ? null : score[0] - score[1] + 10, record: !duo, display: `${score[0]} – ${score[1]}`, emoji: w === 0 || duo ? '🏆' : w === 1 ? '🤖' : '🤝', win: duo ? true : w === 0,
            title: w === -1 ? 'Égalité parfaite !' : duo ? `${names[w]} gagne !` : w === 0 ? 'Victoire !' : 'L’ordi gagne…', label: `${round} manches et autant de pouvoirs`,
            share: duo ? undefined : `✂️ Pierre-Feuille-Ciseaux+ : ${score[0]}–${score[1]} contre l’ordi. Les pouvoirs changent tout !`,
          });
        }
      }
    };
    play();
  },
};
