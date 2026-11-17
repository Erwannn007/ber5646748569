'use strict';
// =====================================================================
//  PIXEL ART PROCEDURAL — tout est dessiné par le code
// =====================================================================
const OUT = [14, 6, 6];

class Layer {
  constructor(w, h) { this.w = w; this.h = h; this.d = new Uint8ClampedArray(w * h * 4); }
  set(x, y, c, a) {
    x = Math.floor(x); y = Math.floor(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = (y * this.w + x) * 4, d = this.d;
    d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = a === undefined ? 255 : a;
  }
  A(x, y) { if (x < 0 || y < 0 || x >= this.w || y >= this.h) return 0; return this.d[(y * this.w + x) * 4 + 3]; }
  rect(x, y, w, h, c, a) { for (let j = Math.floor(y); j < y + h; j++) for (let i = Math.floor(x); i < x + w; i++) this.set(i, j, c, a); return this; }
  ell(cx, cy, rx, ry, c, a) {
    for (let y = Math.floor(cy - ry - 1); y <= cy + ry + 1; y++) for (let x = Math.floor(cx - rx - 1); x <= cx + rx + 1; x++) {
      const dx = (x + .5 - cx) / rx, dy = (y + .5 - cy) / ry; if (dx * dx + dy * dy <= 1) this.set(x, y, c, a);
    } return this;
  }
  disc(cx, cy, r, c, a) { if (r < .75) { this.set(cx, cy, c, a); return this; } return this.ell(cx, cy, r, r, c, a); }
  line(x0, y0, x1, y1, r, c, a) { return this.taper(x0, y0, x1, y1, r, r, c, a); }
  taper(x0, y0, x1, y1, r0, r1, c, a) {
    const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2));
    for (let i = 0; i <= n; i++) { const t = i / n; this.disc(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, r0 + (r1 - r0) * t, c, a); }
    return this;
  }
  poly(p, c, a) {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const q of p) { x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]); }
    for (let y = Math.floor(y0); y <= y1; y++) for (let x = Math.floor(x0); x <= x1; x++) {
      const px = x + .5, py = y + .5; let ins = false;
      for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
        const xi = p[i][0], yi = p[i][1], xj = p[j][0], yj = p[j][1];
        if (((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi)) ins = !ins;
      }
      if (ins) this.set(x, y, c, a);
    } return this;
  }
  grit(amt, seed = 1) {
    const d = this.d;
    for (let i = 0; i < d.length; i += 4) { if (d[i + 3] !== 255) continue; const f = 1 + (hash2(i, seed, 7) - .5) * amt; d[i] *= f; d[i + 1] *= f; d[i + 2] *= f; }
    return this;
  }
  shade(hi = .3, lo = .38) {
    const w = this.w, h = this.h, d = this.d, s = new Uint8ClampedArray(d);
    const A = (x, y) => (x < 0 || y < 0 || x >= w || y >= h) ? 0 : s[(y * w + x) * 4 + 3];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4; if (s[i + 3] !== 255) continue;
      let f = 1;
      if (!A(x, y - 1) || !A(x - 1, y)) f += hi; else if (!A(x, y - 2) || !A(x - 2, y)) f += hi * .35;
      if (!A(x, y + 1) || !A(x + 1, y)) f -= lo; else if (!A(x, y + 2) || !A(x + 2, y)) f -= lo * .4;
      d[i] *= f; d[i + 1] *= f; d[i + 2] *= f;
    } return this;
  }
  outline(c = OUT) {
    const w = this.w, h = this.h, s = new Uint8ClampedArray(this.d);
    const A = (x, y) => (x < 0 || y < 0 || x >= w || y >= h) ? 0 : s[(y * w + x) * 4 + 3];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (A(x, y)) continue;
      if (A(x - 1, y) || A(x + 1, y) || A(x, y - 1) || A(x, y + 1)) this.set(x, y, c);
    } return this;
  }
  over(L, ox = 0, oy = 0) {
    for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) {
      const i = (y * L.w + x) * 4; if (!L.d[i + 3]) continue;
      this.set(x + ox, y + oy, [L.d[i], L.d[i + 1], L.d[i + 2]], L.d[i + 3]);
    } return this;
  }
  tex() { return { w: this.w, h: this.h, data: new Uint32Array(this.d.slice().buffer) }; }
  canvas() {
    const c = document.createElement('canvas'); c.width = this.w; c.height = this.h;
    c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(this.d), this.w, this.h), 0, 0); return c;
  }
}

let _pseed = 1;
function part(w, h, fn, grit = .16) { const L = new Layer(w, h); fn(L); L.grit(grit, _pseed++); L.shade(); L.outline(OUT); return L; }
function limb(L, x, y, a1, l1, a2, l2, w1, w2, c) {
  const ex = x + Math.sin(a1) * l1, ey = y + Math.cos(a1) * l1, wm = (w1 + w2) / 2;
  L.taper(x, y, ex, ey, w1, wm, c);
  const hx = ex + Math.sin(a2) * l2, hy = ey + Math.cos(a2) * l2;
  L.taper(ex, ey, hx, hy, wm, w2, c);
  return { ex, ey, hx, hy };
}
const EMI = 254; // alpha "emissive" : pixel non affecté par la lumière

