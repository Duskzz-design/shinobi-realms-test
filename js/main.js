import * as net from './net.js?v=9d1c820';
import { sharpenText } from './crisp.js?v=9d1c820';
import { startPixify } from './pixemoji.js?v=9d1c820';
import { startTitleScene } from './scene.js?v=9d1c820';
import { enterWorld } from './game.js?v=9d1c820';
import { humanCheck, mountEmail, authMessage, linkParams, cleanLinkParams, newPasswordCard } from './emailauth.js?v=9d1c820';
import { ELEMENT_INFO, BLOODLINES, ELEMENTS } from './engine.js?v=9d1c820';
import { ninjaSprite, emblem, PALETTES, HAIR_STYLES, BAND_SPOTS, VILLAGES, DEFAULT_LOOK, lookOf } from './sprites.js?v=9d1c820';

const app = document.getElementById('app');
const bg = document.getElementById('bg');
let stopScene = startTitleScene(bg);
function sceneOn(on) { bg.style.display = on ? '' : 'none'; if (on && !stopScene) stopScene = startTitleScene(bg); if (!on && stopScene) { stopScene(); stopScene = null; } }

const h = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function toast(msg, kind = 'err') {
  const t = h(`<div class="toast ${kind}">${esc(msg)}</div>`);
  document.body.appendChild(t); setTimeout(() => t.remove(), 4200);
}
function show(el) { sceneOn(true); app.innerHTML = ''; app.appendChild(el); }

