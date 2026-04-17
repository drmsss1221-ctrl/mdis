/**
 * enhancements.js — Project Antigravity
 * Non-destructive modular injection layer.
 *
 * SEALED CONTRACT: app.js is NEVER modified.
 * This file owns:
 *   1. Two-stage auth overlay (login → signup)
 *   2. Pie chart removal + SVG blueprint trend graph
 *   3. Terminal action buttons (REFRESH_SYSTEM / DATA_DRILLDOWN / TERMINATE_SESSION)
 */

/* ═══════════════════════════════════════════════════════════════════════════════
   0.  ANTIGRAVITY DESIGN TOKENS (injected via <style>)
   ═══════════════════════════════════════════════════════════════════════════════ */
(function injectGlobalStyles() {
  const style = document.createElement('style');
  style.textContent = `
    :root {
      --ag-void:     #030507;
      --ag-glass:    rgba(255,255,255,0.04);
      --ag-border:   rgba(255,255,255,0.09);
      --ag-accent:   #C8FF00;
      --ag-text-1:   #E8EAF0;
      --ag-text-2:   #5A5F70;
      --ag-grid:     rgba(255,255,255,0.04);
      --ag-scanline: rgba(200,255,0,0.07);
    }

    /* ── Global Geist Mono import ── */
    @import url('https://fonts.googleapis.com/css2?family=Geist+Mono:wght@300;400;500;600;700&display=swap');

    /* ── Dashboard root hidden until auth passes ── */
    .page-shell {
      visibility: hidden;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.3s cubic-bezier(0.16,1,0.3,1), visibility 0s linear 0.3s;
    }
    .page-shell.ag-revealed {
      visibility: visible;
      opacity: 1;
      pointer-events: all;
      transition: opacity 0.3s cubic-bezier(0.16,1,0.3,1), visibility 0s linear 0s;
    }

    /* ── Auth overlay ── */
    #ag-auth-overlay {
      position: fixed;
      inset: 0;
      z-index: 9999;
      background: var(--ag-void);
      display: flex;
      align-items: center;
      justify-content: flex-start;
      transition: opacity 0.2s cubic-bezier(0.16,1,0.3,1);
    }
    #ag-auth-overlay.ag-fade-out {
      opacity: 0;
      pointer-events: none;
    }

    /* Blueprint grid on the auth overlay background */
    #ag-auth-overlay::before {
      content: '';
      position: absolute;
      inset: 0;
      background-image:
        linear-gradient(var(--ag-grid) 0.5px, transparent 0.5px),
        linear-gradient(90deg, var(--ag-grid) 0.5px, transparent 0.5px);
      background-size: 40px 40px;
      pointer-events: none;
    }

    /* Left decorative anchor */
    .ag-deco-left {
      position: absolute;
      left: 48px;
      top: 50%;
      transform: translateY(-50%);
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .ag-deco-left__rule {
      width: 120px;
      height: 0.5px;
      background: var(--ag-border);
    }
    .ag-deco-left__coords {
      font-family: 'Geist Mono', monospace;
      font-size: 9px;
      letter-spacing: 0.2em;
      color: var(--ag-text-2);
      text-transform: uppercase;
    }
    .ag-deco-left__vert {
      writing-mode: vertical-rl;
      font-family: 'Geist Mono', monospace;
      font-size: 8px;
      letter-spacing: 0.25em;
      color: var(--ag-text-2);
      opacity: 0.5;
    }

    /* ── Auth mode toggle link ── */
    .ag-auth-toggle {
      margin-top: 16px;
      text-align: center;
      font-family: 'Geist Mono', monospace;
      font-size: 9px;
      letter-spacing: 0.15em;
      color: var(--ag-text-2);
      text-transform: uppercase;
    }
    .ag-auth-toggle button {
      background: none;
      border: none;
      color: var(--ag-accent);
      font-family: 'Geist Mono', monospace;
      font-size: 9px;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      cursor: pointer;
      padding: 0;
      border-radius: 0;
      text-decoration: underline;
      text-underline-offset: 3px;
      transition: opacity 0.18s;
    }
    .ag-auth-toggle button:hover { opacity: 0.7; }

    /* ── Signup success notice ── */
    .ag-auth-success {
      font-family: 'Geist Mono', monospace;
      font-size: 9px;
      color: #C8FF00;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      margin-top: 12px;
      min-height: 14px;
    }

    /* Auth card — asymmetric position */
    #ag-auth-card {
      position: absolute;
      left: 58%;
      top: 50%;
      transform: translate(-50%, -50%);
      width: 360px;
      background: rgba(255,255,255,0.03);
      border: 0.5px solid var(--ag-border);
      backdrop-filter: blur(40px);
      -webkit-backdrop-filter: blur(40px);
      padding: 36px 32px 32px;
      border-radius: 4px;
    }

    /* Auth stages */
    .ag-stage {
      display: none;
      opacity: 0;
      transition: opacity 0.2s cubic-bezier(0.16,1,0.3,1);
    }
    .ag-stage.ag-active {
      display: block;
    }
    .ag-stage.ag-visible {
      opacity: 1;
    }

    /* Wordmark */
    .ag-wordmark {
      font-family: 'Geist Mono', monospace;
      font-size: 10px;
      letter-spacing: 0.08em;
      color: var(--ag-text-2);
      text-transform: uppercase;
      margin-bottom: 6px;
    }
    .ag-divider {
      height: 0.5px;
      background: var(--ag-border);
      margin: 16px 0 28px;
    }

    /* Ghost inputs */
    .ag-field {
      margin-bottom: 24px;
    }
    .ag-input {
      background: transparent;
      border: none;
      border-bottom: 0.5px solid var(--ag-border);
      color: var(--ag-text-1);
      font-family: 'Geist Mono', monospace;
      font-size: 12px;
      letter-spacing: 0.08em;
      padding: 10px 0;
      outline: none;
      width: 100%;
      transition: border-color 0.18s cubic-bezier(0.16,1,0.3,1);
    }
    .ag-input:focus {
      border-bottom-color: var(--ag-accent);
    }
    .ag-input::placeholder {
      color: var(--ag-text-2);
      text-transform: uppercase;
      font-size: 10px;
      letter-spacing: 0.2em;
    }

    /* reCAPTCHA wrapper */
    .ag-captcha-wrapper {
      border: 0.5px solid var(--ag-border);
      border-radius: 4px;
      overflow: hidden;
      margin-bottom: 24px;
      filter: grayscale(1) contrast(0.8) brightness(0.7);
      transition: filter 0.18s cubic-bezier(0.16,1,0.3,1);
    }
    .ag-captcha-wrapper:hover {
      filter: grayscale(0.6) contrast(0.85) brightness(0.8);
    }

    /* Auth action button */
    .ag-auth-btn {
      width: 100%;
      background: transparent;
      border: 0.5px solid var(--ag-border);
      color: var(--ag-text-2);
      font-family: 'Geist Mono', monospace;
      font-size: 10px;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      padding: 12px 0;
      cursor: pointer;
      border-radius: 0;
      position: relative;
      overflow: hidden;
      transition: color 0.18s cubic-bezier(0.16,1,0.3,1), border-color 0.18s cubic-bezier(0.16,1,0.3,1);
    }
    .ag-auth-btn::before {
      content: '';
      position: absolute;
      inset: 0;
      background: repeating-linear-gradient(
        0deg,
        transparent, transparent 2px,
        var(--ag-scanline) 2px, var(--ag-scanline) 4px
      );
      opacity: 0;
      transition: opacity 0.18s cubic-bezier(0.16,1,0.3,1);
    }
    .ag-auth-btn:hover {
      color: var(--ag-accent);
      border-color: var(--ag-accent);
    }
    .ag-auth-btn:hover::before { opacity: 1; }
    .ag-auth-btn:active {
      background: var(--ag-accent);
      color: var(--ag-void);
    }

    .ag-auth-error {
      font-family: 'Geist Mono', monospace;
      font-size: 9px;
      color: #ff4444;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      margin-top: 12px;
      min-height: 14px;
    }

    /* ── Scanline sweep (one-time reveal) ── */
    #ag-scanline-sweep {
      position: fixed;
      inset: 0 0 auto 0;
      height: 2px;
      background: var(--ag-scanline);
      mix-blend-mode: overlay;
      z-index: 10000;
      pointer-events: none;
      opacity: 0;
    }
    @keyframes ag-sweep {
      0%   { top: 0; opacity: 1; }
      100% { top: 100vh; opacity: 0; }
    }
    #ag-scanline-sweep.ag-sweeping {
      animation: ag-sweep 0.6s cubic-bezier(0.16,1,0.3,1) forwards;
    }

    /* ── Terminal Action Buttons ── */
    .ag-action-cluster {
      display: flex;
      gap: 8px;
      align-items: center;
    }
    .ag-action-btn {
      font-family: 'Geist Mono', monospace;
      font-size: 10px;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      padding: 8px 16px;
      border: 0.5px solid var(--ag-border);
      background: transparent;
      color: var(--ag-text-2);
      cursor: pointer;
      border-radius: 0;
      position: relative;
      overflow: hidden;
      transition: color 0.18s cubic-bezier(0.16,1,0.3,1), border-color 0.18s cubic-bezier(0.16,1,0.3,1);
      white-space: nowrap;
    }
    .ag-action-btn::before {
      content: '';
      position: absolute;
      inset: 0;
      background: repeating-linear-gradient(
        0deg,
        transparent, transparent 2px,
        var(--ag-scanline) 2px, var(--ag-scanline) 4px
      );
      opacity: 0;
      transition: opacity 0.18s cubic-bezier(0.16,1,0.3,1);
    }
    .ag-action-btn:hover {
      color: var(--ag-accent);
      border-color: var(--ag-accent);
    }
    .ag-action-btn:hover::before { opacity: 1; }
    .ag-action-btn:active {
      background: var(--ag-accent);
      color: var(--ag-void);
    }

    /* ── Blueprint SVG Trend Graph ── */
    #ag-trend-graph {
      width: 100%;
      height: 240px;
      display: block;
    }
    .ag-trend-tooltip {
      position: absolute;
      background: rgba(3,5,7,0.92);
      border: 0.5px solid var(--ag-border);
      border-radius: 0;
      padding: 6px 10px;
      font-family: 'Geist Mono', monospace;
      font-size: 9px;
      letter-spacing: 0.12em;
      color: var(--ag-text-1);
      pointer-events: none;
      white-space: nowrap;
      opacity: 0;
      transition: opacity 0.12s;
      z-index: 10;
    }
    .ag-trend-tooltip.ag-visible {
      opacity: 1;
    }
    .ag-trend-container {
      position: relative;
      width: 100%;
    }

    /* Override the old pie container column to be full width */
    .analytics-layout {
      grid-template-columns: 1fr !important;
    }
    .analytics-col:first-child {
      display: none !important;
    }
    .analytics-col.span-2 {
      grid-column: 1 / -1 !important;
    }

    /* ── Password strength meter ── */
    .ag-strength-wrap {
      margin-top: 6px;
      margin-bottom: 20px;
    }
    .ag-strength-bar-track {
      height: 2px;
      background: var(--ag-border);
      position: relative;
      overflow: hidden;
    }
    .ag-strength-bar-fill {
      height: 100%;
      width: 0%;
      transition: width 0.25s cubic-bezier(0.16,1,0.3,1), background 0.25s;
    }
    .ag-strength-label {
      font-family: 'Geist Mono', monospace;
      font-size: 8px;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: var(--ag-text-2);
      margin-top: 6px;
      transition: color 0.2s;
    }
    .ag-strength-reqs {
      margin-top: 8px;
      display: flex;
      flex-direction: column;
      gap: 3px;
    }
    .ag-req {
      font-family: 'Geist Mono', monospace;
      font-size: 8px;
      letter-spacing: 0.1em;
      color: var(--ag-text-2);
      display: flex;
      align-items: center;
      gap: 5px;
      transition: color 0.2s;
    }
    .ag-req::before {
      content: '□';
      font-size: 7px;
      transition: content 0.2s;
    }
    .ag-req.ag-req-pass {
      color: var(--ag-accent);
    }
    .ag-req.ag-req-pass::before {
      content: '■';
      color: var(--ag-accent);
    }

    /* ── Phone login mode toggle ── */
    .ag-login-mode-toggle {
      font-family: 'Geist Mono', monospace;
      font-size: 8px;
      letter-spacing: 0.15em;
      color: var(--ag-text-2);
      text-transform: uppercase;
      margin-bottom: 20px;
      cursor: pointer;
      background: none;
      border: none;
      border-bottom: 0.5px dashed var(--ag-border);
      padding: 4px 0;
      width: 100%;
      text-align: left;
      transition: color 0.18s, border-color 0.18s;
    }
    .ag-login-mode-toggle:hover {
      color: var(--ag-accent);
      border-bottom-color: var(--ag-accent);
    }

    /* ── Logo on auth card ── */
    .ag-logo-wrap {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      margin-bottom: 18px;
    }
    .ag-logo-img {
      width: 36px;
      height: 36px;
      object-fit: contain;
      flex-shrink: 0;
    }
    .ag-logo-text {
      font-family: 'Geist Mono', monospace;
      font-size: 10px;
      letter-spacing: 0.18em;
      color: var(--ag-text-2);
      text-transform: uppercase;
      line-height: 1.4;
    }
    .ag-logo-text strong {
      display: block;
      font-size: 13px;
      letter-spacing: 0.1em;
      color: var(--ag-accent);
      font-weight: 600;
    }

    /* ── Main page logo bar ── */
    .ag-main-logo-bar {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 0.5px solid var(--ag-border);
    }
    .ag-main-logo {
      width: 40px;
      height: 40px;
      object-fit: contain;
      flex-shrink: 0;
    }
    .ag-main-logo-label {
      font-family: 'Geist Mono', monospace;
      font-size: 11px;
      letter-spacing: 0.22em;
      color: var(--ag-accent);
      text-transform: uppercase;
      font-weight: 500;
    }

    /* ── Network Loading Overlay ── */
    #ag-net-loader {
      position: fixed;
      inset: 0;
      z-index: 19999;
      background: rgba(3,5,7,0.88);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 20px;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.3s cubic-bezier(0.16,1,0.3,1);
    }
    #ag-net-loader.ag-net-visible {
      opacity: 1;
      pointer-events: all;
    }
    .ag-net-logo-spin {
      width: 64px;
      height: 64px;
      animation: ag-logo-pulse 1.4s cubic-bezier(0.65,0,0.35,1) infinite;
    }
    @keyframes ag-logo-pulse {
      0%   { opacity: 1;    transform: scale(1);    filter: drop-shadow(0 0 0px #C8FF00); }
      50%  { opacity: 0.55; transform: scale(0.88); filter: drop-shadow(0 0 14px #C8FF00); }
      100% { opacity: 1;    transform: scale(1);    filter: drop-shadow(0 0 0px #C8FF00); }
    }
    .ag-net-status-text {
      font-family: 'Geist Mono', monospace;
      font-size: 9px;
      letter-spacing: 0.28em;
      color: var(--ag-text-2);
      text-transform: uppercase;
      text-align: center;
    }
    .ag-net-status-text strong {
      display: block;
      font-size: 11px;
      letter-spacing: 0.18em;
      color: var(--ag-text-1);
      margin-bottom: 4px;
    }
    .ag-net-dots span {
      display: inline-block;
      width: 4px;
      height: 4px;
      border-radius: 50%;
      background: var(--ag-accent);
      margin: 0 3px;
      animation: ag-dot-blink 1.2s infinite;
    }
    .ag-net-dots span:nth-child(2) { animation-delay: 0.2s; }
    .ag-net-dots span:nth-child(3) { animation-delay: 0.4s; }
    @keyframes ag-dot-blink {
      0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
      40%            { opacity: 1;   transform: scale(1.2); }
    }

    /* ── Main page button panel ── */
    .ag-btn-panel {
      margin-top: 20px;
      padding: 16px 0 0;
      border-top: 0.5px solid var(--ag-border);
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
    }
    .ag-btn-panel__label {
      font-family: 'Geist Mono', monospace;
      font-size: 8px;
      letter-spacing: 0.2em;
      color: var(--ag-text-2);
      text-transform: uppercase;
      width: 100%;
      margin-bottom: 4px;
    }
    .ag-panel-btn {
      font-family: 'Geist Mono', monospace;
      font-size: 9px;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      padding: 7px 14px;
      border: 0.5px solid var(--ag-border);
      background: transparent;
      color: var(--ag-text-2);
      cursor: pointer;
      border-radius: 0;
      position: relative;
      overflow: hidden;
      transition: color 0.18s, border-color 0.18s, background 0.18s;
      white-space: nowrap;
    }
    .ag-panel-btn::before {
      content: '';
      position: absolute;
      inset: 0;
      background: repeating-linear-gradient(
        90deg,
        transparent, transparent 3px,
        rgba(200,255,0,0.04) 3px, rgba(200,255,0,0.04) 4px
      );
      opacity: 0;
      transition: opacity 0.18s;
    }
    .ag-panel-btn:hover { color: var(--ag-accent); border-color: var(--ag-accent); }
    .ag-panel-btn:hover::before { opacity: 1; }
    .ag-panel-btn:active { background: var(--ag-accent); color: var(--ag-void); }
    .ag-panel-btn--danger:hover { color: #ff4444; border-color: #ff4444; }
    .ag-panel-btn--danger:active { background: #ff4444; color: var(--ag-void); }
    .ag-panel-btn--primary {
      border-color: rgba(200,255,0,0.35);
      color: var(--ag-accent);
    }

    /* ── Transitions for Graph ── */
    #ag-trend-graph path, #ag-trend-graph circle {
      transition: all 0.6s cubic-bezier(0.16,1,0.3,1);
    }
    .ag-graph-fade {
      animation: ag-graph-in 0.8s cubic-bezier(0.16,1,0.3,1) forwards;
    }
    @keyframes ag-graph-in {
      from { opacity: 0; transform: translateY(10px); }
      to   { opacity: 1; transform: translateY(0); }
    }
  `;
  document.head.appendChild(style);
})();

