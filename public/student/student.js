// SPEAXSA Student Portal JS
const API = '/api';
let token = localStorage.getItem('student_token') || sessionStorage.getItem('student_token');
let user = JSON.parse(localStorage.getItem('student_user') || sessionStorage.getItem('student_user') || 'null');

const Toast = new bootstrap.Toast(document.getElementById('toastEl'), { delay: 3000 });

function showToast(msg, type = 'success') {
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
    const data = await (await fetch(`${API}/auth/login`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email: document.getElementById('loginEmail').value, password: document.getElementById('loginPassword').value }) })).json();
    if (data.error) throw new Error(data.error);
    saveAuth(data.token, data.user);
  } catch(e) { document.getElementById('loginError').textContent = e.message; document.getElementById('loginError').classList.remove('d-none'); }
}

async function sendOTP() {
  const identifier = document.getElementById('otpEmail').value;
  if (!identifier) return showToast('Enter your email or phone first', 'error');
  try {
    const data = await (await fetch(`${API}/auth/send-otp`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ identifier, purpose:'login' }) })).json();
    showToast(data.message || 'OTP sent!', 'success');
    if (data.otp) { document.getElementById('otpCode').value = data.otp; showToast(`Dev mode OTP: ${data.otp}`, 'info'); }
  } catch(e) { showToast(e.message, 'error'); }
}

async function verifyOTP() {
  const identifier = document.getElementById('otpEmail').value;
  const otp = document.getElementById('otpCode').value;
  if (!identifier || !otp) return showToast('Enter email/phone and OTP', 'error');
  try {
    const data = await (await fetch(`${API}/auth/verify-otp`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ identifier, otp, purpose:'login' }) })).json();
    if (data.error) throw new Error(data.error);
    saveAuth(data.token, data.user);
  } catch(e) { showToast(e.message, 'error'); }
}

async function doRegister() {
  try {
    const data = await (await fetch(`${API}/auth/register`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({
      name: document.getElementById('regName').value,
      email: document.getElementById('regEmail').value,
      phone: document.getElementById('regPhone').value,
      password: document.getElementById('regPassword').value,
      grade: document.getElementById('regGrade').value,
      board: document.getElementById('regBoard').value,
      role: 'student',
    }) })).json();
    if (data.error) throw new Error(data.error);
    saveAuth(data.token, data.user);
  } catch(e) { document.getElementById('registerError').textContent = e.message; document.getElementById('registerError').classList.remove('d-none'); }
}

async function sendForgotOTP() {
  const email = document.getElementById('forgotEmail').value;
  if (!email) return showToast('Enter email', 'error');
  try {
    const data = await (await fetch(`${API}/auth/forgot-password`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email }) })).json();
    if (data.error) throw new Error(data.error);
    showToast('OTP sent!');
    if (data.otp) { document.getElementById('resetOTP').value = data.otp; }
    document.getElementById('resetSection').classList.remove('d-none');
  } catch(e) { showToast(e.message,'error'); }
}

async function doReset() {
  const email = document.getElementById('forgotEmail').value;
  const otp = document.getElementById('resetOTP').value;
  const newPassword = document.getElementById('resetPass').value;
  try {
    const data = await (await fetch(`${API}/auth/reset-password`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email, otp, newPassword }) })).json();
    if (data.error) throw new Error(data.error);
    showToast('Password reset! Please login.');
    switchTab('login');
  } catch(e) { showToast(e.message,'error'); }
}

function saveAuth(tok, usr) {
  token = tok; user = usr;
  localStorage.setItem('student_token', tok);
  localStorage.setItem('student_user', JSON.stringify(usr));
  showApp();
  navigateTo('home');
}

function logout() {
  localStorage.removeItem('student_token'); localStorage.removeItem('student_user');
  token = null; user = null;
  document.getElementById('authScreen').classList.remove('d-none');
  document.getElementById('studentApp').classList.add('d-none');
}

