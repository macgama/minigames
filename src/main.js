import './styles/base.css';
import './styles/app.css';
import { byId } from './games/index.js';
import { mountGame } from './shell.js';
import { home, premiumPage, profilePage, setRerender } from './pages.js';
import { setupPWA, installPrompt } from './pwa.js';
import { isPremium } from './core/premium.js';

const root = document.getElementById('app');
let unmount = null;

function route() {
  unmount?.(); unmount = null;
  const hash = location.hash.replace(/^#\/?/, '');
  const [page, arg] = hash.split(/[/?]/);
  window.scrollTo(0, 0);
  if (page === 'jeu' && byId(arg)) { unmount = mountGame(root, byId(arg)); return; }
  if (page === 'manette') { import('./games/mode-fete.js').then((m) => { unmount = m.controller(root, new URLSearchParams(hash.split('?')[1] || '')); }); return; }
  if (page === 'premium') return premiumPage(root);
  if (page === 'stats' || page === 'profil') return profilePage(root);
  home(root);
}
setRerender(route);
addEventListener('hashchange', route);
installPrompt.onChange(() => { if (!location.hash.startsWith('#/jeu')) route(); });
setupPWA(isPremium);
route();
