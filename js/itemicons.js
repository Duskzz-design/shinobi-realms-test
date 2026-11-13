// Pixel-art icons for every weapon and armour piece (16x16, auto-outlined to 18x18).
// gearIconHTML(id) returns an <img> to drop into any screen in place of an emoji.
import { outline } from './sprites.js?v=9d1c820';

const sh = (hex, amt) => {
  const n = parseInt(hex.slice(1), 16), f = (v) => Math.max(0, Math.min(255, v + amt));
  return '#' + ((1 << 24) | (f(n >> 16) << 16) | (f((n >> 8) & 255) << 8) | f(n & 255)).toString(16).slice(1);
};

function blank() { const c = document.createElement('canvas'); c.width = 16; c.height = 16; return c; }
function kit(c) {
  const x = c.getContext('2d');
  const P = (col, px, py, w = 1, h = 1) => { x.fillStyle = col; x.fillRect(px, py, w, h); };
  const pts = (col, list) => { for (const [a, b] of list) P(col, a, b); };
  const line = (col, x0, y0, x1, y1) => { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) || 1; for (let i = 0; i <= n; i++) P(col, Math.round(x0 + (x1 - x0) * i / n), Math.round(y0 + (y1 - y0) * i / n)); };
  const rows = (col, x0, y0, spec) => spec.forEach((r, j) => { for (let i = 0; i < r.length; i++) if (r[i] !== '.') P(typeof col === 'string' ? col : col[r[i]], x0 + i, y0 + j); });
  return { x, P, pts, line, rows };
}

