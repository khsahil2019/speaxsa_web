// SPEAXA Teacher Portal JS
const API = '/api';
let token = localStorage.getItem('teacher_token') || sessionStorage.getItem('teacher_token');
let user = JSON.parse(localStorage.getItem('teacher_user') || sessionStorage.getItem('teacher_user') || 'null');

let toastEl = document.getElementById('toastEl');
let Toast = toastEl ? new bootstrap.Toast(toastEl, { delay: 3000 }) : null;

function showToast(msg, type = 'success') {
  if (!Toast) {
    alert(msg);
    return;
  }
  const icons = { success:'fa-check-circle', error:'fa-exclamation-circle', warning:'fa-exclamation-triangle', info:'fa-info-circle' };
  const colors = { success:'#10B981', error:'#EF4444', warning:'#F59E0B', info:'#3CBDB0' };
  document.getElementById('toastMsg').textContent = msg;
  document.getElementById('toastIcon').className = `fas ${icons[type]}`;
  document.getElementById('toastIcon').style.color = colors[type];
  Toast.show();
}

async function api(path, opts = {}) {
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', ...opts.headers },
  });
  if (res.status === 401) { logout(); throw new Error('Session expired'); }
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

// ── Auth ──────────────────────────────────────────────────────
function switchTab(tab) {
  ['login','register','forgot'].forEach(t => {
    document.getElementById(`${t}Section`).classList.add('d-none');
    document.getElementById(`tab${t.charAt(0).toUpperCase()+t.slice(1)}`)?.classList.remove('active');
  });
  document.getElementById(`${tab}Section`).classList.remove('d-none');
  document.getElementById(`tab${tab.charAt(0).toUpperCase()+tab.slice(1)}`)?.classList.add('active');
}

async function doLogin() {
  try {
    const emailEl = document.getElementById('loginEmail');
    const passEl = document.getElementById('loginPassword');
    const errEl = document.getElementById('loginError');
    errEl.classList.add('d-none');

    const data = await (await fetch(`${API}/auth/login`, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ email: emailEl.value, password: passEl.value })
    })).json();

    if (data.error) throw new Error(data.error);
    if (data.user.role !== 'teacher') throw new Error('Access denied. Teacher portal only.');
    saveAuth(data.token, data.user);
  } catch(e) {
    const errEl = document.getElementById('loginError');
    errEl.textContent = e.message;
    errEl.classList.remove('d-none');
  }
}

async function doRegister() {
  try {
    const errEl = document.getElementById('registerError');
    errEl.classList.add('d-none');

    const payload = {
      name: document.getElementById('regName').value,
      email: document.getElementById('regEmail').value,
      phone: document.getElementById('regPhone').value,
      password: document.getElementById('regPassword').value,
      qualification: document.getElementById('regQualification').value,
      subject_expertise: document.getElementById('regSubjects').value,
      experience_years: parseInt(document.getElementById('regExp').value) || 0,
      languages: document.getElementById('regLanguages').value,
      role: 'teacher',
    };

    if (!payload.name || !payload.email || !payload.phone || !payload.password) {
      throw new Error('Please fill all required fields');
    }

    const data = await (await fetch(`${API}/auth/register`, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify(payload)
    })).json();

    if (data.error) throw new Error(data.error);
    showToast('Registration successful! Please login.', 'success');
    switchTab('login');
  } catch(e) {
    const errEl = document.getElementById('registerError');
    errEl.textContent = e.message;
    errEl.classList.remove('d-none');
  }
}

async function sendForgotOTP() {
  const email = document.getElementById('forgotEmail').value;
  if (!email) return showToast('Enter email', 'error');
  try {
    const data = await (await fetch(`${API}/auth/forgot-password`, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ email })
    })).json();
    if (data.error) throw new Error(data.error);
    showToast('OTP sent!');
    if (data.otp) {
      document.getElementById('resetOTP').value = data.otp;
      showToast(`Dev OTP: ${data.otp}`, 'info');
    }
    document.getElementById('resetSection').classList.remove('d-none');
  } catch(e) { showToast(e.message,'error'); }
}

async function doReset() {
  const email = document.getElementById('forgotEmail').value;
  const otp = document.getElementById('resetOTP').value;
  const newPassword = document.getElementById('resetPass').value;
  try {
    const data = await (await fetch(`${API}/auth/reset-password`, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ email, otp, newPassword })
    })).json();
    if (data.error) throw new Error(data.error);
    showToast('Password reset! Please login.');
    switchTab('login');
  } catch(e) { showToast(e.message,'error'); }
}

function saveAuth(tok, usr) {
  token = tok; user = usr;
  localStorage.setItem('teacher_token', tok);
  localStorage.setItem('teacher_user', JSON.stringify(usr));
  showApp();
  navigateTo('home');
}

function logout() {
  localStorage.removeItem('teacher_token'); localStorage.removeItem('teacher_user');
  token = null; user = null;
  document.getElementById('authScreen').classList.remove('d-none');
  document.getElementById('teacherApp').classList.add('d-none');
}

