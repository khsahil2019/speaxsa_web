/**
 * Global Site Killswitch & Service Suspension Middleware
 * 
 * Supports:
 *   1. "chrome_offline" (DEFAULT): Pixel-perfect replica of Google Chrome's native 
 *      "This site can’t be reached - DNS_PROBE_FINISHED_NXDOMAIN" error screen
 *   2. "technical_problem": Official "Website Temporarily Unavailable (503)" notice
 *   3. "payment_required": "Platform Access Suspended - Payment Settlement Required (402)"
 * 
 * Fully controllable in real-time from API Center (Module Lock System)
 * Exemption: /api-center and /api-center.html are ALWAYS unlocked so the developer
 * can toggle the site back on/off at any time with password "08111999".
 */

const db = require('../db');

// In-memory cache for ultra-fast 0ms response
let cachedKillswitch = {
  enabled: true, // Default: Active (Site blocked)
  mode: 'chrome_offline', // 'chrome_offline', 'technical_problem', 'payment_required'
  error_code: 'DNS_PROBE_FINISHED_NXDOMAIN',
  headline: 'This site can’t be reached',
  message: 'Check if there is a typo in',
  last_fetched: 0
};

const CACHE_TTL_MS = 2500; // 2.5 seconds cache

async function getSiteKillswitchState() {
  const now = Date.now();
  if (now - cachedKillswitch.last_fetched < CACHE_TTL_MS) {
    return cachedKillswitch;
  }

  try {
    const res = await db.query("SELECT value FROM platform_settings WHERE key = 'site_killswitch'");
    if (res.rows.length && res.rows[0].value) {
      try {
        const parsed = JSON.parse(res.rows[0].value);
        cachedKillswitch = {
          enabled: parsed.enabled !== false,
          mode: parsed.mode || 'chrome_offline',
          error_code: parsed.error_code || 'DNS_PROBE_FINISHED_NXDOMAIN',
          headline: parsed.headline || 'This site can’t be reached',
          message: parsed.message || 'Check if there is a typo in',
          last_fetched: now
        };
      } catch (pe) {
        cachedKillswitch.last_fetched = now;
      }
    } else {
      const defaultState = JSON.stringify({
        enabled: true,
        mode: 'chrome_offline',
        error_code: 'DNS_PROBE_FINISHED_NXDOMAIN',
        headline: 'This site can’t be reached',
        message: 'Check if there is a typo in'
      });
      await db.query(`
        INSERT INTO platform_settings (key, value, updated_at)
        VALUES ('site_killswitch', $1, NOW())
        ON CONFLICT (key) DO NOTHING
      `, [defaultState]);
      cachedKillswitch.last_fetched = now;
    }
  } catch (err) {
    console.warn('[Killswitch DB Warning]:', err.message);
    cachedKillswitch.last_fetched = now;
  }

  return cachedKillswitch;
}

async function setSiteKillswitchState(state) {
  const validModes = ['chrome_offline', 'technical_problem', 'payment_required'];
  const chosenMode = validModes.includes(state.mode) ? state.mode : 'chrome_offline';

  const newState = {
    enabled: state.enabled !== false,
    mode: chosenMode,
    error_code: (state.error_code || 'DNS_PROBE_FINISHED_NXDOMAIN').trim().toUpperCase(),
    headline: (state.headline || '').trim() || (chosenMode === 'chrome_offline' ? 'This site can’t be reached' : (chosenMode === 'payment_required' ? 'Platform Access Suspended' : 'Website Temporarily Unavailable')),
    message: (state.message || '').trim() || (chosenMode === 'chrome_offline' ? 'Check if there is a typo in' : 'We are currently experiencing system-level technical difficulties.'),
    updated_at: new Date().toISOString()
  };

  await db.query(`
    INSERT INTO platform_settings (key, value, updated_at)
    VALUES ('site_killswitch', $1, NOW())
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
  `, [JSON.stringify(newState)]);

  cachedKillswitch = {
    ...newState,
    last_fetched: Date.now()
  };

  return cachedKillswitch;
}

/**
 * Pixel-perfect Google Chrome Native Error Page ("This site can't be reached")
 */
