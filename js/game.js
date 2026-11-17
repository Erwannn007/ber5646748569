'use strict';
// =====================================================================
//  BERSERKER — logique du jeu
// =====================================================================
const GRAV = 9;
const ET = {
  ghoul: { name: 'GOULE', hp: 32, spd: 2.6, dmg: 7, range: 1.05, wind: .36, cd: .75, r: .28, sc: 1 / 64, tw: 64, th: 64, neck: 23, waist: 39, gp: 1.4 },
  knight: { name: 'REITRE', hp: 62, spd: 1.75, dmg: 13, range: 1.25, wind: .55, cd: 1.05, r: .3, sc: 1 / 64, tw: 64, th: 64, neck: 19, waist: 36, gp: 1.0 },
  brute: { name: 'ABOMINATION', hp: 170, spd: 1.4, dmg: 24, range: 1.6, wind: .8, cd: 1.4, r: .45, sc: 1 / 66, tw: 80, th: 80, neck: 32, waist: 52, gp: .6, heavyBody: true },
  wraith: { name: 'SPECTRE', hp: 40, spd: 1.9, dmg: 11, range: 9, wind: .65, cd: 1.7, r: .3, sc: 1 / 64, tw: 64, th: 64, neck: 22, waist: 40, gp: 1.8, ranged: true, float: true }
};
// animations de l'épée : clés [temps, pose ('I' repos, 'C' chargé), easing]
const ANIMS = {
  R2L: { k: [[0, 'I'], [.11, { x: .97, y: .78, a: 1.45 }, 'o'], [.21, { x: .06, y: .9, a: -1.95 }, 'i'], [.46, 'I', 'io']], hits: [.165], trail: [[.11, .23]], sw: [.1], dmg: 34, range: 2.15, arc: 1.0, shake: .35, cut: 'R2L', combo: 1 },
  L2R: { k: [[0, 'I'], [.11, { x: .08, y: .82, a: -1.45 }, 'o'], [.21, { x: .98, y: .9, a: 1.95 }, 'i'], [.46, 'I', 'io']], hits: [.165], trail: [[.11, .23]], sw: [.1], dmg: 34, range: 2.15, arc: 1.0, shake: .35, cut: 'L2R', combo: 1 },
  OVER: { k: [[0, 'I'], [.2, { x: .6, y: .62, a: -.18 }, 'o'], [.3, { x: .5, y: 1.28, a: .04, sy: -.8 }, 'i'], [.66, 'I', 'io']], hits: [.255], trail: [[.2, .31]], sw: [.19], dmg: 62, range: 2.3, arc: .6, shake: .8, cut: 'OVER', combo: 1, heavy: 1 },
  SPIN: { k: [[0, 'C'], [.17, { x: .0, y: .88, a: -2.6 }, 'i'], [.55, 'I', 'io']], hits: [.085], trail: [[0, .19]], sw: [0], dmg: 80, range: 2.6, arc: 1.75, shake: 1.1, cut: 'SPIN', heavy: 1 },
  EXEC_X: { k: [[0, 'I'], [.4, { x: .8, y: .5, a: .4 }, 'o'], [.5, { x: .18, y: 1.08, a: -2.5 }, 'i'], [.72, { x: .2, y: .5, a: -.4 }, 'io'], [.82, { x: .85, y: 1.08, a: 2.5 }, 'i'], [1.35, 'I', 'io']], hits: [.46, .78], trail: [[.4, .52], [.72, .84]], sw: [.39, .71], exec: 1 },
  EXEC_SPLIT: { k: [[0, 'I'], [.45, { x: .55, y: .5, a: -.15 }, 'o'], [.55, { x: .5, y: 1.3, a: .05, sy: -.8 }, 'i'], [.75, { x: .97, y: .8, a: 1.5 }, 'io'], [.85, { x: .05, y: .9, a: -1.95 }, 'i'], [1.35, 'I', 'io']], hits: [.51, .81], trail: [[.45, .57], [.75, .87]], sw: [.44, .74], exec: 1 },
  EXEC_DECAP: { k: [[0, 'I'], [.4, { x: .98, y: .72, a: 1.7 }, 'o'], [.5, { x: .0, y: .85, a: -2.2 }, 'i'], [.7, { x: .6, y: .52, a: -.2 }, 'io'], [.8, { x: .5, y: 1.3, a: .05, sy: -.8 }, 'i'], [1.35, 'I', 'io']], hits: [.455, .765], trail: [[.4, .52], [.7, .82]], sw: [.39, .69], exec: 1 }
};
for (const k in ANIMS) ANIMS[k].len = ANIMS[k].k[ANIMS[k].k.length - 1][0];
const EXECV = {
  X: { anim: 'EXEC_X', cuts: [{ a: -.75, y: 'mid' }, { a: .75, y: 'mid' }], title: 'EN PIECES' },
  SPLIT: { anim: 'EXEC_SPLIT', cuts: [{ a: Math.PI / 2, y: 'mid' }, { a: .06, y: 'waist' }], title: 'ECARTELE' },
  DECAP: { anim: 'EXEC_DECAP', cuts: [{ a: .05, y: 'neck' }, { a: Math.PI / 2 + .04, y: 'mid' }], title: 'DECAPITE' }
};
const BLOODC = [[150, 8, 8], [110, 0, 4], [190, 20, 16], [80, 0, 0]];

const G = {
  state: 'title', floor: 1, time: 0, tint: [1.05, .86, .72], flick: 1, flash: 0, shake: 0, hitstop: 0, slowT: 0, slowScale: 1,
  impact: 0, letter: 0, fovCur: 1.26, fovKick: 0, tilt: 0, redFlash: 0, grinT: 0, showMap: false, msgs: [], cine: null,
  haze: 1, kickYaw: 0, kickPitch: 0, roll: 0, breath: [],
  enemies: [], gibs: [], parts: [], projs: [], picks: [], pools: [], decor: [], eid: 0, best: 0, map: null, run: null,
  msg(txt, life = 1.5, col = '#fff', big = false) { G.msgs.push({ txt, life, max: life, col, big }); if (G.msgs.length > 5) G.msgs.shift(); }
};
const P = { x: 0, y: 0, ang: 0, pitch: 0, ex: 0, brPh: 0, turn: 0, hp: 100, maxHp: 100, rage: 0, rageT: 0, vx: 0, vy: 0, dash: 0, dashCd: 0, dvx: 0, dvy: 0, invul: 0, hurtT: 0, bob: 0, moveAmt: 0, dead: false, beatT: 0 };
const Wpn = { name: null, t: 0, hits: 0, sw: 0, queued: false, combo: 0, lastEnd: -9, charging: false, charge: 0, chargeAmt: 0, hvPending: false };
try { G.best = +localStorage.getItem('berserker_best') || 0; } catch (e) { }

// ---------------------------------------------------------------- monde
function isWall(x, y) { if (x < 0 || y < 0 || x >= G.mw || y >= G.mh) return true; return G.map[(y | 0) * G.mw + (x | 0)] > 0; }
function losMap(ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, d = Math.hypot(dx, dy), n = Math.ceil(d / .2);
  for (let i = 1; i < n; i++) { const t = i / n; if (isWall(ax + dx * t, ay + dy * t)) return false; } return true;
}
function blockedAt(x, y, r) { return isWall(x - r, y - r) || isWall(x + r, y - r) || isWall(x - r, y + r) || isWall(x + r, y + r); }
function moveCircle(o, dx, dy, r) {
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / .2)); let hit = false;
  for (let s = 0; s < steps; s++) {
    const sx = dx / steps, sy = dy / steps;
    if (!blockedAt(o.x + sx, o.y, r)) o.x += sx; else hit = true;
    if (!blockedAt(o.x, o.y + sy, r)) o.y += sy; else hit = true;
  } return hit;
}
function pushOut(o, r) {
  for (const d of G.decor) {
    if (!d.block) continue; const dx = o.x - d.x, dy = o.y - d.y, dist = Math.hypot(dx, dy), m = r + d.block;
    if (dist < m && dist > .001) moveCircle(o, dx / dist * (m - dist), dy / dist * (m - dist), Math.min(r, .42));
  }
}
function computeFlow() {
  const f = G.flow, mw = G.mw, mh = G.mh, map = G.map; f.fill(-1);
  const q = G.flowQ; let h = 0, t = 0; const s = (P.y | 0) * mw + (P.x | 0);
  if (map[s] !== 0) return; f[s] = 0; q[t++] = s;
  while (h < t) {
    const c = q[h++], cx = c % mw, cy = (c / mw) | 0, nd = f[c] + 1;
    if (nd > 60) continue;
    if (cx > 0 && map[c - 1] === 0 && f[c - 1] < 0) { f[c - 1] = nd; q[t++] = c - 1; }
    if (cx < mw - 1 && map[c + 1] === 0 && f[c + 1] < 0) { f[c + 1] = nd; q[t++] = c + 1; }
    if (cy > 0 && map[c - mw] === 0 && f[c - mw] < 0) { f[c - mw] = nd; q[t++] = c - mw; }
    if (cy < mh - 1 && map[c + mw] === 0 && f[c + mw] < 0) { f[c + mw] = nd; q[t++] = c + mw; }
  }
}
function shake(a) { G.shake = Math.min(1.6, G.shake + a); }

// ---------------------------------------------------------------- partie
function newGame() {
  Object.assign(P, { hp: 100, maxHp: 100, rage: 0, rageT: 0, dead: false, invul: 0, hurtT: 0 });
  G.run = { kills: 0, execs: 0, t0: G.time };
  newFloor(1); G.state = 'play';
}
function newFloor(n) {
  G.floor = n; const D = genDungeon(n); G.D = D; G.map = D.map; G.mw = D.W; G.mh = D.H;
  G.explored = new Uint8Array(D.W * D.H); G.flow = new Int16Array(D.W * D.H).fill(-1); G.flowQ = new Int32Array(D.W * D.H); G.flowT = 0;
  G.bfw = D.W * BFR; G.bloodF = new Uint8Array(D.W * BFR * D.H * BFR); G.bloodW = new Uint8Array(D.W * D.H * 256);
  G.lmw = D.W * LMR; G.lm = bakeLight(D);
  G.floorTex = TEX.floors[D.theme]; G.ceilTex = TEX.ceils[D.theme];
  G.enemies = D.spawns.map(s => makeEnemy(s.type, s.x, s.y, n, s.boss));
  G.gibs = []; G.parts = []; G.projs = []; G.pools = []; G.msgs = [];
  G.picks = D.items.map(i => ({ kind: 'flask', x: i.x, y: i.y, z: 0, vx: 0, vy: 0, vz: 0, age: 0 }));
  G.decor = D.decor; G.cleared = false; G.cine = null; G.total = G.enemies.length; G.slowT = 0; G.hitstop = 0;
  G.fstats = { kills: 0, execs: 0, t0: G.time };
  G.boss = G.enemies.find(e => e.boss) || null;
  P.x = D.start.x; P.y = D.start.y; P.ang = D.start.ang; P.vx = P.vy = 0;
  Wpn.name = null; Wpn.charging = false;
  G.msg('ETAGE ' + n, 2.5, '#e33', true);
  G.msg(G.total + ' CREATURES A ABATTRE', 2.5, '#ccc');
  if (G.boss) G.msg('LE BOUCHER RODE...', 3, '#f84');
}
function makeEnemy(type, x, y, floor, boss) {
  const T = ET[type], m = 1 + (floor - 1) * .1, hp = T.hp * m * (boss ? 4 : 1);
  return {
    type, T, x, y, z: 0, hp, maxHp: hp, state: 'idle', t: 0, cd: rr(0, 1), aggro: false, kx: 0, ky: 0, flash: 0, stagger: 0, staggered: false,
    anim: rr(0, 2), boss: !!boss, sc: boss ? 1 / 52 : T.sc, losT: 0, los: false, dead: false, id: ++G.eid, r: T.r * (boss ? 1.3 : 1),
    dmgMul: boss ? 1.5 : 1, flip: Math.random() < .5, moving: false, fr: 'idle'
  };
}

