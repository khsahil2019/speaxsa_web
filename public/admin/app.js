// Speaxa Admin Portal Extended JavaScript Controller
const API = ''; // Set to absolute domain like 'https://speaxa.com' if hosting client & API on separate servers
const defaultAvatar = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2NiZDVlMSI+PHBhdGggZD0iTTEyIDEyYzIuMjEgMCA0LTEuNzkgNC00cy0xLjc5LTQtNC00LTQgMS53OS00IDQgMS53OSA0IDQgNHptMCAyYy0yLjY3IDAtOCAxLjM0LTggNHYyaDE2di0yYzAtMi42Ni01LjMzLTQtOC00eiIvPjwvc3ZnPg==';

// Global Fetch Interceptor for Security Header Injection
const originalFetch = window.fetch;
window.fetch = async function(url, options = {}) {
  let finalUrl = url;
  if (typeof url === 'string' && url.startsWith('/api')) {
    finalUrl = API + url;
  }
  const token = localStorage.getItem('speaxa_admin_token');
  const urlString = typeof finalUrl === 'string' ? finalUrl : (finalUrl && finalUrl.url) ? finalUrl.url : '';
  
  if (token) {
    if (typeof url === 'object' && url.headers) {
      try {
        url.headers.set('Authorization', `Bearer ${token}`);
      } catch (_) {
        options.headers = options.headers || {};
        options.headers['Authorization'] = `Bearer ${token}`;
      }
    } else {
      options.headers = options.headers || {};
      options.headers['Authorization'] = `Bearer ${token}`;
    }
  }
  
  const response = await originalFetch(finalUrl, options);
  if (urlString && !urlString.includes('/api/admin/login')) {
    let shouldLogout = false;
    if (response.status === 401) {
      shouldLogout = true;
    } else if (response.status === 403) {
      try {
        const clone = response.clone();
        const body = await clone.json();
        if (body && body.error && (body.error.toLowerCase().includes('token') || body.error.toLowerCase().includes('expired'))) {
          shouldLogout = true;
        }
      } catch (_) {}
    } else if (response.status === 404 && urlString.includes('/api/auth/profile')) {
      shouldLogout = true;
    }
    
    if (shouldLogout) {
      localStorage.removeItem('speaxa_admin_token');
      showAdminLoginOverlay();
    }
  }
  return response;
};

function showAdminLoginOverlay() {
  document.getElementById('adminLoginOverlay').style.display = 'flex';
}

function hideAdminLoginOverlay() {
  document.getElementById('adminLoginOverlay').style.display = 'none';
}

// Global State
const state = {
  teachers: [],
  students: [],
  parents: [],
  courses: [],
  batches: [],
  liveClasses: [],
  coupons: [],
  notifications: [],
  payments: [],
  settings: {},
  currentFilter: 'all',
  currentTab: 'dashboard',
  directoryTab: 'students' // 'students' or 'parents'
};

// Initializer
document.addEventListener('DOMContentLoaded', async () => {
  setupNavigation();
  setupEventListeners();
  setupAdminLogin();
  
  // Set host port text dynamically
  const port = window.location.port || '5001';
  const statusEl = document.querySelector('.system-status span:last-child');
  if (statusEl) {
    statusEl.innerText = `Server Host: Port ${port}`;
  }
  
  const token = localStorage.getItem('speaxa_admin_token');
  if (!token) {
    showAdminLoginOverlay();
  } else {
    try {
      const res = await fetch('/api/auth/profile');
      if (res.ok) {
        const profile = await res.json();
        if (profile.role !== 'admin') {
          throw new Error('Not admin role');
        }
        loadAllData();
      } else {
        throw new Error('Invalid admin session');
      }
    } catch (e) {
      localStorage.removeItem('speaxa_admin_token');
      showAdminLoginOverlay();
    }
  }
});

function setupAdminLogin() {
  const form = document.getElementById('adminLoginForm');
  const errorMsg = document.getElementById('loginErrorMessage');
  
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('adminEmail').value;
    const password = document.getElementById('adminPassword').value;
    errorMsg.style.display = 'none';
    
    try {
      const res = await originalFetch(API + '/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('speaxa_admin_token', data.token);
        hideAdminLoginOverlay();
        loadAllData();
      } else {
        const data = await res.json();
        errorMsg.innerText = data.error || 'Invalid credentials';
        errorMsg.style.display = 'block';
      }
    } catch (err) {
      errorMsg.innerText = 'Server connection error';
      errorMsg.style.display = 'block';
    }
  });
}

// Load all API datasets
async function loadAllData() {
  showLoadingStates();
  try {
    await Promise.all([
      fetchSettings(),
      fetchTeachers(),
      fetchStudents(),
      fetchParents(),
      fetchCourses(),
      fetchBatches(),
      fetchLiveClasses(),
      fetchCoupons(),
      fetchNotifications(),
      fetchPayments()
    ]);
    
    // Updates UI Elements
    updateBranding();
    renderDashboard();
    renderTeachers(state.currentFilter);
    renderDirectory();
    renderCoursesAndBatches();
    renderLiveClasses();
    renderCoupons();
    renderNotifications();
    renderPayments();
    renderSettings();
  } catch (error) {
    console.error('Error fetching data:', error);
    showToast('Failed to load system data. Is API server running?', 'danger');
  }
}

// Show loading states in tables/grids
function showLoadingStates() {
  const placeholders = [
    'quick-pending-list',
    'quick-payout-list',
    'teacher-grid-list',
    'directory-table-body',
    'courses-table-body',
    'batches-table-body',
    'live-classes-table-body',
    'coupon-table-body',
    'notification-table-body',
    'payments-table-body'
  ];
  placeholders.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.innerHTML = `<tr><td colspan="10" class="loading-placeholder"><i class="fa-solid fa-circle-notch fa-spin"></i> Loading data...</td></tr>`;
    }
  });
}

// API Fetch Operations
async function fetchSettings() {
  const res = await fetch('/api/admin/settings');
  state.settings = await res.json();
}

async function fetchTeachers() {
  const res = await fetch('/api/admin/teachers');
  state.teachers = await res.json();
}

async function fetchStudents() {
  const res = await fetch('/api/admin/students');
  state.students = await res.json();
}

async function fetchParents() {
  const res = await fetch('/api/admin/parents');
  state.parents = await res.json();
}

async function fetchCourses() {
  const res = await fetch('/api/admin/courses');
  state.courses = await res.json();
}

async function fetchBatches() {
  const res = await fetch('/api/admin/batches');
  state.batches = await res.json();
}

async function fetchLiveClasses() {
  const res = await fetch('/api/admin/live-classes');
  state.liveClasses = await res.json();
}

async function fetchCoupons() {
  const res = await fetch('/api/admin/coupons');
  state.coupons = await res.json();
}

async function fetchNotifications() {
  const res = await fetch('/api/admin/notifications');
  state.notifications = await res.json();
}

