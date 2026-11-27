/** Stockage local tolérant (navigation privée, quotas…). */
const P = 'mg:';
export const store = {
  get(key, fallback = null) {
    try { const v = localStorage.getItem(P + key); return v == null ? fallback : JSON.parse(v); } catch { return fallback; }
  },
  set(key, value) { try { localStorage.setItem(P + key, JSON.stringify(value)); } catch { /* ignore */ } },
  del(key) { try { localStorage.removeItem(P + key); } catch { /* ignore */ } },
};

/** Meilleurs scores : { score, display, at } par jeu. */
export function getBest(id) { return store.get('best:' + id); }
export function submitScore(id, score, display, lowerIsBetter = false) {
  const prev = getBest(id);
  const better = !prev || (lowerIsBetter ? score < prev.score : score > prev.score);
  if (better) store.set('best:' + id, { score, display, at: Date.now() });
  const plays = store.get('plays:' + id, 0) + 1;
  store.set('plays:' + id, plays);
  return { isRecord: better && !!prev, isFirst: !prev, prev, plays };
}
export const totalPlays = (ids) => ids.reduce((n, id) => n + store.get('plays:' + id, 0), 0);
