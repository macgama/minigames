/**
 * Mode Fête : un écran hôte + des téléphones manettes.
 * Prototype : transport BroadcastChannel (onglets du même appareil) + joueurs locaux.
 * Version complète : remplacer `transport()` par un relais WebSocket/WebRTC (voir docs/ARCHITECTURE.md).
 */
import qrcode from 'qrcode-generator';
import { h, clear } from '../core/dom.js';
import { sfx, vibrate } from '../core/sfx.js';
import { rng } from '../core/rng.js';
import { PCOLORS, PEMOJI } from '../core/players.js';
import { confetti } from '../core/fx.js';
import { icon } from '../icons.js';

const GOAL = 60;
const transport = (room) => {
  const bc = 'BroadcastChannel' in window ? new BroadcastChannel('mg-party-' + room) : null;
  const subs = new Set();
  if (bc) bc.onmessage = (e) => subs.forEach((f) => f(e.data));
  return { send: (m) => bc?.postMessage(m), on: (f) => subs.add(f), close: () => bc?.close() };
};

// Le salon survit aux revanches : les manettes restent connectées.
let session = null;
export default {
  start(ctx) {
    session ||= { room: Array.from({ length: 4 }, () => rng.pick('ABCDEFGHJKLMNPQRSTUVWXYZ'.split(''))).join(''), players: new Map() };
    const room = session.room;
    const net = transport(room); ctx.onCleanup(net.close);
    const url = `${location.href.split('#')[0]}#/manette?room=${room}`;
    const players = session.players; // id -> {name,color,emoji,pos,local}
    let phase = 'lobby';
    const scene = h('div.center-stage', { style: { gap: '18px', overflowY: 'auto', justifyContent: 'flex-start', paddingTop: '20px' } }); ctx.stage.append(scene);

    const addPlayer = (id, name, local = false) => {
      if (players.has(id) || players.size >= 8) return;
      const i = players.size;
      players.set(id, { id, name: (name || `Joueur ${i + 1}`).slice(0, 14), color: PCOLORS[i], emoji: PEMOJI[i], pos: 0, local });
      net.send({ type: 'welcome', id, color: PCOLORS[i], emoji: PEMOJI[i], room });
      sfx.pop(); lobby();
    };
    let onTap = null; // gestionnaire de l'épreuve en cours
    const tap = (id) => { const p = players.get(id); if (p && onTap) onTap(p); };
    net.on((m) => { if (m.type === 'join') addPlayer(m.id, m.name); if (m.type === 'leave') { players.delete(m.id); lobby(); } if (m.type === 'tap') tap(m.id); if (m.type === 'hello' && phase !== 'lobby') net.send({ type: 'state', phase: 'pause', text: 'Partie en cours, regarde l’écran' }); });
    const localPads = () => h('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' } }, [...players.values()].filter((p) => p.local).map((p) => h('button.btn', { style: { minHeight: '60px', minWidth: '120px', borderColor: p.color, color: p.color }, onpointerdown: (e) => { e.preventDefault(); tap(p.id); } }, `${p.emoji} ${p.name}`)));
    function lobby() {
      if (phase !== 'lobby') return;
      const qr = qrcode(0, 'M'); qr.addData(url); qr.make();
      const list = [...players.values()];
      scene.replaceChildren(
        h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,280px),1fr))', gap: '18px', width: '100%', maxWidth: '900px', alignItems: 'start' } },
          h('div.panel', { style: { padding: '22px', display: 'grid', gap: '14px', justifyItems: 'center', textAlign: 'center' } },
            h('div.faint', { style: { fontWeight: 700, letterSpacing: '.12em', fontSize: '12px' } }, 'SCANNE POUR REJOINDRE'),
            h('div', { style: { background: '#fff', padding: '12px', borderRadius: '18px', width: 'min(64vw,240px)' }, html: qr.createSvgTag({ scalable: true, margin: 0 }) }),
            h('div', 'Code du salon'), h('div.mono', { style: { fontSize: '42px', fontWeight: 800, letterSpacing: '.2em' } }, room),
            h('button.btn.btn-sm', { onclick: () => window.open(url, '_blank'), html: icon('share', 16) + ' Ouvrir une manette (nouvel onglet)' })),
          h('div.panel', { style: { padding: '22px', display: 'grid', gap: '14px' } },
            h('h2', { style: { fontSize: '24px' } }, `Joueurs (${list.length}/8)`),
            list.length ? h('div.players-list', list.map((p) => h('div.player-row.anim-pop', h('span', { style: { fontSize: '26px' } }, p.emoji), h('b', { style: { color: p.color, flex: 1 } }, p.name), h('span.chip', p.local ? 'sur cet écran' : '📱 manette'))))
              : h('p.muted', 'En attente des manettes… Scanne le QR code avec un téléphone, ou ajoute des joueurs sur cet écran pour tester.'),
            h('button.btn', { onclick: () => addPlayer('local-' + players.size, null, true), disabled: players.size >= 8 }, '+ Joueur sur cet écran'),
            h('button.btn.btn-primary.btn-lg', { disabled: players.size < 1, onclick: () => soiree() }, '🎉 Lancer la soirée (3 épreuves)'),
            h('button.btn', { disabled: players.size < 1, onclick: () => soiree(['race']) }, '🚀 Juste une course'),
            h('p.note', '🛰️ Prototype : les manettes se connectent depuis d’autres onglets de ce navigateur. Entre téléphones différents, il faudra le relais en ligne (WebSocket/WebRTC).'))));
    }

    const GAMESET = {
      race: { icon: '🚀', name: 'Course de fusées', how: `Tapez comme des fous. Premier à ${GOAL} !`, run: raceGame },
      reflex: { icon: '⚡', name: 'Réflexe', how: 'Tapez dès que l’écran devient VERT. Trop tôt = grillé ! 3 manches.', run: reflexGame },
      count: { icon: '🐑', name: 'Compte les moutons', how: 'Tapez une fois pour chaque 🐑 qui passe. Pas pour les 🐐 !', run: countGame },
    };
    const banner = (txt) => h('div.big-msg', { style: { textAlign: 'center' } }, txt);

    async function soiree(order = ['race', 'reflex', 'count']) {
      phase = 'play';
      players.forEach((p) => (p.pts = 0));
      for (let gi = 0; gi < order.length; gi++) {
        const G = GAMESET[order[gi]];
        net.send({ type: 'state', phase: 'pause', text: `${G.icon} ${G.name}` });
        scene.replaceChildren(h('p.faint', order.length > 1 ? `Épreuve ${gi + 1} sur ${order.length}` : ''), h('div.anim-pop', { style: { fontSize: '90px' } }, G.icon), banner(G.name), h('p.muted', { style: { textAlign: 'center', maxWidth: '520px' } }, G.how));
        sfx.go(); await ctx.wait(2600); if (!ctx.alive) return;
        const order_ = await G.run(); if (!ctx.alive) return;
        order_.forEach((p, k) => (p.pts += Math.max(0, 3 - k)));
        net.send({ type: 'result', winner: order_[0].id, name: order_[0].name });
        if (order.length > 1) {
          scene.replaceChildren(banner(`${order_[0].emoji} ${order_[0].name} gagne l’épreuve !`), scoreTable(), h('p.faint', '1er +3 · 2e +2 · 3e +1'));
          sfx.win(); await ctx.wait(3400); if (!ctx.alive) return;
        }
      }
      phase = 'over'; onTap = null;
      const final = [...players.values()].sort((a, b) => b.pts - a.pts);
      const w = final[0];
      net.send({ type: 'result', winner: w.id, name: w.name });
      confetti();
      ctx.end({ emoji: w.emoji, title: order.length > 1 ? `${w.name} est le roi de la soirée !` : `${w.name} gagne la course !`, display: '🏆', label: `${players.size} joueur${players.size > 1 ? 's' : ''} · aucune appli installée`, win: true, multi: true, extra: order.length > 1 ? scoreTable() : null });
    }
    function scoreTable() {
      return h('div', { style: { display: 'grid', gap: '6px', width: '100%', maxWidth: '520px' } }, [...players.values()].sort((a, b) => b.pts - a.pts).map((p, i) => h('div', { style: { display: 'flex', justifyContent: 'space-between', padding: '10px 14px', borderRadius: '14px', background: i === 0 ? 'rgba(255,210,63,.14)' : 'rgba(255,255,255,.05)' } }, h('span', `${['🥇', '🥈', '🥉'][i] || i + 1 + '.'} ${p.emoji} ${p.name}`), h('b', `${p.pts} pts`))));
    }

    // 🚀 Course : premier à GOAL taps
    let raceEl;
    async function raceGame() {
      players.forEach((p) => (p.pos = 0));
      const finished = [];
      raceEl = h('div', { style: { width: '100%', maxWidth: '1000px', display: 'grid', gap: '10px' } });
      scene.replaceChildren(banner(`Tapez ! Premier à ${GOAL}`), raceEl, localPads());
      paintRace(); net.send({ type: 'state', phase: 'countdown' });
      await ctx.countdown(); if (!ctx.alive) return [];
      net.send({ type: 'state', phase: 'play', label: '🚀 TAPE !' });
      return new Promise((res) => {
        onTap = (p) => { if (finished.includes(p)) return; p.pos = Math.min(GOAL, p.pos + 1); sfx.tick(); paintRace(); if (p.pos >= GOAL) { finished.push(p); if (finished.length === 1) { sfx.win(); ctx.timeout(done, 1500); } } };
        const done = () => { onTap = null; const rest = [...players.values()].filter((p) => !finished.includes(p)).sort((a, b) => b.pos - a.pos); res([...finished, ...rest]); };
      });
    }
    function paintRace() {
      if (!raceEl) return;
      raceEl.replaceChildren(...[...players.values()].map((p) => h('div', { style: { display: 'grid', gridTemplateColumns: '110px 1fr', gap: '10px', alignItems: 'center' } },
        h('b', { style: { color: p.color, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, `${p.emoji} ${p.name}`),
        h('div', { style: { position: 'relative', height: '54px', borderRadius: '16px', background: 'rgba(255,255,255,.06)', overflow: 'hidden' } },
          h('div', { style: { position: 'absolute', inset: '0 auto 0 0', width: `${(p.pos / GOAL) * 100}%`, background: `linear-gradient(90deg,transparent,${p.color}66)`, transition: 'width .08s' } }),
          h('span', { style: { position: 'absolute', top: '50%', left: `calc(${(p.pos / GOAL) * 100}% - ${(p.pos / GOAL) * 40}px)`, transform: 'translateY(-50%) rotate(45deg)', fontSize: '34px', transition: 'left .08s' } }, '🚀'),
          h('span', { style: { position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '24px' } }, '🏁')))));
    }

    // ⚡ Réflexe : 3 manches, le premier à taper après le vert gagne la manche
    async function reflexGame() {
      const wins = new Map([...players.values()].map((p) => [p, 0]));
      for (let r = 0; r < 3; r++) {
        const burnt = new Set(); let green = false, winner = null;
        const pad = h('div', { style: { width: 'min(90vw,640px)', height: 'min(46vh,360px)', borderRadius: '28px', background: '#ff3d5a', display: 'grid', placeItems: 'center', fontSize: '40px', fontWeight: 900, transition: 'background .05s' } }, 'Attendez…');
        const info = h('p.muted', `Manche ${r + 1} sur 3`);
        scene.replaceChildren(banner('⚡ Réflexe'), pad, info, localPads());
        net.send({ type: 'state', phase: 'play', label: '⚡ Attends le VERT…' });
        await new Promise((res) => {
          onTap = (p) => {
            if (winner || burnt.has(p)) return;
            if (!green) { burnt.add(p); info.textContent = `${p.emoji} ${p.name} est grillé·e !`; sfx.bad(); if (burnt.size >= players.size) { winner = { none: true }; ctx.timeout(res, 1200); } return; }
            winner = p; wins.set(p, wins.get(p) + 1); pad.textContent = `${p.emoji} ${p.name} !`; pad.style.background = p.color; sfx.ok(); ctx.timeout(res, 1500);
          };
          ctx.timeout(() => { if (winner) return; green = true; pad.style.background = '#2ecc71'; pad.textContent = 'MAINTENANT !'; sfx.go(); net.send({ type: 'state', phase: 'play', label: '⚡ TAPE !' }); }, 1800 + Math.random() * 3200);
        });
        onTap = null; if (!ctx.alive) return [];
      }
      return [...players.values()].sort((a, b) => wins.get(b) - wins.get(a));
    }

    // 🐑 Compte les moutons : un tap par mouton, les chèvres sont des pièges
    async function countGame() {
      const taps = new Map([...players.values()].map((p) => [p, 0]));
      const field = h('div', { style: { position: 'relative', width: 'min(92vw,800px)', height: 'min(50vh,400px)', borderRadius: '28px', background: 'linear-gradient(#5ec576,#2f8f4e)', overflow: 'hidden' } });
      scene.replaceChildren(banner('🐑 Comptez les moutons !'), field, localPads());
      net.send({ type: 'state', phase: 'countdown' });
      await ctx.countdown(); if (!ctx.alive) return [];
      net.send({ type: 'state', phase: 'play', label: '🐑 Tape pour chaque mouton' });
      onTap = (p) => { taps.set(p, taps.get(p) + 1); sfx.tick(); };
      let sheep = 0; const total = 14 + Math.floor(Math.random() * 8);
      for (let i = 0; i < total; i++) {
        const goat = i > 2 && Math.random() < 0.3; if (!goat) sheep++;
        const y = 10 + Math.random() * 70, dur = 1300 + Math.random() * 900;
        const el = h('span', { style: { position: 'absolute', top: y + '%', left: '-12%', fontSize: '52px' } }, goat ? '🐐' : '🐑');
        field.append(el); el.animate([{ left: '-12%' }, { left: '108%' }], { duration: dur, easing: 'linear' }).onfinish = () => el.remove();
        await ctx.wait(300 + Math.random() * 650); if (!ctx.alive) return [];
      }
      await ctx.wait(2200); onTap = null; if (!ctx.alive) return [];
      const order_ = [...players.values()].sort((a, b) => Math.abs(taps.get(a) - sheep) - Math.abs(taps.get(b) - sheep));
      scene.replaceChildren(banner(`Il y avait ${sheep} moutons 🐑`), h('div', { style: { display: 'grid', gap: '6px', width: '100%', maxWidth: '460px' } }, order_.map((p) => h('div', { style: { display: 'flex', justifyContent: 'space-between', padding: '8px 12px', borderRadius: '12px', background: 'rgba(255,255,255,.05)' } }, h('span', `${p.emoji} ${p.name}`), h('b', `${taps.get(p)} ${taps.get(p) === sheep ? '🎯' : ''}`)))));
      await ctx.wait(3200);
      return order_;
    }
    lobby();
  },
};

