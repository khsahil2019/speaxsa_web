// SPEAXSA Landing Page JavaScript
const API = ''; // Set to absolute domain like 'https://speaxsa.com' if hosting client & API on separate servers

// ── AOS Init ─────────────────────────────────────────────────
AOS.init({ once: true, duration: 700, offset: 80 });

// ── Navbar Scroll Effect ──────────────────────────────────────
window.addEventListener('scroll', () => {
  const nav = document.getElementById('mainNav');
  if (nav) nav.classList.toggle('scrolled', window.scrollY > 50);
});

// ── Animated Counter ──────────────────────────────────────────
function animateCounter(el, target, duration = 2000) {
  let start = 0;
  const step = target / (duration / 16);
  const timer = setInterval(() => {
    start += step;
    if (start >= target) { start = target; clearInterval(timer); }
    el.textContent = Math.floor(start).toLocaleString('en-IN') + '+';
  }, 16);
}

// ── Particles ────────────────────────────────────────────────
function createParticles() {
  const container = document.getElementById('particles');
  if (!container) return;
  for (let i = 0; i < 30; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const size = Math.random() * 4 + 1;
    const colors = ['rgba(60,189,176,0.3)', 'rgba(59,130,246,0.3)', 'rgba(245,158,11,0.2)'];
    p.style.cssText = `
      width:${size}px; height:${size}px;
      left:${Math.random() * 100}%;
      background:${colors[Math.floor(Math.random() * colors.length)]};
      animation-duration:${Math.random() * 15 + 10}s;
      animation-delay:${Math.random() * 10}s;
    `;
    container.appendChild(p);
  }
}

// ── Load Courses ──────────────────────────────────────────────
async function loadCourses() {
  const grid = document.getElementById('coursesGrid');
  if (!grid) return;
  try {
    const res = await fetch(`${API}/api/public/courses`);
    const courses = await res.json();

    const icons = { Physics: '⚛️', Mathematics: '📐', Chemistry: '🧪', Biology: '🌿', English: '📚', default: '📖' };
    const boards = { CBSE: 'CBSE', ICSE: 'ICSE' };

    if (!courses.length) {
      grid.innerHTML = `<div class="col-12 text-center py-5 text-muted">No courses available yet</div>`;
      return;
    }

    grid.innerHTML = courses.map(c => `
      <div class="col-sm-6 col-lg-3" data-aos="fade-up">
        <div class="course-card">
          <div class="course-thumbnail" style="${c.thumbnail_url ? `background: url(${c.thumbnail_url}) center/cover no-repeat;` : `background:linear-gradient(135deg,${randomGradient()})`}">
            ${c.thumbnail_url ? '' : `<span style="font-size:3rem">${icons[c.subject] || icons.default}</span>`}
            <div class="course-badge">${c.grade || ''}</div>
          </div>
          <div class="course-body">
            <div class="course-meta">
              <span><i class="fas fa-book me-1"></i>${c.subject || 'General'}</span>
              <span><i class="fas fa-calendar me-1"></i>${c.duration_weeks || 12} weeks</span>
            </div>
            <div class="course-title">${c.title}</div>
            <p class="text-muted small mb-0">${(c.description || '').substr(0, 80)}${c.description?.length > 80 ? '...' : ''}</p>
          </div>
          <div class="course-footer">
            <div class="course-price">₹${parseFloat(c.fees || 0).toLocaleString('en-IN')}</div>
            <a href="/student" class="btn btn-spx-primary btn-sm px-4">Enroll</a>
          </div>
        </div>
      </div>
    `).join('');
  } catch {
    grid.innerHTML = `<div class="col-sm-6 col-lg-3" data-aos="fade-up">
      <div class="course-card">
        <div class="course-thumbnail" style="background:linear-gradient(135deg,#3CBDB0,#0F766E)">
          <span style="font-size:3rem">⚛️</span>
          <div class="course-badge">Class 10</div>
        </div>
        <div class="course-body">
          <div class="course-meta"><span>Physics</span><span>24 weeks</span></div>
          <div class="course-title">Class 10 Physics Mastery</div>
          <p class="text-muted small">Complete CBSE Class 10 Physics with live demonstrations.</p>
        </div>
        <div class="course-footer">
          <div class="course-price">₹1,999</div>
          <a href="/student" class="btn btn-spx-primary btn-sm px-4">Enroll</a>
        </div>
      </div>
    </div>`.repeat(4);
  }
}

