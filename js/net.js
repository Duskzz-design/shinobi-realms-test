// Data layer: Supabase in production, an in-memory stand-in for offline testing (?offline).
// Two servers: LIVE (real players) and TEST (fake ninjas, for trying changes first).
// The address the game is opened on decides which one it talks to.
const SERVERS = {
  live: { url: 'https://azetseowvqyqhcnjzvnb.supabase.co', key: 'sb_publishable_wIQUai52KRMk3WTRCm4mzg_5itXxKF4' },
  test: { url: 'https://lkvlpbdjuokemtucjnlk.supabase.co', key: 'sb_publishable_e3Mm5KrTJlnrrYhweYlEAg_FPtXqGfq' },
};
export const IS_TEST = /^(test\.shinobirealms\.com|localhost|127\.0\.0\.1)$/.test(location.hostname);
export const SUPABASE_URL = SERVERS[IS_TEST ? 'test' : 'live'].url;
export const SUPABASE_KEY = SERVERS[IS_TEST ? 'test' : 'live'].key;

const OFFLINE = new URLSearchParams(location.search).has('offline');
let sb = null;
// Hidden tester entrance: a secret word in the address (?<word>). Only its SHA-256 is kept here,
// so reading the code does not reveal the word.
const TESTER_HASH = '13c2dee896deedb1666670f10b64286af3f26c7cebbabe1481b006c18aaf8bf4';
let TESTER = false;
async function checkTester() {
  try {
    for (const k of new URLSearchParams(location.search).keys()) {
      const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(k));
      if ([...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('') === TESTER_HASH) return true;
    }
  } catch {}
  return false;
}

export function isOffline() { return OFFLINE; }
export function isTester() { return TESTER; }

export async function init() {
  TESTER = await checkTester();
  if (OFFLINE) return;
  if (!window.supabase) throw new Error('Could not reach the game servers. Check your connection and refresh.');
  // tester mode keeps each tab's login separate, so two test ninjas can duel each other
  sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: true, detectSessionInUrl: true, flowType: 'pkce', ...(TESTER ? { storage: window.sessionStorage, storageKey: 'sr-tester' } : {}) } });
}
export function client() { return sb; }

// ---------- auth ----------
const mock = { user: null, char: null };
export async function getUser() {
  if (OFFLINE) { const u = sessionStorage.getItem('mockUser'); return u ? JSON.parse(u) : null; }
  const { data } = await sb.auth.getSession();
  return data.session ? data.session.user : null;
}
export function onAuth(cb) {
  if (OFFLINE) return;
  sb.auth.onAuthStateChange((_e, s) => cb(s ? s.user : null));
}
// hidden tester entrance (see TESTER_HASH): a guest account with no password
export async function signInGuest(captchaToken) {
  const { data, error } = await sb.auth.signInAnonymously({ options: { captchaToken: captchaToken || undefined } });
  if (error) throw error;
  return data.user;
}
export async function signInGoogle() {
  if (OFFLINE) { sessionStorage.setItem('mockUser', JSON.stringify({ id: 'u' + Math.random().toString(36).slice(2, 8), email: 'tester@example.com' })); location.reload(); return; }
  const { error } = await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + location.pathname + (TESTER ? location.search : '') } });
  if (error) throw error;
}
// Google's own "Sign in with Google" button (shown on our page, so Google names shinobirealms.com,
// not the login server's address). It hands us an ID token, which Supabase checks against this public client ID.
export const GOOGLE_CLIENT_ID = '118519828774-9nbn7ldieftre5sdeg633sfntim1tlr0.apps.googleusercontent.com';
export async function googleNonce() {
  const raw = [...crypto.getRandomValues(new Uint8Array(24))].map((b) => b.toString(16).padStart(2, '0')).join('');
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
  return { raw, hashed: [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('') };
}
export async function signInGoogleToken(token, nonce, captchaToken) {
  const { data, error } = await sb.auth.signInWithIdToken({ provider: 'google', token, nonce, options: { captchaToken: captchaToken || undefined } });
  if (error) throw error;
  return data.user;
}
// Discord sign-in: the player logs in on Discord's own page; we only ask for their username, avatar and email.
export async function signInDiscord() {
  if (OFFLINE) return signInGoogle();
  const { error } = await sb.auth.signInWithOAuth({ provider: 'discord', options: { scopes: 'identify email', redirectTo: location.origin + location.pathname + (TESTER ? location.search : '') } });
  if (error) throw error;
}
// ---------- email + password accounts ----------
const backHere = () => location.origin + location.pathname + (TESTER ? location.search : '');
export async function signUpEmail(email, password, news, captchaToken) {
  const { error } = await sb.auth.signUp({ email, password, options: {
    captchaToken: captchaToken || undefined, emailRedirectTo: backHere(),
    data: { news_opt_in: !!news, news_opt_in_at: news ? new Date().toISOString() : null } } });
  if (error) throw error;
}
export async function signInEmail(email, password, captchaToken) {
  const { error } = await sb.auth.signInWithPassword({ email, password, options: { captchaToken: captchaToken || undefined } });
  if (error) throw error;
}
export async function resendSignupEmail(email, captchaToken) {
  const { error } = await sb.auth.resend({ type: 'signup', email, options: { captchaToken: captchaToken || undefined, emailRedirectTo: backHere() } });
  if (error) throw error;
}
export async function sendPasswordReset(email, captchaToken) {
  const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: backHere(), captchaToken: captchaToken || undefined });
  if (error) throw error;
}
// the links in our emails carry a one-time token; this signs the player in on whatever device they open it
export async function verifyEmailLink(token_hash, type) {
  const { error } = await sb.auth.verifyOtp({ token_hash, type });
  if (error) throw error;
}
export async function setNewPassword(password) {
  const { error } = await sb.auth.updateUser({ password });
  if (error) throw error;
}
export async function signOut() {
  if (OFFLINE) { sessionStorage.clear(); location.reload(); return; }
  await sb.auth.signOut(); location.reload();
}

