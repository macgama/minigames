import { h } from '../core/dom.js';
import { sfx, vibrate } from '../core/sfx.js';
import { rng } from '../core/rng.js';

const PTS = { 3: 10, 4: 20, 5: 40, 6: 70, 7: 150 };
const DURATION = 60;
let dictP = null;
const loadDict = () => (dictP ||= Promise.all([fetch('/data/mots.txt').then((r) => r.text()), fetch('/data/tirages.json').then((r) => r.json())]).then(([t, tirages]) => ({ words: new Set(t.split('\n')), tirages })));
const count = (w) => { const c = {}; for (const ch of w) c[ch] = (c[ch] || 0) + 1; return c; };
const fits = (w, pool) => { const c = count(w); for (const k in c) if ((pool[k] || 0) < c[k]) return false; return true; };

export default {
  async start(ctx) {
    const loading = h('div.center-stage', h('p.muted', 'Chargement du dictionnaire…')); ctx.stage.append(loading);
    let dict; try { dict = await loadDict(); } catch { loading.replaceChildren(h('p', 'Dictionnaire indisponible. Recharge la page en ligne une première fois.')); return; }
    if (!ctx.alive) return; loading.remove();
    const q = new URLSearchParams(location.hash.split('?')[1] || '');
    const ti = q.has('t') ? Number(q.get('t')) % dict.tirages.length : rng.int(0, dict.tirages.length - 1);
    const base = dict.tirages[ti];
    const pool = count(base);
    const possible = [...dict.words].filter((w) => fits(w, pool));
    let letters = rng.shuffle([...base]), picked = [], found = [], score = 0, left = DURATION;
    const rivals = [['Léa', 1.1], ['Max', 0.8], ['Zoé', 0.6]].map(([name, k]) => ({ name, k, score: 0 }));

    const word = h('div', { style: { minHeight: '64px', display: 'flex', gap: '6px', justifyContent: 'center', alignItems: 'center', fontSize: '34px', fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase' } });
    const tiles = h('div', { style: { display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap', maxWidth: '560px' } });
    const foundEl = h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'center', maxWidth: '560px', maxHeight: '22vh', overflowY: 'auto' } });
    const board = h('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' } });
    const fb = h('p', { style: { minHeight: '1.5em', fontWeight: 700 } });
    ctx.stage.append(h('div.center-stage', { style: { gap: '14px' } }, board, word, fb, tiles,
      h('div.btn-row', h('button.btn', { onclick: () => { picked = []; paint(); } }, 'Effacer'), h('button.btn', { onclick: () => { letters = rng.shuffle(letters); picked = []; sfx.click(); paint(); } }, '🔀 Mélanger'), h('button.btn.btn-primary', { onclick: submit }, 'Valider')),
      foundEl));

    function paint() {
      word.replaceChildren(...(picked.length ? picked.map((i) => h('span', letters[i])) : [h('span.faint', { style: { fontSize: '18px', letterSpacing: 0, textTransform: 'none', fontWeight: 500 } }, 'Touche les lettres…')]));
      tiles.replaceChildren(...letters.map((l, i) => h('button', { disabled: picked.includes(i), onclick: () => { picked.push(i); sfx.tap(); paint(); },
        style: { width: 'clamp(42px,11vw,64px)', aspectRatio: '1', borderRadius: '16px', border: 0, fontSize: 'clamp(22px,6vw,32px)', fontWeight: 800, textTransform: 'uppercase', color: '#1b1450', background: 'linear-gradient(180deg,#fff,#dcd6ff)', boxShadow: '0 6px 0 #9b8cff, 0 10px 20px rgba(0,0,0,.3)', opacity: picked.includes(i) ? 0.25 : 1, transform: picked.includes(i) ? 'translateY(4px)' : '' } }, l)));
      foundEl.replaceChildren(...found.map((w) => h('span.chip', { style: { color: 'var(--text)' } }, w.toUpperCase(), h('small.faint', ' +' + PTS[w.length]))));
      const all = [{ name: 'Toi', score, me: true }, ...rivals].sort((a, b) => b.score - a.score);
      board.replaceChildren(...all.map((p, i) => h('span.chip', { style: p.me ? { background: 'var(--brand-1)', color: '#fff', borderColor: 'transparent' } : {} }, `${i + 1}. ${p.name} ${p.score}`)));
    }
    function submit() {
      const w = picked.map((i) => letters[i]).join('');
      picked = [];
      if (w.length < 3) { fb.textContent = '3 lettres minimum'; fb.style.color = 'var(--warn)'; sfx.bad(); }
      else if (found.includes(w)) { fb.textContent = 'Déjà trouvé'; fb.style.color = 'var(--warn)'; sfx.bad(); }
      else if (dict.words.has(w)) { found.unshift(w); score += PTS[w.length]; fb.textContent = `${w.toUpperCase()} +${PTS[w.length]}${w.length === 7 ? ' · MOT COMPLET !' : ''}`; fb.style.color = 'var(--ok)'; sfx.ok(); vibrate(15); }
      else { fb.textContent = `${w.toUpperCase()} n’est pas dans le dictionnaire`; fb.style.color = 'var(--bad)'; sfx.bad(); word.classList.remove('anim-shake'); void word.offsetWidth; word.classList.add('anim-shake'); }
      paint();
    }
    ctx.on(window, 'keydown', (e) => {
      if (e.key === 'Enter') return submit();
      if (e.key === 'Backspace') { picked.pop(); return paint(); }
      const k = e.key.toLowerCase(); const i = letters.findIndex((l, j) => l === k && !picked.includes(j));
      if (i >= 0) { picked.push(i); sfx.tap(); paint(); }
    });
    ctx.hud({ time: '1:00' });
    ctx.interval(() => {
      left--;
      rivals.forEach((r) => { if (Math.random() < 0.16 * r.k) r.score += rng.pick([10, 10, 20, 20, 40, 70]); });
      ctx.hud({ time: `0:${String(left).padStart(2, '0')}` }); if (left <= 5 && left > 0) sfx.tick();
      paint();
      if (left <= 0) {
        const rank = 1 + rivals.filter((r) => r.score > score).length;
        const missed = possible.filter((w) => !found.includes(w)).sort((a, b) => b.length - a.length).slice(0, 8);
        ctx.end({ score, display: `${score} pts`, emoji: rank === 1 ? '🏆' : '🔤', win: rank === 1, title: rank === 1 ? 'Champion·ne des mots !' : `${rank}e place`, label: `${found.length} mot${found.length > 1 ? 's' : ''} trouvé${found.length > 1 ? 's' : ''} sur ${possible.length} possibles`,
          extra: h('div', h('p.faint', { style: { marginBottom: '8px' } }, `Le mot complet : ${base.toUpperCase()}. Tu as raté par exemple :`), h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'center' } }, missed.map((w) => h('span.chip', w.toUpperCase())))),
          share: `🔤 Course de Mots : ${score} pts avec ${found.length} mots. Même tirage pour toi : https://minigames.manigames.online/#/jeu/course-mots?t=${ti}` });
      }
    }, 1000);
    paint();
  },
};
