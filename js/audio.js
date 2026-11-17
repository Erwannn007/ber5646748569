'use strict';
// =====================================================================
//  SON — banque de sons synthétisés à l'avance (plusieurs variantes),
//  réverbération de donjon, spatialisation gauche/droite
// =====================================================================
const Sfx = (() => {
  let ac = null, out = null, rev = null, SR = 44100;
  const B = {}, lastT = {};
  const rnd = (a, b) => a + Math.random() * (b - a);

  // ---------- DSP hors-ligne ----------
  const W = n => { const a = new Float32Array(n); for (let i = 0; i < n; i++) a[i] = Math.random() * 2 - 1; return a; };
  function biq(x, type, fc, q = .707) {
    const o = new Float32Array(x.length), isF = typeof fc === 'function';
    let x1 = 0, x2 = 0, y1 = 0, y2 = 0, b0, b1, b2, a1, a2;
    const coef = f => {
      f = Math.min(Math.max(f, 20), SR * .45);
      const w = 2 * Math.PI * f / SR, c = Math.cos(w), s = Math.sin(w), al = s / (2 * q), A0 = 1 + al;
      let B0, B1, B2;
      if (type === 'lp') { B0 = (1 - c) / 2; B1 = 1 - c; B2 = B0; } else if (type === 'hp') { B0 = (1 + c) / 2; B1 = -(1 + c); B2 = B0; } else { B0 = al; B1 = 0; B2 = -al; }
      b0 = B0 / A0; b1 = B1 / A0; b2 = B2 / A0; a1 = -2 * c / A0; a2 = (1 - al) / A0;
    };
    coef(isF ? fc(0) : fc);
    for (let i = 0; i < x.length; i++) {
      if (isF && (i & 31) === 0) coef(fc(i));
      const y = b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = x[i]; y2 = y1; y1 = y; o[i] = y;
    } return o;
  }
  // bruit lissé (pour moduler l'amplitude : gargouillis, grain)
  function smooth(n, rate) { const k = Math.min(1, rate / SR * 6); const o = new Float32Array(n); let v = 0, t = 0; for (let i = 0; i < n; i++) { if (i % Math.max(1, (SR / rate) | 0) === 0) t = Math.random(); v += (t - v) * k; o[i] = v; } return o; }
  const Z = s => new Float32Array(Math.floor(s * SR));
  function addAt(dst, src, at, g = 1) { const o = Math.floor(at * SR); for (let i = 0; i < src.length && o + i < dst.length; i++) if (o + i >= 0) dst[o + i] += src[i] * g; }
  function env(a, fn) { for (let i = 0; i < a.length; i++) a[i] *= fn(i / SR, i); return a; }
  function osc(n, ff, shape = 'sin') {
    const o = new Float32Array(n); let ph = 0;
    for (let i = 0; i < n; i++) {
      ph += ff(i / SR) / SR; ph -= Math.floor(ph);
      o[i] = shape === 'sin' ? Math.sin(ph * 2 * Math.PI) : shape === 'saw' ? ph * 2 - 1 : (ph < .5 ? 1 : -1);
    } return o;
  }
  function burst(len, type, fc, q, tau) { return env(biq(W(Math.floor(len * SR)), type, fc, q), t => Math.exp(-t / tau)); }
  function drive(a, k) { const n = Math.tanh(k); for (let i = 0; i < a.length; i++) a[i] = Math.tanh(a[i] * k) / n; return a; }
  function formant(src, fs, qs, gs) { const o = new Float32Array(src.length); fs.forEach((f, j) => { const b = biq(src, 'bp', f, qs[j]); for (let i = 0; i < o.length; i++) o[i] += b[i] * gs[j]; }); return o; }
  const voiced = (n, f0, f1, jit, sub) => {
    const js = smooth(n, 30);
    const s = osc(n, t => lerpF(f0, f1, t / (n / SR)) * (1 + (js[Math.min(n - 1, (t * SR) | 0)] - .5) * jit), 'saw');
    if (sub) { const s2 = osc(n, t => lerpF(f0, f1, t / (n / SR)) * .5, 'saw'); for (let i = 0; i < n; i++) s[i] += s2[i] * sub; }
    return s;
  };
  const lerpF = (a, b, t) => a + (b - a) * Math.min(1, Math.max(0, t));
  function finish(d, pk = .9) { let m = 0; for (const v of d) m = Math.max(m, Math.abs(v)); const g = m ? pk / m : 1; const b = ac.createBuffer(1, d.length, SR); const ch = b.getChannelData(0); for (let i = 0; i < d.length; i++) ch[i] = d[i] * g; return b; }

  // ---------- recettes ----------
  const R = {
    swing() { // fouettement d'une lame lourde dans l'air
      const d = rnd(.26, .32), n = Math.floor(d * SR), x = W(n), pk = rnd(.38, .5);
      const bp = biq(x, 'bp', i => { const u = i / n; return 380 + 2300 * Math.exp(-Math.pow((u - pk) / .2, 2)); }, 1.3);
      const lo = biq(x, 'lp', 320);
      const o = new Float32Array(n);
      for (let i = 0; i < n; i++) { const u = i / n, e = Math.exp(-Math.pow((u - pk) / .17, 2)); o[i] = (bp[i] + lo[i] * .9) * e; }
      return o;
    },
    swingH() {
      const d = rnd(.45, .55), n = Math.floor(d * SR), x = W(n), pk = rnd(.4, .5);
      const bp = biq(x, 'bp', i => { const u = i / n; return 220 + 1400 * Math.exp(-Math.pow((u - pk) / .22, 2)); }, 1.1);
      const lo = biq(x, 'lp', 180), sub = osc(n, t => 48 + 20 * Math.exp(-Math.pow((t / d - pk) / .2, 2)));
      const o = new Float32Array(n);
      for (let i = 0; i < n; i++) { const u = i / n, e = Math.exp(-Math.pow((u - pk) / .2, 2)); o[i] = (bp[i] + lo[i] * 1.3 + sub[i] * .35) * e; }
      return o;
    },
    slice() { // lame qui entre dans la chair
      const o = Z(.38);
      addAt(o, burst(.006, 'hp', 4000, .7, .0015), 0, 1.2);
      addAt(o, burst(.06, 'bp', rnd(2800, 4200), 1.2, .018), .001, .9);
      const n = Math.floor(.3 * SR), am = smooth(n, rnd(45, 70));
      addAt(o, env(biq(W(n), 'bp', rnd(700, 1100), 1.8), (t, i) => Math.exp(-t / .07) * Math.pow(am[i], 2) * 2.2), .004, 1.1);
      addAt(o, env(osc(Math.floor(.18 * SR), t => 100 * Math.exp(-t * 9) + 42), t => Math.exp(-t / .05)), 0, .9);
      return drive(o, 1.6);
    },
    crack() { // os qui casse
      const o = Z(.12), k = 3 + (Math.random() * 3 | 0);
      for (let j = 0; j < k; j++) addAt(o, burst(.012, 'bp', rnd(1400, 3600), 3, .0035), rnd(0, .06), rnd(.5, 1));
      addAt(o, burst(.05, 'lp', 600, .8, .015), 0, .5);
      return o;
    },
    squelch() { // chair qui se déchire
      const d = .55, o = Z(d);
      for (let j = 0; j < 34; j++) {
        const t = Math.pow(Math.random(), 1.6) * .45, L = rnd(.008, .035), n = Math.floor(L * SR);
        const g = env(biq(W(n), 'bp', rnd(250, 1500), rnd(2, 5)), (tt) => Math.sin(Math.PI * tt / L));
        addAt(o, g, t, (1 - t / d) * rnd(.4, 1));
      }
      const n = o.length, am = smooth(n, rnd(12, 20));
      addAt(o, env(biq(W(n), 'lp', 320, 1.5), (t, i) => Math.exp(-t / .18) * am[i] * 1.5), 0, .8);
      return o;
    },
    splat() { // gerbe de sang qui retombe
      const d = .6, o = Z(d);
      addAt(o, env(biq(W(Math.floor(.3 * SR)), 'lp', 1600), t => Math.exp(-t / .08)), 0, .35);
      for (let j = 0; j < 60; j++) {
        const t = Math.pow(Math.random(), 2) * .55;
        addAt(o, burst(.005, 'bp', rnd(1200, 4500), 2.5, rnd(.0008, .002)), t, (1 - t / d) * rnd(.15, .8));
      }
      return o;
    },
    gush() { // jet de sang
      const d = rnd(.8, 1.1), n = Math.floor(d * SR), am = smooth(n, rnd(18, 28));
      return env(biq(W(n), 'bp', i => 650 - 250 * i / n, .9), (t, i) => Math.min(1, t / .03) * Math.exp(-t / .35) * Math.pow(am[i], 1.5) * 2);
    },
    drop() { const o = Z(.05); addAt(o, burst(.008, 'bp', rnd(1500, 3500), 3, .002), 0); return o; },
    thud() { // morceau qui retombe au sol
      const o = Z(.25);
      addAt(o, env(osc(Math.floor(.2 * SR), t => 85 * Math.exp(-t * 6) + 40), t => Math.exp(-t / .045)), 0, 1);
      addAt(o, burst(.15, 'lp', 500, 1, .035), 0, .7);
      for (let j = 0; j < 6; j++) addAt(o, burst(.02, 'bp', rnd(400, 1200), 3, .006), rnd(0, .08), .3);
      return o;
    },
    clang() { // lame contre la pierre
      const d = 1.3, n = Math.floor(d * SR), f0 = rnd(420, 640), o = new Float32Array(n);
      [[1, 1, .7], [2.32, .6, .45], [4.25, .45, .3], [6.63, .3, .2], [9.38, .2, .12]].forEach(([m, a, tau]) => { const s = osc(n, () => f0 * m * rnd(.995, 1.005)); for (let i = 0; i < n; i++) o[i] += s[i] * a * Math.exp(-i / SR / tau); });
      addAt(o, burst(.12, 'hp', 2500, .8, .03), 0, 1.4);
      for (let j = 0; j < 8; j++) addAt(o, burst(.01, 'bp', rnd(3000, 6000), 4, .002), rnd(0, .05), .5);
      return o;
    },
    boom() { // impact d'exécution
      const d = 2, n = Math.floor(d * SR), o = new Float32Array(n);
      const sub = osc(n, t => 62 * Math.exp(-t * 1.6) + 26);
      for (let i = 0; i < n; i++) o[i] = sub[i] * Math.exp(-i / SR / .55);
      addAt(o, env(biq(W(n), 'lp', i => 900 * Math.exp(-i / SR * 3) + 60), t => Math.exp(-t / .45)), 0, .9);
      addAt(o, burst(.01, 'hp', 3000, .7, .002), 0, .6);
      return drive(o, 2.2);
    },
    growl() { // grognement monstrueux
      const d = rnd(.7, 1), n = Math.floor(d * SR), f0 = rnd(62, 80);
      const v = voiced(n, f0, f0 * .8, .35, .6);
      const f = formant(v, [rnd(380, 480), rnd(780, 950), 2500], [5, 6, 8], [1, .7, .25]);
      const rasp = env(biq(W(n), 'bp', 1100, 2), (t, i) => .4 * (.5 + .5 * Math.sin(2 * Math.PI * f0 * t)));
      for (let i = 0; i < n; i++) f[i] += rasp[i];
      return drive(env(f, t => Math.min(1, t / .07) * Math.min(1, (d - t) / .25)), 2.5);
    },
    shriek() { // cri aigu (ange déchu)
      const d = rnd(.6, .85), n = Math.floor(d * SR), f0 = rnd(380, 460);
      const v = osc(n, t => (f0 + 120 * t / d) * (1 + .04 * Math.sin(2 * Math.PI * 7 * t)), 'saw');
      const f = formant(v, [320, 2300, 3100], [6, 9, 9], [.6, 1, .6]);
      addAt(f, env(biq(W(n), 'bp', 2800, 2), t => .25), 0);
      return drive(env(f, t => Math.min(1, t / .05) * Math.pow(Math.max(0, 1 - t / d), 1.3)), 1.8);
    },
    hurt() { // grognement du joueur
      const d = .32, n = Math.floor(d * SR), f0 = rnd(125, 150);
      const v = voiced(n, f0, f0 * .72, .25, .3);
      const f = formant(v, [rnd(600, 700), 1100, 2500], [6, 7, 9], [1, .7, .3]);
      addAt(f, env(osc(Math.floor(.15 * SR), t => 70 * Math.exp(-t * 8) + 40), t => Math.exp(-t / .05)), 0, 2);
      return drive(env(f, t => Math.min(1, t / .015) * Math.exp(-t / .12)), 1.8);
    },
    roar() { // cri de fureur
      const d = 1.3, n = Math.floor(d * SR), f0 = rnd(95, 110);
      const v = voiced(n, f0 * 1.2, f0 * .85, .5, .8);
      const f = formant(v, [720, 1220, 2600], [4, 5, 7], [1, .8, .35]);
      addAt(f, env(biq(W(n), 'lp', 200), t => 2), 0);
      return drive(env(f, t => Math.min(1, t / .1) * Math.min(1, (d - t) / .4)), 3);
    },
    cast() { // magie qui se charge
      const d = .8, n = Math.floor(d * SR), o = new Float32Array(n);
      for (let k = 0; k < 6; k++) { const f = rnd(700, 2200), s = osc(n, t => f * (1 + .5 * t / d)), tr = rnd(8, 16); for (let i = 0; i < n; i++) o[i] += s[i] * (.5 + .5 * Math.sin(2 * Math.PI * tr * i / SR)) * .25; }
      addAt(o, biq(W(n), 'bp', i => 400 + 2800 * i / n, 3), 0, .6);
      return env(o, t => Math.min(1, t / .5) * Math.min(1, (d - t) / .1));
    },
    fizz() { const o = Z(.45); addAt(o, burst(.4, 'hp', 1800, .7, .09), 0, .7); for (let j = 0; j < 40; j++) addAt(o, burst(.004, 'bp', rnd(2000, 6000), 2, .001), Math.pow(Math.random(), 1.5) * .35, rnd(.2, .9)); addAt(o, burst(.2, 'lp', 300, 1, .05), 0, .8); return o; },
    step() { const o = Z(.1); addAt(o, burst(.004, 'hp', 2000, .7, .001), 0, .5); addAt(o, burst(.08, 'lp', rnd(500, 800), 1, .018), 0, 1); addAt(o, env(osc(Math.floor(.06 * SR), () => 110), t => Math.exp(-t / .02)), 0, .5); for (let j = 0; j < 4; j++) addAt(o, burst(.006, 'bp', rnd(1500, 3000), 3, .0015), rnd(0, .03), .25); return o; },
    heavyStep() { const o = Z(.45); addAt(o, env(osc(Math.floor(.4 * SR), t => 60 * Math.exp(-t * 4) + 30), t => Math.exp(-t / .12)), 0, 1); addAt(o, burst(.3, 'lp', 350, 1, .07), 0, .8); for (let j = 0; j < 10; j++) addAt(o, burst(.01, 'bp', rnd(600, 2000), 3, .003), rnd(.01, .15), .25); return drive(o, 1.5); },
    orb() { const o = Z(.2); addAt(o, env(osc(Math.floor(.2 * SR), t => 1300 * (1 + t)), t => Math.exp(-t / .04)), 0, 1); addAt(o, env(osc(Math.floor(.2 * SR), t => 2650), t => Math.exp(-t / .03)), 0, .35); return o; },
    pickup() { const o = Z(.35); for (let k = 0; k < 3; k++) addAt(o, env(osc(Math.floor(.06 * SR), t => 300 + 900 * t / .06), t => Math.sin(Math.PI * t / .06)), k * .085, 1); addAt(o, burst(.3, 'lp', 600, 1, .08), 0, .3); return o; },
    gate() { const d = 3, n = Math.floor(d * SR), am = smooth(n, 9), o = env(biq(W(n), 'lp', 260, 1.4), (t, i) => am[i] * 1.6 * Math.min(1, t / .2) * Math.min(1, (d - t) / .8)); addAt(o, env(osc(n, t => 36 + 6 * Math.sin(t * 2)), t => .5 * Math.min(1, (d - t) / .8)), 0); addAt(o, Rboom(), 0, .6); return drive(o, 1.5); },
    heart() { const o = Z(.55); for (const [t, g] of [[0, 1], [.2, .75]]) addAt(o, env(osc(Math.floor(.15 * SR), tt => 58 * Math.exp(-tt * 7) + 32), tt => Math.exp(-tt / .05)), t, g); return o; },
    charge() { const d = .7, n = Math.floor(d * SR); const s = biq(osc(n, t => 70 + 180 * t / d, 'saw'), 'lp', i => 300 + 1200 * i / n, 2); addAt(s, biq(W(n), 'bp', i => 300 + 1500 * i / n, 2), 0, .4); return env(s, t => Math.min(1, t / .2) * Math.min(1, (d - t) / .08)); },
    dash() { const d = .28, n = Math.floor(d * SR), am = smooth(n, 35); const o = env(biq(W(n), 'bp', i => 1500 - 900 * i / n, 1), (t, i) => Math.sin(Math.PI * t / d) * (.6 + am[i] * .8)); return o; },
    stagger() { const o = Z(.6); [[1, .5], [2.7, .3], [5.1, .15]].forEach(([m, tau]) => addAt(o, env(osc(o.length, () => 190 * m), t => Math.exp(-t / tau)), 0, .5)); addAt(o, Rgrowl(), 0, .5); return o; },
    breathOut() { // expiration
      const d = rnd(.55, .75), n = Math.floor(d * SR), am = smooth(n, 6), x = W(n);
      const a = biq(x, 'bp', rnd(1000, 1300), .9), b = biq(x, 'lp', 520);
      const o = new Float32Array(n); for (let i = 0; i < n; i++) { const t = i / SR, e = Math.min(1, t / .07) * Math.pow(Math.max(0, 1 - t / d), 1.6); o[i] = (a[i] + b[i] * .6) * e * (.75 + am[i] * .5); }
      return o;
    },
    breathIn() { // inspiration
      const d = rnd(.4, .55), n = Math.floor(d * SR), x = W(n);
      const a = biq(x, 'bp', i => 1500 + 500 * i / n, 1.2);
      return env(a, t => Math.pow(Math.sin(Math.PI * Math.min(1, t / d)), 1.4) * Math.min(1, t / d * 2));
    },
    drip() { const o = Z(.3); addAt(o, env(osc(Math.floor(.12 * SR), t => 800 + 1400 * Math.min(1, t / .015)), t => Math.exp(-t / .035)), 0, 1); return o; },
    moan() { const d = 2, n = Math.floor(d * SR), f0 = rnd(90, 130); const v = voiced(n, f0, f0 * .85, .2, 0); return env(biq(formant(v, [500, 900], [6, 6], [1, .6]), 'lp', 900), t => Math.sin(Math.PI * t / d)); }
  };
  let Rboom = () => R.boom(), Rgrowl = () => R.growl();
  const VAR = { swing: 4, swingH: 3, slice: 4, crack: 3, squelch: 3, splat: 3, gush: 2, drop: 4, thud: 3, clang: 3, boom: 2, growl: 4, shriek: 3, hurt: 3, roar: 1, cast: 2, fizz: 2, step: 5, heavyStep: 2, orb: 2, pickup: 1, gate: 1, heart: 1, charge: 1, dash: 2, stagger: 2, breathOut: 3, breathIn: 3, drip: 3, moan: 2 };

  function impulse() { // réverbération : salle de pierre
    const d = 2.6, n = Math.floor(d * SR), b = ac.createBuffer(2, n, SR);
    for (let c = 0; c < 2; c++) {
      const x = W(n), f = biq(x, 'lp', i => 7000 * Math.exp(-i / SR * 2.2) + 400), ch = b.getChannelData(c);
      for (let i = 0; i < n; i++) { const t = i / SR; ch[i] = f[i] * Math.exp(-t / .6) * (t < .012 ? t / .012 : 1); }
      for (let k = 0; k < 10; k++) { const p = Math.floor(rnd(.01, .09) * SR); ch[p] += rnd(-.6, .6); }
    }
    return b;
  }
  function ambientBed() {
    const d = 8, n = Math.floor(d * SR), am = smooth(n, .6), wind = biq(W(n), 'bp', i => 260 + 220 * Math.sin(2 * Math.PI * i / n) + 120 * am[i], 2.5);
    const b = ac.createBuffer(1, n, SR), ch = b.getChannelData(0);
    for (let i = 0; i < n; i++) { const t = i / n, fade = Math.min(1, t * 20, (1 - t) * 20); ch[i] = wind[i] * (.5 + am[i]) * fade; }
    const s = ac.createBufferSource(); s.buffer = b; s.loop = true;
    const g = ac.createGain(); g.gain.value = .5; s.connect(g); g.connect(out); g.connect(rev); s.start();
    const dg = ac.createGain(); dg.gain.value = .05; const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 140;
    for (const f of [41.2, 41.7, 55.1]) { const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.connect(lp); o.start(); }
    lp.connect(dg); dg.connect(out);
  }

  function init() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    SR = ac.sampleRate;
    const master = ac.createGain(); master.gain.value = .85;
    const comp = ac.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 5; comp.attack.value = .003; comp.release.value = .15;
    master.connect(comp); comp.connect(ac.destination);
    out = master;
    const conv = ac.createConvolver(); conv.buffer = impulse(); rev = ac.createGain(); rev.gain.value = .9; rev.connect(conv); conv.connect(master);
    // génération progressive pour ne pas bloquer l'écran
    const queue = [];
    for (const k in VAR) for (let v = 0; v < VAR[k]; v++) queue.push(k);
    const order = ['swing', 'slice', 'squelch', 'splat', 'step', 'breathOut', 'breathIn', 'hurt'];
    queue.sort((a, b) => (order.indexOf(b) >= 0) - (order.indexOf(a) >= 0));
    const work = () => {
      const t0 = performance.now();
      while (queue.length && performance.now() - t0 < 12) { const k = queue.shift(); (B[k] = B[k] || []).push(finish(R[k]())); }
      if (queue.length) setTimeout(work, 0); else ambientBed();
    };
    work();
  }
  // o : vol, rate, var (variation de hauteur), pos {x,y}, rev (envoi réverb), delay, gap (anti-spam)
  function play(name, o = {}) {
    if (!ac || !B[name]) return;
    const now = ac.currentTime;
    if (o.gap && lastT[name] && now - lastT[name] < o.gap) return; lastT[name] = now;
    const list = B[name], buf = list[Math.floor(Math.random() * list.length)];
    const s = ac.createBufferSource(); s.buffer = buf;
    s.playbackRate.value = (o.rate || 1) * (1 + (Math.random() - .5) * (o.var === undefined ? .12 : o.var));
    let vol = o.vol === undefined ? 1 : o.vol, pan = 0;
    if (o.pos && typeof P !== 'undefined') {
      const dx = o.pos.x - P.x, dy = o.pos.y - P.y, d = Math.hypot(dx, dy);
      pan = Math.sin(angDiff(P.ang, Math.atan2(dy, dx))) * .75; vol *= 1 / (1 + d * .25);
    }
    const g = ac.createGain(); g.gain.value = vol; s.connect(g);
    let last = g;
    if (ac.createStereoPanner) { const p = ac.createStereoPanner(); p.pan.value = pan; g.connect(p); last = p; }
    last.connect(out);
    const sg = ac.createGain(); sg.gain.value = o.rev === undefined ? .22 : o.rev; last.connect(sg); sg.connect(rev);
    s.start(now + (o.delay || 0));
  }
  let ambT = 4, moanT = 20;
  return {
    init,
    get ok() { return !!ac; },
    play,
    swing(h) { play(h ? 'swingH' : 'swing', { vol: h ? .9 : .7, rev: .15 }); },
    hit() { play('slice', { vol: 1, rev: .2 }); },
    gore() { play('squelch', { vol: .9 }); play('crack', { vol: .55, delay: .01 }); play('splat', { vol: .6, delay: .05, rev: .3 }); play('gush', { vol: .45, delay: .08 }); },
    splat(pos) { play('splat', { vol: .5, pos, gap: .05 }); },
    drop(pos) { play('drop', { vol: .25, pos, gap: .03, var: .4 }); },
    thud(pos) { play('thud', { vol: .7, pos, gap: .06 }); },
    boom() { play('boom', { vol: 1, rev: .55, var: 0 }); },
    clang() { play('clang', { vol: .55, rev: .45 }); },
    growl(p = 1, pos) { play('growl', { rate: p, vol: .8, pos, rev: .35, gap: .15 }); },
    shriek(pos) { play('shriek', { vol: .6, pos, rev: .45, gap: .2 }); },
    hurt() { play('hurt', { vol: .8, rev: .2 }); play('slice', { vol: .35, rate: .8 }); },
    pickup() { play('pickup', { vol: .5 }); },
    orb() { play('orb', { vol: .25, gap: .03, var: .3 }); },
    cast(pos) { play('cast', { vol: .45, pos, rev: .4 }); },
    fizz(pos) { play('fizz', { vol: .6, pos, rev: .3 }); },
    gate() { play('gate', { vol: .9, rev: .6, var: 0 }); },
    heart() { play('heart', { vol: .9, rev: .05, var: 0 }); },
    rage() { play('roar', { vol: 1, rev: .5, var: .05 }); play('boom', { vol: .6, rev: .4 }); },
    charge() { play('charge', { vol: .4 }); },
    dash() { play('dash', { vol: .55 }); },
    step() { play('step', { vol: .3, var: .2, rev: .12 }); },
    heavyStep(pos) { play('heavyStep', { vol: .9, pos, rev: .3, gap: .1 }); },
    stagger(pos) { play('stagger', { vol: .6, pos }); },
    breath(inhale, ex) { play(inhale ? 'breathIn' : 'breathOut', { vol: .08 + ex * .32, rate: .92 + ex * .3, rev: .12, var: .08 }); },
    tick(dt) { // ambiance : gouttes et plaintes lointaines
      if (!ac) return;
      ambT -= dt; moanT -= dt;
      if (ambT <= 0) { ambT = rnd(2.5, 7); play('drip', { vol: rnd(.08, .2), rev: .9, var: .3 }); }
      if (moanT <= 0) { moanT = rnd(18, 40); play('moan', { vol: .12, rev: 1, rate: rnd(.7, 1) }); }
    }
  };
})();