// ---------- chat (server-run: the server stamps the name, filters words and limits spam) ----------
let mockChatId = 1;
export async function say(text, ch) {
  if (OFFLINE) {
    const c = JSON.parse(sessionStorage.getItem('mockChar') || 'null') || {};
    const m = { id: mockChatId++, uid: c.user_id || 'me', name: c.name || 'You', village: c.village || 'pine', ch, text: String(text).slice(0, 120), at: new Date().toISOString() };
    try { const bc = new BroadcastChannel('mock-chat:' + (ch === 'world' ? 'world' : 'village:' + m.village)); bc.postMessage({ t: 'ev', ev: 'msg', p: m }); bc.close(); } catch {}
    return m;
  }
  const { data, error } = await sb.rpc('chat_say', { p_text: text, p_channel: ch });
  if (error) throw new Error(error.message);
  return data;
}
export async function reportChat(id, reason) {
  if (OFFLINE) return { ok: true };
  const { data, error } = await sb.rpc('chat_report', { p_id: id, p_reason: reason || null });
  if (error) throw new Error(error.message);
  return data;
}

// ---------- profiles, pictures and badges ----------
export function avatarURL(userId, at) {
  if (!at) return null;
  if (OFFLINE) return sessionStorage.getItem('mockAvatar');
  return `${SUPABASE_URL}/storage/v1/object/public/avatars/${userId}/avatar.webp?v=${Date.parse(at) || 0}`;
}
export async function getProfile({ userId = null, name = null } = {}) {
  if (OFFLINE) {
    const c = JSON.parse(sessionStorage.getItem('mockChar') || 'null') || {};
    const mine = !userId && !name || userId === c.user_id || (name && name.toLowerCase() === String(c.name).toLowerCase());
    const base = mine ? c : { user_id: userId || 'bot', name: name || 'Ren', level: 14, rank: 'Genin', village: c.village || 'pine', appearance: { hair: 2, outfit: 1 } };
    return { user_id: base.user_id, name: base.name, level: base.level || 1, rank: base.rank, village: base.village, title: base.title || null, element: base.element || 'fire', element2: base.element2 || null,
      bloodline: base.bloodline || null, since: (base.created_at || new Date().toISOString()).slice(0, 10), arena_points: base.arena_points || 0, mission_wins: base.mission_wins || 0,
      look: base.appearance || {}, gear: base.gear || {}, stats: { strength: base.strength || 5, agility: base.agility || 5, intelligence: base.intelligence || 5, willpower: base.willpower || 5 },
      kage: false, anbu: null, quests_done: Object.values(base.quests || {}).filter((q) => q.done).length, quests_total: 6,
      avatar_at: mine ? sessionStorage.getItem('mockAvatarAt') : null, avatar_hidden: false, can_upload: mine ? true : null,
      badges: mine ? [{ id: 'legend_iron', at: new Date().toISOString() }] : [{ id: 'kage', at: new Date().toISOString() }], me: mine };
  }
  const { data, error } = await sb.rpc('get_profile', { p_user: userId, p_name: name });
  if (error) throw new Error(error.message);
  return data;
}
export async function uploadAvatar(blob) {
  if (OFFLINE) {
    const url = await new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(blob); });
    const at = new Date().toISOString(); sessionStorage.setItem('mockAvatar', url); sessionStorage.setItem('mockAvatarAt', at); return { avatar_at: at };
  }
  const u = await getUser(); if (!u) throw new Error('Sign in first.');
  const { error } = await sb.storage.from('avatars').upload(`${u.id}/avatar.webp`, blob, { upsert: true, contentType: blob.type || 'image/webp', cacheControl: '3600' });
  if (error) throw new Error(/row-level|policy|Unauthorized/i.test(error.message) ? 'Picture uploads are turned off for your account.' : error.message);
  const { data, error: e2 } = await sb.rpc('set_avatar');
  if (e2) throw new Error(e2.message);
  return data;
}
export async function removeAvatar() {
  if (OFFLINE) { sessionStorage.removeItem('mockAvatar'); sessionStorage.removeItem('mockAvatarAt'); return { avatar_at: null }; }
  const u = await getUser(); if (!u) throw new Error('Sign in first.');
  await sb.storage.from('avatars').remove([`${u.id}/avatar.webp`]);
  const { data, error } = await sb.rpc('clear_avatar');
  if (error) throw new Error(error.message);
  return data;
}
export async function reportAvatar(userId) {
  if (OFFLINE) return { ok: true };
  const { data, error } = await sb.rpc('report_avatar', { p_user: userId });
  if (error) throw new Error(error.message);
  return data;
}