// ---------------------------------------------------------------- sang
function spray(x, y, z, n, spd, fx, fy) {
  if (G.parts.length > 3500) n = Math.min(n, 6);
  for (let i = 0; i < n; i++) G.parts.push({
    x, y, z, vx: fx * spd * rr(.2, 1.1) + rr(-1, 1) * spd * .6, vy: fy * spd * rr(.2, 1.1) + rr(-1, 1) * spd * .6,
    vz: rr(-.2, 1.7) * spd * .7, s: rr(.012, .042), col: pick(BLOODC), life: 4, blood: true
  });
}
function sparks(x, y, z, n, col) {
  for (let i = 0; i < n; i++) G.parts.push({ x, y, z, vx: rr(-3, 3), vy: rr(-3, 3), vz: rr(0, 3), s: .02, col: col || [255, 220, 120], life: rr(.2, .5), emis: true, g: .6 });
}
function stampFloor(x, y, r, amt) {
  const fx = (x * BFR) | 0, fy = (y * BFR) | 0, bf = G.bloodF, W = G.bfw, H = G.mh * BFR, rr2 = r * r + .5;
  for (let dy = -Math.ceil(r); dy <= r; dy++) for (let dx = -Math.ceil(r); dx <= r; dx++) {
    if (dx * dx + dy * dy > rr2) continue; const px = fx + dx, py = fy + dy; if (px < 0 || py < 0 || px >= W || py >= H) continue;
    const i = py * W + px; bf[i] = Math.min(240, bf[i] + amt);
  }
}
function stampWall(cell, u, v, amt) {
  if (cell < 0 || cell >= G.mw * G.mh) return;
  const bx = clamp((u * 16) | 0, 0, 15), by = clamp((v * 16) | 0, 0, 15), base = cell * 256, bw = G.bloodW;
  const add = (i, a) => { bw[i] = Math.min(240, bw[i] + a); };
  add(base + by * 16 + bx, amt);
  if (bx < 15 && Math.random() < .5) add(base + by * 16 + bx + 1, amt * .5);
  const k = ri(1, 7); for (let j = 1; j <= k && by + j < 16; j++) add(base + (by + j) * 16 + bx, amt * (1 - j / (k + 1)) * .8);
}

// ---------------------------------------------------------------- découpe
const FLESH1 = RGBA(160, 22, 20), FLESH2 = RGBA(118, 4, 6), BONEC = RGBA(234, 224, 204);
function lineCut(a, px, py) { const nx = -Math.sin(a), ny = Math.cos(a); return { nx, ny, c: nx * px + ny * py, a }; }
function cropPiece(arr, w, h, p, wx, wy) {
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (arr[y * w + x]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  const cw = x1 - x0 + 1, ch = y1 - y0 + 1, d = new Uint32Array(cw * ch);
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) d[y * cw + x] = arr[(y + y0) * w + x + x0];
  return { tex: { w: cw, h: ch, data: d }, ox: p.ox + x0, oy: p.oy + y0, wx: wx - x0, wy: wy - y0 };
}
function slicePiece(p, cut) {
  const t = p.tex, w = t.w, h = t.h, d = t.data, c = cut.c - cut.nx * p.ox - cut.ny * p.oy;
  const A = new Uint32Array(w * h), B = new Uint32Array(w * h);
  let na = 0, nb = 0, ax = 0, ay = 0, an = 0, bx = 0, by = 0, bn = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x, v = d[i]; if (!(v >>> 24)) continue;
    const s = cut.nx * (x + .5) + cut.ny * (y + .5) - c, as = Math.abs(s);
    let col = v; const wound = as < 1.8;
    if (wound) col = as < .9 ? (hash2(x + p.ox, y + p.oy, 3) < .18 ? BONEC : FLESH1) : FLESH2;
    if (s >= 0) { A[i] = col; na++; if (wound) { ax += x; ay += y; an++; } }
    else { B[i] = col; nb++; if (wound) { bx += x; by += y; bn++; } }
  }
  if (na < 3 || nb < 3) return [p];
  return [cropPiece(A, w, h, p, an ? ax / an : p.wx, an ? ay / an : p.wy), cropPiece(B, w, h, p, bn ? bx / bn : p.wx, bn ? by / bn : p.wy)];
}
function cutPieces(ps, cuts) { for (const c of cuts) { const n = []; for (const p of ps) n.push(...slicePiece(p, c)); ps = n; } return ps; }
function eTex(e, fr) { return (e.boss ? SPR.boss : SPR[e.type])[fr || e.fr || 'hurt']; }
function refFromEnemy(e) {
  const T = e.T, dx = e.x - P.x, dy = e.y - P.y, d = Math.hypot(dx, dy) || 1;
  return { x: e.x, y: e.y, zc: e.z + T.th / 2 * e.sc, cx: T.tw / 2, cy: T.th / 2, sc: e.sc, lx: -Math.sin(P.ang), ly: Math.cos(P.ang), fx: dx / d, fy: dy / d, id: e.id, th: T.th };
}
function spawnGibs(ref, pieces, cuts, o) {
  for (const p of pieces) {
    const pcx = p.ox + p.tex.w / 2, pcy = p.oy + p.tex.h / 2;
    const lat = (pcx - ref.cx) * ref.sc, z = ref.zc - (pcy - ref.cy) * ref.sc;
    let px = 0, py = 0;
    for (const c of cuts) { const s = Math.sign(c.nx * pcx + c.ny * pcy - c.c) || 1; px += s * c.nx; py -= s * c.ny; }
    const sep = o.sep * rr(.7, 1.3), up = o.up * rr(.5, 1) * (pcy < ref.th * .55 ? 1 : .25), fw = o.fwd * rr(.6, 1.2);
    const vl = px * sep;
    const g = {
      tex: p.tex, ox: p.ox, oy: p.oy, wx: p.wx, wy: p.wy, x: ref.x + ref.lx * lat, y: ref.y + ref.ly * lat, z: Math.max(.02, z),
      vx: ref.lx * vl + ref.fx * fw + rr(-.3, .3), vy: ref.ly * vl + ref.fy * fw + rr(-.3, .3), vz: py * sep + up,
      rot: 0, vrot: o.spin * rr(-1, 1) + px * o.spin * .4, sc: ref.sc, bleed: rr(.6, 1.4) * (o.bleed || 1), owner: ref.id,
      topple: 0, tdir: 0, born: G.time, ground: false
    };
    if (o.topple && pieces.length > 1 && p.oy + p.tex.h >= ref.th - 3 && p.tex.h > 6) {
      g.topple = rr(.12, .35); g.tdir = Math.random() < .5 ? -1 : 1; g.vx *= .1; g.vy *= .1; g.vz = 0; g.vrot = 0; g.bleed = 1.6;
    }
    G.gibs.push(g);
  }
  if (G.gibs.length > 100) { G.gibs.sort((a, b) => b.born - a.born); G.gibs.length = 85; }
}
function cutSpray(ref, cut, n) {
  const px = ref.cx, py = Math.abs(cut.ny) > .2 ? clamp((cut.c - cut.nx * px) / cut.ny, 0, ref.th) : ref.cy;
  const z = ref.zc - (py - ref.cy) * ref.sc;
  spray(ref.x, ref.y, Math.max(.05, z), n, 2.6, ref.fx * .6, ref.fy * .6);
}
// point visé (viseur au centre de l'écran) projeté dans la texture du monstre
function aimTex(e) {
  const C = G.cam; if (!C) return null;
  const dx = e.x - C.x, dy = e.y - C.y, depth = dx * C.dirX + dy * C.dirY; if (depth < .2) return null;
  const lat = dx * C.plX + dy * C.plY, zAim = C.eye + (C.hor - C.H / 2) * depth / C.focal;
  return { tx: e.T.tw / 2 - lat / e.sc, ty: e.T.th - (zAim - e.z) / e.sc };
}
function cutsFor(kind, T, aim) {
  const mid = T.tw / 2, cx = aim ? clamp(aim.tx, T.tw * .3, T.tw * .7) : mid;
  let ay = aim ? aim.ty : rr(T.waist - 5, T.waist + 2);
  const high = ay < T.neck + 3; ay = high ? T.neck : clamp(ay, T.neck + 3, T.th * .86);
  const D = c => Object.assign(c, { decap: high });
  switch (kind) {
    case 'R2L': case 'L2R': {
      const tilt = (kind === 'R2L' ? 1 : -1) * rr(.05, .28) * (high ? .4 : 1);
      return [D(lineCut(tilt, mid, ay))];
    }
    case 'OVER': return [lineCut(Math.PI / 2 + rr(-.08, .08), cx, T.th / 2)];
    case 'SPIN': return [D(lineCut(rr(-.2, .2), mid, ay)), high ? lineCut(rr(-.2, .2), mid, T.waist) : Object.assign(lineCut(rr(-.15, .15), mid, T.neck), { decap: 1 })];
    default: return [D(lineCut(rr(-.6, .6), cx, ay))];
  }
}
function flipTex(t) {
  const d = new Uint32Array(t.w * t.h);
  for (let y = 0; y < t.h; y++) for (let x = 0; x < t.w; x++) d[y * t.w + x] = t.data[y * t.w + t.w - 1 - x];
  return { w: t.w, h: t.h, data: d };
}

