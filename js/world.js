// Village maps: tile grid, collision, props, and pixel-art rendering per village theme.
import { outline } from './sprites.js?v=9d1c820';
import { drawText, textWidth } from './pixfont.js?v=9d1c820';

export const T = 16;
export const MW = 48, MH = 36;

const THEMES = {
  pine: { g1: '#6fbf5a', g2: '#62b04f', g3: '#7fcf66', path: '#d8b37a', pathD: '#c49c63', stone: '#cfc3ad', stoneD: '#b5a88f', roof: '#c43c32', roofD: '#8a2a22', edge: 'pine', water: '#4aa3d8', waterL: '#7cc4ec', accent: '#3a8a4a', flower: ['#ff8fb1', '#fff1a8', '#ffffff'] },
  dune: { g1: '#e8c88a', g2: '#dfbd7c', g3: '#f0d49a', path: '#c99a5e', pathD: '#b3854c', stone: '#d8b890', stoneD: '#bf9c72', roof: '#e07a2c', roofD: '#9a4a14', edge: 'rock', water: '#3fa3a3', waterL: '#78c8c0', accent: '#e07a2c', flower: ['#d84a3a', '#f2c14a', '#ffffff'] },
  tide: { g1: '#7cc87a', g2: '#6ebb6d', g3: '#8ad688', path: '#e8d4a8', pathD: '#d4bd8c', stone: '#d4d8dc', stoneD: '#b4bac2', roof: '#2f7fc4', roofD: '#1d4f80', edge: 'sea', water: '#3a8fd0', waterL: '#7cbfee', accent: '#2f7fc4', flower: ['#ffffff', '#9fd8ff', '#ffd36b'] },
};

// champion statues outside the Arena (tile x, y): Genin, Chunin, Jonin
export const STATUES = [{ rank: 'Genin', x: 14, y: 32 }, { rank: 'Chunin', x: 16, y: 32 }, { rank: 'Jonin', x: 18, y: 32 }];
export const BUILDINGS = [
  { id: 'academy', name: 'Academy', x: 19, y: 3, w: 10, h: 6, big: true },
  { id: 'missions', name: 'Mission Hall', x: 33, y: 12, w: 8, h: 5 },
  { id: 'shop', name: 'Tool Shop', x: 7, y: 12, w: 8, h: 5 },
  { id: 'arena', name: 'Arena', x: 6, y: 24, w: 10, h: 7, arena: true },
  { id: 'house', x: 6, y: 4, w: 5, h: 4 }, { id: 'library', name: 'Library', x: 12, y: 4, w: 5, h: 4 },
  { id: 'house', x: 32, y: 4, w: 5, h: 4 }, { id: 'kage', name: 'Kage Tower', x: 38, y: 4, w: 8, h: 6, big: true, tower: true },
  { id: 'hospital', name: 'Hospital', x: 32, y: 24, w: 5, h: 4 }, { id: 'market', name: 'Auction House', x: 39, y: 22, w: 6, h: 5 },
];

// deterministic RNG
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

