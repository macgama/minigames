import { h } from '../core/dom.js';
import { sfx, vibrate } from '../core/sfx.js';
import { playerSetup, PCOLORS, PEMOJI } from '../core/players.js';
import { passTo } from './kit.js';

const FACES = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
const BOTS = ['Sam', 'Lou', 'Nina', 'Théo'];

export default {
  async start(ctx) {
    const R = ctx.rng, local = ctx.mode === 'local';
    let players;
    if (local) { players = await playerSetup(ctx.stage, { min: 2, max: 6, title: 'Qui joue ?', cta: 'Lancer les dés 🎲' }); if (!ctx.alive) return; players.forEach((p) => (p.bot = false)); }
    else { const n = Number(ctx.mode || 2); players = [{ name: 'Toi', emoji: PEMOJI[0], color: PCOLORS[0], bot: false }, ...BOTS.slice(0, n).map((name, i) => ({ name, emoji: ['🤠', '🦝', '🦉', '🐺'][i], color: PCOLORS[i + 1], bot: true, bluff: R.float(0.1, 0.35) }))]; }
    players.forEach((p) => { p.n = 5; p.dice = []; p.out = 0; });
    const scene = h('div.center-stage', { style: { gap: '14px', justifyContent: 'flex-start', paddingTop: '18px', overflowY: 'auto' } }); ctx.stage.append(scene);
    let cur = R.int(0, players.length - 1), bid = null, bidder = null, caught = 0, outOrder = 0;
    const alive = () => players.filter((p) => p.n > 0);
    const total = () => alive().reduce((a, p) => a + p.n, 0);
    const next = (i) => { let j = i; do j = (j + 1) % players.length; while (players[j].n <= 0); return j; };
    const valid = (q, f) => !bid || q > bid.q || (q === bid.q && f > bid.f);
    const count = (f) => alive().reduce((a, p) => a + p.dice.filter((d) => d === f || d === 1).length, 0);
    const diceRow = (dice, big = false) => h('div', { style: { display: 'flex', gap: '6px', justifyContent: 'center', flexWrap: 'wrap' } }, dice.map((d) => h('span', { style: { fontSize: big ? '46px' : '26px', lineHeight: 1, color: d === 1 ? '#ffd23f' : '#fff' } }, FACES[d])));
    const table = (reveal, me) => h('div', { style: { display: 'grid', gap: '6px', width: 'min(94vw,520px)' } }, players.map((p) => h('div', { style: { display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 12px', borderRadius: '12px', background: players[cur] === p ? 'rgba(255,255,255,.1)' : 'rgba(255,255,255,.04)', opacity: p.n ? 1 : 0.35 } },
      h('span', { style: { fontSize: '22px' } }, p.emoji), h('b', { style: { color: p.color, flex: 1, textAlign: 'left' } }, p.name),
      reveal || p === me ? diceRow(p.dice) : h('span.faint', p.n ? '🎲'.repeat(p.n) : 'éliminé·e'))));
    const bidText = (b) => (b ? `${b.q} × ${FACES[b.f]}` : '—');

    const humanTurn = (p) => new Promise((res) => {
      let q = bid ? bid.q : Math.max(1, Math.round(total() / 6)), f = bid ? bid.f : 2;
      if (!valid(q, f)) { if (f < 6) f++; else { q++; f = 2; } }
      const qEl = h('b', { style: { fontSize: '34px', minWidth: '50px', display: 'inline-block' } });
      const faces = h('div', { style: { display: 'flex', gap: '6px' } });
      const go = h('button.btn.btn-primary.btn-lg', { onclick: () => res({ q, f }) }, 'Enchérir');
      const paint = () => { qEl.textContent = q; faces.replaceChildren(...[2, 3, 4, 5, 6].map((v) => h('button.btn', { style: { fontSize: '30px', padding: '4px 10px', background: v === f ? 'var(--brand-1)' : '' }, onclick: () => { f = v; paint(); } }, FACES[v]))); go.disabled = !valid(q, f); };
      scene.replaceChildren(
        h('div.faint', `Enchère actuelle : ${bidText(bid)}${bidder ? ` (${bidder.name})` : ''} · ${total()} dés sur la table`),
        h('div', h('div.faint', { style: { fontSize: '12px', fontWeight: 700, letterSpacing: '.1em' } }, 'TES DÉS'), diceRow(p.dice, true)),
        h('p.faint', { style: { fontSize: '13px' } }, '⚀ = joker, il compte pour toutes les faces'),
        h('div', { style: { display: 'flex', alignItems: 'center', gap: '10px' } }, h('button.btn.btn-icon', { onclick: () => { q = Math.max(1, q - 1); paint(); } }, '−'), qEl, h('button.btn.btn-icon', { onclick: () => { q = Math.min(total(), q + 1); paint(); } }, '+'), h('span.muted', 'dés de')),
        faces,
        h('div.btn-row', go, bid && h('button.btn.btn-lg', { style: { background: '#ff3d5a', color: '#fff' }, onclick: () => res('liar') }, '🤥 Menteur !')),
        table(false, p));
      paint();
    });
    const botTurn = (p) => {
      const own = (f) => p.dice.filter((d) => d === f || d === 1).length;
      const exp = (f) => own(f) + (total() - p.n) / 3;
      if (bid) {
        const doubt = bid.q - exp(bid.f);
        if (doubt > 1.2 || (doubt > 0.3 && R.chance(0.4))) return 'liar';
      }
      // Choisit sa meilleure face, parfois un bluff
      let f = [2, 3, 4, 5, 6].reduce((a, v) => (own(v) > own(a) ? v : a), 2);
      if (R.chance(p.bluff)) f = R.int(2, 6);
      let q = bid ? bid.q : Math.max(1, Math.floor(exp(f)) - 1);
      if (!valid(q, f)) q = bid.q + (f > bid.f ? 0 : 1);
      if (!valid(q, f)) q++;
      if (bid && (q > exp(f) + 1.5 || q > total())) return 'liar';
      q = Math.min(q, total());
      return { q, f };
    };

    const roll = () => players.forEach((p) => (p.dice = Array.from({ length: p.n }, () => R.int(1, 6)).sort()));
    const play = async () => {
      while (ctx.alive && alive().length > 1) {
        roll(); bid = null; bidder = null;
        const human = players.find((p) => !p.bot);
        ctx.hud({ dice: `🎲 ${total()} dés`, me: local ? null : `Toi : ${human.n}` });
        scene.replaceChildren(h('div.big-msg', { style: { fontSize: '28px' } }, 'Nouvelle manche'), h('p.muted', 'Les dés roulent…'), h('div', { style: { fontSize: '60px' }, class: 'anim-pop' }, '🎲🎲'));
        sfx.pop(); await ctx.wait(1100); if (!ctx.alive) return;
        while (ctx.alive) {
          const p = players[cur];
          let act;
          if (p.bot) {
            scene.replaceChildren(h('div', { style: { fontSize: '48px' } }, p.emoji), h('div.big-msg', { style: { fontSize: '24px' } }, `${p.name} réfléchit…`), h('div.faint', `Enchère : ${bidText(bid)}`), table(false, human));
            await ctx.wait(R.float(900, 1600)); if (!ctx.alive) return;
            act = botTurn(p);
          } else {
            if (local) { await passTo(scene, p, 'Les autres ne regardent pas tes dés 👀'); if (!ctx.alive) return; }
            act = await humanTurn(p); if (!ctx.alive) return;
          }
          if (act === 'liar') {
            const n = count(bid.f), truth = n >= bid.q;
            const loser = truth ? p : bidder;
            if (!truth && !p.bot) caught++;
            sfx.boom(); vibrate([60, 40, 60]); ctx.shake(8);
            scene.replaceChildren(h('div.big-msg', { style: { fontSize: '30px' } }, `${p.emoji} ${p.name} : « Menteur ! »`),
              h('p', { style: { fontSize: '20px' } }, `Enchère : ${bidText(bid)} · il y en avait `, h('b', { style: { color: truth ? 'var(--ok)' : 'var(--bad)' } }, String(n))),
              table(true), h('div.big-msg', { style: { fontSize: '24px', color: '#ffd23f' } }, `${loser.emoji} ${loser.name} perd un dé`));
            loser.n--; if (loser.n === 0) loser.out = ++outOrder;
            cur = loser.n > 0 ? players.indexOf(loser) : next(players.indexOf(loser));
            await ctx.wait(3800); break;
          }
          bid = act; bidder = p; sfx.tick();
          if (p.bot) { scene.replaceChildren(h('div', { style: { fontSize: '48px' } }, p.emoji), h('div.big-msg', `${p.name} : ${bidText(bid)}`), table(false, human)); await ctx.wait(1300); if (!ctx.alive) return; }
          cur = next(cur);
        }
      }
      if (!ctx.alive) return;
      const winner = alive()[0]; winner.out = 99;
      const rank = [...players].sort((a, b) => b.out - a.out);
      if (local) return ctx.end({ multi: true, emoji: '🎲', display: winner.emoji, title: `${winner.name} gagne !`, label: `Il lui reste ${winner.n} dé${winner.n > 1 ? 's' : ''}`, win: true, extra: h('div', rank.map((p, i) => h('div', `${i + 1}. ${p.emoji} ${p.name}`))) });
      const me = players[0], myRank = rank.indexOf(me) + 1;
      const score = (players.length - myRank) * 120 + (myRank === 1 ? me.n * 40 : 0) + caught * 20;
      ctx.end({
        score, display: `${score} pts`, emoji: myRank === 1 ? '🏆' : '🎲', win: myRank === 1,
        title: myRank === 1 ? 'Roi du bluff !' : `${myRank}e sur ${players.length}`, label: `${caught} menteur${caught > 1 ? 's' : ''} démasqué${caught > 1 ? 's' : ''}${myRank === 1 ? ` · ${me.n} dé${me.n > 1 ? 's' : ''} restant${me.n > 1 ? 's' : ''}` : ''}`,
        feats: [myRank === 1 && 'gagne', caught >= 3 && 'flair', myRank === 1 && me.n === 5 && 'intact'].filter(Boolean),
      });
    };
    play();
  },
};