async function fetchPayments() {
  const res = await fetch('/api/admin/payments');
  state.payments = await res.json();
}

// Apply Branding configuration
function updateBranding() {
  const logoText = state.settings.logo_text || 'Speaxa';
  let logoUrl = state.settings.logo_url;
  
  // Resolve local logo path correctly in static dashboard
  if (logoUrl && logoUrl.startsWith('/admin/')) {
    logoUrl = logoUrl.replace('/admin/', '');
  }
  
  document.getElementById('brandNameText').innerText = logoText;
  
  const announcementText = state.settings.announcement || 'Welcome to the Speaxa Administrator Portal!';
  document.getElementById('announcementText').innerText = announcementText;
  
  const logoIcon = document.getElementById('brandLogoIcon');
  if (logoIcon) {
    if (logoIcon.tagName.toLowerCase() === 'img') {
      if (logoUrl) logoIcon.src = logoUrl;
    } else {
      if (logoUrl) {
        logoIcon.innerHTML = `<img src="${logoUrl}" alt="Logo" style="width:100%; height:100%; object-fit:contain; border-radius:inherit;">`;
      } else {
        logoIcon.innerText = logoText.charAt(0).toUpperCase();
      }
    }
  }
}

// Tab Switching
function setupNavigation() {
  const navLinks = document.querySelectorAll('.nav-link');
  const panels = document.querySelectorAll('.tab-panel');
  
  const pageTitles = {
    dashboard: { title: 'Dashboard', desc: 'System overview and platform-wide telemetry.' },
    teachers: { title: 'Teacher Approvals', desc: 'Accept, reject, and verify tutor application files.' },
    directory: { title: 'Student & Parent Directory', desc: 'Access accounts, edit logins, and reset passwords.' },
    'courses-batches': { title: 'Courses & Batches', desc: 'Approve courses or disable batches dynamically.' },
    'live-classes': { title: 'Live Session Controls', desc: 'Schedule and terminate live virtual classes.' },
    coupons: { title: 'Coupons & Offers', desc: 'Configure active promotional codes and validity limits.' },
    notifications: { title: 'Notifications Center', desc: 'Broadcast global alerts and target notifications.' },
    payments: { title: 'Payments Tracking', desc: 'Track course registrations and fee receipts log.' },
    settings: { title: 'Global Settings', desc: 'Configure platform logos, brand text, and Razorpay credentials.' },
    guide: { title: 'Portal User Guide', desc: 'System user manuals, role permissions, and setup guidelines.' }
  };

  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetTab = link.getAttribute('data-tab');
      state.currentTab = targetTab;
      
      navLinks.forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      
      document.getElementById('pageTitle').innerText = pageTitles[targetTab].title;
      document.getElementById('pageDescription').innerText = pageTitles[targetTab].desc;
      
      panels.forEach(p => p.classList.remove('active'));
      document.getElementById(`tab-${targetTab}`).classList.add('active');
    });
  });
}