export function buildWorld(village) {
  const th = THEMES[village] || THEMES.pine;
  const r = rng(village.length * 977 + village.charCodeAt(0));
  // ground: 0 grass,1 path,2 stone,3 water,4 sand
  const ground = new Uint8Array(MW * MH);
  const solid = new Uint8Array(MW * MH);
  const G = (x, y, v) => { if (x >= 0 && y >= 0 && x < MW && y < MH) ground[y * MW + x] = v; };
  const S = (x, y, v = 1) => { if (x >= 0 && y >= 0 && x < MW && y < MH) solid[y * MW + x] = v; };
  const isRoad = (x, y) => ground[y * MW + x] === 1 || ground[y * MW + x] === 2;
  // roads
  for (let x = 2; x < MW - 2; x++) { G(x, 17, 1); G(x, 18, 1); }
  for (let y = 2; y < MH; y++) { G(23, y, 1); G(24, y, 1); }
  // plaza
  for (let y = 12; y <= 23; y++) for (let x = 18; x <= 29; x++) G(x, y, 2);
  // paths to doors
  for (const b of BUILDINGS) {
    const dx = b.x + (b.w >> 1), dy = b.y + b.h;
    for (let y = dy; y < MH - 2; y++) { if (isRoad(dx, y)) break; G(dx, y, 1); if (b.big) G(dx - 1, y, 1); }
    for (let y = dy; y > 1; y--) { if (isRoad(dx, y) && y !== dy) break; }
  }
  // connect side buildings horizontally
  for (let x = 15; x <= 18; x++) { G(x, 16, 1); }
  for (let x = 29; x <= 33; x++) { G(x, 16, 1); }
  // pond
  const pond = { x: 38, y: 29, w: 7, h: 4 };
  for (let y = pond.y; y < pond.y + pond.h; y++) for (let x = pond.x; x < pond.x + pond.w; x++) {
    const corner = (x === pond.x || x === pond.x + pond.w - 1) && (y === pond.y || y === pond.y + pond.h - 1);
    if (!corner) { G(x, y, 3); S(x, y); }
  }
  // edges
  const props = [];
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
    const edge = x < 2 || y < 2 || x >= MW - 2 || y >= MH - 2;
    const gateGap = y >= MH - 2 && (x === 23 || x === 24);
    if (edge && !gateGap) {
      S(x, y);
      if (th.edge === 'sea' && (y >= MH - 2 || x >= MW - 2)) G(x, y, 3);
      else if ((x + y) % 2 === 0 || y >= MH - 2) props.push({ kind: th.edge === 'sea' ? 'palm' : th.edge, x: x * T + 8, y: y * T + 15, s: r() });
    }
  }
  // buildings
  for (const b of BUILDINGS) {
    for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) S(x, y);
    props.push({ kind: 'building', b, x: b.x * T, y: (b.y + b.h) * T - 1 });
  }
  // fountain/statue in plaza center
  for (let y = 16; y <= 19; y++) for (let x = 22; x <= 25; x++) S(x, y);
  props.push({ kind: 'fountain', x: 22 * T, y: 20 * T - 1 });
  // gate
  props.push({ kind: 'gate', x: 21 * T, y: (MH - 1) * T - 1 });
  S(21, MH - 2); S(26, MH - 2); S(21, MH - 1); S(26, MH - 1);
  for (const st of STATUES) S(st.x, st.y);
  // lamps along roads
  for (const [x, y] of [[20, 11], [27, 11], [17, 15], [30, 15], [17, 20], [30, 20], [22, 27], [25, 27], [10, 16], [38, 19]]) {
    if (!solid[y * MW + x]) { S(x, y); props.push({ kind: 'lamp', x: x * T + 8, y: y * T + 14 }); }
  }
  // scatter trees and flowers
  const decor = [];
  for (let i = 0; i < 260; i++) {
    const x = 2 + ((r() * (MW - 4)) | 0), y = 2 + ((r() * (MH - 4)) | 0);
    const idx = y * MW + x;
    if (ground[idx] !== 0 || solid[idx]) continue;
    // keep clear of roads/doors
    let near = false;
    for (let j = -1; j <= 1 && !near; j++) for (let k = -1; k <= 1; k++) { const n = (y + j) * MW + x + k; if (ground[n] && ground[n] !== 3) near = true; if (solid[n] && j === -1) near = true; }
    if (near) continue;
    const roll = r();
    if (roll < 0.22) { S(x, y); props.push({ kind: th.edge === 'rock' ? (r() < 0.5 ? 'cactus' : 'rock') : (th.edge === 'sea' ? (r() < 0.5 ? 'palm' : 'blossom') : (r() < 0.6 ? 'pine' : 'blossom')), x: x * T + 8, y: y * T + 15, s: r() }); }
    else decor.push({ x, y, k: roll < 0.6 ? 'flower' : 'tuft', c: th.flower[(r() * 3) | 0], o: (r() * 10) | 0 });
  }
  // interaction points (stand just below doors)
  const spots = BUILDINGS.filter((b) => b.name).map((b) => ({ id: b.id, name: b.name, x: (b.x + b.w / 2) * T, y: (b.y + b.h) * T + 10 }));
  spots.push({ id: 'gate', name: 'Village Gate', x: 24 * T, y: (MH - 3) * T });
  const groundCanvas = paintGround(ground, decor, th);
  props.forEach((p) => (p.img = propSprite(p, th, village)));
  return { village, th, ground, solid, props, spots, groundCanvas, spawn: { x: 24 * T, y: 25 * T } };
}

export function blocked(world, px, py) {
  // feet box 10x5 centred at px, bottom at py
  const pts = [[px - 5, py - 4], [px + 4, py - 4], [px - 5, py], [px + 4, py]];
  for (const [x, y] of pts) {
    const tx = Math.floor(x / T), ty = Math.floor(y / T);
    if (tx < 0 || ty < 0 || tx >= MW || ty >= MH) return true;
    if (world.solid[ty * MW + tx]) return true;
  }
  return false;
}