// ---------------------------------------------------------------------
//  MONSTRES
// ---------------------------------------------------------------------
function ghoulFrame(pose) {
  const W = 64, H = 64, S = new Layer(W, H);
  const sk = [122, 130, 100], skD = [84, 92, 70], claw = [228, 216, 186], rag = [58, 40, 30];
  const P = {
    idle: { a: [-.22, -.08, .22, .08], l: [.1, 0, -.1, 0], lift: [1, 1], h: [0, 0], j: 2 },
    walk1: { a: [-.55, -.25, .02, .18], l: [.06, .15, -.14, 0], lift: [.6, 1], h: [-1, 0], j: 2 },
    walk2: { a: [-.02, -.18, .55, .25], l: [.14, 0, -.06, -.15], lift: [1, .6], h: [1, 0], j: 2 },
    wind: { a: [-2.4, -2.9, 2.4, 2.9], l: [.22, 0, -.22, 0], lift: [1, 1], h: [0, -1], j: 5 },
    strike: { a: [.8, 1.5, -.8, -1.5], l: [.25, -.05, -.25, .05], lift: [1, 1], h: [0, 2], j: 6 },
    hurt: { a: [-1.3, -1.9, 1.5, 2.0], l: [.28, -.1, -.12, .15], lift: [1, .75], h: [2, -2], j: 6 }
  }[pose];
  const hipY = 40;
  S.over(part(W, H, L => {
    for (const s of [0, 1]) {
      const x = s ? 36 : 28, e = limb(L, x, hipY, P.l[s * 2], 11 * P.lift[s], P.l[s * 2 + 1], 12, 2.6, 1.7, sk);
      L.disc(e.ex, e.ey, 2.1, skD); L.ell(e.hx + (s ? 1 : -1), e.hy, 2.6, 1.3, skD);
    }
  }));
  S.over(part(W, H, L => {
    L.poly([[21, 22], [43, 22], [38, 41], [26, 41]], sk);
    for (let i = 0; i < 4; i++) { L.line(25, 27 + i * 3, 30, 28 + i * 3, .5, skD); L.line(34, 28 + i * 3, 39, 27 + i * 3, .5, skD); }
    L.line(32, 25, 32, 38, .5, skD);
    L.poly([[25, 39], [39, 39], [41, 47], [37, 45], [34, 50], [31, 45], [27, 49], [24, 45]], rag);
  }));
  const hx = 32 + P.h[0], hy = 16 + P.h[1];
  S.over(part(W, H, L => {
    L.line(32, 23, hx, hy + 4, 2.4, skD);
    L.ell(hx, hy, 5.5, 6.8, sk);
    L.ell(hx, hy + 4.5, 3.2, P.j / 2 + .6, [40, 4, 4]);
    for (let i = -2; i <= 2; i += 2) { L.set(hx + i, hy + 3, [232, 222, 190]); L.set(hx + i + 1, hy + 4 + P.j / 2, [232, 222, 190]); }
    L.line(hx - 4, hy - 2.5, hx - 1, hy - 1.2, .5, [36, 36, 28]); L.line(hx + 4, hy - 2.5, hx + 1, hy - 1.2, .5, [36, 36, 28]);
    for (let i = 0; i < 5; i++) L.line(hx - 4 + i * 2, hy - 6, hx - 5 + i * 2.4, hy - 1 + ((i * 7) % 4), .5, [36, 36, 32]);
  }));
  S.set(hx - 2, hy, [255, 232, 90], EMI); S.set(hx - 3, hy, [255, 190, 50], EMI);
  S.set(hx + 2, hy, [255, 232, 90], EMI); S.set(hx + 3, hy, [255, 190, 50], EMI);
  S.over(part(W, H, L => {
    for (const s of [0, 1]) {
      const x = s ? 41 : 23, e = limb(L, x, 24, P.a[s * 2], 12, P.a[s * 2 + 1], 12, 2.4, 1.6, sk);
      const ang = P.a[s * 2 + 1];
      for (let k = -1; k <= 1; k++) { const aa = ang + k * .38; L.line(e.hx, e.hy, e.hx + Math.sin(aa) * 5.5, e.hy + Math.cos(aa) * 5.5, .5, claw); }
      L.disc(e.hx, e.hy, 1.9, skD);
    }
  }));
  return S;
}

