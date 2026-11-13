// Pixel-art replacements for every emoji in the game. Each icon is drawn on a 16x16 grid with a shared
// palette and auto-outlined. startPixify() swaps emoji in page text for <img> icons as screens appear;
// fillTextPx() does the same for text drawn on canvases.
import { outline } from './sprites.js?v=9d1c820';
import { gearIconURL } from './itemicons.js?v=9d1c820';

const PAL = {
  k: '#24160e', w: '#ffffff', W: '#e8e0cf', g: '#8a8f9c', G: '#c9ccd4', s: '#5a5f6a', x: '#3a3e48', X: '#1d1d24',
  r: '#c43c32', R: '#ff6a5a', d: '#8a2a22', o: '#e8742c', O: '#ffb05a', y: '#f2c14a', Y: '#fff1a8', u: '#b8862a',
  e: '#3a8a4a', E: '#7ce08a', f: '#245c30', b: '#3a7fd4', B: '#9fd8ff', n: '#1d4f8a', p: '#9a5ad0', P: '#d8b0ff', q: '#5a2a8a',
  t: '#a87444', T: '#c8945a', h: '#5a3418', c: '#f5c99b', C: '#d8a878', m: '#e8c88a', M: '#c99a5e', l: '#4cbf8c', L: '#a8f0d0', i: '#ff9fbf', I: '#ffd6e2',
};
// art: rows of palette letters ('.' = empty), placed at (ox, oy) on the 16x16 grid
const A = (rows, ox = 0, oy = 0, pal = {}) => (x) => rows.forEach((r, j) => { for (let i = 0; i < r.length; i++) { const ch = r[i]; if (ch === '.') continue; x.fillStyle = pal[ch] || PAL[ch] || ch; x.fillRect(ox + i, oy + j, 1, 1); } });
const G_ = (id) => ({ gear: id });

// ---------- shared shapes ----------
const medal = (c, l, d) => A([
  '..rr.....rr..', '..rrr...rrr..', '...rrr.rrr...', '....rrrrr....', '....' + 'ddd' + '.....', '...' + c + c + c + c + c + '....', '..' + c + l + l + c + c + c + d + '...', '.' + c + l + c + c + c + c + c + d + '..',
  '.' + c + l + c + c + c + c + c + d + '..', '.' + c + c + c + c + c + c + c + d + '..', '..' + c + c + c + c + c + d + '...', '...' + d + d + d + d + d + '....'], 1, 1);
const moon = (phase) => (x) => {
  const cx = 7.5, cy = 7.5, R = 6.5;
  for (let j = 0; j < 16; j++) for (let i = 0; i < 16; i++) {
    const dx = i - cx, dy = j - cy; if (dx * dx + dy * dy > R * R) continue;
    const lit = phase === 'full' ? true : phase === 'crescent' ? (i - 3.5 - cx) ** 2 + (dy + 1) ** 2 > (R - 0.5) ** 2 : phase === 'wane' ? dx < 1 + Math.abs(dy) * 0.2 - 2 : dx > -1;
    x.fillStyle = lit ? (dx + dy < -4 ? '#fffbe0' : '#fff1a8') : '#5a5f8a'; x.fillRect(i, j, 1, 1);
    if (lit && phase === 'full' && ((i === 5 && j === 9) || (i === 9 && j === 5) || (i === 10 && j === 10))) { x.fillStyle = '#e8d488'; x.fillRect(i, j, 1, 1); }
  }
};
const heart = (c, l, d) => A([
  '.' + c + c + c + '...' + c + c + c + '.', c + l + l + c + c + '.' + c + c + c + c + d, c + l + c + c + c + c + c + c + c + c + d, c + c + c + c + c + c + c + c + c + c + d,
  '.' + c + c + c + c + c + c + c + c + d + '.', '..' + c + c + c + c + c + c + d + '..', '...' + c + c + c + c + d + '...', '....' + c + c + d + '....', '.....' + d + '.....'], 2, 3);
const flag = (c, l) => A(['h...........', 'hT' + c + c + c + c + c + c + '...', 'hT' + l + c + c + c + c + c + c + c + '.', 'hT' + l + c + c + c + c + c + c + c + c, 'hT' + c + c + c + c + c + c + c + c + '.', 'hT' + c + c + c + c + c + c + '...', 'h...........', 'h.', 'h.', 'h.', 'h.', 'h.', 'hh'], 2, 1);
const hourglass = A(['tTTTTTTTTt', '.WYYYYYYW.', '.WYYYYYYW.', '..WYYYYW..', '...WYYW...', '....WW....', '...W..W...', '..W..Y.W..', '.W..YYY.W.', '.WYYYYYYW.', 'tTTTTTTTTt'], 3, 2);
const stopwatch = A(['.....gg.....', '......g.....', '...xxxxxx...', '..xWWWWWWx..', '.xWWWWkWWWx.', '.xWWWWkWWWx.', '.xWWWWkWWWx.', '.xWWWWkkkWx.', '.xWWWWWWWWx.', '.xWWWWWWWWx.', '..xWWWWWWx..', '...xxxxxx...'], 2, 1);
const skull = A(['...WWWWWW...', '..WWWWWWWW..', '.WWWWWWWWWW.', '.WkkWWWWkkW.', '.WkkWWWWkkW.', '.WWWWkkWWWW.', '..WWWWWWWW..', '...WkWkWk...', '...WWWWWW...'], 2, 3);
const swords = A([
  'G.............G.', '.Gw..........wG.', '..Gw........wG..', '...Gw......wG...', '....Gw....wG....', '.....Gw..wG.....', '......GwwG......', '.......GG.......',
  '......GwwG......', '..yy.Gw..wG.yy..', '..yyGw....wGyy..', '...hh......hh...', '..hh........hh..', '.hh..........hh.', 'tt............tt'], 0, 0);