function showApp() {
  document.getElementById('authScreen').classList.add('d-none');
  document.getElementById('teacherApp').classList.remove('d-none');
  if (user) {
    const av = user.photo_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`;
    document.getElementById('avatarSidebar').src = av;
    document.getElementById('avatarHeader').src = av;
    document.getElementById('nameSidebar').textContent = user.name;
    document.getElementById('levelSidebar').textContent = user.teacher_level || 'Bronze';
  }
  checkSopStatus();
}

async function checkSopStatus() {
  try {
    const sop = await api('/teacher/sop');
    const banner = document.getElementById('sopBanner');
    if (!sop || sop.status !== 'approved') {
      if (banner) {
        banner.innerHTML = `<span style="color:#F59E0B;font-size:.875rem"><i class="fas fa-exclamation-triangle me-2"></i><strong>SOP Pending:</strong> Complete your SOP setup to start teaching</span>
        <button class="btn btn-sm btn-warning" onclick="navigateTo('sop')">Complete SOP →</button>`;
        banner.classList.remove('d-none');
      }
    } else if (!sop.agreement_signed) {
      if (banner) {
        banner.innerHTML = `<span style="color:#F59E0B;font-size:.875rem"><i class="fas fa-file-contract me-2"></i><strong>Agreement Pending:</strong> Review and sign the Teacher Agreement to start teaching</span>
        <button class="btn btn-sm btn-warning" onclick="navigateTo('sop')">Sign Agreement →</button>`;
        banner.classList.remove('d-none');
      }
    } else {
      banner?.classList.add('d-none');
    }
  } catch (e) {
    console.error(e);
  }
}

// ── Navigation ─────────────────────────────────────────────────
document.querySelectorAll('.nav-item[data-page]').forEach(item => {
  item.addEventListener('click', () => navigateTo(item.dataset.page));
});

function navigateTo(page) {
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelector(`.nav-item[data-page="${page}"]`)?.classList.add('active');
  const titles = {
    home:'Dashboard', sop:'SOP Setup', batches:'My Batches',
    liveclasses:'Live Classes', assignments:'Assignments', observations:'Observations',
    attendance:'Attendance', notes:'Study Materials', earnings:'Earnings',
    level:'My Level', profile:'Profile'
  };
  document.getElementById('pageTitle').textContent = titles[page] || page;
  const renders = {
    home:renderHome, sop:renderSop, batches:renderBatches,
    liveclasses:renderLiveClasses, assignments:renderAssignments, observations:renderObservations,
    attendance:renderAttendance, notes:renderNotes, earnings:renderEarnings,
    level:renderLevel, profile:renderProfile
  };
  renders[page]?.();
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

function loading() {
  document.getElementById('pageContent').innerHTML = `<div class="d-flex align-items-center justify-content-center py-5"><div class="spinner-border text-primary"></div></div>`;
}

function fmtDate(d) { return d ? new Date(d).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}) : '—'; }

// ── Dashboard ─────────────────────────────────────────────────
async function renderHome() {
  loading();
  try {
    const [analytics, batches] = await Promise.all([
      api('/teacher/analytics'),
      api('/teacher/batches'),
    ]);

    const activeBatchesCount = batches.filter(b => b.status === 'active').length;

    document.getElementById('pageContent').innerHTML = `
      <div class="mb-4">
        <h5 class="fw-bold mb-1">Hello, ${user?.name || 'Educator'}! 👋</h5>
        <p class="text-muted small">Here's your class & earnings summary</p>
      </div>

      <!-- Interactive Teacher Platform Guide -->
      <div class="spx-card mb-4 border-start border-4 border-primary" style="background: rgba(60, 189, 176, 0.04); box-shadow: 0 4px 12px rgba(15,23,42,0.03);">
        <div class="d-flex align-items-center justify-content-between cursor-pointer" onclick="togglePlatformGuide()" style="cursor: pointer; user-select: none;">
          <div class="d-flex align-items-center gap-2">
            <span class="fs-5">💡</span>
            <h6 class="mb-0 fw-bold text-primary">Teacher Quick Operations Guide & Onboarding Checklist</h6>
          </div>
          <span id="guideToggleIcon" class="text-primary"><i class="fas fa-chevron-down"></i></span>
        </div>
        <div id="platformGuideContent" class="mt-3 d-none" style="font-size: 0.85rem; line-height: 1.6; color: var(--text-secondary);">
          <div class="row g-3">
            <div class="col-md-6 col-lg-3">
              <div class="p-3 rounded-3 h-100" style="background: var(--bg-card); border: 1px solid var(--border);">
                <strong class="text-primary d-block mb-1">1. Video SOP Setup</strong>
                You start at <strong>Bronze Level</strong>. Fill out details in <strong>Profile</strong>, upload 5 required SOP video links in <strong>SOP Setup</strong>, and submit for Admin approval.
              </div>
            </div>
            <div class="col-md-6 col-lg-3">
              <div class="p-3 rounded-3 h-100" style="background: var(--bg-card); border: 1px solid var(--border);">
                <strong class="text-primary d-block mb-1">2. Manage Batches</strong>
                Once approved, go to <strong>My Batches</strong> and click <strong>+ Create Batch</strong>. Assign timing slots, days of the week, and start date.
              </div>
            </div>
            <div class="col-md-6 col-lg-3">
              <div class="p-3 rounded-3 h-100" style="background: var(--bg-card); border: 1px solid var(--border);">
                <strong class="text-primary d-block mb-1">3. Start Live Room</strong>
                Go to <strong>Live Classes</strong>. Click <strong>+ Schedule Class</strong>, and when it starts, click <strong>Start Class</strong> to run the Agora live class room.
              </div>
            </div>
            <div class="col-md-6 col-lg-3">
              <div class="p-3 rounded-3 h-100" style="background: var(--bg-card); border: 1px solid var(--border);">
                <strong class="text-primary d-block mb-1">4. Homework & Scores</strong>
                Post homework in <strong>Assignments</strong> to grade PDF answers, and use the <strong>Observations</strong> page to score child cognitive habits.
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="row g-3 mb-4">
        <div class="col-6 col-lg-3"><div class="stat-card"><div class="d-flex align-items-center justify-content-between mb-2"><div class="stat-icon" style="background:rgba(60,189,176,.15);color:#3CBDB0"><i class="fas fa-layer-group"></i></div></div><div class="stat-value">${activeBatchesCount}</div><div class="stat-label">Active Batches</div></div></div>
        <div class="col-6 col-lg-3"><div class="stat-card"><div class="d-flex align-items-center justify-content-between mb-2"><div class="stat-icon" style="background:rgba(16,185,129,.15);color:#10B981"><i class="fas fa-user-friends"></i></div></div><div class="stat-value">${analytics.totalStudents}</div><div class="stat-label">Students Taught</div></div></div>
        <div class="col-6 col-lg-3"><div class="stat-card"><div class="d-flex align-items-center justify-content-between mb-2"><div class="stat-icon" style="background:rgba(245,158,11,.15);color:#F59E0B"><i class="fas fa-wallet"></i></div></div><div class="stat-value">₹${parseFloat(analytics.wallet.wallet_balance).toLocaleString('en-IN')}</div><div class="stat-label">Wallet Balance</div></div></div>
        <div class="col-6 col-lg-3"><div class="stat-card"><div class="d-flex align-items-center justify-content-between mb-2"><div class="stat-icon" style="background:rgba(239,68,68,.15);color:#EF4444"><i class="fas fa-star"></i></div></div><div class="stat-value">${analytics.rating.toFixed(2)}</div><div class="stat-label">Rating</div></div></div>
      </div>
      
      <div class="row g-4">
        <div class="col-lg-8">
          <div class="spx-card">
            <h6 class="mb-3 fw-bold">Active Batches</h6>
            ${batches.length ? batches.map(b => `
              <div class="d-flex align-items-center gap-3 p-3 mb-2 rounded-3" style="background:rgba(255,255,255,.02);border:1px solid var(--border)">
                <div style="width:44px;height:44px;border-radius:12px;background:var(--gradient);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">📚</div>
                <div class="flex-grow-1">
                  <div class="fw-semibold text-white small">${b.batch_name}</div>
                  <div class="text-muted" style="font-size:.75rem">${b.course_title || ''} • ${(b.days_of_week||[]).join(', ')} at ${b.start_time}</div>
                </div>
                <div>
                  <span class="badge bg-primary rounded-pill">${b.enrolled_count || 0} students</span>
                </div>
              </div>`).join('') : '<p class="text-muted small text-center py-3">No active batches. Go to SOP Setup first, then create batches.</p>'}
          </div>
        </div>
        <div class="col-lg-4">
          <div class="spx-card">
            <h6 class="mb-3 fw-bold">Educator Level</h6>
            <div class="text-center p-3 rounded" style="background:rgba(255,255,255,.02)">
              <div class="display-5 text-warning mb-2"><i class="fas fa-medal"></i></div>
              <h5 class="text-white fw-bold mb-1">${analytics.level} Mentor</h5>
              <p class="text-muted small mb-0">Engagement score based on attendance, student ratings & homework submission feedback.</p>
            </div>
          </div>
        </div>
      </div>
    `;
  } catch(e) {
    document.getElementById('pageContent').innerHTML = `<div class="alert alert-danger">${e.message}</div>`;
  }
}

// ── SOP Setup ─────────────────────────────────────────────────
// ── SOP Setup ─────────────────────────────────────────────────
async function renderSop() {
  loading();
  try {
    const sop = await api('/teacher/sop');
    const documents = await api('/teacher/documents');

    // 1. If SOP is approved but Agreement is not yet signed: Show Digital Agreement Form
    if (sop && sop.status === 'approved' && !sop.agreement_signed) {
      document.getElementById('pageContent').innerHTML = `
        <div class="row justify-content-center">
          <div class="col-lg-10">
            <div class="spx-card shadow-lg p-5 border-top border-4 border-primary" style="background:#ffffff; border-radius:16px;">
              <div class="text-center mb-4">
                <div style="font-size: 3rem; color: var(--primary);"><i class="fas fa-file-contract"></i></div>
                <h4 class="fw-bold mt-2" style="color:var(--text-primary);">SPEAXA Educator Agreement</h4>
                <p class="text-muted small">Please review and digitally sign your teaching agreement to activate your account</p>
              </div>
              
              <div class="agreement-content border rounded p-4 mb-4" style="height: 350px; overflow-y: scroll; font-size: 0.9rem; line-height: 1.6; background: #F8FAFC; color: #334155; text-align: left;">
                <h6 class="fw-bold mb-2 text-dark">1. Master Teacher SOP Structure & Professional Identity</h6>
                <p>Every educator on the SPEAXA platform commits to representing the highest standards of online pedagogy. As a registered teacher, you operate not merely as a tutor, but in a multi-faceted professional role as a <strong>Digital Educator, Classroom Presenter, Learning Mentor, Student Engagement Manager, Parent Accountability Contributor, Batch Performance Supervisor,</strong> and <strong>Platform Representative</strong>. This framework ensures standardization, professional trust, and consistent teaching quality.</p>

                <h6 class="fw-bold mb-2 mt-4 text-dark">2. Digital Classroom Setup & Audio-Visual Standards</h6>
                <p>To deliver an optimized learning experience, you agree to comply with the technical requirements verified during onboarding:</p>
                <ul>
                  <li><strong>Camera Standards:</strong> Minimum 1080p high-definition webcam or smartphone camera, positioned at eye-level on a stable tripod (no hand-held or shaky camera feeds). Face, upper body, and hand gestures must remain clearly visible.</li>
                  <li><strong>Lighting Standards:</strong> Front-facing soft lighting (such as a ring light) must illuminate the presenter's face. No backlight or high contrast shadows behind the teacher are permitted. Clean neutral background is required.</li>
                  <li><strong>Audio Standards:</strong> Collar/external mic is mandatory to eliminate echo, fan, or ambient environmental noise.</li>
                  <li><strong>Internet Standards:</strong> Stable broadband connection with sufficient upload speeds (>20 Mbps) and a dedicated mobile hotspot backup at all times.</li>
                </ul>

                <h6 class="fw-bold mb-2 mt-4 text-dark">3. Classroom Presentation, Attendance & Early Join SOP</h6>
                <ul>
                  <li><strong>Timing Compliance:</strong> Teachers must join scheduled live sessions 10–15 minutes early to test equipment, open board/slides, and verify systems.</li>
                  <li><strong>Engagement Mechanisms:</strong> Teachers must utilize platform engagement features (polls, quizzes, rapid questions, concept recap) every 3–5 minutes. Involve weak and quiet students proactively.</li>
                  <li><strong>Teaching Style:</strong> Maintain an energetic, expressive tone. Avoid monotone delivery, look directly into the camera frequently, and maintain a professional neat attire.</li>
                </ul>

                <h6 class="fw-bold mb-2 mt-4 text-dark">4. Student Performance Mapping & Observational Metrics</h6>
                <p>You agree to evaluate each student monthly across seven core metrics: <strong>Curiosity, Understanding, Consistency, Communication, Observation, Participation, and Discipline</strong>. These metrics feed into the parent reporting dashboard and are critical for learning quality governance.</p>

                <h6 class="fw-bold mb-2 mt-4 text-dark">5. Professional Code of Conduct & Compliance Rules</h6>
                <p>Teachers are strictly prohibited from promoting external coaching, soliciting or taking SPEAXA students for private tuition, utilizing unprofessional or abusive language, repeatedly missing live classes, or violating recording policy. Failure to adhere to code of conduct rules will lead to immediate account suspension.</p>

                <h6 class="fw-bold mb-2 mt-4 text-dark">6. Dynamic Revenue Commission Model & Payout Tranches</h6>
                <p>Platform commissions are calculated dynamically based on student acquisition source (Subject to admin settings):</p>
                <ul>
                  <li>Platform-generated students: 50% Teacher / 50% Platform.</li>
                  <li>Teacher-referred students (25% share): 60-65% Teacher Share.</li>
                  <li>Teacher-referred students (50% share): 70-75% Teacher Share.</li>
                  <li>Star / Elite Mentors: Negotiable commission structures.</li>
                </ul>
                <p>Payouts are paid in tranches: 50% advance at/before batch start, 25% mid-completion (upon 70-75% completion and compliance audits), and 25% final payment (upon module closure and report submissions).</p>

                <h6 class="fw-bold mb-2 mt-4 text-dark">7. Legal Binding & Consent</h6>
                <p>By signing this document, you acknowledge that you have read, understood, and agreed to adhere to all terms, policies, and standard operating procedures set forth by SPEAXA. Any breach may result in immediate platform action, including termination of payouts and permanent suspension.</p>
              </div>

              <div class="mb-4 text-start">
                <div class="form-check mb-3">
                  <input class="form-check-input" type="checkbox" id="agreementConsentCheckbox" style="cursor:pointer">
                  <label class="form-check-label text-secondary small fw-semibold" for="agreementConsentCheckbox" style="cursor:pointer; user-select:none">
                    I read and accept all the terms, platform commissions, payout tranches, and standard operating procedures of SPEAXA.
                  </label>
                </div>
                
                <div class="mb-3">
                  <label class="spx-label font-bold text-dark mb-1">Digital Signature (Type your Full Name)</label>
                  <input type="text" class="form-control border p-3 spx-input" id="agreementSigInput" placeholder="Type your registered name here" style="background:#ffffff; color:#000000; border-color:#cbd5e1 !important">
                </div>
              </div>

              <button class="btn btn-spx w-100 py-3" onclick="submitDigitalAgreement()">Sign & Activate Account</button>
            </div>
          </div>
        </div>
      `;
      return;
    }

    // 2. If SOP is approved and Agreement is signed: Show Verification Complete Screen
    if (sop && sop.status === 'approved' && sop.agreement_signed) {
      document.getElementById('pageContent').innerHTML = `
        <div class="spx-card text-center py-5">
          <div class="display-4 text-success mb-3"><i class="fas fa-check-circle"></i></div>
          <h4 class="fw-bold text-white">Verification Complete!</h4>
          <p class="text-muted small max-width-500 mx-auto">Your Video SOPs are approved and your Digital Agreement is signed. Your account is fully active and visible to students.</p>
          <div class="d-flex justify-content-center gap-3 mt-4">
            <button class="btn btn-spx" onclick="navigateTo('batches')">Go to Batches</button>
            <button class="btn btn-outline-primary" onclick="navigateTo('home')">Dashboard</button>
          </div>
        </div>
      `;
      return;
    }

    // 3. Otherwise: Show SOP uploads and Checklists form
    const statusBadge = (status) => {
      const cls = { approved:'bg-success', pending:'bg-warning', sop_pending:'bg-warning', rejected:'bg-danger', suspended:'bg-danger', draft:'bg-secondary' };
      return `<span class="badge ${cls[status] || 'bg-info'}">${status ? status.toUpperCase().replace('_',' ') : 'NOT UPLOADED'}</span>`;
    };

    const isSubmitted = sop && (sop.status === 'sop_pending' || sop.status === 'approved' || sop.status === 'suspended');
    const tc = sop?.teacher_checklist || {};
    const chk = (key) => tc[key] ? 'checked' : '';
    const dis = isSubmitted ? 'disabled' : '';

    document.getElementById('pageContent').innerHTML = `
      <div class="row g-4">
        <div class="col-lg-7">
          <div class="spx-card">
            <div class="d-flex justify-content-between align-items-center mb-4">
              <h6 class="mb-0 fw-bold">SOP Video Uploads (All 5 Required)</h6>
              <div>Status: ${statusBadge(sop?.status)}</div>
            </div>
            
            ${[
              { id: 'camera_sop', label: '1. Camera SOP', desc: 'Face clearly visible, stable eye-level landscape camera framing.', url: sop?.camera_sop_url },
              { id: 'lighting_sop', label: '2. Lighting SOP', desc: 'No background light glare, high contrast presenter illumination.', url: sop?.lighting_sop_url },
              { id: 'audio_sop', label: '3. Audio SOP', desc: 'Clear voice recording with minimal ambient sound or echo.', url: sop?.audio_sop_url },
              { id: 'internet_proof', label: '4. Internet Proof', desc: 'Screen recording of running speedtest showing > 20 Mbps.', url: sop?.internet_proof_url },
              { id: 'demo_teaching', label: '5. Demo Teaching', desc: 'A short 2-minute snippet showcasing your tutoring style.', url: sop?.demo_teaching_url }
            ].map(item => `
              <div class="p-3 mb-3 rounded-3" style="background:rgba(255,255,255,.01);border:1px solid var(--border)">
                <div class="d-flex justify-content-between align-items-start mb-2">
                  <div>
                    <div class="fw-semibold text-white small">${item.label}</div>
                    <div class="text-muted" style="font-size:.75rem">${item.desc}</div>
                  </div>
                  ${item.url ? `<a href="${item.url}" target="_blank" class="btn btn-sm btn-outline-info" style="font-size:.7rem"><i class="fas fa-play"></i> View</a>` : `<span class="text-muted small">Missing</span>`}
                </div>
                ${isSubmitted ? '' : `
                  <div class="d-flex align-items-center gap-2 mt-2">
                    <input type="file" class="form-control form-control-sm spx-input" id="file_${item.id}" style="max-width:300px;">
                    <button class="btn btn-sm btn-spx" onclick="uploadSopVideo('${item.id}')">Upload</button>
                  </div>
                `}
              </div>
            `).join('')}

            <div class="mt-4 pt-3 border-top border-secondary text-start">
              <h6 class="fw-bold text-white mb-2">SOP Compliance Declaration Checklist</h6>
              <p class="text-muted small mb-3">Please read and tick each item to declare your setup compliance before submitting for review:</p>
              
              <div class="sop-checklist-container mb-3" style="max-height: 250px; overflow-y: auto; background: rgba(0,0,0,0.1); padding: 12px; border-radius: 8px;">
                <div class="form-check mb-2">
                  <input class="form-check-input sop-checklist-item-checkbox" type="checkbox" id="check_camera_stable" data-key="camera_stable" ${chk('camera_stable')} ${dis} onchange="toggleSopSubmitBtn()">
                  <label class="form-check-label text-muted small" for="check_camera_stable">I use a stable eye-level camera tripod (absolutely no shaky/hand-held feed).</label>
                </div>
                <div class="form-check mb-2">
                  <input class="form-check-input sop-checklist-item-checkbox" type="checkbox" id="check_camera_1080p" data-key="camera_1080p" ${chk('camera_1080p')} ${dis} onchange="toggleSopSubmitBtn()">
                  <label class="form-check-label text-muted small" for="check_camera_1080p">My camera supports minimum 1080p resolution and shows my face, upper body, and hands clearly.</label>
                </div>
                <div class="form-check mb-2">
                  <input class="form-check-input sop-checklist-item-checkbox" type="checkbox" id="check_lighting_soft" data-key="lighting_soft" ${chk('lighting_soft')} ${dis} onchange="toggleSopSubmitBtn()">
                  <label class="form-check-label text-muted small" for="check_lighting_soft">I use a front soft/ring light falling on my face, with no backlight or glare behind me.</label>
                </div>
                <div class="form-check mb-2">
                  <input class="form-check-input sop-checklist-item-checkbox" type="checkbox" id="check_lighting_bg" data-key="lighting_bg" ${chk('lighting_bg')} ${dis} onchange="toggleSopSubmitBtn()">
                  <label class="form-check-label text-muted small" for="check_lighting_bg">I have a white or clean neutral background with no messy details visible.</label>
                </div>
                <div class="form-check mb-2">
                  <input class="form-check-input sop-checklist-item-checkbox" type="checkbox" id="check_audio_mic" data-key="audio_mic" ${chk('audio_mic')} ${dis} onchange="toggleSopSubmitBtn()">
                  <label class="form-check-label text-muted small" for="check_audio_mic">I use a collar mic / external mic (built-in webcam mic is not permitted).</label>
                </div>
                <div class="form-check mb-2">
                  <input class="form-check-input sop-checklist-item-checkbox" type="checkbox" id="check_audio_noise" data-key="audio_noise" ${chk('audio_noise')} ${dis} onchange="toggleSopSubmitBtn()">
                  <label class="form-check-label text-muted small" for="check_audio_noise">My teaching environment is free of echo, fan noise, or background chatter.</label>
                </div>
                <div class="form-check mb-2">
                  <input class="form-check-input sop-checklist-item-checkbox" type="checkbox" id="check_internet_speed" data-key="internet_speed" ${chk('internet_speed')} ${dis} onchange="toggleSopSubmitBtn()">
                  <label class="form-check-label text-muted small" for="check_internet_speed">My upload speed is above 20 Mbps, and I have mobile hotspot backup ready.</label>
                </div>
                <div class="form-check mb-2">
                  <input class="form-check-input sop-checklist-item-checkbox" type="checkbox" id="check_presentation_style" data-key="presentation_style" ${chk('presentation_style')} ${dis} onchange="toggleSopSubmitBtn()">
                  <label class="form-check-label text-muted small" for="check_presentation_style">I will maintain an energetic tone, direct eye contact with the camera, and use gestures naturally.</label>
                </div>
                <div class="form-check mb-2">
                  <input class="form-check-input sop-checklist-item-checkbox" type="checkbox" id="check_dress_code" data-key="dress_code" ${chk('dress_code')} ${dis} onchange="toggleSopSubmitBtn()">
                  <label class="form-check-label text-muted small" for="check_dress_code">I will wear solid colored shirts/tops and maintain a clean professional appearance.</label>
                </div>
                <div class="form-check mb-2">
                  <input class="form-check-input sop-checklist-item-checkbox" type="checkbox" id="check_class_flow" data-key="class_flow" ${chk('class_flow')} ${dis} onchange="toggleSopSubmitBtn()">
                  <label class="form-check-label text-muted small" for="check_class_flow">I will join sessions 10–15 mins early, test media, greet students by name, and run engagement polls/quizzes every 3–5 mins.</label>
                </div>
                <div class="form-check mb-2">
                  <input class="form-check-input sop-checklist-item-checkbox" type="checkbox" id="check_board_materials" data-key="board_materials" ${chk('board_materials')} ${dis} onchange="toggleSopSubmitBtn()">
                  <label class="form-check-label text-muted small" for="check_board_materials">I will write in large legible characters with structured spacing and use annotations / highlighting.</label>
                </div>
                <div class="form-check mb-2">
                  <input class="form-check-input sop-checklist-item-checkbox" type="checkbox" id="check_content_delivery" data-key="content_delivery" ${chk('content_delivery')} ${dis} onchange="toggleSopSubmitBtn()">
                  <label class="form-check-label text-muted small" for="check_content_delivery">I will follow modular delivery: Concept -> Examples -> Practice -> Recap -> Doubt section.</label>
                </div>
                <div class="form-check mb-2">
                  <input class="form-check-input sop-checklist-item-checkbox" type="checkbox" id="check_discipline_rules" data-key="discipline_rules" ${chk('discipline_rules')} ${dis} onchange="toggleSopSubmitBtn()">
                  <label class="form-check-label text-muted small" for="check_discipline_rules">I will not solicit students privately, promote external coaching, or use unprofessional language.</label>
                </div>
              </div>
            </div>

            ${isSubmitted ? `
              <div class="alert alert-info text-center mt-3 py-2 small">SOP details submitted and locked for admin review.</div>
            ` : (sop && sop.camera_sop_url && sop.lighting_sop_url && sop.audio_sop_url && sop.internet_proof_url && sop.demo_teaching_url ? `
              <button class="btn btn-secondary w-100 mt-3" id="sopSubmitButton" onclick="submitSopForReview()" disabled>Submit SOP For Admin Verification</button>
            ` : `
              <button class="btn btn-secondary w-100 mt-3" disabled>Submit SOP For Admin Verification (Upload all files first & tick all checklists)</button>
            `)}
          </div>
        </div>

        <div class="col-lg-5">
          <div class="spx-card">
            <h6 class="mb-4 fw-bold">KYC Documents Upload</h6>
            ${isSubmitted ? `
              <div class="alert alert-secondary text-center small py-2">Documents locked during review</div>
            ` : `
              <form onsubmit="uploadKYCDocument(event)" class="mb-4">
                <div class="mb-3 text-start">
                  <label class="spx-label">Document Type</label>
                  <select class="form-select spx-input" id="docType" required>
                    <option value="aadhaar">Aadhaar Card</option>
                    <option value="pan">PAN Card</option>
                    <option value="resume">Resume / CV</option>
                    <option value="qualification">Degree Certificate</option>
                  </select>
                </div>
                <div class="mb-3 text-start">
                  <label class="spx-label">File</label>
                  <input type="file" class="form-control spx-input" id="docFile" required>
                </div>
                <button type="submit" class="btn btn-spx w-100">Upload Document</button>
              </form>
            `}

            <h6 class="mb-3 fw-bold">Uploaded Documents</h6>
            ${documents.length ? documents.map(d => `
              <div class="d-flex justify-content-between align-items-center p-2 mb-2 rounded" style="background:rgba(255,255,255,.02);border:1px solid var(--border)">
                <div class="text-start">
                  <div class="small fw-semibold text-white">${d.doc_type.toUpperCase()}</div>
                  <div class="text-muted" style="font-size:.7rem">${fmtDate(d.uploaded_at)}</div>
                </div>
                <a href="${d.file_url}" target="_blank" class="btn btn-sm btn-outline-secondary" style="font-size:.7rem"><i class="fas fa-eye"></i> View</a>
              </div>
            `).join('') : '<p class="text-muted small text-center">No documents uploaded.</p>'}
          </div>
        </div>
      </div>
    `;
    // Initialize submit button state
    if (!isSubmitted) toggleSopSubmitBtn();
  } catch (e) {
    document.getElementById('pageContent').innerHTML = `<div class="alert alert-danger">${e.message}</div>`;
  }
}

function toggleSopSubmitBtn() {
  const checkboxes = document.querySelectorAll('.sop-checklist-item-checkbox');
  const submitBtn = document.getElementById('sopSubmitButton');
  if (!submitBtn) return;
  
  let allChecked = true;
  checkboxes.forEach(cb => {
    if (!cb.checked) allChecked = false;
  });
  
  if (allChecked) {
    submitBtn.removeAttribute('disabled');
    submitBtn.classList.remove('btn-secondary');
    submitBtn.classList.add('btn-spx');
  } else {
    submitBtn.setAttribute('disabled', 'true');
    submitBtn.classList.remove('btn-spx');
    submitBtn.classList.add('btn-secondary');
  }
}

async function uploadSopVideo(fieldId) {
  const fileInput = document.getElementById(`file_${fieldId}`);
  if (!fileInput || !fileInput.files[0]) return showToast('Please select a video file first', 'error');

  const formData = new FormData();
  formData.append(fieldId, fileInput.files[0]);

  try {
    showToast(`Uploading ${fieldId}... Please wait.`, 'info');
    const res = await fetch(`${API}/teacher/sop/upload/${fieldId}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData,
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    showToast('Video uploaded successfully!');
    renderSop();
  } catch (e) {
    showToast(e.message, 'error');
  }
}