// ---------- account ----------
export async function deleteAccount() {
  if (OFFLINE) { sessionStorage.clear(); return { deleted: true }; }
  try { const u = await getUser(); if (u) await sb.storage.from('avatars').remove([`${u.id}/avatar.webp`]); } catch {} // their picture goes too
  const { data, error } = await sb.rpc('delete_my_account');
  if (error) throw new Error(error.message);
  try { await sb.auth.signOut({ scope: 'local' }); } catch {}
  return data;
}

// ---------- character ----------
export async function loadCharacter() {
  if (OFFLINE) { const c = sessionStorage.getItem('mockChar'); if (!c) return null; const o = await import('./offline.js?v=9d1c820'); const x = JSON.parse(c); o.enrich(x); saveMock(x); return o.enrich(x); }
  const { data, error } = await sb.rpc('get_me');
  if (error) throw error;
  return data;
}
export async function nameAvailable(name) {
  if (OFFLINE) return name.toLowerCase() !== 'taken';
  const { data, error } = await sb.rpc('name_available', { p_name: name });
  if (error) throw error;
  return data;
}
export async function createCharacter({ name, village, appearance }) {
  if (OFFLINE) {
    const c = { user_id: JSON.parse(sessionStorage.getItem('mockUser')).id, name, village, appearance, level: 1, xp: 0, rank: 'Academy Student', strength: 5, agility: 5, intelligence: 5, willpower: 5, energy: 100, energy_at: Date.now(), jutsu: {}, ryo: 100 };
    sessionStorage.setItem('mockChar', JSON.stringify(c)); return (await import('./offline.js?v=9d1c820')).enrich(c);
  }
  const { error } = await sb.from('characters').insert({ name, village, appearance });
  if (error) {
    if (error.code === '23505') throw new Error('That name was just taken. Try another.');
    throw error;
  }
  // a brand-new ninja starts the guided first session from the beginning
  try { const u = await getUser(); if (u) localStorage.removeItem('sr_guide_' + u.id); } catch {}
  return loadCharacter();
}
export async function savePosition(x, y) {
  x = Math.round(x); y = Math.round(y);
  if (OFFLINE) { const c = JSON.parse(sessionStorage.getItem('mockChar')); Object.assign(c, { pos_x: x, pos_y: y }); sessionStorage.setItem('mockChar', JSON.stringify(c)); return; }
  const u = await getUser(); if (!u) return;
  await sb.from('characters').update({ pos_x: x, pos_y: y }).eq('user_id', u.id);
}

