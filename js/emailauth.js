// Email + password accounts, and the human check (Cloudflare Turnstile) shared by every way of signing in.
import * as net from './net.js?v=9d1c820';

export const TURNSTILE_SITE_KEY = '0x4AAAAAAF_-YNdCR9rZ9kgK';
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---------- human check ----------
// One widget on the sign-in card. It is usually invisible and only asks the player to tick a box if Cloudflare is unsure.
// Each token works once, so the widget is reset after every sign-in attempt.
let tsScript = null;
function loadTurnstile() {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (!tsScript) tsScript = new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    s.async = true; s.onload = () => res(window.turnstile); s.onerror = () => rej(new Error('human check unavailable'));
    document.head.appendChild(s);
  });
  return tsScript;
}
export function humanCheck(box) {
  let id = null, token = null, waiters = [], failed = false;
  const settle = (t) => { token = t; const w = waiters; waiters = []; w.forEach((f) => f(t)); };
  loadTurnstile().then((ts) => {
    id = ts.render(box, {
      sitekey: TURNSTILE_SITE_KEY, appearance: 'interaction-only', theme: 'light', action: 'signin',
      callback: (t) => { box.classList.remove('need'); settle(t); },
      // Cloudflare is unsure and wants a tick: make the box impossible to miss
      'before-interactive-callback': () => { box.classList.add('need'); box.scrollIntoView({ block: 'center', behavior: 'smooth' }); },
      'expired-callback': () => { token = null; },
      'error-callback': () => { failed = true; settle(null); },
    });
  }).catch(() => { failed = true; settle(null); });
  return {
    // resolves with a token, or null if the check could not run (sign-in is still attempted; the server decides)
    token(timeoutMs = 120000) {
      if (token) { const t = token; token = null; return Promise.resolve(t); }
      if (failed) return Promise.resolve(null);
      return new Promise((res) => {
        const timer = setTimeout(() => res(null), timeoutMs);
        waiters.push((t) => { clearTimeout(timer); token = null; res(t); });
      });
    },
    reset() { token = null; if (id !== null && window.turnstile) try { window.turnstile.reset(id); } catch {} },
  };
}

// ---------- messages ----------
export function authMessage(err) {
  const m = (err && err.message) || String(err || '');
  if (/Invalid login credentials/i.test(m)) return 'Wrong email or password.';
  if (/Email not confirmed/i.test(m)) return 'Please confirm your email first: click the link we sent you.';
  if (/captcha/i.test(m)) return 'The human check did not go through. Please try again.';
  if (/rate limit|too many/i.test(m)) return 'Too many tries. Please wait a few minutes and try again.';
  if (/security purposes.*after (\d+) seconds/i.test(m)) return `Please wait ${m.match(/after (\d+) seconds/i)[1]} seconds before trying again.`;
  if (/Password should|weak password|pwned/i.test(m)) return 'Please choose a stronger password: at least 8 characters, with letters and numbers.';
  if (/invalid.*email|Unable to validate email/i.test(m)) return 'That email address does not look right.';
  if (/expired|invalid.*(token|otp|link)/i.test(m)) return 'That link has expired or was already used. Please ask for a new one.';
  if (/Failed to fetch|NetworkError/i.test(m)) return 'Could not reach the game servers. Check your connection.';
  return m;
}
export const passwordProblem = (pw) => (pw.length < 8 ? 'Your password needs at least 8 characters.' : !/[A-Za-z]/.test(pw) || !/\d/.test(pw) ? 'Your password needs both letters and numbers.' : null);
const emailOk = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);

