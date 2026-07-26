window.GLOBAL_TIMEZONE = 'Asia/Kolkata';
window.GLOBAL_TIME_FORMAT = '12-hour';

/**
 * Universal Global 12-Hour Time Formatter (hh:mm AM/PM)
 */
window.fmtTime = function(dateInput) {
  if (!dateInput) return '—';
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: window.GLOBAL_TIMEZONE });
  } catch (e) {
    return '—';
  }
};

/**
 * Universal Global Date Formatter
 */
window.fmtDate = function(dateInput) {
  if (!dateInput) return '—';
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: window.GLOBAL_TIMEZONE });
  } catch (e) {
    return '—';
  }
};

/**
 * Universal Global Date + 12-Hour Time Formatter
 */
window.fmtDateTime = function(dateInput) {
  if (!dateInput) return '—';
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '—';
    const datePart = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: window.GLOBAL_TIMEZONE });
    const timePart = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: window.GLOBAL_TIMEZONE });
    return `${datePart}, ${timePart}`;
  } catch (e) {
    return '—';
  }
};

(function initGlobalTimeSettings() {
  try {
    fetch('/api/public/system-settings')
      .then(res => res.json())
      .then(data => {
        if (data && data.system_timezone) {
          window.GLOBAL_TIMEZONE = data.system_timezone;
        }
      })
      .catch(() => {});
  } catch (e) {}
})();

window.removeStrayModalBackdrops = function() {
  try {
    document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
  } catch(e) {}
};

window.escapeHtml = function(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', window.removeStrayModalBackdrops);
  window.addEventListener('pageshow', window.removeStrayModalBackdrops);
}

/**
 * Custom Website Modal Confirmation Dialog (Replaces native browser window.confirm)
 */
