/**
 * Progression partagée par tous les jeux : XP et niveau joueur, médailles, succès,
 * quêtes du jour, série de jours joués, profil (pseudo + avatar).
 * Tout est local (localStorage). La version en ligne synchronisera ce même objet.
 */
import { store } from './store.js';
import { makeRng, todayKey } from './rng.js';

export const MEDALS = [
  { id: 1, name: 'Bronze', icon: '🥉', color: '#d98b4a', xp: 15 },
  { id: 2, name: 'Argent', icon: '🥈', color: '#c9d2e3', xp: 30 },
  { id: 3, name: 'Or', icon: '🥇', color: '#ffc94a', xp: 60 },
  { id: 4, name: 'Platine', icon: '💎', color: '#7fe7ff', xp: 120 },
];
export const TITLES = ['Débutant·e', 'Curieux·se', 'Habitué·e', 'Joueur·se', 'Compétiteur·rice', 'Expert·e', 'Virtuose', 'Maître', 'Grand maître', 'Légende'];
export const AVATARS = [
  { e: '🦊', lvl: 1 }, { e: '🐼', lvl: 1 }, { e: '🐸', lvl: 1 }, { e: '🐙', lvl: 1 },
  { e: '🦁', lvl: 3 }, { e: '🐯', lvl: 4 }, { e: '🦄', lvl: 5 }, { e: '🐲', lvl: 7 },
  { e: '🤖', lvl: 9 }, { e: '👽', lvl: 11 }, { e: '🦖', lvl: 13 }, { e: '🧙', lvl: 15 },
  { e: '🥷', lvl: 18 }, { e: '👑', lvl: 20 }, { e: '🐉', lvl: 25 }, { e: '🌟', lvl: 30 },
];

/* ---------- Profil, XP, niveau ---------- */
export const xpForLevel = (lvl) => Math.round(80 * Math.pow(lvl - 1, 1.45)); // XP cumulée pour atteindre lvl
export function levelInfo(xp) {
  let lvl = 1; while (xp >= xpForLevel(lvl + 1)) lvl++;
  const a = xpForLevel(lvl), b = xpForLevel(lvl + 1);
  return { lvl, into: xp - a, need: b - a, pct: (xp - a) / (b - a), title: TITLES[Math.min(TITLES.length - 1, Math.floor((lvl - 1) / 3))] };
}
export function profile() {
  const p = store.get('profile', null) || { name: '', avatar: '🦊', xp: 0, created: Date.now() };
  return { ...p, ...levelInfo(p.xp) };
}
export function saveProfile(patch) { const p = store.get('profile', null) || { name: '', avatar: '🦊', xp: 0, created: Date.now() }; store.set('profile', { ...p, ...patch }); }
export const displayName = () => profile().name || 'Un·e ami·e';

/* ---------- Médailles par jeu ---------- */
/** meta.medals = [bronze, argent, or, platine] dans l'unité du score ; meta.lowerIsBetter inverse le sens. */
export function medalFor(meta, score) {
  if (!meta.medals || score == null) return 0;
  let m = 0;
  meta.medals.forEach((t, i) => { if (meta.lowerIsBetter ? score <= t : score >= t) m = i + 1; });
  return m;
}
export const bestMedal = (id) => store.get('medal:' + id, 0);
export function nextMedal(meta, score) {
  const m = medalFor(meta, score);
  if (!meta.medals || m >= 4) return null;
  const target = meta.medals[m];
  return { medal: MEDALS[m], target, delta: meta.lowerIsBetter ? score - target : target - score };
}
export const medalCount = (ids) => ids.reduce((acc, id) => { const m = bestMedal(id); if (m) acc[m - 1]++; return acc; }, [0, 0, 0, 0]);

/* ---------- Série de jours ---------- */
function touchStreak() {
  const s = store.get('streak', { last: null, n: 0, best: 0 });
  const today = todayKey(); if (s.last === today) return s;
  const y = new Date(); y.setDate(y.getDate() - 1);
  s.n = s.last === todayKey(y) ? s.n + 1 : 1; s.last = today; s.best = Math.max(s.best, s.n);
  store.set('streak', s); return s;
}
export function streak() {
  const s = store.get('streak', { last: null, n: 0, best: 0 });
  const y = new Date(); y.setDate(y.getDate() - 1);
  const alive = s.last === todayKey() || s.last === todayKey(y);
  return { ...s, n: alive ? s.n : 0, playedToday: s.last === todayKey() };
}