function knightFrame(pose) {
  const W = 64, H = 64, S = new Layer(W, H);
  const bone = [208, 198, 168], boneD = [150, 140, 115], rust = [118, 68, 38], rustL = [168, 108, 62], iron = [80, 80, 90], cape = [56, 24, 26], wood = [96, 64, 36];
  const P = {
    idle: { a: [-.25, .35, .2, .35], l: [.08, 0, -.08, 0], lift: [1, 1], h: [0, 0], c: 0 },
    walk1: { a: [-.35, .2, .05, .25], l: [.04, .12, -.12, 0], lift: [.65, 1], h: [-1, 0], c: 1 },
    walk2: { a: [-.1, .45, .35, .45], l: [.12, 0, -.04, -.12], lift: [1, .65], h: [1, 0], c: -1 },
    wind: { a: [-.5, 1.0, 2.5, 2.9], l: [.18, 0, -.18, 0], lift: [1, 1], h: [0, -1], c: 0 },
    strike: { a: [-.5, .9, -.6, -1.3], l: [.22, 0, -.22, 0], lift: [1, 1], h: [-1, 1], c: 1 },
    hurt: { a: [-1.2, -1.6, 1.3, 1.7], l: [.25, -.1, -.12, .15], lift: [1, .8], h: [2, -2], c: -1 }
  }[pose];
  const hipY = 37;
  S.over(part(W, H, L => {
    const pts = [[22, 18], [42, 18], [46 + P.c, 57]];
    for (let i = 1; i <= 8; i++) pts.push([46 + P.c - i * (28 / 8), 57 - ((i % 2) ? 5 : 0) + ((i * 3) % 3)]);
    L.poly(pts, cape);
  }));
  S.over(part(W, H, L => {
    for (const s of [0, 1]) {
      const x = s ? 36 : 28, e = limb(L, x, hipY, P.l[s * 2], 12 * P.lift[s], P.l[s * 2 + 1], 13, 1.6, 1.4, bone);
      L.taper(e.ex, e.ey + 1, e.hx, e.hy - 2, 2.7, 2.2, rust); L.ell(e.hx + (s ? 1 : -1), e.hy - .5, 3, 1.6, iron);
    }
  }));
  S.over(part(W, H, L => {
    L.poly([[23, 19], [41, 19], [38, 38], [26, 38]], rust); L.line(32, 20, 32, 34, .6, rustL);
    L.rect(25, 33, 14, 2, [50, 32, 20]);
    L.poly([[25, 36], [39, 36], [41, 43], [23, 43]], [92, 54, 30]);
  }));
  S.over(part(W, H, L => { L.ell(22, 21, 4.6, 3.6, rust); L.ell(42, 21, 4.6, 3.6, rust); }));
  const hx = 32 + P.h[0], hy = 12 + P.h[1];
  S.over(part(W, H, L => {
    L.line(32, 19, hx, hy + 4, 1.4, boneD);
    L.ell(hx, hy + 1, 4.5, 5, bone); L.rect(hx - 3, hy + 4, 6, 3, bone);
    L.rect(hx - 3, hy + 1, 2, 2, [20, 10, 10]); L.rect(hx + 1, hy + 1, 2, 2, [20, 10, 10]); L.set(hx, hy + 3, [40, 30, 20]);
    for (let i = -2; i <= 2; i++) L.set(hx + i, hy + 6, (i & 1) ? [60, 50, 40] : [230, 225, 200]);
    L.ell(hx, hy - 2, 5.6, 3.6, iron); L.rect(hx - 7, hy - 1, 14, 1.6, iron);
  }));
  S.set(hx - 2, hy + 2, [255, 70, 30], EMI); S.set(hx + 2, hy + 2, [255, 70, 30], EMI);
  let lh = null;
  S.over(part(W, H, L => {
    const lA = limb(L, 23, 21, P.a[0], 10, P.a[1], 10, 1.5, 1.3, bone); lh = lA;
    const rA = limb(L, 41, 21, P.a[2], 10, P.a[3], 10, 1.5, 1.3, bone);
    const sa = P.a[3], sx = rA.hx, sy = rA.hy, ex = sx + Math.sin(sa) * 21, ey = sy + Math.cos(sa) * 21;
    L.taper(sx, sy, ex, ey, 1.7, .7, [156, 150, 150]);
    const px = Math.cos(sa) * 3.2, py = -Math.sin(sa) * 3.2; L.line(sx - px, sy - py, sx + px, sy + py, .8, iron);
  }));
  S.over(part(W, H, L => { L.disc(lh.hx, lh.hy, 6.3, wood); L.disc(lh.hx, lh.hy, 1.6, iron); L.line(lh.hx - 5, lh.hy, lh.hx + 5, lh.hy, .5, [70, 46, 26]); }));
  return S;
}

function bruteFrame(pose) {
  const W = 80, H = 80, S = new Layer(W, H);
  const sk = [126, 42, 34], skL = [162, 74, 56], belly = [150, 98, 72], horn = [216, 206, 174], bone = [220, 210, 180];
  const P = {
    idle: { a: [-.3, -.1, .3, .1], l: [.12, -.05, -.12, .05], lift: [1, 1], hy: 0, h: [0, 0], j: 3 },
    walk1: { a: [-.55, -.2, .12, .2], l: [.06, .1, -.16, 0], lift: [.7, 1], hy: -1, h: [-1, 0], j: 3 },
    walk2: { a: [-.12, -.2, .55, .2], l: [.16, 0, -.06, -.1], lift: [1, .7], hy: -1, h: [1, 0], j: 3 },
    wind: { a: [-2.6, -3.0, 2.6, 3.0], l: [.25, 0, -.25, 0], lift: [1, 1], hy: -2, h: [0, -1], j: 7 },
    strike: { a: [.35, .1, -.35, -.1], l: [.38, -.1, -.38, .1], lift: [.82, .82], hy: 3, h: [0, 3], j: 7 },
    hurt: { a: [-1.2, -1.6, 1.3, 1.7], l: [.3, -.1, -.15, .1], lift: [1, .85], hy: 0, h: [3, -2], j: 7 }
  }[pose];
  const hy0 = P.hy, hipY = 57 + hy0;
  S.over(part(W, H, L => {
    for (const s of [0, 1]) {
      const x = s ? 48 : 32, e = limb(L, x, hipY, P.l[s * 2], 11 * P.lift[s], P.l[s * 2 + 1], 11, 5.2, 4.4, sk);
      L.ell(e.hx + (s ? 1.5 : -1.5), e.hy, 5, 2.2, skL);
      for (let k = -1; k <= 1; k++) L.set(e.hx + k * 2.5 + (s ? 1 : -1), e.hy + 2, horn);
    }
  }));
  S.over(part(W, H, L => {
    L.ell(40, 41 + hy0, 18, 15.5, sk); L.ell(40, 48 + hy0, 10.5, 8, belly);
    L.line(31, 34 + hy0, 38, 37 + hy0, .5, [90, 26, 22]); L.line(49, 34 + hy0, 42, 37 + hy0, .5, [90, 26, 22]);
    for (let i = 0; i < 3; i++) L.line(36, 45 + hy0 + i * 3, 44, 45 + hy0 + i * 3, .4, [120, 76, 56]);
    L.line(27, 40 + hy0, 33, 50 + hy0, .5, [200, 120, 100]);
    L.poly([[30, 54 + hy0], [50, 54 + hy0], [52, 61 + hy0], [45, 59 + hy0], [40, 64 + hy0], [35, 59 + hy0], [28, 61 + hy0]], [50, 34, 26]);
  }));
  S.over(part(W, H, L => {
    L.ell(23, 30 + hy0, 7.5, 6.5, sk); L.ell(57, 30 + hy0, 7.5, 6.5, sk);
    L.taper(20, 26 + hy0, 13, 16 + hy0, 2, .5, bone); L.taper(25, 25 + hy0, 22, 14 + hy0, 1.8, .4, bone);
    L.taper(60, 26 + hy0, 67, 16 + hy0, 2, .5, bone); L.taper(55, 25 + hy0, 58, 14 + hy0, 1.8, .4, bone);
  }));
  const hx = 40 + P.h[0], hy = 25 + hy0 + P.h[1];
  S.over(part(W, H, L => {
    L.taper(hx - 5, hy - 3, hx - 12, hy - 9, 2.2, 1.4, horn); L.taper(hx - 12, hy - 9, hx - 10, hy - 16, 1.4, .4, horn);
    L.taper(hx + 5, hy - 3, hx + 12, hy - 9, 2.2, 1.4, horn); L.taper(hx + 12, hy - 9, hx + 10, hy - 16, 1.4, .4, horn);
  }));
  S.over(part(W, H, L => {
    L.ell(hx, hy, 7, 6.5, sk);
    L.line(hx - 5, hy - 3, hx + 5, hy - 3, .9, [80, 22, 18]);
    L.rect(hx - 4.5, hy + 1.5, 9, P.j / 2 + 1.5, [38, 4, 4]);
    for (let i = -4; i <= 4; i += 2) { L.set(hx + i, hy + 1.5, horn); L.set(hx + i + 1, hy + 1.5 + P.j / 2 + 1, horn); }
  }));
  S.set(hx - 3, hy - 1, [255, 170, 40], EMI); S.set(hx - 2, hy - 1, [255, 220, 90], EMI);
  S.set(hx + 3, hy - 1, [255, 170, 40], EMI); S.set(hx + 2, hy - 1, [255, 220, 90], EMI);
  S.over(part(W, H, L => {
    for (const s of [0, 1]) {
      const x = s ? 57 : 23, e = limb(L, x, 32 + hy0, P.a[s * 2], 14, P.a[s * 2 + 1], 14, 5.5, 6.2, sk);
      L.disc(e.hx, e.hy, 6.4, skL);
      const ang = P.a[s * 2 + 1];
      for (let k = -1; k <= 1; k++) { const aa = ang + k * .45; L.taper(e.hx + Math.sin(aa) * 5, e.hy + Math.cos(aa) * 5, e.hx + Math.sin(aa) * 9, e.hy + Math.cos(aa) * 9, 1, .3, horn); }
    }
  }));
  return S;
}

