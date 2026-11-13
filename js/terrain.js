// Pixel-art battlefields: per-biome hex tiles (pixel-perfect, bevelled), scenery around the grid, and obstacles.
import { outline } from './sprites.js?v=9d1c820';

// base: 3 tile shades; L/D: bevel light/dark; grout: gaps between tiles; out: ground beyond the grid;
// tex: texture pixel colours; deco: accent pixels (flowers, pebbles...); prop: scenery kind around the edge; rock: obstacle style
export const BIOMES = {
  grass: { base: ['#5fae50', '#58a64a', '#529e45'], L: '#86cc6c', D: '#3f8a3e', grout: '#2f6a32', out: '#3d7c3a', outT: ['#4a8c42', '#336a30'], tex: ['#4a9640', '#78c060'], deco: ['#ff9fbf', '#fff1a8', '#ffffff'], prop: 'tree', rock: 'boulder' },
  sand: { base: ['#e8c88a', '#e2c07f', '#dbb876'], L: '#f8e0ac', D: '#c4975c', grout: '#a87c4a', out: '#d4a868', outT: ['#e0b878', '#c0904e'], tex: ['#d4ad6c', '#f0d49c'], deco: ['#b8854a', '#9a6a3a'], prop: 'dune', rock: 'sandstone' },
  marsh: { base: ['#6aa46a', '#629c62', '#5a945a'], L: '#8cc48a', D: '#457a48', grout: '#2c5a40', out: '#3a7aa0', outT: ['#4a8ab0', '#2e6a90'], tex: ['#4e8a52', '#86ba80'], deco: ['#4a8ab0', '#7cbfe0'], prop: 'reeds', rock: 'mossy' },
  snow: { base: ['#e6eef4', '#dde8f0', '#d4e2ec'], L: '#ffffff', D: '#a8bccc', grout: '#7e98ac', out: '#c4d4e0', outT: ['#d4e2ec', '#a8bccc'], tex: ['#c8d8e4', '#ffffff'], deco: ['#9fd8ff', '#b8ccdc'], prop: 'snowpine', rock: 'ice' },
  stone: { base: ['#b8b0a0', '#b0a898', '#a89f8e'], L: '#d4ccbc', D: '#857c6c', grout: '#5c5446', out: '#4e4a42', outT: ['#5a564c', '#403c36'], tex: ['#9a9282', '#c4bcac'], deco: ['#6a8a4a', '#7a9a5a'], prop: 'lantern', rock: 'boulder' },
  night: { base: ['#6a6488', '#625c80', '#5a5478'], L: '#8a84a8', D: '#46405e', grout: '#2e2a40', out: '#2a2640', outT: ['#36304e', '#201c32'], tex: ['#544e70', '#7a74a0'], deco: ['#d8b0ff', '#fff1a8'], prop: 'crystal', rock: 'obsidian' },
  dojo: { base: ['#c8945a', '#c08c54', '#b8844e'], L: '#e0b07a', D: '#8a5a32', grout: '#5a3418', out: '#6a4024', outT: ['#7a4a2a', '#5a3418'], tex: ['#b07c48', '#d4a06a'], deco: ['#9a6a3a'], prop: 'dojo', rock: 'dummy' },
  arena: { base: ['#d8b890', '#d0b088', '#c8a880'], L: '#ecd0aa', D: '#a8885e', grout: '#7a6244', out: '#8a8276', outT: ['#9a9286', '#6a6258'], tex: ['#c0a078', '#e4c8a0'], deco: ['#a8885e'], prop: 'banner', rock: 'boulder' },
};
// which battlefield each quest line / boss lair uses
export const LINE_BIOME = { iron: 'grass', serpent: 'marsh', shrine: 'stone', mist: 'marsh', sands: 'sand', eclipse: 'night' };
export const VILLAGE_BIOME = { pine: 'grass', dune: 'sand', tide: 'marsh' };

function rng(seed) { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
const mix = (a, b, t) => { const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16), c = (s) => Math.round(((pa >> s) & 255) * (1 - t) + ((pb >> s) & 255) * t); return '#' + ((1 << 24) | (c(16) << 16) | (c(8) << 8) | c(0)).toString(16).slice(1); };