// ---------- realtime rooms ----------
// joinRoom(name, { me, onEvent(event, payload), onPresence(list), onStatus(state) }) -> { send, track, leave, rejoin, state }
// Self-healing: if the channel errors, times out or closes (sleeping laptop, phone app switch, expired login),
// it refreshes the login and rejoins with back-off, then re-announces this player.
export async function joinRoom(name, { me, onEvent, onPresence, onStatus, events = [], pauseWhenHidden = 0 }) {
  if (OFFLINE) return mockRoom(name, { me, onEvent, onPresence });
  let ch = null, state = 'connecting', lastMeta = me, closed = false, retry = null, tries = 0;
  const debug = new URLSearchParams(location.search).has('netdebug');
  const setState = (s, why) => { if (state === s) return; state = s; if (debug) console.log('[room]', name, s, why || ''); onStatus && onStatus(s, why); };
  async function connect() {
    if (closed) return;
    clearTimeout(retry);
    const { data } = await sb.auth.getSession(); // refreshes an expired login
    if (data.session) sb.realtime.setAuth(data.session.access_token);
    if (ch) { try { await sb.removeChannel(ch); } catch {} }
    const c = sb.channel(name, { config: { private: true, broadcast: { self: false }, presence: { key: me ? me.id : undefined } } });
    ch = c;
    for (const ev of events) c.on('broadcast', { event: ev }, (m) => onEvent && onEvent(ev, m.payload));
    if (onPresence) c.on('presence', { event: 'sync' }, () => {
      if (c !== ch) return;
      const st = c.presenceState(); const list = [];
      for (const k in st) { const m = st[k][st[k].length - 1]; if (m) list.push(m); }
      onPresence(list);
    });
    return new Promise((res) => {
      const t = setTimeout(() => { if (c === ch && state !== 'live') { setState('error', 'timeout'); schedule(); } res(); }, 8000);
      c.subscribe(async (status, err) => {
        if (c !== ch) return;
        if (status === 'SUBSCRIBED') { tries = 0; clearTimeout(t); setState('live'); if (lastMeta) await c.track(lastMeta); res(); }
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') { clearTimeout(t); if (!closed) { setState('error', status + (err ? ': ' + err.message : '')); schedule(); } res(); }
      });
    });
  }
  function schedule() { clearTimeout(retry); if (closed) return; const wait = Math.min(30000, 1000 * 2 ** Math.min(tries++, 5)); retry = setTimeout(connect, wait); }
  // coming back to the tab: make sure we're still connected and visible
  // hidden tabs drop out of busy rooms after a while (saves messages); coming back reconnects
  let hideTimer = null;
  const onVisible = () => { clearTimeout(hideTimer); if (document.visibilityState === 'hidden' && pauseWhenHidden && !closed) { hideTimer = setTimeout(() => { if (ch && document.visibilityState === 'hidden') { const c = ch; ch = null; setState('paused', 'hidden'); sb.removeChannel(c); } }, pauseWhenHidden); return; } if (document.visibilityState !== 'visible' || closed) return; if (state !== 'live' || (ch && ch.state !== 'joined')) { tries = 0; connect(); } else if (lastMeta) ch.track(lastMeta); };
  const onShow = (e) => { if (e.persisted && !closed) { tries = 0; connect(); } };
  document.addEventListener('visibilitychange', onVisible);
  addEventListener('pageshow', onShow);
  addEventListener('online', onVisible);
  await connect();
  return {
    ready: () => state === 'live',
    state: () => state,
    rejoin: () => { tries = 0; return connect(); },
    send: (event, payload) => (state === 'live' && ch ? ch.send({ type: 'broadcast', event, payload }) : Promise.resolve('offline')),
    track: (meta) => { lastMeta = meta; return state === 'live' && ch ? ch.track(meta) : Promise.resolve('offline'); },
    leave: () => { closed = true; clearTimeout(retry); clearTimeout(hideTimer); document.removeEventListener('visibilitychange', onVisible); removeEventListener('pageshow', onShow); removeEventListener('online', onVisible); return ch ? sb.removeChannel(ch) : null; },
    pause: () => { if (ch) { const c = ch; ch = null; setState('paused'); sb.removeChannel(c); } },
  };
}

// Offline: BroadcastChannel between tabs + optional wandering bots (?bots)
function mockRoom(name, { me, onEvent, onPresence }) {
  const bc = new BroadcastChannel('mock-' + name);
  const peers = new Map();
  const bots = new URLSearchParams(location.search).has('bots') && name.startsWith('village:') ? makeBots(onEvent) : [];
  const emitPresence = () => onPresence && onPresence([...(me ? [me] : []), ...peers.values(), ...bots.map((b) => b.meta)]);
  bc.onmessage = (e) => {
    const { t, ev, p, meta } = e.data;
    if (t === 'pres') { peers.set(meta.id, meta); emitPresence(); }
    if (t === 'bye') { peers.delete(meta.id); emitPresence(); }
    if (t === 'ev') onEvent && onEvent(ev, p);
  };
  let cur = me;
  const hb = setInterval(() => cur && bc.postMessage({ t: 'pres', meta: cur }), 1500);
  if (cur) bc.postMessage({ t: 'pres', meta: cur });
  setTimeout(emitPresence, 50);
  return {
    ready: () => true,
    send: (ev, p) => bc.postMessage({ t: 'ev', ev, p }),
    track: (meta) => { cur = meta; bc.postMessage({ t: 'pres', meta }); },
    leave: () => { clearInterval(hb); if (cur) bc.postMessage({ t: 'bye', meta: cur }); bc.close(); bots.forEach((b) => clearInterval(b.iv)); },
  };
}
function makeBots(onEvent) {
  const names = [['Ren', 2], ['Mika', 4], ['Sora', 0]];
  return names.map(([n, h], i) => {
    const meta = { id: 'bot' + i, name: n, village: 'pine', rank: 'Genin', level: 3 + i, look: { hairStyle: i + 1, hair: h, skin: i + 1, outfit: i + 3, band: i % 3, bandSpot: 0 }, x: 360 + i * 40, y: 400, dir: 0 };
    let tx = meta.x, ty = meta.y, k = 0;
    const iv = setInterval(() => {
      k++;
      if (k % 20 === 0) { tx = 300 + Math.random() * 180; ty = 340 + Math.random() * 120; }
      const dx = tx - meta.x, dy = ty - meta.y, d = Math.hypot(dx, dy);
      const moving = d > 2;
      if (moving) { meta.x += (dx / d) * 6; meta.y += (dy / d) * 6; meta.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 1 : 2) : (dy < 0 ? 3 : 0); }
      onEvent && onEvent('mv', { id: meta.id, x: meta.x, y: meta.y, dir: meta.dir, m: moving ? 1 : 0 });
      if (k % 55 === 0 + i * 7) onEvent && onEvent('chat', { id: meta.id, name: n, village: 'pine', text: ['Anyone up for a mission?', 'Nice headband!', 'Training at the arena later.'][i], ch: 'village' });
    }, 100);
    return { meta, iv };
  });
}