/* ═══════════════════════════════════════════════════════════════════════════════
   1.  GLOBAL STATE
   ═══════════════════════════════════════════════════════════════════════════════ */
let captchaToken   = null;
let activeUsername  = '';
let loginMode      = 'username'; // 'username' | 'phone'

/* ═══════════════════════════════════════════════════════════════════════════════
   1b.  PASSWORD STRENGTH ENGINE
   ═══════════════════════════════════════════════════════════════════════════════ */

/**
 * Analyse a password and return a structured strength report.
 * @param {string} pw
 * @returns {{ score: number, isStrong: boolean, checks: object }}
 */
function checkPasswordStrength(pw) {
  const checks = {
    length:  pw.length >= 8,
    upper:   /[A-Z]/.test(pw),
    lower:   /[a-z]/.test(pw),
    number:  /[0-9]/.test(pw),
    special: /[^A-Za-z0-9]/.test(pw),
  };
  const score = Object.values(checks).filter(Boolean).length; // 0-5
  return { score, isStrong: score === 5, checks };
}

/**
 * Bind live password-strength feedback to the signup password field.
 * Updates the bar, label text, and per-rule tick marks.
 */
function initPasswordStrength() {
  const pwdInput = document.getElementById('ag-signup-password');
  if (!pwdInput) return;

  const fill  = document.getElementById('ag-strength-fill');
  const label = document.getElementById('ag-strength-label');
  const reqIds = {
    length:  'ag-req-len',
    upper:   'ag-req-upper',
    lower:   'ag-req-lower',
    number:  'ag-req-num',
    special: 'ag-req-special',
  };

  const LEVEL_COLORS = [
    '',                    // 0 — no input
    '#ff4444',             // 1 — very weak
    '#ff8800',             // 2 — weak
    '#ffcc00',             // 3 — fair
    '#88cc00',             // 4 — good
    'var(--ag-accent)',    // 5 — strong
  ];
  const LEVEL_LABELS = [
    'ENTER A PASSWORD',
    'VERY_WEAK',
    'WEAK',
    'FAIR',
    'GOOD',
    'STRONG ✔',
  ];

  pwdInput.addEventListener('input', () => {
    const pw = pwdInput.value;
    if (!pw) {
      if (fill)  { fill.style.width = '0%'; fill.style.background = ''; }
      if (label) { label.textContent = 'ENTER A PASSWORD'; label.style.color = ''; }
      Object.values(reqIds).forEach(id => document.getElementById(id)?.classList.remove('ag-req-pass'));
      return;
    }

    const { score, checks } = checkPasswordStrength(pw);
    const pct   = (score / 5) * 100;
    const color = LEVEL_COLORS[score];

    if (fill)  { fill.style.width = `${pct}%`; fill.style.background = color; }
    if (label) { label.textContent = LEVEL_LABELS[score]; label.style.color = color; }

    Object.entries(reqIds).forEach(([key, id]) => {
      const el = document.getElementById(id);
      if (!el) return;
      if (checks[key]) el.classList.add('ag-req-pass');
      else             el.classList.remove('ag-req-pass');
    });
  });
}