window.spxConfirm = function(options) {
  return new Promise((resolve) => {
    let title = 'Confirm Action';
    let message = '';
    let confirmText = 'Confirm';
    let cancelText = 'Cancel';
    let badge = 'SPEAXA Confirmation';
    let isDanger = false;

    if (typeof options === 'string') {
      message = options;
    } else if (options && typeof options === 'object') {
      title = options.title || title;
      message = options.message || options.body || '';
      confirmText = options.confirmText || confirmText;
      cancelText = options.cancelText || cancelText;
      badge = options.badge || badge;
      isDanger = !!options.isDanger;
    }

    // Clean up text styling to guarantee high contrast
    message = message.replace(/class="text-muted"/g, 'style="color: #475569 !important; font-size: 0.85rem; line-height: 1.5; display: block;"');
    message = message.replace(/class="fw-bold text-white mb-2"/g, 'style="color: #0f172a !important; font-weight: 700 !important; font-size: 1.05rem !important; margin-bottom: 8px;"');

    let modalEl = document.getElementById('spxGlobalConfirmModal');
    if (!modalEl) {
      const div = document.createElement('div');
      div.innerHTML = `
        <div class="modal fade" id="spxGlobalConfirmModal" tabindex="-1" aria-hidden="true" style="z-index: 1095 !important;">
          <div class="modal-dialog modal-dialog-centered" style="max-width: 440px;">
            <div class="modal-content text-start" style="background: #ffffff !important; color: #0f172a !important; border: 1px solid #e2e8f0 !important; border-radius: 18px !important; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.35) !important; overflow: hidden;">
              <div class="modal-header border-0 pb-0 pt-4 px-4 align-items-center justify-content-between">
                <div class="d-flex align-items-center gap-3">
                  <div id="spxConfirmIconBox" style="width:42px; height:42px; border-radius:12px; background:#fef3c7 !important; color:#d97706 !important; display:flex; align-items:center; justify-content:center; font-size:18px; border:1px solid #fde68a !important;">
                    <i class="fas fa-exclamation-triangle"></i>
                  </div>
                  <div>
                    <h6 class="modal-title fw-bold mb-0" id="spxConfirmTitle" style="font-family:'Outfit', sans-serif; font-size: 1.08rem !important; color: #0f172a !important;">${title}</h6>
                    <span class="badge mt-1" id="spxConfirmBadge" style="font-size:0.65rem !important; font-weight:700 !important; text-transform:uppercase; letter-spacing:0.6px; padding: 4px 8px; border-radius: 6px; background:#fef3c7 !important; color:#d97706 !important;">${badge}</span>
                  </div>
                </div>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
              </div>
              <div class="modal-body px-4 py-3" style="font-size:0.94rem !important; color:#334155 !important; line-height:1.6 !important;" id="spxConfirmMessage">
                ${message}
              </div>
              <div class="modal-footer border-0 pt-2 pb-4 px-4 d-flex gap-3">
                <button type="button" class="btn flex-grow-1 py-2.5 fw-semibold" id="spxConfirmCancelBtn" data-bs-dismiss="modal" style="border-radius:12px !important; font-size:0.85rem !important; background: #f1f5f9 !important; color: #334155 !important; border: 1px solid #cbd5e1 !important; transition: all 0.2s;">${cancelText}</button>
                <button type="button" class="btn flex-grow-1 py-2.5 fw-bold" id="spxConfirmOkBtn" style="border-radius:12px !important; font-size:0.85rem !important; background: #0d9488 !important; color: #ffffff !important; border: none !important; box-shadow: 0 4px 14px rgba(13, 148, 136, 0.3) !important; transition: all 0.2s;">${confirmText}</button>
              </div>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(div);
      modalEl = document.getElementById('spxGlobalConfirmModal');
    }

    document.getElementById('spxConfirmTitle').textContent = title;
    document.getElementById('spxConfirmBadge').textContent = badge;
    document.getElementById('spxConfirmMessage').innerHTML = message.replace(/\n/g, '<br>');
    document.getElementById('spxConfirmOkBtn').textContent = confirmText;
    document.getElementById('spxConfirmCancelBtn').textContent = cancelText;

    const okBtn = document.getElementById('spxConfirmOkBtn');
    if (isDanger) {
      okBtn.style.background = '#dc2626 !important';
      okBtn.style.boxShadow = '0 4px 14px rgba(220, 38, 38, 0.3) !important';
    } else {
      okBtn.style.background = '#0d9488 !important';
      okBtn.style.boxShadow = '0 4px 14px rgba(13, 148, 136, 0.3) !important';
    }

    const bsModal = new bootstrap.Modal(modalEl, { backdrop: 'static' });

    let actionTaken = false;
    const onOk = () => {
      actionTaken = true;
      bsModal.hide();
      resolve(true);
    };

    const onHidden = () => {
      okBtn.removeEventListener('click', onOk);
      modalEl.removeEventListener('hidden.bs.modal', onHidden);
      if (!actionTaken) resolve(false);
    };

    okBtn.addEventListener('click', onOk);
    modalEl.addEventListener('hidden.bs.modal', onHidden);
    bsModal.show();
  });
};

/**
 * Formats plain text to preserve bullet points, newlines, bold text, and emojis.
 * @param {string} text - Raw text input
 * @returns {string} Safe HTML string with formatting applied
 */
window.formatRichText = function(text) {
  if (!text) return '';

  // 1. Escape HTML to prevent XSS
  let escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  // 2. Parse bold text: **text** -> <strong>text</strong>
  escaped = escaped.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

  // 3. Parse italic text: *text* -> <em>$1</em>
  escaped = escaped.replace(/\*(.*?)\*/g, '<em>$1</em>');

  // 4. Split text into lines
  const lines = escaped.split('\n');
  
  // If there is only one line, return the formatted line
  if (lines.length <= 1) {
    return escaped;
  }

  // 5. Process lines as a structured list
  const processedLines = lines.map(line => {
    let trimmed = line.trim();
    if (!trimmed) return '';

    // Regex to match starting numbers (e.g. "1. ", "1) ", "a. ")
    const numMatch = trimmed.match(/^([0-9a-zA-Z]+[\.\)]\s*)/);
    // Regex to match starting standard bullets (e.g. "- ", "* ", "• ")
    const bulletMatch = trimmed.match(/^([\-\*•⁃‣▪▫◦●■]\s*)/);
    // Regex to match starting emojis (Unicode emoji range)
    const emojiMatch = trimmed.match(/^([\uD800-\uDBFF][\uDC00-\uDFFF]|\uD83C[\uDDE6-\uDDFF]|\uD83C[\uDF00-\uDFFF]|\uD83D[\uDC00-\uDDFF]|\uD83D[\uDE00-\uDE4F]|\uD83D[\uDE80-\uDEFF]|\uD83E[\uDD00-\uDDFF]|[\u2000-\u3300]\s*)/);

    let prefix = '•'; // Default premium bullet
    let content = trimmed;

    if (numMatch) {
      prefix = numMatch[1].trim();
      content = trimmed.substring(numMatch[1].length).trim();
    } else if (bulletMatch) {
      prefix = '•';
      content = trimmed.substring(bulletMatch[1].length).trim();
    } else if (emojiMatch) {
      prefix = emojiMatch[1].trim();
      content = trimmed.substring(emojiMatch[1].length).trim();
    }

    // Return a beautifully formatted flex row with bullet alignment
    return `
      <div class="d-flex align-items-start mb-2" style="gap: 8px;">
        <span style="color: var(--primary, #3CBDB0) !important; font-weight: 700; flex-shrink: 0; min-width: 14px; text-align: center;">${prefix}</span>
        <span style="line-height: 1.5; text-align: left;">${content}</span>
      </div>
    `.trim();
  });

  return processedLines.filter(l => l !== '').join('');
};

/**
 * Translates technical error messages into clear, simplified, user-friendly messages.
 * @param {string} rawMessage - Technical or validation error message
 * @returns {string} User-friendly error message
 */
window.toFriendlyError = function(rawMessage) {
  if (!rawMessage) return 'An unexpected error occurred. Please try again.';

  const msg = rawMessage.toString().trim().toLowerCase();

  // Database unique / duplicate keys
  if (msg.includes('duplicate key') || msg.includes('violates unique constraint')) {
    if (msg.includes('email')) {
      return 'This email address is already linked to an existing account. Please log in or use a different email.';
    }
    if (msg.includes('phone') || msg.includes('mobile_number') || msg.includes('mobile')) {
      return 'This phone number is already registered. Please try logging in or use a different number.';
    }
    return 'This record already exists. Please verify your details and try again.';
  }

  // OTP Verification errors
  if (msg.includes('invalid or expired') || msg.includes('invalid otp') || msg.includes('expired otp') || msg.includes('invalid verification code')) {
    return rawMessage;
  }

  // Database syntax or internal query errors
  if (msg.includes('syntax error') || msg.includes('relation "') || msg.includes('database error') || msg.includes('foreign key constraint')) {
    return 'We encountered a technical issue while processing your request. Please try again in a few moments.';
  }

  // Auth / Credentials
  if (msg.includes('email and password are required') || msg.includes('identifier and password are required')) {
    return 'Please enter both your email address and password to log in.';
  }
  if (msg.includes('invalid credentials') || msg.includes('incorrect password') || msg.includes('user not found') || msg.includes('incorrect email or password')) {
    return 'The email address, phone number, or password you entered is incorrect. Please verify your details and try again.';
  }
  if (msg.includes('incorrect current password') || msg.includes('current password is incorrect') || msg.includes('invalid current password')) {
    return 'The current password you entered is incorrect. Please check and try again.';
  }
  if (msg.includes('password must be at least 6 characters')) {
    return 'Your password must be at least 6 characters long to secure your account.';
  }
  if (msg.includes('session expired') || msg.includes('invalid token') || msg.includes('token is required')) {
    return 'Your login session has expired. Please log in again to continue.';
  }
  if (msg.includes('unauthorized') || msg.includes('not authorized') || msg.includes('permission denied')) {
    return 'You do not have permission to perform this action.';
  }

  // Email/Phone Formats
  if (msg.includes('invalid email format') || msg.includes('email format is invalid')) {
    return 'Please enter a valid email address (for example: name@example.com).';
  }
  if (msg.includes('invalid phone number') || msg.includes('phone number is invalid')) {
    return 'Please enter a valid 10-digit mobile number.';
  }

  // Fields and requirements
  if (msg.includes('name, email, phone, role, and password are required')) {
    return 'Please fill in all the required registration details: Full Name, Email, Phone, and Password.';
  }
  if (msg.includes('role must be teacher, student, or parent')) {
    return 'Please select a valid user type (Student, Parent, or Teacher) to register.';
  }
  
  // Registration link constraints
  if (msg.includes('cannot be shared') || msg.includes('belongs to a')) {
    if (msg.includes('email')) {
      return 'This email address is already linked to a different portal account type and cannot be shared.';
    }
    if (msg.includes('phone') || msg.includes('mobile')) {
      return 'This mobile number is already in use by another account type.';
    }
    return rawMessage;
  }
  if (msg.includes('maximum limit of 2 student accounts')) {
    return 'This email or phone number is already linked to the maximum limit of 2 student accounts.';
  }

  // Course forms validation
  if (msg.includes('course title is required')) {
    return 'Please enter a clear Title for the course.';
  }
  if (msg.includes('subject is required')) {
    return 'Please specify the primary Subject area (e.g. Physics, Chemistry, Mathematics).';
  }
  if (msg.includes('description is required')) {
    return 'Please write a description of the course contents and syllabus.';
  }
  if (msg.includes('learning duration weeks is required')) {
    return 'Please specify how many weeks this course will run.';
  }
  if (msg.includes('grade is required')) {
    return 'Please select the target student Grade level.';
  }
  if (msg.includes('board is required')) {
    return 'Please select the curriculum Board standard (e.g. CBSE, ICSE).';
  }
  if (msg.includes('course fee is required') || msg.includes('fees is required') || msg.includes('fees must be')) {
    return 'Please specify the pricing amount for the course fees (digits only).';
  }
  if (msg.includes('thumbnail') || msg.includes('banner')) {
    return 'Please upload a course thumbnail cover image.';
  }
  if (msg.includes('custom badge') || msg.includes('tag line')) {
    return 'Please add a Custom Tag Line/Badge for the course overlay card.';
  }
  if (msg.includes('objective is required')) {
    return 'Please state the main learning Objective for the course.';
  }
  if (msg.includes('learning outcome is required')) {
    return 'Please outline the expected Learning Outcomes for students.';
  }
  if (msg.includes('language of instruction is required')) {
    return 'Please specify the language used to teach the class (e.g. English, Hindi).';
  }
  if (msg.includes('daily class duration is required')) {
    return 'Please define how long each live class session will last (e.g. 60 Minutes).';
  }
  if (msg.includes('assessment days is required')) {
    return 'Please specify the schedule or frequency of student assessments.';
  }

  // Batch forms validation
  if (msg.includes('select at least one day')) {
    return 'Please select the days of the week when this batch will hold live classes.';
  }
  if (msg.includes('course planner file') || msg.includes('planner file is required')) {
    return 'A syllabus PDF or document planner upload is required for the batch.';
  }
  if (msg.includes('demo video') || msg.includes('demo video is required')) {
    return 'An introductory demo video file (MP4/WebM) is required for the batch.';
  }
  if (msg.includes('batch name is required')) {
    return 'Please enter a name for the batch.';
  }

  // Fallback if no specific rule matched: clean up raw casing or return as is
  return rawMessage.charAt(0).toUpperCase() + rawMessage.slice(1);
};

// ── Global Fetch Interceptor to Prevent 'Unexpected token' JSON Parse Crashes ──
if (typeof Response !== 'undefined' && Response.prototype && Response.prototype.json) {
  const originalJson = Response.prototype.json;
  Response.prototype.json = async function() {
    const contentType = this.headers.get("content-type");
    const isJson = contentType && contentType.indexOf("application/json") !== -1;

    if (!this.ok) {
      const requestUrl = (this.url || '').toLowerCase();
      const isAuthPath = requestUrl.includes('/auth/') || requestUrl.includes('/login') || requestUrl.includes('/register') || requestUrl.includes('/verify');

      if (this.status === 401 && !isAuthPath) {
        if (typeof logout === 'function') logout();
        if (typeof handleLogout === 'function') handleLogout();
      }
      if (this.status === 413) {
        throw new Error("File is too large. Maximum permitted size is 20MB for documents and 200MB for video proofs.");
      }
      if (isJson) {
        const err = await originalJson.call(this);
        throw new Error(err.error || err.message || 'Request failed');
      } else {
        const text = await this.text();
        throw new Error(`Server error (${this.status}): ${text.slice(0, 100) || 'Internal Server Error'}...`);
      }
    }

    if (!isJson) {
      const text = await this.text();
      if (this.status === 413) {
        throw new Error("File is too large. Maximum permitted size is 20MB for documents and 200MB for video proofs.");
      }
      throw new Error(`Server returned invalid response formatting (${this.status}): ${text.slice(0, 100)}...`);
    }

    return originalJson.call(this);
  };
}

/**
 * Wraps rich formatted text in a collapsible container with a "See More / See Less" toggle if it exceeds the limit.
 * @param {string} text - Raw text input
 * @param {number} limit - Character limit before truncating (default: 150)
 * @returns {string} Collapsible HTML string
 */
window.formatCollapsibleText = function(text, limit = 150) {
  if (!text || typeof text !== 'string') return '';
  const clean = text.trim();
  if (clean.length <= limit) {
    return window.formatRichText(clean);
  }
  const id = 'col_' + Math.random().toString(36).substring(2, 9);
  
  // Truncate cleanly at a word boundary near the limit
  let truncated = clean.substring(0, limit);
  const lastSpace = truncated.lastIndexOf(' ');
  if (lastSpace > limit * 0.6) {
    truncated = truncated.substring(0, lastSpace);
  }

  return `
    <div id="parent_${id}" class="spx-collapsible-wrapper" style="display:inline;">
      <span id="short_${id}" class="spx-collapsible-short">
        ${window.formatRichText(truncated)}...
        <button type="button" class="btn btn-link p-0 ms-1 fw-bold text-primary text-decoration-none shadow-none" style="font-size:0.8rem; vertical-align:baseline; border:none; background:none; line-height:1;" onclick="window.toggleCollapsibleText('${id}')">
          See More <i class="fas fa-chevron-down ms-1" style="font-size:0.65rem;"></i>
        </button>
      </span>
      <span id="full_${id}" class="spx-collapsible-full d-none">
        ${window.formatRichText(clean)}
        <button type="button" class="btn btn-link p-0 ms-1 fw-bold text-primary text-decoration-none shadow-none" style="font-size:0.8rem; vertical-align:baseline; border:none; background:none; line-height:1;" onclick="window.toggleCollapsibleText('${id}')">
          See Less <i class="fas fa-chevron-up ms-1" style="font-size:0.65rem;"></i>
        </button>
      </span>
    </div>
  `.trim();
};

window.toggleCollapsibleText = function(id) {
  const shortEl = document.getElementById(`short_${id}`);
  const fullEl = document.getElementById(`full_${id}`);
  if (shortEl && fullEl) {
    const isShortHidden = shortEl.classList.contains('d-none');
    if (isShortHidden) {
      shortEl.classList.remove('d-none');
      fullEl.classList.add('d-none');
    } else {
      shortEl.classList.add('d-none');
      fullEl.classList.remove('d-none');
    }
  }
};

/**
 * Sets button loading state with spinner animation and disables button during async operation.
 * @param {HTMLElement|string} btnOrId - Button element or button element ID
 * @param {boolean} isLoading - True to show loading state, false to restore
 * @param {string} [loadingText='Please wait...'] - Text to show during loading state
 */
window.setButtonLoading = function(btnOrId, isLoading, loadingText = 'Please wait...') {
  const btn = typeof btnOrId === 'string' ? document.getElementById(btnOrId) : btnOrId;
  if (!btn) return;
  if (isLoading) {
    if (!btn.dataset.origHtml) {
      btn.dataset.origHtml = btn.innerHTML;
    }
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>${loadingText}`;
  } else {
    if (btn.dataset.origHtml) {
      btn.innerHTML = btn.dataset.origHtml;
      delete btn.dataset.origHtml;
    }
    btn.disabled = false;
  }
};

/**
 * Starts a 5-minute (300 seconds) disabled cooldown timer for Resend buttons.
 * Displays countdown timer format e.g. "Resend in 04:59".
 * @param {HTMLElement|string} btnOrId - Button element or element ID
 * @param {number} [durationSeconds=300] - Cooldown duration in seconds (default 300s / 5 mins)
 */
window.startResendCooldown = function(btnOrId, durationSeconds = 300) {
  const btn = typeof btnOrId === 'string' ? document.getElementById(btnOrId) : btnOrId;
  if (!btn) return;
  
  if (btn._cooldownInterval) clearInterval(btn._cooldownInterval);

  if (durationSeconds <= 0) {
    if (btn.dataset.origResendHtml) {
      btn.innerHTML = btn.dataset.origResendHtml;
      delete btn.dataset.origResendHtml;
    }
    btn.disabled = false;
    return;
  }

  let remaining = durationSeconds;
  btn.disabled = true;
  if (!btn.dataset.origResendHtml) {
    btn.dataset.origResendHtml = btn.innerHTML;
  }

  function updateDisplay() {
    const mins = Math.floor(remaining / 60);
    const secs = remaining % 60;
    const timeStr = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    btn.innerHTML = `<i class="fas fa-clock me-1"></i>Resend in ${timeStr}`;
  }

  updateDisplay();

  btn._cooldownInterval = setInterval(() => {
    remaining--;
    if (remaining <= 0) {
      clearInterval(btn._cooldownInterval);
      btn.innerHTML = btn.dataset.origResendHtml || 'Resend';
      btn.disabled = false;
      delete btn.dataset.origResendHtml;
    } else {
      updateDisplay();
    }
  }, 1000);
};

window.startGlobalResendCooldown = function(durationSeconds = 60) {
  const now = Date.now();
  const endTime = now + (durationSeconds * 1000);
  localStorage.setItem('spx_resend_cooldown_end_time', String(endTime));
  window.syncAllResendButtons();
};

window.syncAllResendButtons = function() {
  if (window._resendSyncInterval) clearInterval(window._resendSyncInterval);

  const endTimeStr = localStorage.getItem('spx_resend_cooldown_end_time');
  if (!endTimeStr) return;

  const endTime = parseInt(endTimeStr, 10);
  
  function updateAll() {
    const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
    
    // Select all resend buttons across banners, modals, and profile cards
    const buttons = document.querySelectorAll(
      '#btnBannerResendEmail, #btnModalResendEmail, #btnProfileResendEmail, #btnParentResendOtp, .btn-profile-resend-email, button[onclick*="resendEmailVerificationLink"], button[onclick*="resendProfileEmailLink"], button[onclick*="resendParentEmailVerificationLink"]'
    );

    if (remaining <= 0) {
      clearInterval(window._resendSyncInterval);
      localStorage.removeItem('spx_resend_cooldown_end_time');

      buttons.forEach(btn => {
        if (btn.dataset.origResendHtml) {
          btn.innerHTML = btn.dataset.origResendHtml;
          delete btn.dataset.origResendHtml;
        } else {
          btn.innerHTML = '<i class="fas fa-paper-plane me-1"></i>Resend Link';
        }
        btn.disabled = false;
        btn.style.pointerEvents = 'auto';
        btn.style.opacity = '1';
      });
      return;
    }

    const mins = Math.floor(remaining / 60);
    const secs = remaining % 60;
    const timeStr = mins > 0 ? `${mins}:${secs < 10 ? '0' : ''}${secs}` : `${secs}s`;

    buttons.forEach(btn => {
      btn.disabled = true;
      btn.style.pointerEvents = 'none';
      btn.style.opacity = '0.6';
      if (!btn.dataset.origResendHtml) {
        btn.dataset.origResendHtml = btn.innerHTML;
      }
      btn.innerHTML = `<i class="fas fa-clock me-1"></i>Resend in ${timeStr}`;
    });
  }

  updateAll();
  window._resendSyncInterval = setInterval(updateAll, 1000);
};

// Automatically sync interlinked buttons on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => window.syncAllResendButtons());
} else {
  setTimeout(() => window.syncAllResendButtons(), 100);
}

/**
 * Strict Email Address Validator
 * @param {string} email
 * @returns {boolean}
 */
window.isValidEmail = function(email) {
  if (!email || typeof email !== 'string') return false;
  const cleanEmail = email.trim();
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(cleanEmail);
};

/**
 * Strict 10-Digit Mobile Number Validator
 * Validates that the input contains EXACTLY 10 digits (excluding optional +91 prefix).
 * @param {string} phone
 * @returns {{ valid: boolean, cleanPhone: string, formattedPhone: string, error?: string }}
 */
window.isValidMobile10 = function(phone) {
  if (!phone || typeof phone !== 'string') {
    return { valid: false, cleanPhone: '', formattedPhone: '', error: 'Mobile number is required.' };
  }

  let raw = phone.trim();
  let digits = raw.replace(/[^0-9]/g, '');

  // Strip leading 91 if length is 12 and starts with 91
  if (digits.length === 12 && digits.startsWith('91')) {
    digits = digits.slice(2);
  } else if (digits.length === 11 && digits.startsWith('0')) {
    digits = digits.slice(1);
  }

  if (digits.length === 0) {
    return { valid: false, cleanPhone: '', formattedPhone: '', error: 'Please enter a 10-digit mobile number.' };
  }

  if (digits.length !== 10) {
    return { valid: false, cleanPhone: digits, formattedPhone: '+91' + digits, error: `Mobile number must contain exactly 10 digits (you entered ${digits.length} digits).` };
  }

  if (!/^[6-9]/.test(digits)) {
    return { valid: false, cleanPhone: digits, formattedPhone: '+91' + digits, error: 'Mobile number must start with 6, 7, 8, or 9.' };
  }

  return { valid: true, cleanPhone: digits, formattedPhone: '+91' + digits };
};

/**
 * Attaches real-time 10-digit phone restrictions to an input element.
 * Automatically strips non-digit characters and caps input length to 10 digits.
 * @param {HTMLInputElement|string} inputOrId
 */
window.attachPhone10DigitRestriction = function(inputOrId) {
  const el = typeof inputOrId === 'string' ? document.getElementById(inputOrId) : inputOrId;
  if (!el || el._phoneRestricted) return;
  el._phoneRestricted = true;

  el.setAttribute('maxlength', '13'); // Allow +91 plus 10 digits or 10 digits
  el.addEventListener('input', function() {
    let val = this.value;
    if (val.startsWith('+91')) {
      let digits = val.slice(3).replace(/[^0-9]/g, '').slice(0, 10);
      this.value = '+91 ' + digits;
    } else if (val.startsWith('+')) {
      let digits = val.slice(1).replace(/[^0-9]/g, '').slice(0, 12);
      this.value = '+' + digits;
    } else {
      let digits = val.replace(/[^0-9]/g, '').slice(0, 10);
      this.value = digits;
    }
  });
};

// Automatically bind 10-digit phone restriction for phone inputs
document.addEventListener('DOMContentLoaded', function() {
  const phoneSelectors = [
    'input[type="tel"]',
    '#regPhone',
    '#otpPhone',
    '#regMobileNumber',
    '#checkoutPhone',
    '#contactPhone',
    '#smsPhone',
    '#verifyPhoneNumberInput'
  ];
  phoneSelectors.forEach(selector => {
    document.querySelectorAll(selector).forEach(el => {
      window.attachPhone10DigitRestriction(el);
    });
  });
});

/**
 * Universal Attachment Preview & Remove Handler for PDF, PNG, MP4, Documents, etc.
 * @param {HTMLInputElement} inputEl
 * @param {string} [customPreviewId]
 */
window.handleAttachmentSelect = function(inputEl, customPreviewId) {
  if (!inputEl) return;
  const file = inputEl.files && inputEl.files[0];
  const previewId = customPreviewId || (`preview_${inputEl.id || Math.random().toString(36).substr(2, 9)}`);
  
  let previewContainer = document.getElementById(previewId);
  if (!previewContainer) {
    previewContainer = document.createElement('div');
    previewContainer.id = previewId;
    previewContainer.className = 'attachment-preview-bar mt-2 p-2.5 rounded-3 d-flex align-items-center justify-content-between shadow-sm';
    previewContainer.style.cssText = 'background: rgba(60, 189, 176, 0.08); border: 1px solid rgba(60, 189, 176, 0.25); transition: all 0.2s ease;';
    inputEl.parentNode.insertBefore(previewContainer, inputEl.nextSibling);
  }

  if (!file) {
    previewContainer.classList.add('d-none');
    previewContainer.innerHTML = '';
    return;
  }

  const name = file.name || 'Selected Attachment';
  const size = file.size ? (file.size > 1048576 ? (file.size / 1048576).toFixed(2) + ' MB' : (file.size / 1024).toFixed(1) + ' KB') : '';
  const ext = (name.split('.').pop() || '').toLowerCase();

  let iconClass = 'fa-file-alt text-primary';
  if (['pdf'].includes(ext)) iconClass = 'fa-file-pdf text-danger';
  else if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) iconClass = 'fa-file-image text-info';
  else if (['mp4', 'webm', 'mov', 'avi', 'mkv', 'flv', '3gp'].includes(ext)) iconClass = 'fa-file-video text-warning';
  else if (['doc', 'docx'].includes(ext)) iconClass = 'fa-file-word text-primary';
  else if (['zip', 'rar', '7z'].includes(ext)) iconClass = 'fa-file-archive text-secondary';

  previewContainer.innerHTML = `
    <div class="d-flex align-items-center gap-2.5 overflow-hidden me-2">
      <div style="width:36px; height:36px; border-radius:8px; background:#ffffff; display:flex; align-items:center; justify-content:center; flex-shrink:0; box-shadow:0 2px 4px rgba(0,0,0,0.06);">
        <i class="fas ${iconClass} fs-5"></i>
      </div>
      <div class="text-truncate">
        <div class="fw-bold text-dark small text-truncate mb-0" title="${name}">${name}</div>
        <div class="text-muted" style="font-size:0.72rem;">${size ? size + ' • ' : ''}<span class="text-uppercase fw-semibold" style="color:var(--teal, #0d7a6d);">${ext} file</span></div>
      </div>
    </div>
    <button type="button" class="btn btn-sm btn-outline-danger border-0 p-1 px-2.5 rounded-pill d-flex align-items-center gap-1 flex-shrink-0" onclick="window.removeAttachment('${inputEl.id || ''}', '${previewId}', this)" title="Remove Attachment">
      <i class="fas fa-times-circle" style="font-size:0.95rem;"></i>
      <span class="small fw-bold">Remove</span>
    </button>
  `;
  previewContainer.classList.remove('d-none');
};

