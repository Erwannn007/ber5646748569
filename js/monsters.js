'use strict';
// =====================================================================
//  VARIANTES DE MONSTRES — choisis le style dans MONSTER_STYLE
// =====================================================================
const MONSTER_STYLE = { ghoul: 'A', knight: 'C', brute: 'B', wraith: 'D' };

const HUM = {
  idle: { a: [-.22, -.1, .22, .1], l: [.08, 0, -.08, 0], lift: [1, 1], h: [0, 0], b: 0 },
  walk1: { a: [-.45, -.25, .05, .15], l: [.04, .14, -.13, 0], lift: [.62, 1], h: [-1, 0], b: -1 },
  walk2: { a: [-.05, -.15, .45, .25], l: [.13, 0, -.04, -.14], lift: [1, .62], h: [1, 0], b: 1 },
  wind: { a: [-2.5, -2.9, 2.5, 2.9], l: [.2, 0, -.2, 0], lift: [1, 1], h: [0, -1], b: 0 },
  strike: { a: [.8, 1.4, -.8, -1.4], l: [.24, -.05, -.24, .05], lift: [1, 1], h: [0, 2], b: 1 },
  hurt: { a: [-1.3, -1.9, 1.4, 1.9], l: [.26, -.1, -.12, .14], lift: [1, .78], h: [2, -2], b: -1 }
};
// poses pour un porteur d'arme à deux mains (bras droit = arme)
const ARM2 = {
  idle: { r: [.15, -.2], l: [-.15, .5], w: Math.PI * .95 },
  walk1: { r: [.25, -.1], l: [-.25, .45], w: Math.PI * .9 },
  walk2: { r: [.05, -.3], l: [-.05, .6], w: Math.PI },
  wind: { r: [2.7, 3.0], l: [-2.6, -2.95], w: Math.PI * .02 },
  strike: { r: [-.5, -1.0], l: [.5, 1.0], w: -Math.PI * .7 },
  hurt: { r: [1.4, 1.9], l: [-1.4, -1.9], w: Math.PI * .5 }
};
const spark = (S, x, y, c) => S.set(x, y, c, EMI);