// ---------------------------------------------------------------- combat
function aggro(e) {
  if (e.aggro) return; e.aggro = true; if (e.state === 'idle') e.state = 'chase';
  if (Math.random() < .5) e.T.ranged ? Sfx.shriek(e) : Sfx.growl(e.T.gp * (e.boss ? .7 : 1), e);
  for (const o of G.enemies) if (!o.aggro && Math.hypot(o.x - e.x, o.y - e.y) < 5 && losMap(o.x, o.y, e.x, e.y)) { o.aggro = true; o.state = 'chase'; }
}
function damageEnemy(e, dmg, kind) {
  if (e.dead) return false;
  e.hp -= dmg; aggro(e); e.flash = 1;
  const dx = e.x - P.x, dy = e.y - P.y, d = Math.hypot(dx, dy) || 1, T = e.T;
  const heavy = kind === 'OVER' || kind === 'SPIN' || kind === 'PROJ';
  const zc = e.z + (T.th - (T.neck + T.waist) / 2) * e.sc;
  spray(e.x, e.y, zc, heavy ? 26 : 14, 2.4, dx / d, dy / d);
  stampFloor(e.x + rr(-.2, .2), e.y + rr(-.2, .2), 2, 90);
  if (e.hp <= 0) { killEnemy(e, kind); return true; }
  const kb = (heavy ? 5 : 2.6) / (T.heavyBody ? 2.2 : 1) / (e.boss ? 2 : 1);
  e.kx = dx / d * kb; e.ky = dy / d * kb;
  if (!T.heavyBody || heavy || e.state !== 'wind') { e.state = 'hurt'; e.t = heavy ? .45 : .25; }
  if (!e.staggered && e.hp <= e.maxHp * .38) {
    e.staggered = true; e.stagger = e.boss ? 4 : 3.2; Sfx.stagger(e);
    G.msg(e.boss ? 'LE BOUCHER VACILLE !' : 'VULNERABLE', 1, '#fa4');
  }
  return false;
}
function killEnemy(e, kind) {
  const T = e.T; e.dead = true; G.fstats.kills++; G.run.kills++;
  let tex = eTex(e, e.fr); if (e.flip) tex = flipTex(tex);
  const cuts = cutsFor(kind, T, kind === 'PROJ' ? null : aimTex(e));
  if (P.rageT > 0) cuts.push(lineCut(rr(-.9, .9), T.tw / 2, rr(T.neck + 2, T.th - 10)));
  const pieces = cutPieces([{ tex, ox: 0, oy: 0, wx: T.tw / 2, wy: T.th / 2 }], cuts);
  const ref = refFromEnemy(e), heavy = kind === 'OVER' || kind === 'SPIN';
  spawnGibs(ref, pieces, cuts, { sep: heavy ? 2.2 : 1.5, up: heavy ? 1.6 : 1, fwd: heavy ? 2.5 : 1.4, spin: heavy ? 5 : 3, topple: true });
  for (const c of cuts) cutSpray(ref, c, heavy ? 38 : 24);
  for (let i = 0; i < 3; i++) G.pools.push({ x: e.x + rr(-.25, .25), y: e.y + rr(-.25, .25), r: 0, max: rr(4, 8) * (T.tw / 64) });
  dropOrbs(e.x, e.y, e.boss ? 14 : T.heavyBody ? 5 : ri(2, 3));
  P.rage = Math.min(100, P.rage + (e.boss ? 40 : 10));
  if (P.rageT > 0) P.hp = Math.min(P.maxHp, P.hp + 4);
  Sfx.gore(); G.grinT = .8;
  if (cuts.some(c => c.decap)) G.msg('DECAPITE', .9, '#ddd');
  else if (kind === 'OVER') G.msg('FENDU EN DEUX', .9, '#ddd');
  else if (kind === 'SPIN') G.msg('EN MORCEAUX', .9, '#ddd');
  if (e.boss) { G.msg('LE BOUCHER EST TOMBE', 3, '#f33', true); G.slowT = 1.2; G.slowScale = .15; }
}
function dropOrbs(x, y, n) {
  for (let i = 0; i < n; i++) G.picks.push({ kind: 'orb', x, y, z: .5, vx: rr(-2, 2), vy: rr(-2, 2), vz: rr(1, 3), age: 0, v: 4 });
}
function hurtPlayer(dmg, src) {
  if (P.invul > 0 || P.dash > 0 || G.cine || P.dead) return;
  if (P.rageT > 0) dmg *= .5;
  P.hp -= dmg; P.hurtT = .45; G.redFlash = Math.min(.65, G.redFlash + dmg / 35); shake(dmg / 22); Sfx.hurt();
  G.kickPitch += 10; G.kickYaw += rr(-.07, .07); P.ex = Math.min(1, P.ex + dmg / 45);
  spray(P.x + Math.cos(P.ang) * .3, P.y + Math.sin(P.ang) * .3, .45, 8, 1.5, 0, 0);
  if (P.hp <= 0) { P.hp = 0; P.dead = true; G.state = 'dead'; G.deadT = 0; Sfx.boom(); saveBest(); }
}
function saveBest() { if (G.floor > G.best) { G.best = G.floor; try { localStorage.setItem('berserker_best', G.best); } catch (e) { } } }
function findExec() {
  let best = null, bd = 9;
  for (const e of G.enemies) {
    if (e.dead || e.stagger <= 0) continue;
    const dx = e.x - P.x, dy = e.y - P.y, d = Math.hypot(dx, dy); if (d > 2.6) continue;
    if (Math.abs(angDiff(P.ang, Math.atan2(dy, dx))) > .8) continue;
    if (d < bd && losMap(P.x, P.y, e.x, e.y)) { bd = d; best = e; }
  }
  return best;
}
function onHit(name, idx) {
  const A = ANIMS[name]; if (A.exec) return execHit(idx);
  const mult = (P.rageT > 0 ? 1.8 : 1) * (name === 'SPIN' ? 1 + Wpn.chargeAmt * .6 : 1);
  let hits = 0, kills = 0;
  for (const e of G.enemies) {
    if (e.dead) continue;
    const dx = e.x - P.x, dy = e.y - P.y, d = Math.hypot(dx, dy) - e.r; if (d > A.range) continue;
    if (Math.abs(angDiff(P.ang, Math.atan2(dy, dx))) > A.arc + (d < .5 ? .7 : 0)) continue;
    if (!losMap(P.x, P.y, e.x, e.y)) continue;
    hits++; if (damageEnemy(e, A.dmg * mult, A.cut)) kills++;
  }
  for (const p of G.projs) {
    if (p.owner !== 'e') continue; const dx = p.x - P.x, dy = p.y - P.y, d = Math.hypot(dx, dy);
    if (d < 2.3 && Math.abs(angDiff(P.ang, Math.atan2(dy, dx))) < A.arc + .4) {
      const sp = Math.hypot(p.vx, p.vy) * 1.7; p.vx = Math.cos(P.ang) * sp; p.vy = Math.sin(P.ang) * sp; p.owner = 'p'; p.life = 3;
      G.msg('RENVOYE !', 1, '#8f8'); sparks(p.x, p.y, p.z, 12, [140, 255, 150]); hits++;
    }
  }
  if (hits) { G.hitstop = kills ? .09 : .06; shake(A.shake * (kills ? 1.5 : 1.1)); G.kickPitch += kills ? -6 : -3; Sfx.hit(); P.rage = Math.min(100, P.rage + 3 * hits); }
  else {
    for (const s of [0, -.35, .35]) {
      const a = P.ang + s, wx = P.x + Math.cos(a) * 1.0, wy = P.y + Math.sin(a) * 1.0;
      if (isWall(wx, wy)) { sparks(P.x + Math.cos(a) * .8, P.y + Math.sin(a) * .8, name === 'OVER' ? .15 : .5, 14); Sfx.clang(); shake(.25); G.hitstop = .035; break; }
    }
  }
  if (kills >= 2) { G.msg(kills >= 4 ? 'MASSACRE' : kills === 3 ? 'TRIPLE TRANCHE' : 'DOUBLE TRANCHE', 1.6, '#f84', true); G.slowT = .6; G.slowScale = .2; G.fovKick = -.18; }
  else if (kills === 1 && (A.heavy || Math.random() < .15)) { G.slowT = .35; G.slowScale = .25; G.fovKick = -.1; }
}

// ---------------------------------------------------------------- exécutions
function startExec(e) {
  const v = pick(Object.keys(EXECV));
  G.cine = { e, v, t: 0, tx: e.x, ty: e.y, done: false, ref: null };
  e.stagger = 99; e.state = 'stagger'; P.invul = 99;
  Wpn.charging = false; Wpn.queued = false; Wpn.hvPending = false;
  wpnPlay(EXECV[v].anim); Sfx.charge();
}
function execHit(idx) {
  const c = G.cine; if (!c) return;
  const e = c.e, V = EXECV[c.v], T = e.T, cd = V.cuts[idx];
  const py = cd.y === 'neck' ? T.neck : cd.y === 'waist' ? T.waist : (T.neck + T.waist) / 2 + 3;
  const cut = lineCut(cd.a, T.tw / 2, py);
  if (idx === 0) {
    let tex = eTex(e, 'hurt'); if (e.flip) tex = flipTex(tex); e.dead = true; G.fstats.kills++; G.run.kills++;
    c.ref = refFromEnemy(e);
    const pieces = cutPieces([{ tex, ox: 0, oy: 0, wx: T.tw / 2, wy: T.th / 2 }], [cut]);
    spawnGibs(c.ref, pieces, [cut], { sep: .35, up: cd.y === 'neck' ? 1.4 : .2, fwd: .2, spin: .8, topple: false, bleed: 2 });
    cutSpray(c.ref, cut, 50); G.hitstop = .08; shake(.6); Sfx.hit(); Sfx.gore(); G.flash = .25;
  } else {
    const mine = G.gibs.filter(g => g.owner === e.id); G.gibs = G.gibs.filter(g => g.owner !== e.id);
    for (const g of mine) {
      const ref = { x: g.x, y: g.y, zc: g.z, cx: g.ox + g.tex.w / 2, cy: g.oy + g.tex.h / 2, sc: g.sc, lx: c.ref.lx, ly: c.ref.ly, fx: c.ref.fx, fy: c.ref.fy, id: e.id, th: T.th };
      const pieces = cutPieces([{ tex: g.tex, ox: g.ox, oy: g.oy, wx: g.wx, wy: g.wy }], [cut]);
      spawnGibs(ref, pieces, [cut], { sep: 3.2, up: 2.6, fwd: 2.4, spin: 7, topple: false, bleed: 1.5 });
    }
    spray(c.ref.x, c.ref.y, c.ref.zc, 110, 3.6, c.ref.fx, c.ref.fy);
    for (let i = 0; i < 5; i++) G.pools.push({ x: c.ref.x + rr(-.6, .6), y: c.ref.y + rr(-.6, .6), r: 0, max: rr(5, 10) });
    for (let i = 0; i < 40; i++) stampWallNear(c.ref.x, c.ref.y);
    G.impact = .16; G.flash = .5; shake(1.5); Sfx.boom(); Sfx.gore(); Sfx.play('gush', { vol: .7, delay: .15 }); Sfx.play('splat', { vol: .8, delay: .3, rev: .4 });
    G.slowT = 1.4; G.slowScale = .14;
    P.hp = Math.min(P.maxHp, P.hp + 25); P.rage = Math.min(100, P.rage + 25); G.fstats.execs++; G.run.execs++; G.grinT = 2.2;
    G.msg('EXECUTION', 2.2, '#f22', true); G.msg(V.title + '  +25 VIE', 2.2, '#ddd');
    dropOrbs(c.ref.x, c.ref.y, e.boss ? 14 : 5);
    if (e.boss) G.msg('LE BOUCHER EST TOMBE', 3, '#f84', true);
    c.done = true;
  }
}
function stampWallNear(x, y) {
  const a = rr(0, TAU); let px = x, py = y;
  for (let s = 0; s < 30; s++) { px += Math.cos(a) * .1; py += Math.sin(a) * .1; if (isWall(px, py)) { const u = Math.abs(Math.cos(a)) > Math.abs(Math.sin(a)) ? py - Math.floor(py) : px - Math.floor(px); stampWall((py | 0) * G.mw + (px | 0), u, rr(.15, .7), 160); return; } }
}
function updateCine(dt) {
  const c = G.cine; if (!c) return; c.t += dt;
  const da = Math.atan2(c.ty - P.y, c.tx - P.x); P.ang += angDiff(P.ang, da) * Math.min(1, dt * 10);
  const d = Math.hypot(c.tx - P.x, c.ty - P.y);
  if (!c.done && d > 1.2) { const s = Math.min(d - 1.2, dt * 7); moveCircle(P, Math.cos(da) * s, Math.sin(da) * s, .26); }
  if ((c.done && !Wpn.name && G.slowT <= 0) || c.t > 5) { G.cine = null; P.invul = .8; }
}

