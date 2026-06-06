// SPEAXSA Teacher Portal JS
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
      banner?.classList.remove('d-none');
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
async function renderSop() {
  loading();
  try {
    const sop = await api('/teacher/sop');
    const documents = await api('/teacher/documents');

    const statusBadge = (status) => {
      const cls = { approved:'bg-success', pending:'bg-warning', sop_pending:'bg-warning', rejected:'bg-danger', suspended:'bg-danger', draft:'bg-secondary' };
      return `<span class="badge ${cls[status] || 'bg-info'}">${status ? status.toUpperCase().replace('_',' ') : 'NOT UPLOADED'}</span>`;
    };

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
                <div class="d-flex align-items-center gap-2 mt-2">
                  <input type="file" class="form-control form-control-sm spx-input" id="file_${item.id}" style="max-width:300px;">
                  <button class="btn btn-sm btn-spx" onclick="uploadSopVideo('${item.id}')">Upload</button>
                </div>
              </div>
            `).join('')}

            ${sop && sop.camera_sop_url && sop.lighting_sop_url && sop.audio_sop_url && sop.internet_proof_url && sop.demo_teaching_url ? `
              <button class="btn btn-spx w-100 mt-3" onclick="submitSopForReview()">Submit SOP For Admin Verification</button>
            ` : `
              <button class="btn btn-secondary w-100 mt-3" disabled>Submit SOP For Admin Verification (Upload all files first)</button>
            `}
          </div>
        </div>

        <div class="col-lg-5">
          <div class="spx-card">
            <h6 class="mb-4 fw-bold">KYC Documents Upload</h6>
            <form onsubmit="uploadKYCDocument(event)" class="mb-4">
              <div class="mb-3">
                <label class="spx-label">Document Type</label>
                <select class="form-select spx-input" id="docType" required>
                  <option value="aadhaar">Aadhaar Card</option>
                  <option value="pan">PAN Card</option>
                  <option value="resume">Resume / CV</option>
                  <option value="qualification">Degree Certificate</option>
                </select>
              </div>
              <div class="mb-3">
                <label class="spx-label">File</label>
                <input type="file" class="form-control spx-input" id="docFile" required>
              </div>
              <button type="submit" class="btn btn-spx w-100">Upload Document</button>
            </form>

            <h6 class="mb-3 fw-bold">Uploaded Documents</h6>
            ${documents.length ? documents.map(d => `
              <div class="d-flex justify-content-between align-items-center p-2 mb-2 rounded" style="background:rgba(255,255,255,.02);border:1px solid var(--border)">
                <div>
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
  } catch (e) {
    document.getElementById('pageContent').innerHTML = `<div class="alert alert-danger">${e.message}</div>`;
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
  try {
    const data = await api('/teacher/sop/submit', { method: 'POST' });
    showToast(data.message || 'SOP submitted successfully!');
    checkSopStatus();
    renderSop();
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