// ------------------------------------------------------------- GOULES
// B : le Mangeur — gros, pâle, bouche cousue, crochets de boucher
function ghoulB(pose) {
  const S = new Layer(64, 64), P = HUM[pose], sk = [176, 166, 138], skD = [128, 116, 96], iron = [120, 116, 120];
  S.over(part(64, 64, L => {
    for (const s of [0, 1]) { const e = limb(L, s ? 37 : 27, 44, P.l[s * 2], 8 * P.lift[s], P.l[s * 2 + 1], 9, 3.4, 2.6, sk); L.ell(e.hx + (s ? 1 : -1), e.hy, 3, 1.4, skD); }
  }));
  S.over(part(64, 64, L => {
    L.ell(32, 36, 13, 12, sk); L.ell(32, 40, 10, 8, cmul(sk, 1.06));
    L.line(26, 34, 37, 44, .5, [90, 20, 20]);
    for (let i = 0; i < 5; i++) { const x = 27 + i * 2.2, y = 35 + i * 2.2; L.line(x - 1.4, y + 1.4, x + 1.4, y - 1.4, .3, [40, 30, 20]); }
    L.poly([[20, 44], [44, 44], [42, 51], [22, 51]], [70, 50, 36]);
  }));
  const hx = 32 + P.h[0], hy = 19 + P.h[1];
  S.over(part(64, 64, L => {
    L.ell(hx, hy, 5.5, 6, sk); L.line(hx - 3, hy + 3, hx + 3, hy + 3, .4, [60, 20, 20]);
    for (let i = -2; i <= 2; i++) L.line(hx + i * 1.3, hy + 2, hx + i * 1.3, hy + 4, .2, [30, 20, 15]);
    L.ell(hx - 2.2, hy - 1, 1.5, 1.6, [20, 12, 12]); L.ell(hx + 2.2, hy - 1, 1.5, 1.6, [20, 12, 12]);
  }));
  spark(S, hx - 2, hy - 1, [255, 50, 40]); spark(S, hx + 2, hy - 1, [255, 50, 40]);
  S.over(part(64, 64, L => {
    for (const s of [0, 1]) {
      const e = limb(L, s ? 44 : 20, 28, P.a[s * 2], 10, P.a[s * 2 + 1], 10, 3, 2.4, sk);
      const a = P.a[s * 2 + 1], dx = Math.sin(a), dy = Math.cos(a);
      L.line(e.hx, e.hy, e.hx + dx * 5, e.hy + dy * 5, .7, iron);
      const tx = e.hx + dx * 5, ty = e.hy + dy * 5, px = -dy * (s ? -1 : 1), py = dx * (s ? -1 : 1);
      L.line(tx, ty, tx + dx * 3 + px * 3, ty + dy * 3 + py * 3, .7, iron); L.line(tx + dx * 3 + px * 3, ty + dy * 3 + py * 3, tx + px * 4, ty + py * 4, .5, iron);
    }
  }));
  return S;
}
// C : le Rampant — à quatre pattes, mâchoire énorme, sans yeux
function ghoulC(pose) {
  const S = new Layer(64, 64), sk = [100, 86, 100], skD = [66, 56, 70], tooth = [230, 220, 196];
  const rear = pose === 'wind' ? -8 : pose === 'strike' ? 3 : pose === 'hurt' ? -4 : 0;
  const wk = pose === 'walk1' ? 1 : pose === 'walk2' ? -1 : 0, jaw = pose === 'strike' ? 8 : pose === 'wind' ? 6 : pose === 'hurt' ? 6 : 3;
  S.over(part(64, 64, L => {
    L.taper(18, 46, 10, 52 - wk * 2, 3, 2.4, skD); L.taper(10, 52 - wk * 2, 12, 62, 2.4, 1.6, skD);
    L.taper(46, 46, 54, 52 + wk * 2, 3, 2.4, skD); L.taper(54, 52 + wk * 2, 52, 62, 2.4, 1.6, skD);
  }));
  S.over(part(64, 64, L => {
    L.ell(32, 44 + rear * .4, 15, 8, sk);
    for (let i = 0; i < 6; i++) L.taper(22 + i * 4, 38 + rear * .4, 21 + i * 4, 34 + rear * .4 - (i % 2) * 2, 1.2, .3, tooth);
  }));
  S.over(part(64, 64, L => {
    const fy = pose === 'wind' ? 30 : 48;
    for (const s of [-1, 1]) {
      const sx = 32 + s * 9, sy = 44 + rear * .5;
      const ex = 32 + s * (pose === 'wind' ? 14 : 18 + wk * s), ey = pose === 'wind' ? 30 : 52;
      L.taper(sx, sy, ex, ey, 3, 2.4, sk); L.taper(ex, ey, 32 + s * (pose === 'wind' ? 16 : 20), pose === 'wind' ? 22 : 62, 2.4, 1.6, sk);
      for (let k = -1; k <= 1; k++) L.line(32 + s * (pose === 'wind' ? 16 : 20), pose === 'wind' ? 22 : 62, 32 + s * (pose === 'wind' ? 16 : 20) + k * 2, pose === 'wind' ? 17 : 63, .4, tooth);
    }
    void fy;
  }));
  const hy = 40 + rear;
  S.over(part(64, 64, L => {
    L.ell(32, hy, 9, 7, sk);
    L.ell(32, hy + 4, 7.5, jaw / 2 + 1.5, [36, 4, 6]);
    for (let i = -6; i <= 6; i += 2) { L.taper(32 + i, hy + 2, 32 + i, hy + 4.5, .8, .2, tooth); L.taper(32 + i + 1, hy + 6 + jaw / 2, 32 + i + 1, hy + 3.5 + jaw / 2, .8, .2, tooth); }
    L.line(26, hy - 3, 38, hy - 3, .5, skD);
  }));
  for (let i = 0; i < 4; i++) spark(S, 27 + i * 3.3, hy - 4 + (i % 2), [255, 240, 120]);
  return S;
}
// D : l'Écorché — muscles à vif, crâne à nu, rapide
function ghoulD(pose) {
  const S = new Layer(64, 64), P = HUM[pose], mu = [150, 38, 34], muL = [196, 80, 66], ten = [228, 210, 186], bone = [222, 212, 186];
  const fib = (L, x0, y0, x1, y1) => L.line(x0, y0, x1, y1, .3, muL);
  S.over(part(64, 64, L => {
    for (const s of [0, 1]) { const e = limb(L, s ? 36 : 28, 39, P.l[s * 2], 11 * P.lift[s], P.l[s * 2 + 1], 12, 2.4, 1.6, mu); fib(L, s ? 36 : 28, 40, e.ex, e.ey); L.disc(e.ex, e.ey, 1.6, ten); L.ell(e.hx, e.hy, 2.2, 1.2, ten); }
  }));
  S.over(part(64, 64, L => {
    L.poly([[22, 21], [42, 21], [37, 40], [27, 40]], mu);
    for (let i = 0; i < 5; i++) { fib(L, 24 + i, 23 + i * 3, 31, 25 + i * 3); fib(L, 40 - i, 23 + i * 3, 33, 25 + i * 3); }
    L.line(32, 22, 32, 39, .4, ten); for (let i = 0; i < 3; i++) L.rect(29, 31 + i * 3, 6, 1, [120, 26, 24]);
  }));
  const hx = 32 + P.h[0], hy = 14 + P.h[1];
  S.over(part(64, 64, L => {
    L.line(32, 21, hx, hy + 4, 1.6, mu);
    L.ell(hx, hy, 5, 5.6, bone); L.rect(hx - 3, hy + 3, 6, 3, bone);
    L.ell(hx - 2.2, hy, 1.8, 2, [20, 6, 6]); L.ell(hx + 2.2, hy, 1.8, 2, [20, 6, 6]);
    for (let i = -2; i <= 2; i++) L.set(hx + i, hy + 5, (i & 1) ? [50, 20, 20] : [240, 232, 210]);
    L.poly([[hx + 1, hy - 5], [hx + 5, hy - 2], [hx + 5, hy + 2]], mu);
  }));
  spark(S, hx - 2, hy, [255, 255, 220]); spark(S, hx + 2, hy, [255, 255, 220]);
  S.over(part(64, 64, L => {
    for (const s of [0, 1]) {
      const e = limb(L, s ? 41 : 23, 23, P.a[s * 2], 12, P.a[s * 2 + 1], 12, 2.2, 1.5, mu);
      fib(L, s ? 41 : 23, 24, e.ex, e.ey);
      const a = P.a[s * 2 + 1]; for (let k = -1; k <= 1; k++) { const aa = a + k * .35; L.line(e.hx, e.hy, e.hx + Math.sin(aa) * 6, e.hy + Math.cos(aa) * 6, .45, ten); }
    }
  }));
  return S;
}