/* ═══════════════════════════════════════════════════════════════════════════════
   2.  AUTH OVERLAY DOM CONSTRUCTION
   ═══════════════════════════════════════════════════════════════════════════════ */
function buildAuthOverlay() {
  const overlay = document.createElement('div');
  overlay.id = 'ag-auth-overlay';

  overlay.innerHTML = `
    <!-- Auth card -->
    <div id="ag-auth-card">

      <!-- ── Stage 1: LOGIN ── -->
      <div class="ag-stage ag-active" id="ag-stage-login">
        <!-- Logo -->
        <div class="ag-logo-wrap">
          <img src="./stp-logo.png" alt="STP" class="ag-logo-img" />
          <div class="ag-logo-text"><strong>STP</strong>Control Dashboard</div>
        </div>
        <div class="ag-wordmark">DASHBOARD-v2 // SECURE</div>
        <div class="ag-divider"></div>

        <div class="ag-field">
          <input class="ag-input" id="ag-username" type="text"
            autocomplete="off" spellcheck="false"
            placeholder="Username" />
        </div>
        <button class="ag-login-mode-toggle" id="ag-phone-toggle">
          <svg style="margin-right:4px; vertical-align:middle;" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l2.19-2.19a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
          SWITCH_TO_PHONE_AUTH
        </button>
        <div class="ag-field">
          <input class="ag-input" id="ag-password" type="password"
            autocomplete="off"
            placeholder="Password" />
        </div>

        <!-- reCAPTCHA v2 widget wrapper -->
        <div class="ag-captcha-wrapper" id="ag-captcha-wrapper">
          <div id="ag-recaptcha-widget"></div>
        </div>

        <button class="ag-auth-btn" id="ag-login-btn">
          <svg style="margin-right:8px; vertical-align:middle;" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
          AUTHENTICATE
        </button>
        <div class="ag-auth-error" id="ag-login-error"></div>
        <div class="ag-auth-toggle">
          No account? <button id="ag-goto-signup"><svg style="margin-right:4px; vertical-align:middle;" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg> Register</button>
        </div>
      </div>

      <!-- ── Stage 2: SIGNUP ── -->
      <div class="ag-stage" id="ag-stage-signup">
        <!-- Logo -->
        <div class="ag-logo-wrap">
          <img src="./stp-logo.png" alt="STP" class="ag-logo-img" />
          <div class="ag-logo-text"><strong>STP</strong>New Account</div>
        </div>
        <div class="ag-wordmark">REGISTER // NEW_NODE</div>
        <div class="ag-divider"></div>

        <div class="ag-field">
          <input class="ag-input" id="ag-signup-username" type="text"
            autocomplete="off" spellcheck="false"
            placeholder="Choose Username" />
        </div>
        <div class="ag-field">
          <input class="ag-input" id="ag-signup-phone" type="tel"
            autocomplete="off"
            placeholder="Phone Number (+91XXXXXXXXXX)" />
        </div>
        <div class="ag-field">
          <input class="ag-input" id="ag-signup-email" type="email"
            autocomplete="off"
            placeholder="Email Address" />
        </div>
        <div class="ag-field-label-sub" style="font-size:7px; color:var(--ag-text-2); margin:-12px 0 15px 5px; letter-spacing:0.1em;">* AT LEAST ONE REQUIRED: PHONE OR EMAIL</div>

        <div class="ag-field">
          <input class="ag-input" id="ag-signup-password" type="password"
            autocomplete="off"
            placeholder="Choose Password" />
          <!-- Password strength meter -->
          <div class="ag-strength-wrap">
            <div class="ag-strength-bar-track">
              <div class="ag-strength-bar-fill" id="ag-strength-fill"></div>
            </div>
            <div class="ag-strength-label" id="ag-strength-label">ENTER A PASSWORD</div>
            <div class="ag-strength-reqs">
              <span class="ag-req" id="ag-req-len">&nbsp;Min 8 characters</span>
              <span class="ag-req" id="ag-req-upper">&nbsp;Uppercase letter</span>
              <span class="ag-req" id="ag-req-lower">&nbsp;Lowercase letter</span>
              <span class="ag-req" id="ag-req-num">&nbsp;Number</span>
              <span class="ag-req" id="ag-req-special">&nbsp;Special character (!@#$...)</span>
            </div>
          </div>
        </div>
        <div class="ag-field">
          <input class="ag-input" id="ag-signup-confirm" type="password"
            autocomplete="off"
            placeholder="Confirm Password" />
        </div>

        <button class="ag-auth-btn" id="ag-signup-btn">
          <svg style="margin-right:8px; vertical-align:middle;" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>
          CREATE_ACCOUNT
        </button>
        <div class="ag-auth-error" id="ag-signup-error"></div>
        <div class="ag-auth-success" id="ag-signup-success"></div>
        <div class="ag-auth-toggle">
          Already registered? <button id="ag-goto-login"><svg style="margin-right:4px; vertical-align:middle;" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg> Sign In</button>
        </div>
      </div>

    </div>
  `;

  document.body.appendChild(overlay);
}

/* ═══════════════════════════════════════════════════════════════════════════════
   3.  STAGE TRANSITION CONTROLLER
   ═══════════════════════════════════════════════════════════════════════════════ */
