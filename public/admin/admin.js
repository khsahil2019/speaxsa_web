/* SPEAXA Admin Portal — Complete SPA JavaScript */

const API = '/api';
let token = localStorage.getItem('admin_token');
let adminUser = JSON.parse(localStorage.getItem('admin_user') || 'null');
let currentPage = 'dashboard';
const defaultAvatar = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2NiZDVlMSI+PHBhdGggZD0iTTEyIDEyYzIuMjEgMCA0LTEuNzkgNC00cy0xLjc5LTQtNC00LTQgMS53OS00IDQgMS53OSA0IDQgNHptMCAyYy0yLjY3IDAtOCAxLjM0LTggNHYyaDE2di0yYzAtMi42Ni01LjMzLTQtOC00eiIvPjwvc3ZnPg==';

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
    errEl.textContent = toFriendlyError(err.message);
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
    const avatar = adminUser.photo_url || defaultAvatar;
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
  document.getElementById('toastMsg').textContent = (type === 'error' || type === 'danger') ? toFriendlyError(msg) : msg;
  document.getElementById('toastIcon').className = `fas ${icons[type] || 'fa-info-circle'}`;
  document.getElementById('toastIcon').style.color = colors[type] || '#3CBDB0';
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
    rewards:'Rewards & Allowances',
    refunds:'Refunds', sop:'SOP Review',
    coupons:'Coupon Management', notifications:'Send Notifications',
    settings:'Platform Settings', auditlogs:'Audit Logs', support:'Connect Queries',
    mailmanager:'Mail Manager',
  };
  document.getElementById('pageTitle').textContent = titles[page] || page;
  document.getElementById('pageBreadcrumb').textContent = `Admin / ${titles[page] || page}`;

  const renders = {
    dashboard: renderDashboard, teachers: renderTeachers, students: renderStudents,
    parents: renderParents, courses: renderCourses, batches: renderBatches,
    liveclasses: renderLiveClasses, payments: renderPayments, payouts: renderPayouts,
    rewards: renderRewards,
    refunds: renderRefunds, sop: renderSOP,
    coupons: renderCoupons, notifications: renderNotifications,
    settings: renderSettings, auditlogs: renderAuditLogs, support: renderSupport,
    mailmanager: renderMailManager,
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
  const src = url || defaultAvatar;
  return `<img src="${src}" alt="${name}" style="width:${size}px;height:${size}px;border-radius:50%;border:2px solid var(--primary);background:#1e293b;padding:3px;" onerror="this.src=defaultAvatar">`;
}

function levelBadge(level) {
  const map = {
    'Junior Teacher': 'badge-bronze',
    'Assistant Teacher': 'badge-bronze',
    'Senior Teacher': 'badge-silver',
    'Executive Teacher': 'badge-silver',
    'Lecturer': 'badge-silver',
    'Professor': 'badge-gold',
    'Senior Professor': 'badge-gold',
    'HOD': 'badge-elite',
    'Dean': 'badge-elite',
    'Bronze': 'badge-bronze',
    'Silver': 'badge-silver',
    'Gold': 'badge-gold',
    'Elite Mentor': 'badge-elite',
    'Without Slab': 'badge-pending'
  };
  const val = level || 'Without Slab';
  const badgeClass = map[val] || 'badge-pending';
  return `<span class="${badgeClass}">${val}</span>`;
}