// ---------- weapons: blade runs from the hilt (bottom-left) to the tip (top-right) ----------
// blade: list of [x,y] pixels for the blade body; edge: highlight pixels
function sword(c, o) {
  const { P, pts, line } = kit(c);
  // blade (2px wide diagonal) with light edge and dark spine
  const len = o.len || 9, x0 = 6, y0 = 9;
  const edge = o.edge || sh(o.blade, 45), spine = o.spine || sh(o.blade, -50);
  for (let i = 0; i < len; i++) {
    const bx = x0 + i, by = y0 - i - (o.curve && i > len / 2 ? Math.min(o.curve, Math.floor((i - len / 2) / 2)) : 0);
    if (i < len - 1) { P(spine, bx, by + 1); P(o.blade, bx, by); P(edge, bx + 1, by); }
    else P(edge, bx, by); // pointed tip
  }
  // guard (perpendicular), handle with wrap, pommel
  if (o.tsuba) { P(o.guard, 4, 9, 3, 3); P(sh(o.guard, 50), 4, 9, 2, 1); P(sh(o.guard, -50), 6, 11, 1, 1); }
  else { line(o.guard, 3, 8, 7, 12); P(sh(o.guard, 45), 3, 8); }
  const hl = o.short ? 3 : 4;
  for (let i = 0; i < hl; i++) { P(o.hilt, 4 - i, 12 + i); P(i % 2 ? (o.wrap || o.hilt) : sh(o.hilt, -30), 5 - i, 12 + i); }
  P(o.pommel || o.guard, 4 - hl, 12 + hl); P(o.pommel || o.guard, 5 - hl, 12 + hl);
  if (o.extra) o.extra({ P, pts, line });
}
const WEAPONS = {
  tanto: (c) => sword(c, { blade: '#d6dae2', guard: '#8a8f9c', hilt: '#5a3a22', wrap: '#2b1a0e', len: 6, short: true }),
  katana: (c) => sword(c, { blade: '#e4e8ee', spine: '#8a8f9c', guard: '#f2c14a', hilt: '#e8e0cf', wrap: '#2b2b38', len: 10, curve: 1, tsuba: true, pommel: '#2b2b38' }),
  anbu_blade: (c) => sword(c, { blade: '#c9ccd4', spine: '#5a5f6a', guard: '#5a5f6a', hilt: '#3a3e48', wrap: '#1d1d24', len: 9, solidEdge: true, pommel: '#1d1d24' }),
  fangblade: (c) => sword(c, { blade: '#7fd88a', spine: '#2e7a3a', edge: '#d8ffd8', guard: '#e8e0cf', hilt: '#2e5a34', wrap: '#1d3a22', len: 9, curve: 2,
    extra: ({ P }) => { P('#c43c32', 4, 10); } }),
  thunderclap: (c) => sword(c, { blade: '#ffe07a', spine: '#c89a2a', edge: '#fffbe0', guard: '#f2c14a', hilt: '#2b2b38', wrap: '#f2c14a', len: 9,
    extra: ({ pts }) => { pts('#7ac8ff', [[8, 8], [9, 8], [11, 6], [12, 6]]); } }),
  mistcutter: (c) => sword(c, { blade: '#c8ecf6', spine: '#6a9ab4', edge: '#ffffff', guard: '#e8f4ff', hilt: '#3a5a7a', wrap: '#e8f4ff', len: 10, curve: 1, tsuba: true,
    extra: ({ pts }) => { pts('#e8f4ff', [[7, 9], [8, 9], [10, 7]]); } }),
  duskfang: (c) => sword(c, { blade: '#c49af0', spine: '#6a3aa0', edge: '#f0e0ff', guard: '#f2c14a', hilt: '#2a1a3a', wrap: '#9a5ad0', len: 9, curve: 1,
    extra: ({ pts }) => { pts('#f2c14a', [[2, 9], [3, 9], [2, 10]]); } }),
  stingblade: (c) => { // scorpion stinger: segmented amber blade with a hooked tip
    const { P, pts, line } = kit(c);
    const seg = [[6, 9], [7, 8], [8, 7], [9, 6], [10, 5], [11, 4], [12, 3], [13, 3], [14, 4]];
    seg.forEach(([a, b], i) => { P('#f0a848', a, b); P('#b86a1e', a, b + 1); if (i % 2) P('#ffd890', a, b - 1); });
    pts('#c43c32', [[14, 5], [13, 6]]); P('#ffd890', 13, 2);
    line('#c43c32', 3, 8, 7, 12); P('#ff6a4a', 3, 8);
    for (let i = 0; i < 4; i++) { P('#5a2a1a', 4 - i, 12 + i); P(i % 2 ? '#c43c32' : '#3a1a10', 5 - i, 12 + i); }
    P('#c43c32', 0, 15); P('#c43c32', 1, 15);
  },
  cleaver: (c) => { // warlord's cleaver: broad rectangular chopping blade on a stout handle
    const { P, rows } = kit(c);
    rows({ b: '#b4b9c2', l: '#e4e8ee', d: '#6a707a', h: '#24160e', r: '#8a2a22' }, 4, 1, [
      '....lllllll', '...lbbbbbbbl', '..lbbbbbbbbl', '.lbbbbbbbhbd', 'lbbbbbbbbbbd', 'lbbbbbbbbbd.', 'rbbbbbbbbd..', 'rrdddddd....']);
    for (let i = 0; i < 6; i++) { P('#6a4024', 1 + i, 14 - i); P('#3a2414', 2 + i, 14 - i); }
    P('#c9ccd4', 4, 11); P('#c9ccd4', 5, 10); P('#8a8f9c', 0, 15); P('#8a8f9c', 1, 15);
  },
};