function showAuthStage(stageName) {
  const stages = { login: 'ag-stage-login', signup: 'ag-stage-signup' };
  const overlay = document.getElementById('ag-auth-overlay');

  // Reset overlay visibility if we're coming back to login
  if (overlay) {
    overlay.style.display = 'flex';
    overlay.style.opacity = '1';
    overlay.classList.remove('ag-fade-out');
  }

  Object.entries(stages).forEach(([name, id]) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (name === stageName) {
      el.classList.add('ag-active');
      // Two rAFs: allow display:block to paint before opacity kicks in
      requestAnimationFrame(() => {
        requestAnimationFrame(() => el.classList.add('ag-visible'));
      });
    } else {
      el.classList.remove('ag-visible');
      if (el.classList.contains('ag-active')) {
        // Stage is currently ON — wait for its fade-out transition before hiding
        el.addEventListener('transitionend', () => el.classList.remove('ag-active'), { once: true });
      } else {
        // Stage is already hidden — no transition running, remove ag-active immediately
        el.classList.remove('ag-active');
      }
    }
  });

  // Reset dashboard if going back to login
  if (stageName === 'login') {
    const shell = document.querySelector('.page-shell');
    if (shell) shell.classList.remove('ag-revealed');
    captchaToken = null;

    // Re-render captcha
    if (window.grecaptcha) {
      try { window.grecaptcha.reset(); } catch (e) { /* ignore */ }
    }

    // Clear login inputs
    ['ag-username', 'ag-password'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    const loginErr = document.getElementById('ag-login-error');
    if (loginErr) loginErr.textContent = '';
  }

  if (stageName === 'signup') {
    // Clear signup form
    ['ag-signup-username', 'ag-signup-phone', 'ag-signup-password', 'ag-signup-confirm', 'ag-signup-email'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    // Reset strength meter
    const fill  = document.getElementById('ag-strength-fill');
    const label = document.getElementById('ag-strength-label');
    if (fill)  { fill.style.width = '0%'; fill.style.background = ''; }
    if (label) { label.textContent = 'ENTER A PASSWORD'; label.style.color = ''; }
    ['ag-req-len','ag-req-upper','ag-req-lower','ag-req-num','ag-req-special'].forEach(id => {
      document.getElementById(id)?.classList.remove('ag-req-pass');
    });
    const signupErr = document.getElementById('ag-signup-error');
    const signupOk  = document.getElementById('ag-signup-success');
    if (signupErr) signupErr.textContent = '';
    if (signupOk)  signupOk.textContent  = '';
    setTimeout(() => document.getElementById('ag-signup-username')?.focus(), 220);
  }
}


/* ═══════════════════════════════════════════════════════════════════════════════
   4.  DASHBOARD REVEAL
   ═══════════════════════════════════════════════════════════════════════════════ */
function revealDashboard() {
  // 1. Fade out auth overlay
  const overlay = document.getElementById('ag-auth-overlay');
  if (overlay) {
    overlay.classList.add('ag-fade-out');
    setTimeout(() => { overlay.style.display = 'none'; }, 220);
  }

  // 2. Reveal dashboard
  const shell = document.querySelector('.page-shell');
  if (shell) {
    setTimeout(() => shell.classList.add('ag-revealed'), 50);
  }

  // 3. Scanline sweep
  const sweep = document.getElementById('ag-scanline-sweep');
  if (sweep) {
    setTimeout(() => {
      sweep.classList.add('ag-sweeping');
      sweep.addEventListener('animationend', () => {
        sweep.classList.remove('ag-sweeping');
      }, { once: true });
    }, 100);
  }
}

/* ═══════════════════════════════════════════════════════════════════════════════
   7.  API CALLS
   ═══════════════════════════════════════════════════════════════════════════════ */

// Determines whether we're running against a live server or in static mode
const AG_API_BASE = (() => {
  // Use same-origin API calls when served over HTTP/HTTPS; disk-opened pages stay in demo mode.
  try {
    return window.location.protocol === 'file:' ? null : window.location.origin;
  } catch { return null; }
})();

// ── Demo user store (localStorage-backed, no server needed) ──────────────────
const DEMO_USERS_KEY = 'ag_demo_users';
function getDemoUsers() {
  try { return JSON.parse(localStorage.getItem(DEMO_USERS_KEY) || '{}'); } catch { return {}; }
}
function saveDemoUsers(users) {
  localStorage.setItem(DEMO_USERS_KEY, JSON.stringify(users));
}
// Seed a default admin (password meets strength requirements: Admin@123!)
(function seedDefaultUser() {
  const users = getDemoUsers();
  if (!users['admin']) {
    // Store as { passwordHash, phone } in demo mode too
    users['admin'] = { password: 'Admin@123!', phone: '+910000000000' };
    saveDemoUsers(users);
  }
})();

async function apiLogin(identifier, password, captchaVerified) {
  if (!AG_API_BASE) {
    // DEMO mode — check localStorage user store
    const users = getDemoUsers();
    const key = identifier.toLowerCase();
    
    // Resolution logic for demo mode: check username, then email, then phone
    let record = users[key];
    if (!record) {
      for (const u of Object.values(users)) {
        if (typeof u === 'object') {
          if (u.email && u.email.toLowerCase() === key) { record = u; break; }
          const normalized = identifier.replace(/\D/g, '');
          if (u.phone && u.phone.replace(/\D/g, '') === normalized) { record = u; break; }
        }
      }
    }

    // Support both legacy format (string) and new format ({ password, phone })
    const storedPwd = record ? (typeof record === 'object' ? record.password : record) : null;
    if (storedPwd && storedPwd === password) {
      return {
        success: true,
        sessionToken: 'demo_session',
        username: record?.username || key,
        phone: record?.phone || null,
        email: record?.email || null
      };
    }
    return { success: false, reason: 'INVALID_CREDENTIALS' };
  }
  const res = await fetch(`${AG_API_BASE}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password, captchaVerified }),
  });
  const data = await res.json();
  return data;
}

async function apiSignup(username, phone, password, email) {
  if (!AG_API_BASE) {
    // DEMO mode — write to localStorage user store
    const users = getDemoUsers();
    const key = username.toLowerCase();
    if (users[key]) {
      return { success: false, reason: 'USERNAME_TAKEN' };
    }
    // Check phone/email uniqueness in demo store
    for (const rec of Object.values(users)) {
      if (typeof rec === 'object') {
        if (phone && rec.phone === phone) return { success: false, reason: 'PHONE_TAKEN' };
        if (email && rec.email && rec.email.toLowerCase() === email.toLowerCase()) {
          return { success: false, reason: 'EMAIL_TAKEN' };
        }
      }
    }
    users[key] = { password, phone, email };
    saveDemoUsers(users);
    activeUsername = username;
    return { success: true, sessionToken: 'demo_session', username, phone, email };
  }
  const res = await fetch(`${AG_API_BASE}/api/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, phone, password, email }),
  });
  const data = await res.json();
  return data;
}

/* ═══════════════════════════════════════════════════════════════════════════════
   8.  LOGIN FLOW
   ═══════════════════════════════════════════════════════════════════════════════ */
function bindPhoneLoginToggle() {
  const toggleBtn = document.getElementById('ag-phone-toggle');
  const usernameInput = document.getElementById('ag-username');
  if (!toggleBtn || !usernameInput) return;

  toggleBtn.addEventListener('click', () => {
    if (loginMode === 'username') {
      loginMode = 'phone';
      usernameInput.type        = 'tel';
      usernameInput.placeholder = 'Phone Number (+91XXXXXXXXXX)';
      usernameInput.value       = '';
      toggleBtn.innerHTML       = '<svg style="margin-right:4px; vertical-align:middle;" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg> SWITCH_TO_USER_AUTH';
    } else {
      loginMode = 'username';
      usernameInput.type        = 'text';
      usernameInput.placeholder = 'Username';
      usernameInput.value       = '';
      toggleBtn.innerHTML       = '<svg style="margin-right:4px; vertical-align:middle;" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l2.19-2.19a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg> SWITCH_TO_PHONE_AUTH';
    }
    usernameInput.focus();
  });
}

function bindLoginButton() {
  const btn = document.getElementById('ag-login-btn');
  const errEl = document.getElementById('ag-login-error');
  if (!btn) return;

  btn.addEventListener('click', async () => {
    const identifier = (document.getElementById('ag-username')?.value || '').trim();
    const password   = (document.getElementById('ag-password')?.value || '').trim();

    errEl.textContent = '';

    if (!identifier || !password) {
      errEl.textContent = loginMode === 'phone'
        ? 'ERR // PHONE + PASSWORD REQUIRED'
        : 'ERR // USERNAME + PASSWORD REQUIRED';
      return;
    }

    // Check captcha
    const captchaVerified = Boolean(captchaToken);
    if (!captchaVerified && AG_API_BASE) {
      errEl.textContent = 'ERR // CAPTCHA_VERIFICATION_REQUIRED';
      return;
    }

    btn.textContent = 'AUTHENTICATING...';
    btn.disabled = true;

    try {
      const result = await apiLogin(identifier, password, captchaVerified || !AG_API_BASE);
      if (result.success) {
        activeUsername = identifier;
        localStorage.setItem('ag_session', result.sessionToken || 'verified');
        revealDashboard();
      } else {
        errEl.textContent = `ERR // ${result.reason || 'AUTHENTICATION_FAILED'}`;
      }
    } catch {
      errEl.textContent = 'ERR // NETWORK_UNAVAILABLE';
    }

    btn.textContent = 'AUTHENTICATE →';
    btn.disabled = false;
  });

  // Enter key shortcut
  ['ag-username', 'ag-password'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') btn.click();
    });
  });
}