function renderChromeOfflineHtml(req, state) {
  const rawHost = req.headers.host || 'speaxa.in';
  // Strip standard port if 80/443, keep clean domain
  const cleanHost = rawHost.replace(/:\d+$/, '');
  const errorCode = state.error_code || 'DNS_PROBE_FINISHED_NXDOMAIN';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${cleanHost}</title>
  <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='%239aa0a6'%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2ZM18 20H6V4H13V9H18V20ZM8 12C8 12.55 8.45 13 9 13C9.55 13 10 12.55 10 12C10 11.45 9.55 11 9 11C8.45 11 8 11.45 8 12ZM14 13C14.55 13 15 12.55 15 12C15 11.45 14.55 11 14 11C13.45 11 13 11.45 13 12C13 12.55 13.45 13 14 13ZM8.5 17C8.5 16.17 9.17 15.5 10 15.5H14C14.83 15.5 15.5 16.17 15.5 17H14C14 16.72 13.78 16.5 13.5 16.5H10.5C10.22 16.5 10 16.72 10 17H8.5Z'/%3E%3C/svg%3E">
  <style>
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    :root {
      --bg-color: #202124;
      --heading-color: #e8eaed;
      --text-color: #bdc1c6;
      --code-color: #9aa0a6;
      --btn-bg: #8ab4f8;
      --btn-color: #041e49;
      --btn-hover: #93bbf9;
      --icon-color: #9aa0a6;
    }
    @media (prefers-color-scheme: light) {
      :root {
        --bg-color: #ffffff;
        --heading-color: #202124;
        --text-color: #5f6368;
        --code-color: #5f6368;
        --btn-bg: #1a73e8;
        --btn-color: #ffffff;
        --btn-hover: #1b66c9;
        --icon-color: #5f6368;
      }
    }
    body {
      background-color: var(--bg-color);
      color: var(--text-color);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 14px;
      line-height: 20px;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-start;
      padding: 130px 24px 40px;
      user-select: none;
      -webkit-user-select: none;
    }
    .interstitial-wrapper {
      width: 100%;
      max-width: 580px;
      box-sizing: border-box;
    }
    .icon {
      width: 52px;
      height: 52px;
      margin-bottom: 24px;
      display: block;
    }
    .icon svg {
      width: 100%;
      height: 100%;
      fill: var(--icon-color);
    }
    h1 {
      font-size: 24px;
      font-weight: 500;
      color: var(--heading-color);
      line-height: 1.33;
      margin-bottom: 16px;
      letter-spacing: -0.2px;
    }
    p {
      color: var(--text-color);
      margin-bottom: 16px;
      word-break: break-word;
    }
    .error-code {
      font-size: 11px;
      color: var(--code-color);
      font-weight: 500;
      letter-spacing: 0.3px;
      text-transform: uppercase;
      margin-bottom: 36px;
    }
    .nav-wrapper {
      display: flex;
      justify-content: flex-end;
      width: 100%;
    }
    .reload-button {
      background-color: var(--btn-bg);
      color: var(--btn-color);
      border: none;
      border-radius: 100px;
      font-size: 14px;
      font-weight: 500;
      font-family: inherit;
      height: 36px;
      padding: 0 24px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: background-color 0.15s ease, box-shadow 0.15s ease;
      outline: none;
    }
    .reload-button:hover {
      background-color: var(--btn-hover);
      box-shadow: 0 1px 3px rgba(0,0,0,0.2);
    }
    .reload-button:active {
      transform: scale(0.98);
    }
  </style>
</head>
<body>
  <div class="interstitial-wrapper">
    <div class="icon">
      <!-- Chrome sad folded document SVG -->
      <svg viewBox="0 0 24 24">
        <path fill-rule="evenodd" clip-rule="evenodd" d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2ZM18 20H6V4H13V9H18V20ZM8 12C8 12.55 8.45 13 9 13C9.55 13 10 12.55 10 12C10 11.45 9.55 11 9 11C8.45 11 8 11.45 8 12ZM14 13C14.55 13 15 12.55 15 12C15 11.45 14.55 11 14 11C13.45 11 13 11.45 13 12C13 12.55 13.45 13 14 13ZM8.5 17C8.5 16.17 9.17 15.5 10 15.5H14C14.83 15.5 15.5 16.17 15.5 17H14C14 16.72 13.78 16.5 13.5 16.5H10.5C10.22 16.5 10 16.72 10 17H8.5Z"/>
      </svg>
    </div>
    <h1>This site can’t be reached</h1>
    <p>Check if there is a typo in ${cleanHost}.</p>
    <div class="error-code">${errorCode}</div>
    <div class="nav-wrapper">
      <button class="reload-button" onclick="window.location.reload()">Reload</button>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Technical Maintenance or Payment Due Notice Page
 */
function renderUnavailableHtml(req, state) {
  const currentHost = req.headers.host || 'speaxa.in';
  const timestamp = new Date().toUTCString();
  const incidentId = 'SPX-ERR-' + Math.floor(100000 + Math.random() * 900000);
  const isPayment = state.mode === 'payment_required';

  const badgeText = isPayment 
    ? 'HTTP 402 • SERVICE SUSPENDED' 
    : 'HTTP 503 • SYSTEM TEMPORARILY OFFLINE';

  const badgeColor = isPayment ? '#EF4444' : '#F59E0B';
  const badgeBg = isPayment ? 'rgba(239, 68, 68, 0.12)' : 'rgba(245, 158, 11, 0.12)';
  const badgeBorder = isPayment ? 'rgba(239, 68, 68, 0.35)' : 'rgba(245, 158, 11, 0.35)';

  const primaryTitle = state.headline || (isPayment ? 'Platform Access Suspended' : 'Website Temporarily Unavailable');
  const primaryDesc = state.message || (isPayment 
    ? 'Access to the SPEAXA ecosystem has been temporarily suspended due to outstanding payment settlement.'
    : 'We are currently experiencing system-level technical difficulties. Access to the SPEAXA platform, all portals, and live classrooms has been temporarily halted.');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${primaryTitle} | SPEAXA</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;600&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      min-height: 100vh;
      background-color: #0A0F1D;
      background-image: 
        radial-gradient(circle at 50% 0%, ${isPayment ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.18)'} 0%, transparent 65%),
        radial-gradient(circle at 100% 100%, rgba(59, 130, 246, 0.08) 0%, transparent 50%),
        linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px);
      background-size: 100% 100%, 100% 100%, 36px 36px, 36px 36px;
      color: #F1F5F9;
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 24px 16px;
      line-height: 1.55;
    }
    .main-card {
      width: 100%;
      max-width: 680px;
      background: rgba(15, 23, 42, 0.88);
      backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px);
      border: 1px solid ${isPayment ? 'rgba(239, 68, 68, 0.35)' : 'rgba(245, 158, 11, 0.35)'};
      box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.8), 0 0 45px -10px ${isPayment ? 'rgba(239, 68, 68, 0.25)' : 'rgba(245, 158, 11, 0.25)'};
      border-radius: 24px;
      overflow: hidden;
      animation: popIn 0.35s cubic-bezier(0.16, 1, 0.3, 1);
    }
    @keyframes popIn {
      from { opacity: 0; transform: scale(0.96) translateY(12px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }
    .top-glow-bar {
      background: linear-gradient(90deg, ${isPayment ? '#DC2626, #EF4444, #F59E0B' : '#F59E0B, #EF4444, #F59E0B'});
      height: 5px;
      width: 100%;
    }
    .card-content { padding: 38px 32px 32px; text-align: center; }
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 16px;
      background: ${badgeBg};
      border: 1px solid ${badgeBorder};
      border-radius: 9999px;
      color: ${badgeColor};
      font-size: 0.76rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      margin-bottom: 22px;
    }
    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: ${badgeColor};
      box-shadow: 0 0 10px ${badgeColor};
      animation: pulseDot 2s infinite ease-in-out;
    }
    @keyframes pulseDot {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.35; transform: scale(0.85); }
    }
    .icon-box {
      width: 84px;
      height: 84px;
      margin: 0 auto 22px;
      background: ${badgeBg};
      border: 1px solid ${badgeBorder};
      border-radius: 22px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: ${badgeColor};
    }
    .title {
      font-size: 1.85rem;
      font-weight: 800;
      color: #FFFFFF;
      letter-spacing: -0.025em;
      margin-bottom: 12px;
    }
    .description {
      font-size: 0.98rem;
      color: #94A3B8;
      max-width: 530px;
      margin: 0 auto 28px;
      line-height: 1.65;
    }
    .telemetry-card {
      background: rgba(2, 6, 23, 0.65);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 14px;
      padding: 18px 20px;
      margin-bottom: 24px;
      text-align: left;
      font-size: 0.85rem;
    }
    .telemetry-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 9px 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
    }
    .telemetry-row:first-child { padding-top: 0; }
    .telemetry-row:last-child { border-bottom: none; padding-bottom: 0; }
    .t-label { color: #64748B; font-weight: 500; }
    .t-val {
      font-family: 'JetBrains Mono', monospace;
      font-weight: 600;
      font-size: 0.82rem;
      color: #E2E8F0;
    }
    .t-val.alert { color: ${badgeColor}; }
    .notice-box {
      background: rgba(59, 130, 246, 0.08);
      border-left: 3px solid #3B82F6;
      border-radius: 0 10px 10px 0;
      padding: 13px 16px;
      text-align: left;
      font-size: 0.83rem;
      color: #93C5FD;
      margin-bottom: 24px;
      line-height: 1.5;
    }
    .footer-bar {
      padding: 18px 32px;
      background: rgba(2, 6, 23, 0.78);
      border-top: 1px solid rgba(255, 255, 255, 0.05);
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.75rem;
      color: #64748B;
    }
  </style>
</head>
<body>
  <div class="main-card">
    <div class="top-glow-bar"></div>
    <div class="card-content">
      <div class="status-badge"><span class="status-dot"></span>${badgeText}</div>
      <div class="icon-box">
        <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
      </div>
      <h1 class="title">${primaryTitle}</h1>
      <p class="description">${primaryDesc}</p>
      <div class="telemetry-card">
        <div class="telemetry-row">
          <span class="t-label">System State</span>
          <span class="t-val alert">${isPayment ? 'Payment Required' : 'Technical Review'}</span>
        </div>
        <div class="telemetry-row">
          <span class="t-label">Status Code</span>
          <span class="t-val alert">${isPayment ? '402 Payment Required' : '503 Service Unavailable'}</span>
        </div>
        <div class="telemetry-row">
          <span class="t-label">Host Domain</span>
          <span class="t-val">${currentHost}</span>
        </div>
        <div class="telemetry-row">
          <span class="t-label">Timestamp</span>
          <span class="t-val">${timestamp}</span>
        </div>
      </div>
    </div>
    <div class="footer-bar">
      <span>SPEAXA Cloud Engineering Telemetry</span>
      <span>Ref: ${incidentId}</span>
    </div>
  </div>
</body>
</html>`;
}

async function paymentSuspensionMiddleware(req, res, next) {
  const url = req.originalUrl.toLowerCase();

  // ── EXEMPTED DEVELOPER ROUTES (Never blocked so developer can always manage toggle) ──
  const isDeveloperRoute = 
    url === '/api-center' || 
    url.startsWith('/api-center.html') ||
    url.startsWith('/api/db-admin/') ||
    url.startsWith('/api/public/module-locks') ||
    url === '/anti-inspect.js' ||
    req.query.dev_bypass === '08111999' ||
    req.headers['x-dev-bypass'] === '08111999';

  if (isDeveloperRoute) {
    return next();
  }

  // Check current killswitch state
  const state = await getSiteKillswitchState();

  if (!state.enabled) {
    return next();
  }

  // Handle Chrome Offline Mode (Default)
  if (state.mode === 'chrome_offline') {
    // If it's an API request, return standard connection refused JSON
    const isApi = url.startsWith('/api') || 
                  req.xhr || 
                  (req.headers.accept && req.headers.accept.includes('application/json'));

    if (isApi) {
      res.setHeader('Retry-After', '300');
      return res.status(503).json({
        error: 'This site can’t be reached',
        code: state.error_code || 'DNS_PROBE_FINISHED_NXDOMAIN',
        status: 503,
        message: `Server connection refused for ${req.headers.host || 'speaxa.in'}`
      });
    }

    // Return the pixel-perfect Google Chrome Error page
    return res.status(503).send(renderChromeOfflineHtml(req, state));
  }

  // Other modes: technical_problem (503) or payment_required (402)
  const statusCode = state.mode === 'payment_required' ? 402 : 503;

  const isApi = url.startsWith('/api') || 
                req.xhr || 
                (req.headers.accept && req.headers.accept.includes('application/json')) ||
                (req.headers['content-type'] && req.headers['content-type'].includes('application/json'));

  if (isApi) {
    res.setHeader('Retry-After', '300');
    return res.status(statusCode).json({
      error: state.headline,
      code: state.mode === 'payment_required' ? 'ERR_PAYMENT_REQUIRED' : (state.error_code || 'DNS_PROBE_FINISHED_NXDOMAIN'),
      status: statusCode,
      message: state.message,
      target_host: req.headers.host || 'speaxa.in',
      timestamp: new Date().toISOString()
    });
  }

  res.status(statusCode).send(renderUnavailableHtml(req, state));
}

module.exports = {
  paymentSuspensionMiddleware,
  getSiteKillswitchState,
  setSiteKillswitchState
};
