/**
 * Payment Suspension & Billing Settlement Enforcement Middleware
 * 
 * Intercepts all incoming requests across all URLs and displays a 
 * "Service Suspended - Payment Required" notice when active.
 * 
 * To deactivate after payment is received:
 *   - Set PAYMENT_SUSPENDED=false in your .env file, OR
 *   - Change ACTIVE_SUSPENSION to false below and re-deploy.
 */

const ACTIVE_SUSPENSION = process.env.PAYMENT_SUSPENDED !== 'false'; // Enabled by default

function getSuspendedHtml(req) {
  const currentHost = req.headers.host || 'speaxa.in';
  const timestamp = new Date().toUTCString();
  const incidentId = 'SPX-BILL-' + Date.now().toString(36).toUpperCase();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Service Suspended • Payment Required | SPEAXA</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;600&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      min-height: 100vh;
      background-color: #080C14;
      background-image: 
        radial-gradient(circle at 50% 0%, rgba(239, 68, 68, 0.18) 0%, transparent 60%),
        radial-gradient(circle at 100% 100%, rgba(245, 158, 11, 0.08) 0%, transparent 40%),
        linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px);
      background-size: 100% 100%, 100% 100%, 40px 40px, 40px 40px;
      color: #F1F5F9;
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 24px 16px;
      line-height: 1.5;
    }

    .suspension-card {
      width: 100%;
      max-width: 680px;
      background: rgba(15, 23, 42, 0.85);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid rgba(239, 68, 68, 0.35);
      box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.7), 0 0 40px -10px rgba(239, 68, 68, 0.25);
      border-radius: 20px;
      overflow: hidden;
      animation: fadeIn 0.4s ease-out;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(16px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .top-ribbon {
      background: linear-gradient(90deg, #DC2626, #EF4444, #F59E0B);
      height: 4px;
      width: 100%;
    }

    .card-body {
      padding: 36px 32px 32px;
      text-align: center;
    }

    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 14px;
      background: rgba(239, 68, 68, 0.12);
      border: 1px solid rgba(239, 68, 68, 0.3);
      border-radius: 9999px;
      color: #F87171;
      font-size: 0.76rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      margin-bottom: 20px;
    }

    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #EF4444;
      box-shadow: 0 0 10px #EF4444;
      animation: pulse 1.8s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(0.85); }
    }

    .icon-container {
      width: 80px;
      height: 80px;
      margin: 0 auto 20px;
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.25);
      border-radius: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #EF4444;
    }

    .title {
      font-size: 1.75rem;
      font-weight: 800;
      color: #FFFFFF;
      letter-spacing: -0.02em;
      margin-bottom: 10px;
    }

    .subtitle {
      font-size: 0.96rem;
      color: #94A3B8;
      max-width: 520px;
      margin: 0 auto 28px;
      line-height: 1.6;
    }

    .details-box {
      background: rgba(2, 6, 23, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 12px;
      padding: 18px;
      margin-bottom: 24px;
      text-align: left;
      font-size: 0.85rem;
    }

    .detail-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
    }

    .detail-row:last-child {
      border-bottom: none;
      padding-bottom: 0;
    }

    .detail-row:first-child {
      padding-top: 0;
    }

    .detail-label {
      color: #64748B;
      font-weight: 500;
    }

    .detail-val {
      color: #E2E8F0;
      font-weight: 600;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.82rem;
    }

    .detail-val.danger {
      color: #EF4444;
    }

    .detail-val.warning {
      color: #F59E0B;
    }

    .affected-systems {
      margin-top: 10px;
      padding-top: 10px;
      border-top: 1px dashed rgba(255, 255, 255, 0.08);
    }

    .affected-title {
      font-size: 0.72rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #94A3B8;
      margin-bottom: 8px;
    }

    .tags {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .tag {
      background: rgba(239, 68, 68, 0.1);
      color: #FCA5A5;
      border: 1px solid rgba(239, 68, 68, 0.2);
      font-size: 0.72rem;
      padding: 2px 8px;
      border-radius: 6px;
      font-weight: 500;
    }

    .info-callout {
      background: rgba(59, 130, 246, 0.08);
      border-left: 3px solid #3B82F6;
      border-radius: 0 8px 8px 0;
      padding: 12px 16px;
      text-align: left;
      font-size: 0.82rem;
      color: #93C5FD;
      margin-bottom: 24px;
      line-height: 1.5;
    }

    .action-notice {
      background: rgba(245, 158, 11, 0.08);
      border: 1px solid rgba(245, 158, 11, 0.25);
      border-radius: 12px;
      padding: 16px;
      text-align: center;
      margin-bottom: 12px;
    }

    .action-title {
      font-weight: 700;
      color: #FBBF24;
      font-size: 0.9rem;
      margin-bottom: 4px;
    }

    .action-desc {
      color: #CBD5E1;
      font-size: 0.82rem;
    }

    .card-footer {
      padding: 16px 32px;
      background: rgba(2, 6, 23, 0.75);
      border-top: 1px solid rgba(255, 255, 255, 0.05);
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.75rem;
      color: #64748B;
    }

    @media (max-width: 580px) {
      .card-body { padding: 24px 18px; }
      .title { font-size: 1.4rem; }
      .card-footer { flex-direction: column; gap: 8px; text-align: center; }
      .detail-row { flex-direction: column; align-items: flex-start; gap: 4px; }
    }
  </style>
</head>
<body>

  <div class="suspension-card">
    <div class="top-ribbon"></div>
    <div class="card-body">
      
      <div class="status-badge">
        <span class="status-dot"></span>
        HTTP 402 • Service Suspended
      </div>

      <div class="icon-container">
        <!-- Shield Lock Warning SVG -->
        <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          <rect x="9" y="11" width="6" height="4" rx="1"/>
          <path d="M10 11V9a2 2 0 1 1 4 0v2"/>
        </svg>
      </div>

      <h1 class="title">Platform Access Suspended</h1>
      <p class="subtitle">
        Access to the <strong>SPEAXA</strong> ecosystem, including all web portals, interactive classrooms, and backend APIs, has been temporarily halted due to <strong>outstanding invoice payments</strong>.
      </p>

      <div class="details-box">
        <div class="detail-row">
          <span class="detail-label">Suspension Reason</span>
          <span class="detail-val danger">Non-Payment of Contractual Dues</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Status Code</span>
          <span class="detail-val danger">402 Payment Required</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Incident Reference</span>
          <span class="detail-val">${incidentId}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Timestamp</span>
          <span class="detail-val">${timestamp}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Target Host</span>
          <span class="detail-val">${currentHost}</span>
        </div>

        <div class="affected-systems">
          <div class="affected-title">Suspended Modules & Portals:</div>
          <div class="tags">
            <span class="tag">Landing Website</span>
            <span class="tag">Admin Console</span>
            <span class="tag">Teacher Portal</span>
            <span class="tag">Student Portal</span>
            <span class="tag">Parent Portal</span>
            <span class="tag">Live Classroom Agora Engine</span>
            <span class="tag">Mobile REST APIs</span>
          </div>
        </div>
      </div>

      <div class="info-callout">
        <strong>🔒 Data Integrity Preserved:</strong> All student accounts, teachers, class recordings, batches, and database records remain safely preserved and encrypted. No data has been deleted.
      </div>

      <div class="action-notice">
        <div class="action-title">Action Required for Immediate Reactivation</div>
        <div class="action-desc">
          To lift the suspension and restore full platform functionality, please settle all pending invoices with the development & engineering team. Platform services will be automatically reactivated upon payment verification.
        </div>
      </div>

    </div>

    <div class="card-footer">
      <span>SPEAXA Cloud Infrastructure Service</span>
      <span>Ref: ${incidentId}</span>
    </div>
  </div>

</body>
</html>`;
}

function paymentSuspensionMiddleware(req, res, next) {
  // If suspension is disabled, continue normally
  if (!ACTIVE_SUSPENSION) {
    return next();
  }

  // Check if request is expecting JSON (API endpoint, XHR, or Accept: application/json)
  const isApi = req.originalUrl.startsWith('/api') || 
                req.xhr || 
                (req.headers.accept && req.headers.accept.includes('application/json')) ||
                (req.headers['content-type'] && req.headers['content-type'].includes('application/json'));

  if (isApi) {
    res.setHeader('Retry-After', '3600');
    return res.status(402).json({
      error: 'Platform Access Suspended: Service temporarily disabled due to outstanding billing dues.',
      code: 'ERR_PAYMENT_REQUIRED',
      status: 402,
      message: 'All API endpoints, portals, and classroom streams are currently locked until pending payments are settled.',
      target_host: req.headers.host || 'speaxa.in',
      timestamp: new Date().toISOString()
    });
  }

  // Otherwise, return full-page Suspended UI for all browser URLs
  res.status(402).send(getSuspendedHtml(req));
}

module.exports = {
  paymentSuspensionMiddleware,
  ACTIVE_SUSPENSION
};