// ── Load Teachers ─────────────────────────────────────────────
async function loadTeachers() {
  const grid = document.getElementById('teachersGrid');
  if (!grid) return;
  try {
    const res = await fetch(`${API}/api/public/teachers`);
    const teachers = await res.json();

    if (!teachers.length) {
      grid.innerHTML = `<div class="col-12 text-center py-5 text-muted">No teachers available yet</div>`;
      return;
    }

    grid.innerHTML = teachers.map(t => `
      <div class="col-sm-6 col-md-4 col-lg-3" data-aos="fade-up">
        <div class="teacher-card">
          <div class="teacher-avatar-wrapper">
            <img src="${t.photo_url || `/uploads/profiles/teacher_sahil.png`}" 
                 class="teacher-avatar-img" alt="${t.name}"
                 onerror="this.src='/uploads/profiles/teacher_sahil.png'">
          </div>
          <div class="teacher-level-badge level-${(t.teacher_level || 'bronze').toLowerCase().replace(' ','-')}">
            ${t.teacher_level || 'Bronze'}
          </div>
          <h5 class="fw-bold mb-2">${t.name}</h5>
          <div class="teacher-subject-tag">${t.subject_expertise || 'General'}</div>
          <div class="teacher-rating-box">
            <i class="fas fa-star"></i>
            <span>${parseFloat(t.rating || 5).toFixed(1)}</span>
          </div>
          <div class="teacher-meta-item">
            <i class="fas fa-briefcase"></i>
            <span>${t.experience_years || 0}+ yrs experience</span>
          </div>
        </div>
      </div>
    `).join('');
  } catch {
    const demos = [
      { name: 'Dr. Priya Sharma', subject: 'Physics', level: 'Gold', rating: 4.9, exp: 8, photo: '/uploads/profiles/teacher_priya.png' },
      { name: 'Sahil Khan', subject: 'Mathematics', level: 'Elite', rating: 5.0, exp: 12, photo: '/uploads/profiles/teacher_sahil.png' },
      { name: 'Rahul Joshi', subject: 'Chemistry', level: 'Silver', rating: 4.7, exp: 5, photo: '/uploads/profiles/teacher_sahil.png' },
    ];
    grid.innerHTML = demos.map(t => `
      <div class="col-sm-6 col-md-4 col-lg-4" data-aos="fade-up">
        <div class="teacher-card">
          <div class="teacher-avatar-wrapper">
            <img src="${t.photo}" class="teacher-avatar-img" alt="${t.name}">
          </div>
          <div class="teacher-level-badge level-${t.level.toLowerCase().replace(' ','-')}">${t.level}</div>
          <h5 class="fw-bold mb-2">${t.name}</h5>
          <div class="teacher-subject-tag">${t.subject}</div>
          <div class="teacher-rating-box">
            <i class="fas fa-star"></i>
            <span>${t.rating.toFixed(1)}</span>
          </div>
          <div class="teacher-meta-item">
            <i class="fas fa-briefcase"></i>
            <span>${t.exp}+ yrs experience</span>
          </div>
        </div>
      </div>
    `).join('');
  }
}

