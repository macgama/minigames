/** Pages : accueil (hub), offres, statistiques. */
import { h, clear } from './core/dom.js';
import { GAMES, CATS } from './games/index.js';
import { getBest, store, totalPlays } from './core/store.js';
import { icon } from './icons.js';
import { OFFERS, isPremium, hasPass, passUntil, activatePremium, activatePass, cancelPremium, cancelPass } from './core/premium.js';
import { dayNumber } from './core/rng.js';
import { toast, confetti } from './core/fx.js';
import { installPrompt } from './pwa.js';
import { profile, saveProfile, streak, dailyQuests, questLabel, questGoal, bestMedal, MEDALS, medalCount, ACHIEVEMENTS, unlockedAchievements, AVATARS } from './core/progress.js';
import { byId } from './games/index.js';

function topbar() {
  const prem = isPremium();
  return h('header.topbar', h('div.container',
    h('a.logo', { href: '#/' }, h('span.logo-mark', { html: icon('logo') }), h('span.name', 'Minigames', h('small.by', 'par Manigames'))),
    h('div.spacer'),
    installPrompt.available() && h('button.btn.btn-sm.hide-sm', { onclick: () => installPrompt.prompt(), html: icon('download', 18) + ' Installer' }),
    (() => { const p = profile(); const s = streak(); return h('a.btn.btn-sm.btn-ghost', { href: '#/profil', 'aria-label': 'Mon profil' }, h('span', { style: { fontSize: '20px' } }, p.avatar), h('span', `Niv. ${p.lvl}`), s.n > 0 && h('span.hide-sm', `🔥${s.n}`)); })(),
    h('a.chip.chip-premium', { href: '#/premium', style: { textDecoration: 'none', height: '36px' } }, prem ? '★ Premium' : '★ Premium')));
}

function gameCard(g, i) {
  const best = getBest(g.id);
  return h('a.game-card', { href: `#/jeu/${g.id}`, style: { '--c1': g.c1, '--c2': g.c2, animationDelay: `${Math.min(i, 12) * 30}ms` } },
    h('div.game-art',
      h('span.num', String(g.num).padStart(2, '0')),
      h('div.badges', g.isNew && h('span.chip', '✨', h('span.lbl', ' Nouveau')), g.premium === 'pass' && h('span.chip', '🎟️', h('span.lbl', ' Pass')), g.cat.includes('enligne') && h('span.chip', '🛰️', h('span.lbl', ' En ligne'))),
      h('span.emoji', { 'aria-hidden': 'true' }, g.emoji),
      bestMedal(g.id) > 0 && h('span.medal-mini', { title: 'Meilleure médaille' }, MEDALS[bestMedal(g.id) - 1].icon)),
    h('div.game-body',
      h('h3', g.title), h('p', g.tagline),
      h('div.game-meta', h('span.chip', '⏱ ' + g.duration), h('span.chip', '👤 ' + g.players), best && h('span.chip.game-best', '★ ' + best.display))));
}

