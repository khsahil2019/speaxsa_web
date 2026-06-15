/* SPEAXSA Admin Portal — Complete SPA JavaScript */

const API = '/api';
let token = localStorage.getItem('admin_token');
let adminUser = JSON.parse(localStorage.getItem('admin_user') || 'null');
let currentPage = 'dashboard';

// ── Bootstrap components ──────────────────────────────────────
const Toast = new bootstrap.Toast(document.getElementById('toastEl'), { delay: 3000 });
let confirmModal, formModal;

document.addEventListener('DOMContentLoaded', () => {
  confirmModal = new bootstrap.Modal(document.getElementById('confirmModal'));
  formModal = new bootstrap.Modal(document.getElementById('formModal'));

  // Toggle password visibility
  document.getElementById('togglePass')?.addEventListener('click', () => {
    const inp = document.getElementById('loginPassword');
    inp.type = inp.type === 'password' ? 'text' : 'password';
  });

  // Login form
  document.getElementById('loginForm')?.addEventListener('submit', handleLogin);

  // Sidebar navigation
  document.querySelectorAll('.nav-item[data-page]').forEach(item => {
    item.addEventListener('click', () => navigateTo(item.dataset.page));
  });

  // Sidebar toggle
  document.getElementById('sidebarToggle')?.addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('collapsed');
  });

  // Logout
  document.getElementById('logoutBtn')?.addEventListener('click', handleLogout);

  // Check existing auth
  if (token && adminUser) {
    showApp();
    navigateTo('dashboard');
  } else {
    showLogin();
  }
});

