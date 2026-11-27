import { h } from '../core/dom.js';
import { sfx, vibrate } from '../core/sfx.js';
import { playerSetup } from '../core/players.js';
import { scoreTable } from './kit.js';

const PTS = { 3: 10, 4: 20, 5: 40, 6: 70, 7: 100, 8: 150 };
const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]/g, '');
let dictP = null;
const loadDict = () => (dictP ||= fetch('data/mots.txt').then((r) => r.text()).then((t) => { const words = t.split('\n').filter(Boolean); const by = {}; for (const w of words) (by[w[0]] ||= []).push(w); return { set: new Set(words), by }; }));

export default {
  async start(ctx) {
    const mode = ctx.mode || 'solo', R = ctx.rng;
    if (mode === 'soiree') return soiree(ctx);
    const wait = h('div.center-stage', h('p.muted', 'Chargement du dictionnaire…')); ctx.stage.append(wait);
    let D; try { D = await loadDict(); } catch { wait.replaceChildren(h('p', 'Dictionnaire indisponible hors ligne. Recharge la page en ligne une fois.')); return; }
    if (!ctx.alive) return; wait.remove();
    const bot = mode === 'bot';
    const chainEl = h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'center', maxWidth: '520px', maxHeight: '30vh', overflowY: 'auto' } });
    const need = h('div', { style: { fontSize: '20px', fontWeight: 800 } });
    const input = h('input', { type: 'text', autocomplete: 'off', autocapitalize: 'none', spellcheck: false, enterkeyhint: 'send', style: { fontSize: '26px', fontWeight: 800, textAlign: 'center', width: 'min(60vw,260px)', minWidth: 0, padding: '10px', borderRadius: '14px', border: '2px solid var(--border-strong)', background: 'rgba(255,255,255,.06)', color: 'inherit', textTransform: 'uppercase' } });
    const go = h('button.btn.btn-primary.btn-lg', 'OK');
    const msg = h('div', { style: { minHeight: '24px', fontWeight: 700 } });
    const bar = h('div.bar', { style: { width: 'min(84vw,320px)' } }, h('i'));
    const head = h('div', { style: { fontWeight: 800, fontSize: '18px' } });
    ctx.stage.append(h('div.center-stage', { style: { gap: '12px', justifyContent: 'flex-start', paddingTop: '16px' } }, head, chainEl, need, bar, h('form', { style: { display: 'flex', gap: '8px' }, onsubmit: (e) => { e.preventDefault(); submit(); } }, input, go), msg));
    const say = (t, c) => { msg.textContent = t; msg.style.color = c || ''; };
    const chip = (w, who) => h('span.chip', { style: { borderColor: who === 1 ? '#ff5c7a' : '#4cc9f0', animation: 'pop .25s var(--spring) both' } }, h('b', w.slice(0, -1).toUpperCase()), h('b', { style: { color: '#ffd23f' } }, w.slice(-1).toUpperCase()));
    let used, last, left, max, n, score = 0, longs = 0, longest = 0, turn = 0, active = false, roundEnd = null;
    const wins = [0, 0];
    const startChain = () => {
      used = new Set(); chainEl.replaceChildren();
      let w; do w = R.pick(D.by[R.pick('bcdfglmprst'.split(''))]); while (w.length !== 5);
      used.add(w); last = w.at(-1); chainEl.append(chip(w, 2)); n = 0;
      need.textContent = `Un mot qui commence par « ${last.toUpperCase()} »`;
    };
    const play = (w, who) => {
      used.add(w); last = w.at(-1); chainEl.append(chip(w, who)); chainEl.scrollTop = 1e6; n++;
      need.textContent = `Un mot qui commence par « ${last.toUpperCase()} »`;
    };
    const submit = () => {
      if (!active || (bot && turn !== 0)) return;
      const w = norm(input.value); input.value = '';
      if (w.length < 3) return say('3 lettres minimum', 'var(--warn)');
      if (w[0] !== last) { sfx.bad(); return say(`Ça doit commencer par ${last.toUpperCase()} !`, 'var(--bad)'); }
      if (used.has(w)) { sfx.bad(); return say('Déjà utilisé !', 'var(--bad)'); }
      if (!D.set.has(w)) { sfx.bad(); ctx.shake(4); return say('Pas dans le dictionnaire', 'var(--bad)'); }
      const L = Math.min(8, w.length); vibrate(8);
      if (!bot) {
        const pts = PTS[L] + n * 2; score += pts; if (L >= 7) longs++; longest = Math.max(longest, n + 1);
        left = Math.min(max, left + (L - 2)); sfx.ok(); say(`+${pts} · +${L - 2} s`, 'var(--ok)');
        play(w, 0); ctx.hud({ pts: `${score} pts`, chain: `🔗 ${n}` });
      } else { sfx.ok(); say(''); play(w, 0); turn = 1; left = max; botTurn(); }
    };
    const botTurn = () => {
      head.textContent = '🤖 L’ordi cherche…'; input.disabled = true;
      ctx.timeout(() => {
        if (!active) return;
        const miss = 0.04 + n * 0.012 + (['k', 'q', 'w', 'x', 'y', 'z', 'h'].includes(last) ? 0.25 : 0);
        const opts = (D.by[last] || []).filter((x) => !used.has(x) && x.length >= 4 && x.length <= 7);
        if (!opts.length || R.float(0, 1) < miss) { left = 0; return; } // l'ordi sèche : le chrono finira la manche
        play(R.pick(opts), 1); sfx.pop(); turn = 0; left = max; head.textContent = `Toi ${wins[0]} – ${wins[1]} Ordi · à toi !`; input.disabled = false; input.focus();
      }, R.int(900, 2400));
    };
    ctx.interval(() => {
      if (!active) return;
      left -= 0.05; bar.firstChild.style.width = `${(Math.max(0, left) / max) * 100}%`; bar.firstChild.style.background = left < 3 ? 'var(--bad)' : '';
      if (!bot) ctx.hud({ time: `${Math.max(0, Math.ceil(left))} s` });
      if (left <= 0) { active = false; roundEnd?.(); }
    }, 50);
    if (!bot) {
      max = 45; left = 30; startChain(); active = true; head.textContent = 'Enchaîne les mots !'; ctx.hud({ pts: '0 pts', chain: '🔗 0' }); input.focus();
      await new Promise((r) => (roundEnd = r)); if (!ctx.alive) return;
      sfx.win();
      return ctx.end({ score, display: `${score} pts`, emoji: '🔗', board: null, title: score >= 380 ? 'Dictionnaire vivant' : score >= 220 ? 'Belle chaîne' : 'La chaîne s’est vite cassée', label: `${n} mots enchaînés · ${longs} mot${longs > 1 ? 's' : ''} de 7 lettres ou plus`, feats: [n >= 15 && 'longue', longs >= 5 && 'sept'].filter(Boolean) });
    }
    // Contre l'ordi : premier à 3 manches
    max = 12; let starter = 0;
    while (ctx.alive && wins[0] < 3 && wins[1] < 3) {
      startChain(); turn = starter; left = max; active = true; input.disabled = false;
      head.textContent = `Toi ${wins[0]} – ${wins[1]} Ordi · ${turn === 0 ? 'à toi !' : ''}`;
      if (turn === 1) botTurn(); else input.focus();
      await new Promise((r) => (roundEnd = r)); if (!ctx.alive) return;
      const loser = turn; wins[1 - loser]++;
      if (loser === 0) { sfx.bad(); ctx.shake(6); say(`Temps écoulé ! Manche pour l’ordi`, 'var(--bad)'); } else { sfx.win(); ctx.flash('rgba(61,220,151,.25)'); say(`L’ordi sèche sur « ${last.toUpperCase()} » ! Manche pour toi`, 'var(--ok)'); }
      ctx.hud({ score: `${wins[0]} – ${wins[1]}` });
      starter = 1 - starter; await ctx.wait(2200);
    }
    if (!ctx.alive) return;
    const win = wins[0] > wins[1];
    ctx.end({ score: wins[0], record: true, board: 'bot', win, emoji: win ? '🏆' : '🤖', display: `${wins[0]} – ${wins[1]}`, title: win ? 'Plus de vocabulaire que la machine !' : 'L’ordi a eu le dernier mot', label: 'Premier à 3 manches', feats: [win && 'bot'].filter(Boolean) });
  },
};