// ---------- the email panel on the sign-in card ----------
// el: the title screen; check: humanCheck(); toast: the game's message popup
export function mountEmail(el, check, toast) {
  const open = el.querySelector('#emOpen'), box = el.querySelector('#emailBox');
  if (!open || !box) return;
  let mode = 'signup';
  const render = () => {
    box.innerHTML = mode === 'sent' || mode === 'resetSent' ? sentView() : formView();
    wire();
  };
  let lastEmail = '';
  const formView = () => `
    <div class="em-tabs" role="tablist">
      <button type="button" role="tab" class="${mode === 'signup' ? 'on' : ''}" data-m="signup" aria-selected="${mode === 'signup'}">Sign up</button>
      <button type="button" role="tab" class="${mode !== 'signup' ? 'on' : ''}" data-m="login" aria-selected="${mode !== 'signup'}">Log in</button>
    </div>
    <form class="em-form" novalidate>
      ${mode === 'forgot' ? '<p class="em-hint">Enter your email and we will send you a link to choose a new password.</p>' : ''}
      <label>Email<input name="email" type="email" autocomplete="email" inputmode="email" required value="${esc(lastEmail)}"></label>
      ${mode !== 'forgot' ? `<label>Password<input name="pw" type="password" autocomplete="${mode === 'signup' ? 'new-password' : 'current-password'}" required minlength="8"></label>` : ''}
      ${mode === 'signup' ? `<label>Password again<input name="pw2" type="password" autocomplete="new-password" required></label>
        <p class="em-hint">At least 8 characters, with letters and numbers.</p>
        <label class="em-check"><input name="news" type="checkbox"> <span>Send me game news (updates, events, new seasons). You can stop any time.</span></label>` : ''}
      <p class="em-err" hidden></p>
      <button class="btn primary em-go" type="submit">${mode === 'signup' ? 'Create account' : mode === 'login' ? 'Log in' : 'Send reset link'}</button>
      ${mode === 'login' ? '<button type="button" class="linkbtn" data-m="forgot">Forgot your password?</button>' : ''}
      ${mode === 'forgot' ? '<button type="button" class="linkbtn" data-m="login">Back to log in</button>' : ''}
      ${mode === 'signup' ? '<p class="em-fine">By creating an account you agree to our <a href="../terms.html" target="_blank" rel="noopener">Terms</a> and <a href="../privacy.html" target="_blank" rel="noopener">Privacy policy</a>.</p>' : ''}
      <button type="button" class="linkbtn em-resend" hidden>Send the confirmation email again</button>
    </form>`;
  const sentView = () => `
    <div class="em-sent">
      <div class="em-mail">✉️</div>
      <b>Check your inbox</b>
      <p>${mode === 'sent' ? `We sent a link to <b>${esc(lastEmail)}</b>. Click it to confirm your email, then you can create your ninja.` : `If an account exists for <b>${esc(lastEmail)}</b>, we sent it a link to choose a new password.`}</p>
      <p class="em-hint">It can take a minute. Check your spam folder too.</p>
      <p class="em-err" hidden></p>
      ${mode === 'sent' ? '<button type="button" class="btn small em-resend">Send it again</button>' : ''}
      <button type="button" class="linkbtn" data-m="login">Back to log in</button>
    </div>`;
  const wire = () => {
    box.querySelectorAll('[data-m]').forEach((b) => (b.onclick = () => { const f = box.querySelector('[name=email]'); if (f) lastEmail = f.value.trim(); mode = b.dataset.m; render(); }));
    const err = box.querySelector('.em-err'), resend = box.querySelector('.em-resend');
    const say = (msg) => { if (err) { err.textContent = msg; err.hidden = !msg; } };
    if (resend) resend.onclick = async () => {
      resend.disabled = true; say('');
      try { await net.resendSignupEmail(lastEmail, await check.token()); toast('Sent! Check your inbox.', 'ok'); }
      catch (e) { say(authMessage(e)); } finally { check.reset(); resend.disabled = false; }
    };
    const form = box.querySelector('form');
    if (!form) return;
    form.onsubmit = async (ev) => {
      ev.preventDefault(); say('');
      const go = form.querySelector('.em-go'), email = form.email.value.trim();
      lastEmail = email;
      if (!emailOk(email)) return say('Please enter a valid email address.');
      if (mode === 'signup') {
        const p = passwordProblem(form.pw.value); if (p) return say(p);
        if (form.pw.value !== form.pw2.value) return say('The two passwords do not match.');
      } else if (mode === 'login' && !form.pw.value) return say('Please enter your password.');
      go.disabled = true; const label = go.textContent; go.textContent = 'Please wait…';
      try {
        const token = await check.token();
        if (mode === 'signup') { await net.signUpEmail(email, form.pw.value, form.news.checked, token); mode = 'sent'; render(); return; }
        if (mode === 'forgot') { await net.sendPasswordReset(email, token); mode = 'resetSent'; render(); return; }
        await net.signInEmail(email, form.pw.value, token);
        location.reload();
      } catch (e) {
        say(authMessage(e));
        if (/Email not confirmed/i.test(e && e.message) && resend) resend.hidden = false;
      } finally { check.reset(); if (go.isConnected) { go.disabled = false; go.textContent = label; } }
    };
  };
  open.onclick = () => {
    const showing = box.hidden;
    box.hidden = !showing; open.setAttribute('aria-expanded', String(showing));
    open.textContent = showing ? 'Hide email sign-in' : 'or use email';
    if (showing) { render(); const f = box.querySelector('[name=email]'); if (f) f.focus(); }
  };
}

// ---------- after clicking an email link ----------
// Confirmation and password-reset emails link back here with ?token_hash=…&type=…
export function linkParams() {
  const p = new URLSearchParams(location.search);
  const token = p.get('token_hash'), type = p.get('type');
  return token && type ? { token, type } : null;
}
export function cleanLinkParams() {
  const p = new URLSearchParams(location.search);
  ['token_hash', 'type'].forEach((k) => p.delete(k));
  const q = p.toString();
  history.replaceState({}, '', location.pathname + (q ? '?' + q.replace(/=(&|$)/g, '$1') : ''));
}
// the "choose a new password" screen; calls onDone once the password is saved
export function newPasswordCard(h, toast, onDone) {
    const el = h(`
      <div class="screen title">
        <div class="scroll title-card em-newpw">
          <h3>Choose a new password</h3>
          <form class="em-form" novalidate>
            <label>New password<input name="pw" type="password" autocomplete="new-password" required minlength="8"></label>
            <label>New password again<input name="pw2" type="password" autocomplete="new-password" required></label>
            <p class="em-hint">At least 8 characters, with letters and numbers.</p>
            <p class="em-err" hidden></p>
            <button class="btn primary em-go" type="submit">Save new password</button>
          </form>
        </div>
      </div>`);
    const form = el.querySelector('form'), err = el.querySelector('.em-err');
    form.onsubmit = async (ev) => {
      ev.preventDefault();
      const p = passwordProblem(form.pw.value);
      const msg = p || (form.pw.value !== form.pw2.value ? 'The two passwords do not match.' : '');
      err.textContent = msg; err.hidden = !msg; if (msg) return;
      const go = form.querySelector('.em-go'); go.disabled = true;
      try { await net.setNewPassword(form.pw.value); toast('Password saved. Welcome back!', 'ok'); onDone(); }
      catch (e) { err.textContent = authMessage(e); err.hidden = false; go.disabled = false; }
    };
    return el;
}
