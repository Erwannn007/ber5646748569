'use strict';
// =====================================================================
//  GÉNÉRATION PROCÉDURALE DES DONJONS
//  cellules : 0 = sol, 1..5 = murs (texture), 9 = porte de sang (sortie)
// =====================================================================
const GATE = 9;
const THEMES = [[1, 5, 2], [1, 3, 2], [3, 5, 3], [3, 4, 2], [4, 3, 4]];
const ENEMY_TABLE = [
  { ghoul: 70, knight: 30 },
  { ghoul: 50, knight: 35, wraith: 15 },
  { ghoul: 40, knight: 30, wraith: 20, brute: 10 },
  { ghoul: 32, knight: 30, wraith: 20, brute: 18 },
  { ghoul: 28, knight: 28, wraith: 22, brute: 22 }
];
function weighted(t) { let s = 0; for (const k in t) s += t[k]; let r = Math.random() * s; for (const k in t) { r -= t[k]; if (r <= 0) return k; } return Object.keys(t)[0]; }

function genDungeon(floor) {
  for (let i = 0; i < 40; i++) { const D = tryGen(floor); if (D) return D; }
  throw new Error('generation failed');
}

function bfsGrid(map, W, H, sx, sy) {
  const dist = new Int32Array(W * H).fill(-1), q = new Int32Array(W * H); let h = 0, t = 0;
  const s = sy * W + sx; if (map[s] !== 0) return dist; dist[s] = 0; q[t++] = s;
  while (h < t) {
    const c = q[h++], cx = c % W, cy = (c / W) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cx + dx, ny = cy + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const n = ny * W + nx; if (map[n] === 0 && dist[n] < 0) { dist[n] = dist[c] + 1; q[t++] = n; }
    }
  }
  return dist;
}

