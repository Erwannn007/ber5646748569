'use strict';
// =====================================================================
//  MOTEUR DE RENDU — raycasting + sprites + particules (buffer 32 bits)
// =====================================================================
const R = { W: 320, H: 200, buf: null, dep: null, img: null, low: null, lctx: null, view: null, vctx: null };
const LMR = 4;   // résolution lightmap par case
const BFR = 16;  // résolution sang au sol par case
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

function initRender() {
  R.view = document.getElementById('view'); R.vctx = R.view.getContext('2d');
  R.low = document.createElement('canvas'); R.lctx = R.low.getContext('2d');
  resizeRender(); addEventListener('resize', resizeRender);
}
function resizeRender() {
  const aw = window.innerWidth, ah = window.innerHeight;
  R.H = 200; R.W = clamp(Math.round(R.H * aw / ah), 220, 480);
  for (const c of [R.low, R.view]) { c.width = R.W; c.height = R.H; }
  R.img = R.lctx.createImageData(R.W, R.H); R.buf = new Uint32Array(R.img.data.buffer); R.dep = new Float32Array(R.W * R.H);
  const s = Math.min(aw / R.W, ah / R.H);
  Object.assign(R.view.style, { width: R.W * s + 'px', height: R.H * s + 'px', left: (aw - R.W * s) / 2 + 'px', top: (ah - R.H * s) / 2 + 'px' });
  R.lctx.imageSmoothingEnabled = false; R.vctx.imageSmoothingEnabled = false;
}
function makeCam(x, y, ang, fov, eye, horOff) {
  const W = R.W, H = R.H, t = Math.tan(fov / 2);
  return { x, y, ang, dirX: Math.cos(ang), dirY: Math.sin(ang), plX: -Math.sin(ang), plY: Math.cos(ang), tanH: t, focal: (W / 2) / t, hor: H / 2 + horOff, eye, W, H };
}
const plight = d => d < 6 ? .95 * (1 - d / 6) * (1 - d / 6) : 0;
const fogf = d => 1 / (1 + d * d * .011);
function lmAt(x, y) { const i = ((y * LMR) | 0) * G.lmw + ((x * LMR) | 0); const v = G.lm[i]; return v === undefined ? 0 : v; }

