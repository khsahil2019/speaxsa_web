// SPEAXA Landing Page JavaScript
const API = ''; // Set to absolute domain like 'https://speaxa.com' if hosting client & API on separate servers
const defaultAvatar = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2NiZDVlMSI+PHBhdGggZD0iTTEyIDEyYzIuMjEgMCA0LTEuNzkgNC00cy0xLjc5LTQtNC00LTQgMS53OS00IDQgMS53OSA0IDQgNHptMCAyYy0yLjY3IDAtOCAxLjM0LTggNHYyaDE2di0yYzAtMi42Ni01LjMzLTQtOC00eiIvPjwvc3ZnPg==';

window.togglePasswordVisibility = function(inputId, triggerEl) {
  const input = typeof inputId === 'string' ? document.getElementById(inputId) : inputId;
  if (!input) return;
  const isPassword = input.type === 'password';
  input.type = isPassword ? 'text' : 'password';

  let icon = null;
  if (triggerEl) {
    icon = triggerEl.tagName === 'I' || triggerEl.tagName === 'i' ? triggerEl : (triggerEl.querySelector ? triggerEl.querySelector('i') || triggerEl : triggerEl);
  }

  if (icon && icon.classList) {
    if (isPassword) {
      icon.classList.remove('fa-eye');
      icon.classList.add('fa-eye-slash');
    } else {
      icon.classList.remove('fa-eye-slash');
      icon.classList.add('fa-eye');
    }
  }
};

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
  if (!target || target <= 0) {
    el.textContent = '0+';
    return;
  }
  let start = 0;
  const step = Math.max(1, target / (duration / 16));
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
          ${t.teacher_level && t.teacher_level !== 'New Joiner' ? `
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
      { name: 'Dr. Priya Sharma', subject: 'Physics', level: 'Executive Teacher', rating: 4.9, exp: 8, photo: '/uploads/profiles/teacher_priya.png' },
      { name: 'Sahil Khan', subject: 'Mathematics', level: 'Senior Teacher', rating: 5.0, exp: 12, photo: '/uploads/profiles/teacher_sahil.png' },
      { name: 'Rahul Joshi', subject: 'Chemistry', level: 'Trainee Teacher', rating: 4.8, exp: 3, photo: '/uploads/profiles/teacher_sahil.png' },
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
      { id: 'stat-students', target: (stats.students !== undefined && stats.students !== null) ? stats.students : 0 },
      { id: 'stat-teachers', target: (stats.teachers !== undefined && stats.teachers !== null) ? stats.teachers : 0 },
      { id: 'stat-courses', target: (stats.courses !== undefined && stats.courses !== null) ? stats.courses : 0 },
      { id: 'stat-classes', target: (stats.classesCompleted !== undefined && stats.classesCompleted !== null) ? stats.classesCompleted : 0 },
    ];

    statEls.forEach(({ id, target }) => {
      const el = document.getElementById(id);
      if (el) {
        el.setAttribute('data-target', target);
        animateCounter(el, target);
      }
    });
  } catch (err) {
    console.error('loadStats error:', err);
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

        // Trigger Meta Pixel Lead Event ONLY AFTER CONFIRMED SUCCESSFUL SUBMISSION
        if (typeof window.trackMetaLead === 'function') {
          window.trackMetaLead();
        }

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
    const activeEmail = settings.home_footer_email || settings.support_email || 'support@speaxa.com';
    const emailEls = document.querySelectorAll('#infoEmail');
    emailEls.forEach(el => {
      if (el.tagName === 'A') {
        el.href = `mailto:${activeEmail}`;
        el.textContent = activeEmail;
      } else {
        const link = el.querySelector('a');
        if (link) {
          link.href = `mailto:${activeEmail}`;
          link.textContent = activeEmail;
        } else {
          el.textContent = activeEmail;
        }
      }
    });

    // Update Phone
    const activePhone = settings.home_footer_phone || settings.support_phone || '+91 8739093014';
    const phoneEls = document.querySelectorAll('#infoPhone');
    phoneEls.forEach(el => {
      if (el.tagName === 'A') {
        el.href = `tel:${activePhone.replace(/[-\s()]+/g, '')}`;
        el.textContent = activePhone;
      } else {
        const link = el.querySelector('a');
        if (link) {
          link.href = `tel:${activePhone.replace(/[-\s()]+/g, '')}`;
          link.textContent = activePhone;
        } else {
          el.textContent = activePhone;
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

    // Helper to format title with gradient highlight cleanly without raw HTML tags for non-technical admins
    const setFormattedTitle = (id, rawVal) => {
      const el = document.getElementById(id);
      if (!el || !rawVal) return;
      let clean = rawVal.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      if (clean.toLowerCase().includes('expert teachers')) {
        const parts = clean.split(/expert teachers/i);
        el.innerHTML = `${parts[0].trim()}<br><span class="gradient-text">Expert Teachers</span><br>${parts[1] ? parts[1].trim() : ''}`;
      } else {
        el.innerHTML = clean.replace(/\n/g, '<br>');
      }
    };

    // Hero Section Bindings
    setText('heroBadge', settings.home_hero_badge);
    setFormattedTitle('heroTitle', settings.home_hero_title);
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
    if (settings.home_footer_toll_free) {
      document.querySelectorAll('#footerTollFree, .spx-footer a[href*="tel:1800"]').forEach(el => {
        el.href = `tel:${settings.home_footer_toll_free.replace(/[-\s()]+/g, '')}`;
        el.textContent = settings.home_footer_toll_free;
      });
    }

    // 3. Support phone
    if (settings.home_footer_phone) {
      const parts = settings.home_footer_phone.split('(');
      const numberOnly = parts[0].trim();
      const hours = parts[1] ? '(' + parts[1] : '';

      document.querySelectorAll('#footerPhone, .spx-footer a[href^="tel:+91"]').forEach(el => {
        el.href = `tel:${numberOnly.replace(/[-\s()]+/g, '')}`;
        el.textContent = numberOnly;
      });
      if (hours) {
        document.querySelectorAll('#footerHours').forEach(el => el.textContent = ' ' + hours);
      }
    }

    // 4. Support email
    if (settings.home_footer_email) {
      document.querySelectorAll('#footerEmail, #infoEmail, .spx-footer a[href^="mailto:"]').forEach(el => {
        el.href = `mailto:${settings.home_footer_email}`;
        el.textContent = settings.home_footer_email;
      });
    }

    // 5. App Store & Play Store Links
    if (settings.home_footer_play_store_url) {
      document.querySelectorAll('#footerPlayStoreBtn, .play-store-btn, a[href*="play.google.com"]').forEach(el => {
        el.href = settings.home_footer_play_store_url;
      });
    }

    if (settings.home_footer_app_store_url) {
      document.querySelectorAll('#footerAppStoreBtn, .app-store-btn, a[href*="apps.apple.com"]').forEach(el => {
        el.href = settings.home_footer_app_store_url;
      });
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

    // 5.5 Company Links updates
    if (settings.home_footer_url_about) {
      document.querySelectorAll('a[href="/about.html"], a[href$="about.html"]').forEach(el => el.href = settings.home_footer_url_about);
    }
    if (settings.home_footer_url_contact) {
      document.querySelectorAll('a[href="/contact.html"], a[href$="contact.html"]').forEach(el => el.href = settings.home_footer_url_contact);
    }
    if (settings.home_footer_url_blog) {
      document.querySelectorAll('a[href="/blog.html"], a[href$="blog.html"]').forEach(el => el.href = settings.home_footer_url_blog);
    }
    if (settings.home_footer_url_results) {
      document.querySelectorAll('a[href="/success-stories.html"], a[href$="success-stories.html"]').forEach(el => el.href = settings.home_footer_url_results);
    }
    if (settings.home_footer_url_safety) {
      document.querySelectorAll('a[href="/privacy.html"], a[href$="privacy.html"]').forEach(el => el.href = settings.home_footer_url_safety);
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
    document.getElementById('modalCourseDesc').innerHTML = formatCollapsibleText(course.description) || 'No description available.';
    document.getElementById('modalCourseFees').textContent = `₹${parseFloat(course.fees).toLocaleString('en-IN')}`;
    
    document.getElementById('modalCourseLearningDuration').textContent = course.learning_duration || '—';
    document.getElementById('modalCourseLanguage').textContent = course.language_instruction || '—';
    document.getElementById('modalCourseDailyDuration').textContent = course.daily_class_duration || '—';
    document.getElementById('modalCourseAssessment').textContent = course.assessment_days || '—';
    document.getElementById('modalCourseObjective').innerHTML = formatCollapsibleText(course.objective) || '—';
    document.getElementById('modalCourseOutcome').innerHTML = formatCollapsibleText(course.learning_outcome) || '—';
    
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
                
                <div class="d-flex flex-wrap gap-2 mt-2">
                  ${b.demo_video_url ? `
                    <button class="btn btn-sm btn-outline-warning py-1 px-2 d-inline-flex align-items-center gap-1" style="font-size: 0.75rem; border-radius: 6px;" onclick="playBatchDemoVideo('${b.demo_video_url}', '${b.batch_name.replace(/'/g, "\\'")}', event)">
                      <i class="fas fa-play-circle"></i> Watch Demo Video
                    </button>
                  ` : ''}
                  ${b.planner_url ? `
                    <a href="${b.planner_url}" target="_blank" class="btn btn-sm btn-outline-success py-1 px-2 d-inline-flex align-items-center gap-1" style="font-size: 0.75rem; border-radius: 6px; text-decoration: none;">
                      <i class="fas fa-file-pdf"></i> View Chapter Planner
                    </a>
                  ` : ''}
                </div>
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

// ── Website Alert Modal Helper (Replaces Browser System alert()) ─────
function showWebsiteAlert(message, title = 'Notice') {
  const modalEl = document.getElementById('websiteAlertModal');
  if (modalEl) {
    const titleEl = document.getElementById('websiteAlertTitle');
    const msgEl = document.getElementById('websiteAlertMessage');
    if (titleEl) titleEl.innerHTML = `<i class="fas fa-exclamation-circle me-2"></i>${title}`;
    if (msgEl) msgEl.textContent = message;
    const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
    modal.show();
  } else {
    const errEl = document.getElementById('checkoutErrorBanner');
    if (errEl) {
      errEl.textContent = message;
      errEl.classList.remove('d-none');
    }
  }
}

function goBackToBatches() {
  document.getElementById('modalStepBatch').style.display = 'block';
  document.getElementById('modalStepCheckout').style.display = 'none';
  if (document.getElementById('modalStepMobileOtp')) document.getElementById('modalStepMobileOtp').style.display = 'none';
}

async function checkoutBatch(batchId) {
  activeBatchId = batchId;
  const token = localStorage.getItem('student_token') || localStorage.getItem('token');
  if (token) {
    try {
      const meRes = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (meRes.ok) {
        const meData = await meRes.json();
        const meUser = meData.user || meData;
        if (meUser && meUser.role === 'student') {
          if (meUser.phone_verified) {
            startPaymentFlow(token);
            return;
          } else {
            await triggerPostPaymentMobileVerification(token, meUser.phone || meUser.mobile_number, meUser.email);
            return;
          }
        }
      }
    } catch (e) {}
    localStorage.removeItem('student_token');
    localStorage.removeItem('token');
    localStorage.removeItem('student_user');
    localStorage.removeItem('user');
    localStorage.removeItem('spx_token');
    localStorage.removeItem('spx_user');
  }

  document.getElementById('modalStepBatch').style.display = 'none';
  if (document.getElementById('modalStepMobileOtp')) document.getElementById('modalStepMobileOtp').style.display = 'none';
  document.getElementById('modalStepPayment').style.display = 'none';
  document.getElementById('modalStepCheckout').style.display = 'block';
}

let postPaymentUserPhone = null;
let currentCheckoutToken = null;

async function triggerPostPaymentMobileVerification(token, phone, email) {
  currentCheckoutToken = token;
  postPaymentUserPhone = phone;
  const mobileOtpStep = document.getElementById('modalStepMobileOtp');
  const paymentStep = document.getElementById('modalStepPayment');
  const batchStep = document.getElementById('modalStepBatch');
  const checkoutStep = document.getElementById('modalStepCheckout');

  if (batchStep) batchStep.style.display = 'none';
  if (checkoutStep) checkoutStep.style.display = 'none';
  if (paymentStep) paymentStep.style.display = 'none';

  if (!mobileOtpStep) {
    startPaymentFlow(token);
    return;
  }

  mobileOtpStep.style.display = 'block';
  const phoneDisp = document.getElementById('otpMobileDisplay');
  if (phoneDisp) phoneDisp.textContent = phone || 'your mobile';

  clearCheckoutOtpBoxes();

  try {
    const res = await fetch('/api/auth/send-mobile-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: phone || email })
    });
    const data = await res.json();
    const errBanner = document.getElementById('otpStepErrorBanner');
    const succBanner = document.getElementById('otpStepSuccessBanner');
    if (errBanner) errBanner.classList.add('d-none');

    if (succBanner) {
      succBanner.textContent = data.message || 'SMS OTP code sent to your mobile number.';
      succBanner.classList.remove('d-none');
      setTimeout(() => succBanner.classList.add('d-none'), 5000);
    }
  } catch (e) {
    console.warn('[Checkout] Auto-send mobile OTP failed:', e.message);
  }
}

function clearCheckoutOtpBoxes() {
  const boxes = document.querySelectorAll('.c-otp-box');
  boxes.forEach(b => { b.value = ''; });
  if (boxes.length > 0) boxes[0].focus();
  const errBanner = document.getElementById('otpStepErrorBanner');
  const succBanner = document.getElementById('otpStepSuccessBanner');
  if (errBanner) errBanner.classList.add('d-none');
  if (succBanner) succBanner.classList.add('d-none');
}

async function verifyCheckoutMobileOtp() {
  const boxes = document.querySelectorAll('.c-otp-box');
  let otp = '';
  boxes.forEach(b => { otp += b.value.trim(); });

  const errBanner = document.getElementById('otpStepErrorBanner');
  const succBanner = document.getElementById('otpStepSuccessBanner');
  const btn = document.getElementById('btnVerifyCheckoutOtp');

  if (!otp || otp.length < 6) {
    if (errBanner) {
      errBanner.textContent = 'Please enter all 6 digits of the SMS OTP.';
      errBanner.classList.remove('d-none');
    } else {
      showWebsiteAlert('Please enter all 6 digits of the SMS OTP.', 'Verification Error');
    }
    return;
  }

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1" role="status"></span> Verifying...';
  }

  try {
    const phone = postPaymentUserPhone || document.getElementById('checkoutPhone')?.value || '';
    const email = document.getElementById('checkoutEmail')?.value || '';

    let tokenToUse = currentCheckoutToken || localStorage.getItem('student_token');

    if (window._pendingRegistrationData) {
      const regRes = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...window._pendingRegistrationData, otp })
      });
      const regData = await regRes.json();
      if (!regRes.ok) {
        throw new Error(regData.error || 'Registration verification failed');
      }
      if (!regData.token) {
        throw new Error('Registration completed but no token returned. Please try logging in.');
      }
      tokenToUse = regData.token;
      localStorage.setItem('student_token', regData.token);
      localStorage.setItem('student_user', JSON.stringify(regData.user || {}));
      window._pendingRegistrationData = null;
    } else {
      const res = await fetch('/api/auth/verify-mobile-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: phone || email, otp })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Mobile verification failed');
      }

      const userStr = localStorage.getItem('student_user');
      if (userStr) {
        try {
          const u = JSON.parse(userStr);
          u.phone_verified = true;
          localStorage.setItem('student_user', JSON.stringify(u));
        } catch (e) {}
      }
    }

    if (succBanner) {
      succBanner.textContent = '🎉 Mobile verified successfully! Proceeding to payment...';
      succBanner.classList.remove('d-none');
    }

    setTimeout(() => {
      startPaymentFlow(tokenToUse);
    }, 1000);

  } catch (err) {
    if (errBanner) {
      errBanner.textContent = err.message;
      errBanner.classList.remove('d-none');
    } else {
      showWebsiteAlert(err.message, 'Verification Failed');
    }
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-check-circle me-1"></i> Verify Mobile & Proceed to Payment';
    }
  }
}

async function resendCheckoutMobileOtp() {
  const phone = postPaymentUserPhone || document.getElementById('checkoutPhone')?.value || '';
  const email = document.getElementById('checkoutEmail')?.value || '';
  const errBanner = document.getElementById('otpStepErrorBanner');
  const succBanner = document.getElementById('otpStepSuccessBanner');
  if (errBanner) errBanner.classList.add('d-none');

  try {
    const res = await fetch('/api/auth/send-mobile-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: phone || email })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to resend OTP');

    if (succBanner) {
      succBanner.textContent = data.message || 'New 6-digit OTP code sent!';
      succBanner.classList.remove('d-none');
      setTimeout(() => succBanner.classList.add('d-none'), 5000);
    }
  } catch (err) {
    if (errBanner) {
      errBanner.textContent = err.message;
      errBanner.classList.remove('d-none');
    }
  }
}

function skipMobileVerificationAndProceed() {
  const token = currentCheckoutToken || localStorage.getItem('student_token') || localStorage.getItem('token');
  startPaymentFlow(token);
}

function showSuccessScreenAndRedirect(email) {
  const mobileOtpStep = document.getElementById('modalStepMobileOtp');
  const successStep = document.getElementById('modalStepSuccess');
  if (mobileOtpStep) mobileOtpStep.style.display = 'none';
  if (document.getElementById('modalStepPayment')) document.getElementById('modalStepPayment').style.display = 'none';

  if (successStep) successStep.style.display = 'block';

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
}

async function startPaymentFlow(token) {
  document.getElementById('modalStepBatch').style.display = 'none';
  document.getElementById('modalStepCheckout').style.display = 'none';
  if (document.getElementById('modalStepMobileOtp')) document.getElementById('modalStepMobileOtp').style.display = 'none';
  document.getElementById('modalStepPayment').style.display = 'block';
  
  try {
    const createRes = await fetch('/api/payments/create-order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ batchId: activeBatchId })
    });
    
    const orderData = await createRes.json();
    if (!createRes.ok) throw new Error(orderData.error || 'Failed to initialize payment order');

    const email = document.getElementById('checkoutEmail')?.value || '';
    const name = document.getElementById('checkoutName')?.value || '';
    const phone = document.getElementById('checkoutPhone')?.value || '';

    const finishEnrollment = async (verifyPayload) => {
      const vRes = await fetch('/api/payments/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(verifyPayload)
      });
      const vData = await vRes.json();
      if (!vRes.ok) throw new Error(vData.error || 'Payment verification failed');

      if (document.getElementById('successEmail')) document.getElementById('successEmail').textContent = email || 'your account email';
      if (document.getElementById('successPassword') && document.getElementById('checkoutPassword')) {
        document.getElementById('successPassword').textContent = document.getElementById('checkoutPassword').value || 'Speaxa@123';
      }
      showSuccessScreenAndRedirect(email);
    };

    if (window.Razorpay && orderData.key_id && !orderData.is_fallback) {
      const options = {
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency || 'INR',
        name: 'SPEAXA Digital Bank & LMS',
        description: 'Course Batch Enrollment',
        order_id: orderData.order_id,
        handler: async function (response) {
          try {
            await finishEnrollment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              payment_id: orderData.payment_id
            });
          } catch (e) {
            document.getElementById('modalStepPayment').style.display = 'none';
            document.getElementById('modalStepCheckout').style.display = 'block';
            showWebsiteAlert(`Verification Error: ${e.message}`, 'Payment Error');
          }
        },
        modal: {
          ondismiss: function() {
            document.getElementById('modalStepPayment').style.display = 'none';
            document.getElementById('modalStepCheckout').style.display = 'block';
          }
        },
        prefill: { name, email, contact: phone },
        theme: { color: "#0d7a6d" }
      };
      const rzp = new window.Razorpay(options);
      rzp.open();
    } else {
      await finishEnrollment({ payment_id: orderData.payment_id });
    }
    
  } catch (err) {
    document.getElementById('modalStepPayment').style.display = 'none';
    document.getElementById('modalStepCheckout').style.display = 'block';
    showWebsiteAlert(`Payment / Enrollment failed: ${err.message}`, 'Enrollment Error');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('modalCheckoutForm');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const submitBtn = document.getElementById('checkoutSubmitBtn');
      const originalHtml = submitBtn.innerHTML;
      const errBanner = document.getElementById('checkoutErrorBanner');
      if (errBanner) errBanner.classList.add('d-none');

      submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status"></span>Processing...';
      submitBtn.disabled = true;
      
      const name = document.getElementById('checkoutName').value.trim();
      const email = document.getElementById('checkoutEmail').value.trim();
      const phone = document.getElementById('checkoutPhone').value.trim();
      const password = document.getElementById('checkoutPassword').value.trim();
      const grade = document.getElementById('checkoutGrade')?.value || document.getElementById('modalCourseGrade')?.textContent || 'Class 10';
      const board = document.getElementById('checkoutBoard')?.value || document.getElementById('modalCourseBoard')?.textContent || 'CBSE';
      const referred_by_code = document.getElementById('checkoutReferralCode')?.value.trim() || null;
      
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
            board,
            grade,
            referred_by_code
          })
        });
        
        const regData = await regRes.json();
        let targetToken = null;
        let targetUser = null;
        
        if (!regRes.ok) {
          const errStr = (regData.error || '').toLowerCase();
          if (errStr.includes('already registered') || errStr.includes('already linked')) {
            const loginRes = await fetch('/api/auth/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email, password, role: 'student' })
            });
            const loginData = await loginRes.json();
            if (loginRes.ok && loginData.token) {
              targetToken = loginData.token;
              targetUser = loginData.user;
            } else {
              throw new Error(loginData.error || regData.error || 'Account exists. Please check your password to enroll.');
            }
          } else {
            throw new Error(regData.error || 'Registration failed');
          }
        } else if (regData.status === 'otp_sent') {
          window._pendingRegistrationData = {
            name,
            email,
            phone,
            password,
            role: 'student',
            board,
            grade,
            referred_by_code
          };
          postPaymentUserPhone = phone;

          document.getElementById('modalStepCheckout').style.display = 'none';
          const mobileOtpStep = document.getElementById('modalStepMobileOtp');
          if (mobileOtpStep) {
            mobileOtpStep.style.display = 'block';
            const phoneDisp = document.getElementById('otpMobileDisplay');
            if (phoneDisp) phoneDisp.textContent = phone;
            clearCheckoutOtpBoxes();

            const succBanner = document.getElementById('otpStepSuccessBanner');
            if (succBanner) {
              succBanner.textContent = regData.message || `Verification OTP sent to mobile number (${phone}). Enter code below to proceed.`;
              succBanner.classList.remove('d-none');
            }
          } else {
            throw new Error(regData.message || 'OTP sent to mobile number. Please check your phone.');
          }
          submitBtn.innerHTML = originalHtml;
          submitBtn.disabled = false;
          return;
        } else {
          targetToken = regData.token;
          targetUser = regData.user;
        }

        if (!targetToken) {
          throw new Error('Registration did not return an authentication token. Please try again.');
        }
        
        localStorage.setItem('student_token', targetToken);
        localStorage.setItem('student_user', JSON.stringify(targetUser));

        // Fetch fresh profile from DB to get absolute ground truth on phone_verified status
        let isPhoneVerifiedInDb = false;
        try {
          const meRes = await fetch('/api/auth/me', {
            headers: { 'Authorization': `Bearer ${targetToken}` }
          });
          if (meRes.ok) {
            const meData = await meRes.json();
            const freshUser = meData.user || meData;
            targetUser = freshUser;
            localStorage.setItem('student_user', JSON.stringify(freshUser));
            isPhoneVerifiedInDb = freshUser.phone_verified === true;
          }
        } catch (e) {
          isPhoneVerifiedInDb = targetUser && targetUser.phone_verified === true;
        }
        
        if (document.getElementById('successEmail')) document.getElementById('successEmail').textContent = email;
        if (document.getElementById('successPassword')) document.getElementById('successPassword').textContent = password;
        
        submitBtn.innerHTML = originalHtml;
        submitBtn.disabled = false;
        
        if (isPhoneVerifiedInDb) {
          await startPaymentFlow(targetToken);
        } else {
          await triggerPostPaymentMobileVerification(targetToken, phone, email);
        }
        
      } catch (err) {
        submitBtn.innerHTML = originalHtml;
        submitBtn.disabled = false;
        
        if (errBanner) {
          errBanner.textContent = err.message;
          errBanner.classList.remove('d-none');
        } else {
          showWebsiteAlert(err.message, 'Registration Error');
        }
      }
    });
  }
});

// Auto-advance OTP box typing in checkout modal
document.addEventListener('input', (e) => {
  if (e.target && e.target.classList.contains('c-otp-box')) {
    const box = e.target;
    if (box.value.length >= 1) {
      box.value = box.value.slice(-1);
      const next = box.nextElementSibling;
      if (next && next.classList.contains('c-otp-box')) next.focus();
    }
  }
});
document.addEventListener('keydown', (e) => {
  if (e.target && e.target.classList.contains('c-otp-box') && e.key === 'Backspace') {
    const box = e.target;
    if (!box.value) {
      const prev = box.previousElementSibling;
      if (prev && prev.classList.contains('c-otp-box')) prev.focus();
    }
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
  showWebsiteAlert("Speaxa Mobile Application is launching soon! Stay tuned for Google Play Store and iOS App Store releases.", "Mobile Application");
}

// Expose handlers to window scope
window.dismissAnnouncement = dismissAnnouncement;
window.showAppComingSoon = showAppComingSoon;
window.showWebsiteAlert = showWebsiteAlert;
window.verifyCheckoutMobileOtp = verifyCheckoutMobileOtp;
window.resendCheckoutMobileOtp = resendCheckoutMobileOtp;
window.skipMobileVerificationAndProceed = skipMobileVerificationAndProceed;

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Landing Page Data & Settings from Backend Database
  try { createParticles(); } catch(e) {}
  try { loadSettings(); } catch(e) {}
  try { loadCourses(); } catch(e) {}
  try { loadTeachers(); } catch(e) {}
  try { loadStats(); } catch(e) {}

  // Inject announcement
  createAnnouncementBar();

  // Bind SMS / Email App Download Link Form
  const smsForm = document.getElementById('smsLinkForm');
  if (smsForm) {
    smsForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const phoneInput = document.getElementById('smsPhone');
      const feedback = document.getElementById('smsFeedback');
      const val = (phoneInput ? phoneInput.value : '').trim();
      if (!val) return;

      try {
        if (feedback) {
          feedback.style.display = 'block';
          feedback.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Sending download link...';
        }
        const res = await fetch('/api/public/send-app-link', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ target: val })
        }).then(r => r.json());

        if (feedback) {
          const isEmail = val.includes('@');
          feedback.style.display = 'block';
          feedback.innerHTML = `
            <div class="alert alert-success p-2 mt-2 mb-0" style="font-size:0.78rem; border-radius:10px; background:rgba(16,185,129,0.15); border:1px solid rgba(16,185,129,0.3); color:#ffffff;">
              <i class="fas fa-check-circle me-1 text-success"></i> <strong>Sent!</strong> Link dispatched to <strong>${isEmail ? val : ('+91 ' + val)}</strong>.
              <a href="/uploads/speaxa-app.apk" download class="btn btn-sm btn-light mt-2 w-100 fw-bold text-dark shadow-sm" style="font-size:0.75rem; border-radius:6px;">
                <i class="fas fa-download me-1 text-teal"></i> Direct Download SPEAXA App
              </a>
            </div>
          `;
          phoneInput.value = '';
        }
      } catch (err) {
        if (feedback) {
          feedback.style.display = 'block';
          feedback.innerHTML = '<span class="text-white small"><i class="fas fa-check-circle text-success me-1"></i> Request received! <a href="/uploads/speaxa-app.apk" class="text-teal fw-bold">Download App Directly</a></span>';
        }
      }
    });
  }
});

// ── Google 1-Tap Initialization & Consent Handler ──────────────
window.SPEAXA_GOOGLE_CLIENT_ID = "403552305708-inmmnd16a9pkviutb5suk843eancc1ff.apps.googleusercontent.com";

function initGoogleOneTap() {
  const clientId = window.SPEAXA_GOOGLE_CLIENT_ID || (window.systemSettings && window.systemSettings.google_client_id);
  if (!clientId || clientId.includes('YOUR_')) {
    return;
  }

  if (window.google && google.accounts && google.accounts.id) {
    google.accounts.id.initialize({
      client_id: clientId,
      callback: handleGoogleOneTapConsent,
      auto_select: false
    });
    google.accounts.id.prompt();
  }
}

function parseJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
    return JSON.parse(jsonPayload);
  } catch(e) { return null; }
}

async function handleGoogleOneTapConsent(response) {
  if (!response || !response.credential) return;
  const payload = parseJwt(response.credential);
  if (!payload || !payload.email) return;

  try {
    const res = await fetch('/api/public/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: payload.email, name: payload.name, source: 'google_one_tap' })
    }).then(r => r.json());

    const toast = document.createElement('div');
    toast.className = 'position-fixed top-0 end-0 p-3';
    toast.style.zIndex = '10000';
    toast.innerHTML = `
      <div class="toast show align-items-center text-white bg-success border-0 shadow-lg" role="alert">
        <div class="d-flex">
          <div class="toast-body fw-bold" style="font-size:0.85rem;">
            <i class="fab fa-google me-2"></i> Subscribed with Google account (${payload.email})!
          </div>
          <button type="button" class="btn-close btn-close-white me-2 m-auto" onclick="this.parentElement.parentElement.parentElement.remove()"></button>
        </div>
      </div>
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 6000);
  } catch(err) {
    console.error('Google One Tap Consent Error:', err);
  }
}

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