// ---------- rank exams ----------
export async function examInfo() {
  if (OFFLINE) { const o = await import('./offline.js?v=9d1c820'); return o.examInfo(mockChar()); }
  const { data, error } = await sb.rpc('exam_info'); if (error) throw rpcErr(error); return data;
}
let catalog = null, mockBattle = null;
const mockChar = () => JSON.parse(sessionStorage.getItem('mockChar'));
const saveMock = (c) => sessionStorage.setItem('mockChar', JSON.stringify(c));
const rpcErr = (error) => new Error((error.message || 'Something went wrong.').replace(/^.*?ERROR:\s*/, ''));
// all fights run on the battle server
async function battleCall(body) {
  const { data, error } = await sb.functions.invoke('battle', { body });
  if (error) {
    let msg = 'Could not reach the battle server. Try again.';
    try { const j = await error.context.json(); if (j.error) msg = j.error; } catch {}
    throw new Error(msg);
  }
  if (data && data.error) throw new Error(data.error);
  return data;
}
export async function startExam() {
  if (OFFLINE) { const o = await import('./offline.js?v=9d1c820'); const c = mockChar(); mockBattle = o.mockStartExam(c); saveMock(c); return clone(mockBattle); }
  return battleCall({ op: 'exam' });
}
export async function examContinue(battleId) {
  if (OFFLINE) { const o = await import('./offline.js?v=9d1c820'); mockBattle = o.mockExamContinue(mockChar(), mockBattle); return clone(mockBattle); }
  return battleCall({ op: 'continue', battle: battleId });
}

// ---------- missions & combat ----------
const clone = (x) => JSON.parse(JSON.stringify({ ...x, m: undefined }));
export async function getCatalog() {
  if (catalog) return catalog;
  if (OFFLINE) { const o = await import('./offline.js?v=9d1c820'); return (catalog = { moves: o.MOVES, missions: o.MISSIONS }); }
  const [mv, ms] = await Promise.all([sb.from('moves').select('*').order('sort'), sb.from('missions').select('*').eq('kind', 'mission').order('sort')]);
  if (mv.error) throw mv.error; if (ms.error) throw ms.error;
  return (catalog = { moves: mv.data, missions: ms.data });
}
export async function startMission(id) {
  if (OFFLINE) { const o = await import('./offline.js?v=9d1c820'); mockBattle = o.mockStart(mockChar(), id); return clone(mockBattle); }
  return battleCall({ op: 'start', mission: id });
}
// action: {t:'move',to:[c,r]} | {t:'use',move,at:[c,r]} | {t:'end'} | {t:'flee'}
export async function battleAct(battleId, action) {
  if (OFFLINE) { const o = await import('./offline.js?v=9d1c820'); const c = mockChar(); const r = o.mockAct(c, mockBattle, action); saveMock(c); return clone(r); }
  return battleCall({ op: 'act', battle: battleId, action });
}
export async function trainElement(element, times = 1) {
  if (OFFLINE) { const o = await import('./offline.js?v=9d1c820'); const c = mockChar(); const r = o.trainElement(c, element, times); saveMock(c); return r; }
  const { data, error } = await sb.rpc('train_element', { p_element: element, p_times: times });
  if (error) throw rpcErr(error);
  return data;
}
export async function trainStat(stat, times = 1) {
  if (OFFLINE) { const o = await import('./offline.js?v=9d1c820'); const c = mockChar(); const r = o.trainStat(c, stat, times); saveMock(c); return r; }
  const { data, error } = await sb.rpc('train_stat', { p_stat: stat, p_times: times });
  if (error) throw rpcErr(error);
  return data;
}
export async function trainJutsu(move, times = 1) {
  if (OFFLINE) { const o = await import('./offline.js?v=9d1c820'); const c = mockChar(); const r = o.trainJutsu(c, move, times); saveMock(c); return r; }
  const { data, error } = await sb.rpc('train_jutsu', { p_move: move, p_times: times });
  if (error) throw rpcErr(error);
  return data;
}