function statusBadge(status) {
  const map = { active:'badge-active', approved:'badge-approved', pending:'badge-pending',
    rejected:'badge-rejected', suspended:'badge-suspended', sop_pending:'badge-pending', pending_approval:'badge-pending', completed:'badge-active' };
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
                  <a href="/live/room.html?classId=${c.id}&role=admin" target="_blank" class="btn btn-xs btn-spx py-1 px-2" style="font-size: 0.75rem; color: #ffffff !important;">
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
            ${t.approval_status === 'suspended' ? `<button class="btn btn-sm btn-success" onclick="unsuspendTeacher('${t.id}')">Unsuspend</button>` : ''}
            <button class="btn btn-sm btn-outline-secondary" onclick="viewTeacher('${t.id}')">View</button>
          </div>
        </td>
      </tr>
    `).join('')
  );
}

async function viewTeacher(id) {
  try {
    const [data, certs] = await Promise.all([
      apiGet(`/admin/teachers/${id}`),
      apiGet(`/admin/teachers/${id}/certificates`)
    ]);
    window.loadedCertificates = certs;
    document.getElementById('formModalTitle').textContent = `Teacher: ${data.teacher?.name}`;
    document.getElementById('formModalBody').innerHTML = `
      <div class="row g-3">
        <div class="col-md-4 text-center">
          ${avatar(data.teacher?.photo_url, data.teacher?.name, 80)}
          <div class="mt-2 fw-bold text-dark">${data.teacher?.name}</div>
          ${levelBadge(data.teacher?.teacher_level)}
          <div class="mt-2">${statusBadge(data.teacher?.approval_status)}</div>
        </div>
        <div class="col-md-8 text-start text-dark">
          <div class="row g-2 text-muted small">
            <div class="col-6"><strong>Email:</strong> ${data.teacher?.email}</div>
            <div class="col-6"><strong>Phone:</strong> ${data.teacher?.phone||'—'}</div>
            <div class="col-6"><strong>Alternative Email:</strong> ${data.teacher?.alt_email||'—'}</div>
            <div class="col-6"><strong>Mobile Number:</strong> ${data.teacher?.mobile_number||'—'}</div>
            <div class="col-6"><strong>LinkedIn:</strong> ${data.teacher?.social_links?.linkedin ? `<a href="${data.teacher?.social_links.linkedin}" target="_blank" class="text-primary text-decoration-none fw-semibold">${data.teacher?.social_links.linkedin}</a>` : '—'}</div>
            <div class="col-6"><strong>Twitter/Social:</strong> ${data.teacher?.social_links?.twitter ? `<a href="${data.teacher?.social_links.twitter}" target="_blank" class="text-primary text-decoration-none fw-semibold">${data.teacher?.social_links.twitter}</a>` : '—'}</div>
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
            <div class="col-12 d-flex justify-content-between align-items-center">
              <strong>Wallet Earning Summary:</strong>
              <button class="btn btn-xs btn-outline-primary py-0.5 px-2" style="font-size:0.7rem; border-radius:4px" onclick="viewTeacherStatement('${data.teacher?.id}')">
                <i class="fas fa-wallet me-1"></i>View Earning Ledger
              </button>
            </div>
            <div class="col-4">Total: ${fmtCurrency(data.wallet?.total_earnings)}</div>
            <div class="col-4">Paid: ${fmtCurrency(data.wallet?.paid_earnings)}</div>
            <div class="col-4">Balance: ${fmtCurrency(data.wallet?.wallet_balance)}</div>
          </div>
          <hr style="border-color:var(--border)">
          <div class="d-flex gap-2 flex-wrap mt-2">
            <button class="btn btn-sm btn-spx" onclick="setTeacherLevel('${data.teacher?.id}')">Set Level</button>
            <button class="btn btn-sm btn-outline-primary" onclick="resetCredentials('${data.teacher?.id}')">Reset Password</button>
            <button class="btn btn-sm btn-outline-secondary" onclick="impersonate('${data.teacher?.id}', 'teacher')">Login As</button>
            ${data.teacher?.approval_status === 'pending' || data.teacher?.approval_status === 'sop_pending' ? `
              <button class="btn btn-sm btn-success" onclick="approveTeacher('${data.teacher?.id}')">Approve</button>
              <button class="btn btn-sm btn-danger" onclick="rejectTeacher('${data.teacher?.id}')">Reject</button>
            ` : ''}
            ${data.teacher?.approval_status === 'approved' ? `
              <button class="btn btn-sm btn-warning" onclick="suspendTeacher('${data.teacher?.id}')">Suspend</button>
            ` : ''}
            ${data.teacher?.approval_status === 'suspended' ? `
              <button class="btn btn-sm btn-success" onclick="unsuspendTeacher('${data.teacher?.id}')">Unsuspend</button>
            ` : ''}
          </div>
        </div>
 
        <div class="col-12 text-start mt-3 pt-3 border-top" style="border-color:var(--border) !important">
          <h6 class="fw-bold mb-3" style="font-family:'Outfit'; font-size:0.95rem; color:var(--primary)"><i class="fas fa-id-card me-1"></i>Uploaded KYC Documents</h6>
          <div class="admin-doc-grid">
            ${['aadhaar','pan','resume','qualification'].map(type => {
              const doc = (data.documents || []).find(d => d.doc_type === type);
              const labels = { aadhaar: 'Aadhaar Card', pan: 'PAN Card', resume: 'Resume / CV', qualification: 'Degree Certificate' };
              return `
                <div class="admin-doc-card">
                  <div>
                    <div class="admin-doc-title text-dark">${labels[type]}</div>
                    <div class="admin-doc-meta">${doc ? fmtDate(doc.uploaded_at) : 'Not Uploaded'}</div>
                  </div>
                  <div class="admin-doc-actions mt-2">
                    ${doc ? `<a href="${doc.file_url}" target="_blank" class="btn btn-xs btn-outline-primary py-1 px-2" style="font-size:0.75rem"><i class="fas fa-eye"></i> View</a>` : `<span class="text-muted small">Missing</span>`}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
 
          <h6 class="fw-bold mt-4 mb-3" style="font-family:'Outfit'; font-size:0.95rem; color:var(--primary)"><i class="fas fa-video me-1"></i>SOP Video & Link Evidence</h6>
          <div class="admin-doc-grid">
            ${[
              { label: 'Camera', url: data.sop?.camera_sop_url },
              { label: 'Lighting', url: data.sop?.lighting_sop_url },
              { label: 'Audio', url: data.sop?.audio_sop_url },
              { label: 'Internet', url: data.sop?.internet_proof_url },
              { label: 'Demo', url: data.sop?.demo_teaching_url }
            ].map(item => `
              <div class="admin-doc-card">
                <div>
                  <div class="admin-doc-title text-dark">${item.label} Proof</div>
                  <div class="admin-doc-meta">${item.url ? 'Submitted' : 'Not Uploaded'}</div>
                </div>
                <div class="admin-doc-actions mt-2">
                  ${item.url ? `<a href="${item.url}" target="_blank" class="btn btn-xs btn-outline-primary py-1 px-2" style="font-size:0.75rem"><i class="fas fa-play"></i> View</a>` : `<span class="text-muted small">Missing</span>`}
                </div>
              </div>
            `).join('')}
          </div>
 
          ${data.sop?.agreement_signed ? `
            <h6 class="fw-bold mt-4 mb-3" style="font-family:'Outfit'; font-size:0.95rem; color:var(--primary)"><i class="fas fa-file-contract me-1"></i>Affidavit of Undertaking</h6>
            <div class="admin-affidavit-preview p-3">
              <div class="stamp-label mb-2">SIGNED UNDER OATH - SPEAXA COMPLIANCE</div>
              <p class="mb-1" style="font-size:0.85rem; color: #000000;">I, <strong>${data.teacher?.name}</strong>, do hereby solemnly declare, depose, and state on oath that I comply with all standard operating procedures, technical lighting, noise levels, and non-solicitation code of conduct rules set by SPEAXA.</p>
              <div class="d-flex justify-content-between mt-2 pt-2 border-top" style="font-size:0.75rem; color: #000000;">
                <div>Signed Name: <code>${data.sop.digital_signature}</code></div>
                <div>Timestamp: ${fmtDate(data.sop.agreement_signed_at)}</div>
              </div>
            </div>
          ` : ''}

          <!-- Issued Certificates Section -->
          <h6 class="fw-bold mt-4 mb-3" style="font-family:'Outfit'; font-size:0.95rem; color:var(--primary)"><i class="fas fa-award me-1"></i>Issued Speaxa Certificates & Accomplishments</h6>
          <div id="adminTeacherCertsContainer" class="d-flex flex-column gap-2 mb-3">
            ${certs.map(cert => `
              <div id="cert-row-${cert.id}" class="p-2 rounded d-flex justify-content-between align-items-center" style="background: rgba(255,255,255,0.05); border: 1px solid var(--border);">
                <div style="flex: 1;">
                  <div class="fw-bold text-dark small"><i class="fas fa-certificate text-warning me-1"></i>${cert.title}</div>
                  <div class="text-muted" style="font-size: 0.72rem;">Type: ${cert.certificate_type} • Issued: ${fmtDate(cert.issued_at)}</div>
                  <p class="mb-0 text-secondary mt-1" style="font-size: 0.76rem; line-height: 1.4;">${cert.description}</p>
                </div>
                <div class="d-flex gap-1 ms-3">
                  <button class="btn btn-xs btn-outline-primary py-1 px-2" style="font-size:0.7rem; white-space:nowrap;" onclick="showEditCertificateForm(event, '${cert.id}', '${id}')">
                    <i class="fas fa-edit"></i> Edit
                  </button>
                  <button class="btn btn-xs btn-outline-danger py-1 px-2" style="font-size:0.7rem; white-space:nowrap;" onclick="revokeCertificate(event, '${cert.id}', '${id}')">
                    <i class="fas fa-trash-alt"></i> Revoke
                  </button>
                </div>
              </div>
            `).join('') || '<div class="text-muted small text-center py-2">No certificates issued yet.</div>'}
          </div>

          <!-- Form to issue manual certificate -->
          <div class="mt-4 p-3 rounded text-dark" style="background: rgba(15, 23, 42, 0.03); border: 1px solid var(--border);">
            <h6 class="fw-bold mb-2 text-dark" style="font-size:0.85rem;"><i class="fas fa-plus-circle me-1"></i>Issue Manual Certificate</h6>
            <div class="row g-2">
              <div class="col-md-6">
                <label class="small text-muted mb-1">Certificate Title</label>
                <input type="text" id="manualCertTitle" class="form-control form-control-sm spx-input" placeholder="e.g. Elite Mentor Performance" style="background:#f8fafc; color:#0f172a; border: 1px solid #cbd5e1;">
              </div>
              <div class="col-md-6">
                <label class="small text-muted mb-1">Certificate Type</label>
                <select id="manualCertType" class="form-select form-select-sm spx-input" style="background:#f8fafc; color:#0f172a; border: 1px solid #cbd5e1;">
                  <option value="custom">Custom Achievement</option>
                  <option value="elite_mentor">Elite Mentor Recognition</option>
                  <option value="special_performance">Special Contribution</option>
                </select>
              </div>
              <div class="col-12">
                <label class="small text-muted mb-1">Certificate Description</label>
                <textarea id="manualCertDesc" class="form-control form-control-sm spx-input" rows="2" placeholder="Describe the achievement and credentials detail..." style="background:#f8fafc; color:#0f172a; border: 1px solid #cbd5e1;"></textarea>
              </div>
              <div class="col-12 d-flex justify-content-end">
                <button type="button" class="btn btn-xs btn-spx mt-2 text-white" onclick="issueManualCertificate('${id}')">Issue Certificate</button>
              </div>
            </div>
          </div>
        </div>
      </div>`;
    formModal.show();
  } catch (err) { showToast(err.message, 'error'); }
}

async function viewTeacherStatement(id) {
  try {
    const data = await apiGet(`/admin/teachers/${id}/wallet/statement`);
    
    // Create ledger modal dynamically if not exists
    let ledgerModal = document.getElementById('ledgerModal');
    if (!ledgerModal) {
      ledgerModal = document.createElement('div');
      ledgerModal.id = 'ledgerModal';
      ledgerModal.className = 'modal fade';
      ledgerModal.tabIndex = -1;
      ledgerModal.innerHTML = `
        <div class="modal-dialog modal-dialog-centered modal-xl">
          <div class="modal-content spx-modal">
            <div class="modal-header">
              <h5 class="modal-title fw-bold" id="ledgerModalTitle" style="color: var(--text-primary);"><i class="fas fa-wallet me-2 text-primary"></i>Earning Statement & Ledger</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body" id="ledgerModalBody"></div>
          </div>
        </div>
      `;
      document.body.appendChild(ledgerModal);
    }

    const bd = data.breakdown || {};
    
    document.getElementById('ledgerModalBody').innerHTML = `
      <!-- Earnings Breakdown Tiles -->
      <div class="row g-3 mb-4">
        <div class="col-md-4 col-sm-6">
          <div class="p-3 rounded border" style="background: rgba(16, 185, 129, 0.05); border-color: rgba(16, 185, 129, 0.2) !important;">
            <div class="text-muted small mb-1 fw-semibold"><i class="fas fa-graduation-cap text-success me-1"></i>Course Share</div>
            <h4 class="fw-bold mb-0 text-success">${fmtCurrency(bd.course_share || 0)}</h4>
          </div>
        </div>
        <div class="col-md-4 col-sm-6">
          <div class="p-3 rounded border" style="background: rgba(168, 85, 247, 0.05); border-color: rgba(168, 85, 247, 0.2) !important;">
            <div class="text-muted small mb-1 fw-semibold"><i class="fas fa-user-graduate text-purple me-1"></i>Student Referrals</div>
            <h4 class="fw-bold mb-0" style="color: #a855f7;">${fmtCurrency(bd.student_referral || 0)}</h4>
          </div>
        </div>
        <div class="col-md-4 col-sm-6">
          <div class="p-3 rounded border" style="background: rgba(99, 102, 241, 0.05); border-color: rgba(99, 102, 241, 0.2) !important;">
            <div class="text-muted small mb-1 fw-semibold"><i class="fas fa-chalkboard-teacher text-indigo me-1"></i>Teacher Referrals</div>
            <h4 class="fw-bold mb-0" style="color: #6366f1;">${fmtCurrency(bd.teacher_referral || 0)}</h4>
          </div>
        </div>
        <div class="col-md-4 col-sm-6">
          <div class="p-3 rounded border" style="background: rgba(245, 158, 11, 0.05); border-color: rgba(245, 158, 11, 0.2) !important;">
            <div class="text-muted small mb-1 fw-semibold"><i class="fas fa-trophy text-warning me-1"></i>Milestone Slabs</div>
            <h4 class="fw-bold mb-0" style="color: #d97706;">${fmtCurrency(bd.slab_reward || 0)}</h4>
          </div>
        </div>
        <div class="col-md-4 col-sm-6">
          <div class="p-3 rounded border" style="background: rgba(236, 72, 153, 0.05); border-color: rgba(236, 72, 153, 0.2) !important;">
            <div class="text-muted small mb-1 fw-semibold"><i class="fas fa-award text-pink me-1"></i>Grooming Allowances</div>
            <h4 class="fw-bold mb-0" style="color: #ec4899;">${fmtCurrency(bd.grooming_allowance || 0)}</h4>
          </div>
        </div>
        <div class="col-md-4 col-sm-6">
          <div class="p-3 rounded border" style="background: rgba(239, 68, 68, 0.05); border-color: rgba(239, 68, 68, 0.2) !important;">
            <div class="text-muted small mb-1 fw-semibold"><i class="fas fa-sign-out-alt text-danger me-1"></i>Payout Withdrawals</div>
            <h4 class="fw-bold mb-0 text-danger">${fmtCurrency(bd.withdrawal || 0)}</h4>
          </div>
        </div>
      </div>

      <!-- Statement Ledger Table -->
      <h6 class="fw-bold mb-3" style="color: var(--text-primary);"><i class="fas fa-history me-1 text-primary"></i>Detailed Transaction Statement Ledger</h6>
      <div class="table-responsive">
        <table class="table spx-table mb-0">
          <thead>
            <tr>
              <th>Date & Time</th>
              <th>Transaction Type</th>
              <th>Details & Description</th>
              <th class="text-end">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${data.statement.map(item => {
              let typeBadge = '';
              let amtColor = '';
              let prefix = '+';
              
              if (item.type === 'course_share') {
                typeBadge = `<span class="badge bg-success-subtle text-success border border-success">Course Share</span>`;
                amtColor = 'text-success';
              } else if (item.type === 'student_referral') {
                typeBadge = `<span class="badge bg-purple-subtle text-purple border border-purple" style="color:#a855f7; border-color:#a855f7 !important;">Student Referral</span>`;
                amtColor = 'text-success';
              } else if (item.type === 'teacher_referral') {
                typeBadge = `<span class="badge bg-indigo-subtle text-indigo border border-indigo" style="color:#6366f1; border-color:#6366f1 !important;">Teacher Referral</span>`;
                amtColor = 'text-success';
              } else if (item.type === 'slab_reward') {
                typeBadge = `<span class="badge bg-warning-subtle text-warning border border-warning">Slab Milestone</span>`;
                amtColor = 'text-success';
              } else if (item.type === 'grooming_allowance') {
                typeBadge = `<span class="badge bg-pink-subtle text-pink border border-pink" style="color:#ec4899; border-color:#ec4899 !important;">Grooming Allowance</span>`;
                amtColor = 'text-success';
              } else if (item.type === 'withdrawal') {
                typeBadge = `<span class="badge bg-danger-subtle text-danger border border-danger">Withdrawal Payout</span>`;
                amtColor = 'text-danger';
                prefix = '-';
              }

              const desc = item.referred_user_name ? `${item.description} (User: ${item.referred_user_name})` : item.description;

              return `
                <tr>
                  <td>${new Date(item.created_at).toLocaleString()}</td>
                  <td>${typeBadge}</td>
                  <td>${desc || '—'}</td>
                  <td class="text-end fw-bold ${amtColor}">${prefix}${fmtCurrency(item.amount)}</td>
                </tr>
              `;
            }).join('') || '<tr><td colspan="4" class="text-center text-muted py-4">No transactions found in ledger statement.</td></tr>'}
          </tbody>
        </table>
      </div>
    `;

    const bsModal = new bootstrap.Modal(ledgerModal);
    bsModal.show();

  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function setTeacherLevel(id) {
  const allowed = [
    'Junior Teacher', 'Assistant Teacher', 'Senior Teacher', 'Executive Teacher',
    'Lecturer', 'Professor', 'Senior Professor', 'HOD', 'Dean'
  ];
  adminPrompt('Set Teacher Level', `Enter level (${allowed.join(' / ')}):`, 'Junior Teacher', async (level) => {
    if (!allowed.includes(level)) { showToast('Invalid level. Please check spelling.', 'error'); return; }
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

async function approveTeacher(id) {
  confirm('Approve Teacher?', 'This will approve the teacher\'s application and allow them to log in.', async () => {
    try {
      const data = await apiPost(`/admin/teachers/${id}/approve`);
      showToast(data.message || 'Teacher approved successfully');
      formModal.hide();
      renderTeachers();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}

async function rejectTeacher(id) {
  adminPrompt('Reject Teacher', 'Enter rejection reason:', '', async (reason) => {
    if (!reason) return;
    try {
      const data = await apiPost(`/admin/teachers/${id}/reject`, { reason });
      showToast(data.message || 'Teacher application rejected');
      formModal.hide();
      renderTeachers();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}

async function suspendTeacher(id) {
  adminPrompt('Suspend Teacher', 'Enter suspension reason:', 'Violation of terms', async (reason) => {
    if (!reason) return;
    try {
      const data = await apiPost(`/admin/teachers/${id}/suspend`, { reason });
      showToast(data.message || 'Teacher suspended successfully');
      formModal.hide();
      renderTeachers();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}

async function unsuspendTeacher(id) {
  confirm('Unsuspend Teacher?', 'This will restore the teacher\'s account to active approved status.', async () => {
    try {
      const data = await apiPost(`/admin/teachers/${id}/unsuspend`);
      showToast(data.message || 'Teacher unsuspended successfully');
      formModal.hide();
      renderTeachers();
    } catch (err) {
      showToast(err.message, 'error');
    }
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
    const [parents, links] = await Promise.all([
      apiGet('/admin/parents'),
      apiGet('/admin/parent-links')
    ]);
    
    document.getElementById('pageContent').innerHTML = `
      <div class="row g-4">
        <div class="col-lg-7">
          <div class="spx-card h-100">
            <h6 class="mb-4 text-white"><i class="fas fa-users me-2 text-primary"></i>All Parents (${parents.length})</h6>
            ${table(
              ['Parent','Email','Phone','Actions'],
              parents.map(p => `
                <tr>
                  <td><div class="d-flex align-items-center gap-2">${avatar(p.photo_url,p.name)}<span class="fw-semibold text-white">${p.name}</span></div></td>
                  <td>${p.email}</td>
                  <td>${p.phone||'—'}</td>
                  <td><button class="btn btn-sm btn-outline-primary" onclick="impersonate('${p.id}','parent')">Login As</button></td>
                </tr>`).join(''),
              true
            )}
          </div>
        </div>
        
        <div class="col-lg-5">
          <div class="spx-card h-100">
            <h6 class="mb-4 text-white"><i class="fas fa-link me-2 text-primary"></i>Parent-Student Connections</h6>
            <div class="table-responsive">
              <table class="spx-table table-sm">
                <thead>
                  <tr>
                    <th>Connection</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  ${links.map(l => {
                    let statusBadge = 'bg-secondary';
                    if (l.status === 'approved') statusBadge = 'bg-success';
                    else if (l.status === 'rejected') statusBadge = 'bg-danger';
                    else if (l.status === 'pending') statusBadge = 'bg-warning text-dark';
                    
                    return `
                      <tr>
                        <td>
                          <div class="small">
                            <span class="text-white fw-bold">Parent:</span> ${l.parent_name}<br>
                            <span class="text-white fw-bold">Student:</span> ${l.student_name}
                          </div>
                        </td>
                        <td><span class="badge ${statusBadge} small" style="font-size: 0.65rem;">${l.status.toUpperCase()}</span></td>
                        <td>
                          ${l.status === 'approved' ? `
                            <button class="btn btn-xs btn-outline-danger" onclick="revertParentLink(${l.id})" style="font-size: 0.7rem; padding: 2px 6px;">Revert Access</button>
                          ` : `
                            <span class="text-muted small">—</span>
                          `}
                        </td>
                      </tr>
                    `;
                  }).join('') || '<tr><td colspan="3" class="text-center text-muted py-3">No connections found.</td></tr>'}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    `;
  } catch (err) {
    document.getElementById('pageContent').innerHTML = `<div class="alert alert-danger">${err.message}</div>`;
  }
}

async function revertParentLink(linkId) {
  if (!confirm('Are you sure you want to revert/revoke this approved parent connection request? This will block the parent\'s access to the student\'s reports.')) return;
  try {
    const res = await apiPost(`/admin/parent-links/${linkId}/revert`);
    showToast(res.message || 'Parent connection reverted successfully');
    await renderParents();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ── Courses ───────────────────────────────────────────────────
async function renderCourses() {
  loading();
  try {
    const courses = await apiGet('/admin/courses');
    window._courses = courses;

    // Initialize filter states on window if not present
    if (window._coursesFilterSearch === undefined) window._coursesFilterSearch = '';
    if (window._coursesFilterStatus === undefined) window._coursesFilterStatus = '';
    if (window._coursesFilterSubject === undefined) window._coursesFilterSubject = '';
    if (window._coursesFilterGrade === undefined) window._coursesFilterGrade = '';
    if (window._coursesFilterSort === undefined) window._coursesFilterSort = 'newest';

    // Dynamically extract unique subjects and grades for filter dropdowns
    const uniqueSubjects = [...new Set(courses.map(c => c.subject).filter(Boolean))].sort();
    const uniqueGrades = [...new Set(courses.map(c => c.grade).filter(Boolean))].sort();

    document.getElementById('pageContent').innerHTML = `
      <!-- Header Action Block -->
      <div class="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h5 class="mb-1 text-white">Course Management</h5>
          <small class="text-muted" id="courseCountBadge">Showing ${courses.length} courses</small>
        </div>
        <button class="btn btn-spx" onclick="showCreateCourse()">
          <i class="fas fa-plus me-2"></i>New Course
        </button>
      </div>

      <!-- Filters & Search Bar Control Center -->
      <div class="course-filter-bar">
        <!-- Search Input -->
        <div class="course-filter-item search-item">
          <label class="spx-label mb-1">Search</label>
          <div class="course-filter-input-group">
            <i class="fas fa-search"></i>
            <input type="text" id="courseFilterSearch" class="form-control spx-input" placeholder="Search title, creator, or tags..." value="${window._coursesFilterSearch}">
          </div>
        </div>

        <!-- Status Filter -->
        <div class="course-filter-item">
          <label class="spx-label mb-1">Status</label>
          <select id="courseFilterStatus" class="form-select spx-input">
            <option value="">All Statuses</option>
            <option value="active" ${window._coursesFilterStatus === 'active' ? 'selected' : ''}>Active</option>
            <option value="pending_approval" ${window._coursesFilterStatus === 'pending_approval' ? 'selected' : ''}>Pending Approval</option>
            <option value="rejected" ${window._coursesFilterStatus === 'rejected' ? 'selected' : ''}>Rejected</option>
            <option value="archived" ${window._coursesFilterStatus === 'archived' ? 'selected' : ''}>Archived</option>
          </select>
        </div>

        <!-- Subject Filter -->
        <div class="course-filter-item">
          <label class="spx-label mb-1">Subject</label>
          <select id="courseFilterSubject" class="form-select spx-input">
            <option value="">All Subjects</option>
            ${uniqueSubjects.map(s => `<option value="${s}" ${window._coursesFilterSubject === s ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
        </div>

        <!-- Grade Filter -->
        <div class="course-filter-item">
          <label class="spx-label mb-1">Grade</label>
          <select id="courseFilterGrade" class="form-select spx-input">
            <option value="">All Grades</option>
            ${uniqueGrades.map(g => `<option value="${g}" ${window._coursesFilterGrade === g ? 'selected' : ''}>${g}</option>`).join('')}
          </select>
        </div>

        <!-- Sorting -->
        <div class="course-filter-item">
          <label class="spx-label mb-1">Sort By</label>
          <select id="courseFilterSort" class="form-select spx-input">
            <option value="newest" ${window._coursesFilterSort === 'newest' ? 'selected' : ''}>Newest First</option>
            <option value="oldest" ${window._coursesFilterSort === 'oldest' ? 'selected' : ''}>Oldest First</option>
            <option value="price_asc" ${window._coursesFilterSort === 'price_asc' ? 'selected' : ''}>Price: Low to High</option>
            <option value="price_desc" ${window._coursesFilterSort === 'price_desc' ? 'selected' : ''}>Price: High to Low</option>
            <option value="alphabetical" ${window._coursesFilterSort === 'alphabetical' ? 'selected' : ''}>Title: A-Z</option>
          </select>
        </div>

        <!-- Reset Button -->
        <div class="course-filter-item btn-item align-self-end">
          <button class="btn btn-secondary w-100" onclick="resetCourseFilters()" title="Reset Filters">
            <i class="fas fa-undo"></i>
          </button>
        </div>
      </div>

      <!-- Courses Card Grid Container -->
      <div class="course-grid" id="courseCardsGrid"></div>
    `;

    // Wire up events dynamically to prevent inline pollution
    document.getElementById('courseFilterSearch').addEventListener('input', e => handleCourseFilterChange('search', e.target.value));
    document.getElementById('courseFilterStatus').addEventListener('change', e => handleCourseFilterChange('status', e.target.value));
    document.getElementById('courseFilterSubject').addEventListener('change', e => handleCourseFilterChange('subject', e.target.value));
    document.getElementById('courseFilterGrade').addEventListener('change', e => handleCourseFilterChange('grade', e.target.value));
    document.getElementById('courseFilterSort').addEventListener('change', e => handleCourseFilterChange('sort', e.target.value));

    // Initial grid render
    filterAndRenderCourseCards();
  } catch (err) {
    document.getElementById('pageContent').innerHTML = `<div class="alert alert-danger">${err.message}</div>`;
  }
}

function handleCourseFilterChange(type, val) {
  if (type === 'search') window._coursesFilterSearch = val;
  if (type === 'status') window._coursesFilterStatus = val;
  if (type === 'subject') window._coursesFilterSubject = val;
  if (type === 'grade') window._coursesFilterGrade = val;
  if (type === 'sort') window._coursesFilterSort = val;
  filterAndRenderCourseCards();
}

function resetCourseFilters() {
  window._coursesFilterSearch = '';
  window._coursesFilterStatus = '';
  window._coursesFilterSubject = '';
  window._coursesFilterGrade = '';
  window._coursesFilterSort = 'newest';

  const sInput = document.getElementById('courseFilterSearch');
  const statSelect = document.getElementById('courseFilterStatus');
  const subjSelect = document.getElementById('courseFilterSubject');
  const grSelect = document.getElementById('courseFilterGrade');
  const sortSelect = document.getElementById('courseFilterSort');

  if (sInput) sInput.value = '';
  if (statSelect) statSelect.value = '';
  if (subjSelect) subjSelect.value = '';
  if (grSelect) grSelect.value = '';
  if (sortSelect) sortSelect.value = 'newest';

  filterAndRenderCourseCards();
}

function filterAndRenderCourseCards() {
  const gridEl = document.getElementById('courseCardsGrid');
  if (!gridEl) return;

  const courses = window._courses || [];
  const searchVal = (window._coursesFilterSearch || '').toLowerCase().trim();
  const statusVal = window._coursesFilterStatus || '';
  const subjectVal = window._coursesFilterSubject || '';
  const gradeVal = window._coursesFilterGrade || '';
  const sortVal = window._coursesFilterSort || 'newest';

  // Apply filters
  let filtered = courses.filter(c => {
    if (searchVal) {
      const matchTitle = (c.title || '').toLowerCase().includes(searchVal);
      const matchCreator = (c.teacher_name || '').toLowerCase().includes(searchVal);
      const matchTag = (c.custom_tag || '').toLowerCase().includes(searchVal);
      const matchSubj = (c.subject || '').toLowerCase().includes(searchVal);
      if (!matchTitle && !matchCreator && !matchTag && !matchSubj) return false;
    }
    if (statusVal && c.status !== statusVal) return false;
    if (subjectVal && c.subject !== subjectVal) return false;
    if (gradeVal && c.grade !== gradeVal) return false;
    return true;
  });

  // Apply sorting
  if (sortVal === 'newest') {
    filtered.sort((a, b) => b.id - a.id);
  } else if (sortVal === 'oldest') {
    filtered.sort((a, b) => a.id - b.id);
  } else if (sortVal === 'price_asc') {
    filtered.sort((a, b) => (parseFloat(a.fees) || 0) - (parseFloat(b.fees) || 0));
  } else if (sortVal === 'price_desc') {
    filtered.sort((a, b) => (parseFloat(b.fees) || 0) - (parseFloat(a.fees) || 0));
  } else if (sortVal === 'alphabetical') {
    filtered.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
  }

  // Update count badge
  const countBadge = document.getElementById('courseCountBadge');
  if (countBadge) {
    countBadge.textContent = `Showing ${filtered.length} of ${courses.length} courses`;
  }

  if (filtered.length === 0) {
    gridEl.innerHTML = `
      <div class="w-100 text-center py-5" style="grid-column: 1 / -1;">
        <div class="text-muted mb-3" style="font-size: 2.8rem;"><i class="fas fa-search-minus"></i></div>
        <h5 class="text-secondary fw-semibold">No courses match your search or filters</h5>
        <p class="text-muted small">Try adjusting your terms or resetting your selections above.</p>
        <button class="btn btn-secondary btn-sm mt-2" onclick="resetCourseFilters()">
          <i class="fas fa-undo me-1"></i>Reset Filters
        </button>
      </div>
    `;
    return;
  }

  gridEl.innerHTML = filtered.map(c => {
    const creatorAvatar = c.teacher_photo || defaultAvatar;

    // Determine status badge classes
    let badgeClass = 'badge-pending';
    let label = 'Draft';
    if (c.status === 'active' || c.status === 'approved') {
      badgeClass = 'badge-approved';
      label = 'Active';
    } else if (c.status === 'rejected') {
      badgeClass = 'badge-rejected';
      label = 'Rejected';
    } else if (c.status === 'archived') {
      badgeClass = 'badge-suspended';
      label = 'Archived';
    }

    const creatorHtml = c.teacher_name
      ? `<a href="javascript:void(0)" class="course-card-creator-link" onclick="viewCourseTeacher('${c.id}')">${c.teacher_name}</a>`
      : '<span class="text-muted">Administrator</span>';

    // Banner logic
    let bannerContent = '';
    if (c.thumbnail_url) {
      bannerContent = `<img src="${c.thumbnail_url}" alt="${c.title}" onerror="this.onerror=null; this.parentNode.innerHTML=getPlaceholderBanner('${c.subject || 'Course'}')">`;
    } else {
      bannerContent = getPlaceholderBanner(c.subject || 'Course');
    }

    return `
      <div class="course-premium-card" id="course-card-${c.id}">
        <div class="course-card-banner">
          ${bannerContent}
          <div class="course-card-status-overlay">
            <span class="badge ${badgeClass}">${label}</span>
          </div>
          <div class="course-card-badges-overlay">
            <span class="course-card-badge-clickable" style="background: ${c.is_verified ? 'rgba(16, 185, 129, 0.9)' : 'rgba(15, 23, 42, 0.75)'}; color: #ffffff;" onclick="toggleCourseVerified('${c.id}')" title="Click to toggle verified status">
              <i class="fas ${c.is_verified ? 'fa-check-circle' : 'fa-minus-circle'}"></i> ${c.is_verified ? 'Verified' : 'Unverified'}
            </span>
            <span class="course-card-badge-clickable" style="background: ${c.is_featured ? 'rgba(245, 158, 11, 0.9)' : 'rgba(15, 23, 42, 0.75)'}; color: #ffffff;" onclick="toggleCourseFeatured('${c.id}')" title="Click to toggle featured status">
              <i class="fas ${c.is_featured ? 'fa-fire' : 'fa-star'}"></i> ${c.is_featured ? 'Featured' : 'Standard'}
            </span>
          </div>
        </div>

        <div class="course-card-body">
          <div>
            <div class="course-card-tags">
              ${c.subject ? `<span class="course-pill subject-pill">${c.subject}</span>` : ''}
              ${c.grade ? `<span class="course-pill grade-pill">${c.grade}</span>` : ''}
              ${c.board ? `<span class="course-pill">${c.board}</span>` : ''}
              ${c.custom_tag ? `<span class="course-pill" style="border-color: rgba(60,189,176,0.3); background: rgba(60,189,176,0.04); color: var(--primary-dark); font-size: 0.65rem;">${c.custom_tag}</span>` : ''}
            </div>

            <h6 class="course-card-title" title="${c.title}">${c.title}</h6>
            <div class="course-card-creator">
              <img src="${creatorAvatar}" alt="Creator avatar" onerror="this.src=defaultAvatar">
              <div>Creator: ${creatorHtml}</div>
            </div>

            ${c.status === 'pending_approval' && c.teacher_name ? `
              <div class="course-card-review-panel">
                <div class="course-card-review-header">
                  <i class="fas fa-clipboard-check"></i> Teacher Profile details
                </div>
                <div>Qualification: <strong>${c.teacher_qualification || '—'}</strong></div>
                <div>Experience: <strong>${c.teacher_experience || 0} Years</strong> (${c.teacher_level || 'Bronze'})</div>
                <div class="text-muted mt-1 text-truncate" style="max-width: 100%; cursor: help;" title="${c.teacher_bio || ''}">
                  Bio: ${c.teacher_bio || '—'}
                </div>
              </div>
            ` : ''}
          </div>

          <div>
            <div class="course-card-metadata">
              <div class="course-card-meta-item" title="Learning Duration: ${c.learning_duration || '—'}">
                <i class="fas fa-calendar-alt"></i> <span>${c.learning_duration || '—'}</span>
              </div>
              <div class="course-card-meta-item" title="Daily Class Duration: ${c.daily_class_duration || '—'}">
                <i class="fas fa-clock"></i> <span>${c.daily_class_duration || '—'}</span>
              </div>
              <div class="course-card-meta-item" title="Language of Instruction: ${c.language_instruction || '—'}">
                <i class="fas fa-globe"></i> <span>${c.language_instruction || '—'}</span>
              </div>
              <div class="course-card-meta-item" title="Assessment Days: ${c.assessment_days || '—'}">
                <i class="fas fa-tasks"></i> <span>${c.assessment_days || '—'}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="course-card-footer">
          <div class="course-card-price">${fmtCurrency(c.fees)}</div>
          <div class="course-card-actions">
            ${c.status === 'pending_approval' ? `
              <button class="btn btn-sm btn-success py-1.5 px-2.5" style="font-size:0.75rem;" onclick="approveCourse('${c.id}')" title="Approve Course">
                <i class="fas fa-check"></i> Approve
              </button>
              <button class="btn btn-sm btn-danger py-1.5 px-2.5" style="font-size:0.75rem;" onclick="rejectCourse('${c.id}')" title="Reject Course">
                <i class="fas fa-times"></i> Reject
              </button>
            ` : ''}
            <button class="btn btn-sm btn-outline-secondary py-1.5 px-2.5" style="font-size:0.75rem;" onclick="editCourse('${c.id}')" title="Edit Course">
              <i class="fas fa-edit"></i> Edit
            </button>
            ${c.status === 'archived' ? `
              <button class="btn btn-sm btn-outline-success py-1.5 px-2.5" style="font-size:0.75rem;" onclick="unarchiveCourse('${c.id}')" title="Unarchive Course">
                <i class="fas fa-undo"></i> Restore
              </button>
            ` : `
              <button class="btn btn-sm btn-outline-danger py-1.5 px-2.5" style="font-size:0.75rem;" onclick="archiveCourse('${c.id}')" title="Archive Course">
                <i class="fas fa-archive"></i> Archive
              </button>
            `}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function getPlaceholderBanner(subject) {
  let hash = 0;
  for (let i = 0; i < subject.length; i++) {
    hash = subject.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = [
    ['#3CBDB0', '#0F766E'], // Teal
    ['#3B82F6', '#1D4ED8'], // Blue
    ['#8B5CF6', '#5B21B6'], // Purple
    ['#EC4899', '#9D174D'], // Pink
    ['#F59E0B', '#B45309'], // Amber
    ['#10B981', '#065F46'], // Emerald
  ];
  const colorIndex = Math.abs(hash) % colors.length;
  const gradient = `linear-gradient(135deg, ${colors[colorIndex][0]}40, ${colors[colorIndex][1]}60)`;
  const icon = getSubjectIcon(subject);
  return `
    <div class="course-banner-placeholder" style="background: ${gradient}">
      <i class="${icon}"></i>
      <span class="fw-bold d-block text-white" style="letter-spacing: 0.5px; font-size: 1.1rem; text-shadow: 0 2px 4px rgba(0,0,0,0.25);">${subject}</span>
    </div>
  `;
}

function getSubjectIcon(subject) {
  const s = subject.toLowerCase();
  if (s.includes('math') || s.includes('algebra') || s.includes('geometry') || s.includes('calculus')) return 'fas fa-calculator';
  if (s.includes('physic')) return 'fas fa-atom';
  if (s.includes('chem')) return 'fas fa-flask';
  if (s.includes('biolog') || s.includes('science') || s.includes('evs')) return 'fas fa-dna';
  if (s.includes('english') || s.includes('gram') || s.includes('languag') || s.includes('hindi') || s.includes('french') || s.includes('german')) return 'fas fa-language';
  if (s.includes('history') || s.includes('social') || s.includes('geograph') || s.includes('civics')) return 'fas fa-globe-americas';
  if (s.includes('cod') || s.includes('comput') || s.includes('program') || s.includes('tech')) return 'fas fa-code';
  return 'fas fa-book-open';
}


function showCreateCourse() {
  window._currentThumbnailUrl = '';
  document.getElementById('formModalTitle').textContent = 'Create New Course';
  document.getElementById('formModalBody').innerHTML = `
    <form id="courseForm">
      <div class="row g-3">
        <div class="col-md-8">
          <label class="spx-label mb-0">Course Title *</label>
          <small class="text-muted d-block mb-1" style="font-size: 0.72rem; line-height: 1.2;">Give the course a clear name that describes the core topic and target grade level.</small>
          <input class="form-control spx-input" id="courseTitle" placeholder="e.g. Class 10 Physics Complete Masterclass" required>
        </div>
        <div class="col-md-4">
          <label class="spx-label mb-0">Subject *</label>
          <small class="text-muted d-block mb-1" style="font-size: 0.72rem; line-height: 1.2;">Enter the primary subject area.</small>
          <input class="form-control spx-input" id="courseSubject" placeholder="e.g. Physics, Math, Chemistry" required>
        </div>
        <div class="col-md-5">
          <label class="spx-label mb-0">Grade *</label>
          <small class="text-muted d-block mb-1" style="font-size: 0.72rem; line-height: 1.2;">Target student grade or class level.</small>
          <select class="form-select spx-input" id="courseGrade" required>
            <option value="">Select Grade</option>
            ${['Class 6','Class 7','Class 8','Class 9','Class 10','Class 11','Class 12'].map(g => `<option>${g}</option>`).join('')}
          </select>
        </div>
        <div class="col-md-5">
          <label class="spx-label mb-0">Board *</label>
          <small class="text-muted d-block mb-1" style="font-size: 0.72rem; line-height: 1.2;">Curriculum alignment standard.</small>
          <select class="form-select spx-input" id="courseBoard" required>
            <option value="">Select Board</option>
            <option>CBSE</option><option>ICSE</option><option>State Board</option>
          </select>
        </div>
        <div class="col-md-2">
          <label class="spx-label mb-0">Fees (₹) *</label>
          <small class="text-muted d-block mb-1" style="font-size: 0.72rem; line-height: 1.2;">Pricing amount.</small>
          <input class="form-control spx-input" id="courseFees" type="number" placeholder="e.g. 599" required>
        </div>
        
        <div class="col-md-6">
          <label class="spx-label mb-0">Learning Duration *</label>
          <small class="text-muted d-block mb-1" style="font-size: 0.72rem; line-height: 1.2;">Specify total duration (e.g. months, weeks, or live hours).</small>
          <input class="form-control spx-input" id="courseLearningDuration" placeholder="e.g. 3 Months / 24 Live Hours" required>
        </div>
        <div class="col-md-6">
          <label class="spx-label mb-0">Language of Instruction *</label>
          <small class="text-muted d-block mb-1" style="font-size: 0.72rem; line-height: 1.2;">Primary language used for classroom lectures.</small>
          <input class="form-control spx-input" id="courseLanguageInstruction" placeholder="e.g. English, Hindi, Bilingual" required>
        </div>
        <div class="col-md-6">
          <label class="spx-label mb-0">Daily Class Duration *</label>
          <small class="text-muted d-block mb-1" style="font-size: 0.72rem; line-height: 1.2;">Length of a single live class session.</small>
          <input class="form-control spx-input" id="courseDailyClassDuration" placeholder="e.g. 60 Minutes per session" required>
        </div>
        <div class="col-md-6">
          <label class="spx-label mb-0">Assessment Days *</label>
          <small class="text-muted d-block mb-1" style="font-size: 0.72rem; line-height: 1.2;">Days or frequency scheduled for tests/evaluations.</small>
          <input class="form-control spx-input" id="courseAssessmentDays" placeholder="e.g. Saturdays, End of each module" required>
        </div>
        <div class="col-md-6">
          <label class="spx-label mb-0">Objective *</label>
          <small class="text-muted d-block mb-1" style="font-size: 0.72rem; line-height: 1.2;">Explain the core goal and what students will achieve.</small>
          <textarea class="form-control spx-input" id="courseObjective" rows="2" placeholder="e.g. Master fundamental algebra concepts and equation solving..." required></textarea>
        </div>
        <div class="col-md-6">
          <label class="spx-label mb-0">Learning Outcome *</label>
          <small class="text-muted d-block mb-1" style="font-size: 0.72rem; line-height: 1.2;">List the specific skills/knowledge students will acquire.</small>
          <textarea class="form-control spx-input" id="courseLearningOutcome" rows="2" placeholder="e.g. Students will be able to solve quadratic equations independently..." required></textarea>
        </div>

        <div class="col-md-12">
          <label class="spx-label mb-0">Custom Badge / Tag Line *</label>
          <small class="text-muted d-block mb-1" style="font-size: 0.72rem; line-height: 1.2;">A premium tag overlay to show on the course details card.</small>
          <input class="form-control spx-input" id="courseCustomTag" placeholder="e.g. Designed by Priya Ma'am" required>
        </div>
        
        <!-- Course Banner Image Upload -->
        <div class="col-12">
          <label class="spx-label mb-0">Course Banner / Thumbnail *</label>
          <small class="text-muted d-block mb-1" style="font-size: 0.72rem; line-height: 1.2;">Upload a high-quality cover image for the course listing (Max 5MB).</small>
          <div class="course-upload-box position-relative d-flex flex-column align-items-center justify-content-center p-4 border border-dashed rounded text-center" style="min-height: 150px; cursor: pointer;" onclick="document.getElementById('courseFileInput').click()">
            <input type="file" id="courseFileInput" accept="image/*" class="d-none" onchange="handleCourseFileSelect(this)">
            <div id="courseUploadPlaceholder">
              <i class="fas fa-cloud-upload-alt text-primary mb-2" style="font-size: 2rem;"></i>
              <p class="mb-0 text-secondary small fw-semibold">Click to upload course banner</p>
              <small class="text-muted" style="font-size: 0.75rem;">JPG, PNG or WebP (Max 5MB)</small>
            </div>
            <div id="courseUploadPreviewContainer" class="position-relative d-none" style="max-height: 160px; width: 100%;">
              <img id="courseUploadPreview" src="" style="max-height: 150px; width: 100%; object-fit: cover; border-radius: var(--radius-sm);" />
              <button type="button" class="btn btn-danger btn-sm position-absolute top-0 end-0 m-2" style="padding: 4px 8px; font-size: 0.75rem;" onclick="removeCourseThumbnail(event)">
                <i class="fas fa-trash-alt"></i> Remove
              </button>
            </div>
            <div id="courseUploadSpinner" class="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center d-none" style="background: rgba(255,255,255,0.8); z-index: 10; border-radius: var(--radius-md);">
              <div class="spinner-border text-primary" role="status"></div>
            </div>
          </div>
        </div>

        <div class="col-12">
          <label class="spx-label mb-0">Description *</label>
          <small class="text-muted d-block mb-1" style="font-size: 0.72rem; line-height: 1.2;">Provide a comprehensive overview of course contents, modules, and requirements.</small>
          <textarea class="form-control spx-input" id="courseDesc" rows="3" placeholder="Enter course description details..." required></textarea>
        </div>
        <div class="col-12"><button type="submit" class="btn btn-spx w-100">Create Course</button></div>
      </div>
    </form>`;
  document.getElementById('courseForm').onsubmit = createCourse;
  formModal.show();
  setupAutoSave('autosave_admin_course_create', [
    'courseTitle', 'courseSubject', 'courseGrade', 'courseBoard', 'courseFees',
    'courseLearningDuration', 'courseLanguageInstruction', 'courseDailyClassDuration', 'courseAssessmentDays',
    'courseObjective', 'courseLearningOutcome', 'courseCustomTag', 'courseDesc'
  ], 'formModal');
}

async function createCourse(e) {
  e.preventDefault();
  const customTag = document.getElementById('courseCustomTag').value.trim();
  if (!customTag) {
    showToast('Custom Tag Line is required', 'error');
    return;
  }
  if (!window._currentThumbnailUrl) {
    showToast('Course Thumbnail / Banner image is required', 'error');
    return;
  }
  try {
    const data = await apiPost('/admin/courses', {
      title: document.getElementById('courseTitle').value,
      subject: document.getElementById('courseSubject').value,
      grade: document.getElementById('courseGrade').value,
      board: document.getElementById('courseBoard').value,
      duration_weeks: parseInt(document.getElementById('courseLearningDuration').value) || 12,
      fees: parseFloat(document.getElementById('courseFees').value),
      description: document.getElementById('courseDesc').value,
      thumbnail_url: window._currentThumbnailUrl,
      custom_tag: customTag,
      learning_duration: document.getElementById('courseLearningDuration').value,
      objective: document.getElementById('courseObjective').value,
      learning_outcome: document.getElementById('courseLearningOutcome').value,
      language_instruction: document.getElementById('courseLanguageInstruction').value,
      daily_class_duration: document.getElementById('courseDailyClassDuration').value,
      assessment_days: document.getElementById('courseAssessmentDays').value
    });
    showToast(data.message || 'Course created');
    clearAutoSave('autosave_admin_course_create');
    formModal.hide();
    renderCourses();
  } catch (err) {
    showToast(err.message, 'error');
    highlightFormFieldError(document.getElementById('courseForm'), err.message);
  }
}

function editCourse(id) {
  const course = (window._courses || []).find(c => c.id === id);
  if (!course) {
    showToast('Course not found', 'error');
    return;
  }
  
  window._currentThumbnailUrl = course.thumbnail_url || '';
 
  document.getElementById('formModalTitle').textContent = 'Edit Course';
  document.getElementById('formModalBody').innerHTML = `
    <form id="courseForm">
      <div class="row g-3">
        <div class="col-md-8">
          <label class="spx-label mb-0">Course Title *</label>
          <small class="text-muted d-block mb-1" style="font-size: 0.72rem; line-height: 1.2;">Give the course a clear name that describes the core topic and target grade level.</small>
          <input class="form-control spx-input" id="courseTitle" required value="${course.title || ''}" placeholder="e.g. Class 10 Physics Complete Masterclass">
        </div>
        <div class="col-md-4">
          <label class="spx-label mb-0">Subject *</label>
          <small class="text-muted d-block mb-1" style="font-size: 0.72rem; line-height: 1.2;">Enter the primary subject area.</small>
          <input class="form-control spx-input" id="courseSubject" value="${course.subject || ''}" placeholder="e.g. Physics, Math, Chemistry" required>
        </div>
        <div class="col-md-5">
          <label class="spx-label mb-0">Grade *</label>
          <small class="text-muted d-block mb-1" style="font-size: 0.72rem; line-height: 1.2;">Target student grade or class level.</small>
          <select class="form-select spx-input" id="courseGrade" required>
            <option value="">Select Grade</option>
            ${['Class 6','Class 7','Class 8','Class 9','Class 10','Class 11','Class 12'].map(g => `<option ${course.grade === g ? 'selected' : ''}>${g}</option>`).join('')}
          </select>
        </div>
        <div class="col-md-5">
          <label class="spx-label mb-0">Board *</label>
          <small class="text-muted d-block mb-1" style="font-size: 0.72rem; line-height: 1.2;">Curriculum alignment standard.</small>
          <select class="form-select spx-input" id="courseBoard" required>
            <option value="">Select Board</option>
            <option ${course.board === 'CBSE' ? 'selected' : ''}>CBSE</option>
            <option ${course.board === 'ICSE' ? 'selected' : ''}>ICSE</option>
            <option ${course.board === 'State Board' ? 'selected' : ''}>State Board</option>
          </select>
        </div>
        <div class="col-md-2">
          <label class="spx-label mb-0">Fees (₹) *</label>
          <small class="text-muted d-block mb-1" style="font-size: 0.72rem; line-height: 1.2;">Pricing amount.</small>
          <input class="form-control spx-input" id="courseFees" type="number" required value="${course.fees || ''}" placeholder="e.g. 599">
        </div>
        
        <div class="col-md-6">
          <label class="spx-label mb-0">Learning Duration *</label>
          <small class="text-muted d-block mb-1" style="font-size: 0.72rem; line-height: 1.2;">Specify total duration (e.g. months, weeks, or live hours).</small>
          <input class="form-control spx-input" id="courseLearningDuration" placeholder="e.g. 3 Months / 24 Live Hours" required value="${course.learning_duration || ''}">
        </div>
        <div class="col-md-6">
          <label class="spx-label mb-0">Language of Instruction *</label>
          <small class="text-muted d-block mb-1" style="font-size: 0.72rem; line-height: 1.2;">Primary language used for classroom lectures.</small>
          <input class="form-control spx-input" id="courseLanguageInstruction" placeholder="e.g. English, Hindi, Bilingual" required value="${course.language_instruction || ''}">
        </div>
        <div class="col-md-6">
          <label class="spx-label mb-0">Daily Class Duration *</label>
          <small class="text-muted d-block mb-1" style="font-size: 0.72rem; line-height: 1.2;">Length of a single live class session.</small>
          <input class="form-control spx-input" id="courseDailyClassDuration" placeholder="e.g. 60 Minutes per session" required value="${course.daily_class_duration || ''}">
        </div>
        <div class="col-md-6">
          <label class="spx-label mb-0">Assessment Days *</label>
          <small class="text-muted d-block mb-1" style="font-size: 0.72rem; line-height: 1.2;">Days or frequency scheduled for tests/evaluations.</small>
          <input class="form-control spx-input" id="courseAssessmentDays" placeholder="e.g. Saturdays, End of each module" required value="${course.assessment_days || ''}">
        </div>
        <div class="col-md-6">
          <label class="spx-label mb-0">Objective *</label>
          <small class="text-muted d-block mb-1" style="font-size: 0.72rem; line-height: 1.2;">Explain the core goal and what students will achieve.</small>
          <textarea class="form-control spx-input" id="courseObjective" rows="2" placeholder="e.g. Master fundamental algebra concepts and equation solving..." required>${course.objective || ''}</textarea>
        </div>
        <div class="col-md-6">
          <label class="spx-label mb-0">Learning Outcome *</label>
          <small class="text-muted d-block mb-1" style="font-size: 0.72rem; line-height: 1.2;">List the specific skills/knowledge students will acquire.</small>
          <textarea class="form-control spx-input" id="courseLearningOutcome" rows="2" placeholder="e.g. Students will be able to solve quadratic equations independently..." required>${course.learning_outcome || ''}</textarea>
        </div>

        <div class="col-md-12">
          <label class="spx-label mb-0">Custom Badge / Tag Line *</label>
          <small class="text-muted d-block mb-1" style="font-size: 0.72rem; line-height: 1.2;">A premium tag overlay to show on the course details card.</small>
          <input class="form-control spx-input" id="courseCustomTag" placeholder="e.g. Designed by Priya Ma'am" value="${course.custom_tag || ''}" required>
        </div>
        
        <!-- Course Banner Image Upload -->
        <div class="col-12">
          <label class="spx-label mb-0">Course Banner / Thumbnail *</label>
          <small class="text-muted d-block mb-1" style="font-size: 0.72rem; line-height: 1.2;">Upload a high-quality cover image for the course listing (Max 5MB).</small>
          <div class="course-upload-box position-relative d-flex flex-column align-items-center justify-content-center p-4 border border-dashed rounded text-center" style="min-height: 150px; cursor: pointer;" onclick="document.getElementById('courseFileInput').click()">
            <input type="file" id="courseFileInput" accept="image/*" class="d-none" onchange="handleCourseFileSelect(this)">
            <div id="courseUploadPlaceholder" class="${window._currentThumbnailUrl ? 'd-none' : ''}">
              <i class="fas fa-cloud-upload-alt text-primary mb-2" style="font-size: 2rem;"></i>
              <p class="mb-0 text-secondary small fw-semibold">Click to upload course banner</p>
              <small class="text-muted" style="font-size: 0.75rem;">JPG, PNG or WebP (Max 5MB)</small>
            </div>
            <div id="courseUploadPreviewContainer" class="position-relative ${window._currentThumbnailUrl ? '' : 'd-none'}" style="max-height: 160px; width: 100%;">
              <img id="courseUploadPreview" src="${window._currentThumbnailUrl || ''}" style="max-height: 150px; width: 100%; object-fit: cover; border-radius: var(--radius-sm);" />
              <button type="button" class="btn btn-danger btn-sm position-absolute top-0 end-0 m-2" style="padding: 4px 8px; font-size: 0.75rem;" onclick="removeCourseThumbnail(event)">
                <i class="fas fa-trash-alt"></i> Remove
              </button>
            </div>
            <div id="courseUploadSpinner" class="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center d-none" style="background: rgba(255,255,255,0.8); z-index: 10; border-radius: var(--radius-md);">
              <div class="spinner-border text-primary" role="status"></div>
            </div>
          </div>
        </div>

        <div class="col-12">
          <label class="spx-label mb-0">Description *</label>
          <small class="text-muted d-block mb-1" style="font-size: 0.72rem; line-height: 1.2;">Provide a comprehensive overview of course contents, modules, and requirements.</small>
          <textarea class="form-control spx-input" id="courseDesc" rows="3" placeholder="Enter course description details..." required>${course.description || ''}</textarea>
        </div>
        <div class="col-12"><button type="submit" class="btn btn-spx w-100">Update Course</button></div>
      </div>
    </form>`;
  document.getElementById('courseForm').onsubmit = (e) => updateCourse(e, id);
  formModal.show();
  setupAutoSave('autosave_admin_course_edit_' + id, [
    'courseTitle', 'courseSubject', 'courseGrade', 'courseBoard', 'courseFees',
    'courseLearningDuration', 'courseLanguageInstruction', 'courseDailyClassDuration', 'courseAssessmentDays',
    'courseObjective', 'courseLearningOutcome', 'courseCustomTag', 'courseDesc'
  ], 'formModal');
}

async function updateCourse(e, id) {
  e.preventDefault();
  const customTag = document.getElementById('courseCustomTag').value.trim();
  if (!customTag) {
    showToast('Custom Tag Line is required', 'error');
    return;
  }
  if (!window._currentThumbnailUrl) {
    showToast('Course Thumbnail / Banner image is required', 'error');
    return;
  }
  try {
    const data = await apiPut(`/admin/courses/${id}`, {
      title: document.getElementById('courseTitle').value,
      subject: document.getElementById('courseSubject').value,
      grade: document.getElementById('courseGrade').value,
      board: document.getElementById('courseBoard').value,
      duration_weeks: parseInt(document.getElementById('courseLearningDuration').value) || 12,
      fees: parseFloat(document.getElementById('courseFees').value),
      description: document.getElementById('courseDesc').value,
      thumbnail_url: window._currentThumbnailUrl,
      custom_tag: customTag,
      learning_duration: document.getElementById('courseLearningDuration').value,
      objective: document.getElementById('courseObjective').value,
      learning_outcome: document.getElementById('courseLearningOutcome').value,
      language_instruction: document.getElementById('courseLanguageInstruction').value,
      daily_class_duration: document.getElementById('courseDailyClassDuration').value,
      assessment_days: document.getElementById('courseAssessmentDays').value
    });
    showToast(data.message || 'Course updated');
    clearAutoSave('autosave_admin_course_edit_' + id);
    formModal.hide();
    renderCourses();
  } catch (err) {
    showToast(err.message, 'error');
    highlightFormFieldError(document.getElementById('courseForm'), err.message);
  }
}

async function uploadCourseThumbnail(file) {
  const formData = new FormData();
  formData.append('thumbnail', file);
  
  const res = await fetch(`${API}/admin/courses/upload-thumbnail`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData
  });
  if (res.status === 401) { handleLogout(); throw new Error('Session expired'); }
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to upload thumbnail');
  }
  return res.json();
}

async function handleCourseFileSelect(input) {
  const file = input.files[0];
  if (!file) return;

  const spinner = document.getElementById('courseUploadSpinner');
  const placeholder = document.getElementById('courseUploadPlaceholder');
  const previewContainer = document.getElementById('courseUploadPreviewContainer');
  const preview = document.getElementById('courseUploadPreview');

  spinner.classList.remove('d-none');
  
  try {
    const data = await uploadCourseThumbnail(file);
    window._currentThumbnailUrl = data.thumbnailUrl;
    preview.src = data.thumbnailUrl;
    previewContainer.classList.remove('d-none');
    placeholder.classList.add('d-none');
    showToast('Banner uploaded successfully!');
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    spinner.classList.add('d-none');
    input.value = '';
  }
}

function removeCourseThumbnail(event) {
  event.stopPropagation();
  window._currentThumbnailUrl = '';
  document.getElementById('courseUploadPreviewContainer').classList.add('d-none');
  document.getElementById('courseUploadPlaceholder').classList.remove('d-none');
  document.getElementById('courseUploadPreview').src = '';
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

async function approveCourse(id) {
  adminPrompt('Approve Course', 'Enter Course Fees (₹) to make it active:', '499', async (feesVal) => {
    const fees = parseFloat(feesVal);
    if (isNaN(fees) || fees < 0) {
      showToast('Please enter a valid course fee amount.', 'error');
      return;
    }
    try {
      const data = await apiPost(`/admin/courses/${id}/approve`, { fees });
      showToast(data.message || 'Course approved successfully');
      renderCourses();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}

async function rejectCourse(id) {
  adminPrompt('Reject Course', 'Reason for rejection?', '', async (reason) => {
    try {
      const data = await apiPost(`/admin/courses/${id}/reject`, { reason });
      showToast(data.message || 'Course rejected');
      renderCourses();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}

async function unarchiveCourse(id) {
  confirm('Unarchive Course?', 'This will restore the course to active state and make it visible to students.', async () => {
    try {
      const data = await apiPost(`/admin/courses/${id}/unarchive`);
      showToast(data.message || 'Course restored successfully');
      renderCourses();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}

async function toggleCourseVerified(id) {
  try {
    const data = await apiPost(`/admin/courses/${id}/toggle-verified`);
    showToast(data.message || 'Course verification updated');
    renderCourses();
  } catch (err) { showToast(err.message, 'error'); }
}

async function toggleCourseFeatured(id) {
  try {
    const data = await apiPost(`/admin/courses/${id}/toggle-featured`);
    showToast(data.message || 'Course featured status updated');
    renderCourses();
  } catch (err) { showToast(err.message, 'error'); }
}

function viewCourseTeacher(courseId) {
  const c = (window._courses || []).find(x => x.id === courseId);
  if (!c || !c.teacher_name) return;
  document.getElementById('formModalTitle').textContent = `Teacher Profile: ${c.teacher_name}`;
  document.getElementById('formModalBody').innerHTML = `
    <div class="text-center mb-3">
      <img src="${c.teacher_photo || defaultAvatar}" style="width:72px; height:72px; border-radius:50%; border:2px solid var(--primary); object-fit: cover; background:#1e293b; padding:4px;" onerror="this.src=defaultAvatar">
      <h5 class="fw-bold mt-2 text-dark">${c.teacher_name}</h5>
      <span class="badge" style="background: rgba(60,189,176,0.1); color: var(--primary);">${c.teacher_level || 'Bronze'}</span>
    </div>
    <div class="text-start text-dark small">
      <div class="mb-2"><strong>Email:</strong> <span>${c.teacher_email}</span></div>
      <div class="mb-2"><strong>Qualification:</strong> <span>${c.teacher_qualification || '—'}</span></div>
      <div class="mb-2"><strong>Experience:</strong> <span>${c.teacher_experience || 0} Years</span></div>
      <div class="mb-2"><strong>Rating:</strong> <span>⭐ ${parseFloat(c.teacher_rating || 5).toFixed(1)}</span></div>
      <div class="mb-2"><strong>Biography:</strong> <p class="text-muted mt-1" style="font-size: 0.8rem; line-height: 1.5;">${c.teacher_bio || '—'}</p></div>
    </div>
    <div class="d-flex justify-content-end mt-4">
      <button class="btn btn-secondary btn-sm" onclick="formModal.hide()">Close</button>
    </div>
  `;
  formModal.show();
}

async function revokeCertificate(event, certId, teacherId) {
  if (event) event.stopPropagation();
  confirm('Revoke Certificate?', 'This will permanently remove this certificate from the teacher\'s profile.', async () => {
    try {
      const data = await apiDelete(`/admin/certificates/${certId}`);
      showToast(data.message || 'Certificate revoked successfully');
      formModal.hide();
      setTimeout(() => viewTeacher(teacherId), 300);
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}

async function issueManualCertificate(teacherId) {
  const title = document.getElementById('manualCertTitle').value.trim();
  const certificate_type = document.getElementById('manualCertType').value;
  const description = document.getElementById('manualCertDesc').value.trim();

  if (!title || !description) {
    showToast('Please fill out all fields.', 'error');
    return;
  }

  try {
    const data = await apiPost(`/admin/teachers/${teacherId}/certificates`, { title, description, certificate_type });
    showToast(data.message || 'Certificate issued successfully');
    formModal.hide();
    setTimeout(() => viewTeacher(teacherId), 300);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function showEditCertificateForm(event, certId, teacherId) {
  if (event) event.stopPropagation();
  const cert = window.loadedCertificates ? window.loadedCertificates.find(c => c.id === certId) : null;
  if (!cert) return;

  const row = document.getElementById(`cert-row-${certId}`);
  if (!row) return;

  let dateVal = '';
  if (cert.issued_at) {
    const d = new Date(cert.issued_at);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    dateVal = `${yyyy}-${mm}-${dd}`;
  }

  row.innerHTML = `
    <div style="flex: 1; width: 100%;" class="text-start text-dark">
      <div class="mb-2">
        <label class="small text-muted mb-1 fw-bold">Certificate Title</label>
        <input type="text" id="edit-cert-title-${certId}" class="form-control form-control-sm spx-input" value="${cert.title.replace(/"/g, '&quot;')}" style="background:#f8fafc; color:#0f172a; border: 1px solid #cbd5e1;">
      </div>
      <div class="mb-2">
        <label class="small text-muted mb-1 fw-bold">Date Issued</label>
        <input type="date" id="edit-cert-date-${certId}" class="form-control form-control-sm spx-input" value="${dateVal}" style="background:#f8fafc; color:#0f172a; border: 1px solid #cbd5e1;">
      </div>
      <div class="mb-2">
        <label class="small text-muted mb-1 fw-bold">Description</label>
        <textarea id="edit-cert-desc-${certId}" class="form-control form-control-sm spx-input" rows="3" style="background:#f8fafc; color:#0f172a; border: 1px solid #cbd5e1;">${cert.description || ''}</textarea>
      </div>
      <div class="d-flex gap-2 justify-content-end mt-2">
        <button class="btn btn-xs btn-outline-secondary py-1 px-2" style="font-size:0.75rem;" onclick="cancelEditCertificate(event, '${certId}', '${teacherId}')">Cancel</button>
        <button class="btn btn-xs btn-primary py-1 px-2" style="font-size:0.75rem;" onclick="saveEditCertificate(event, '${certId}', '${teacherId}')">Save</button>
      </div>
    </div>
  `;
}

function cancelEditCertificate(event, certId, teacherId) {
  if (event) event.stopPropagation();
  viewTeacher(teacherId);
}

async function saveEditCertificate(event, certId, teacherId) {
  if (event) event.stopPropagation();
  const title = document.getElementById(`edit-cert-title-${certId}`).value.trim();
  const dateStr = document.getElementById(`edit-cert-date-${certId}`).value;
  const description = document.getElementById(`edit-cert-desc-${certId}`).value.trim();

  if (!title || !description) {
    showToast('Title and description are required', 'error');
    return;
  }

  try {
    const issued_at = dateStr ? new Date(dateStr).toISOString() : null;
    const data = await apiPut(`/admin/certificates/${certId}`, { title, description, issued_at });
    showToast(data.message || 'Certificate updated successfully');
    viewTeacher(teacherId);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ── Batches ───────────────────────────────────────────────────
async function renderBatches() {
  loading();
  try {
    const batches = await apiGet('/admin/batches');
    window._batches = batches;

    // Initialize filter states on window if not present
    if (window._batchesFilterSearch === undefined) window._batchesFilterSearch = '';
    if (window._batchesFilterStatus === undefined) window._batchesFilterStatus = '';
    if (window._batchesFilterCourse === undefined) window._batchesFilterCourse = '';
    if (window._batchesFilterTeacher === undefined) window._batchesFilterTeacher = '';
    if (window._batchesFilterDay === undefined) window._batchesFilterDay = '';

    // Dynamically extract unique courses and teachers for filter dropdowns
    const uniqueCourses = [...new Set(batches.map(b => b.course_title).filter(Boolean))].sort();
    const uniqueTeachers = [...new Set(batches.map(b => b.teacher_name).filter(Boolean))].sort();
    const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    document.getElementById('pageContent').innerHTML = `
      <div class="spx-card">
        <!-- Header Section -->
        <div class="d-flex align-items-center justify-content-between mb-4">
          <h6 class="mb-0" id="batchesCountTitle">All Batches (${batches.length})</h6>
        </div>

        <!-- Filters Grid Bar -->
        <div class="course-filter-bar mb-4">
          <!-- Text Search -->
          <div class="course-filter-item search-item">
            <label class="spx-label mb-1">Search</label>
            <div class="course-filter-input-group">
              <i class="fas fa-search"></i>
              <input type="text" id="batchFilterSearch" class="form-control spx-input" placeholder="Search batch name, course, teacher..." value="${window._batchesFilterSearch}">
            </div>
          </div>

          <!-- Status Filter -->
          <div class="course-filter-item">
            <label class="spx-label mb-1">Status</label>
            <select id="batchFilterStatus" class="form-select spx-input">
              <option value="">All Statuses</option>
              <option value="active" ${window._batchesFilterStatus === 'active' ? 'selected' : ''}>Active</option>
              <option value="inactive" ${window._batchesFilterStatus === 'inactive' ? 'selected' : ''}>Inactive</option>
              <option value="cancelled" ${window._batchesFilterStatus === 'cancelled' ? 'selected' : ''}>Cancelled</option>
            </select>
          </div>

          <!-- Course Filter -->
          <div class="course-filter-item">
            <label class="spx-label mb-1">Course</label>
            <select id="batchFilterCourse" class="form-select spx-input">
              <option value="">All Courses</option>
              ${uniqueCourses.map(c => `<option value="${c}" ${window._batchesFilterCourse === c ? 'selected' : ''}>${c}</option>`).join('')}
            </select>
          </div>

          <!-- Teacher Filter -->
          <div class="course-filter-item">
            <label class="spx-label mb-1">Teacher</label>
            <select id="batchFilterTeacher" class="form-select spx-input">
              <option value="">All Teachers</option>
              ${uniqueTeachers.map(t => `<option value="${t}" ${window._batchesFilterTeacher === t ? 'selected' : ''}>${t}</option>`).join('')}
            </select>
          </div>

          <!-- Day Filter -->
          <div class="course-filter-item">
            <label class="spx-label mb-1">Day</label>
            <select id="batchFilterDay" class="form-select spx-input">
              <option value="">All Days</option>
              ${daysOfWeek.map(d => `<option value="${d}" ${window._batchesFilterDay === d ? 'selected' : ''}>${d}</option>`).join('')}
            </select>
          </div>

          <!-- Reset Button -->
          <div class="course-filter-item btn-item align-self-end">
            <button class="btn btn-secondary w-100" onclick="resetBatchFilters()" title="Reset Filters">
              <i class="fas fa-undo"></i>
            </button>
          </div>
        </div>

        <!-- Table Container -->
        <div class="table-responsive">
          <table class="spx-table">
            <thead>
              <tr>
                <th>Batch</th>
                <th>Course</th>
                <th>Teacher</th>
                <th>Schedule</th>
                <th>Capacity</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="batchesTableBody">
              <!-- Rendered dynamically -->
            </tbody>
          </table>
        </div>
      </div>
    `;

    // Wire up events dynamically
    document.getElementById('batchFilterSearch').addEventListener('input', e => handleBatchFilterChange('search', e.target.value));
    document.getElementById('batchFilterStatus').addEventListener('change', e => handleBatchFilterChange('status', e.target.value));
    document.getElementById('batchFilterCourse').addEventListener('change', e => handleBatchFilterChange('course', e.target.value));
    document.getElementById('batchFilterTeacher').addEventListener('change', e => handleBatchFilterChange('teacher', e.target.value));
    document.getElementById('batchFilterDay').addEventListener('change', e => handleBatchFilterChange('day', e.target.value));

    // Render initial list
    filterAndRenderBatchesTable();
  } catch (err) {
    document.getElementById('pageContent').innerHTML = `<div class="alert alert-danger">${err.message}</div>`;
  }
}

function handleBatchFilterChange(type, val) {
  if (type === 'search') window._batchesFilterSearch = val;
  if (type === 'status') window._batchesFilterStatus = val;
  if (type === 'course') window._batchesFilterCourse = val;
  if (type === 'teacher') window._batchesFilterTeacher = val;
  if (type === 'day') window._batchesFilterDay = val;
  filterAndRenderBatchesTable();
}

function resetBatchFilters() {
  window._batchesFilterSearch = '';
  window._batchesFilterStatus = '';
  window._batchesFilterCourse = '';
  window._batchesFilterTeacher = '';
  window._batchesFilterDay = '';

  const sInput = document.getElementById('batchFilterSearch');
  const statSelect = document.getElementById('batchFilterStatus');
  const crSelect = document.getElementById('batchFilterCourse');
  const tcSelect = document.getElementById('batchFilterTeacher');
  const dySelect = document.getElementById('batchFilterDay');

  if (sInput) sInput.value = '';
  if (statSelect) statSelect.value = '';
  if (crSelect) crSelect.value = '';
  if (tcSelect) tcSelect.value = '';
  if (dySelect) dySelect.value = '';

  filterAndRenderBatchesTable();
}

function filterAndRenderBatchesTable() {
  const tbody = document.getElementById('batchesTableBody');
  if (!tbody) return;

  const batches = window._batches || [];
  const searchVal = (window._batchesFilterSearch || '').toLowerCase().trim();
  const statusVal = window._batchesFilterStatus || '';
  const courseVal = window._batchesFilterCourse || '';
  const teacherVal = window._batchesFilterTeacher || '';
  const dayVal = window._batchesFilterDay || '';

  // Apply filters
  const filtered = batches.filter(b => {
    if (searchVal) {
      const matchBatch = (b.batch_name || '').toLowerCase().includes(searchVal);
      const matchCourse = (b.course_title || '').toLowerCase().includes(searchVal);
      const matchTeacher = (b.teacher_name || '').toLowerCase().includes(searchVal);
      if (!matchBatch && !matchCourse && !matchTeacher) return false;
    }
    if (statusVal && b.status !== statusVal) return false;
    if (courseVal && b.course_title !== courseVal) return false;
    if (teacherVal && b.teacher_name !== teacherVal) return false;
    if (dayVal) {
      const days = b.days_of_week || [];
      const matchDay = days.some(d => d.toLowerCase() === dayVal.toLowerCase());
      if (!matchDay) return false;
    }
    return true;
  });

  // Update count title
  const countTitle = document.getElementById('batchesCountTitle');
  if (countTitle) {
    countTitle.textContent = `All Batches (${filtered.length} of ${batches.length})`;
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center py-4 text-muted">
          <i class="fas fa-search-minus mb-2" style="font-size: 1.8rem;"></i>
          <p class="mb-0 small fw-semibold">No batches match your active filters.</p>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(b => `
    <tr>
      <td class="fw-semibold text-white">${b.batch_name}</td>
      <td>${b.course_title||'—'}</td>
      <td>${b.teacher_name||'—'}</td>
      <td>${(b.days_of_week||[]).join(', ')}<br><small class="text-muted">${b.start_time||''} - ${b.end_time||''}</small></td>
      <td>${b.seats_filled||0}/${b.capacity||30}</td>
      <td>${statusBadge(b.status)}</td>
      <td>
        <button class="btn btn-sm btn-outline-secondary me-1" style="font-size: 0.78rem;" onclick="toggleBatch('${b.id}')">Toggle</button>
        <button class="btn btn-sm btn-outline-danger" style="font-size: 0.78rem;" onclick="cancelBatch('${b.id}')">Cancel</button>
      </td>
    </tr>
  `).join('');
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
                ${p.status === 'approved' ? `
                  <button class="btn btn-sm btn-primary me-1" onclick="markPaid('${p.id}')">Mark Paid</button>
                  <button class="btn btn-sm btn-spx" onclick="payViaRazorpay(event, '${p.id}')"><i class="fas fa-money-bill-wave me-1"></i>Pay via Razorpay</button>` : ''}
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
async function payViaRazorpay(event, id) {
  try {
    const btn = event.target.closest('button');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span> Processing...`;
    }
    const d = await apiPost(`/admin/payouts/${id}/pay-razorpay`);
    showToast(d.message || 'Payout successfully processed via Razorpay X!');
    renderPayouts();
  } catch (err) {
    showToast(err.message, 'error');
    renderPayouts();
  }
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
                <div class="d-flex align-items-center gap-2">
                  <button class="btn btn-sm btn-spx py-1 px-3" onclick="showSOPApprovalModal('${s.teacher_id}')">
                    <i class="fas fa-search-plus me-1"></i>Review / Details
                  </button>
                  ${s.status === 'approved' ? `
                    <button class="btn btn-sm btn-outline-danger py-1 px-2" onclick="deApproveTeacher('${s.teacher_id}')" title="deApprove & Revert to Pending">
                      <i class="fas fa-undo me-1"></i>deApprove
                    </button>
                  ` : ''}
                </div>
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

function formatTime(timeStr) {
  if (!timeStr) return '';
  const [hours, minutes] = timeStr.split(':');
  const hrs = parseInt(hours);
  const ampm = hrs >= 12 ? 'PM' : 'AM';
  const displayHrs = hrs % 12 || 12;
  return `${displayHrs}:${minutes} ${ampm}`;
}

async function showSOPApprovalModal(teacherId) {
  document.getElementById('formModalTitle').textContent = `Granular Onboarding Review`;
  document.getElementById('formModalBody').innerHTML = `<div class="text-center py-4"><div class="spinner-border text-primary" role="status"></div></div>`;
  formModal.show();
  await refreshSOPModal(teacherId);
}

async function refreshSOPModal(teacherId) {
  try {
    const data = await apiGet(`/admin/teachers/${teacherId}`);
    if (!data || !data.teacher) return showToast('Teacher profile not found', 'error');

    const t = data.teacher;
    const s = data.sop || {};
    const docs = data.documents || [];
    const approvals = s.item_approvals || {};

    let availabilityHtml = '—';
    if (s.availability) {
      try {
        const slots = JSON.parse(s.availability);
        if (Array.isArray(slots)) {
          availabilityHtml = slots.map(slot => {
            const timeRange = `${formatTime(slot.startTime)} - ${formatTime(slot.endTime)}`;
            return `<div class="badge bg-light text-dark border p-1 me-1 mb-1" style="font-size:0.75rem;">${slot.days.join(', ')}: ${timeRange} (${slot.timezone})</div>`;
          }).join('');
        } else {
          availabilityHtml = `<span class="text-secondary small">${s.availability}</span>`;
        }
      } catch (e) {
        availabilityHtml = `<span class="text-secondary small">${s.availability}</span>`;
      }
    }

    const items = [
      { key: 'aadhaar', label: 'Aadhaar Card (KYC Document)', type: 'file', val: docs.find(d => d.doc_type === 'aadhaar')?.file_url },
      { key: 'pan', label: 'PAN Card (KYC Document)', type: 'file', val: docs.find(d => d.doc_type === 'pan')?.file_url },
      { key: 'resume', label: 'Professional Resume (KYC Document)', type: 'file', val: docs.find(d => d.doc_type === 'resume')?.file_url },
      { key: 'qualification', label: 'Degree Certificate (KYC Document)', type: 'file', val: docs.find(d => d.doc_type === 'qualification')?.file_url },
      
      { key: 'subject_expertise', label: 'Subject Expertise (Profile Text)', type: 'text', val: t.subject_expertise },
      { key: 'expertise_proof', label: 'Subject Expertise Proof (Doc)', type: 'file', val: docs.find(d => d.doc_type === 'expertise_proof')?.file_url },
      
      { key: 'languages', label: 'Language Preference (Profile Text)', type: 'text', val: t.languages },
      { key: 'language_proof', label: 'Language Preference Proof (Doc)', type: 'file', val: docs.find(d => d.doc_type === 'language_proof')?.file_url },
      
      { key: 'experience_years', label: 'Teaching Experience Years', type: 'text', val: (t.experience_years !== null && t.experience_years !== undefined) ? `${t.experience_years} Years` : null },
      { key: 'experience_proof', label: 'Experience Letter Proof (Doc)', type: 'file', val: docs.find(d => d.doc_type === 'experience_proof')?.file_url },
      
      { key: 'availability', label: 'Weekly Availability Slots', type: 'html', val: availabilityHtml },
      
      { key: 'camera_sop', label: 'Camera Setup SOP (Technical Proof)', type: 'file', val: s.camera_sop_url },
      { key: 'lighting_sop', label: 'Lighting Setup SOP (Technical Proof)', type: 'file', val: s.lighting_sop_url },
      { key: 'audio_sop', label: 'Audio Setup SOP (Technical Proof)', type: 'file', val: s.audio_sop_url },
      { key: 'internet_proof', label: 'Internet Speed Proof (Technical)', type: 'file', val: s.internet_proof_url },
      { key: 'demo_teaching', label: 'Demo Lecture Snippet (Technical)', type: 'file', val: s.demo_teaching_url }
    ];

    const getGranularStatusBadge = (key, hasItem) => {
      if (!hasItem) return '<span class="badge bg-secondary-subtle text-secondary py-1 px-2" style="font-size:0.75rem"><i class="fas fa-exclamation-circle me-1"></i>Missing</span>';
      const app = approvals[key];
      if (!app) return '<span class="badge bg-warning-subtle text-warning py-1 px-2" style="font-size:0.75rem"><i class="fas fa-clock me-1"></i>Pending Review</span>';
      if (app.status === 'approved') return '<span class="badge bg-success-subtle text-success py-1 px-2" style="font-size:0.75rem"><i class="fas fa-check-circle me-1"></i>Approved</span>';
      if (app.status === 'rejected') {
        return `
          <div class="d-flex flex-column align-items-center">
            <span class="badge bg-danger-subtle text-danger py-1 px-2" style="font-size:0.75rem"><i class="fas fa-times-circle me-1"></i>Rejected</span>
            ${app.notes ? `<div class="text-danger small mt-1 text-center" style="font-size:0.68rem; font-weight:500; max-width: 150px; white-space: normal; line-height: 1.2;">Note: ${app.notes}</div>` : ''}
          </div>
        `;
      }
      return '<span class="badge bg-warning-subtle text-warning py-1 px-2" style="font-size:0.75rem"><i class="fas fa-clock me-1"></i>Pending Review</span>';
    };

    const checklist = s.teacher_checklist || {};
    const checklistItems = [
      { key: 'camera_stable', label: 'Camera Stable & Eye-Level' },
      { key: 'camera_1080p', label: 'Landscape 1080p HD Feed' },
      { key: 'lighting_soft', label: 'Front Soft Light Source' },
      { key: 'lighting_bg', label: 'Clutter-Free Background' },
      { key: 'audio_mic', label: 'Collar/Headset Mic Used' },
      { key: 'audio_noise', label: 'Zero Ambient Noise' },
      { key: 'internet_speed', label: '>20 Mbps Upload Speed' },
      { key: 'presentation_style', label: 'Engaging Delivery' },
      { key: 'dress_code', label: 'Formal/Smart Attire' },
      { key: 'class_flow', label: 'Interactive Class Recap' },
      { key: 'board_materials', label: 'Interactive Digital Board' },
      { key: 'content_delivery', label: 'Clear & Preference-based' },
      { key: 'discipline_rules', label: 'Strict Class Discipline' }
    ];

    const checklistHtml = `
      <div class="mt-3 p-3 rounded" style="background: rgba(255, 255, 255, 0.02); border: 1px solid var(--border);">
        <h6 class="fw-bold mb-2 text-primary" style="font-family:'Outfit'; font-size:0.85rem;"><i class="fas fa-clipboard-check me-2"></i>Teacher Self-Declaration Checklist</h6>
        <div class="row g-2">
          ${checklistItems.map(item => {
            const checked = !!checklist[item.key];
            return `
              <div class="col-md-4 col-sm-6">
                <div class="d-flex align-items-center gap-2 py-1 px-2 rounded" style="background: rgba(255, 255, 255, 0.01); font-size: 0.72rem; border: 1px solid var(--border);">
                  <i class="fas ${checked ? 'fa-check-circle text-success' : 'fa-times-circle text-muted'}"></i>
                  <span class="${checked ? 'text-white' : 'text-muted'}">${item.label}</span>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;

    document.getElementById('formModalBody').innerHTML = `
      <div class="p-1 text-start">
        <div class="d-flex align-items-center gap-3 mb-4 p-3 rounded" style="background: rgba(255, 255, 255, 0.03); border: 1px solid var(--border);">
          ${avatar(t.photo_url, t.name, 60)}
          <div>
            <h5 class="fw-bold text-white mb-1" style="font-family: 'Outfit';">${t.name}</h5>
            <div class="text-secondary small mb-1"><i class="far fa-envelope me-1"></i>${t.email} | <i class="fas fa-phone-alt me-1"></i>${t.phone || '—'} | Mobile: ${t.mobile_number || '—'} | Alt Email: ${t.alt_email || '—'}</div>
            <div class="text-secondary small mb-1">
              LinkedIn: ${t.social_links?.linkedin ? `<a href="${t.social_links.linkedin}" target="_blank" class="text-primary text-decoration-none fw-semibold">${t.social_links.linkedin}</a>` : '—'} |
              Twitter/Social: ${t.social_links?.twitter ? `<a href="${t.social_links.twitter}" target="_blank" class="text-primary text-decoration-none fw-semibold">${t.social_links.twitter}</a>` : '—'}
            </div>
            <div class="text-secondary small"><i class="fas fa-graduation-cap me-1"></i>Highest Qualification: <strong class="text-white">${t.qualification || '—'}</strong></div>
          </div>
        </div>

        <p class="text-secondary small mb-3">Review all submitted documents, profile texts, availability slots, and technical SOP videos line-by-line. Approve or reject each item granularly, or click <strong>Auto Approve Full</strong> at the bottom to approve everything at once.</p>
        
        <div class="table-responsive" style="max-height: 400px; overflow-y: auto; border: 1px solid var(--border); border-radius: 8px;">
          <table class="table table-hover align-middle mb-0" style="font-size: 0.82rem;">
            <thead class="table-light sticky-top" style="z-index: 10;">
              <tr>
                <th style="width: 250px; padding: 12px 16px;">Requirement</th>
                <th style="padding: 12px 16px;">Data / Evidence</th>
                <th style="width: 160px; text-align: center; padding: 12px 16px;">Verification Status</th>
                <th style="width: 180px; text-align: right; padding: 12px 16px;">Action</th>
              </tr>
            </thead>
            <tbody>
              ${items.map(item => {
                const hasItem = !!item.val;
                let dataHtml = '';
                if (item.type === 'file') {
                  dataHtml = hasItem ? 
                    `<a href="${item.val}" target="_blank" class="btn btn-xs btn-outline-primary py-1 px-2" style="font-size:0.72rem"><i class="fas fa-external-link-alt me-1"></i>View File / Link</a>` : 
                    `<span class="text-muted small">No file/link uploaded</span>`;
                } else if (item.type === 'text') {
                  dataHtml = hasItem ? 
                    `<span class="fw-semibold text-dark">${item.val}</span>` : 
                    `<span class="text-muted small">—</span>`;
                } else if (item.type === 'html') {
                  dataHtml = item.val;
                }

                return `
                  <tr>
                    <td style="padding: 12px 16px;">
                      <div class="fw-bold text-dark">${item.label}</div>
                      <div class="text-muted" style="font-size:0.7rem; text-transform: uppercase;">Key: ${item.key}</div>
                    </td>
                    <td style="padding: 12px 16px;">${dataHtml}</td>
                    <td class="text-center" style="padding: 12px 16px;">${getGranularStatusBadge(item.key, hasItem)}</td>
                    <td class="text-end" style="padding: 12px 16px;">
                      <button class="btn btn-xs btn-success py-1 px-2" onclick="approveSOPItem('${t.id}', '${item.key}')" ${!hasItem ? 'disabled' : ''} style="font-size: 0.72rem;"><i class="fas fa-check"></i> Approve</button>
                      <button class="btn btn-xs btn-outline-danger py-1 px-2" onclick="rejectSOPItem('${t.id}', '${item.key}')" ${!hasItem ? 'disabled' : ''} style="font-size: 0.72rem;"><i class="fas fa-times"></i> Reject</button>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>

        ${checklistHtml}

        <div class="mt-4 pt-3 border-top d-flex align-items-center justify-content-between">
          <div>
            <span class="small text-muted">Overall Teacher Status:</span> 
            <span class="badge ${t.approval_status === 'agreement_pending' || t.approval_status === 'approved' ? 'bg-success' : 'bg-warning'} text-uppercase ms-1">${t.approval_status.replace('_', ' ')}</span>
          </div>
          <div class="d-flex gap-2">
            <button class="btn btn-secondary btn-sm px-3" onclick="formModal.hide()">Close</button>
            ${t.approval_status === 'approved' || t.approval_status === 'agreement_pending' ? `
              <button class="btn btn-outline-danger btn-sm px-3" onclick="deApproveTeacher('${t.id}')"><i class="fas fa-undo me-1"></i> deApprove</button>
            ` : `
              <button class="btn btn-outline-danger btn-sm px-3" onclick="rejectSopFromModal('${t.id}')">Reject entire SOP</button>
              <button class="btn btn-success btn-sm px-3" onclick="submitSOPApproval('${t.id}')"><i class="fas fa-check-double me-1"></i> Auto Approve Full</button>
            `}
          </div>
        </div>
      </div>
    `;
  } catch (err) {
    showToast(err.message, 'error');
  }
}

window.approveSOPItem = async function(teacherId, itemKey) {
  try {
    showToast(`Approving ${itemKey.replace('_', ' ')}...`, 'info');
    const res = await apiPost(`/admin/sop/${teacherId}/item-approval`, {
      item: itemKey,
      status: 'approved'
    });
    showToast(res.message);
    await refreshSOPModal(teacherId);
    if (typeof renderSOP === 'function') renderSOP();
  } catch (e) {
    showToast(e.message, 'error');
  }
};

window.rejectSOPItem = async function(teacherId, itemKey) {
  adminPrompt('Reject Onboarding Item', `Specify the reason for rejecting ${itemKey.replace('_', ' ')}:`, '', async (notes) => {
    if (!notes) {
      showToast('A rejection note is required to reject an onboarding item.', 'error');
      return;
    }
    try {
      showToast(`Rejecting ${itemKey.replace('_', ' ')}...`, 'info');
      const res = await apiPost(`/admin/sop/${teacherId}/item-approval`, {
        item: itemKey,
        status: 'rejected',
        notes
      });
      showToast(res.message);
      await refreshSOPModal(teacherId);
      if (typeof renderSOP === 'function') renderSOP();
    } catch (e) {
      showToast(e.message, 'error');
    }
  });
};

async function rejectSopFromModal(teacherId) {
  adminPrompt('Reject Entire SOP', 'Specify the reason for rejecting the entire SOP submission:', '', async (notes) => {
    if (!notes) {
      showToast('Rejection reason is required.', 'error');
      return;
    }
    try {
      showToast('Rejecting entire SOP...', 'info');
      const d = await apiPost(`/admin/sop/${teacherId}/reject`, { admin_notes: notes });
      showToast(d.message);
      formModal.hide();
      if (typeof renderSOP === 'function') renderSOP();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}

async function submitSOPApproval(teacherId) {
  try {
    showToast('Auto approving all items...', 'info');
    const d = await apiPost(`/admin/sop/${teacherId}/approve`, {});
    showToast(d.message);
    formModal.hide();
    if (typeof renderSOP === 'function') renderSOP();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

window.deApproveTeacher = async function(teacherId) {
  adminPrompt('deApprove Teacher Account', 'Specify the reason for deApproving this teacher (will revert onboarding status to pending review):', '', async (notes) => {
    if (!notes) {
      showToast('A reason/note is required to deApprove.', 'error');
      return;
    }
    try {
      showToast('deApproving teacher...', 'info');
      const d = await apiPost(`/admin/sop/${teacherId}/deapprove`, { notes });
      showToast(d.message);
      formModal.hide();
      if (typeof renderSOP === 'function') renderSOP();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
};

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
        <div class="col-6"><label class="spx-label">Coupon Code *</label><input class="form-control spx-input" id="cpCode" required placeholder="SPEAXA20"></div>
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

// ── Settings & OTP System Management ──────────────────────────────
async function renderSettings() {
  loading();
  try {
    const settings = await apiGet('/admin/settings');
    const smsProv = settings.sms_provider || 'dev';
    const emailProv = settings.email_provider || 'smtp';

    document.getElementById('pageContent').innerHTML = `
      <div class="row g-4">
        <!-- Settings Sidebar tabs -->
        <div class="col-md-3">
          <div class="nav flex-column nav-pills border rounded p-2 bg-light shadow-sm" id="settingsTabs" role="tablist">
            <button class="nav-link active text-start py-2.5 px-3 small fw-semibold text-decoration-none border-0 mb-1" id="tab-general" data-bs-toggle="pill" data-bs-target="#pane-general" type="button" role="tab" style="background:transparent; color:#aaa;"><i class="fas fa-sliders-h me-2"></i>Platform General</button>
            <button class="nav-link text-start py-2.5 px-3 small fw-semibold text-decoration-none border-0 mb-1" id="tab-reg-payouts" data-bs-toggle="pill" data-bs-target="#pane-reg-payouts" type="button" role="tab" style="background:transparent; color:#aaa;"><i class="fas fa-percentage me-2"></i>Registration & Payouts</button>
            <button class="nav-link text-start py-2.5 px-3 small fw-semibold text-decoration-none border-0 mb-1" id="tab-gateways" data-bs-toggle="pill" data-bs-target="#pane-gateways" type="button" role="tab" style="background:transparent; color:#aaa;"><i class="fas fa-paper-plane me-2"></i>OTP Gateways</button>
            <button class="nav-link text-start py-2.5 px-3 small fw-semibold text-decoration-none border-0 mb-1" id="tab-tester" data-bs-toggle="pill" data-bs-target="#pane-tester" type="button" role="tab" style="background:transparent; color:#aaa;"><i class="fas fa-vial me-2"></i>Gateway Tester</button>
            <button class="nav-link text-start py-2.5 px-3 small fw-semibold text-decoration-none border-0 mb-1" id="tab-credentials" data-bs-toggle="pill" data-bs-target="#pane-credentials" type="button" role="tab" style="background:transparent; color:#aaa;"><i class="fas fa-key me-2"></i>API Credentials</button>
            <button class="nav-link text-start py-2.5 px-3 small fw-semibold text-decoration-none border-0" id="tab-logs" data-bs-toggle="pill" data-bs-target="#pane-logs" type="button" role="tab" style="background:transparent; color:#aaa;"><i class="fas fa-history me-2"></i>OTP Audit Logs</button>
          </div>
        </div>

        <!-- Settings Panes -->
        <div class="col-md-9">
          <div class="tab-content" id="settingsTabContent">
            <!-- Pane 1: Platform General -->
            <div class="tab-pane fade show active" id="pane-general" role="tabpanel">
              <div class="row g-4">
                <div class="col-md-6">
                  <div class="spx-card">
                    <h6 class="mb-4"><i class="fas fa-sliders-h me-2 text-primary"></i>Platform Settings</h6>
                    <form onsubmit="saveSettings(event)">
                      ${[
                        {key:'platform_name', label:'Platform Name', type:'text'},
                        {key:'logo_text', label:'Logo Text', type:'text'},
                        {key:'support_email', label:'Support Email', type:'email'},
                        {key:'support_phone', label:'Support Phone', type:'text'},
                        {key:'support_hours', label:'Support Hours', type:'text'},
                        {key:'announcement', label:'Announcement Banner', type:'text'},
                        {key:'max_batch_capacity', label:'Max Batch Capacity', type:'number'},
                      ].map(f => `
                        <div class="mb-3">
                          <label class="spx-label">${f.label}</label>
                          <input class="form-control spx-input" type="${f.type}" id="setting_${f.key}" value="${settings[f.key]||''}">
                        </div>`).join('')}
                      <button type="submit" class="btn btn-spx w-100">Save Platform Settings</button>
                    </form>
                  </div>
                </div>
                <div class="col-md-6">
                  <div class="spx-card">
                    <h6 class="mb-3"><i class="fas fa-desktop me-2 text-primary"></i>Homepage CMS</h6>
                    <form onsubmit="saveHomepageSettings(event)">
                      ${[
                        {key:'home_hero_badge', label:'Hero Badge text'},
                        {key:'home_hero_title', label:'Hero Main Title'},
                        {key:'home_hero_desc', label:'Hero Description', type:'textarea'},
                        {key:'home_hero_cta_primary', label:'Primary CTA Button Text'},
                        {key:'home_hero_cta_secondary', label:'Secondary CTA Button Text'},
                        {key:'home_footer_phone', label:'Footer Support Phone'},
                        {key:'home_footer_email', label:'Footer Support Email'},
                      ].map(f => `
                        <div class="mb-2">
                          <label class="spx-label small">${f.label}</label>
                          ${f.type === 'textarea' ? `
                            <textarea class="form-control spx-input form-control-sm" id="setting_${f.key}" rows="2">${settings[f.key]||''}</textarea>
                          ` : `
                            <input class="form-control spx-input form-control-sm" type="text" id="setting_${f.key}" value="${settings[f.key]||''}">
                          `}
                        </div>`).join('')}
                      <button type="submit" class="btn btn-spx btn-sm w-100 mt-2">Save Homepage CMS</button>
                    </form>
                  </div>
                </div>
              </div>
            </div>

            <!-- Pane 2: Registration & Payouts -->
            <div class="tab-pane fade" id="pane-reg-payouts" role="tabpanel">
              <div class="row g-4">
                <div class="col-md-6">
                  <div class="spx-card border border-primary border-opacity-25" style="background: linear-gradient(135deg, rgba(13,122,109,0.08), rgba(8,84,75,0.03));">
                    <div class="d-flex align-items-center justify-content-between mb-3">
                      <h6 class="mb-0 text-white"><i class="fas fa-shield-alt text-primary me-2"></i>Registration OTP Policy</h6>
                      <span class="badge ${String(settings.require_registration_otp) !== 'false' ? 'bg-success' : 'bg-warning'} px-2.5 py-1">
                        ${String(settings.require_registration_otp) !== 'false' ? 'REQUIRED (ON)' : 'OPTIONAL (OFF)'}
                      </span>
                    </div>
                    <p class="text-muted small mb-3">
                      Control whether new students & teachers must verify OTP via SMS/Email during account sign up.
                    </p>
                    <form onsubmit="saveOtpRequirementSetting(event)">
                      <div class="mb-3">
                        <label class="spx-label text-white">Require Registration OTP</label>
                        <select class="form-select spx-input" id="setting_require_registration_otp">
                          <option value="true" ${String(settings.require_registration_otp) !== 'false' ? 'selected' : ''}>Enabled (Require OTP Verification)</option>
                          <option value="false" ${String(settings.require_registration_otp) === 'false' ? 'selected' : ''}>Disabled (Direct Registration without OTP)</option>
                        </select>
                      </div>
                      <button type="submit" class="btn btn-spx w-100"><i class="fas fa-save me-1"></i>Save Registration Policy</button>
                    </form>
                  </div>
                </div>
                <div class="col-md-6">
                  <div class="spx-card">
                    <h6 class="mb-4"><i class="fas fa-percentage me-2 text-primary"></i>Teacher Payout Share (%)</h6>
                    <form onsubmit="saveLevelPayouts(event)">
                      <div style="max-height: 400px; overflow-y: auto; padding-right: 5px;">
                        ${[
                          {key:'payout_pct_Junior_Teacher', label:'Junior Teacher Share (%)', default:'50.00'},
                          {key:'payout_pct_Assistant_Teacher', label:'Assistant Teacher Share (%)', default:'55.00'},
                          {key:'payout_pct_Senior_Teacher', label:'Senior Teacher Share (%)', default:'60.00'},
                          {key:'payout_pct_Executive_Teacher', label:'Executive Teacher Share (%)', default:'65.00'},
                          {key:'payout_pct_Lecturer', label:'Lecturer Share (%)', default:'70.00'},
                          {key:'payout_pct_Professor', label:'Professor Share (%)', default:'75.00'},
                          {key:'payout_pct_Senior_Professor', label:'Senior Professor Share (%)', default:'80.00'},
                          {key:'payout_pct_HOD', label:'HOD Share (%)', default:'85.00'},
                          {key:'payout_pct_Dean', label:'Dean Share (%)', default:'90.00'},
                        ].map(f => `
                          <div class="mb-3">
                            <label class="spx-label">${f.label}</label>
                            <input class="form-control spx-input" type="number" step="0.01" min="0" max="100" id="setting_${f.key}" value="${settings[f.key]||f.default}">
                          </div>`).join('')}
                      </div>
                      <button type="submit" class="btn btn-spx w-100 mt-3">Save Level Payouts</button>
                    </form>
                  </div>
                </div>
              </div>
            </div>

            <!-- Pane 3: OTP Gateways -->
            <div class="tab-pane fade" id="pane-gateways" role="tabpanel">
              <div class="spx-card border border-info border-opacity-25">
                <div class="d-flex align-items-center justify-content-between mb-3">
                  <h6 class="mb-0"><i class="fas fa-paper-plane me-2 text-info"></i>OTP & Gateway Services</h6>
                  <span class="badge bg-info text-dark">Ready-Made System</span>
                </div>
                <p class="text-muted small mb-3">
                  Configure, manage, and switch SMS and Email OTP dispatch providers dynamically for the platform.
                </p>
                <form onsubmit="saveOtpSystemSettings(event)">
                  <div class="mb-3">
                    <label class="spx-label">Active SMS Provider</label>
                    <select class="form-select spx-input" id="setting_sms_provider" onchange="onSmsProviderChange()">
                      <option value="dev" ${smsProv === 'dev' ? 'selected' : ''}>Development / Console Mode (Free, test mode)</option>
                      <option value="msg91" ${smsProv === 'msg91' ? 'selected' : ''}>MSG91 Gateway (India & Global)</option>
                      <option value="twilio" ${smsProv === 'twilio' ? 'selected' : ''}>Twilio SMS Gateway (Global)</option>
                      <option value="fast2sms" ${smsProv === 'fast2sms' ? 'selected' : ''}>Fast2SMS Gateway (India)</option>
                      <option value="2factor" ${smsProv === '2factor' ? 'selected' : ''}>2Factor SMS Gateway (India)</option>
                      <option value="custom" ${smsProv === 'custom' ? 'selected' : ''}>Custom HTTP REST Gateway (Generic API)</option>
                    </select>
                  </div>
                  <div class="mb-3">
                    <label class="spx-label">Active Email Provider</label>
                    <select class="form-select spx-input" id="setting_email_provider">
                      <option value="smtp" ${emailProv === 'smtp' ? 'selected' : ''}>SMTP Mail Server (Nodemailer)</option>
                      <option value="dev" ${emailProv === 'dev' ? 'selected' : ''}>Development / Console Mode (Free, test/console logs)</option>
                    </select>
                  </div>
                  <!-- MSG91 Dynamic Fields -->
                  <div id="fields_msg91" class="otp-provider-fields ${smsProv === 'msg91' ? '' : 'd-none'} p-3 mb-3 rounded border" style="background: rgba(13,122,109,0.03);">
                    <h6 class="small fw-bold text-primary mb-2"><i class="fas fa-key me-1"></i>MSG91 Credentials</h6>
                    <div class="mb-2">
                      <label class="spx-label small">MSG91 Auth Key</label>
                      <input class="form-control spx-input form-control-sm" type="text" id="setting_msg91_auth_key" value="${settings.msg91_auth_key||''}">
                    </div>
                    <div class="mb-2">
                      <label class="spx-label small">MSG91 Template ID</label>
                      <input class="form-control spx-input form-control-sm" type="text" id="setting_msg91_template_id" value="${settings.msg91_template_id||''}">
                    </div>
                    <div class="mb-2">
                      <label class="spx-label small">MSG91 Sender ID (6 chars)</label>
                      <input class="form-control spx-input form-control-sm" type="text" id="setting_msg91_sender_id" value="${settings.msg91_sender_id||''}">
                    </div>
                  </div>
                  <!-- Twilio Dynamic Fields -->
                  <div id="fields_twilio" class="otp-provider-fields ${smsProv === 'twilio' ? '' : 'd-none'} p-3 mb-3 rounded border" style="background: rgba(13,122,109,0.03);">
                    <h6 class="small fw-bold text-primary mb-2"><i class="fas fa-key me-1"></i>Twilio Credentials</h6>
                    <div class="mb-2">
                      <label class="spx-label small">Twilio Account SID</label>
                      <input class="form-control spx-input form-control-sm" type="text" id="setting_twilio_account_sid" value="${settings.twilio_account_sid||''}">
                    </div>
                    <div class="mb-2">
                      <label class="spx-label small">Twilio Auth Token</label>
                      <input class="form-control spx-input form-control-sm" type="password" id="setting_twilio_auth_token" value="${settings.twilio_auth_token||''}">
                    </div>
                    <div class="mb-2">
                      <label class="spx-label small">Twilio From Phone Number</label>
                      <input class="form-control spx-input form-control-sm" type="text" id="setting_twilio_from_phone" value="${settings.twilio_from_phone||''}">
                    </div>
                  </div>
                  <!-- Fast2SMS Dynamic Fields -->
                  <div id="fields_fast2sms" class="otp-provider-fields ${smsProv === 'fast2sms' ? '' : 'd-none'} p-3 mb-3 rounded border" style="background: rgba(13,122,109,0.03);">
                    <h6 class="small fw-bold text-primary mb-2"><i class="fas fa-key me-1"></i>Fast2SMS Credentials</h6>
                    <div class="mb-2">
                      <label class="spx-label small">Fast2SMS Authorization API Key</label>
                      <input class="form-control spx-input form-control-sm" type="text" id="setting_fast2sms_api_key" value="${settings.fast2sms_api_key||''}">
                    </div>
                    <div class="mb-2">
                      <label class="spx-label small">Fast2SMS Route (e.g. dlt or v3)</label>
                      <input class="form-control spx-input form-control-sm" type="text" id="setting_fast2sms_route" value="${settings.fast2sms_route||''}">
                    </div>
                    <div class="mb-2">
                      <label class="spx-label small">Sender ID (DLT Registered)</label>
                      <input class="form-control spx-input form-control-sm" type="text" id="setting_fast2sms_sender_id" value="${settings.fast2sms_sender_id||''}">
                    </div>
                  </div>
                  <!-- 2Factor Dynamic Fields -->
                  <div id="fields_2factor" class="otp-provider-fields ${smsProv === '2factor' ? '' : 'd-none'} p-3 mb-3 rounded border" style="background: rgba(13,122,109,0.03);">
                    <h6 class="small fw-bold text-primary mb-2"><i class="fas fa-key me-1"></i>2Factor Credentials</h6>
                    <div class="mb-2">
                      <label class="spx-label small">2Factor API Key</label>
                      <input class="form-control spx-input form-control-sm" type="text" id="setting_twofactor_api_key" value="${settings.twofactor_api_key||''}">
                    </div>
                    <div class="mb-2">
                      <label class="spx-label small">Template Name (Optional)</label>
                      <input class="form-control spx-input form-control-sm" type="text" id="setting_twofactor_template_name" value="${settings.twofactor_template_name||''}" placeholder="e.g. MyOTPTemplate">
                    </div>
                  </div>
                  <!-- Custom HTTP Gateway -->
                  <div id="fields_custom" class="otp-provider-fields ${smsProv === 'custom' ? '' : 'd-none'} p-3 mb-3 rounded border" style="background: rgba(13,122,109,0.03);">
                    <h6 class="small fw-bold text-primary mb-2"><i class="fas fa-cog me-1"></i>Custom API Endpoint Config</h6>
                    <div class="mb-2">
                      <label class="spx-label small">Gateway Request URL</label>
                      <input class="form-control spx-input form-control-sm" type="url" id="setting_custom_sms_url" value="${settings.custom_sms_url||''}" placeholder="https://api.mygateway.com/send?to={PHONE}&msg={MSG}">
                    </div>
                    <div class="mb-2">
                      <label class="spx-label small">Request Method</label>
                      <select class="form-select spx-input form-control-sm" id="setting_custom_sms_method">
                        <option value="GET" ${settings.custom_sms_method === 'GET' ? 'selected' : ''}>GET Request</option>
                        <option value="POST" ${settings.custom_sms_method === 'POST' ? 'selected' : ''}>POST Request</option>
                      </select>
                    </div>
                    <div class="mb-2">
                      <label class="spx-label small">HTTP Headers JSON (Optional)</label>
                      <input class="form-control spx-input form-control-sm" type="text" id="setting_custom_sms_headers" value="${settings.custom_sms_headers||''}" placeholder='{"Authorization": "Bearer key"}'>
                    </div>
                    <div class="mb-2">
                      <label class="spx-label small">HTTP Body Template JSON (Optional)</label>
                      <input class="form-control spx-input form-control-sm" type="text" id="setting_custom_sms_body" value="${settings.custom_sms_body||''}" placeholder='{"to": "{PHONE}", "text": "{MSG}"}'>
                    </div>
                  </div>
                  <hr>
                  <div class="row">
                    <div class="col-md-6 mb-2">
                      <label class="spx-label">OTP Expiry (Minutes)</label>
                      <input class="form-control spx-input" type="number" id="setting_otp_expiry_minutes" value="${settings.otp_expiry_minutes||'8'}" required>
                    </div>
                    <div class="col-md-6 mb-2">
                      <label class="spx-label">OTP Length (Digits)</label>
                      <input class="form-control spx-input" type="number" id="setting_otp_length" value="${settings.otp_length||'6'}" required>
                    </div>
                    <div class="col-md-6 mb-2">
                      <label class="spx-label">Master/Backdoor OTP Code</label>
                      <input class="form-control spx-input" type="text" id="setting_master_otp" value="${settings.master_otp||''}" placeholder="e.g. 999999 (Overrides check)">
                    </div>
                    <div class="col-md-6 mb-2">
                      <label class="spx-label">Dev OTP In Response</label>
                      <select class="form-select spx-input" id="setting_dev_otp_in_response">
                        <option value="true" ${String(settings.dev_otp_in_response) === 'true' ? 'selected' : ''}>Yes (Show OTP for development ease)</option>
                        <option value="false" ${String(settings.dev_otp_in_response) === 'false' ? 'selected' : ''}>No (Prod mode, hide OTP)</option>
                      </select>
                    </div>
                  </div>
                  <button type="submit" class="btn btn-spx w-100 mt-3">Save OTP Settings</button>
                </form>
              </div>
            </div>

            <!-- Pane 4: Live Gateway Tester -->
            <div class="tab-pane fade" id="pane-tester" role="tabpanel">
              <div class="spx-card mb-4 border border-info border-opacity-25">
                <h6 class="mb-3 text-info"><i class="fas fa-vial me-2"></i>Live Gateway Tester</h6>
                <p class="text-muted small mb-3">Execute diagnostic test dispatches to verify external API integration.</p>
                <div class="row">
                  <div class="col-md-6 mb-3">
                    <form onsubmit="runSmsTest(event)" class="p-3 rounded" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); height:100%;">
                      <label class="spx-label small fw-bold"><i class="fas fa-sms me-1 text-info"></i>Test SMS Gateway</label>
                      <div class="input-group input-group-sm mb-2">
                        <input type="text" class="form-control spx-input" id="test_sms_phone" placeholder="Enter mobile number" required>
                        <button type="submit" class="btn btn-outline-info"><i class="fas fa-paper-plane me-1"></i>Send Test SMS</button>
                      </div>
                      <div id="sms_test_output" class="otp-log-terminal d-none mt-2"></div>
                    </form>
                  </div>
                  <div class="col-md-6 mb-3">
                    <form onsubmit="runEmailTest(event)" class="p-3 rounded" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); height:100%;">
                      <label class="spx-label small fw-bold"><i class="fas fa-envelope me-1 text-info"></i>Test Email Gateway (SMTP)</label>
                      <div class="input-group input-group-sm mb-2">
                        <input type="email" class="form-control spx-input" id="test_email_address" placeholder="Enter email address" required>
                        <button type="submit" class="btn btn-outline-info"><i class="fas fa-paper-plane me-1"></i>Send Test Email</button>
                      </div>
                      <div id="email_test_output" class="otp-log-terminal d-none mt-2"></div>
                    </form>
                  </div>
                </div>
              </div>
            </div>

            <!-- Pane 5: API Credentials -->
            <div class="tab-pane fade" id="pane-credentials" role="tabpanel">
              <div class="spx-card mb-4">
                <h6 class="mb-3"><i class="fas fa-key me-2 text-primary"></i>API Credentials</h6>
                <form onsubmit="saveAPICredentials(event)">
                  ${[
                    {key:'razorpay_key_id', label:'Razorpay Key ID'},
                    {key:'razorpay_key_secret', label:'Razorpay Secret'},
                    {key:'agora_app_id', label:'Agora App ID'},
                    {key:'agora_app_certificate', label:'Agora App Certificate'},
                    {key:'agora_customer_id', label:'Agora Customer ID'},
                    {key:'agora_customer_secret', label:'Agora Customer Secret', hidden:true},
                    {key:'smtp_host', label:'SMTP Host'},
                    {key:'smtp_port', label:'SMTP Port'},
                    {key:'smtp_user', label:'SMTP Username'},
                    {key:'smtp_pass', label:'SMTP Password', hidden:true},
                    {key:'smtp_from_email', label:'SMTP From Email (e.g. info@speaxa.com)'},
                  ].map(f => `
                    <div class="mb-2">
                      <label class="spx-label small">${f.label}</label>
                      <input class="form-control spx-input form-control-sm" type="${f.hidden?'password':'text'}" id="cred_${f.key}" value="${settings[f.key]||''}" placeholder="${f.hidden?'••••••••':''}">
                    </div>`).join('')}
                  <button type="submit" class="btn btn-spx w-100 mt-3">Save Credentials</button>
                </form>
              </div>
            </div>

            <!-- Pane 6: OTP Audit Logs -->
            <div class="tab-pane fade" id="pane-logs" role="tabpanel">
              <div class="spx-card">
                <div class="d-flex align-items-center justify-content-between mb-3">
                  <h6 class="mb-0"><i class="fas fa-history me-2 text-primary"></i>Recent OTP Tokens & Delivery Audit Logs</h6>
                  <button onclick="loadOtpAuditLogs()" class="btn btn-sm btn-outline-secondary"><i class="fas fa-sync-alt me-1"></i>Refresh Logs</button>
                </div>
                <div class="table-responsive">
                  <table class="table table-hover align-middle mb-0" style="font-size:0.85rem;">
                    <thead class="table-light">
                      <tr>
                        <th>Identifier (Phone/Email)</th>
                        <th>OTP Code</th>
                        <th>Purpose</th>
                        <th>Delivery Method</th>
                        <th>Delivery Status</th>
                        <th>State</th>
                        <th>Created At</th>
                      </tr>
                    </thead>
                    <tbody id="otpLogsTableBody">
                      <tr><td colspan="7" class="text-center py-3 text-muted">Loading logs...</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Dynamic styling updates for active links in settings vertical tabs
    const settingsTabButtons = document.querySelectorAll('#settingsTabs button');
    settingsTabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        settingsTabButtons.forEach(b => {
          b.style.color = '#aaa';
          b.style.background = 'transparent';
        });
        btn.style.color = '#fff';
        btn.style.background = '#0d7a6d';
      });
    });
    // Set initial active button styling
    document.getElementById('tab-general').style.color = '#fff';
    document.getElementById('tab-general').style.background = '#0d7a6d';

    loadOtpAuditLogs();
  } catch (err) {
    document.getElementById('pageContent').innerHTML = `<div class="alert alert-danger">${err.message}</div>`;
  }
}

function onSmsProviderChange() {
  const provider = document.getElementById('setting_sms_provider')?.value || 'dev';
  document.querySelectorAll('.otp-provider-fields').forEach(el => el.classList.add('d-none'));
  const target = document.getElementById(`fields_${provider}`);
  if (target) target.classList.remove('d-none');
}

async function saveOtpSystemSettings(e) {
  e.preventDefault();
  const fields = [
    'sms_provider', 'email_provider',
    'msg91_auth_key', 'msg91_template_id', 'msg91_sender_id',
    'twilio_account_sid', 'twilio_auth_token', 'twilio_from_phone',
    'fast2sms_api_key', 'fast2sms_route', 'fast2sms_sender_id',
    'twofactor_api_key', 'twofactor_template_name',
    'custom_sms_url', 'custom_sms_method', 'custom_sms_headers', 'custom_sms_body',
    'otp_expiry_minutes', 'otp_length', 'dev_otp_in_response', 'master_otp'
  ];
  const body = {};
  fields.forEach(k => {
    const el = document.getElementById(`setting_${k}`);
    if (el) body[k] = el.value;
  });
  try {
    const d = await apiPost('/admin/settings', body);
    showToast(d.message || 'OTP Gateway Settings updated successfully!');
    renderSettings();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function runSmsTest(e) {
  e.preventDefault();
  const phone = document.getElementById('test_sms_phone').value.trim();
  const outputEl = document.getElementById('sms_test_output');
  if (!phone) return showToast('Enter phone number for test SMS', 'error');

  outputEl.classList.remove('d-none');
  outputEl.innerHTML = `<span class="log-info">[INIT] Dispatching test SMS to ${phone}...</span>\n`;

  try {
    const res = await apiPost('/admin/otp/test-sms', { phone });
    let text = `<span class="log-info">[STATUS] ${res.message}</span>\n`;
    text += `<span class="log-info">[OTP GENERATED] ${res.otp}</span>\n`;
    text += `<span class="log-info">[PROVIDER METHOD] ${res.dispatch?.method || 'unknown'}</span>\n`;
    if (res.dispatch?.sent) {
      text += `<span class="log-success">[SUCCESS] Gateway dispatch returned SUCCESS!</span>\n`;
    } else {
      text += `<span class="log-error">[FAILED] Gateway returned error: ${res.dispatch?.error || 'Unknown error'}</span>\n`;
    }
    text += `\n[RAW DETAILS]\n${JSON.stringify(res.dispatch, null, 2)}`;
    outputEl.innerHTML = text;
    loadOtpAuditLogs();
  } catch (err) {
    outputEl.innerHTML += `<span class="log-error">[FATAL ERROR] ${err.message}</span>`;
  }
}

async function runEmailTest(e) {
  e.preventDefault();
  const email = document.getElementById('test_email_address').value.trim();
  const outputEl = document.getElementById('email_test_output');
  if (!email) return showToast('Enter email address for test', 'error');

  outputEl.classList.remove('d-none');
  outputEl.innerHTML = `<span class="log-info">[INIT] Dispatching test Email to ${email}...</span>\n`;

  try {
    const res = await apiPost('/admin/otp/test-email', { email });
    let text = `<span class="log-info">[STATUS] ${res.message}</span>\n`;
    text += `<span class="log-info">[OTP GENERATED] ${res.otp}</span>\n`;
    text += `<span class="log-info">[PROVIDER METHOD] ${res.dispatch?.method || 'unknown'}</span>\n`;
    if (res.dispatch?.sent) {
      text += `<span class="log-success">[SUCCESS] SMTP/Email dispatch returned SUCCESS!</span>\n`;
    } else {
      text += `<span class="log-error">[FAILED] Email send failed: ${res.dispatch?.error || 'Unknown error'}</span>\n`;
    }
    text += `\n[RAW DETAILS]\n${JSON.stringify(res.dispatch, null, 2)}`;
    outputEl.innerHTML = text;
    loadOtpAuditLogs();
  } catch (err) {
    outputEl.innerHTML += `<span class="log-error">[FATAL ERROR] ${err.message}</span>`;
  }
}

async function loadOtpAuditLogs() {
  const container = document.getElementById('otpLogsTableBody');
  if (!container) return;
  try {
    const logs = await apiGet('/admin/otp/logs?limit=25');
    if (!logs || logs.length === 0) {
      container.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-3">No OTP records found</td></tr>`;
      return;
    }
    container.innerHTML = logs.map(l => {
      const statusBadge = l.delivery_status === 'sent' 
        ? '<span class="badge bg-success">Sent</span>' 
        : l.delivery_status === 'failed' 
        ? '<span class="badge bg-danger">Failed</span>' 
        : '<span class="badge bg-secondary">Pending</span>';

      const usedBadge = l.used 
        ? '<span class="badge bg-secondary">Used</span>' 
        : (new Date(l.expires_at) < new Date() ? '<span class="badge bg-warning text-dark">Expired</span>' : '<span class="badge bg-info">Active</span>');

      return `
        <tr>
          <td><span class="fw-bold font-monospace">${l.identifier}</span></td>
          <td><span class="badge bg-dark font-monospace">${l.otp}</span></td>
          <td><small class="text-muted">${l.purpose}</small></td>
          <td><small class="fw-bold">${l.delivery_method || 'dev'}</small></td>
          <td>${statusBadge}</td>
          <td>${usedBadge}</td>
          <td><small class="text-muted">${new Date(l.created_at).toLocaleTimeString()}</small></td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    container.innerHTML = `<tr><td colspan="7" class="text-danger small py-2">Error loading logs: ${err.message}</td></tr>`;
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

async function saveOtpRequirementSetting(e) {
  e.preventDefault();
  const val = document.getElementById('setting_require_registration_otp').value === 'true';
  try {
    const d = await apiPost('/admin/settings', { require_registration_otp: val });
    showToast(d.message || 'Registration OTP requirement updated!');
    renderSettings();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function saveLevelPayouts(e) {
  e.preventDefault();
  const keys = [
    'payout_pct_Junior_Teacher', 'payout_pct_Assistant_Teacher', 'payout_pct_Senior_Teacher',
    'payout_pct_Executive_Teacher', 'payout_pct_Lecturer', 'payout_pct_Professor',
    'payout_pct_Senior_Professor', 'payout_pct_HOD', 'payout_pct_Dean'
  ];
  const body = {};
  keys.forEach(k => { body[k] = document.getElementById(`setting_${k}`)?.value || ''; });
  try { const d = await apiPost('/admin/settings',body); showToast(d.message||'Level payouts saved'); }
  catch (err) { showToast(err.message,'error'); }
}

async function saveAPICredentials(e) {
  e.preventDefault();
  const keys = ['razorpay_key_id','razorpay_key_secret','agora_app_id','agora_app_certificate','agora_customer_id','agora_customer_secret','smtp_host','smtp_port','smtp_user','smtp_pass','smtp_from_email'];
  const body = {};
  keys.forEach(k => { const v = document.getElementById(`cred_${k}`)?.value; if (v) body[k] = v; });
  try { const d = await apiPost('/admin/settings',body); showToast(d.message||'API credentials saved'); }
  catch (err) { showToast(err.message,'error'); }
}

async function saveHomepageSettings(e) {
  e.preventDefault();
  const keys = [
    'home_hero_badge', 'home_hero_title', 'home_hero_desc', 'home_hero_cta_primary', 'home_hero_cta_secondary',
    'home_steps_title', 'home_step1_title', 'home_step1_desc', 'home_step2_title', 'home_step2_desc', 'home_step3_title', 'home_step3_desc',
    'home_courses_badge', 'home_courses_title', 'home_teachers_badge', 'home_teachers_title', 'home_teachers_desc',
    'home_features_badge', 'home_features_title', 'home_cta_title', 'home_cta_desc', 'home_cta_btn_student', 'home_cta_btn_teacher',
    'home_footer_desc', 'home_footer_toll_free', 'home_footer_phone', 'home_footer_email',
    'home_footer_instagram', 'home_footer_facebook', 'home_footer_youtube', 'home_footer_twitter',
    'home_footer_play_store_url', 'home_footer_app_store_url'
  ];
  const body = {};
  keys.forEach(k => { body[k] = document.getElementById(`setting_${k}`)?.value || ''; });
  try { const d = await apiPost('/admin/settings',body); showToast(d.message||'Homepage content saved'); }
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

// ── Rewards & Allowances management ──────────────────────────
async function renderRewards() {
  loading();
  try {
    const pending = await apiGet('/admin/rewards/pending');
    const settings = await apiGet('/admin/settings');
    const slabs = await apiGet('/admin/config/slabs');
    const allowances = await apiGet('/admin/config/allowances');
    
    // Set default month in YYYY-MM
    const today = new Date();
    const curMonth = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0');

    document.getElementById('pageContent').innerHTML = `
      <div class="row g-4">
        <!-- 1. Global Rewards & Referral Settings -->
        <div class="col-lg-7">
          <div class="spx-card h-100">
            <h6 class="mb-4 text-white"><i class="fas fa-sliders-h text-primary me-2"></i>Global Referral & Reward Settings</h6>
            <p class="text-muted small">Configure the global percentages and limits for student referrals, teacher referrals, and course sharing splits.</p>
            
            <div class="mb-4 p-3 rounded" style="background: rgba(59,130,246,0.05); border: 1px dashed rgba(59,130,246,0.2); font-size: 0.8rem; color:#94a3b8;">
              <strong class="text-white"><i class="fas fa-info-circle me-1"></i> Admin Guide / मार्गदर्शिका:</strong>
              <ul class="mb-0 ps-3 mt-1 small">
                <li><strong>Student Referral Bonus:</strong> जब भी student कोई Course बुक करेगा, तो total payment का यह % refer करने वाले teacher को wallet में मिलेगा। (Teacher receives this % of referred student's course purchase).</li>
                <li><strong>Teacher Referral Bonus:</strong> जब referred teacher Course sales से कमाएगा, तो उसकी earning का यह % refer करने वाले teacher को मिलेगा। (Teacher receives this % of referred teacher's earnings).</li>
                <li><strong>Max Cap:</strong> एक teacher अधिकतम कितने शिक्षकों को refer कर बोनस पा सकता है। (Maximum referred teachers eligible for the earnings bonus).</li>
                <li><strong>Default/Referral Share:</strong> Course sale से creator teacher को मिलने वाला हिस्सा (बाकी platform share होगा)। (Percentage of course sale paid to creator teacher).</li>
              </ul>
            </div>

            <form onsubmit="saveReferralSettings(event)">
              <div class="row g-3">
                <div class="col-md-6">
                  <label class="spx-label text-muted">Student Referral Bonus (%)</label>
                  <input type="number" step="0.01" class="form-control spx-input text-white" id="ref_student_referral_bonus_pct" value="${settings.student_referral_bonus_pct || '5.00'}" required>
                  <div class="text-muted mt-1" style="font-size:0.75rem;">% of payment amount credited to referring teacher</div>
                </div>
                <div class="col-md-6">
                  <label class="spx-label text-muted">Teacher Referral Bonus (%)</label>
                  <input type="number" step="0.01" class="form-control spx-input text-white" id="ref_teacher_referral_bonus_pct" value="${settings.teacher_referral_bonus_pct || '1.00'}" required>
                  <div class="text-muted mt-1" style="font-size:0.75rem;">% of referred teacher's share paid to referrer</div>
                </div>
                <div class="col-md-6">
                  <label class="spx-label text-muted">Max Referral Capacity Cap</label>
                  <input type="number" class="form-control spx-input text-white" id="ref_teacher_referral_max_cap" value="${settings.teacher_referral_max_cap || '10'}" required>
                  <div class="text-muted mt-1" style="font-size:0.75rem;">Maximum referred teachers count eligible for bonus</div>
                </div>
                <div class="col-md-6">
                  <label class="spx-label text-muted">Default Teacher Share (%)</label>
                  <input type="number" step="0.01" class="form-control spx-input text-white" id="ref_default_teacher_share_pct" value="${settings.default_teacher_share_pct || '50.00'}" required>
                  <div class="text-muted mt-1" style="font-size:0.75rem;">Default course split share paid to teaching creator</div>
                </div>
                <div class="col-md-6">
                  <label class="spx-label text-muted">Referral Teacher Share (%)</label>
                  <input type="number" step="0.01" class="form-control spx-input text-white" id="ref_referral_teacher_share_pct" value="${settings.referral_teacher_share_pct || '50.00'}" required>
                  <div class="text-muted mt-1" style="font-size:0.75rem;">Split share when course is bought via referral link</div>
                </div>
              </div>
              <button type="submit" class="btn btn-spx mt-4 px-4"><i class="fas fa-save me-2"></i>Save Referral Settings</button>
            </form>
          </div>
        </div>

        <!-- 2. Monthly Grooming Allowance Generator -->
        <div class="col-lg-5">
          <div class="spx-card h-100 d-flex flex-column justify-content-between">
            <div>
              <h6 class="mb-4 text-white"><i class="fas fa-magic text-info me-2"></i>Monthly Grooming Allowances</h6>
              <p class="text-muted small">Generate monthly allowances for all verified teachers. Allowance amounts are computed dynamically based on the teacher's highest approved performance slab group.</p>
              
              <div class="mb-4 p-3 rounded" style="background: rgba(6,182,212,0.05); border: 1px dashed rgba(6,182,212,0.2); font-size: 0.8rem; color:#94a3b8;">
                <strong class="text-white"><i class="fas fa-info-circle me-1"></i> Admin Guide / मार्गदर्शिका:</strong>
                <p class="mb-0 mt-1 small">
                  हर महीने के अंत में यहाँ से <strong>Grooming Allowances</strong> जनरेट करें। यह ऑटोमैटिकली सभी teachers के हाइएस्ट अप्रूव्ड परफॉर्मेंस स्लैब (जैसे HOD/Dean) के अलाउंस को कैलकुलेट करके उनके Wallet में क्रेडिट कर देता है। (Trigger monthly allowance payouts at the end of the month based on each teacher's highest approved slab milestone group).
                </p>
              </div>

              <div class="mb-4 mt-3">
                <label class="spx-label text-muted">Select Month (YYYY-MM)</label>
                <input type="month" class="form-control spx-input" id="allowanceMonthSelect" value="${curMonth}">
              </div>
            </div>

            <button class="btn btn-spx w-100 py-3 mt-auto" id="btnGenAllowances" onclick="generateAllowances()">
              <i class="fas fa-bolt me-2"></i>Generate & Pay Allowances
            </button>
          </div>
        </div>

        <!-- 3. Pending Slab Achievements Review -->
        <div class="col-12">
          <div class="spx-card">
            <h6 class="mb-4 text-white"><i class="fas fa-clock text-warning me-2"></i>Pending Slab Achievements Review (${pending.length})</h6>
            ${pending.length > 0 ? table(
              ['Teacher', 'Slab', 'Reward Value', 'Item Gift', 'Achieved', 'Actions'],
              pending.map(p => `
                <tr>
                  <td class="fw-semibold text-white">
                    ${p.teacher_name || '—'}<br>
                    <small class="text-muted">${p.teacher_email || ''}</small>
                  </td>
                  <td><strong class="text-info">${p.slab_name}</strong></td>
                  <td class="fw-bold text-success">${fmtCurrency(p.reward_amount)}</td>
                  <td>${p.reward_item}</td>
                  <td>${fmtDate(p.achieved_at)}</td>
                  <td>
                    <button class="btn btn-sm btn-success me-1 text-white" onclick="approveReward('${p.id}')">Approve</button>
                    <button class="btn btn-sm btn-danger text-white" onclick="rejectReward('${p.id}')">Reject</button>
                  </td>
                </tr>
              `).join('')
            ) : '<p class="text-muted text-center py-4">No pending performance rewards claims under review.</p>'}
          </div>
        </div>

        <!-- 4. Performance Slabs Configuration -->
        <div class="col-12">
          <div class="spx-card">
            <div class="d-flex justify-content-between align-items-center mb-4">
              <h6 class="mb-0 text-white"><i class="fas fa-trophy text-warning me-2"></i>Performance Slab Milestones</h6>
              <button class="btn btn-sm btn-spx" onclick="showSlabModal()"><i class="fas fa-plus me-1"></i>Add New Slab</button>
            </div>
            
            <div class="mb-4 p-3 rounded" style="background: rgba(234,179,8,0.05); border: 1px dashed rgba(234,179,8,0.2); font-size: 0.8rem; color:#94a3b8;">
              <strong class="text-white"><i class="fas fa-info-circle me-1"></i> Admin Guide / मार्गदर्शिका:</strong>
              <p class="mb-0 mt-1 small">
                शिक्षकों की cumulative sales कमाई (Revenue) के आधार पर परफॉर्मेंस स्लैब अनलॉक होते हैं। स्लैब अनलॉक होने पर शिक्षक को इनाम (Cash + Item Gift) मिलता है, और वे एक विशिष्ट भत्ते समूह (Allowance Group) में शामिल हो जाते हैं। (Slab milestones are automatically reached based on teacher revenue. Unlocking rewards the teacher and assigns them to an allowance group).
              </p>
            </div>

            ${slabs.length > 0 ? table(
              ['Slab Name', 'Target Revenue', 'Reward Cash', 'Gift Item', 'Grooming Group', 'Actions'],
              slabs.map(s => `
                <tr>
                  <td class="fw-semibold text-white">${s.slab_name}</td>
                  <td class="fw-bold text-info">${fmtCurrency(s.target_revenue)}</td>
                  <td class="fw-bold text-success">${fmtCurrency(s.reward_amount)}</td>
                  <td>${s.reward_item}</td>
                  <td><span class="badge text-primary bg-primary bg-opacity-10 border border-primary border-opacity-20">${s.grooming_group}</span></td>
                  <td>
                    <button class="btn btn-sm btn-light border text-dark me-1" onclick="showSlabModal('${s.id}')"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-sm btn-danger text-white" onclick="deleteSlab('${s.id}')"><i class="fas fa-trash"></i></button>
                  </td>
                </tr>
              `).join('')
            ) : '<p class="text-muted text-center py-4">No performance slab milestones configured.</p>'}
          </div>
        </div>

        <!-- 5. Grooming Allowances Configuration -->
        <div class="col-12">
          <div class="spx-card">
            <div class="d-flex justify-content-between align-items-center mb-4">
              <h6 class="mb-0 text-white"><i class="fas fa-hand-holding-usd text-success me-2"></i>Grooming Allowance Groups</h6>
              <button class="btn btn-sm btn-spx" onclick="showAllowanceModal()"><i class="fas fa-plus me-1"></i>Add Allowance Group</button>
            </div>
            
            <div class="mb-4 p-3 rounded" style="background: rgba(16,185,129,0.05); border: 1px dashed rgba(16,185,129,0.2); font-size: 0.8rem; color:#94a3b8;">
              <strong class="text-white"><i class="fas fa-info-circle me-1"></i> Admin Guide / मार्गदर्शिका:</strong>
              <p class="mb-0 mt-1 small">
                यहाँ अलाउंस ग्रुप की मासिक राशि सेट करें (जैसे Leadership Group = ₹25,000)। जब शिक्षक का स्लैब इस ग्रुप से जुड़ा होगा, तो मासिक अलाउंस जनरेट करने पर उन्हें यह निश्चित राशि प्राप्त होगी। (Configure the fixed monthly allowance amount for each tier. Teachers linked to these groups will receive this amount during monthly allowance payouts).
              </p>
            </div>

            ${allowances.length > 0 ? table(
              ['Group Name', 'Monthly Allowance Amount', 'Description', 'Actions'],
              allowances.map(a => `
                <tr>
                  <td class="fw-semibold text-white">${a.group_name}</td>
                  <td class="fw-bold text-success">${fmtCurrency(a.allowance_amount)}</td>
                  <td class="text-muted">${a.description || '—'}</td>
                  <td>
                    <button class="btn btn-sm btn-light border text-dark me-1" onclick="showAllowanceModal('${encodeURIComponent(a.group_name)}')"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-sm btn-danger text-white" onclick="deleteAllowance('${encodeURIComponent(a.group_name)}')"><i class="fas fa-trash"></i></button>
                  </td>
                </tr>
              `).join('')
            ) : '<p class="text-muted text-center py-4">No grooming allowance groups configured.</p>'}
          </div>
        </div>
      </div>
    `;
  } catch (err) {
    document.getElementById('pageContent').innerHTML = `<div class="alert alert-danger">${err.message}</div>`;
  }
}

async function saveReferralSettings(e) {
  e.preventDefault();
  const keys = [
    'student_referral_bonus_pct',
    'teacher_referral_bonus_pct',
    'teacher_referral_max_cap',
    'default_teacher_share_pct',
    'referral_teacher_share_pct'
  ];
  const body = {};
  keys.forEach(k => {
    const el = document.getElementById(`ref_${k}`);
    if (el) body[k] = el.value;
  });
  try {
    const d = await apiPost('/admin/settings', body);
    showToast(d.message || 'Settings saved successfully');
    renderRewards();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function approveReward(id) {
  try {
    const d = await apiPost(`/admin/rewards/${id}/approve`);
    showToast(d.message || 'Slab reward approved and teacher wallet credited.');
    renderRewards();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function rejectReward(id) {
  adminPrompt('Reject Slab Reward Claim', 'Provide a rejection reason:', '', async (notes) => {
    try {
      const d = await apiPost(`/admin/rewards/${id}/reject`, { admin_notes: notes });
      showToast(d.message || 'Slab reward claim rejected.');
      renderRewards();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}

async function generateAllowances() {
  const month = document.getElementById('allowanceMonthSelect').value.trim();
  if (!month) return showToast('Please select a valid month', 'error');

  const btn = document.getElementById('btnGenAllowances');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> Generating...`;
  }

  try {
    const d = await apiPost('/admin/allowances/generate', { payment_month: month });
    showToast(d.message || `Grooming allowances for ${month} generated & paid successfully!`);
    renderRewards();
  } catch (err) {
    showToast(err.message, 'error');
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `<i class="fas fa-magic me-2"></i>Generate & Pay Allowances`;
    }
  }
}

async function showSlabModal(slabId = null) {
  let slab = { slab_name: '', target_revenue: '', reward_amount: '', reward_item: '', grooming_group: '' };
  if (slabId) {
    try {
      const slabs = await apiGet('/admin/config/slabs');
      const found = slabs.find(s => s.id === slabId);
      if (found) slab = found;
    } catch (err) {
      showToast(err.message, 'error');
      return;
    }
  }

  // Get allowance groups to fill the selector
  let groups = [];
  try {
    groups = await apiGet('/admin/config/allowances');
  } catch (err) {
    console.error(err);
  }

  document.getElementById('formModalTitle').textContent = slabId ? 'Edit Slab Milestone' : 'Add Slab Milestone';
  document.getElementById('formModalBody').innerHTML = `
    <form id="slabConfigForm" onsubmit="saveSlabConfig(event, ${slabId ? `'${slabId}'` : 'null'})">
      <div class="mb-3">
        <label class="spx-label text-dark">Slab Name *</label>
        <input type="text" class="form-control text-dark" id="slab_name" value="${slab.slab_name}" required placeholder="e.g. Junior Teacher">
      </div>
      <div class="mb-3">
        <label class="spx-label text-dark">Target Revenue (INR) *</label>
        <input type="number" class="form-control text-dark" id="slab_target_revenue" value="${slab.target_revenue}" required placeholder="e.g. 100000">
      </div>
      <div class="mb-3">
        <label class="spx-label text-dark">Reward Cash Amount (INR) *</label>
        <input type="number" class="form-control text-dark" id="slab_reward_amount" value="${slab.reward_amount}" required placeholder="e.g. 5000">
      </div>
      <div class="mb-3">
        <label class="spx-label text-dark">Reward Gift Item *</label>
        <input type="text" class="form-control text-dark" id="slab_reward_item" value="${slab.reward_item}" required placeholder="e.g. Tablet (25K)">
      </div>
      <div class="mb-3">
        <label class="spx-label text-dark">Grooming Allowance Group *</label>
        <select class="form-select text-dark" id="slab_grooming_group" required>
          <option value="" disabled ${!slab.grooming_group ? 'selected' : ''}>Select a group</option>
          ${groups.map(g => `<option value="${g.group_name}" ${slab.grooming_group === g.group_name ? 'selected' : ''}>${g.group_name}</option>`).join('')}
        </select>
      </div>
      <button type="submit" class="btn btn-spx w-100 mt-3 text-white">Save Slab Configuration</button>
    </form>
  `;
  formModal.show();
}

async function saveSlabConfig(e, slabId) {
  e.preventDefault();
  const body = {
    slab_name: document.getElementById('slab_name').value.trim(),
    target_revenue: parseFloat(document.getElementById('slab_target_revenue').value),
    reward_amount: parseFloat(document.getElementById('slab_reward_amount').value),
    reward_item: document.getElementById('slab_reward_item').value.trim(),
    grooming_group: document.getElementById('slab_grooming_group').value
  };

  try {
    let d;
    if (slabId) {
      d = await apiPut(`/admin/config/slabs/${slabId}`, body);
    } else {
      d = await apiPost('/admin/config/slabs', body);
    }
    showToast(d.message || 'Slab configuration saved successfully');
    formModal.hide();
    renderRewards();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deleteSlab(slabId) {
  if (!confirm('Are you sure you want to delete this slab milestone?')) return;
  try {
    const d = await apiDelete(`/admin/config/slabs/${slabId}`);
    showToast(d.message || 'Slab deleted successfully');
    renderRewards();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function showAllowanceModal(groupNameEncoded = null) {
  let group = { group_name: '', allowance_amount: '', description: '' };
  const groupName = groupNameEncoded ? decodeURIComponent(groupNameEncoded) : null;
  if (groupName) {
    try {
      const allowances = await apiGet('/admin/config/allowances');
      const found = allowances.find(a => a.group_name === groupName);
      if (found) group = found;
    } catch (err) {
      showToast(err.message, 'error');
      return;
    }
  }

  document.getElementById('formModalTitle').textContent = groupName ? 'Edit Allowance Group' : 'Add Allowance Group';
  document.getElementById('formModalBody').innerHTML = `
    <form id="allowanceConfigForm" onsubmit="saveAllowanceConfig(event, ${groupName ? `'${encodeURIComponent(groupName)}'` : 'null'})">
      <div class="mb-3">
        <label class="spx-label text-dark">Group Name *</label>
        <input type="text" class="form-control text-dark" id="group_name" value="${group.group_name}" ${groupName ? 'disabled' : ''} required placeholder="e.g. Teaching Excellence Group">
      </div>
      <div class="mb-3">
        <label class="spx-label text-dark">Monthly Allowance Amount (INR) *</label>
        <input type="number" class="form-control text-dark" id="allowance_amount" value="${group.allowance_amount}" required placeholder="e.g. 5000">
      </div>
      <div class="mb-3">
        <label class="spx-label text-dark">Description</label>
        <textarea class="form-control text-dark" id="group_desc" rows="3" placeholder="Description of this group's eligibility or tier...">${group.description || ''}</textarea>
      </div>
      <button type="submit" class="btn btn-spx w-100 mt-3 text-white">Save Allowance Group</button>
    </form>
  `;
  formModal.show();
}

async function saveAllowanceConfig(e, groupNameEncoded) {
  e.preventDefault();
  const body = {
    group_name: document.getElementById('group_name').value.trim(),
    allowance_amount: parseFloat(document.getElementById('allowance_amount').value),
    description: document.getElementById('group_desc').value.trim()
  };

  try {
    const d = await apiPost('/admin/config/allowances', body);
    showToast(d.message || 'Allowance group saved successfully');
    formModal.hide();
    renderRewards();
  } catch (err) {
    showToast(err.message, 'error');
  }
}
async function deleteAllowance(groupNameEncoded) {
  const groupName = decodeURIComponent(groupNameEncoded);
  if (!confirm(`Are you sure you want to delete allowance group "${groupName}"?`)) return;
  try {
    const d = await apiDelete(`/admin/config/allowances/${groupNameEncoded}`);
    showToast(d.message || 'Allowance group deleted successfully');
    renderRewards();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function highlightFormFieldError(formElement, errorMessage) {
  if (!formElement || !errorMessage) return;

  // Clear existing errors
  formElement.querySelectorAll('.spx-field-error').forEach(el => el.remove());
  formElement.querySelectorAll('.spx-input-error').forEach(el => {
    el.classList.remove('spx-input-error');
    el.style.borderColor = '';
    el.style.boxShadow = '';
  });

  const msg = errorMessage.toLowerCase();
  let matchedInput = null;

  const rules = [
    { keys: ['course selection', 'course is required'], ids: ['batchCourse', 'noteCourse'] },
    { keys: ['batch name'], ids: ['batchName'] },
    { keys: ['subject'], ids: ['batchSubject', 'courseSubject', 'tCourseSubject'] },
    { keys: ['start date'], ids: ['batchStartD'] },
    { keys: ['end date'], ids: ['batchEndD'] },
    { keys: ['start time'], ids: ['batchStartT'] },
    { keys: ['end time'], ids: ['batchEndT'] },
    { keys: ['days', 'day of week'], ids: ['batchDaysContainer'] },
    { keys: ['capacity'], ids: ['batchCapacity'] },
    { keys: ['planner desc', 'schedule', 'syllabus text'], ids: ['batchPlannerDesc'] },
    { keys: ['planner file', 'planner document', 'planner upload'], ids: ['batchPlanner'] },
    { keys: ['teaching method', 'style', 'methodology'], ids: ['batchTeachingMethod'] },
    { keys: ['instructions', 'prerequisites'], ids: ['batchInstructions'] },
    { keys: ['demo video'], ids: ['batchDemoVideo'] },
    { keys: ['title'], ids: ['courseTitle', 'tCourseTitle', 'assignTitle', 'noteTitle'] },
    { keys: ['description'], ids: ['courseDesc', 'tCourseDesc', 'assignDesc', 'noteDesc'] },
    { keys: ['duration weeks'], ids: ['courseLearningDuration', 'tCourseLearningDuration'] },
    { keys: ['grade'], ids: ['courseGrade', 'tCourseGrade'] },
    { keys: ['board'], ids: ['courseBoard', 'tCourseBoard'] },
    { keys: ['fees', 'fee'], ids: ['courseFees'] },
    { keys: ['thumbnail', 'banner'], ids: ['courseFileInput'] },
    { keys: ['badge', 'tag line'], ids: ['courseCustomTag', 'tCourseCustomTag'] },
    { keys: ['objective'], ids: ['courseObjective', 'tCourseObjective'] },
    { keys: ['outcome'], ids: ['courseLearningOutcome', 'tCourseLearningOutcome'] },
    { keys: ['language'], ids: ['courseLanguageInstruction', 'tCourseLanguageInstruction'] },
    { keys: ['daily class', 'daily duration'], ids: ['courseDailyClassDuration', 'tCourseDailyClassDuration'] },
    { keys: ['assessment'], ids: ['courseAssessmentDays', 'tCourseAssessmentDays'] },
    { keys: ['due date', 'due'], ids: ['assignDue'] },
    { keys: ['marks'], ids: ['assignMax'] },
    { keys: ['attachment', 'file upload'], ids: ['assignFile', 'noteFile'] }
  ];

  for (const rule of rules) {
    if (rule.keys.some(k => msg.includes(k))) {
      for (const id of rule.ids) {
        const el = formElement.querySelector(`#${id}`);
        if (el) {
          matchedInput = el;
          break;
        }
      }
    }
    if (matchedInput) break;
  }

  if (!matchedInput) {
    const inputs = formElement.querySelectorAll('input, textarea, select');
    for (const input of inputs) {
      const id = input.id ? input.id.toLowerCase() : '';
      const name = input.name ? input.name.toLowerCase() : '';
      const placeholder = input.placeholder ? input.placeholder.toLowerCase() : '';
      if (rules.some(r => r.keys.some(k => msg.includes(k) && (id.includes(k) || name.includes(k) || placeholder.includes(k))))) {
        matchedInput = input;
        break;
      }
    }
  }

  if (matchedInput) {
    matchedInput.classList.add('spx-input-error');
    matchedInput.style.borderColor = '#ef4444';
    matchedInput.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.15)';

    const errDiv = document.createElement('div');
    errDiv.className = 'spx-field-error text-danger mt-1 small fw-semibold';
    errDiv.style.color = '#ef4444';
    errDiv.innerHTML = `<i class="fas fa-exclamation-circle me-1"></i>${errorMessage}`;

    if (matchedInput.nextSibling) {
      matchedInput.parentNode.insertBefore(errDiv, matchedInput.nextSibling);
    } else {
      matchedInput.parentNode.appendChild(errDiv);
    }

    matchedInput.scrollIntoView({ behavior: 'smooth', block: 'center' });

    const clearError = () => {
      matchedInput.classList.remove('spx-input-error');
      matchedInput.style.borderColor = '';
      matchedInput.style.boxShadow = '';
      errDiv.remove();
      matchedInput.removeEventListener('input', clearError);
      matchedInput.removeEventListener('change', clearError);
    };
    matchedInput.addEventListener('input', clearError);
    matchedInput.addEventListener('change', clearError);
  }
}

// ── Mail Manager (Campaign & Email logs with Quill WYSIWYG) ───
let campaignQuill = null;

async function renderMailManager() {
  document.getElementById('pageContent').innerHTML = `
    <div class="spx-card mb-4">
      <div class="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h5 class="mb-1"><i class="fas fa-envelope-open-text me-2 text-primary"></i>Mail Manager</h5>
          <p class="text-muted small mb-0">Compose campaigns, view transmission logs, and audit automated communications.</p>
        </div>
      </div>
      
      <!-- Nav Tabs -->
      <ul class="nav nav-tabs border-bottom mb-4" id="mailManagerTabs" role="tablist">
        <li class="nav-item" role="presentation">
          <button class="nav-link active py-2.5 px-4 small fw-semibold text-decoration-none border-0" id="send-campaign-tab" data-bs-toggle="tab" data-bs-target="#send-campaign" type="button" role="tab" style="background:transparent; color:#aaa;"><i class="fas fa-paper-plane me-2"></i>Send Email Campaign</button>
        </li>
        <li class="nav-item" role="presentation">
          <button class="nav-link py-2.5 px-4 small fw-semibold text-decoration-none border-0" id="campaign-history-tab" data-bs-toggle="tab" data-bs-target="#campaign-history" type="button" role="tab" style="background:transparent; color:#aaa;"><i class="fas fa-history me-2"></i>Broadcast History</button>
        </li>
        <li class="nav-item" role="presentation">
          <button class="nav-link py-2.5 px-4 small fw-semibold text-decoration-none border-0" id="email-logs-tab" data-bs-toggle="tab" data-bs-target="#email-logs" type="button" role="tab" style="background:transparent; color:#aaa;"><i class="fas fa-list-ul me-2"></i>All Email Logs</button>
        </li>
      </ul>

      <!-- Tab Content -->
      <div class="tab-content" id="mailManagerTabContent">
        <!-- Tab 1: Send Campaign -->
        <div class="tab-pane fade show active" id="send-campaign" role="tabpanel">
          <div class="row g-4">
            <!-- Composer -->
            <div class="col-lg-7">
              <form id="campaignForm" onsubmit="sendCampaignMail(event)">
                <div class="mb-3">
                  <label class="spx-label">Target Audience</label>
                  <select class="form-select spx-input" id="campaignTargetRole" onchange="toggleCustomEmailField()" required>
                    <option value="all">All Enrolled Users (Students, Teachers, Parents)</option>
                    <option value="student">Students Only</option>
                    <option value="teacher">Teachers Only</option>
                    <option value="parent">Parents Only</option>
                    <option value="custom">Specific Custom Email</option>
                  </select>
                </div>
                <div class="mb-3 d-none" id="customEmailGroup">
                  <label class="spx-label">Recipient Email Address</label>
                  <input type="email" class="form-control spx-input" id="campaignTargetEmail" placeholder="e.g. student@gmail.com">
                </div>
                <div class="mb-3">
                  <label class="spx-label">Subject</label>
                  <input type="text" class="form-control spx-input" id="campaignSubject" placeholder="e.g. Important Platform Update: New Features Added!" oninput="updateMailPreviewFromQuill()" required>
                </div>
                <div class="mb-3">
                  <label class="spx-label">Email Body (Rich text format)</label>
                  <p class="text-muted extra-small mb-2">Tip: Use the toolbar to format, insert links, or upload/paste photos. Use <code>{NAME}</code> for recipient name.</p>
                  <!-- Quill Editor element -->
                  <div id="campaignEditor" style="height: 320px; background: white; border-radius: 8px;"></div>
                </div>
                <button type="submit" class="btn btn-spx w-100 py-3" id="sendCampaignBtn">
                  <i class="fas fa-paper-plane me-2"></i>Broadcast Email Campaign
                </button>
              </form>
            </div>

            <!-- Previewer -->
            <div class="col-lg-5">
              <div class="rounded border p-3 bg-light h-100 d-flex flex-column" style="min-height: 500px;">
                <h6 class="small fw-bold text-muted mb-3"><i class="fas fa-eye me-1"></i>Live Campaign Preview</h6>
                <div class="border rounded bg-white p-3 flex-grow-1 overflow-auto" id="mailLivePreview" style="max-height: 500px; min-height: 350px;">
                  <div class="text-center text-muted p-5">
                    <i class="fas fa-edit fa-3x mb-3 text-opacity-25"></i>
                    <p class="mb-0">Start composing your email campaign on the left to see its preview in real-time.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Tab 2: Broadcast History -->
        <div class="tab-pane fade" id="campaign-history" role="tabpanel">
          <div class="table-responsive">
            <table class="table table-hover spx-table">
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Target Audience</th>
                  <th>Recipients</th>
                  <th>Sent By</th>
                  <th>Date & Time</th>
                </tr>
              </thead>
              <tbody id="campaignHistoryTableBody">
                <tr><td colspan="5" class="text-center py-4">Loading campaign history...</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Tab 3: All Email Logs -->
        <div class="tab-pane fade" id="email-logs" role="tabpanel">
          <div class="table-responsive">
            <table class="table table-hover spx-table">
              <thead>
                <tr>
                  <th>Recipient</th>
                  <th>Subject</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Date & Time</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody id="emailLogsTableBody">
                <tr><td colspan="6" class="text-center py-4">Loading email logs...</td></tr>
              </tbody>
            </table>
          </div>
          <!-- Pagination -->
          <div class="d-flex justify-content-between align-items-center mt-3">
            <button class="btn btn-sm btn-outline-secondary" id="prevEmailLogsBtn" onclick="loadEmailLogsPage(-1)" disabled>Previous</button>
            <span class="small text-muted" id="emailLogsPaginationText">Page 1</span>
            <button class="btn btn-sm btn-outline-secondary" id="nextEmailLogsBtn" onclick="loadEmailLogsPage(1)" disabled>Next</button>
          </div>
        </div>
      </div>
    </div>
  `;

  // Dynamic styling updates for active links in tabs
  const tabButtons = document.querySelectorAll('#mailManagerTabs button');
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      tabButtons.forEach(b => b.style.color = '#aaa');
      btn.style.color = '#0d7a6d';
    });
  });
  document.getElementById('send-campaign-tab').style.color = '#0d7a6d';

  // Initialize Quill Editor
  campaignQuill = new Quill('#campaignEditor', {
    theme: 'snow',
    placeholder: 'Write your email campaign content here... You can format text, add photos, and insert {NAME} placeholders.',
    modules: {
      toolbar: [
        [{ 'header': [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'color': [] }, { 'background': [] }],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        ['link', 'image'],
        ['clean']
      ]
    }
  });

  campaignQuill.on('text-change', () => {
    updateMailPreviewFromQuill();
  });

  // Bind events & Load data
  toggleCustomEmailField();
  
  // Tab change triggers data load
  document.getElementById('campaign-history-tab').addEventListener('shown.bs.tab', loadCampaignHistory);
  document.getElementById('email-logs-tab').addEventListener('shown.bs.tab', () => loadEmailLogs(0));
}

function toggleCustomEmailField() {
  const role = document.getElementById('campaignTargetRole').value;
  const customEmailGroup = document.getElementById('customEmailGroup');
  const targetEmailInput = document.getElementById('campaignTargetEmail');
  if (role === 'custom') {
    customEmailGroup.classList.remove('d-none');
    targetEmailInput.required = true;
  } else {
    customEmailGroup.classList.add('d-none');
    targetEmailInput.required = false;
  }
}

function updateMailPreviewFromQuill() {
  if (!campaignQuill) return;
  const subject = document.getElementById('campaignSubject').value || '(No Subject)';
  const body = campaignQuill.root.innerHTML;
  
  if (campaignQuill.getText().trim().length === 0 && body.indexOf('<img') === -1) {
    document.getElementById('mailLivePreview').innerHTML = `
      <div class="text-center text-muted p-5">
        <i class="fas fa-edit fa-3x mb-3 text-opacity-25"></i>
        <p class="mb-0">Start composing your email campaign on the left to see its preview in real-time.</p>
      </div>
    `;
    return;
  }

  const platformName = 'Speaxa';
  const formattedBody = body.replace(/{NAME}/g, 'John Doe');

  document.getElementById('mailLivePreview').innerHTML = `
    <div style="font-family: Arial, sans-serif; font-size:14px; line-height:1.5; color:#333; max-width: 100%;">
      <div style="background: #f8fafc; padding: 12px; border-bottom:1px solid #eee; margin-bottom: 20px; font-size:12px; border-radius: 4px;">
        <strong>Subject:</strong> ${subject}
      </div>
      <div style="padding: 10px;">
        ${formattedBody}
      </div>
      <hr style="border:0; border-top:1px solid #eee; margin:30px 0 10px 0;">
      <div style="text-align:center; font-size:11px; color:#999;">
        This email was broadcasted via ${platformName} Admin Portal.
      </div>
    </div>
  `;
}

async function sendCampaignMail(e) {
  e.preventDefault();
  if (!campaignQuill) return;

  const btn = document.getElementById('sendCampaignBtn');
  const originalHtml = btn.innerHTML;
  btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Broadcasting campaign...';
  btn.disabled = true;

  const targetRole = document.getElementById('campaignTargetRole').value;
  const targetEmail = document.getElementById('campaignTargetEmail').value;
  const subject = document.getElementById('campaignSubject').value;
  const body = campaignQuill.root.innerHTML;

  try {
    const res = await apiPost('/admin/emails/send', { targetRole, targetEmail, subject, body });
    showToast(res.message || 'Campaign broadcast initiated successfully!', 'success');
    
    // Clear form
    document.getElementById('campaignSubject').value = '';
    campaignQuill.setContents([]);
    updateMailPreviewFromQuill();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.innerHTML = originalHtml;
    btn.disabled = false;
  }
}

async function loadCampaignHistory() {
  const tbody = document.getElementById('campaignHistoryTableBody');
  tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4"><span class="spinner-border spinner-border-sm me-2"></span>Loading campaigns...</td></tr>';
  
  try {
    const campaigns = await apiGet('/admin/emails/campaigns');
    if (campaigns.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-muted">No campaigns found.</td></tr>';
      return;
    }

    tbody.innerHTML = campaigns.map(c => `
      <tr>
        <td class="fw-semibold">${escapeHtml(c.subject)}</td>
        <td><span class="badge bg-secondary">${c.target_role}</span></td>
        <td>${c.recipient_count} users</td>
        <td>${escapeHtml(c.sender_name || 'Admin')}</td>
        <td class="small text-muted">${new Date(c.created_at).toLocaleString('en-IN')}</td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-danger">${err.message}</td></tr>`;
  }
}

let emailLogsOffset = 0;
const emailLogsLimit = 15;

async function loadEmailLogs(offset = 0) {
  emailLogsOffset = offset;
  const tbody = document.getElementById('emailLogsTableBody');
  tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4"><span class="spinner-border spinner-border-sm me-2"></span>Loading logs...</td></tr>';

  try {
    const data = await apiGet(`/admin/emails/logs?limit=${emailLogsLimit}&offset=${emailLogsOffset}`);
    const logs = data.logs;
    const total = data.total;

    if (logs.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-muted">No email logs found.</td></tr>';
      document.getElementById('prevEmailLogsBtn').disabled = true;
      document.getElementById('nextEmailLogsBtn').disabled = true;
      return;
    }

    tbody.innerHTML = logs.map(l => `
      <tr>
        <td class="small font-monospace">${escapeHtml(l.recipient_email)}</td>
        <td>${escapeHtml(l.subject)}</td>
        <td><span class="badge bg-light text-dark border">${l.type}</span></td>
        <td>
          <span class="badge ${l.status === 'sent' ? 'bg-success' : 'bg-danger'}">
            ${l.status.toUpperCase()}
          </span>
          ${l.error_message ? `<div class="extra-small text-danger mt-1" style="max-width:200px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${escapeHtml(l.error_message)}">${escapeHtml(l.error_message)}</div>` : ''}
        </td>
        <td class="small text-muted">${new Date(l.created_at).toLocaleString('en-IN')}</td>
        <td>
          <button class="btn btn-sm btn-icon" onclick="viewMailLogBody('${l.id}')" title="View Email Body"><i class="fas fa-eye"></i></button>
        </td>
      </tr>
    `).join('');

    // Update Pagination
    const currentPage = Math.floor(emailLogsOffset / emailLogsLimit) + 1;
    const totalPages = Math.ceil(total / emailLogsLimit);
    document.getElementById('emailLogsPaginationText').textContent = `Page ${currentPage} of ${totalPages}`;
    document.getElementById('prevEmailLogsBtn').disabled = emailLogsOffset === 0;
    document.getElementById('nextEmailLogsBtn').disabled = emailLogsOffset + emailLogsLimit >= total;

    // Save logs on window for modal lookup
    window._cachedEmailLogs = logs;
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-danger">${err.message}</td></tr>`;
  }
}

async function loadEmailLogsPage(direction) {
  const newOffset = emailLogsOffset + (direction * emailLogsLimit);
  if (newOffset >= 0) {
    loadEmailLogs(newOffset);
  }
}

function viewMailLogBody(logId) {
  const log = window._cachedEmailLogs?.find(l => l.id === logId);
  if (!log) return;

  const modalBody = document.getElementById('formModalBody');
  document.getElementById('formModalTitle').textContent = `Email Content: ${log.subject}`;
  
  modalBody.innerHTML = `
    <div class="mb-3 pb-3 border-bottom small">
      <div><strong>To:</strong> ${escapeHtml(log.recipient_email)}</div>
      <div><strong>Date:</strong> ${new Date(log.created_at).toLocaleString('en-IN')}</div>
      <div><strong>Type:</strong> <span class="badge bg-light text-dark border">${log.type}</span></div>
      <div><strong>Status:</strong> <span class="badge ${log.status === 'sent' ? 'bg-success' : 'bg-danger'}">${log.status.toUpperCase()}</span></div>
      ${log.error_message ? `<div class="text-danger mt-1"><strong>Error:</strong> ${escapeHtml(log.error_message)}</div>` : ''}
    </div>
    <div class="border rounded bg-white p-3 overflow-auto" style="max-height: 400px; color:#333;">
      ${log.body}
    </div>
  `;
  
  formModal.show();
}

// Simple HTML escaping helper if not defined
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