// ---------------------------------------------------------------- arme
function wpnPlay(n) { Wpn.name = n; Wpn.t = 0; Wpn.hits = 0; Wpn.sw = 0; }
function comboAttack() {
  if (G.time - Wpn.lastEnd > .5) Wpn.combo = 0;
  const n = ['R2L', 'L2R', 'OVER'][Wpn.combo]; Wpn.combo = (Wpn.combo + 1) % 3; wpnPlay(n);
}
function idlePose() {
  const m = P.moveAmt;
  return { x: .8 + Math.sin(P.bob) * .018 * m, y: 1.1 + Math.abs(Math.cos(P.bob)) * .03 * m + Math.sin(G.time * 1.6) * .006, a: -.32 + Math.sin(P.bob) * .02 * m, sy: 1 };
}
function chargePose() { const k = Math.min(1, Wpn.charge) * .012; return { x: .86 + rr(-k, k), y: .78 + rr(-k, k), a: .95 + rr(-k, k) * 3, sy: 1 }; }
function resPose(p) { return p === 'I' ? idlePose() : p === 'C' ? chargePose() : { x: p.x, y: p.y, a: p.a, sy: p.sy === undefined ? 1 : p.sy }; }
function wpose(name, t) {
  const k = ANIMS[name].k; let i = 0;
  while (i < k.length - 1 && t > k[i + 1][0]) i++;
  if (i >= k.length - 1) return resPose(k[k.length - 1][1]);
  const a = k[i], b = k[i + 1], u = clamp((t - a[0]) / (b[0] - a[0]), 0, 1);
  const e = b[2] === 'o' ? easeOut(u) : b[2] === 'i' ? easeIn(u) : b[2] === 'io' ? easeInOut(u) : u;
  const pa = resPose(a[1]), pb = resPose(b[1]);
  const r = { x: lerp(pa.x, pb.x, e), y: lerp(pa.y, pb.y, e), a: lerp(pa.a, pb.a, e), sy: lerp(pa.sy, pb.sy, e) };
  if (ANIMS[name].exec && t < k[1][0]) { const tr = u * .01; r.x += rr(-tr, tr); r.y += rr(-tr, tr); }
  return r;
}
function updateWeapon(dt) {
  if (Wpn.hvPending && !Wpn.name) { Wpn.hvPending = false; if (Input.hvH) { Wpn.charging = true; Wpn.charge = 0; Sfx.charge(); } else wpnPlay('OVER'); }
  if (Wpn.charging) {
    Wpn.charge += dt; G.shake = Math.max(G.shake, Math.min(1, Wpn.charge) * .14);
    if (!Input.hvH) { Wpn.charging = false; Wpn.chargeAmt = Math.min(1, Wpn.charge); wpnPlay(Wpn.charge >= .35 ? 'SPIN' : 'OVER'); }
  }
  if (!Wpn.name) return;
  const A = ANIMS[Wpn.name];
  Wpn.t += dt * ((P.rageT > 0 && !A.exec) ? 1.4 : 1);
  while (Wpn.sw < A.sw.length && Wpn.t >= A.sw[Wpn.sw]) {
    Sfx.swing(!!(A.heavy || A.exec)); Wpn.sw++;
    const n = Wpn.name;
    if (n === 'R2L') G.kickYaw -= .04; else if (n === 'L2R') G.kickYaw += .04;
    else if (n === 'OVER') G.kickPitch -= 16; else if (n === 'SPIN') { G.kickYaw -= .1; shake(.25); }
    else if (A.exec) { G.kickYaw += Wpn.sw === 1 ? -.06 : .06; G.kickPitch -= 10; }
    P.ex = Math.min(1, P.ex + (A.heavy || A.exec ? .13 : .07));
  }
  while (Wpn.hits < A.hits.length && Wpn.t >= A.hits[Wpn.hits]) { const h = Wpn.hits++; onHit(Wpn.name, h); if (G.hitstop > 0) break; }
  if (Wpn.t >= A.len) { Wpn.name = null; Wpn.lastEnd = G.time; if (Wpn.queued) { Wpn.queued = false; comboAttack(); } }
}

// ---------------------------------------------------------------- joueur
function updatePlayer(dt) {
  P.invul = Math.max(0, P.invul - dt); P.hurtT = Math.max(0, P.hurtT - dt); P.dashCd -= dt;
  updateBreath(dt);
  if (G.cine) { Input.look = 0; Input.lookY = 0; P.pitch = lerp(P.pitch, 0, Math.min(1, dt * 4)); P.moveAmt = lerp(P.moveAmt, 0, .2); return; }
  P.turn = Input.look; P.ang += Input.look; Input.look = 0;
  P.pitch = clamp(P.pitch - Input.lookY * 260, -85, 85); Input.lookY = 0;
  if (Input.k.PageUp) P.pitch = Math.min(85, P.pitch + 120 * dt); if (Input.k.PageDown) P.pitch = Math.max(-85, P.pitch - 120 * dt);
  const k = Input.k;
  if (k.ArrowLeft) P.ang -= 2.6 * dt; if (k.ArrowRight) P.ang += 2.6 * dt;
  let f = 0, s = 0;
  if (k.KeyW || k.ArrowUp) f++; if (k.KeyS || k.ArrowDown) f--; if (k.KeyD) s++; if (k.KeyA) s--;
  f -= Input.my; s += Input.mx;
  const l = Math.hypot(f, s); if (l > 1) { f /= l; s /= l; }
  G.roll = lerp(G.roll, clamp(-s * .022 - P.turn * .5, -.06, .06), Math.min(1, dt * 7));
  const cs = Math.cos(P.ang), sn = Math.sin(P.ang), mvx = cs * f - sn * s, mvy = sn * f + cs * s;
  const spd = 4.3 * (Wpn.charging ? .5 : 1) * (P.rageT > 0 ? 1.15 : 1);
  if (Input.dashP && P.dashCd <= 0) {
    let dx = mvx, dy = mvy; if (Math.hypot(dx, dy) < .1) { dx = cs; dy = sn; }
    const dl = Math.hypot(dx, dy); P.dvx = dx / dl * 13; P.dvy = dy / dl * 13; P.dash = .16; P.dashCd = .55; Sfx.dash(); G.fovKick += .1; shake(.15); P.ex = Math.min(1, P.ex + .15);
  }
  if (P.dash > 0) { P.dash -= dt; P.vx = P.dvx; P.vy = P.dvy; }
  else { const a = Math.min(1, dt * 12); P.vx += (mvx * spd - P.vx) * a; P.vy += (mvy * spd - P.vy) * a; }
  moveCircle(P, P.vx * dt, P.vy * dt, .26); pushOut(P, .26);
  const sp = Math.hypot(P.vx, P.vy); P.moveAmt = lerp(P.moveAmt, Math.min(1, sp / 4), Math.min(1, dt * 8));
  const ob = P.bob; P.bob += dt * sp * 2.4;
  if (Math.floor(ob / Math.PI) !== Math.floor(P.bob / Math.PI) && sp > 1) Sfx.step();
  // fureur
  if (Input.rageP) {
    if (P.rage >= 100 && P.rageT <= 0) { P.rageT = 10; Sfx.rage(); G.msg('FUREUR !', 2, '#f22', true); G.flash = .35; shake(.9); G.fovKick -= .15; }
    else if (P.rageT <= 0) G.msg('FUREUR PAS PRETE', .8, '#a66');
  }
  if (P.rageT > 0) {
    P.rageT -= dt; P.rage = Math.max(0, P.rageT * 10);
    P.beatT -= dt; if (P.beatT <= 0) { P.beatT = .55; Sfx.heart(); }
    if (P.rageT <= 0) { P.rage = 0; G.msg('LA FUREUR RETOMBE', 1.2, '#a66'); }
  } else if (P.hp < 30) { P.beatT -= dt; if (P.beatT <= 0) { P.beatT = .9; Sfx.heart(); } }
  // attaques
  if (Input.atkP) {
    const ex = findExec(), A = Wpn.name && ANIMS[Wpn.name];
    if (ex && !Wpn.charging && (!Wpn.name || (A.combo && Wpn.hits > 0))) startExec(ex);
    else if (!Wpn.name && !Wpn.charging) comboAttack();
    else if (A && A.combo && Wpn.t > A.hits[0] - .08) Wpn.queued = true;
  }
  if (Input.hvP) {
    const ex = findExec();
    if (ex && !Wpn.name && !Wpn.charging) startExec(ex);
    else if (!Wpn.name && !Wpn.charging) { Wpn.charging = true; Wpn.charge = 0; Sfx.charge(); }
    else if (Wpn.name && !G.cine) Wpn.hvPending = true;
  }
}