export function home(root) {
  document.title = 'Minigames · Mini-jeux de 30 secondes · par Manigames';
  let cat = store.get('cat', 'all');
  const grid = h('div.games-grid');
  const search = h('input.input', { type: 'search', placeholder: '🔎 Chercher un jeu', 'aria-label': 'Chercher un jeu', style: { maxWidth: '320px', marginBottom: '12px' }, oninput: () => paint() });
  const paint = () => {
    const q = search.value.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const list = GAMES.filter((g) => (cat === 'all' || (cat === 'new' ? g.isNew : g.cat.includes(cat))) && (!q || (g.title + ' ' + g.tagline).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(q)));
    grid.replaceChildren(...(list.length ? list.map(gameCard) : [h('p.muted', 'Aucun jeu ne correspond.')]));
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
        h('p', `Seul, à deux ou en soirée. Les ${GAMES.length} jeux sont gratuits, sans pub et sans compte.`),
        h('div.btn-row',
          h('a.btn.btn-primary.btn-lg', { href: '#/jeu/daily-defi' }, `📅 Défi du jour #${dayNumber()}`),
          h('a.btn.btn-lg', { href: '#/jeu/mode-fete' }, '🎉 Mode Fête')),
        h('div.hero-stats', h('div', h('b', String(GAMES.length)), 'mini-jeux gratuits'), h('div', h('b', '0'), 'publicité'), h('div', h('b', plays), plays > 1 ? 'parties jouées' : 'partie jouée'))),
      dashboard(),
      h('div.featured',
        h('a.feature-card', { href: '#/jeu/dix-secondes', style: { background: 'linear-gradient(135deg,#ffb547,#ff4f4f 70%)' } },
          h('span.big-emoji', '⏱️'), h('span.kicker', 'Le plus partagé'), h('h3', '10 Secondes Pile'), h('p', 'Arrête le chrono à 10,00 s. Personne n’y arrive du premier coup.')),
        h('a.feature-card', { href: '#/jeu/qui-a-dessine', style: { background: 'linear-gradient(135deg,#ff4fa3,#7c5cff 75%)' } },
          h('span.big-emoji', '🎨'), h('span.kicker', 'En soirée'), h('h3', 'Qui A Dessiné Ça ?'), h('p', 'Un téléphone, 15 secondes chacun, des fous rires garantis.')),
        h('a.feature-card', { href: '#/jeu/tap-royale', style: { background: 'linear-gradient(135deg,#ffd23f,#ff3d77 75%)' } },
          h('span.big-emoji', '👑'), h('span.kicker', 'Battle royale'), h('h3', 'Tap Royale'), h('p', '100 joueurs, une épreuve toutes les 5 secondes. Un seul survivant.'))),
      h('section',
        h('div.section-head', h('h2', 'Tous les jeux')),
        search, filters, grid),
      h('section',
        h('div.section-head', h('h2', 'Aller plus loin'), h('p.muted', 'Zéro pub, pour toujours. Tous les jeux restent gratuits en ligne.')),
        offers()),
      h('footer.footer', h('p', 'Minigames, une plateforme Manigames · prototype · ', h('a', { href: '#/premium' }, 'Offres'), ' · ', h('a', { href: '#/profil' }, 'Profil')))));
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
  document.title = 'Offres · Minigames';
  clear(root).append(topbar(), h('div.container.page',
    h('a.back-link', { href: '#/', html: icon('back', 18) + ' Tous les jeux' }),
    h('h1', 'Jouer sans pub, ', h('span.grad-text', 'soutenir le projet')),
    h('p.muted', { style: { marginBottom: '28px', maxWidth: '60ch' } }, `Les ${GAMES.length} jeux restent gratuits en ligne. Deux options pour aller plus loin : l’abonnement Premium (jeu hors ligne, salons privés, stats…) pour les joueurs réguliers, et le Pass Soirée pour un soir de fête avec le Mode Fête multi-écrans. Prototype : les boutons activent l’offre en local, sans paiement.`),
    offers(),
    (isPremium() || hasPass()) && h('div.btn-row', { style: { marginTop: '24px', justifyContent: 'flex-start' } },
      h('button.btn.btn-sm', { onclick: () => { cancelPremium(); cancelPass(); toast('Offres réinitialisées'); route(); } }, 'Réinitialiser la démo'))));
}

/** Profil + quêtes du jour, en haut de l'accueil. */
function dashboard() {
  const p = profile(); const s = streak(); const q = dailyQuests(GAMES);
  const mc = medalCount(GAMES.map((g) => g.id));
  const doneN = q.list.filter((x) => x.done).length;
  return h('div.dash',
    h('a.panel.profile-card', { href: '#/profil', style: { textDecoration: 'none' } },
      h('div.profile-top', h('span.avatar', p.avatar), h('div.who', h('b', p.name || 'Choisis ton pseudo'), h('span.muted', `Niveau ${p.lvl} · ${p.title}`))),
      h('div', h('div.bar.xp-bar', h('i', { style: { width: (p.pct * 100) + '%' } })), h('small.faint', `${p.into} / ${p.need} XP avant le niveau ${p.lvl + 1}`)),
      h('div.stat-row', h('span.chip', s.n > 0 ? `🔥 ${s.n} jour${s.n > 1 ? 's' : ''} de suite` : '🔥 Lance ta série'), MEDALS.map((m, i) => h('span.chip', `${m.icon} ${mc[i]}`)))),
    h('div.panel.quests-card',
      h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '10px' } }, h('b', { style: { fontSize: '18px' } }, '📜 Quêtes du jour'), h('span.faint', `${doneN}/3`)),
      q.list.map((it) => h('div.quest', { class: it.done ? 'done' : '' }, h('span', questLabel(it, byId)), h('span.xp', it.done ? '✔' : `+${it.xp} XP`),
        h('div.bar', h('i', { style: { width: Math.min(100, (it.p / questGoal(it)) * 100) + '%' } })))),
      h('small.faint', s.playedToday ? 'Nouvelles quêtes demain à minuit.' : 'Joue aujourd’hui pour garder ta série 🔥')));
}

