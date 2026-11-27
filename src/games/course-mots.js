import { h } from '../core/dom.js';
import { sfx, vibrate } from '../core/sfx.js';
import { makeRng, todayKey } from '../core/rng.js';

const PTS = { 3: 10, 4: 20, 5: 40, 6: 70, 7: 150, 8: 250 };
let dictP = null;
const loadDict = () => (dictP ||= Promise.all([fetch('data/mots.txt').then((r) => r.text()), fetch('data/tirages.json').then((r) => r.json())]).then(([t, tirages]) => ({ words: new Set(t.split('\n')), tirages })));
const count = (w) => { const c = {}; for (const ch of w) c[ch] = (c[ch] || 0) + 1; return c; };
const fits = (w, pool) => { const c = count(w); for (const k in c) if ((pool[k] || 0) < c[k]) return false; return true; };

export default {
  async start(ctx) {
    const mode = ctx.mode || 'classic';
    const loading = h('div.center-stage', h('p.muted', 'Chargement du dictionnaire…')); ctx.stage.append(loading);
    let dict; try { dict = await loadDict(); } catch { loading.replaceChildren(h('p', 'Dictionnaire indisponible. Recharge la page en ligne une première fois.')); return; }
    if (!ctx.alive) return; loading.remove();
    const R = mode === 'jour' ? makeRng('mots-' + todayKey()) : ctx.rng;
    const q = new URLSearchParams(location.hash.split('?')[1] || '');
    const ROUNDS = mode === 'marathon' ? 3 : 1, DURATION = mode === 'marathon' ? 45 : 60;
    const picks = Array.from({ length: ROUNDS }, (_, i) => (i === 0 && q.has('t') ? Number(q.get('t')) % dict.tirages.length : R.int(0, dict.tirages.length - 1)));
    const rivals = [['Léa', 1.1], ['Max', 0.8], ['Zoé', 0.6]].map(([name, k]) => ({ name, k, score: 0 }));
    let score = 0, totalFound = 0, gotFull = 0, bestCombo = 0, totalPossible = 0;
    const missedAll = [];

    const playRound = (ri) => new Promise((done) => {
      const ti = picks[ri], base = dict.tirages[ti], pool = count(base);
      const possible = [...dict.words].filter((w) => fits(w, pool));
      totalPossible += possible.length;
      const byLen = {}; possible.forEach((w) => (byLen[w.length] = (byLen[w.length] || 0) + 1));
      let letters = R.shuffle([...base]), picked = [], found = [], left = DURATION, combo = 0, lastT = 0, hints = 2, hinted = '';
      const word = h('div', { style: { minHeight: '60px', display: 'flex', gap: '6px', justifyContent: 'center', alignItems: 'center', fontSize: '34px', fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase' } });
      const tiles = h('div', { style: { display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap', maxWidth: '560px' } });
      const foundEl = h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'center', maxWidth: '560px', maxHeight: '16vh', overflowY: 'auto' } });
      const lens = h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'center' } });
      const board = h('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' } });
      const fb = h('p', { style: { minHeight: '1.5em', fontWeight: 700, textAlign: 'center' } });
      const hintBtn = h('button.btn', { onclick: hint }, `💡 ${hints}`);
      const wrap = h('div.center-stage', { style: { gap: '12px' } }, board, lens, word, fb, tiles,
        h('div.btn-row', h('button.btn', { onclick: () => { picked = []; paint(); } }, '⌫'), h('button.btn', { onclick: () => { letters = R.shuffle(letters); picked = []; sfx.click(); paint(); } }, '🔀'), hintBtn, h('button.btn.btn-primary', { onclick: submit }, 'Valider')),
        foundEl);
      ctx.stage.append(wrap);
      const say = (t, c) => { fb.textContent = t; fb.style.color = c; };

      function paint() {
        word.replaceChildren(...(picked.length ? picked.map((i) => h('span', letters[i])) : [h('span.faint', { style: { fontSize: '18px', letterSpacing: 0, textTransform: 'none', fontWeight: 500 } }, hinted ? `Indice : ${hinted.toUpperCase()}…` : 'Touche les lettres…')]));
        tiles.replaceChildren(...letters.map((l, i) => h('button', { disabled: picked.includes(i), onclick: () => { picked.push(i); sfx.tap(); paint(); },
          style: { width: 'clamp(40px,11vw,64px)', aspectRatio: '1', borderRadius: '16px', border: 0, fontSize: 'clamp(22px,6vw,32px)', fontWeight: 800, textTransform: 'uppercase', color: '#1b1450', background: 'linear-gradient(180deg,#fff,#dcd6ff)', boxShadow: '0 6px 0 #9b8cff, 0 10px 20px rgba(0,0,0,.3)', opacity: picked.includes(i) ? 0.25 : 1, transform: picked.includes(i) ? 'translateY(4px)' : '' } }, l)));
        foundEl.replaceChildren(...found.map((w) => h('span.chip', { style: { color: 'var(--text)' } }, w.toUpperCase(), h('small.faint', ' +' + PTS[w.length]))));
        // Compteur par longueur : combien il en reste à trouver
        lens.replaceChildren(...Object.keys(byLen).sort().map((L) => { const f = found.filter((w) => w.length === Number(L)).length; return h('span.chip', { style: { fontSize: '12px', opacity: f >= byLen[L] ? 0.5 : 1, borderColor: f >= byLen[L] ? 'var(--ok)' : '' } }, `${L} lettres ${f}/${byLen[L]}`); }));
        const all = [{ name: 'Toi', score, me: true }, ...rivals].sort((a, b) => b.score - a.score);
        board.replaceChildren(...all.map((p, i) => h('span.chip', { style: p.me ? { background: 'var(--brand-1)', color: '#fff', borderColor: 'transparent' } : {} }, `${i + 1}. ${p.name} ${p.score}`)));
        hintBtn.textContent = `💡 ${hints}`; hintBtn.disabled = !hints;
      }
      function hint() {
        if (!hints) return;
        const cand = possible.filter((w) => !found.includes(w) && w.length >= 5).sort((a, b) => b.length - a.length);
        if (!cand.length) return say('Plus d’indice utile', 'var(--warn)');
        const w = cand[0]; hints--; hinted = w.slice(0, 2) + ` (${w.length} lettres)`; score = Math.max(0, score - 10);
        say(`Indice : un mot de ${w.length} lettres commence par ${w.slice(0, 2).toUpperCase()} (−10)`, '#ffd23f'); sfx.click(); paint();
      }
      function submit() {
        const w = picked.map((i) => letters[i]).join('');
        picked = [];
        if (w.length < 3) { say('3 lettres minimum', 'var(--warn)'); sfx.bad(); }
        else if (found.includes(w)) { say('Déjà trouvé', 'var(--warn)'); sfx.bad(); }
        else if (dict.words.has(w)) {
          const now = performance.now(); combo = now - lastT < 5000 ? combo + 1 : 1; lastT = now; bestCombo = Math.max(bestCombo, combo);
          const mult = combo >= 5 ? 2 : combo >= 3 ? 1.5 : 1; const gain = Math.round(PTS[w.length] * mult);
          found.unshift(w); score += gain; totalFound++;
          if (w.length >= 6) { left += 5; ctx.pop('+5 s ⏱️', ctx.stage.clientWidth / 2, ctx.stage.clientHeight * 0.18, '#4cc9f0', 22); }
          if (w.length === base.length) { gotFull++; ctx.flash('rgba(61,220,151,.3)'); sfx.win(); }
          if (hinted && w.startsWith(hinted.slice(0, 2))) hinted = '';
          say(`${w.toUpperCase()} +${gain}${mult > 1 ? ` (combo ×${mult})` : ''}${w.length === base.length ? ' · MOT COMPLET !' : ''}`, 'var(--ok)'); sfx.ok(); vibrate(15);
          const r = word.getBoundingClientRect(), s = ctx.stage.getBoundingClientRect();
          ctx.pop(`+${gain}`, r.left - s.left + r.width / 2, r.top - s.top, mult > 1 ? '#ffd23f' : '#3ddc97', mult > 1 ? 32 : 26);
        } else { combo = 0; say(`${w.toUpperCase()} n’est pas dans le dictionnaire`, 'var(--bad)'); sfx.bad(); word.animate([{ transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'none' }], { duration: 200 }); }
        paint();
      }
      keyFn = (e) => {
        if (e.key === 'Enter') return submit();
        if (e.key === 'Backspace') { picked.pop(); return paint(); }
        const k = e.key.toLowerCase(); const i = letters.findIndex((l, j) => l === k && !picked.includes(j));
        if (i >= 0) { picked.push(i); sfx.tap(); paint(); }
      };
      const clock = () => ctx.hud({ round: ROUNDS > 1 ? `Tirage ${ri + 1}/${ROUNDS}` : null, time: `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`, combo: combo >= 3 ? `🔥 ×${combo >= 5 ? 2 : 1.5}` : null });
      clock();
      const iv = ctx.interval(() => {
        left--;
        rivals.forEach((r) => { if (R.next() < 0.16 * r.k) r.score += R.pick([10, 10, 20, 20, 40, 70]); });
        clock(); if (left <= 5 && left > 0) sfx.tick();
        paint();
        if (left <= 0) {
          clearInterval(iv); keyFn = () => {};
          missedAll.push({ base, missed: possible.filter((w) => !found.includes(w)).sort((a, b) => b.length - a.length).slice(0, 6) });
          if (ri < ROUNDS - 1) { wrap.replaceChildren(h('div.big-msg', 'Tirage suivant !'), h('p.muted', `${found.length} mots · ${score} pts au total`)); sfx.go(); ctx.timeout(() => { wrap.remove(); done(); }, 1600); }
          else { wrap.remove(); done(); }
        }
      }, 1000);
      paint();
    });
    let keyFn = () => {};
    ctx.on(window, 'keydown', (e) => keyFn(e));
    for (let i = 0; i < ROUNDS; i++) { await playRound(i); if (!ctx.alive) return; }
    const rank = 1 + rivals.filter((r) => r.score > score).length;
    ctx.end({
      score, display: `${score} pts`, emoji: rank === 1 ? '🏆' : '🔤', win: rank === 1, board: mode === 'classic' ? null : mode,
      title: rank === 1 ? 'Champion·ne des mots !' : `${rank}e place`,
      label: `${totalFound} mot${totalFound > 1 ? 's' : ''} sur ${totalPossible} possibles${bestCombo >= 3 ? ` · combo max ${bestCombo}` : ''}`,
      feats: [gotFull && 'complet', totalFound >= 20 && 'vingt', bestCombo >= 5 && 'combo'].filter(Boolean),
      extra: h('div', missedAll.map((m) => h('div', { style: { marginBottom: '8px' } }, h('p.faint', { style: { marginBottom: '6px' } }, `Mot complet : ${m.base.toUpperCase()}. Tu as raté par exemple :`), h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'center' } }, m.missed.map((w) => h('span.chip', w.toUpperCase())))))),
    });
  },
};