/* ═══════════════════════════════════════════════════════════════════════════════
   9.  SIGNUP FLOW
   ═══════════════════════════════════════════════════════════════════════════════ */
function bindSignupButton() {
  // Toggle: login → signup
  const gotoSignup = document.getElementById('ag-goto-signup');
  if (gotoSignup) gotoSignup.addEventListener('click', () => showAuthStage('signup'));

  // Toggle: signup → login
  const gotoLogin = document.getElementById('ag-goto-login');
  if (gotoLogin) gotoLogin.addEventListener('click', () => showAuthStage('login'));

  const btn     = document.getElementById('ag-signup-btn');
  const errEl   = document.getElementById('ag-signup-error');
  const okEl    = document.getElementById('ag-signup-success');
  if (!btn) return;

  btn.addEventListener('click', async () => {
    const username = (document.getElementById('ag-signup-username')?.value || '').trim();
    const phone    = (document.getElementById('ag-signup-phone')?.value    || '').trim();
    const password = (document.getElementById('ag-signup-password')?.value || '').trim();
    const confirm  = (document.getElementById('ag-signup-confirm')?.value  || '').trim();
    const email    = (document.getElementById('ag-signup-email')?.value    || '').trim();

    errEl.textContent = '';
    okEl.textContent  = '';

    // Field validation
    if (!username || !password || (!phone && !email)) {
      errEl.textContent = 'ERR // USERNAME + PASSWORD + (PHONE OR EMAIL) REQUIRED';
      return;
    }
    if (username.length < 3) {
      errEl.textContent = 'ERR // USERNAME MIN 3 CHARS';
      return;
    }
    if (phone && !phone.replace(/\D/g, '').match(/^\d{7,15}$/)) {
      errEl.textContent = 'ERR // INVALID PHONE NUMBER FORMAT';
      return;
    }
    if (email && !email.includes('@')) {
      errEl.textContent = 'ERR // INVALID EMAIL ADDRESS';
      return;
    }
    // Strong password gate
    const strength = checkPasswordStrength(password);
    if (!strength.isStrong) {
      errEl.textContent = 'ERR // PASSWORD TOO WEAK — MEET ALL 5 REQUIREMENTS';
      return;
    }
    if (password !== confirm) {
      errEl.textContent = 'ERR // PASSWORDS_DO_NOT_MATCH';
      return;
    }

    btn.textContent = 'REGISTERING...';
    btn.disabled = true;

    try {
      const result = await apiSignup(username, phone, password, email);
      if (result.success) {
        activeUsername = username;
        localStorage.setItem('ag_session', result.sessionToken || 'verified');
        okEl.textContent = 'ACCOUNT_CREATED // ACCESS GRANTED';
        revealDashboard();
      } else {
        errEl.textContent = `ERR // ${result.reason || 'REGISTRATION_FAILED'}`;
      }
    } catch {
      errEl.textContent = 'ERR // NETWORK_UNAVAILABLE';
    }

    btn.textContent = 'CREATE_ACCOUNT →';
    btn.disabled = false;
  });

  // Enter key on any signup input
  ['ag-signup-username','ag-signup-phone','ag-signup-password','ag-signup-confirm','ag-signup-email'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('keydown', (e) => { if (e.key === 'Enter') btn.click(); });
  });
}

/* ═══════════════════════════════════════════════════════════════════════════════
   10.  GOOGLE RECAPTCHA v2 INTEGRATION
   ═══════════════════════════════════════════════════════════════════════════════ */
// Your site key — replace with real key when deploying
const RECAPTCHA_SITE_KEY = '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI'; // test key

function loadRecaptcha() {
  // Callback for when reCAPTCHA script loads
  window.ag_recaptchaCallback = (token) => { captchaToken = token; };
  window.ag_recaptchaExpired  = () => { captchaToken = null; };

  // Inject Google's reCAPTCHA script
  const script = document.createElement('script');
  script.src = 'https://www.google.com/recaptcha/api.js?onload=ag_onRecaptchaLoad&render=explicit';
  script.async = true;
  script.defer = true;
  document.head.appendChild(script);

  window.ag_onRecaptchaLoad = () => {
    if (window.grecaptcha && document.getElementById('ag-recaptcha-widget')) {
      window.grecaptcha.render('ag-recaptcha-widget', {
        sitekey: RECAPTCHA_SITE_KEY,
        theme: 'dark',
        callback: window.ag_recaptchaCallback,
        'expired-callback': window.ag_recaptchaExpired,
      });
    }
  };
}

/* ═══════════════════════════════════════════════════════════════════════════════
   11.  ACTION BUTTONS — REFRESH_SYSTEM / DATA_DRILLDOWN / TERMINATE_SESSION
   ═══════════════════════════════════════════════════════════════════════════════ */