function wraithFrame(pose) {
  const W = 64, H = 64, S = new Layer(W, H);
  const robe = [44, 42, 60], robeD = [26, 24, 38], skull = [206, 200, 186], glow = [140, 255, 150], glow2 = [230, 255, 230];
  const P = {
    idle: { sw: 0, a: [-.3, -.2, .3, .2], h: [0, 0], cast: 0 },
    walk1: { sw: 0, a: [-.3, -.2, .3, .2], h: [0, 0], cast: 0 },
    walk2: { sw: 2, a: [-.4, -.3, .4, .3], h: [0, 1], cast: 0 },
    wind: { sw: 1, a: [.6, 1.4, -.6, -1.4], h: [0, -1], cast: 1 },
    strike: { sw: 2, a: [.9, 1.7, -.9, -1.7], h: [0, 0], cast: 2 },
    hurt: { sw: -2, a: [-1.4, -1.9, 1.4, 1.9], h: [2, -2], cast: 0 }
  }[pose];
  S.over(part(W, H, L => {
    const pts = [[23, 22], [41, 22], [49 + P.sw, 52]];
    for (let i = 1; i <= 10; i++) { const x = 49 + P.sw - i * (34 / 10); pts.push([x, 52 + ((i % 2) ? 9 : 2) + ((i * 7 + P.sw) % 4)]); }
    L.poly(pts, robe);
    for (let i = 0; i < 4; i++) L.line(26 + i * 4 + P.sw * .5, 28, 22 + i * 6 + P.sw, 54, .5, robeD);
  }));
  const hx = 32 + P.h[0], hy = 15 + P.h[1];
  S.over(part(W, H, L => {
    L.ell(hx, hy, 8, 9, robeD); L.poly([[hx - 8, hy], [hx + 8, hy], [hx + 10, hy + 9], [hx - 10, hy + 9]], robeD);
    L.ell(hx, hy + 2, 4.6, 5.2, skull);
    L.rect(hx - 3, hy + 1, 2, 2, [10, 10, 14]); L.rect(hx + 1, hy + 1, 2, 2, [10, 10, 14]);
    for (let i = -2; i <= 2; i++) L.set(hx + i, hy + 6, (i & 1) ? [40, 40, 40] : [220, 215, 200]);
  }));
  S.set(hx - 2, hy + 2, glow, EMI); S.set(hx + 2, hy + 2, glow, EMI);
  S.over(part(W, H, L => {
    for (const s of [0, 1]) {
      const x = s ? 41 : 23, e = limb(L, x, 23, P.a[s * 2], 10, P.a[s * 2 + 1], 9, 2.6, 2.2, robe);
      L.taper(e.hx, e.hy, e.hx + Math.sin(P.a[s * 2 + 1]) * 4, e.hy + Math.cos(P.a[s * 2 + 1]) * 4, 1, .5, skull);
    }
  }));
  if (P.cast) {
    const r = P.cast === 2 ? 7 : 4.5;
    S.disc(32, 36, r, glow, EMI); S.disc(32, 36, r * .55, glow2, EMI);
    for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; S.set(32 + Math.cos(a) * (r + 2), 36 + Math.sin(a) * (r + 2), glow, EMI); }
  }
  return S;
}