// ------------------------------------------------------------- CHEVALIERS
// B : Chevalier noir — plate noire, heaume cornu, espadon
function knightB(pose) {
  const S = new Layer(64, 64), P = HUM[pose], A = ARM2[pose], pl = [58, 60, 72], plL = [104, 108, 124], tab = [110, 16, 18], bl = [176, 176, 186];
  S.over(part(64, 64, L => { L.poly([[21, 18], [43, 18], [47, 58], [17, 58]], [30, 22, 26]); for (let i = 0; i < 6; i++) L.poly([[18 + i * 5, 56], [21 + i * 5, 62 - (i % 2) * 3], [23 + i * 5, 56]], [30, 22, 26]); }));
  S.over(part(64, 64, L => {
    for (const s of [0, 1]) { const e = limb(L, s ? 36 : 28, 38, P.l[s * 2], 12 * P.lift[s], P.l[s * 2 + 1], 12, 2.8, 2.4, pl); L.disc(e.ex, e.ey, 2.4, plL); L.ell(e.hx + (s ? 1 : -1), e.hy, 3.2, 1.6, pl); }
  }));
  S.over(part(64, 64, L => {
    L.poly([[22, 18], [42, 18], [39, 39], [25, 39]], pl); L.line(32, 19, 32, 37, .6, plL);
    L.poly([[28, 26], [36, 26], [37, 52], [32, 49], [27, 52]], tab);
    L.ell(21, 20, 5.5, 4, pl); L.ell(43, 20, 5.5, 4, pl);
    for (const s of [-1, 1]) L.taper(32 + s * 11, 18, 32 + s * 13, 13, 1.5, .3, plL);
  }));
  const hx = 32 + P.h[0], hy = 11 + P.h[1];
  S.over(part(64, 64, L => {
    L.rect(hx - 5, hy - 5, 10, 11, pl); L.ell(hx, hy - 5, 5, 2, pl);
    L.rect(hx - 4, hy - 1, 8, 1, [8, 4, 6]); L.line(hx, hy + 1, hx, hy + 5, .4, [20, 16, 20]);
    L.taper(hx - 5, hy - 4, hx - 10, hy - 9, 1.6, .9, [200, 190, 166]); L.taper(hx - 10, hy - 9, hx - 9, hy - 14, .9, .3, [200, 190, 166]);
    L.taper(hx + 5, hy - 4, hx + 10, hy - 9, 1.6, .9, [200, 190, 166]); L.taper(hx + 10, hy - 9, hx + 9, hy - 14, .9, .3, [200, 190, 166]);
  }));
  for (let i = -3; i <= 3; i++) spark(S, hx + i, hy - 1, i % 2 ? [255, 40, 20] : [255, 120, 60]);
  S.over(part(64, 64, L => {
    const r = limb(L, 43, 21, A.r[0], 10, A.r[1], 9, 2.4, 2.2, pl), l = limb(L, 21, 21, A.l[0], 10, A.l[1], 9, 2.4, 2.2, pl);
    const gx = (r.hx + l.hx) / 2, gy = (r.hy + l.hy) / 2, dx = Math.sin(A.w), dy = Math.cos(A.w);
    L.taper(gx - dx * 4, gy - dy * 4, gx + dx * 28, gy + dy * 28, 2, 1.3, bl);
    L.line(gx + dx * 2 - dy * 5, gy + dy * 2 + dx * 5, gx + dx * 2 + dy * 5, gy + dy * 2 - dx * 5, .9, plL);
    L.disc(r.hx, r.hy, 2, pl); L.disc(l.hx, l.hy, 2, pl);
  }));
  return S;
}
// C : le Bourreau — torse nu, cagoule, hache géante
function knightC(pose) {
  const S = new Layer(64, 64), P = HUM[pose], A = ARM2[pose], sk = [158, 136, 124], skD = [112, 92, 84], hood = [86, 62, 40], wood = [96, 64, 36], steel = [150, 150, 158];
  S.over(part(64, 64, L => {
    for (const s of [0, 1]) { const e = limb(L, s ? 37 : 27, 40, P.l[s * 2], 11 * P.lift[s], P.l[s * 2 + 1], 11, 3, 2.6, [60, 44, 34]); L.ell(e.hx + (s ? 1 : -1), e.hy, 3.4, 1.6, [40, 30, 24]); }
  }));
  S.over(part(64, 64, L => {
    L.ell(32, 31, 12, 11, sk); L.ell(32, 37, 9, 7, cmul(sk, 1.05));
    L.line(27, 26, 31, 28, .5, skD); L.line(37, 26, 33, 28, .5, skD);
    L.poly([[22, 38], [42, 38], [41, 54], [23, 54]], [66, 46, 30]); L.rect(22, 38, 20, 2, [40, 28, 18]);
    L.line(25, 30, 29, 36, .4, [190, 120, 110]);
  }));
  const hx = 32 + P.h[0], hy = 14 + P.h[1];
  S.over(part(64, 64, L => { L.ell(hx, hy, 6, 7, hood); L.poly([[hx - 4, hy - 6], [hx + 4, hy - 6], [hx + 1, hy - 11]], hood); L.rect(hx - 3.5, hy - 1, 2.5, 1.6, [10, 6, 4]); L.rect(hx + 1, hy - 1, 2.5, 1.6, [10, 6, 4]); }));
  spark(S, hx - 2, hy - 1, [255, 230, 160]); spark(S, hx + 2, hy - 1, [255, 230, 160]);
  S.over(part(64, 64, L => {
    const r = limb(L, 44, 22, A.r[0], 10, A.r[1], 10, 3.2, 2.8, sk), l = limb(L, 20, 22, A.l[0], 10, A.l[1], 10, 3.2, 2.8, sk);
    const gx = (r.hx + l.hx) / 2, gy = (r.hy + l.hy) / 2, dx = Math.sin(A.w), dy = Math.cos(A.w);
    L.line(gx - dx * 8, gy - dy * 8, gx + dx * 24, gy + dy * 24, 1.1, wood);
    const bx = gx + dx * 20, by = gy + dy * 20, nx = -dy, ny = dx;
    L.poly([[bx - dx * 4, by - dy * 4], [bx + dx * 5, by + dy * 5], [bx + dx * 8 + nx * 9, by + dy * 8 + ny * 9], [bx + nx * 11, by + ny * 11], [bx - dx * 7 + nx * 9, by - dy * 7 + ny * 9]], steel);
    L.disc(r.hx, r.hy, 2.6, sk); L.disc(l.hx, l.hy, 2.6, sk);
  }));
  return S;
}
// D : le Pestiféré — masque à bec, chapeau, faux
function knightD(pose) {
  const S = new Layer(64, 64), P = HUM[pose], A = ARM2[pose], coat = [40, 36, 40], coatL = [70, 64, 70], mask = [214, 204, 176], wood = [80, 56, 34], steel = [170, 170, 180];
  S.over(part(64, 64, L => {
    const sw = P.b * 2;
    L.poly([[22, 20], [42, 20], [47 + sw, 60], [17 + sw, 60]], coat);
    L.line(32, 22, 32 + sw * .6, 58, .5, coatL);
    for (let i = 0; i < 5; i++) L.disc(30, 26 + i * 4, .7, [150, 130, 80]);
  }));
  S.over(part(64, 64, L => { for (const s of [0, 1]) L.rect(s ? 34 : 26, 58, 5, 5, [30, 24, 22]); }));
  const hx = 32 + P.h[0], hy = 13 + P.h[1];
  S.over(part(64, 64, L => {
    L.ell(hx, hy, 5, 5.5, mask);
    L.poly([[hx - 2, hy + 1], [hx + 2, hy + 1], [hx + 1, hy + 11], [hx, hy + 12]], mask);
    L.disc(hx - 2.4, hy - .5, 1.8, [30, 30, 34]); L.disc(hx + 2.4, hy - .5, 1.8, [30, 30, 34]);
    L.ell(hx, hy - 5, 11, 2.2, [26, 22, 26]); L.rect(hx - 5, hy - 11, 10, 6, [26, 22, 26]);
  }));
  spark(S, hx - 2, hy - 1, [120, 255, 160]); spark(S, hx + 3, hy - 1, [120, 255, 160]);
  S.over(part(64, 64, L => {
    const r = limb(L, 43, 22, A.r[0], 10, A.r[1], 9, 2.4, 2, coat), l = limb(L, 21, 22, A.l[0], 10, A.l[1], 9, 2.4, 2, coat);
    const gx = (r.hx + l.hx) / 2, gy = (r.hy + l.hy) / 2, dx = Math.sin(A.w), dy = Math.cos(A.w), nx = -dy, ny = dx;
    L.line(gx - dx * 10, gy - dy * 10, gx + dx * 24, gy + dy * 24, .8, wood);
    const bx = gx + dx * 24, by = gy + dy * 24;
    L.taper(bx, by, bx + nx * 10 - dx * 3, by + ny * 10 - dy * 3, 2, .8, steel); L.taper(bx + nx * 10 - dx * 3, by + ny * 10 - dy * 3, bx + nx * 15 - dx * 9, by + ny * 15 - dy * 9, .8, .2, steel);
    L.disc(r.hx, r.hy, 1.6, [60, 50, 40]); L.disc(l.hx, l.hy, 1.6, [60, 50, 40]);
  }));
  return S;
}

