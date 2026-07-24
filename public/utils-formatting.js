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