// respiration : plus l'effort est grand, plus le souffle est rapide et visible
function updateBreath(dt) {
  const base = P.moveAmt * .28 + (P.hp < 35 ? .45 : 0) + (P.rageT > 0 ? .55 : 0) + (Wpn.charging ? .3 : 0);
  P.ex = clamp(P.ex - dt * .055, Math.min(1, base), 1);
  const period = lerp(3.6, .62, P.ex), ph0 = P.brPh;
  P.brPh = (P.brPh + dt / period) % 1;
  if (P.brPh < ph0) Sfx.breath(true, P.ex);
  if (ph0 < .5 && P.brPh >= .5) { Sfx.breath(false, P.ex); P.exhT = lerp(.6, .32, P.ex); P.exhSide = rr(-1, 1); }
  if (P.exhT > 0) {
    P.exhT -= dt; P.exhAcc = (P.exhAcc || 0) + dt * (28 + P.ex * 40);
    const k = clamp(P.exhT / .3, 0, 1);
    while (P.exhAcc >= 1) {
      P.exhAcc -= 1;
      G.breath.push({
        x: rr(-3, 3) + P.exhSide * 3, y: R.H + rr(4, 10), vx: rr(-6, 6) + P.exhSide * 4, vy: -rr(30, 48) * (.8 + P.ex * .5) * (.6 + k * .5),
        s: rr(5, 9), gs: rr(9, 16), a: rr(.05, .09) * (.7 + P.ex * .6), life: rr(.9, 1.5), age: 0, rot: rr(0, TAU), vr: rr(-1, 1), v: (Math.random() * 4) | 0, ph: rr(0, TAU)
      });
    }
  }
}
function updateBreathFx(dt) {
  const f = G.cam ? G.cam.focal : 280;
  G.breath = G.breath.filter(b => {
    b.age += dt;
    const fwd = P.vx * Math.cos(P.ang) + P.vy * Math.sin(P.ang);
    b.x += (b.vx + Math.sin(b.ph + b.age * 3) * 6) * dt - P.turn * f * .7;
    b.y += (b.vy + fwd * 14) * dt; b.vy *= Math.pow(.35, dt); b.vx *= Math.pow(.5, dt);
    b.s += b.gs * dt; b.gs *= Math.pow(.4, dt); b.rot += b.vr * dt;
    return b.age < b.life;
  });
  if (G.breath.length > 160) G.breath.splice(0, G.breath.length - 160);
}
// textures de vapeur : nuages doux irréguliers
let PUFFS = null;
function makePuffs() {
  PUFFS = [];
  for (let k = 0; k < 4; k++) {
    const S = 48, c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d');
    for (let j = 0; j < 9; j++) {
      const r = rr(7, 15), cx = S / 2 + rr(-9, 9), cy = S / 2 + rr(-7, 7), g = x.createRadialGradient(cx, cy, 0, cx, cy, r);
      g.addColorStop(0, 'rgba(225,232,240,.55)'); g.addColorStop(.5, 'rgba(215,224,235,.22)'); g.addColorStop(1, 'rgba(210,220,232,0)');
      x.fillStyle = g; x.fillRect(0, 0, S, S);
    }
    PUFFS.push(c);
  }
}
function drawBreath(v) {
  if (!G.breath.length) return;
  if (!PUFFS) makePuffs();
  const W = R.W, L = clamp(lmAt(P.x, P.y) * 1.3 + .45, .45, 1.1);
  for (const b of G.breath) {
    const t = b.age / b.life, a = b.a * L * (t < .2 ? t / .2 : Math.pow(1 - (t - .2) / .8, 1.5));
    if (a <= .003) continue;
    v.globalAlpha = Math.min(1, a * 3.5);
    v.save(); v.translate(W / 2 + b.x, b.y); v.rotate(b.rot);
    v.drawImage(PUFFS[b.v], -b.s, -b.s, b.s * 2, b.s * 2); v.restore();
  }
  v.globalAlpha = 1;
}

// ---------------------------------------------------------------- ennemis
function steer(e, dir, dt) {
  const T = e.T; let tx, ty;
  const dist = Math.hypot(P.x - e.x, P.y - e.y);
  if (e.los && dist < 10) { tx = P.x; ty = P.y; }
  else {
    const mw = G.mw, cx = e.x | 0, cy = e.y | 0, c = cy * mw + cx; let best = G.flow[c]; tx = null;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const n = (cy + dy) * mw + cx + dx, v = G.flow[n];
      if (v >= 0 && (best < 0 || v < best)) { best = v; tx = cx + dx + .5; ty = cy + dy + .5; }
    }
    if (tx === null) { tx = P.x; ty = P.y; if (best < 0) return; }
  }
  let vx = tx - e.x, vy = ty - e.y; const l = Math.hypot(vx, vy) || 1; vx /= l; vy /= l;
  const sp = T.spd * (e.boss ? 1.15 : 1) * dir;
  moveCircle(e, vx * sp * dt, vy * sp * dt, Math.min(.42, e.r * .8)); e.moving = true;
}
function strikeEnemy(e, dist) {
  const T = e.T;
  if (T.ranged) {
    const dx = P.x - e.x, dy = P.y - e.y, d = Math.hypot(dx, dy) || 1;
    G.projs.push({ x: e.x + dx / d * .4, y: e.y + dy / d * .4, z: .55, vx: dx / d * 5.5, vy: dy / d * 5.5, owner: 'e', life: 4, dmg: T.dmg * e.dmgMul });
    return;
  }
  if (e.type === 'brute') { shake(.4); Sfx.hit(); }
  if (dist < T.range + .45 + (e.boss ? .3 : 0)) hurtPlayer(T.dmg * e.dmgMul, e);
}
function updateEnemies(dt) {
  if (dt <= 0) return;
  G.flowT -= dt; if (G.flowT <= 0) { G.flowT = .25; computeFlow(); }
  const few = G.enemies.length <= 3;
  for (const e of G.enemies) {
    if (e.dead) continue;
    const T = e.T;
    e.anim += dt; e.flash = Math.max(0, e.flash - dt * 6);
    if (T.float) e.z = .14 + Math.sin(e.anim * 2.2) * .05;
    const dx = P.x - e.x, dy = P.y - e.y, dist = Math.hypot(dx, dy);
    e.losT -= dt; if (e.losT <= 0) { e.losT = .2 + Math.random() * .1; e.los = dist < 14 && losMap(e.x, e.y, P.x, P.y); }
    if (!e.aggro && ((e.los && dist < 11) || dist < 2.5 || few)) aggro(e);
    if (e.kx || e.ky) {
      moveCircle(e, e.kx * dt, e.ky * dt, Math.min(.42, e.r * .8)); const f = Math.exp(-9 * dt); e.kx *= f; e.ky *= f;
      if (Math.abs(e.kx) + Math.abs(e.ky) < .05) e.kx = e.ky = 0;
    }
    if (T.heavyBody && e.wasMoving) {
      e.stepT = (e.stepT || 0) - dt;
      if (e.stepT <= 0) { e.stepT = e.boss ? .55 : .45; if (dist < 8) { shake((e.boss ? .3 : .16) * (1 - dist / 8)); Sfx.heavyStep(e); } }
    }
    e.wasMoving = e.moving; e.moving = false;
    if (e.stagger > 0) { e.stagger -= dt; e.state = 'stagger'; continue; }
    if (e.state === 'stagger') { e.state = 'chase'; e.cd = .5; }
    switch (e.state) {
      case 'idle': if (e.aggro) e.state = 'chase'; break;
      case 'hurt': e.t -= dt; if (e.t <= 0) e.state = 'chase'; break;
      case 'chase': {
        e.cd -= dt;
        if (T.ranged) {
          if (e.los && dist < 9 && e.cd <= 0) { e.state = 'wind'; e.t = T.wind; Sfx.cast(e); break; }
          const want = (dist > 6 || !e.los) ? 1 : dist < 3.2 ? -1 : 0;
          if (want) steer(e, want, dt);
        } else {
          if (dist < T.range + e.r * .5 && e.cd <= 0 && e.los) { e.state = 'wind'; e.t = T.wind * (e.boss ? 1.1 : 1); if (Math.random() < .5) Sfx.growl(T.gp * (e.boss ? .7 : 1), e); break; }
          if (dist > T.range * .7) steer(e, 1, dt);
        }
        break;
      }
      case 'wind': e.t -= dt; if (e.t <= 0) { e.state = 'strike'; e.t = .22; strikeEnemy(e, dist); } break;
      case 'strike': e.t -= dt; if (e.t <= 0) { e.state = 'chase'; e.cd = T.cd * rr(.8, 1.2); } break;
    }
  }
  const E = G.enemies;
  for (let i = 0; i < E.length; i++) {
    const a = E[i]; if (a.dead) continue;
    for (let j = i + 1; j < E.length; j++) {
      const b = E[j]; if (b.dead) continue;
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), m = a.r + b.r;
      if (d < m && d > .001) { const o = (m - d) / 2; moveCircle(a, -dx / d * o, -dy / d * o, Math.min(.42, a.r * .8)); moveCircle(b, dx / d * o, dy / d * o, Math.min(.42, b.r * .8)); }
    }
    const dx = a.x - P.x, dy = a.y - P.y, d = Math.hypot(dx, dy), m = a.r + .26;
    if (d < m && d > .001) { const o = m - d; moveCircle(a, dx / d * o * .7, dy / d * o * .7, Math.min(.42, a.r * .8)); moveCircle(P, -dx / d * o * .3, -dy / d * o * .3, .26); }
    pushOut(a, Math.min(.42, a.r));
  }
}
function eFrame(e) {
  if (e.stagger > 0 || e.state === 'hurt') return 'hurt';
  if (e.state === 'wind') return 'wind';
  if (e.state === 'strike') return 'strike';
  if (e.state === 'chase' && e.moving) return (Math.floor(e.anim * 5.5) & 1) ? 'walk1' : 'walk2';
  return 'idle';
}

