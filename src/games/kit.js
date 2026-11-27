/** Petits outils partagés par les nouveaux jeux. */
import { h } from '../core/dom.js';

/** Écran « passe le téléphone à… » ; résout quand le joueur est prêt. */
export function passTo(scene, p, sub = 'Les autres ne regardent pas 👀', cta = 'C’est moi') {
  return new Promise((res) => scene.replaceChildren(h('div.card', { style: { textAlign: 'center' } },
    h('div.tile', { style: { background: p.color, margin: '0 auto' } }, p.emoji),
    h('h2', `Passe à ${p.name}`), h('p.muted', sub),
    h('button.btn.btn-primary.btn-lg.btn-block', { onclick: res }, cta))));
}

/** Grille de gros boutons de réponse. */
export function choiceGrid(items, onPick, { cols = 2, label = (x) => String(x), style = () => ({}) } = {}) {
  return h('div', { style: { display: 'grid', gridTemplateColumns: `repeat(${cols},1fr)`, gap: '10px', width: 'min(92vw,520px)' } },
    items.map((it, i) => h('button.btn', { style: { minHeight: '60px', fontSize: '18px', fontWeight: 700, padding: '10px', whiteSpace: 'normal', lineHeight: 1.2, ...style(it, i) }, onclick: (e) => onPick(it, e.currentTarget, i) }, label(it))));
}

/** Classement final (multi-joueurs locaux). */
export function scoreTable(players, key = 'pts', unit = 'pts') {
  return h('div', { style: { display: 'grid', gap: '6px', width: '100%' } }, [...players].sort((a, b) => b[key] - a[key]).map((p, i) =>
    h('div', { style: { display: 'flex', justifyContent: 'space-between', gap: '10px', padding: '8px 12px', borderRadius: '12px', background: i === 0 ? 'rgba(255,210,63,.14)' : 'rgba(255,255,255,.05)' } },
      h('span', `${['🥇', '🥈', '🥉'][i] || `${i + 1}.`} ${p.emoji || ''} ${p.name}`), h('b', `${p[key]} ${unit}`))));
}

/** Position d'un élément dans la scène (pour ctx.pop). */
export const posIn = (stage, el) => { const r = el.getBoundingClientRect(), s = stage.getBoundingClientRect(); return [r.left - s.left + r.width / 2, r.top - s.top]; };

export const fr = (v, d = 1) => v.toFixed(d).replace('.', ',');