// ---------- painting ----------
function paintGround(ground, decor, th) {
  const c = document.createElement('canvas'); c.width = MW * T; c.height = MH * T;
  const x = c.getContext('2d');
  const R = (col, a, b, w, h) => { x.fillStyle = col; x.fillRect(a, b, w, h); };
  for (let ty = 0; ty < MH; ty++) for (let tx = 0; tx < MW; tx++) {
    const v = ground[ty * MW + tx], px = tx * T, py = ty * T;
    const chk = (tx * 7 + ty * 13) % 5;
    if (v === 0 || v === 4) {
      R(chk === 0 ? th.g2 : th.g1, px, py, T, T);
      // grass blades and speckles for texture
      const h = (tx * 31 + ty * 17) % 7;
      R(th.g2, px + (h * 2) % 13, py + (h * 5) % 13, 1, 2); R(th.g2, px + (h * 2) % 13 + 1, py + (h * 5) % 13 + 1, 1, 1);
      if (chk === 1) { R(th.g3, px + 3, py + 5, 2, 1); R(th.g3, px + 10, py + 11, 2, 1); R(th.g2, px + 11, py + 12, 1, 1); }
      if (chk === 3) { R(th.g2, px + 7, py + 2, 1, 2); R(th.g3, px + 6, py + 2, 1, 1); }
      if (chk === 4) { R(th.g3, px + 12, py + 4, 1, 1); R(th.g3, px + 2, py + 12, 1, 1); }
    } else if (v === 1) {
      R(th.path, px, py, T, T);
      const h = (tx * 13 + ty * 29) % 6;
      R(th.pathD, px + 2 + h, py + 3 + (h % 3) * 3, 2, 1); R(shadeHex(th.path, 16), px + 2 + h, py + 2 + (h % 3) * 3, 2, 1);
      if (chk === 2) { R(th.pathD, px + 4, py + 6, 2, 2); R(shadeHex(th.path, 18), px + 4, py + 5, 2, 1); }
      if (chk === 4) R(th.pathD, px + 11, py + 12, 2, 1);
      if (chk === 0) { R(th.pathD, px + 9, py + 8, 1, 1); R(th.pathD, px + 13, py + 3, 1, 1); }
    } else if (v === 2) {
      // bevelled paving slabs: lit top-left, shaded bottom-right
      R(th.stone, px, py, T, T); R(shadeHex(th.stone, 14), px, py, T, 1); R(shadeHex(th.stone, 14), px, py, 1, T);
      R(th.stoneD, px, py + 15, T, 1); R(th.stoneD, px + 15, py, 1, T);
      if ((tx + ty) % 2) { R(th.stoneD, px + 7, py, 1, 8); R(shadeHex(th.stone, 14), px + 8, py, 1, 8); }
      else { R(th.stoneD, px + 3, py + 8, 1, 7); R(shadeHex(th.stone, 14), px + 4, py + 8, 1, 7); }
      if (chk === 1) R(shadeHex(th.stone, -10), px + 10, py + 4, 2, 1);
    } else if (v === 3) {
      R(th.water, px, py, T, T);
      if ((tx + ty) % 3 === 0) R(shadeHex(th.water, -14), px + 2, py + 9, 6, 1);
    }
  }
  // soft edges: path borders on grass
  for (let ty = 1; ty < MH - 1; ty++) for (let tx = 1; tx < MW - 1; tx++) {
    const v = ground[ty * MW + tx]; if (v !== 0) continue;
    const px = tx * T, py = ty * T;
    if (ground[(ty - 1) * MW + tx] === 1) R(th.pathD, px, py, T, 1);
    if (ground[(ty + 1) * MW + tx] === 1) R(th.pathD, px, py + 15, T, 1);
    if (ground[ty * MW + tx - 1] === 1) R(th.pathD, px, py, 1, T);
    if (ground[ty * MW + tx + 1] === 1) R(th.pathD, px + 15, py, 1, T);
    // water shore
    if (ground[(ty - 1) * MW + tx] === 3 || ground[(ty + 1) * MW + tx] === 3 || ground[ty * MW + tx - 1] === 3 || ground[ty * MW + tx + 1] === 3) {
      R('#e8d4a8', px + (ground[ty * MW + tx - 1] === 3 ? 0 : ground[ty * MW + tx + 1] === 3 ? 12 : 0), py + (ground[(ty - 1) * MW + tx] === 3 ? 0 : ground[(ty + 1) * MW + tx] === 3 ? 12 : 0),
        ground[ty * MW + tx - 1] === 3 || ground[ty * MW + tx + 1] === 3 ? 4 : T, ground[(ty - 1) * MW + tx] === 3 || ground[(ty + 1) * MW + tx] === 3 ? 4 : T);
    }
  }
  for (const d of decor) {
    const px = d.x * T, py = d.y * T;
    if (d.k === 'flower') { R(d.c, px + 4 + (d.o % 6), py + 6, 2, 2); R(d.c, px + 9, py + 10 - (d.o % 4), 2, 2); R('#3d7f33', px + 5 + (d.o % 6), py + 8, 1, 2); }
    else { R(th.g3, px + 5, py + 8, 1, 3); R(th.g3, px + 7, py + 7, 1, 4); R(th.g3, px + 9, py + 8, 1, 3); }
  }
  return c;
}