// ── Auth ──────────────────────────────────────────────────────
async function handleLogin(e) {
  e.preventDefault();
  const btn = document.getElementById('loginBtn');
  const errEl = document.getElementById('loginError');
  btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Logging in...';
  btn.disabled = true;
  errEl.classList.add('d-none');

  try {
    const res = await fetch(`${API}/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: document.getElementById('loginEmail').value,
        password: document.getElementById('loginPassword').value,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');

    token = data.token;
    adminUser = data.user;
    localStorage.setItem('admin_token', token);
    localStorage.setItem('admin_user', JSON.stringify(adminUser));

    showApp();
    navigateTo('dashboard');
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.remove('d-none');
  } finally {
    btn.innerHTML = '<i class="fas fa-sign-in-alt me-2"></i>Login as Admin';
    btn.disabled = false;
  }
}

function handleLogout() {
  localStorage.removeItem('admin_token');
  localStorage.removeItem('admin_user');
  token = null; adminUser = null;
  showLogin();
}

function showLogin() {
  document.getElementById('loginScreen').classList.remove('d-none');
  document.getElementById('adminApp').classList.add('d-none');
}

function showApp() {
  document.getElementById('loginScreen').classList.add('d-none');
  document.getElementById('adminApp').classList.remove('d-none');
  if (adminUser) {
    const avatar = adminUser.photo_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${adminUser.name}`;
    document.getElementById('adminAvatarSidebar').src = avatar;
    document.getElementById('adminAvatarHeader').src = avatar;
    document.getElementById('adminNameSidebar').textContent = adminUser.name;
  }
  loadSOPBadge();
}

// ── API helpers ───────────────────────────────────────────────
async function apiGet(path) {
  const res = await fetch(`${API}${path}`, { headers: { 'Authorization': `Bearer ${token}` } });
  if (res.status === 401) { handleLogout(); throw new Error('Session expired'); }
  return res.json();
}

async function apiPost(path, body = {}, method = 'POST') {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (res.status === 401) { handleLogout(); throw new Error('Session expired'); }
  return res.json();
}

async function apiDelete(path) { return apiPost(path, {}, 'DELETE'); }
async function apiPut(path, body) { return apiPost(path, body, 'PUT'); }

// ── Toast ─────────────────────────────────────────────────────
function showToast(msg, type = 'success') {
  const icons = { success: 'fa-check-circle', error: 'fa-exclamation-circle', warning: 'fa-exclamation-triangle', info: 'fa-info-circle' };
  const colors = { success: '#10B981', error: '#EF4444', warning: '#F59E0B', info: '#3CBDB0' };
  document.getElementById('toastMsg').textContent = msg;
  document.getElementById('toastIcon').className = `fas ${icons[type]}`;
  document.getElementById('toastIcon').style.color = colors[type];
  document.getElementById('toastEl').className = `toast ${type}`;
  Toast.show();
}

// ── Confirm Dialog ────────────────────────────────────────────
function confirm(title, body, action) {
  document.getElementById('confirmTitle').textContent = title;
  document.getElementById('confirmBody').innerHTML = body;
  const btn = document.getElementById('confirmOkBtn');
  btn.onclick = () => { confirmModal.hide(); action(); };
  confirmModal.show();
}

// ── Custom Non-Blocking Input Prompt ──────────────────────────
function adminPrompt(title, label, defaultValue, callback) {
  document.getElementById('formModalTitle').textContent = title;
  document.getElementById('formModalBody').innerHTML = `
    <div class="mb-3">
      <label class="spx-label">${label}</label>
      <input type="text" class="form-control spx-input" id="adminPromptValue" value="${defaultValue || ''}" required>
    </div>
    <div class="d-flex justify-content-end gap-2">
      <button class="btn btn-secondary btn-sm" onclick="formModal.hide()">Cancel</button>
      <button class="btn btn-spx btn-primary btn-sm" id="adminPromptSubmitBtn">Submit</button>
    </div>
  `;
  document.getElementById('adminPromptSubmitBtn').onclick = () => {
    const val = document.getElementById('adminPromptValue').value.trim();
    if (!val) {
      showToast('Please enter a value.', 'error');
      return;
    }
    formModal.hide();
    callback(val);
  };
  formModal.show();
}

// ── Navigation ────────────────────────────────────────────────
function navigateTo(page) {
  currentPage = page;
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById(`nav-${page}`)?.classList.add('active');

  const titles = {
    dashboard:'Dashboard', teachers:'Teacher Management', students:'Student Management',
    parents:'Parent Management', courses:'Course Management', batches:'Batch Management',
    liveclasses:'Live Classes', payments:'Payment History', payouts:'Payout Requests',
    commission:'Commission Config', refunds:'Refunds', sop:'SOP Review',
    coupons:'Coupon Management', notifications:'Send Notifications',
    settings:'Platform Settings', auditlogs:'Audit Logs', support:'Connect Queries',
  };
  document.getElementById('pageTitle').textContent = titles[page] || page;
  document.getElementById('pageBreadcrumb').textContent = `Admin / ${titles[page] || page}`;

  const renders = {
    dashboard: renderDashboard, teachers: renderTeachers, students: renderStudents,
    parents: renderParents, courses: renderCourses, batches: renderBatches,
    liveclasses: renderLiveClasses, payments: renderPayments, payouts: renderPayouts,
    commission: renderCommission, refunds: renderRefunds, sop: renderSOP,
    coupons: renderCoupons, notifications: renderNotifications,
    settings: renderSettings, auditlogs: renderAuditLogs, support: renderSupport,
  };

  const render = renders[page];
  if (render) render();
}

function togglePlatformGuide() {
  const content = document.getElementById('platformGuideContent');
  const icon = document.getElementById('guideToggleIcon');
  if (!content || !icon) return;
  if (content.classList.contains('d-none')) {
    content.classList.remove('d-none');
    icon.innerHTML = '<i class="fas fa-chevron-up"></i>';
  } else {
    content.classList.add('d-none');
    icon.innerHTML = '<i class="fas fa-chevron-down"></i>';
  }
}

function loading(msg = 'Loading...') {
  document.getElementById('pageContent').innerHTML = `
    <div class="d-flex flex-column align-items-center justify-content-center py-5 gap-3">
      <div class="spinner-border text-primary"></div>
      <small class="text-muted">${msg}</small>
    </div>`;
}

function table(cols, rows, actions = '') {
  if (!rows.length) return `<div class="text-center py-5 text-muted"><i class="fas fa-inbox fa-3x mb-3 d-block opacity-25"></i>No records found</div>`;
  return `
    <div style="overflow-x:auto">
    <table class="spx-table">
      <thead><tr>${cols.map(c => `<th>${c}</th>`).join('')}${actions ? '<th>Actions</th>' : ''}</tr></thead>
      <tbody>${rows}</tbody>
    </table></div>`;
}

function avatar(url, name, size = 36) {
  const src = url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`;
  return `<img src="${src}" alt="${name}" style="width:${size}px;height:${size}px;border-radius:50%;border:2px solid var(--primary)" onerror="this.src='https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}'">`;
}

function levelBadge(level) {
  const map = { 'Bronze':'badge-bronze','Silver':'badge-silver','Gold':'badge-gold','Elite Mentor':'badge-elite' };
  return `<span class="${map[level]||'badge-bronze'}">${level||'Bronze'}</span>`;
}

function statusBadge(status) {
  const map = { active:'badge-active', approved:'badge-approved', pending:'badge-pending',
    rejected:'badge-rejected', suspended:'badge-suspended', sop_pending:'badge-pending', completed:'badge-active' };
  return `<span class="${map[status]||'badge-pending'}">${status||'unknown'}</span>`;
}

function fmtDate(d) { return d ? new Date(d).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' }) : '—'; }
function fmtCurrency(n) { return '₹' + (parseFloat(n)||0).toLocaleString('en-IN', { minimumFractionDigits:0 }); }

async function loadSOPBadge() {
  try {
    const data = await apiGet('/admin/sop');
    const pending = (data || []).filter(s => s.status === 'sop_pending').length;
    const badge = document.getElementById('sopBadge');
    if (badge) { badge.textContent = pending; badge.style.display = pending > 0 ? '' : 'none'; }
  } catch {}
}

// ╔══════════════════════════════════════════════════════════════╗
// ║                    PAGE RENDERERS                           ║
// ╚══════════════════════════════════════════════════════════════╝

// ── Dashboard ─────────────────────────────────────────────────
async function renderDashboard() {
  loading('Loading dashboard data...');
  
  let data = { totalTeachers: 0, totalStudents: 0, totalParents: 0, totalCourses: 0, activeBatches: 0, runningClasses: 0, totalRevenue: 0, pendingPayouts: 0 };
  let settings = {};
  let liveClasses = [];
  let auditLogs = { logs: [] };

  try {
    const [dRes, sRes, lRes, aRes] = await Promise.allSettled([
      apiGet('/admin/dashboard'),
      apiGet('/admin/settings'),
      apiGet('/admin/live-classes'),
      apiGet('/admin/audit-logs?limit=5')
    ]);
    if (dRes.status === 'fulfilled') data = dRes.value;
    if (sRes.status === 'fulfilled') settings = sRes.value;
    if (lRes.status === 'fulfilled') liveClasses = lRes.value;
    if (aRes.status === 'fulfilled') auditLogs = aRes.value;
  } catch (err) {
    console.error('Error fetching dashboard endpoints:', err);
  }

  // Filter only active live classes
  const activeClasses = (liveClasses || []).filter(c => c.status === 'live');
  
  // Format audit log logs
  let timelineItemsHtml = '';
  if (auditLogs && auditLogs.logs && auditLogs.logs.length > 0) {
    timelineItemsHtml = auditLogs.logs.map(log => {
      const iconDetails = getAuditIconDetails(log.action);
      const formattedMsg = formatAuditMsg(log);
      const timeStr = fmtDateWithTime(log.created_at);
      return `
        <div class="timeline-item">
          <div class="timeline-badge ${iconDetails.color}">
            <i class="fas ${iconDetails.icon}"></i>
          </div>
          <div class="timeline-content">
            <div class="d-flex justify-content-between align-items-center mb-1">
              <span class="badge bg-secondary-subtle text-secondary text-uppercase" style="font-size: 0.65rem;">${(log.action || '').replace(/_/g, ' ')}</span>
              <small class="text-muted" style="font-size: 0.7rem;">${timeStr}</small>
            </div>
            <p class="mb-0 text-secondary" style="font-size: 0.82rem;">${formattedMsg}</p>
          </div>
        </div>
      `;
    }).join('');
  } else {
    timelineItemsHtml = `
      <div class="text-center py-4 text-muted" style="font-size: 0.85rem;">
        <i class="fas fa-history d-block mb-2 opacity-25" style="font-size: 1.5rem;"></i>
        No recent activities recorded.
      </div>
    `;
  }

  // Check system health status
  const smtpStatus = settings.smtp_host ? 'online' : 'offline';
  const agoraStatus = settings.agora_app_id ? 'online' : 'offline';
  const razorpayStatus = settings.razorpay_key_id ? 'online' : 'offline';
  // Firebase FCM is active by default as long as app runs
  const fcmStatus = 'online'; 

  // Active Classes Monitor list
  let liveClassesMonitorHtml = '';
  if (activeClasses.length > 0) {
    liveClassesMonitorHtml = `
      <div style="max-height: 250px; overflow-y: auto;">
        <table class="table table-sm table-hover align-middle mb-0" style="font-size: 0.8rem;">
          <tbody>
            ${activeClasses.map(c => `
              <tr>
                <td>
                  <div class="fw-bold text-primary">${c.title || 'Live Class'}</div>
                  <small class="text-muted">${c.batch_name || '—'}</small>
                </td>
                <td>
                  <small class="d-block fw-semibold">${c.teacher_name || 'Teacher'}</small>
                  <span class="badge bg-danger-subtle text-danger p-1" style="font-size: 0.6rem;">🔴 LIVE</span>
                </td>
                <td class="text-end">
                  <a href="/live/room.html?classId=${c.id}" target="_blank" class="btn btn-xs btn-spx py-1 px-2" style="font-size: 0.75rem; color: #ffffff !important;">
                    <i class="fas fa-desktop me-1"></i>Monitor
                  </a>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  } else {
    liveClassesMonitorHtml = `
      <div class="radar-pulse-container">
        <div class="radar-icon-box">
          <i class="fas fa-wifi"></i>
          <div class="radar-ring"></div>
        </div>
        <div class="text-center text-muted" style="font-size: 0.85rem;">
          <strong>All Quiet</strong>
          <div style="font-size: 0.75rem;">No active live classes right now.</div>
        </div>
      </div>
    `;
  }

  document.getElementById('pageContent').innerHTML = `
    <!-- Interactive Admin Platform Guide -->
    <div class="spx-card mb-4 border-start border-4 border-primary" style="background: rgba(60, 189, 176, 0.04); box-shadow: 0 4px 12px rgba(15,23,42,0.03);">
      <div class="d-flex align-items-center justify-content-between cursor-pointer" onclick="togglePlatformGuide()" style="cursor: pointer; user-select: none;">
        <div class="d-flex align-items-center gap-2">
          <span class="fs-5">💡</span>
          <h6 class="mb-0 fw-bold text-primary">Admin Quick Operations Guide & Onboarding Checklist</h6>
        </div>
        <span id="guideToggleIcon" class="text-primary"><i class="fas fa-chevron-down"></i></span>
      </div>
      <div id="platformGuideContent" class="mt-3 d-none" style="font-size: 0.85rem; line-height: 1.6; color: var(--text-secondary);">
        <div class="row g-3">
          <div class="col-md-6 col-lg-3">
            <div class="p-3 rounded-3 h-100" style="background: var(--bg-card); border: 1px solid var(--border);">
              <strong class="text-primary d-block mb-1">1. Verify Teachers</strong>
              Go to <strong>SOP Review</strong> from sidebar. Select a pending teacher, watch their uploaded video clips, and click <strong>Approve Teacher</strong>.
            </div>
          </div>
          <div class="col-md-6 col-lg-3">
            <div class="p-3 rounded-3 h-100" style="background: var(--bg-card); border: 1px solid var(--border);">
              <strong class="text-primary d-block mb-1">2. Manage Courses</strong>
              Go to <strong>Course Management</strong>. Click <strong>+ Add Course</strong> to list classes (set syllabus grade, board, and pricing).
            </div>
          </div>
          <div class="col-md-6 col-lg-3">
            <div class="p-3 rounded-3 h-100" style="background: var(--bg-card); border: 1px solid var(--border);">
              <strong class="text-primary d-block mb-1">3. Test Portal Flows</strong>
              Go to <strong>Teacher</strong> or <strong>Student</strong> management, and click the <strong>Impersonate (🎭)</strong> icon next to a user to view their dashboard.
            </div>
          </div>
          <div class="col-md-6 col-lg-3">
            <div class="p-3 rounded-3 h-100" style="background: var(--bg-card); border: 1px solid var(--border);">
              <strong class="text-primary d-block mb-1">4. Process Payments</strong>
              Review platform income, click <strong>Payout Requests</strong> to approve teacher withdrawals, or configure platform commission split rates.
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 8 Stats Grid -->
    <div class="row g-3 mb-4">
      ${[
        { icon:'fa-chalkboard-teacher', label:'Teachers Registered', value:data.totalTeachers || 0, color:'#3CBDB0', trend:'Active Mentors' },
        { icon:'fa-user-graduate', label:'Students Enrolled', value:data.totalStudents || 0, color:'#10B981', trend:'LMS Learners' },
        { icon:'fa-users', label:'Parents Linked', value:data.totalParents || 0, color:'#3B82F6', trend:'Telemetry Tracking' },
        { icon:'fa-book', label:'Active Courses', value:data.totalCourses || 0, color:'#F59E0B', trend:'Catalog Items' },
        { icon:'fa-layer-group', label:'Active Batches', value:data.activeBatches || 0, color:'#0F766E', trend:'Active Slots' },
        { icon:'fa-video', label:'Live Rooms Now', value:data.runningClasses || 0, color:'#EF4444', trend:data.runningClasses > 0 ? '🔴 LIVE ROOMS' : 'No classrooms active' },
        { icon:'fa-rupee-sign', label:'Total Revenue', value:fmtCurrency(data.totalRevenue || 0), color:'#10B981', trend:'Captured Income' },
        { icon:'fa-wallet', label:'Pending Payouts', value:fmtCurrency(data.pendingPayouts || 0), color:'#F59E0B', trend:'Teacher Withdrawals' },
      ].map(s => `
        <div class="col-6 col-lg-3">
          <div class="stat-card-premium">
            <div class="d-flex align-items-center justify-content-between mb-2">
              <span class="stat-card-label text-uppercase font-weight-bold" style="font-size:0.72rem; letter-spacing:0.5px;">${s.label}</span>
              <div class="stat-icon-wrapper" style="background:${s.color}15;color:${s.color}">
                <i class="fas ${s.icon}"></i>
              </div>
            </div>
            <div class="stat-card-value font-weight-bold" style="font-size: 1.7rem; color: var(--text-primary);">${s.value}</div>
            <div class="d-flex align-items-center gap-1 mt-2 text-muted" style="font-size:0.75rem;">
              <i class="fas fa-circle-info" style="font-size:0.68rem; color:${s.color}"></i>
              <span>${s.trend}</span>
            </div>
          </div>
        </div>
      `).join('')}
    </div>

    <!-- Main Dashboard Row -->
    <div class="row g-4">
      <!-- Left Column: Revenue Chart & Activity Feed -->
      <div class="col-lg-8">
        <div class="spx-card mb-4">
          <div class="d-flex align-items-center justify-content-between mb-4">
            <div>
              <h6 class="mb-1 fw-bold">Platform Revenue Performance</h6>
              <small class="text-muted">Aggregate platform captures (Last 12 months)</small>
            </div>
            <span class="badge bg-success-subtle text-success py-1 px-2 font-weight-semibold" style="font-size:0.75rem;">Razorpay Active</span>
          </div>
          <div class="chart-container">
            <canvas id="revenueChart"></canvas>
          </div>
        </div>

        <div class="spx-card">
          <div class="d-flex align-items-center justify-content-between mb-3">
            <div>
              <h6 class="mb-1 fw-bold">Recent System Activity Logs</h6>
              <small class="text-muted">Real-time system actions and operations logs</small>
            </div>
            <button class="btn btn-sm btn-outline-secondary" onclick="navigateTo('auditlogs')" style="font-size: 0.78rem;">
              <i class="fas fa-list me-1"></i>View Full Logs
            </button>
          </div>
          <div class="timeline-feed">
            ${timelineItemsHtml}
          </div>
        </div>
      </div>

      <!-- Right Column: Services Health, Live Monitor & Quick Actions -->
      <div class="col-lg-4">
        <!-- System Services Health Status -->
        <div class="spx-card mb-4">
          <h6 class="mb-1 fw-bold">System Service Connections</h6>
          <p class="text-muted mb-3" style="font-size: 0.78rem;">Platform third-party APIs and credentials status</p>
          
          <div class="service-status-card">
            <div class="service-name">
              <i class="fas fa-envelope text-primary" style="width:16px;"></i>
              <span>SMTP Mailer Service</span>
            </div>
            <span class="service-status-pill ${smtpStatus === 'online' ? 'online' : 'offline'}">
              <span class="pulse-dot ${smtpStatus === 'online' ? '' : 'offline'}"></span>
              ${smtpStatus === 'online' ? 'Configured' : 'Offline'}
            </span>
          </div>

          <div class="service-status-card">
            <div class="service-name">
              <i class="fas fa-video text-primary" style="width:16px;"></i>
              <span>Agora RTC/RTM Stream</span>
            </div>
            <span class="service-status-pill ${agoraStatus === 'online' ? 'online' : 'offline'}">
              <span class="pulse-dot ${agoraStatus === 'online' ? '' : 'offline'}"></span>
              ${agoraStatus === 'online' ? 'Configured' : 'Offline'}
            </span>
          </div>

          <div class="service-status-card">
            <div class="service-name">
              <i class="fas fa-credit-card text-primary" style="width:16px;"></i>
              <span>Razorpay Payments Gateway</span>
            </div>
            <span class="service-status-pill ${razorpayStatus === 'online' ? 'online' : 'offline'}">
              <span class="pulse-dot ${razorpayStatus === 'online' ? '' : 'offline'}"></span>
              ${razorpayStatus === 'online' ? 'Configured' : 'Offline'}
            </span>
          </div>

          <div class="service-status-card">
            <div class="service-name">
              <i class="fas fa-bell text-primary" style="width:16px;"></i>
              <span>Firebase Cloud Messaging</span>
            </div>
            <span class="service-status-pill ${fcmStatus === 'online' ? 'online' : 'offline'}">
              <span class="pulse-dot ${fcmStatus === 'online' ? '' : 'offline'}"></span>
              ${fcmStatus === 'online' ? 'Active' : 'Offline'}
            </span>
          </div>
        </div>

        <!-- Active Live Rooms Monitor -->
        <div class="spx-card mb-4">
          <div class="d-flex align-items-center justify-content-between mb-1">
            <h6 class="mb-0 fw-bold">Live Class Rooms Monitor</h6>
            ${activeClasses.length > 0 ? `<span class="badge bg-danger text-white pulse-badge font-weight-bold" style="font-size: 0.65rem;">${activeClasses.length} ACTIVE</span>` : ''}
          </div>
          <p class="text-muted mb-3" style="font-size: 0.78rem;">Real-time classrooms streaming status</p>
          ${liveClassesMonitorHtml}
        </div>

        <!-- Quick Actions Grid -->
        <div class="spx-card">
          <h6 class="mb-1 fw-bold">Administrative Actions</h6>
          <p class="text-muted mb-3" style="font-size: 0.78rem;">Quick navigation panel for portal operations</p>
          <div class="row g-2">
            <div class="col-4">
              <div class="quick-action-tile" onclick="navigateTo('sop')">
                <i class="fas fa-clipboard-check"></i>
                <span>Review SOP</span>
              </div>
            </div>
            <div class="col-4">
              <div class="quick-action-tile" onclick="navigateTo('payouts')">
                <i class="fas fa-wallet"></i>
                <span>Payouts</span>
              </div>
            </div>
            <div class="col-4">
              <div class="quick-action-tile" onclick="navigateTo('courses')">
                <i class="fas fa-plus-circle"></i>
                <span>Add Course</span>
              </div>
            </div>
            <div class="col-4">
              <div class="quick-action-tile" onclick="navigateTo('notifications')">
                <i class="fas fa-bell"></i>
                <span>Alerts</span>
              </div>
            </div>
            <div class="col-4">
              <div class="quick-action-tile" onclick="navigateTo('auditlogs')">
                <i class="fas fa-history"></i>
                <span>Audit Logs</span>
              </div>
            </div>
            <div class="col-4">
              <div class="quick-action-tile" onclick="navigateTo('settings')">
                <i class="fas fa-cog"></i>
                <span>Settings</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  loadRevenueChart();
}

async function loadRevenueChart() {
  try {
    const data = await apiGet('/admin/revenue');
    const ctx = document.getElementById('revenueChart');
    if (!ctx) return;
    
    // Sort chronological: reverse the last-12-months array if it is descending
    const months = data.monthly.reverse().map(m => m.month);
    const revenues = data.monthly.map(m => parseFloat(m.revenue));
    
    new Chart(ctx, {
      type: 'line',
      data: {
        labels: months,
        datasets: [{
          label: 'Revenue (₹)',
          data: revenues,
          borderColor: '#3CBDB0',
          backgroundColor: 'rgba(60, 189, 176, 0.08)',
          borderWidth: 3,
          fill: true,
          tension: 0.35,
          pointBackgroundColor: '#3CBDB0',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 7
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#0F172A',
            titleFont: { family: 'Outfit' },
            bodyFont: { family: 'Inter' },
            callbacks: {
              label: function(context) {
                return ' ' + context.dataset.label + ': ' + fmtCurrency(context.parsed.y);
              }
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#64748B', font: { family: 'Inter', size: 10 } }
          },
          y: {
            grid: { color: 'rgba(15, 23, 42, 0.04)' },
            ticks: {
              color: '#64748B',
              font: { family: 'Inter', size: 10 },
              callback: v => '₹' + (v >= 1000 ? (v/1000).toFixed(0) + 'K' : v)
            }
          }
        }
      }
    });
  } catch (err) {
    console.error('Error loading revenue chart:', err);
  }
}

function getAuditIconDetails(action) {
  const a = (action || '').toUpperCase();
  if (a.includes('APPROVE') || a.includes('SUCCESS') || a.includes('CAPTURE') || a.includes('RESOLVED')) {
    return { icon: 'fa-check-circle', color: 'success' };
  }
  if (a.includes('REJECT') || a.includes('SUSPEND') || a.includes('DELETE') || a.includes('CANCEL') || a.includes('DISABLE')) {
    return { icon: 'fa-times-circle', color: 'danger' };
  }
  if (a.includes('CREATE') || a.includes('ADD') || a.includes('SUBMIT')) {
    return { icon: 'fa-plus-circle', color: 'info' };
  }
  if (a.includes('UPDATE') || a.includes('SETTING') || a.includes('EDIT')) {
    return { icon: 'fa-cog', color: 'warning' };
  }
  if (a.includes('LOGIN') || a.includes('LOGOUT') || a.includes('AUTH') || a.includes('OTP')) {
    return { icon: 'fa-user-clock', color: 'primary' };
  }
  return { icon: 'fa-info-circle', color: 'primary' };
}

function formatAuditMsg(log) {
  const actor = log.actor_name || log.actor_role || 'System';
  const action = (log.action || '').replace(/_/g, ' ').toLowerCase();
  const target = log.target_name || log.target_type || '';
  return `<strong>${actor}</strong> completed action <strong>"${action}"</strong> ${target ? `for <em>${target}</em>` : ''}`;
}

function fmtDateWithTime(d) {
  if (!d) return '—';
  const dateObj = new Date(d);
  return dateObj.toLocaleDateString('en-IN', { day:'numeric', month:'short' }) + ' ' + 
         dateObj.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

// ── Teachers ──────────────────────────────────────────────────
async function renderTeachers() {
  loading();
  try {
    const teachers = await apiGet('/admin/teachers');
    document.getElementById('pageContent').innerHTML = `
      <div class="spx-card">
        <div class="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
          <h6 class="mb-0">All Teachers (${teachers.length})</h6>
          <div class="d-flex gap-2">
            <input type="text" class="form-control spx-input" id="teacherSearch" placeholder="Search teachers..." style="width:220px" oninput="filterTeachers()">
            <select class="form-select spx-input" id="teacherFilter" style="width:160px" onchange="filterTeachers()">
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="sop_pending">SOP Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
        </div>
        <div id="teachersTableWrapper">
          ${renderTeachersTable(teachers)}
        </div>
      </div>`;
    window._teachers = teachers;
  } catch (err) {
    document.getElementById('pageContent').innerHTML = `<div class="alert alert-danger">${err.message}</div>`;
  }
}

function filterTeachers() {
  const q = document.getElementById('teacherSearch')?.value.toLowerCase() || '';
  const f = document.getElementById('teacherFilter')?.value || '';
  const filtered = (window._teachers || []).filter(t => {
    const matchQ = !q || t.name?.toLowerCase().includes(q) || t.email?.toLowerCase().includes(q);
    const matchF = !f || t.approval_status === f;
    return matchQ && matchF;
  });
  document.getElementById('teachersTableWrapper').innerHTML = renderTeachersTable(filtered);
}

function renderTeachersTable(teachers) {
  return table(
    ['Teacher','Email','Level','Status','Joined','Actions'],
    teachers.map(t => `
      <tr>
        <td><div class="d-flex align-items-center gap-2">${avatar(t.photo_url, t.name)} <div><div class="fw-semibold text-white">${t.name}</div><small class="text-muted">${t.subject_expertise||''}</small></div></div></td>
        <td>${t.email}</td>
        <td>${levelBadge(t.teacher_level)}</td>
        <td>${statusBadge(t.approval_status)}</td>
        <td>${fmtDate(t.created_at)}</td>
        <td>
          <div class="d-flex gap-1 flex-wrap">
            ${t.approval_status === 'pending' || t.approval_status === 'sop_pending' ? `
              <button class="btn btn-sm btn-success" onclick="approveTeacher('${t.id}')">Approve</button>
              <button class="btn btn-sm btn-danger" onclick="rejectTeacher('${t.id}')">Reject</button>` : ''}
            ${t.approval_status === 'approved' ? `<button class="btn btn-sm btn-warning" onclick="suspendTeacher('${t.id}')">Suspend</button>` : ''}
            <button class="btn btn-sm btn-outline-secondary" onclick="viewTeacher('${t.id}')">View</button>
            <button class="btn btn-sm btn-outline-primary" onclick="impersonate('${t.id}', 'teacher')">Login As</button>
          </div>
        </td>
      </tr>`).join(''),
    true
  );
}

async function approveTeacher(id) {
  try {
    const data = await apiPost(`/admin/teachers/${id}/approve`);
    showToast(data.message || 'Teacher approved');
    renderTeachers();
  } catch (err) { showToast(err.message, 'error'); }
}

async function rejectTeacher(id) {
  adminPrompt('Reject Teacher Account', 'Reason for rejection?', '', async (reason) => {
    try {
      const data = await apiPost(`/admin/teachers/${id}/reject`, { reason });
      showToast(data.message || 'Teacher rejected');
      renderTeachers();
    } catch (err) { showToast(err.message, 'error'); }
  });
}

async function suspendTeacher(id) {
  adminPrompt('Suspend Teacher Account', 'Reason for suspension?', '', async (reason) => {
    try {
      const data = await apiPost(`/admin/teachers/${id}/suspend`, { reason });
      showToast(data.message || 'Teacher suspended');
      renderTeachers();
    } catch (err) { showToast(err.message, 'error'); }
  });
}

async function viewTeacher(id) {
  try {
    const data = await apiGet(`/admin/teachers/${id}`);
    document.getElementById('formModalTitle').textContent = `Teacher: ${data.teacher?.name}`;
    document.getElementById('formModalBody').innerHTML = `
      <div class="row g-3">
        <div class="col-md-4 text-center">
          ${avatar(data.teacher?.photo_url, data.teacher?.name, 80)}
          <div class="mt-2 fw-bold">${data.teacher?.name}</div>
          ${levelBadge(data.teacher?.teacher_level)}
          <div class="mt-2">${statusBadge(data.teacher?.approval_status)}</div>
        </div>
        <div class="col-md-8 text-start text-white">
          <div class="row g-2 text-muted small">
            <div class="col-6"><strong>Email:</strong> ${data.teacher?.email}</div>
            <div class="col-6"><strong>Phone:</strong> ${data.teacher?.phone||'—'}</div>
            <div class="col-6"><strong>Qualification:</strong> ${data.teacher?.qualification||'—'}</div>
            <div class="col-6"><strong>Experience:</strong> ${data.teacher?.experience_years||0} years</div>
            <div class="col-6"><strong>Subjects:</strong> ${data.teacher?.subject_expertise||'—'}</div>
            <div class="col-6"><strong>Joined:</strong> ${fmtDate(data.teacher?.created_at)}</div>
            <div class="col-6"><strong>Rating:</strong> ⭐ ${data.teacher?.rating||5}/5 (${data.teacher?.total_ratings||0} reviews)</div>
            <div class="col-6"><strong>Referral Code:</strong> ${data.teacher?.referral_code||'—'}</div>
            <div class="col-6"><strong>Agreement Signed:</strong> ${data.sop?.agreement_signed ? `<span class="badge bg-success">Signed</span>` : `<span class="badge bg-warning">Pending</span>`}</div>
            ${data.sop?.agreement_signed ? `
              <div class="col-6"><strong>Signed At:</strong> ${fmtDate(data.sop?.agreement_signed_at)}</div>
              <div class="col-12"><strong>Digital Signature:</strong> <code>${data.sop?.digital_signature || '—'}</code></div>
            ` : ''}
          </div>
          <hr style="border-color:var(--border)">
          <div class="row g-2 text-muted small">
            <div class="col-12"><strong>Wallet:</strong></div>
            <div class="col-4">Total: ${fmtCurrency(data.wallet?.total_earnings)}</div>
            <div class="col-4">Paid: ${fmtCurrency(data.wallet?.paid_earnings)}</div>
            <div class="col-4">Balance: ${fmtCurrency(data.wallet?.wallet_balance)}</div>
          </div>
          <hr style="border-color:var(--border)">
          <div class="d-flex gap-2 flex-wrap mt-2">
            <button class="btn btn-sm btn-spx" onclick="setTeacherLevel('${data.teacher?.id}')">Set Level</button>
            <button class="btn btn-sm btn-outline-primary" onclick="resetCredentials('${data.teacher?.id}')">Reset Password</button>
            <button class="btn btn-sm btn-outline-secondary" onclick="impersonate('${data.teacher?.id}', 'teacher')">Login As</button>
          </div>
        </div>
      </div>`;
    formModal.show();
  } catch (err) { showToast(err.message, 'error'); }
}

async function setTeacherLevel(id) {
  adminPrompt('Set Teacher Level', 'Enter level (Bronze / Silver / Gold / Elite Mentor):', 'Bronze', async (level) => {
    if (!['Bronze','Silver','Gold','Elite Mentor'].includes(level)) { showToast('Invalid level', 'error'); return; }
    try {
      const data = await apiPost(`/admin/teachers/${id}/set-level`, { level });
      showToast(data.message || 'Level updated');
      formModal.hide();
      renderTeachers();
    } catch (err) { showToast(err.message, 'error'); }
  });
}

async function impersonate(userId, role) {
  try {
    const data = await apiPost(`/admin/impersonate/${userId}`);
    if (data.token) {
      const portal = role === 'teacher' ? '/teacher' : role === 'student' ? '/student' : '/parent';
      const tokenKey = role === 'parent' ? 'spx_parent_token' : `${role}_token`;
      const userKey = role === 'parent' ? 'spx_parent_profile' : `${role}_user`;
      
      localStorage.setItem(tokenKey, data.token);
      localStorage.setItem(userKey, JSON.stringify(data.user));
      sessionStorage.setItem(tokenKey, data.token);
      sessionStorage.setItem(userKey, JSON.stringify(data.user));
      
      window.open(`${portal}?impersonate=1`, '_blank');
      showToast(`Opened as ${data.user?.name}`, 'info');
    }
  } catch (err) { showToast(err.message, 'error'); }
}

async function resetCredentials(userId) {
  adminPrompt('Reset User Password', 'Enter new password:', '', async (password) => {
    if (password.length < 6) { showToast('Password must be at least 6 chars', 'error'); return; }
    try {
      const data = await apiPost(`/admin/users/${userId}/reset-credentials`, { password_plain: password });
      showToast(data.message || 'Password reset successfully!');
    } catch (err) { showToast(err.message, 'error'); }
  });
}

// ── Students ──────────────────────────────────────────────────
async function renderStudents() {
  loading();
  try {
    const students = await apiGet('/admin/students');
    document.getElementById('pageContent').innerHTML = `
      <div class="spx-card">
        <div class="d-flex align-items-center justify-content-between mb-4">
          <h6 class="mb-0">All Students (${students.length})</h6>
          <input type="text" class="form-control spx-input" placeholder="Search students..." style="width:220px" oninput="filterTable(this.value, 'studentsTable', 0, 3)">
        </div>
        ${table(
          ['Student','Code','Grade','Board','Email','Joined','Actions'],
          students.map(s => `
            <tr>
              <td><div class="d-flex align-items-center gap-2">${avatar(s.photo_url, s.name)}<span class="fw-semibold text-white">${s.name}</span></div></td>
              <td><code style="color:var(--primary)">${s.student_code||'—'}</code></td>
              <td>${s.grade||'—'}</td>
              <td>${s.board||'—'}</td>
              <td>${s.email}</td>
              <td>${fmtDate(s.created_at)}</td>
              <td>
                <button class="btn btn-sm btn-outline-primary me-1" onclick="impersonate('${s.id}','student')">Login As</button>
                <button class="btn btn-sm btn-outline-secondary" onclick="toggleUser('${s.id}')">
                  ${s.is_disabled ? 'Enable' : 'Disable'}
                </button>
              </td>
            </tr>`).join(''),
          true
        )}
      </div>`;
  } catch (err) {
    document.getElementById('pageContent').innerHTML = `<div class="alert alert-danger">${err.message}</div>`;
  }
}

// ── Parents ───────────────────────────────────────────────────
async function renderParents() {
  loading();
  try {
    const parents = await apiGet('/admin/parents');
    document.getElementById('pageContent').innerHTML = `
      <div class="spx-card">
        <h6 class="mb-4">All Parents (${parents.length})</h6>
        ${table(
          ['Parent','Email','Phone','Joined','Actions'],
          parents.map(p => `
            <tr>
              <td><div class="d-flex align-items-center gap-2">${avatar(p.photo_url,p.name)}<span class="fw-semibold text-white">${p.name}</span></div></td>
              <td>${p.email}</td>
              <td>${p.phone||'—'}</td>
              <td>${fmtDate(p.created_at)}</td>
              <td><button class="btn btn-sm btn-outline-primary" onclick="impersonate('${p.id}','parent')">Login As</button></td>
            </tr>`).join(''),
          true
        )}
      </div>`;
  } catch (err) {
    document.getElementById('pageContent').innerHTML = `<div class="alert alert-danger">${err.message}</div>`;
  }
}

// ── Courses ───────────────────────────────────────────────────
async function renderCourses() {
  loading();
  try {
    const courses = await apiGet('/admin/courses');
    document.getElementById('pageContent').innerHTML = `
      <div class="spx-card">
        <div class="d-flex align-items-center justify-content-between mb-4">
          <h6 class="mb-0">All Courses (${courses.length})</h6>
          <button class="btn btn-spx" onclick="showCreateCourse()"><i class="fas fa-plus me-2"></i>New Course</button>
        </div>
        ${table(
          ['Title','Subject','Grade','Board','Fees','Status','Actions'],
          courses.map(c => `
            <tr>
              <td class="fw-semibold text-white">${c.title}</td>
              <td>${c.subject||'—'}</td>
              <td>${c.grade||'—'}</td>
              <td>${c.board||'—'}</td>
              <td class="fw-semibold" style="color:var(--primary)">${fmtCurrency(c.fees)}</td>
              <td>${statusBadge(c.status)}</td>
              <td>
                <button class="btn btn-sm btn-outline-secondary me-1" onclick="editCourse('${c.id}')">Edit</button>
                <button class="btn btn-sm btn-outline-danger" onclick="archiveCourse('${c.id}')">Archive</button>
              </td>
            </tr>`).join(''),
          true
        )}
      </div>`;
  } catch (err) {
    document.getElementById('pageContent').innerHTML = `<div class="alert alert-danger">${err.message}</div>`;
  }
}

function showCreateCourse() {
  document.getElementById('formModalTitle').textContent = 'Create New Course';
  document.getElementById('formModalBody').innerHTML = `
    <form id="courseForm">
      <div class="row g-3">
        <div class="col-md-8"><label class="spx-label">Course Title *</label><input class="form-control spx-input" id="courseTitle" required></div>
        <div class="col-md-4"><label class="spx-label">Subject</label><input class="form-control spx-input" id="courseSubject"></div>
        <div class="col-md-4"><label class="spx-label">Grade</label>
          <select class="form-select spx-input" id="courseGrade">
            <option value="">Any</option>
            ${['Class 6','Class 7','Class 8','Class 9','Class 10','Class 11','Class 12'].map(g => `<option>${g}</option>`).join('')}
          </select>
        </div>
        <div class="col-md-4"><label class="spx-label">Board</label>
          <select class="form-select spx-input" id="courseBoard">
            <option value="">Any</option>
            <option>CBSE</option><option>ICSE</option><option>State Board</option>
          </select>
        </div>
        <div class="col-md-2"><label class="spx-label">Duration (weeks)</label><input class="form-control spx-input" id="courseDuration" type="number" value="24"></div>
        <div class="col-md-2"><label class="spx-label">Fees (₹) *</label><input class="form-control spx-input" id="courseFees" type="number" required></div>
        <div class="col-12"><label class="spx-label">Description</label><textarea class="form-control spx-input" id="courseDesc" rows="3"></textarea></div>
        <div class="col-12"><button type="submit" class="btn btn-spx w-100">Create Course</button></div>
      </div>
    </form>`;
  document.getElementById('courseForm').onsubmit = createCourse;
  formModal.show();
}

async function createCourse(e) {
  e.preventDefault();
  try {
    const data = await apiPost('/admin/courses', {
      title: document.getElementById('courseTitle').value,
      subject: document.getElementById('courseSubject').value,
      grade: document.getElementById('courseGrade').value,
      board: document.getElementById('courseBoard').value,
      duration_weeks: parseInt(document.getElementById('courseDuration').value),
      fees: parseFloat(document.getElementById('courseFees').value),
      description: document.getElementById('courseDesc').value,
    });
    showToast(data.message || 'Course created');
    formModal.hide();
    renderCourses();
  } catch (err) { showToast(err.message, 'error'); }
}

async function archiveCourse(id) {
  confirm('Archive Course?', 'This will hide the course from students.', async () => {
    try {
      const data = await apiDelete(`/admin/courses/${id}`);
      showToast(data.message || 'Course archived');
      renderCourses();
    } catch (err) { showToast(err.message, 'error'); }
  });
}

// ── Batches ───────────────────────────────────────────────────
async function renderBatches() {
  loading();
  try {
    const batches = await apiGet('/admin/batches');
    document.getElementById('pageContent').innerHTML = `
      <div class="spx-card">
        <h6 class="mb-4">All Batches (${batches.length})</h6>
        ${table(
          ['Batch','Course','Teacher','Schedule','Capacity','Status','Actions'],
          batches.map(b => `
            <tr>
              <td class="fw-semibold text-white">${b.batch_name}</td>
              <td>${b.course_title||'—'}</td>
              <td>${b.teacher_name||'—'}</td>
              <td>${(b.days_of_week||[]).join(', ')}<br><small class="text-muted">${b.start_time||''} - ${b.end_time||''}</small></td>
              <td>${b.seats_filled||0}/${b.capacity||30}</td>
              <td>${statusBadge(b.status)}</td>
              <td>
                <button class="btn btn-sm btn-outline-secondary me-1" onclick="toggleBatch('${b.id}')">Toggle</button>
                <button class="btn btn-sm btn-outline-danger" onclick="cancelBatch('${b.id}')">Cancel</button>
              </td>
            </tr>`).join(''),
          true
        )}
      </div>`;
  } catch (err) {
    document.getElementById('pageContent').innerHTML = `<div class="alert alert-danger">${err.message}</div>`;
  }
}

async function toggleBatch(id) {
  try { const d = await apiPost(`/admin/batches/${id}/toggle`); showToast(d.message||'Batch toggled'); renderBatches(); }
  catch (err) { showToast(err.message,'error'); }
}
async function cancelBatch(id) {
  adminPrompt('Cancel Batch', 'Reason for cancellation?', '', async (reason) => {
    try { const d = await apiPost(`/admin/batches/${id}/cancel`,{reason}); showToast(d.message||'Batch cancelled'); renderBatches(); }
    catch (err) { showToast(err.message,'error'); }
  });
}

// ── Live Classes ──────────────────────────────────────────────
async function renderLiveClasses() {
  loading();
  try {
    const classes = await apiGet('/admin/live-classes');
    document.getElementById('pageContent').innerHTML = `
      <div class="spx-card">
        <h6 class="mb-4">Live Classes (${classes.length})</h6>
        ${table(
          ['Title','Batch','Teacher','Date/Time','Status','Duration','Actions'],
          classes.map(c => `
            <tr>
              <td class="fw-semibold text-white">${c.title||'Class'}</td>
              <td>${c.batch_name||'—'}</td>
              <td>${c.teacher_name||'—'}</td>
              <td>${fmtDate(c.class_date)} ${c.class_time||''}</td>
              <td>${statusBadge(c.status)}</td>
              <td>${c.duration_mins ? c.duration_mins + ' min' : '—'}</td>
              <td>
                ${c.status === 'live' ? `<button class="btn btn-sm btn-danger" onclick="endClass('${c.id}')">Force End</button>` : ''}
                ${c.status === 'scheduled' ? `<button class="btn btn-sm btn-outline-danger" onclick="cancelClass('${c.id}')">Cancel</button>` : ''}
              </td>
            </tr>`).join(''),
          true
        )}
      </div>`;
  } catch (err) {
    document.getElementById('pageContent').innerHTML = `<div class="alert alert-danger">${err.message}</div>`;
  }
}

async function endClass(id) {
  try { const d = await apiPost(`/admin/live-classes/${id}/end`); showToast(d.message); renderLiveClasses(); }
  catch (err) { showToast(err.message,'error'); }
}
async function cancelClass(id) {
  try { const d = await apiDelete(`/admin/live-classes/${id}`); showToast(d.message); renderLiveClasses(); }
  catch (err) { showToast(err.message,'error'); }
}

// ── Payments ──────────────────────────────────────────────────
async function renderPayments() {
  loading();
  try {
    const payments = await apiGet('/admin/payments');
    document.getElementById('pageContent').innerHTML = `
      <div class="spx-card">
        <h6 class="mb-4">All Payments (${payments.length})</h6>
        ${table(
          ['Student','Course','Batch','Amount','Teacher Share','Status','Date'],
          payments.map(p => `
            <tr>
              <td class="fw-semibold text-white">${p.student_name||'—'}</td>
              <td>${p.course_title||'—'}</td>
              <td>${p.batch_name||'—'}</td>
              <td class="fw-semibold" style="color:var(--success)">${fmtCurrency(p.amount)}</td>
              <td>${fmtCurrency(p.teacher_share)}</td>
              <td>${statusBadge(p.status)}</td>
              <td>${fmtDate(p.created_at)}</td>
            </tr>`).join(''),
          true
        )}
      </div>`;
  } catch (err) {
    document.getElementById('pageContent').innerHTML = `<div class="alert alert-danger">${err.message}</div>`;
  }
}

// ── Payouts ───────────────────────────────────────────────────
async function renderPayouts() {
  loading();
  try {
    const payouts = await apiGet('/admin/payouts');
    document.getElementById('pageContent').innerHTML = `
      <div class="spx-card">
        <h6 class="mb-4">Payout Requests (${payouts.length})</h6>
        ${table(
          ['Teacher','Amount','UPI/Bank','Status','Requested','Actions'],
          payouts.map(p => `
            <tr>
              <td class="fw-semibold text-white">${p.teacher_name||'—'}<br><small class="text-muted">${p.teacher_email||''}</small></td>
              <td class="fw-bold" style="color:var(--warning)">${fmtCurrency(p.amount)}</td>
              <td><small>${p.upi_id||p.bank_account||'—'}</small></td>
              <td>${statusBadge(p.status)}</td>
              <td>${fmtDate(p.requested_at)}</td>
              <td>
                ${p.status === 'requested' ? `
                  <button class="btn btn-sm btn-success me-1" onclick="approvePayout('${p.id}')">Approve</button>
                  <button class="btn btn-sm btn-danger" onclick="rejectPayout('${p.id}')">Reject</button>` : ''}
                ${p.status === 'approved' ? `<button class="btn btn-sm btn-primary" onclick="markPaid('${p.id}')">Mark Paid</button>` : ''}
              </td>
            </tr>`).join(''),
          true
        )}
      </div>`;
  } catch (err) {
    document.getElementById('pageContent').innerHTML = `<div class="alert alert-danger">${err.message}</div>`;
  }
}

async function approvePayout(id) {
  try { const d = await apiPost(`/admin/payouts/${id}/approve`); showToast(d.message); renderPayouts(); }
  catch (err) { showToast(err.message,'error'); }
}
async function rejectPayout(id) {
  adminPrompt('Reject Payout Request', 'Reason for rejection?', '', async (notes) => {
    try { const d = await apiPost(`/admin/payouts/${id}/reject`,{admin_notes:notes}); showToast(d.message); renderPayouts(); }
    catch (err) { showToast(err.message,'error'); }
  });
}
async function markPaid(id) {
  try { const d = await apiPost(`/admin/payouts/${id}/mark-paid`); showToast(d.message); renderPayouts(); }
  catch (err) { showToast(err.message,'error'); }
}

// ── Commission ────────────────────────────────────────────────
async function renderCommission() {
  loading();
  try {
    const configs = await apiGet('/admin/commission');
    document.getElementById('pageContent').innerHTML = `
      <div class="row g-4">
        ${configs.map(c => `
          <div class="col-md-4">
            <div class="spx-card">
              <h6 class="text-capitalize mb-4">${c.commission_type} Commission</h6>
              <p class="text-muted small">${c.description||''}</p>
              <div class="row g-2 mb-3">
                <div class="col-6">
                  <label class="spx-label">Teacher %</label>
                  <input class="form-control spx-input" id="teacher_pct_${c.commission_type}" type="number" value="${c.teacher_pct}" min="0" max="100">
                </div>
                <div class="col-6">
                  <label class="spx-label">Platform %</label>
                  <input class="form-control spx-input" id="platform_pct_${c.commission_type}" type="number" value="${c.platform_pct}" min="0" max="100">
                </div>
              </div>
              <button class="btn btn-spx w-100" onclick="updateCommission('${c.commission_type}')">Update</button>
            </div>
          </div>`).join('')}
      </div>`;
  } catch (err) {
    document.getElementById('pageContent').innerHTML = `<div class="alert alert-danger">${err.message}</div>`;
  }
}

async function updateCommission(type) {
  const tp = parseFloat(document.getElementById(`teacher_pct_${type}`).value);
  const pp = parseFloat(document.getElementById(`platform_pct_${type}`).value);
  if (tp + pp !== 100) { showToast('Teacher % + Platform % must equal 100','error'); return; }
  try { const d = await apiPut(`/admin/commission/${type}`,{teacher_pct:tp,platform_pct:pp}); showToast(d.message); }
  catch (err) { showToast(err.message,'error'); }
}

// ── Refunds ───────────────────────────────────────────────────
async function renderRefunds() {
  loading();
  try {
    const refunds = await apiGet('/admin/refunds');
    document.getElementById('pageContent').innerHTML = `
      <div class="spx-card">
        <h6 class="mb-4">Refund Requests (${refunds.length})</h6>
        ${table(
          ['Student','Amount','Reason','Status','Requested','Actions'],
          refunds.map(r => `
            <tr>
              <td class="fw-semibold text-white">${r.student_name||'—'}</td>
              <td style="color:var(--danger)">${fmtCurrency(r.amount)}</td>
              <td>${r.reason||'—'}</td>
              <td>${statusBadge(r.status)}</td>
              <td>${fmtDate(r.requested_at)}</td>
              <td>
                ${r.status === 'pending' ? `
                  <button class="btn btn-sm btn-success me-1" onclick="processRefund('${r.id}','approve')">Approve</button>
                  <button class="btn btn-sm btn-danger" onclick="processRefund('${r.id}','reject')">Reject</button>` : statusBadge(r.status)}
              </td>
            </tr>`).join(''),
          true
        )}
      </div>`;
  } catch (err) {
    document.getElementById('pageContent').innerHTML = `<div class="alert alert-danger">${err.message}</div>`;
  }
}

async function processRefund(id, action) {
  if (action === 'approve') {
    try { const d = await apiPost(`/admin/refunds/${id}/process`,{action,notes:''}); showToast(d.message); renderRefunds(); }
    catch (err) { showToast(err.message,'error'); }
  } else {
    adminPrompt('Reject Refund Request', 'Reason for rejection?', '', async (notes) => {
      try { const d = await apiPost(`/admin/refunds/${id}/process`,{action,notes}); showToast(d.message); renderRefunds(); }
      catch (err) { showToast(err.message,'error'); }
    });
  }
}

// ── SOP Review ────────────────────────────────────────────────
async function renderSOP() {
  loading();
  try {
    const sops = await apiGet('/admin/sop');
    document.getElementById('pageContent').innerHTML = `
      <div class="spx-card">
        <h6 class="mb-4 text-start">SOP Submissions (${sops.length})</h6>
        ${table(
          ['Teacher','Email','Status','Submitted','Videos','Actions'],
          sops.map(s => `
            <tr>
              <td><div class="d-flex align-items-center gap-2">${avatar(s.photo_url,s.teacher_name)}<span class="fw-semibold text-white">${s.teacher_name}</span></div></td>
              <td>${s.teacher_email}</td>
              <td>${statusBadge(s.status)}</td>
              <td>${fmtDate(s.submitted_at)}</td>
              <td>
                <div class="d-flex gap-1 flex-wrap">
                  ${s.camera_sop_url ? `<a href="${s.camera_sop_url}" target="_blank" class="btn btn-xs btn-outline-primary" style="font-size:.7rem;padding:2px 8px">Camera</a>` : ''}
                  ${s.lighting_sop_url ? `<a href="${s.lighting_sop_url}" target="_blank" class="btn btn-xs btn-outline-warning" style="font-size:.7rem;padding:2px 8px">Light</a>` : ''}
                  ${s.audio_sop_url ? `<a href="${s.audio_sop_url}" target="_blank" class="btn btn-xs btn-outline-info" style="font-size:.7rem;padding:2px 8px">Audio</a>` : ''}
                  ${s.internet_proof_url ? `<a href="${s.internet_proof_url}" target="_blank" class="btn btn-xs btn-outline-secondary" style="font-size:.7rem;padding:2px 8px">Speed</a>` : ''}
                  ${s.demo_teaching_url ? `<a href="${s.demo_teaching_url}" target="_blank" class="btn btn-xs btn-outline-success" style="font-size:.7rem;padding:2px 8px">Demo</a>` : ''}
                </div>
              </td>
              <td>
                ${s.status === 'sop_pending' ? `
                  <button class="btn btn-sm btn-success me-1" onclick="showSOPApprovalModal('${s.teacher_id}')">Approve</button>
                  <button class="btn btn-sm btn-danger" onclick="reviewSOP('${s.teacher_id}','reject')">Reject</button>` : statusBadge(s.status)}
              </td>
            </tr>`).join(''),
          true
        )}
      </div>`;
    loadSOPBadge();
  } catch (err) {
    document.getElementById('pageContent').innerHTML = `<div class="alert alert-danger">${err.message}</div>`;
  }
}

async function reviewSOP(teacherId, action) {
  if (action === 'reject') {
    adminPrompt('Reject SOP Submission', 'Reason for rejection?', '', async (notes) => {
      try { const d = await apiPost(`/admin/sop/${teacherId}/reject`,{admin_notes:notes}); showToast(d.message); renderSOP(); }
      catch (err) { showToast(err.message,'error'); }
    });
    return;
  }
}

async function showSOPApprovalModal(teacherId) {
  try {
    const sops = await apiGet('/admin/sop');
    const s = sops.find(x => x.teacher_id === teacherId);
    if (!s) return showToast('SOP record not found', 'error');

    document.getElementById('formModalTitle').textContent = `Review & Approve SOP - ${s.teacher_name}`;
    document.getElementById('formModalBody').innerHTML = `
      <div class="row g-3 text-start">
        <div class="col-12 mb-2">
          <p class="text-secondary small">Verify that the teacher has met all standard requirements. Tick the checkboxes below to log compliance:</p>
          <div class="sop-video-box p-3 mb-2">
            <h6 class="fw-bold mb-3" style="font-size:0.85rem; color: var(--primary-dark); font-family: 'Outfit', sans-serif;"><i class="fas fa-file-alt me-1"></i>Uploaded Proofs:</h6>
            <div class="d-flex gap-2 flex-wrap">
              ${s.camera_sop_url ? `<a href="${s.camera_sop_url}" target="_blank" class="btn btn-sm btn-outline-primary"><i class="fas fa-video me-1"></i>Camera Video</a>` : ''}
              ${s.lighting_sop_url ? `<a href="${s.lighting_sop_url}" target="_blank" class="btn btn-sm btn-outline-primary"><i class="fas fa-sun me-1"></i>Lighting Video</a>` : ''}
              ${s.audio_sop_url ? `<a href="${s.audio_sop_url}" target="_blank" class="btn btn-sm btn-outline-primary"><i class="fas fa-microphone me-1"></i>Audio Clip</a>` : ''}
              ${s.internet_proof_url ? `<a href="${s.internet_proof_url}" target="_blank" class="btn btn-sm btn-outline-primary"><i class="fas fa-wifi me-1"></i>Speed Proof</a>` : ''}
              ${s.demo_teaching_url ? `<a href="${s.demo_teaching_url}" target="_blank" class="btn btn-sm btn-outline-primary"><i class="fas fa-chalkboard me-1"></i>Demo Lecture</a>` : ''}
            </div>
          </div>
        </div>

        <div class="col-md-6">
          <div class="card p-3 mb-3 border-0" style="background: #F8FAFC; border: 1px solid var(--border) !important; border-radius: var(--radius-md);">
            <h6 class="fw-bold mb-3" style="font-size:0.85rem; color: var(--primary-dark); font-family: 'Outfit', sans-serif;"><i class="fas fa-camera me-1"></i>Camera Setup Checklist</h6>
            <div class="form-check mb-2"><input class="form-check-input admin-sop-check" type="checkbox" id="adm_face_visible" checked><label class="form-check-label text-secondary small" for="adm_face_visible" style="cursor: pointer;">Face clearly visible</label></div>
            <div class="form-check mb-2"><input class="form-check-input admin-sop-check" type="checkbox" id="adm_stable_camera" checked><label class="form-check-label text-secondary small" for="adm_stable_camera">Camera feed stable (on tripod)</label></div>
            <div class="form-check mb-2"><input class="form-check-input admin-sop-check" type="checkbox" id="adm_eye_level" checked><label class="form-check-label text-secondary small" for="adm_eye_level">Eye-level camera positioning</label></div>
            <div class="form-check mb-2"><input class="form-check-input admin-sop-check" type="checkbox" id="adm_proper_framing" checked><label class="form-check-label text-secondary small" for="adm_proper_framing">Proper framing (face, upper body, hands)</label></div>
          </div>

          <div class="card p-3 mb-3 border-0" style="background: #F8FAFC; border: 1px solid var(--border) !important; border-radius: var(--radius-md);">
            <h6 class="fw-bold mb-3" style="font-size:0.85rem; color: var(--primary-dark); font-family: 'Outfit', sans-serif;"><i class="fas fa-lightbulb me-1"></i>Lighting Setup Checklist</h6>
            <div class="form-check mb-2"><input class="form-check-input admin-sop-check" type="checkbox" id="adm_proper_lighting" checked><label class="form-check-label text-secondary small" for="adm_proper_lighting" style="cursor: pointer;">Soft light falling on face</label></div>
            <div class="form-check mb-2"><input class="form-check-input admin-sop-check" type="checkbox" id="adm_no_backlight" checked><label class="form-check-label text-secondary small" for="adm_no_backlight" style="cursor: pointer;">No backlight glare or dark shadows</label></div>
            <div class="form-check mb-2"><input class="form-check-input admin-sop-check" type="checkbox" id="adm_clear_background" checked><label class="form-check-label text-secondary small" for="adm_clear_background" style="cursor: pointer;">Clean neutral background</label></div>
          </div>
        </div>

        <div class="col-md-6">
          <div class="card p-3 mb-3 border-0" style="background: #F8FAFC; border: 1px solid var(--border) !important; border-radius: var(--radius-md);">
            <h6 class="fw-bold mb-3" style="font-size:0.85rem; color: var(--primary-dark); font-family: 'Outfit', sans-serif;"><i class="fas fa-microphone-alt me-1"></i>Audio Checklist</h6>
            <div class="form-check mb-2"><input class="form-check-input admin-sop-check" type="checkbox" id="adm_clear_voice" checked><label class="form-check-label text-secondary small" for="adm_clear_voice" style="cursor: pointer;">Clear voice projection & volume</label></div>
            <div class="form-check mb-2"><input class="form-check-input admin-sop-check" type="checkbox" id="adm_no_noise" checked><label class="form-check-label text-secondary small" for="adm_no_noise" style="cursor: pointer;">No environmental / echo noise</label></div>
          </div>

          <div class="card p-3 mb-3 border-0" style="background: #F8FAFC; border: 1px solid var(--border) !important; border-radius: var(--radius-md);">
            <h6 class="fw-bold mb-3" style="font-size:0.85rem; color: var(--primary-dark); font-family: 'Outfit', sans-serif;"><i class="fas fa-wifi me-1"></i>Internet Checklist</h6>
            <div class="form-check mb-2"><input class="form-check-input admin-sop-check" type="checkbox" id="adm_stable_connection" checked><label class="form-check-label text-secondary small" for="adm_stable_connection" style="cursor: pointer;">Broadband connection stable</label></div>
            <div class="form-check mb-2"><input class="form-check-input admin-sop-check" type="checkbox" id="adm_speed_proof" checked><label class="form-check-label text-secondary small" for="adm_speed_proof" style="cursor: pointer;">Speed test proof > 20 Mbps verified</label></div>
          </div>

          <div class="card p-3 mb-3 border-0" style="background: #F8FAFC; border: 1px solid var(--border) !important; border-radius: var(--radius-md);">
            <h6 class="fw-bold mb-3" style="font-size:0.85rem; color: var(--primary-dark); font-family: 'Outfit', sans-serif;"><i class="fas fa-graduation-cap me-1"></i>Teaching Checklist</h6>
            <div class="form-check mb-2"><input class="form-check-input admin-sop-check" type="checkbox" id="adm_communication" checked><label class="form-check-label text-secondary small" for="adm_communication" style="cursor: pointer;">Energetic communication tone</label></div>
            <div class="form-check mb-2"><input class="form-check-input admin-sop-check" type="checkbox" id="adm_engagement" checked><label class="form-check-label text-secondary small" for="adm_engagement" style="cursor: pointer;">Proactive student engagement flow</label></div>
            <div class="form-check mb-2"><input class="form-check-input admin-sop-check" type="checkbox" id="adm_presentation" checked><label class="form-check-label text-secondary small" for="adm_presentation" style="cursor: pointer;">Clear whiteboard/slide presentability</label></div>
          </div>
        </div>

        <div class="col-12 mt-3 d-flex justify-content-end gap-2">
          <button class="btn btn-secondary btn-sm" onclick="formModal.hide()">Cancel</button>
          <button class="btn btn-success btn-sm" onclick="submitSOPApproval('${teacherId}')">Submit Approval</button>
        </div>
      </div>
    `;
    formModal.show();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function submitSOPApproval(teacherId) {
  const payload = {
    camera_checklist: {
      face_visible: document.getElementById('adm_face_visible').checked,
      stable_camera: document.getElementById('adm_stable_camera').checked,
      eye_level: document.getElementById('adm_eye_level').checked,
      proper_framing: document.getElementById('adm_proper_framing').checked
    },
    lighting_checklist: {
      proper_lighting: document.getElementById('adm_proper_lighting').checked,
      no_backlight: document.getElementById('adm_no_backlight').checked,
      clear_background: document.getElementById('adm_clear_background').checked
    },
    audio_checklist: {
      clear_voice: document.getElementById('adm_clear_voice').checked,
      no_noise: document.getElementById('adm_no_noise').checked
    },
    internet_checklist: {
      stable_connection: document.getElementById('adm_stable_connection').checked,
      speed_proof: document.getElementById('adm_speed_proof').checked
    },
    teaching_checklist: {
      communication: document.getElementById('adm_communication').checked,
      engagement: document.getElementById('adm_engagement').checked,
      presentation: document.getElementById('adm_presentation').checked
    }
  };

  try {
    const d = await apiPost(`/admin/sop/${teacherId}/approve`, payload);
    showToast(d.message);
    formModal.hide();
    renderSOP();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ── Coupons ───────────────────────────────────────────────────
async function renderCoupons() {
  loading();
  try {
    const coupons = await apiGet('/admin/coupons');
    document.getElementById('pageContent').innerHTML = `
      <div class="spx-card">
        <div class="d-flex align-items-center justify-content-between mb-4">
          <h6 class="mb-0">Coupons (${coupons.length})</h6>
          <button class="btn btn-spx" onclick="showCreateCoupon()"><i class="fas fa-plus me-2"></i>New Coupon</button>
        </div>
        ${table(
          ['Code','Discount','Uses','Valid Until','Status','Actions'],
          coupons.map(c => `
            <tr>
              <td><code style="color:var(--primary);font-size:1rem">${c.code}</code></td>
              <td class="fw-bold">${c.discount_percent}%</td>
              <td>${c.used_count||0} / ${c.max_uses}</td>
              <td>${fmtDate(c.valid_until)}</td>
              <td>${c.is_active ? '<span class="badge-active">Active</span>' : '<span class="badge-rejected">Inactive</span>'}</td>
              <td>
                <button class="btn btn-sm btn-outline-secondary me-1" onclick="toggleCoupon('${c.code}')">Toggle</button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteCoupon('${c.code}')">Delete</button>
              </td>
            </tr>`).join(''),
          true
        )}
      </div>`;
  } catch (err) {
    document.getElementById('pageContent').innerHTML = `<div class="alert alert-danger">${err.message}</div>`;
  }
}

function showCreateCoupon() {
  document.getElementById('formModalTitle').textContent = 'Create Coupon';
  document.getElementById('formModalBody').innerHTML = `
    <form onsubmit="createCoupon(event)">
      <div class="row g-3">
        <div class="col-6"><label class="spx-label">Coupon Code *</label><input class="form-control spx-input" id="cpCode" required placeholder="SPEAXSA20"></div>
        <div class="col-6"><label class="spx-label">Discount % *</label><input class="form-control spx-input" id="cpDiscount" type="number" min="1" max="100" required></div>
        <div class="col-6"><label class="spx-label">Max Uses</label><input class="form-control spx-input" id="cpMaxUses" type="number" value="100"></div>
        <div class="col-6"><label class="spx-label">Valid Until</label><input class="form-control spx-input" id="cpValidity" type="date"></div>
        <div class="col-12"><button type="submit" class="btn btn-spx w-100">Create Coupon</button></div>
      </div>
    </form>`;
  formModal.show();
}

async function createCoupon(e) {
  e.preventDefault();
  try {
    const d = await apiPost('/admin/coupons',{code:document.getElementById('cpCode').value,discount_percent:parseFloat(document.getElementById('cpDiscount').value),max_uses:parseInt(document.getElementById('cpMaxUses').value),valid_until:document.getElementById('cpValidity').value||null});
    showToast(d.message||'Coupon created'); formModal.hide(); renderCoupons();
  } catch (err) { showToast(err.message,'error'); }
}

async function toggleCoupon(code) {
  try { const d = await apiPost(`/admin/coupons/${code}/toggle`); showToast('Coupon toggled'); renderCoupons(); }
  catch (err) { showToast(err.message,'error'); }
}
async function deleteCoupon(code) {
  confirm('Delete Coupon?', `Delete coupon <strong>${code}</strong>?`, async () => {
    try { await apiDelete(`/admin/coupons/${code}`); showToast('Coupon deleted'); renderCoupons(); }
    catch (err) { showToast(err.message,'error'); }
  });
}

// ── Notifications ─────────────────────────────────────────────
async function renderNotifications() {
  loading();
  try {
    const notifs = await apiGet('/admin/notifications');
    document.getElementById('pageContent').innerHTML = `
      <div class="row g-4">
        <div class="col-lg-5">
          <div class="spx-card">
            <h6 class="mb-4">Send Notification</h6>
            <form onsubmit="sendNotif(event)">
              <div class="mb-3"><label class="spx-label">Title *</label><input class="form-control spx-input" id="notifTitle" required></div>
              <div class="mb-3"><label class="spx-label">Message *</label><textarea class="form-control spx-input" id="notifMsg" rows="4" required></textarea></div>
              <div class="mb-3">
                <label class="spx-label">Target</label>
                <select class="form-select spx-input" id="notifRole">
                  <option value="all">Everyone</option>
                  <option value="student">Students</option>
                  <option value="teacher">Teachers</option>
                  <option value="parent">Parents</option>
                </select>
              </div>
              <button type="submit" class="btn btn-spx w-100"><i class="fas fa-paper-plane me-2"></i>Send Notification</button>
            </form>
          </div>
        </div>
        <div class="col-lg-7">
          <div class="spx-card">
            <h6 class="mb-4">Recent Notifications</h6>
            ${table(
              ['Title','Target','Type','Date'],
              notifs.slice(0,20).map(n => `
                <tr>
                  <td class="fw-semibold text-white">${n.title}</td>
                  <td>${n.target_role||'all'}</td>
                  <td>${n.type||'info'}</td>
                  <td>${fmtDate(n.created_at)}</td>
                </tr>`).join(''),
              false
            )}
          </div>
        </div>
      </div>`;
  } catch (err) {
    document.getElementById('pageContent').innerHTML = `<div class="alert alert-danger">${err.message}</div>`;
  }
}

async function sendNotif(e) {
  e.preventDefault();
  try {
    const d = await apiPost('/admin/notifications',{title:document.getElementById('notifTitle').value,message:document.getElementById('notifMsg').value,target_role:document.getElementById('notifRole').value});
    showToast(d.message||'Notification sent'); document.getElementById('notifTitle').value=''; document.getElementById('notifMsg').value='';
    renderNotifications();
  } catch (err) { showToast(err.message,'error'); }
}

// ── Settings ──────────────────────────────────────────────────
async function renderSettings() {
  loading();
  try {
    const settings = await apiGet('/admin/settings');
    document.getElementById('pageContent').innerHTML = `
      <div class="row g-4">
        <div class="col-lg-6">
          <div class="spx-card">
            <h6 class="mb-4">Platform Settings</h6>
            <form onsubmit="saveSettings(event)">
              ${[
                {key:'platform_name', label:'Platform Name', type:'text'},
                {key:'logo_text', label:'Logo Text', type:'text'},
                {key:'support_email', label:'Support Email', type:'email'},
                {key:'support_phone', label:'Support Phone', type:'text'},
                {key:'support_hours', label:'Support Hours', type:'text'},
                {key:'announcement', label:'Announcement Banner', type:'text'},
                {key:'otp_expiry_minutes', label:'OTP Expiry (minutes)', type:'number'},
                {key:'max_batch_capacity', label:'Max Batch Capacity', type:'number'},
              ].map(f => `
                <div class="mb-3">
                  <label class="spx-label">${f.label}</label>
                  <input class="form-control spx-input" type="${f.type}" id="setting_${f.key}" value="${settings[f.key]||''}">
                </div>`).join('')}
              <button type="submit" class="btn btn-spx w-100">Save Settings</button>
            </form>
          </div>
        </div>
        <div class="col-lg-6">
          <div class="spx-card">
            <h6 class="mb-4">API Credentials</h6>
            <form onsubmit="saveAPICredentials(event)">
              ${[
                {key:'razorpay_key_id', label:'Razorpay Key ID'},
                {key:'razorpay_key_secret', label:'Razorpay Secret'},
                {key:'agora_app_id', label:'Agora App ID'},
                {key:'agora_app_certificate', label:'Agora App Certificate'},
                {key:'smtp_host', label:'SMTP Host'},
                {key:'smtp_port', label:'SMTP Port'},
                {key:'smtp_user', label:'SMTP Username'},
                {key:'smtp_pass', label:'SMTP Password', hidden:true},
              ].map(f => `
                <div class="mb-3">
                  <label class="spx-label">${f.label}</label>
                  <input class="form-control spx-input" type="${f.hidden?'password':'text'}" id="cred_${f.key}" value="${settings[f.key]||''}" placeholder="${f.hidden?'••••••••':''}">
                </div>`).join('')}
              <button type="submit" class="btn btn-spx w-100">Save Credentials</button>
            </form>
          </div>
        </div>
      </div>`;
  } catch (err) {
    document.getElementById('pageContent').innerHTML = `<div class="alert alert-danger">${err.message}</div>`;
  }
}

async function saveSettings(e) {
  e.preventDefault();
  const keys = ['platform_name','logo_text','support_email','support_phone','support_hours','announcement','otp_expiry_minutes','max_batch_capacity'];
  const body = {};
  keys.forEach(k => { body[k] = document.getElementById(`setting_${k}`)?.value || ''; });
  try { const d = await apiPost('/admin/settings',body); showToast(d.message||'Settings saved'); }
  catch (err) { showToast(err.message,'error'); }
}

async function saveAPICredentials(e) {
  e.preventDefault();
  const keys = ['razorpay_key_id','razorpay_key_secret','agora_app_id','agora_app_certificate','smtp_host','smtp_port','smtp_user','smtp_pass'];
  const body = {};
  keys.forEach(k => { const v = document.getElementById(`cred_${k}`)?.value; if (v) body[k] = v; });
  try { const d = await apiPost('/admin/settings',body); showToast(d.message||'API credentials saved'); }
  catch (err) { showToast(err.message,'error'); }
}

// ── Audit Logs ────────────────────────────────────────────────
async function renderAuditLogs() {
  loading();
  try {
    const data = await apiGet('/admin/audit-logs?limit=50');
    document.getElementById('pageContent').innerHTML = `
      <div class="spx-card">
        <h6 class="mb-4">Audit Logs (${data.total||0} total)</h6>
        ${table(
          ['Time','Actor','Role','Action','Target','Details'],
          (data.logs||[]).map(l => `
            <tr>
              <td>${fmtDate(l.created_at)}</td>
              <td class="fw-semibold text-white">${l.actor_name||'System'}</td>
              <td><span class="badge-pending">${l.actor_role||'—'}</span></td>
              <td><code style="color:var(--primary);font-size:.75rem">${l.action}</code></td>
              <td>${l.target_type||'—'}: ${l.target_id||'—'}</td>
              <td><small class="text-muted">${l.ip_address||''}</small></td>
            </tr>`).join(''),
          false
        )}
      </div>`;
  } catch (err) {
    document.getElementById('pageContent').innerHTML = `<div class="alert alert-danger">${err.message}</div>`;
  }
}

// ── Toggle User ───────────────────────────────────────────────
async function toggleUser(id) {
  try { const d = await apiPost(`/admin/users/${id}/toggle-status`); showToast(d.message); renderStudents(); }
  catch (err) { showToast(err.message,'error'); }
}

// ── Filter Table ──────────────────────────────────────────────
function filterTable(q, tableId, col, maxCol) {
  const rows = document.querySelectorAll(`#${tableId} tbody tr`);
  rows.forEach(row => {
    const cells = row.querySelectorAll('td');
    let match = false;
    for (let i = col; i <= Math.min(maxCol, cells.length - 1); i++) {
      if (cells[i]?.textContent.toLowerCase().includes(q.toLowerCase())) { match = true; break; }
    }
    row.style.display = match || !q ? '' : 'none';
  });
}

// ── Support / Connect Inquiries ───────────────────────────────
async function renderSupport() {
  loading();
  try {
    const tickets = await apiGet('/support');
    document.getElementById('pageContent').innerHTML = `
      <div class="spx-card">
        <h6 class="mb-4">Connect Queries & Support Tickets (${tickets.length})</h6>
        ${table(
          ['Date', 'Sender / Contact details', 'Subject', 'Message Details', 'Status', 'Action'],
          tickets.map(t => {
            const senderName = t.u_name || t.guest_name || 'Guest';
            const senderRole = t.u_role || t.guest_role || 'Visitor';
            const senderEmail = t.u_email || t.guest_email || '—';
            const senderPhone = t.u_phone || t.guest_phone || '—';
            
            return `
              <tr>
                <td>${fmtDate(t.created_at)}</td>
                <td>
                  <div class="fw-bold text-white">${senderName}</div>
                  <div class="text-muted small" style="font-size:0.75rem;">
                    Role: <span class="badge bg-secondary-subtle text-secondary px-2 py-0.5" style="font-size:0.65rem;">${senderRole.toUpperCase()}</span><br>
                    Email: ${senderEmail}<br>
                    Phone: ${senderPhone}
                  </div>
                </td>
                <td><strong class="text-white">${t.subject}</strong></td>
                <td><p class="text-muted mb-0 small" style="max-width:300px; white-space:pre-wrap;">${t.description}</p></td>
                <td>
                  <span class="badge ${t.status === 'open' ? 'bg-danger' : 'bg-success'}">
                    ${t.status.toUpperCase()}
                  </span>
                </td>
                <td>
                  ${t.status === 'open' ? `
                    <button class="btn btn-sm btn-spx" onclick="replyToTicket('${t.id}')">Reply</button>
                  ` : `
                    <button class="btn btn-sm btn-outline-secondary" onclick="viewTicketReplies('${t.id}')">View Replies</button>
                  `}
                </td>
              </tr>
            `;
          }).join('') || '<tr><td colspan="6" class="text-center text-muted">No support tickets found.</td></tr>',
          true
        )}
      </div>
    `;
  } catch (err) {
    document.getElementById('pageContent').innerHTML = `<div class="alert alert-danger">${err.message}</div>`;
  }
}

async function replyToTicket(id) {
  adminPrompt('Reply to Connect Query / Support Ticket', 'Type your reply message:', '', async (message) => {
    try {
      const d = await apiPost(`/support/${id}/reply`, { message });
      showToast(d.message || 'Reply sent successfully!');
      renderSupport();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}

async function viewTicketReplies(id) {
  try {
    const replies = await apiGet(`/support/${id}/replies`);
    document.getElementById('formModalTitle').textContent = 'Replies History';
    document.getElementById('formModalBody').innerHTML = `
      <div class="d-flex flex-column gap-3 max-height-350 overflow-y-auto" style="max-height:350px; overflow-y:auto; padding-right:5px;">
        ${replies.map(r => `
          <div class="p-3 rounded-3" style="background:var(--bg-dark); border:1px solid var(--border)">
            <div class="d-flex justify-content-between mb-1">
              <strong style="color:var(--text-primary);">${r.sender_name} (${r.sender_role.toUpperCase()})</strong>
              <small class="text-muted">${fmtDate(r.created_at)}</small>
            </div>
            <p class="text-secondary small mb-0" style="white-space:pre-wrap;">${r.message}</p>
          </div>
        `).join('') || '<p class="text-muted text-center py-3">No replies recorded for this ticket.</p>'}
      </div>
      <div class="d-flex justify-content-end mt-4">
        <button class="btn btn-secondary btn-sm" onclick="formModal.hide()">Close</button>
      </div>
    `;
    formModal.show();
  } catch (err) {
    showToast(err.message, 'error');
  }
}