// ---------- armour ----------
function headband(c, cloth, big) {
  const { P, rows } = kit(c);
  const cd = sh(cloth, -40), cl = sh(cloth, 35);
  P(cloth, 0, 6, 16, 4); P(cl, 0, 6, 16, 1); P(cd, 0, 9, 16, 1);
  // tails trailing from the knot
  P(cloth, 12, 10, 2, 4); P(cd, 13, 10, 1, 4); P(cloth, 14, 10, 2, 3); P(cd, 15, 11, 1, 2); P(cl, 12, 10, 1, 1);
  const x0 = big ? 2 : 4, w = big ? 10 : 8;
  P('#d6dae2', x0, 4, w, 8); P('#ffffff', x0, 4, w, 1); P('#ffffff', x0, 4, 1, 7); P('#8a8f9c', x0, 11, w, 1); P('#8a8f9c', x0 + w - 1, 5, 1, 7);
  P('#5a5f6a', x0 + 1, 5); P('#5a5f6a', x0 + w - 2, 5); P('#5a5f6a', x0 + 1, 10); P('#5a5f6a', x0 + w - 2, 10); // rivets
  rows('#5a5f6a', x0 + Math.round(w / 2) - 2, 6, ['.##.', '#..#', '#.#.', '.#..']); // engraved swirl
}
function torso(c, col, opts = {}) { // sleeveless vest silhouette
  const { P, rows } = kit(c);
  const L = sh(col, 30), D = sh(col, -40);
  rows({ c: col, l: L, d: D }, 1, 1, [
    '...ccc....ccc...', '..lccc....cccd..', '.lccccc..ccccdd.', '.lcccccccccccdd.', '.lcccccccccccdd.', '..lccccccccccd..', '..lccccccccccd..',
    '..lccccccccccd..', '..lccccccccccd..', '..lccccccccccd..', '..lccccccccccd..', '..lccccccccccd..', '..dddddddddddd..']);
  if (opts.skinNeck) P('#f5c99b', 7, 1, 2, 2);
}
const ARMOUR = {
  genin_head: (c) => headband(c, '#2b4fa0', false),
  flak_head: (c) => headband(c, '#4e5e34', true),
  anbu_head: (c) => { // porcelain animal mask
    const { P, rows } = kit(c);
    rows({ w: '#eef0f2', s: '#c8ccd4', r: '#c43c32', e: '#20162a' }, 2, 0, [
      'ww........ww', 'wsw......wsw', 'wwww....wwww', '.wwwwwwwwww.', 'wwwwwwwwwwws', 'wwrwwwwwwrws', 'weeewwwweees', 'wwrwwwwwwrws',
      'wwrwwwwwwrws', '.wwwwrrwwws.', '.wwwwwwwwws.', '..wwwwwwss..', '...wwwwss...', '....wss.....']);
    P('#ffffff', 3, 4, 2, 1); P('#ffffff', 3, 5, 1, 2);
  },
  iron_helm: (c) => { // iron kabuto: dome, brim, cheek guards and a nose guard
    const { P, rows } = kit(c);
    rows({ c: '#8a8f9c', l: '#c9ccd4', w: '#ffffff', d: '#5a5f6a', r: '#3a3e48', g: '#f2c14a' }, 1, 1, [
      '.....gg.gg.....', '......ggg......', '....lccccccd....', '...lwccccccdd...', '..lwcccccccccd..', '..lccccccccccd..', '.rrrrrrrrrrrrrr.', 'lccc..cddc..cccd',
      'lccc...dd...cccd', '.lcc...dd...ccd.', '.lcc...dd...ccd.', '..dd........dd..']);
    P('#ffffff', 4, 7); P('#ffffff', 8, 7); P('#ffffff', 12, 7);
  },
  reaper_hood: (c) => {
    const { P, rows } = kit(c);
    rows({ c: '#3a3e4a', l: '#545a6a', d: '#24262e', k: '#120e16', e: '#9ae0ff' }, 1, 0, [
      '......cc......', '....lcccc.....', '...lccccccd...', '..lcccccccccd..', '..lccckkkkccd..', '.lcckkkkkkkccd.', '.lcckkekkekccd.', '.lcckkkkkkkccd.',
      '.lccckkkkkcccd.', 'lcccccccccccccd', 'lcccccccccccccd', 'lcccccdcdccccdd', 'cccccddcddcccdd', 'dddddd..ddddddd']);
  },
  eclipse_crown: (c) => {
    const { P, rows } = kit(c);
    rows({ g: '#f2c14a', l: '#fff1a8', d: '#b8862a', p: '#9a5ad0', q: '#d8b0ff', m: '#e8ecf0' }, 1, 2, [
      '......mm......', '.g...mmm....g.', '.g..mm..g...g.', 'lgg.mm.ggg.ggd', 'lggg.mggggggdd', 'lgggggggggggdd', 'llggggpqgggddd', 'lgggggppggggdd', 'dddddddddddddd']);
    P('#d8b0ff', 2, 5); P('#d8b0ff', 13, 5);
  },
  genin_chest: (c) => {
    torso(c, '#2f4a7a', { skinNeck: true }); const { P, line } = kit(c);
    line('#6a4024', 3, 2, 12, 11); line('#8a5a34', 4, 2, 13, 11); P('#c8a070', 9, 10, 3, 3); P('#8a6a3a', 9, 12, 3, 1); P('#f2c14a', 10, 10);
  },
  flak_chest: (c) => {
    torso(c, '#5f7040', { skinNeck: true }); const { P } = kit(c);
    P('#7a8c52', 3, 1, 3, 2); P('#7a8c52', 10, 1, 3, 2); P('#44522c', 7, 3, 2, 10); P('#2b3218', 7, 3, 1, 10); // collar roll + zip
    for (const px of [3, 10]) { P('#7a8c52', px, 6, 3, 3); P('#44522c', px, 6, 3, 1); P('#7a8c52', px, 10, 3, 2); P('#44522c', px, 10, 3, 1); }
  },
  anbu_chest: (c) => {
    torso(c, '#3a3d48'); const { P } = kit(c);
    P('#d8dce2', 3, 4, 10, 7); P('#f4f6f8', 3, 4, 10, 1); P('#f4f6f8', 3, 4, 1, 6); P('#9aa0aa', 3, 10, 10, 1); P('#9aa0aa', 12, 5, 1, 6);
    P('#9aa0aa', 7, 5, 2, 5); P('#1d1d24', 4, 2, 2, 2); P('#1d1d24', 10, 2, 2, 2); P('#c43c32', 5, 6); P('#c43c32', 10, 6);
  },
  hollow_plate: (c) => {
    torso(c, '#30333c'); const { P, pts } = kit(c);
    P('#4a4e5a', 3, 3, 10, 9); P('#6a707c', 3, 3, 10, 1); P('#6a707c', 3, 3, 1, 8); P('#24262e', 12, 4, 1, 8);
    pts('#ffe07a', [[9, 4], [8, 5], [7, 6], [8, 7], [9, 7], [8, 8], [7, 9], [6, 10]]); pts('#fffbe0', [[9, 4], [8, 7]]);
  },
  kings_mantle: (c) => { // red cape with a gold collar and clasp
    const { P, rows } = kit(c);
    rows({ r: '#a8282a', l: '#d8484a', d: '#701a1c', g: '#f2c14a', y: '#fff1a8' }, 1, 1, [
      '...gggggggg...', '..gyggggggggd..', '.rlrg....grrrd.', '.rlrr....rrrdd.', 'rlrrr....rrrrdd', 'rlrrr....rrrrdd', 'rlrrrr..rrrrrdd', 'rlrrrrrrrrrrrdd',
      'rlrrrrrrrrrrrdd', 'rlrrdrrrrdrrrdd', 'rlrrdrrrrdrrrdd', 'rrrdrrrdrrrdrdd', 'dddddddddddddd.']);
    P('#f2c14a', 7, 2, 2, 2); P('#c43c32', 7, 2); P('#fff1a8', 8, 2);
  },
};
function bracer(c, col, light, dark, pattern) {
  const { P } = kit(c);
  // a forearm guard seen at an angle, with the hand poking out of the top
  P('#f5c99b', 9, 0, 3, 3); P('#d8a878', 11, 1, 1, 2); P('#f5c99b', 12, 2, 1, 1);
  for (let j = 0; j < 11; j++) { const xo = 9 - Math.round(j * 0.45); P(col, xo - 2, 3 + j, 6, 1); P(light, xo - 2, 3 + j, 1, 1); P(dark, xo + 3, 3 + j, 1, 1); }
  pattern(P);
}
const ARMS = {
  genin_arms: (c) => bracer(c, '#e8e0cf', '#ffffff', '#b8ad98', (P) => { for (let j = 0; j < 11; j += 2) { const xo = 9 - Math.round(j * 0.45); P('#c2b8a4', xo - 1, 3 + j, 4, 1); } }),
  flak_arms: (c) => bracer(c, '#7a8088', '#a0a6ae', '#4a4f58', (P) => { P('#c9ccd4', 6, 6, 4, 3); P('#ffffff', 6, 6, 3, 1); P('#5a5f68', 4, 11, 5, 1); P('#5a5f68', 7, 4, 5, 1); }),
  anbu_arms: (c) => bracer(c, '#e8ecf0', '#ffffff', '#9aa0aa', (P) => { P('#1d1d24', 7, 5, 5, 1); P('#1d1d24', 5, 10, 5, 1); P('#c43c32', 7, 7, 2, 1); }),
  scale_bracers: (c) => bracer(c, '#3a8a5a', '#6ac08a', '#1d4a2e', (P) => { for (let j = 0; j < 10; j += 2) for (let i = 0; i < 4; i += 2) { const xo = 9 - Math.round(j * 0.45); P('#6ac08a', xo - 1 + i + (j % 4 ? 1 : 0), 4 + j, 1, 1); P('#245c3a', xo - 1 + i + (j % 4 ? 1 : 0), 5 + j, 1, 1); } }),
  sandshell_bracers: (c) => bracer(c, '#d8b070', '#f0d49a', '#8a6030', (P) => { for (let j = 1; j < 11; j += 3) { const xo = 9 - Math.round(j * 0.45); P('#a8803e', xo - 2, 3 + j, 6, 1); P('#f0d49a', xo - 1, 2 + j, 3, 1); } }),
};
function greave(c, col, light, dark, pattern, sandal = true) {
  const { P, rows } = kit(c);
  rows({ c: col, l: light, d: dark }, 4, 0, ['lcccccd', 'lcccccd', 'lcccccd', 'lcccccd', 'lcccccd', 'lcccccd', 'lcccccd', 'lcccccd', 'lcccccd', 'lccccccd']);
  // foot
  P(sandal ? '#f5c99b' : col, 4, 10, 9, 3); P(sandal ? '#d8a878' : dark, 4, 12, 9, 1); if (!sandal) P(light, 4, 10, 1, 2);
  P('#4a3020', 3, 13, 11, 2); P('#2e1c12', 3, 14, 11, 1); P('#6a4430', 3, 13, 11, 1);
  if (sandal) { P('#4a3020', 7, 10, 1, 3); P('#4a3020', 10, 11, 1, 2); }
  pattern(P);
}
const LEGS = {
  genin_legs: (c) => greave(c, '#e8e0cf', '#ffffff', '#b8ad98', (P) => { for (let j = 1; j < 10; j += 2) P('#c2b8a4', 5, j, 5, 1); }),
  flak_legs: (c) => greave(c, '#7a8088', '#a0a6ae', '#4a4f58', (P) => { P('#c9ccd4', 5, 2, 5, 5); P('#ffffff', 5, 2, 5, 1); P('#5a5f68', 5, 8, 6, 1); }),
  anbu_legs: (c) => greave(c, '#3a3e48', '#6a707c', '#1d1d24', (P) => { P('#c9ccd4', 5, 2, 5, 4); P('#ffffff', 5, 2, 4, 1); P('#5a5f6a', 5, 5, 5, 1); }, false),
  tidewalker_greaves: (c) => greave(c, '#2f6fb4', '#6aa8e8', '#1d4f80', (P) => { for (const [a, b] of [[5, 3], [6, 2], [7, 3], [8, 2], [9, 3], [5, 7], [6, 6], [7, 7], [8, 6], [9, 7]]) P('#bfe6ff', a, b); }, false),
  moonshadow_greaves: (c) => greave(c, '#4a2a6a', '#8a6ac8', '#2e1a44', (P) => { for (const [a, b] of [[7, 2], [6, 3], [6, 4], [6, 5], [7, 6], [8, 6]]) P('#f2e8ff', a, b); P('#f2c14a', 9, 8); P('#f2c14a', 5, 1); }, false),
};