export async function updateAppearance(appearance) {
  if (OFFLINE) { const c = JSON.parse(sessionStorage.getItem('mockChar')); c.appearance = appearance; sessionStorage.setItem('mockChar', JSON.stringify(c)); return loadCharacter(); }
  const { error } = await sb.from('characters').update({ appearance }).eq('user_id', (await getUser()).id);
  if (error) throw error;
  return loadCharacter();
}

// ---------- live duels ----------
const duelCall = async (body) => { if (OFFLINE) { const o = await import('./offline.js?v=9d1c820'); return o.mockDuelOp(mockChar(), body); } return battleCall(body); };
export const duelChallenge = (target, kind = 'duel', war = null) => duelCall({ op: 'duel_challenge', target, kind, war });
export const duelAccept = (duel) => duelCall({ op: 'duel_accept', duel });
export const duelCancel = (duel) => duelCall({ op: 'duel_cancel', duel });
export const duelAct = (duel, action) => duelCall({ op: 'duel_act', duel, action });
export const duelTimeout = (duel, seq) => duelCall({ op: 'duel_timeout', duel, seq });
export const duelGet = (duel) => duelCall({ op: 'duel_get', duel });
export const duelReady = (duel) => duelCall({ op: 'duel_ready', duel });
// live updates of one duel row; returns an unsubscribe function
export function watchDuel(id, cb) {
  if (OFFLINE) { let off; import('./offline.js?v=9d1c820').then((o) => (off = o.mockWatch(id, cb))); return () => off && off(); }
  const ch = sb.channel('duel-' + id).on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'duels', filter: `id=eq.${id}` }, (m) => cb(m.new)).subscribe();
  return () => sb.removeChannel(ch);
}
// every duel I'm part of (new challenges to me, and answers to mine)
export async function watchMyDuels(myId, cb) {
  if (OFFLINE) { const o = await import('./offline.js?v=9d1c820'); return o.mockWatch('*', cb); }
  const { data } = await sb.auth.getSession(); if (data.session) sb.realtime.setAuth(data.session.access_token);
  const ch = sb.channel('my-duels-' + myId)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'duels', filter: `b=eq.${myId}` }, (m) => cb(m.new))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'duels', filter: `a=eq.${myId}` }, (m) => cb(m.new)).subscribe();
  return () => sb.removeChannel(ch);
}
export async function myActiveDuel() {
  if (OFFLINE) return null;
  const { data } = await sb.from('duels').select('*').eq('status', 'active').gt('deadline', new Date(Date.now() - 5 * 60000).toISOString()).order('created_at', { ascending: false }).limit(1);
  return (data || [])[0] || null;
}

