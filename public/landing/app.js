// SPEAXA Landing Page JavaScript
const API = ''; // Set to absolute domain like 'https://speaxa.com' if hosting client & API on separate servers
const defaultAvatar = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2NiZDVlMSI+PHBhdGggZD0iTTEyIDEyYzIuMjEgMCA0LTEuNzkgNC00cy0xLjc5LTQtNC00LTQgMS53OS00IDQgMS53OSA0IDQgNHptMCAyYy0yLjY3IDAtOCAxLjM0LTggNHYyaDE2di0yYzAtMi42Ni01LjMzLTQtOC00eiIvPjwvc3ZnPg==';

// Inject premium animations for badges
const badgeStyle = document.createElement('style');
badgeStyle.textContent = `
  @keyframes pulse-glow {
    0%, 100% { transform: scale(1); filter: drop-shadow(0 0 1px rgba(250, 204, 21, 0.4)); }
    50% { transform: scale(1.1); filter: drop-shadow(0 0 4px rgba(250, 204, 21, 0.8)); }
  }
`;
document.head.appendChild(badgeStyle);

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

    grid.innerHTML = courses.slice(0, 6).map(c => `
      <div class="col-sm-6 col-md-6 col-lg-4" data-aos="fade-up">
        <div class="course-card">
          <div class="course-thumbnail" style="${c.thumbnail_url ? `background: url(${c.thumbnail_url}) center/cover no-repeat;` : `background:linear-gradient(135deg,${randomGradient()})`}; position: relative;">
            ${c.thumbnail_url ? '' : `<span style="font-size:3rem">${icons[c.subject] || icons.default}</span>`}
            <div class="course-badge" style="z-index: 3;">${c.grade || ''}</div>
            
            <!-- Verified & Creator tag overlay -->
            <div class="position-absolute bottom-0 start-0 w-100 p-2 d-flex flex-column gap-1 align-items-start" style="background: linear-gradient(0deg, rgba(11,19,41,0.9) 0%, transparent 100%); z-index: 2;">
              ${c.is_verified ? `
                <span class="badge text-white border d-inline-flex align-items-center gap-1" style="backdrop-filter: blur(12px) saturate(180%); -webkit-backdrop-filter: blur(12px) saturate(180%); background: linear-gradient(135deg, rgba(250, 204, 21, 0.22) 0%, rgba(217, 119, 6, 0.12) 100%) !important; border-color: rgba(250, 204, 21, 0.4) !important; color: #fbbf24 !important; font-size: 0.65rem; padding: 4px 8px; border-radius: 6px; font-weight: 700; letter-spacing: 0.5px; box-shadow: 0 4px 12px rgba(245, 158, 11, 0.12); text-shadow: 0 0 4px rgba(250, 204, 21, 0.4);">
                  <i class="fas fa-check-circle text-warning" style="animation: pulse-glow 2s infinite; font-size: 0.7rem;"></i> VERIFIED
                </span>
              ` : ''}
              ${c.custom_tag ? `
                <span class="badge text-white border d-inline-flex align-items-center gap-1" style="backdrop-filter: blur(8px); background-color: rgba(60, 189, 176, 0.2) !important; border-color: rgba(60, 189, 176, 0.35) !important; color: #e2e8f0 !important; font-size: 0.65rem; padding: 4px 8px; border-radius: 6px; font-weight: 600; text-shadow: 0 1px 2px rgba(0,0,0,0.5);">
                  <i class="fas fa-signature me-1" style="color: #3CBDB0;"></i> ${c.custom_tag}
                </span>
              ` : ''}
            </div>
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
            <button class="btn btn-spx-primary btn-sm px-4" onclick="showCourseDetails('${c.id}')">Explore</button>
          </div>
        </div>
      </div>
    `).join('');
  } catch {
    grid.innerHTML = `<div class="col-sm-6 col-md-6 col-lg-4" data-aos="fade-up">
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
          <button class="btn btn-spx-primary btn-sm px-4" onclick="showCourseDetails('course_001')">Explore</button>
        </div>
      </div>
    </div>`.repeat(6);
  }
}