function tryGen(floor) {
  const S = Math.min(36 + floor * 4, 64), W = S, H = S;
  const th = THEMES[Math.min(floor - 1, THEMES.length - 1)];
  const map = new Uint8Array(W * H).fill(th[0]);
  const rooms = [], want = Math.min(7 + floor * 2, 18);
  for (let t = 0; t < 700 && rooms.length < want; t++) {
    let w = ri(5, 10), h = ri(5, 10);
    if (Math.random() < .2) { w = ri(10, 14); h = ri(9, 13); }
    const x = ri(2, W - w - 3), y = ri(2, H - h - 3);
    let ok = true;
    for (const r of rooms) if (x < r.x + r.w + 3 && x + w + 3 > r.x && y < r.y + r.h + 3 && y + h + 3 > r.y) { ok = false; break; }
    if (!ok) continue;
    rooms.push({ x, y, w, h, cx: x + (w >> 1), cy: y + (h >> 1), tex: pick(th), pillars: [] });
  }
  if (rooms.length < 5) return null;
  const carve = (x, y) => { if (x > 0 && y > 0 && x < W - 1 && y < H - 1) map[y * W + x] = 0; };
  for (const r of rooms) for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) carve(x, y);

  // arbre couvrant minimal + quelques boucles
  const inT = [0], rest = new Set(rooms.map((_, i) => i)), edges = []; rest.delete(0);
  while (rest.size) {
    let best = null, bd = 1e9;
    for (const i of inT) for (const j of rest) { const d = Math.abs(rooms[i].cx - rooms[j].cx) + Math.abs(rooms[i].cy - rooms[j].cy); if (d < bd) { bd = d; best = [i, j]; } }
    edges.push(best); inT.push(best[1]); rest.delete(best[1]);
  }
  for (let k = 0; k < Math.floor(rooms.length / 3); k++) { const i = ri(0, rooms.length - 1), j = ri(0, rooms.length - 1); if (i !== j) edges.push([i, j]); }
  for (const [i, j] of edges) {
    const a = rooms[i], b = rooms[j], wide = Math.random() < .35;
    const cv = (x, y) => { carve(x, y); if (wide) { carve(x + 1, y); carve(x, y + 1); carve(x + 1, y + 1); } };
    let x = a.cx, y = a.cy;
    if (Math.random() < .5) { while (x !== b.cx) { cv(x, y); x += Math.sign(b.cx - x); } while (y !== b.cy) { cv(x, y); y += Math.sign(b.cy - y); } }
    else { while (y !== b.cy) { cv(x, y); y += Math.sign(b.cy - y); } while (x !== b.cx) { cv(x, y); x += Math.sign(b.cx - x); } }
    cv(x, y);
  }
  // textures des murs autour de chaque salle
  for (const r of rooms) for (let y = r.y - 1; y <= r.y + r.h; y++) for (let x = r.x - 1; x <= r.x + r.w; x++) {
    const k = y * W + x; if (map[k] > 0) map[k] = r.tex;
  }
  // piliers
  for (const r of rooms) {
    if (r.w >= 8 && r.h >= 8 && Math.random() < .65) {
      r.pillars = [[r.x + 2, r.y + 2], [r.x + r.w - 3, r.y + 2], [r.x + 2, r.y + r.h - 3], [r.x + r.w - 3, r.y + r.h - 3]];
      for (const [x, y] of r.pillars) map[y * W + x] = r.tex;
    }
  }
  const allReach = () => {
    const d = bfsGrid(map, W, H, rooms[0].cx, rooms[0].cy);
    for (let i = 0; i < W * H; i++) if (map[i] === 0 && d[i] < 0) return null;
    return d;
  };
  let dist = allReach();
  if (!dist) {
    for (const r of rooms) { for (const [x, y] of r.pillars) map[y * W + x] = 0; r.pillars = []; }
    dist = allReach(); if (!dist) return null;
  }
  // salle de sortie = la plus éloignée
  let exitRoom = null, bd = -1;
  for (let i = 1; i < rooms.length; i++) { const d = dist[rooms[i].cy * W + rooms[i].cx]; if (d > bd) { bd = d; exitRoom = rooms[i]; } }
  const E = exitRoom, cand = [];
  const isW = (x, y) => x < 0 || y < 0 || x >= W || y >= H || map[y * W + x] > 0;
  for (let x = E.x + 1; x < E.x + E.w - 1; x++) {
    if (isW(x, E.y - 1) && isW(x, E.y - 2) && isW(x - 1, E.y - 1) && isW(x + 1, E.y - 1)) cand.push([x, E.y - 1, x, E.y]);
    if (isW(x, E.y + E.h) && isW(x, E.y + E.h + 1) && isW(x - 1, E.y + E.h) && isW(x + 1, E.y + E.h)) cand.push([x, E.y + E.h, x, E.y + E.h - 1]);
  }
  for (let y = E.y + 1; y < E.y + E.h - 1; y++) {
    if (isW(E.x - 1, y) && isW(E.x - 2, y) && isW(E.x - 1, y - 1) && isW(E.x - 1, y + 1)) cand.push([E.x - 1, y, E.x, y]);
    if (isW(E.x + E.w, y) && isW(E.x + E.w + 1, y) && isW(E.x + E.w, y - 1) && isW(E.x + E.w, y + 1)) cand.push([E.x + E.w, y, E.x + E.w - 1, y]);
  }
  const okC = cand.filter(c => map[c[3] * W + c[2]] === 0);
  if (!okC.length) return null;
  const g = pick(okC); map[g[1] * W + g[0]] = GATE;
  const exit = { x: g[0], y: g[1], fx: g[2] + .5, fy: g[3] + .5 };

  // lumières & décor
  const lights = [], decor = [], used = new Set();
  const isPillar = (r, x, y) => r.pillars.some(p => p[0] === x && p[1] === y);
  for (const r of rooms) {
    const n = 2 + Math.floor(r.w * r.h / 30);
    for (let k = 0, tries = 0; k < n && tries < 40; tries++) {
      const side = ri(0, 3); let ix, iy, wx, wy;
      if (side === 0) { ix = ri(r.x, r.x + r.w - 1); iy = r.y; wx = ix; wy = r.y - 1; }
      else if (side === 1) { ix = ri(r.x, r.x + r.w - 1); iy = r.y + r.h - 1; wx = ix; wy = r.y + r.h; }
      else if (side === 2) { ix = r.x; iy = ri(r.y, r.y + r.h - 1); wx = r.x - 1; wy = iy; }
      else { ix = r.x + r.w - 1; iy = ri(r.y, r.y + r.h - 1); wx = r.x + r.w; wy = iy; }
      const wk = wy * W + wx; if (map[wk] === 0 || map[wk] === GATE || used.has(wk) || map[iy * W + ix] !== 0) continue;
      used.add(wk); k++;
      const x = ix + .5 + (wx - ix) * .42, y = iy + .5 + (wy - iy) * .42;
      lights.push({ x, y, r: 6.5, i: 1.15 }); decor.push({ kind: 'torch', x, y, z: .5, block: 0 });
    }
    if (r !== rooms[0] && r.w >= 9 && r.h >= 9 && !r.pillars.length && Math.random() < .55) {
      const x = r.cx + .5 + (r.w > 10 ? 2 : 0), y = r.cy + .5 + (r.h > 10 ? 2 : 0);
      lights.push({ x, y, r: 7.5, i: 1.35 }); decor.push({ kind: 'brazier', x, y, z: 0, block: .3 });
    }
    if (r !== rooms[0]) {
      const ns = Math.random() < .5 ? ri(1, 3) : 0;
      for (let k = 0; k < ns; k++) {
        const x = ri(r.x + 1, r.x + r.w - 2), y = ri(r.y + 1, r.y + r.h - 2);
        if (x === r.cx || y === r.cy || x === r.cx + 1 || y === r.cy + 1 || isPillar(r, x, y)) continue;
        decor.push({ kind: 'stake', x: x + .5, y: y + .5, z: 0, block: .22 });
      }
    }
    for (let k = ri(0, 3); k > 0; k--) decor.push({ kind: 'bones', x: rr(r.x + .3, r.x + r.w - .3), y: rr(r.y + .3, r.y + r.h - .3), z: 0, block: 0 });
  }
  lights.push({ x: exit.fx, y: exit.fy, r: 4, i: .7 });

  // ennemis
  const spawns = [], items = [], table = ENEMY_TABLE[Math.min(floor - 1, ENEMY_TABLE.length - 1)];
  const blocked = (x, y) => decor.some(d => d.block && Math.abs(d.x - x) < .8 && Math.abs(d.y - y) < .8);
  for (let i = 1; i < rooms.length; i++) {
    const r = rooms[i], area = r.w * r.h;
    const n = clamp(Math.round(area / 16 * (.7 + floor * .12)), 1, 8);
    for (let k = 0, tries = 0; k < n && tries < 50; tries++) {
      const x = ri(r.x, r.x + r.w - 1), y = ri(r.y, r.y + r.h - 1);
      if (map[y * W + x] !== 0 || blocked(x + .5, y + .5)) continue;
      spawns.push({ type: weighted(table), x: x + .5 + rr(-.2, .2), y: y + .5 + rr(-.2, .2) }); k++;
    }
    if (Math.random() < .35) {
      const x = ri(r.x, r.x + r.w - 1), y = ri(r.y, r.y + r.h - 1);
      if (map[y * W + x] === 0) items.push({ kind: 'flask', x: x + .5, y: y + .5 });
    }
  }
  if (floor % 3 === 0) spawns.push({ type: 'brute', boss: true, x: E.cx + .5, y: E.cy + .5 });
  const s0 = rooms[0];
  // orientation de départ : vers la sortie la plus proche du centre
  let ang = 0, bestOpen = -1;
  for (let a = 0; a < 4; a++) {
    const dx = Math.round(Math.cos(a * Math.PI / 2)), dy = Math.round(Math.sin(a * Math.PI / 2)); let n = 0;
    for (let s = 1; s < 20; s++) { if (map[(s0.cy + dy * s) * W + s0.cx + dx * s] !== 0) break; n++; }
    if (n > bestOpen) { bestOpen = n; ang = a * Math.PI / 2; }
  }
  return { W, H, map, rooms, start: { x: s0.cx + .5, y: s0.cy + .5, ang }, exit, lights, decor, spawns, items, theme: Math.min(floor - 1, 4) };
}