// ---------------------------------------------------------------------
//  DÉCOR / OBJETS
// ---------------------------------------------------------------------
function stakeSprite() {
  const S = new Layer(64, 64), wood = [92, 66, 40], body = [128, 104, 86], bodyD = [96, 74, 60], bl = [120, 8, 8];
  S.over(part(64, 64, L => { L.taper(32, 63, 32, 4, 2, .6, wood); }));
  S.over(part(64, 64, L => {
    L.ell(31, 33, 6, 9.5, body);
    L.line(28, 41, 26, 51, 1.8, bodyD); L.line(26, 51, 27, 59, 1.4, bodyD);
    L.line(34, 41, 36, 50, 1.8, bodyD); L.line(36, 50, 35, 57, 1.4, bodyD);
    L.line(26, 27, 21, 38, 1.4, bodyD); L.line(21, 38, 20, 47, 1.2, bodyD);
    L.line(36, 27, 41, 37, 1.4, bodyD); L.line(41, 37, 40, 45, 1.2, bodyD);
    L.disc(25, 23, 4.3, body); L.rect(23, 24, 2, 1, [20, 8, 8]); L.rect(26, 26, 2, 1, [30, 8, 8]);
    for (let i = 0; i < 4; i++) L.line(29 + i * 1.5, 31 + i * 3, 33 - i, 31 + i * 3, .4, bodyD);
  }));
  S.over(part(64, 64, L => { L.taper(32, 26, 32, 4, 1.4, .5, wood); }));
  for (let i = 0; i < 6; i++) S.line(31 + (i % 3) * .8, 42 + i * 2, 31 + (i % 3) * .8, 46 + i * 3, .4, bl);
  return S.tex();
}
function bonesSprite() {
  const S = new Layer(40, 16), b = [204, 194, 166];
  S.over(part(40, 16, L => {
    L.taper(4, 13, 22, 10, 1.2, 1.2, b); L.disc(4, 13, 1.8, b); L.disc(22, 10, 1.8, b);
    L.taper(18, 14, 36, 12, 1, 1, b); L.disc(18, 14, 1.6, b); L.disc(36, 12, 1.6, b);
    L.ell(26, 9, 5, 4.5, b); L.rect(23, 11, 6, 3, b);
  }));
  S.rect(24, 8, 2, 2, [20, 10, 10]); S.rect(27, 8, 2, 2, [20, 10, 10]);
  return S.tex();
}
function braziersFrames() {
  const out = [];
  for (let f = 0; f < 3; f++) {
    const S = new Layer(32, 44), iron = [64, 60, 60];
    S.over(part(32, 44, L => {
      L.line(10, 43, 14, 28, 1, iron); L.line(22, 43, 18, 28, 1, iron); L.line(16, 43, 16, 28, 1, iron);
      L.poly([[5, 22], [27, 22], [23, 30], [9, 30]], iron);
    }));
    for (let i = 0; i < 26; i++) {
      const x = 8 + hash2(i, f, 3) * 16, h = 8 + hash2(i, f, 9) * 16, w = 1.5 + hash2(i, f, 5) * 2;
      S.taper(x, 23, x + (hash2(i, f, 1) - .5) * 4, 23 - h, w, .4, i % 3 ? [255, 140, 30] : [255, 220, 90], EMI);
    }
    for (let i = 0; i < 8; i++) S.taper(12 + i, 23, 12 + i + (hash2(i, f, 2) - .5) * 3, 16 - hash2(i, f, 7) * 6, 1, .3, [255, 250, 200], EMI);
    out.push(S.tex());
  }
  return out;
}
function torchFrames() {
  const out = [];
  for (let f = 0; f < 3; f++) {
    const S = new Layer(16, 30);
    S.over(part(16, 30, L => { L.line(8, 29, 8, 14, 1.3, [80, 54, 32]); L.rect(5, 13, 6, 3, [70, 66, 66]); L.rect(7, 22, 2, 7, [60, 56, 56]); }));
    for (let i = 0; i < 14; i++) {
      const x = 5.5 + hash2(i, f, 4) * 5, h = 5 + hash2(i, f, 8) * 9;
      S.taper(x, 13, x + (hash2(i, f, 1) - .5) * 3, 13 - h, 1.3, .3, i % 3 ? [255, 150, 40] : [255, 230, 120], EMI);
    }
    out.push(S.tex());
  }
  return out;
}
function flaskSprite() {
  const S = new Layer(14, 20);
  S.over(part(14, 20, L => { L.ell(7, 13, 5.5, 5.5, [150, 20, 24]); L.rect(5, 3, 4, 6, [150, 140, 130]); L.rect(4, 1, 6, 3, [100, 70, 40]); }));
  S.set(5, 11, [255, 140, 140], EMI); S.set(5, 12, [255, 90, 90], EMI); S.set(8, 13, [255, 60, 60], EMI);
  return S.tex();
}
function orbSprite() {
  const S = new Layer(7, 7);
  S.disc(3.5, 3.5, 3.4, [190, 0, 10], EMI); S.disc(3.5, 3.5, 2, [255, 70, 50], EMI); S.set(3, 2, [255, 210, 200], EMI);
  return S.tex();
}
function fireballFrames() {
  const out = [];
  for (let f = 0; f < 2; f++) {
    const S = new Layer(16, 16);
    S.disc(8, 8, 6.5 + f * .6, [60, 200, 90], EMI); S.disc(8, 8, 4.5, [150, 255, 160], EMI); S.disc(8, 8, 2.4, [240, 255, 240], EMI);
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + f * .4; S.set(8 + Math.cos(a) * 7.4, 8 + Math.sin(a) * 7.4, [100, 255, 130], EMI); }
    out.push(S.tex());
  }
  return out;
}