// ── Load Teachers ─────────────────────────────────────────────
async function loadTeachers() {
  const grid = document.getElementById('teachersGrid');
  if (!grid) return;
  const meetBtn = document.getElementById('meetAllTeachersContainer');
  try {
    const res = await fetch(`${API}/api/public/teachers`);
    const teachers = await res.json();

    if (!teachers.length) {
      grid.innerHTML = `<div class="col-12 text-center py-5 text-muted">No teachers available yet</div>`;
      if (meetBtn) meetBtn.style.display = 'none';
      return;
    }

    if (meetBtn) {
      meetBtn.style.display = teachers.length >= 4 ? 'block' : 'none';
    }

    grid.innerHTML = teachers.map(t => `
      <div class="col-sm-6 col-md-4 col-lg-3" data-aos="fade-up">
        <div class="teacher-card">
          <div class="teacher-avatar-wrapper">
            <img src="${t.photo_url || `/uploads/profiles/teacher_sahil.png`}" 
                 class="teacher-avatar-img" alt="${t.name}"
                 onerror="this.src='/uploads/profiles/teacher_sahil.png'">
          </div>
          ${t.teacher_level && t.teacher_level !== 'Without Slab' ? `
          <div class="teacher-level-badge level-${t.teacher_level.toLowerCase().replace(' ','-')}">
            ${t.teacher_level}
          </div>
          ` : ''}
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
    if (meetBtn) {
      meetBtn.style.display = demos.length >= 4 ? 'block' : 'none';
    }
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
      el.textContent = settings.logo_text || 'SPEAXA';
    });

    // Helpers to safely set DOM elements
    const setHtml = (id, val) => {
      const el = document.getElementById(id);
      if (el && val) el.innerHTML = val;
    };
    const setText = (id, val) => {
      const el = document.getElementById(id);
      if (el && val) el.textContent = val;
    };

    // Hero Section Bindings
    setText('heroBadge', settings.home_hero_badge);
    setHtml('heroTitle', settings.home_hero_title);
    setText('heroDesc', settings.home_hero_desc);

    const heroCtaPrimary = document.getElementById('heroCtaPrimary');
    if (heroCtaPrimary && settings.home_hero_cta_primary) {
      heroCtaPrimary.innerHTML = `<i class="fas fa-search me-2"></i>${settings.home_hero_cta_primary}`;
    }

    const heroCtaSecondary = document.getElementById('heroCtaSecondary');
    if (heroCtaSecondary && settings.home_hero_cta_secondary) {
      heroCtaSecondary.innerHTML = `<i class="fas fa-info-circle me-2"></i>${settings.home_hero_cta_secondary}`;
    }

    // How It Works Steps Section Bindings
    setHtml('stepsTitle', settings.home_steps_title);
    setText('step1Title', settings.home_step1_title);
    setText('step1Desc', settings.home_step1_desc);
    setText('step2Title', settings.home_step2_title);
    setText('step2Desc', settings.home_step2_desc);
    setText('step3Title', settings.home_step3_title);
    setText('step3Desc', settings.home_step3_desc);

    // Featured Courses Section Bindings
    setText('coursesBadge', settings.home_courses_badge);
    setHtml('coursesTitle', settings.home_courses_title);

    // Top Teachers Section Bindings
    setText('teachersBadge', settings.home_teachers_badge);
    setHtml('teachersTitle', settings.home_teachers_title);
    setText('teachersDesc', settings.home_teachers_desc);

    // Why SPEAXA Section Bindings
    setText('featuresBadge', settings.home_features_badge);
    setHtml('featuresTitle', settings.home_features_title);

    // Bottom CTA Section Bindings
    setHtml('ctaTitle', settings.home_cta_title);
    setText('ctaDesc', settings.home_cta_desc);

    const ctaBtnStudent = document.getElementById('ctaBtnStudent');
    if (ctaBtnStudent && settings.home_cta_btn_student) {
      ctaBtnStudent.innerHTML = `<i class="fas fa-graduation-cap me-2"></i>${settings.home_cta_btn_student}`;
    }

    const ctaBtnTeacher = document.getElementById('ctaBtnTeacher');
    if (ctaBtnTeacher && settings.home_cta_btn_teacher) {
      ctaBtnTeacher.innerHTML = `<i class="fas fa-chalkboard-teacher me-2"></i>${settings.home_cta_btn_teacher}`;
    }

    // ── Dynamic Footer Customization ──
    
    // 1. Description
    const footerDescEl = document.querySelector('.spx-footer p.small') || document.getElementById('footerDesc');
    if (footerDescEl && settings.home_footer_desc) {
      footerDescEl.textContent = settings.home_footer_desc;
    }

    // 2. Toll free link
    const footerTollFreeEl = document.querySelector('.spx-footer a[href*="tel:1800"]') || 
                           Array.from(document.querySelectorAll('.spx-footer strong')).find(el => el.textContent.includes('TOLL FREE'))?.nextElementSibling;
    if (footerTollFreeEl && settings.home_footer_toll_free) {
      footerTollFreeEl.href = `tel:${settings.home_footer_toll_free.replace(/[-\s()]+/g, '')}`;
      footerTollFreeEl.textContent = settings.home_footer_toll_free;
    }

    // 3. Support phone
    const footerPhoneEl = document.querySelector('.spx-footer a[href^="tel:+91"]');
    if (footerPhoneEl && settings.home_footer_phone) {
      const parts = settings.home_footer_phone.split('(');
      const numberOnly = parts[0].trim();
      const hours = parts[1] ? '(' + parts[1] : '';
      
      footerPhoneEl.href = `tel:${numberOnly.replace(/[-\s()]+/g, '')}`;
      footerPhoneEl.textContent = numberOnly;
      
      if (footerPhoneEl.nextSibling && hours) {
        footerPhoneEl.nextSibling.textContent = ' ' + hours;
      }
    }

    // 4. Support email
    const footerEmailEl = document.querySelector('.spx-footer a[href^="mailto:"]');
    if (footerEmailEl && settings.home_footer_email) {
      footerEmailEl.href = `mailto:${settings.home_footer_email}`;
      footerEmailEl.textContent = settings.home_footer_email;
    }

    // 5. Social Links updates
    if (settings.home_footer_instagram) {
      document.querySelectorAll('a[href*="instagram.com"]').forEach(el => el.href = settings.home_footer_instagram);
    }
    if (settings.home_footer_youtube) {
      document.querySelectorAll('a[href*="youtube.com"]').forEach(el => el.href = settings.home_footer_youtube);
    }
    if (settings.home_footer_facebook) {
      document.querySelectorAll('a[href*="facebook.com"], a[href*="facebook-f"]').forEach(el => el.href = settings.home_footer_facebook);
    }
    if (settings.home_footer_twitter) {
      document.querySelectorAll('a[href*="twitter.com"]').forEach(el => el.href = settings.home_footer_twitter);
    }

    // 6. App download buttons dynamic injection
    const appSupportCol = Array.from(document.querySelectorAll('.spx-footer h6.footer-heading')).find(el => el.textContent.includes('App & Support'))?.parentElement;
    if (appSupportCol) {
      const existingDownloads = appSupportCol.querySelector('.footer-app-downloads');
      if (!existingDownloads) {
        const downloadsDiv = document.createElement('div');
        downloadsDiv.className = 'footer-app-downloads d-flex gap-2 mb-4';
        downloadsDiv.style.marginTop = '15px';
        downloadsDiv.innerHTML = `
          <a href="${settings.home_footer_play_store_url || '#'}" target="_blank" class="app-download-btn play-store-btn d-flex align-items-center gap-2 px-3 py-2 text-white text-decoration-none" style="border-radius: 12px; transition: all 0.3s ease; flex: 1;">
            <i class="fab fa-google-play" style="font-size: 1.3rem;"></i>
            <div class="text-start">
              <div style="font-size: 0.6rem; text-transform: uppercase; color: rgba(255,255,255,0.75); font-weight: 500; letter-spacing: 0.5px; line-height: 1.2;">Get it on</div>
              <div style="font-size: 0.8rem; font-weight: 700; font-family: 'Outfit', sans-serif; line-height: 1.2; color: #ffffff;">Google Play</div>
            </div>
          </a>
          <a href="${settings.home_footer_app_store_url || '#'}" target="_blank" class="app-download-btn app-store-btn d-flex align-items-center gap-2 px-3 py-2 text-white text-decoration-none" style="border-radius: 12px; transition: all 0.3s ease; flex: 1;">
            <i class="fab fa-apple" style="font-size: 1.3rem;"></i>
            <div class="text-start">
              <div style="font-size: 0.6rem; text-transform: uppercase; color: rgba(255,255,255,0.75); font-weight: 500; letter-spacing: 0.5px; line-height: 1.2;">Download on</div>
              <div style="font-size: 0.8rem; font-weight: 700; font-family: 'Outfit', sans-serif; line-height: 1.2; color: #ffffff;">App Store</div>
            </div>
          </a>
        `;
        
        const appBtnStyles = document.createElement('style');
        appBtnStyles.textContent = `
          .app-download-btn {
            position: relative;
            overflow: hidden;
            z-index: 1;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
          }
          .play-store-btn {
            background: linear-gradient(135deg, #059669 0%, #10B981 100%) !important;
            border: 1px solid rgba(16, 185, 129, 0.4) !important;
          }
          .play-store-btn i {
            color: #ffffff;
            filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
          }
          .play-store-btn:hover {
            background: linear-gradient(135deg, #047857 0%, #059669 100%) !important;
            border-color: rgba(16, 185, 129, 0.8) !important;
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(16, 185, 129, 0.4) !important;
          }
          .app-store-btn {
            background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%) !important;
            border: 1px solid rgba(37, 99, 235, 0.4) !important;
          }
          .app-store-btn i {
            color: #ffffff;
            filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
          }
          .app-store-btn:hover {
            background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%) !important;
            border-color: rgba(37, 99, 235, 0.8) !important;
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(37, 99, 235, 0.4) !important;
          }
        `;
        document.head.appendChild(appBtnStyles);

        const counsellingCard = appSupportCol.querySelector('.counselling-card');
        if (counsellingCard) {
          appSupportCol.insertBefore(downloadsDiv, counsellingCard);
        } else {
          appSupportCol.appendChild(downloadsDiv);
        }
      } else {
        const playBtn = existingDownloads.querySelector('.play-store-btn');
        if (playBtn) playBtn.href = settings.home_footer_play_store_url || '#';
        const appBtn = existingDownloads.querySelector('.app-store-btn');
        if (appBtn) appBtn.href = settings.home_footer_app_store_url || '#';
      }
    }

  } catch (err) {
    console.error('Failed to load settings:', err);
  }
}

// ── Course Details & Guest Checkout Logic ─────────────────────
let activeCourseId = null;
let activeBatchId = null;
let selectedCourseFees = 0;

async function showCourseDetails(courseId) {
  activeCourseId = courseId;
  activeBatchId = null;
  
  // Show Step 1 (Batches) and hide other steps
  document.getElementById('modalStepBatch').style.display = 'block';
  document.getElementById('modalStepCheckout').style.display = 'none';
  document.getElementById('modalStepPayment').style.display = 'none';
  document.getElementById('modalStepSuccess').style.display = 'none';
  
  // Open Modal (Bootstrap)
  const modalEl = document.getElementById('courseDetailsModal');
  const modal = new bootstrap.Modal(modalEl);
  modal.show();
  
  // Show Loading placeholder
  document.getElementById('modalCourseTitle').textContent = 'Loading...';
  document.getElementById('modalCourseDesc').textContent = '';
  document.getElementById('modalBatchesList').innerHTML = '<div class="text-center py-3"><div class="spinner-border text-primary spinner-border-sm" role="status"></div></div>';
  
  try {
    const resCourses = await fetch('/api/public/courses');
    const courses = await resCourses.json();
    const course = courses.find(c => c.id === courseId);
    
    if (!course) {
      document.getElementById('modalCourseTitle').textContent = 'Course not found';
      return;
    }
    
    selectedCourseFees = course.fees;
    document.getElementById('modalCourseTitle').textContent = course.title;
    document.getElementById('modalCourseGrade').textContent = course.grade || 'General';
    document.getElementById('modalCourseBoard').textContent = course.board || 'CBSE';
    document.getElementById('modalCourseSubject').textContent = course.subject || 'Physics';
    document.getElementById('modalCourseDuration').textContent = `${course.duration_weeks || 12} Weeks`;
    document.getElementById('modalCourseDesc').textContent = course.description || 'No description available.';
    document.getElementById('modalCourseFees').textContent = `₹${parseFloat(course.fees).toLocaleString('en-IN')}`;
    
    document.getElementById('modalCourseLearningDuration').textContent = course.learning_duration || '—';
    document.getElementById('modalCourseLanguage').textContent = course.language_instruction || '—';
    document.getElementById('modalCourseDailyDuration').textContent = course.daily_class_duration || '—';
    document.getElementById('modalCourseAssessment').textContent = course.assessment_days || '—';
    document.getElementById('modalCourseObjective').textContent = course.objective || '—';
    document.getElementById('modalCourseOutcome').textContent = course.learning_outcome || '—';
    
    // Fetch Batches
    const resBatches = await fetch(`/api/public/courses/${courseId}/batches`);
    const batches = await resBatches.json();
    
    const batchesList = document.getElementById('modalBatchesList');
    if (!batches || !batches.length) {
      batchesList.innerHTML = '<div class="alert alert-warning border-0 py-2 small">No active batches available at the moment.</div>';
      return;
    }
    
    batchesList.innerHTML = batches.map(b => {
      const days = Array.isArray(b.days_of_week) ? b.days_of_week.join(', ') : b.days_of_week || 'Mon, Wed, Fri';
      const teacherPhoto = b.teacher_photo || defaultAvatar;
      return `
        <div class="card bg-dark-alt p-3" style="background: #f8fafc !important; border: 1px solid rgba(60, 189, 176, 0.25) !important;">
          <div class="d-flex justify-content-between align-items-center gap-3 flex-wrap">
            <div class="d-flex align-items-center gap-3">
              <img src="${teacherPhoto}" alt="${b.teacher_name}" style="width: 50px; height: 50px; border-radius: 50%; border: 2px solid var(--primary); object-fit: cover; flex-shrink: 0;" onerror="this.src=defaultAvatar">
              <div>
                <h6 class="fw-bold mb-1" style="color: #0F766E !important; font-size: 1.05rem;">${b.batch_name}</h6>
                <div class="small mb-1" style="color: #334155 !important;">
                  <i class="fas fa-chalkboard-teacher me-1" style="color: #3CBDB0 !important;"></i>Mentor: <strong style="color: #0F172A !important;">${b.teacher_name || 'Expert'}</strong> (${b.teacher_level || 'Gold'} • <i class="fas fa-star text-warning"></i> ${parseFloat(b.teacher_rating || 5).toFixed(1)})
                </div>
                <div class="small mb-1" style="color: #475569 !important;">
                  <i class="fas fa-calendar-alt me-1" style="color: #3CBDB0 !important;"></i>Days: <strong style="color: #1e293b !important;">${days}</strong>
                </div>
                <div class="small mb-1" style="color: #475569 !important;">
                  <i class="fas fa-clock me-1" style="color: #3CBDB0 !important;"></i>Time: <strong style="color: #1e293b !important;">${b.start_time} - ${b.end_time}</strong>
                </div>
                <button class="btn btn-link p-0 text-primary text-decoration-none fw-semibold" onclick="toggleTeacherProfile(event, '${b.id}')" style="font-size: 0.76rem; border: none; background: transparent; outline: none; box-shadow: none;">
                  <i class="fas fa-info-circle me-1"></i>View Mentor Bio & Qualifications
                </button>
                
                ${b.planner_url ? `
                  <div class="mt-2">
                    <a href="${b.planner_url}" target="_blank" class="btn btn-sm btn-outline-success py-1 px-2 d-inline-flex align-items-center gap-1" style="font-size: 0.75rem; border-radius: 6px; text-decoration: none;">
                      <i class="fas fa-file-pdf"></i> View Chapter Planner
                    </a>
                  </div>
                ` : ''}
                ${b.planner_desc ? `
                  <div class="mt-2 p-2 rounded text-secondary" style="background:#f8fafc; font-size:0.75rem; white-space: pre-wrap; line-height: 1.4; border: 1px solid #e2e8f0; color: #475569 !important;">
                    <strong class="d-block mb-1 text-dark" style="font-weight: 700;"><i class="fas fa-list-ol me-1 text-primary"></i>Learning Schedule:</strong>
                    ${b.planner_desc}
                  </div>
                ` : ''}
                ${b.teaching_method ? `
                  <div class="mt-2 p-2 rounded text-secondary" style="background:#f8fafc; font-size:0.75rem; white-space: pre-wrap; line-height: 1.4; border: 1px solid #e2e8f0; color: #475569 !important;">
                    <strong class="d-block mb-1 text-dark" style="font-weight: 700;"><i class="fas fa-chalkboard me-1 text-primary"></i>Teaching Style & Methodology:</strong>
                    ${b.teaching_method}
                  </div>
                ` : ''}
                ${b.batch_instructions ? `
                  <div class="mt-2 p-2 rounded text-warning-dark" style="background:#fffbeb; font-size:0.75rem; white-space: pre-wrap; line-height: 1.4; border: 1px solid #fef3c7; color: #b45309 !important;">
                    <strong class="d-block mb-1" style="font-weight: 700; color: #d97706 !important;"><i class="fas fa-exclamation-circle me-1"></i>Important Batch Requirements / Instructions:</strong>
                    ${b.batch_instructions}
                  </div>
                ` : ''}
              </div>
            </div>
            <div class="text-end d-flex flex-column align-items-end ms-auto">
              <span class="badge mb-2" style="background: rgba(15, 118, 110, 0.1) !important; color: #0F766E !important; border: 1px solid rgba(15, 118, 110, 0.15) !important; font-weight: 600; padding: 6px 12px; border-radius: 8px; font-size: 0.75rem;">${b.available_seats} seats left</span>
              <button class="btn btn-spx-primary btn-sm px-4" style="border-radius: 8px;" onclick="checkoutBatch('${b.id}')">Enroll</button>
            </div>
          </div>
          
          <!-- Expandable Teacher Info Section -->
          <div id="teacher-profile-${b.id}" class="mt-3 pt-3 border-top" style="display: none; border-color: rgba(60, 189, 176, 0.15) !important;">
            <p class="mb-2 text-secondary" style="font-size: 0.82rem; line-height: 1.55;">
              <strong style="color: #0F172A !important;">Mentor Bio:</strong> ${b.teacher_bio || 'A verified expert educator committed to helping students achieve conceptual clarity and academic excellence.'}
            </p>
            <div class="d-flex flex-wrap gap-2 mt-2">
              <span class="badge px-2 py-1" style="background: rgba(60, 189, 176, 0.08) !important; color: #0F766E !important; border: 1px solid rgba(60, 189, 176, 0.15) !important; font-size: 0.72rem; font-weight: 500;">
                <i class="fas fa-graduation-cap me-1"></i>${b.teacher_qualification || 'Verified Mentor'}
              </span>
              <span class="badge px-2 py-1" style="background: rgba(60, 189, 176, 0.08) !important; color: #0F766E !important; border: 1px solid rgba(60, 189, 176, 0.15) !important; font-size: 0.72rem; font-weight: 500;">
                <i class="fas fa-briefcase me-1"></i>${b.teacher_experience || 5}+ Years Exp
              </span>
              <span class="badge px-2 py-1" style="background: rgba(60, 189, 176, 0.08) !important; color: #0F766E !important; border: 1px solid rgba(60, 189, 176, 0.15) !important; font-size: 0.72rem; font-weight: 500;">
                <i class="fas fa-book-reader me-1"></i>${b.teacher_expertise || 'General'} Expert
              </span>
            </div>
          </div>
        </div>
      `;
    }).join('');
    
  } catch (err) {
    console.error('Error displaying course details:', err);
    document.getElementById('modalCourseTitle').textContent = 'Error loading course details';
  }
}

function goBackToBatches() {
  document.getElementById('modalStepBatch').style.display = 'block';
  document.getElementById('modalStepCheckout').style.display = 'none';
}

function checkoutBatch(batchId) {
  activeBatchId = batchId;
  const token = localStorage.getItem('student_token') || localStorage.getItem('token');
  if (token) {
    startPaymentFlow(token);
  } else {
    document.getElementById('modalStepBatch').style.display = 'none';
    document.getElementById('modalStepCheckout').style.display = 'block';
  }
}

async function startPaymentFlow(token) {
  document.getElementById('modalStepBatch').style.display = 'none';
  document.getElementById('modalStepCheckout').style.display = 'none';
  document.getElementById('modalStepPayment').style.display = 'block';
  
  try {
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const paymentId = `pay_mock_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const res = await fetch(`/api/student/batches/${activeBatchId}/enroll`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ paymentId })
    });
    
    const enrollData = await res.json();
    if (!res.ok) {
      throw new Error(enrollData.error || 'Enrollment failed');
    }
    
    document.getElementById('modalStepPayment').style.display = 'none';
    document.getElementById('modalStepSuccess').style.display = 'block';
    
    let secs = 3;
    const countdownEl = document.getElementById('successCountdown');
    const timer = setInterval(() => {
      secs--;
      if (countdownEl) countdownEl.textContent = secs;
      if (secs <= 0) {
        clearInterval(timer);
        window.location.href = '/student';
      }
    }, 1000);
    
  } catch (err) {
    alert(`Payment / Enrollment failed: ${err.message}`);
    document.getElementById('modalStepPayment').style.display = 'none';
    document.getElementById('modalStepBatch').style.display = 'block';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('modalCheckoutForm');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const submitBtn = document.getElementById('checkoutSubmitBtn');
      const originalHtml = submitBtn.innerHTML;
      submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status"></span>Processing...';
      submitBtn.disabled = true;
      
      const name = document.getElementById('checkoutName').value;
      const email = document.getElementById('checkoutEmail').value;
      const phone = document.getElementById('checkoutPhone').value;
      const password = document.getElementById('checkoutPassword').value;
      
      try {
        const regRes = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            email,
            phone,
            password,
            role: 'student',
            board: document.getElementById('modalCourseBoard').textContent,
            grade: document.getElementById('modalCourseGrade').textContent
          })
        });
        
        const regData = await regRes.json();
        if (!regRes.ok) {
          throw new Error(regData.error || 'Registration failed');
        }
        
        localStorage.setItem('student_token', regData.token);
        localStorage.setItem('student_user', JSON.stringify(regData.user));
        
        document.getElementById('successEmail').textContent = email;
        document.getElementById('successPassword').textContent = password;
        
        submitBtn.innerHTML = originalHtml;
        submitBtn.disabled = false;
        
        await startPaymentFlow(regData.token);
        
      } catch (err) {
        alert(err.message);
        submitBtn.innerHTML = originalHtml;
        submitBtn.disabled = false;
      }
    });
  }
});