/* ---------- Quêtes du jour ---------- */
const QUEST_TYPES = [
  { t: 'play-n', make: (r) => ({ n: r.pick([3, 4, 5]), xp: 40 }), label: (q) => `Joue ${q.n} parties` },
  { t: 'play-game', make: (r, games) => ({ game: r.pick(games).id, xp: 30 }), label: (q, byId) => `Joue à ${byId(q.game)?.title}` },
  { t: 'medal-game', make: (r, games) => { const g = r.pick(games.filter((x) => x.medals)); return { game: g.id, m: r.pick([1, 2]), xp: 60 }; }, label: (q, byId) => `Décroche ${q.m === 1 ? 'le bronze' : 'l’argent'} à ${byId(q.game)?.title}` },
  { t: 'distinct', make: (r) => ({ n: r.pick([3, 4]), xp: 50 }), label: (q) => `Joue à ${q.n} jeux différents` },
  { t: 'record', make: () => ({ xp: 50 }), label: () => 'Bats un de tes records' },
  { t: 'challenge', make: () => ({ xp: 50 }), label: () => 'Envoie un défi à un·e ami·e' },
];
export function dailyQuests(games) {
  const day = todayKey();
  let q = store.get('quests', null);
  if (!q || q.day !== day) {
    const r = makeRng('quests-' + day);
    const types = r.shuffle(QUEST_TYPES).slice(0, 3);
    const solo = games.filter((g) => g.cat.includes('solo'));
    q = { day, list: types.map((T) => ({ t: T.t, ...T.make(r, solo), p: 0, done: false })), seen: [] };
    store.set('quests', q);
  }
  return q;
}
export const questLabel = (q, byId) => QUEST_TYPES.find((T) => T.t === q.t).label(q, byId);
export const questGoal = (q) => (q.t === 'play-n' || q.t === 'distinct' ? q.n : 1);

/* ---------- Succès ---------- */
export const ACHIEVEMENTS = [
  { id: 'first', icon: '🎮', name: 'Premier pas', desc: 'Termine ta première partie' },
  { id: 'ten', icon: '🔟', name: 'Mise en jambes', desc: 'Termine 10 parties' },
  { id: 'fifty', icon: '🏃', name: 'Accro', desc: 'Termine 50 parties' },
  { id: 'hundred', icon: '💯', name: 'Centurion', desc: 'Termine 100 parties' },
  { id: 'explorer', icon: '🧭', name: 'Explorateur·rice', desc: 'Essaie 10 jeux différents' },
  { id: 'all20', icon: '🗺️', name: 'Grand voyageur', desc: 'Joue à 20 jeux différents' },
  { id: 'all40', icon: '🌍', name: 'Tour complet', desc: 'Joue aux 40 jeux' },
  { id: 'gold1', icon: '🥇', name: 'Premier or', desc: 'Décroche une médaille d’or' },
  { id: 'gold5', icon: '🏅', name: 'Collection dorée', desc: 'Décroche 5 médailles d’or' },
  { id: 'plat1', icon: '💎', name: 'Platine !', desc: 'Décroche une médaille de platine' },
  { id: 'streak3', icon: '🔥', name: 'Ça chauffe', desc: 'Joue 3 jours de suite' },
  { id: 'streak7', icon: '☄️', name: 'Semaine parfaite', desc: 'Joue 7 jours de suite' },
  { id: 'lvl5', icon: '⭐', name: 'Niveau 5', desc: 'Atteins le niveau 5' },
  { id: 'lvl10', icon: '🌟', name: 'Niveau 10', desc: 'Atteins le niveau 10' },
  { id: 'quests', icon: '📜', name: 'Mission accomplie', desc: 'Termine les 3 quêtes d’un jour' },
  { id: 'challenger', icon: '⚔️', name: 'Provocateur·rice', desc: 'Envoie un défi à un·e ami·e' },
  { id: 'duelist', icon: '🤺', name: 'Défi relevé', desc: 'Bats le score d’un défi reçu' },
  { id: 'party', icon: '🎉', name: 'Âme de la fête', desc: 'Termine 5 parties à plusieurs' },
];
export const unlockedAchievements = () => store.get('ach', {});
function unlock(id, list) {
  const a = store.get('ach', {}); if (a[id]) return;
  a[id] = Date.now(); store.set('ach', a);
  const def = ACHIEVEMENTS.find((x) => x.id === id) || store.get('featdefs', {})[id];
  if (def) list.push(def);
}

/* ---------- Enregistrement d'une partie ---------- */
/**
 * À appeler à chaque fin de partie. Retourne tout ce qu'il faut pour l'écran de fin.
 * res : { score, lowerIsBetter, multi, feats: [ids], beatChallenge }
 */