// ---------------------------------------------------------------- effets
function updateProjs(dt) {
  if (dt <= 0) return;
  G.projs = G.projs.filter(p => {
    p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
    if (Math.random() < .5) G.parts.push({ x: p.x, y: p.y, z: p.z + rr(-.05, .05), vx: rr(-.3, .3), vy: rr(-.3, .3), vz: rr(0, .5), s: .02, col: [120, 255, 140], life: .3, emis: true, g: 0 });
    if (isWall(p.x, p.y) || p.life <= 0) { sparks(p.x - p.vx * dt, p.y - p.vy * dt, p.z, 16, [120, 255, 140]); Sfx.fizz(p); return false; }
    if (p.owner === 'e') { if (Math.hypot(P.x - p.x, P.y - p.y) < .42) { hurtPlayer(p.dmg, p); sparks(p.x, p.y, p.z, 14, [120, 255, 140]); return false; } }
    else for (const e of G.enemies) if (!e.dead && Math.hypot(e.x - p.x, e.y - p.y) < e.r + .25) { damageEnemy(e, 70, 'PROJ'); sparks(p.x, p.y, p.z, 16, [120, 255, 140]); return false; }
    return true;
  });
}
function updateParts(dt) {
  if (dt <= 0) return;
  const ps = G.parts, mw = G.mw; let w = 0;
  for (let i = 0; i < ps.length; i++) {
    const p = ps[i]; p.life -= dt; if (p.life <= 0) continue;
    p.vz -= GRAV * dt * (p.g === undefined ? 1 : p.g);
    const nx = p.x + p.vx * dt, ny = p.y + p.vy * dt;
    if (isWall(nx, ny)) {
      if (p.blood) { const cx = nx | 0, cy = ny | 0, u = ((p.x | 0) !== cx) ? ny - Math.floor(ny) : nx - Math.floor(nx); if (cx >= 0 && cy >= 0 && cx < mw && cy < G.mh) stampWall(cy * mw + cx, u, 1 - p.z, 70 + p.s * 2000); continue; }
      p.vx *= -.3; p.vy *= -.3;
    } else { p.x = nx; p.y = ny; }
    p.z += p.vz * dt;
    if (p.z <= 0) { if (p.blood) { stampFloor(p.x, p.y, p.s > .03 ? 1 : 0, 50 + p.s * 1500); if (p.s > .03 && Math.random() < .15) Sfx.drop(p); continue; } p.z = 0; p.vz *= -.3; }
    if (p.z > .98) { p.z = .98; p.vz = -Math.abs(p.vz) * .2; }
    ps[w++] = p;
  }
  ps.length = w;
}
function gibExt(g) { const c = Math.abs(Math.cos(g.rot)), s = Math.abs(Math.sin(g.rot)); return .5 * (g.tex.h * c + g.tex.w * s) * g.sc; }
function updateGibs(dt) {
  if (dt <= 0) return;
  G.gibs = G.gibs.filter(g => G.time - g.born < 7.5);
  const plx = G.cam ? G.cam.plX : 0, ply = G.cam ? G.cam.plY : 1;
  for (const g of G.gibs) {
    if (g.topple > 0) {
      g.topple -= dt;
      if (g.topple <= 0) { g.vrot = g.tdir * 3.2; g.toppling = true; }
    }
    if (g.sq === undefined) g.sq = 1;
    if (g.toppling && Math.abs(g.rot) >= 1.45) { g.rot = Math.sign(g.rot) * 1.45; g.vrot = 0; g.toppling = false; shake(.05); stampFloor(g.x, g.y, 3, 120); }
    g.vz -= GRAV * dt;
    const nx = g.x + g.vx * dt, ny = g.y + g.vy * dt;
    if (isWall(nx, g.y)) { g.vx *= -.3; if (Math.abs(g.vx) > .5) stampWallNear(g.x, g.y); } else g.x = nx;
    if (isWall(g.x, ny)) { g.vy *= -.3; } else g.y = ny;
    g.z += g.vz * dt; g.rot += g.vrot * dt;
    const ext = gibExt(g) * g.sq;
    if (g.z <= ext) {
      g.z = ext;
      if (g.vz < -1.4) { g.vz *= -.25; g.vrot *= .5; stampFloor(g.x, g.y, 2, 140); Sfx.thud(g); }
      else g.vz = 0;
      const f = Math.pow(.004, dt); g.vx *= f; g.vy *= f;
      g.ground = true;
      // se coucher : le grand axe du morceau s'aligne sur le sol, puis il s'aplatit
      if (!g.toppling && g.vz === 0) {
        g.vrot = 0;
        const flatA = g.tex.h >= g.tex.w ? (g.rot >= 0 ? Math.PI / 2 : -Math.PI / 2) : (Math.abs(angDiff(g.rot, 0)) < Math.PI / 2 ? 0 : Math.PI);
        g.rot += angDiff(g.rot, flatA) * Math.min(1, dt * 7);
        g.sq = lerp(g.sq, .5, Math.min(1, dt * 3));
      }
    } else g.ground = false;
    if (g.bleed > 0) {
      g.bleed -= dt;
      const n = Math.random() < dt * 45 * Math.min(1, g.bleed) ? 1 : 0;
      for (let i = 0; i < n; i++) {
        const dxl = (g.wx - g.tex.w / 2) * g.sc, dyl = (g.wy - g.tex.h / 2) * g.sc, c = Math.cos(g.rot), s = Math.sin(g.rot);
        const rx = dxl * c - dyl * s, ry = dxl * s + dyl * c, l = Math.hypot(rx, ry) || 1;
        G.parts.push({
          x: g.x + plx * rx, y: g.y + ply * rx, z: Math.max(.02, g.z - ry), vx: plx * rx / l * 1.2 + rr(-.4, .4) + g.vx * .5, vy: ply * rx / l * 1.2 + rr(-.4, .4) + g.vy * .5,
          vz: -ry / l * 1.6 + rr(.3, 1.4), s: rr(.012, .03), col: pick(BLOODC), life: 3, blood: true
        });
      }
    }
  }
}
function updatePicks(dt) {
  G.picks = G.picks.filter(k => {
    k.age += dt; const dx = P.x - k.x, dy = P.y - k.y, d = Math.hypot(dx, dy);
    if (k.kind === 'orb') {
      if ((k.age > .5 && d < 3.5) || (k.age > 1.2 && d < 8)) { const a = 30 * dt; k.vx += dx / d * a; k.vy += dy / d * a; k.vx *= .94; k.vy *= .94; k.z = lerp(k.z, .4, .1); k.vz = 0; }
      else { k.vz -= GRAV * dt; k.vx *= Math.pow(.2, dt); k.vy *= Math.pow(.2, dt); }
      const nx = k.x + k.vx * dt, ny = k.y + k.vy * dt; if (!isWall(nx, k.y)) k.x = nx; else k.vx *= -.5; if (!isWall(k.x, ny)) k.y = ny; else k.vy *= -.5;
      k.z += k.vz * dt; if (k.z < .06) { k.z = .06; k.vz *= -.4; }
      if (d < .45 && k.age > .3) { P.hp = Math.min(P.maxHp, P.hp + k.v); P.rage = Math.min(100, P.rage + 1); Sfx.orb(); return false; }
      return k.age < 25;
    }
    if (d < .55 && P.hp < P.maxHp) { P.hp = Math.min(P.maxHp, P.hp + 30); Sfx.pickup(); G.msg('+30 VIE', 1, '#f66'); return false; }
    return true;
  });
}
function updatePools(dt) {
  G.pools = G.pools.filter(p => { p.r += dt * 4; stampFloor(p.x, p.y, Math.min(p.r, p.max), dt * 260); return p.r < p.max; });
}

// ---------------------------------------------------------------- boucle
function update(dt) {
  G.flick = .93 + .05 * Math.sin(G.time * 13.1) * Math.sin(G.time * 7.3) + .02 * Math.sin(G.time * 31);
  G.shake *= Math.pow(.004, dt); G.flash = Math.max(0, G.flash - dt * 2.5); G.redFlash = Math.max(0, G.redFlash - dt * 1.2);
  G.fovKick *= Math.pow(.02, dt); G.grinT -= dt;
  G.kickYaw *= Math.pow(.0004, dt); G.kickPitch *= Math.pow(.0004, dt);
  updateBreathFx(dt); Sfx.tick(dt);
  for (const m of G.msgs) m.life -= dt; G.msgs = G.msgs.filter(m => m.life > 0);
  const tgt = P.rageT > 0 ? [1.35, .55, .45] : [1.05, .86, .72];
  for (let i = 0; i < 3; i++) G.tint[i] = lerp(G.tint[i], tgt[i], Math.min(1, dt * 4));
  G.letter = lerp(G.letter, G.cine ? 1 : 0, Math.min(1, dt * 7));
  G.tilt = lerp(G.tilt, G.cine ? (G.cine.v === 'X' ? -.07 : .06) : 0, Math.min(1, dt * 5));
  G.fovCur = lerp(G.fovCur, G.cine ? .88 : 1.26, Math.min(1, dt * 6));

  if (G.state === 'title') { P.ang += dt * .15; return; }
  if (G.state === 'pause') { if (Input.anyP) G.state = 'play'; return; }
  if (G.state === 'floorEnd') { G.endT += dt; if (G.endT > 1 && Input.anyP) { newFloor(G.floor + 1); G.state = 'play'; } return; }
  if (G.state === 'dead') {
    G.deadT += dt; updateBreath(dt); updateGibs(dt * .5); updateParts(dt * .5); updatePools(dt);
    if (G.deadT > 1.5 && Input.anyP) newGame();
    return;
  }
  if (G.hitstop > 0) { G.hitstop -= dt; return; }
  if (G.impact > 0) G.impact -= dt;
  let ts = 1; if (G.slowT > 0) { G.slowT -= dt; ts = G.slowScale; }
  let fxs = ts; if (G.cine && !G.cine.done) { ts = 0; fxs = .22; }
  updatePlayer(dt); updateWeapon(dt); updateCine(dt);
  updateEnemies(dt * ts); updateProjs(dt * ts); updateGibs(dt * fxs); updateParts(dt * fxs); updatePicks(dt); updatePools(dt * fxs);
  G.enemies = G.enemies.filter(e => !e.dead);
  if (!G.cleared && G.enemies.length === 0 && !G.cine) {
    G.cleared = true; Sfx.gate(); G.msg('DONJON PURGE', 3, '#f33', true); G.msg('LA PORTE DE SANG EST OUVERTE', 3, '#ddd');
  }
  if (G.cleared && !G.cine && Math.hypot(P.x - (G.D.exit.x + .5), P.y - (G.D.exit.y + .5)) < .9) {
    G.state = 'floorEnd'; G.endT = 0; saveBest(); if (G.floor + 1 > G.best) { G.best = G.floor + 1; try { localStorage.setItem('berserker_best', G.best); } catch (e) { } }
    Sfx.boom(); if (document.pointerLockElement) { /* garder le lock */ }
  }
  if (Input.mapP) G.showMap = !G.showMap;
}

// ---------------------------------------------------------------- dessin
function drawEntities(C) {
  for (const d of G.decor) {
    let t, z = 0, lit = lmAt(d.x, d.y);
    if (d.kind === 'torch') { t = SPR.torch[((G.time * 9 + d.x * 7) | 0) % 3]; lit = -1; drawSprite(C, t, d.x, d.y, d.z, 1 / 64, 0, false, lit, 0, 0); continue; }
    if (d.kind === 'brazier') { t = SPR.brazier[((G.time * 9 + d.x * 5) | 0) % 3]; lit = -1; }
    else if (d.kind === 'stake') t = SPR.stake; else t = SPR.bones;
    drawSprite(C, t, d.x, d.y, z + t.h / 128, 1 / 64, 0, false, lit, 0, 0);
  }
  for (const e of G.enemies) {
    if (e.dead) continue;
    const fr = eFrame(e); e.fr = fr;
    const t = (e.boss ? SPR.boss : SPR[e.type])[fr];
    let fl = e.flash, mode = 0;
    if (e.stagger > 0 && (Math.floor(G.time * 8) & 1)) { fl = Math.max(fl, .5); mode = 1; }
    drawSprite(C, t, e.x, e.y, e.z + t.h * e.sc / 2, e.sc, 0, e.flip, lmAt(e.x, e.y), fl, mode);
  }
  for (const g of G.gibs) {
    const age = G.time - g.born, dim = .72 * (age > 1.5 ? Math.max(.3, 1 - (age - 1.5) / 3.5) : 1);
    const fade = age > 4.5 ? Math.max(0, 1 - (age - 4.5) / 3) : 1;
    drawSprite(C, g.tex, g.x, g.y, g.z, g.sc, g.rot, false, lmAt(g.x, g.y), 0, 0, dim, fade, g.sq || 1);
  }
  for (const k of G.picks) {
    if (k.kind === 'orb') drawSprite(C, SPR.orb, k.x, k.y, k.z, 1 / 64, 0, false, -1, 0, 0);
    else drawSprite(C, SPR.flask, k.x, k.y, .18 + Math.sin(G.time * 3 + k.x) * .03, 1 / 64, 0, false, Math.max(.6, lmAt(k.x, k.y)), 0, 0);
  }
  for (const p of G.projs) drawSprite(C, SPR.fireball[((G.time * 12) | 0) & 1], p.x, p.y, p.z, 1 / 64, G.time * 6, false, -1, 0, 0);
  for (const p of G.parts) drawDot(C, p.x, p.y, p.z, p.s, p.col, p.emis);
}

