'use strict';
// ---------- Maths & helpers ----------
const TAU = Math.PI * 2;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const rr = (a, b) => a + Math.random() * (b - a);
const ri = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
const pick = a => a[Math.floor(Math.random() * a.length)];
function angDiff(a, b) { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; else if (d < -Math.PI) d += TAU; return d; }
const easeOut = t => 1 - (1 - t) * (1 - t);
const easeIn = t => t * t * t;
const easeInOut = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

function hash2(x, y, s) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(s | 0, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
function vnoise(x, y, s, period) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const p = period || 1e9, m = n => ((n % p) + p) % p;
  const x0 = m(xi), x1 = m(xi + 1), y0 = m(yi), y1 = m(yi + 1);
  return lerp(lerp(hash2(x0, y0, s), hash2(x1, y0, s), u), lerp(hash2(x0, y1, s), hash2(x1, y1, s), u), v);
}
function fbm(x, y, s, oct, period) {
  let t = 0, amp = .5, f = 1, n = 0;
  for (let i = 0; i < oct; i++) { t += vnoise(x * f, y * f, s + i * 17, period ? period * f : 0) * amp; n += amp; amp *= .5; f *= 2; }
  return t / n;
}
const RGBA = (r, g, b, a = 255) => (((a & 255) << 24) | ((b & 255) << 16) | ((g & 255) << 8) | (r & 255)) >>> 0;
const cmul = (c, f) => [c[0] * f, c[1] * f, c[2] * f];
const cmix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

// ---------- Pixel font 3x5 ----------
const GLYPHS = {
  A: '.#.|#.#|###|#.#|#.#', B: '##.|#.#|##.|#.#|##.', C: '.##|#..|#..|#..|.##', D: '##.|#.#|#.#|#.#|##.',
  E: '###|#..|##.|#..|###', F: '###|#..|##.|#..|#..', G: '.##|#..|#.#|#.#|.##', H: '#.#|#.#|###|#.#|#.#',
  I: '###|.#.|.#.|.#.|###', J: '..#|..#|..#|#.#|.#.', K: '#.#|#.#|##.|#.#|#.#', L: '#..|#..|#..|#..|###',
  M: '#.#|###|###|#.#|#.#', N: '##.|#.#|#.#|#.#|#.#', O: '.#.|#.#|#.#|#.#|.#.', P: '##.|#.#|##.|#..|#..',
  Q: '.#.|#.#|#.#|##.|.##', R: '##.|#.#|##.|#.#|#.#', S: '.##|#..|.#.|..#|##.', T: '###|.#.|.#.|.#.|.#.',
  U: '#.#|#.#|#.#|#.#|###', V: '#.#|#.#|#.#|#.#|.#.', W: '#.#|#.#|###|###|#.#', X: '#.#|#.#|.#.|#.#|#.#',
  Y: '#.#|#.#|.#.|.#.|.#.', Z: '###|..#|.#.|#..|###',
  0: '###|#.#|#.#|#.#|###', 1: '.#.|##.|.#.|.#.|###', 2: '##.|..#|.#.|#..|###', 3: '##.|..#|.#.|..#|##.',
  4: '#.#|#.#|###|..#|..#', 5: '###|#..|##.|..#|##.', 6: '.##|#..|###|#.#|###', 7: '###|..#|.#.|.#.|.#.',
  8: '###|#.#|###|#.#|###', 9: '###|#.#|###|..#|##.',
  '.': '...|...|...|...|.#.', ',': '...|...|...|.#.|#..', '!': '.#.|.#.|.#.|...|.#.', '?': '##.|..#|.#.|...|.#.',
  ':': '...|.#.|...|.#.|...', '-': '...|...|###|...|...', '/': '..#|..#|.#.|#..|#..', '+': '...|.#.|###|.#.|...',
  "'": '.#.|.#.|...|...|...', '(': '.#.|#..|#..|#..|.#.', ')': '.#.|..#|..#|..#|.#.', '>': '#..|.#.|..#|.#.|#..',
  '<': '..#|.#.|#..|.#.|..#', '=': '...|###|...|###|...', '%': '#.#|..#|.#.|#..|#.#', ' ': '...|...|...|...|...',
  'x': '...|#.#|.#.|#.#|...'
};
const GLY = {};
for (const k in GLYPHS) GLY[k] = GLYPHS[k].split('|');
function normTxt(s) { return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/X(?=\d)/g, 'x'); }
function textW(str, s = 1) { return normTxt(str).length * 4 * s - s; }
function drawText(ctx, str, x, y, s = 1, col = '#fff', align = 'left', shadow = '#000') {
  str = normTxt(str);
  const w = str.length * 4 * s - s;
  if (align === 'center') x -= Math.floor(w / 2); else if (align === 'right') x -= w;
  x = Math.round(x); y = Math.round(y);
  const pass = (ox, oy) => {
    for (let i = 0; i < str.length; i++) {
      const g = GLY[str[i]] || GLY[' '];
      for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++) if (g[r][c] === '#') ctx.fillRect(ox + i * 4 * s + c * s, oy + r * s, s, s);
    }
  };
  if (shadow) { ctx.fillStyle = shadow; pass(x + Math.max(1, s >> 1), y + Math.max(1, s >> 1)); }
  ctx.fillStyle = col; pass(x, y);
}