function injectActionButtons() {
  const hero = document.querySelector('.hero');
  if (!hero) return;

  // Add data-table-anchor to the main parameter table
  const mainTable = document.querySelector('.table-wrap table');
  if (mainTable) mainTable.setAttribute('data-table-anchor', '');

  // Create cluster
  const cluster = document.createElement('div');
  cluster.className = 'ag-action-cluster';
  cluster.innerHTML = `
    <button class="ag-action-btn" id="btn-refresh">REFRESH_SYSTEM</button>
    <button class="ag-action-btn" id="btn-drilldown">DATA_DRILLDOWN</button>
    <button class="ag-action-btn" id="btn-terminate">TERMINATE_SESSION</button>
  `;

  // Inject into hero header
  const heroCard = hero.querySelector('.hero-card');
  if (heroCard) {
    heroCard.style.position = 'relative';
    const clusterWrapper = document.createElement('div');
    clusterWrapper.style.cssText = 'margin-top: 16px;';
    clusterWrapper.appendChild(cluster);
    heroCard.appendChild(clusterWrapper);
  } else {
    hero.appendChild(cluster);
  }

  // ── REFRESH_SYSTEM ──
  document.getElementById('btn-refresh').addEventListener('click', () => {
    const btn = document.getElementById('btn-refresh');
    const original = btn.textContent;
    btn.textContent = 'SYNCING...';
    btn.disabled = true;

    // Call the EXISTING syncFromSheet from app.js — not redefined
    if (typeof syncFromSheet === 'function') {
      syncFromSheet();
    }

    setTimeout(() => {
      btn.textContent = original;
      btn.disabled = false;
    }, 2500);
  });

  // ── DATA_DRILLDOWN ──
  document.getElementById('btn-drilldown').addEventListener('click', () => {
    const table = document.querySelector('[data-table-anchor]');
    if (table) table.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  // ── TERMINATE_SESSION ──
  document.getElementById('btn-terminate').addEventListener('click', () => {
    sessionStorage.clear();
    localStorage.removeItem('ag_session');
    captchaToken = null;
    document.querySelectorAll('.ag-input').forEach(i => i.value = '');
    showAuthStage('login');
  });
}

/* ═══════════════════════════════════════════════════════════════════════════════
   12.  PIE CHART REMOVAL
   ═══════════════════════════════════════════════════════════════════════════════ */
function removePieChart() {
  // Remove pie chart column from the DOM
  const pieContainer = document.querySelector('.pie-container');
  const pieCanvas    = document.getElementById('compliance-pie-chart');
  const legend       = document.getElementById('compliance-legend');

  [pieContainer, pieCanvas, legend].forEach(el => el?.remove());

  // The analytics title above the pie — remove its parent column
  const analyticsCol = document.querySelector('.analytics-col:first-child');
  if (analyticsCol) analyticsCol.style.display = 'none';
}

/* ═══════════════════════════════════════════════════════════════════════════════
   13.  BLUEPRINT SVG TREND GRAPH
   ═══════════════════════════════════════════════════════════════════════════════ */
function buildBlueprintGraph() {
  // Replace the old trend canvas with our SVG container
  const trendContainer = document.querySelector('.trend-container');
  if (!trendContainer) return;

  trendContainer.innerHTML = `
    <div class="ag-trend-container" id="ag-trend-host">
      <svg id="ag-trend-graph" preserveAspectRatio="xMidYMid meet"></svg>
      <div class="ag-trend-tooltip" id="ag-trend-tooltip"></div>
    </div>
  `;

  // Update the section title
  const title = document.querySelector('.analytics-col.span-2 .analytics-title');
  if (title) title.textContent = 'COD & pH Outlet Trends // BLUEPRINT';
}

// Data store for the graph (populated by loadGraphData)
let graphData = [];

function renderBlueprintSVG(data) {
  const svg = document.getElementById('ag-trend-graph');
  if (!svg || !data || data.length === 0) return;

  // Add transition class
  svg.classList.remove('ag-graph-fade');
  void svg.offsetWidth; // trigger reflow
  svg.classList.add('ag-graph-fade');

  const host  = document.getElementById('ag-trend-host');
  const W     = host ? host.offsetWidth  : 600;
  const H     = 240;
  const pad   = { top: 28, right: 28, bottom: 36, left: 48 };
  const graphW = W - pad.left - pad.right;
  const graphH = H - pad.top  - pad.bottom;

  svg.setAttribute('width',  W);
  svg.setAttribute('height', H);
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);

  // Value bounds
  const codValues = data.map(d => d.cod);
  const phValues  = data.map(d => d.ph);
  const codMax   = Math.max(...codValues, 50) * 1.15;
  const codMin   = 0;
  const phMax    = Math.max(...phValues, 8) + 0.5;
  const phMin    = Math.min(...phValues, 6) - 0.5;

  const mapX   = (i)   => pad.left + (i / Math.max(data.length - 1, 1)) * graphW;
  const mapCod = (v)   => pad.top  + graphH - ((v - codMin) / (codMax - codMin)) * graphH;
  const mapPh  = (v)   => pad.top  + graphH - ((v - phMin)  / (phMax  - phMin))  * graphH;

  // Grid step helpers
  const GRID_COLS = 6;
  const GRID_ROWS = 5;

  let markup = '';

  // ── Blueprint grid lines (horizontal + vertical) ──
  for (let r = 0; r <= GRID_ROWS; r++) {
    const y = pad.top + (r / GRID_ROWS) * graphH;
    markup += `<line x1="${pad.left}" y1="${y}" x2="${pad.left + graphW}" y2="${y}"
      stroke="rgba(255,255,255,0.04)" stroke-width="0.5" />`;
  }
  for (let c = 0; c <= GRID_COLS; c++) {
    const x = pad.left + (c / GRID_COLS) * graphW;
    markup += `<line x1="${x}" y1="${pad.top}" x2="${x}" y2="${pad.top + graphH}"
      stroke="rgba(255,255,255,0.04)" stroke-width="0.5" />`;
  }

  // ── Axes ──
  markup += `
    <line x1="${pad.left}" y1="${pad.top}" x2="${pad.left}" y2="${pad.top + graphH}"
      stroke="rgba(255,255,255,0.09)" stroke-width="0.5" />
    <line x1="${pad.left}" y1="${pad.top + graphH}" x2="${pad.left + graphW}" y2="${pad.top + graphH}"
      stroke="rgba(255,255,255,0.09)" stroke-width="0.5" />
  `;

  // ── Y-axis labels (COD scale on left) ──
  for (let r = 0; r <= GRID_ROWS; r++) {
    const y   = pad.top + (r / GRID_ROWS) * graphH;
    const val = codMax - (r / GRID_ROWS) * (codMax - codMin);
    markup += `<text x="${pad.left - 6}" y="${y + 3}"
      text-anchor="end"
      font-family="'Geist Mono', monospace" font-size="8"
      fill="#5A5F70" letter-spacing="0.05em"
    >${Math.round(val)}</text>`;
  }

  // ── X-axis labels (time/index) ──
  const labelStep = Math.max(1, Math.floor(data.length / GRID_COLS));
  data.forEach((d, i) => {
    if (i % labelStep !== 0 && i !== data.length - 1) return;
    const x = mapX(i);
    markup += `<text x="${x}" y="${pad.top + graphH + 14}"
      text-anchor="middle"
      font-family="'Geist Mono', monospace" font-size="8"
      fill="#5A5F70" letter-spacing="0.05em"
    >${d.time}</text>`;
  });

  // ── Axis unit labels ──
  markup += `
    <text x="${pad.left + 4}" y="${pad.top - 10}"
      font-family="'Geist Mono', monospace" font-size="8" fill="#5A5F70" letter-spacing="0.08em"
    >COD mg/L</text>
    <text x="${pad.left + graphW - 4}" y="${pad.top - 10}"
      text-anchor="end"
      font-family="'Geist Mono', monospace" font-size="8" fill="#5A5F70" letter-spacing="0.08em"
    >pH</text>
  `;

  // ── COD line ──
  const codPath = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${mapX(i)},${mapCod(d.cod)}`).join(' ');
  markup += `<path d="${codPath}" fill="none" stroke="#C8FF00" stroke-width="1" />`;

  // ── pH line (dashed, subtle) ──
  const phPath = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${mapX(i)},${mapPh(d.ph)}`).join(' ');
  markup += `<path d="${phPath}" fill="none" stroke="rgba(200,255,0,0.4)" stroke-width="1" stroke-dasharray="3 3" />`;

  // ── Data points (COD) ──
  data.forEach((d, i) => {
    const cx = mapX(i);
    const cy = mapCod(d.cod);
    markup += `
      <circle class="ag-data-point" data-idx="${i}"
        cx="${cx}" cy="${cy}" r="2"
        fill="#030507" stroke="#C8FF00" stroke-width="1" />
    `;
  });

  // ── Data points (pH) ──
  data.forEach((d, i) => {
    const cx = mapX(i);
    const cy = mapPh(d.ph);
    markup += `
      <circle class="ag-ph-point" data-idx="${i}"
        cx="${cx}" cy="${cy}" r="2"
        fill="#030507" stroke="rgba(200,255,0,0.4)" stroke-width="1" />
    `;
  });

  // ── Hover crosshair line (vertical) ──
  markup += `<line id="ag-crosshair"
    x1="0" y1="${pad.top}" x2="0" y2="${pad.top + graphH}"
    stroke="rgba(255,255,255,0.09)" stroke-width="0.5"
    style="display:none;" />`;

  svg.innerHTML = markup;

  // ── Store computed layout for interaction ──
  svg._layout = { pad, graphW, graphH, mapX, mapCod, mapPh, data };

  // ── Hover interaction ──
  bindGraphHover(svg, W, H);
}

function bindGraphHover(svg, W, H) {
  const tooltip   = document.getElementById('ag-trend-tooltip');
  const crosshair = svg.querySelector('#ag-crosshair');
  const { pad, graphW, graphH, mapX, mapCod, mapPh, data } = svg._layout;

  svg.addEventListener('mousemove', (e) => {
    const rect = svg.getBoundingClientRect();
    const mx   = e.clientX - rect.left;
    const my   = e.clientY - rect.top;

    if (mx < pad.left || mx > pad.left + graphW || my < pad.top || my > pad.top + graphH) {
      hideTooltip(svg, tooltip, crosshair);
      return;
    }

    // Find nearest data index
    let nearestIdx  = 0;
    let nearestDist = Infinity;
    data.forEach((d, i) => {
      const dist = Math.abs(mapX(i) - mx);
      if (dist < nearestDist) { nearestDist = dist; nearestIdx = i; }
    });

    const d  = data[nearestIdx];
    const cx = mapX(nearestIdx);

    // Crosshair
    if (crosshair) {
      crosshair.setAttribute('x1', cx);
      crosshair.setAttribute('x2', cx);
      crosshair.style.display = 'block';
    }

    // Enlarge nearest points
    svg.querySelectorAll('.ag-data-point').forEach(pt => {
      pt.setAttribute('r', pt.dataset.idx == nearestIdx ? '4' : '2');
    });
    svg.querySelectorAll('.ag-ph-point').forEach(pt => {
      pt.setAttribute('r', pt.dataset.idx == nearestIdx ? '4' : '2');
    });

    // Tooltip
    if (tooltip) {
      tooltip.innerHTML = `X: ${d.time} // COD: ${d.cod.toFixed(1)} // pH: ${d.ph.toFixed(2)}`;
      tooltip.classList.add('ag-visible');

      const host = document.getElementById('ag-trend-host');
      const hr   = host?.getBoundingClientRect();
      let left = e.clientX - (hr?.left || 0) + 12;
      let top  = e.clientY - (hr?.top  || 0) - 28;
      if (left + 200 > W) left = left - 210;
      tooltip.style.left = `${left}px`;
      tooltip.style.top  = `${top}px`;
    }
  });

  svg.addEventListener('mouseleave', () => hideTooltip(svg, tooltip, crosshair));
}

function hideTooltip(svg, tooltip, crosshair) {
  if (tooltip) tooltip.classList.remove('ag-visible');
  if (crosshair) crosshair.style.display = 'none';
  svg?.querySelectorAll('.ag-data-point, .ag-ph-point').forEach(pt => pt.setAttribute('r', '2'));
}

