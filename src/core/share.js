import { toast } from './fx.js';
export const SITE = 'https://minigames.manigames.online';
export async function share(text, path = '') {
  const url = SITE + '/' + (path ? '#/' + path : '');
  const full = text.includes('https://') ? text : `${text}\n${url}`;
  try {
    if (navigator.share) { await navigator.share({ text: full }); return; }
  } catch (e) { if (e?.name === 'AbortError') return; }
  try { await navigator.clipboard.writeText(full); toast('Résultat copié, colle-le où tu veux 📋'); }
  catch { toast('Partage indisponible sur cet appareil'); }
}
