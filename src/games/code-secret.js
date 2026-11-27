import { h } from '../core/dom.js';
import { sfx, vibrate } from '../core/sfx.js';
import { passTo } from './kit.js';

const PAL = ['#ff3d5a', '#3a8bff', '#2fd27a', '#ffd23f', '#a45cff', '#ff8a1f', '#f5f5f5'];
const score = (code, g) => { let b = 0, w = 0; const ca = {}, ga = {}; code.forEach((c, i) => (c === g[i] ? b++ : ((ca[c] = (ca[c] || 0) + 1), (ga[g[i]] = (ga[g[i]] || 0) + 1)))); for (const k in ga) w += Math.min(ga[k], ca[k] || 0); return [b, w]; };
const allCodes = (len, n) => { const out = []; const rec = (p) => { if (p.length === len) return out.push(p); for (let i = 0; i < n; i++) rec([...p, i]); }; rec([]); return out; };
const MAX = 10;

export default {
  async start(ctx) {
    const mode = ctx.mode || 'bot', expert = mode === 'expert', duo = mode === 'duo', R = ctx.rng;
    const LEN = expert ? 5 : 4, NC = expert ? 7 : 6;
    const names = duo ? ['Joueur 1', 'Joueur 2'] : ['Toi', 'L’ordi'];
    const scene = h('div.center-stage', { style: { gap: '10px', justifyContent: 'flex-start', paddingTop: '12px' } }); ctx.stage.append(scene);
    const peg = (c, sz = 18) => h('span', { style: { width: `${sz}px`, height: `${sz}px`, borderRadius: '50%', background: c == null ? 'rgba(255,255,255,.1)' : PAL[c], display: 'inline-block', boxShadow: c == null ? 'inset 0 0 0 2px rgba(255,255,255,.15)' : 'inset 0 -3px 0 rgba(0,0,0,.25)' } });
    const fb = ([b, w]) => h('span', { style: { fontSize: '12px', fontWeight: 800, minWidth: '46px', textAlign: 'right' } }, `${'🟩'.repeat(b)}${'🟨'.repeat(w)}` || '—');

    // Saisie d'un code (tap sur la palette)
    const picker = (title, sub, extra) => new Promise((res) => {
      const cur = [];
      const slots = h('div', { style: { display: 'flex', gap: '8px', justifyContent: 'center' } });
      const ok = h('button.btn.btn-primary.btn-lg', { disabled: true, onclick: () => res(cur.slice()) }, 'Valider');
      const paint = () => { slots.replaceChildren(...Array.from({ length: LEN }, (_, i) => peg(cur[i], 34))); ok.disabled = cur.length < LEN; };
      const pal = h('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center', maxWidth: '340px' } },
        PAL.slice(0, NC).map((c, i) => h('button', { style: { width: '44px', height: '44px', borderRadius: '50%', background: c, border: '3px solid rgba(255,255,255,.25)', cursor: 'pointer' }, onclick: () => { if (cur.length < LEN) { cur.push(i); sfx.tick(); paint(); } } })),
        h('button.btn', { style: { minWidth: '56px' }, onclick: () => { cur.pop(); paint(); } }, '⌫'));
      extra.replaceChildren(h('div', { style: { fontWeight: 800 } }, title), sub ? h('div.faint', sub) : '', slots, pal, ok);
      paint();
    });

    const hist = [[], []]; // hist[k] = essais du joueur k contre le code adverse
    const board = () => h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', width: 'min(96vw,520px)' } }, [0, 1].map((k) =>
      h('div', { style: { padding: '8px', borderRadius: '14px', background: 'rgba(255,255,255,.05)', display: 'grid', gap: '4px', alignContent: 'start', minHeight: '120px' } },
        h('div.faint', { style: { fontSize: '12px', fontWeight: 800, textAlign: 'center' } }, `${names[k]} · ${hist[k].length}/${MAX}`),
        hist[k].map(([g, f]) => h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' } }, h('span', { style: { display: 'flex', gap: '3px' } }, g.map((c) => peg(c, LEN > 4 ? 14 : 16))), fb(f))))));
    const input = h('div', { style: { display: 'grid', gap: '10px', justifyItems: 'center' } });

    // Codes secrets
    const codes = [null, null];
    if (duo) {
      for (let k = 0; k < 2; k++) { await passTo(scene, { name: names[k], emoji: k ? '🐼' : '🦊', color: k ? '#ff5c7a' : '#4cc9f0' }, 'Cache ton code, l’autre ne regarde pas 🙈'); if (!ctx.alive) return; scene.replaceChildren(input); codes[1 - k] = await picker(`${names[k]} : ton code secret`, `${names[1 - k]} devra le trouver`, input); if (!ctx.alive) return; }
    } else {
      scene.replaceChildren(input);
      codes[1] = await picker('Ton code secret', 'L’ordi va essayer de le craquer', input); if (!ctx.alive) return;
      codes[0] = Array.from({ length: LEN }, () => R.int(0, NC - 1));
    }
    // codes[k] = code que le joueur k doit trouver

    // L'ordi : garde les codes compatibles avec toutes les réponses
    let cand = duo ? null : allCodes(LEN, NC);
    const botGuess = (turn) => {
      if (turn === 0) return expert ? [0, 0, 1, 1, 2] : [0, 0, 1, 1];
      if (!expert && R.float(0, 1) < 0.22) return Array.from({ length: LEN }, () => R.int(0, NC - 1)); // petite distraction
      return R.pick(cand);
    };
    const botPlay = () => { const g = botGuess(hist[1].length); const f = score(codes[1], g); cand = cand.filter((c) => { const s = score(c, g); return s[0] === f[0] && s[1] === f[1]; }); hist[1].push([g, f]); return f[0] === LEN; };

    let turn = 0, winner = null;
    while (ctx.alive && winner == null) {
      if (hist[0].length >= MAX && hist[1].length >= MAX) break;
      if (turn === 1 && !duo) {
        scene.replaceChildren(board(), h('div.muted', '🤖 L’ordi réfléchit…')); await ctx.wait(900); if (!ctx.alive) return;
        if (botPlay()) winner = 1;
        sfx.pop(); scene.replaceChildren(board()); await ctx.wait(500);
      } else {
        if (duo) { await passTo(scene, { name: names[turn], emoji: turn ? '🐼' : '🦊', color: turn ? '#ff5c7a' : '#4cc9f0' }, 'À toi de deviner'); if (!ctx.alive) return; }
        scene.replaceChildren(board(), input);
        const g = await picker(`${names[turn]} : essai ${hist[turn].length + 1}/${MAX}`, null, input); if (!ctx.alive) return;
        const f = score(codes[turn], g); hist[turn].push([g, f]);
        if (f[0] === LEN) winner = turn; else { f[0] + f[1] ? sfx.ok() : sfx.bad(); vibrate(8); }
      }
      turn = 1 - turn;
    }
    if (!ctx.alive) return;
    const pg = hist[0].length;
    // Combien d'essais l'ordi aurait encore eu besoin ? (pour le score)
    let botTotal = hist[1].length;
    if (!duo && winner === 0) { // simulation silencieuse de la suite pour l'ordi
      let c2 = cand.slice(), n = hist[1].length, won = false;
      while (!won && n < 15) { const g = n === 0 ? botGuess(0) : R.pick(c2); const f = score(codes[1], g); n++; won = f[0] === LEN; c2 = c2.filter((c) => { const s = score(c, g); return s[0] === f[0] && s[1] === f[1]; }); }
      botTotal = n;
    }
    scene.replaceChildren(board(), h('div', { style: { display: 'flex', gap: '10px', alignItems: 'center' } }, h('span.faint', 'Codes :'), ...codes[0].map((c) => peg(c, 20)), h('span', ' · '), ...codes[1].map((c) => peg(c, 20))));
    if (winner === 0 || (duo && winner === 1)) { sfx.win(); ctx.flash('rgba(61,220,151,.3)'); vibrate([20, 30, 20]); } else sfx.bad();
    await ctx.wait(1800); if (!ctx.alive) return;
    if (duo) return ctx.end({ multi: true, win: true, emoji: '🔐', display: winner == null ? '🤝' : '🏆', title: winner == null ? 'Coffres inviolables : égalité' : `${names[winner]} craque le code !`, label: `${hist[0].length} + ${hist[1].length} essais` });
    const win = winner === 0, adv = win ? Math.max(1, botTotal - pg + 1) : 0;
    ctx.end({
      score: adv, record: true, board: expert ? 'expert' : null, win, emoji: win ? '🔓' : '🤖',
      display: win ? `+${adv}` : 'Perdu', title: win ? (adv >= 4 ? 'Cambrioleur de génie' : 'Code craqué !') : 'L’ordi a été plus rapide',
      label: win ? `Toi : ${pg} essai${pg > 1 ? 's' : ''} · l’ordi en aurait eu besoin de ${botTotal}` : `L’ordi a trouvé en ${hist[1].length} essais`,
      feats: [win && 'battu', win && pg <= 4 && 'rapide', win && expert && 'expert'].filter(Boolean),
    });
  },
};