/* ═══════════════════════════════════════════════════════════════════════════════
   14.  DATA FEED: read from the same history the analytics script uses
   ═══════════════════════════════════════════════════════════════════════════════ */
const SHEET_CSV_URL_AG = 'https://docs.google.com/spreadsheets/d/1Xpy-oMHwTmPz8NNmyQzWdsfWYXS1iVUR9Q7lns4hJZw/export?format=csv&gid=0';

function formatTimeAG(dateObj) {
  const hh = String(dateObj.getHours()).padStart(2, '0');
  const mm = String(dateObj.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

async function loadGraphData(period = 'Default') {
  try {
    const res     = await fetch(SHEET_CSV_URL_AG, { cache: 'no-store' });
    const csvText = await res.text();
    const lines   = csvText.trim().split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) { useDefaultGraphData(); return; }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

    const getIdx = (aliases) => {
      for (let i = 0; i < headers.length; i++) {
        if (aliases.some(a => headers[i].includes(a))) return i;
      }
      return -1;
    };

    const timeIdx  = getIdx(['timestamp', 'time', 'date']);
    const codIdx   = getIdx(['cod outlet', 'cod_outlet', 'outlet cod']);
    const phIdx    = getIdx(['ph outlet', 'ph_outlet', 'outlet ph']);

    let result = [];
    let baseTime = new Date(Date.now() - lines.length * 5 * 60000);

    for (let i = 1; i < lines.length; i++) {
      const vals   = lines[i].split(',');
      const time   = timeIdx !== -1 && vals[timeIdx] ? vals[timeIdx].trim() : formatTimeAG(baseTime);
      const cod    = codIdx !== -1  ? Number(vals[codIdx])  : 0;
      const ph     = phIdx  !== -1  ? Number(vals[phIdx])   : 7;
      result.push({ time, cod, ph });
      baseTime = new Date(baseTime.getTime() + 5 * 60000);
    }

    // SIMULATE PERIODS based on existing source
    if (period === '7d') {
      // Create more sparse data over a longer "range"
      graphData = result.slice(-100).filter((_,i) => i % 2 === 0);
    } else if (period === '30d') {
      // Even more sparse for 30d
      graphData = result.slice(-200).filter((_,i) => i % 5 === 0);
    } else {
      graphData = result.slice(-50); // cap to last 50
    }
    
    renderBlueprintSVG(graphData);
  } catch {
    useDefaultGraphData();
  }
}

function useDefaultGraphData() {
  // Synthetic demo data derived from app.js defaultReading
  const base = [
    { cod: 13, ph: 7.48 }, { cod: 14, ph: 7.42 }, { cod: 11, ph: 7.39 },
    { cod: 16, ph: 7.35 }, { cod: 9,  ph: 7.44 }, { cod: 18, ph: 7.46 },
    { cod: 12, ph: 7.41 }, { cod: 10, ph: 7.50 }, { cod: 15, ph: 7.38 },
    { cod: 13, ph: 7.43 },
  ];
  graphData = base.map((d, i) => ({ ...d, time: `T+${i * 5}m` }));
  renderBlueprintSVG(graphData);
}

/* ═══════════════════════════════════════════════════════════════════════════════
   15.  SCANLINE SWEEP ELEMENT
   ═══════════════════════════════════════════════════════════════════════════════ */
function injectScanlineSweep() {
  const sweep = document.createElement('div');
  sweep.id = 'ag-scanline-sweep';
  document.body.appendChild(sweep);
}

/* ═══════════════════════════════════════════════════════════════════════════════
   15b. NETWORK LOADING OVERLAY
   ═══════════════════════════════════════════════════════════════════════════════ */
let _netLoaderVisible = false;
let _netPingTimer = null;

function injectNetLoader() {
  const el = document.createElement('div');
  el.id = 'ag-net-loader';
  el.innerHTML = `
    <img src="./stp-logo.png" alt="Loading" class="ag-net-logo-spin" />
    <div class="ag-net-status-text">
      <strong id="ag-net-title">NETWORK_DEGRADED</strong>
      <span id="ag-net-sub">Attempting to reconnect...</span>
    </div>
    <div class="ag-net-dots">
      <span></span><span></span><span></span>
    </div>
  `;
  document.body.appendChild(el);
}

function showNetLoader(title, sub) {
  const el  = document.getElementById('ag-net-loader');
  const tEl = document.getElementById('ag-net-title');
  const sEl = document.getElementById('ag-net-sub');
  if (!el) return;
  if (tEl) tEl.textContent = title || 'NETWORK_DEGRADED';
  if (sEl) sEl.textContent = sub   || 'Attempting to reconnect...';
  if (!_netLoaderVisible) {
    el.classList.add('ag-net-visible');
    _netLoaderVisible = true;
  }
}

function hideNetLoader() {
  const el = document.getElementById('ag-net-loader');
  if (!el) return;
  el.classList.remove('ag-net-visible');
  _netLoaderVisible = false;
}

function initNetworkMonitor() {
  window.addEventListener('offline', () => {
    showNetLoader('NO_NETWORK', 'Connection lost — waiting for signal...');
  });
  window.addEventListener('online', () => {
    pingAndHide();
  });

  function pingAndHide() {
    const start = Date.now();
    fetch('/api/ping?' + Date.now(), { method: 'HEAD', cache: 'no-store' })
      .then(() => {
        const rtt = Date.now() - start;
        if (rtt > 2500) {
          showNetLoader('SLOW_CONNECTION', `Latency: ${rtt}ms — data may be delayed`);
          setTimeout(hideNetLoader, 3000);
        } else {
          hideNetLoader();
        }
      })
      .catch(() => {
        if (!navigator.onLine) {
          showNetLoader('NO_NETWORK', 'Connection lost — waiting for signal...');
        } else {
          showNetLoader('SLOW_CONNECTION', 'Server unreachable — retrying...');
        }
      });
  }

  function schedulePing() {
    clearTimeout(_netPingTimer);
    _netPingTimer = setTimeout(() => {
      if (document.visibilityState === 'visible') pingAndHide();
      schedulePing();
    }, 15000);
  }
  schedulePing();

  // Also check when tab becomes visible again
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && !navigator.onLine) {
      showNetLoader('NO_NETWORK', 'Check your internet connection...');
    }
  });
}

// Add a trivial /api/ping endpoint server-side by intercepting the request:
// (handled in server.js — we add it here too as a fallback for file:// mode)
if (window.location.protocol !== 'file:') {
  // Ensure server has a /api/ping — if not, the catch in pingAndHide handles it gracefully
}

/* ═══════════════════════════════════════════════════════════════════════════════
   16.  RESIZE HANDLER — re-render graph on window resize
   ═══════════════════════════════════════════════════════════════════════════════ */
let resizeDebounce;
window.addEventListener('resize', () => {
  clearTimeout(resizeDebounce);
  resizeDebounce = setTimeout(() => {
    if (graphData.length) renderBlueprintSVG(graphData);
  }, 150);
});

/* ═══════════════════════════════════════════════════════════════════════════════
   17.  MAIN PAGE BUTTON PANEL SYSTEM
        Injects contextual button toolbars into each dashboard section.
   ═══════════════════════════════════════════════════════════════════════════════ */