// Event Listeners for modals, triggers, and forms
function setupEventListeners() {
  // Modal buttons
  document.querySelectorAll('.close-modal-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      closeModal(btn.getAttribute('data-modal'));
    });
  });

  // Message Form Submission
  document.getElementById('messageForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('messageTargetId').value;
    const subject = document.getElementById('messageSubject').value;
    const body = document.getElementById('messageBody').value;
    
    try {
      const res = await fetch(`/api/admin/users/${id}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, body })
      });
      const data = await res.json();
      showToast(data.message || 'Message sent successfully!', 'success');
      closeModal('messageModal');
      document.getElementById('messageForm').reset();
    } catch (err) {
      showToast('Error sending message', 'danger');
    }
  });

  // Credentials form submission (reset credentials)
  document.getElementById('credentialsForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('credentialsUserId').value;
    const email = document.getElementById('credentialsEmail').value;
    const password = document.getElementById('credentialsPassword').value;
    
    try {
      const res = await fetch(`/api/admin/users/${id}/reset-credentials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      showToast(data.message || 'Credentials updated successfully!', 'success');
      closeModal('credentialsModal');
      document.getElementById('credentialsForm').reset();
      
      // Reload directories
      await fetchStudents();
      await fetchParents();
      renderDirectory();
    } catch (err) {
      showToast('Error resetting credentials', 'danger');
    }
  });

  // Live Class scheduling submission
  document.getElementById('liveClassForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const batchId = document.getElementById('liveBatch').value;
    const title = document.getElementById('liveTitle').value;
    const classDate = document.getElementById('liveDate').value;
    const classTime = document.getElementById('liveTime').value;
    
    try {
      const res = await fetch('/api/admin/live-classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchId, title, classDate, classTime })
      });
      if (res.ok) {
        showToast('Live session scheduled successfully!', 'success');
        document.getElementById('liveClassForm').reset();
        await fetchLiveClasses();
        renderLiveClasses();
      } else {
        showToast('Failed to schedule session', 'danger');
      }
    } catch (err) {
      showToast('Error connecting to live session controller', 'danger');
    }
  });

  // Coupon Form Submission
  document.getElementById('couponForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const code = document.getElementById('couponCode').value;
    const discountPercent = document.getElementById('couponPercent').value;
    const validUntil = document.getElementById('couponExpiry').value;
    
    try {
      const res = await fetch('/api/admin/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, discountPercent, validUntil })
      });
      if (res.ok) {
        showToast('Coupon offer added!', 'success');
        document.getElementById('couponForm').reset();
        await fetchCoupons();
        renderCoupons();
      } else {
        showToast('Failed to save coupon code', 'danger');
      }
    } catch (err) {
      showToast('Error creating promo coupon', 'danger');
    }
  });

  // Notification Broadcast Form
  document.getElementById('notificationForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('notifTitle').value;
    const targetRole = document.getElementById('notifTarget').value;
    const message = document.getElementById('notifBody').value;
    
    try {
      const res = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, target: targetRole, message })
      });
      if (res.ok) {
        showToast('Broadcast sent successfully!', 'success');
        document.getElementById('notificationForm').reset();
        await fetchNotifications();
        renderNotifications();
      } else {
        showToast('Broadcast failed', 'danger');
      }
    } catch (err) {
      showToast('Error publishing notifications', 'danger');
    }
  });

  // Global Settings Form (Saves category objects)
  document.getElementById('settingsForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    let adBanners = [];
    try {
      const jsonText = document.getElementById('settingAdBanners').value.trim();
      adBanners = jsonText ? JSON.parse(jsonText) : [];
      if (!Array.isArray(adBanners)) {
        showToast('Advertisement Banners must be a valid JSON array!', 'danger');
        return;
      }
    } catch (err) {
      showToast('Invalid JSON format for Advertisement Banners. Please correct it.', 'danger');
      return;
    }

    const settingsPayload = {
      logo_text: document.getElementById('settingLogoText').value,
      logo_url: document.getElementById('settingLogoUrl').value,
      announcement: document.getElementById('settingAnnouncement').value,
      ad_banners: adBanners,
      
      agora_settings: {
        agora_app_id: document.getElementById('settingAgoraAppId').value,
        agora_app_certificate: document.getElementById('settingAgoraAppCertificate').value,
        agora_enabled: document.getElementById('settingAgoraEnabled').checked
      },
      
      sms_settings: {
        sms_provider: document.getElementById('settingSmsProvider').value,
        sms_api_key: document.getElementById('settingSmsApiKey').value,
        sms_sender_id: document.getElementById('settingSmsSenderId').value,
        sms_enabled: document.getElementById('settingSmsEnabled').checked
      },
      
      push_settings: {
        firebase_key: document.getElementById('settingFirebaseKey').value,
        push_enabled: document.getElementById('settingPushEnabled').checked
      },
      
      email_settings: {
        email_service: document.getElementById('settingEmailService').value,
        smtp_host: document.getElementById('settingSmtpHost').value,
        smtp_port: parseInt(document.getElementById('settingSmtpPort').value) || 587,
        email_username: document.getElementById('settingEmailUsername').value,
        email_password: document.getElementById('settingEmailPassword').value,
        email_enabled: document.getElementById('settingEmailEnabled').checked
      },
      
      payment_settings: {
        razorpay_key_id: document.getElementById('settingRazorpayKeyId').value,
        razorpay_key_secret: document.getElementById('settingRazorpayKeySecret').value,
        payment_enabled: document.getElementById('settingPaymentEnabled').checked
      }
    };
    
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingsPayload)
      });
      if (res.ok) {
        showToast('All global configurations saved successfully!', 'success');
        await fetchSettings();
        updateBranding();
      }
    } catch (err) {
      showToast('Error saving configurations', 'danger');
    }
  });

  // Filter triggers for Teacher approvals
  document.querySelectorAll('.filter-btn[data-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn[data-filter]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.currentFilter = btn.getAttribute('data-filter');
      renderTeachers(state.currentFilter);
    });
  });

  // Directory Search Box
  document.getElementById('directorySearch').addEventListener('input', (e) => {
    renderDirectory(e.target.value.trim().toLowerCase());
  });

  // Handle click on any view-tab-btn (Review, Review All, Review History, etc.)
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.view-tab-btn');
    if (btn) {
      const targetTab = btn.getAttribute('data-target');
      if (targetTab) {
        const navLink = document.querySelector(`.nav-link[data-tab="${targetTab}"]`);
        if (navLink) {
          navLink.click();
        }
      }
    }
  });

  // Course Form Submission
  document.getElementById('courseForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('courseTitle').value;
    const description = document.getElementById('courseDescription').value;
    const grade = document.getElementById('courseGrade').value;
    const board = document.getElementById('courseBoard').value;
    const price = parseFloat(document.getElementById('coursePrice').value);
    const id = `c_${Date.now()}`;
    
    try {
      const res = await fetch('/api/admin/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, standard: grade, board, subjects: description, fees: price })
      });
      if (res.ok) {
        showToast('New course created successfully!', 'success');
        document.getElementById('courseForm').reset();
        closeModal('courseModal');
        await fetchCourses();
        renderCoursesAndBatches();
        renderDashboard();
      } else {
        showToast('Failed to create course', 'danger');
      }
    } catch (err) {
      showToast('Error connecting to course coordinator', 'danger');
    }
  });

  // Batch Form Submission
  document.getElementById('batchForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const course_id = document.getElementById('batchCourseId').value;
    const subject = document.getElementById('batchSubject').value;
    const schedule = document.getElementById('batchSchedule').value;
    const time_slot = document.getElementById('batchTimeSlot').value;
    const capacity = parseInt(document.getElementById('batchCapacity').value);
    
    try {
      const res = await fetch('/api/admin/batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ course_id, subject, schedule, time_slot, capacity })
      });
      if (res.ok) {
        showToast('New batch created successfully!', 'success');
        document.getElementById('batchForm').reset();
        closeModal('batchModal');
        await fetchBatches();
        renderCoursesAndBatches();
        renderDashboard();
      } else {
        showToast('Failed to create batch', 'danger');
      }
    } catch (err) {
      showToast('Error connecting to backend', 'danger');
    }
  });

  // Edit User details form submission
  document.getElementById('editUserForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('editUserId').value;
    const name = document.getElementById('editUserName').value;
    const email = document.getElementById('editUserEmail').value;
    const phone = document.getElementById('editUserPhone').value;
    const qualification = document.getElementById('editUserClass').value;
    const board = document.getElementById('editUserBoard').value;
    const password_plain = document.getElementById('editUserPassword').value;
    
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, qualification, board, password_plain })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'User details updated successfully!', 'success');
        closeModal('editUserModal');
        document.getElementById('editUserForm').reset();
        
        // Reload directories
        await fetchStudents();
        await fetchTeachers();
        await fetchParents();
        renderDirectory();
      } else {
        showToast(data.error || 'Failed to update user details', 'danger');
      }
    } catch (err) {
      showToast('Error updating user details', 'danger');
    }
  });
}

// Toggle students/parents/teachers active lists
function toggleDirectoryView(viewType) {
  state.directoryTab = viewType;
  
  // Update styling for graphical stats cards
  const cards = ['students', 'parents', 'teachers'];
  cards.forEach(card => {
    const el = document.getElementById(`card-filter-${card}`);
    if (el) {
      if (card === viewType) {
        el.classList.add('active');
        el.style.borderColor = 'var(--primary)';
        el.style.boxShadow = 'var(--shadow)';
      } else {
        el.classList.remove('active');
        el.style.borderColor = 'transparent';
        el.style.boxShadow = 'none';
      }
    }
  });

  renderDirectory();
}

// Modal open/close helpers
function openModal(id) {
  document.getElementById(id).classList.add('active');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('active');
}

// Message Modal popup helper
function openMessageModal(targetId, targetName) {
  document.getElementById('messageTargetId').value = targetId;
  document.getElementById('messageTargetName').innerText = targetName;
  openModal('messageModal');
}

// Credentials Reset popup helper
function openCredentialsModal(userId, userName, currentEmail) {
  document.getElementById('credentialsUserId').value = userId;
  document.getElementById('credentialsUserName').innerText = userName;
  document.getElementById('credentialsEmail').value = currentEmail;
  document.getElementById('credentialsPassword').value = '';
  openModal('credentialsModal');
}

