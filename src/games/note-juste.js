import { h } from '../core/dom.js';
import { sfx, vibrate, audioCtx } from '../core/sfx.js';
import { makeRng, todayKey } from '../core/rng.js';

const NAMES = ['Do', 'Do♯', 'Ré', 'Ré♯', 'Mi', 'Fa', 'Fa♯', 'Sol', 'Sol♯', 'La', 'La♯', 'Si'];
const ROUNDS = 8;
const freqOf = (midi) => 440 * 2 ** ((midi - 69) / 12);
const cents = (f, ref) => 1200 * Math.log2(f / ref);
const fold = (c) => ((((c + 600) % 1200) + 1200) % 1200) - 600; // ignore l'octave (voix grave ou aiguë)
const ptsFor = (c) => Math.max(0, Math.round(100 - Math.abs(c) * 1.5));

// Détection de hauteur par autocorrélation
function detect(buf, rate) {
  let rms = 0; for (const v of buf) rms += v * v; rms = Math.sqrt(rms / buf.length); if (rms < 0.012) return null;
  const n = buf.length, minL = Math.floor(rate / 1100), maxL = Math.floor(rate / 70);
  let best = -1, bestL = -1, prev = 0;
  const corr = new Float32Array(maxL + 2);
  for (let L = minL; L <= maxL; L++) { let s = 0; for (let i = 0; i < n - L; i++) s += buf[i] * buf[i + L]; corr[L] = s; }
  for (let L = minL + 1; L < maxL; L++) { if (corr[L] > corr[L - 1] && corr[L] >= corr[L + 1] && corr[L] > best) { best = corr[L]; bestL = L; } prev = corr[L]; }
  if (bestL < 0 || best < corr[minL] * 0.3) return null;
  const a = corr[bestL - 1], b = corr[bestL], c = corr[bestL + 1], sh = (a - c) / (2 * (a - 2 * b + c) || 1);
  return rate / (bestL + sh);
}