// ------------------------------------------------------------- ABOMINATIONS (80x80)
const BRP = {
  idle: { a: [-.3, -.1, .3, .1], l: [.12, -.05, -.12, .05], lift: [1, 1], hy: 0, h: [0, 0], j: 3 },
  walk1: { a: [-.55, -.2, .12, .2], l: [.06, .1, -.16, 0], lift: [.7, 1], hy: -1, h: [-1, 0], j: 3 },
  walk2: { a: [-.12, -.2, .55, .2], l: [.16, 0, -.06, -.1], lift: [1, .7], hy: -1, h: [1, 0], j: 3 },
  wind: { a: [-2.6, -3.0, 2.6, 3.0], l: [.25, 0, -.25, 0], lift: [1, 1], hy: -2, h: [0, -1], j: 7 },
  strike: { a: [.35, .1, -.35, -.1], l: [.38, -.1, -.38, .1], lift: [.82, .82], hy: 3, h: [0, 3], j: 7 },
  hurt: { a: [-1.2, -1.6, 1.3, 1.7], l: [.3, -.1, -.15, .1], lift: [1, .85], hy: 0, h: [3, -2], j: 7 }
};
// B : la Masse — chairs fusionnées, visages et yeux partout, un bras géant
function bruteB(pose) {
  const S = new Layer(80, 80), P = BRP[pose], sk = [168, 120, 108], skD = [120, 78, 72], hy = P.hy;
  S.over(part(80, 80, L => { for (const s of [0, 1]) { const e = limb(L, s ? 48 : 32, 60 + hy, P.l[s * 2], 8 * P.lift[s], P.l[s * 2 + 1], 9, 5.5, 5, sk); L.ell(e.hx, e.hy, 5.5, 2.4, skD); } }));
  S.over(part(80, 80, L => {
    L.ell(40, 46 + hy, 20, 18, sk); L.ell(28, 34 + hy, 10, 10, sk); L.ell(52, 36 + hy, 11, 9, sk); L.ell(40, 26 + hy, 9, 8, sk);
    const faces = [[30, 42], [48, 50], [40, 33]];
    for (const [x, y] of faces) { L.ell(x, y + hy, 4.5, 5, cmul(sk, .9)); L.ell(x, y + 2 + hy, 2, P.j / 3 + 1, [40, 6, 6]); L.rect(x - 2.5, y - 1.5 + hy, 1.5, 1, [30, 10, 10]); L.rect(x + 1, y - 1.5 + hy, 1.5, 1, [30, 10, 10]); }
    for (let i = 0; i < 7; i++) L.line(22 + i * 6, 56 + hy + (i % 2) * 2, 24 + i * 6, 61 + hy, .4, skD);
  }));
  for (let i = 0; i < 11; i++) { const x = 24 + hash2(i, 1, 4) * 32, y = 24 + hash2(i, 2, 4) * 30 + hy; spark(S, x, y, [255, 230, 70]); spark(S, x + 1, y, [255, 170, 40]); }
  S.over(part(80, 80, L => {
    const e = limb(L, 58, 34 + hy, P.a[2], 15, P.a[3], 15, 7, 7.5, sk); L.disc(e.hx, e.hy, 8, skD);
    for (let k = -2; k <= 2; k++) { const aa = P.a[3] + k * .35; L.taper(e.hx + Math.sin(aa) * 6, e.hy + Math.cos(aa) * 6, e.hx + Math.sin(aa) * 12, e.hy + Math.cos(aa) * 12, 1.6, .5, [60, 40, 36]); }
    limb(L, 22, 38 + hy, P.a[0], 8, P.a[1], 7, 2.4, 2, sk);
  }));
  return S;
}
// C : la Bête cornue — tête de bouc, sabots, couperet
function bruteC(pose) {
  const S = new Layer(80, 80), P = BRP[pose], A = ARM2[pose], fur = [74, 54, 44], furL = [118, 92, 72], skin = [150, 70, 56], horn = [214, 202, 168], hy = P.hy;
  S.over(part(80, 80, L => {
    for (const s of [0, 1]) {
      const x = s ? 47 : 33, e = limb(L, x, 54 + hy, P.l[s * 2] + (s ? -.2 : .2), 10 * P.lift[s], P.l[s * 2 + 1] + (s ? .35 : -.35), 12, 5, 3, fur);
      L.rect(e.hx - 3, e.hy - 1, 6, 4, [30, 24, 22]);
    }
  }));
  S.over(part(80, 80, L => {
    L.poly([[22, 26 + hy], [58, 26 + hy], [50, 56 + hy], [30, 56 + hy]], fur);
    L.ell(40, 38 + hy, 11, 10, furL); for (let i = 0; i < 4; i++) L.line(34, 34 + i * 4 + hy, 46, 34 + i * 4 + hy, .4, fur);
    L.ell(22, 28 + hy, 7, 6, fur); L.ell(58, 28 + hy, 7, 6, fur);
    for (let i = 0; i < 12; i++) L.taper(20 + i * 3.6, 26 + hy, 19 + i * 3.6, 21 + hy - (i % 2) * 2, 1.4, .3, furL);
  }));
  const hx = 40 + P.h[0], hyh = 20 + hy + P.h[1];
  S.over(part(80, 80, L => {
    L.taper(hx - 4, hyh - 4, hx - 16, hyh - 8, 2.6, 1.6, horn); L.taper(hx - 16, hyh - 8, hx - 18, hyh - 18, 1.6, .9, horn); L.taper(hx - 18, hyh - 18, hx - 13, hyh - 22, .9, .3, horn);
    L.taper(hx + 4, hyh - 4, hx + 16, hyh - 8, 2.6, 1.6, horn); L.taper(hx + 16, hyh - 8, hx + 18, hyh - 18, 1.6, .9, horn); L.taper(hx + 18, hyh - 18, hx + 13, hyh - 22, .9, .3, horn);
  }));
  S.over(part(80, 80, L => {
    L.ell(hx, hyh, 6.5, 7, skin); L.poly([[hx - 4, hyh + 2], [hx + 4, hyh + 2], [hx + 3, hyh + 11], [hx - 3, hyh + 11]], skin);
    L.rect(hx - 3, hyh + 9, 6, 2 + P.j / 3, [40, 6, 6]); L.disc(hx - 1.5, hyh + 7, .6, [30, 10, 10]); L.disc(hx + 1.5, hyh + 7, .6, [30, 10, 10]);
    L.taper(hx, hyh + 11 + P.j / 3, hx, hyh + 15, 1.6, .5, fur);
  }));
  spark(S, hx - 3, hyh - 1, [255, 200, 40]); spark(S, hx + 3, hyh - 1, [255, 200, 40]);
  S.over(part(80, 80, L => {
    const r = limb(L, 58, 30 + hy, A.r[0], 14, A.r[1], 13, 5, 4.5, skin), l = limb(L, 22, 30 + hy, P.a[0], 13, P.a[1], 13, 5, 4.5, skin);
    L.disc(l.hx, l.hy, 4.5, skin);
    const dx = Math.sin(A.w), dy = Math.cos(A.w), nx = -dy, ny = dx;
    L.line(r.hx - dx * 4, r.hy - dy * 4, r.hx + dx * 10, r.hy + dy * 10, 1.4, [70, 46, 28]);
    const bx = r.hx + dx * 8, by = r.hy + dy * 8;
    L.poly([[bx, by], [bx + dx * 18, by + dy * 18], [bx + dx * 18 + nx * 12, by + dy * 18 + ny * 12], [bx + nx * 9, by + ny * 9]], [110, 108, 112]);
    L.disc(r.hx, r.hy, 4, skin);
  }));
  return S;
}
// D : le Colosse d'os — cage thoracique géante, crâne cornu, massue d'os
function bruteD(pose) {
  const S = new Layer(80, 80), P = BRP[pose], bone = [214, 204, 178], boneD = [150, 140, 118], hy = P.hy;
  S.over(part(80, 80, L => { for (const s of [0, 1]) { const e = limb(L, s ? 47 : 33, 56 + hy, P.l[s * 2], 10 * P.lift[s], P.l[s * 2 + 1], 12, 2.6, 2.2, bone); L.disc(e.ex, e.ey, 3, bone); L.ell(e.hx, e.hy, 4, 2, boneD); } }));
  S.over(part(80, 80, L => {
    L.ell(40, 54 + hy, 10, 5, bone); L.line(40, 26 + hy, 40, 54 + hy, 2.2, bone);
    for (let i = 0; i < 6; i++) { const y = 28 + i * 4 + hy, w = 16 - Math.abs(i - 2) * 1.8; L.taper(40, y, 40 - w, y + 4, 1.3, .9, bone); L.taper(40, y, 40 + w, y + 4, 1.3, .9, bone); }
  }));
  S.over(part(80, 80, L => { L.disc(40, 40 + hy, 5, [150, 20, 20]); }));
  spark(S, 40, 40 + hy, [255, 80, 50]); spark(S, 39, 39 + hy, [255, 150, 90]);
  S.over(part(80, 80, L => { L.ell(22, 27 + hy, 7, 5, bone); L.ell(58, 27 + hy, 7, 5, bone); for (let k = 0; k < 3; k++) { L.disc(16 + k * 4, 24 + hy, 2.2, boneD); L.disc(56 + k * 4, 24 + hy, 2.2, boneD); } }));
  const hx = 40 + P.h[0], hh = 18 + hy + P.h[1];
  S.over(part(80, 80, L => {
    L.ell(hx, hh, 7, 6.5, bone); L.rect(hx - 4.5, hh + 3, 9, 4 + P.j / 3, bone);
    L.ell(hx - 2.8, hh, 2, 2.2, [16, 8, 8]); L.ell(hx + 2.8, hh, 2, 2.2, [16, 8, 8]);
    for (let i = -4; i <= 4; i += 2) L.set(hx + i, hh + 5 + P.j / 3, [40, 30, 20]);
    L.taper(hx - 6, hh - 3, hx - 14, hh - 4, 2, 1, boneD); L.taper(hx - 14, hh - 4, hx - 16, hh - 12, 1, .3, boneD);
    L.taper(hx + 6, hh - 3, hx + 14, hh - 4, 2, 1, boneD); L.taper(hx + 14, hh - 4, hx + 16, hh - 12, 1, .3, boneD);
  }));
  spark(S, hx - 3, hh, [120, 200, 255]); spark(S, hx + 3, hh, [120, 200, 255]);
  S.over(part(80, 80, L => {
    for (const s of [0, 1]) {
      const e = limb(L, s ? 58 : 22, 29 + hy, P.a[s * 2], 14, P.a[s * 2 + 1], 13, 2.6, 2.2, bone);
      if (s) { const a = P.a[3], dx = Math.sin(a), dy = Math.cos(a); L.taper(e.hx, e.hy, e.hx + dx * 16, e.hy + dy * 16, 2, 4.5, boneD); L.disc(e.hx + dx * 17, e.hy + dy * 17, 5, bone); }
      else { L.disc(e.hx, e.hy, 3, bone); }
    }
  }));
  return S;
}

