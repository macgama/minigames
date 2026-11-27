/** Installation PWA + jeu hors ligne (réservé à Premium : le service worker n'est installé que pour les abonnés). */
let deferred = null;
const listeners = new Set();
export const installPrompt = {
  available: () => !!deferred,
  async prompt() { if (!deferred) return; deferred.prompt(); await deferred.userChoice; deferred = null; listeners.forEach((f) => f()); },
  onChange: (f) => listeners.add(f),
};
const swOk = () => 'serviceWorker' in navigator && import.meta.env.PROD;
/** Télécharge tous les jeux pour le hors ligne. */
export function enableOffline() {
  if (swOk()) navigator.serviceWorker.register('sw.js').catch((e) => console.warn('SW', e));
}
/** Retire le hors ligne (fin d'abonnement). */
export async function disableOffline() {
  if (!swOk()) return;
  try {
    for (const r of await navigator.serviceWorker.getRegistrations()) await r.unregister();
    for (const k of await caches.keys()) if (k.startsWith('manigames-')) await caches.delete(k);
  } catch { /* ignore */ }
}
export function setupPWA(isPremium) {
  addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; listeners.forEach((f) => f()); });
  addEventListener('load', () => (isPremium() ? enableOffline() : disableOffline()));
}