async function submitSopForReview() {
  const checklist = {};
  const checkboxes = document.querySelectorAll('.sop-checklist-item-checkbox');
  checkboxes.forEach(cb => {
    checklist[cb.dataset.key] = cb.checked;
  });

  try {
    const data = await api('/teacher/sop/submit', {
      method: 'POST',
      body: JSON.stringify({ teacher_checklist: checklist })
    });
    showToast(data.message || 'SOP submitted successfully!');
    checkSopStatus();
    renderSop();
  } catch (e) {
    showToast(e.message, 'error');
  }
}

async function submitDigitalAgreement() {
  const signatureInput = document.getElementById('agreementSigInput');
  const signature = signatureInput ? signatureInput.value.trim() : '';
  const consentCb = document.getElementById('agreementConsentCheckbox');
  
  if (!consentCb || !consentCb.checked) {
    return showToast('You must consent to the agreement terms', 'error');
  }
  if (!signature) {
    return showToast('Please type your full name to digitally sign', 'error');
  }

  try {
    const data = await api('/teacher/sop/sign-agreement', {
      method: 'POST',
      body: JSON.stringify({ digital_signature: signature })
    });
    showToast(data.message || 'Agreement signed successfully!');
    
    // Update local user object's approval status
    user.approval_status = 'approved';
    localStorage.setItem('teacher_user', JSON.stringify(user));
    sessionStorage.setItem('teacher_user', JSON.stringify(user));
    
    showApp();
    navigateTo('home');
  } catch (e) {
    showToast(e.message, 'error');
  }
}