/**
 * Universal Remove Attachment Function
 * @param {string} inputId
 * @param {string} previewId
 * @param {HTMLElement} [btnEl]
 */
window.removeAttachment = function(inputId, previewId, btnEl) {
  if (inputId) {
    const input = document.getElementById(inputId);
    if (input) input.value = '';
  }
  const preview = (previewId ? document.getElementById(previewId) : null) || (btnEl ? btnEl.closest('.attachment-preview-bar') : null);
  if (preview) {
    preview.classList.add('d-none');
    preview.innerHTML = '';
  }
  if (typeof showToast === 'function') {
    showToast('Attachment removed', 'info');
  }
};

// Global delegation listener for file inputs on change
document.addEventListener('change', function(e) {
  if (e.target && e.target.tagName === 'INPUT' && e.target.type === 'file') {
    if (!e.target.dataset.noPreview && e.target.id !== 'teacherAvatarInput' && e.target.id !== 'studentAvatarInput' && e.target.id !== 'parentAvatarInput' && e.target.id !== 'adminAvatarSidebar') {
      window.handleAttachmentSelect(e.target);
    }
  }
});

/**
 * Universal Date & Time Picker Opener
 * Automatically opens native calendar/time picker when clicking anywhere on a date/time input field,
 * its prefix icon, or its input-group wrapper container.
 */
document.addEventListener('click', function(e) {
  let targetInput = null;
  const el = e.target;

  if (el && el.tagName === 'INPUT' && ['date', 'time', 'datetime-local'].includes(el.type)) {
    targetInput = el;
  } else if (el) {
    const parentGroup = el.closest('.input-group, .mb-3, .form-group');
    if (parentGroup) {
      targetInput = parentGroup.querySelector('input[type="date"], input[type="time"], input[type="datetime-local"]');
    }
  }

  if (targetInput) {
    try {
      if (typeof targetInput.showPicker === 'function') {
        targetInput.showPicker();
      } else {
        targetInput.focus();
      }
    } catch (err) {
      targetInput.focus();
    }
  }
});

// Inject cursor style for date/time input fields and icons
(function() {
  if (typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.textContent = `
      input[type="date"], input[type="time"], input[type="datetime-local"],
      .input-group-text, .input-group {
        cursor: pointer !important;
      }
    `;
    if (document.head) document.head.appendChild(style);
    else document.addEventListener('DOMContentLoaded', () => document.head.appendChild(style));
  }
})();