// centres: [{c, r, x, y}], s: hex radius, hw: hex width
export function paintTerrain(biome, centres, s, hw, W, H, seed = 7) {
  const B = BIOMES[biome] || BIOMES.grass, R = rng(seed);
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const x = cv.getContext('2d');
  const P = (col, a, b, w = 1, h = 1) => { x.fillStyle = col; x.fillRect(a, b, w, h); };
  // ground beyond the grid, dithered
  P(B.out, 0, 0, W, H);
  for (let i = 0; i < W * H / 14; i++) P(B.outT[(R() * 2) | 0], (R() * W) | 0, (R() * H) | 0, 1 + ((R() * 2) | 0), 1);
  // which hex owns each pixel (or -1); inside test for a pointy-top hex of radius rr
  const own = new Int16Array(W * H).fill(-1), rr = s - 0.9, half = hw / 2 - 0.9;
  centres.forEach((h, i) => {
    for (let py = Math.floor(h.y - s); py <= Math.ceil(h.y + s); py++) for (let px = Math.floor(h.x - hw / 2); px <= Math.ceil(h.x + hw / 2); px++) {
      if (px < 0 || py < 0 || px >= W || py >= H) continue;
      const dx = Math.abs(px + 0.5 - h.x), dy = Math.abs(py + 0.5 - h.y);
      if (dx <= half && dy <= rr - dx * (rr / 2) / half) own[py * W + px] = i;
    }
  });
  // grout shadow band under the whole grid so tiles read as laid on the ground
  for (let py = 0; py < H; py++) for (let px = 0; px < W; px++) {
    if (own[py * W + px] >= 0) continue;
    const near = (dx, dy) => { const a = px + dx, b = py + dy; return a >= 0 && b >= 0 && a < W && b < H && own[b * W + a] >= 0; };
    if (near(-1, 0) || near(1, 0) || near(0, -1) || near(0, 1) || near(0, -2) || near(-1, -1) || near(1, -1)) P(B.grout, px, py);
  }
  // tiles: shade per hex, texture, bevel
  const shade = centres.map(() => B.base[(R() * 3) | 0]);
  for (let py = 0; py < H; py++) for (let px = 0; px < W; px++) {
    const i = own[py * W + px]; if (i < 0) continue;
    const o = (dx, dy) => { const a = px + dx, b = py + dy; return a < 0 || b < 0 || a >= W || b >= H ? -1 : own[b * W + a]; };
    let col = shade[i];
    if (o(0, -1) !== i || o(-1, 0) !== i) col = B.L;              // lit top/left edge
    else if (o(0, 1) !== i || o(1, 0) !== i) col = B.D;           // shaded bottom/right edge
    else if (o(0, 2) !== i) col = mix(shade[i], B.D, 0.5);        // soft inner shadow
    P(col, px, py);
  }
  // texture inside each tile
  centres.forEach((h, i) => {
    const inside = (a, b) => a >= 0 && b >= 0 && a < W && b < H && own[b * W + a] === i && own[(b - 1) * W + a] === i && own[(b + 1) * W + a] === i && own[b * W + a - 1] === i && own[b * W + a + 1] === i;
    const n = 5 + ((R() * 5) | 0);
    for (let k = 0; k < n; k++) {
      const a = Math.round(h.x - hw / 2 + 3 + R() * (hw - 6)), b = Math.round(h.y - s + 4 + R() * (s * 2 - 8)); if (!inside(a, b)) continue;
      if (biome === 'grass' || biome === 'marsh') { P(B.tex[0], a, b, 1, 2); P(B.tex[1], a + 1, b, 1, 1); }
      else if (biome === 'dojo') { P(B.tex[0], a - 2, b, 5, 1); }
      else if (biome === 'stone' || biome === 'night') { P(B.tex[0], a, b, 2, 1); P(B.tex[1], a, b - 1, 2, 1); }
      else { P(B.tex[(k % 2)], a, b, 1, 1); }
    }
    if (R() < 0.35) { const a = Math.round(h.x - 4 + R() * 8), b = Math.round(h.y - 5 + R() * 10); if (inside(a, b)) { const d = B.deco[(R() * B.deco.length) | 0]; P(d, a, b); if (biome === 'grass') { P(d, a + 1, b); P('#3f8a3e', a, b + 1); } if (biome === 'marsh') P(d, a + 1, b, 2, 1); } }
    if (biome === 'dojo') { P(B.D, Math.round(h.x - hw / 2 + 2), Math.round(h.y), Math.round(hw - 4), 1); } // floor boards
  });
  // scenery in the margins
  const free = (a, b, w, hh) => { for (let yy = b; yy < b + hh; yy++) for (let xx = a; xx < a + w; xx++) if (xx >= 0 && yy >= 0 && xx < W && yy < H && own[yy * W + xx] >= 0) return false; return a >= -4 && b >= -6 && a + w <= W + 4; };
  const sprite = PROPS[B.prop];
  if (sprite) for (let k = 0; k < 90; k++) {
    const img = sprite(R), a = Math.round(R() * W) - 6, b = Math.round(R() * H) - 8;
    if (free(a - 2, b, img.width + 4, img.height + 2)) x.drawImage(img, a, b);
  }
  return cv;
}