// ── Announcement Bar Logic ────────────────────────────────────
function createAnnouncementBar() {
  if (localStorage.getItem('speaxa_announcement_dismissed') === 'true') return;
  
  const bar = document.createElement('div');
  bar.id = 'announcementBar';
  bar.className = 'announcement-bar';
  bar.innerHTML = `
    <div class="announcement-content">
      <span>📢 Speaxa is Launching Soon – Stay Tuned!</span>
      <button class="btn-close-announcement" onclick="dismissAnnouncement()">&times;</button>
    </div>
  `;
  document.body.prepend(bar);
  document.body.classList.add('has-announcement');
  const nav = document.getElementById('mainNav');
  if (nav) nav.style.top = '40px';
}

function dismissAnnouncement() {
  localStorage.setItem('speaxa_announcement_dismissed', 'true');
  const bar = document.getElementById('announcementBar');
  const nav = document.getElementById('mainNav');
  if (bar) {
    bar.style.transform = 'translateY(-100%)';
    setTimeout(() => {
      bar.remove();
      document.body.classList.remove('has-announcement');
      if (nav) nav.style.top = '0';
    }, 300);
  }
}

// ── Footer App Action Handlers ────────────────────────────────
function showAppComingSoon(event) {
  if (event) event.preventDefault();
  alert("Speaxa Mobile Application is launching soon! Stay tuned for Google Play Store and iOS App Store releases.");
}