function renderWorld(C) {
  const W = C.W, H = C.H, buf = R.buf, dep = R.dep, map = G.map, mw = G.mw, mh = G.mh, lm = G.lm, LMW = G.lmw, bf = G.bloodF, BFW = G.bfw, bw = G.bloodW, ex = G.explored;
  const ft = G.floorTex.data, ct = G.ceilTex.data;
  const TR = G.tint[0], TG = G.tint[1], TB = G.tint[2], fl = G.flick, flash = G.flash;
  const r0x = C.dirX - C.plX * C.tanH, r0y = C.dirY - C.plY * C.tanH, r1x = C.dirX + C.plX * C.tanH, r1y = C.dirY + C.plY * C.tanH;
  // ---- sol & plafond
  for (let y = 0; y < H; y++) {
    const yc = y + .5, flo = yc > C.hor, dy = flo ? yc - C.hor : C.hor - yc;
    const rowD = (flo ? C.eye : (1 - C.eye)) * C.focal / Math.max(dy, .05);
    const pl = plight(rowD), fog = fogf(rowD), hz = (1 - fog) * G.haze;
    const sx = rowD * (r1x - r0x) / W, sy = rowD * (r1y - r0y) / W;
    let wx = C.x + rowD * r0x + sx * .5, wy = C.y + rowD * r0y + sy * .5;
    const tex = flo ? ft : ct; let i = y * W;
    for (let x = 0; x < W; x++, i++, wx += sx, wy += sy) {
      dep[i] = rowD;
      if (wx < 0 || wy < 0 || wx >= mw || wy >= mh) { buf[i] = 0xff000000; continue; }
      const cx = wx | 0, cy = wy | 0;
      const c = tex[((((wy - cy) * 64) | 0) << 6) + (((wx - cx) * 64) | 0)];
      let r = c & 255, g = (c >> 8) & 255, b = (c >> 16) & 255;
      if (flo) {
        const bv = bf[((wy * BFR) | 0) * BFW + ((wx * BFR) | 0)];
        if (bv) { const a = bv * .0036; r += (125 - 55 * a - r) * a; g += (5 - g) * a; b += (6 - b) * a; }
      }
      const L = (lm[((wy * LMR) | 0) * LMW + ((wx * LMR) | 0)] * fl + pl) * fog + flash;
      r = r * L * TR + hz * 12; g = g * L * TG + hz * 17; b = b * L * TB + hz * 27;
      buf[i] = 0xff000000 | ((b > 255 ? 255 : b | 0) << 16) | ((g > 255 ? 255 : g | 0) << 8) | (r > 255 ? 255 : r | 0);
    }
  }
  // ---- murs
  const gateOpen = G.cleared, gT = gateOpen ? TEX.gateO.data : TEX.gateC.data;
  const gatePulse = 1.25 + Math.sin(G.time * 5) * .3;
  const ci = (C.y | 0) * mw + (C.x | 0); if (ci >= 0 && ci < ex.length) ex[ci] = 1;
  for (let x = 0; x < W; x++) {
    const camX = 2 * (x + .5) / W - 1;
    const rdx = C.dirX + C.plX * C.tanH * camX, rdy = C.dirY + C.plY * C.tanH * camX;
    let mx = C.x | 0, my = C.y | 0;
    const ddx = Math.abs(1 / rdx), ddy = Math.abs(1 / rdy);
    let stx, sty, sdx, sdy;
    if (rdx < 0) { stx = -1; sdx = (C.x - mx) * ddx; } else { stx = 1; sdx = (mx + 1 - C.x) * ddx; }
    if (rdy < 0) { sty = -1; sdy = (C.y - my) * ddy; } else { sty = 1; sdy = (my + 1 - C.y) * ddy; }
    let side = 0, cell = 1, n = 0;
    while (n++ < 256) {
      if (sdx < sdy) { sdx += ddx; mx += stx; side = 0; } else { sdy += ddy; my += sty; side = 1; }
      if (mx < 0 || my < 0 || mx >= mw || my >= mh) { cell = 1; break; }
      const k = my * mw + mx; cell = map[k]; ex[k] = 1; if (cell > 0) break;
    }
    const perp = Math.max(.0001, side === 0 ? sdx - ddx : sdy - ddy);
    let wallX = side === 0 ? C.y + perp * rdy : C.x + perp * rdx; wallX -= Math.floor(wallX);
    let tx = (wallX * 64) | 0; if ((side === 0 && rdx > 0) || (side === 1 && rdy < 0)) tx = 63 - tx;
    const top = C.hor - (1 - C.eye) * C.focal / perp, bot = C.hor + C.eye * C.focal / perp, span = bot - top;
    const y0 = Math.max(0, Math.ceil(top - .5)), y1 = Math.min(H - 1, Math.ceil(bot - .5) - 1);
    const hx = C.x + perp * rdx, hy = C.y + perp * rdy;
    const lx = side === 0 ? hx - stx * .06 : hx, ly = side === 1 ? hy - sty * .06 : hy;
    let L;
    const isGate = cell === GATE;
    if (isGate && gateOpen) L = gatePulse;
    else L = (lmAt(lx, ly) * fl + plight(perp)) * fogf(perp) * (side ? .8 : 1) + flash;
    const tex = isGate ? gT : (TEX.wall[cell] || TEX.wall[1]).data;
    const Lr = L * TR, Lg = L * (isGate && gateOpen ? .9 : TG), Lb = L * TB, hzw = (1 - fogf(perp)) * G.haze;
    const inMap = mx >= 0 && my >= 0 && mx < mw && my < mh;
    const bbase = inMap ? (my * mw + mx) * 256 : -1, bcol = (wallX * 16) | 0;
    for (let y = y0; y <= y1; y++) {
      const i = y * W + x;
      let ty = (((y + .5 - top) / span) * 64) | 0; if (ty > 63) ty = 63; else if (ty < 0) ty = 0;
      const c = tex[(ty << 6) + tx];
      let r = c & 255, g = (c >> 8) & 255, b = (c >> 16) & 255;
      if (bbase >= 0) {
        const bv = bw[bbase + ((ty >> 2) << 4) + bcol];
        if (bv) { const a = bv * .0036; r += (125 - 55 * a - r) * a; g += (5 - g) * a; b += (6 - b) * a; }
      }
      r = r * Lr + hzw * 12; g = g * Lg + hzw * 17; b = b * Lb + hzw * 27;
      buf[i] = 0xff000000 | ((b > 255 ? 255 : b | 0) << 16) | ((g > 255 ? 255 : g | 0) << 8) | (r > 255 ? 255 : r | 0);
      dep[i] = perp;
    }
  }
}