let WC = null, WX = null;
function drawWeapon(ctx) {
  const W = R.W, H = R.H, s = H / 200 * 1.18;
  if (!WC || WC.width !== W || WC.height !== H) { WC = document.createElement('canvas'); WC.width = W; WC.height = H; WX = WC.getContext('2d'); WX.imageSmoothingEnabled = false; }
  const c = WX; c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1; c.clearRect(0, 0, W, H);
  const name = Wpn.name, pose = name ? wpose(name, Wpn.t) : (Wpn.charging ? chargePose() : idlePose());
  const red = P.rageT > 0 || (name && ANIMS[name].exec) || Wpn.charging || name === 'SPIN';
  if (name) {
    const A = ANIMS[name];
    for (const [a, b] of A.trail) {
      if (Wpn.t < a || Wpn.t > b + .1) continue;
      const t1 = Math.min(Wpn.t, b), t0 = Math.max(a, Wpn.t - .1); if (t1 <= t0) continue;
      drawTrail(c, name, t0, t1, s, red ? '255,60,30' : '235,230,220', Math.max(0, 1 - (Wpn.t - b) / .1));
    }
  }
  const px = pose.x * W, py = pose.y * H;
  c.lineCap = 'round';
  c.strokeStyle = '#26262e'; c.lineWidth = 17 * s;
  c.beginPath(); c.moveTo(px + 4 * s, py + 8 * s); c.lineTo(px + 50 * s, H + 34 * s); c.stroke();
  c.beginPath(); c.moveTo(px - 4 * s, py + 12 * s); c.lineTo(px - 12 * s, H + 40 * s); c.stroke();
  c.strokeStyle = '#4c4c58'; c.lineWidth = 4 * s;
  c.beginPath(); c.moveTo(px + 1 * s, py + 8 * s); c.lineTo(px + 44 * s, H + 34 * s); c.stroke();
  c.save(); c.translate(px, py); c.rotate(pose.a); c.scale(s, s * pose.sy);
  c.drawImage(SPR.sword, -SWORD_PIVOT[0], -SWORD_PIVOT[1]);
  if (red) { c.globalAlpha = Wpn.charging ? Math.min(1, Wpn.charge) * (.6 + .4 * Math.sin(G.time * 30)) : .8; c.drawImage(SPR.swordRed, -SWORD_PIVOT[0], -SWORD_PIVOT[1]); c.globalAlpha = 1; }
  c.restore();
  c.save(); c.translate(px, py); c.rotate(pose.a * .3); c.scale(s, s); c.drawImage(SPR.hands, -18, -17); c.restore();
  // éclairage de l'arme selon l'endroit
  const L = clamp(lmAt(P.x, P.y) * G.flick + .38 + G.flash, .3, 1.15);
  c.globalCompositeOperation = 'source-atop';
  if (L < 1) { c.fillStyle = `rgba(0,0,0,${1 - L})`; c.fillRect(0, 0, W, H); }
  c.fillStyle = P.rageT > 0 ? 'rgba(255,20,0,.18)' : 'rgba(255,140,60,.07)'; c.fillRect(0, 0, W, H);
  c.globalCompositeOperation = 'source-over';
  ctx.drawImage(WC, 0, 0);
}
function drawTrail(ctx, name, t0, t1, s, col, fade) {
  const N = 10, pts = [];
  for (let i = 0; i <= N; i++) {
    const t = t0 + (t1 - t0) * i / N, p = wpose(name, t), L = 146 * s * p.sy, px = p.x * R.W, py = p.y * R.H;
    pts.push({ tx: px + Math.sin(p.a) * L * 1.05, ty: py - Math.cos(p.a) * L * 1.05, mx: px + Math.sin(p.a) * L * .3, my: py - Math.cos(p.a) * L * .3 });
  }
  for (let i = 0; i < N; i++) {
    const a = pts[i], b = pts[i + 1];
    ctx.fillStyle = `rgba(${col},${((i + 1) / N) * .6 * fade})`;
    ctx.beginPath(); ctx.moveTo(a.tx, a.ty); ctx.lineTo(b.tx, b.ty); ctx.lineTo(b.mx, b.my); ctx.lineTo(a.mx, a.my); ctx.closePath(); ctx.fill();
  }
}