// ------------------------------------------------------------- SPECTRES
const WRP = {
  idle: { sw: 0, a: [-.3, -.2, .3, .2], h: [0, 0], cast: 0 }, walk1: { sw: 0, a: [-.3, -.2, .3, .2], h: [0, 0], cast: 0 },
  walk2: { sw: 2, a: [-.4, -.3, .4, .3], h: [0, 1], cast: 0 }, wind: { sw: 1, a: [-1.3, -1.6, 1.3, 1.6], h: [0, -1], cast: 1 },
  strike: { sw: 2, a: [.9, 1.7, -.9, -1.7], h: [0, 0], cast: 2 }, hurt: { sw: -2, a: [-1.4, -1.9, 1.4, 1.9], h: [2, -2], cast: 0 }
};
function castGlow(S, x, y, lvl, c1, c2) {
  if (!lvl) return; const r = lvl === 2 ? 7 : 4.5;
  S.disc(x, y, r, c1, EMI); S.disc(x, y, r * .55, c2, EMI);
  for (let i = 0; i < 10; i++) { const a = i / 10 * TAU + lvl; S.set(x + Math.cos(a) * (r + 2), y + Math.sin(a) * (r + 2), c1, EMI); }
}
// B : la Pendue — corde au cou, cheveux sur le visage
function wraithB(pose) {
  const S = new Layer(64, 64), P = WRP[pose], dress = [176, 172, 160], dressD = [120, 116, 108], hair = [16, 14, 18], sk = [190, 192, 186];
  S.over(part(64, 64, L => { L.line(32 + P.h[0], 0, 32 + P.h[0], 13, .6, [110, 86, 56]); }));
  S.over(part(64, 64, L => {
    const pts = [[25, 20], [39, 20], [45 + P.sw, 50]];
    for (let i = 1; i <= 9; i++) pts.push([45 + P.sw - i * (26 / 9), 50 + ((i % 2) ? 8 : 1) + ((i * 5) % 3)]);
    L.poly(pts, dress); for (let i = 0; i < 4; i++) L.line(28 + i * 3, 24, 25 + i * 5 + P.sw, 54, .4, dressD);
    L.poly([[30, 34], [36, 32], [35, 40], [31, 42]], [130, 30, 30]);
  }));
  S.over(part(64, 64, L => { for (const s of [0, 1]) { const e = limb(L, s ? 39 : 25, 21, P.a[s * 2], 11, P.a[s * 2 + 1], 11, 1.4, 1.1, sk); for (let k = -1; k <= 1; k++) L.line(e.hx, e.hy, e.hx + Math.sin(P.a[s * 2 + 1] + k * .3) * 5, e.hy + Math.cos(P.a[s * 2 + 1] + k * .3) * 5, .3, sk); } }));
  const hx = 32 + P.h[0], hy = 15 + P.h[1];
  S.over(part(64, 64, L => {
    L.ell(hx, hy, 5, 5.5, sk); L.ell(hx, hy - 2, 6, 5, hair);
    for (let i = -5; i <= 5; i++) L.taper(hx + i, hy - 2, hx + i * 1.25, hy + 14 + Math.abs(i % 3) * 2, 1, .4, hair);
    L.line(hx - 4, hy + 5, hx + 4, hy + 5, .6, [110, 86, 56]);
  }));
  spark(S, hx + 1, hy + 1, [210, 255, 230]);
  castGlow(S, 32, 36, P.cast, [170, 220, 255], [240, 250, 255]);
  return S;
}
// C : la Lanterne d'âmes — cage suspendue pleine de crânes en feu
function wraithC(pose) {
  const S = new Layer(64, 64), P = WRP[pose], iron = [70, 66, 70], bone = [210, 200, 176], fl = [110, 255, 140], fl2 = [220, 255, 220];
  const sway = P.sw * .6, cx = 32 + sway;
  S.over(part(64, 64, L => { for (let i = 0; i < 7; i++) L.ell(32 + sway * i / 7, 2 + i * 2.3, .9, 1.3, iron); }));
  const big = P.cast === 2 ? 1.5 : P.cast ? 1.2 : 1;
  for (let i = 0; i < 30; i++) { const x = cx - 9 + hash2(i, P.cast, 3) * 18, h = (6 + hash2(i, 7, 3) * 12) * big; S.taper(x, 50, x + (hash2(i, 2, 3) - .5) * 4, 50 - h, 1.8, .3, i % 3 ? fl : fl2, EMI); }
  S.over(part(64, 64, L => {
    L.ell(cx - 5, 40, 4, 4, bone); L.ell(cx + 5, 41, 4, 4, bone); L.ell(cx, 32, 4.4, 4.4, bone);
    for (const [x, y] of [[cx - 5, 40], [cx + 5, 41], [cx, 32]]) { L.rect(x - 2.5, y - .5, 1.6, 1.6, [20, 30, 20]); L.rect(x + 1, y - .5, 1.6, 1.6, [20, 30, 20]); L.rect(x - 2, y + 2.5, 4, 1, [60, 50, 40]); }
  }));
  S.over(part(64, 64, L => {
    L.ell(cx, 20, 11, 3, iron); L.ell(cx, 52, 13, 3, iron);
    for (let i = 0; i < 7; i++) { const x = cx - 11 + i * (22 / 6); L.line(x, 20, x + (x - cx) * .15, 52, .5, iron); }
    L.poly([[cx - 4, 17], [cx + 4, 17], [cx + 2, 13], [cx - 2, 13]], iron);
  }));
  for (const [x, y] of [[cx - 6, 40], [cx - 4, 40], [cx + 4, 41], [cx + 6, 41], [cx - 1, 32], [cx + 1, 32]]) spark(S, x, y, fl2);
  return S;
}
// D : l'Ange déchu — squelette ailé, plumes noires, cercle sombre
function wraithD(pose) {
  const S = new Layer(64, 64), P = WRP[pose], bone = [214, 206, 184], feather = [30, 26, 34], featherL = [70, 62, 80], robe = [50, 30, 36];
  const spread = P.cast === 2 ? 1.25 : P.cast ? 1.12 : P.sw === 2 ? .92 : 1;
  S.over(part(64, 64, L => {
    for (const s of [-1, 1]) {
      L.taper(32 + s * 5, 22, 32 + s * 17 * spread, 10, 2.4, 1.6, [60, 52, 60]);
      for (let i = 0; i < 9; i++) {
        const bx = 32 + s * (6 + i * 1.4 * spread), by = 21 - i * 1.2, len = 14 + i * 2.2, a = (.25 + i * .09) * spread;
        L.taper(bx, by, bx + s * Math.sin(a) * len, by + Math.cos(a) * len, 3, .7, i % 2 ? feather : featherL);
      }
    }
  }));
  S.over(part(64, 64, L => {
    const pts = [[26, 22], [38, 22], [42 + P.sw, 50]]; for (let i = 1; i <= 7; i++) pts.push([42 + P.sw - i * (20 / 7), 50 + (i % 2) * 7]); L.poly(pts, robe);
    for (let i = 0; i < 4; i++) L.line(28, 25 + i * 3, 36, 25 + i * 3, .5, bone); L.line(32, 23, 32, 36, .6, bone);
  }));
  const hx = 32 + P.h[0], hy = 14 + P.h[1];
  S.over(part(64, 64, L => { L.ell(hx, hy, 4.6, 5, bone); L.rect(hx - 3, hy + 3, 6, 2.5, bone); L.rect(hx - 3, hy - .5, 2, 2, [14, 8, 14]); L.rect(hx + 1, hy - .5, 2, 2, [14, 8, 14]); }));
  for (let i = 0; i < 16; i++) { const a = i / 16 * TAU; S.set(hx + Math.cos(a) * 8, hy - 1 + Math.sin(a) * 3, [60, 0, 20]); }
  spark(S, hx - 2, hy, [255, 60, 120]); spark(S, hx + 2, hy, [255, 60, 120]);
  S.over(part(64, 64, L => { for (const s of [0, 1]) limb(L, s ? 38 : 26, 23, P.a[s * 2], 10, P.a[s * 2 + 1], 9, 1.3, 1, bone); }));
  castGlow(S, 32, 35, P.cast, [255, 40, 110], [255, 200, 220]);
  return S;
}

