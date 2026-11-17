'use strict';
// ---------- Procedural sound (WebAudio) ----------
const Sfx = (() => {
  let ac = null, master = null, nb = null, amb = null;
  function init() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    master = ac.createGain(); master.gain.value = .75;
    const comp = ac.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 6;
    master.connect(comp); comp.connect(ac.destination);
    nb = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
    const d = nb.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    ambient();
  }
  function env(g, t, vol, att, dur) {
    g.gain.setValueAtTime(.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(.0002, vol), t + att);
    g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  }
  function noise(dur, type, f0, f1, q, vol, t0 = 0) {
    if (!ac) return;
    const t = ac.currentTime + t0, s = ac.createBufferSource(); s.buffer = nb; s.loop = true;
    const f = ac.createBiquadFilter(); f.type = type; f.Q.value = q;
    f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const g = ac.createGain(); env(g, t, vol, Math.min(.015, dur * .2), dur);
    s.connect(f); f.connect(g); g.connect(master); s.start(t, Math.random()); s.stop(t + dur + .05);
  }
  function tone(type, f0, f1, dur, vol, t0 = 0, lp = 0) {
    if (!ac) return;
    const t = ac.currentTime + t0, o = ac.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(10, f1), t + dur);
    const g = ac.createGain(); env(g, t, vol, .008, dur);
    if (lp) { const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp; o.connect(f); f.connect(g); } else o.connect(g);
    g.connect(master); o.start(t); o.stop(t + dur + .05);
  }
  function ambient() {
    if (!ac || amb) return;
    const g = ac.createGain(); g.gain.value = .07;
    const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 160; f.Q.value = 4;
    const lfo = ac.createOscillator(), lg = ac.createGain(); lfo.frequency.value = .07; lg.gain.value = 70;
    lfo.connect(lg); lg.connect(f.frequency); lfo.start();
    for (const fr of [41.2, 41.9, 61.7]) { const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = fr; o.connect(f); o.start(); }
    f.connect(g); g.connect(master); amb = g;
  }
  return {
    init,
    get ok() { return !!ac; },
    swing(h) { noise(h ? .38 : .2, 'bandpass', h ? 250 : 400, h ? 1600 : 2600, 1.4, h ? .55 : .38); if (h) tone('sine', 90, 45, .3, .25); },
    hit() { noise(.1, 'lowpass', 3000, 300, 1, .7); tone('sine', 150, 40, .2, .8); noise(.25, 'bandpass', 900, 300, 3, .4, .02); },
    gore() {
      for (let i = 0; i < 4; i++) noise(.12 + Math.random() * .15, 'bandpass', 300 + Math.random() * 700, 90 + Math.random() * 200, 2.5, .35, i * .045);
      tone('sine', 85, 30, .35, .5);
    },
    boom() { tone('sine', 70, 22, 1.1, 1); noise(1, 'lowpass', 1400, 50, 1, .7); tone('sawtooth', 50, 30, .6, .25, 0, 300); },
    clang() { tone('square', 1300, 1000, .12, .1); tone('triangle', 2600, 2100, .35, .14); noise(.06, 'highpass', 3000, 6000, 1, .3); },
    growl(p = 1) { tone('sawtooth', 95 * p, 55 * p, .5, .22, 0, 500); noise(.45, 'bandpass', 300 * p, 150 * p, 5, .2); },
    shriek() { tone('sawtooth', 700, 300, .5, .1, 0, 2000); noise(.5, 'bandpass', 2000, 900, 6, .18); },
    hurt() { tone('square', 200, 80, .22, .16, 0, 1200); noise(.18, 'lowpass', 900, 200, 1, .4); },
    pickup() { tone('sine', 500, 1100, .12, .18); },
    orb() { tone('sine', 900 + Math.random() * 300, 1500, .07, .07); },
    cast() { tone('sawtooth', 200, 800, .45, .1, 0, 1500); noise(.45, 'bandpass', 400, 2200, 5, .2); },
    fizz() { noise(.3, 'highpass', 2000, 500, 1, .25); },
    gate() { tone('sawtooth', 55, 35, 2.5, .35, 0, 400); tone('sine', 110, 50, 2, .4); noise(2, 'lowpass', 600, 60, 1, .3); },
    heart() { tone('sine', 62, 40, .14, .7); tone('sine', 55, 35, .14, .55, .19); },
    rage() { tone('sawtooth', 60, 120, .8, .3, 0, 700); noise(.9, 'bandpass', 200, 1400, 2, .4); tone('sine', 40, 25, 1.2, .8); },
    charge() { tone('sawtooth', 80, 200, .5, .1, 0, 600); },
    dash() { noise(.18, 'bandpass', 1200, 400, 1, .3); },
    step() { noise(.06, 'lowpass', 350, 120, 1, .12); },
    stagger() { tone('triangle', 400, 200, .25, .12); }
  };
})();