function showApp() {
  document.getElementById('authScreen').classList.add('d-none');
  document.getElementById('studentApp').classList.remove('d-none');
  if (user) {
    const av = user.photo_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`;
    document.getElementById('avatarSidebar').src = av;
    document.getElementById('avatarHeader').src = av;
    document.getElementById('nameSidebar').textContent = user.name;
    document.getElementById('codeSidebar').textContent = user.student_code || user.role;
  }
  loadFCMToken();
}

async function loadFCMToken() {
  // Firebase messaging setup - placeholder
}

// ── Navigation ─────────────────────────────────────────────────
document.querySelectorAll('.nav-item[data-page]').forEach(item => {
  item.addEventListener('click', () => navigateTo(item.dataset.page));
});

function navigateTo(page) {
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelector(`.nav-item[data-page="${page}"]`)?.classList.add('active');
  const titles = { home:'Dashboard', courses:'Browse Courses', mybatches:'My Batches',
    attendance:'Attendance', assignments:'Assignments', recordings:'Recordings',
    reports:'Monthly Reports', notifications:'Notifications', profile:'My Profile', parents:'Parent Access Requests' };
  document.getElementById('pageTitle').textContent = titles[page] || page;
  const renders = { home:renderHome, courses:renderCourses, mybatches:renderMyBatches,
    attendance:renderAttendance, assignments:renderAssignments, recordings:renderRecordings,
    reports:renderReports, notifications:renderNotifications, profile:renderProfile, parents:renderParents };
  renders[page]?.();
}

function togglePlatformGuide() {
  const content = document.getElementById('platformGuideContent');
  const icon = document.getElementById('guideToggleIcon');
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
    const [batches, attendance, assignments, notifs] = await Promise.all([
      api('/student/my-batches'),
      api('/student/attendance'),
      api('/student/assignments'),
      api('/student/notifications'),
    ]);
    const attStats = attendance.stats || { total:0, present:0, attendancePct:0 };
    const pending = assignments.filter?.(a => !a.submission_id) || [];
    
    document.getElementById('pageContent').innerHTML = `
      <div class="mb-4">
        <h5 class="fw-bold mb-1">Welcome back, ${user?.name?.split(' ')[0] || 'Student'}! 👋</h5>
        <p class="text-muted small">Here's your learning summary today</p>
      </div>
      
      <!-- Interactive Student Platform Guide -->
      <div class="spx-card mb-4 border-start border-4 border-primary" style="background: rgba(60, 189, 176, 0.04); box-shadow: 0 4px 12px rgba(15,23,42,0.03);">
        <div class="d-flex align-items-center justify-content-between cursor-pointer" onclick="togglePlatformGuide()" style="cursor: pointer; user-select: none;">
          <div class="d-flex align-items-center gap-2">
            <span class="fs-5">💡</span>
            <h6 class="mb-0 fw-bold text-primary">Student Quick Operations Guide & Onboarding Checklist</h6>
          </div>
          <span id="guideToggleIcon" class="text-primary"><i class="fas fa-chevron-down"></i></span>
        </div>
        <div id="platformGuideContent" class="mt-3 d-none" style="font-size: 0.85rem; line-height: 1.6; color: var(--text-secondary);">
          <div class="row g-3">
            <div class="col-md-6 col-lg-3">
              <div class="p-3 rounded-3 h-100" style="background: var(--bg-card); border: 1px solid var(--border);">
                <strong class="text-primary d-block mb-1">1. Find Courses</strong>
                Go to <strong>Browse Courses</strong> in the sidebar. Select an active course, view detailed syllabi, and click <strong>Enroll & Pay</strong>.
              </div>
            </div>
            <div class="col-md-6 col-lg-3">
              <div class="p-3 rounded-3 h-100" style="background: var(--bg-card); border: 1px solid var(--border);">
                <strong class="text-primary d-block mb-1">2. Attend Live Classes</strong>
                Check class schedules in <strong>My Batches</strong>. When class is live, click <strong>Join Live</strong> to stream the Agora interactive room.
              </div>
            </div>
            <div class="col-md-6 col-lg-3">
              <div class="p-3 rounded-3 h-100" style="background: var(--bg-card); border: 1px solid var(--border);">
                <strong class="text-primary d-block mb-1">3. Hand In Assignments</strong>
                Select a pending task from the <strong>Assignments</strong> panel, select your homework PDF file, and click <strong>Submit Homework</strong>.
              </div>
            </div>
            <div class="col-md-6 col-lg-3">
              <div class="p-3 rounded-3 h-100" style="background: var(--bg-card); border: 1px solid var(--border);">
                <strong class="text-primary d-block mb-1">4. Review Stats</strong>
                Check progress in the <strong>Attendance</strong> or <strong>Monthly Reports</strong> section to see marks, streaks, and feedback.
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="row g-3 mb-4">
        <div class="col-6 col-lg-3"><div class="stat-card"><div class="d-flex align-items-center justify-content-between mb-2"><div class="stat-icon" style="background:rgba(60,189,176,.15);color:#3CBDB0"><i class="fas fa-layer-group"></i></div></div><div class="stat-value">${batches.length||0}</div><div class="stat-label">Enrolled Batches</div></div></div>
        <div class="col-6 col-lg-3"><div class="stat-card"><div class="d-flex align-items-center justify-content-between mb-2"><div class="stat-icon" style="background:rgba(16,185,129,.15);color:#10B981"><i class="fas fa-calendar-check"></i></div></div><div class="stat-value">${attStats.attendancePct}%</div><div class="stat-label">Attendance Rate</div></div></div>
        <div class="col-6 col-lg-3"><div class="stat-card"><div class="d-flex align-items-center justify-content-between mb-2"><div class="stat-icon" style="background:rgba(245,158,11,.15);color:#F59E0B"><i class="fas fa-tasks"></i></div></div><div class="stat-value">${pending.length||0}</div><div class="stat-label">Pending Assignments</div></div></div>
        <div class="col-6 col-lg-3"><div class="stat-card"><div class="d-flex align-items-center justify-content-between mb-2"><div class="stat-icon" style="background:rgba(239,68,68,.15);color:#EF4444"><i class="fas fa-bell"></i></div></div><div class="stat-value">${notifs.length||0}</div><div class="stat-label">Notifications</div></div></div>
      </div>
      <div class="row g-4">
        <div class="col-lg-8">
          <div class="spx-card">
            <div class="d-flex align-items-center justify-content-between mb-3">
              <h6 class="mb-0">My Batches</h6>
              <a onclick="navigateTo('courses')" class="text-primary small" style="cursor:pointer">Browse More →</a>
            </div>
            ${batches.length ? batches.slice(0,4).map(b => `
              <div class="d-flex align-items-center gap-3 p-3 mb-2 rounded-3" style="background:var(--bg-dark);border:1px solid var(--border)">
                <div style="width:44px;height:44px;border-radius:12px;background:var(--gradient);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">📚</div>
                <div class="flex-grow-1">
                  <div class="fw-semibold text-white small">${b.course_title||b.batch_name}</div>
                  <div class="text-muted" style="font-size:.75rem">${b.teacher_name||''} • ${(b.days_of_week||[]).join(', ')} ${b.start_time||''}</div>
                </div>
                ${b.status === 'active' ? `<a href="/live" class="btn btn-sm btn-spx px-3" style="font-size:.75rem">Join Live</a>` : '<span class="text-muted small">Inactive</span>'}
              </div>`).join('') : '<p class="text-muted small text-center py-3">No batches enrolled yet</p>'}
          </div>
        </div>
        <div class="col-lg-4">
          <div class="spx-card">
            <h6 class="mb-3">Notifications</h6>
            ${notifs.slice(0,5).map(n => `
              <div class="mb-3 p-2 rounded" style="background:var(--bg-dark)">
                <div class="fw-semibold small text-white">${n.title}</div>
                <div class="text-muted" style="font-size:.75rem">${n.message?.substr(0,80)}${n.message?.length>80?'...':''}</div>
              </div>`).join('') || '<p class="text-muted small">No notifications</p>'}
          </div>
        </div>
      </div>`;
  } catch(e) {
    document.getElementById('pageContent').innerHTML = `<div class="alert alert-danger">${e.message}</div>`;
  }
}

// ── Courses ────────────────────────────────────────────────────
async function renderCourses() {
  loading();
  try {
    const courses = await api('/student/courses');
    document.getElementById('pageContent').innerHTML = `
      <div class="row g-3 mb-4">
        <div class="col-md-4"><input class="form-control spx-input" placeholder="Search courses..." oninput="renderCoursesGrid(this.value)"></div>
        <div class="col-md-2">
          <select class="form-select spx-input" id="filterGrade" onchange="renderCoursesGrid()">
            <option value="">All Grades</option>
            ${['Class 6','Class 7','Class 8','Class 9','Class 10','Class 11','Class 12'].map(g=>`<option>${g}</option>`).join('')}
          </select>
        </div>
        <div class="col-md-2">
          <select class="form-select spx-input" id="filterBoard" onchange="renderCoursesGrid()">
            <option value="">All Boards</option>
            <option>CBSE</option><option>ICSE</option>
          </select>
        </div>
      </div>
      <div class="row g-3" id="coursesGrid"></div>`;
    window._courses = courses;
    renderCoursesGrid('');
  } catch(e) {
    document.getElementById('pageContent').innerHTML = `<div class="alert alert-danger">${e.message}</div>`;
  }
}

function renderCoursesGrid(q = '') {
  const grade = document.getElementById('filterGrade')?.value || '';
  const board = document.getElementById('filterBoard')?.value || '';
  const courses = (window._courses || []).filter(c =>
    (!q || c.title?.toLowerCase().includes(q.toLowerCase()) || c.subject?.toLowerCase().includes(q.toLowerCase())) &&
    (!grade || c.grade === grade) && (!board || c.board === board)
  );
  const icons = { Physics:'⚛️', Mathematics:'📐', Chemistry:'🧪', Biology:'🌿', English:'📚' };
  document.getElementById('coursesGrid').innerHTML = courses.map(c => `
    <div class="col-sm-6 col-lg-4">
      <div class="course-card" onclick="showCourseDetails('${c.id}')">
        <div class="course-thumb">${icons[c.subject]||'📖'}</div>
        <div class="p-3">
          <div class="d-flex gap-2 mb-2">
            <span style="font-size:.7rem;background:rgba(60,189,176,.15);color:#3CBDB0;border-radius:6px;padding:2px 8px">${c.subject||'General'}</span>
            <span style="font-size:.7rem;background:rgba(16,185,129,.15);color:#10B981;border-radius:6px;padding:2px 8px">${c.grade||''}</span>
          </div>
          <div class="fw-bold text-white mb-1">${c.title}</div>
          <p class="text-muted" style="font-size:.8rem;margin:0">${(c.description||'').substr(0,60)}...</p>
          <div class="d-flex align-items-center justify-content-between mt-3">
            <span style="font-family:'Outfit',sans-serif;font-size:1.1rem;font-weight:800;color:#3CBDB0">₹${parseFloat(c.fees||0).toLocaleString('en-IN')}</span>
            <span class="text-muted" style="font-size:.75rem">${c.batch_count||0} batches</span>
          </div>
        </div>
      </div>
    </div>`).join('') || '<div class="col-12 text-center text-muted py-4">No courses found</div>';
}

async function showCourseDetails(courseId) {
  try {
    let course = (window._courses || []).find(c => c.id === courseId);
    if (!course) {
      const courses = await api('/student/courses');
      window._courses = courses;
      course = courses.find(c => c.id === courseId);
    }
    if (!course) {
      showToast('Course details not found', 'error');
      return;
    }

    const [batches, myBatches] = await Promise.all([
      api(`/student/batches?courseId=${courseId}`),
      api('/student/my-batches')
    ]);

    const myBatchIds = myBatches.map(mb => mb.id);

    const bodyEl = document.getElementById('courseDetailsBody');
    bodyEl.innerHTML = `
      <div class="row g-4">
        <div class="col-md-5">
          <div class="p-4 rounded-3 shadow-sm" style="background:var(--bg-dark); border:1px solid var(--border);">
            <span class="badge bg-primary mb-2 px-3 py-2 rounded-2" style="font-size:0.75rem; font-weight:600; letter-spacing:0.5px;">${course.subject}</span>
            <h4 class="fw-bold mb-3" style="color:var(--text-primary); font-family:'Outfit',sans-serif;">${course.title}</h4>
            <p class="text-muted small mb-4" style="line-height:1.6;">${course.description || 'No description provided.'}</p>
            <div class="d-flex justify-content-between mb-2 small text-muted">
              <span>Grade & Board:</span>
              <strong style="color:var(--text-primary);">${course.grade} (${course.board})</strong>
            </div>
            <div class="d-flex justify-content-between mb-2 small text-muted">
              <span>Duration:</span>
              <strong style="color:var(--text-primary);">${course.duration_weeks || 12} weeks</strong>
            </div>
            <hr style="border-color:var(--border); margin: 1.5rem 0;">
            <div class="d-flex justify-content-between align-items-center">
              <span class="text-muted small">Course Fee:</span>
              <span class="fs-4 fw-bold text-success" style="font-family:'Outfit',sans-serif; font-weight:800;">₹${parseFloat(course.fees).toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>
        
        <div class="col-md-7">
          <h6 class="fw-bold mb-3" style="color:var(--text-primary);"><i class="fas fa-layer-group me-2 text-primary"></i>Available Batches</h6>
          <div class="d-flex flex-column gap-3 batch-list" style="max-height: 380px; overflow-y: auto; padding-right: 4px;">
            ${batches.length ? batches.map(b => {
              const isEnrolled = myBatchIds.includes(b.id);
              const isFull = b.seats_filled >= b.capacity;
              const seatsLeft = b.capacity - b.seats_filled;

              let btnHtml = '';
              if (isEnrolled) {
                btnHtml = `<button class="btn btn-sm btn-secondary w-100 py-2 rounded-2" disabled style="font-weight:600;"><i class="fas fa-check-circle me-1"></i> Already Enrolled</button>`;
              } else if (isFull) {
                btnHtml = `<button class="btn btn-sm btn-outline-danger w-100 py-2 rounded-2" disabled style="font-weight:600;"><i class="fas fa-times-circle me-1"></i> Batch Full</button>`;
              } else {
                btnHtml = `<button class="btn btn-sm btn-spx w-100 py-2 rounded-2" style="font-weight:600;" onclick="showCheckout('${course.id}', '${b.id}', '${b.batch_name.replace(/'/g, "\\'")}', ${course.fees})">Select & Enroll</button>`;
              }

              return `
                <div class="batch-card">
                  <div class="d-flex justify-content-between align-items-start mb-2">
                    <div>
                      <h6 class="fw-bold mb-1" style="color:var(--text-primary);">${b.batch_name}</h6>
                      <div class="text-muted" style="font-size: 0.75rem;">
                        <i class="fas fa-user-tie me-1 text-primary"></i> Mentor: <strong style="color:var(--text-secondary);">${b.teacher_name || 'Expert'}</strong>
                      </div>
                    </div>
                    <span class="badge ${seatsLeft <= 5 ? 'bg-danger-subtle text-danger' : 'bg-success-subtle text-success'} px-2 py-1" style="font-size:0.7rem; font-weight:600; border: 1px solid currentColor;">
                      ${seatsLeft} Seats Left
                    </span>
                  </div>
                  
                  <div class="small text-muted mb-3">
                    <div class="mb-1"><i class="far fa-clock me-1 text-primary"></i> ${b.start_time.substr(0,5)} - ${b.end_time.substr(0,5)}</div>
                    <div><i class="far fa-calendar-alt me-1 text-primary"></i> ${b.days_of_week.join(', ')}</div>
                  </div>
                  
                  ${btnHtml}
                </div>
              `;
            }).join('') : '<p class="text-muted text-center py-4">No active batches available for this course yet.</p>'}
          </div>
        </div>
      </div>
    `;

    const modal = new bootstrap.Modal(document.getElementById('courseDetailsModal'));
    modal.show();
  } catch(e) { 
    showToast(e.message, 'error'); 
  }
}

function showCheckout(courseId, batchId, batchName, fees) {
  const bodyEl = document.getElementById('courseDetailsBody');
  const studentUser = user || { name: '', email: '', phone: '' };

  bodyEl.innerHTML = `
    <div class="p-2">
      <div class="mb-4 d-flex align-items-center">
        <button class="btn btn-sm btn-outline-secondary me-3 px-3 py-1 rounded-2" onclick="showCourseDetails('${courseId}')">
          <i class="fas fa-arrow-left me-1"></i> Back
        </button>
        <h5 class="fw-bold mb-0" style="color:var(--text-primary);">Secure Checkout</h5>
      </div>

      <div class="row g-4">
        <div class="col-md-5 pe-md-4" style="border-right: 1px solid var(--border);">
          <h6 class="fw-bold mb-3" style="color:var(--text-primary);">Order Summary</h6>
          <div class="p-3 rounded-3 mb-3 shadow-sm" style="background:var(--bg-dark); border:1px solid var(--border);">
            <div class="text-muted small mb-1">Enrolling Batch:</div>
            <div class="fw-bold mb-3" style="color:var(--text-primary);">${batchName}</div>
            
            <div class="d-flex justify-content-between small text-muted mb-2">
              <span>Fees:</span>
              <strong style="color:var(--text-primary);">₹${fees.toLocaleString('en-IN')}</strong>
            </div>
            <div class="d-flex justify-content-between small text-muted mb-2">
              <span>Platform Tax:</span>
              <strong style="color:var(--text-primary);">₹0.00</strong>
            </div>
            <hr style="border-color:var(--border);">
            <div class="d-flex justify-content-between align-items-center">
              <span class="fw-bold" style="color:var(--text-primary);">Total Amount:</span>
              <span class="fs-5 fw-bold text-success" style="font-family:'Outfit',sans-serif; font-weight:800;">₹${fees.toLocaleString('en-IN')}</span>
            </div>
          </div>
          <div class="text-muted" style="font-size:0.75rem;">
            <i class="fas fa-lock me-1 text-primary"></i> Payments are processed securely via mock simulation gateway.
          </div>
        </div>

        <div class="col-md-7 ps-md-4">
          <h6 class="fw-bold mb-3" style="color:var(--text-primary);">Billing & Payment Details</h6>
          <form onsubmit="processMockEnrollment(event, '${courseId}', '${batchId}', ${fees})">
            <div class="mb-3">
              <label class="spx-label">Full Name</label>
              <input type="text" class="form-control spx-input" id="billName" value="${studentUser.name || ''}" required>
            </div>
            <div class="mb-3">
              <label class="spx-label">Email Address</label>
              <input type="email" class="form-control spx-input" id="billEmail" value="${studentUser.email || ''}" required>
            </div>
            <div class="mb-3">
              <label class="spx-label">Phone Number</label>
              <input type="text" class="form-control spx-input" id="billPhone" value="${studentUser.phone || ''}" required>
            </div>
            <div class="mb-3">
              <label class="spx-label">Payment Method</label>
              <select class="form-select spx-input" id="billMethod" required>
                <option value="upi">UPI (GPay / PhonePe / Paytm)</option>
                <option value="card">Credit / Debit Card</option>
                <option value="netbanking">Net Banking</option>
              </select>
            </div>
            
            <button type="submit" id="btnPay" class="btn btn-spx w-100 mt-2 py-2 fs-6">
              <i class="fas fa-shield-alt me-1"></i> Pay & Enroll Now
            </button>
          </form>
        </div>
      </div>
    </div>
  `;
}

async function processMockEnrollment(event, courseId, batchId, fees) {
  event.preventDefault();
  const btn = document.getElementById('btnPay');
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> Processing Payment...`;

  try {
    const paymentId = `pay_mock_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    
    await api(`/student/batches/${batchId}/enroll`, {
      method: 'POST',
      body: JSON.stringify({ paymentId })
    });

    const bodyEl = document.getElementById('courseDetailsBody');
    bodyEl.innerHTML = `
      <div class="text-center py-5">
        <div class="display-3 text-success mb-4"><i class="fas fa-check-circle animate__animated animate__zoomIn"></i></div>
        <h4 class="fw-bold mb-2" style="color:var(--text-primary);">Enrollment Successful!</h4>
        <p class="text-muted mb-4">You have successfully registered for the batch.<br>Transaction ID: <strong style="color:var(--text-primary);">${paymentId}</strong></p>
        <button class="btn btn-spx" data-bs-dismiss="modal">Go to Dashboard</button>
      </div>
    `;

    showToast('Payment successful & Enrolled!', 'success');
    
    setTimeout(() => {
      const modalEl = document.getElementById('courseDetailsModal');
      const modal = bootstrap.Modal.getInstance(modalEl);
      if (modal) modal.hide();
      
      if (window.currentPage === 'courses') {
        renderCourses();
      } else {
        renderHome();
      }
    }, 2000);

  } catch(e) {
    showToast(e.message, 'error');
    btn.disabled = false;
    btn.innerHTML = `<i class="fas fa-shield-alt me-1"></i> Pay & Enroll Now`;
  }
}

// ── My Batches ────────────────────────────────────────────────
async function renderMyBatches() {
  loading();
  try {
    const batches = await api('/student/my-batches');
    document.getElementById('pageContent').innerHTML = `
      <div class="row g-3">
        ${batches.map(b => `
          <div class="col-lg-6">
            <div class="spx-card">
              <div class="d-flex align-items-start gap-3">
                <div style="width:50px;height:50px;border-radius:12px;background:var(--gradient);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0">📚</div>
                <div class="flex-grow-1">
                  <div class="fw-bold text-white">${b.course_title||b.batch_name}</div>
                  <div class="text-muted small">${b.batch_name}</div>
                  <div class="d-flex gap-3 mt-2 text-muted small">
                    <span><i class="fas fa-user me-1"></i>${b.teacher_name||'—'}</span>
                    <span><i class="fas fa-calendar me-1"></i>${(b.days_of_week||[]).join(', ')}</span>
                    <span><i class="fas fa-clock me-1"></i>${b.start_time||''}</span>
                  </div>
                  <div class="mt-3 d-flex gap-2">
                    <a href="/live" class="btn btn-sm btn-spx">Join Live</a>
                    <button class="btn btn-sm btn-outline-secondary" onclick="viewBatchDetails('${b.id}')">Materials</button>
                  </div>
                </div>
              </div>
            </div>
          </div>`).join('') || '<div class="col-12 text-center text-muted py-5">No batches enrolled. <a onclick="navigateTo(\'courses\')" style="cursor:pointer;color:var(--primary)">Browse Courses</a></div>'}
      </div>`;
  } catch(e) { document.getElementById('pageContent').innerHTML = `<div class="alert alert-danger">${e.message}</div>`; }
}

// ── Attendance ────────────────────────────────────────────────
async function renderAttendance() {
  loading();
  try {
    const data = await api('/student/attendance');
    const records = data.records || [];
    const stats = data.stats || {};
    document.getElementById('pageContent').innerHTML = `
      <div class="row g-3 mb-4">
        <div class="col-4"><div class="stat-card text-center"><div class="stat-value">${stats.total||0}</div><div class="stat-label">Total Classes</div></div></div>
        <div class="col-4"><div class="stat-card text-center"><div class="stat-value" style="color:#10B981">${stats.present||0}</div><div class="stat-label">Present</div></div></div>
        <div class="col-4"><div class="stat-card text-center"><div class="stat-value" style="color:#3CBDB0">${stats.attendancePct||0}%</div><div class="stat-label">Rate</div></div></div>
      </div>
      <div class="spx-card">
        <h6 class="mb-3">Attendance Records</h6>
        <div style="overflow-x:auto">
        <table class="spx-table">
          <thead><tr><th>Date</th><th>Class</th><th>Batch</th><th>Status</th><th>Duration</th></tr></thead>
          <tbody>
            ${records.map(r => `
              <tr>
                <td>${fmtDate(r.attendance_date)}</td>
                <td class="text-white">${r.class_title||'—'}</td>
                <td>${r.batch_name||'—'}</td>
                <td><span class="badge-${r.status||'absent'}">${r.status||'absent'}</span></td>
                <td>${r.duration_mins||0} min</td>
              </tr>`).join('') || '<tr><td colspan="5" class="text-center text-muted py-3">No attendance records</td></tr>'}
          </tbody>
        </table></div>
      </div>`;
  } catch(e) { document.getElementById('pageContent').innerHTML = `<div class="alert alert-danger">${e.message}</div>`; }
}

// ── Assignments ────────────────────────────────────────────────
async function renderAssignments() {
  loading();
  try {
    const assignments = await api('/student/assignments');
    document.getElementById('pageContent').innerHTML = `
      <div class="row g-3">
        ${assignments.map(a => {
          const submitted = !!a.submission_id || a.submission_status;
          const overdue = !submitted && a.due_date && new Date() > new Date(a.due_date);
          return `
          <div class="col-lg-6">
            <div class="spx-card">
              <div class="d-flex align-items-start justify-content-between">
                <div class="flex-grow-1">
                  <div class="fw-bold text-white mb-1">${a.title}</div>
                  <div class="text-muted small mb-2">${a.batch_name||'—'} • Due: ${fmtDate(a.due_date)}</div>
                  <p class="text-muted small">${(a.description||'').substr(0,100)}</p>
                  ${submitted ? `
                    <div class="mt-2" style="background:rgba(16,185,129,.1);border-radius:8px;padding:8px 12px">
                      <div class="small text-success">✓ Submitted${a.marks_obtained != null ? ` — ${a.marks_obtained}/${a.max_marks} marks` : ''}</div>
                      ${a.feedback ? `<div class="small text-muted">${a.feedback}</div>` : ''}
                    </div>` : ''}
                  ${overdue && !submitted ? '<div class="small text-danger mt-2">⚠ Overdue</div>' : ''}
                </div>
              </div>
              ${!submitted ? `
                <div class="mt-3">
                  <input type="file" class="form-control spx-input" id="file_${a.id}" style="font-size:.8rem">
                  <button class="btn btn-sm btn-spx w-100 mt-2" onclick="submitAssignment('${a.id}')">
                    <i class="fas fa-upload me-1"></i>Submit Assignment
                  </button>
                </div>` : ''}
            </div>
          </div>`;
        }).join('') || '<div class="col-12 text-center text-muted py-5">No assignments</div>'}
      </div>`;
  } catch(e) { document.getElementById('pageContent').innerHTML = `<div class="alert alert-danger">${e.message}</div>`; }
}

async function submitAssignment(assignmentId) {
  const fileInput = document.getElementById(`file_${assignmentId}`);
  const formData = new FormData();
  if (fileInput?.files[0]) formData.append('file', fileInput.files[0]);
  formData.append('notes', '');

  try {
    const res = await fetch(`${API}/student/assignments/${assignmentId}/submit`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData,
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    showToast(data.message || 'Submitted!');
    renderAssignments();
  } catch(e) { showToast(e.message, 'error'); }
}

// ── Recordings ────────────────────────────────────────────────
async function renderRecordings() {
  loading();
  try {
    const recordings = await api('/student/recordings');
    document.getElementById('pageContent').innerHTML = `
      <div class="row g-3">
        ${recordings.map(r => `
          <div class="col-lg-6">
            <div class="spx-card">
              <div class="d-flex align-items-center gap-3">
                <div style="width:50px;height:50px;border-radius:12px;background:rgba(60,189,176,.2);display:flex;align-items:center;justify-content:center;color:#3CBDB0;font-size:20px"><i class="fas fa-play-circle"></i></div>
                <div class="flex-grow-1">
                  <div class="fw-bold text-white">${r.title||r.class_title||'Recording'}</div>
                  <div class="text-muted small">${r.batch_name||'—'} • ${fmtDate(r.recorded_at||r.class_date)} • ${r.duration_mins||0} min</div>
                </div>
                <a href="${r.recording_url}" target="_blank" class="btn btn-sm btn-spx">Watch</a>
              </div>
            </div>
          </div>`).join('') || '<div class="col-12 text-center text-muted py-5">No recordings available</div>'}
      </div>`;
  } catch(e) { document.getElementById('pageContent').innerHTML = `<div class="alert alert-danger">${e.message}</div>`; }
}

// ── Reports ────────────────────────────────────────────────────
async function renderReports() {
  loading();
  try {
    const reports = await api('/student/reports');
    document.getElementById('pageContent').innerHTML = `
      <div class="row g-4">
        ${reports.map(r => `
          <div class="col-lg-6">
            <div class="spx-card">
              <div class="d-flex align-items-center justify-content-between mb-4">
                <div>
                  <div class="fw-bold text-white">${r.batch_name||'—'}</div>
                  <div class="text-muted small">${r.report_month} • Teacher: ${r.teacher_name||'—'}</div>
                </div>
                <div class="grade-badge" style="background:rgba(60,189,176,.15);color:#3CBDB0">${r.overall_grade||'—'}</div>
              </div>
              <div class="row g-2 text-center">
                ${[
                  {label:'Attendance',value:r.attendance_pct+'%',color:'#10B981'},
                  {label:'Assignments',value:r.assignment_completion+'%',color:'#3B82F6'},
                  {label:'Curiosity',value:r.curiosity_score+'%',color:'#F59E0B'},
                  {label:'Communication',value:r.communication_growth+'%',color:'#0F766E'},
                ].map(s => `
                  <div class="col-3">
                    <div style="font-family:'Outfit',sans-serif;font-size:1.3rem;font-weight:800;color:${s.color}">${s.value}</div>
                    <div class="text-muted" style="font-size:.7rem">${s.label}</div>
                  </div>`).join('')}
              </div>
              <div class="mt-3 d-flex align-items-center gap-2">
                <span class="text-muted small">Trend:</span>
                <span style="color:${r.improvement_trend==='improving'?'#10B981':r.improvement_trend==='declining'?'#EF4444':'#F59E0B'};font-weight:600;font-size:.85rem">
                  ${r.improvement_trend==='improving'?'↑ Improving':r.improvement_trend==='declining'?'↓ Declining':'→ Stable'}
                </span>
              </div>
            </div>
          </div>`).join('') || '<div class="col-12 text-center text-muted py-5">No reports available yet</div>'}
      </div>`;
  } catch(e) { document.getElementById('pageContent').innerHTML = `<div class="alert alert-danger">${e.message}</div>`; }
}

// ── Notifications ──────────────────────────────────────────────
async function renderNotifications() {
  loading();
  try {
    const notifs = await api('/student/notifications');
    document.getElementById('pageContent').innerHTML = `
      <div class="spx-card">
        <h6 class="mb-4">Notifications</h6>
        ${notifs.map(n => `
          <div class="p-3 mb-2 rounded-3" style="background:var(--bg-dark);border:1px solid var(--border)">
            <div class="d-flex align-items-start gap-3">
              <div style="width:36px;height:36px;border-radius:10px;background:rgba(60,189,176,.15);display:flex;align-items:center;justify-content:center;flex-shrink:0">
                <i class="fas ${n.type==='warning'?'fa-exclamation-triangle text-warning':n.type==='success'?'fa-check-circle text-success':'fa-bell'}" style="color:#3CBDB0"></i>
              </div>
              <div>
                <div class="fw-semibold text-white small">${n.title}</div>
                <div class="text-muted small">${n.message}</div>
                <div class="text-muted" style="font-size:.7rem">${fmtDate(n.created_at)}</div>
              </div>
            </div>
          </div>`).join('') || '<p class="text-muted text-center py-4">No notifications</p>'}
      </div>`;
  } catch(e) { document.getElementById('pageContent').innerHTML = `<div class="alert alert-danger">${e.message}</div>`; }
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
            <div class="text-muted small">${profile.role}</div>
            <div class="mt-2" style="background:rgba(60,189,176,.1);border-radius:8px;padding:6px 12px;display:inline-block">
              <code style="color:#3CBDB0">${profile.student_code||'—'}</code>
            </div>
            <div class="mt-3 text-muted small">
              <div>${profile.grade||''} ${profile.board||''}</div>
              <div>${profile.email}</div>
              <div>${profile.phone||''}</div>
            </div>
          </div>
        </div>
        <div class="col-lg-8">
          <div class="spx-card">
            <h6 class="mb-4">Edit Profile</h6>
            <form onsubmit="updateProfile(event)">
              <div class="row g-3">
                <div class="col-6"><label class="spx-label">Full Name</label><input class="form-control spx-input" id="profName" value="${profile.name||''}"></div>
                <div class="col-6"><label class="spx-label">Phone</label><input class="form-control spx-input" id="profPhone" value="${profile.phone||''}"></div>
                <div class="col-6"><label class="spx-label">Grade</label>
                  <select class="form-select spx-input" id="profGrade">
                    ${['Class 6','Class 7','Class 8','Class 9','Class 10','Class 11','Class 12'].map(g=>`<option ${profile.grade===g?'selected':''}>${g}</option>`).join('')}
                  </select>
                </div>
                <div class="col-6"><label class="spx-label">Board</label>
                  <select class="form-select spx-input" id="profBoard">
                    ${['CBSE','ICSE','State Board'].map(b=>`<option ${profile.board===b?'selected':''}>${b}</option>`).join('')}
                  </select>
                </div>
                <div class="col-12"><button type="submit" class="btn btn-spx">Save Changes</button></div>
              </div>
            </form>
            <hr style="border-color:var(--border);margin:20px 0">
            <h6 class="mb-3">Change Password</h6>
            <form onsubmit="changePassword(event)">
              <div class="row g-3">
                <div class="col-6"><input class="form-control spx-input" id="currPass" type="password" placeholder="Current Password"></div>
                <div class="col-6"><input class="form-control spx-input" id="newPass" type="password" placeholder="New Password"></div>
                <div class="col-12"><button type="submit" class="btn btn-outline-primary">Update Password</button></div>
              </div>
            </form>
          </div>
        </div>
      </div>`;
  } catch(e) { document.getElementById('pageContent').innerHTML = `<div class="alert alert-danger">${e.message}</div>`; }
}

async function updateProfile(e) {
  e.preventDefault();
  try {
    const data = await api('/auth/profile', { method:'PUT', body: JSON.stringify({
      name: document.getElementById('profName').value,
      phone: document.getElementById('profPhone').value,
      grade: document.getElementById('profGrade').value,
      board: document.getElementById('profBoard').value,
    }) });
    if (data.error) throw new Error(data.error);
    showToast('Profile updated');
    user = data.user;
    localStorage.setItem('student_user', JSON.stringify(user));
  } catch(e) { showToast(e.message, 'error'); }
}

async function changePassword(e) {
  e.preventDefault();
  try {
    const data = await api('/auth/change-password', { method:'POST', body: JSON.stringify({
      currentPassword: document.getElementById('currPass').value,
      newPassword: document.getElementById('newPass').value,
    }) });
    if (data.error) throw new Error(data.error);
    showToast('Password changed');
    document.getElementById('currPass').value = '';
    document.getElementById('newPass').value = '';
  } catch(e) { showToast(e.message, 'error'); }
}

async function renderParents() {
  document.getElementById('pageContent').innerHTML = `<div class="d-flex align-items-center justify-content-center py-5"><div class="spinner-border text-primary"></div></div>`;
  try {
    const requests = await api('/student/parent-requests');
    document.getElementById('pageContent').innerHTML = `
      <div class="spx-card">
        <h6 class="mb-4 fw-bold">Parent Connection Requests</h6>
        <p class="text-muted small mb-4">
          Below are requests from parents wishing to link to your account to view your academic growth metrics, observation reports, and attendance records.
        </p>
        <div class="table-responsive">
          <table class="spx-table">
            <thead>
              <tr>
                <th>Parent Name</th>
                <th>Parent Email</th>
                <th>Requested Date</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${requests.map(r => {
                let statusBadge = 'bg-secondary';
                if (r.status === 'approved') statusBadge = 'bg-success';
                else if (r.status === 'rejected') statusBadge = 'bg-danger';
                else if (r.status === 'pending') statusBadge = 'bg-warning text-dark';
                
                return `
                  <tr>
                    <td class="text-white fw-bold">${r.parent_name || 'Parent'}</td>
                    <td>${r.parent_email || '—'}</td>
                    <td>${new Date(r.linked_at).toLocaleDateString('en-IN')}</td>
                    <td><span class="badge ${statusBadge}">${r.status.toUpperCase()}</span></td>
                    <td>
                      ${r.status === 'pending' ? `
                        <button class="btn btn-sm btn-success me-1 px-3" onclick="actionParentRequest(${r.link_id}, 'approve')">Approve</button>
                        <button class="btn btn-sm btn-danger px-3" onclick="actionParentRequest(${r.link_id}, 'reject')">Reject</button>
                      ` : `
                        ${r.status === 'approved' ? `
                          <button class="btn btn-sm btn-outline-danger" onclick="actionParentRequest(${r.link_id}, 'reject')">Revoke Access</button>
                        ` : `
                          <button class="btn btn-sm btn-outline-success" onclick="actionParentRequest(${r.link_id}, 'approve')">Allow Access</button>
                        `}
                      `}
                    </td>
                  </tr>
                `;
              }).join('') || '<tr><td colspan="5" class="text-center text-muted py-4">No parent link requests found.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    `;
  } catch(e) {
    document.getElementById('pageContent').innerHTML = `<div class="alert alert-danger">${e.message}</div>`;
  }
}

async function actionParentRequest(linkId, action) {
  try {
    const data = await api(`/student/parent-requests/${linkId}/${action}`, { method: 'POST' });
    showToast(data.message || `Request ${action}d successfully`);
    renderParents();
  } catch (e) {
    showToast(e.message, 'error');
  }
}

// ── Init ──────────────────────────────────────────────────────
if (token && user && user.role === 'student') {
  showApp();
  navigateTo('home');
}
