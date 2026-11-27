/** Pages : accueil (hub), offres, statistiques. */
import { h, clear } from './core/dom.js';
import { GAMES, CATS } from './games/index.js';
import { getBest, store, totalPlays } from './core/store.js';
import { icon } from './icons.js';
import { OFFERS, isPremium, hasPass, passUntil, activatePremium, activatePass, cancelPremium, cancelPass } from './core/premium.js';
import { dayNumber } from './core/rng.js';
import { toast, confetti } from './core/fx.js';
import { installPrompt } from './pwa.js';

function topbar() {
  const prem = isPremium();
  return h('header.topbar', h('div.container',
    h('a.logo', { href: '#/' }, h('span.logo-mark', { html: icon('logo') }), h('span.name', 'Manigames')),
    h('div.spacer'),
    installPrompt.available() && h('button.btn.btn-sm.hide-sm', { onclick: () => installPrompt.prompt(), html: icon('download', 18) + ' Installer' }),
    h('a.btn.btn-sm.btn-ghost', { href: '#/stats', html: icon('chart', 18) + '<span class="hide-sm">Stats</span>', 'aria-label': 'Statistiques' }),
    h('a.chip.chip-premium', { href: '#/premium', style: { textDecoration: 'none', height: '36px' } }, prem ? '★ Premium' : '★ Premium')));
}

function gameCard(g, i) {
  const best = getBest(g.id);
  return h('a.game-card', { href: `#/jeu/${g.id}`, style: { '--c1': g.c1, '--c2': g.c2, animationDelay: `${Math.min(i, 12) * 30}ms` } },
    h('div.game-art',
      h('span.num', String(g.num).padStart(2, '0')),
      h('div.badges', g.premium === 'pass' && h('span.chip', '🎟️', h('span.lbl', ' Pass')), g.cat.includes('enligne') && h('span.chip', '🛰️', h('span.lbl', ' En ligne'))),
      h('span.emoji', { 'aria-hidden': 'true' }, g.emoji)),
    h('div.game-body',
      h('h3', g.title), h('p', g.tagline),
      h('div.game-meta', h('span.chip', '⏱ ' + g.duration), h('span.chip', '👤 ' + g.players), best && h('span.chip.game-best', '★ ' + best.display))));
}

export function home(root) {
  document.title = 'Manigames · Mini-jeux de 30 secondes';
  let cat = store.get('cat', 'all');
  const grid = h('div.games-grid');
  const paint = () => {
    const list = GAMES.filter((g) => cat === 'all' || g.cat.includes(cat));
    grid.replaceChildren(...list.map(gameCard));
  };
  const filters = h('div.filters', { role: 'toolbar', 'aria-label': 'Filtrer les jeux' }, CATS.map((c) => h('button', {
    'aria-pressed': String(c.id === cat), onclick: (e) => { cat = c.id; store.set('cat', cat); [...filters.children].forEach((b) => b.setAttribute('aria-pressed', String(b === e.currentTarget))); paint(); },
  }, c.label)));
  const plays = totalPlays(GAMES.map((g) => g.id));
  clear(root).append(
    topbar(),
    h('div.container',
      h('section.hero',
        h('h1', 'Des mini-jeux de ', h('span.grad-text', '30 secondes'), '.'),
        h('p', 'Seul, à deux ou en soirée. Sans pub, sans compte, et ça marche même hors ligne.'),
        h('div.btn-row',
          h('a.btn.btn-primary.btn-lg', { href: '#/jeu/daily-defi' }, `📅 Défi du jour #${dayNumber()}`),
          h('a.btn.btn-lg', { href: '#/jeu/mode-fete' }, '🎉 Mode Fête')),
        h('div.hero-stats', h('div', h('b', '20'), 'mini-jeux'), h('div', h('b', '0'), 'publicité'), h('div', h('b', plays), plays > 1 ? 'parties jouées' : 'partie jouée'))),
      h('div.featured',
        h('a.feature-card', { href: '#/jeu/dix-secondes', style: { background: 'linear-gradient(135deg,#ffb547,#ff4f4f 70%)' } },
          h('span.big-emoji', '⏱️'), h('span.kicker', 'Le plus partagé'), h('h3', '10 Secondes Pile'), h('p', 'Arrête le chrono à 10,00 s. Personne n’y arrive du premier coup.')),
        h('a.feature-card', { href: '#/jeu/qui-a-dessine', style: { background: 'linear-gradient(135deg,#ff4fa3,#7c5cff 75%)' } },
          h('span.big-emoji', '🎨'), h('span.kicker', 'En soirée'), h('h3', 'Qui A Dessiné Ça ?'), h('p', 'Un téléphone, 15 secondes chacun, des fous rires garantis.')),
        h('a.feature-card', { href: '#/jeu/tap-royale', style: { background: 'linear-gradient(135deg,#ffd23f,#ff3d77 75%)' } },
          h('span.big-emoji', '👑'), h('span.kicker', 'Battle royale'), h('h3', 'Tap Royale'), h('p', '100 joueurs, une épreuve toutes les 5 secondes. Un seul survivant.'))),
      h('section',
        h('div.section-head', h('h2', 'Tous les jeux')),
        filters, grid),
      h('section',
        h('div.section-head', h('h2', 'Soutenir Manigames'), h('p.muted', 'Zéro pub, pour toujours. Le jeu de base reste gratuit.')),
        offers()),
      h('footer.footer', h('p', 'Manigames · prototype · ', h('a', { href: '#/premium' }, 'Offres'), ' · ', h('a', { href: '#/stats' }, 'Statistiques')))));
  paint();
}

