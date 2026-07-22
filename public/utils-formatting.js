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
      if (this.status === 401) {
        if (typeof logout === 'function') logout();
        if (typeof handleLogout === 'function') handleLogout();
      }
      if (this.status === 413) {
        throw new Error("File is too large. Maximum permitted size is 20MB for documents and 200MB for video proofs.");
      }
      if (isJson) {
        const err = await originalJson.call(this);
        throw new Error(err.error || 'Request failed');
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
 * Wraps rich formatted text in a collapsible container if it exceeds the specified character limit.
 * @param {string} text - Raw text input
 * @param {number} limit - Character limit before truncating (default: 250)
 * @returns {string} Collapsible HTML string
 */
window.formatCollapsibleText = function(text, limit = 250) {
  if (!text) return '';
  if (text.length <= limit) {
    return window.formatRichText(text);
  }
  const id = 'col_' + Math.random().toString(36).substr(2, 9);
  return `
    <div id="parent_${id}">
      <div id="text_${id}" style="max-height: 80px; overflow: hidden; position: relative; transition: max-height 0.3s ease;">
        ${window.formatRichText(text)}
      </div>
      <button class="read-more-btn" id="btn_${id}" onclick="window.toggleCollapsibleText('${id}')" style="background:none; border:none; color:var(--primary, #3CBDB0); font-weight:600; font-size:0.75rem; padding:4px 0; cursor:pointer; display:inline-flex; align-items:center; gap:4px;">
        Read More <i class="fas fa-chevron-down small" style="font-size:0.65rem;"></i>
      </button>
    </div>
  `.trim();
};

window.toggleCollapsibleText = function(id) {
  const container = document.getElementById(`text_${id}`);
  const button = document.getElementById(`btn_${id}`);
  
  if (container.style.maxHeight === 'none') {
    container.style.maxHeight = '80px';
    button.innerHTML = 'Read More <i class="fas fa-chevron-down small" style="font-size:0.65rem;"></i>';
  } else {
    container.style.maxHeight = 'none';
    button.innerHTML = 'Read Less <i class="fas fa-chevron-up small" style="font-size:0.65rem;"></i>';
  }
};