async function uploadKYCDocument(e) {
  e.preventDefault();
  const docType = document.getElementById('docType').value;
  const fileInput = document.getElementById('docFile');
  if (!fileInput.files[0]) return showToast('Select file', 'error');

  const formData = new FormData();
  formData.append('doc_type', docType);
  formData.append('document', fileInput.files[0]);

  try {
    showToast('Uploading document...', 'info');
    const res = await fetch(`${API}/teacher/documents/upload`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData,
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    showToast('KYC Document uploaded!');
    renderSop();
  } catch (e) {
    showToast(e.message, 'error');
  }
}

// ── Batches ───────────────────────────────────────────────────
async function renderBatches() {
  loading();
  try {
    const sop = await api('/teacher/sop');
    const isApprovedAndSigned = sop && sop.status === 'approved' && sop.agreement_signed;

    if (!isApprovedAndSigned) {
      document.getElementById('pageContent').innerHTML = `
        <div class="spx-card text-center py-5 border-start border-4 border-warning" style="background: rgba(245,158,11,0.02)">
          <div class="display-4 text-warning mb-3"><i class="fas fa-lock"></i></div>
          <h4 class="fw-bold text-white">Batch Creation Locked</h4>
          <p class="text-muted small max-width-500 mx-auto">You must complete your Video SOP Setup and sign the Digital Teacher Agreement before you can create study batches.</p>
          <button class="btn btn-warning mt-3 btn-sm" onclick="navigateTo('sop')">Go to SOP Setup</button>
        </div>
      `;
      return;
    }

    const [batches, courses] = await Promise.all([
      api('/teacher/batches'),
      api('/courses'),
    ]);

    document.getElementById('pageContent').innerHTML = `
      <div class="row g-4">
        <div class="col-lg-8">
          <div class="spx-card">
            <h6 class="mb-4 fw-bold">My Batches</h6>
            ${batches.length ? batches.map(b => `
              <div class="p-3 mb-3 rounded-3" style="background:rgba(255,255,255,.01);border:1px solid var(--border)">
                <div class="d-flex align-items-start gap-3">
                  <div style="width:48px;height:48px;border-radius:12px;background:var(--gradient);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0">📚</div>
                  <div class="flex-grow-1">
                    <h6 class="text-white fw-bold mb-1">${b.batch_name}</h6>
                    <div class="text-muted small">${b.course_title || 'Course'}</div>
                    <div class="d-flex flex-wrap gap-3 mt-2 text-muted small">
                      <span><i class="fas fa-users me-1"></i>${b.enrolled_count || 0} / ${b.capacity} Students</span>
                      <span><i class="fas fa-calendar me-1"></i>${(b.days_of_week || []).join(', ')}</span>
                      <span><i class="fas fa-clock me-1"></i>${b.start_time} - ${b.end_time}</span>
                    </div>
                  </div>
                  <div>
                    <button class="btn btn-sm btn-spx" onclick="viewBatchStudents('${b.id}', '${b.batch_name}')">Students</button>
                  </div>
                </div>
              </div>
            `).join('') : '<p class="text-muted text-center">No batches created yet.</p>'}
          </div>
        </div>

        <div class="col-lg-4">
          <div class="spx-card">
            <h6 class="mb-4 fw-bold">Create New Batch</h6>
            <form onsubmit="createBatch(event)">
              <div class="mb-3">
                <label class="spx-label">Course</label>
                <select class="form-select spx-input" id="batchCourse" required>
                  <option value="">Select Course</option>
                  ${courses.map(c => `<option value="${c.id}">${c.title} (${c.grade})</option>`).join('')}
                </select>
              </div>
              <div class="mb-3">
                <label class="spx-label">Batch Name</label>
                <input class="form-control spx-input" id="batchName" placeholder="e.g. Physics Core Morning" required>
              </div>
              <div class="mb-3">
                <label class="spx-label">Subject</label>
                <input class="form-control spx-input" id="batchSubject" placeholder="e.g. Physics" required>
              </div>
              <div class="row g-2 mb-3">
                <div class="col-6">
                  <label class="spx-label">Start Date</label>
                  <input type="date" class="form-control spx-input" id="batchStartD" required>
                </div>
                <div class="col-6">
                  <label class="spx-label">End Date</label>
                  <input type="date" class="form-control spx-input" id="batchEndD" required>
                </div>
              </div>
              <div class="row g-2 mb-3">
                <div class="col-6">
                  <label class="spx-label">Start Time</label>
                  <input type="time" class="form-control spx-input" id="batchStartT" required>
                </div>
                <div class="col-6">
                  <label class="spx-label">End Time</label>
                  <input type="time" class="form-control spx-input" id="batchEndT" required>
                </div>
              </div>
              <div class="mb-3">
                <label class="spx-label">Days of Week (Comma Separated)</label>
                <input class="form-control spx-input" id="batchDays" placeholder="Monday, Wednesday, Friday" required>
              </div>
              <div class="mb-3">
                <label class="spx-label">Max Capacity (Max 30)</label>
                <input type="number" class="form-control spx-input" id="batchCapacity" value="30" max="30" required>
              </div>
              <button type="submit" class="btn btn-spx w-100">Create Batch</button>
            </form>
          </div>
        </div>
      </div>
    `;
  } catch (e) {
    document.getElementById('pageContent').innerHTML = `<div class="alert alert-danger">${e.message}</div>`;
  }
}

async function viewBatchStudents(batchId, batchName) {
  try {
    const students = await api(`/teacher/batches/${batchId}/students`);
    const modalTitle = document.getElementById('studentsModalTitle');
    const modalBody = document.getElementById('studentsModalBody');

    modalTitle.textContent = `Students in ${batchName}`;

    modalBody.innerHTML = `
      <div style="overflow-x:auto">
        <table class="table mb-0">
          <thead>
            <tr>
              <th style="color: var(--text-primary);">Photo</th>
              <th style="color: var(--text-primary);">Student Name</th>
              <th style="color: var(--text-primary);">Student ID</th>
              <th style="color: var(--text-primary);">Grade/Board</th>
              <th style="color: var(--text-primary);">Enrolled Date</th>
            </tr>
          </thead>
          <tbody>
            ${students.map(s => `
              <tr style="color: var(--text-primary);">
                <td><img src="${s.photo_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${s.name}`}" style="width:36px;height:36px;border-radius:50%"></td>
                <td class="fw-semibold">${s.name}</td>
                <td><code>${s.student_code || s.id}</code></td>
                <td>${s.grade || ''} • ${s.board || ''}</td>
                <td>${fmtDate(s.enrolled_at)}</td>
              </tr>
            `).join('') || '<tr><td colspan="5" class="text-center text-muted">No students enrolled yet.</td></tr>'}
          </tbody>
        </table>
      </div>
    `;

    const myModal = bootstrap.Modal.getOrCreateInstance(document.getElementById('studentsModal'));
    myModal.show();
  } catch (e) {
    showToast(e.message, 'error');
  }
}

async function createBatch(e) {
  e.preventDefault();
  const daysVal = document.getElementById('batchDays').value;
  const days_of_week = daysVal.split(',').map(s => s.trim()).filter(Boolean);

  const payload = {
    course_id: document.getElementById('batchCourse').value,
    batch_name: document.getElementById('batchName').value,
    subject: document.getElementById('batchSubject').value,
    start_date: document.getElementById('batchStartD').value,
    end_date: document.getElementById('batchEndD').value,
    start_time: document.getElementById('batchStartT').value + ':00',
    end_time: document.getElementById('batchEndT').value + ':00',
    days_of_week,
    capacity: parseInt(document.getElementById('batchCapacity').value) || 30,
  };

  try {
    const data = await api('/teacher/batches', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    showToast(data.message || 'Batch created successfully!');
    renderBatches();
  } catch (e) {
    showToast(e.message, 'error');
  }
}

// ── Live Classes ──────────────────────────────────────────────
async function renderLiveClasses() {
  loading();
  try {
    const sop = await api('/teacher/sop');
    const isApprovedAndSigned = sop && sop.status === 'approved' && sop.agreement_signed;

    if (!isApprovedAndSigned) {
      document.getElementById('pageContent').innerHTML = `
        <div class="spx-card text-center py-5 border-start border-4 border-warning" style="background: rgba(245,158,11,0.02)">
          <div class="display-4 text-warning mb-3"><i class="fas fa-lock"></i></div>
          <h4 class="fw-bold text-white">Live Classes Locked</h4>
          <p class="text-muted small max-width-500 mx-auto">You must complete your Video SOP Setup and sign the Digital Teacher Agreement before you can schedule or start live classes.</p>
          <button class="btn btn-warning mt-3 btn-sm" onclick="navigateTo('sop')">Go to SOP Setup</button>
        </div>
      `;
      return;
    }

    const [classes, batches] = await Promise.all([
      api('/teacher/live-classes'),
      api('/teacher/batches'),
    ]);

    const activeBatches = batches.filter(b => b.status === 'active');

    document.getElementById('pageContent').innerHTML = `
      <div class="row g-4">
        <div class="col-lg-8">
          <div class="spx-card">
            <h6 class="mb-4 fw-bold">Scheduled Classes</h6>
            <div style="overflow-x:auto">
              <table class="spx-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Class Title</th>
                    <th>Batch</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  ${classes.map(c => `
                    <tr>
                      <td>${fmtDate(c.class_date)}</td>
                      <td>${c.class_time}</td>
                      <td class="text-white">${c.title}</td>
                      <td>${c.batch_name || 'Batch'}</td>
                      <td><span class="badge ${c.status === 'live' ? 'bg-danger' : c.status === 'ended' ? 'bg-secondary' : 'bg-primary'}">${c.status.toUpperCase()}</span></td>
                      <td>
                        ${c.status === 'scheduled' ? `
                          <button class="btn btn-sm btn-spx" onclick="startClass('${c.id}')">Start Class</button>
                        ` : c.status === 'live' ? `
                          <a href="/live/room.html?classId=${c.id}" class="btn btn-sm btn-danger">Enter Room</a>
                        ` : `
                          <span class="text-muted">Completed</span>
                        `}
                      </td>
                    </tr>
                  `).join('') || '<tr><td colspan="6" class="text-center text-muted">No live classes scheduled.</td></tr>'}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div class="col-lg-4">
          <div class="spx-card">
            <h6 class="mb-4 fw-bold">Schedule Live Class</h6>
            <form onsubmit="scheduleClass(event)">
              <div class="mb-3">
                <label class="spx-label">Select Batch</label>
                <select class="form-select spx-input" id="classBatch" required>
                  <option value="">Select Batch</option>
                  ${activeBatches.map(b => `<option value="${b.id}">${b.batch_name} (${b.subject})</option>`).join('')}
                </select>
              </div>
              <div class="mb-3">
                <label class="spx-label">Class Title</label>
                <input class="form-control spx-input" id="classTitle" placeholder="e.g. Lecture 1: Coulomb's Law" required>
              </div>
              <div class="mb-3">
                <label class="spx-label">Class Date</label>
                <input type="date" class="form-control spx-input" id="classDate" required>
              </div>
              <div class="mb-3">
                <label class="spx-label">Class Time</label>
                <input type="time" class="form-control spx-input" id="classTime" required>
              </div>
              <button type="submit" class="btn btn-spx w-100">Schedule Class</button>
            </form>
          </div>
        </div>
      </div>
    `;
  } catch (e) {
    document.getElementById('pageContent').innerHTML = `<div class="alert alert-danger">${e.message}</div>`;
  }
}

async function scheduleClass(e) {
  e.preventDefault();
  const payload = {
    batchId: document.getElementById('classBatch').value,
    title: document.getElementById('classTitle').value,
    classDate: document.getElementById('classDate').value,
    classTime: document.getElementById('classTime').value + ':00',
  };

  try {
    const data = await api('/teacher/live-classes', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    showToast(data.message || 'Class scheduled successfully!');
    renderLiveClasses();
  } catch (e) {
    showToast(e.message, 'error');
  }
}

async function startClass(classId) {
  try {
    showToast('Initializing classroom...', 'info');
    window.location.href = `/live/room.html?classId=${classId}`;
  } catch (e) {
    showToast(e.message, 'error');
  }
}

// ── Assignments ────────────────────────────────────────────────
async function renderAssignments() {
  loading();
  try {
    const [assignments, batches] = await Promise.all([
      api('/teacher/assignments'),
      api('/teacher/batches'),
    ]);

    document.getElementById('pageContent').innerHTML = `
      <div class="row g-4">
        <div class="col-lg-8">
          <div class="spx-card">
            <h6 class="mb-4 fw-bold">Assignments List</h6>
            ${assignments.length ? assignments.map(a => `
              <div class="p-3 mb-3 rounded-3" style="background:rgba(255,255,255,.01);border:1px solid var(--border)">
                <div class="d-flex align-items-start justify-content-between">
                  <div>
                    <h6 class="text-white fw-bold mb-1">${a.title}</h6>
                    <div class="text-muted small">${a.batch_name || 'Batch'} • Due: ${fmtDate(a.due_date)}</div>
                    <p class="text-muted small mt-2 mb-0">${a.description || ''}</p>
                    ${a.file_url ? `<a href="${a.file_url}" target="_blank" class="d-inline-block mt-2 small text-primary"><i class="fas fa-file-pdf"></i> View Attachment</a>` : ''}
                  </div>
                  <div>
                    <button class="btn btn-sm btn-spx" onclick="viewSubmissions('${a.id}')">
                      Submissions (${a.submission_count || 0})
                    </button>
                  </div>
                </div>
              </div>
            `).join('') : '<p class="text-muted text-center">No assignments created yet.</p>'}
          </div>
        </div>

        <div class="col-lg-4">
          <div class="spx-card">
            <h6 class="mb-4 fw-bold">Create Assignment</h6>
            <form onsubmit="createAssignment(event)">
              <div class="mb-3">
                <label class="spx-label">Select Batch</label>
                <select class="form-select spx-input" id="assignBatch" required>
                  <option value="">Select Batch</option>
                  ${batches.map(b => `<option value="${b.id}">${b.batch_name}</option>`).join('')}
                </select>
              </div>
              <div class="mb-3">
                <label class="spx-label">Assignment Title</label>
                <input class="form-control spx-input" id="assignTitle" placeholder="e.g. Homework 1: Friction Problems" required>
              </div>
              <div class="mb-3">
                <label class="spx-label">Description</label>
                <textarea class="form-control spx-input" id="assignDesc" rows="3"></textarea>
              </div>
              <div class="mb-3">
                <label class="spx-label">Due Date</label>
                <input type="datetime-local" class="form-control spx-input" id="assignDue" required>
              </div>
              <div class="mb-3">
                <label class="spx-label">Max Marks</label>
                <input type="number" class="form-control spx-input" id="assignMax" value="100" required>
              </div>
              <div class="mb-3">
                <label class="spx-label">File Attachment (PDF/Image)</label>
                <input type="file" class="form-control spx-input" id="assignFile">
              </div>
              <button type="submit" class="btn btn-spx w-100">Publish Assignment</button>
            </form>
          </div>
        </div>
      </div>
    `;
  } catch (e) {
    document.getElementById('pageContent').innerHTML = `<div class="alert alert-danger">${e.message}</div>`;
  }
}

async function createAssignment(e) {
  e.preventDefault();
  const fileInput = document.getElementById('assignFile');
  const formData = new FormData();
  formData.append('batchId', document.getElementById('assignBatch').value);
  formData.append('title', document.getElementById('assignTitle').value);
  formData.append('description', document.getElementById('assignDesc').value);
  formData.append('due_date', document.getElementById('assignDue').value);
  formData.append('max_marks', document.getElementById('assignMax').value);
  if (fileInput.files[0]) formData.append('file', fileInput.files[0]);

  try {
    showToast('Uploading attachment & publishing assignment...', 'info');
    const res = await fetch(`${API}/teacher/assignments`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData,
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    showToast('Assignment published successfully!');
    renderAssignments();
  } catch (e) {
    showToast(e.message, 'error');
  }
}

async function viewSubmissions(assignId) {
  try {
    const subs = await api(`/teacher/assignments/${assignId}/submissions`);
    const modalBody = document.getElementById('subsModalBody');

    modalBody.innerHTML = `
      <div style="overflow-x:auto">
        <table class="table mb-0">
          <thead>
            <tr>
              <th style="color: var(--text-primary);">Student</th>
              <th style="color: var(--text-primary);">Submitted At</th>
              <th style="color: var(--text-primary);">Attachment</th>
              <th style="color: var(--text-primary);">Marks</th>
              <th style="color: var(--text-primary);">Feedback</th>
              <th style="color: var(--text-primary);">Action</th>
            </tr>
          </thead>
          <tbody>
            ${subs.map(s => `
              <tr style="color: var(--text-primary);">
                <td class="fw-semibold">${s.student_name}</td>
                <td>${fmtDate(s.submitted_at)}</td>
                <td>${s.file_url ? `<a href="${s.file_url}" target="_blank" class="btn btn-sm btn-outline-info"><i class="fas fa-download"></i> View</a>` : '—'}</td>
                <td>${s.marks_obtained !== null ? `${s.marks_obtained}` : `<span class="text-warning fw-bold">Ungraded</span>`}</td>
                <td>${s.feedback || '—'}</td>
                <td>
                  <button class="btn btn-sm btn-spx" onclick="openGradePopup('${s.id}', '${s.student_name}')">Grade</button>
                </td>
              </tr>
            `).join('') || '<tr><td colspan="6" class="text-center text-muted">No submissions yet.</td></tr>'}
          </tbody>
        </table>
      </div>
    `;

    const myModal = bootstrap.Modal.getOrCreateInstance(document.getElementById('subsModal'));
    myModal.show();
  } catch (e) {
    showToast(e.message, 'error');
  }
}

function openGradePopup(subId, name) {
  const marks = prompt(`Enter marks obtained by ${name}:`);
  if (marks === null) return;
  const feedback = prompt('Enter educator feedback notes:');
  if (feedback === null) return;

  api(`/teacher/assignments/submissions/${subId}/grade`, {
    method: 'POST',
    body: JSON.stringify({ marks_obtained: parseInt(marks) || 0, feedback })
  }).then(res => {
    showToast('Submission graded successfully!');
    // Close open modals
    const openModals = document.querySelectorAll('.modal.show');
    openModals.forEach(m => {
      const modalInstance = bootstrap.Modal.getInstance(m);
      modalInstance?.hide();
    });
    renderAssignments();
  }).catch(err => {
    showToast(err.message, 'error');
  });
}

// ── Student Observations ──────────────────────────────────────
async function renderObservations() {
  loading();
  try {
    const [batches, observations] = await Promise.all([
      api('/teacher/batches'),
      api('/teacher/observations'),
    ]);

    document.getElementById('pageContent').innerHTML = `
      <div class="row g-4">
        <div class="col-lg-7">
          <div class="spx-card">
            <h6 class="mb-4 fw-bold">Recent Observations & Behavioral Evaluations</h6>
            ${observations.length ? observations.map(o => `
              <div class="p-3 mb-3 rounded-3" style="background:rgba(255,255,255,.01);border:1px solid var(--border)">
                <div class="d-flex justify-content-between align-items-start">
                  <div>
                    <h6 class="text-white fw-bold mb-1">${o.student_name}</h6>
                    <div class="text-muted" style="font-size:.75rem">Date: ${fmtDate(o.observation_date)}</div>
                    <div class="d-flex gap-3 mt-2 flex-wrap text-muted small">
                      <span>Curiosity: <strong>${o.curiosity}/100</strong></span>
                      <span>Understanding: <strong>${o.understanding}/100</strong></span>
                      <span>Consistency: <strong>${o.consistency}/100</strong></span>
                      <span>Communication: <strong>${o.communication}/100</strong></span>
                      <span>Overall: <strong>${o.observation_score}/100</strong></span>
                    </div>
                    ${o.notes ? `<p class="text-muted mt-2 small mb-0">Note: ${o.notes}</p>` : ''}
                  </div>
                </div>
              </div>
            `).join('') : '<p class="text-muted text-center">No observations submitted yet.</p>'}
          </div>
        </div>

        <div class="col-lg-5">
          <div class="spx-card">
            <h6 class="mb-4 fw-bold">Log Behavioral Score</h6>
            <form onsubmit="submitObservation(event)">
              <div class="mb-3">
                <label class="spx-label">Select Batch</label>
                <select class="form-select spx-input" id="obsBatch" onchange="loadBatchStudentsForObs(this.value)" required>
                  <option value="">Select Batch</option>
                  ${batches.map(b => `<option value="${b.id}">${b.batch_name}</option>`).join('')}
                </select>
              </div>
              <div class="mb-3">
                <label class="spx-label">Select Student</label>
                <select class="form-select spx-input" id="obsStudent" required>
                  <option value="">Select Student</option>
                </select>
              </div>
              <div class="row g-2 mb-2">
                <div class="col-6">
                  <label class="spx-label">Curiosity (0-100)</label>
                  <input type="number" class="form-control spx-input" id="obsCuriosity" min="0" max="100" value="80" required>
                </div>
                <div class="col-6">
                  <label class="spx-label">Understanding (0-100)</label>
                  <input type="number" class="form-control spx-input" id="obsUnderstanding" min="0" max="100" value="80" required>
                </div>
              </div>
              <div class="row g-2 mb-2">
                <div class="col-6">
                  <label class="spx-label">Consistency (0-100)</label>
                  <input type="number" class="form-control spx-input" id="obsConsistency" min="0" max="100" value="80" required>
                </div>
                <div class="col-6">
                  <label class="spx-label">Communication (0-100)</label>
                  <input type="number" class="form-control spx-input" id="obsCommunication" min="0" max="100" value="80" required>
                </div>
              </div>
              <div class="row g-2 mb-3">
                <div class="col-6">
                  <label class="spx-label">Participation (0-100)</label>
                  <input type="number" class="form-control spx-input" id="obsParticipation" min="0" max="100" value="80" required>
                </div>
                <div class="col-6">
                  <label class="spx-label">Discipline (0-100)</label>
                  <input type="number" class="form-control spx-input" id="obsDiscipline" min="0" max="100" value="80" required>
                </div>
              </div>
              <div class="mb-3">
                <label class="spx-label">Observation Notes / Feedback</label>
                <textarea class="form-control spx-input" id="obsNotes" rows="3" placeholder="Write feedback notes..."></textarea>
              </div>
              <button type="submit" class="btn btn-spx w-100">Submit Observation</button>
            </form>
          </div>
        </div>
      </div>
    `;
  } catch (e) {
    document.getElementById('pageContent').innerHTML = `<div class="alert alert-danger">${e.message}</div>`;
  }
}

async function loadBatchStudentsForObs(batchId) {
  const select = document.getElementById('obsStudent');
  if (!batchId) {
    select.innerHTML = '<option value="">Select Student</option>';
    return;
  }
  try {
    const students = await api(`/teacher/batches/${batchId}/students`);
    select.innerHTML = '<option value="">Select Student</option>' + students.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
  } catch (e) {
    showToast(e.message, 'error');
  }
}

async function submitObservation(e) {
  e.preventDefault();
  const c = parseFloat(document.getElementById('obsCuriosity').value);
  const u = parseFloat(document.getElementById('obsUnderstanding').value);
  const co = parseFloat(document.getElementById('obsConsistency').value);
  const cm = parseFloat(document.getElementById('obsCommunication').value);
  const p = parseFloat(document.getElementById('obsParticipation').value);
  const d = parseFloat(document.getElementById('obsDiscipline').value);
  const avg = parseFloat(((c + u + co + cm + p + d) / 6).toFixed(2));

  const payload = {
    batchId: document.getElementById('obsBatch').value,
    studentId: document.getElementById('obsStudent').value,
    curiosity: c,
    understanding: u,
    consistency: co,
    communication: cm,
    participation: p,
    discipline: d,
    observation_score: avg,
    notes: document.getElementById('obsNotes').value,
  };

  try {
    const data = await api('/teacher/observations', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    showToast(data.message || 'Observation logged successfully!');
    renderObservations();
  } catch (e) {
    showToast(e.message, 'error');
  }
}

// ── Attendance ────────────────────────────────────────────────
async function renderAttendance() {
  loading();
  try {
    const [batches, attendance] = await Promise.all([
      api('/teacher/batches'),
      api('/teacher/attendance'),
    ]);

    document.getElementById('pageContent').innerHTML = `
      <div class="row g-4">
        <div class="col-12">
          <div class="spx-card">
            <div class="d-flex justify-content-between align-items-center mb-4">
              <h6 class="mb-0 fw-bold">Live Class Attendance Logs</h6>
              <div class="d-flex gap-2">
                <select class="form-select form-select-sm spx-input" id="filterAttBatch" onchange="filterAttendanceLogs()" style="max-width:200px;">
                  <option value="">All Batches</option>
                  ${batches.map(b => `<option value="${b.id}">${b.batch_name}</option>`).join('')}
                </select>
              </div>
            </div>
            
            <div style="overflow-x:auto">
              <table class="spx-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Student Name</th>
                    <th>Batch ID</th>
                    <th>Status</th>
                    <th>Join Time</th>
                    <th>Exit Time</th>
                    <th>Duration</th>
                  </tr>
                </thead>
                <tbody id="attendanceLogsBody">
                  ${attendance.map(a => `
                    <tr data-batch-id="${a.batch_id}">
                      <td>${fmtDate(a.attendance_date)}</td>
                      <td class="text-white fw-semibold">${a.student_name}</td>
                      <td><code>${a.batch_id}</code></td>
                      <td><span class="badge ${a.status === 'present' ? 'bg-success' : a.status === 'late' ? 'bg-warning' : 'bg-danger'}">${a.status.toUpperCase()}</span></td>
                      <td>${a.join_time ? new Date(a.join_time).toLocaleTimeString() : '—'}</td>
                      <td>${a.exit_time ? new Date(a.exit_time).toLocaleTimeString() : '—'}</td>
                      <td>${a.duration_mins} mins</td>
                    </tr>
                  `).join('') || '<tr><td colspan="7" class="text-center text-muted">No attendance logs logged yet. Auto-logged when students join Agora live classes.</td></tr>'}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    `;
  } catch (e) {
    document.getElementById('pageContent').innerHTML = `<div class="alert alert-danger">${e.message}</div>`;
  }
}

function filterAttendanceLogs() {
  const batchId = document.getElementById('filterAttBatch').value;
  const rows = document.querySelectorAll('#attendanceLogsBody tr');
  rows.forEach(r => {
    if (!batchId || r.dataset.batchId === batchId) {
      r.classList.remove('d-none');
    } else {
      r.classList.add('d-none');
    }
  });
}

// ── Study Materials ───────────────────────────────────────────
async function renderNotes() {
  loading();
  try {
    const [notes, batches, courses] = await Promise.all([
      api('/teacher/notes'),
      api('/teacher/batches'),
      api('/courses'),
    ]);

    document.getElementById('pageContent').innerHTML = `
      <div class="row g-4">
        <div class="col-lg-8">
          <div class="spx-card">
            <h6 class="mb-4 fw-bold">Published Study Materials</h6>
            ${notes.length ? notes.map(n => `
              <div class="p-3 mb-3 rounded-3" style="background:rgba(255,255,255,.01);border:1px solid var(--border)">
                <div class="d-flex align-items-center justify-content-between">
                  <div>
                    <h6 class="text-white fw-bold mb-1">${n.title}</h6>
                    <div class="text-muted small">${n.description || ''}</div>
                    <div class="text-muted" style="font-size:.7rem;margin-top:4px;">Uploaded: ${fmtDate(n.uploaded_at)} • Type: <strong>${n.file_type.toUpperCase()}</strong></div>
                  </div>
                  <a href="${n.file_url}" target="_blank" class="btn btn-sm btn-spx"><i class="fas fa-external-link-alt"></i> Access</a>
                </div>
              </div>
            `).join('') : '<p class="text-muted text-center">No study materials published yet.</p>'}
          </div>
        </div>

        <div class="col-lg-4">
          <div class="spx-card">
            <h6 class="mb-4 fw-bold">Publish Material</h6>
            <form onsubmit="publishMaterial(event)">
              <div class="mb-3">
                <label class="spx-label">Course Link (Optional)</label>
                <select class="form-select spx-input" id="noteCourse">
                  <option value="">None</option>
                  ${courses.map(c => `<option value="${c.id}">${c.title}</option>`).join('')}
                </select>
              </div>
              <div class="mb-3">
                <label class="spx-label">Batch Link (Optional)</label>
                <select class="form-select spx-input" id="noteBatch">
                  <option value="">None</option>
                  ${batches.map(b => `<option value="${b.id}">${b.batch_name}</option>`).join('')}
                </select>
              </div>
              <div class="mb-3">
                <label class="spx-label">Material Title</label>
                <input class="form-control spx-input" id="noteTitle" placeholder="e.g. Electromagnetism Notes PDF" required>
              </div>
              <div class="mb-3">
                <label class="spx-label">Description</label>
                <textarea class="form-control spx-input" id="noteDesc" rows="2"></textarea>
              </div>
              <div class="mb-3">
                <label class="spx-label">File upload OR Web Link</label>
                <select class="form-select spx-input mb-2" id="noteUploadType" onchange="toggleNoteSource(this.value)">
                  <option value="file">Local File Upload</option>
                  <option value="link">External Web URL</option>
                </select>
                <div id="noteFileInput">
                  <input type="file" class="form-control spx-input" id="noteFile">
                </div>
                <div id="noteLinkInput" class="d-none">
                  <input class="form-control spx-input" id="noteUrl" placeholder="https://youtube.com/...">
                </div>
              </div>
              <button type="submit" class="btn btn-spx w-100">Publish Material</button>
            </form>
          </div>
        </div>
      </div>
    `;
  } catch (e) {
    document.getElementById('pageContent').innerHTML = `<div class="alert alert-danger">${e.message}</div>`;
  }
}

function toggleNoteSource(val) {
  if (val === 'file') {
    document.getElementById('noteFileInput').classList.remove('d-none');
    document.getElementById('noteLinkInput').classList.add('d-none');
  } else {
    document.getElementById('noteFileInput').classList.add('d-none');
    document.getElementById('noteLinkInput').classList.remove('d-none');
  }
}

async function publishMaterial(e) {
  e.preventDefault();
  const source = document.getElementById('noteUploadType').value;
  const fileInput = document.getElementById('noteFile');

  const formData = new FormData();
  formData.append('title', document.getElementById('noteTitle').value);
  formData.append('description', document.getElementById('noteDesc').value);
  formData.append('courseId', document.getElementById('noteCourse').value);
  formData.append('batchId', document.getElementById('noteBatch').value);

  if (source === 'file') {
    if (!fileInput.files[0]) return showToast('Please select a file to upload', 'error');
    formData.append('file', fileInput.files[0]);
  } else {
    const url = document.getElementById('noteUrl').value.trim();
    if (!url) return showToast('Please specify a web URL', 'error');
    formData.append('file_url', url);
  }

  try {
    showToast('Publishing study material...', 'info');
    const res = await fetch(`${API}/teacher/notes`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData,
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    showToast('Study material published successfully!');
    renderNotes();
  } catch (e) {
    showToast(e.message, 'error');
  }
}

// ── Earnings ──────────────────────────────────────────────────
async function renderEarnings() {
  loading();
  try {
    const data = await api('/teacher/earnings');
    const wallet = data.wallet;
    const history = data.history;

    document.getElementById('pageContent').innerHTML = `
      <div class="row g-4">
        <div class="col-lg-5">
          <div class="spx-card text-center mb-4">
            <h5 class="text-muted mb-2">Wallet Balance</h5>
            <div class="display-6 fw-bold text-white mb-4">₹${parseFloat(wallet.wallet_balance).toLocaleString('en-IN')}</div>
            <div class="row g-2 mb-4">
              <div class="col-6 border-end border-secondary">
                <div class="text-success fw-bold">₹${parseFloat(wallet.paid_earnings).toLocaleString('en-IN')}</div>
                <div class="text-muted" style="font-size:.7rem">Total Payouts Paid</div>
              </div>
              <div class="col-6">
                <div class="text-warning fw-bold">₹${parseFloat(wallet.pending_earnings).toLocaleString('en-IN')}</div>
                <div class="text-muted" style="font-size:.7rem">Pending Escrow</div>
              </div>
            </div>
            <div class="small text-muted">Lifetime Gross: <strong>₹${parseFloat(wallet.total_earnings).toLocaleString('en-IN')}</strong></div>
          </div>

          <div class="spx-card">
            <h6 class="mb-4 fw-bold">Request Payout Withdrawal</h6>
            <form onsubmit="requestPayout(event)">
              <div class="mb-3">
                <label class="spx-label">Withdrawal Amount (₹)</label>
                <input type="number" class="form-control spx-input" id="payoutAmt" placeholder="e.g. 5000" min="1" required>
              </div>
              
              <div class="p-3 mb-3 rounded shadow-sm" style="background: var(--bg-dark); border: 1px solid var(--border);">
                <label class="spx-label fw-bold mb-2 text-primary">Bank Account details (For Bank Transfer)</label>
                
                <div class="mb-2">
                  <label class="spx-label" style="font-size: 0.7rem;">Account Holder Name</label>
                  <input type="text" class="form-control spx-input" id="payoutBankHolder" placeholder="e.g. Sahil Khan">
                </div>
                
                <div class="mb-2">
                  <label class="spx-label" style="font-size: 0.7rem;">Bank Name</label>
                  <input type="text" class="form-control spx-input" id="payoutBankName" placeholder="e.g. HDFC Bank">
                </div>

                <div class="mb-2">
                  <label class="spx-label" style="font-size: 0.7rem;">Account Number</label>
                  <input type="text" class="form-control spx-input" id="payoutBankAcc" placeholder="e.g. 5010023489112">
                </div>

                <div class="mb-0">
                  <label class="spx-label" style="font-size: 0.7rem;">IFSC Code</label>
                  <input type="text" class="form-control spx-input" id="payoutBankIfsc" placeholder="e.g. HDFC0000045">
                </div>
              </div>

              <div class="mb-3">
                <label class="spx-label">UPI ID (optional)</label>
                <input class="form-control spx-input" id="payoutUpi" placeholder="e.g. name@okaxis">
              </div>
              <button type="submit" class="btn btn-spx w-100">Submit Request</button>
            </form>
          </div>
        </div>

        <div class="col-lg-7">
          <div class="spx-card">
            <h6 class="mb-4 fw-bold">Payouts History</h6>
            <div style="overflow-x:auto">
              <table class="spx-table">
                <thead>
                  <tr>
                    <th>Date Requested</th>
                    <th>Amount</th>
                    <th>Payment Route Info</th>
                    <th>Status</th>
                    <th>Remarks / Revert Note</th>
                  </tr>
                </thead>
                <tbody>
                  ${history.map(h => `
                    <tr>
                      <td>${fmtDate(h.requested_at)}</td>
                      <td class="text-white fw-bold">₹${parseFloat(h.amount).toLocaleString('en-IN')}</td>
                      <td>${h.upi_id ? `UPI: ${h.upi_id}` : h.bank_account ? `<span style="font-size:0.75rem;">${h.bank_account}</span>` : 'Manual'}</td>
                      <td>
                        <span class="badge ${
                          h.status === 'paid' ? 'bg-success' : 
                          h.status === 'requested' || h.status === 'under_review' || h.status === 'approved' ? 'bg-warning' : 'bg-danger'
                        }">${h.status.toUpperCase()}</span>
                      </td>
                      <td class="small text-danger">${h.admin_notes || '<span class="text-muted">—</span>'}</td>
                    </tr>
                  `).join('') || '<tr><td colspan="5" class="text-center text-muted">No payout requests.</td></tr>'}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    `;
  } catch (e) {
    document.getElementById('pageContent').innerHTML = `<div class="alert alert-danger">${e.message}</div>`;
  }
}

async function requestPayout(e) {
  e.preventDefault();
  
  const bankHolder = document.getElementById('payoutBankHolder').value.trim();
  const bankName = document.getElementById('payoutBankName').value.trim();
  const bankAcc = document.getElementById('payoutBankAcc').value.trim();
  const bankIfsc = document.getElementById('payoutBankIfsc').value.trim();
  const upiId = document.getElementById('payoutUpi').value.trim();

  let bankAccountStr = '';
  if (bankAcc || bankHolder || bankName || bankIfsc) {
    if (!bankAcc || !bankHolder || !bankIfsc) {
      showToast('Please fill out all bank account details (Holder, Account No, IFSC)', 'error');
      return;
    }
    bankAccountStr = `Bank: ${bankName || 'N/A'} | A/C: ${bankAcc} | IFSC: ${bankIfsc} | Holder: ${bankHolder}`;
  }

  if (!bankAccountStr && !upiId) {
    showToast('Please provide either bank account details or a UPI ID.', 'error');
    return;
  }

  const payload = {
    amount: parseFloat(document.getElementById('payoutAmt').value),
    bank_account: bankAccountStr || null,
    upi_id: upiId || null,
  };

  try {
    const data = await api('/teacher/payouts/request', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    showToast(data.message || 'Payout request submitted successfully!');
    renderEarnings();
  } catch (e) {
    showToast(e.message, 'error');
  }
}

// ── Teacher Level ─────────────────────────────────────────────
async function renderLevel() {
  loading();
  try {
    const data = await api('/teacher/level');

    document.getElementById('pageContent').innerHTML = `
      <div class="row g-4">
        <div class="col-lg-5">
          <div class="spx-card text-center">
            <h6 class="text-muted mb-2">My Current Level</h6>
            <div class="display-4 text-warning mb-2"><i class="fas fa-medal"></i></div>
            <h4 class="text-white fw-bold mb-1">${data.level}</h4>
            <div class="text-muted small">Current Rating: <strong>${parseFloat(data.rating).toFixed(2)}</strong></div>
            
            <hr style="border-color:var(--border);margin:20px 0">
            
            <h6 class="fw-bold mb-3">Milestone Progress</h6>
            <div style="text-align:left;" class="small text-muted">
              <div class="d-flex justify-content-between mb-1"><span>Target Class Attendance:</span><strong class="text-white">90%+</strong></div>
              <div class="d-flex justify-content-between mb-1"><span>Target Student Rating:</span><strong class="text-white">4.5+</strong></div>
              <div class="d-flex justify-content-between mb-1"><span>Classes Held (this month):</span><strong class="text-white">${data.sessions_count || 0}</strong></div>
              <div class="d-flex justify-content-between"><span>Active Students:</span><strong class="text-white">${data.active_students || 0}</strong></div>
            </div>
          </div>
        </div>

        <div class="col-lg-7">
          <div class="spx-card">
            <h6 class="mb-4 fw-bold">Level Adjustment Logs</h6>
            <div style="overflow-x:auto">
              <table class="spx-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>New Level</th>
                    <th>Previous Level</th>
                    <th>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  ${(data.history || []).map(h => `
                    <tr>
                      <td>${fmtDate(h.changed_at)}</td>
                      <td class="text-white fw-bold">${h.level}</td>
                      <td>${h.previous_level || '—'}</td>
                      <td>${h.reason || 'Auto calculation update'}</td>
                    </tr>
                  `).join('') || '<tr><td colspan="4" class="text-center text-muted">No level adjustments logged yet. Level is calculated automatically every Saturday.</td></tr>'}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    `;
  } catch (e) {
    document.getElementById('pageContent').innerHTML = `<div class="alert alert-danger">${e.message}</div>`;
  }
}

// ── Profile ────────────────────────────────────────────────────
async function renderProfile() {
  loading();
  try {
    const profile = await api('/auth/profile');
    document.getElementById('pageContent').innerHTML = `
      <div class="row g-4">
        <div class="col-lg-4">
          <div class="spx-card text-center">
            <img src="${profile.photo_url||`https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.name}`}" style="width:90px;height:90px;border-radius:50%;border:3px solid var(--primary)" alt="">
            <h5 class="fw-bold mt-3 mb-1">${profile.name}</h5>
            <div class="text-muted small">${profile.role.toUpperCase()}</div>
            <div class="mt-2" style="background:rgba(60,189,176,.1);border-radius:8px;padding:6px 12px;display:inline-block">
              <span class="badge bg-warning">${profile.teacher_level || 'Bronze'}</span>
            </div>
            <div class="mt-3 text-muted small">
              <div>Qualification: <strong>${profile.qualification || '—'}</strong></div>
              <div>Expertise: <strong>${profile.subject_expertise || '—'}</strong></div>
              <div>Languages: <strong>${profile.languages || '—'}</strong></div>
              <div>Experience: <strong>${profile.experience_years || 0} years</strong></div>
              <div class="mt-2">${profile.email}</div>
              <div>${profile.phone || ''}</div>
            </div>
          </div>
        </div>
        
        <div class="col-lg-8">
          <div class="spx-card">
            <h6 class="mb-4 fw-bold">Update Profile Details</h6>
            <form onsubmit="updateProfile(event)">
              <div class="row g-3">
                <div class="col-6">
                  <label class="spx-label">Full Name</label>
                  <input class="form-control spx-input" id="profName" value="${profile.name||''}" required>
                </div>
                <div class="col-6">
                  <label class="spx-label">Phone</label>
                  <input class="form-control spx-input" id="profPhone" value="${profile.phone||''}" required>
                </div>
                <div class="col-6">
                  <label class="spx-label">Qualification</label>
                  <input class="form-control spx-input" id="profQual" value="${profile.qualification||''}">
                </div>
                <div class="col-6">
                  <label class="spx-label">Expertise (e.g. Physics, Maths)</label>
                  <input class="form-control spx-input" id="profExp" value="${profile.subject_expertise||''}">
                </div>
                <div class="col-6">
                  <label class="spx-label">Teaching Languages</label>
                  <input class="form-control spx-input" id="profLang" value="${profile.languages||''}">
                </div>
                <div class="col-6">
                  <label class="spx-label">Years of Experience</label>
                  <input type="number" class="form-control spx-input" id="profYrs" value="${profile.experience_years||0}">
                </div>
                <div class="col-12">
                  <button type="submit" class="btn btn-spx">Save Changes</button>
                </div>
              </div>
            </form>
            
            <hr style="border-color:var(--border);margin:20px 0">
            
            <h6 class="mb-3 fw-bold">Change Password</h6>
            <form onsubmit="changePassword(event)">
              <div class="row g-3">
                <div class="col-6"><input class="form-control spx-input" id="currPass" type="password" placeholder="Current Password" required></div>
                <div class="col-6"><input class="form-control spx-input" id="newPass" type="password" placeholder="New Password" required></div>
                <div class="col-12"><button type="submit" class="btn btn-outline-primary">Update Password</button></div>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;
  } catch (e) {
    document.getElementById('pageContent').innerHTML = `<div class="alert alert-danger">${e.message}</div>`;
  }
}

async function updateProfile(e) {
  e.preventDefault();
  try {
    const payload = {
      name: document.getElementById('profName').value,
      phone: document.getElementById('profPhone').value,
      qualification: document.getElementById('profQual').value,
      subject_expertise: document.getElementById('profExp').value,
      languages: document.getElementById('profLang').value,
      experience_years: parseInt(document.getElementById('profYrs').value) || 0,
    };

    const data = await api('/auth/profile', {
      method:'PUT',
      body: JSON.stringify(payload)
    });

    if (data.error) throw new Error(data.error);
    showToast('Profile updated successfully!');
    user = data.user;
    localStorage.setItem('teacher_user', JSON.stringify(user));
    showApp();
    renderProfile();
  } catch(e) { showToast(e.message, 'error'); }
}

async function changePassword(e) {
  e.preventDefault();
  try {
    const data = await api('/auth/change-password', {
      method:'POST',
      body: JSON.stringify({
        currentPassword: document.getElementById('currPass').value,
        newPassword: document.getElementById('newPass').value,
      })
    });
    if (data.error) throw new Error(data.error);
    showToast('Password updated successfully!');
    document.getElementById('currPass').value = '';
    document.getElementById('newPass').value = '';
  } catch(e) { showToast(e.message, 'error'); }
}

// ── Init ──────────────────────────────────────────────────────
if (token && user && user.role === 'teacher') {
  showApp();
  navigateTo('home');
} else {
  document.getElementById('authScreen').classList.remove('d-none');
}