// ---------------------------------------------------------------------
//  ARME : l'épée-enclume  (canvas pour drawImage)
// ---------------------------------------------------------------------
const SWORD_PIVOT = [15, 146];
function makeSword() {
  const W = 30, H = 176, L = new Layer(W, H), cx = 15;
  for (let y = 0; y < 121; y++) {
    let half = 11; if (y < 12) half = 11 - (12 - y) * .82;
    for (let x = 0; x < W; x++) {
      const dx = x + .5 - cx; if (Math.abs(dx) > half) continue;
      const n = fbm(x / 3, y / 7, 7, 3);
      let c = [58 + n * 46, 58 + n * 46, 66 + n * 48];
      const fromL = dx + half, fromR = half - dx;
      if (fromL < 2.5) c = cmix(c, [168, 168, 178], .7);
      else if (fromL < 4) c = cmix(c, [120, 120, 130], .4);
      if (fromR < 2) c = cmul(c, .65);
      const b = fbm(x / 4, y / 5, 9, 3);
      if (b > .6 && y < 100) c = cmix(c, [105, 10, 10], Math.min(.85, (b - .6) * 6));
      if (hash2(x, y, 31) < .05) c = cmul(c, .75);
      L.set(x, y, c);
    }
  }
  for (let k = 0; k < 9; k++) {
    const y = 14 + hash2(k, 1, 3) * 96, side = hash2(k, 2, 3) < .5 ? 3.4 : 26.6, r = 1.2 + hash2(k, 3, 3) * 1.6;
    for (let yy = -3; yy <= 3; yy++) for (let xx = -3; xx <= 3; xx++) if (xx * xx + yy * yy <= r * r) L.set(side + xx, y + yy, [0, 0, 0], 0);
  }
  L.disc(10, 112, 1.6, [130, 126, 120]); L.disc(20, 112, 1.6, [130, 126, 120]); L.disc(15, 104, 1.6, [130, 126, 120]);
  L.rect(0, 121, 30, 8, [56, 54, 60]); L.rect(2, 122, 26, 2, [96, 94, 100]);
  for (let y = 129; y < 163; y++) for (let x = 11; x < 19; x++) L.set(x, y, ((y + x * .5) % 5) < 2 ? [52, 30, 18] : [86, 52, 30]);
  L.disc(15, 167, 5, [70, 68, 74]); L.disc(14, 166, 2, [120, 118, 124]);
  L.shade(.18, .3); L.outline(OUT);
  return L.canvas();
}
function tintCanvas(src, col, a) {
  const c = document.createElement('canvas'); c.width = src.width; c.height = src.height;
  const x = c.getContext('2d'); x.drawImage(src, 0, 0); x.globalCompositeOperation = 'source-atop';
  x.globalAlpha = a; x.fillStyle = col; x.fillRect(0, 0, c.width, c.height); return c;
}
function makeHands() {
  const L = new Layer(36, 34), st = [72, 74, 84], stL = [120, 122, 134];
  L.over(part(36, 34, l => {
    l.rect(6, 5, 24, 10, st); l.rect(4, 7, 4, 6, st);
    for (let i = 0; i < 4; i++) l.line(9 + i * 5, 5, 9 + i * 5, 14, .4, [44, 44, 52]);
    l.line(8, 6, 29, 6, .5, stL);
  }));
  L.over(part(36, 34, l => {
    l.rect(7, 17, 22, 10, st); l.rect(26, 19, 5, 6, st);
    for (let i = 0; i < 4; i++) l.line(10 + i * 5, 17, 10 + i * 5, 26, .4, [44, 44, 52]);
    l.line(8, 18, 28, 18, .5, stL);
    l.rect(10, 27, 18, 6, [60, 40, 28]);
  }));
  return L.canvas();
}

// ---------------------------------------------------------------------
//  PORTRAIT DU HUD
// ---------------------------------------------------------------------
function makeFace(lvl, ex) {
  // héros original : mercenaire encapuchonné, barbe cendrée, yeux pâles
  const W = 30, H = 34, L = new Layer(W, H);
  const skin = cmul([196, 156, 126], 1 - lvl * .06), skD = cmul(skin, .72), hood = [46, 38, 36], hoodL = [74, 62, 56], beard = [150, 146, 140], beardD = [100, 96, 92];
  L.poly([[0, 34], [30, 34], [28, 27], [21, 24], [9, 24], [2, 27]], [54, 54, 62]);
  L.poly([[3, 34], [6, 26], [9, 24]], [80, 80, 92]);
  L.poly([[3, 30], [4, 10], [8, 3], [15, 1], [22, 3], [26, 10], [27, 30], [22, 26], [8, 26]], hood);
  L.line(6, 9, 9, 4, .5, hoodL); L.line(24, 9, 21, 4, .5, hoodL);
  L.ell(15, 15, 7.5, 9.5, skin);
  L.rect(7, 5, 16, 3, hood);
  // barbe
  L.poly([[7, 16], [23, 16], [22, 24], [18, 28], [12, 28], [8, 24]], beard);
  for (let i = 0; i < 9; i++) L.line(9 + i * 1.6, 18 + (i % 2), 9.5 + i * 1.5, 26, .3, beardD);
  L.line(10, 17, 20, 17, .6, beard);
  // sourcils lourds
  if (ex === 2) { L.line(8, 10, 13, 12, .7, [70, 66, 62]); L.line(17, 12, 22, 10, .7, [70, 66, 62]); }
  else { L.line(8, 11, 13, 11.5, .7, [70, 66, 62]); L.line(17, 11.5, 22, 11, .7, [70, 66, 62]); }
  // yeux
  if (ex === 1) { L.line(9, 13, 12, 13.5, .5, [40, 24, 20]); L.line(18, 13.5, 21, 13, .5, [40, 24, 20]); }
  else { L.rect(9, 13, 3, 2, [214, 210, 200]); L.rect(18, 13, 3, 2, [214, 210, 200]); L.rect(10, 13, 1, 2, [90, 140, 170]); L.rect(19, 13, 1, 2, [90, 140, 170]); }
  L.line(15, 13, 15, 17, .5, skD); L.set(14, 17, skD); L.set(16, 17, skD);
  // bouche dans la barbe
  if (ex === 0) L.line(12, 20, 18, 20, .4, [60, 34, 30]);
  if (ex === 1) { L.ell(15, 21, 3, 2, [36, 8, 8]); L.rect(13, 20, 4, 1, [226, 220, 204]); }
  if (ex === 2) { L.rect(11, 19, 8, 3, [36, 8, 8]); L.rect(11, 19, 8, 1, [230, 224, 208]); L.rect(11, 21, 8, 1, [230, 224, 208]); }
  if (ex === 3) { L.line(12, 20, 18, 19, .4, [60, 34, 30]); L.set(18, 18, [60, 34, 30]); }
  // cicatrice verticale sur l'oeil gauche
  L.line(19, 8, 21, 18, .4, [214, 130, 118]);
  const n = [0, 4, 8, 14][lvl];
  for (let i = 0; i < n; i++) { const x = 7 + hash2(i, 1, 9) * 16, y = 6 + hash2(i, 2, 9) * 16; L.taper(x, y, x, y + 2 + hash2(i, 3, 9) * 5, 1.1, .4, [150, 10, 10]); }
  L.grit(.1, 3); L.shade(.18, .3); L.outline(OUT);
  if (ex === 2) for (const x of [9, 10, 11, 18, 19, 20]) L.set(x, 13, [255, 40, 20], EMI);
  return L.canvas();
}