const cloud = (c = 'G', l = 'w', d = 'g') => A([
  '....' + l + l + l + '.....', '...' + l + c + c + c + l + '.....', '..' + l + c + c + c + c + c + l + l + l + '..', '.' + l + c + c + c + c + c + c + c + c + c + l + '.', l + c + c + c + c + c + c + c + c + c + c + c + l,
  l + c + c + c + c + c + c + c + c + c + c + c + d, '.' + d + c + c + c + c + c + c + c + c + c + d + '.', '..' + d + d + d + d + d + d + d + d + d + '..'], 1, 4);
const building = (roof, roofL, wall = 'W', sign = null) => A([
  '.......' + roof + roof + '.......', '.....' + roof + roofL + roof + roof + roof + roof + '.....', '...' + roof + roofL + roofL + roof + roof + roof + roof + roof + roof + '...', '.' + roof + roof + roof + roof + roof + roof + roof + roof + roof + roof + roof + roof + roof + roof + '.',
  'hhhhhhhhhhhhhhhh', '.t' + wall + wall + wall + wall + wall + wall + wall + wall + wall + wall + wall + wall + 't.', '.t' + wall + 'YY' + wall + wall + (sign || wall) + (sign || wall) + wall + wall + 'YY' + wall + 't.', '.t' + wall + 'YY' + wall + wall + (sign || wall) + (sign || wall) + wall + wall + 'YY' + wall + 't.',
  '.t' + wall + wall + wall + wall + wall + wall + wall + wall + wall + wall + wall + wall + 't.', '.t' + wall + wall + wall + wall + 'hhhh' + wall + wall + wall + wall + 't.', '.t' + wall + wall + wall + wall + 'hTTh' + wall + wall + wall + wall + 't.', '.t' + wall + wall + wall + wall + 'hTTh' + wall + wall + wall + wall + 't.', 'gggggggggggggggg'], 0, 2);