// ---------- animated sprite preview ----------
function spritePreview(canvas, getLook, opts = {}) {
  const ctx = canvas.getContext('2d');
  let dir = opts.dir ?? 0, t = 0, alive = true;
  const loop = () => {
    if (!alive || !canvas.isConnected) return;
    t++;
    const frame = opts.walk ? [0, 1, 0, 2][(t >> 4) % 4] : 0;
    const bob = !opts.walk && (t >> 5) % 2 ? 1 : 0;
    const spr = ninjaSprite(getLook(), dir, frame);
    const s = Math.floor(Math.min(canvas.width / (spr.width + 2), canvas.height / (spr.height + 3)));
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = false;
    // shadow
    ctx.fillStyle = 'rgba(60,30,10,.25)';
    const sw = 10 * s, sx = (canvas.width - sw) / 2, sy = (canvas.height + spr.height * s) / 2 - s;
    ctx.fillRect(sx, sy, sw, s * 2);
    ctx.drawImage(spr, (canvas.width - spr.width * s) / 2 | 0, ((canvas.height - spr.height * s) / 2 - bob * s) | 0, spr.width * s, spr.height * s);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  return { turn(d) { dir = (dir + d + 4) % 4; }, setDir(d) { dir = d; }, stop() { alive = false; } };
}

// ---------- screens ----------
function titleScreen() {
  const el = h(`
  <div class="screen title">
    <div class="logo">
      <h1><img src="../assets/brand/logo-stacked.svg" alt="Shinobi Realms" width="212" height="236"></h1>
      <p class="tag">A world of hidden villages. Forge your path.</p>
    </div>
    <div class="scroll title-card">
      <ul class="pitch">
        <li><i>🥷</i><span><b>Raise a ninja</b> from Academy student to Jonin. Train every 15 minutes and level up.</span></li>
        <li><i>⚔️</i><span><b>Tactical battles</b> on a hex grid, plus duels and the Arena against real players.</span></li>
        <li><i>🏯</i><span><b>Fight for your village</b> in quests, boss raids and wars, and maybe become its Kage.</span></li>
      </ul>
      ${net.IS_TEST ? '<p class="fine test-note">🧪 This is the private <b>test server</b>. Ninjas here are for testing only. To play the real game, go to <a href="https://shinobirealms.com/play/">shinobirealms.com</a>.</p>' : ''}
      <div class="gsi" id="gsi" hidden></div>
      <button class="btn google" id="g"><span class="gicon"></span>Sign in with Google</button>
      <button class="btn discord" id="dc"><span class="dicon"></span>Sign in with Discord</button>
      <button type="button" class="linkbtn em-open" id="emOpen" aria-expanded="false" aria-controls="emailBox">or use email</button>
      <div class="em-box" id="emailBox" hidden></div>
      <div class="ts" id="ts" data-need="One quick check: tick the box to show you're human"></div>
      <div class="safe-note">
        <b>🔒 Safe, secure sign-in</b>
        <span>You sign in on <b>Google's or Discord's own page</b>. We never see your password, and we can't read your emails, messages, contacts or files. They only share your <b>name, email address and profile picture</b> with us.</span>
        <a href="../privacy.html" target="_blank" rel="noopener">How we protect your data</a>
      </div>
      <p class="fine">Free to play. Your ninja is saved on our game server, linked to your sign-in.</p>
      ${net.isTester() ? '<button class="btn ghost small" id="guest">Tester: play as guest</button>' : ''}
    </div>
    <div class="credits">Season 1 · Early Access · <a href="../">About the game</a> · <a href="https://discord.gg/t2K3uCGrJv" target="_blank" rel="noopener">Discord</a> · <a href="../privacy.html">Privacy</a> · <a href="../terms.html">Terms</a></div>
  </div>`);
  if (el.querySelector('#g')) el.querySelector('#g').onclick = async (e) => {
    e.currentTarget.disabled = true; e.currentTarget.lastChild.textContent = 'Opening Google…';
    try { await net.signInGoogle(); } catch (err) { toast(friendly(err)); e.currentTarget.disabled = false; e.currentTarget.lastChild.textContent = 'Sign in with Google'; }
  };
  const check = net.isOffline() ? { token: async () => null, reset() {} } : humanCheck(el.querySelector('#ts'));
  if (!net.isOffline()) googleButton(el, check);
  mountEmail(el, check, toast);
  const dc = el.querySelector('#dc');
  if (dc) dc.onclick = async () => {
    dc.disabled = true; dc.lastChild.textContent = 'Opening Discord…';
    try { await net.signInDiscord(); } catch (err) { toast(friendly(err)); dc.disabled = false; dc.lastChild.textContent = 'Sign in with Discord'; }
  };
  const gb = el.querySelector('#guest');
  if (gb) gb.onclick = async () => { gb.disabled = true; try { await net.signInGuest(await check.token()); location.reload(); } catch (err) { toast(authMessage(err)); gb.disabled = false; check.reset(); } };
  show(el);
}

function loadingScreen(msg = 'Loading…') {
  show(h(`<div class="screen center"><div class="scroll small"><div class="spinner"></div><p>${esc(msg)}</p></div></div>`));
}

function creatorScreen(existing) {
  const look = { ...DEFAULT_LOOK, ...(existing?.appearance || {}) };
  let village = existing?.village || null;
  const el = h(`
  <div class="screen creator">
    <header class="bar"><h2>Create your Ninja</h2><button class="btn ghost small" id="out">Sign out</button></header>
    <div class="creator-grid">
      <section class="scroll preview">
        <div class="stage"><canvas id="pv" width="288" height="320"></canvas></div>
        <div class="turn"><button class="btn icon" id="tl" aria-label="Turn left">◀</button><span>Turn</span><button class="btn icon" id="tr" aria-label="Turn right">▶</button></div>
        <button class="btn ghost small" id="rand">🎲 Randomise look</button>
      </section>
      <section class="scroll options">
        <label class="field"><span class="lbl">Ninja name</span>
          <input id="name" maxlength="16" autocomplete="off" placeholder="3–16 letters or numbers" value="${esc(existing?.name || '')}">
          <small id="namehint" class="hint">Letters, numbers and spaces.</small>
        </label>
        <div class="field"><span class="lbl">Village</span><div class="villages" id="villages"></div>
          <small class="hint vhint">🏯 Your village is your team for life: you share its chat, earn points for it, join its wars and can rise to become its Kage. All villages are equally strong, so pick the one you like.</small>
          <small class="hint vhint">🎲 You'll be born with a random <b>element</b> (Fire, Wind, Lightning, Earth or Water). A lucky few awaken a rare <b>bloodline</b> at the Genin exam.</small></div>
        <div class="field"><span class="lbl">Hair style</span><div class="stepper" id="hs"></div></div>
        <div class="field"><span class="lbl">Hair colour</span><div class="swatches" id="hair"></div></div>
        <div class="field"><span class="lbl">Skin tone</span><div class="swatches" id="skin"></div></div>
        <div class="field"><span class="lbl">Outfit colour</span><div class="swatches" id="outfit"></div></div>
        <div class="field"><span class="lbl">Headband</span><div class="stepper" id="bs"></div><div class="swatches mt" id="band"></div></div>
        <button class="btn primary big" id="go">Begin your path</button>
      </section>
    </div>
  </div>`);
  const pv = spritePreview(el.querySelector('#pv'), () => look, { walk: false });
  el.querySelector('#tl').onclick = () => pv.turn(1);
  el.querySelector('#tr').onclick = () => pv.turn(-1);
  el.querySelector('#out').onclick = () => net.signOut();

  // villages
  const vbox = el.querySelector('#villages');
  for (const [id, v] of Object.entries(VILLAGES)) {
    const b = h(`<button class="village" data-v="${id}" style="--vc:${v.color};--vd:${v.dark}"><div class="em"></div><b>${v.name}</b><small>${v.desc}</small></button>`);
    b.querySelector('.em').appendChild(emblem(id, 40));
    b.onclick = () => { village = id; refresh(); };
    vbox.appendChild(b);
  }
  // swatches
  const sw = (key, pal) => {
    const box = el.querySelector('#' + key);
    pal.forEach((c, i) => { const b = h(`<button class="sw" style="background:${c}" aria-label="${key} ${i + 1}"></button>`); b.onclick = () => { look[key] = i; refresh(); }; box.appendChild(b); });
  };
  sw('hair', PALETTES.hair); sw('skin', PALETTES.skin); sw('outfit', PALETTES.outfit); sw('band', PALETTES.band);
  const stepper = (id, key, names) => {
    const box = el.querySelector('#' + id);
    box.innerHTML = `<button class="btn icon" aria-label="Previous">◀</button><span class="val"></span><button class="btn icon" aria-label="Next">▶</button>`;
    const [a, , c] = box.children;
    a.onclick = () => { look[key] = (look[key] - 1 + names.length) % names.length; refresh(); };
    c.onclick = () => { look[key] = (look[key] + 1) % names.length; refresh(); };
  };
  stepper('hs', 'hairStyle', HAIR_STYLES); stepper('bs', 'bandSpot', BAND_SPOTS);
  el.querySelector('#rand').onclick = () => {
    const r = (n) => (Math.random() * n) | 0;
    Object.assign(look, { hairStyle: r(HAIR_STYLES.length), hair: r(PALETTES.hair.length), skin: r(PALETTES.skin.length), outfit: r(PALETTES.outfit.length), band: r(PALETTES.band.length), bandSpot: r(3) });
    refresh();
  };

  function refresh() {
    vbox.querySelectorAll('.village').forEach((b) => b.classList.toggle('on', b.dataset.v === village));
    for (const k of ['hair', 'skin', 'outfit', 'band']) el.querySelectorAll('#' + k + ' .sw').forEach((b, i) => b.classList.toggle('on', i === look[k]));
    el.querySelector('#hs .val').textContent = HAIR_STYLES[look.hairStyle];
    el.querySelector('#bs .val').textContent = BAND_SPOTS[look.bandSpot];
    el.querySelector('#band').style.display = look.bandSpot === 3 ? 'none' : '';
    if (village && look.band === 0) { /* village-tinted cloth handled by palette */ }
  }
  refresh();

  // name check
  const nameIn = el.querySelector('#name'), hint = el.querySelector('#namehint');
  let nameOk = false, timer;
  const validName = (n) => /^[A-Za-z0-9_ ]{3,16}$/.test(n) && n.trim().length >= 3;
  nameIn.oninput = () => {
    clearTimeout(timer);
    const n = nameIn.value.trim(); nameOk = false;
    if (!n) { hint.className = 'hint'; hint.textContent = 'Letters, numbers and spaces.'; return; }
    if (!validName(n)) { hint.className = 'hint bad'; hint.textContent = '3–16 letters, numbers or spaces only.'; return; }
    hint.className = 'hint'; hint.textContent = 'Checking…';
    timer = setTimeout(async () => {
      try {
        const ok = await net.nameAvailable(n);
        if (nameIn.value.trim() !== n) return;
        nameOk = ok; hint.className = 'hint ' + (ok ? 'good' : 'bad'); hint.textContent = ok ? '✓ That name is free.' : 'That name is taken.';
      } catch { hint.className = 'hint bad'; hint.textContent = 'Could not check the name right now.'; }
    }, 400);
  };
  if (nameIn.value) nameIn.oninput();

  el.querySelector('#go').onclick = async (e) => {
    const n = nameIn.value.trim();
    if (!validName(n)) { toast('Pick a name first: 3–16 letters or numbers.'); nameIn.focus(); return; }
    if (!village) { toast('Choose your village.'); vbox.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
    const btn = e.currentTarget; btn.disabled = true; btn.textContent = 'Creating…';
    try {
      if (!(await net.nameAvailable(n))) throw new Error('That name is taken. Try another.');
      const c = await net.createCharacter({ name: n, village, appearance: look });
      pv.stop(); profileScreen(c, true);
    } catch (err) { toast(friendly(err)); btn.disabled = false; btn.textContent = 'Begin your path'; }
  };
  show(el);
}

function elementNote(el) {
  const i = ELEMENTS.indexOf(el); if (i < 0) return '';
  const E = (k) => `${ELEMENT_INFO[k].icon} <b>${ELEMENT_INFO[k].label}</b>`;
  return `<p class="born">You were born with ${E(el)}. Your ${ELEMENT_INFO[el].label} jutsu deal <b>+25%</b> damage to ${E(ELEMENTS[(i + 1) % 5])} ninja, but ${E(ELEMENTS[(i + 4) % 5])} deals +25% to you. Your first steps: head to the <b>Academy</b>. A guide will show you the way.</p>`;
}

function profileScreen(c, fresh = false) {
  const v = VILLAGES[c.village];
  const xpNeed = c.xp_need || (c.level < 5 ? 3 : c.level < 15 ? 22 : c.level < 30 ? 85 : 190) * 100 * c.level;
  const styles = [['Strength', c.strength, '#d84a3a'], ['Agility', c.agility, '#3a8a4a'], ['Intelligence', c.intelligence, '#2f7fc4'], ['Willpower', c.willpower, '#9a5ad0']];
  const cap = c.stat_cap || 20;
  const el = h(`
  <div class="screen profile">
    <header class="bar"><h2>${fresh ? 'Welcome, ninja!' : 'Your Ninja'}</h2><button class="btn ghost small" id="out">Sign out</button></header>
    <section class="scroll card" style="--vc:${v.color}">
      <div class="card-top">
        <div class="stage sm"><canvas id="pv" width="160" height="190"></canvas></div>
        <div class="who">
          <div class="vrow"><span class="em"></span><span>${v.name}</span></div>
          <h3>${esc(c.name)}</h3>
          <div class="rank">${esc(c.rank)} · Level ${c.level}</div>${c.title ? `<div class="ttl">🏆 ${esc(c.title)}</div>` : ''}
          <div class="elrow">${[c.element, c.element2].filter(Boolean).map((k) => `<span class="elc" style="--c:${ELEMENT_INFO[k].color}">${ELEMENT_INFO[k].icon} ${ELEMENT_INFO[k].label}</span>`).join(' ')}${c.bloodline ? ` <span class="elc" style="--c:#c43c8a">${BLOODLINES[c.bloodline].icon} ${BLOODLINES[c.bloodline].label}</span>` : ''}</div>
          <div class="xp"><div style="width:${Math.min(100, (c.xp / xpNeed) * 100)}%"></div></div>
          <small>${c.xp} / ${xpNeed} XP · 💰 ${c.ryo} ryo · 🏆 ${c.arena_points || 0} Arena</small>
        </div>
      </div>
      <div class="styles">${styles.map(([n, val, col]) => `<div class="st"><span>${n}</span><div class="pips">${Array.from({ length: 10 }, (_, i) => `<i style="${i < Math.round(10 * val / cap) ? 'background:' + col : ''}"></i>`).join('')}</div><b>${val}</b></div>`).join('')}</div>
      ${fresh && c.element ? elementNote(c.element) : ''}
      <div class="actions">
        <button class="btn primary big" id="enter">Enter ${v.short} Village</button>
        <button class="btn ghost small" id="edit">Change look</button>
      </div>
    </section>
  </div>`);
  el.querySelector('.em').appendChild(emblem(c.village, 24));
  const shown = lookOf(c.appearance, c.gear); spritePreview(el.querySelector('#pv'), () => shown, { walk: true, dir: 0 });
  el.querySelector('#out').onclick = () => net.signOut();
  el.querySelector('#edit').onclick = () => lookEditor(c);
  el.querySelector('#enter').onclick = () => village(c);
  show(el);
}

async function village(c) {
  sceneOn(false);
  try {
    await enterWorld(app, c, { profile: async () => { profileScreen(await net.loadCharacter()); } });
  } catch (e) { console.error(e); toast(friendly(e)); profileScreen(c); }
}

function lookEditor(c) {
  // reuse creator for look only
  creatorScreen(c);
  const go = app.querySelector('#go'), nameIn = app.querySelector('#name');
  nameIn.disabled = true; app.querySelector('#namehint').textContent = 'Names are permanent.';
  app.querySelectorAll('.village').forEach((b) => (b.disabled = true));
  app.querySelector('.bar h2').textContent = 'Change your look';
  go.textContent = 'Save look';
  go.onclick = async () => {
    go.disabled = true;
    try {
      const look = currentLookFromUI();
      const nc = await net.updateAppearance(look); profileScreen(nc);
    } catch (err) { toast(friendly(err)); go.disabled = false; }
  };
  function currentLookFromUI() {
    const idx = (k) => [...app.querySelectorAll('#' + k + ' .sw')].findIndex((b) => b.classList.contains('on'));
    return {
      hairStyle: HAIR_STYLES.indexOf(app.querySelector('#hs .val').textContent),
      bandSpot: BAND_SPOTS.indexOf(app.querySelector('#bs .val').textContent),
      hair: idx('hair'), skin: idx('skin'), outfit: idx('outfit'), band: Math.max(0, idx('band')),
    };
  }
}

function friendly(err) {
  const m = (err && err.message) || String(err);
  if (/provider is not enabled|Unsupported provider/i.test(m)) return 'Google sign-in is being switched on. Try again in a few minutes.';
  if (/Failed to fetch|NetworkError/i.test(m)) return 'Could not reach the game servers. Check your connection.';
  return m;
}

// ---------- boot ----------
async function boot() {
  try { await net.init(); } catch (e) { titleScreen(); toast(friendly(e)); return; }
  const route = async (user) => {
    if (!user) return titleScreen();
    loadingScreen('Finding your ninja…');
    try {
      const c = await net.loadCharacter();
      c ? village(c) : creatorScreen(null);
    } catch (e) { toast(friendly(e)); titleScreen(); }
  };
  const params = new URLSearchParams(location.search);
  if (params.get('error_description')) toast(params.get('error_description'));
  // a confirmation or password-reset email link brings the player back here with a one-time token
  const link = linkParams();
  if (link) {
    cleanLinkParams();
    try { await net.verifyEmailLink(link.token, link.type); }
    catch (e) { titleScreen(); toast(authMessage(e)); return; }
    if (link.type === 'recovery') { show(newPasswordCard(h, toast, async () => route(await net.getUser()))); return; }
    toast('Email confirmed. Welcome to Shinobi Realms!', 'ok');
  }
  let routed = false;
  net.onAuth((u) => { if (routed && u) return; });
  const u = await net.getUser(); routed = true;
  if (u && location.search.includes('code=')) history.replaceState({}, '', location.pathname + location.search.replace(/[?&]code=[^&]*/, '').replace(/^&/, '?'));
  route(u);
}
// a badge on every screen of the test server, so it is never mistaken for the real game
if (net.IS_TEST) document.body.insertAdjacentHTML('beforeend', '<div class="test-badge">TEST SERVER</div>');
startPixify();
sharpenText();
boot();

// Google's own sign-in button: the pop-up comes from our page, so Google shows shinobirealms.com.
// If Google's script can't load (blocked, offline), our own button stays and uses the older redirect sign-in.
function googleButton(el, check) {
  const box = el.querySelector('#gsi'), mine = el.querySelector('#g');
  if (!box || !mine) return;
  const s = document.createElement('script');
  s.src = 'https://accounts.google.com/gsi/client'; s.async = true;
  s.onload = async () => {
    try {
      const { raw, hashed } = await net.googleNonce();
      google.accounts.id.initialize({
        client_id: net.GOOGLE_CLIENT_ID, nonce: hashed, ux_mode: 'popup', itp_support: true, use_fedcm_for_button: true,
        callback: async (r) => {
          box.classList.add('busy');
          try { await net.signInGoogleToken(r.credential, raw, await check.token()); location.reload(); }
          catch (err) { box.classList.remove('busy'); check.reset(); toast(authMessage(err)); }
        },
      });
      const w = Math.max(220, Math.min(320, Math.floor(mine.getBoundingClientRect().width) || 300));
      google.accounts.id.renderButton(box, { type: 'standard', theme: 'outline', size: 'large', text: 'signin_with', shape: 'rectangular', logo_alignment: 'left', width: w });
      box.hidden = false; mine.hidden = true;
    } catch (e) { console.warn('Google button unavailable, using redirect sign-in', e); }
  };
  document.head.appendChild(s);
}
