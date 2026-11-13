// Numbers in the heading font (Press Start 2P), whose 2, 3, 5, 6 and 8 are all distinct.
// Used on the battle screen: every number in its text is wrapped in <em class="n">, sized to match the
// surrounding text and snapped so its pixels land on whole screen pixels.
import { crispTitle, measurePx, fillTextPx } from './pixemoji.js?v=9d1c820';

const NUM = /\d[\d,.]*%?/g;
const SKIP = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'CANVAS', 'SVG']);

function sizeFor(parent) {
  if (!parent.isConnected) return null;
  const cs = getComputedStyle(parent), dpr = window.devicePixelRatio || 1;
  if (/Press Start/.test(cs.fontFamily)) return null; // already in the heading font
  const px = parseFloat(cs.fontSize) * 0.72;            // match the height of the surrounding letters
  if (!(px > 0)) return null;
  if (dpr < 2) return Math.max(8, Math.round(px / 4) * 4); // ordinary screens: steps of 4px (8px steps would be too coarse)
  return Math.max(8, crispTitle(px * dpr)) / dpr;
}
function wrapIn(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(n) {
      const p = n.parentElement;
      if (!p || SKIP.has(p.tagName) || p.closest('em.n') || !/\d/.test(n.nodeValue)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  const nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const n of nodes) {
    const size = sizeFor(n.parentElement); if (!size) continue;
    const frag = document.createDocumentFragment(); let last = 0; const s = n.nodeValue;
    s.replace(NUM, (m, i) => {
      if (i > last) frag.append(s.slice(last, i));
      const em = document.createElement('em'); em.className = 'n'; em.textContent = m; em.style.fontSize = size + 'px';
      frag.append(em); last = i + m.length; return m;
    });
    if (last < s.length) frag.append(s.slice(last));
    n.replaceWith(frag);
  }
}
export function numbersInHeadingFont(root) {
  wrapIn(root); requestAnimationFrame(() => wrapIn(root)); // again once the screen is on the page
  let queued = false;
  const mo = new MutationObserver(() => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; wrapIn(root); }); });
  mo.observe(root, { childList: true, subtree: true, characterData: true });
  return () => mo.disconnect();
}

// A name tag drawn on a canvas: the name in the text font, the level beside it in the heading font.
// fsz is the text size in canvas pixels; returns nothing. Expects ctx.textBaseline = 'bottom'.
export function drawNameTag(ctx, x, y, name, level, fsz, { plate = 'rgba(36,22,14,.62)', color = '#fff4dc', lvColor = '#f2c14a' } = {}) {
  const textFont = `${fsz}px 'Pixelify Sans', sans-serif`, lvSize = crispTitle(fsz * 0.66), lvFont = `${lvSize}px 'Press Start 2P', monospace`;
  ctx.font = textFont; const nw = measurePx(ctx, name);
  const lv = level ? String(level) : '', gap = lv ? Math.round(fsz * 0.35) : 0, pre = lv ? 'Lv' : '', pw = pre ? ctx.measureText(pre).width + Math.round(fsz * 0.15) : 0;
  ctx.font = lvFont; const lw = lv ? ctx.measureText(lv).width : 0;
  const w = nw + gap + pw + lw + 8, x0 = Math.round(x - w / 2);
  ctx.fillStyle = plate; ctx.fillRect(x0, y - fsz - 2, w, fsz + 4);
  const align = ctx.textAlign; ctx.textAlign = 'left';
  ctx.font = textFont; ctx.fillStyle = color; fillTextPx(ctx, name, x0 + 4, y + 1);
  if (lv) {
    ctx.fillStyle = lvColor; ctx.fillText(pre, x0 + 4 + nw + gap, y + 1);                       // "Lv" in the text font
    ctx.font = lvFont; ctx.fillText(lv, x0 + 4 + nw + gap + pw, Math.round(y - (fsz - lvSize) * 0.3)); // the number in the heading font
  }
  ctx.textAlign = align;
}