function drawHUD(v) {
  const W = R.W, H = R.H;
  if (G.letter > .05) {
    const lb = Math.round(H * .13 * G.letter); v.fillStyle = '#000'; v.fillRect(0, 0, W, lb); v.fillRect(0, H - lb, W, lb);
  }
  for (let i = 0; i < G.msgs.length; i++) {
    const m = G.msgs[i]; v.globalAlpha = Math.min(1, m.life * 2.5);
    const big = m.big, s = big ? 3 : 1, j = big && m.max - m.life < .25 ? rr(-1, 1) : 0;
    let y = H * .2 + i * 11 + (big ? 0 : 4);
    drawText(v, m.txt, W / 2 + j, y, s, m.col, 'center');
    v.globalAlpha = 1;
  }
  if (G.cine) return;
  hudPanels(v);
  // exécution possible
  if (findExec() && (Math.floor(G.time * 6) & 1)) drawText(v, Input.touch ? 'ATTAQUE : EXECUTION' : 'CLIC : EXECUTION', W / 2, H * .64, 1, '#fb4', 'center');
  // boussole vers la porte
  if (G.cleared) {
    const a = angDiff(P.ang, Math.atan2(G.D.exit.y + .5 - P.y, G.D.exit.x + .5 - P.x));
    v.save(); v.translate(W / 2, 22); v.rotate(a); v.fillStyle = '#f42';
    v.beginPath(); v.moveTo(0, -7); v.lineTo(5, 4); v.lineTo(0, 1); v.lineTo(-5, 4); v.closePath(); v.fill(); v.restore();
  }
  if (G.showMap) drawMap(v);
}
const SKULL_ICON = ['.###.', '#####', '#.#.#', '#####', '.#.#.'];
function roman(n) { const t = [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']]; let r = ''; for (const [v, c] of t) while (n >= v) { r += c; n -= v; } return r; }
function plate(v, x, y, w, h) {
  v.fillStyle = '#000'; v.fillRect(x - 1, y - 1, w + 2, h + 2);
  v.fillStyle = '#1b1517'; v.fillRect(x, y, w, h);
  v.fillStyle = '#3c3134'; v.fillRect(x, y, w, 1); v.fillRect(x, y, 1, h);
  v.fillStyle = '#0b0809'; v.fillRect(x, y + h - 1, w, 1); v.fillRect(x + w - 1, y, 1, h);
  v.fillStyle = '#6a5a50'; for (const [rx, ry] of [[x + 2, y + 2], [x + w - 3, y + 2], [x + 2, y + h - 3], [x + w - 3, y + h - 3]]) v.fillRect(rx, ry, 1, 1);
}
function bar(v, x, y, w, h, frac, lag, c1, c2, bg) {
  v.fillStyle = '#000'; v.fillRect(x - 1, y - 1, w + 2, h + 2);
  v.fillStyle = bg; v.fillRect(x, y, w, h);
  const fw = Math.round(w * clamp(frac, 0, 1)), lw = Math.round(w * clamp(lag, 0, 1));
  if (lw > fw) { v.fillStyle = '#e8a060'; v.fillRect(x + fw, y, lw - fw, h); }
  v.fillStyle = c1; v.fillRect(x, y, fw, h);
  v.fillStyle = c2; v.fillRect(x, y + h - Math.max(1, h >> 2), fw, Math.max(1, h >> 2));
  v.fillStyle = 'rgba(255,255,255,.28)'; v.fillRect(x, y, fw, 1);
  v.fillStyle = 'rgba(0,0,0,.45)'; for (let i = 9; i < w; i += 9) v.fillRect(x + i, y, 1, h);
}
function hudPanels(v) {
  const W = R.W, H = R.H;
  P.hpLag = P.hpLag === undefined ? P.hp : (P.hpLag > P.hp ? P.hpLag - (P.hpLag - P.hp) * .04 - .1 : P.hp);
  // panneau bas-gauche
  const px = 3, py = H - 42;
  plate(v, px, py, 100, 39);
  if (P.rageT > 0) { v.fillStyle = 'rgba(200,30,10,.35)'; v.fillRect(px, py, 100, 39); }
  const bx = px + 5, bw = 90;
  const low = P.hp < 30 && (Math.floor(G.time * 4) & 1);
  drawText(v, 'VIE', bx, py + 4, 1, '#c88', 'left', null);
  drawText(v, Math.ceil(P.hp) + '/' + P.maxHp, bx + bw, py + 4, 1, low ? '#f66' : '#eee', 'right', null);
  bar(v, bx, py + 11, bw, 7, P.hp / P.maxHp, P.hpLag / P.maxHp, low ? '#e22' : '#a8141a', '#5a060a', '#1a0405');
  const full = P.rage >= 100 && P.rageT <= 0, fl = Math.floor(G.time * 6) & 1;
  bar(v, bx, py + 22, bw, 4, P.rage / 100, 0, P.rageT > 0 ? (fl ? '#ff5020' : '#ff2808') : full ? (fl ? '#ffb030' : '#ff6a10') : '#b05a14', '#602808', '#140a04');
  drawText(v, P.rageT > 0 ? 'FUREUR ' + Math.ceil(P.rageT) : full ? (Input.touch ? 'FUREUR PRETE' : 'FUREUR PRETE  R') : 'RAGE', bx, py + 29, 1, full || P.rageT > 0 ? '#fc6' : '#987', 'left', null);
  // esquive prête
  v.fillStyle = P.dashCd <= 0 ? '#9bd' : '#334'; v.fillRect(bx + bw - 9, py + 30, 9, 3);
  // plaque étage (haut gauche)
  const ft = 'ETAGE ' + roman(G.floor), fw = textW(ft) + 10;
  plate(v, 3, 3, fw, 11); drawText(v, ft, 8, 6, 1, '#d9a', 'left', null);
  // ennemis restants (haut droite)
  const left = G.enemies.length, lt = left ? String(left) : 'PORTE OUVERTE', lw = textW(lt) + 16;
  plate(v, W - 3 - lw, 3, lw, 11);
  v.fillStyle = left ? '#ddd' : '#f53';
  SKULL_ICON.forEach((r, j) => { for (let i = 0; i < 5; i++) if (r[i] === '#') v.fillRect(W - lw + 2 + i, 6 + j, 1, 1); });
  drawText(v, lt, W - 7, 6, 1, left ? '#eee' : '#f53', 'right', null);
  // boss
  if (G.boss && !G.boss.dead && G.boss.aggro) {
    const bbw = Math.min(170, W - 110), bbx = (W - bbw) / 2;
    plate(v, bbx - 4, 17, bbw + 8, 14); drawText(v, 'LE BOUCHER', W / 2, 19, 1, '#f84', 'center', null);
    bar(v, bbx, 26, bbw, 3, G.boss.hp / G.boss.maxHp, 0, '#d22', '#700', '#200');
  }
  // viseur : rouge si un ennemi est à portée de lame
  let inR = false;
  for (const e of G.enemies) { const dx = e.x - P.x, dy = e.y - P.y; if (Math.hypot(dx, dy) - e.r < 2.15 && Math.abs(angDiff(P.ang, Math.atan2(dy, dx))) < .5) { inR = true; break; } }
  const cx = W / 2 | 0, cy = H / 2 | 0;
  v.fillStyle = inR ? 'rgba(255,60,40,.85)' : 'rgba(230,215,200,.45)';
  v.fillRect(cx, cy, 1, 1); v.fillRect(cx - 4, cy, 2, 1); v.fillRect(cx + 3, cy, 2, 1); v.fillRect(cx, cy - 4, 1, 2); v.fillRect(cx, cy + 3, 1, 2);
}
function drawMap(v) {
  const W = R.W, H = R.H, s = Math.max(1, Math.floor(Math.min((W - 20) / G.mw, (H - 40) / G.mh)));
  const ox = (W - G.mw * s) >> 1, oy = ((H - G.mh * s) >> 1) + 4;
  v.fillStyle = 'rgba(0,0,0,.72)'; v.fillRect(ox - 3, oy - 3, G.mw * s + 6, G.mh * s + 6);
  for (let y = 0; y < G.mh; y++) for (let x = 0; x < G.mw; x++) {
    const k = y * G.mw + x; if (!G.explored[k]) continue;
    const c = G.map[k]; v.fillStyle = c === GATE ? (G.cleared ? '#f42' : '#822') : c ? '#7a6a5a' : '#2e2420';
    v.fillRect(ox + x * s, oy + y * s, s, s);
  }
  if (G.enemies.length <= 3) { v.fillStyle = '#e33'; for (const e of G.enemies) v.fillRect(ox + e.x * s - 1, oy + e.y * s - 1, 2, 2); }
  v.fillStyle = '#ff6'; v.fillRect(ox + P.x * s - 1, oy + P.y * s - 1, 3, 3);
  v.strokeStyle = '#ff6'; v.lineWidth = 1; v.beginPath(); v.moveTo(ox + P.x * s, oy + P.y * s); v.lineTo(ox + (P.x + Math.cos(P.ang) * 2.5) * s, oy + (P.y + Math.sin(P.ang) * 2.5) * s); v.stroke();
}
function vignette(v, col, a) {
  const W = R.W, H = R.H, g = v.createRadialGradient(W / 2, H / 2, H * .3, W / 2, H / 2, W * .65);
  g.addColorStop(0, `rgba(${col},0)`); g.addColorStop(1, `rgba(${col},${a})`); v.fillStyle = g; v.fillRect(0, 0, W, H);
}
function fmtTime(t) { t = Math.floor(t); return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'); }
function drawScreens(v) {
  const W = R.W, H = R.H;
  if (G.state === 'title') {
    v.fillStyle = 'rgba(0,0,0,.45)'; v.fillRect(0, 0, W, H);
    vignette(v, '60,0,0', .8);
    const j = Math.random() < .05 ? 1 : 0;
    drawText(v, 'BERSERKER', W / 2 + j, 34, 5, '#c11', 'center', '#200');
    drawText(v, 'LES DONJONS DE SANG', W / 2, 66, 2, '#d8c8b8', 'center');
    if (Math.floor(G.time * 2) & 1) drawText(v, Input.touch ? 'TOUCHE POUR COMMENCER' : 'CLIQUE POUR COMMENCER', W / 2, 92, 1, '#fc6', 'center');
    const lines = Input.touch
      ? ['STICK GAUCHE : BOUGER   GLISSER A DROITE : REGARDER', 'EPEE : COMBO   LOURD (MAINTENIR) : COUP CHARGE', 'ESQ : ESQUIVE   FUREUR : RAGE   CARTE : CARTE']
      : ['ZQSD / WASD : BOUGER   SOURIS : REGARDER (HAUT/BAS AUSSI)', 'CLIC GAUCHE : COMBO   CLIC DROIT (MAINTENIR) : CHARGE   VISE OU TU VEUX TRANCHER', 'ESPACE : ESQUIVE   R : FUREUR   M : CARTE'];
    lines.forEach((l, i) => drawText(v, l, W / 2, 116 + i * 9, 1, '#a99', 'center'));
    drawText(v, 'AFFAIBLIS UN MONSTRE PUIS FRAPPE-LE QUAND IL CLIGNOTE : EXECUTION', W / 2, 150, 1, '#c86', 'center');
    drawText(v, 'TUE TOUT POUR OUVRIR LA PORTE DE SANG', W / 2, 160, 1, '#c86', 'center');
    if (G.best) drawText(v, 'RECORD : ETAGE ' + G.best, W / 2, 182, 1, '#777', 'center');
  } else if (G.state === 'pause') {
    v.fillStyle = 'rgba(0,0,0,.6)'; v.fillRect(0, 0, W, H);
    drawText(v, 'PAUSE', W / 2, 70, 4, '#c22', 'center'); drawText(v, 'CLIQUE POUR REPRENDRE', W / 2, 110, 1, '#ddd', 'center');
  } else if (G.state === 'dead') {
    const a = Math.min(.75, G.deadT * .5); v.fillStyle = `rgba(60,0,0,${a})`; v.fillRect(0, 0, W, H);
    if (G.deadT > .6) {
      drawText(v, 'TU ES MORT', W / 2, 54, 4, '#e11', 'center', '#100');
      drawText(v, 'ETAGE ' + G.floor + '   TUES ' + G.run.kills + '   EXECUTIONS ' + G.run.execs, W / 2, 92, 1, '#ddd', 'center');
      drawText(v, 'RECORD : ETAGE ' + G.best, W / 2, 104, 1, '#999', 'center');
      if (G.deadT > 1.5 && (Math.floor(G.time * 2) & 1)) drawText(v, Input.touch ? 'TOUCHE POUR RECOMMENCER' : 'CLIQUE POUR RECOMMENCER', W / 2, 130, 1, '#fc6', 'center');
    }
  } else if (G.state === 'floorEnd') {
    v.fillStyle = 'rgba(20,0,0,.8)'; v.fillRect(0, 0, W, H);
    drawText(v, 'ETAGE ' + G.floor + ' PURGE', W / 2, 46, 3, '#e22', 'center');
    drawText(v, 'TUES : ' + G.fstats.kills, W / 2, 80, 1, '#ddd', 'center');
    drawText(v, 'EXECUTIONS : ' + G.fstats.execs, W / 2, 90, 1, '#ddd', 'center');
    drawText(v, 'TEMPS : ' + fmtTime(G.time - G.fstats.t0), W / 2, 100, 1, '#ddd', 'center');
    drawText(v, 'VIE : ' + Math.ceil(P.hp), W / 2, 110, 1, '#f66', 'center');
    if (G.endT > 1 && (Math.floor(G.time * 2) & 1)) drawText(v, (Input.touch ? 'TOUCHE' : 'CLIQUE') + ' POUR DESCENDRE PLUS PROFOND', W / 2, 140, 1, '#fc6', 'center');
  }
}

function draw() {
  const W = R.W, H = R.H, v = R.vctx;
  if (!G.map) return;
  const sk = G.shake * G.shake * .7 + G.shake * .3, st = G.time * 42;
  const shx = (Math.sin(st * 1.31) + Math.sin(st * .77 + 1.3) * .6) * sk * 6, shy = (Math.sin(st * 1.71 + 2) + Math.sin(st * .93 + 4) * .6) * sk * 6;
  const shr = (Math.sin(st * 1.13 + 5) + Math.sin(st * .61) * .5) * sk * .03;
  let eye = .5 + Math.sin(P.bob * 2) * .012 * P.moveAmt;
  if (P.dead) eye = lerp(.5, .1, Math.min(1, G.deadT * 2));
  const C = makeCam(P.x, P.y, P.ang + G.kickYaw, G.fovCur + G.fovKick, eye, shy + P.pitch + G.kickPitch); G.cam = C;
  renderWorld(C); drawEntities(C);
  if (G.impact > 0) mangaFilter();
  R.lctx.putImageData(R.img, 0, 0);
  if (G.state === 'play' || G.state === 'dead') drawBreath(R.lctx);
  if (G.state === 'play' || G.state === 'pause') drawWeapon(R.lctx);
  v.setTransform(1, 0, 0, 1, 0, 0); v.fillStyle = '#000'; v.fillRect(0, 0, W, H);
  const tilt = G.tilt + G.roll + shr + (P.dead ? Math.min(.35, G.deadT * .5) : 0), zoom = 1 + Math.abs(tilt) * .45;
  v.translate(W / 2 + shx, H / 2); v.rotate(tilt); v.scale(zoom, zoom); v.drawImage(R.low, -W / 2, -H / 2);
  v.setTransform(1, 0, 0, 1, 0, 0);
  vignette(v, '0,0,0', .55);
  if (P.rageT > 0) vignette(v, '200,0,0', .55 + .15 * Math.sin(G.time * 11));
  else if (P.hp < 30 && G.state === 'play') vignette(v, '150,0,0', .4 + .2 * Math.sin(G.time * 6));
  if (G.redFlash > 0) { v.fillStyle = `rgba(170,0,0,${G.redFlash})`; v.fillRect(0, 0, W, H); }
  if (G.impact > 0) { v.fillStyle = 'rgba(255,255,255,.08)'; v.fillRect(0, 0, W, H); }
  if (G.state === 'play') drawHUD(v);
  drawScreens(v);
}

// ---------------------------------------------------------------- démarrage
function setupTitle() {
  newFloor(1); G.msgs = [];
  const r = G.D.rooms[1] || G.D.rooms[0]; P.x = r.cx + .5; P.y = r.cy + .5;
  for (const e of G.enemies) if (Math.hypot(e.x - P.x, e.y - P.y) < 2.5) e.x += 3;
  G.state = 'title';
}
let lastT = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(.05, Math.max(0, (now - lastT) / 1000)); lastT = now; G.time += dt;
  if (G.state === 'title' && Input.anyP) { Sfx.init(); newGame(); }
  try { update(dt); draw(); } catch (err) { console.error(err); }
  Input.atkP = Input.hvP = Input.dashP = Input.rageP = Input.mapP = Input.anyP = false;
}
function boot() {
  initRender(); buildAssets(); initInput(); setupTitle();
  requestAnimationFrame(t => { lastT = t; frame(t); });
}
window.addEventListener('load', boot);