function injectMainPageButtons() {
  // Rich High-Tech Icons Helper
  const getIcon = (type) => {
    const icons = {
      expand:   `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/><path d="M12 12m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" opacity="0.3"/></svg>`,
      collapse: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 14h6v6M20 10h-6V4M14 10l7-7M10 14l-7 7"/><circle cx="12" cy="12" r="1.5" opacity="0.4"/></svg>`,
      print:    `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/><path d="M15 17h2" opacity="0.5"/></svg>`,
      sync:     `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6M1 20v-6h6M21 12a9 9 0 0 0-16.14-5.14L3 10M3 12a9 9 0 0 0 16.14 5.14L21 14"/><circle cx="12" cy="12" r="2" opacity="0.3"/></svg>`,
      export:   `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/><path d="M9 7l3 3 3-3" opacity="0.4"/></svg>`,
      clear:    `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h2h16M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M10 11v6M14 11v6" opacity="0.5"/></svg>`,
      warn:     `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>`,
      reset:    `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8M3 3v5h5"/><circle cx="12" cy="12" r="3" opacity="0.2"/></svg>`,
      stage:    `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/><circle cx="12" cy="12" r="2" fill="currentColor" fill-opacity="0.2"/></svg>`,
      graph:    `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v18h18M18 9l-6 6-2-2-4 4"/><path d="M13 10a2 2 0 1 0 4 0 2 2 0 1 0-4 0" opacity="0.4"/></svg>`,
      demo:     `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/><circle cx="8" cy="16" r="1" opacity="0.6"/></svg>`,
      submit:   `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/><path d="M12 12m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" opacity="0.3"/></svg>`,
    };
    return icons[type] || '';
  };

  // Find all dashboard panels
  const panels = document.querySelectorAll('.panel.panel--wide');

  const panelButtons = [
    {
      // Panel 0: Operational Rules
      label: 'Protocol Override',
      buttons: [
        { id: 'btn-expand-rules',   text: `${getIcon('expand')} Expand All`,     cls: '' },
        { id: 'btn-collapse-rules', text: `${getIcon('collapse')} Collapse All`,   cls: '' },
        { id: 'btn-print-rules',    text: `${getIcon('print')} Hard Copy`,   cls: '' },
      ]
    },
    {
      // Panel 1: Dashboard Control
      label: 'Data Stream Control',
      buttons: [
        { id: 'btn-sync-now',    text: `${getIcon('sync')} Force Reload`,    cls: 'ag-panel-btn--primary' },
        { id: 'btn-export-csv',  text: `${getIcon('export')} Dump Analytics`,      cls: '' },
        { id: 'btn-clear-table', text: `${getIcon('clear')} Wipe Buffer`,     cls: 'ag-panel-btn--danger' },
        { id: 'btn-filter-warn', text: `${getIcon('warn')} Isolate Threats`,   cls: '' },
      ]
    },
    {
      // Panel 2: Process Map
      label: 'Process Architecture',
      buttons: [
        { id: 'btn-flow-architect', text: `${getIcon('stage')} Flow Architect`, cls: '' },
        { id: 'btn-flow-reset',     text: `${getIcon('reset')} Reset Grid`,     cls: '' }
      ]
    },
    {
      // Panel 3: Chronos Analysis
      label: 'Chronos Analysis',
      buttons: [
        { id: 'btn-graph-refresh', text: `${getIcon('sync')} Live Feed`, cls: 'ag-panel-btn--primary' },
        { id: 'btn-graph-7d',      text: `${getIcon('graph')} 7 Days Window`,       cls: '' },
        { id: 'btn-graph-30d',     text: `${getIcon('graph')} 30 Days Window`,      cls: '' },
        { id: 'btn-graph-export',  text: `${getIcon('export')} Snapshot PNG`,    cls: '' },
      ]
    },
    {
      // Panel 4: System Input
      label: 'System Input',
      buttons: [
        { id: 'btn-commit-write', text: `${getIcon('submit')} Commit Write`, cls: 'ag-panel-btn--primary' }
      ]
    }
  ];      ]
    },
    {
      // Panel 4: Add Reading
      label: 'MANUAL_INJECTOR',
      buttons: [
        { id: 'btn-form-clear',    text: `${getIcon('clear')} PURGE_FIELDS`,  cls: '' },
        { id: 'btn-form-fill-demo',text: `${getIcon('demo')} SIMULATE_LOAD`,     cls: '' },
        { id: 'btn-form-submit',   text: `${getIcon('submit')} COMMIT_WRITE`,cls: 'ag-panel-btn--primary' },
      ]
    },
  ];

  panels.forEach((panel, idx) => {
    const cfg = panelButtons[idx];
    if (!cfg) return;

    const bar = document.createElement('div');
    bar.className = 'ag-btn-panel';
    bar.innerHTML = `
      <div class="ag-btn-panel__label">${cfg.label}</div>
      ${cfg.buttons.map(b =>
        `<button class="ag-panel-btn ${b.cls}" id="${b.id}">${b.text}</button>`
      ).join('')}
    `;
    panel.appendChild(bar);
  });

  // ── Wire up the buttons ──────────────────────────────────────────────────

  // SYNC_NOW — same as REFRESH_SYSTEM
  document.getElementById('btn-sync-now')?.addEventListener('click', () => {
    const btn = document.getElementById('btn-sync-now');
    if (btn) { btn.textContent = 'SYNCING...'; btn.disabled = true; }
    if (typeof syncFromSheet === 'function') syncFromSheet();
    setTimeout(() => { if (btn) { btn.textContent = 'SYNC_NOW'; btn.disabled = false; } }, 2500);
  });

  // GRAPH_REFRESH
  document.getElementById('btn-graph-refresh')?.addEventListener('click', () => {
    loadGraphData();
  });

  // GRAPH 7D
  document.getElementById('btn-graph-7d')?.addEventListener('click', () => {
    loadGraphData('7d');
  });

  // GRAPH 30D
  document.getElementById('btn-graph-30d')?.addEventListener('click', () => {
    loadGraphData('30d');
  });

  // CLEAR_FIELDS
  document.getElementById('btn-form-clear')?.addEventListener('click', () => {
    document.querySelectorAll('#reading-form input').forEach(el => el.value = '');
  });

  // FILL_DEMO
  document.getElementById('btn-form-fill-demo')?.addEventListener('click', () => {
    const demo = {
      cod_inlet: 320, cod_outlet: 13, bod_inlet: 210, bod_outlet: 9,
      tss_inlet: 180, tss_outlet: 11, tds_inlet: 820, tds_outlet: 440,
      ph_inlet: 7.8, ph_outlet: 7.4, nitrate_inlet: 38, nitrate_outlet: 7,
      fecal_inlet: 4800, fecal_outlet: 140,
    };
    Object.entries(demo).forEach(([name, val]) => {
      const el = document.querySelector(`#reading-form [name="${name}"]`);
      if (el) el.value = val;
    });
  });

  // SUBMIT_READING — click the existing form submit button
  document.getElementById('btn-form-submit')?.addEventListener('click', () => {
    document.querySelector('#reading-form button[type="submit"]')?.click();
  });

  // EXPAND/COLLAPSE rules articles
  document.getElementById('btn-expand-rules')?.addEventListener('click', () => {
    document.querySelectorAll('.rules article').forEach(a => a.style.display = '');
  });
  document.getElementById('btn-collapse-rules')?.addEventListener('click', () => {
    const arts = document.querySelectorAll('.rules article');
    arts.forEach((a, i) => { if (i > 0) a.style.display = 'none'; });
  });

  // SHOW_WARNINGS — scroll to table and highlight exceeded rows
  document.getElementById('btn-filter-warn')?.addEventListener('click', () => {
    const table = document.querySelector('[data-table-anchor]');
    if (table) table.scrollIntoView({ behavior: 'smooth', block: 'start' });
    document.querySelectorAll('#parameter-table tr').forEach(tr => {
      const status = tr.querySelector('td:nth-child(5)');
      if (status && status.textContent.trim().toUpperCase() !== 'OK') {
        tr.style.outline = '1px solid rgba(255,68,68,0.5)';
      }
    });
  });

  // PRINT_REPORT
  document.getElementById('btn-print-rules')?.addEventListener('click', () => window.print());

  // EXPORT_CSV — simple CSV from parameter table
  document.getElementById('btn-export-csv')?.addEventListener('click', () => {
    const rows = Array.from(document.querySelectorAll('#parameter-table tr'));
    if (!rows.length) return;
    const header = 'Parameter,Inlet,Outlet,Limit,Status';
    const lines = rows.map(tr =>
      Array.from(tr.querySelectorAll('td')).slice(0, 5).map(td => td.textContent.trim()).join(',')
    );
    const csv = [header, ...lines].join('\n');
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    a.download = `stp-data-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  });

  // FLOW stage highlight buttons — highlight relevant flow-diagram nodes
  ['btn-flow-stage1','btn-flow-stage2','btn-flow-stage3'].forEach((id, idx) => {
    document.getElementById(id)?.addEventListener('click', () => {
      document.querySelectorAll('#flow-diagram .flow-stage, #flow-diagram [data-stage]').forEach((el, i) => {
        el.style.outline = i === idx ? '1px solid var(--ag-accent)' : '';
      });
    });
  });
  document.getElementById('btn-flow-reset')?.addEventListener('click', () => {
    document.querySelectorAll('#flow-diagram .flow-stage, #flow-diagram [data-stage]').forEach(el => el.style.outline = '');
  });
}

/* ═══════════════════════════════════════════════════════════════════════════════
   18.  BOOTSTRAP
   ═══════════════════════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  // ── Overlay & scanline ──
  injectScanlineSweep();
  injectNetLoader();
  buildAuthOverlay();

  // ── Make dashboard invisible until auth passes ──
  const shell = document.querySelector('.page-shell');
  if (shell) shell.classList.remove('ag-revealed');

  // ── Show login stage ──
  showAuthStage('login');

  // ── Bind inputs ──
  bindLoginButton();
  bindPhoneLoginToggle();
  bindSignupButton();
  initPasswordStrength();

  // ── Load reCAPTCHA ──
  loadRecaptcha();

  // ── Network monitor ──
  initNetworkMonitor();

  // ── Remove pie chart, build trend graph ──
  removePieChart();
  buildBlueprintGraph();

  // ── Inject action buttons + button panels + graph data ──
  // (Deferred slightly so app.js has finished its initial render)
  setTimeout(() => {
    injectActionButtons();
    injectMainPageButtons();
    loadGraphData();
  }, 600);
});