function playBatchDemoVideo(url, batchName, event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  if (!url) return;

  const formattedUrl = (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/')) 
    ? url 
    : '/' + url;

  window.open(formattedUrl, '_blank');
}

function stopBatchDemoVideo() {
  const videoPlayer = document.getElementById('batchDemoVideoPlayer');
  const videoIframe = document.getElementById('batchDemoVideoIframe');
  if (videoPlayer) {
    videoPlayer.pause();
    videoPlayer.src = '';
    videoPlayer.style.display = 'none';
  }
  if (videoIframe) {
    videoIframe.src = '';
    videoIframe.style.display = 'none';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const modalEl = document.getElementById('batchDemoVideoModal');
  if (modalEl) {
    modalEl.addEventListener('hidden.bs.modal', stopBatchDemoVideo);
  }
});

// ============================================================
// SPEAXA Portal Guidance Popups (Student / Parent / Teacher)
// ============================================================

const PORTAL_GUIDES = {
  teacher: {
    theme: 'teacher',
    roleName: 'Teacher Portal',
    badge: 'SPEAXA FACULTY STUDIO',
    avatarIcon: 'fas fa-chalkboard-teacher',
    title: 'Welcome to Speaxa Teacher Command Center',
    subtitle: 'Your complete digital teaching studio — complete mandatory SOP quality verification, conduct live video classes with interactive whiteboard, manage student batches, evaluate homework copies, and track earnings.',
    proceedUrl: '/teacher',
    proceedText: 'Proceed to Teacher Portal',
    highlights: [
      { icon: 'fas fa-clipboard-check', text: 'Mandatory SOP Verification' },
      { icon: 'fas fa-video', text: 'Live HD Classroom Studio' },
      { icon: 'fas fa-chalkboard', text: 'Interactive Digital Whiteboard' },
      { icon: 'fas fa-users', text: 'Batch & Cohort Manager' }
    ],
    capabilitiesTitle: 'Everything You Can Do in Speaxa Teacher Portal',
    capabilitiesBadge: '12 Faculty Modules',
    capabilities: [
      {
        icon: 'fas fa-clipboard-check',
        title: 'Mandatory SOP Quality Verification',
        desc: 'Before taking classes, complete your mandatory SOP (Standard Operating Procedure). Upload Govt ID KYC, degrees, teaching availability slots, webcam/mic checks, internet speed proof, and demo teaching video for Speaxa team approval.',
        chips: ['✓ Govt ID KYC Upload', '✓ Camera & Mic Check', '✓ Internet Speed Proof', '✓ 2-Min Demo Video Review']
      },
      {
        icon: 'fas fa-video',
        title: 'Live Video Classroom Studio',
        desc: 'Launch your live class in 1 click with crystal-clear 2-way audio and HD video. Screen share presentations, textbooks, and manage student mics with ease.',
        chips: ['✓ 1-Click Class Launch', '✓ HD Camera & Mic Broadcast', '✓ Screen Share PPT & PDF', '✓ Student Mute Controls']
      },
      {
        icon: 'fas fa-chalkboard',
        title: 'Interactive Digital Whiteboard',
        desc: 'Write mathematical formulas, draw scientific diagrams, and annotate lesson notes on a real-time shared digital blackboard that students see live.',
        chips: ['✓ Live Screen Notes', '✓ Geometry & Shape Tools', '✓ Math Equation Solver', '✓ Export PDF Notes']
      },
      {
        icon: 'fas fa-layer-group',
        title: 'Batch Rosters & Student Manager',
        desc: 'Organize your assigned student batches, view enrolled students, inspect syllabus completion percentages, and view student profiles in one place.',
        chips: ['✓ Enrolled Student Lists', '✓ Batch Timetable', '✓ Syllabus Tracker %', '✓ Student Contact Info']
      },
      {
        icon: 'fas fa-tasks',
        title: 'Homework & Assignment Hub',
        desc: 'Create daily or weekly assignments for your batches, attach question PDFs, set submission deadlines, and notify students instantly.',
        chips: ['✓ Create New Tasks', '✓ Attach Question PDFs', '✓ Submission Deadlines', '✓ Instant Student Alert']
      },
      {
        icon: 'fas fa-spell-check',
        title: 'Inline Copy Checking & Grading',
        desc: 'Review handwritten homework photos and PDFs submitted by students. Highlight mistakes, award marks, and add encouraging feedback notes.',
        chips: ['✓ View Photo & PDF Copies', '✓ Award Subject Marks', '✓ Highlight Corrections', '✓ Personalized Advice']
      },
      {
        icon: 'fas fa-calendar-check',
        title: 'Automated Attendance Register',
        desc: 'The system automatically records when each student joins, their in-class study duration, and lets you manually adjust present or absent marks.',
        chips: ['✓ Automated Join Timestamps', '✓ In-Class Duration Tracking', '✓ Monthly Attendance Export', '✓ Present / Absent Toggles']
      },
      {
        icon: 'fas fa-file-alt',
        title: 'Study Material & Notes Library',
        desc: 'Upload chapter revision notes, formula sheets, previous year question papers, and reference documents directly to your batch libraries.',
        chips: ['✓ Upload Revision PDFs', '✓ Formula Handouts', '✓ Chapter Question Banks', '✓ Free Student Downloads']
      },
      {
        icon: 'fas fa-eye',
        title: 'Student Observations & Remarks',
        desc: 'Write progress remarks and behavioural observations for each student. Keep parents updated on academic improvements and areas needing focus.',
        chips: ['✓ Periodic Student Remarks', '✓ Visible to Parents', '✓ Strength & Weakness Notes', '✓ Unit Test Guidance']
      },
      {
        icon: 'fas fa-comments',
        title: '2-Way Student & Parent Chat',
        desc: 'Direct messaging inbox to answer student doubts after class hours, address parent queries, and broadcast important batch announcements.',
        chips: ['✓ Student Doubt Chats', '✓ Parent Query Inbox', '✓ Broadcast Batch Notices', '✓ Unread Counter Badges']
      },
      {
        icon: 'fas fa-play-circle',
        title: 'Class Video Recordings Library',
        desc: 'All your completed live sessions are automatically recorded and saved in your faculty library for student revision and faculty quality audit.',
        chips: ['✓ Automated Lecture Replays', '✓ Revision Video Archive', '✓ Recording Availability Toggle']
      },
      {
        icon: 'fas fa-wallet',
        title: 'Faculty Earnings & Payout Logs',
        desc: 'Track total teaching hours conducted, batch enrollments, monthly remuneration statements, and verified bank account transfer details.',
        chips: ['✓ Teaching Hours Log', '✓ Monthly Remuneration Sheet', '✓ Bank Payout Status', '✓ Transparent Breakdown']
      }
    ],
    steps: [
      {
        num: '01',
        icon: 'fas fa-sign-in-alt',
        title: 'Log In with Password or Mobile SMS OTP',
        tag: 'Step 1 • Easy Sign-In',
        desc: 'Sign in with your verified teacher email or phone and password, or enter your 10-digit mobile number for a fast 6-digit SMS login. Forgot password? Reset in seconds.',
        chips: ['Email & Password Login', 'Mobile SMS OTP', 'Instant Password Reset', 'Secure Faculty Session']
      },
      {
        num: '02',
        icon: 'fas fa-clipboard-check',
        title: 'Complete Mandatory SOP Quality Verification',
        tag: 'Step 2 • Mandatory SOP',
        desc: 'Before taking classes, complete your SOP (Standard Operating Procedure): submit Govt ID KYC, degree certificates, available teaching hours, camera/mic/lighting test, internet speed test, and a short 2-minute demo teaching video.',
        chips: ['Govt ID KYC', 'Camera & Mic Test', 'Internet Speed Proof', '2-Min Demo Video']
      },
      {
        num: '03',
        icon: 'fas fa-file-signature',
        title: 'Sign Agreement & Get Batches Allotted',
        tag: 'Step 3 • Batch Allotment',
        desc: 'Speaxa Academic Quality Team reviews your SOP within 24-48 hours. Once approved, sign the digital teacher agreement to receive your assigned student batches and curriculum.',
        chips: ['Digital Agreement Sign', 'Approval in 24-48h', 'Batch Allotment', 'Ready to Teach']
      },
      {
        num: '04',
        icon: 'fas fa-id-card',
        title: 'Set Up Faculty Bio & Specializations',
        tag: 'Step 4 • Profile Setup',
        desc: 'Update your instructor profile with your educational qualifications, teaching experience, assigned subjects, and profile avatar so students know your credentials.',
        chips: ['Educational Degrees', 'Teaching Experience', 'Assigned Subjects', 'Profile Avatar']
      },
      {
        num: '05',
        icon: 'fas fa-calendar-alt',
        title: 'Inspect Today’s Lecture Timetable',
        tag: 'Step 5 • Daily Routine',
        desc: 'Open your dashboard every morning to see today’s lecture timetable, start times, and a live countdown timer until your next scheduled class.',
        chips: ['Today’s Schedule List', 'Live Countdown Clock', 'Batch Reminders']
      },
      {
        num: '06',
        icon: 'fas fa-sliders-h',
        title: 'Test Camera & Mic in Preview Screen',
        tag: 'Step 6 • Device Check',
        desc: 'Before starting class, check your webcam video and microphone input in the preview screen to ensure crystal-clear audio and video delivery for students.',
        chips: ['HD Camera Test', 'Clear Audio Input', 'Lighting & Background Check']
      },
      {
        num: '07',
        icon: 'fas fa-broadcast-tower',
        title: 'Click "Start Class" to Broadcast Live',
        tag: 'Step 7 • Launch Class',
        desc: 'Click the green "Start Class" button to open your live classroom. Students receive an instant entry notification on their phones and join your room.',
        chips: ['1-Click Broadcast', 'Live Agora Studio', 'Instant Student Notification']
      },
      {
        num: '08',
        icon: 'fas fa-chalkboard',
        title: 'Teach with Live Digital Whiteboard',
        tag: 'Step 8 • Live Blackboard',
        desc: 'Use digital pens, highlighters, geometry shapes, and math equation tools on the shared live blackboard. Export your whiteboard notes to PDF with 1 tap.',
        chips: ['Digital Pen & Highlighter', 'Geometry Shapes', 'Math Equations', 'Export PDF Notes']
      },
      {
        num: '09',
        icon: 'fas fa-desktop',
        title: 'Share Screen for Presentation Slides & PDFs',
        tag: 'Step 9 • Screen Sharing',
        desc: 'Share your entire screen or specific application windows to show PowerPoint presentations, textbook chapters, or reference educational videos.',
        chips: ['PPT Presentations', 'PDF Textbooks', 'Interactive Simulations', 'System Audio Sharing']
      },
      {
        num: '10',
        icon: 'fas fa-hand-paper',
        title: 'Answer Live Doubts & Manage Raised Hands',
        tag: 'Step 10 • Doubt Clearing',
        desc: 'Monitor real-time student messages in the live chat room. When a student clicks "Raise Hand", invite them to speak 1-on-1 via microphone to resolve their query.',
        chips: ['Live Doubt Chat', 'Raised Hand Queue', '1-on-1 Voice Query', 'Mute All Option']
      },
      {
        num: '11',
        icon: 'fas fa-user-check',
        title: 'Verify Automated Attendance Register',
        tag: 'Step 11 • Smart Attendance',
        desc: 'Review the automated attendance sheet showing student join times, active in-class duration, and adjust present or absent marks with a single click.',
        chips: ['Automated Join Times', 'Active Minutes Log', 'Present / Absent Toggles', 'Export Attendance Sheet']
      },
      {
        num: '12',
        icon: 'fas fa-file-upload',
        title: 'Create & Assign New Homework',
        tag: 'Step 12 • Homework Hub',
        desc: 'Open Assignments, type homework questions or attach problem PDFs, specify submission due dates, and dispatch tasks to your batch instantly.',
        chips: ['Create Homework Tasks', 'Attach Problem PDFs', 'Submission Deadlines', 'Instant Notification']
      },
      {
        num: '13',
        icon: 'fas fa-check-double',
        title: 'Evaluate Student Copies & Award Marks',
        tag: 'Step 13 • Copy Grading',
        desc: 'Open student handwritten notebook photos or PDF copies, highlight mistakes, award subject marks, and leave motivating tips for exam improvement.',
        chips: ['Inline Photo & PDF Review', 'Award Subject Scores', 'Highlight Corrections', 'Constructive Feedback']
      },
      {
        num: '14',
        icon: 'fas fa-book',
        title: 'Upload Study Notes & Revision Handouts',
        tag: 'Step 14 • Study Materials',
        desc: 'Upload chapter summary notes, formula cheatsheets, and question banks to the Study Materials section so enrolled students can download them 24/7.',
        chips: ['Upload Revision PDFs', 'Formula Cheatsheets', 'Question Banks', 'Free Student Access']
      },
      {
        num: '15',
        icon: 'fas fa-chart-pie',
        title: 'Track Teaching Hours & Monthly Earnings',
        tag: 'Step 15 • Earnings & Payouts',
        desc: 'Check your Earnings tab to track total class hours delivered, view verified monthly remuneration statements, and monitor direct bank payouts.',
        chips: ['Delivered Hours Log', 'Monthly Statements', 'Verified Bank Transfers', 'Transparent Breakdown']
      }
    ],
    tip: '<strong>Important Pro-Tip on SOP:</strong> Naye teachers ke liye SOP (Standard Operating Procedure) complete karna mandatory hai. Aapka camera, mic, lighting, internet speed aur demo video Speaxa Academic Team 24-48 ghante me review karke approve karti hai, jiske baad hi batches allot hote hain!'
  },
  parent: {
    theme: 'parent',
    roleName: 'Parent Portal',
    badge: 'SPEAXA GUARDIAN OVERSIGHT',
    avatarIcon: 'fas fa-user-friends',
    title: 'Welcome to Speaxa Parent & Guardian Portal',
    subtitle: 'Stay closely connected to your child’s academic growth — monitor live class attendance, review subject test marks, check homework submissions, chat directly with teachers, and manage fee receipts.',
    proceedUrl: '/parent',
    proceedText: 'Proceed to Parent Portal',
    highlights: [
      { icon: 'fas fa-user-check', text: 'Live Attendance & Entry Alerts' },
      { icon: 'fas fa-chart-line', text: 'Subject-wise Test Scorecards' },
      { icon: 'fas fa-comments', text: 'Direct Teacher 2-Way Chat' },
      { icon: 'fas fa-users', text: 'Multi-Child Account Switcher' }
    ],
    capabilitiesTitle: 'Everything You Can Do in Speaxa Parent Portal',
    capabilitiesBadge: '12 Guardian Modules',
    capabilities: [
      {
        icon: 'fas fa-user-check',
        title: 'Live Attendance & Entry Alerts',
        desc: 'Receive instant notifications when your child joins their live class. Check monthly calendar views with present/absent logs and in-class punctuality.',
        chips: ['✓ Class Entry Alerts', '✓ Monthly Calendar View', '✓ Punctuality Tracking', '✓ Absent Notifications']
      },
      {
        icon: 'fas fa-chart-line',
        title: 'Academic Performance & Scorecards',
        desc: 'Inspect your child’s weekly test results, subject-wise percentages, exam rankings, and percentile benchmarks across Maths, Science, and English.',
        chips: ['✓ Subject-wise Scores', '✓ Test Percentile Rank', '✓ Class Average Comparison']
      },
      {
        icon: 'fas fa-chart-pie',
        title: 'Visual Progress & Trend Charts',
        desc: 'Interactive month-over-month graphs that clearly show if your child’s scores are rising and identify subjects needing extra practice at home.',
        chips: ['✓ Month-on-Month Trends', '✓ Interactive Graphs', '✓ Strength & Weakness Areas']
      },
      {
        icon: 'fas fa-tasks',
        title: 'Homework & Assignment Status',
        desc: 'Verify whether your child submitted homework before the deadline, check pending tasks, and view teacher marks and corrections on copies.',
        chips: ['✓ Submission Timestamps', '✓ Teacher Corrections', '✓ Evaluated Copy Review']
      },
      {
        icon: 'fas fa-comments',
        title: 'Direct 2-Way Teacher Connect',
        desc: 'Privately message your child’s assigned teachers and mentors anytime. Discuss exam preparation, study habits, and child behavior directly.',
        chips: ['✓ Direct Mentor Chat', '✓ Exam Preparation Advice', '✓ Instant Unread Badges']
      },
      {
        icon: 'fas fa-users',
        title: 'Multi-Child Account Switcher',
        desc: 'Have 2 or more children studying on Speaxa? Link all your kids under one guardian account and switch between their dashboards in 1 tap.',
        chips: ['✓ 1-Tap Child Switcher', '✓ Link via Student Code', '✓ Consolidated Dashboard']
      },
      {
        icon: 'fas fa-calendar-alt',
        title: 'Today’s Class Timetable & Routine',
        desc: 'View your child’s daily lecture schedule, assigned mentors, lecture start times, and a live countdown timer until class begins.',
        chips: ['✓ Daily Timetable List', '✓ Live Countdown Timer', '✓ Teacher Credentials']
      },
      {
        icon: 'fas fa-file-invoice-dollar',
        title: 'Fee Invoices & Payment Receipts',
        desc: 'Review active course subscriptions, renewal due dates, and instantly download official GST invoices and payment receipts in PDF format.',
        chips: ['✓ Course Subscription Status', '✓ Instant PDF Invoices', '✓ Payment History Records']
      },
      {
        icon: 'fas fa-comment-dots',
        title: 'Mentor Remarks & Observations',
        desc: 'Read personal feedback and tips written by subject mentors highlighting where your child shines and chapters requiring extra attention.',
        chips: ['✓ Personalized Teacher Notes', '✓ Focus Topic Advice', '✓ Unit Test Guidance']
      },
      {
        icon: 'fas fa-fire',
        title: 'Daily Study Hours & Engagement',
        desc: 'Monitor active minutes spent by your child in live lectures, consecutive daily study streaks, and badges earned for consistent attendance.',
        chips: ['✓ Active Study Minutes', '✓ Daily Learning Streaks', '✓ Engagement Consistency']
      },
      {
        icon: 'fas fa-book-open',
        title: 'Syllabus & Course Progress %',
        desc: 'Track what percentage of the school board curriculum has been taught in each subject and preview upcoming chapter lesson plans.',
        chips: ['✓ Chapter Completion %', '✓ CBSE / ICSE Roadmaps', '✓ Upcoming Chapters']
      },
      {
        icon: 'fas fa-shield-alt',
        title: 'Guardian Profile & Security',
        desc: 'Update your primary mobile number, email address, password, emergency contact info, and customize SMS and app notification preferences.',
        chips: ['✓ Verified Guardian Contact', '✓ Password Security', '✓ Alert Preferences']
      }
    ],
    steps: [
      {
        num: '01',
        icon: 'fas fa-user-shield',
        title: 'Log In or Register Guardian Account',
        tag: 'Step 1 • Easy Sign-In',
        desc: 'Sign in with your registered mobile number or email and password. Forgot password? Reset it in seconds with SMS/Email OTP. New parent? Click Register to sign up.',
        chips: ['Mobile / Email Login', 'Secure Password Auth', 'Instant OTP Reset', 'New Parent Registration']
      },
      {
        num: '02',
        icon: 'fas fa-link',
        title: 'Link Your Child via Student Code',
        tag: 'Step 2 • Connect Child',
        desc: 'Enter your child’s unique 6-digit Student Code (found in their Student Portal profile) to immediately link their data to your guardian account.',
        chips: ['6-Digit Student Code', 'Instant Child Verification', 'Automatic Data Sync']
      },
      {
        num: '03',
        icon: 'fas fa-users-cog',
        title: 'Add Multiple Kids to One Account',
        tag: 'Step 3 • Multi-Child',
        desc: 'If you have more than one child studying on Speaxa, add each child’s code in Settings to switch between their report cards with a single click.',
        chips: ['Multi-Child Switcher', 'Separate Class Data', '1-Tap Child Switch']
      },
      {
        num: '04',
        icon: 'fas fa-clock',
        title: 'Check Daily Routine & Live Countdown',
        tag: 'Step 4 • Daily Routine',
        desc: 'Open your home dashboard every morning to see your child’s scheduled lectures for today and a ticking live countdown until class starts.',
        chips: ['Today’s Schedule', 'Live Countdown Clock', 'Assigned Mentors']
      },
      {
        num: '05',
        icon: 'fas fa-bell',
        title: 'Receive Instant Class Entry Alerts',
        tag: 'Step 5 • Live Alerts',
        desc: 'Get an instant notification on your phone when your child taps Join Class. If your child is late or absent, you are informed immediately.',
        chips: ['Class Entry Notification', 'Punctuality Alerts', 'Absent Warnings']
      },
      {
        num: '06',
        icon: 'fas fa-calendar-check',
        title: 'Check Monthly Attendance Calendar',
        tag: 'Step 6 • Attendance View',
        desc: 'Open the Attendance tab to view the monthly calendar with clear green marks for present days, red for missed classes, and total attendance percentage.',
        chips: ['Monthly Calendar View', 'Present / Absent Count', 'Attendance Percentage %']
      },
      {
        num: '07',
        icon: 'fas fa-poll',
        title: 'Inspect Subject-Wise Test Scores',
        tag: 'Step 7 • Scorecards',
        desc: 'Go to Performance to see your child’s marks in weekly tests, term exams, and quizzes across Mathematics, Science, English, and Social Studies.',
        chips: ['Subject-wise Marks', 'Highest Batch Scores', 'Percentile Benchmark']
      },
      {
        num: '08',
        icon: 'fas fa-chart-line',
        title: 'Review Progress & Trend Graphs',
        tag: 'Step 8 • Growth Charts',
        desc: 'Inspect visual growth graphs that plot your child’s monthly performance over time, showing you whether their academic grades are climbing.',
        chips: ['Visual Performance Graph', 'Month-over-Month Growth', 'Concept Mastery']
      },
      {
        num: '09',
        icon: 'fas fa-clipboard-check',
        title: 'Track Homework Submissions & Marks',
        tag: 'Step 9 • Homework Log',
        desc: 'Check if your child completed their homework before the deadline, inspect teacher remarks on their notebook copies, and see marks awarded.',
        chips: ['On-Time Submission Log', 'Evaluated Copy Photos', 'Teacher Corrections']
      },
      {
        num: '10',
        icon: 'fas fa-comment-alt',
        title: 'Read Mentor Remarks & Observations',
        tag: 'Step 10 • Mentor Notes',
        desc: 'Read personal feedback left by teachers about your child’s classroom attention, doubt-asking habits, and specific topics needing extra study.',
        chips: ['Teacher Feedback Notes', 'Weak Area Guidance', 'Exam Readiness Tips']
      },
      {
        num: '11',
        icon: 'fas fa-comments',
        title: 'Message Teachers via Teacher Connect',
        tag: 'Step 11 • Direct Chat',
        desc: 'Use the Teacher Connect chat to privately message your child’s mentors, ask questions regarding exam preparation, and receive fast responses.',
        chips: ['Direct Teacher Messaging', 'Private & Secure', 'Unread Alert Badge']
      },
      {
        num: '12',
        icon: 'fas fa-tasks',
        title: 'Monitor Syllabus Completion %',
        tag: 'Step 12 • Syllabus Status',
        desc: 'Check what percentage of the school board syllabus has been completed so you always know if your child is ahead or behind school exams.',
        chips: ['Curriculum Coverage %', 'Chapter Milestones', 'Board Exam Roadmaps']
      },
      {
        num: '13',
        icon: 'fas fa-file-invoice',
        title: 'Review Fees & Download PDF Receipts',
        tag: 'Step 13 • Invoices & Fees',
        desc: 'Check subscription validity, renewal due dates, and instantly download official GST-compliant tax invoices and fee receipts for your records.',
        chips: ['Active Subscription Dates', 'Download PDF Receipts', 'Transparent Fee Records']
      },
      {
        num: '14',
        icon: 'fas fa-envelope-open-text',
        title: 'Get Weekly Automated Summary Digest',
        tag: 'Step 14 • Weekly Digest',
        desc: 'Every weekend, review an automated summary recap of your child’s total classes attended, homework submitted, and test marks achieved that week.',
        chips: ['Weekly Report Digest', 'Quick Performance Recap', 'Automated Summary']
      },
      {
        num: '15',
        icon: 'fas fa-user-cog',
        title: 'Update Profile & Alert Preferences',
        tag: 'Step 15 • Guardian Settings',
        desc: 'Manage your verified guardian mobile number, email, password, emergency phone numbers, and notification preferences anytime in Settings.',
        chips: ['Guardian Contact Details', 'Password & Security', 'Notification Toggles']
      }
    ],
    tip: '<strong>Pro-Tip for Parents:</strong> Check the Teacher Connect tab once a week to exchange quick notes with your child’s mentors before upcoming school unit tests!'
  },
  student: {
    theme: 'student',
    roleName: 'Student Portal',
    badge: 'SPEAXA STUDENT LEARNING SUITE',
    avatarIcon: 'fas fa-user-graduate',
    title: 'Welcome to Speaxa Student Portal',
    subtitle: 'Your complete digital classroom — attend live video classes, ask doubts in real time, upload homework, watch past class recordings 24/7, and track your study marks.',
    proceedUrl: '/student',
    proceedText: 'Proceed to Student Portal',
    highlights: [
      { icon: 'fas fa-video', text: 'Live Video Classes with Teachers' },
      { icon: 'fas fa-book-open', text: 'Class 6 to 12 (CBSE & ICSE)' },
      { icon: 'fas fa-file-signature', text: 'Photo & PDF Homework Upload' },
      { icon: 'fas fa-play-circle', text: '24/7 Past Class Video Recordings' }
    ],
    capabilitiesTitle: 'Everything You Can Do in Speaxa Student Portal',
    capabilitiesBadge: '12 Full Features',
    capabilities: [
      {
        icon: 'fas fa-video',
        title: 'Live Video Classrooms',
        desc: 'Join your teacher’s live online class with clear video and audio. Click one button to enter the classroom from your phone or laptop.',
        chips: ['✓ 1-Click Join Button', '✓ 2-Way Audio & Video', '✓ Live Doubt Chat', '✓ Raise Hand Option']
      },
      {
        icon: 'fas fa-chalkboard',
        title: 'Interactive Digital Whiteboard',
        desc: 'Watch your teacher solve math problems, write notes, and draw diagrams in real time on a shared live digital blackboard.',
        chips: ['✓ Live Screen Notes', '✓ Easy Concept Drawing', '✓ Real-time Equations']
      },
      {
        icon: 'fas fa-search',
        title: 'Browse & Choose Courses',
        desc: 'Explore courses for CBSE, ICSE, and State Boards from Class 6 to 12. Check subject syllabus, chapter details, and teacher profiles.',
        chips: ['✓ Class 6 to 12 Courses', '✓ CBSE, ICSE & State Boards', '✓ Complete Syllabus Roadmaps']
      },
      {
        icon: 'fas fa-layer-group',
        title: 'My Batches & Timetable',
        desc: 'View your enrolled batches, teacher name, weekly lecture schedule, classmate cohort, and syllabus completion percentage.',
        chips: ['✓ Assigned Teacher Details', '✓ Batch Mates List', '✓ Syllabus Completion %']
      },
      {
        icon: 'fas fa-file-upload',
        title: 'Homework & Assignments',
        desc: 'See homework assigned by your teachers, upload photos or PDF files of your handwritten copies, and get marks with teacher corrections.',
        chips: ['✓ Upload Photos or PDFs', '✓ Due Date Deadlines', '✓ Teacher Marks & Remarks']
      },
      {
        icon: 'fas fa-play-circle',
        title: '24/7 Class Video Recordings',
        desc: 'Missed a live class or need revision before exams? Watch the video recording of any past class anytime with pause and speed controls.',
        chips: ['✓ Re-watch Anytime 24/7', '✓ 1x / 1.5x / 2x Speed', '✓ Download Lesson Notes']
      },
      {
        icon: 'fas fa-chart-line',
        title: 'Monthly Report Cards & Marks',
        desc: 'Track your quiz scores, subject-wise percentages, exam results, and easy progress graphs to see where you are improving.',
        chips: ['✓ Subject-wise Scores', '✓ Easy Progress Graphs', '✓ Test Percentile Rank']
      },
      {
        icon: 'fas fa-fire',
        title: 'Attendance Calendar & Streaks',
        desc: 'Check your monthly attendance calendar with green marks for present days. Attend classes daily to build your learning streak.',
        chips: ['✓ Monthly Calendar View', '✓ Present / Absent Record', '✓ Fun Learning Badges']
      },
      {
        icon: 'fas fa-receipt',
        title: 'Fee Invoices & Receipts',
        desc: 'View active course plans, pay fees easily online with secure Razorpay, and instantly download official payment receipts and invoices.',
        chips: ['✓ Secure Online Payments', '✓ Instant PDF Receipts', '✓ Active Subscription Details']
      },
      {
        icon: 'fas fa-user-friends',
        title: 'Link Your Parents’ Account',
        desc: 'Share your unique Student Code with your parents so they can log into the Parent Portal and view your attendance and reports.',
        chips: ['✓ Unique Student Code', '✓ Guardian Transparency', '✓ Link Approvals']
      },
      {
        icon: 'fas fa-bell',
        title: 'Live Class Reminders & Alerts',
        desc: 'Get instant alerts on your phone whenever a live class is about to start, new homework is posted, or a teacher grades your copy.',
        chips: ['✓ 15-Min Class Reminders', '✓ Grading Notifications', '✓ Important Notices']
      },
      {
        icon: 'fas fa-id-card',
        title: 'Student ID & Profile Settings',
        desc: 'View your verified Student ID Code, update your profile picture, change password, and switch grade or board details.',
        chips: ['✓ Official Student ID', '✓ Avatar Personalization', '✓ Password Security']
      }
    ],
    steps: [
      {
        num: '01',
        icon: 'fas fa-user-plus',
        title: 'Create Free Account or Log In (Mobile OTP)',
        tag: 'Step 1 • Getting Started',
        desc: 'Enter your 10-digit mobile number to receive a 6-digit SMS code, or log in with your email and password. New student? Click Register to sign up in 30 seconds.',
        chips: ['Mobile SMS OTP (Fastest)', 'Email & Password Login', 'Instant Account Creation', 'Quick Password Reset']
      },
      {
        num: '02',
        icon: 'fas fa-graduation-cap',
        title: 'Select Your Class & School Board',
        tag: 'Step 2 • Grade Setup',
        desc: 'Choose your class (Grade 6 to 12) and educational board (CBSE, ICSE, or State Board) so your portal automatically loads your exact school syllabus and books.',
        chips: ['Class 6 to 12 Selection', 'CBSE / ICSE / State Board', 'Personalized Syllabus']
      },
      {
        num: '03',
        icon: 'fas fa-book-reader',
        title: 'Explore Courses & Watch Free Demos',
        tag: 'Step 3 • Course Catalog',
        desc: 'Browse subject courses (Maths, Science, English, etc.), read chapter syllabi, check assigned teachers, and watch free batch demo videos before joining.',
        chips: ['Subject-wise Courses', 'Chapter Breakdown', 'Free Batch Demo Videos']
      },
      {
        num: '04',
        icon: 'fas fa-credit-card',
        title: 'Pay Tuition Fees & Download Receipt',
        tag: 'Step 4 • Safe Payment',
        desc: 'Choose a monthly or annual course plan and pay securely through Razorpay using UPI (GPay, PhonePe, Paytm), cards, or net banking. Download your official PDF receipt instantly.',
        chips: ['UPI / Cards / NetBanking', '100% Secure Razorpay', 'Instant PDF Payment Receipt']
      },
      {
        num: '05',
        icon: 'fas fa-calendar-alt',
        title: 'Check Your Batch & Lecture Timetable',
        tag: 'Step 5 • Class Routine',
        desc: 'Go to My Batches to see your teacher’s profile, classmates in your batch, weekly lecture days, and start times so you are always prepared.',
        chips: ['Assigned Mentor', 'Classmate Cohort', 'Weekly Timetable', 'Syllabus Progress %']
      },
      {
        num: '06',
        icon: 'fas fa-clock',
        title: 'Daily Dashboard & Live Countdown Clock',
        tag: 'Step 6 • Daily Routine',
        desc: 'Every day your home dashboard displays today’s upcoming lectures with a live ticking countdown timer showing exact minutes remaining until class starts.',
        chips: ['Today’s Class Timetable', 'Live Countdown Timer', 'Pending Homework Count']
      },
      {
        num: '07',
        icon: 'fas fa-video',
        title: 'Tap Green "Join Class" to Enter',
        tag: 'Step 7 • 1-Click Join',
        desc: 'When class time begins, the "Join Class" button turns green. Click it to enter your teacher’s live room directly with clear video and audio without any complicated setup.',
        chips: ['1-Click Green Join Button', 'Clear HD Video & Audio', 'Works on Phone & Laptop']
      },
      {
        num: '08',
        icon: 'fas fa-chalkboard-teacher',
        title: 'Follow Live Digital Blackboard',
        tag: 'Step 8 • Live Teaching',
        desc: 'Watch your teacher solve math equations, write key definitions, and draw science diagrams on the real-time shared digital whiteboard right on your screen.',
        chips: ['Live Screen Blackboard', 'Step-by-Step Math Solutions', 'Diagram Illustrations']
      },
      {
        num: '09',
        icon: 'fas fa-comments',
        title: 'Ask Doubts via Live Chat or Raise Hand',
        tag: 'Step 9 • Instant Doubts',
        desc: 'If you have a doubt during class, type your question in the live chat or click "Raise Hand" so your teacher can invite you to speak directly via microphone.',
        chips: ['Live Chat Room', 'Raise Hand Option', 'Speak Directly with Teacher']
      },
      {
        num: '10',
        icon: 'fas fa-check-double',
        title: 'Auto Attendance & Daily Study Streak',
        tag: 'Step 10 • Smart Attendance',
        desc: 'The moment you enter class, Speaxa automatically marks you Present. Attend daily classes on time to build your learning streak and earn fun student badges.',
        chips: ['Automatic Present Log', 'Monthly Calendar Green Dots', 'Daily Study Streaks']
      },
      {
        num: '11',
        icon: 'fas fa-tasks',
        title: 'Check New Homework & Deadlines',
        tag: 'Step 11 • Homework Hub',
        desc: 'Open the Homework tab after class to see questions assigned by your teacher, detailed guidelines, and the exact submission due date.',
        chips: ['Daily Homework Questions', 'Submission Due Dates', 'Teacher Instructions']
      },
      {
        num: '12',
        icon: 'fas fa-file-upload',
        title: 'Upload Notebook Photos or PDF Copy',
        tag: 'Step 12 • Submit Work',
        desc: 'Complete your homework in your notebook, take clear photos with your phone camera or upload a single PDF file, and click submit with one tap.',
        chips: ['Camera Photo Upload', 'PDF File Support', 'Instant Submission Confirmation']
      },
      {
        num: '13',
        icon: 'fas fa-spell-check',
        title: 'View Checked Copies & Teacher Marks',
        tag: 'Step 13 • Checked Copies',
        desc: 'Once your teacher reviews your work, open the app to see your marks, personalized teacher comments, and highlighted corrections to improve your grades.',
        chips: ['Subject Scores', 'Teacher Remarks & Advice', 'Correction Highlights']
      },
      {
        num: '14',
        icon: 'fas fa-play-circle',
        title: 'Re-watch Past Class Recordings 24/7',
        tag: 'Step 14 • 24/7 Revision',
        desc: 'Missed a live class or need revision before exams? Every class video is saved in your library. Watch it anytime at 1x, 1.5x, or 2x speed with downloaded notes.',
        chips: ['24/7 Video Replays', '1.5x & 2x Speed Controls', 'Download Lecture Notes']
      },
      {
        num: '15',
        icon: 'fas fa-user-shield',
        title: 'Link Parents’ App & Inspect Report Cards',
        tag: 'Step 15 • Report Cards',
        desc: 'Share your unique Student ID Code with your parents so they can link to your profile, view your test percentiles, monthly progress graphs, and fee receipts.',
        chips: ['Unique Student Code', 'Parent App Link', 'Monthly Report Cards', 'Test Percentile Rank']
      }
    ],
    tip: '<strong>Pro-Tip for Students:</strong> Join your live class 5 minutes early to test your audio, camera, and download lesson notes before the mentor starts teaching!'
  }
};

let portalGuideModalInstance = null;

function renderPortalGuideContent(role) {
  const guide = PORTAL_GUIDES[role] || PORTAL_GUIDES.student;

  const modalEl = document.getElementById('spxPortalGuideModal');
  if (!modalEl) return;

  // Set personalized role theme
  modalEl.setAttribute('data-portal-theme', guide.theme);

  // Avatar Icon
  const avatarEl = modalEl.querySelector('#spxPortalGuideAvatar');
  if (avatarEl) {
    avatarEl.innerHTML = `<i class="${guide.avatarIcon}"></i>`;
  }

  // Header Badge, Title, Subtitle
  const badgeEl = modalEl.querySelector('#spxPortalGuideBadge');
  if (badgeEl) {
    badgeEl.innerHTML = `<span class="live-dot"></span>${guide.badge}`;
  }

  const titleEl = modalEl.querySelector('#spxPortalGuideTitle');
  if (titleEl) titleEl.textContent = guide.title;

  const subtitleEl = modalEl.querySelector('#spxPortalGuideSubtitle');
  if (subtitleEl) subtitleEl.textContent = guide.subtitle;

  // Highlights Strip
  const highlightsContainer = modalEl.querySelector('#spxPortalGuideHighlights');
  if (highlightsContainer && guide.highlights) {
    highlightsContainer.innerHTML = guide.highlights.map(h => `
      <div class="spx-highlight-chip">
        <i class="${h.icon}"></i>
        <span>${h.text}</span>
      </div>
    `).join('');
  }

  // Capabilities Grid
  const capabilitiesContainer = modalEl.querySelector('#spxPortalGuideCapabilities');
  if (capabilitiesContainer) {
    if (guide.capabilities && guide.capabilities.length > 0) {
      capabilitiesContainer.innerHTML = `
        <div class="spx-steps-section-header mt-1 mb-2">
          <div class="spx-steps-section-title">
            <i class="fas fa-th-large"></i>
            <span>${guide.capabilitiesTitle || 'Everything You Can Do'}</span>
          </div>
          <span class="spx-steps-section-badge">
            <i class="fas fa-check-circle me-1"></i> ${guide.capabilitiesBadge || 'Full LMS Suite'}
          </span>
        </div>
        <div class="spx-capabilities-grid">
          ${guide.capabilities.map(cap => `
            <div class="spx-capability-card">
              <div>
                <div class="spx-capability-top">
                  <div class="spx-capability-icon">
                    <i class="${cap.icon}"></i>
                  </div>
                  <div class="spx-capability-title">${cap.title}</div>
                </div>
                <p class="spx-capability-desc">${cap.desc}</p>
              </div>
              ${cap.chips && cap.chips.length > 0 ? `
                <div class="spx-capability-chips">
                  ${cap.chips.map(chip => `
                    <span class="spx-capability-chip">${chip}</span>
                  `).join('')}
                </div>
              ` : ''}
            </div>
          `).join('')}
        </div>
      `;
      capabilitiesContainer.style.display = 'block';
    } else {
      capabilitiesContainer.innerHTML = '';
      capabilitiesContainer.style.display = 'none';
    }
  }

  // Bullet-wise Animated Steps List
  const stepsContainer = modalEl.querySelector('#spxPortalGuideSteps');
  if (stepsContainer && guide.steps) {
    // Re-render to trigger fresh CSS slide-in animations
    stepsContainer.innerHTML = guide.steps.map(s => `
      <div class="spx-step-bullet-item">
        <div class="spx-step-bullet-indicator">${s.num}</div>
        <div class="spx-step-bullet-body">
          <div class="spx-step-bullet-header">
            <div class="spx-step-bullet-title">
              <i class="${s.icon}"></i>
              <span>${s.title}</span>
            </div>
            <span class="spx-step-bullet-tag">${s.tag}</span>
          </div>
          <p class="spx-step-bullet-desc">${s.desc}</p>
          <div class="spx-step-bullet-chips">
            ${s.chips.map(chip => `
              <span class="spx-step-micro-chip">
                <i class="fas fa-check-circle"></i>
                <span>${chip}</span>
              </span>
            `).join('')}
          </div>
        </div>
      </div>
    `).join('');
  }

  // Dynamic Steps Badge Count
  const stepsBadgeEl = modalEl.querySelector('#spxPortalGuideStepsBadge');
  if (stepsBadgeEl && guide.steps) {
    stepsBadgeEl.innerHTML = `<i class="fas fa-check-circle me-1"></i> ${guide.steps.length} Simple Steps`;
  }

  // Pro tip
  const tipEl = modalEl.querySelector('#spxPortalGuideTip');
  if (tipEl) {
    tipEl.innerHTML = `<i class="fas fa-lightbulb"></i><div>${guide.tip}</div>`;
  }

  // Proceed button
  const proceedBtn = modalEl.querySelector('#spxPortalGuideProceedBtn');
  if (proceedBtn) {
    proceedBtn.innerHTML = `<span>${guide.proceedText}</span><i class="fas fa-arrow-right"></i>`;
    proceedBtn.setAttribute('href', guide.proceedUrl);
  }
}

function initPortalGuideModal() {
  let modalEl = document.getElementById('spxPortalGuideModal');
  if (!modalEl) {
    modalEl = document.createElement('div');
    modalEl.id = 'spxPortalGuideModal';
    modalEl.className = 'modal fade spx-portal-modal';
    modalEl.tabIndex = -1;
    modalEl.setAttribute('aria-hidden', 'true');
    modalEl.style.zIndex = '1095';

    modalEl.innerHTML = `
      <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable">
        <div class="modal-content">
          <!-- Personalized Header (No Tabs) -->
          <div class="spx-portal-header">
            <div id="spxPortalGuideAvatar" class="spx-portal-avatar"></div>
            <div class="spx-portal-header-info">
              <div id="spxPortalGuideBadge" class="spx-portal-badge"></div>
              <h3 id="spxPortalGuideTitle" class="spx-portal-title"></h3>
              <p id="spxPortalGuideSubtitle" class="spx-portal-subtitle"></p>
            </div>
            <button type="button" class="spx-portal-close" data-bs-dismiss="modal" aria-label="Close">
              <i class="fas fa-times"></i>
            </button>
          </div>

          <!-- Body -->
          <div class="spx-portal-body">
            <!-- Highlight Chips Strip -->
            <div id="spxPortalGuideHighlights" class="spx-highlights-strip"></div>

            <!-- Capabilities Grid (What student can do) -->
            <div id="spxPortalGuideCapabilities"></div>

            <!-- Steps Section Header -->
            <div class="spx-steps-section-header">
              <div class="spx-steps-section-title">
                <i class="fas fa-route"></i>
                <span>How To Use This Panel (Step-by-Step)</span>
              </div>
              <span id="spxPortalGuideStepsBadge" class="spx-steps-section-badge">
                <i class="fas fa-check-circle me-1"></i> Simple Steps
              </span>
            </div>

            <!-- Bullet-Wise Animated Steps Timeline -->
            <div id="spxPortalGuideSteps" class="spx-animated-steps-list"></div>

            <!-- Pro-Tip Box -->
            <div id="spxPortalGuideTip" class="spx-portal-tip"></div>
          </div>

          <!-- Footer Actions -->
          <div class="spx-portal-footer">
            <button type="button" class="spx-portal-btn-dismiss" data-bs-dismiss="modal">
              <i class="fas fa-times me-1"></i> Stay On Page
            </button>
            <a id="spxPortalGuideProceedBtn" href="#" class="spx-portal-btn-proceed">
              <span>Proceed to Portal</span>
              <i class="fas fa-arrow-right"></i>
            </a>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modalEl);

    // Handle proceed button click
    const proceedBtn = modalEl.querySelector('#spxPortalGuideProceedBtn');
    if (proceedBtn) {
      proceedBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const url = proceedBtn.getAttribute('href');
        if (url) {
          window.location.href = url;
        }
      });
    }
  }

  return modalEl;
}

window.openPortalGuidanceModal = function(role, event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  const modalEl = initPortalGuideModal();
  renderPortalGuideContent(role);

  if (!portalGuideModalInstance) {
    portalGuideModalInstance = new bootstrap.Modal(modalEl, {
      backdrop: true,
      keyboard: true
    });
  }
  portalGuideModalInstance.show();
};

// Global click delegation for Teacher / Parent / Student buttons
document.addEventListener('click', (e) => {
  const link = e.target.closest('a[href="/student"], a[href="/parent"], a[href="/teacher"], a[href^="/student"], a[href^="/parent"], a[href^="/teacher"]');
  if (!link) return;

  // Do not intercept if inside the modal footer or marked data-no-guide
  if (link.closest('#spxPortalGuideModal') || link.getAttribute('data-no-guide') === 'true') {
    return;
  }

  const href = (link.getAttribute('href') || '').toLowerCase();
  let role = null;
  if (href.startsWith('/teacher')) role = 'teacher';
  else if (href.startsWith('/parent')) role = 'parent';
  else if (href.startsWith('/student')) role = 'student';

  if (role) {
    e.preventDefault();
    e.stopPropagation();
    window.openPortalGuidanceModal(role);
  }
});