// ---------- consumables ----------
const ITEMS = {
  pill_heal: (c) => { // red and white capsule
    const { rows } = kit(c);
    rows({ r: '#d8402e', R: '#ff7a5a', d: '#8a2418', w: '#f4f0e6', W: '#ffffff', g: '#b8ae9c' }, 2, 2, [
      '.......rrr..', '......rRRrr.', '.....rRrrrrd', '....wrrrrrrd', '...wWwrrrrd.', '..wWwwwrrd..', '.wWwwwwwd...', 'wWwwwwwg....', 'wwwwwwg.....', 'wwwwgg......', '.ggg........']);
  },
  pill_chakra: (c) => { // glowing blue chakra pill
    const { rows } = kit(c);
    rows({ b: '#3a7fd4', l: '#7cc4ff', w: '#e8f6ff', d: '#1d4f8a' }, 3, 3, [
      '...bbbb...', '..bllbbb..', '.blwlbbbb.', 'blwlbbbbbd', 'bllbbbbbbd', 'bbbbbbbbbd', 'bbbbbbbbdd', '.bbbbbbdd.', '..dbbbdd..', '...dddd...']);
  },
  smoke: (c) => { // smoke bomb: dark ball, fuse, puff of smoke
    const { rows } = kit(c);
    rows({ k: '#3a3e48', l: '#6a707c', w: '#a0a6ae', d: '#1d1d24', f: '#c8a070', y: '#ffd36b', o: '#e8742c', s: '#d6dae2', S: '#f4f6f8' }, 1, 0, [
      '.........sSs..', '........sSSss.', '.......y.sss..', '......of......', '.....f........', '....kkkk......', '..kkwlkkkk....', '.kkwlkkkkkk...', '.kwlkkkkkkkd..', 'kklkkkkkkkkd..',
      'kkkkkkkkkkkd..', 'kkkkkkkkkkdd..', '.kkkkkkkkdd...', '..kkkkkddd....', '....dddd......']);
  },
  antidote: (c) => { // green potion flask with a cork
    const { rows } = kit(c);
    rows({ c: '#a87444', C: '#c8945a', g: '#cfe8f0', G: '#ffffff', n: '#3aa85a', N: '#7ce08a', d: '#1f6a34' }, 3, 0, [
      '...CCcc...', '...Cccc...', '....gg....', '....gg....', '...gGgg...', '..gGgggg..', '.gGnnnnng.', 'gGnNNnnnng', 'gnNnnnnnnd', 'gnnnnnnnnd', 'gnnnnnnnnd', 'gnnnnnnndd', '.gnnnnndd.', '..dddddd..']);
  },
  kunai: (c) => kunai(c, false),
  kunai_x: (c) => kunai(c, true),
  shuriken: (c) => { // four-point throwing star with a centre hole
    const { rows } = kit(c);
    rows({ m: '#b4b9c2', l: '#e4e8ee', d: '#5a5f6a', h: '#24160e' }, 1, 1, [
      '......l......', '......l......', '.....lmd.....', '.....lmd.....', '....lmmmd....', '..llmmhmmdd..', 'llmmmhhhmmmdd', '..ddmmhmmdd..',
      '....dmmmd....', '.....dmd.....', '.....dmd.....', '......d......', '......d......']);
  },
  shuriken_w: (c) => { // big windmill shuriken with a wrapped centre ring
    const { rows } = kit(c);
    rows({ m: '#b4b9c2', l: '#e4e8ee', d: '#5a5f6a', r: '#c43c32', R: '#e8584a', h: '#24160e' }, 0, 0, [
      '......l.........', '.....lld........', '.....lmd........', '....lmmd........', '....lmmd....lll.', '...lmmmd..llmmd.', '...lmmrrrrlmmd..', '...lmrRhhrmmd...',
      '...lmrhhhrmd....', '..lmmrhhrrd.....', '.lmmlrrrrd......', 'lmmd..dmmd......', 'ldd...dmmd......', '......dmd.......', '......dmd.......', '.......d........']);
  },
};
function kunai(c, tag) {
  const { P, pts } = kit(c);
  // blade: leaf-shaped, diagonal to the top-right
  pts('#d6dae2', [[9, 6], [10, 5], [11, 4], [12, 3], [13, 2], [10, 6], [11, 5], [12, 4], [8, 7], [9, 7]]);
  pts('#ffffff', [[9, 5], [10, 4], [11, 3], [12, 2], [14, 1]]);
  pts('#8a8f9c', [[8, 8], [9, 8], [10, 7], [11, 6], [12, 5], [13, 3]]);
  // grip with wrap, ring pommel
  for (let i = 0; i < 4; i++) { P(i % 2 ? '#2b2b38' : '#5a5f6a', 7 - i, 8 + i); P('#2b2b38', 7 - i, 9 + i); }
  pts('#8a8f9c', [[1, 12], [2, 11], [3, 12], [2, 13], [1, 13], [3, 13]]); P('#c9ccd4', 2, 11);
  if (tag) { // explosive paper tag with a red seal, and a spark
    P('#f4ecd0', 4, 6, 3, 5); P('#d8cca8', 6, 6, 1, 5); P('#c43c32', 5, 7, 1, 3); P('#c43c32', 4, 8, 3, 1);
    pts('#ffd36b', [[1, 3], [2, 2], [3, 3], [2, 4]]); P('#e8742c', 2, 3);
  }
}