// ---------- arena leaderboards ----------
export async function arenaBoard(period, rank) {
  if (OFFLINE) { const o = await import('./offline.js?v=9d1c820'); return o.mockBoard(period, rank, mockChar()); }
  const { data, error } = await sb.rpc('arena_board', { p_period: period, p_rank: rank }); if (error) throw rpcErr(error); return data;
}
export async function arenaChampions() {
  if (OFFLINE) { const o = await import('./offline.js?v=9d1c820'); return o.mockChampions(); }
  const { data, error } = await sb.rpc('arena_champions'); if (error) throw rpcErr(error); return data || {};
}
// ---------- academy sparring lessons ----------
export async function getLessons() {
  if (OFFLINE) { const o = await import('./offline.js?v=9d1c820'); return o.LESSONS; }
  const { data, error } = await sb.from('missions').select('id,name,description,min_level,enemy_name,enemy_level,enemy_look,xp,ryo,sort').eq('kind', 'lesson').order('sort');
  if (error) throw rpcErr(error); return data;
}
export async function startLesson(id) {
  if (OFFLINE) { const o = await import('./offline.js?v=9d1c820'); const c = mockChar(); mockBattle = o.mockStartLesson(c, id); return clone(mockBattle); }
  return battleCall({ op: 'lesson', lesson: id });
}
export async function claimArenaReward() {
  if (OFFLINE) return new URLSearchParams(location.search).has('bonus') ? { place: 1, rank: 'Genin', ryo: 300, mult: 1.5 } : null;
  const { data, error } = await sb.rpc('claim_arena_reward'); if (error) return null; return data;
}
// ---------- world quests ----------
export async function getQuestData() {
  if (OFFLINE) { const o = await import('./offline.js?v=9d1c820'); return { lines: o.QUEST_LINES, steps: o.QUEST_STEPS }; }
  const [l, s] = await Promise.all([sb.from('quest_lines').select('*').order('sort'), sb.from('quest_steps').select('*').order('step')]);
  if (l.error) throw rpcErr(l.error); if (s.error) throw rpcErr(s.error);
  return { lines: l.data, steps: s.data };
}
export async function startQuest(line) {
  if (OFFLINE) { const o = await import('./offline.js?v=9d1c820'); mockBattle = o.mockStartQuest(mockChar(), line); return clone(mockBattle); }
  const { data, error } = await sb.rpc('start_quest', { p_line: line }); if (error) throw rpcErr(error);
  return battleCall({ op: 'get', battle: data.id });
}
// ---------- team boss fights ----------
const raidCall = async (body) => { if (OFFLINE) { const o = await import('./offline.js?v=9d1c820'); return o.mockRaidOp(mockChar(), body); } return battleCall(body); };
export const raidCreate = (line) => raidCall({ op: 'raid_create', line });
export const raidJoin = (raid) => raidCall({ op: 'raid_join', raid });
export const raidLeave = (raid) => raidCall({ op: 'raid_leave', raid });
export const raidStart = (raid) => raidCall({ op: 'raid_start', raid });
export const raidReady = (raid) => raidCall({ op: 'raid_ready', raid });
export const raidAct = (raid, action) => raidCall({ op: 'raid_act', raid, action });
export const raidTimeout = (raid, seq) => raidCall({ op: 'raid_timeout', raid, seq });
export async function raidLobbies(line) {
  if (OFFLINE) { const o = await import('./offline.js?v=9d1c820'); return o.mockLobbies(line); }
  const { data, error } = await sb.from('raids').select('*').eq('line', line).in('status', ['lobby', 'prep', 'active']).gt('updated_at', new Date(Date.now() - 30 * 60000).toISOString()).order('created_at');
  if (error) throw rpcErr(error); return data || [];
}
export function watchRaid(id, cb) {
  if (OFFLINE) { let off; import('./offline.js?v=9d1c820').then((o) => (off = o.mockWatch(id, cb))); return () => off && off(); }
  const ch = sb.channel('raid-' + id).on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'raids', filter: `id=eq.${id}` }, (m) => cb(m.new)).subscribe();
  return () => sb.removeChannel(ch);
}
export async function setTitle(title) {
  if (OFFLINE) return loadCharacter();
  const { data, error } = await sb.rpc('set_title', { p_title: title }); if (error) throw rpcErr(error); return data;
}

// ---------- village wars ----------
const vrpc = async (fn, args = {}) => {
  if (OFFLINE) { const o = await import('./offline.js?v=9d1c820'); return o.mockVillage(mockChar(), fn, args); }
  const { data, error } = await sb.rpc(fn, args); if (error) throw rpcErr(error); return data;
};
export const villageInfo = () => vrpc('village_info');
export const kageClaim = () => vrpc('kage_claim');
export const villageUpgrade = (building) => vrpc('village_upgrade', { p_building: building });
export const warDeclare = (territory) => vrpc('war_declare', { p_territory: territory });
export const warStatus = (war) => vrpc('war_status', { p_war: war });
export const warHold = (war) => vrpc('war_hold', { p_war: war });
export const warLeave = (war) => vrpc('war_leave', { p_war: war }).catch(() => {});

// ---------- sleep ----------
export async function setSleep(on) {
  if (OFFLINE) { const c = mockChar(); c.asleep_since = on ? new Date().toISOString() : null; saveMock(c); return loadCharacter(); }
  const { data, error } = await sb.rpc('set_sleep', { p_on: !!on }); if (error) throw rpcErr(error); return data;
}

// ---------- loadout and items ----------
export async function setLoadout(jutsu, items) {
  if (OFFLINE) { const c = mockChar(); c.loadout = { jutsu, items }; saveMock(c); return loadCharacter(); }
  const { data, error } = await sb.rpc('set_loadout', { p_jutsu: jutsu, p_items: items }); if (error) throw rpcErr(error); return data;
}
export async function buyItem(item, qty = 1) {
  if (OFFLINE) {
    const G = await import('./engine.js?v=9d1c820'), c = mockChar(), it = G.ITEMS[item], have = (c.items || {})[item] || 0, n = Math.min(qty, G.ITEM_STACK - have);
    if (n < 1) throw new Error('You can carry at most 10 of each item.'); if (c.ryo < it.price * n) throw new Error('Not enough ryo.');
    c.ryo -= it.price * n; c.items = { ...(c.items || {}), [item]: have + n }; saveMock(c); return loadCharacter();
  }
  const { data, error } = await sb.rpc('buy_item', { p_item: item, p_qty: qty }); if (error) throw rpcErr(error); return data;
}