/** Écran manette (ouvert via le QR code). */
export function controller(root, params) {
  const room = (params.get('room') || '').toUpperCase();
  const id = 'c-' + Math.random().toString(36).slice(2, 8);
  const net = transport(room);
  let me = null;
  document.title = 'Manette · Minigames';
  const wrap = h('div', { style: { position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px', padding: '20px', textAlign: 'center' } });
  clear(root).append(wrap);
  const join = () => {
    const input = h('input.input', { placeholder: 'Ton prénom', maxLength: 14, style: { textAlign: 'center', fontSize: '20px' } });
    wrap.replaceChildren(h('div.logo', h('span.logo-mark', { html: icon('logo') }), 'Minigames'), h('h2', `Salon ${room || '????'}`), input,
      h('button.btn.btn-primary.btn-lg.btn-block', { style: { maxWidth: '340px' }, onclick: () => { net.send({ type: 'join', id, name: input.value.trim() }); wrap.replaceChildren(h('p.muted', 'Connexion à l’écran…')); } }, 'Rejoindre'));
  };
  const pad = (msg) => {
    const b = h('button', { style: { width: 'min(80vw,60vh)', aspectRatio: '1', borderRadius: '50%', border: 0, background: `radial-gradient(circle at 35% 30%, #fff8, ${me.color})`, boxShadow: `0 20px 60px ${me.color}88`, fontSize: '90px', touchAction: 'manipulation' },
      onpointerdown: (e) => { e.preventDefault(); net.send({ type: 'tap', id }); vibrate(8); b.animate([{ transform: 'scale(.94)' }, { transform: 'scale(1)' }], { duration: 120 }); } }, me.emoji);
    wrap.replaceChildren(h('div.big-msg', msg), b, h('p.muted', 'Regarde le grand écran et tape ici.'));
  };
  net.on((m) => {
    if (m.type === 'welcome' && m.id === id) { me = m; wrap.replaceChildren(h('div', { style: { fontSize: '90px' } }, m.emoji), h('div.big-msg', 'C’est bon !'), h('p.muted', 'Regarde le grand écran, la course va commencer.')); vibrate(30); }
    if (!me) return;
    if (m.type === 'state' && m.phase === 'play') pad(m.label || 'GO !');
    if (m.type === 'state' && m.phase === 'countdown') wrap.replaceChildren(h('div.countdown', '3…'));
    if (m.type === 'state' && m.phase === 'pause') wrap.replaceChildren(h('div', { style: { fontSize: '70px' } }, me.emoji), h('div.big-msg', m.text || 'Regarde l’écran'), h('p.muted', 'Garde ce téléphone en main.'));
    if (m.type === 'result') wrap.replaceChildren(h('div', { style: { fontSize: '90px' } }, m.winner === id ? '🏆' : '😅'), h('div.big-msg', m.winner === id ? 'Tu as gagné !' : `${m.name} a gagné`), h('p.muted', 'La suite se passe sur le grand écran.'));
  });
  net.send({ type: 'hello', id });
  join();
  return () => net.close();
}