export default {
  start(ctx) {
    const mode = ctx.mode || 'oreille'; let voice = mode === 'voix';
    const R = mode === 'jour' ? makeRng('note-' + todayKey()) : ctx.rng;
    const notes = Array.from({ length: ROUNDS }, (_, i) => R.int(57 + Math.min(4, i), 69 + Math.min(3, i))); // La3 à Do5
    let ac = null, sust = null, stream = null, an = null, raf = 0, total = 0, best = 999, under20 = 0;
    const scene = h('div.center-stage', { style: { gap: '14px' } }); ctx.stage.append(scene);
    const play = (f, dur = 1.2) => {
      ac = audioCtx(); if (!ac) return;
      const t = ac.currentTime, o = ac.createOscillator(), o2 = ac.createOscillator(), gn = ac.createGain();
      o.type = 'triangle'; o.frequency.value = f; o2.type = 'sine'; o2.frequency.value = f * 2; const g2 = ac.createGain(); g2.gain.value = 0.25;
      gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(0.3, t + 0.03); gn.gain.setValueAtTime(0.3, t + dur - 0.2); gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(gn); o2.connect(g2).connect(gn); gn.connect(ac.destination); o.start(t); o2.start(t); o.stop(t + dur + 0.05); o2.stop(t + dur + 0.05);
    };
    // Son tenu, réglable (mode Oreille)
    const hold = (f) => { ac = audioCtx(); if (!ac) return; if (!sust) { const o = ac.createOscillator(), gn = ac.createGain(); o.type = 'triangle'; gn.gain.value = 0.0001; gn.gain.exponentialRampToValueAtTime(0.25, ac.currentTime + 0.03); o.connect(gn).connect(ac.destination); o.start(); sust = { o, gn }; } sust.o.frequency.setTargetAtTime(f, ac.currentTime, 0.015); };
    const release = () => { if (sust) { const { o, gn } = sust; gn.gain.setTargetAtTime(0.0001, ac.currentTime, 0.04); o.stop(ac.currentTime + 0.3); sust = null; } };
    ctx.onCleanup(() => { release(); cancelAnimationFrame(raf); stream?.getTracks().forEach((t) => t.stop()); });

    const meter = (c) => {
      // Aiguille de justesse : −50 à +50 centièmes
      const k = Math.max(-1, Math.min(1, c / 50));
      return h('div', { style: { position: 'relative', width: 'min(84vw,340px)', height: '40px', borderRadius: '20px', background: 'linear-gradient(90deg,#ff3d5a,#ffd23f 35%,#3ddc97 50%,#ffd23f 65%,#ff3d5a)' } },
        h('i', { style: { position: 'absolute', top: '-6px', bottom: '-6px', width: '4px', left: `calc(${50 + k * 50}% - 2px)`, background: '#fff', borderRadius: '2px', boxShadow: '0 0 8px #000' } }));
    };
    const result = async (r, c) => {
      const p = ptsFor(c); total += p; best = Math.min(best, Math.abs(c)); if (Math.abs(c) < 20) under20++;
      scene.replaceChildren(h('div.faint', `NOTE ${r + 1}/${ROUNDS}`), h('div.big-msg', { style: { fontSize: '30px' } }, Math.abs(c) < 5 ? '🎯 Parfait !' : Math.abs(c) < 20 ? 'Très juste !' : Math.abs(c) < 50 ? 'Presque…' : c > 0 ? 'Trop aigu' : 'Trop grave'),
        meter(c), h('div', { style: { fontWeight: 800 } }, `${c > 0 ? '+' : ''}${Math.round(c)} centièmes · +${p}`));
      p >= 90 ? (sfx.win(), ctx.flash('rgba(61,220,151,.25)')) : p >= 50 ? sfx.ok() : sfx.bad(); vibrate(10);
      ctx.hud({ pts: `${total} pts` }); await ctx.wait(1700);
    };

    const roundEar = (r, f) => new Promise((res) => {
      // Curseur sur 2 octaves, départ aléatoire
      let v = R.float(-1, 1) * 9 + (R.float(0, 1) < 0.5 ? -4 : 4); const cur = () => f * 2 ** (v / 12);
      const track = h('div', { style: { position: 'relative', width: 'min(84vw,340px)', height: '84px', borderRadius: '42px', background: 'linear-gradient(90deg,#3a1cff,#ff4fa3)', touchAction: 'none', cursor: 'pointer' } });
      const knob = h('div', { style: { position: 'absolute', top: '6px', width: '72px', height: '72px', borderRadius: '50%', background: '#fff', display: 'grid', placeItems: 'center', fontSize: '28px', boxShadow: '0 6px 20px rgba(0,0,0,.4)' } }, '🎵');
      track.append(knob);
      const place = () => (knob.style.left = `calc(${((v + 12) / 24) * 100}% - 36px)`);
      const fromX = (x) => { const b = track.getBoundingClientRect(); v = Math.max(-12, Math.min(12, ((x - b.left) / b.width) * 24 - 12)); place(); hold(cur()); };
      let down = false;
      track.addEventListener('pointerdown', (e) => { down = true; track.setPointerCapture(e.pointerId); fromX(e.clientX); });
      track.addEventListener('pointermove', (e) => down && fromX(e.clientX));
      const up = () => { down = false; release(); }; track.addEventListener('pointerup', up); track.addEventListener('pointercancel', up);
      const fine = (d) => h('button.btn', { style: { minWidth: '64px' }, onclick: () => { v = Math.max(-12, Math.min(12, v + d)); place(); play(cur(), 0.6); } }, d > 0 ? '+' : '−');
      scene.replaceChildren(h('div.faint', `NOTE ${r + 1}/${ROUNDS}`), h('div.big-msg', { style: { fontSize: '26px' } }, 'Fais sonner la même note'),
        h('button.btn', { onclick: () => play(f) }, '🔊 Réécouter la note'), h('p.muted', { style: { margin: 0 } }, 'Glisse sur la barre : tu entends ton son'), track,
        h('div', { style: { display: 'flex', gap: '8px' } }, fine(-0.1), h('button.btn', { onclick: () => play(cur(), 0.8) }, '▶ Mon son'), fine(0.1)),
        h('button.btn.btn-primary.btn-lg', { onclick: () => { release(); res(cents(cur(), f)); } }, 'Valider'));
      place(); ctx.timeout(() => play(f), 300);
    });

    const roundVoice = (r, f) => new Promise((res) => {
      const bufArr = new Float32Array(2048); const got = []; let since = 0, stopped = false;
      const needle = h('div'); const status = h('div', { style: { fontWeight: 800, minHeight: '24px' } }, 'Chante quand tu veux…');
      const bar = h('div.bar', { style: { width: 'min(84vw,340px)' } }, h('i', { style: { width: '0%' } }));
      scene.replaceChildren(h('div.faint', `NOTE ${r + 1}/${ROUNDS}`), h('div.big-msg', { style: { fontSize: '26px' } }, `Chante ou siffle : ${NAMES[(Math.round(12 * Math.log2(f / 440)) + 69 + 1200) % 12]}`),
        h('button.btn', { onclick: () => play(f) }, '🔊 Réécouter'), needle, status, bar, h('p.faint', 'Tiens la note 1,5 seconde. L’octave n’a pas d’importance.'));
      needle.replaceChildren(meter(0)); ctx.timeout(() => play(f), 300);
      const t0 = performance.now() + 1300;
      const tick = () => {
        if (stopped || !ctx.alive) return;
        an.getFloatTimeDomainData(bufArr);
        const p = performance.now() > t0 ? detect(bufArr, ac.sampleRate) : null;
        if (p) { const c = fold(cents(p, f)); got.push(c); since++; needle.replaceChildren(meter(c)); status.textContent = `${c > 0 ? '+' : ''}${Math.round(c)} centièmes`; }
        else if (since > 0) since = Math.max(0, since - 0.5);
        bar.firstChild.style.width = `${Math.min(100, (got.length / 60) * 100)}%`;
        if (got.length >= 60) { stopped = true; const s = got.slice(15).sort((a, b) => a - b); return res(s[Math.floor(s.length / 2)]); }
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    });

    const run = async () => {
      if (voice) {
        try {
          ac = audioCtx(); stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
          const srcN = ac.createMediaStreamSource(stream); an = ac.createAnalyser(); an.fftSize = 2048; srcN.connect(an);
        } catch {
          voice = false;
          await new Promise((res) => scene.replaceChildren(h('div', { style: { fontSize: '48px' } }, '🎙️'), h('div.big-msg', { style: { fontSize: '22px', textAlign: 'center' } }, 'Micro indisponible'), h('p.muted', { style: { textAlign: 'center', maxWidth: '340px' } }, 'Autorise le micro dans ton navigateur pour le mode Voix. En attendant, on joue en mode Oreille.'), h('button.btn.btn-primary.btn-lg', { onclick: res }, 'Jouer en mode Oreille')));
        }
        if (!ctx.alive) return;
      }
      for (let r = 0; r < ROUNDS && ctx.alive; r++) {
        const f = freqOf(notes[r]);
        const c = voice ? await roundVoice(r, f) : await roundEar(r, f);
        if (!ctx.alive) return; await result(r, c);
      }
      if (!ctx.alive) return;
      stream?.getTracks().forEach((t) => t.stop());
      ctx.end({
        score: total, display: `${total} pts`, emoji: voice ? '🎤' : '👂', board: mode === 'oreille' ? null : voice ? 'voix' : mode === 'jour' ? 'jour' : null,
        title: total >= 650 ? 'Oreille absolue' : total >= 450 ? 'Belle justesse' : 'Un peu faux, mais avec le cœur',
        label: `${ROUNDS} notes · meilleure à ${Math.round(best)} centièmes${voice ? ' · au micro' : ''}`,
        feats: [best < 5 && 'diapason', under20 === ROUNDS && 'parfait', voice && total >= 550 && 'chanteur'].filter(Boolean),
      });
    };
    ctx.hud({ pts: '0 pts' }); run();
  },
};