const DRAW = { ...WEAPONS, ...ARMOUR, ...ARMS, ...LEGS, ...ITEMS };
// faint silhouettes for empty equipment slots
const EMPTY = { weapon: 'katana', head: 'genin_head', chest: 'flak_chest', arms: 'flak_arms', legs: 'flak_legs' };

const cache = new Map();
export function gearIconURL(id, ghost = false) {
  const k = id + (ghost ? ':g' : '');
  if (cache.has(k)) return cache.get(k);
  const f = DRAW[id]; if (!f) return null;
  const c = blank(); f(c);
  let img = outline(c, '#24160e');
  if (ghost) { // greyed-out silhouette
    const g = img.getContext('2d'), d = g.getImageData(0, 0, img.width, img.height);
    for (let i = 0; i < d.data.length; i += 4) if (d.data[i + 3]) { d.data[i] = 201; d.data[i + 1] = 168; d.data[i + 2] = 106; d.data[i + 3] = 150; }
    g.putImageData(d, 0, 0);
  }
  const url = img.toDataURL(); cache.set(k, url); return url;
}
export function gearIconHTML(id, px = 36, fallback = '') {
  const url = gearIconURL(id);
  return url ? `<img class="pxi" src="${url}" width="${px}" height="${px}" alt="">` : fallback;
}
export function emptySlotHTML(slot, px = 36) {
  const url = gearIconURL(EMPTY[slot], true);
  return url ? `<img class="pxi" src="${url}" width="${px}" height="${px}" alt="">` : '';
}
export const GEAR_ICON_IDS = Object.keys(DRAW);
// consumables use the same drawing table
export const itemIconHTML = gearIconHTML;
