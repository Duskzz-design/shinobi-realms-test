// Player profiles: a picture (uploaded, or the ninja's own portrait), character details, and badges.
// Anyone can open anyone's profile; only the owner can change their picture.
import * as net from './net.js?v=9d1c820';
import { VILLAGES, lookOf, drawNinjaFit } from './sprites.js?v=9d1c820';
import { ELEMENT_INFO, BLOODLINES } from './engine.js?v=9d1c820';
import { numbersInHeadingFont } from './numfont.js?v=9d1c820';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// The badges, in the order they are shown. Locked ones say how to earn them.
const LINES = [
  ['iron', '🏯', 'The Iron Bandits', 'Warlord Gorou'],
  ['serpent', '🐍', "The Serpent's Coil", 'Venomfang the Cave Wyrm'],
  ['shrine', '⛩', 'Shadow of the Fallen Shrine', 'the Hollow Shogun'],
  ['mist', '🌫', 'The Mist Reapers', 'Kirishima the Mist Reaper'],
  ['sands', '🦂', 'Sands of the Scorpion King', 'Sekiryu the Scorpion King'],
  ['eclipse', '🌕', 'The Eclipse Covenant', 'Mother Yoru, the Eclipse Sage'],
];
export const BADGES = [
  { id: 'kage', icon: '👑', name: 'Kage', how: 'Become the Kage of your village.' },
  { id: 'arena_champion', icon: '🏆', name: 'Arena Champion', how: 'Finish a day in first place in your rank\'s Arena.' },
  { id: 'millionaire', icon: '💰', name: 'Millionaire', how: 'Hold 1,000,000 ryo at once.' },
  { id: 'all_lines', icon: '🗺', name: 'Master of the Five Winds', how: 'Complete every quest line.' },
  { id: 'max_level', icon: '⭐', name: 'Peak of the Path', how: 'Reach level 60.' },
  ...LINES.map(([id, icon, line, boss]) => ({ id: 'legend_' + id, icon, name: `Legend: ${line}`, how: `Complete ${line} and defeat ${boss}.` })),
];

const day = (iso) => { try { return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); } catch { return ''; } };
const h = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstChild; };

// Square, centred crop to 256x256, saved as WebP (PNG where WebP isn't supported).
async function prepare(file) {
  if (!/^image\/(png|jpe?g|webp|gif)$/.test(file.type)) throw new Error('Choose a PNG, JPG, WebP or GIF picture.');
  if (file.size > 15 * 1024 * 1024) throw new Error('That picture is too big. Pick one under 15 MB.');
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('That file could not be opened as a picture.')); i.src = url; });
    const s = Math.min(img.naturalWidth, img.naturalHeight), cv = document.createElement('canvas'); cv.width = cv.height = 256;
    const g = cv.getContext('2d'); g.imageSmoothingQuality = 'high';
    g.drawImage(img, (img.naturalWidth - s) / 2, (img.naturalHeight - s) / 2, s, s, 0, 0, 256, 256);
    let blob = await new Promise((res) => cv.toBlob(res, 'image/webp', 0.86));
    if (!blob || blob.type !== 'image/webp') blob = await new Promise((res) => cv.toBlob(res, 'image/png'));
    return blob;
  } finally { URL.revokeObjectURL(url); }
}