// ---------- the icon table (keys are emoji without the variation selector) ----------
const ICONS = {
  // money, trade, places
  '💰': A(['.....hh.....', '....hTTh....', '.....hh.....', '....tTTt....', '...tTyyTt...', '..tTTyTTTt..', '.tTTyyyTTTt.', '.tTTTTyTTTh.', '.tTTyyyTTTh.', '.tTTTyTTTTh.', '..tTTTTTTh..', '...hhhhhh...'], 2, 2),
  '🛍': A(['....hhhh....', '...h....h...', '...h....h...', '.rrrrrrrrrr.', '.rRRrrrrrrd.', '.rRrrrrrrrd.', '.rrrrYYrrrd.', '.rrrrYYrrrd.', '.rrrrrrrrrd.', '.rrrrrrrrrd.', '.dddddddddd.'], 2, 2),
  '⚖': A(['.......y.......', '..yyyyyyyyyyy..', '..h....y....h..', '.h.h...y...h.h.', 'h...h..y..h...h', 'yyyyy..y..yyyyy', '.yyy...y...yyy.', '.......y.......', '.......y.......', '.....yyyyy.....', '....uuuuuuu....'], 0, 3),
  '🏪': building('e', 'E', 'W', 'r'),
  '🏦': A(['.......gg.......', '.....ggGGgg.....', '...ggGGGGGGgg...', '.gggggggggggggg.', '..WW.WW..WW.WW..', '..WW.WW..WW.WW..', '..WW.WW..WW.WW..', '..WW.WW..WW.WW..', '..WW.WW..WW.WW..', '.gggggggggggggg.', 'gggggggggggggggg'], 0, 3),
  '🏯': A(['.......yy.......', '......rrrr......', '....rrRRrrrr....', '......WWWW......', '.....WYWWYW.....', '...rrrrrrrrrr...', '.rrRRrrrrrrrrrr.', '....WWWWWWWW....', '....WYWhhWYW....', '....WWWhhWWW....', '..gggggggggggg..'], 0, 3),
  '🏰': A(['.g.g......g.g...', '.ggg......ggg...', '.gGg..g.g.gGg...', '.gGg..ggg.gGg...', '.gGggggGgggGg...', '.gGGGGGGGGGGg...', '.gGGGGhhGGGGg...', '.gGGGhhhhGGGg...', '.gGGGhhhhGGGg...', 'ssssssssssssss..'], 1, 4),
  '🏠': A(['......rr......', '....rrRRrr....', '..rrRRrrrrrr..', 'rrrrrrrrrrrrrr', '.tWWWWWWWWWWt.', '.tWYYWWWhhWWt.', '.tWYYWWWhhWWt.', '.tWWWWWWhhWWt.', '.tttttttttttt.'], 1, 4),
  '🗼': A(['.....r.....', '.....r.....', '....rrr....', '....rWr....', '...rrrrr...', '...rWWWr...', '..rrrrrrr..', '..rW...Wr..', '.rrrrrrrrr.', '.rW.....Wr.', 'rr.......rr'], 2, 2),
  '⛩': A(['dddddddddddddddd', '.rrrrrrrrrrrrrr.', '...r..yyyy..r...', '.rrrrrrrrrrrrrr.', '...r........r...', '...r........r...', '...r........r...', '...r........r...', '...r........r...', '..ddd......ddd..'], 0, 3),
  '🏟': A(['....gggggggg....', '..ggGGGGGGGGgg..', '.gGGWWWWWWWWGGg.', 'gGWWeeeeeeeeWWGg', 'gGWeeeEeeeeeeWGg', 'gGWWeeeeeeeeWWGg', '.gGGWWWWWWWWGGg.', '..ggGGGGGGGGgg..', '....gggggggg....'], 0, 4),
  '🏥': A(['......WW......', '....WWWWWW....', '..WWWWWWWWWW..', '.WWWWWrrWWWWW.', '.WWWWWrrWWWWW.', '.WWWrrrrrrWWW.', '.WWWrrrrrrWWW.', '.WWWWWrrWWWWW.', '.WWWWWrrWWWWW.', '.WWWWWWWWWWWW.', '.ggggggggggggg'], 1, 3),
  '🛤': A(['.h........h.', '.hhhhhhhhhh.', '.h........h.', 'thhhhhhhhhht', '.h........h.', 'thhhhhhhhhht', '.h........h.', 'thhhhhhhhhht', '.h........h.', 'thhhhhhhhhht', '.h........h.'], 2, 3),
  '🏝': A(['....eee.eee.', '...eEee.eEe.', '..e..eeee..e', '......tt....', '......t.....', '.....t......', '.....t......', '.mmmmMmmmm..', 'BBmmmmmmmmBB', 'BbBBBBBBBBbB'], 2, 4),
  '🏜': A(['.........yy...', '........yYYy..', '.........yy...', '..............', '....mmm.......', '..mmmmmmm.mm..', '.mmmmmmmmmmmm.', 'mmMmmmmMmmmmmm', 'MmmmMmmmmmMmmm'], 1, 4),
  '⚓': A(['.....gg.....', '....g..g....', '.....gg.....', '..gggggggg..', '.....gg.....', '.....gg.....', '.....gg.....', 'g....gg....g', 'gg...gg...gg', '.gg..gg..gg.', '..gggggggg..', '....gggg....'], 2, 2),
  '🌐': A(['....bbbbbb....', '..bbeebbbbbb..', '.bbeeeebbeeeb.', '.beeeeebbbeeb.', 'bbbeeebbbbbebb', 'bbbbeebbbbbbbb', 'bbbbbbbbeeebbb', 'bbbbbbbeeeeebb', '.bbbbbbbeeebb.', '.bbbbbbbbbbbb.', '..bbbbbbbbbb..', '....bbbbbb....'], 1, 2),
  '📱': A(['.xxxxxxxx.', 'xxxxxxxxxx', 'xBBBBBBBBx', 'xBbBBBBBBx', 'xBBBBBbBBx', 'xBBeeBBBBx', 'xBBeeBBBBx', 'xBBBBBBBBx', 'xBBBBBBBBx', 'xBBBBBBBBx', 'xxxxxxxxxx', 'xxxxGGxxxx', '.xxxxxxxx.'], 3, 1),

  // status and UI
  '🔒': A(['...gggg...', '..g....g..', '..g....g..', '..g....g..', 'yyyyyyyyyy', 'yYYyyyyyyu', 'yYyyyhyyyu', 'yyyyhhhyyu', 'yyyyyhyyyu', 'yyyyyhyyyu', 'uuuuuuuuuu'], 3, 3),
  '✅': A(['eeeeeeeeeeee', 'eEEeeeeeeeee', 'eEeeeeeeeWee', 'eeeeeeeeWWee', 'eeeeeeeWWWee', 'eWWeeeWWWeee', 'eWWWeWWWeeee', 'eeWWWWWeeeee', 'eeeWWWeeeeee', 'eeeeWeeeeeef', 'ffffffffffff'], 2, 3),
  '✓': A(['.........ee', '........eee', 'ee.....eee.', 'eee...eee..', '.eee.eee...', '..eeeee....', '...eee.....'], 2, 5),
  '🚫': A(['....rrrrrr....', '..rrrrrrrrrr..', '.rrrr....rrrr.', '.rrrr.....rrr.', 'rrrrrr.....rrr', 'rrr.rrr....rrr', 'rrr..rrr...rrr', 'rrr...rrr..rrr', 'rrr....rrr.rrr', 'rrr.....rrrrrr', '.rrr.....rrrr.', '.rrrr....rrrr.', '..rrrrrrrrrr..', '....rrrrrr....'], 1, 1),
  '❔': A(['..WWWWW..', '.WW...WW.', '.WW...WW.', '.....WW..', '....WW...', '....WW...', '.........', '....WW...', '....WW...'], 4, 3),
  '➕': A(['....ee....', '....ee....', '....ee....', 'eeeeeeeeee', 'eeeeeeeeee', '....ee....', '....ee....', '....ee....'], 3, 4),
  '💤': A(['.......BBBBBB', '..........BB.', '.........BB..', '........BB...', '.......BBBBBB', 'bbbbbb.......', '....bb.......', '...bb........', '..bb.........', '.bb..........', 'bbbbbb.......'], 1, 2),
  '☀': A(['.......y.......', '..y....y....y..', '...y.......y...', '.....yyyyy.....', '....yYYyyyy....', '....yYyyyyy....', 'yy..yyyyyyy..yy', '....yyyyyyu....', '....yyyyyyu....', '.....uuuuu.....', '...y.......y...', '..y....y....y..', '.......y.......'], 0, 1),
  '🌙': moon('crescent'), '🌒': moon('crescent'), '🌘': moon('wane'), '🌕': moon('full'),
  '⭐': A(['......y......', '.....yyy.....', '.....yYy.....', 'yyyyyYYyyyyyy', '.yyyYYyyyyyu.', '..yyyyyyyyu..', '...yyyyyyu...', '...yyyuyyy...', '..yyyu.uyyy..', '..yyu...uyy..', '.yu.......uy.'], 1, 2),
  '★': A(['......y......', '.....yyy.....', 'yyyyyyyyyyyyy', '..yyyyyyyyy..', '...yyyuyyy...', '..yyu...uyy..'], 1, 5),
  '✨': A(['....y.......', '....y.......', '...yYy......', 'yyyYYYyy....', '...yYy......', '....y....Y..', '....y...YYY.', '........YwY.', '.....y...Y..', '....yYy.....', '.....y......'], 2, 2),
  '💫': A(['...yyyy.....', '..y....y....', '.y..yy..y...', '.y.y..y.y...', '.y.y.y..y...', '..y..y.y..Y.', '...yy..y.YYY', '.......y..Y.', '...yyyy.....'], 2, 3),
  '🎉': A(['..........r.', '..y.b.....r.', '.......p....', '....e...y...', '.y...r....b.', '...rrr..e...', '..rRrrr.....', '..ryrrrr..p.', '.rryyrrrr...', '.ryyrrr.....', 'rrrrr.......', 'rrr.........'], 2, 2),
  '🏆': A(['yyyyyyyyyyyy', 'yyYYyyyyyyyu', 'y.yYyyyyyyu.', 'y.yYyyyyyyu.', 'y.yyyyyyyyu.', '.yyyyyyyyu..', '...yyyyyu...', '.....yu.....', '.....yu.....', '...yyyyyu...', '..hhhhhhhh..', '..hhhhhhhh..'], 2, 2),
  '🥇': medal('y', 'Y', 'u'), '🥈': medal('G', 'w', 'g'), '🥉': medal('T', 'O', 'h'),
  '👑': A(['.y....y....y.', '.yy..yyy..yy.', '.yyy.yyy.yyy.', '.yyyyyyyyyyy.', '.yYyyyyyyyyu.', '.yyyrryyyyyu.', '.yyyyyyyyyyu.', '.uuuuuuuuuuu.'], 1, 4),
  '🎓': A(['......xx......', '....xxxxxx....', '..xxxxxxxxxx..', 'xxxxxxxxxxxxxy', '..xxxxxxxxxx.y', '....xxxxxx...y', '...xxxxxxxx..y', '...xXXXXXXx.yy', '...xXXXXXXx..y'], 1, 3),
  '🎯': A(['....rrrrrr....', '..rrWWWWWWrr..', '.rWWrrrrrrWWr.', '.rWrrWWWWrrWr.', 'rWrrWWrrWWrrWr', 'rWrWWrrrrWWrWr', 'rWrWrrrrrrWrWr', 'rWrWWrrrrWWrWr', 'rWrrWWrrWWrrWr', '.rWrrWWWWrrWr.', '.rWWrrrrrrWWr.', '..rrWWWWWWrr..', '....rrrrrr....'], 1, 1),
  '🎲': A(['..WWWWWWWWW.', '.WWWWWWWWWGg', 'WWWWWWWWWGGg', 'WWkWWWWWkGGg', 'WWWWWWWWWGkg', 'WWWWkWWWWGGg', 'WWWWWWWWWkGg', 'WWkWWWWWkGGg', 'WWWWWWWWWGg.', 'gggggggggg..'], 2, 3),
  '💡': A(['...YYYY...', '..YyyyyY..', '.YyYYyyyY.', '.YyYyyyyY.', '.Yyyyyyyu.', '..Yyyyyu..', '...yyyu...', '...GGGG...', '...gggg...', '...GGGG...', '....gg....'], 3, 2),
  '🧭': A(['....yyyyyy....', '..yyWWWWWWyy..', '.yWWWWrWWWWWy.', '.yWWWWrrWWWWy.', 'yWWWWWrrWWWWWy', 'yWWWWWrrWWWWWy', 'yWWWWWxxWWWWWy', 'yWWWWWxxWWWWWy', 'yWWWWWxxWWWWWy', '.yWWWWxxWWWWy.', '.yWWWWWxWWWWy.', '..yyWWWWWWyy..', '....yyyyyy....'], 1, 1),
  '🗺': A(['tTWWWtTWWWtTWW', 'tWWBBtWWeetWWW', 'tWBBBtWeeetWWW', 'tWBBWtWeeWtWrW', 'tWWWWtWWWWtrWW', 'tWWeetWWBBtWWr', 'tWeeetWBBBtWWW', 'tWWeWtWWBWtWWW', 'tTWWWtTWWWtTWW'], 1, 3),
  '📜': A(['.tTTTTTTTTTt.', '.tWWWWWWWWWt.', '..WWWWWWWWW..', '..WkkkkkkWW..', '..WWWWWWWWW..', '..WkkkkkWWW..', '..WWWWWWWWW..', '..WkkkkkkkW..', '..WWWWWWWWW..', '..WWWWWWrrW..', '.tTTTTTTTTTt.', '.tttttttttt..'], 1, 2),
  '📖': A(['.WWWWWW.WWWWWW.', 'WWkkkWWhWWkkkWW', 'WWWWWWWhWWWWWWW', 'WWkkkkWhWkkkkWW', 'WWWWWWWhWWWWWWW', 'WWkkkWWhWWkkkWW', 'WWWWWWWhWWWWWWW', 'WrrrrrrhrrrrrrW', '.rrrrrrhrrrrrr.'], 0, 4),
  '📚': A(['..rrrrrrrrrr..', '..rWWWWWWWWr..', '..rrrrrrrrrr..', '.bbbbbbbbbbbb.', '.bBBbbbbbbbbb.', '.bbbbbbbbbbbb.', 'eeeeeeeeeeeee.', 'eEEeeeyyeeeee.', 'eeeeeeeeeeeee.', 'pppppppppppp..', 'pPPpppppppppp.', 'pppppppppppp..'], 1, 2),
  '📋': A(['....xxxx....', '.ttxGGGGxtt.', '.tWWWWWWWWt.', '.tWkkkkkkWt.', '.tWWWWWWWWt.', '.tWkkkkkWWt.', '.tWWWWWWWWt.', '.tWkkkkkkWt.', '.tWWWWWWWWt.', '.tWkkkWWWWt.', '.tWWWWWWWWt.', '.tttttttttt.'], 2, 2),
  '⏳': hourglass, '⌛': hourglass, '⏱': stopwatch,
  '👥': A(['...cc....cc...', '..cccc..cccc..', '..cccc..cccc..', '...cc....cc...', '..bbbb..rrrr..', '.bbbbbbrrrrrr.', '.bbbbbbrrrrrr.', '.bbbbbbrrrrrr.'], 1, 5),
  '💬': A(['.WWWWWWWWWWWW.', 'WWWWWWWWWWWWWW', 'WWkkWWkkWWkkWW', 'WWkkWWkkWWkkWW', 'WWWWWWWWWWWWWW', '.WWWWWWWWWWWW.', '..WWW.........', '..WW..........', '..W...........'], 1, 3),
  '🚩': flag('r', 'R'), '🏳': flag('W', 'w'),
  '🕊': A(['..........WW', '.........WWkW', '........WWWWy', '.WWW...WWWWW.', 'WWWWW.WWWWW..', '.WWWWWWWWWW..', '..WWWWWWWWG..', '....WWWWWG...', '......GG.....', '.....G..G....'], 2, 3),
  '🎒': A(['....hhhh....', '...h....h...', '..tttttttt..', '.tTTTTTTTTt.', '.tTttttttTt.', '.tTtyyyytTt.', '.tTtttttTTt.', '.tTTTTTTTTt.', '.tTttttttTt.', '.tTTTTTTTTt.', '..tttttttt..'], 2, 3),
  '🏃': A(['......cc....', '......cc....', '...bbbb.....', '..b.bbb.cc..', '.c..bbbbb...', '....bbb.....', '...xx.xx....', '..xx...xx...', '.xx.....x...', 'hh......hh..'], 2, 3),
  '💀': skull, '☠': skull,

  // weapons and battle
  '⚔': swords,
  '🛡': A(['.gggggggggggg.', '.gGGGrrrrGGGg.', '.gGrrrrrrrrGg.', '.gGrrrrrrrrGg.', '.gGrrryyrrrGg.', '.gGrryyyyrrGg.', '..gGrryyrrGg..', '..gGrrrrrrGg..', '...gGrrrrGg...', '....gGrrGg....', '.....gGGg.....', '......gg......'], 1, 2),
  '🗡': G_('tanto'), '🔱': G_('anbu_blade'), '🪓': G_('cleaver'), '🔪': G_('kunai'), '✴': G_('shuriken'), '🧨': G_('kunai_x'),
  '💊': G_('pill_heal'), '🔷': G_('pill_chakra'), '🧪': G_('antidote'), '🎽': G_('genin_head'), '🦺': G_('flak_chest'), '🧤': G_('flak_arms'),
  '👖': G_('flak_legs'), '👘': G_('kings_mantle'), '⛑': G_('iron_helm'), '🎭': G_('anbu_head'),
  '🥷': A(['....xxxxxx....', '...xxxxxxxx...', '..xxxxxxxxxx..', '..xxxxxxxxxx..', '..rrrrrrrrrr..', '..xcckccckcx..', '..xxxxxxxxxx..', '..xxxxxxxxxx..', '...xxxxxxxx...', '..xxxxxxxxxx..', '.xxxxxxxxxxxx.', 'xxxxxxxxxxxxxx'], 1, 2),
  '👊': A(['..ccccccc...', '.ccCcCcCcc..', '.cCcCcCcCcc.', '.cccccccccc.', 'cccccccccCc.', 'ccccccccCC..', '.cccccccCc..', '..cccccCc...', '...rrrrrr...', '...rrrrrr...'], 2, 3),
  '💪': A(['......cc....', '.....cccc...', '.....cCcc...', '....cccCc...', '..cccccCc...', '.ccccccc....', 'cccCccccc...', 'cccccCcccc..', '.cccccccCc..', '..ccccccCc..', '...cccccc...'], 2, 2),
  '🌀': A(['....pppppp....', '..pp......pp..', '.p...pppp...p.', 'p...p....p...p', 'p..p..pp..p..p', 'p..p.p..p.p..p', 'p..p..p...p..p', 'p...p....p...p', '.p...pppp...p.', '..p.........p.', '...ppppppppp..'], 1, 2),
  '🩸': A(['....r....', '...rr....', '...rrr...', '..rRrr...', '..rRrrr..', '.rRrrrrr.', '.rRrrrrd.', '.rrrrrrd.', '..rrrdd..', '...ddd...'], 4, 3),
  '💧': A(['....b....', '...bb....', '...bbb...', '..bBbb...', '..bBbbb..', '.bBwbbbb.', '.bBbbbbn.', '.bbbbbbn.', '..bbbnn..', '...nnn...'], 4, 3),
  '🔥': A(['.....r.....', '....rr..r..', '...rro..rr.', '..rroo.rrr.', '..roooorrr.', '.rrooyoorrr', '.rooyyyoorr', 'rrooyYyoorr', 'rooyYYyyorr', 'rooyYYYyorr', '.rooyyyoor.', '..rrooorr..'], 2, 2),
  '⚡': A(['......yyyy', '.....yyyy.', '....yyyy..', '...yyyy...', '..yyyyyyyy', '.......yy.', '......yy..', '.....yy...', '....yy....', '...yy.....', '..y.......'], 3, 2),
  '🌪': A(['GGGGGGGGGGGG', '.lllllllllll', '..GGGGGGGGG.', '...llllllll.', '....GGGGGG..', '.....llll...', '.....GGG....', '......ll....', '......G.....', '.......l....'], 2, 3),
  '🪨': A(['....gggg....', '..ggGGGggg..', '.gGGgggggsg.', '.gGgggggggs.', 'gGggggggsgss', 'gggggggggsss', 'gggsgggggsss', '.sssssssss..'], 2, 5),
  '❄': A(['.......B.......', '.....B.B.B.....', '......BBB......', '..B....B....B..', 'B..B...B...B..B', '....B..B..B....', '.....BBBBB.....', 'BBBBBBBwBBBBBBB', '.....BBBBB.....', '....B..B..B....', 'B..B...B...B..B', '..B....B....B..', '......BBB......', '.....B.B.B.....', '.......B.......'], 0, 0),
  '🧊': A(['...BBBBBBB.', '..BwwwwwwBn', '.BBBBBBBBnn', '.BwBBBBBBnn', '.BwBBBBBBnn', '.BBBBBBBBnn', '.BBBBBBBBn.', '.nnnnnnnn..'], 2, 4),
  '🌊': A(['......bbbb.....', '....bbBBBBb....', '...bBwwwwBBb...', '..bBw....wBb...', '..bB.....bBb..b', '.bbB....bBBbbbb', 'bbBBbbbbBBBBBbb', 'bBBBBBBBBBBBBBb', 'nnnnnnnnnnnnnnn'], 0, 4),
  '🌋': A(['.....r.r.....', '......y......', '....rroor....', '....hroorh...', '...hhhrohhh..', '..hhhhohhhhh.', '.hhhhhhrhhhhh', 'hhhhhhhhhhhhh', 'hhhhhhhhhhhhh'], 1, 4),
  '🌫': A(['.GGGGGGGG.....', '...GGGGGGGGGG.', '..............', 'GGGGGGGGG.....', '.....GGGGGGGGG', '..............', '..GGGGGGGGGG..', 'GGGGGGG.......'], 1, 4),
  '♨': A(['..r...r...r..', '.r...r...r...', '..r...r...r..', '...r...r...r.', '..r...r...r..', '.............', 'b...........b', 'bBBBBBBBBBBBb', '.bBBBBBBBBBb.', '..bbbbbbbbb..'], 1, 3),
  '🌿': A(['.......e.....', '......ee..e..', '..e..eEe.ee..', '..ee.ee.eEe..', '..eEeeeeee...', '...eeef......', '....ef.......', '...ef........', '..ff.........'], 2, 4),
  '🍃': A(['.........ee', '.......eeEe', '.....eeEEe.', '...eeEEee..', '..eEEeee...', '.eEeeee....', '.eeeef.....', '.eeef......', 'f..........'], 2, 4),
  '🌳': A(['....eeee....', '..eeEEeeee..', '.eEEeeeeeee.', 'eEeeeeeeeeef', 'eeeeeeeeeeff', '.eeeeeeeeff.', '..ffeeeff...', '.....tt.....', '.....tt.....', '....tttt....'], 2, 2),
  '🌲': A(['......e.....', '.....eee....', '....eEeee...', '...eEeeeef..', '.....eef....', '...eEeeeee..', '..eEeeeeeef.', '....eeeee...', '..eEeeeeeef.', '.eeeeeeeeeff', '.....tt.....', '.....tt.....'], 2, 2),
  '🐍': A(['.........eee..', '........eEeEe.', '........eeeer.', '...eeee..ee...', '..eEeeeeee....', '.ee.....e.....', '.e..eeeee.....', '.eeeeEee......', '..eeeee.......'], 1, 4),
  '🐉': A(['......eeee....', '....eeEeeke...', '...eeeeeeeeer.', '..eEe..eeeeee.', '.eee....yyy...', '.ee.....y.y...', 'eEe...........', 'eeeeee.e.e....', '.eeEeeeeee....', '...eeeeee.....'], 1, 3),
  '🦂': A(['...........t..', '..........tt..', '.........tt...', '..........t...', '...tttttt.t...', '.tTTTTTTTtt...', 'tTtTtTtTtTt...', '.tttttttttt...', 't.t.t.t.t.....'], 1, 4),
  '🐌': A(['.......tttt.', '......tTTTTt', '.....tTttTTt', '.....tTtTtTt', '..c..tTTTTTt', '.ccc.ctttttc', '.cccccccccccc', '..ccccccccc..'], 1, 6),
  '🔮': A(['....pppp....', '..ppPPpppp..', '.pPPwPpppqp.', '.pPwPpppppq.', 'pPPpppppppqq', 'ppppppppppqq', 'pppppppppqqq', '.pppppppqqq.', '..pqqqqqqq..', '...tTTTTt...', '..tttttttt..'], 2, 2),
  '🧬': A(['b......r', '.b....r.', '..bwwr..', '...br...', '..rwwb..', '.r....b.', 'r......b', '.r....b.', '..rwwb..', '...rb...', '..bwwr..', '.b....r.'], 4, 2),
  '🧘': A(['.....cc.....', '.....cc.....', '....oooo....', '.c.oooooo.c.', '..cooooooc..', '....oooo....', '..xxxxxxxx..', '.xxxxxxxxxx.'], 2, 5),
  '👁': A(['....kkkkkk....', '..kkWWWWWWkk..', '.kWWWbbbbWWWk.', 'kWWWbbkkbbWWWk', 'kWWWbbkkbbWWWk', '.kWWWbbbbWWWk.', '..kkWWWWWWkk..', '....kkkkkk....'], 1, 4),
  '😡': A(['....rrrrrr....', '..rrrrrrrrrr..', '.rrkkrrrrkkrr.', '.rrrkkrrkkrrr.', 'rrrWkrrrrkWrrr', 'rrrrrrrrrrrrrr', 'rrrrrrrrrrrrrr', 'rrrrrkkkkrrrrr', '.rrrkrrrrkrrr.', '.rrrrrrrrrrrr.', '..rrrrrrrrrr..', '....rrrrrr....'], 1, 2),
  '🤕': A(['....cccccc....', '..WWWWWWWWWW..', '.WWWWWWWWrWWW.', '.ccccccccccccc', 'cckkccccckkccc', 'ccccccccccccc.', 'cccWWWWccccc..', 'ccccWWcckkccc.', '.ccccccccccc..', '..ccccccccc...', '....ccccc.....'], 1, 2),
  '❤': heart('r', 'R', 'd'), '💚': heart('e', 'E', 'f'),
  '💔': A(['.rrr...rrr.', 'rRRrr.krrrd', 'rRrrrk.rrrd', 'rrrrr.krrrd', '.rrrrk.rrd.', '..rrr.krd..', '...rrk.d...', '....r.d....'], 2, 4),
  '⬆': A(['....ee....', '...eeee...', '..eeEeee..', '.eeeEeeee.', 'eeeeEeeeee', '...eEee...', '...eEee...', '...eeee...', '...eeee...'], 3, 3),
  '⬇': A(['...rrrr...', '...rRrr...', '...rRrr...', '...rRrr...', 'rrrrRrrrrr', '.rrrrrrrr.', '..rrrrrr..', '...rrrr...', '....rr....'], 3, 3),
  '💨': cloud(),
  '👹': A(['.W..........W.', '.WW.rrrrrr.WW.', '..rrrrrrrrrr..', '.rrRRrrrrrrrr.', '.rrkkrrrrkkrr.', '.rrWkrrrrkWrr.', 'rrrrrrrrrrrrrr', 'rrrrrrddrrrrrr', 'rrrkkkkkkkkrrr', 'rrrkWkWWkWkrrr', '.rrrkkkkkkrrr.', '..rrrrrrrrrr..'], 1, 2),
  '🥋': A(['..WWW....WWW..', '.WWWWW..WWWWW.', 'WWWWWWGGWWWWWW', 'WWWGWWWGWWWGWW', 'cc.WWWWGWWW.cc', '...WWWWWGWW...', '...xxxxxxxx...', '...xxxxxxxx...', '.....x..x.....', '....x....x....', '...WWWWWWWW...', '...WWW..WWW...'], 1, 2),
  '🪵': A(['...tttttttttt..', '..tTTTTTTTTTTt.', '.MmMtTTTTTTTTTt', 'MmMmMtTTTTTTTTt', 'MMmMMtTTTTTTTTt', '.MMMtTTTTTTTTTt', '..ttthhhhhhhhh.'], 0, 5),
  '▶': A(['xx......', 'xxxx....', 'xxxxxx..', 'xxxxxxxx', 'xxxxxx..', 'xxxx....', 'xx......'], 5, 5, { x: '#fff4dc' }),
  '◀': A(['......xx', '....xxxx', '..xxxxxx', 'xxxxxxxx', '..xxxxxx', '....xxxx', '......xx'], 3, 5, { x: '#fff4dc' }),
};
// a few symbols are drawn as the same icon
const ALIAS = { '⚔️': '⚔', '⏱️': '⏱', '☠️': '☠' };