// registre : fonction de dessin + hauteurs de cou / taille (pour la découpe)
const MONSTERS = {
  ghoul: { A: { name: 'GOULE (ACTUELLE)', fn: p => ghoulFrame(p), neck: 23, waist: 39 }, B: { name: 'LE MANGEUR', fn: ghoulB, neck: 25, waist: 42 }, C: { name: 'LE RAMPANT', fn: ghoulC, neck: 36, waist: 46 }, D: { name: "L'ECORCHE", fn: ghoulD, neck: 20, waist: 37 } },
  knight: { A: { name: 'REITRE (ACTUEL)', fn: p => knightFrame(p), neck: 19, waist: 36 }, B: { name: 'CHEVALIER NOIR', fn: knightB, neck: 18, waist: 36 }, C: { name: 'LE BOURREAU', fn: knightC, neck: 21, waist: 38 }, D: { name: 'LE PESTIFERE', fn: knightD, neck: 20, waist: 38 } },
  brute: { A: { name: 'ABOMINATION (ACTUELLE)', fn: p => bruteFrame(p), neck: 32, waist: 52 }, B: { name: 'LA MASSE', fn: bruteB, neck: 30, waist: 50 }, C: { name: 'LA BETE CORNUE', fn: bruteC, neck: 30, waist: 50 }, D: { name: "LE COLOSSE D'OS", fn: bruteD, neck: 26, waist: 48 } },
  wraith: { A: { name: 'SPECTRE (ACTUEL)', fn: p => wraithFrame(p), neck: 22, waist: 40 }, B: { name: 'LA PENDUE', fn: wraithB, neck: 21, waist: 40 }, C: { name: "LANTERNE D'AMES", fn: wraithC, neck: 26, waist: 42 }, D: { name: "L'ANGE DECHU", fn: wraithD, neck: 20, waist: 38 } }
};
