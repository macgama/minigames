import { h } from '../core/dom.js';
import { sfx, vibrate } from '../core/sfx.js';
import { PCOLORS } from '../core/players.js';

const RANGES = [50, 100, 200, 500, 1000];

export default {
  start(ctx) {
    const R = ctx.rng, mode = ctx.mode || 'solo';
    const solo = mode === 'solo' || mode === 'chaud', hot = mode === 'chaud', bot = mode === 'bot';
    const names = bot ? ['Toi', 'L’ordi'] : ['Joueur 1', 'Joueur 2'];
    const wins = [0, 0];
    let total = 0, firstTry = false, logic = false;
    const head = h('div', { style: { textAlign: 'center' } });
    const big = h('div', { style: { fontSize: '64px', fontWeight: 900, minHeight: '76px', fontVariantNumeric: 'tabular-nums' } });
    const hint = h('div', { style: { fontSize: '24px', fontWeight: 800, minHeight: '32px' } });
    const range = h('div', { style: { width: 'min(92vw,480px)', height: '14px', borderRadius: '8px', background: 'rgba(255,255,255,.08)', position: 'relative', overflow: 'hidden' } });
    const log = h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'center', maxWidth: '520px', minHeight: '32px' } });
    const pad = h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px', width: 'min(80vw,300px)' } });
    ctx.stage.append(h('div.center-stage', { style: { gap: '12px' } }, head, range, big, hint, log, pad));
    let entry = '', onSubmit = null;
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', 'OK'];
    pad.append(...keys.map((k) => h('button.btn', { style: { minHeight: '54px', fontSize: '22px', fontWeight: 800, background: k === 'OK' ? 'var(--brand-grad)' : '' }, onclick: () => press(k) }, k)));
    const press = (k) => { if (!onSubmit) return; if (k === '⌫') entry = entry.slice(0, -1); else if (k === 'OK') { if (entry) { const v = +entry; entry = ''; onSubmit(v); } } else if (entry.length < 4) entry += k; big.textContent = entry || '?'; sfx.tick(); };
    ctx.on(window, 'keydown', (e) => { if (/^[0-9]$/.test(e.key)) press(e.key); if (e.key === 'Backspace') press('⌫'); if (e.key === 'Enter') press('OK'); });
    const paintRange = (lo, hi, max) => range.replaceChildren(h('i', { style: { position: 'absolute', top: 0, bottom: 0, left: `${((lo - 1) / max) * 100}%`, width: `${((hi - lo + 1) / max) * 100}%`, background: 'var(--brand-grad)', transition: 'all .3s' } }));

    // Une manche : renvoie le nombre d'essais (solo) ou l'indice du gagnant (duel)
    const round = (max, starter) => new Promise((res) => {
      const secret = R.int(1, max); let lo = 1, hi = max, tries = 0, turn = starter, lastDist = null;
      log.replaceChildren(); hint.textContent = ''; big.textContent = '?'; paintRange(lo, hi, max);
      const say = (t, c) => { hint.textContent = t; hint.style.color = c; hint.animate([{ transform: 'scale(1.3)' }, { transform: 'none' }], { duration: 200 }); };
      const handle = (v, who) => {
        if (v < 1 || v > max) { say(`Entre 1 et ${max} !`, 'var(--warn)'); return; }
        tries++;
        if (v === secret) {
          onSubmit = null; say(`🎉 C’était ${secret} !`, 'var(--ok)'); big.textContent = secret; sfx.win(); ctx.flash('rgba(61,220,151,.25)'); vibrate([20, 30, 20]);
          log.append(h('span.chip', { style: { borderColor: 'var(--ok)' } }, `${v} ✓`));
          return ctx.timeout(() => res(solo ? tries : who), 1500);
        }
        if (hot) {
          const d = Math.abs(v - secret); const t = lastDist == null ? (d <= max * 0.1 ? '🔥 Chaud' : d <= max * 0.3 ? '🌤️ Tiède' : '🥶 Froid') : d < lastDist ? '🔥 Plus chaud' : d > lastDist ? '🥶 Plus froid' : '😐 Pareil';
          lastDist = d; say(t, t.includes('chaud') || t.includes('Chaud') ? '#ff9f43' : '#4cc9f0'); log.append(h('span.chip', `${v} ${t.split(' ')[0]}`));
        } else {
          if (v < secret) lo = Math.max(lo, v + 1); else hi = Math.min(hi, v - 1);
          say(v < secret ? '⬆️ Plus grand' : '⬇️ Plus petit', v < secret ? '#3ddc97' : '#ff9f43'); paintRange(lo, hi, max);
          log.append(h('span.chip', `${v} ${v < secret ? '⬆' : '⬇'}`));
        }
        sfx.pop();
        if (!solo) { turn = 1 - turn; nextTurn(); }
      };
      const nextTurn = () => {
        head.replaceChildren(h('div.faint', { style: { fontSize: '12px', fontWeight: 700, letterSpacing: '.1em' } }, `ENTRE 1 ET ${max}`), h('div', { style: { display: 'flex', gap: '18px', justifyContent: 'center', fontSize: '22px', fontWeight: 800 } }, names.map((n, k) => h('span', { style: { color: PCOLORS[k], opacity: k === turn ? 1 : 0.4 } }, `${n} ${wins[k]}`))));
        if (bot && turn === 1) {
          onSubmit = null; pad.style.opacity = 0.4;
          // L'ordi coupe l'intervalle en deux… avec un peu d'hésitation
          ctx.timeout(() => { const v = Math.max(lo, Math.min(hi, Math.round((lo + hi) / 2 + R.float(-0.25, 0.25) * (hi - lo)))); big.textContent = v; handle(v, 1); }, 1100);
        } else { pad.style.opacity = 1; onSubmit = (v) => handle(v, turn); }
      };
      if (solo) { head.replaceChildren(h('div.faint', { style: { fontSize: '12px', fontWeight: 700, letterSpacing: '.1em' } }, `NOMBRE ${idx + 1}/5 · ENTRE 1 ET ${max}`), h('div.big-msg', { style: { fontSize: '24px' } }, `${total} pts`)); onSubmit = (v) => handle(v, 0); }
      else nextTurn();
    });
    let idx = 0;
    const play = async () => {
      if (solo) {
        for (idx = 0; idx < 5 && ctx.alive; idx++) {
          const max = RANGES[idx]; const opt = Math.ceil(Math.log2(max + 1));
          const tries = await round(max); if (!ctx.alive) return;
          if (tries === 1) firstTry = true; if (max === 1000 && tries <= 10) logic = true;
          const pts = Math.max(10, Math.round(150 - (tries - (hot ? opt + 2 : opt)) * 20)); total += Math.min(150, pts);
          ctx.pop(`+${Math.min(150, pts)} (${tries} essai${tries > 1 ? 's' : ''})`, ctx.stage.clientWidth / 2, ctx.stage.clientHeight * 0.25, '#ffd23f', 24);
        }
        if (!ctx.alive) return;
        return ctx.end({ score: total, display: `${total} pts`, emoji: '🔢', board: hot ? 'chaud' : null, title: total >= 600 ? 'Pure logique' : total >= 400 ? 'Bien raisonné' : 'Un peu au hasard…', label: '5 nombres, de 1–50 à 1–1000', feats: [firstTry && 'devin', logic && 'logique'].filter(Boolean) });
      }
      let starter = 0;
      while (ctx.alive && wins[0] < 3 && wins[1] < 3) { const w = await round(100, starter); if (!ctx.alive) return; wins[w]++; starter = 1 - starter; }
      if (!ctx.alive) return;
      const w = wins[0] > wins[1] ? 0 : 1;
      ctx.end({ score: bot ? Math.max(0, wins[0] - wins[1]) : null, record: bot, board: bot ? 'bot' : null, multi: !bot, display: `${wins[0]} – ${wins[1]}`, emoji: w === 0 || !bot ? '🏆' : '🤖', win: bot ? w === 0 : true, title: `${names[w]} gagne !`, label: 'Premier à 3 nombres trouvés', feats: [bot && wins[0] === 3 && wins[1] === 0 && 'duel', firstTry && 'devin'].filter(Boolean) });
    };
    play();
  },
};