// Expose handlers to window scope
window.dismissAnnouncement = dismissAnnouncement;
window.showAppComingSoon = showAppComingSoon;

document.addEventListener('DOMContentLoaded', () => {
  // Inject announcement
  createAnnouncementBar();

  // Bind SMS Form
  const smsForm = document.getElementById('smsLinkForm');
  if (smsForm) {
    smsForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const phoneInput = document.getElementById('smsPhone');
      const feedback = document.getElementById('smsFeedback');
      if (feedback) {
        feedback.style.display = 'block';
        feedback.textContent = `🚀 SMS Link request received! App download link will be sent to +91 ${phoneInput.value} once the app launches soon!`;
        phoneInput.value = '';
        setTimeout(() => {
          feedback.style.display = 'none';
        }, 6000);
      }
    });
  }
});

// ── Init ──────────────────────────────────────────────────────
createParticles();
loadCourses();
loadTeachers();
loadStats();
loadSettings();

function toggleTeacherProfile(event, id) {
  if (event) event.preventDefault();
  const el = document.getElementById(`teacher-profile-${id}`);
  if (el) {
    if (el.style.display === 'none') {
      el.style.display = 'block';
      event.target.innerHTML = '<i class="fas fa-times-circle me-1"></i>Hide Mentor Info';
    } else {
      el.style.display = 'none';
      event.target.innerHTML = '<i class="fas fa-info-circle me-1"></i>View Mentor Bio & Qualifications';
    }
  }
}