// Edit User popup helper
function openEditUserModal(id) {
  const user = state.students.find(u => u.id === id) ||
               state.teachers.find(u => u.id === id) ||
               state.parents.find(u => u.id === id);
  if (!user) {
    showToast('User not found in local data', 'danger');
    return;
  }
  
  document.getElementById('editUserId').value = user.id;
  document.getElementById('editUserName').value = user.name;
  document.getElementById('editUserEmail').value = user.email;
  document.getElementById('editUserPhone').value = user.phone || '';
  document.getElementById('editUserPassword').value = '';

  const classGroup = document.getElementById('editClassGroup');
  const boardGroup = document.getElementById('editBoardGroup');
  
  if (user.role === 'student') {
    classGroup.style.display = 'block';
    boardGroup.style.display = 'block';
    document.getElementById('editUserClass').value = user.qualification || '';
    document.getElementById('editUserBoard').value = user.board || '';
  } else if (user.role === 'teacher') {
    classGroup.style.display = 'block';
    boardGroup.style.display = 'none';
    document.getElementById('editUserClass').value = user.qualification || '';
    document.getElementById('editUserBoard').value = '';
  } else {
    classGroup.style.display = 'none';
    boardGroup.style.display = 'none';
    document.getElementById('editUserClass').value = '';
    document.getElementById('editUserBoard').value = '';
  }
  
  openModal('editUserModal');
}

// User Detailed History & Info popup helper
function openUserDetailsModal(id) {
  const user = state.students.find(u => u.id === id) ||
               state.teachers.find(u => u.id === id) ||
               state.parents.find(u => u.id === id);
  if (!user) {
    showToast('User not found in local data', 'danger');
    return;
  }

  const content = document.getElementById('user-detail-content');
  
  // Render general profile details
  let html = `
    <div style="display:flex; flex-direction:column; gap:16px; align-items:center; text-align:center; margin-bottom:20px; border-bottom:1px solid var(--border); padding-bottom:16px;">
      <img src="${user.photo_url || defaultAvatar}" alt="${user.name}" style="width:80px; height:80px; border-radius:50%; object-fit:cover; border:2px solid var(--primary);" onerror="this.onerror=null; this.src=defaultAvatar;">
      <div>
        <h3 style="font-size:20px; color:var(--text-primary);">${user.name}</h3>
        <p class="text-secondary">${user.email}</p>
        <div style="margin-top:8px; display:flex; gap:8px; justify-content:center;">
          <span class="badge-status ${user.role === 'admin' ? 'approved' : user.role === 'teacher' ? 'pending' : 'active'}" style="text-transform:uppercase;">${user.role}</span>
          <span class="badge-status ${user.is_disabled ? 'rejected' : 'approved'}">${user.is_disabled ? 'DISABLED' : 'ACTIVE'}</span>
        </div>
      </div>
    </div>

    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:16px; margin-bottom:24px;">
      <div class="detail-card" style="background:rgba(255,255,255,0.03); border:1px solid var(--border); border-radius:8px; padding:12px;">
        <span class="text-secondary" style="font-size:11px; display:block; margin-bottom:4px;">User ID</span>
        <code style="font-size:13px; font-weight:bold; color:var(--primary);">${user.id}</code>
      </div>
      <div class="detail-card" style="background:rgba(255,255,255,0.03); border:1px solid var(--border); border-radius:8px; padding:12px;">
        <span class="text-secondary" style="font-size:11px; display:block; margin-bottom:4px;">Phone Number</span>
        <strong style="font-size:13px;">${user.phone || '—'}</strong>
      </div>
      <div class="detail-card" style="background:rgba(255,255,255,0.03); border:1px solid var(--border); border-radius:8px; padding:12px;">
        <span class="text-secondary" style="font-size:11px; display:block; margin-bottom:4px;">Plain Password</span>
        <strong style="font-size:13px; color:#E11D48;"><i class="fa-solid fa-key" style="margin-right:4px;"></i>${user.password_plain || 'speaxa123'}</strong>
      </div>
      <div class="detail-card" style="background:rgba(255,255,255,0.03); border:1px solid var(--border); border-radius:8px; padding:12px;">
        <span class="text-secondary" style="font-size:11px; display:block; margin-bottom:4px;">Account Created</span>
        <strong style="font-size:13px;">${new Date(user.created_at).toLocaleDateString()}</strong>
      </div>
  `;

  if (user.role === 'student') {
    html += `
      <div class="detail-card" style="background:rgba(255,255,255,0.03); border:1px solid var(--border); border-radius:8px; padding:12px;">
        <span class="text-secondary" style="font-size:11px; display:block; margin-bottom:4px;">Class / Standard</span>
        <strong style="font-size:13px;">${user.qualification || '—'}</strong>
      </div>
      <div class="detail-card" style="background:rgba(255,255,255,0.03); border:1px solid var(--border); border-radius:8px; padding:12px;">
        <span class="text-secondary" style="font-size:11px; display:block; margin-bottom:4px;">Academic Board</span>
        <strong style="font-size:13px;">${user.board || '—'}</strong>
      </div>
      <div class="detail-card" style="background:rgba(255,255,255,0.03); border:1px solid var(--border); border-radius:8px; padding:12px; grid-column: span 2;">
        <span class="text-secondary" style="font-size:11px; display:block; margin-bottom:4px;">Learning Streak</span>
        <strong style="font-size:15px; color:#F59E0B;"><i class="fa-solid fa-fire" style="margin-right:6px;"></i>${user.learning_streak || 0} Days</strong>
      </div>
    `;
  } else if (user.role === 'teacher') {
    html += `
      <div class="detail-card" style="background:rgba(255,255,255,0.03); border:1px solid var(--border); border-radius:8px; padding:12px;">
        <span class="text-secondary" style="font-size:11px; display:block; margin-bottom:4px;">Tutor Qualification</span>
        <strong style="font-size:13px;">${user.qualification || '—'}</strong>
      </div>
      <div class="detail-card" style="background:rgba(255,255,255,0.03); border:1px solid var(--border); border-radius:8px; padding:12px;">
        <span class="text-secondary" style="font-size:11px; display:block; margin-bottom:4px;">Tutor Experience</span>
        <strong style="font-size:13px;">${user.experience_years || 0} Years</strong>
      </div>
      <div class="detail-card" style="background:rgba(255,255,255,0.03); border:1px solid var(--border); border-radius:8px; padding:12px;">
        <span class="text-secondary" style="font-size:11px; display:block; margin-bottom:4px;">Average Rating</span>
        <strong style="font-size:13px; color:#F59E0B;"><i class="fa-solid fa-star" style="margin-right:4px;"></i>${user.rating || '5.0'} / 5.0</strong>
      </div>
      <div class="detail-card" style="background:rgba(255,255,255,0.03); border:1px solid var(--border); border-radius:8px; padding:12px;">
        <span class="text-secondary" style="font-size:11px; display:block; margin-bottom:4px;">Approval Status</span>
        <strong style="font-size:13px; text-transform:uppercase;">${user.approval_status || 'approved'}</strong>
      </div>
    `;
  }

  html += `</div>`; // Close grid

  // User History / Transactions Section
  if (user.role === 'student') {
    const payments = state.payments.filter(p => p.student_id === id);
    html += `<h4 style="margin-bottom:12px; font-size:15px; border-bottom:1px solid var(--border); padding-bottom:6px;"><i class="fa-solid fa-history" style="margin-right:6px;"></i>Payment & Enrollment History</h4>`;
    if (payments.length === 0) {
      html += `<p class="text-secondary" style="font-size:13px; font-style:italic;">No payments or course enrollments found for this student.</p>`;
    } else {
      html += `
        <div style="max-height: 200px; overflow-y: auto; border: 1px solid var(--border); border-radius: 8px;">
          <table style="width:100%; border-collapse:collapse; font-size:12px; text-align:left;">
            <thead>
              <tr style="background:rgba(255,255,255,0.05); border-bottom:1px solid var(--border);">
                <th style="padding:8px;">Course</th>
                <th style="padding:8px;">Amount</th>
                <th style="padding:8px;">Status</th>
                <th style="padding:8px;">Date</th>
              </tr>
            </thead>
            <tbody>
              ${payments.map(p => `
                <tr style="border-bottom:1px solid var(--border);">
                  <td style="padding:8px;"><strong>${p.course_title}</strong></td>
                  <td style="padding:8px;">₹${p.amount}</td>
                  <td style="padding:8px;"><span class="badge-status ${p.status.toLowerCase() === 'success' || p.status.toLowerCase() === 'completed' ? 'approved' : 'pending'}">${p.status.toUpperCase()}</span></td>
                  <td style="padding:8px;">${new Date(p.created_at).toLocaleDateString()}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    }
  } else if (user.role === 'teacher') {
    const teacherSubs = state.payments.filter(p => p.teacher_id === id);
    html += `<h4 style="margin-bottom:12px; font-size:15px; border-bottom:1px solid var(--border); padding-bottom:6px;"><i class="fa-solid fa-history" style="margin-right:6px;"></i>Taught Classes & Subscriptions</h4>`;
    if (teacherSubs.length === 0) {
      html += `<p class="text-secondary" style="font-size:13px; font-style:italic;">No active student subscriptions found for this teacher.</p>`;
    } else {
      html += `
        <div style="max-height: 200px; overflow-y: auto; border: 1px solid var(--border); border-radius: 8px;">
          <table style="width:100%; border-collapse:collapse; font-size:12px; text-align:left;">
            <thead>
              <tr style="background:rgba(255,255,255,0.05); border-bottom:1px solid var(--border);">
                <th style="padding:8px;">Student</th>
                <th style="padding:8px;">Course</th>
                <th style="padding:8px;">Amount</th>
                <th style="padding:8px;">Date</th>
              </tr>
            </thead>
            <tbody>
              ${teacherSubs.map(p => `
                <tr style="border-bottom:1px solid var(--border);">
                  <td style="padding:8px;">${p.student_name}</td>
                  <td style="padding:8px;"><strong>${p.course_title}</strong></td>
                  <td style="padding:8px;">₹${p.amount}</td>
                  <td style="padding:8px;">${new Date(p.created_at).toLocaleDateString()}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    }
  }

  content.innerHTML = html;
  openModal('userDetailsModal');
}