// ---------------------------------------------------------------------
//  TEXTURES 64x64
// ---------------------------------------------------------------------
function genTex(fn) {
  const d = new Uint32Array(64 * 64);
  for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) { const c = fn(x, y); d[y * 64 + x] = RGBA(clamp(c[0], 0, 255) | 0, clamp(c[1], 0, 255) | 0, clamp(c[2], 0, 255) | 0); }
  return { w: 64, h: 64, data: d };
}
function texBrick(seed, base, blood) {
  return genTex((x, y) => {
    const row = y >> 4, off = (row & 1) * 16, xx = (x + off) & 63, bi = xx >> 5, lx = xx & 31, ly = y & 15;
    const tone = .72 + hash2(bi + row * 7, row, seed) * .45;
    const n = fbm(x / 8, y / 8, seed, 3, 8), f2 = hash2(x, y, seed + 3);
    if (ly < 2 || lx < 2) return cmul(base, (.35 + n * .3) * .5);
    let k = tone * (.65 + n * .6) + (f2 - .5) * .14;
    if (ly === 2 || lx === 2) k *= 1.22; if (ly === 15 || lx === 31) k *= .7;
    const cr = fbm(x / 16, y / 16, seed + 5, 3, 4); if (Math.abs(cr - .5) < .014) k *= .45;
    let c = cmul(base, k);
    const moss = fbm(x / 8, y / 8, seed + 11, 2, 8); if (moss > .64) c = cmix(c, [46, 58, 34], Math.min(.6, (moss - .64) * 4));
    if (blood) { const b = fbm(x / 4, y / 16, seed + 21, 2, 16); if (b > .6) c = cmix(c, [96, 6, 6], Math.min(.85, (b - .6) * 5)); }
    if (y > 54) c = cmul(c, .75 + (63 - y) * .025);
    return c;
  });
}
function skullPix(dx, dy) {
  const inC = (dx * dx) / 81 + ((dy + 2) * (dy + 2)) / 64 <= 1, inJ = Math.abs(dx) <= 6 && dy >= 3 && dy <= 9;
  if (!inC && !inJ) return -1;
  if ((dx + 3.5) ** 2 + dy * dy <= 5.5 || (dx - 3.5) ** 2 + dy * dy <= 5.5) return .1;
  if (dy >= 3 && dy <= 5 && Math.abs(dx) <= (dy - 2.5)) return .15;
  if (inJ && !inC && dy === 7) return .2;
  if (inJ && dy >= 6 && dy <= 8 && (dx & 1) === 0) return .5;
  return 1.05 - (dy + 8) / 38 + (dx < 0 ? .06 : -.06);
}
function texOssuary(seed) {
  const bone = [204, 190, 160];
  const centers = [[16, 16], [48, 16], [0, 48], [32, 48], [64, 48]];
  return genTex((x, y) => {
    const n = fbm(x / 8, y / 8, seed, 3, 8);
    let c = cmul([58, 48, 40], .55 + n * .6);
    const by = (y + 3) & 31;
    if (by < 6) {
      const bx = (x + (((y + 3) >> 5) & 1) * 16) & 31;
      if (bx > 2 && bx < 29) { const th = (bx < 6 || bx > 25) ? 3 : 1.8; if (Math.abs(by - 3) < th) c = cmul(bone, .8 + n * .3 - (Math.abs(by - 3) / th) * .3); }
    }
    for (const [cx, cy] of centers) {
      let dx = x - cx, dy = y - cy; if (dy > 32) dy -= 64; if (dy < -32) dy += 64;
      if (Math.abs(dx) > 10 || Math.abs(dy) > 11) continue;
      const k = skullPix(dx, dy); if (k >= 0) c = cmul(bone, k * (.85 + n * .3));
    }
    return c;
  });
}
function texFlesh(seed, dark) {
  return genTex((x, y) => {
    const n = fbm(x / 8, y / 8, seed, 4, 8), v = fbm(x / 16, y / 16, seed + 3, 3, 4), v2 = fbm(x / 8, y / 8, seed + 9, 2, 8);
    let c = [100 + n * 70, 22 + n * 24, 32 + n * 26];
    if (Math.abs(v - .5) < .022 || Math.abs(v2 - .5) < .012) c = [54, 8, 30];
    if (n > .68) c = cmix(c, [210, 130, 130], (n - .68) * 2.5);
    if (hash2(x, y, seed) < .012) c = [30, 0, 6];
    return dark ? cmul(c, .6) : c;
  });
}
function texFloorStone(seed, base) {
  return genTex((x, y) => {
    const tx = x >> 5, ty = y >> 5, lx = x & 31, ly = y & 31;
    const n = fbm(x / 8, y / 8, seed, 4, 8);
    let k = (.7 + hash2(tx, ty, seed) * .35) * (.6 + n * .7);
    if (lx === 0 || ly === 0) k *= .28; else if (lx === 1 || ly === 1) k *= 1.15; else if (lx === 31 || ly === 31) k *= .72;
    const cr = fbm(x / 16, y / 16, seed + 5, 3, 4); if (Math.abs(cr - .5) < .012) k *= .5;
    return cmul(base, k + (hash2(x, y, seed + 1) - .5) * .1);
  });
}
function texBoneFloor(seed) {
  return genTex((x, y) => {
    const n = fbm(x / 8, y / 8, seed, 4, 8);
    let c = cmul([72, 56, 42], .55 + n * .6);
    const h = hash2(x >> 2, y >> 1, seed);
    if (h < .06) c = cmul([200, 188, 160], .7 + n * .3);
    if (hash2(x, y, seed + 2) < .03) c = cmul(c, .5);
    return c;
  });
}
function texCeil(seed, base, beams) {
  return genTex((x, y) => {
    const n = fbm(x / 8, y / 8, seed, 3, 8);
    if (beams && y < 10) { const g = fbm(x / 16, y / 2, seed + 4, 2, 4); let c = cmul([74, 48, 30], .6 + g * .6); if (y === 0 || y === 9) c = cmul(c, .5); return c; }
    return cmul(base, .55 + n * .6 + (hash2(x, y, seed) - .5) * .1);
  });
}
function distSeg(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, t = clamp(((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy), 0, 1);
  return Math.hypot(px - ax - dx * t, py - ay - dy * t);
}
function texGate(open) {
  return genTex((x, y) => {
    const n = fbm(x / 8, y / 8, 77, 3, 8), pl = x & 7;
    let c = cmul([64, 58, 58], .55 + n * .5);
    if (pl === 0) c = cmul(c, .4); else if (pl === 1) c = cmul(c, 1.25);
    if (y >= 5 && y <= 7 || y >= 56 && y <= 58) { c = [44, 40, 40]; if ((x & 7) === 4) c = [150, 140, 128]; }
    const dx = x - 31.5, dy = y - 31.5, r = Math.hypot(dx, dy);
    const sig = open ? [255, 80, 30] : [120, 22, 16];
    if (Math.abs(r - 17) < 1.3) c = sig;
    if (distSeg(dx, dy, -11, -7, 11, -7) < 1 || distSeg(dx, dy, 11, -7, 0, 13) < 1 || distSeg(dx, dy, 0, 13, -11, -7) < 1) c = sig;
    if (Math.abs((dx * dx) / 25 + ((dy + 1) * (dy + 1)) / 6 - 1) < .3 || r < 1.6) c = sig;
    if (open && n > .62 && pl === 0) c = [255, 120, 40];
    return c;
  });
}

// ---------------------------------------------------------------------
//  CONSTRUCTION DE TOUS LES ASSETS
// ---------------------------------------------------------------------
const TEX = {}, SPR = {};
function buildAssets() {
  TEX.wall = [];
  TEX.wall[1] = texBrick(11, [94, 82, 72], false);
  TEX.wall[2] = texBrick(23, [90, 76, 68], true);
  TEX.wall[3] = texOssuary(5);
  TEX.wall[4] = texFlesh(13, false);
  TEX.wall[5] = texBrick(41, [70, 66, 70], false);
  TEX.gateC = texGate(false); TEX.gateO = texGate(true);
  TEX.floors = [texFloorStone(3, [96, 86, 76]), texFloorStone(7, [86, 78, 72]), texBoneFloor(9), texBoneFloor(19), texFlesh(29, true)];
  TEX.ceils = [texCeil(2, [60, 54, 50], true), texCeil(4, [52, 48, 46], true), texCeil(6, [44, 38, 36], false), texFlesh(33, true), texFlesh(37, true)];

  const poses = ['idle', 'walk1', 'walk2', 'wind', 'strike', 'hurt'];
  const mk = fn => { const o = {}; for (const p of poses) o[p] = fn(p).tex(); return o; };
  for (const ty of ['ghoul', 'knight', 'brute', 'wraith']) {
    const v = MONSTERS[ty][MONSTER_STYLE[ty]] || MONSTERS[ty].A;
    SPR[ty] = mk(v.fn); Object.assign(ET[ty], { neck: v.neck, waist: v.waist });
  }
  SPR.boss = {};
  for (const p of poses) {
    const t = SPR.brute[p], d = new Uint32Array(t.data);
    for (let i = 0; i < d.length; i++) {
      const c = d[i], a = c >>> 24; if (!a || a === EMI) continue;
      d[i] = RGBA((c & 255) * .55, ((c >> 8) & 255) * .5, ((c >> 16) & 255) * .85 + 18, a);
    }
    SPR.boss[p] = { w: t.w, h: t.h, data: d };
  }
  SPR.stake = stakeSprite(); SPR.bones = bonesSprite(); SPR.brazier = braziersFrames(); SPR.torch = torchFrames();
  SPR.flask = flaskSprite(); SPR.orb = orbSprite(); SPR.fireball = fireballFrames();
  SPR.sword = makeSword(); SPR.swordRed = tintCanvas(SPR.sword, '#ff1a00', .55); SPR.swordGlow = tintCanvas(SPR.sword, '#ffddaa', .35);
  SPR.hands = makeHands();
  SPR.face = [];
  for (let l = 0; l < 4; l++) { SPR.face[l] = []; for (let e = 0; e < 4; e++) SPR.face[l][e] = makeFace(l, e); }
}