export async function openProfile(root, { userId = null, name = null, onChange = null } = {}) {
  root.querySelector('.ov.pf-wrap')?.remove();
  const el = h(`<div class="ov board-wrap pf-wrap"><div class="scroll board pf"><p class="pf-loading">Opening profile…</p></div></div>`);
  root.appendChild(el);
  const stopNums = numbersInHeadingFont(el); // numbers in the clear heading font, as in battle
  const close = () => { stopNums(); el.remove(); };
  el.addEventListener('click', (e) => { if (e.target === el) close(); });
  let p;
  try { p = await net.getProfile({ userId, name }); }
  catch (err) { el.querySelector('.pf').innerHTML = `<p class="err">${esc(err.message)}</p><button class="btn ghost" data-x>Close</button>`; el.querySelector('[data-x]').onclick = close; return el; }
  render();
  return el;

  function render() {
    const v = VILLAGES[p.village] || VILLAGES.pine;
    const els = [p.element, p.element2].filter(Boolean).map((e) => ELEMENT_INFO[e]).filter(Boolean);
    const bl = p.bloodline ? BLOODLINES[p.bloodline] : null;
    const have = new Map((p.badges || []).map((b) => [b.id, b.at]));
    const pic = net.avatarURL(p.user_id, p.avatar_at);
    el.querySelector('.pf').innerHTML = `
      <h3>🥷 Ninja profile</h3>
      <div class="pf-head">
        <div class="pf-av-wrap">
          <div class="pf-av" style="--vc:${v.color}">${pic ? `<img src="${esc(pic)}" alt="${esc(p.name)}'s picture" width="128" height="128">` : '<canvas width="128" height="128" aria-label="Ninja portrait"></canvas>'}</div>
          ${p.me ? `<div class="pf-av-btns">
              ${p.can_upload === false ? '<small class="pf-note">Picture uploads are turned off for your account.</small>' : '<button class="btn small" data-up>Upload picture</button>'}
              ${p.avatar_at ? '<button class="btn small ghost" data-rm>Remove</button>' : ''}
              <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden data-file>
            </div>
            ${p.avatar_hidden ? '<small class="pf-note">Your picture was reported by several players and is hidden from others. Upload a different one.</small>' : ''}`
          : pic ? '<button class="pf-report" data-report>🚩 Report picture</button>' : ''}
        </div>
        <div class="pf-id">
          <h2>${esc(p.name)}</h2>
          ${p.title ? `<p class="ttl">🏆 ${esc(p.title)}</p>` : ''}
          <p class="pf-rank">${esc(p.rank)} · Lv ${p.level}</p>
          <p class="pf-vil" style="color:${v.dark}"><b>${esc(v.name)}</b></p>
          <p class="pf-tags">${p.kage ? '<span class="tag gold">👑 Kage</span>' : ''}${p.anbu ? `<span class="tag">🎭 ANBU · ${esc(p.anbu)}</span>` : ''}</p>
        </div>
      </div>
      <div class="pf-info">
        <div><small>Element</small><b>${els.map((e) => `${e.icon} ${e.label}`).join(' + ') || '?'}</b></div>
        <div><small>Bloodline</small><b>${bl ? `${bl.icon} ${esc(bl.label)}` : 'None yet'}</b></div>
        <div><small>Ninja since</small><b>${day(p.since)}</b></div>
        <div><small>Missions won</small><b>${p.mission_wins ?? 0}</b></div>
        <div><small>Arena points</small><b>${p.arena_points ?? 0}</b></div>
        <div><small>Quest lines</small><b>${p.quests_done ?? 0} / ${p.quests_total ?? 6}</b></div>
      </div>
      <div class="pf-stats">${['strength', 'agility', 'intelligence', 'willpower'].map((k) => `<div><small>${k[0].toUpperCase() + k.slice(1)}</small><b>${(p.stats || {})[k] ?? 0}</b></div>`).join('')}</div>
      <h4 class="pf-bh">Badges <small>${have.size} / ${BADGES.length}</small></h4>
      <div class="pf-badges">${BADGES.map((b) => {
        const at = have.get(b.id);
        return `<div class="bdg ${at ? 'got' : 'locked'}" title="${esc(b.how)}"><span class="bi">${b.icon}${at ? '' : '<i class="lk">🔒</i>'}</span><b>${esc(b.name)}</b><small>${at ? `Earned ${day(at)}` : esc(b.how)}</small></div>`;
      }).join('')}</div>
      <button class="btn ghost" data-x>Close</button>`;
    el.querySelector('[data-x]').onclick = close;
    const cv = el.querySelector('.pf-av canvas');
    if (cv) drawNinjaFit(cv, lookOf(p.look || {}, p.gear || {}), 0);
    const file = el.querySelector('[data-file]');
    el.querySelector('[data-up]')?.addEventListener('click', () => {
      // a short reminder before choosing, because pictures are public
      if (!sessionStorage.getItem('pfRules')) {
        if (!confirmRules()) return;
        sessionStorage.setItem('pfRules', '1');
      }
      file.click();
    });
    file?.addEventListener('change', async () => {
      const f = file.files[0]; if (!f) return;
      const btn = el.querySelector('[data-up]'); btn.disabled = true; btn.textContent = 'Uploading…';
      try { const blob = await prepare(f); const r = await net.uploadAvatar(blob); p.avatar_at = r.avatar_at; p.avatar_hidden = false; render(); onChange?.(p); }
      catch (err) { btn.disabled = false; btn.textContent = 'Upload picture'; note(err.message); }
    });
    el.querySelector('[data-rm]')?.addEventListener('click', async () => {
      try { await net.removeAvatar(); p.avatar_at = null; render(); onChange?.(p); } catch (err) { note(err.message); }
    });
    el.querySelector('[data-report]')?.addEventListener('click', async (e) => {
      const b = e.currentTarget; b.disabled = true;
      try { const r = await net.reportAvatar(p.user_id); b.textContent = r && r.hidden ? 'Thanks. The picture is now hidden.' : 'Thanks, reported.'; if (r && r.hidden) { p.avatar_at = null; render(); } }
      catch (err) { b.disabled = false; note(err.message); }
    });
  }
  function confirmRules() {
    return window.confirm('Your picture is public: every player can see it.\n\n• Use art, a drawing or your ninja, not a photo of yourself or anyone else.\n• Nothing rude, violent or hateful.\n\nPictures that several players report are hidden, and repeat reports turn uploads off.');
  }
  function note(text) {
    el.querySelector('.pf-err')?.remove();
    el.querySelector('.pf-av-wrap')?.insertAdjacentHTML('beforeend', `<p class="err pf-err">${esc(text)}</p>`);
  }
}