// Toast Popup system
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  let icon = 'info-circle';
  if (type === 'success') icon = 'circle-check';
  if (type === 'danger') icon = 'circle-exclamation';
  if (type === 'warning') icon = 'triangle-exclamation';
  
  toast.innerHTML = `
    <i class="fa-solid fa-${icon}"></i>
    <span>${message}</span>
  `;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'slideIn 0.2s ease reverse';
    setTimeout(() => toast.remove(), 200);
  }, 4000);
}

// Render Dashboard Telemetry
function renderDashboard() {
  const totalUsers = state.teachers.length + state.students.length + state.parents.length;
  const approvedTeachers = state.teachers.filter(t => t.approval_status === 'approved').length;
  const pendingTeachers = state.teachers.filter(t => t.approval_status === 'pending').length;
  const totalRevenue = state.payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
  
  document.getElementById('stat-total-users').innerText = totalUsers;
  document.getElementById('stat-active-teachers').innerText = approvedTeachers;
  document.getElementById('stat-pending-teachers').innerText = pendingTeachers;
  document.getElementById('stat-total-revenue').innerText = `₹${totalRevenue.toLocaleString()}`;
  document.getElementById('pending-badge-count').innerText = pendingTeachers;
  
  if (document.getElementById('stat-active-courses')) {
    document.getElementById('stat-active-courses').innerText = state.courses.filter(c => !c.is_disabled).length;
  }
  if (document.getElementById('stat-active-batches')) {
    document.getElementById('stat-active-batches').innerText = state.batches.length;
  }
  
  // Render quick lists
  const pendingList = document.getElementById('quick-pending-list');
  const pendingItems = state.teachers.filter(t => t.approval_status === 'pending');
  if (pendingItems.length === 0) {
    pendingList.innerHTML = `<div class="loading-placeholder">No pending approval files.</div>`;
  } else {
    pendingList.innerHTML = pendingItems.slice(0, 3).map(teacher => `
      <div class="pending-item">
        <div class="person-detail">
          <div class="avatar-initials">${teacher.name.charAt(0)}</div>
          <div class="person-info">
            <span class="person-name">${teacher.name}</span>
            <span class="person-sub">${teacher.qualification}</span>
          </div>
        </div>
        <button class="btn btn-sm btn-primary view-tab-btn" data-target="teachers">Review</button>
      </div>
    `).join('');
  }
  
  const payoutList = document.getElementById('quick-payout-list');
  if (state.payments.length === 0) {
    payoutList.innerHTML = `<div class="loading-placeholder">No incoming payments.</div>`;
  } else {
    payoutList.innerHTML = state.payments.slice(0, 3).map(pm => `
      <div class="payout-item">
        <div class="person-detail">
          <div class="avatar-initials" style="background-color: var(--primary-soft); color: var(--primary);"><i class="fa-solid fa-receipt"></i></div>
          <div class="person-info">
            <span class="person-name">${pm.student_name}</span>
            <span class="person-sub">${new Date(pm.created_at).toLocaleDateString()}</span>
          </div>
        </div>
        <span class="stat-value" style="font-size:14px; color: var(--primary);">₹${pm.amount}</span>
      </div>
    `).join('');
  }
}