function offers() {
  const prem = isPremium(); const pass = hasPass();
  return h('div.offers',
    h('div.offer.premium.panel',
      h('span.chip.chip-premium', { style: { alignSelf: 'flex-start' } }, '★ Abonnement'),
      h('h3', OFFERS.premium.name),
      h('div.price', OFFERS.premium.monthly, h('small', ' / mois  ·  ou ' + OFFERS.premium.yearly + ' / an')),
      h('ul', OFFERS.premium.perks.map((p) => h('li', p))),
      prem ? h('p.owned', '✓ Premium actif sur cet appareil (démo)')
        : h('button.btn.btn-primary.btn-lg.btn-block', { onclick: () => buy('premium') }, 'Passer Premium')),
    h('div.offer.party.panel',
      h('span.chip', { style: { alignSelf: 'flex-start' } }, '🎟️ Achat unique'),
      h('h3', OFFERS.pass.name),
      h('div.price', OFFERS.pass.price, h('small', ' · valable ' + OFFERS.pass.duration)),
      h('ul', OFFERS.pass.perks.map((p) => h('li', p))),
      pass ? h('p.owned', `✓ Pass actif jusqu’à ${new Date(passUntil()).toLocaleTimeString('fr-CH', { hour: '2-digit', minute: '2-digit' })} (démo)`)
        : h('button.btn.btn-lg.btn-block', { onclick: () => buy('pass'), style: { background: 'linear-gradient(120deg,#4cc9f0,#3ddc97)', color: '#06281c', border: 0 } }, 'Acheter le Pass Soirée')));
}

function buy(kind) {
  // Prototype : à remplacer par Stripe Checkout / Payment Link + vérification serveur.
  if (kind === 'premium') activatePremium(); else activatePass();
  confetti(); toast(kind === 'premium' ? 'Premium activé (démo, aucun paiement)' : 'Pass Soirée activé 24 h (démo, aucun paiement)');
  route();
}
let route = () => {};
export const setRerender = (f) => { route = f; };

export function premiumPage(root) {
  document.title = 'Offres · Manigames';
  clear(root).append(topbar(), h('div.container.page',
    h('a.back-link', { href: '#/', html: icon('back', 18) + ' Tous les jeux' }),
    h('h1', 'Jouer sans pub, ', h('span.grad-text', 'soutenir le projet')),
    h('p.muted', { style: { marginBottom: '28px', maxWidth: '60ch' } }, 'Les 20 jeux restent gratuits. Deux options pour aller plus loin : l’abonnement Premium pour les joueurs réguliers, et le Pass Soirée pour un soir de fête. Prototype : les boutons activent l’offre en local, sans paiement.'),
    offers(),
    (isPremium() || hasPass()) && h('div.btn-row', { style: { marginTop: '24px', justifyContent: 'flex-start' } },
      h('button.btn.btn-sm', { onclick: () => { cancelPremium(); cancelPass(); toast('Offres réinitialisées'); route(); } }, 'Réinitialiser la démo'))));
}

export function statsPage(root) {
  document.title = 'Statistiques · Manigames';
  const rows = GAMES.map((g) => ({ g, best: getBest(g.id), plays: store.get('plays:' + g.id, 0) }));
  const played = rows.filter((r) => r.plays);
  const total = rows.reduce((n, r) => n + r.plays, 0);
  const prem = isPremium();
  clear(root).append(topbar(), h('div.container.page',
    h('a.back-link', { href: '#/', html: icon('back', 18) + ' Tous les jeux' }),
    h('h1', 'Tes statistiques'),
    h('p.muted', { style: { marginBottom: '24px' } }, `${total} partie${total > 1 ? 's' : ''} sur ${played.length} jeu${played.length > 1 ? 'x' : ''}. Tout reste sur ton appareil.`),
    h('div.games-grid', { style: { gridTemplateColumns: 'repeat(auto-fill,minmax(min(100%,220px),1fr))' } },
      (played.length ? played : rows.slice(0, 4)).map(({ g, best, plays }) => h('a.panel', { href: '#/jeu/' + g.id, style: { padding: '16px', textDecoration: 'none', display: 'flex', gap: '14px', alignItems: 'center' } },
        h('span', { style: { fontSize: '34px' } }, g.emoji),
        h('div', h('b', g.title), h('div.muted', { style: { fontSize: '14px' } }, best ? `Record ${best.display} · ${plays} partie${plays > 1 ? 's' : ''}` : 'Pas encore joué'))))),
    h('div.panel.lock-card', { style: { marginTop: '24px' } },
      h('span.icon', prem ? '📈' : '🔒'),
      h('div', { style: { flex: 1 } }, h('b', prem ? 'Statistiques avancées (Premium)' : 'Statistiques avancées'),
        h('p.muted', { style: { fontSize: '14px' } }, prem ? 'Courbes de progression, temps de réaction moyen, comparaison avec tes amis : à venir dans la version complète.' : 'Progression dans le temps, comparaison avec tes amis et historique complet avec Premium.')),
      !prem && h('a.btn.btn-sm.btn-primary', { href: '#/premium' }, 'Débloquer'))));
}