// sprite billboard avec rotation, test de profondeur par pixel
// lit < 0 => plein éclairage ; flash 0..1 blanc ; mode 1 = clignotement exécution
function drawSprite(C, t, wx, wy, zc, sc, rot, flip, lit, flash, mode, dim = 1, fade = 1) {
  const dx = wx - C.x, dy = wy - C.y, depth = dx * C.dirX + dy * C.dirY;
  if (depth < .12) return;
  const sx = C.W / 2 + (dx * C.plX + dy * C.plY) / depth * C.focal;
  const sy = C.hor + (C.eye - zc) / depth * C.focal;
  const ppt = sc * C.focal / depth, hw = t.w * ppt / 2, hh = t.h * ppt / 2;
  let ex = hw, ey = hh; const cr = Math.cos(rot), sr = Math.sin(rot);
  if (rot) { ex = Math.abs(hw * cr) + Math.abs(hh * sr); ey = Math.abs(hw * sr) + Math.abs(hh * cr); }
  const x0 = Math.max(0, Math.floor(sx - ex)), x1 = Math.min(C.W - 1, Math.ceil(sx + ex));
  const y0 = Math.max(0, Math.floor(sy - ey)), y1 = Math.min(C.H - 1, Math.ceil(sy + ey));
  if (x0 > x1 || y0 > y1) return;
  const inv = 1 / ppt, tw = t.w, th = t.h, d = t.data, buf = R.buf, dep = R.dep, W = C.W;
  let L = lit < 0 ? 1 : ((lit * G.flick + plight(depth)) * fogf(depth) + G.flash) * dim;
  const Lr = L * G.tint[0], Lg = L * G.tint[1], Lb = L * G.tint[2], hz = (1 - fogf(depth)) * G.haze, fq = fade * 16;
  const fw = flash > 0 ? flash : 0;
  const fr = mode === 1 ? 255 : 255, fg = mode === 1 ? 150 : 255, fb = mode === 1 ? 40 : 255;
  const hw2 = tw / 2, hh2 = th / 2;
  for (let y = y0; y <= y1; y++) {
    const ly = (y + .5 - sy) * inv; const row = y * W;
    for (let x = x0; x <= x1; x++) {
      const i = row + x; if (dep[i] <= depth) continue;
      if (fq < 16 && BAYER[((y & 3) << 2) | (x & 3)] >= fq) continue;
      const lx = (x + .5 - sx) * inv;
      let u, v;
      if (rot) { u = lx * cr + ly * sr + hw2; v = -lx * sr + ly * cr + hh2; } else { u = lx + hw2; v = ly + hh2; }
      if (u < 0 || v < 0 || u >= tw || v >= th) continue;
      let ui = u | 0; if (flip) ui = tw - 1 - ui;
      const c = d[(v | 0) * tw + ui], a = c >>> 24; if (!a) continue;
      let r = c & 255, g = (c >> 8) & 255, b = (c >> 16) & 255;
      if (a !== 254) { r = r * Lr + hz * 12; g = g * Lg + hz * 17; b = b * Lb + hz * 27; }
      if (fw) { r += (fr - r) * fw; g += (fg - g) * fw; b += (fb - b) * fw; }
      buf[i] = 0xff000000 | ((b > 255 ? 255 : b | 0) << 16) | ((g > 255 ? 255 : g | 0) << 8) | (r > 255 ? 255 : r | 0);
      dep[i] = depth;
    }
  }
}