// Render Teacher Approvals
function renderTeachers(filter = 'all') {
  const container = document.getElementById('teacher-grid-list');
  let filtered = state.teachers;
  if (filter !== 'all') {
    filtered = state.teachers.filter(t => t.approval_status === filter);
  }
  
  if (filtered.length === 0) {
    container.innerHTML = `<div class="loading-placeholder" style="grid-column: 1/-1;">No teacher files found.</div>`;
    return;
  }
  
  container.innerHTML = filtered.map(t => {
    const isPending = t.approval_status === 'pending';
    const isApproved = t.approval_status === 'approved';
    const labelClass = t.approval_status;
    
    return `
      <div class="teacher-card">
        <span class="card-badge badge-status ${labelClass}">${t.approval_status.toUpperCase()}</span>
        <div class="teacher-header">
          <img class="teacher-photo" src="${t.photo_url || defaultAvatar}" alt="${t.name}" onerror="this.src=defaultAvatar">
          <div class="teacher-meta">
            <h3>${t.name}</h3>
            <p>${t.email}</p>
          </div>
        </div>
        <div class="teacher-details">
          <div class="detail-row">
            <span class="detail-label">Qualification:</span>
            <span class="detail-val">${t.qualification}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Experience:</span>
            <span class="detail-val">${t.experience_years} Years</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Phone:</span>
            <span class="detail-val">${t.phone || '—'}</span>
          </div>
        </div>
        <div class="teacher-actions">
          <button class="btn btn-secondary btn-sm" onclick="showTeacherDetails('${t.id}')">View Resume</button>
          <button class="btn btn-secondary btn-sm" onclick="openMessageModal('${t.id}', '${escapeHtml(t.name)}')">
            <i class="fa-regular fa-envelope"></i> Message
          </button>
          ${isPending ? `
            <button class="btn btn-success btn-sm" onclick="approveTeacher('${t.id}')">Approve</button>
            <button class="btn btn-danger btn-sm" onclick="rejectTeacher('${t.id}')">Reject</button>
          ` : ''}
          ${t.approval_status === 'rejected' ? `
            <button class="btn btn-success btn-sm" onclick="approveTeacher('${t.id}')">Re-Approve</button>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');
}

function renderDirectory(searchQuery = '') {
  const body = document.getElementById('directory-table-body');
  
  // Update graphical stats cards counts dynamically
  if (document.getElementById('dir-students-count')) {
    document.getElementById('dir-students-count').innerText = state.students.length;
    document.getElementById('dir-parents-count').innerText = state.parents.length;
    document.getElementById('dir-teachers-count').innerText = state.teachers.length;
  }
  
  let list = [];
  if (state.directoryTab === 'students') {
    list = state.students;
  } else if (state.directoryTab === 'parents') {
    list = state.parents;
  } else {
    list = state.teachers;
  }
  
  if (searchQuery) {
    list = list.filter(item => 
      item.name.toLowerCase().includes(searchQuery) ||
      item.email.toLowerCase().includes(searchQuery) ||
      item.id.toLowerCase().includes(searchQuery)
    );
  }
  
  if (list.length === 0) {
    body.innerHTML = `<tr><td colspan="5" class="loading-placeholder">No directory listings found.</td></tr>`;
    return;
  }
  
  body.innerHTML = list.map(user => {
    let statusClass = 'approved';
    let statusText = user.approval_status || 'Active';
    if (user.approval_status === 'pending') statusClass = 'pending';
    if (user.approval_status === 'rejected') statusClass = 'rejected';

    const avatarHtml = user.photo_url 
      ? `<img src="${user.photo_url}" style="width:32px; height:32px; border-radius:50%; object-fit:cover; margin-right:10px;" onerror="this.onerror=null; this.src=defaultAvatar;" />`
      : `<img src="${defaultAvatar}" style="width:32px; height:32px; border-radius:50%; object-fit:cover; margin-right:10px; background:#1e293b;" />`;

    const academicInfo = user.role === 'student'
      ? `<span class="text-secondary" style="font-size:11px; margin-top:2px;">${user.qualification || 'Class not set'} • ${user.board || 'Board not set'}</span>`
      : '';

    const idCol = `
      <div style="display:flex; flex-direction:column;">
        <code>${user.id}</code>
        ${user.role === 'student' ? `<span style="font-size:11px; color:#F59E0B; margin-top:3px; font-weight:600;"><i class="fa-solid fa-fire" style="margin-right:3px;"></i>${user.learning_streak || 0} Day Streak</span>` : ''}
      </div>
    `;

    return `
      <tr>
        <td>
          <div class="person-detail" style="display:flex; align-items:center;">
            ${avatarHtml}
            <div style="display:flex; flex-direction:column;">
              <span class="person-name" style="font-weight:600;">${user.name}</span>
              ${academicInfo}
            </div>
          </div>
        </td>
        <td>
          <div style="display:flex; flex-direction:column;">
            <span>${user.email}</span>
            <span class="text-secondary" style="font-size:11px;">${user.phone || '—'}</span>
            <span style="font-size:11px; color:#E11D48; margin-top:3px; font-weight:600;"><i class="fa-solid fa-key" style="margin-right:3px;"></i>Pass: ${user.password_plain || 'speaxa123'}</span>
          </div>
        </td>
        <td>${idCol}</td>
        <td><span class="badge-status ${user.is_disabled ? 'rejected' : statusClass}">${user.is_disabled ? 'DISABLED' : statusText.toUpperCase()}</span></td>
        <td>
          <div style="display:flex; gap:6px;">
            <button class="btn btn-primary btn-sm" onclick="openEditUserModal('${user.id}')"><i class="fa-solid fa-pen-to-square"></i> Edit</button>
            <button class="btn btn-info btn-sm" onclick="openUserDetailsModal('${user.id}')"><i class="fa-solid fa-circle-info"></i> Details</button>
            <button class="btn btn-secondary btn-sm" onclick="openCredentialsModal('${user.id}', '${escapeHtml(user.name)}', '${user.email}')">Reset Pass</button>
            <button class="btn ${user.is_disabled ? 'btn-success' : 'btn-danger'} btn-sm" onclick="toggleUserStatus('${user.id}')">${user.is_disabled ? 'Enable' : 'Disable'}</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// Render Courses and Batches Management
function renderCoursesAndBatches() {
  // Course listing
  const cBody = document.getElementById('courses-table-body');
  if (state.courses.length === 0) {
    cBody.innerHTML = `<tr><td colspan="4" class="loading-placeholder">No courses defined.</td></tr>`;
  } else {
    cBody.innerHTML = state.courses.map(c => `
      <tr>
        <td><strong>${c.title}</strong></td>
        <td>${c.grade} • ${c.board}</td>
        <td>₹${c.price}</td>
        <td>
          <button class="btn ${c.is_disabled ? 'btn-success' : 'btn-danger'} btn-sm" onclick="toggleCourseState('${c.id}')">
            ${c.is_disabled ? 'Enable Course' : 'Disable Course'}
          </button>
        </td>
      </tr>
    `).join('');
  }

  // Batch listing
  const bBody = document.getElementById('batches-table-body');
  if (state.batches.length === 0) {
    bBody.innerHTML = `<tr><td colspan="5" class="loading-placeholder">No batches created.</td></tr>`;
  } else {
    bBody.innerHTML = state.batches.map(b => `
      <tr>
        <td><code>${b.id}</code></td>
        <td>${b.teacher_name}</td>
        <td>${b.days_of_week} • ${b.start_time}</td>
        <td><span class="badge-status ${b.is_upcoming ? 'pending' : 'approved'}">${b.is_upcoming ? 'Upcoming' : 'Ongoing'}</span></td>
        <td>
          <button class="btn btn-secondary btn-sm" onclick="toggleBatchState('${b.id}')">
            Toggle Status
          </button>
        </td>
      </tr>
    `).join('');
  }

  // Load dropdown selectors for Live Classes batch schedule selection
  const select = document.getElementById('liveBatch');
  select.innerHTML = `<option value="" disabled selected>Choose a batch...</option>` +
    state.batches.map(b => `<option value="${b.id}">${b.id} (${b.teacher_name})</option>`).join('');
}

// Render Scheduled Live Virtual classes
function renderLiveClasses() {
  const body = document.getElementById('live-classes-table-body');
  if (state.liveClasses.length === 0) {
    body.innerHTML = `<tr><td colspan="5" class="loading-placeholder">No live classes scheduled.</td></tr>`;
    return;
  }
  
  body.innerHTML = state.liveClasses.map(lc => `
    <tr>
      <td><strong>${lc.title}</strong></td>
      <td><code>${lc.batch_id}</code></td>
      <td>${lc.class_date}</td>
      <td>${lc.class_time}</td>
      <td>
        <button class="btn btn-danger btn-sm" onclick="cancelLiveClass('${lc.id}')">Cancel Stream</button>
      </td>
    </tr>
  `).join('');
}

// Render Promo coupons list
function renderCoupons() {
  const body = document.getElementById('coupon-table-body');
  if (state.coupons.length === 0) {
    body.innerHTML = `<tr><td colspan="5" class="loading-placeholder">No coupons issued.</td></tr>`;
    return;
  }
  
  body.innerHTML = state.coupons.map(c => `
    <tr>
      <td><code>${c.code}</code></td>
      <td>${c.discount_percent}% Off</td>
      <td>${c.valid_until}</td>
      <td><span class="badge-status ${c.is_active ? 'approved' : 'rejected'}">${c.is_active ? 'Active' : 'Expired'}</span></td>
      <td>
        <div style="display:flex; gap:6px;">
          <button class="btn btn-secondary btn-sm" onclick="toggleCouponState('${c.code}')">Toggle Active</button>
          <button class="btn btn-danger btn-sm" onclick="deleteCoupon('${c.code}')">Delete</button>
        </div>
      </td>
    </tr>
  `).join('');
}

// Render Sent System Notification broadcast logs
function renderNotifications() {
  const body = document.getElementById('notification-table-body');
  if (state.notifications.length === 0) {
    body.innerHTML = `<tr><td colspan="4" class="loading-placeholder">No announcements sent.</td></tr>`;
    return;
  }
  
  body.innerHTML = state.notifications.map(n => `
    <tr>
      <td>
        <div style="display:flex; flex-direction:column; gap:4px;">
          <strong>${n.title}</strong>
          <span style="font-size:12px; color:var(--text-secondary);">${n.message}</span>
        </div>
      </td>
      <td><span class="badge-status approved" style="text-transform: capitalize;">${n.target_role}</span></td>
      <td>${new Date(n.created_at).toLocaleDateString()}</td>
      <td><span class="badge-status approved">Sent</span></td>
    </tr>
  `).join('');
}

// Render Course enrollment payments
function renderPayments() {
  const body = document.getElementById('payments-table-body');
  if (state.payments.length === 0) {
    body.innerHTML = `<tr><td colspan="6" class="loading-placeholder">No payment receipts found.</td></tr>`;
    return;
  }
  
  body.innerHTML = state.payments.map(pm => `
    <tr>
      <td><code>${pm.id}</code></td>
      <td><strong>${pm.student_name}</strong></td>
      <td>${pm.course_title}</td>
      <td><strong style="color:var(--primary);">₹${pm.amount}</strong></td>
      <td><span class="badge-status approved">${pm.status}</span></td>
      <td>${new Date(pm.created_at).toLocaleString()}</td>
    </tr>
  `).join('');
}

// Render Global Settings (Unpacks category objects)
function renderSettings() {
  document.getElementById('settingLogoText').value = state.settings.logo_text || 'Speaxa';
  document.getElementById('settingLogoUrl').value = state.settings.logo_url || '';
  document.getElementById('settingAnnouncement').value = state.settings.announcement || '';
  document.getElementById('settingAdBanners').value = JSON.stringify(state.settings.ad_banners || [], null, 2);
  
  // Agora/WebRTC
  const agora = state.settings.agora_settings || {};
  document.getElementById('settingAgoraAppId').value = agora.agora_app_id || '';
  document.getElementById('settingAgoraAppCertificate').value = agora.agora_app_certificate || '';
  document.getElementById('settingAgoraEnabled').checked = !!agora.agora_enabled;
  
  // SMS/OTP
  const sms = state.settings.sms_settings || {};
  document.getElementById('settingSmsProvider').value = sms.sms_provider || 'twilio';
  document.getElementById('settingSmsApiKey').value = sms.sms_api_key || '';
  document.getElementById('settingSmsSenderId').value = sms.sms_sender_id || '';
  document.getElementById('settingSmsEnabled').checked = !!sms.sms_enabled;
  
  // Push Notification
  const push = state.settings.push_settings || {};
  document.getElementById('settingFirebaseKey').value = push.firebase_key || '';
  document.getElementById('settingPushEnabled').checked = !!push.push_enabled;
  
  // Email SMTP
  const email = state.settings.email_settings || {};
  document.getElementById('settingEmailService').value = email.email_service || 'gmail';
  document.getElementById('settingSmtpHost').value = email.smtp_host || '';
  document.getElementById('settingSmtpPort').value = email.smtp_port || '';
  document.getElementById('settingEmailUsername').value = email.email_username || '';
  document.getElementById('settingEmailPassword').value = email.email_password || '';
  document.getElementById('settingEmailEnabled').checked = !!email.email_enabled;
  
  // Payments
  const payment = state.settings.payment_settings || {};
  document.getElementById('settingRazorpayKeyId').value = payment.razorpay_key_id || '';
  document.getElementById('settingRazorpayKeySecret').value = payment.razorpay_key_secret || '';
  document.getElementById('settingPaymentEnabled').checked = !!payment.payment_enabled;
}

// Switch between global settings sub-panels
window.switchSettingsTab = function(panelId) {
  // Hide all sub-panels
  document.querySelectorAll('.settings-subpanel').forEach(panel => {
    panel.style.display = 'none';
  });
  
  // Show target sub-panel
  document.getElementById(panelId).style.display = 'block';
  
  // Update button active states
  const buttons = document.querySelectorAll('.subtab-btn');
  buttons.forEach(btn => {
    btn.classList.remove('active');
  });
  
  // Find current button and make active
  const clickedBtn = Array.from(buttons).find(btn => btn.getAttribute('onclick').includes(panelId));
  if (clickedBtn) {
    clickedBtn.classList.add('active');
  }
};

// Test dynamic credentials connection
window.testConnection = async function(type) {
  let configPayload = {};
  
  switch (type) {
    case 'agora':
      configPayload = {
        agora_app_id: document.getElementById('settingAgoraAppId').value,
        agora_app_certificate: document.getElementById('settingAgoraAppCertificate').value
      };
      break;
    case 'sms':
      configPayload = {
        sms_provider: document.getElementById('settingSmsProvider').value,
        sms_api_key: document.getElementById('settingSmsApiKey').value
      };
      break;
    case 'push':
      configPayload = {
        firebase_key: document.getElementById('settingFirebaseKey').value
      };
      break;
    case 'email':
      configPayload = {
        smtp_host: document.getElementById('settingSmtpHost').value,
        smtp_port: parseInt(document.getElementById('settingSmtpPort').value) || 587,
        email_username: document.getElementById('settingEmailUsername').value,
        email_password: document.getElementById('settingEmailPassword').value
      };
      break;
    case 'payment':
      configPayload = {
        razorpay_key_id: document.getElementById('settingRazorpayKeyId').value,
        razorpay_key_secret: document.getElementById('settingRazorpayKeySecret').value
      };
      break;
  }
  
  showToast(`Initiating connection test for ${type}...`, 'info');
  
  try {
    const res = await fetch('/api/admin/settings/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, config: configPayload })
    });
    
    const result = await res.json();
    if (res.ok && result.success) {
      showToast(result.message, 'success');
    } else {
      showToast(result.error || 'Connection verification failed.', 'danger');
    }
  } catch (err) {
    showToast('Failed to connect to verification server.', 'danger');
  }
};

// --- Action Request Endpoints ---

async function approveTeacher(id) {
  if (!confirm('Are you sure you want to approve this teacher request?')) return;
  try {
    const res = await fetch(`/api/admin/teachers/${id}/approve`, { method: 'POST' });
    if (res.ok) {
      showToast('Teacher approved!', 'success');
      await fetchTeachers();
      renderTeachers(state.currentFilter);
      renderDashboard();
    }
  } catch (err) {
    showToast('Network error', 'danger');
  }
}

async function rejectTeacher(id) {
  if (!confirm('Are you sure you want to reject this teacher application?')) return;
  try {
    const res = await fetch(`/api/admin/teachers/${id}/reject`, { method: 'POST' });
    if (res.ok) {
      showToast('Teacher request rejected.', 'warning');
      await fetchTeachers();
      renderTeachers(state.currentFilter);
      renderDashboard();
    }
  } catch (err) {
    showToast('Network error', 'danger');
  }
}

async function showTeacherDetails(id) {
  const teacher = state.teachers.find(t => t.id === id);
  if (!teacher) return;
  
  const content = document.getElementById('teacher-detail-content');
  const footer = document.getElementById('teacher-detail-footer');
  
  content.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:16px; align-items:center; text-align:center; margin-bottom:20px;">
      <img src="${teacher.photo_url || defaultAvatar}" alt="${teacher.name}" style="width:80px; height:80px; border-radius:50%; object-fit:cover; border:2px solid var(--primary);" onerror="this.src=defaultAvatar;">
      <div>
        <h3 style="font-size:18px;">${teacher.name}</h3>
        <p class="text-secondary">${teacher.email}</p>
        <span class="badge-status approved" style="margin-top:6px; display:inline-block;">${teacher.approval_status.toUpperCase()}</span>
      </div>
    </div>
    
    <div style="display:flex; flex-direction:column; gap:12px; border-top:1px solid var(--border); padding-top:16px;">
      <div style="display:flex; justify-content:space-between; font-size:13px;">
        <span class="text-secondary">Phone Number:</span>
        <strong>${teacher.phone || '—'}</strong>
      </div>
      <div style="display:flex; justify-content:space-between; font-size:13px;">
        <span class="text-secondary">Qualification:</span>
        <strong>${teacher.qualification}</strong>
      </div>
      <div style="display:flex; justify-content:space-between; font-size:13px;">
        <span class="text-secondary">Years of Experience:</span>
        <strong>${teacher.experience_years} Years</strong>
      </div>
    </div>
  `;
  
  footer.innerHTML = `
    <button type="button" class="btn btn-secondary close-modal-btn" data-modal="teacherDetailsModal" onclick="closeModal('teacherDetailsModal')">Close</button>
    ${teacher.approval_status === 'pending' ? `
      <button class="btn btn-success" onclick="closeModal('teacherDetailsModal'); approveTeacher('${teacher.id}');">Approve</button>
      <button class="btn btn-danger" onclick="closeModal('teacherDetailsModal'); rejectTeacher('${teacher.id}');">Reject</button>
    ` : ''}
  `;
  
  openModal('teacherDetailsModal');
}

async function toggleCourseState(id) {
  try {
    const res = await fetch(`/api/admin/courses/${id}/toggle`, { method: 'POST' });
    if (res.ok) {
      showToast('Course state toggled!', 'success');
      await fetchCourses();
      renderCoursesAndBatches();
    }
  } catch (err) {
    showToast('Failed to toggle course state', 'danger');
  }
}

async function toggleBatchState(id) {
  try {
    const res = await fetch(`/api/admin/batches/${id}/toggle`, { method: 'POST' });
    if (res.ok) {
      showToast('Batch state toggled!', 'success');
      await fetchBatches();
      renderCoursesAndBatches();
    }
  } catch (err) {
    showToast('Failed to toggle batch status', 'danger');
  }
}

async function toggleUserStatus(id) {
  if (!confirm('Are you sure you want to toggle the disabled status of this user?')) return;
  try {
    const res = await fetch(`/api/admin/users/${id}/toggle-status`, { method: 'POST' });
    if (res.ok) {
      showToast('User status toggled successfully!', 'success');
      await fetchStudents();
      await fetchParents();
      await fetchTeachers();
      renderDirectory();
    } else {
      showToast('Failed to toggle user status', 'danger');
    }
  } catch (err) {
    showToast('Error communicating with server', 'danger');
  }
}

async function cancelLiveClass(id) {
  if (!confirm('Are you sure you want to cancel/stop this live session?')) return;
  try {
    const res = await fetch(`/api/admin/live-classes/${id}`, { method: 'DELETE' });
    if (res.ok) {
      showToast('Live class session cancelled.', 'warning');
      await fetchLiveClasses();
      renderLiveClasses();
    }
  } catch (err) {
    showToast('Failed to cancel live class', 'danger');
  }
}

async function toggleCouponState(code) {
  try {
    const res = await fetch(`/api/admin/coupons/${code}/toggle`, { method: 'POST' });
    if (res.ok) {
      showToast('Coupon status updated!', 'success');
      await fetchCoupons();
      renderCoupons();
    }
  } catch (err) {
    showToast('Failed to toggle coupon state', 'danger');
  }
}

async function deleteCoupon(code) {
  if (!confirm(`Are you sure you want to delete coupon ${code}?`)) return;
  try {
    const res = await fetch(`/api/admin/coupons/${code}`, { method: 'DELETE' });
    if (res.ok) {
      showToast('Coupon code deleted successfully.', 'warning');
      await fetchCoupons();
      renderCoupons();
    }
  } catch (err) {
    showToast('Failed to delete coupon', 'danger');
  }
}

// Helper to escape HTML characters
function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
