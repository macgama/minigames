/** Installation PWA + service worker (hors ligne). */
let deferred = null;
const listeners = new Set();
export const installPrompt = {
  available: () => !!deferred,
  async prompt() { if (!deferred) return; deferred.prompt(); await deferred.userChoice; deferred = null; listeners.forEach((f) => f()); },
  onChange: (f) => listeners.add(f),
};
export function setupPWA() {
  addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; listeners.forEach((f) => f()); });
  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch((e) => console.warn('SW', e)));
  }
}