// ── Load Stats ────────────────────────────────────────────────
async function loadStats() {
  try {
    const res = await fetch(`${API}/api/public/stats`);
    const stats = await res.json();

    const statEls = [
      { id: 'stat-students', target: stats.students || 10000 },
      { id: 'stat-teachers', target: stats.teachers || 500 },
      { id: 'stat-courses', target: stats.courses || 200 },
      { id: 'stat-classes', target: stats.classesCompleted || 50000 },
    ];

    statEls.forEach(({ id, target }) => {
      const el = document.getElementById(id);
      if (el) animateCounter(el, target);
    });
  } catch {
    // Use defaults
    [10000, 500, 200, 50000].forEach((n, i) => {
      const ids = ['stat-students','stat-teachers','stat-courses','stat-classes'];
      const el = document.getElementById(ids[i]);
      if (el) animateCounter(el, n);
    });
  }
}

// ── Contact Form ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('contactForm');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('contactSubmitBtn');
      const orig = btn.innerHTML;
      btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Sending...';
      btn.disabled = true;

      const name = document.getElementById('contactName').value;
      const email = document.getElementById('contactEmail').value;
      const phone = document.getElementById('contactPhone').value;
      const role = document.getElementById('contactRole').value;
      const message = document.getElementById('contactMessage').value;

      try {
        const response = await fetch(`${API}/api/support/public-connect`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, phone, role, message })
        });

        if (!response.ok) throw new Error('Failed to submit message.');

        btn.innerHTML = '<i class="fas fa-check me-2"></i>Message Sent!';
        btn.style.background = 'linear-gradient(135deg,#10B981,#059669)';

        setTimeout(() => {
          btn.innerHTML = orig;
          btn.style.background = '';
          btn.disabled = false;
          form.reset();
        }, 3000);
      } catch (err) {
        console.error(err);
        btn.innerHTML = '<i class="fas fa-times me-2"></i>Submission Failed';
        btn.style.background = 'linear-gradient(135deg,#EF4444,#DC2626)';
        setTimeout(() => {
          btn.innerHTML = orig;
          btn.style.background = '';
          btn.disabled = false;
        }, 3000);
      }
    });
  }
});

// ── Helper ────────────────────────────────────────────────────
function randomGradient() {
  const gradients = [
    '#3CBDB0,#0F766E', '#10B981,#059669', '#F59E0B,#EF4444',
    '#0F766E,#7E8085', '#14B8A6,#06B6D4', '#F97316,#EF4444'
  ];
  return gradients[Math.floor(Math.random() * gradients.length)];
}

// ── Load Settings ─────────────────────────────────────────────
async function loadSettings() {
  try {
    const res = await fetch('/api/admin/settings/public');
    const settings = await res.json();

    // Update Email
    const emailEls = document.querySelectorAll('#infoEmail');
    emailEls.forEach(el => {
      if (el.tagName === 'A') {
        el.href = `mailto:${settings.support_email}`;
        el.textContent = settings.support_email;
      } else {
        const link = el.querySelector('a');
        if (link) {
          link.href = `mailto:${settings.support_email}`;
          link.textContent = settings.support_email;
        } else {
          el.textContent = settings.support_email;
        }
      }
    });

    // Update Phone
    const phoneEls = document.querySelectorAll('#infoPhone');
    phoneEls.forEach(el => {
      if (el.tagName === 'A') {
        el.href = `tel:${settings.support_phone.replace(/\s+/g, '')}`;
        el.textContent = settings.support_phone;
      } else {
        const link = el.querySelector('a');
        if (link) {
          link.href = `tel:${settings.support_phone.replace(/\s+/g, '')}`;
          link.textContent = settings.support_phone;
        } else {
          el.textContent = settings.support_phone;
        }
      }
    });

    // Update Hours
    const hoursEls = document.querySelectorAll('#infoHours');
    hoursEls.forEach(el => {
      el.textContent = settings.support_hours;
    });

    // Update Platform Brand Logo Text
    const brandEls = document.querySelectorAll('.spx-brand span, .footer-brand span');
    brandEls.forEach(el => {
      el.textContent = settings.logo_text || 'SPEAXSA';
    });

  } catch (err) {
    console.error('Failed to load settings:', err);
  }
}

// ── Init ──────────────────────────────────────────────────────
createParticles();
loadCourses();
loadTeachers();
loadStats();
loadSettings();