const strip = (s) => s.replace(/️/g, '');
const cache = new Map();
export function emojiURL(ch) {
  const k = strip(ALIAS[ch] || ch);
  if (cache.has(k)) return cache.get(k);
  const f = ICONS[k]; let url = null;
  if (f && f.gear) url = gearIconURL(f.gear);
  else if (typeof f === 'function') {
    const c = document.createElement('canvas'); c.width = 16; c.height = 16; f(c.getContext('2d'));
    url = outline(c, '#24160e').toDataURL();
  }
  cache.set(k, url); return url;
}
export function hasPixel(ch) { return !!emojiURL(ch); }

// one regex that finds any emoji we have art for (with or without the variation selector)
const keys = Object.keys(ICONS).filter((k) => ICONS[k]).sort((a, b) => b.length - a.length);
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export const EMOJI_RE = new RegExp('(' + keys.map((k) => [...k].map(esc).join('\\uFE0F?')).join('|') + ')\\uFE0F?', 'gu');

// ---------- page text ----------
const SKIP = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'OPTION', 'TITLE', 'CANVAS']);
function pixifyText(node) {
  const t = node.nodeValue; EMOJI_RE.lastIndex = 0;
  if (!t || !EMOJI_RE.test(t)) return;
  EMOJI_RE.lastIndex = 0;
  const frag = document.createDocumentFragment(); let last = 0, m;
  while ((m = EMOJI_RE.exec(t))) {
    if (m.index > last) frag.appendChild(document.createTextNode(t.slice(last, m.index)));
    const url = emojiURL(m[1]);
    if (url) { const img = document.createElement('img'); img.className = 'pxe'; img.src = url; img.alt = m[0]; img.draggable = false; frag.appendChild(img); }
    else frag.appendChild(document.createTextNode(m[0]));
    last = m.index + m[0].length;
  }
  if (last < t.length) frag.appendChild(document.createTextNode(t.slice(last)));
  node.parentNode.replaceChild(frag, node);
}
export function pixify(root) {
  if (!root) return;
  if (root.nodeType === 3) { if (root.parentNode && !SKIP.has(root.parentNode.nodeName)) pixifyText(root); return; }
  if (root.nodeType !== 1 || SKIP.has(root.nodeName)) return;
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: (n) => (n.parentNode && !SKIP.has(n.parentNode.nodeName) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT) });
  const list = []; while (w.nextNode()) list.push(w.currentNode);
  list.forEach(pixifyText);
}
let started = false;
export function startPixify() {
  if (started) return; started = true;
  document.documentElement.style.setProperty('--px-swords', `url(${emojiURL('⚔')})`);
  pixify(document.body);
  new MutationObserver((muts) => {
    for (const m of muts) {
      if (m.type === 'characterData') pixify(m.target);
      else m.addedNodes.forEach((n) => pixify(n));
    }
  }).observe(document.body, { childList: true, subtree: true, characterData: true });
}