export function profilePage(root) {
  document.title = 'Profil · Minigames';
  const p = profile(); const s = streak(); const ach = unlockedAchievements();
  const featDefs = store.get('featdefs', {});
  const all = [...ACHIEVEMENTS.map((a) => ({ ...a })), ...GAMES.flatMap((g) => Object.entries(g.feats || {}).map(([k, d]) => ({ id: g.id + ':' + k, ...d, game: g.title })))];
  void featDefs;
  const nameIn = h('input.input#pseudo', { value: p.name, maxLength: 16, placeholder: 'Ton pseudo', style: { flex: 1, minWidth: 0 } });
  const rows = GAMES.map((g) => ({ g, best: getBest(g.id), plays: store.get('plays:' + g.id, 0), m: bestMedal(g.id) }));
  const total = rows.reduce((n, r) => n + r.plays, 0);
  clear(root).append(topbar(), h('div.container.page',
    h('a.back-link', { href: '#/', html: icon('back', 18) + ' Tous les jeux' }),
    h('div.profile-top', { style: { marginBottom: '18px' } }, h('span.avatar', { style: { width: '84px', height: '84px', fontSize: '50px' } }, p.avatar),
      h('div.who', h('h1', { style: { margin: 0 } }, p.name || 'Joueur·se mystère'), h('span.muted', `Niveau ${p.lvl} · ${p.title} · ${p.xp} XP · ${total} parties · record de série ${s.best} jour${s.best > 1 ? 's' : ''}`))),
    h('section.panel', { style: { padding: '20px', display: 'grid', gap: '14px' } },
      h('h2', { style: { fontSize: '22px' } }, 'Pseudo et avatar'),
      h('div', { style: { display: 'flex', gap: '8px' } }, nameIn, h('button.btn.btn-primary', { onclick: () => { saveProfile({ name: nameIn.value.trim() }); toast('Pseudo enregistré'); route(); } }, 'Enregistrer')),
      h('p.faint', 'Les avatars se débloquent en montant de niveau.'),
      h('div.avatar-grid', AVATARS.map((a) => h('button', { 'aria-pressed': String(a.e === p.avatar), disabled: p.lvl < a.lvl, 'data-lvl': 'Niv. ' + a.lvl, 'aria-label': p.lvl < a.lvl ? `Avatar verrouillé, niveau ${a.lvl}` : `Choisir ${a.e}`, onclick: () => { saveProfile({ avatar: a.e }); route(); } }, a.e)))),
    h('section', h('div.section-head', h('h2', 'Médailles'), h('p.muted', 'Bronze, argent, or, platine : vise le sommet dans chaque jeu.')),
      h('div.games-grid', { style: { gridTemplateColumns: 'repeat(auto-fill,minmax(min(100%,230px),1fr))' } },
        rows.map(({ g, best, plays, m }) => h('a.panel', { href: '#/jeu/' + g.id, style: { padding: '14px', textDecoration: 'none', display: 'flex', gap: '12px', alignItems: 'center' } },
          h('span', { style: { fontSize: '32px' } }, g.emoji),
          h('div', { style: { flex: 1, minWidth: 0 } }, h('b', g.title), h('div.muted', { style: { fontSize: '13px' } }, best ? `Record ${best.display} · ${plays} partie${plays > 1 ? 's' : ''}` : plays ? `${plays} partie${plays > 1 ? 's' : ''}` : 'Pas encore joué')),
          h('span', { style: { fontSize: '26px', opacity: m ? 1 : 0.25 } }, m ? MEDALS[m - 1].icon : '🏅'))))),
    h('section', h('div.section-head', h('h2', `Succès (${all.filter((a) => ach[a.id]).length}/${all.length})`)),
      h('div.ach-grid', all.map((a) => h('div.ach', { class: ach[a.id] ? '' : 'locked' }, h('span', a.icon), h('div', h('b', a.name), h('small', a.desc + (a.game ? ` · ${a.game}` : ''))))))),
    h('div.panel.lock-card', { style: { marginTop: '8px' } },
      h('span.icon', isPremium() ? '📈' : '🔒'),
      h('div', { style: { flex: 1 } }, h('b', 'Statistiques avancées'), h('p.muted', { style: { fontSize: '14px' } }, 'Courbes de progression et comparaison avec tes amis, avec Premium.')),
      !isPremium() && h('a.btn.btn-sm.btn-primary', { href: '#/premium' }, 'Débloquer'))));
}
