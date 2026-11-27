/** Joueurs locaux : couleurs, noms, écran de configuration réutilisable. */
import { h } from './dom.js';
import { store } from './store.js';
export const PCOLORS = ['#4cc9f0', '#ff5c7a', '#3ddc97', '#ffc857', '#b388ff', '#ff9f43', '#f5f5f5', '#00d1b2'];
export const PEMOJI = ['🦊', '🐼', '🐸', '🦁', '🐙', '🐯', '🐨', '🐵'];
/**
 * Affiche un sélecteur de joueurs et résout avec [{name, color, emoji}].
 */
export function playerSetup(container, { min = 2, max = 8, title = 'Qui joue ?', cta = 'C’est parti' } = {}) {
  return new Promise((resolve) => {
    const saved = store.get('players', []);
    let n = Math.min(max, Math.max(min, store.get('playerCount', min)));
    const names = Array.from({ length: 8 }, (_, i) => saved[i] || `Joueur ${i + 1}`);
    const list = h('div.players-list');
    const count = h('b', String(n));
    const render = () => {
      count.textContent = n;
      list.replaceChildren(...Array.from({ length: n }, (_, i) => h('div.player-row',
        h('span.player-dot', { style: { background: PCOLORS[i] } }), h('span', { style: { fontSize: '22px' } }, PEMOJI[i]),
        h('input.input', { value: names[i], maxLength: 14, style: { flex: 1 }, 'aria-label': `Nom du joueur ${i + 1}`, oninput: (e) => { names[i] = e.target.value; } }))));
    };
    const card = h('div.card',
      h('h2', title),
      h('div.stepper', { style: { justifyContent: 'center' } },
        h('button.btn.btn-icon', { 'aria-label': 'Moins de joueurs', onclick: () => { if (n > min) { n--; render(); } } }, '−'), count,
        h('button.btn.btn-icon', { 'aria-label': 'Plus de joueurs', onclick: () => { if (n < max) { n++; render(); } } }, '+')),
      list,
      h('button.btn.btn-primary.btn-lg.btn-block', { onclick: () => {
        store.set('players', names); store.set('playerCount', n); ov.remove();
        resolve(Array.from({ length: n }, (_, i) => ({ id: i, name: names[i].trim() || `Joueur ${i + 1}`, color: PCOLORS[i], emoji: PEMOJI[i] })));
      } }, cta));
    const ov = h('div.overlay', card); container.append(ov); render();
  });
}
