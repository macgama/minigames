import { h } from '../core/dom.js';
import { sfx, vibrate } from '../core/sfx.js';
import { playerSetup } from '../core/players.js';
import { passTo } from './kit.js';

const ROLES = {
  loup: { e: '🐺', n: 'Loup-garou', d: 'La nuit, choisis une victime avec les autres loups. Le jour, fais-toi passer pour un villageois.' },
  voyante: { e: '🔮', n: 'Voyante', d: 'Chaque nuit, découvre si un joueur est un loup.' },
  sorciere: { e: '🧪', n: 'Sorcière', d: 'Une potion de vie (sauve la victime de la nuit) et une potion de mort, une fois chacune.' },
  chasseur: { e: '🏹', n: 'Chasseur', d: 'Si tu meurs, tu emportes quelqu’un avec toi.' },
  villageois: { e: '🧑‍🌾', n: 'Villageois', d: 'Démasque les loups pendant le débat et vote juste.' },
};

export default {
  async start(ctx) {
    const full = ctx.mode === 'complet', R = ctx.rng;
    const players = await playerSetup(ctx.stage, { min: 5, max: 10, title: 'Qui est au village ?', cta: 'La nuit tombe 🌙' }); if (!ctx.alive) return;
    const nW = players.length >= 7 ? 2 : 1;
    const deck = [...Array(nW).fill('loup'), 'voyante', ...(full ? ['sorciere', 'chasseur'] : [])];
    while (deck.length < players.length) deck.push('villageois');
    R.shuffle(deck).forEach((r, i) => { players[i].role = r; players[i].dead = false; });
    const witch = { life: true, death: true };
    const scene = h('div.center-stage', { style: { gap: '12px' } }); ctx.stage.append(scene);
    const alive = () => players.filter((p) => !p.dead);
    const card = (p) => h('div', { style: { padding: '18px', borderRadius: '20px', background: p.role === 'loup' ? 'linear-gradient(160deg,#5b2b6b,#ff3d5a)' : 'linear-gradient(160deg,#1b4b8a,#3ddc97)', textAlign: 'center', maxWidth: '360px' } },
      h('div', { style: { fontSize: '64px' } }, ROLES[p.role].e), h('div.big-msg', { style: { fontSize: '26px' } }, ROLES[p.role].n), h('p', { style: { margin: '6px 0 0' } }, ROLES[p.role].d));
    const pickList = (list, title, sub, extra = []) => new Promise((res) => scene.replaceChildren(h('div.big-msg', { style: { fontSize: '22px', textAlign: 'center' } }, title), sub ? h('p.muted', { style: { margin: 0, textAlign: 'center', maxWidth: '380px' } }, sub) : '',
      h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', width: 'min(92vw,420px)' } }, list.map((q) => h('button.btn', { style: { minHeight: '52px' }, onclick: () => { sfx.pop(); res(q); } }, `${q.emoji} ${q.name}`))),
      ...extra.map(([label, v]) => h('button.btn', { onclick: () => res(v) }, label))));
    const ok = (content, cta = 'Compris') => new Promise((res) => scene.replaceChildren(...[content].flat(), h('button.btn.btn-primary.btn-lg', { onclick: res }, cta)));

    // Distribution des rôles
    for (const p of players) {
      await passTo(scene, p, 'Découvre ton rôle en secret 🤫'); if (!ctx.alive) return;
      const mates = p.role === 'loup' ? players.filter((q) => q !== p && q.role === 'loup') : [];
      await ok([card(p), mates.length ? h('p', `Ton complice : ${mates.map((q) => q.emoji + ' ' + q.name).join(', ')}`) : ''], 'J’ai vu, je cache'); if (!ctx.alive) return;
    }
    let night = 0, winner = null, log = [];
    const check = () => { const a = alive(), w = a.filter((p) => p.role === 'loup').length; if (!w) return 'village'; if (w >= a.length - w) return 'loups'; return null; };
    const kill = async (p, how) => {
      if (!p || p.dead) return; p.dead = true; log.push(`${p.emoji} ${p.name} (${ROLES[p.role].n}) — ${how}`);
      if (p.role === 'chasseur') {
        await ok([h('div', { style: { fontSize: '56px' } }, '🏹'), h('div.big-msg', { style: { fontSize: '22px', textAlign: 'center' } }, `${p.name} était le chasseur !`), h('p.muted', 'Dans un dernier souffle, il emporte quelqu’un.')], 'Choisir');
        const t = await pickList(alive(), `${p.emoji} ${p.name}, qui emportes-tu ?`); if (!ctx.alive) return;
        await kill(t, 'emporté·e par le chasseur'); ctx.shake(6);
      }
    };
    while (ctx.alive && !winner) {
      night++; ctx.hud({ phase: `🌙 Nuit ${night}` });
      // La nuit : tout le monde reçoit le téléphone, chacun fait une action
      await ok([h('div', { style: { fontSize: '64px' } }, '🌙'), h('div.big-msg', `Nuit ${night}`), h('p.muted', { style: { textAlign: 'center', maxWidth: '360px' } }, 'Tout le monde ferme les yeux. Le téléphone passe de main en main : chacun fait son action en secret.')], 'Commencer la nuit');
      const votes = new Map(); let seen = 0, save = false, poison = null;
      for (const p of alive()) {
        await passTo(scene, p, 'Action de nuit, en secret'); if (!ctx.alive) return;
        const others = alive().filter((q) => q !== p);
        if (p.role === 'loup') { const t = await pickList(others.filter((q) => q.role !== 'loup'), '🐺 Qui dévorer cette nuit ?', nW > 1 ? 'L’autre loup vote aussi. En cas de désaccord, le hasard tranche.' : null); votes.set(t, (votes.get(t) || 0) + 1); }
        else if (p.role === 'voyante') { const t = await pickList(others, '🔮 Qui veux-tu sonder ?'); if (!ctx.alive) return; seen++; await ok([h('div', { style: { fontSize: '64px' } }, t.role === 'loup' ? '🐺' : '🙂'), h('div.big-msg', { style: { fontSize: '24px', textAlign: 'center' } }, `${t.name} ${t.role === 'loup' ? 'EST un loup !' : 'n’est pas un loup'}`)], 'Je garde le secret'); }
        else if (p.role === 'sorciere' && (witch.life || witch.death)) {
          const extra = [['🙅 Ne rien faire', 'rien']]; if (witch.life) extra.unshift(['💚 Potion de vie : sauver la victime de cette nuit', 'vie']);
          const t = await pickList(witch.death ? others : [], '🧪 Tes potions', witch.death ? 'Touche un nom pour l’empoisonner, ou choisis ci-dessous. La potion de vie sauve la victime des loups, quelle qu’elle soit.' : 'La potion de vie sauve la victime des loups, quelle qu’elle soit.', extra);
          if (t === 'vie') { save = true; witch.life = false; } else if (t && t !== 'rien') { poison = t; witch.death = false; }
        } else { await pickList(others, '🕯️ Qui soupçonnes-tu ?', 'Simple vote d’ambiance pour que personne ne devine ton rôle.'); }
        if (!ctx.alive) return;
      }
      // Le matin
      const mx = Math.max(0, ...votes.values()); const victim = mx ? R.pick([...votes].filter(([, v]) => v === mx).map(([p]) => p)) : null;
      const dead = []; if (victim && !save) dead.push(victim); if (poison && poison !== victim) dead.push(poison); else if (poison && save) dead.push(poison);
      ctx.hud({ phase: `☀️ Jour ${night}` }); sfx.go();
      await ok([h('div', { style: { fontSize: '64px' } }, '🌅'), h('div.big-msg', 'Le village se réveille…'), dead.length ? h('div', { style: { display: 'grid', gap: '6px', textAlign: 'center' } }, dead.map((p) => h('div', { style: { fontSize: '20px', fontWeight: 800 } }, `💀 ${p.emoji} ${p.name} — ${ROLES[p.role].e} ${ROLES[p.role].n}`))) : h('p', { style: { fontWeight: 800, color: 'var(--ok)' } }, 'Miracle : personne n’est mort cette nuit !')], 'Suite');
      if (!ctx.alive) return;
      for (const p of dead) { await kill(p, p === poison ? 'empoisonné·e' : 'dévoré·e'); if (!ctx.alive) return; }
      if (dead.length) { sfx.bad(); vibrate([60, 40, 60]); }
      if ((winner = check())) break;
      // Débat
      await new Promise((res) => {
        let left = 90; const tEl = h('div', { style: { fontSize: '64px', fontWeight: 900, fontVariantNumeric: 'tabular-nums' } }, '1:30');
        scene.replaceChildren(h('div.big-msg', '🗣️ Débat'), h('p.muted', { style: { textAlign: 'center' } }, `Survivants : ${alive().map((p) => p.emoji).join(' ')}`), tEl, h('button.btn.btn-primary.btn-lg', { onclick: () => { clearInterval(iv); res(); } }, 'Passer au vote'));
        const iv = setInterval(() => { left--; tEl.textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`; if (left <= 10) { tEl.style.color = 'var(--bad)'; sfx.tick(); } if (left <= 0) { clearInterval(iv); res(); } }, 1000);
        ctx.onCleanup(() => clearInterval(iv));
      });
      if (!ctx.alive) return;
      // Vote secret
      const tally = new Map();
      for (const p of alive()) { await passTo(scene, p, 'Vote en secret'); if (!ctx.alive) return; const t = await pickList(alive().filter((q) => q !== p), '🗳️ Qui éliminer ?'); if (!ctx.alive) return; tally.set(t, (tally.get(t) || 0) + 1); }
      const top = Math.max(...tally.values()), lead = [...tally].filter(([, v]) => v === top);
      const rows = [...tally].sort((a, b) => b[1] - a[1]).map(([p, v]) => h('div', { style: { display: 'flex', justifyContent: 'space-between', gap: '20px', fontWeight: 700 } }, h('span', `${p.emoji} ${p.name}`), h('span', '🗳️'.repeat(v))));
      if (lead.length > 1) await ok([h('div.big-msg', 'Égalité !'), ...rows, h('p.muted', 'Personne n’est éliminé aujourd’hui.')], 'La nuit tombe');
      else { const [out] = lead[0]; sfx.bad(); ctx.shake(6); await ok([h('div.big-msg', { style: { fontSize: '24px' } }, `Le village élimine ${out.emoji} ${out.name}`), ...rows, card(out)], 'Suite'); if (!ctx.alive) return; await kill(out, 'éliminé·e par le village'); }
      if (!ctx.alive) return;
      winner = check();
    }
    if (!ctx.alive) return;
    const roles = h('div', { style: { display: 'grid', gap: '4px' } }, players.map((p) => h('div', { style: { display: 'flex', justifyContent: 'space-between', gap: '12px', opacity: p.dead ? 0.5 : 1 } }, h('span', `${p.emoji} ${p.name}`), h('span', `${ROLES[p.role].e} ${ROLES[p.role].n}${p.dead ? ' 💀' : ''}`))));
    ctx.end({ multi: true, win: true, emoji: winner === 'loups' ? '🐺' : '🏘️', display: winner === 'loups' ? '🐺' : '🏘️', title: winner === 'loups' ? 'Les loups dévorent le village !' : 'Le village a vaincu les loups !', label: `${night} nuit${night > 1 ? 's' : ''}`, extra: roles });
  },
};