// ---------- equipment and ANBU ----------
const mockGear = async (fn, a) => {
  const G = await import('./engine.js?v=9d1c820'), c = mockChar(); c.gear = c.gear || {}; c.owned_gear = c.owned_gear || [];
  if (fn === 'buy') { const g = G.GEAR[a]; if (c.owned_gear.includes(a)) throw new Error('You already own that.'); if (c.ryo < g.price) throw new Error('Not enough ryo.'); c.ryo -= g.price; c.owned_gear.push(a); }
  if (fn === 'equip') { if (a.id) c.gear[a.slot] = a.id; else delete c.gear[a.slot]; }
  saveMock(c); return loadCharacter();
};
// Auction House (offline mode keeps a small pretend market in memory)
const rpcOk = async (fn, args) => { const { data, error } = await sb.rpc(fn, args); if (error) throw rpcErr(error); return data; };
export async function marketBrowse() { if (OFFLINE) return (await import('./offline.js?v=9d1c820')).mockMarket(mockChar()).browse(); return rpcOk('market_browse', {}); }
export async function marketList(kind, item, qty, price) { if (OFFLINE) { const c = mockChar(); const r = (await import('./offline.js?v=9d1c820')).mockMarket(c).list(kind, item, qty, price); saveMock(c); return loadCharacter(); } return rpcOk('market_list', { p_kind: kind, p_item: item, p_qty: qty, p_price: price }); }
export async function marketBuy(id) { if (OFFLINE) { const c = mockChar(); (await import('./offline.js?v=9d1c820')).mockMarket(c).buy(id); saveMock(c); return loadCharacter(); } return rpcOk('market_buy', { p_id: id }); }
export async function marketCancel(id) { if (OFFLINE) { const c = mockChar(); (await import('./offline.js?v=9d1c820')).mockMarket(c).cancel(id); saveMock(c); return loadCharacter(); } return rpcOk('market_cancel', { p_id: id }); }
export async function hospitalHeal() {
  if (OFFLINE) { const c = mockChar(); const left = Math.max(0, Math.ceil(((c.injured_until || 0) - Date.now()) / 1000)); if (!left) throw new Error('You are not injured.');
    const cost = Math.max(5, Math.ceil((20 + c.level * 8) * left / 900)); if (c.ryo < cost) throw new Error(`Not enough ryo (${cost} needed). You can also rest until you heal.`);
    c.ryo -= cost; c.injured_until = 0; saveMock(c); return { ...(await loadCharacter()), healed: cost }; }
  const { data, error } = await sb.rpc('hospital_heal', {}); if (error) throw rpcErr(error); return data;
}
export async function buyScroll(id) {
  if (OFFLINE) {
    const G = await import('./engine.js?v=9d1c820'), c = mockChar(), m = G.MOVES[id]; c.scrolls = c.scrolls || [];
    if (!m || !m.counter) throw new Error('The Library has no such scroll.'); if (G.RANKS.indexOf(c.rank) < 1) throw new Error('Library scrolls are for Genin and above.');
    if (c.scrolls.includes(id)) throw new Error('You already know that scroll.'); if (c.ryo < m.price) throw new Error('Not enough ryo.');
    c.ryo -= m.price; c.scrolls.push(id); saveMock(c); return loadCharacter();
  }
  const { data, error } = await sb.rpc('buy_scroll', { p_scroll: id }); if (error) throw rpcErr(error); return data;
}
export async function buyGear(id) {
  if (OFFLINE) return mockGear('buy', id);
  const { data, error } = await sb.rpc('buy_gear', { p_id: id }); if (error) throw rpcErr(error); return data;
}
export async function equipGear(slot, id) {
  if (OFFLINE) return mockGear('equip', { slot, id });
  const { data, error } = await sb.rpc('equip_gear', { p_slot: slot, p_id: id || null }); if (error) throw rpcErr(error); return data;
}
const arpc = async (fn, args = {}) => {
  if (OFFLINE) { const o = await import('./offline.js?v=9d1c820'); return o.mockAnbu(mockChar(), fn, args); }
  const { data, error } = await sb.rpc(fn, args); if (error) throw rpcErr(error); return data;
};
export const anbuInfo = () => arpc('anbu_info');
export const anbuCreate = (name, leader) => arpc('anbu_create', { p_name: name, p_leader: leader });
export const anbuApply = (squad) => arpc('anbu_apply', { p_squad: squad });
export const anbuDecide = (squad, user, accept) => arpc('anbu_decide', { p_squad: squad, p_user: user, p_accept: accept });
export const anbuLeave = (user = null) => arpc('anbu_leave', { p_user: user });
export const anbuDisband = (squad) => arpc('anbu_disband', { p_squad: squad });