// ---------- scenery props (small, outlined) ----------
function spr(w, h, draw, ol = '#1c1410') { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d')); return outline(c, ol); }
const R_ = (x, col, a, b, w = 1, h = 1) => { x.fillStyle = col; x.fillRect(a, b, w, h); };
const cacheP = {};
const variants = (key, n, make) => (R) => { const arr = cacheP[key] || (cacheP[key] = Array.from({ length: n }, (_, i) => make(i))); return arr[(R() * n) | 0]; };
const PROPS = {
  tree: variants('tree', 3, (i) => spr(14, 18, (x) => { R_(x, '#5a3418', 6, 12, 3, 6); R_(x, '#2e6b35', 1, 2, 12, 11); R_(x, '#245c30', 7, 3, 6, 10); R_(x, '#4a9a4e', 3, 2, 4, 2); R_(x, '#3a8040', 2, 5, 2, 3); if (i === 1) R_(x, '#ff9fbf', 4, 6, 2, 2); if (i === 2) { R_(x, '#2e6b35', 3, 0, 8, 2); } })),
  dune: variants('dune', 2, (i) => spr(16, 7, (x) => { R_(x, '#e0b878', 2, 1, 10, 2); R_(x, '#c99a5e', 0, 3, 16, 3); R_(x, '#f0d49c', 4, 1, 5, 1); if (i) R_(x, '#3a8a4a', 12, 0, 2, 3); }, '#8a6030')),
  reeds: variants('reeds', 3, (i) => spr(10, 12, (x) => { for (let k = 0; k < 4; k++) R_(x, k % 2 ? '#4e8a52' : '#6aa868', 1 + k * 2, 3 + (k % 2), 1, 9); R_(x, '#8a5a32', 3, 1, 1, 3); R_(x, '#8a5a32', 7, 2, 1, 3); if (i === 2) R_(x, '#6ab05a', 0, 9, 9, 2); }, '#1c3a24')),
  snowpine: variants('snowpine', 2, () => spr(12, 18, (x) => { R_(x, '#5a3418', 5, 14, 2, 4); for (let k = 0; k < 3; k++) { const w = 11 - k * 3; R_(x, '#2e6b5a', 6 - w / 2, 11 - k * 4, w, 4); R_(x, '#ffffff', 6 - w / 2, 11 - k * 4, w, 1); } R_(x, '#ffffff', 5, 0, 2, 2); }, '#1c2a34')),
  lantern: variants('lantern', 2, (i) => spr(8, 16, (x) => { R_(x, '#8a8272', 2, 6, 4, 9); R_(x, '#a8a090', 1, 4, 6, 3); R_(x, '#6a6252', 0, 14, 8, 2); R_(x, i ? '#ffd36b' : '#6a6252', 3, 8, 2, 2); R_(x, '#a8a090', 2, 1, 4, 3); }, '#2a241c')),
  crystal: variants('crystal', 2, (i) => spr(8, 12, (x) => { R_(x, '#9a5ad0', 2, 2, 4, 9); R_(x, '#d8b0ff', 2, 3, 1, 6); R_(x, '#5a2a8a', 5, 3, 1, 8); R_(x, '#9a5ad0', 3, 0, 2, 2); if (i) { R_(x, '#9a5ad0', 0, 6, 2, 5); R_(x, '#d8b0ff', 0, 7, 1, 2); } }, '#1a1028')),
  dojo: variants('dojo', 2, (i) => spr(10, 14, (x) => { if (i) { R_(x, '#e8e0cf', 1, 0, 8, 12); R_(x, '#c43c32', 3, 3, 4, 4); R_(x, '#5a3418', 0, 12, 10, 2); } else { R_(x, '#5a3418', 4, 0, 2, 14); R_(x, '#c8945a', 1, 3, 8, 2); R_(x, '#c8945a', 2, 8, 6, 2); } }, '#2a1a0e')),
  banner: variants('banner', 2, (i) => spr(8, 16, (x) => { R_(x, '#5a3418', 0, 0, 8, 1); R_(x, i ? '#c43c32' : '#2f5fa8', 1, 1, 6, 12); R_(x, '#f2c14a', 3, 4, 2, 4); R_(x, i ? '#c43c32' : '#2f5fa8', 1, 13, 2, 2); R_(x, i ? '#c43c32' : '#2f5fa8', 5, 13, 2, 2); }, '#1c1410')),
};

// ---------- obstacles on the grid ----------
const ROCK = {
  boulder: ['#7a6a58', '#9a8a74', '#bcae96', '#5a4a3a'],
  sandstone: ['#b8783e', '#d0945a', '#ecb880', '#8a5428'],
  mossy: ['#6a6a5a', '#8a8a76', '#a8a892', '#4a4a3c', '#5a9a4a'],
  ice: ['#8ab8d8', '#b8dcf0', '#ffffff', '#5a88a8'],
  obsidian: ['#2e2a3e', '#46405e', '#8a7ab8', '#1a1628'],
};
const rockCache = {};
export function obstacleSprite(biome, variant = 0) {
  const B = BIOMES[biome] || BIOMES.grass, k = B.rock + variant;
  if (rockCache[k]) return rockCache[k];
  let img;
  if (B.rock === 'dummy') { // training dummy for the dojo
    img = spr(14, 22, (x) => { R_(x, '#5a3418', 6, 6, 2, 16); R_(x, '#c8945a', 3, 0, 8, 7); R_(x, '#e0b07a', 3, 0, 3, 2); R_(x, '#8a5a32', 9, 1, 2, 6); R_(x, '#c8945a', 0, 8, 14, 3); R_(x, '#8a5a32', 0, 10, 14, 1); R_(x, '#c8945a', 4, 12, 6, 6); R_(x, '#c43c32', 4, 14, 6, 1); });
  } else {
    const [c, m, l, d, moss] = ROCK[B.rock] || ROCK.boulder;
    img = spr(20, 15, (x) => {
      const shape = variant % 2
        ? ['.....mmmmm..........', '...mmllmmmmm........', '..mllmmmmmmmc.......', '.mlmmmmmmmmmcc..mmm.', 'mlmmmmmmmmmccc.mlmmc', 'mmmmmmmmmmccccmmmmcc', 'mmmmmmmmcccccccmmccc', 'cmmmmmmccccccccccccd', 'ccmmmccccccccccccddd', '.ccccccccccccccddd..', '..ddddddddddddddd...']
        : ['......mmmmmm........', '....mmllllmmmm......', '...mllmmmmmmmmc.....', '..mlmmmmmmmmmmcc....', '.mlmmmmmmmmmmmccc...', 'mlmmmmmmmmmmmcccc...', 'mmmmmmmmmmmmccccc...', 'cmmmmmmmmmmcccccd...', 'ccmmmmmmmccccccdd...', '.cccccccccccccddd...', '..ddddddddddddd.....'];
      shape.forEach((row, j) => { for (let i = 0; i < row.length; i++) { const ch = row[i]; if (ch === '.') continue; x.fillStyle = ch === 'm' ? m : ch === 'l' ? l : ch === 'c' ? c : d; x.fillRect(i, j + 3, 1, 1); } });
      if (moss) { R_(x, moss, 5, 3, 4, 1); R_(x, moss, 4, 4, 2, 1); R_(x, moss, 15, 6, 2, 1); }
      if (B.rock === 'ice') { R_(x, '#ffffff', 4, 6, 1, 3); R_(x, '#ffffff', 9, 4, 2, 1); }
      if (B.rock === 'obsidian') { R_(x, '#d8b0ff', 6, 7, 1, 1); R_(x, '#d8b0ff', 12, 9, 1, 1); }
    }, '#1c1410');
  }
  return (rockCache[k] = img);
}