function drawDot(C, x, y, z, size, col, emis) {
  const dx = x - C.x, dy = y - C.y, d = dx * C.dirX + dy * C.dirY; if (d < .1) return;
  const sx = C.W / 2 + (dx * C.plX + dy * C.plY) / d * C.focal, sy = C.hor + (C.eye - z) / d * C.focal;
  const s = Math.max(1, Math.min(5, Math.round(size * C.focal / d)));
  const x0 = Math.round(sx - s / 2), y0 = Math.round(sy - s / 2);
  if (x0 + s < 0 || y0 + s < 0 || x0 >= C.W || y0 >= C.H) return;
  let r = col[0], g = col[1], b = col[2];
  if (!emis) { const L = Math.max(.45, (lmAt(x, y) + plight(d)) * fogf(d)); r *= L * G.tint[0]; g *= L * G.tint[1]; b *= L * G.tint[2]; }
  const c = 0xff000000 | ((b > 255 ? 255 : b | 0) << 16) | ((g > 255 ? 255 : g | 0) << 8) | (r > 255 ? 255 : r | 0);
  for (let yy = Math.max(0, y0); yy < Math.min(C.H, y0 + s); yy++) for (let xx = Math.max(0, x0); xx < Math.min(C.W, x0 + s); xx++) {
    const i = yy * C.W + xx; if (R.dep[i] > d) R.buf[i] = c;
  }
}

// effet "case de manga" : noir / blanc / rouge
function mangaFilter() {
  const b = R.buf;
  for (let i = 0; i < b.length; i++) {
    const c = b[i], r = c & 255, g = (c >> 8) & 255, bl = (c >> 16) & 255;
    const lum = r * .3 + g * .59 + bl * .11;
    if (r > 50 && r > g * 1.7) b[i] = 0xff0000d0 | 0;
    else b[i] = lum > 46 ? 0xffd8e2ea | 0 : 0xff050008 | 0;
  }
}

function bakeLight(D) {
  const w = D.W * LMR, h = D.H * LMR, lm = new Float32Array(w * h).fill(.05);
  for (const l of D.lights) {
    const r = l.r, x0 = Math.max(0, Math.floor((l.x - r) * LMR)), x1 = Math.min(w - 1, Math.ceil((l.x + r) * LMR));
    const y0 = Math.max(0, Math.floor((l.y - r) * LMR)), y1 = Math.min(h - 1, Math.ceil((l.y + r) * LMR));
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
      const px = (tx + .5) / LMR, py = (ty + .5) / LMR, d = Math.hypot(px - l.x, py - l.y);
      if (d >= r || isWall(px, py) || !losMap(l.x, l.y, px, py)) continue;
      const f = 1 - d / r; lm[ty * w + tx] += l.i * f * f;
    }
  }
  const o = new Float32Array(lm), solid = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) solid[y * w + x] = isWall((x + .5) / LMR, (y + .5) / LMR) ? 1 : 0;
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    if (solid[y * w + x]) continue;
    let s = 0, n = 0;
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) { const k = (y + j) * w + x + i; if (!solid[k]) { s += lm[k]; n++; } }
    o[y * w + x] = s / n;
  }
  return o;
}