function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
function circle(x, cx, cy, r) { for (let y = -r; y <= r; y++) { const w = Math.round(Math.sqrt(r * r - y * y)); x.fillRect(cx - w, cy + y, w * 2, 1); } }

// put a soft oval shadow under a sprite's base (drawn after outlining so it stays see-through)
function withShadow(img, ox, oy, rx) {
  const out = document.createElement('canvas'); out.width = img.width + 4; out.height = img.height + 2;
  const o = out.getContext('2d'), cx = img.width / 2 + 1, cy = img.height - 1;
  o.fillStyle = 'rgba(25,20,10,.22)';
  for (let dy = -2; dy <= 2; dy++) { const w = Math.round(rx * Math.sqrt(1 - (dy * dy) / 6.25)); o.fillRect(Math.round(cx - w), cy + dy, w * 2, 1); }
  o.drawImage(img, 0, 0);
  return { img: out, ox, oy };
}
// returns {img, ox, oy} where (ox,oy) is the offset from prop anchor to draw point
function propSprite(p, th, village) {
  const k = p.kind;
  if (k === 'pine') {
    const [c, x] = canvas(20, 32);
    x.fillStyle = '#6a4024'; x.fillRect(8, 24, 4, 7); x.fillStyle = '#8a5a34'; x.fillRect(8, 24, 1, 7); x.fillStyle = '#4a2a16'; x.fillRect(11, 24, 1, 7);
    for (let i = 0; i < 4; i++) {
      const w = 18 - i * 4, x0 = 10 - w / 2, y0 = 22 - i * 6;
      x.fillStyle = '#2e6b35'; x.fillRect(x0, y0, w, 6);                       // body
      x.fillStyle = '#245c30'; x.fillRect(x0 + w / 2, y0 + 1, w / 2, 5);        // shaded right half
      x.fillStyle = '#1c4a26'; x.fillRect(x0, y0 + 5, w, 1); x.fillRect(x0 + w - 1, y0 + 1, 1, 5);
      x.fillStyle = '#4a9a4e'; x.fillRect(x0 + 1, y0, Math.max(2, w / 2 - 2), 1); x.fillRect(x0 + 1, y0 + 1, 1, 2);
      x.fillStyle = '#5fb05a'; x.fillRect(x0 + 2, y0, 2, 1);
      for (let d = 0; d < w; d += 3) { x.fillStyle = '#1c4a26'; x.fillRect(x0 + d + (i % 2), y0 + 5, 1, 1); x.fillStyle = '#3a7f40'; x.fillRect(x0 + d + 1, y0 + 3, 1, 1); }
    }
    x.fillStyle = '#2e6b35'; x.fillRect(9, 0, 2, 4); x.fillStyle = '#4a9a4e'; x.fillRect(9, 0, 1, 3);
    const o = outline(c, '#16261a'); return withShadow(o, -11, -32, 9);
  }
  if (k === 'blossom') {
    const [c, x] = canvas(22, 30);
    x.fillStyle = '#6a4024'; x.fillRect(9, 16, 4, 13); x.fillRect(5, 17, 4, 2); x.fillStyle = '#8a5a34'; x.fillRect(9, 16, 1, 13); x.fillStyle = '#4a2a16'; x.fillRect(12, 18, 1, 11);
    x.fillStyle = '#e8789c'; circle(x, 11, 10, 9);
    x.fillStyle = '#ff9fbf'; circle(x, 10, 9, 8);
    x.fillStyle = '#ffc4d6'; circle(x, 8, 6, 4); x.fillStyle = '#ffe2ea'; x.fillRect(6, 3, 3, 2);
    x.fillStyle = '#d0587e'; x.fillRect(13, 15, 5, 2); x.fillRect(4, 13, 3, 2); x.fillRect(16, 9, 2, 3); x.fillRect(11, 17, 3, 1);
    x.fillStyle = '#ffd6e2'; for (const [a, b] of [[13, 5], [4, 9], [15, 12], [9, 13]]) x.fillRect(a, b, 1, 1);
    return withShadow(outline(c, '#4a1a2a'), -12, -30, 9);
  }
  if (k === 'palm') {
    const [c, x] = canvas(24, 32);
    x.fillStyle = '#9a6a3a'; for (let i = 0; i < 18; i++) x.fillRect(11 + Math.round(Math.sin(i / 5) * 2), 13 + i, 3, 1);
    x.fillStyle = '#3a9a4a'; x.fillRect(2, 8, 10, 3); x.fillRect(12, 8, 10, 3); x.fillRect(6, 4, 6, 3); x.fillRect(13, 4, 6, 3); x.fillRect(0, 11, 4, 2); x.fillRect(20, 11, 4, 2);
    x.fillStyle = '#5aba5a'; x.fillRect(4, 8, 6, 1); x.fillRect(14, 8, 6, 1);
    x.fillStyle = '#7a4a22'; x.fillRect(10, 10, 2, 2); x.fillRect(13, 11, 2, 2);
    return withShadow(outline(c, '#173a1a'), -13, -32, 8);
  }
  if (k === 'rock') {
    const [c, x] = canvas(18, 16);
    x.fillStyle = '#b8603a'; x.fillRect(2, 4, 14, 11); x.fillRect(4, 1, 9, 3);
    x.fillStyle = '#d8805a'; x.fillRect(4, 3, 6, 2); x.fillRect(3, 5, 3, 4);
    x.fillStyle = '#8a3e22'; x.fillRect(2, 12, 14, 3); x.fillRect(11, 6, 2, 5);
    return withShadow(outline(c, '#3a1a0e'), -10, -16, 9);
  }
  if (k === 'cactus') {
    const [c, x] = canvas(16, 24);
    x.fillStyle = '#3a8a4a'; x.fillRect(6, 3, 5, 20); x.fillRect(1, 9, 3, 7); x.fillRect(1, 14, 6, 3); x.fillRect(13, 6, 3, 7); x.fillRect(10, 11, 5, 3);
    x.fillStyle = '#5aaa5a'; x.fillRect(7, 4, 1, 18); x.fillStyle = '#ff8fb1'; x.fillRect(7, 1, 3, 2);
    return withShadow(outline(c, '#173a1a'), -9, -24, 6);
  }
  if (k === 'lamp') {
    const [c, x] = canvas(8, 22);
    x.fillStyle = '#4e2c12'; x.fillRect(3, 8, 2, 14); x.fillRect(1, 20, 6, 2); x.fillStyle = '#7a4a24'; x.fillRect(3, 8, 1, 12); x.fillRect(1, 20, 6, 1);
    x.fillStyle = '#c43c32'; x.fillRect(1, 1, 6, 7); x.fillStyle = '#ffd36b'; x.fillRect(2, 2, 4, 5); x.fillStyle = '#fff1a8'; x.fillRect(2, 2, 2, 2);
    x.fillStyle = '#e8a83a'; x.fillRect(5, 3, 1, 4); x.fillStyle = '#2b1a0e'; x.fillRect(1, 0, 6, 1); x.fillRect(1, 8, 6, 1); x.fillRect(1, 4, 6, 1);
    return withShadow(outline(c), -5, -22, 4);
  }
  if (k === 'fountain') {
    const [c, x] = canvas(64, 64);
    const L = shadeHex(th.stone, 18), D2 = shadeHex(th.stoneD, -22);
    x.fillStyle = th.stoneD; x.fillRect(2, 30, 60, 30); x.fillStyle = th.stone; x.fillRect(2, 28, 60, 6); x.fillRect(2, 56, 60, 4);
    x.fillStyle = L; x.fillRect(2, 28, 60, 1); x.fillRect(2, 56, 60, 1); x.fillStyle = D2; x.fillRect(2, 33, 60, 1); x.fillRect(61, 28, 1, 32); x.fillRect(2, 59, 60, 1);
    for (let i = 8; i < 60; i += 12) { x.fillStyle = D2; x.fillRect(i, 28, 1, 5); x.fillRect(i - 4, 56, 1, 4); }
    x.fillStyle = th.water; x.fillRect(6, 34, 52, 20); x.fillStyle = shadeHex(th.water, -18); x.fillRect(6, 34, 52, 3);
    x.fillStyle = th.waterL; x.fillRect(10, 40, 12, 1); x.fillRect(36, 47, 14, 1); x.fillRect(14, 49, 6, 1); x.fillRect(44, 39, 6, 1);
    x.fillStyle = '#ffffff'; x.fillRect(29, 46, 2, 1); x.fillRect(35, 44, 1, 1);
    // statue: stylised ninja with crossed arms, lit from the left
    x.fillStyle = '#7a808a'; x.fillRect(26, 22, 12, 22); x.fillRect(24, 10, 16, 14); x.fillRect(27, 2, 10, 10);
    x.fillStyle = '#9aa0aa'; x.fillRect(26, 22, 8, 22); x.fillRect(24, 10, 10, 14); x.fillRect(27, 2, 7, 10);
    x.fillStyle = '#c9ccd4'; x.fillRect(28, 3, 3, 6); x.fillRect(25, 11, 3, 10); x.fillRect(27, 23, 2, 18);
    x.fillStyle = '#5a5f6a'; x.fillRect(24, 18, 16, 3); x.fillRect(37, 4, 1, 8); x.fillRect(39, 11, 1, 12);
    x.fillStyle = '#6a707a'; x.fillRect(31, 26, 1, 16);
    x.fillStyle = th.accent; x.fillRect(27, 6, 10, 2); x.fillStyle = '#e8ecf0'; x.fillRect(30, 6, 3, 2);
    x.fillStyle = shadeHex(th.water, 10); x.fillRect(24, 44, 16, 2);
    return { img: outline(c), ox: -1, oy: -61 };
  }
  if (k === 'gate') {
    const [c, x] = canvas(96, 52);
    x.fillStyle = '#c43c32'; x.fillRect(8, 10, 6, 42); x.fillRect(82, 10, 6, 42); x.fillRect(4, 6, 88, 6); x.fillRect(10, 18, 76, 4);
    x.fillStyle = '#e0584a'; x.fillRect(8, 10, 2, 38); x.fillRect(82, 10, 2, 38); x.fillRect(4, 6, 88, 1); x.fillRect(10, 18, 76, 1);
    x.fillStyle = '#8a2a22'; x.fillRect(12, 12, 2, 36); x.fillRect(86, 12, 2, 36); x.fillRect(10, 21, 76, 1); x.fillRect(4, 11, 88, 1);
    x.fillStyle = '#2b1a0e'; x.fillRect(0, 2, 96, 5); x.fillRect(7, 46, 8, 6); x.fillRect(81, 46, 8, 6);
    x.fillStyle = '#4a3020'; x.fillRect(0, 2, 96, 1); x.fillRect(-1, 1, 4, 2); x.fillRect(93, 1, 4, 2);
    x.fillStyle = '#2b1a0e'; x.fillRect(36, 9, 24, 12); x.fillStyle = '#f2c14a'; x.fillRect(38, 11, 20, 8); x.fillStyle = '#fff1a8'; x.fillRect(38, 11, 20, 1);
    drawText(x, 'GATE', 40, 13, '#5a3418');
    return { img: outline(c), ox: -1, oy: -53 };
  }
  if (k === 'building') return buildingSprite(p.b, th, village);
  return null;
}