// ---------- crisp pixel-font sizes ----------
// Pixel fonts are only sharp when each font pixel covers a whole number of screen pixels.
// Pixelify Sans draws a pixel every 1/10.886 em; Press Start 2P every 1/8 em.
export function crispBody(devicePx) { const u = 10.886; return Math.max(1, Math.round(devicePx / u)) * u; }
export function crispTitle(devicePx) { return Math.max(1, Math.round(devicePx / 8)) * 8; }

// ---------- canvas text ----------
const imgs = new Map();
function iconImg(ch) {
  const k = strip(ALIAS[ch] || ch); if (imgs.has(k)) return imgs.get(k);
  const url = emojiURL(k); if (!url) return null;
  const im = new Image(); im.src = url; imgs.set(k, im); return im;
}
// fillText that draws pixel icons in place of emoji; honours textAlign and textBaseline
export function fillTextPx(ctx, text, x, y) {
  EMOJI_RE.lastIndex = 0;
  if (!EMOJI_RE.test(text)) { ctx.fillText(text, x, y); return; }
  EMOJI_RE.lastIndex = 0;
  const fsz = parseFloat((ctx.font.match(/(\d+(?:\.\d+)?)px/) || [0, 12])[1]), isz = Math.round(fsz * 1.15);
  const parts = []; let last = 0, m;
  while ((m = EMOJI_RE.exec(text))) { if (m.index > last) parts.push({ t: text.slice(last, m.index) }); parts.push({ i: m[1] }); last = m.index + m[0].length; }
  if (last < text.length) parts.push({ t: text.slice(last) });
  const wOf = (p) => (p.t != null ? ctx.measureText(p.t).width : isz);
  const total = parts.reduce((a, p) => a + wOf(p), 0);
  const al = ctx.textAlign, bl = ctx.textBaseline;
  let cx = al === 'center' ? x - total / 2 : al === 'right' || al === 'end' ? x - total : x;
  const top = bl === 'bottom' || bl === 'ideographic' ? y - isz : bl === 'middle' ? y - isz / 2 : bl === 'top' || bl === 'hanging' ? y : y - isz * 0.85;
  ctx.textAlign = 'left';
  const smooth = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = false;
  for (const p of parts) {
    if (p.t != null) { ctx.fillText(p.t, cx, y); cx += wOf(p); continue; }
    const im = iconImg(p.i);
    if (im && im.complete) ctx.drawImage(im, Math.round(cx), Math.round(top), isz, isz);
    cx += isz;
  }
  ctx.textAlign = al; ctx.imageSmoothingEnabled = smooth;
}
// width of a string as fillTextPx would draw it
export function measurePx(ctx, text) {
  EMOJI_RE.lastIndex = 0; if (!EMOJI_RE.test(text)) return ctx.measureText(text).width;
  const fsz = parseFloat((ctx.font.match(/(\d+(?:\.\d+)?)px/) || [0, 12])[1]);
  EMOJI_RE.lastIndex = 0; const n = (text.match(EMOJI_RE) || []).length;
  return ctx.measureText(text.replace(EMOJI_RE, '')).width + n * Math.round(fsz * 1.15);
}
export const PIX_KEYS = keys;