// Soirée : on dit son mot à voix haute, puis on touche sa dernière lettre
async function soiree(ctx) {
  const players = await playerSetup(ctx.stage, { min: 2, max: 8, title: 'Qui joue ?', cta: 'Lancer la chaîne 🔗' }); if (!ctx.alive) return;
  players.forEach((p) => { p.pts = 0; p.out = false; });
  const R = ctx.rng; let last = R.pick('bcdfmprst'.split('')), i = 0, count = 0, roundN = 1;
  const scene = h('div.center-stage', { style: { gap: '12px' } }); ctx.stage.append(scene);
  while (ctx.alive) {
    const alive = players.filter((p) => !p.out);
    if (alive.length <= 1) break;
    const p = alive[i % alive.length];
    const T = Math.max(4, 10 - count * 0.25);
    const res = await new Promise((done) => {
      const bar = h('div.bar', { style: { width: 'min(84vw,360px)' } }, h('i', { style: { width: '100%' } }));
      const letters = h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '5px', width: 'min(94vw,420px)' } }, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((L) => h('button.btn', { style: { minHeight: '42px', padding: 0, fontWeight: 800 }, onclick: () => done(L.toLowerCase()) }, L)));
      scene.replaceChildren(h('div', { style: { fontWeight: 800, color: p.color } }, `${p.emoji} ${p.name}`), h('div.faint', `Mot n°${count + 1} · ${T.toFixed(0)} s`),
        h('div', { style: { fontSize: '76px', fontWeight: 900, lineHeight: 1 } }, last.toUpperCase()), h('p.muted', { style: { margin: 0 } }, 'Dis ton mot à voix haute, puis touche sa DERNIÈRE lettre'), bar, letters,
        h('button.btn', { onclick: () => done(null) }, '❌ Raté / contesté'));
      const t0 = performance.now();
      const iv = setInterval(() => { const k = 1 - (performance.now() - t0) / 1000 / T; bar.firstChild.style.width = `${Math.max(0, k) * 100}%`; if (k <= 0) { clearInterval(iv); done(null); } }, 50);
      ctx.onCleanup(() => clearInterval(iv)); const d0 = done; done = (v) => { clearInterval(iv); d0(v); };
    });
    if (!ctx.alive) return;
    if (res) { last = res; p.pts++; count++; i++; sfx.ok(); vibrate(8); }
    else { p.out = true; sfx.bad(); ctx.shake(6); vibrate([40, 40, 40]); scene.replaceChildren(h('div.big-msg', `💥 ${p.emoji} ${p.name} est éliminé·e`)); await ctx.wait(1300); roundN++; }
  }
  if (!ctx.alive) return;
  const w = players.find((p) => !p.out) || players[0];
  ctx.end({ multi: true, win: true, emoji: '🔗', display: w.emoji, title: `${w.name} a le dernier mot !`, label: `${count} mots dans la chaîne`, extra: scoreTable(players, 'pts', 'mots') });
}