// door curtain (noren) colour per building
const NOREN = { academy: '#c43c32', missions: '#2f5fa8', shop: '#3a8a4a', library: '#7a3ea0', kage: '#6a3a8a', hospital: '#e8e0cf', market: '#c8892f' };
function shadeHex(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.max(0, Math.min(255, v + amt));
  return '#' + ((1 << 24) | (f(n >> 16) << 16) | (f((n >> 8) & 255) << 8) | f(n & 255)).toString(16).slice(1);
}
// a hanging wooden name board, centred on cx with its top at y
function signBoard(x, cx, y, text) {
  const tw = textWidth(text), w = tw + 8, h = 11, x0 = Math.round(cx - w / 2);
  x.fillStyle = '#2b1a0e'; x.fillRect(x0 - 1, y - 1, w + 2, h + 2);
  x.fillStyle = '#5a3418'; x.fillRect(x0, y, w, h);
  x.fillStyle = '#7a4a24'; x.fillRect(x0, y, w, 1); x.fillRect(x0, y, 1, h);
  x.fillStyle = '#3e2410'; x.fillRect(x0, y + h - 1, w, 1); x.fillRect(x0 + w - 1, y, 1, h);
  x.fillStyle = '#c8a868'; x.fillRect(x0 + 1, y + 1, 1, 1); x.fillRect(x0 + w - 2, y + 1, 1, 1); x.fillRect(x0 + 1, y + h - 2, 1, 1); x.fillRect(x0 + w - 2, y + h - 2, 1, 1); // nails
  drawText(x, text, x0 + 4, y + 4, '#24140a');
  drawText(x, text, x0 + 4, y + 3, '#fff1c8');
}
function buildingSprite(b, th, village) {
  const W = b.w * T, H = b.h * T, roofH = b.tower ? 66 : b.big ? 40 : 30;
  const [c, x] = canvas(W + 8, H + roofH);
  const R = (col, a, bb, w, h) => { x.fillStyle = col; x.fillRect(a, bb, w, h); };
  const ox = 4, base = roofH + H; // wall bottom at y=base
  const cx = ox + W / 2;
  if (b.arena) {
    // stone arena wall: coursed blocks with highlights, crenellations, banners and a big gate
    R(th.stoneD, ox, roofH, W, H);
    for (let row = 0, yy = roofH + 6; yy < base; row++, yy += 8) {
      for (let xx = ox - (row % 2) * 6; xx < ox + W; xx += 12) {
        const a = Math.max(ox, xx), w = Math.min(ox + W, xx + 11) - a; if (w <= 0) continue;
        R(th.stone, a, yy, w, 7); R(shadeHex(th.stone, 18), a, yy, w, 1); R(shadeHex(th.stoneD, -18), a, yy + 6, w, 1);
      }
    }
    R(th.stone, ox, roofH, W, 6); R(shadeHex(th.stone, 22), ox, roofH, W, 1); R(shadeHex(th.stoneD, -20), ox, roofH + 5, W, 1);
    for (let i = 0; i < W; i += 12) { R(th.stone, ox + i, roofH - 6, 8, 6); R(shadeHex(th.stone, 22), ox + i, roofH - 6, 8, 1); R(shadeHex(th.stoneD, -10), ox + i + 7, roofH - 6, 1, 6); }
    for (let i = 8; i < W - 8; i += 24) {
      if (Math.abs(ox + i + 4 - cx) < 22) continue;
      R('#4e2c12', ox + i - 1, roofH + 8, 10, 1); R(th.accent, ox + i, roofH + 9, 8, 18); R(shadeHex(th.accent, -40), ox + i + 6, roofH + 9, 2, 18);
      R(th.accent, ox + i, roofH + 27, 3, 2); R(th.accent, ox + i + 5, roofH + 27, 3, 2); R('#fff4dc', ox + i + 3, roofH + 13, 2, 8); R('#fff4dc', ox + i + 2, roofH + 15, 4, 1);
    }
    // gate arch
    R('#2b1a0e', cx - 14, base - 32, 28, 32); R('#5a3a22', cx - 12, base - 30, 24, 30); R('#3e2410', cx - 12, base - 30, 24, 3);
    for (let i = -10; i < 12; i += 4) R('#4a2c16', cx + i, base - 27, 1, 27);
    R(th.stone, cx - 16, base - 34, 32, 3); R(shadeHex(th.stone, 22), cx - 16, base - 34, 32, 1);
    signBoard(x, cx, base - 48, 'ARENA');
  } else {
    // walls: plaster with a soft shadow under the eaves
    R('#f2e2c4', ox, roofH, W, H);
    R('#d9c39c', ox, roofH, W, 4); R('#e6d3ae', ox, roofH + 4, W, 3);
    for (let i = 0; i < W; i += 7) for (let j = 10; j < H - 8; j += 9) if (((i * 3 + j) % 5) === 0) R('#e8d6b4', ox + i, roofH + j, 2, 1);
    // stone foundation
    R(th.stoneD, ox, base - 6, W, 6); for (let i = 0; i < W; i += 8) { R(th.stone, ox + i + 1, base - 5, 6, 4); R(shadeHex(th.stone, 20), ox + i + 1, base - 5, 6, 1); }
    // timber frame: posts with lit and shaded edges, top beam and mid rail
    const posts = []; for (let i = 0; i <= W - 3; i += b.big ? 26 : 20) posts.push(i); posts.push(W - 3);
    for (const i of posts) { R('#7a4a2a', ox + i, roofH, 3, H - 6); R('#9a6a3a', ox + i, roofH, 1, H - 6); R('#4e2c12', ox + i + 2, roofH, 1, H - 6); }
    R('#7a4a2a', ox, roofH + 2, W, 3); R('#9a6a3a', ox, roofH + 2, W, 1); R('#4e2c12', ox, roofH + 4, W, 1);
    // windows: lit paper screens with lattice, frame and sill
    for (let i = 10; i < W - 14; i += b.big ? 26 : 20) {
      if (Math.abs(ox + i + 6 - cx) < 16) continue;
      const wx = ox + i, wy = roofH + 13;
      R('#3e2410', wx - 1, wy - 1, 14, 12); R('#ffe8a8', wx + 1, wy + 1, 10, 8); R('#fff6d0', wx + 1, wy + 1, 4, 3);
      R('#c89a58', wx + 6, wy + 1, 1, 8); R('#c89a58', wx + 1, wy + 5, 10, 1);
      R('#9a6a3a', wx - 2, wy + 10, 16, 2); R('#c8945a', wx - 2, wy + 10, 16, 1);
    }
    // door: frame, planks, noren curtain and a step
    const dw = b.big ? 22 : 14, dh = b.big ? 28 : 22, dx = cx - dw / 2, dy = base - dh;
    R('#3e2410', dx - 2, dy - 3, dw + 4, dh + 3); R('#8a5a32', dx, dy, dw, dh);
    for (let i = 3; i < dw; i += 4) R('#74482a', dx + i, dy, 1, dh);
    R('#a87444', dx, dy, 1, dh); R('#2b1a0e', cx - 1, dy + 6, 2, dh - 6);
    const nc = NOREN[b.id] || th.accent;
    R(nc, dx - 1, dy, dw + 2, b.big ? 10 : 8); R(shadeHex(nc, -45), dx - 1, dy + (b.big ? 9 : 7), dw + 2, 1); R(shadeHex(nc, 30), dx - 1, dy, dw + 2, 1);
    R('#3e2410', cx - 1, dy + 1, 1, b.big ? 9 : 7); R('#3e2410', cx - Math.round(dw / 4) - 1, dy + 2, 1, b.big ? 8 : 6); R('#3e2410', cx + Math.round(dw / 4), dy + 2, 1, b.big ? 8 : 6);
    if (b.id === 'hospital') { R('#c43c32', cx - 1, dy + 2, 2, 5); R('#c43c32', cx - 3, dy + 4, 6, 1); }
    R(th.stone, dx - 4, base - 2, dw + 8, 2); R(shadeHex(th.stone, 22), dx - 4, base - 2, dw + 8, 1);
    // name board above the door
    if (b.name) signBoard(x, cx, dy - 15, b.name.toUpperCase());
    // roof: tiled, with seams, highlights, an eave lip and ridge
    const roofCol = b.id === 'academy' ? '#c43c32' : b.id === 'kage' ? '#6a3a8a' : th.roof;
    const roofD = b.id === 'academy' ? '#8a2a22' : b.id === 'kage' ? '#45245c' : th.roofD;
    const roofL = shadeHex(roofCol, 34);
    const r0 = b.tower ? 30 : 0; // towers keep the top 30px for an upper storey
    for (let i = r0; i < roofH - 6; i++) {
      const inset = Math.round((roofH - 6 - i) * 0.35) - (b.tower ? 10 : 0);
      const rx = ox - 4 + inset, rw = W + 8 - inset * 2, row = Math.floor((i - r0) / 4), k = (i - r0) % 4;
      R(k === 3 ? roofD : roofCol, rx, i + 4, rw, 1);
      if (k === 0) R(roofL, rx + 1, i + 4, rw - 2, 1);
      if (k !== 3) for (let sx = rx + 3 + (row % 2) * 3; sx < rx + rw - 2; sx += 6) R(roofD, sx, i + 4, 1, 1);
      R(roofL, rx, i + 4, 1, 1); R(roofD, rx + rw - 1, i + 4, 1, 1);
    }
    R(roofD, ox - 6, roofH - 4, W + 12, 4); R(roofL, ox - 6, roofH - 4, W + 12, 1);
    R('#2b1a0e', ox - 6, roofH, W + 12, 1);
    R(roofL, ox - 6, roofH - 5, 3, 1); R(roofL, ox + W + 3, roofH - 5, 3, 1); // upturned eave tips
    if (!b.tower) { const top = Math.round((roofH - 6) * 0.35); R(roofD, ox - 2 + top, 3, W + 4 - top * 2, 2); R(roofL, ox - 2 + top, 3, W + 4 - top * 2, 1); }
    if (b.big && !b.tower) { R('#f2c14a', cx - 6, 6, 12, 4); R('#fff1a8', cx - 6, 6, 12, 1); R('#b8862a', cx - 6, 9, 12, 1); R(roofD, cx - 2, 0, 4, 6); }
    if (b.tower) { // upper storey + small pagoda roof + gold finial, and the village colour band
      R('#f2e2c4', cx - 26, 20, 52, 16); R('#d9c39c', cx - 26, 20, 52, 3); R('#7a4a2a', cx - 26, 20, 3, 16); R('#7a4a2a', cx + 23, 20, 3, 16); R('#7a4a2a', cx - 26, 20, 52, 2);
      for (const ddx of [-16, -4, 8]) { R('#3e2410', cx + ddx, 24, 8, 8); R('#ffe8a8', cx + ddx + 1, 25, 6, 6); R('#c89a58', cx + ddx + 4, 25, 1, 6); }
      for (let i = 0; i < 16; i++) { const w = 36 + i * 3; R(i % 4 === 3 ? roofD : i % 4 === 0 ? roofL : roofCol, cx - w / 2, 4 + i, w, 1); }
      R(roofD, cx - 32, 19, 64, 2); R(roofL, cx - 32, 19, 64, 1); R('#2b1a0e', cx - 32, 21, 64, 1);
      R('#f2c14a', cx - 1, 0, 2, 5); R('#f2c14a', cx - 3, 3, 6, 2); R('#fff1a8', cx - 1, 0, 1, 2);
      R(th.accent, ox + 2, roofH + 30, W - 4, 3);
    }
    // clan banners for houses
    if (b.id === 'house') { R(th.accent, ox + 6, roofH + 8, 5, 12); R(shadeHex(th.accent, -40), ox + 10, roofH + 8, 1, 12); R('#fff4dc', ox + 8, roofH + 11, 1, 5); }
  }
  const img = outline(c, '#24160e');
  // soft ground shadow along the front of the building, painted after the outline so it stays see-through
  const out = document.createElement('canvas'); out.width = img.width + 4; out.height = img.height + 3;
  const o = out.getContext('2d'); o.fillStyle = 'rgba(30,20,10,.22)'; o.fillRect(3, img.height - 2, img.width - 2, 4); o.fillRect(img.width - 1, roofH + 2, 4, img.height - roofH);
  o.drawImage(img, 0, 0);
  return { img: out, ox: -ox - 1, oy: -(roofH + H) - 1 + 1 };
}

// building collision footprint already covers walls; roofs overhang visually only.