export function recordGame(meta, res, games) {
  const out = { xp: 0, lines: [], achievements: [], quests: [], levelUp: null, medal: 0, newMedal: 0 };
  const before = profile();
  const st = touchStreak();
  const totals = store.get('totals', { games: 0, multi: 0, played: [] });
  totals.games++; if (res.multi) totals.multi++;
  if (!totals.played.includes(meta.id)) totals.played.push(meta.id);
  store.set('totals', totals);

  out.xp += 10; out.lines.push(['Partie terminée', 10]);
  if (st.n > 1) { const b = Math.min(30, st.n * 3); out.xp += b; out.lines.push([`Série de ${st.n} jours 🔥`, b]); }
  if (res.multi) { out.xp += 10; out.lines.push(['Partie entre amis', 10]); }
  if (res.isRecord) { out.xp += 20; out.lines.push(['Nouveau record', 20]); }
  if (res.beatChallenge) { out.xp += 40; out.lines.push(['Défi relevé', 40]); unlock('duelist', out.achievements); }

  // Médailles
  if (res.score != null && meta.medals) {
    out.medal = medalFor(meta, res.score);
    const prevM = bestMedal(meta.id);
    if (out.medal > prevM) {
      store.set('medal:' + meta.id, out.medal); out.newMedal = out.medal;
      const gain = MEDALS.slice(prevM, out.medal).reduce((s, m) => s + m.xp, 0);
      out.xp += gain; out.lines.push([`Médaille ${MEDALS[out.medal - 1].name} ${MEDALS[out.medal - 1].icon}`, gain]);
    }
  }
  // Succès propres au jeu
  for (const f of res.feats || []) {
    const def = meta.feats?.[f]; if (!def) continue;
    const defs = store.get('featdefs', {}); defs[meta.id + ':' + f] = { icon: def.icon, name: def.name, desc: def.desc }; store.set('featdefs', defs);
    const before2 = out.achievements.length; unlock(meta.id + ':' + f, out.achievements);
    if (out.achievements.length > before2) { out.xp += 25; out.lines.push([`Succès : ${def.name}`, 25]); }
  }
  // Quêtes
  const q = dailyQuests(games);
  const seen = new Set(q.seen); seen.add(meta.id); q.seen = [...seen];
  for (const it of q.list) {
    if (it.done) continue;
    if (it.t === 'play-n') it.p++;
    if (it.t === 'play-game' && it.game === meta.id) it.p = 1;
    if (it.t === 'medal-game' && it.game === meta.id && out.medal >= it.m) it.p = 1;
    if (it.t === 'distinct') it.p = q.seen.length;
    if (it.t === 'record' && res.isRecord) it.p = 1;
    if (it.p >= questGoal(it)) { it.done = true; out.quests.push(it); out.xp += it.xp; out.lines.push(['Quête du jour ✔', it.xp]); }
  }
  store.set('quests', q);
  if (q.list.every((x) => x.done)) unlock('quests', out.achievements);

  // Succès globaux
  const tg = totals.games;
  if (tg >= 1) unlock('first', out.achievements);
  if (tg >= 10) unlock('ten', out.achievements);
  if (tg >= 50) unlock('fifty', out.achievements);
  if (tg >= 100) unlock('hundred', out.achievements);
  if (totals.played.length >= 10) unlock('explorer', out.achievements);
  if (totals.played.length >= 20) unlock('all20', out.achievements);
  if (totals.played.length >= 40) unlock('all40', out.achievements);
  if (totals.multi >= 5) unlock('party', out.achievements);
  if (st.n >= 3) unlock('streak3', out.achievements);
  if (st.n >= 7) unlock('streak7', out.achievements);
  const mc = medalCount(games.map((g) => g.id));
  if (mc[2] + mc[3] >= 1) unlock('gold1', out.achievements);
  if (mc[2] + mc[3] >= 5) unlock('gold5', out.achievements);
  if (mc[3] >= 1) unlock('plat1', out.achievements);

  saveProfile({ xp: before.xp + out.xp });
  const after = profile();
  if (after.lvl >= 5) unlock('lvl5', out.achievements);
  if (after.lvl >= 10) unlock('lvl10', out.achievements);
  if (after.lvl > before.lvl) out.levelUp = { from: before.lvl, to: after.lvl, avatars: AVATARS.filter((a) => a.lvl > before.lvl && a.lvl <= after.lvl).map((a) => a.e) };
  out.before = before; out.after = after;
  return out;
}

/** Envoi d'un défi (quête + succès). */
export function noteChallengeSent(games) {
  const got = []; unlock('challenger', got);
  const q = dailyQuests(games); let xp = 0;
  for (const it of q.list) if (it.t === 'challenge' && !it.done) { it.p = 1; it.done = true; xp += it.xp; }
  store.set('quests', q); if (xp) saveProfile({ xp: profile().xp + xp });
  return { xp, achievements: got };
}
