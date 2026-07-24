// SPEAXA Teacher Portal JS
const API = '/api';
const defaultAvatar = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2NiZDVlMSI+PHBhdGggZD0iTTEyIDEyYzIuMjEgMCA0LTEuNzkgNC00cy0xLjc5LTQtNC00LTQgMS53OS00IDQgMS53OSA0IDQgNHptMCAyYy0yLjY3IDAtOCAxLjM0LTggNHYyaDE2di0yYzAtMi42Ni01LjMzLTQtOC00eiIvPjwvc3ZnPg==';
let token = localStorage.getItem('teacher_token') || sessionStorage.getItem('teacher_token');
let user = JSON.parse(localStorage.getItem('teacher_user') || sessionStorage.getItem('teacher_user') || 'null');

let toastEl = document.getElementById('toastEl');
let Toast = toastEl ? new bootstrap.Toast(toastEl, { delay: 3000 }) : null;

function showToast(msg, type = 'success') {
  if (!Toast) {
    alert((type === 'error' || type === 'danger') ? toFriendlyError(msg) : msg);
    return;
  }
  const icons = { success:'fa-check-circle', error:'fa-exclamation-circle', warning:'fa-exclamation-triangle', info:'fa-info-circle' };
  const colors = { success:'#10B981', error:'#EF4444', warning:'#F59E0B', info:'#3CBDB0' };
  document.getElementById('toastMsg').textContent = (type === 'error' || type === 'danger') ? toFriendlyError(msg) : msg;
  document.getElementById('toastIcon').className = `fas ${icons[type] || 'fa-info-circle'}`;
  document.getElementById('toastIcon').style.color = colors[type] || '#3CBDB0';
  Toast.show();
}

async function parseFetchResponse(res) {
  if (res.status === 401) { logout(); throw new Error('Session expired'); }
  const contentType = res.headers.get("content-type");
  const isJson = contentType && contentType.indexOf("application/json") !== -1;
  
  if (!res.ok) {
    if (res.status === 413) {
      throw new Error("File is too large. Maximum permitted size is 20MB for documents and 200MB for video proofs.");
    }
    if (isJson) {
      const err = await res.json();
      throw new Error(err.error || 'Request failed');
    } else {
      const text = await res.text();
      throw new Error(`Server error (${res.status}): ${text.slice(0, 100)}...`);
    }
  }
  
  if (isJson) {
    return res.json();
  } else {
    return { message: await res.text() };
  }
}

async function api(path, opts = {}) {
  const options = typeof opts === 'string' ? { method: opts } : opts;
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  return parseFetchResponse(res);
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

function switchLoginMode(mode) {
  const errEl = document.getElementById('loginError');
  if (errEl) errEl.classList.add('d-none');
  const btnPass = document.getElementById('btnModePassword');
  const btnOtp = document.getElementById('btnModeOtp');
  const formPass = document.getElementById('loginPassForm');
  const formOtp = document.getElementById('loginOtpForm');

  if (mode === 'password') {
    btnPass.style.background = '#0d7a6d';
    btnPass.style.color = '#ffffff';
    btnOtp.style.background = 'transparent';
    btnOtp.style.color = '#64748b';
    formPass.classList.remove('d-none');
    formOtp.classList.add('d-none');
  } else {
    btnOtp.style.background = '#0d7a6d';
    btnOtp.style.color = '#ffffff';
    btnPass.style.background = 'transparent';
    btnPass.style.color = '#64748b';
    formOtp.classList.remove('d-none');
    formPass.classList.add('d-none');
    setupOtpBoxListeners('tLoginOtpBoxes', 'loginOtpVal');
  }
}

async function sendMobileLoginOTP() {
  const phone = document.getElementById('otpPhone')?.value.trim();
  const errEl = document.getElementById('loginError');
  if (errEl) errEl.classList.add('d-none');

  if (window.isValidMobile10) {
    const mobCheck = window.isValidMobile10(phone);
    if (!mobCheck.valid) {
      if (errEl) {
        errEl.textContent = mobCheck.error;
        errEl.classList.remove('d-none');
      }
      return;
    }
  } else if (!phone || phone.length < 10) {
    if (errEl) {
      errEl.textContent = 'Please enter a valid 10-digit registered mobile number';
      errEl.classList.remove('d-none');
    }
    return;
  }

  setButtonLoading('btnSendLoginSms', true, 'Sending SMS...');
  try {
    const res = await fetch(`${API}/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, identifier: phone, purpose: 'login' })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to send SMS OTP');

    document.getElementById('loginOtpStep1').classList.add('d-none');
    document.getElementById('loginOtpStep2').classList.remove('d-none');
    const disp = document.getElementById('loginPhoneDisplay');
    if (disp) disp.textContent = phone.startsWith('+') ? phone : '+91 ' + phone.replace(/^91/, '');
    setupOtpBoxListeners('tLoginOtpBoxes', 'loginOtpVal');
    showToast(data.message || 'SMS OTP sent to mobile number', 'success');
  } catch (err) {
    if (errEl) {
      errEl.textContent = toFriendlyError(err.message);
      errEl.classList.remove('d-none');
    }
  } finally {
    setButtonLoading('btnSendLoginSms', false);
  }
}

async function verifyMobileLoginOTP() {
  const phone = document.getElementById('otpPhone')?.value.trim();
  const otpCode = document.getElementById('loginOtpVal')?.value.trim();
  const errEl = document.getElementById('loginError');
  if (errEl) errEl.classList.add('d-none');

  if (!otpCode || otpCode.length < 6) {
    if (errEl) {
      errEl.textContent = 'Please enter the 6-digit SMS OTP code';
      errEl.classList.remove('d-none');
    }
    return;
  }

  setButtonLoading('btnVerifyLoginSms', true, 'Verifying...');
  try {
    const res = await fetch(`${API}/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, identifier: phone, otp: otpCode, purpose: 'login' })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Invalid OTP code');

    saveAuth(data.token, data.user);
  } catch (err) {
    if (errEl) {
      errEl.textContent = toFriendlyError(err.message);
      errEl.classList.remove('d-none');
    }
  } finally {
    setButtonLoading('btnVerifyLoginSms', false);
  }
}

function cancelMobileLoginOtp() {
  document.getElementById('loginOtpStep2').classList.add('d-none');
  document.getElementById('loginOtpStep1').classList.remove('d-none');
  const errEl = document.getElementById('loginError');
  if (errEl) errEl.classList.add('d-none');
}

async function doLogin() {
  const btn = document.getElementById('btnLogin');
  const errEl = document.getElementById('loginError');
  if (errEl) {
    errEl.classList.add('d-none');
    errEl.innerHTML = '';
  }

  const emailEl = document.getElementById('loginEmail');
  const passEl = document.getElementById('loginPassword');
  const emailVal = emailEl ? emailEl.value.trim() : '';
  const passVal = passEl ? passEl.value.trim() : '';

  if (!emailVal || (window.isValidEmail && !window.isValidEmail(emailVal))) {
    if (errEl) {
      errEl.innerHTML = '<i class="fas fa-exclamation-circle me-1"></i> Please enter a valid registered email address (e.g. name@example.com).';
      errEl.classList.remove('d-none');
    }
    if (emailEl) emailEl.focus();
    return;
  }

  if (!passVal) {
    if (errEl) {
      errEl.innerHTML = '<i class="fas fa-exclamation-circle me-1"></i> Please enter your password.';
      errEl.classList.remove('d-none');
    }
    if (passEl) passEl.focus();
    return;
  }

  if (window.setButtonLoading) window.setButtonLoading(btn, true, 'Logging in...');

  try {
    const res = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailVal, password: passVal, role: 'teacher' })
    });
    const data = await res.json();

    if (!res.ok) {
      if (data.status === 'email_not_verified') {
        throw new Error(`Please verify your email address (${data.email || emailVal}) before logging in. A verification link has been sent to your email inbox.`);
      }
      throw new Error(data.error || 'Login failed. Please check your credentials.');
    }
    saveAuth(data.token, data.user);
  } catch(e) {
    if (errEl) {
      errEl.innerHTML = `<i class="fas fa-exclamation-circle me-1"></i> ${toFriendlyError(e.message)}`;
      errEl.classList.remove('d-none');
    }
  } finally {
    if (window.setButtonLoading) window.setButtonLoading(btn, false);
  }
}

async function doRegister() {
  const isOtpStep = document.getElementById('registerOtpSection') && !document.getElementById('registerOtpSection').classList.contains('d-none');
  const targetBtn = isOtpStep ? document.getElementById('btnVerifyRegOtp') : document.getElementById('btnRegister');
  if (window.setButtonLoading) window.setButtonLoading(targetBtn, true, isOtpStep ? 'Verifying OTP...' : 'Creating Account...');
  
  const errEl = document.getElementById('registerError');
  if (errEl) {
    errEl.classList.add('d-none');
    errEl.innerHTML = '';
  }

  try {
    const payload = {
      name: document.getElementById('regName')?.value.trim() || '',
      email: document.getElementById('regEmail')?.value.trim() || '',
      phone: document.getElementById('regPhone')?.value.trim() || '',
      password: document.getElementById('regPassword')?.value || '',
      alt_email: document.getElementById('regAltEmail')?.value.trim() || '',
      mobile_number: document.getElementById('regMobileNumber')?.value.trim() || '',
      social_links: {
        linkedin: document.getElementById('regLinkedIn')?.value.trim() || '',
        twitter: document.getElementById('regTwitter')?.value.trim() || ''
      },
      qualification: document.getElementById('regQualification')?.value.trim() || '',
      subject_expertise: document.getElementById('regSubjects')?.value.trim() || '',
      experience_years: parseInt(document.getElementById('regExp')?.value) || 0,
      languages: document.getElementById('regLanguages')?.value.trim() || '',
      referred_by_code: document.getElementById('regReferralCode') ? document.getElementById('regReferralCode').value.trim() : '',
      role: 'teacher',
    };

    // List of required fields for teacher registration validation
    const requiredFields = [
      { id: 'regName', label: 'Full Name' },
      { id: 'regEmail', label: 'Email Address' },
      { id: 'regPhone', label: 'Contact Phone' },
      { id: 'regPassword', label: 'Password' },
      { id: 'regAltEmail', label: 'Alternative Email' },
      { id: 'regMobileNumber', label: 'WhatsApp / Mobile Number' },
      { id: 'regQualification', label: 'Highest Academic Qualification' },
      { id: 'regSubjects', label: 'Subject Expertise' },
      { id: 'regExp', label: 'Experience Years' },
      { id: 'regLanguages', label: 'Languages of Instruction' }
    ];

    // Clear previous invalid markings
    requiredFields.forEach(f => {
      const el = document.getElementById(f.id);
      if (el) {
        el.classList.remove('is-invalid', 'border-danger');
      }
    });

    const missingFields = [];
    let firstInvalidEl = null;

    requiredFields.forEach(f => {
      const el = document.getElementById(f.id);
      if (el) {
        const val = el.value ? el.value.trim() : '';
        if (!val) {
          missingFields.push(f.label);
          el.classList.add('is-invalid', 'border-danger');
          if (!firstInvalidEl) firstInvalidEl = el;
        }
      }
    });

    if (missingFields.length > 0) {
      if (firstInvalidEl) {
        firstInvalidEl.focus();
        firstInvalidEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      const listItems = missingFields.map(f => `<li>${f}</li>`).join('');
      throw new Error(`Please fill in the following required fields:<ul class="mb-0 mt-1 pl-3 text-start">${listItems}</ul>`);
    }

    if (window.isValidEmail && !window.isValidEmail(payload.email)) {
      const emailEl = document.getElementById('regEmail');
      if (emailEl) {
        emailEl.classList.add('is-invalid', 'border-danger');
        emailEl.focus();
      }
      throw new Error('Please enter a valid email address (e.g. name@example.com).');
    }

    if (window.isValidEmail && payload.alt_email && !window.isValidEmail(payload.alt_email)) {
      const altEmailEl = document.getElementById('regAltEmail');
      if (altEmailEl) {
        altEmailEl.classList.add('is-invalid', 'border-danger');
        altEmailEl.focus();
      }
      throw new Error('Please enter a valid alternative email address.');
    }

    if (window.isValidMobile10) {
      const mobCheck = window.isValidMobile10(payload.phone);
      if (!mobCheck.valid) {
        const phoneEl = document.getElementById('regPhone');
        if (phoneEl) {
          phoneEl.classList.add('is-invalid', 'border-danger');
          phoneEl.focus();
        }
        throw new Error(mobCheck.error);
      }
      const whatsappCheck = window.isValidMobile10(payload.mobile_number);
      if (!whatsappCheck.valid) {
        const mobEl = document.getElementById('regMobileNumber');
        if (mobEl) {
          mobEl.classList.add('is-invalid', 'border-danger');
          mobEl.focus();
        }
        throw new Error('WhatsApp / Mobile Number: ' + whatsappCheck.error);
      }
    }

    if (document.getElementById('regTermsAgree') && !document.getElementById('regTermsAgree').checked) {
      const termsEl = document.getElementById('regTermsAgree');
      termsEl.focus();
      termsEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      throw new Error('You must agree to the Terms of Service & Privacy Policy');
    }

    if (window._tRegPhoneOtpPending) {
      payload.phoneOtp = window._tRegPhoneOtpPending;
    }
    if (window._tRegEmailOtpPending) {
      payload.emailOtp = window._tRegEmailOtpPending;
    }

    const res = await fetch(`${API}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();

    if (!res.ok || data.error) {
      if (document.getElementById('registerOtpSection') && !document.getElementById('registerOtpSection').classList.contains('d-none')) {
        const otpErr = document.getElementById('registerOtpError');
        if (otpErr) {
          otpErr.innerHTML = toFriendlyError(data.error || 'Registration failed');
          otpErr.classList.remove('d-none');
        }
      } else {
        throw new Error(data.error || 'Registration failed');
      }
      window._tRegPhoneOtpPending = null;
      window._tRegEmailOtpPending = null;
      return;
    }

    if (data.status === 'otp_sent') {
      document.getElementById('registerSection').classList.add('d-none');
      document.getElementById('registerOtpSection').classList.remove('d-none');
      const phoneDisp = document.getElementById('regPhoneDisplay');
      if (phoneDisp) {
        phoneDisp.textContent = payload.phone ? ('+91 ' + payload.phone.replace(/^91/, '')) : 'Mobile Number';
      }
      setupOtpBoxListeners('tRegOtpBoxes', 'regEmailOtpInput');
      return;
    }

    window._tRegPhoneOtpPending = null;
    window._tRegEmailOtpPending = null;
    clearAutoSave('autosave_teacher_register');
    if (data.status === 'verification_pending') {
      window.location.href = `/verify.html?email=${encodeURIComponent(data.email)}&step=${data.step}&firebaseCustomToken=${encodeURIComponent(data.firebaseCustomToken || '')}`;
      return;
    }
    if (data.token) {
      saveAuth(data.token, data.user);
    } else {
      showToast('Registration successful! Please login.', 'success');
      switchTab('login');
    }
  } catch(e) {
    if (document.getElementById('registerOtpSection') && !document.getElementById('registerOtpSection').classList.contains('d-none')) {
      const otpErr = document.getElementById('registerOtpError');
      if (otpErr) {
        otpErr.textContent = toFriendlyError(e.message);
        otpErr.classList.remove('d-none');
      }
    } else {
      window._tRegPhoneOtpPending = null;
      window._tRegEmailOtpPending = null;
      const errEl = document.getElementById('registerError');
      if (errEl) {
        errEl.innerHTML = toFriendlyError(e.message);
        errEl.classList.remove('d-none');
      }
    }
  } finally {
    if (window.setButtonLoading) window.setButtonLoading(targetBtn, false);
  }
}

async function submitRegisterOtp() {
  const emailOtpVal = document.getElementById('regEmailOtpInput').value.trim();
  const otpErr = document.getElementById('registerOtpError');
  if (otpErr) otpErr.classList.add('d-none');
  if (!emailOtpVal || emailOtpVal.length < 4) {
    if (otpErr) {
      otpErr.textContent = 'Please enter your 6-digit verification code';
      otpErr.classList.remove('d-none');
    }
    return;
  }
  window._tRegPhoneOtpPending = null;
  window._tRegEmailOtpPending = emailOtpVal;
  doRegister();
}

function cancelRegisterOtp() {
  window._tRegPhoneOtpPending = null;
  window._tRegEmailOtpPending = null;
  const otpErr = document.getElementById('registerOtpError');
  if (otpErr) otpErr.classList.add('d-none');
  document.getElementById('registerOtpSection').classList.add('d-none');
  document.getElementById('registerSection').classList.remove('d-none');
}

async function resendRegisterOtp(evtBtn) {
  const btn = evtBtn || document.querySelector('#registerOtpSection button[onclick*="resendRegisterOtp"]') || event?.target;
  if (window.startResendCooldown && btn) {
    window.startResendCooldown(btn, 300);
  }
  window._tRegPhoneOtpPending = null;
  window._tRegEmailOtpPending = null;
  const otpErr = document.getElementById('registerOtpError');
  if (otpErr) otpErr.classList.add('d-none');
  showToast('Resending verification code...', 'info');
  doRegister();
}

async function sendForgotOTP() {
  const btn = document.getElementById('btnSendForgot') || event?.target;
  const emailEl = document.getElementById('forgotEmail');
  const email = emailEl ? emailEl.value.trim() : '';
  if (!email) {
    showToast('Please enter your email address', 'error');
    if (emailEl) emailEl.focus();
    return;
  }

  if (window.setButtonLoading) window.setButtonLoading(btn, true, 'Sending OTP...');
  try {
    const res = await fetch(`${API}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to send reset OTP');
    showToast(data.message || 'OTP sent to your email!', 'success');
    if (data.otp) {
      const resetOtpInput = document.getElementById('resetOTP');
      if (resetOtpInput) resetOtpInput.value = data.otp;
      showToast(`Dev OTP: ${data.otp}`, 'info');
    }
    const resetSec = document.getElementById('resetSection');
    if (resetSec) resetSec.classList.remove('d-none');
  } catch(e) {
    showToast(toFriendlyError(e.message), 'error');
  } finally {
    if (window.setButtonLoading) window.setButtonLoading(btn, false);
  }
}

async function doReset() {
  const btn = document.getElementById('btnDoReset') || event?.target;
  const email = document.getElementById('forgotEmail')?.value.trim();
  const otp = document.getElementById('resetOTP')?.value.trim();
  const newPassword = document.getElementById('resetPass')?.value;

  if (!email) return showToast('Please enter your email address', 'error');
  if (!otp) return showToast('Please enter the OTP code', 'error');
  if (!newPassword || newPassword.length < 6) return showToast('Password must be at least 6 characters', 'error');

  if (window.setButtonLoading) window.setButtonLoading(btn, true, 'Resetting...');
  try {
    const res = await fetch(`${API}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp, newPassword })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Password reset failed');
    showToast(data.message || 'Password reset successful! Please login with your new password.', 'success');

    const resetSec = document.getElementById('resetSection');
    if (resetSec) resetSec.classList.add('d-none');
    if (document.getElementById('resetOTP')) document.getElementById('resetOTP').value = '';
    if (document.getElementById('resetPass')) document.getElementById('resetPass').value = '';
    if (document.getElementById('forgotEmail')) document.getElementById('forgotEmail').value = '';

    switchTab('login');
  } catch(e) {
    showToast(toFriendlyError(e.message), 'error');
  } finally {
    if (window.setButtonLoading) window.setButtonLoading(btn, false);
  }
}

function saveAuth(tok, usr) {
  token = tok;
  user = usr;

  if (usr.role !== 'teacher') {
    handleCrossRoleRedirect(tok, usr);
    return;
  }

  const remember = document.getElementById('rememberMe')?.checked;
  if (remember) {
    localStorage.setItem('teacher_token', tok);
    localStorage.setItem('teacher_user', JSON.stringify(usr));
    sessionStorage.removeItem('teacher_token');
    sessionStorage.removeItem('teacher_user');
  } else {
    sessionStorage.setItem('teacher_token', tok);
    sessionStorage.setItem('teacher_user', JSON.stringify(usr));
    localStorage.removeItem('teacher_token');
    localStorage.removeItem('teacher_user');
  }
  showApp();
  navigateTo('home');
}

function updateCachedUser(usr) {
  user = usr;
  if (localStorage.getItem('teacher_token')) {
    localStorage.setItem('teacher_user', JSON.stringify(usr));
  } else {
    sessionStorage.setItem('teacher_user', JSON.stringify(usr));
  }
}

function logout() {
  localStorage.removeItem('teacher_token');
  localStorage.removeItem('teacher_user');
  sessionStorage.removeItem('teacher_token');
  sessionStorage.removeItem('teacher_user');
  token = null;
  user = null;
  document.getElementById('authScreen').classList.remove('d-none');
  document.getElementById('teacherApp').classList.add('d-none');
}

function handleCrossRoleRedirect(tok, usr) {
  // Clear teacher credentials
  localStorage.removeItem('teacher_token');
  localStorage.removeItem('teacher_user');
  sessionStorage.removeItem('teacher_token');
  sessionStorage.removeItem('teacher_user');

  const role = usr.role;
  const remember = document.getElementById('rememberMe')?.checked;

  if (role === 'student') {
    if (remember) {
      localStorage.setItem('student_token', tok);
      localStorage.setItem('student_user', JSON.stringify(usr));
    } else {
      sessionStorage.setItem('student_token', tok);
      sessionStorage.setItem('student_user', JSON.stringify(usr));
    }
    showToast('Redirecting to Student Portal...', 'info');
    setTimeout(() => { window.location.href = '/student/'; }, 1000);
  } else if (role === 'parent') {
    if (remember) {
      localStorage.setItem('spx_parent_token', tok);
      localStorage.setItem('spx_parent_profile', JSON.stringify(usr));
    } else {
      sessionStorage.setItem('spx_parent_token', tok);
      sessionStorage.setItem('spx_parent_profile', JSON.stringify(usr));
    }
    showToast('Redirecting to Parent Portal...', 'info');
    setTimeout(() => { window.location.href = '/parent/'; }, 1000);
  } else if (role === 'admin') {
    localStorage.setItem('admin_token', tok);
    localStorage.setItem('admin_user', JSON.stringify(usr));
    showToast('Redirecting to Admin Portal...', 'info');
    setTimeout(() => { window.location.href = '/admin/'; }, 1000);
  } else {
    showToast('Invalid portal access for your role', 'error');
    logout();
  }
}

function showApp() {
  document.getElementById('authScreen').classList.add('d-none');
  document.getElementById('teacherApp').classList.remove('d-none');
  if (user) {
    const av = user.photo_url || defaultAvatar;
    document.getElementById('avatarSidebar').src = av;
    document.getElementById('avatarHeader').src = av;
    document.getElementById('nameSidebar').textContent = user.name;
    document.getElementById('levelSidebar').textContent = user.teacher_level || 'New Joiner';
  }
  checkSopStatus();
  loadTeacherNotificationCounts();
  checkEmailVerificationReminder();

  // Poll for counts every 5 seconds
  if (window._teacherNotifPollInterval) clearInterval(window._teacherNotifPollInterval);
  window._teacherNotifPollInterval = setInterval(() => {
    loadTeacherNotificationCounts();
  }, 5000);
}

function startEmailVerificationCooldown(durationSeconds = 300) {
  const btnBanner = document.getElementById('btnBannerResendEmail');
  const btnModal = document.getElementById('btnModalResendEmail');

  const lastSent = parseInt(localStorage.getItem('spx_last_email_sent_time') || sessionStorage.getItem('last_auto_teacher_email_link_time') || '0', 10);
  let effectiveSeconds = 0;
  if (lastSent > 0) {
    const elapsedSeconds = Math.floor((Date.now() - lastSent) / 1000);
    effectiveSeconds = durationSeconds - elapsedSeconds;
    if (effectiveSeconds < 0) effectiveSeconds = 0;
  }

  if (window.startResendCooldown) {
    if (btnBanner) window.startResendCooldown(btnBanner, effectiveSeconds);
    if (btnModal) window.startResendCooldown(btnModal, effectiveSeconds);
  }
}

async function checkEmailVerificationReminder() {
  const banner = document.getElementById('emailVerificationBanner');
  const bannerEmailDisp = document.getElementById('bannerEmailDisplay');
  const modalEmailDisp = document.getElementById('modalEmailDisplay');

  if (!user || user.email_verified) {
    if (banner) banner.classList.add('d-none');
    return;
  }

  // User's email is pending verification
  const userEmail = user.email || 'your registered email';

  // 1. Show top notification banner in panel
  if (banner) {
    if (bannerEmailDisp) bannerEmailDisp.textContent = userEmail;
    banner.classList.remove('d-none');
  }

  // 2. Set Email address in Modal display
  if (modalEmailDisp) modalEmailDisp.textContent = userEmail;

  // 3. Start dynamic real-time cooldown on Resend buttons
  startEmailVerificationCooldown(300);

  // 4. Automatically dispatch verification link if not sent recently (5+ minutes ago)
  const now = Date.now();
  const lastSent = parseInt(localStorage.getItem('spx_last_email_sent_time') || sessionStorage.getItem('last_auto_teacher_email_link_time') || '0', 10);

  if (lastSent === 0 || now - lastSent > 300000) {
    localStorage.setItem('spx_last_email_sent_time', String(now));
    sessionStorage.setItem('last_auto_teacher_email_link_time', String(now));
    startEmailVerificationCooldown(300);

    try {
      await fetch('/api/auth/send-email-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: userEmail })
      });
      showToast(`Verification link sent to ${userEmail}. Please check your primary inbox.`, 'info');
    } catch (e) {
      console.warn('Auto email link error:', e);
    }
  }

  // Clean up any stray backdrops that might block the UI
  removeStrayModalBackdrops();
}

async function resendEmailVerificationLink(evtBtn) {
  if (window.startGlobalResendCooldown) {
    window.startGlobalResendCooldown(60);
  }

  try {
    const emailToUse = user ? user.email : '';

    const res = await fetch('/api/auth/send-email-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: emailToUse })
    });

    const data = await res.json();
    if (res.ok) {
      showToast(data.message || `Verification link sent to ${emailToUse || 'your email'}. Please check your inbox.`, 'success');
    } else {
      showToast(data.error || 'Failed to send verification link', 'error');
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function resendProfileEmailLink(emailToUse, evtBtn) {
  return resendEmailVerificationLink(evtBtn);
}

async function loadTeacherNotificationCounts() {
  try {
    const data = await api('/teacher/pending-counts');
    const badge = document.getElementById('teacherNotifBadge');
    if (badge) {
      badge.textContent = data.total || 0;
      badge.style.display = data.total > 0 ? '' : 'none';
    }
    const connectBadge = document.getElementById('teacherConnectBadge');
    if (connectBadge) {
      if (data.chats && data.chats > 0) {
        connectBadge.textContent = data.chats;
        connectBadge.style.display = 'inline-block';
      } else {
        connectBadge.style.display = 'none';
      }
    }
  } catch (err) {
    console.error('Failed to load teacher notifications count:', err);
  }
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
    home:'Dashboard', sop:'SOP Setup', courses:'My Courses', batches:'My Batches',
    liveclasses:'Live Classes', assignments:'Assignments', observations:'Observations',
    attendance:'Attendance', notes:'Study Materials', chats:'Parent Connect', earnings:'Earnings',
    referrals:'Referrals & Rewards',
    level:'My Level', certificates:'My Certificates', profile:'Profile'
  };
  document.getElementById('pageTitle').textContent = titles[page] || page;
  const renders = {
    home:renderHome, sop:renderSop, courses:renderCourses, batches:renderBatches,
    liveclasses:renderLiveClasses, assignments:renderAssignments, observations:renderObservations,
    attendance:renderAttendance, notes:renderNotes, chats:renderChats, earnings:renderEarnings,
    referrals:renderReferrals,
    level:renderLevel, certificates:renderCertificates, profile:renderProfile
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
    const [analytics, batches, notifications] = await Promise.all([
      api('/teacher/analytics'),
      api('/teacher/batches'),
      api('/teacher/notifications'),
    ]);

    const activeBatchesCount = batches.filter(b => b.status === 'active').length;
    const activeNotifs = (notifications || []).filter(n => n.is_active && !n.is_read);

    document.getElementById('pageContent').innerHTML = `
      <div class="mb-4">
        <h5 class="fw-bold mb-1">Hello, ${user?.name || 'Educator'}! 👋</h5>
        <p class="text-muted small">Here's your class & earnings summary</p>
      </div>

      <!-- Warning & Broadcast Notifications -->
      ${activeNotifs.map(n => `
        <div class="alert alert-${n.type === 'warning' ? 'danger' : 'info'} alert-dismissible fade show d-flex align-items-center gap-3 p-3 mb-3 border-0 shadow-sm" role="alert" style="background: rgba(${n.type === 'warning' ? '239, 68, 68' : '59, 130, 246'}, 0.08); color: var(--text-primary); border-left: 4px solid ${n.type === 'warning' ? '#EF4444' : '#3B82F6'} !important;">
          <div style="font-size: 20px;">${n.type === 'warning' ? '⚠️' : 'ℹ️'}</div>
          <div class="flex-grow-1">
            <h6 class="fw-bold mb-1 small text-dark">${n.title}</h6>
            <div class="small text-muted">${n.message}</div>
          </div>
          <button type="button" class="btn-close" style="filter: invert(1);" onclick="dismissTeacherNotification('${n.id}')" aria-label="Close"></button>
        </div>
      `).join('')}

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
                You start at <strong>New Joiner</strong>. Fill out details in <strong>Profile</strong>, upload 5 required SOP video links in <strong>SOP Setup</strong>, and submit for Admin approval.
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
                  <div class="fw-semibold text-dark small">${b.batch_name}</div>
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
               <h5 class="text-dark fw-bold mb-1">${analytics.level === 'New Joiner' || !analytics.level ? 'New Joiner' : `${analytics.level} Mentor`}</h5>
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

async function dismissTeacherNotification(notifId) {
  try {
    await api(`/teacher/notifications/${notifId}/read`, { method: 'POST' });
    renderHome();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ── SOP Setup ─────────────────────────────────────────────────
async function renderSop() {
  loading();
  try {
    const sop = await api('/teacher/sop');
    const documents = await api('/teacher/documents') || [];
    const profile = await api('/auth/profile');

    // Separate documents by type
    const docAadhaar = documents.find(d => d.doc_type === 'aadhaar');
    const docPan = documents.find(d => d.doc_type === 'pan');
    const docResume = documents.find(d => d.doc_type === 'resume');
    const docDegree = documents.find(d => d.doc_type === 'qualification');
    const docExpertise = documents.find(d => d.doc_type === 'expertise_proof');
    const docLanguage = documents.find(d => d.doc_type === 'language_proof');
    const docExperience = documents.find(d => d.doc_type === 'experience_proof');

    const allKycUploaded = docAadhaar && docPan && docResume && docDegree;
    const allSopUploaded = sop && sop.camera_sop_url && sop.lighting_sop_url && sop.audio_sop_url && sop.internet_proof_url && sop.demo_teaching_url;
    
    // Validate Profile and Availability fields
    const allProfileFilled = profile.subject_expertise && profile.languages && 
                             (profile.experience_years !== null && profile.experience_years !== undefined) &&
                             profile.alt_email && profile.mobile_number &&
                             docExpertise && docLanguage && docExperience;

    let parsedAvail = [];
    try {
      if (sop && sop.availability) {
        parsedAvail = JSON.parse(sop.availability);
      }
    } catch (e) {
      // legacy raw string
      if (sop && sop.availability && sop.availability.trim()) {
        parsedAvail = [{ days: ['Legacy Days'], startTime: '00:00', endTime: '00:00', timezone: 'IST', rawText: sop.availability }];
      }
    }
    
    // Initialize temporary slot builder list if not already done
    if (!window._tempAvailabilitySlots && !window._sopTabSetExplicitly) {
      window._tempAvailabilitySlots = Array.isArray(parsedAvail) ? JSON.parse(JSON.stringify(parsedAvail)) : [];
    }

    const allAvailFilled = Array.isArray(window._tempAvailabilitySlots) && window._tempAvailabilitySlots.length > 0;
    const canSubmitSop = allKycUploaded && allSopUploaded && allProfileFilled && allAvailFilled;

    // Define defaults for active tab
    window._sopActiveTab = window._sopActiveTab || 'guidelines';

    // Auto-navigate to Agreement tab if approved
    if (sop && sop.status === 'approved' && !window._sopTabSetExplicitly) {
      window._sopActiveTab = 'agreement';
    }

    const statusBadge = (status) => {
      const cls = { approved:'bg-success', pending:'bg-warning', sop_pending:'bg-warning', rejected:'bg-danger', suspended:'bg-danger', draft:'bg-secondary' };
      return `<span class="badge ${cls[status] || 'bg-info'}">${status ? status.toUpperCase().replace('_',' ') : 'NOT UPLOADED'}</span>`;
    };

    const approvals = sop?.item_approvals || {};
    const getGranularStatusHtml = (key, hasItem) => {
      if (!hasItem) return '<span class="badge bg-secondary-subtle text-secondary py-1 px-2" style="font-size:0.72rem"><i class="fas fa-exclamation-circle me-1"></i>Missing</span>';
      const app = approvals[key];
      if (!app) return '<span class="badge bg-warning-subtle text-warning py-1 px-2" style="font-size:0.72rem"><i class="fas fa-clock me-1"></i>Pending Review</span>';
      if (app.status === 'approved') return '<span class="badge bg-success-subtle text-success py-1 px-2" style="font-size:0.72rem"><i class="fas fa-check-circle me-1"></i>Approved</span>';
      if (app.status === 'rejected') {
        return `
          <div class="d-flex flex-column align-items-end">
            <span class="badge bg-danger-subtle text-danger py-1 px-2" style="font-size:0.72rem"><i class="fas fa-times-circle me-1"></i>Rejected</span>
            ${app.notes ? `<span class="text-danger mt-1 text-end" style="font-size:0.68rem; font-weight:500; display:block; max-width:200px; white-space:normal; line-height:1.2;">Note: ${app.notes}</span>` : ''}
          </div>
        `;
      }
      return '<span class="badge bg-warning-subtle text-warning py-1 px-2" style="font-size:0.72rem"><i class="fas fa-clock me-1"></i>Pending Review</span>';
    };

    const isSubmitted = sop && (sop.status === 'sop_pending' || sop.status === 'approved' || sop.status === 'suspended');
    const tc = sop?.teacher_checklist || {};
    const chk = (key) => tc[key] ? 'checked' : '';
    const dis = isSubmitted ? 'disabled' : '';

    // Render step indicators / tab bar
    let tabContentHtml = '';

    if (window._sopActiveTab === 'guidelines') {
      tabContentHtml = `
        <div class="spx-card text-start p-4">
          <h5 class="fw-bold text-dark mb-3"><i class="fas fa-chalkboard-teacher me-2 text-primary"></i>Educator Onboarding Guidelines</h5>
          <p class="text-secondary small">To maintain high-quality pedagogy and trust, all educators must complete our onboarding verification stages before teaching batches.</p>
          
          <div class="row g-3 mt-2">
            <div class="col-md-6">
              <div class="p-3 rounded-3 h-100" style="background: rgba(15,23,42,0.02); border: 1px solid var(--border);">
                <h6 class="fw-bold text-dark" style="font-size:0.875rem"><i class="fas fa-id-card text-primary me-2"></i>Stage 1: KYC Document Uploads</h6>
                <p class="text-muted mb-0" style="font-size:0.78rem">Upload scan-quality proofs of Identity (Aadhaar), Tax ID (PAN), professional Resume, and highest Degree Certificate.</p>
              </div>
            </div>
            <div class="col-md-6">
              <div class="p-3 rounded-3 h-100" style="background: rgba(15,23,42,0.02); border: 1px solid var(--border);">
                <h6 class="fw-bold text-dark" style="font-size:0.875rem"><i class="fas fa-user-edit text-primary me-2"></i>Stage 2: Profile & Experience</h6>
                <p class="text-muted mb-0" style="font-size:0.78rem">Configure your subject expertise, teaching language preferences, and teaching experience details.</p>
              </div>
            </div>
            <div class="col-md-6">
              <div class="p-3 rounded-3 h-100" style="background: rgba(15,23,42,0.02); border: 1px solid var(--border);">
                <h6 class="fw-bold text-dark" style="font-size:0.875rem"><i class="fas fa-calendar-alt text-primary me-2"></i>Stage 3: Availability Calendar</h6>
                <p class="text-muted mb-0" style="font-size:0.78rem">Outline your detailed weekly teaching slot availability calendar for admin and student scheduling.</p>
              </div>
            </div>
            <div class="col-md-6">
              <div class="p-3 rounded-3 h-100" style="background: rgba(15,23,42,0.02); border: 1px solid var(--border);">
                <h6 class="fw-bold text-dark" style="font-size:0.875rem"><i class="fas fa-camera text-primary me-2"></i>Stage 4: Technical SOP Evidence</h6>
                <p class="text-muted mb-0" style="font-size:0.78rem">Provide video/photo proofs or paste shareable links (YouTube/Drive/Loom) verifying your camera framing, soft lighting, mic clarity, and internet speeds (>20 Mbps upload).</p>
              </div>
            </div>
            <div class="col-md-6">
              <div class="p-3 rounded-3 h-100" style="background: rgba(15,23,42,0.02); border: 1px solid var(--border);">
                <h6 class="fw-bold text-dark" style="font-size:0.875rem"><i class="fas fa-video text-primary me-2"></i>Stage 5: Onboarding Call & Deed Sign</h6>
                <p class="text-muted mb-0" style="font-size:0.78rem">Admin will review your details, schedule a live onboarding verification call, and prompt you to sign the legally-binding Deed of Affidavit under oath.</p>
              </div>
            </div>
          </div>

          <div class="alert alert-info d-flex align-items-center mt-4 mb-0 py-3" style="border-radius:12px">
            <i class="fas fa-info-circle me-3" style="font-size: 1.5rem;"></i>
            <div style="font-size:0.8rem">
              <strong>Need Help?</strong> Ensure files uploaded are under 20MB for documents and 200MB for video proofs. If you encounter upload issues, paste shareable Google Drive links in Stage 4.
            </div>
          </div>
        </div>
      `;
    } else if (window._sopActiveTab === 'kyc') {
      const kycSlots = [
        { id: 'aadhaar', label: '1. Aadhaar Card Scan', desc: 'Front and Back merged in one PDF/Photo for Identity Verification.', doc: docAadhaar },
        { id: 'pan', label: '2. PAN Card Scan', desc: 'Clear color photo of PAN card for Tax and Payout validation.', doc: docPan },
        { id: 'resume', label: '3. Professional Resume', desc: 'Updated CV listing educational credentials and experience.', doc: docResume },
        { id: 'qualification', label: '4. Degree Certificate', desc: 'Highest educational certificate/diploma in PDF/Image format.', doc: docDegree }
      ];

      tabContentHtml = `
        <div class="spx-card text-start p-4">
          <div class="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h5 class="fw-bold text-dark mb-1"><i class="fas fa-id-card me-2 text-primary"></i>KYC Documents Verification</h5>
              <p class="text-muted small mb-0">Upload individual documents. Uploading happens automatically when a file is selected.</p>
            </div>
            ${allKycUploaded ? '<span class="badge bg-success"><i class="fas fa-check me-1"></i>All Documents Uploaded</span>' : '<span class="badge bg-secondary">Upload Pending</span>'}
          </div>

          <div class="row g-4">
            ${kycSlots.map(slot => {
              const hasDoc = !!slot.doc;
              return `
                <div class="col-md-6">
                  <div class="sop-upload-slot ${hasDoc ? 'uploaded' : ''} h-100 d-flex flex-column justify-content-between">
                    <div>
                      <div class="d-flex justify-content-between align-items-center mb-2">
                        <h6 class="fw-bold mb-0 text-dark" style="font-size:0.875rem">${slot.label}</h6>
                        ${getGranularStatusHtml(slot.id, hasDoc)}
                      </div>
                      <p class="text-muted small mb-3" style="font-size:0.75rem">${slot.desc}</p>
                    </div>
                    <div class="d-flex align-items-center gap-2 mt-auto pt-2 flex-wrap border-top border-light mt-3">
                      ${isSubmitted ? '' : `
                        <div class="w-100 d-flex flex-column gap-2 mb-2">
                          <div class="d-flex align-items-center gap-1">
                            <label class="text-muted small me-2" style="font-size:0.7rem; flex-shrink:0;">File Upload:</label>
                            <input type="file" class="form-control form-control-sm spx-input" id="kyc_file_${slot.id}" onchange="autoUploadDoc(this, '${slot.id}')" style="max-width:180px">
                            <div class="spinner-border text-primary spinner-upload d-none" id="spinner_kyc_${slot.id}" role="status"></div>
                          </div>
                          <div class="d-flex align-items-center gap-1">
                            <label class="text-muted small me-2" style="font-size:0.7rem; flex-shrink:0;">Or Paste Link:</label>
                            <input type="text" class="form-control form-control-sm spx-input" id="link_doc_${slot.id}" placeholder="e.g. Google Drive Link" value="${hasDoc && !slot.doc.file_url.startsWith('/uploads/') ? slot.doc.file_url : ''}" style="max-width:150px">
                            <button class="btn btn-sm btn-spx py-1" onclick="saveDocLink('${slot.id}')" style="font-size: 0.7rem;">Save</button>
                          </div>
                        </div>
                      `}
                      ${hasDoc ? `<a href="${slot.doc.file_url}" target="_blank" class="btn btn-sm btn-outline-primary ms-auto" style="font-size:0.75rem; padding: 4px 8px;"><i class="fas fa-eye"></i> View</a>` : ''}
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    } else if (window._sopActiveTab === 'profile') {
      tabContentHtml = `
        <div class="spx-card text-start p-4">
          <div class="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h5 class="fw-bold text-dark mb-1"><i class="fas fa-user-edit me-2 text-primary"></i>Profile & Experience Details</h5>
              <p class="text-muted small mb-0">Configure your subject expertise, teaching language preferences, and previous experience details along with verification evidence.</p>
            </div>
            ${allProfileFilled ? '<span class="badge bg-success"><i class="fas fa-check-circle me-1"></i>Profile Saved</span>' : '<span class="badge bg-secondary">Pending Profile Configuration</span>'}
          </div>

          <form onsubmit="saveProfileOnboarding(event)">
            <div class="row g-4">
              <!-- Subject Expertise -->
              <div class="col-md-6">
                <div class="d-flex justify-content-between align-items-center mb-1">
                  <label class="spx-label mb-0">Subject Expertise *</label>
                  ${getGranularStatusHtml('subject_expertise', !!profile.subject_expertise)}
                </div>
                <input class="form-control spx-input" id="onboardSubjects" value="${profile.subject_expertise || ''}" placeholder="e.g. Physics, Chemistry, Maths" required ${isSubmitted ? 'disabled' : ''}>
                <div class="text-muted small mt-1" style="font-size:0.7rem">Enter subjects you specialize in, separated by commas.</div>
              </div>
              <div class="col-md-6">
                <div class="sop-upload-slot ${docExpertise ? 'uploaded' : ''} p-3 rounded" style="background: rgba(15,23,42,0.01); border: 1px dashed var(--border);">
                  <div class="d-flex justify-content-between align-items-center mb-2">
                    <span class="small fw-bold text-dark"><i class="fas fa-file-invoice text-primary me-1"></i>Subject Expertise Proof *</span>
                    ${getGranularStatusHtml('expertise_proof', !!docExpertise)}
                  </div>
                  <div class="text-muted mb-2" style="font-size:0.7rem">Upload syllabus, credentials, or certifications validating your expertise.</div>
                  ${isSubmitted ? '' : `
                    <div class="d-flex flex-column gap-2">
                      <div class="d-flex align-items-center gap-1">
                        <label class="text-muted small me-2" style="font-size:0.65rem; flex-shrink:0;">File:</label>
                        <input type="file" class="form-control form-control-sm spx-input" onchange="autoUploadDoc(this, 'expertise_proof')" style="max-width:180px">
                        <div class="spinner-border text-primary spinner-upload d-none" id="spinner_kyc_expertise_proof" role="status"></div>
                      </div>
                      <div class="d-flex align-items-center gap-1">
                        <label class="text-muted small me-2" style="font-size:0.65rem; flex-shrink:0;">Or Link:</label>
                        <input type="text" class="form-control form-control-sm spx-input" id="link_doc_expertise_proof" placeholder="e.g. Cert Link" value="${docExpertise && !docExpertise.file_url.startsWith('/uploads/') ? docExpertise.file_url : ''}" style="max-width:130px">
                        <button type="button" class="btn btn-sm btn-spx py-1" onclick="saveDocLink('expertise_proof')" style="font-size: 0.68rem;">Save</button>
                      </div>
                    </div>
                  `}
                  ${docExpertise ? `<a href="${docExpertise.file_url}" target="_blank" class="btn btn-xs btn-outline-primary mt-2" style="font-size:0.7rem; padding: 2px 6px;"><i class="fas fa-eye"></i> View Proof</a>` : ''}
                </div>
              </div>

              <!-- Teaching Language Preference -->
              <div class="col-md-6">
                <div class="d-flex justify-content-between align-items-center mb-1">
                  <label class="spx-label mb-0">Teaching Language Preference *</label>
                  ${getGranularStatusHtml('languages', !!profile.languages)}
                </div>
                <input class="form-control spx-input" id="onboardLanguages" value="${profile.languages || ''}" placeholder="e.g. English, Hindi" required ${isSubmitted ? 'disabled' : ''}>
                <div class="text-muted small mt-1" style="font-size:0.7rem">Specify languages in which you can teach.</div>
              </div>
              <div class="col-md-6">
                <div class="sop-upload-slot ${docLanguage ? 'uploaded' : ''} p-3 rounded" style="background: rgba(15,23,42,0.01); border: 1px dashed var(--border);">
                  <div class="d-flex justify-content-between align-items-center mb-2">
                    <span class="small fw-bold text-dark"><i class="fas fa-microphone text-primary me-1"></i>Language Preferred Proof *</span>
                    ${getGranularStatusHtml('language_proof', !!docLanguage)}
                  </div>
                  <div class="text-muted mb-2" style="font-size:0.7rem">Upload language certificates or a short video/audio clip speaking in this language.</div>
                  ${isSubmitted ? '' : `
                    <div class="d-flex flex-column gap-2">
                      <div class="d-flex align-items-center gap-1">
                        <label class="text-muted small me-2" style="font-size:0.65rem; flex-shrink:0;">File:</label>
                        <input type="file" class="form-control form-control-sm spx-input" onchange="autoUploadDoc(this, 'language_proof')" style="max-width:180px">
                        <div class="spinner-border text-primary spinner-upload d-none" id="spinner_kyc_language_proof" role="status"></div>
                      </div>
                      <div class="d-flex align-items-center gap-1">
                        <label class="text-muted small me-2" style="font-size:0.65rem; flex-shrink:0;">Or Link:</label>
                        <input type="text" class="form-control form-control-sm spx-input" id="link_doc_language_proof" placeholder="e.g. Clip Link" value="${docLanguage && !docLanguage.file_url.startsWith('/uploads/') ? docLanguage.file_url : ''}" style="max-width:130px">
                        <button type="button" class="btn btn-sm btn-spx py-1" onclick="saveDocLink('language_proof')" style="font-size: 0.68rem;">Save</button>
                      </div>
                    </div>
                  `}
                  ${docLanguage ? `<a href="${docLanguage.file_url}" target="_blank" class="btn btn-xs btn-outline-primary mt-2" style="font-size:0.7rem; padding: 2px 6px;"><i class="fas fa-eye"></i> View Proof</a>` : ''}
                </div>
              </div>

              <!-- Previous Teaching Experience -->
              <div class="col-md-6">
                <div class="d-flex justify-content-between align-items-center mb-1">
                  <label class="spx-label mb-0">Previous Teaching Experience (Years) *</label>
                  ${getGranularStatusHtml('experience_years', (profile.experience_years !== null && profile.experience_years !== undefined))}
                </div>
                <input type="number" class="form-control spx-input" id="onboardExp" value="${profile.experience_years || 0}" required ${isSubmitted ? 'disabled' : ''}>
                <div class="text-muted small mt-1" style="font-size:0.7rem">Enter your total years of teaching experience.</div>
              </div>
              <div class="col-md-6">
                <div class="sop-upload-slot ${docExperience ? 'uploaded' : ''} p-3 rounded" style="background: rgba(15,23,42,0.01); border: 1px dashed var(--border);">
                  <div class="d-flex justify-content-between align-items-center mb-2">
                    <span class="small fw-bold text-dark"><i class="fas fa-briefcase text-primary me-1"></i>Experience Letter Proof *</span>
                    ${getGranularStatusHtml('experience_proof', !!docExperience)}
                  </div>
                  <div class="text-muted mb-2" style="font-size:0.7rem">Upload experience letters or proofs of previous online/offline teaching.</div>
                  ${isSubmitted ? '' : `
                    <div class="d-flex flex-column gap-2">
                      <div class="d-flex align-items-center gap-1">
                        <label class="text-muted small me-2" style="font-size:0.65rem; flex-shrink:0;">File:</label>
                        <input type="file" class="form-control form-control-sm spx-input" onchange="autoUploadDoc(this, 'experience_proof')" style="max-width:180px">
                        <div class="spinner-border text-primary spinner-upload d-none" id="spinner_kyc_experience_proof" role="status"></div>
                      </div>
                      <div class="d-flex align-items-center gap-1">
                        <label class="text-muted small me-2" style="font-size:0.65rem; flex-shrink:0;">Or Link:</label>
                        <input type="text" class="form-control form-control-sm spx-input" id="link_doc_experience_proof" placeholder="e.g. Doc Link" value="${docExperience && !docExperience.file_url.startsWith('/uploads/') ? docExperience.file_url : ''}" style="max-width:130px">
                        <button type="button" class="btn btn-sm btn-spx py-1" onclick="saveDocLink('experience_proof')" style="font-size: 0.68rem;">Save</button>
                      </div>
                    </div>
                  `}
                  ${docExperience ? `<a href="${docExperience.file_url}" target="_blank" class="btn btn-xs btn-outline-primary mt-2" style="font-size:0.7rem; padding: 2px 6px;"><i class="fas fa-eye"></i> View Proof</a>` : ''}
                </div>
              </div>

              <!-- Highest Academic Qualification -->
              <div class="col-md-6">
                <div class="d-flex justify-content-between align-items-center mb-1">
                  <label class="spx-label mb-0">Highest Academic Qualification</label>
                  ${getGranularStatusHtml('qualification', !!profile.qualification)}
                </div>
                <input class="form-control spx-input" id="onboardQual" value="${profile.qualification || ''}" placeholder="e.g. M.Sc. Physics, B.Ed." ${isSubmitted ? 'disabled' : ''}>
                <div class="text-muted small mt-1" style="font-size:0.7rem">Degree title will be shown publicly in your profile page.</div>
              </div>

              <!-- Alternative Email -->
              <div class="col-md-6">
                <div class="d-flex justify-content-between align-items-center mb-1">
                  <label class="spx-label mb-0">Alternative Email *</label>
                  ${getGranularStatusHtml('alt_email', !!profile.alt_email)}
                </div>
                <input type="email" class="form-control spx-input" id="onboardAltEmail" value="${profile.alt_email || ''}" placeholder="e.g. alt@email.com" required ${isSubmitted ? 'disabled' : ''}>
              </div>

              <!-- Mobile Number -->
              <div class="col-md-6">
                <div class="d-flex justify-content-between align-items-center mb-1">
                  <label class="spx-label mb-0">Mobile Number *</label>
                  ${getGranularStatusHtml('mobile_number', !!profile.mobile_number)}
                </div>
                <input class="form-control spx-input" id="onboardMobileNumber" value="${profile.mobile_number || ''}" placeholder="e.g. +91 99999 99999" required ${isSubmitted ? 'disabled' : ''}>
              </div>

              <!-- LinkedIn Link -->
              <div class="col-md-6">
                <div class="d-flex justify-content-between align-items-center mb-1">
                  <label class="spx-label mb-0">LinkedIn Profile Link</label>
                </div>
                <input class="form-control spx-input" id="onboardLinkedIn" value="${profile.social_links?.linkedin || ''}" placeholder="e.g. https://linkedin.com/in/..." ${isSubmitted ? 'disabled' : ''}>
              </div>

              <!-- Twitter/Social Link -->
              <div class="col-md-6">
                <div class="d-flex justify-content-between align-items-center mb-1">
                  <label class="spx-label mb-0">Twitter / YouTube Link</label>
                </div>
                <input class="form-control spx-input" id="onboardTwitter" value="${profile.social_links?.twitter || ''}" placeholder="e.g. https://twitter.com/..." ${isSubmitted ? 'disabled' : ''}>
              </div>

              <div class="col-md-12">
                <div class="d-flex justify-content-between align-items-center mb-1">
                  <label class="spx-label mb-0">Professional Bio / Introduction</label>
                </div>
                <textarea class="form-control spx-input" id="onboardBio" rows="3" placeholder="Share a brief introduction or teaching philosophy..." ${isSubmitted ? 'disabled' : ''}>${profile.bio || ''}</textarea>
              </div>

              ${isSubmitted ? '' : `
                <div class="col-12 mt-3 text-start">
                  <button type="submit" class="btn btn-spx py-2 px-4"><i class="fas fa-save me-1"></i> Save Profile Details</button>
                </div>
              `}
            </div>
          </form>
        </div>
      `;
    } else if (window._sopActiveTab === 'availability') {
      const formattedSlots = (window._tempAvailabilitySlots && window._tempAvailabilitySlots.length > 0) ? window._tempAvailabilitySlots.map((slot, index) => {
        return `
          <div class="d-flex align-items-center justify-content-between p-2 mb-2 rounded border border-light bg-light text-dark" style="font-size: 0.85rem;">
            <div>
              <i class="fas fa-check-circle text-success me-2"></i>
              <strong>${slot.days.join(', ')}</strong>: ${formatTime(slot.startTime)} - ${formatTime(slot.endTime)} (${slot.timezone})
            </div>
            ${isSubmitted ? '' : `<button type="button" class="btn btn-xs btn-outline-danger py-0 px-2" onclick="deleteAvailabilitySlot(${index})" style="font-size: 0.72rem;"><i class="fas fa-trash-alt"></i></button>`}
          </div>
        `;
      }).join('') : `<p class="text-muted small py-2">No weekly time slots added yet. Build your schedule below.</p>`;

      const availStatusBadge = getGranularStatusHtml('availability', allAvailFilled);

      tabContentHtml = `
        <div class="spx-card text-start p-4">
          <div class="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h5 class="fw-bold text-dark mb-1"><i class="fas fa-calendar-alt me-2 text-primary"></i>Weekly Availability Calendar</h5>
              <p class="text-muted small mb-0">Specify your detailed weekly availability calendar. Select days and time ranges to build your slots.</p>
            </div>
            ${availStatusBadge}
          </div>

          <div class="mb-4">
            <h6 class="fw-bold text-dark mb-2" style="font-size: 0.85rem;">Active Availability Slots</h6>
            <div id="availSlotsList" class="p-3 rounded mb-3" style="background: rgba(15,23,42,0.02); border: 1px solid var(--border); min-height: 80px;">
              ${formattedSlots}
            </div>
          </div>

          ${isSubmitted ? '' : `
            <div class="card p-3 mb-4 border-0 text-start" style="background: #F8FAFC; border: 1px solid var(--border) !important; border-radius: var(--radius-md);">
              <h6 class="fw-bold text-dark mb-3" style="font-size: 0.85rem;"><i class="fas fa-plus-circle text-primary me-2"></i>Build Availability Slot</h6>
              
              <div class="mb-3">
                <label class="spx-label mb-2 d-block">Select Days for this Slot *</label>
                <div class="d-flex flex-wrap gap-3">
                  ${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => `
                    <div class="form-check">
                      <input class="form-check-input avail-day-check" type="checkbox" value="${day}" id="day_${day}">
                      <label class="form-check-label text-dark small" for="day_${day}">${day}</label>
                    </div>
                  `).join('')}
                </div>
              </div>

              <div class="row g-3">
                <div class="col-md-4">
                  <label class="spx-label mb-1">Start Time *</label>
                  <input type="time" class="form-control spx-input" id="slotStart" required>
                </div>
                <div class="col-md-4">
                  <label class="spx-label mb-1">End Time *</label>
                  <input type="time" class="form-control spx-input" id="slotEnd" required>
                </div>
                <div class="col-md-4">
                  <label class="spx-label mb-1">Time Zone</label>
                  <select class="form-select spx-input" id="slotTimezone">
                    <option value="IST" selected>IST (India Standard Time)</option>
                    <option value="GMT">GMT (Greenwich Mean Time)</option>
                    <option value="EST">EST (Eastern Standard Time)</option>
                    <option value="PST">PST (Pacific Standard Time)</option>
                  </select>
                </div>
              </div>
              <button type="button" class="btn btn-outline-primary btn-sm mt-3 align-self-start" onclick="addAvailabilitySlot()"><i class="fas fa-plus me-1"></i> Add Slot to List</button>
            </div>

            <form onsubmit="saveAvailabilityOnboarding(event)">
              <div class="mt-3">
                <button type="submit" class="btn btn-spx py-2 px-4"><i class="fas fa-save me-1"></i> Save Availability Calendar</button>
              </div>
            </form>
          `}
        </div>
      `;
    } else if (window._sopActiveTab === 'video') {
      const sopSlots = [
        { 
          id: 'camera_sop', 
          label: '1. Camera Setup Verification', 
          desc: 'Landscape eye-level tripod framing. Face, upper body, gestures visible.', 
          hint: 'Place your webcam or phone horizontally at eye level. Check that the frame includes your chest and hands so gestures are clear. Absolutely no vertical/handheld recordings.',
          url: sop?.camera_sop_url 
        },
        { 
          id: 'lighting_sop', 
          label: '2. Lighting Setup Verification', 
          desc: 'Front-facing soft light. No backlight shadow or lens glare.', 
          hint: 'Ensure soft light (e.g. from a ring light or window) directly illuminates your face. Turn off any light sources directly behind you to prevent shadows.',
          url: sop?.lighting_sop_url 
        },
        { 
          id: 'audio_sop', 
          label: '3. Audio Setup Verification', 
          desc: 'Clear voice recording with a collar mic. No ambient fan or room echo.', 
          hint: 'Use a dedicated collar/lapel microphone or wired headset mic. Turn off noisy ceiling fans or AC. Prevent echo by choosing a room with soft furnishings.',
          url: sop?.audio_sop_url 
        },
        { 
          id: 'internet_proof', 
          label: '4. Internet Speed Proof', 
          desc: 'Speedtest screenshot / screen recording showing > 20 Mbps upload.', 
          hint: 'Go to speedtest.net, run a test, and upload a screenshot showing your upload speed. Ensure it is at least 20 Mbps for high quality video feeds.',
          url: sop?.internet_proof_url 
        },
        { 
          id: 'demo_teaching', 
          label: '5. Demo Lecture Snippet', 
          desc: 'A 2-minute snippet showing your expressive teaching style.', 
          hint: 'Record yourself explaining a simple concept in 2 minutes. Focus on direct camera eye-contact, standard professional language, and interactive whiteboard pacing.',
          url: sop?.demo_teaching_url 
        }
      ];

      const camDis = (!sop?.camera_sop_url || isSubmitted) ? 'disabled' : '';
      const lightDis = (!sop?.lighting_sop_url || isSubmitted) ? 'disabled' : '';
      const audioDis = (!sop?.audio_sop_url || isSubmitted) ? 'disabled' : '';
      const internetDis = (!sop?.internet_proof_url || isSubmitted) ? 'disabled' : '';
      const teachDis = (!sop?.demo_teaching_url || isSubmitted) ? 'disabled' : '';

      tabContentHtml = `
        <div class="spx-card text-start p-4">
          <div class="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h5 class="fw-bold text-dark mb-1"><i class="fas fa-video me-2 text-primary"></i>Technical & Pedagogical SOP Evidence</h5>
              <p class="text-muted small mb-0">Provide video clips/photos or paste shareable links for each technical check.</p>
            </div>
            <div>Status: ${statusBadge(sop?.status)}</div>
          </div>

          <div class="sop-slots-container">
            ${sopSlots.map(slot => {
              const hasSop = !!slot.url;
              return `
                <div class="sop-upload-slot mb-3 ${hasSop ? 'uploaded' : ''}">
                  <div class="d-flex justify-content-between align-items-start mb-2 flex-wrap gap-2">
                    <div>
                      <div class="fw-semibold text-dark small">${slot.label}</div>
                      <div class="text-muted mb-1" style="font-size:.75rem">${slot.desc}</div>
                      <div class="text-muted p-2 rounded mb-2 bg-light border-start border-3 border-primary" style="font-size:.68rem; font-style: italic;">
                        <strong>Guide:</strong> ${slot.hint}
                      </div>
                    </div>
                    ${getGranularStatusHtml(slot.id, hasSop)}
                  </div>
                  ${isSubmitted ? '' : `
                    <div class="row g-2 mt-2 align-items-center border-top pt-2">
                      <div class="col-md-6 d-flex align-items-center gap-1 border-end border-light">
                        <label class="text-muted small me-2" style="font-size:0.7rem; flex-shrink:0;">File Upload:</label>
                        <input type="file" class="form-control form-control-sm spx-input" onchange="autoUploadSopVideo(this, '${slot.id}')" style="max-width:180px">
                        <div class="spinner-border text-primary spinner-upload d-none" id="spinner_sop_${slot.id}" role="status"></div>
                      </div>
                      <div class="col-md-6 d-flex align-items-center gap-1">
                        <label class="text-muted small me-2" style="font-size:0.7rem; flex-shrink:0;">Or Paste Link:</label>
                        <input type="text" class="form-control form-control-sm spx-input" id="link_${slot.id}" placeholder="e.g. YouTube / Drive URL" value="${hasSop && !slot.url.startsWith('/uploads/') ? slot.url : ''}">
                        <button class="btn btn-sm btn-spx py-1" onclick="saveSopLink('${slot.id}')">Save Link</button>
                      </div>
                    </div>
                  `}
                  ${hasSop ? `<a href="${slot.url}" target="_blank" class="btn btn-xs btn-outline-primary mt-2" style="font-size:0.7rem; padding: 2px 6px;"><i class="fas fa-play"></i> View Evidence</a>` : ''}
                </div>
              `;
            }).join('')}
          </div>

          <div class="mt-4 pt-3 border-top text-start">
            <h6 class="fw-bold text-dark mb-2">Compliance Declaration Checklist</h6>
            <p class="text-muted small mb-3">Check each box to certify you understand and have configured these setup requirements. <em>Note: Checkboxes are locked until the corresponding evidence document is uploaded.</em></p>
            
            <div class="sop-checklist-container mb-3" style="max-height: 250px; overflow-y: auto; background: rgba(15,23,42,0.02); padding: 16px; border-radius: 8px; border: 1px solid var(--border);">
              <div class="form-check mb-2">
                <input class="form-check-input sop-checklist-item-checkbox" type="checkbox" id="check_camera_stable" data-key="camera_stable" ${chk('camera_stable')} ${camDis} onchange="toggleSopSubmitBtn()">
                <label class="form-check-label text-secondary small" for="check_camera_stable">I use a stable eye-level camera tripod (absolutely no shaky/hand-held feed). ${!sop?.camera_sop_url ? '<span class="text-danger small ms-1">(Upload Camera Evidence First)</span>' : ''}</label>
              </div>
              <div class="form-check mb-2">
                <input class="form-check-input sop-checklist-item-checkbox" type="checkbox" id="check_camera_1080p" data-key="camera_1080p" ${chk('camera_1080p')} ${camDis} onchange="toggleSopSubmitBtn()">
                <label class="form-check-label text-secondary small" for="check_camera_1080p">My camera supports minimum 1080p resolution and shows my face, upper body, and hands clearly. ${!sop?.camera_sop_url ? '<span class="text-danger small ms-1">(Upload Camera Evidence First)</span>' : ''}</label>
              </div>
              <div class="form-check mb-2">
                <input class="form-check-input sop-checklist-item-checkbox" type="checkbox" id="check_lighting_soft" data-key="lighting_soft" ${chk('lighting_soft')} ${lightDis} onchange="toggleSopSubmitBtn()">
                <label class="form-check-label text-secondary small" for="check_lighting_soft">I use a front soft/ring light falling on my face, with no backlight or glare behind me. ${!sop?.lighting_sop_url ? '<span class="text-danger small ms-1">(Upload Lighting Evidence First)</span>' : ''}</label>
              </div>
              <div class="form-check mb-2">
                <input class="form-check-input sop-checklist-item-checkbox" type="checkbox" id="check_lighting_bg" data-key="lighting_bg" ${chk('lighting_bg')} ${lightDis} onchange="toggleSopSubmitBtn()">
                <label class="form-check-label text-secondary small" for="check_lighting_bg">I have a white or clean neutral background with no messy details visible. ${!sop?.lighting_sop_url ? '<span class="text-danger small ms-1">(Upload Lighting Evidence First)</span>' : ''}</label>
              </div>
              <div class="form-check mb-2">
                <input class="form-check-input sop-checklist-item-checkbox" type="checkbox" id="check_audio_mic" data-key="audio_mic" ${chk('audio_mic')} ${audioDis} onchange="toggleSopSubmitBtn()">
                <label class="form-check-label text-secondary small" for="check_audio_mic">I use a collar mic / external mic (built-in webcam mic is not permitted). ${!sop?.audio_sop_url ? '<span class="text-danger small ms-1">(Upload Audio Evidence First)</span>' : ''}</label>
              </div>
              <div class="form-check mb-2">
                <input class="form-check-input sop-checklist-item-checkbox" type="checkbox" id="check_audio_noise" data-key="audio_noise" ${chk('audio_noise')} ${audioDis} onchange="toggleSopSubmitBtn()">
                <label class="form-check-label text-secondary small" for="check_audio_noise">My teaching environment is free of echo, fan noise, or background chatter. ${!sop?.audio_sop_url ? '<span class="text-danger small ms-1">(Upload Audio Evidence First)</span>' : ''}</label>
              </div>
              <div class="form-check mb-2">
                <input class="form-check-input sop-checklist-item-checkbox" type="checkbox" id="check_internet_speed" data-key="internet_speed" ${chk('internet_speed')} ${internetDis} onchange="toggleSopSubmitBtn()">
                <label class="form-check-label text-secondary small" for="check_internet_speed">My upload speed is above 20 Mbps, and I have mobile hotspot backup ready. ${!sop?.internet_proof_url ? '<span class="text-danger small ms-1">(Upload Internet Speed Evidence First)</span>' : ''}</label>
              </div>
              <div class="form-check mb-2">
                <input class="form-check-input sop-checklist-item-checkbox" type="checkbox" id="check_presentation_style" data-key="presentation_style" ${chk('presentation_style')} ${teachDis} onchange="toggleSopSubmitBtn()">
                <label class="form-check-label text-secondary small" for="check_presentation_style">I will maintain an energetic tone, direct eye contact with the camera, and use gestures naturally. ${!sop?.demo_teaching_url ? '<span class="text-danger small ms-1">(Upload Demo Lecture Evidence First)</span>' : ''}</label>
              </div>
              <div class="form-check mb-2">
                <input class="form-check-input sop-checklist-item-checkbox" type="checkbox" id="check_dress_code" data-key="dress_code" ${chk('dress_code')} ${teachDis} onchange="toggleSopSubmitBtn()">
                <label class="form-check-label text-secondary small" for="check_dress_code">I will wear solid colored shirts/tops and maintain a clean professional appearance. ${!sop?.demo_teaching_url ? '<span class="text-danger small ms-1">(Upload Demo Lecture Evidence First)</span>' : ''}</label>
              </div>
              <div class="form-check mb-2">
                <input class="form-check-input sop-checklist-item-checkbox" type="checkbox" id="check_class_flow" data-key="class_flow" ${chk('class_flow')} ${teachDis} onchange="toggleSopSubmitBtn()">
                <label class="form-check-label text-secondary small" for="check_class_flow">I will join sessions 10–15 mins early, test media, greet students by name, and run engagement polls/quizzes every 3–5 mins. ${!sop?.demo_teaching_url ? '<span class="text-danger small ms-1">(Upload Demo Lecture Evidence First)</span>' : ''}</label>
              </div>
              <div class="form-check mb-2">
                <input class="form-check-input sop-checklist-item-checkbox" type="checkbox" id="check_board_materials" data-key="board_materials" ${chk('board_materials')} ${teachDis} onchange="toggleSopSubmitBtn()">
                <label class="form-check-label text-secondary small" for="check_board_materials">I will write in large legible characters with structured spacing and use annotations / highlighting. ${!sop?.demo_teaching_url ? '<span class="text-danger small ms-1">(Upload Demo Lecture Evidence First)</span>' : ''}</label>
              </div>
              <div class="form-check mb-2">
                <input class="form-check-input sop-checklist-item-checkbox" type="checkbox" id="check_content_delivery" data-key="content_delivery" ${chk('content_delivery')} ${teachDis} onchange="toggleSopSubmitBtn()">
                <label class="form-check-label text-secondary small" for="check_content_delivery">I will follow modular delivery: Concept -> Examples -> Practice -> Recap -> Doubt section. ${!sop?.demo_teaching_url ? '<span class="text-danger small ms-1">(Upload Demo Lecture Evidence First)</span>' : ''}</label>
              </div>
              <div class="form-check mb-2">
                <input class="form-check-input sop-checklist-item-checkbox" type="checkbox" id="check_discipline_rules" data-key="discipline_rules" ${chk('discipline_rules')} ${teachDis} onchange="toggleSopSubmitBtn()">
                <label class="form-check-label text-secondary small" for="check_discipline_rules">I will not solicit students privately, promote external coaching, or use unprofessional language. ${!sop?.demo_teaching_url ? '<span class="text-danger small ms-1">(Upload Demo Lecture Evidence First)</span>' : ''}</label>
              </div>
            </div>

            ${isSubmitted ? `
              <div class="alert alert-info text-center mt-3 py-2 small">SOP details submitted and locked for admin review.</div>
            ` : (canSubmitSop ? `
              <button class="btn btn-secondary w-100 mt-3" id="sopSubmitButton" onclick="submitSopForReview()" disabled>Submit SOP For Admin Verification</button>
            ` : `
              <button class="btn btn-secondary w-100 mt-3" disabled>Submit SOP For Admin Verification (Fill KYC Docs, Onboarding Profile, Availability Calendar, Technical SOPs & check all checkboxes)</button>
            `)}
          </div>
        </div>
      `;
    } else if (window._sopActiveTab === 'agreement') {
      if (sop && sop.status === 'approved' && !sop.agreement_signed) {
        tabContentHtml = `
          <div class="row justify-content-center text-start">
            <div class="col-lg-12">
              <div class="legal-affidavit p-5">
                <div class="stamp-header text-center">
                  Deed of Oath & Legal Affidavit of Undertaking
                </div>
                
                <div class="text-center mb-4">
                  <h5 class="fw-bold mb-1" style="text-transform: uppercase;">BEFORE THE SPEAXA EDUCATION COMPLIANCE COMMITTEE</h5>
                  <div style="font-size: 0.78rem; text-transform: uppercase; color: #64748B; font-family: 'Inter', sans-serif;" class="mb-2">Onboarding & Professional Pedagogy Undertaking</div>
                  <div class="stamp-label mt-2">STAMP DUTY EXEMPT - EDTECH ONBOARDING SYSTEM</div>
                </div>

                <div class="seal-wrapper">
                  <div class="seal-text">SPEAXA<br>COMPLIANCE<br>BOARD</div>
                </div>

                <div class="card p-3 mb-4 bg-light border-0" style="border-radius: 12px; border: 1px solid var(--border) !important;">
                  <h6 class="fw-bold text-dark mb-2" style="font-size: 0.85rem;"><i class="fas fa-file-contract text-primary me-2"></i>Associated Legal Governance & Partnership Policies</h6>
                  <div class="row g-2">
                    <div class="col-md-6"><a href="/policies/speaxa-teacher-partnership-governance-agreement-part-1.html" target="_blank" class="small text-decoration-none fw-semibold text-primary"><i class="fas fa-external-link-alt me-1"></i>Teacher Governance Agreement Part 1</a></div>
                    <div class="col-md-6"><a href="/policies/speaxa-teacher-partnership-governance-agreement-part-2.html" target="_blank" class="small text-decoration-none fw-semibold text-primary"><i class="fas fa-external-link-alt me-1"></i>Academic Delivery & Batch Rules (Part 2)</a></div>
                    <div class="col-md-6"><a href="/policies/speaxa-teacher-partnership-governance-agreement-part-3.html" target="_blank" class="small text-decoration-none fw-semibold text-primary"><i class="fas fa-external-link-alt me-1"></i>Commercial Terms & IP Rights (Part 3)</a></div>
                    <div class="col-md-6"><a href="/policies/speaxa-teacher-partnership-governance-agreement-part-4.html" target="_blank" class="small text-decoration-none fw-semibold text-primary"><i class="fas fa-external-link-alt me-1"></i>Protection of Business & Goodwill (Part 4)</a></div>
                    <div class="col-md-6"><a href="/policies/speaxa-teacher-partnership-governance-agreement-part-5.html" target="_blank" class="small text-decoration-none fw-semibold text-primary"><i class="fas fa-external-link-alt me-1"></i>Training Cost Recovery (Part 5)</a></div>
                    <div class="col-md-6"><a href="/policies/teacher-standards-performance-evaluation-academic-quality-assurance-policy.html" target="_blank" class="small text-decoration-none fw-semibold text-primary"><i class="fas fa-external-link-alt me-1"></i>Teacher Standards & Quality Assurance</a></div>
                  </div>
                </div>

                <p>I, <strong>${user.name}</strong>, having been approved as an educator on the SPEAXA Edtech Platform, do hereby solemnly declare, depose, and state on oath as follows:</p>
                
                <ol class="mt-3" style="padding-left: 20px;">
                  <li class="mb-3">
                    <strong>SOLE DECLARATION OF PEDAGOGY:</strong> I undertake to maintain the highest standard of online lecturing. I understand that I operate as a Digital Mentor and represent the SPEAXA educational identity before students and parents.
                  </li>
                  <li class="mb-3">
                    <strong>TECHNICAL COMPLIANCE STANDARDS:</strong> I declare that my hardware setup conforms to the minimum platform standards, including a stable landscape 1080p camera feed, frontal soft light illumination, a dedicated noise-canceling collar microphone, and stable broadband connectivity (>20 Mbps upload) with active mobile backup hotspots.
                  </li>
                  <li class="mb-3">
                    <strong>CLASSROOM PROTOCOL & TIMING:</strong> I agree to join all scheduled classes 10-15 minutes prior to start time to test media feeds, and commit to running interactive checks, student polls, and concept recaps every 3-5 minutes.
                  </li>
                  <li class="mb-3">
                    <strong>INTEGRITY & NON-SOLICITATION AGREEMENT:</strong> I solemnly undertake that I will not solicit, encourage, or direct any SPEAXA student to join private coaching, personal batches, or external platforms. I will keep all student interactions strictly limited to the official platform channels.
                  </li>
                  <li class="mb-3">
                    <strong>REVENUE COMMISSION & PAYMENT SPLITS:</strong> I explicitly consent to the dynamic revenue commission framework (standard 50/50 platform-student share or custom mentor structures) and agree that payouts are processed in tranches upon validation of modules, attendance logs, and monthly grade mapping uploads.
                  </li>
                </ol>

                <div class="mt-4 pt-3 border-top text-secondary small">
                  <div>IN WITNESS WHEREOF, I set my digital signature and verify this deed under penalties of perjury under applicable laws.</div>
                </div>

                <div class="mt-4 text-start">
                  <div class="form-check mb-3">
                    <input class="form-check-input spx-checkbox" type="checkbox" id="agreementConsentCheckbox" style="cursor:pointer">
                    <label class="form-check-label text-secondary small fw-semibold" for="agreementConsentCheckbox" style="cursor:pointer; user-select:none">
                      I solemnly read and accept all the terms, platform commissions, payout tranches, and standard operating procedures of SPEAXA.
                    </label>
                  </div>
                  
                  <div class="mb-3">
                    <label class="spx-label font-bold text-dark mb-1">Digital Signature (Type your Full Name to Sign)</label>
                    <input type="text" class="form-control border p-3 spx-input" id="agreementSigInput" placeholder="Type your registered name here" style="background:#ffffff; color:#000000; border-color:#cbd5e1 !important">
                  </div>
                </div>

                <button class="btn btn-spx w-100 py-3" onclick="submitDigitalAgreement()">Sign & Activate Account</button>
              </div>
            </div>
          </div>
        `;
      } else if (sop && sop.status === 'approved' && sop.agreement_signed) {
        tabContentHtml = `
          <div class="row justify-content-center text-start">
            <div class="col-lg-12">
              <div class="legal-affidavit p-5">
                <div class="stamp-header text-center" style="background: var(--success)">
                  SIGNED AFFIDAVIT OF UNDERTAKING
                </div>
                <div class="text-center mb-4">
                  <h5 class="fw-bold mb-1" style="text-transform: uppercase;">DEED SIGNED AND COMPLETED</h5>
                  <div class="badge bg-success-subtle text-success py-1 px-3 mt-1"><i class="fas fa-check-circle me-1"></i>Active Account</div>
                </div>

                <p>Digital Agreement Signed on <strong>${fmtDate(sop.agreement_signed_at)}</strong> by educator <strong>${sop.digital_signature}</strong>.</p>
                <p class="text-muted small">Your credentials are now validated. Your account is fully active and visible in the public courses directory.</p>
                
                <div class="d-flex justify-content-center gap-3 mt-4">
                  <button class="btn btn-spx" onclick="navigateTo('batches')">Go to Batches</button>
                  <button class="btn btn-outline-primary" onclick="navigateTo('home')">Dashboard</button>
                </div>
              </div>
            </div>
          </div>
        `;
      } else {
        tabContentHtml = `
          <div class="spx-card text-center py-5 border-start border-4 border-warning" style="background: rgba(245,158,11,0.02)">
            <div class="display-4 text-warning mb-3"><i class="fas fa-lock"></i></div>
            <h4 class="fw-bold text-dark">Agreement Signature Locked</h4>
            <p class="text-muted small max-width-500 mx-auto">Your Video SOP and KYC Documents must be verified and approved by the Admin before you can review and sign the legal educator affidavit.</p>
            <button class="btn btn-warning mt-3 btn-sm" onclick="setSopTab('kyc')">Upload Documents</button>
          </div>
        `;
      }
    }

    let rejectAlertHtml = '';
    if (sop && sop.status === 'rejected') {
      rejectAlertHtml = `
        <div class="alert alert-danger p-4 mb-4 text-start" style="border-radius: 12px; border-left: 5px solid var(--bs-danger); background: rgba(239, 68, 68, 0.05); color: var(--bs-danger);">
          <div class="d-flex gap-3 align-items-start">
            <div class="text-danger" style="font-size: 1.75rem; line-height: 1;"><i class="fas fa-times-circle text-danger"></i></div>
            <div class="flex-grow-1">
              <h5 class="fw-bold text-danger mb-1">Onboarding Verification Rejected</h5>
              <p class="text-secondary small mb-3">Your standard operating procedure (SOP) setup or documents did not pass the verification checks. Please read the admin review notes below, correct the flagged items, and re-submit the complete SOP for verification.</p>
              <div class="p-3 mb-2 rounded bg-light border-start border-3 border-danger text-dark font-monospace" style="font-size: 0.85rem;">
                <strong>Admin Feedback:</strong> ${sop.admin_notes || 'Please verify the uploaded proofs and details.'}
              </div>
              <div class="text-muted small mt-2">
                <i class="fas fa-info-circle me-1"></i> You can edit and re-upload any rejected items under the tabs below (e.g. KYC Documents, Profile, Availability, Technical SOPs).
              </div>
            </div>
          </div>
        </div>
      `;
    }

    document.getElementById('pageContent').innerHTML = `
      ${rejectAlertHtml}
      <div class="sop-wizard-tabs">
        <button class="sop-wizard-tab-btn ${window._sopActiveTab === 'guidelines' ? 'active' : ''}" onclick="setSopTab('guidelines')">
          <i class="fas fa-book-open"></i> 1. Onboarding Guide
        </button>
        <button class="sop-wizard-tab-btn ${window._sopActiveTab === 'kyc' ? 'active' : ''} ${allKycUploaded ? 'completed' : ''}" onclick="setSopTab('kyc')">
          <i class="fas fa-id-card"></i> 2. KYC Documents ${allKycUploaded ? '✓' : ''}
        </button>
        <button class="sop-wizard-tab-btn ${window._sopActiveTab === 'profile' ? 'active' : ''} ${allProfileFilled ? 'completed' : ''}" onclick="setSopTab('profile')">
          <i class="fas fa-user-edit"></i> 3. Profile & Experience ${allProfileFilled ? '✓' : ''}
        </button>
        <button class="sop-wizard-tab-btn ${window._sopActiveTab === 'availability' ? 'active' : ''} ${allAvailFilled ? 'completed' : ''}" onclick="setSopTab('availability')">
          <i class="fas fa-calendar-alt"></i> 4. Availability Calendar ${allAvailFilled ? '✓' : ''}
        </button>
        <button class="sop-wizard-tab-btn ${window._sopActiveTab === 'video' ? 'active' : ''} ${allSopUploaded ? 'completed' : ''}" onclick="setSopTab('video')">
          <i class="fas fa-video"></i> 5. Technical SOPs ${allSopUploaded ? '✓' : ''}
        </button>
        <button class="sop-wizard-tab-btn ${window._sopActiveTab === 'agreement' ? 'active' : ''} ${sop?.agreement_signed ? 'completed' : ''}" onclick="setSopTab('agreement')">
          <i class="fas fa-file-contract"></i> 6. Deed of Affidavit ${sop?.agreement_signed ? '✓' : ''}
        </button>
      </div>

      <div id="sopTabBody">
        ${tabContentHtml}
      </div>
    `;

    // Initialize submit button state in Video SOP tab
    if (window._sopActiveTab === 'video' && !isSubmitted) {
      toggleSopSubmitBtn();
    }

    // Set up auto-saves for SOP Setup tabs
    if (window._sopActiveTab === 'profile' && !isSubmitted) {
      setupAutoSave('autosave_teacher_sop_profile', [
        'onboardSubjects', 'onboardLanguages', 'onboardExp', 'onboardQual', 
        'onboardAltEmail', 'onboardMobileNumber', 'onboardLinkedIn', 'onboardTwitter', 'onboardBio'
      ]);
    } else if (window._sopActiveTab === 'video' && !isSubmitted) {
      setupAutoSave('autosave_teacher_sop_video_links', [
        'link_camera_sop', 'link_lighting_sop', 'link_audio_sop', 'link_internet_proof', 'link_demo_teaching'
      ]);
    }
  } catch (e) {
    document.getElementById('pageContent').innerHTML = `<div class="alert alert-danger">${e.message}</div>`;
  }
}

function setSopTab(tabName) {
  window._sopActiveTab = tabName;
  window._sopTabSetExplicitly = true;
  renderSop();
}

async function autoUploadDoc(input, docType) {
  const file = input.files[0];
  if (!file) return;

  // Max 20MB client-side check
  const maxDocSize = 20 * 1024 * 1024;
  if (file.size > maxDocSize) {
    showToast(`File "${file.name}" is too large. Maximum size allowed for KYC documents is 20MB.`, 'error');
    input.value = '';
    return;
  }

  const spinner = document.getElementById(`spinner_kyc_${docType}`);
  if (spinner) spinner.classList.remove('d-none');

  const formData = new FormData();
  formData.append('doc_type', docType);
  formData.append('document', file);

  try {
    showToast(`Uploading ${docType.toUpperCase()} document...`, 'info');
    const res = await fetch(`${API}/teacher/documents/upload`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData,
    });
    const data = await parseFetchResponse(res);
    if (data.error) throw new Error(data.error);
    showToast(`${docType.toUpperCase()} uploaded successfully!`);
    renderSop();
  } catch (e) {
    showToast(e.message, 'error');
  } finally {
    if (spinner) spinner.classList.add('d-none');
  }
}

async function saveDocLink(docType) {
  const linkInput = document.getElementById(`link_doc_${docType}`);
  const link = linkInput ? linkInput.value.trim() : '';
  if (!link) return showToast('Please enter a valid link URL', 'error');

  try {
    showToast(`Saving link for ${docType.toUpperCase()}...`, 'info');
    const res = await fetch(`${API}/teacher/documents/link`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ doc_type: docType, link }),
    });
    const data = await parseFetchResponse(res);
    if (data.error) throw new Error(data.error);
    showToast(`${docType.toUpperCase()} link saved successfully!`);
    renderSop();
  } catch (e) {
    showToast(e.message, 'error');
  }
}

async function autoUploadSopVideo(input, fieldId) {
  const file = input.files[0];
  if (!file) return;

  // Max 200MB client-side check
  const maxVideoSize = 200 * 1024 * 1024;
  if (file.size > maxVideoSize) {
    showToast(`File "${file.name}" is too large. Maximum size allowed for video evidence is 200MB.`, 'error');
    input.value = '';
    return;
  }

  const spinner = document.getElementById(`spinner_sop_${fieldId}`);
  if (spinner) spinner.classList.remove('d-none');

  const formData = new FormData();
  formData.append(fieldId, file);

  try {
    showToast(`Uploading ${fieldId.replace('_',' ')}... Please wait.`, 'info');
    const res = await fetch(`${API}/teacher/sop/upload/${fieldId}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData,
    });
    const data = await parseFetchResponse(res);
    if (data.error) throw new Error(data.error);
    showToast(`${fieldId.replace('_',' ')} uploaded successfully!`);
    renderSop();
  } catch (e) {
    showToast(e.message, 'error');
  } finally {
    if (spinner) spinner.classList.add('d-none');
  }
}

async function saveSopLink(fieldId) {
  const linkInput = document.getElementById(`link_${fieldId}`);
  const link = linkInput ? linkInput.value.trim() : '';
  if (!link) return showToast('Please enter a valid link URL', 'error');

  try {
    showToast(`Saving link for ${fieldId.replace('_',' ')}...`, 'info');
    const res = await fetch(`${API}/teacher/sop/link/${fieldId}`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ link }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    showToast(`${fieldId.replace('_',' ')} link saved successfully!`);
    
    // Clear item from links autosave cache
    try {
      const key = 'autosave_teacher_sop_video_links';
      const saved = JSON.parse(localStorage.getItem(key) || '{}');
      delete saved[`link_${fieldId}`];
      localStorage.setItem(key, JSON.stringify(saved));
    } catch {}
    
    renderSop();
  } catch (e) {
    showToast(e.message, 'error');
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

async function saveProfileOnboarding(e) {
  e.preventDefault();
  const subject_expertise = document.getElementById('onboardSubjects').value.trim();
  const languages = document.getElementById('onboardLanguages').value.trim();
  const experience_years = parseInt(document.getElementById('onboardExp').value) || 0;
  const qualification = document.getElementById('onboardQual').value.trim();
  const alt_email = document.getElementById('onboardAltEmail').value.trim();
  const mobile_number = document.getElementById('onboardMobileNumber').value.trim();
  const linkedin = document.getElementById('onboardLinkedIn').value.trim();
  const twitter = document.getElementById('onboardTwitter').value.trim();
  const bio = document.getElementById('onboardBio').value.trim();

  try {
    showToast('Saving profile details...', 'info');
    const data = await api('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify({
        subject_expertise,
        languages,
        experience_years,
        qualification,
        alt_email,
        mobile_number,
        social_links: { linkedin, twitter },
        bio
      })
    });
    showToast(data.message || 'Profile details saved successfully!');
    clearAutoSave('autosave_teacher_sop_profile');
    renderSop();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function saveAvailabilityOnboarding(e) {
  if (e) e.preventDefault();
  const slots = window._tempAvailabilitySlots || [];
  if (slots.length === 0) {
    return showToast('Please add at least one weekly availability slot.', 'error');
  }

  try {
    showToast('Saving availability calendar...', 'info');
    const data = await api('/teacher/sop/availability', {
      method: 'POST',
      body: JSON.stringify({ availability: slots })
    });
    showToast(data.message || 'Availability calendar saved successfully!');
    renderSop();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function formatTime(timeStr) {
  if (!timeStr) return '';
  const [hours, minutes] = timeStr.split(':');
  const hrs = parseInt(hours);
  const ampm = hrs >= 12 ? 'PM' : 'AM';
  const displayHrs = hrs % 12 || 12;
  return `${displayHrs}:${minutes} ${ampm}`;
}

function addAvailabilitySlot() {
  const checkboxes = document.querySelectorAll('.avail-day-check');
  const selectedDays = [];
  checkboxes.forEach(cb => {
    if (cb.checked) selectedDays.push(cb.value);
  });

  if (selectedDays.length === 0) {
    return showToast('Please select at least one day.', 'error');
  }

  const startTime = document.getElementById('slotStart').value;
  const endTime = document.getElementById('slotEnd').value;
  const timezone = document.getElementById('slotTimezone').value;

  if (!startTime || !endTime) {
    return showToast('Please specify start and end times.', 'error');
  }

  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  if (startH > endH || (startH === endH && startM >= endM)) {
    return showToast('End time must be after start time.', 'error');
  }

  window._tempAvailabilitySlots = window._tempAvailabilitySlots || [];
  window._tempAvailabilitySlots.push({
    days: selectedDays,
    startTime,
    endTime,
    timezone
  });

  renderSop();
  showToast('Time slot added to calendar!');
}

function deleteAvailabilitySlot(index) {
  if (!window._tempAvailabilitySlots) return;
  window._tempAvailabilitySlots.splice(index, 1);
  renderSop();
  showToast('Time slot removed.');
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

    // Cache courses for live details
    window._coursesCache = courses;
    window._batchesCache = batches || [];
    window._batchActiveTab = window._batchActiveTab || 'list';

    // Build the sub-tab bar
    const tabHeaderHtml = `
      <div class="d-flex align-items-center justify-content-between mb-4 pb-3 border-bottom" style="border-color: var(--border) !important;">
        <h5 class="fw-bold text-dark mb-0" style="font-family: 'Outfit', sans-serif;">Study Batches</h5>
        <div class="d-flex gap-2">
          <button class="btn btn-sm ${window._batchActiveTab === 'list' ? 'btn-spx' : 'btn-outline-secondary'}" onclick="switchBatchTab('list')">
            <i class="fas fa-list me-1"></i> My Batches
          </button>
          <button class="btn btn-sm ${window._batchActiveTab === 'create' ? 'btn-spx' : 'btn-outline-secondary'}" onclick="switchBatchTab('create')">
            <i class="fas fa-plus me-1"></i> Create Batch
          </button>
        </div>
      </div>
    `;

    if (window._batchActiveTab === 'list') {
      document.getElementById('pageContent').innerHTML = `
        ${tabHeaderHtml}
        <div class="row g-4">
          <div class="col-lg-12">
            <div class="spx-card">
              <h6 class="mb-4 fw-bold">My Batches</h6>
              ${batches.length ? batches.map(b => {
                const isDeactivated = ['inactive', 'disabled', 'archived', 'suspended'].includes(b.status) || ['inactive', 'disabled', 'archived', 'suspended'].includes(b.course_status);
                return `
                <div class="p-3 mb-3 rounded-3 ${isDeactivated ? 'border-danger bg-danger-subtle bg-opacity-10' : ''}" style="background:rgba(255,255,255,.01);border:1px solid ${isDeactivated ? '#ef4444' : 'var(--border)'}">
                  <div class="d-flex align-items-start gap-3">
                    <div style="width:48px;height:48px;border-radius:12px;background:var(--gradient);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0">📚</div>
                    <div class="flex-grow-1">
                      <div class="d-flex align-items-center gap-2 flex-wrap">
                        <h6 class="text-dark fw-bold mb-0">${b.batch_name}</h6>
                        ${isDeactivated ? '<span class="badge bg-danger text-white px-2 py-1" style="font-size:0.7rem;"><i class="fas fa-ban me-1"></i>Deactivated by Admin</span>' : '<span class="badge bg-success-subtle text-success px-2 py-0.5" style="font-size:0.68rem;">Active</span>'}
                      </div>
                      <div class="text-muted small mt-0.5">${b.course_title || 'Course'}</div>
                      ${isDeactivated ? `
                        <div class="mt-2 p-2 rounded bg-danger-subtle text-danger border border-danger-subtle" style="font-size:0.75rem; line-height: 1.35;">
                          <i class="fas fa-exclamation-triangle me-1"></i><strong>Deactivated by Admin:</strong> This batch/course has been toggled off by Admin. Please contact Admin to take necessary action to reactivate it.
                        </div>
                      ` : ''}
                      <div class="d-flex flex-wrap gap-3 mt-2 text-muted small">
                        <span><i class="fas fa-users me-1"></i>${b.enrolled_count || 0} / ${b.capacity} Students</span>
                        <span><i class="fas fa-calendar me-1"></i>${(b.days_of_week || []).join(', ')}</span>
                        <span><i class="fas fa-clock me-1"></i>${b.start_time} - ${b.end_time}</span>
                        <span>
                          <i class="fas fa-file-pdf me-1"></i>
                          ${b.planner_url ? `
                            <a href="${b.planner_url}" target="_blank" class="text-primary text-decoration-none fw-bold">
                              <i class="fas fa-download me-1"></i>${b.planner_name || 'Download Planner'}
                            </a>
                          ` : '<span class="text-warning"><i class="fas fa-exclamation-triangle me-1"></i>No Planner</span>'}
                        </span>
                      </div>
                      ${b.planner_desc ? `
                        <div class="mt-2 p-2 rounded text-secondary" style="background:rgba(255,255,255,0.02); font-size:0.78rem; line-height: 1.4; border: 1px solid rgba(255,255,255,0.03);">
                          <strong class="text-dark d-block mb-1"><i class="fas fa-list-ol me-1 text-primary"></i>Learning Schedule:</strong>
                          <div>${formatCollapsibleText(b.planner_desc, 130)}</div>
                        </div>
                      ` : ''}
                    </div>
                    <div class="d-flex gap-2 flex-wrap align-items-center">
                      <button class="btn btn-xs btn-outline-primary px-2.5 py-1" style="font-size:0.72rem;" ${isDeactivated ? 'disabled' : ''} onclick="openUploadPlannerModal('${b.id}', '${b.batch_name.replace(/'/g, "\\'")}')">
                        <i class="fas fa-upload me-1"></i> Planner
                      </button>
                      <button class="btn btn-xs btn-spx px-2.5 py-1" style="font-size:0.72rem;" onclick="viewBatchStudents('${b.id}', '${b.batch_name}')">Students</button>
                      <button class="btn btn-xs btn-outline-danger px-2.5 py-1" style="font-size:0.72rem;" onclick="requestDeleteBatch('${b.id}', '${b.batch_name.replace(/'/g, "\\'")}')">
                        <i class="fas fa-trash-alt me-1"></i> Delete
                      </button>
                    </div>
                  </div>
                </div>
              `;
              }).join('') : '<p class="text-muted text-center py-4">No batches created yet.</p>'}
            </div>
          </div>
        </div>
      `;
    } else {
      document.getElementById('pageContent').innerHTML = `
        ${tabHeaderHtml}
        <div class="row g-4">
          <!-- Left Column: Live Course Details & Batch Preview Card -->
          <div class="col-lg-6">
            <div id="batchPreviewContainer">
              <!-- Rendered Dynamically -->
            </div>
          </div>

          <!-- Right Column: Create Form -->
          <div class="col-lg-6">
            <div class="spx-card">
              <h6 class="mb-4 fw-bold">Create New Batch</h6>
              <form onsubmit="createBatch(event)">
                <div class="mb-3">
                  <label class="spx-label">Course</label>
                  <div class="custom-searchable-select-container" id="customCourseContainer">
                    <button type="button" class="form-select spx-input text-start" id="customBatchCourseTrigger" onclick="toggleCustomBatchCourseDropdown(event)" style="background-color: #0f172a !important; color: #ffffff !important; border: 1px solid var(--border) !important; background-image: url('data:image/svg+xml,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 16 16%27%3e%3cpath fill=%27none%27 stroke=%27%23ffffff%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27 stroke-width=%272%27 d=%27m2 5 6 6 6-6%27/%3e%3c/svg%3e') !important; background-repeat: no-repeat !important; background-position: right 0.75rem center !important; background-size: 16px 12px !important; padding-right: 2.25rem !important;">
                      <span id="customBatchCourseLabel" style="color: #94a3b8 !important; font-weight: 500;">Select Course</span>
                    </button>
                    
                    <div class="custom-searchable-select-menu" id="customBatchCourseMenu">
                      <div class="custom-searchable-select-search-wrapper">
                        <div class="input-group">
                          <span class="input-group-text" style="background:#1e293b; border-color:var(--border); color:#a0aec0;"><i class="fas fa-search"></i></span>
                          <input type="text" class="form-control" id="customCourseSearch" placeholder="Search courses..." oninput="filterCustomBatchCourses(this.value)" style="background:#1e293b; border-color:var(--border); color:#ffffff; font-size: 0.85rem;" autocomplete="off" onclick="event.stopPropagation()">
                        </div>
                      </div>
                      
                      <div class="custom-searchable-select-options-list" id="customCourseOptionsList">
                        ${courses.filter(c => c.status === 'active').map(c => `
                          <div class="custom-searchable-select-option" data-value="${c.id}" onclick="selectCustomBatchCourse('${c.id}', '${c.title.replace(/'/g, "\\'")} (${c.grade})', event)">
                            ${c.title} (${c.grade})
                          </div>
                        `).join('')}
                        ${courses.filter(c => c.status === 'active').length === 0 ? `
                          <div class="custom-searchable-select-option no-results">No active courses found</div>
                        ` : ''}
                      </div>
                    </div>

                    <select id="batchCourse" onchange="handleCourseChange(this.value)" required style="position:absolute; width:1px; height:1px; opacity:0; pointer-events:none; border:none; padding:0; margin:0; left:50%; bottom:0;">
                      <option value="">Select Course</option>
                      ${courses.filter(c => c.status === 'active').map(c => `<option value="${c.id}">${c.title} (${c.grade})</option>`).join('')}
                    </select>
                  </div>
                </div>
                <div class="mb-3">
                  <label class="spx-label">Batch Name</label>
                  <input class="form-control spx-input" id="batchName" placeholder="e.g. Physics Core Morning" oninput="updateBatchPreview()" required>
                </div>
                <div class="mb-3">
                  <label class="spx-label">Subject</label>
                  <input class="form-control spx-input" id="batchSubject" placeholder="e.g. Physics" oninput="updateBatchPreview()" required>
                </div>
                <div class="row g-2 mb-3">
                  <div class="col-6">
                    <label class="spx-label">Start Date</label>
                    <input type="date" class="form-control spx-input" id="batchStartD" onchange="updateBatchPreview()" required>
                  </div>
                  <div class="col-6">
                    <label class="spx-label">End Date</label>
                    <input type="date" class="form-control spx-input" id="batchEndD" onchange="updateBatchPreview()" required>
                  </div>
                </div>
                <div class="row g-2 mb-3">
                  <div class="col-6">
                    <label class="spx-label">Start Time</label>
                    <input type="time" class="form-control spx-input" id="batchStartT" onchange="updateBatchPreview()" required>
                  </div>
                  <div class="col-6">
                    <label class="spx-label">End Time</label>
                    <input type="time" class="form-control spx-input" id="batchEndT" onchange="updateBatchPreview()" required>
                  </div>
                </div>
                <div class="mb-3">
                  <label class="spx-label mb-2">Days of Week</label>
                  <div class="d-flex flex-wrap gap-2" id="batchDaysContainer">
                    ${['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => `
                      <button type="button" class="btn btn-sm btn-outline-primary day-selector-btn px-3 py-2 fw-semibold" data-day="${day}" onclick="toggleDaySelector(this)" style="border-radius: 8px; font-size: 0.8rem;">
                        ${day.slice(0, 3)}
                      </button>
                    `).join('')}
                  </div>
                  <input type="hidden" id="batchDays" required>
                </div>
                <div class="mb-3">
                  <label class="spx-label">Max Capacity (Max ${maxBatchCapacity})</label>
                  <input type="number" class="form-control spx-input" id="batchCapacity" value="${maxBatchCapacity}" max="${maxBatchCapacity}" oninput="updateBatchPreview()" required>
                </div>
                <div class="mb-3">
                  <label class="spx-label mb-1">Learning Schedule / Syllabus Text *</label>
                  <textarea class="form-control spx-input" id="batchPlannerDesc" rows="4" placeholder="e.g. Week 1: Introduction to Mechanics&#10;Week 2: Newtons Laws of Motion" oninput="updateBatchPreview()" required></textarea>
                  <div class="form-text text-muted small mt-1">Write out the weekly schedule details directly.</div>
                </div>
                <div class="mb-3">
                  <label class="spx-label">Upload Course Planner / Syllabus (Any format) *</label>
                  <input type="file" class="form-control spx-input" id="batchPlanner" required>
                  <div class="form-text text-muted small mt-1">Select any file (PDF, Doc, Zip, etc.) detailing your batch syllabus schedule.</div>
                </div>
                <div class="mb-3">
                  <label class="spx-label mb-0">Way of Teaching / Teaching Methodology *</label>
                  <small class="text-muted d-block mb-1" style="font-size: 0.72rem; line-height: 1.2;">Explain your teaching style, interactive format, worksheets, and schedule structure to help students choose your batch.</small>
                  <textarea class="form-control spx-input" id="batchTeachingMethod" rows="3" placeholder="e.g. I focus heavily on interactive visual slides, followed by live coding and daily worksheets. I conduct doubt sessions every alternate day." required></textarea>
                </div>
                <div class="mb-3">
                  <label class="spx-label mb-0">Important Batch Instructions / Prerequisites *</label>
                  <small class="text-muted d-block mb-1" style="font-size: 0.72rem; line-height: 1.2;">Add any requirements, materials, prior knowledge or preparation instructions needed for this batch.</small>
                  <textarea class="form-control spx-input" id="batchInstructions" rows="3" placeholder="e.g. Recommended for students with a basic understanding of quadratic equations. Must bring a notebook and laptop to classes." required></textarea>
                </div>
                <div class="mb-3">
                  <label class="spx-label mb-0">Batch Demo Video *</label>
                  <small class="text-muted d-block mb-1" style="font-size: 0.72rem; line-height: 1.2;">Provide an introductory video explaining the course layout. You can EITHER upload a video file OR paste a direct shareable link (like YouTube, Google Drive, or Loom).</small>
                  <div class="row g-2 mt-1">
                    <div class="col-sm-6">
                      <label class="small text-muted mb-1" style="font-size:0.68rem; text-transform:uppercase;">Option A: Upload Video File</label>
                      <input type="file" class="form-control spx-input" id="batchDemoVideo" accept="video/*,.mp4,.webm,.mov,.avi,.mkv,.m4v,.flv,.3gp,.wmv,.ts,.quicktime">
                    </div>
                    <div class="col-sm-6">
                      <label class="small text-muted mb-1" style="font-size:0.68rem; text-transform:uppercase;">Option B: Paste Video Link URL</label>
                      <input type="text" class="form-control spx-input" id="batchDemoVideoUrl" placeholder="e.g. https://www.youtube.com/watch?v=...">
                    </div>
                  </div>
                </div>
                <button type="submit" class="btn btn-spx w-100">Create Batch</button>
              </form>
            </div>
          </div>
        </div>
      `;
      updateBatchPreview();
      setupAutoSave('autosave_teacher_batch', [
        'batchCourse', 'batchName', 'batchSubject', 'batchStartD', 'batchEndD',
        'batchStartT', 'batchEndT', 'batchCapacity', 'batchPlannerDesc',
        'batchTeachingMethod', 'batchInstructions'
      ]);
    }
  } catch (e) {
    document.getElementById('pageContent').innerHTML = `<div class="alert alert-danger">${e.message}</div>`;
  }
}

function switchBatchTab(tab) {
  window._batchActiveTab = tab;
  renderBatches();
}

async function requestDeleteBatch(batchId, batchName) {
  const ok = await window.spxConfirm({
    title: 'Delete Batch Confirmation',
    badge: 'Teacher Action',
    message: `
      <div style="color: #0f172a !important; font-weight: 700 !important; font-size: 1.05rem !important; margin-bottom: 10px !important;">Delete batch "${batchName}"?</div>
      <div style="background: #fffbeb !important; border: 1px solid #fde68a !important; color: #92400e !important; padding: 12px 14px !important; border-radius: 10px !important; font-size: 0.86rem !important; line-height: 1.5 !important;">
        <i class="fas fa-info-circle me-1" style="color: #d97706 !important;"></i> <strong>Note:</strong> It will be moved to the Admin Restore System for safety. Admin can restore it back or permanently delete it.
      </div>
    `,
    confirmText: 'Move to Trash',
    cancelText: 'Cancel'
  });
  if (!ok) return;

  try {
    const res = await api(`/teacher/batches/${batchId}`, { method: 'DELETE' });
    showToast(res.message || 'Deletion requested. Sent to Admin Restore System.');
    renderBatches();
  } catch (err) {
    showToast(err.message || 'Failed to request batch deletion.', 'error');
  }
}

async function requestDeleteAssignment(assignmentId, title) {
  const ok = await window.spxConfirm({
    title: 'Delete Assignment Confirmation',
    badge: 'Teacher Action',
    message: `
      <div style="color: #0f172a !important; font-weight: 700 !important; font-size: 1.05rem !important; margin-bottom: 10px !important;">Delete assignment "${title}"?</div>
      <div style="background: #fffbeb !important; border: 1px solid #fde68a !important; color: #92400e !important; padding: 12px 14px !important; border-radius: 10px !important; font-size: 0.86rem !important; line-height: 1.5 !important;">
        <i class="fas fa-info-circle me-1" style="color: #d97706 !important;"></i> <strong>Note:</strong> It will be moved to the Admin Restore System for safety. Admin can restore it back or permanently delete it.
      </div>
    `,
    confirmText: 'Move to Trash',
    cancelText: 'Cancel'
  });
  if (!ok) return;

  try {
    const res = await api(`/teacher/assignments/${assignmentId}`, { method: 'DELETE' });
    showToast(res.message || 'Deletion requested. Sent to Admin Restore System.');
    if (typeof renderAssignments === 'function') renderAssignments();
  } catch (err) {
    showToast(err.message || 'Failed to request assignment deletion.', 'error');
  }
}

async function requestDeleteLiveClass(classId, title) {
  const ok = await window.spxConfirm({
    title: 'Delete Live Class Confirmation',
    badge: 'Teacher Action',
    message: `
      <div style="color: #0f172a !important; font-weight: 700 !important; font-size: 1.05rem !important; margin-bottom: 10px !important;">Delete live class "${title}"?</div>
      <div style="background: #fffbeb !important; border: 1px solid #fde68a !important; color: #92400e !important; padding: 12px 14px !important; border-radius: 10px !important; font-size: 0.86rem !important; line-height: 1.5 !important;">
        <i class="fas fa-info-circle me-1" style="color: #d97706 !important;"></i> <strong>Note:</strong> It will be moved to the Admin Restore System for safety. Admin can restore it back or permanently delete it.
      </div>
    `,
    confirmText: 'Move to Trash',
    cancelText: 'Cancel'
  });
  if (!ok) return;

  try {
    const res = await api(`/teacher/live-classes/${classId}`, { method: 'DELETE' });
    showToast(res.message || 'Deletion requested. Sent to Admin Restore System.');
    if (typeof renderLiveClasses === 'function') renderLiveClasses();
  } catch (err) {
    showToast(err.message || 'Failed to request live class deletion.', 'error');
  }
}

async function requestDeleteStudyMaterial(materialId, title) {
  const ok = await window.spxConfirm({
    title: 'Delete Material Confirmation',
    badge: 'Teacher Action',
    message: `
      <div style="color: #0f172a !important; font-weight: 700 !important; font-size: 1.05rem !important; margin-bottom: 10px !important;">Delete study material "${title}"?</div>
      <div style="background: #fffbeb !important; border: 1px solid #fde68a !important; color: #92400e !important; padding: 12px 14px !important; border-radius: 10px !important; font-size: 0.86rem !important; line-height: 1.5 !important;">
        <i class="fas fa-info-circle me-1" style="color: #d97706 !important;"></i> <strong>Note:</strong> It will be moved to the Admin Restore System for safety. Admin can restore it back or permanently delete it.
      </div>
    `,
    confirmText: 'Move to Trash',
    cancelText: 'Cancel'
  });
  if (!ok) return;

  try {
    const res = await api(`/teacher/notes/${materialId}`, { method: 'DELETE' });
    showToast(res.message || 'Deletion requested. Sent to Admin Restore System.');
    if (typeof renderNotes === 'function') renderNotes();
  } catch (err) {
    showToast(err.message || 'Failed to request study material deletion.', 'error');
  }
}

function editStudyMaterial(id, title, description, file_url) {
  let modalEl = document.getElementById('editStudyMaterialModal');
  if (!modalEl) {
    const div = document.createElement('div');
    div.innerHTML = `
      <div class="modal fade" id="editStudyMaterialModal" tabindex="-1" aria-hidden="true" style="z-index: 1080;">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content" style="background:#0f172a; color:#fff; border:1px solid var(--border); border-radius:12px;">
            <div class="modal-header border-secondary">
              <h5 class="modal-title fw-bold text-white"><i class="fas fa-edit text-primary me-2"></i>Edit Study Material</h5>
              <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <form onsubmit="saveEditStudyMaterial(event)">
              <input type="hidden" id="editNoteId">
              <div class="modal-body">
                <div class="mb-3">
                  <label class="spx-label">Material Title *</label>
                  <input type="text" class="form-control spx-input" id="editNoteTitle" required style="background:#1e293b; color:#fff; border:1px solid var(--border);">
                </div>
                <div class="mb-3">
                  <label class="spx-label">Description *</label>
                  <textarea class="form-control spx-input" id="editNoteDesc" rows="3" required style="background:#1e293b; color:#fff; border:1px solid var(--border);"></textarea>
                </div>
                <div class="mb-3">
                  <label class="spx-label">Replace File OR Update Web URL Link</label>
                  <input type="file" class="form-control spx-input mb-2" id="editNoteFile" style="background:#1e293b; color:#fff; border:1px solid var(--border);">
                  <input type="text" class="form-control spx-input" id="editNoteUrl" placeholder="https://..." style="background:#1e293b; color:#fff; border:1px solid var(--border);">
                </div>
              </div>
              <div class="modal-footer border-secondary">
                <button type="button" class="btn btn-sm btn-outline-secondary" data-bs-dismiss="modal">Cancel</button>
                <button type="submit" class="btn btn-sm btn-spx">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(div);
    modalEl = document.getElementById('editStudyMaterialModal');
  }

  document.getElementById('editNoteId').value = id;
  document.getElementById('editNoteTitle').value = title;
  document.getElementById('editNoteDesc').value = description;
  document.getElementById('editNoteUrl').value = file_url;
  document.getElementById('editNoteFile').value = '';

  const modalObj = new bootstrap.Modal(modalEl);
  modalObj.show();
}

async function saveEditStudyMaterial(e) {
  e.preventDefault();
  const id = document.getElementById('editNoteId').value;
  const title = document.getElementById('editNoteTitle').value;
  const description = document.getElementById('editNoteDesc').value;
  const file_url = document.getElementById('editNoteUrl').value;
  const fileInput = document.getElementById('editNoteFile').files[0];

  const formData = new FormData();
  formData.append('title', title);
  formData.append('description', description);
  if (file_url) formData.append('file_url', file_url);
  if (fileInput) formData.append('file', fileInput);

  try {
    const res = await fetch(`${API}/teacher/notes/${id}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    });
    const data = await parseFetchResponse(res);
    if (data.error) throw new Error(data.error);

    showToast(data.message || 'Study material updated successfully!');
    const modalEl = document.getElementById('editStudyMaterialModal');
    const modalObj = bootstrap.Modal.getInstance(modalEl);
    if (modalObj) modalObj.hide();
    if (typeof renderNotes === 'function') renderNotes();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function editLiveClass(id, title, classDate, classTime) {
  let modalEl = document.getElementById('editLiveClassModal');
  if (!modalEl) {
    const div = document.createElement('div');
    div.innerHTML = `
      <div class="modal fade" id="editLiveClassModal" tabindex="-1" aria-hidden="true" style="z-index: 1080;">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content" style="background:#0f172a; color:#fff; border:1px solid var(--border); border-radius:12px;">
            <div class="modal-header border-secondary">
              <h5 class="modal-title fw-bold text-white"><i class="fas fa-edit text-primary me-2"></i>Edit Scheduled Live Class</h5>
              <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <form onsubmit="saveEditLiveClass(event)">
              <input type="hidden" id="editClassId">
              <div class="modal-body">
                <div class="mb-3">
                  <label class="spx-label">Class Title *</label>
                  <input type="text" class="form-control spx-input" id="editClassTitle" required style="background:#1e293b; color:#fff; border:1px solid var(--border);">
                </div>
                <div class="mb-3">
                  <label class="spx-label">Class Date *</label>
                  <input type="date" class="form-control spx-input" id="editClassDate" required style="background:#1e293b; color:#fff; border:1px solid var(--border);">
                </div>
                <div class="mb-3">
                  <label class="spx-label">Class Time *</label>
                  <input type="time" class="form-control spx-input" id="editClassTime" required style="background:#1e293b; color:#fff; border:1px solid var(--border);">
                </div>
              </div>
              <div class="modal-footer border-secondary">
                <button type="button" class="btn btn-sm btn-outline-secondary" data-bs-dismiss="modal">Cancel</button>
                <button type="submit" class="btn btn-sm btn-spx">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(div);
    modalEl = document.getElementById('editLiveClassModal');
  }

  document.getElementById('editClassId').value = id;
  document.getElementById('editClassTitle').value = title;
  document.getElementById('editClassDate').value = classDate ? classDate.split('T')[0] : '';
  document.getElementById('editClassTime').value = classTime || '';

  const modalObj = new bootstrap.Modal(modalEl);
  modalObj.show();
}

async function saveEditLiveClass(e) {
  e.preventDefault();
  const id = document.getElementById('editClassId').value;
  const title = document.getElementById('editClassTitle').value;
  const classDate = document.getElementById('editClassDate').value;
  const classTime = document.getElementById('editClassTime').value;

  try {
    const res = await api(`/teacher/live-classes/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ title, classDate, classTime })
    });
    showToast(res.message || 'Live class updated successfully!');
    const modalEl = document.getElementById('editLiveClassModal');
    const modalObj = bootstrap.Modal.getInstance(modalEl);
    if (modalObj) modalObj.hide();
    if (typeof renderLiveClasses === 'function') renderLiveClasses();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function editAssignment(id, title, description, due_date, max_marks) {
  let modalEl = document.getElementById('editAssignmentModal');
  if (!modalEl) {
    const div = document.createElement('div');
    div.innerHTML = `
      <div class="modal fade" id="editAssignmentModal" tabindex="-1" aria-hidden="true" style="z-index: 1080;">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content" style="background:#0f172a; color:#fff; border:1px solid var(--border); border-radius:12px;">
            <div class="modal-header border-secondary">
              <h5 class="modal-title fw-bold text-white"><i class="fas fa-edit text-primary me-2"></i>Edit Assignment</h5>
              <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <form onsubmit="saveEditAssignment(event)">
              <input type="hidden" id="editAssignId">
              <div class="modal-body">
                <div class="mb-3">
                  <label class="spx-label">Assignment Title *</label>
                  <input type="text" class="form-control spx-input" id="editAssignTitle" required style="background:#1e293b; color:#fff; border:1px solid var(--border);">
                </div>
                <div class="mb-3">
                  <label class="spx-label">Description *</label>
                  <textarea class="form-control spx-input" id="editAssignDesc" rows="3" required style="background:#1e293b; color:#fff; border:1px solid var(--border);"></textarea>
                </div>
                <div class="row g-2 mb-3">
                  <div class="col-6">
                    <label class="spx-label">Due Date *</label>
                    <input type="date" class="form-control spx-input" id="editAssignDueDate" required style="background:#1e293b; color:#fff; border:1px solid var(--border);">
                  </div>
                  <div class="col-6">
                    <label class="spx-label">Max Marks *</label>
                    <input type="number" class="form-control spx-input" id="editAssignMaxMarks" required style="background:#1e293b; color:#fff; border:1px solid var(--border);">
                  </div>
                </div>
                <div class="mb-3">
                  <label class="spx-label">Replace Attachment File (Optional)</label>
                  <input type="file" class="form-control spx-input" id="editAssignFile" style="background:#1e293b; color:#fff; border:1px solid var(--border);">
                </div>
              </div>
              <div class="modal-footer border-secondary">
                <button type="button" class="btn btn-sm btn-outline-secondary" data-bs-dismiss="modal">Cancel</button>
                <button type="submit" class="btn btn-sm btn-spx">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(div);
    modalEl = document.getElementById('editAssignmentModal');
  }

  document.getElementById('editAssignId').value = id;
  document.getElementById('editAssignTitle').value = title;
  document.getElementById('editAssignDesc').value = description;
  document.getElementById('editAssignDueDate').value = due_date ? due_date.split('T')[0] : '';
  document.getElementById('editAssignMaxMarks').value = max_marks || 100;
  document.getElementById('editAssignFile').value = '';

  const modalObj = new bootstrap.Modal(modalEl);
  modalObj.show();
}

async function saveEditAssignment(e) {
  e.preventDefault();
  const id = document.getElementById('editAssignId').value;
  const title = document.getElementById('editAssignTitle').value;
  const description = document.getElementById('editAssignDesc').value;
  const due_date = document.getElementById('editAssignDueDate').value;
  const max_marks = document.getElementById('editAssignMaxMarks').value;
  const fileInput = document.getElementById('editAssignFile').files[0];

  const formData = new FormData();
  formData.append('title', title);
  formData.append('description', description);
  formData.append('due_date', due_date);
  formData.append('max_marks', max_marks);
  if (fileInput) formData.append('file', fileInput);

  try {
    const res = await fetch(`${API}/teacher/assignments/${id}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    });
    const data = await parseFetchResponse(res);
    if (data.error) throw new Error(data.error);

    showToast(data.message || 'Assignment updated successfully!');
    const modalEl = document.getElementById('editAssignmentModal');
    const modalObj = bootstrap.Modal.getInstance(modalEl);
    if (modalObj) modalObj.hide();
    if (typeof renderAssignments === 'function') renderAssignments();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleCourseChange(courseId) {
  if (!courseId) {
    window._selectedCourse = null;
    updateBatchPreview();
    return;
  }

  const course = (window._coursesCache || []).find(c => c.id === courseId);
  window._selectedCourse = course;
  updateBatchPreview();
}

function toggleDaySelector(btn) {
  btn.classList.toggle('active');
  btn.classList.toggle('btn-primary');
  btn.classList.toggle('btn-outline-primary');

  const selectedButtons = document.querySelectorAll('#batchDaysContainer .day-selector-btn.active');
  const selectedDays = Array.from(selectedButtons).map(b => b.getAttribute('data-day'));
  
  const hiddenInput = document.getElementById('batchDays');
  if (hiddenInput) {
    hiddenInput.value = selectedDays.join(', ');
  }
  updateBatchPreview();
}

function updateBatchPreview() {
  const container = document.getElementById('batchPreviewContainer');
  if (!container) return;

  if (!window._selectedCourse) {
    container.innerHTML = `
      <div class="spx-card text-center py-5 border-dashed" style="border: 2px dashed var(--border) !important; background: transparent; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 400px;">
        <div style="font-size: 40px; opacity: 0.5;" class="mb-3">👉</div>
        <h6 class="text-dark fw-bold">Select a Course</h6>
        <p class="text-muted small mb-0 mx-auto" style="max-width: 320px;">
          Please choose a course in the form to preview the syllabus modules, course information, and your live batch card mockup.
        </p>
      </div>
    `;
    return;
  }

  const batchNameVal = document.getElementById('batchName')?.value || '';
  const batchSubjectVal = document.getElementById('batchSubject')?.value || '';
  const batchStartDVal = document.getElementById('batchStartD')?.value || '';
  const batchEndDVal = document.getElementById('batchEndD')?.value || '';
  const batchStartTVal = document.getElementById('batchStartT')?.value || '';
  const batchEndTVal = document.getElementById('batchEndT')?.value || '';
  const batchDaysVal = document.getElementById('batchDays')?.value || '';
  const batchCapacityVal = document.getElementById('batchCapacity')?.value || '';

  let timeStr = 'Not specified';
  if (batchStartTVal && batchEndTVal) {
    timeStr = `${formatTime(batchStartTVal)} - ${formatTime(batchEndTVal)}`;
  } else if (batchStartTVal) {
    timeStr = `Starts at ${formatTime(batchStartTVal)}`;
  }

  let dateStr = 'Not specified';
  if (batchStartDVal && batchEndDVal) {
    dateStr = `${fmtDate(batchStartDVal)} to ${fmtDate(batchEndDVal)}`;
  } else if (batchStartDVal) {
    dateStr = `Starts on ${fmtDate(batchStartDVal)}`;
  }

  const courseDetailsHtml = `
    <div class="spx-card mb-4" style="background: linear-gradient(135deg, rgba(255, 255, 255, 0.02) 0%, rgba(255, 255, 255, 0.005) 100%);">
      <div class="d-flex align-items-center gap-3 mb-3 pb-3 border-bottom" style="border-color: var(--border) !important;">
        <img src="${window._selectedCourse.thumbnail_url || '/logo.png'}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 8px; border: 1px solid var(--border);" onerror="this.src='/logo.png'">
        <div>
          <h6 class="text-dark fw-bold mb-1">${window._selectedCourse.title}</h6>
          <span class="badge bg-primary-subtle text-primary border border-primary-subtle" style="font-size: 11px;">
            ${window._selectedCourse.grade} • ${window._selectedCourse.board}
          </span>
        </div>
      </div>
      <div class="text-muted small mb-3">${formatRichText(window._selectedCourse.description) || 'No description available for this course.'}</div>
      
      <div class="row text-muted small g-3">
        <div class="col-6">
          <span class="d-block text-muted small" style="font-size: 9px; letter-spacing: 0.5px;">SUBJECT</span>
          <span class="text-dark fw-semibold"><i class="fas fa-book-open me-1 text-primary"></i> ${window._selectedCourse.subject}</span>
        </div>
        <div class="col-6">
          <span class="d-block text-muted small" style="font-size: 9px; letter-spacing: 0.5px;">DURATION</span>
          <span class="text-dark fw-semibold"><i class="fas fa-calendar-alt me-1 text-primary"></i> ${window._selectedCourse.duration_weeks} Weeks</span>
        </div>
        <div class="col-12 mt-2">
          <span class="d-block text-muted small" style="font-size: 9px; letter-spacing: 0.5px;">COURSE FEES</span>
          <span class="text-dark fw-semibold"><i class="fas fa-rupee-sign me-1 text-primary"></i> ₹${window._selectedCourse.fees}</span>
        </div>
      </div>
    </div>
  `;

  const batchPreviewCardHtml = `
    <div class="spx-card" style="background: linear-gradient(135deg, rgba(13, 110, 253, 0.03) 0%, rgba(0, 0, 0, 0) 100%); border-left: 4px solid var(--primary, #0d6efd) !important;">
      <h6 class="text-dark fw-bold mb-3 small" style="letter-spacing: 0.5px; font-size: 11px; text-transform: uppercase;">Live Batch Card Preview</h6>
      
      <div class="p-4 rounded-3 text-start" style="background: rgba(255, 255, 255, 0.02); border: 1px solid var(--border); box-shadow: 0 8px 32px 0 rgba(0,0,0,0.2);">
        <div class="d-flex justify-content-between align-items-start mb-3">
          <div>
            <span class="badge bg-success text-white mb-2" style="font-size: 10px; font-weight: 500; letter-spacing: 0.5px;">LIVE PREVIEW</span>
            <h5 class="text-dark fw-bold mb-1">${batchNameVal || 'Physics Core Morning'}</h5>
            <p class="text-muted small mb-0">${batchSubjectVal || 'Physics'}</p>
          </div>
          <div style="font-size: 32px;">📚</div>
        </div>
        
        <div class="d-flex flex-column gap-2 text-muted small border-top pt-3 mt-3" style="border-color: rgba(255, 255, 255, 0.05) !important;">
          <div>
            <i class="fas fa-calendar-day me-2 text-success" style="width: 16px;"></i>Days: <strong class="text-dark">${batchDaysVal || 'Monday, Wednesday, Friday'}</strong>
          </div>
          <div>
            <i class="fas fa-clock me-2 text-success" style="width: 16px;"></i>Time: <strong class="text-dark">${timeStr}</strong>
          </div>
          <div>
            <i class="fas fa-calendar-alt me-2 text-success" style="width: 16px;"></i>Duration: <strong class="text-dark">${dateStr}</strong>
          </div>
          <div>
            <i class="fas fa-users me-2 text-success" style="width: 16px;"></i>Max Capacity: <strong class="text-dark">${batchCapacityVal || 30} students</strong>
          </div>
        </div>
      </div>
    </div>
  `;

  container.innerHTML = courseDetailsHtml + batchPreviewCardHtml;
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
                <td><img src="${s.photo_url || defaultAvatar}" style="width:36px;height:36px;border-radius:50%;object-fit:cover;" onerror="this.src=defaultAvatar"></td>
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

  if (!daysVal || days_of_week.length === 0) {
    showToast('Please select at least one Day of Week.', 'error');
    return;
  }

  const plannerFile = document.getElementById('batchPlanner').files[0];
  if (!plannerFile) {
    showToast('Please upload a Course Planner file.', 'error');
    return;
  }

  const demoVideoFile = document.getElementById('batchDemoVideo').files[0];
  const demoVideoUrl = document.getElementById('batchDemoVideoUrl') ? document.getElementById('batchDemoVideoUrl').value.trim() : '';

  if (!demoVideoFile && !demoVideoUrl) {
    showToast('Please upload a Batch Demo Video file OR enter a Video Link URL.', 'error');
    return;
  }

  const formData = new FormData();
  formData.append('course_id', document.getElementById('batchCourse').value);
  formData.append('batch_name', document.getElementById('batchName').value);
  formData.append('subject', document.getElementById('batchSubject').value);
  formData.append('start_date', document.getElementById('batchStartD').value);
  formData.append('end_date', document.getElementById('batchEndD').value);
  formData.append('start_time', document.getElementById('batchStartT').value + ':00');
  formData.append('end_time', document.getElementById('batchEndT').value + ':00');
  formData.append('days_of_week', JSON.stringify(days_of_week));
  formData.append('capacity', parseInt(document.getElementById('batchCapacity').value) || 30);
  formData.append('planner_desc', document.getElementById('batchPlannerDesc')?.value || '');
  formData.append('teaching_method', document.getElementById('batchTeachingMethod').value);
  formData.append('batch_instructions', document.getElementById('batchInstructions').value);
  formData.append('planner', plannerFile);
  if (demoVideoFile) {
    formData.append('demo_video', demoVideoFile);
  }
  if (demoVideoUrl) {
    formData.append('demo_video_url', demoVideoUrl);
  }

  try {
    showToast('Creating batch & uploading planner...', 'info');
    const res = await fetch(`${API}/teacher/batches`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    });

    const data = await parseFetchResponse(res);
    if (data.error) throw new Error(data.error);

    clearAutoSave('autosave_teacher_batch');
    showToast(data.message || 'Batch created successfully!');
    // Switch tab to list
    window._batchActiveTab = 'list';
    // Clear dynamic states
    window._selectedCourse = null;
    window._selectedCourseModules = [];
    renderBatches();
  } catch (e) {
    showToast(e.message, 'error');
    highlightFormFieldError(document.getElementById('batchForm'), e.message);
  }
}

// ── My Courses Management (Teacher Dashboard Integration) ─────
async function renderCourses() {
  loading();
  try {
    const courses = await api('/teacher/courses');
    window._teacherCourses = courses;

    let coursesHtml = `
      <div class="d-flex align-items-center justify-content-between mb-4 pb-3 border-bottom" style="border-color: var(--border) !important;">
        <h5 class="fw-bold text-dark mb-0" style="font-family: 'Outfit', sans-serif;">My Courses</h5>
        <button class="btn btn-sm btn-spx" onclick="showCreateCourseModal()">
          <i class="fas fa-plus me-1"></i> New Course Draft
        </button>
      </div>
      <div class="row g-4">
    `;

    if (courses.length === 0) {
      coursesHtml += `
        <div class="col-12 text-center py-5">
          <p class="text-muted">No courses created yet. Click "New Course Draft" to get started.</p>
        </div>
      `;
    } else {
      coursesHtml += courses.map(c => {
        const statuses = {
          draft: { label: 'Draft', class: 'bg-secondary' },
          pending_approval: { label: 'Pending Approval', class: 'bg-warning text-dark' },
          active: { label: 'Approved & Live', class: 'bg-success' },
          rejected: { label: 'Rejected', class: 'bg-danger' },
          archived: { label: 'Archived', class: 'bg-dark text-white' }
        };
        const status = statuses[c.status] || { label: c.status, class: 'bg-info' };
        const fees = parseFloat(c.fees || 0).toLocaleString('en-IN');
        const customTagHtml = c.custom_tag ? `<div class="text-primary small fw-bold mb-2"><i class="fas fa-tag me-1"></i>${c.custom_tag}</div>` : '';

        // Action buttons
        let actionsHtml = '';
        if (['draft', 'rejected', 'active', 'pending_approval'].includes(c.status)) {
          actionsHtml = `
            <button class="btn btn-xs btn-outline-secondary me-2 px-3 py-1" style="font-size:0.75rem;" onclick="editTeacherCourse('${c.id}')"><i class="fas fa-edit me-1"></i>Edit</button>
          `;
          if (['draft', 'rejected'].includes(c.status)) {
            actionsHtml += `
              <button class="btn btn-xs btn-spx px-3 py-1" style="font-size:0.75rem;" onclick="submitTeacherCourseForApproval('${c.id}')"><i class="fas fa-paper-plane me-1"></i>Submit</button>
            `;
          } else if (c.status === 'pending_approval') {
            actionsHtml += `<span class="text-muted small"><i class="fas fa-clock me-1"></i>Pending Review</span>`;
          } else if (c.status === 'active') {
            actionsHtml += `<span class="text-success small fw-semibold"><i class="fas fa-check-circle me-1"></i>Live</span>`;
          }
        }

        return `
          <div class="col-md-6 col-lg-4">
            <div class="spx-card h-100 d-flex flex-column justify-content-between" style="border: 1px solid var(--border);">
              <div>
                <div class="course-thumbnail rounded-3 mb-3 position-relative" style="height: 140px; ${c.thumbnail_url ? `background: url(${c.thumbnail_url}) center/cover no-repeat;` : `background: linear-gradient(135deg, #3CBDB0, #0F766E);`}; display:flex; align-items:center; justify-content:center;">
                  ${c.thumbnail_url ? '' : '<span style="font-size: 2.5rem;">📖</span>'}
                  <span class="badge ${status.class} position-absolute top-0 end-0 m-2" style="font-size:0.7rem; border-radius: 6px;">${status.label}</span>
                </div>
                <h6 class="text-dark fw-bold mb-1">${c.title}</h6>
                ${customTagHtml}
                <div class="d-flex flex-wrap gap-2 mb-3">
                  <span class="badge bg-secondary-subtle text-muted" style="font-size: 0.65rem;">${c.subject || 'General'}</span>
                  <span class="badge bg-secondary-subtle text-muted" style="font-size: 0.65rem;">${c.grade || 'Any'}</span>
              <div class="badge bg-secondary-subtle text-muted" style="font-size: 0.65rem;">${c.board || 'Any'}</div>
                  <span class="badge bg-secondary-subtle text-muted" style="font-size: 0.65rem;">${c.duration_weeks || 12} Wks</span>
                </div>
                <div class="text-muted small" style="line-height:1.5; font-size:0.8rem;">${formatCollapsibleText(c.description, 100) || 'No description provided.'}</div>
              </div>
              <div class="border-top pt-3 mt-3 d-flex justify-content-between align-items-center" style="border-color: var(--border) !important;">
                <span class="fw-bold text-dark">₹${fees}</span>
                <div class="d-flex align-items-center">
                  ${actionsHtml}
                </div>
              </div>
            </div>
          </div>
        `;
      }).join('');
    }

    coursesHtml += `</div>`;
    document.getElementById('pageContent').innerHTML = coursesHtml;

  } catch (err) {
    document.getElementById('pageContent').innerHTML = `<div class="alert alert-danger">${err.message}</div>`;
  }
}

let _teacherActiveCourseId = null;
let _teacherCurrentThumbnailUrl = '';

function initCourseFormModal() {
  if (document.getElementById('courseFormModal')) return;
  const modalDiv = document.createElement('div');
  modalDiv.innerHTML = `
    <div class="modal fade" id="courseFormModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered modal-lg">
        <div class="modal-content" style="background:#ffffff; border:1px solid var(--border); color:#000000; border-radius:16px; box-shadow:0 10px 40px rgba(0,0,0,0.1);">
          <div class="modal-header" style="border-bottom:1px solid #e2e8f0; padding:16px 24px;">
            <h5 class="modal-title fw-bold text-dark" id="courseModalTitle">Create New Course</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close" style="filter:invert(0.5);"></button>
          </div>
          <div class="modal-body text-dark" style="padding:24px;">
            <form id="teacherCourseForm">
              <div class="row g-3">
                <div class="col-md-8">
                  <label class="form-label fw-semibold text-dark mb-0">Course Title *</label>
                  <small class="text-muted d-block mb-1" style="font-size: 0.72rem; line-height: 1.2;">Give the course a clear name that describes the core topic and target grade level.</small>
                  <input class="form-control" id="tCourseTitle" style="background: #f8fafc; color: #0f172a; border: 1px solid #cbd5e1; border-radius: 8px;" placeholder="e.g. Class 10 Physics Complete Masterclass" required>
                </div>
                <div class="col-md-4">
                  <label class="form-label fw-semibold text-dark mb-0">Subject *</label>
                  <small class="text-muted d-block mb-1" style="font-size: 0.72rem; line-height: 1.2;">Enter the primary subject area.</small>
                  <input class="form-control" id="tCourseSubject" style="background: #f8fafc; color: #0f172a; border: 1px solid #cbd5e1; border-radius: 8px;" placeholder="e.g. Physics, Math, Chemistry" required>
                </div>
                <div class="col-md-6">
                  <label class="form-label fw-semibold text-dark mb-0">Grade *</label>
                  <small class="text-muted d-block mb-1" style="font-size: 0.72rem; line-height: 1.2;">Target student grade or class level.</small>
                  <select class="form-select" id="tCourseGrade" style="background: #f8fafc; color: #0f172a; border: 1px solid #cbd5e1; border-radius: 8px;" required>
                    <option value="">Select Grade</option>
                    <option>Class 6</option><option>Class 7</option><option>Class 8</option>
                    <option>Class 9</option><option>Class 10</option><option>Class 11</option><option>Class 12</option>
                  </select>
                </div>
                <div class="col-md-6">
                  <label class="form-label fw-semibold text-dark mb-0">Board *</label>
                  <small class="text-muted d-block mb-1" style="font-size: 0.72rem; line-height: 1.2;">Curriculum alignment standard.</small>
                  <select class="form-select" id="tCourseBoard" style="background: #f8fafc; color: #0f172a; border: 1px solid #cbd5e1; border-radius: 8px;" required>
                    <option value="">Select Board</option>
                    <option>CBSE</option><option>ICSE</option><option>State Board</option>
                  </select>
                </div>
                <div class="col-md-6">
                  <label class="form-label fw-semibold text-dark mb-0">Learning Duration *</label>
                  <small class="text-muted d-block mb-1" style="font-size: 0.72rem; line-height: 1.2;">Specify total duration (e.g., number of months, weeks, or live session hours).</small>
                  <input class="form-control" id="tCourseLearningDuration" style="background: #f8fafc; color: #0f172a; border: 1px solid #cbd5e1; border-radius: 8px;" placeholder="e.g. 3 Months / 24 Live Hours" required>
                </div>
                <div class="col-md-6">
                  <label class="form-label fw-semibold text-dark mb-0">Language of Instruction *</label>
                  <small class="text-muted d-block mb-1" style="font-size: 0.72rem; line-height: 1.2;">Primary language used for teaching during classes.</small>
                  <input class="form-control" id="tCourseLanguageInstruction" style="background: #f8fafc; color: #0f172a; border: 1px solid #cbd5e1; border-radius: 8px;" placeholder="e.g. English, Hindi, Bilingual" required>
                </div>
                <div class="col-md-6">
                  <label class="form-label fw-semibold text-dark mb-0">Daily Class Duration *</label>
                  <small class="text-muted d-block mb-1" style="font-size: 0.72rem; line-height: 1.2;">Length of a single live class session.</small>
                  <input class="form-control" id="tCourseDailyClassDuration" style="background: #f8fafc; color: #0f172a; border: 1px solid #cbd5e1; border-radius: 8px;" placeholder="e.g. 60 Minutes per session" required>
                </div>
                <div class="col-md-6">
                  <label class="form-label fw-semibold text-dark mb-0">Assessment Days *</label>
                  <small class="text-muted d-block mb-1" style="font-size: 0.72rem; line-height: 1.2;">Days or frequency scheduled for tests/evaluations.</small>
                  <input class="form-control" id="tCourseAssessmentDays" style="background: #f8fafc; color: #0f172a; border: 1px solid #cbd5e1; border-radius: 8px;" placeholder="e.g. Saturdays, End of each module" required>
                </div>
                <div class="col-md-6">
                  <label class="form-label fw-semibold text-dark mb-0">Objective *</label>
                  <small class="text-muted d-block mb-1" style="font-size: 0.72rem; line-height: 1.2;">Explain the core goal and what students will achieve.</small>
                  <textarea class="form-control" id="tCourseObjective" style="background: #f8fafc; color: #0f172a; border: 1px solid #cbd5e1; border-radius: 8px;" rows="2" placeholder="e.g. Master fundamental algebra concepts and equation solving..." required></textarea>
                </div>
                <div class="col-md-6">
                  <label class="form-label fw-semibold text-dark mb-0">Learning Outcome *</label>
                  <small class="text-muted d-block mb-1" style="font-size: 0.72rem; line-height: 1.2;">List the specific skills/knowledge students will acquire.</small>
                  <textarea class="form-control" id="tCourseLearningOutcome" style="background: #f8fafc; color: #0f172a; border: 1px solid #cbd5e1; border-radius: 8px;" rows="2" placeholder="e.g. Students will be able to solve quadratic equations independently..." required></textarea>
                </div>
                <div class="col-md-12">
                  <label class="form-label fw-semibold text-dark mb-0">Custom Badge / Tag Line *</label>
                  <small class="text-muted d-block mb-1" style="font-size: 0.72rem; line-height: 1.2;">A premium tag overlay to show on the course details card.</small>
                  <input class="form-control" id="tCourseCustomTag" style="background: #f8fafc; color: #0f172a; border: 1px solid #cbd5e1; border-radius: 8px;" placeholder="e.g. Designed by Priya Ma'am" required>
                </div>
                
                <div class="col-12">
                  <label class="form-label fw-semibold text-dark mb-0">Course Thumbnail / Banner</label>
                  <small class="text-muted d-block mb-1" style="font-size: 0.72rem; line-height: 1.2;">Upload a high-quality cover image for the course listing (Max 5MB).</small>
                  <div class="border border-dashed rounded text-center p-3" style="cursor:pointer; border-color:#cbd5e1 !important; background:#f8fafc;" onclick="document.getElementById('tCourseFileInput').click()">
                    <input type="file" id="tCourseFileInput" accept="image/*" class="d-none" onchange="handleTeacherCourseFileSelect(this)">
                    <div id="tCourseUploadPlaceholder">
                      <i class="fas fa-cloud-upload-alt text-primary mb-2" style="font-size: 1.5rem;"></i>
                      <p class="mb-0 text-dark small fw-semibold">Click to upload banner image</p>
                    </div>
                    <div id="tCourseUploadPreviewContainer" class="d-none position-relative mt-2">
                      <img id="tCourseUploadPreview" src="" style="max-height: 120px; width:100%; object-fit:cover; border-radius:8px;" />
                      <button type="button" class="btn btn-danger btn-sm position-absolute top-0 end-0 m-1" onclick="removeTeacherCourseThumbnail(event)">Remove</button>
                    </div>
                  </div>
                </div>

                <div class="col-12">
                  <label class="form-label fw-semibold text-dark mb-0">Description *</label>
                  <small class="text-muted d-block mb-1" style="font-size: 0.72rem; line-height: 1.2;">Provide a comprehensive overview of course contents, modules, and requirements.</small>
                  <textarea class="form-control" id="tCourseDesc" style="background: #f8fafc; color: #0f172a; border: 1px solid #cbd5e1; border-radius: 8px;" rows="3" placeholder="Enter course description details..." required></textarea>
                </div>
                <div class="col-12 mt-4">
                  <button type="submit" class="btn btn-spx w-100 py-2" id="tCourseSubmitBtn">Save Course Draft</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modalDiv.firstElementChild);
}

function showCreateCourseModal() {
  initCourseFormModal();
  _teacherActiveCourseId = null;
  _teacherCurrentThumbnailUrl = '';
  
  document.getElementById('courseModalTitle').textContent = 'Create New Course';
  document.getElementById('tCourseTitle').value = '';
  document.getElementById('tCourseSubject').value = '';
  document.getElementById('tCourseGrade').value = '';
  document.getElementById('tCourseBoard').value = '';
  document.getElementById('tCourseLearningDuration').value = '';
  document.getElementById('tCourseLanguageInstruction').value = '';
  document.getElementById('tCourseDailyClassDuration').value = '';
  document.getElementById('tCourseAssessmentDays').value = '';
  document.getElementById('tCourseObjective').value = '';
  document.getElementById('tCourseLearningOutcome').value = '';
  document.getElementById('tCourseCustomTag').value = '';
  document.getElementById('tCourseDesc').value = '';
  
  document.getElementById('tCourseUploadPreviewContainer').classList.add('d-none');
  document.getElementById('tCourseUploadPlaceholder').classList.remove('d-none');
  document.getElementById('tCourseUploadPreview').src = '';
  
  document.getElementById('teacherCourseForm').onsubmit = handleSaveTeacherCourse;
  
  const myModal = bootstrap.Modal.getOrCreateInstance(document.getElementById('courseFormModal'));
  myModal.show();
  setupAutoSave('autosave_teacher_course_create', [
    'tCourseTitle', 'tCourseSubject', 'tCourseGrade', 'tCourseBoard',
    'tCourseLearningDuration', 'tCourseLanguageInstruction',
    'tCourseDailyClassDuration', 'tCourseAssessmentDays',
    'tCourseObjective', 'tCourseLearningOutcome', 'tCourseCustomTag', 'tCourseDesc'
  ], 'courseFormModal');
}

function editTeacherCourse(id) {
  const course = (window._teacherCourses || []).find(c => c.id === id);
  if (!course) return showToast('Course not found', 'error');

  if (['active', 'pending_approval'].includes(course.status)) {
    const msg = course.status === 'active'
      ? 'Warning: This course is currently APPROVED & LIVE. Editing it will revert its status back to DRAFT, making it invisible to students until you resubmit and get Admin approval again.\n\nDo you want to proceed?'
      : 'Warning: This course is currently PENDING APPROVAL. Editing it will revert its status back to DRAFT, and you will need to resubmit it for review.\n\nDo you want to proceed?';
    if (!confirm(msg)) return;
  }

  initCourseFormModal();

  _teacherActiveCourseId = id;
  _teacherCurrentThumbnailUrl = course.thumbnail_url || '';

  document.getElementById('courseModalTitle').textContent = 'Edit Course Draft';
  document.getElementById('tCourseTitle').value = course.title || '';
  document.getElementById('tCourseSubject').value = course.subject || '';
  document.getElementById('tCourseGrade').value = course.grade || '';
  document.getElementById('tCourseBoard').value = course.board || '';
  document.getElementById('tCourseLearningDuration').value = course.learning_duration || '';
  document.getElementById('tCourseLanguageInstruction').value = course.language_instruction || '';
  document.getElementById('tCourseDailyClassDuration').value = course.daily_class_duration || '';
  document.getElementById('tCourseAssessmentDays').value = course.assessment_days || '';
  document.getElementById('tCourseObjective').value = course.objective || '';
  document.getElementById('tCourseLearningOutcome').value = course.learning_outcome || '';
  document.getElementById('tCourseCustomTag').value = course.custom_tag || '';
  document.getElementById('tCourseDesc').value = course.description || '';

  const previewContainer = document.getElementById('tCourseUploadPreviewContainer');
  const placeholder = document.getElementById('tCourseUploadPlaceholder');
  const preview = document.getElementById('tCourseUploadPreview');

  if (_teacherCurrentThumbnailUrl) {
    preview.src = _teacherCurrentThumbnailUrl;
    previewContainer.classList.remove('d-none');
    placeholder.classList.add('d-none');
  } else {
    previewContainer.classList.add('d-none');
    placeholder.classList.remove('d-none');
    preview.src = '';
  }

  document.getElementById('teacherCourseForm').onsubmit = handleSaveTeacherCourse;

  const myModal = bootstrap.Modal.getOrCreateInstance(document.getElementById('courseFormModal'));
  myModal.show();
  setupAutoSave('autosave_teacher_course_edit_' + id, [
    'tCourseTitle', 'tCourseSubject', 'tCourseGrade', 'tCourseBoard',
    'tCourseLearningDuration', 'tCourseLanguageInstruction',
    'tCourseDailyClassDuration', 'tCourseAssessmentDays',
    'tCourseObjective', 'tCourseLearningOutcome', 'tCourseCustomTag', 'tCourseDesc'
  ], 'courseFormModal');
}

async function handleSaveTeacherCourse(e) {
  e.preventDefault();
  
  const customTag = document.getElementById('tCourseCustomTag').value.trim();
  if (!customTag) {
    showToast('Custom Tag Line is required', 'error');
    return;
  }
  
  if (!_teacherCurrentThumbnailUrl) {
    showToast('Course Thumbnail / Banner image is required', 'error');
    return;
  }

  const payload = {
    title: document.getElementById('tCourseTitle').value,
    subject: document.getElementById('tCourseSubject').value,
    grade: document.getElementById('tCourseGrade').value,
    board: document.getElementById('tCourseBoard').value,
    duration_weeks: parseInt(document.getElementById('tCourseLearningDuration').value) || 12,
    custom_tag: customTag,
    description: document.getElementById('tCourseDesc').value,
    thumbnail_url: _teacherCurrentThumbnailUrl,
    learning_duration: document.getElementById('tCourseLearningDuration').value,
    objective: document.getElementById('tCourseObjective').value,
    learning_outcome: document.getElementById('tCourseLearningOutcome').value,
    language_instruction: document.getElementById('tCourseLanguageInstruction').value,
    daily_class_duration: document.getElementById('tCourseDailyClassDuration').value,
    assessment_days: document.getElementById('tCourseAssessmentDays').value
  };

  try {
    let data;
    if (_teacherActiveCourseId) {
      data = await api(`/teacher/courses/${_teacherActiveCourseId}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
    } else {
      data = await api('/teacher/courses', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    }

    if (_teacherActiveCourseId) {
      clearAutoSave('autosave_teacher_course_edit_' + _teacherActiveCourseId);
    } else {
      clearAutoSave('autosave_teacher_course_create');
    }
    showToast(data.message || 'Course saved successfully!');
    bootstrap.Modal.getOrCreateInstance(document.getElementById('courseFormModal')).hide();
    renderCourses();
  } catch (err) {
    showToast(err.message, 'error');
    highlightFormFieldError(document.getElementById('teacherCourseForm'), err.message);
  }
}

async function submitTeacherCourseForApproval(id) {
  try {
    const data = await api(`/teacher/courses/${id}/request-approval`, {
      method: 'POST'
    });
    showToast(data.message || 'Course submitted for approval!');
    renderCourses();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleTeacherCourseFileSelect(input) {
  const file = input.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append('thumbnail', file);

  try {
    showToast('Uploading banner...', 'info');
    const res = await fetch(`${API}/teacher/courses/upload-thumbnail`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    });
    
    if (res.status === 401) { logout(); throw new Error('Session expired'); }
    const data = await res.json();
    if (data.error) throw new Error(data.error);

    _teacherCurrentThumbnailUrl = data.thumbnailUrl;
    document.getElementById('tCourseUploadPreview').src = data.thumbnailUrl;
    document.getElementById('tCourseUploadPreviewContainer').classList.remove('d-none');
    document.getElementById('tCourseUploadPlaceholder').classList.add('d-none');
    showToast('Banner uploaded successfully!');
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    input.value = '';
  }
}

function removeTeacherCourseThumbnail(event) {
  event.stopPropagation();
  _teacherCurrentThumbnailUrl = '';
  document.getElementById('tCourseUploadPreviewContainer').classList.add('d-none');
  document.getElementById('tCourseUploadPlaceholder').classList.remove('d-none');
  document.getElementById('tCourseUploadPreview').src = '';
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
    window._teacherActiveBatches = activeBatches;

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
                      <td>${c.class_time ? formatTime(c.class_time) : ''}</td>
                      <td class="text-white">${c.title}</td>
                      <td>${c.batch_name || 'Batch'}</td>
                      <td><span class="badge ${c.status === 'live' ? 'bg-danger' : c.status === 'ended' ? 'bg-secondary' : 'bg-primary'}">${c.status.toUpperCase()}</span></td>
                      <td>
                        <div class="d-flex gap-2 align-items-center">
                          ${c.status === 'scheduled' ? `
                            <button class="btn btn-xs btn-spx px-2.5 py-1 fw-bold" style="font-size:0.72rem; border-radius:6px; height:28px;" onclick="startClass('${c.id}')">Start Class</button>
                          ` : c.status === 'live' ? `
                            <a href="/live/room.html?classId=${c.id}&role=teacher" class="btn btn-xs btn-danger px-2.5 py-1 fw-bold" style="font-size:0.72rem; border-radius:6px; height:28px;">Enter Room</a>
                          ` : `
                            <span class="text-muted small">Completed</span>
                          `}
                          <button class="btn btn-xs btn-outline-danger px-2 py-1 d-inline-flex align-items-center gap-1" style="font-size:0.7rem; border-radius:6px; height:28px;" onclick="requestDeleteLiveClass('${c.id}', '${c.title.replace(/'/g, "\\'")}')">
                            <i class="fas fa-trash-alt" style="font-size:0.68rem;"></i> <span>Delete</span>
                          </button>
                        </div>
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
                <select class="form-select spx-input" id="classBatch" onchange="autoFillBatchTime(this.value)" required>
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

    // Default classDate to today's date (local timezone) and set min attribute
    const dateInput = document.getElementById('classDate');
    if (dateInput) {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      const todayStr = `${yyyy}-${mm}-${dd}`;
      dateInput.value = todayStr;
      dateInput.min = todayStr;
    }
  } catch (e) {
    document.getElementById('pageContent').innerHTML = `<div class="alert alert-danger">${e.message}</div>`;
  }
}

function autoFillBatchTime(batchId) {
  if (!batchId || !window._teacherActiveBatches) return;
  const batch = window._teacherActiveBatches.find(b => b.id === batchId);
  if (batch && batch.start_time) {
    const timeParts = batch.start_time.split(':');
    if (timeParts.length >= 2) {
      const timeInput = document.getElementById('classTime');
      if (timeInput) {
        timeInput.value = `${timeParts[0]}:${timeParts[1]}`;
      }
    }
  }
}

async function scheduleClass(e) {
  e.preventDefault();
  const classDate = document.getElementById('classDate').value;
  const classTime = document.getElementById('classTime').value + ':00';

  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const todayStr = `${yyyy}-${mm}-${dd}`;

  if (classDate < todayStr) {
    showToast('Class date must be today or in the future', 'error');
    return;
  }

  const scheduledDateTime = new Date(`${classDate}T${classTime}`);
  if (scheduledDateTime <= new Date()) {
    showToast('Class time must be in the future', 'error');
    return;
  }

  const payload = {
    batchId: document.getElementById('classBatch').value,
    title: document.getElementById('classTitle').value,
    classDate,
    classTime,
    clientDateTime: scheduledDateTime.toISOString()
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
    window.location.href = `/live/room.html?classId=${classId}&role=teacher`;
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
                    <h6 class="text-dark fw-bold mb-1">${a.title}</h6>
                    <div class="text-muted small">${a.batch_name || 'Batch'} • Due: ${fmtDate(a.due_date)}</div>
                    <div class="text-muted small mt-2 mb-0">${formatRichText(a.description) || ''}</div>
                    ${a.file_url ? `<a href="${a.file_url}" target="_blank" class="d-inline-block mt-2 small text-primary"><i class="fas fa-file-pdf"></i> View Attachment</a>` : ''}
                  </div>
                  <div class="d-flex gap-2 align-items-center">
                    <button class="btn btn-xs btn-spx px-2.5 py-1" style="font-size:0.72rem;" onclick="viewSubmissions('${a.id}')">
                      Submissions (${a.submission_count || 0})
                    </button>
                    <button class="btn btn-xs btn-outline-danger px-2.5 py-1" style="font-size:0.72rem;" onclick="requestDeleteAssignment('${a.id}', '${a.title.replace(/'/g, "\\'")}')">
                      <i class="fas fa-trash-alt me-1"></i> Delete
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
            <form id="assignmentForm" onsubmit="createAssignment(event)">
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
                <label class="spx-label">Description *</label>
                <textarea class="form-control spx-input" id="assignDesc" rows="3" required></textarea>
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
                <label class="spx-label">File Attachment (PDF/Image) *</label>
                <input type="file" class="form-control spx-input" id="assignFile" required>
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
  const desc = document.getElementById('assignDesc').value.trim();
  const fileInput = document.getElementById('assignFile');
  if (!desc) {
    showToast('Description is required', 'error');
    return;
  }
  if (!fileInput.files[0]) {
    showToast('Please select a file to upload for the assignment', 'error');
    return;
  }

  const formData = new FormData();
  formData.append('batchId', document.getElementById('assignBatch').value);
  formData.append('title', document.getElementById('assignTitle').value);
  formData.append('description', desc);
  formData.append('due_date', document.getElementById('assignDue').value);
  formData.append('max_marks', document.getElementById('assignMax').value);
  formData.append('file', fileInput.files[0]);

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
    highlightFormFieldError(document.getElementById('assignmentForm'), e.message);
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

window.openGradePopup = function(subId, name) {
  document.getElementById('gradeSubmissionId').value = subId;
  document.getElementById('gradeStudentNameDisplay').textContent = name || 'Student';
  document.getElementById('gradeMarksInput').value = '';
  document.getElementById('gradeFeedbackInput').value = '';

  const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('gradeAssignmentModal'));
  modal.show();
};

window.submitGradeAssignment = async function(e) {
  e.preventDefault();
  const subId = document.getElementById('gradeSubmissionId').value;
  const marks = document.getElementById('gradeMarksInput').value;
  const feedback = document.getElementById('gradeFeedbackInput').value;
  const btn = document.getElementById('btnSubmitGrade');

  setButtonLoading(btn, true);
  try {
    await api(`/teacher/assignments/submissions/${subId}/grade`, {
      method: 'POST',
      body: JSON.stringify({ marks_obtained: parseInt(marks) || 0, feedback })
    });
    showToast('Submission graded and notifications dispatched!');

    const gradeModal = bootstrap.Modal.getInstance(document.getElementById('gradeAssignmentModal'));
    gradeModal?.hide();

    const subsModal = bootstrap.Modal.getInstance(document.getElementById('subsModal'));
    subsModal?.hide();

    renderAssignments();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    setButtonLoading(btn, false);
  }
};

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
                    <h6 class="text-dark fw-bold mb-1">${o.student_name}</h6>
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
                      <td class="text-dark fw-semibold">${a.student_name}</td>
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
                    <h6 class="text-dark fw-bold mb-1">${n.title}</h6>
                    <div class="text-muted small">${formatRichText(n.description) || ''}</div>
                    <div class="text-muted" style="font-size:.7rem;margin-top:4px;">Uploaded: ${fmtDate(n.uploaded_at)} • Type: <strong>${n.file_type.toUpperCase()}</strong></div>
                  </div>
                  <div class="d-flex gap-2 align-items-center">
                    <a href="${n.file_url}" target="_blank" class="btn btn-xs btn-spx px-2.5 py-1" style="font-size:0.72rem;"><i class="fas fa-external-link-alt me-1"></i> Access</a>
                    <button class="btn btn-xs btn-outline-primary px-2.5 py-1" style="font-size:0.72rem;" onclick="editStudyMaterial('${n.id}', '${n.title.replace(/'/g, "\\'")}', '${(n.description || '').replace(/'/g, "\\'")}', '${(n.file_url || '').replace(/'/g, "\\'")}')">
                      <i class="fas fa-edit me-1"></i> Edit
                    </button>
                    <button class="btn btn-xs btn-outline-danger px-2.5 py-1" style="font-size:0.72rem;" onclick="requestDeleteStudyMaterial('${n.id}', '${n.title.replace(/'/g, "\\'")}')">
                      <i class="fas fa-trash-alt me-1"></i> Delete
                    </button>
                  </div>
                </div>
              </div>
            `).join('') : '<p class="text-muted text-center">No study materials published yet.</p>'}
          </div>
        </div>

        <div class="col-lg-4">
          <div class="spx-card">
            <h6 class="mb-4 fw-bold">Publish Material</h6>
            <form id="notesForm" onsubmit="publishMaterial(event)">
              <div class="mb-3">
                <label class="spx-label">Course Link *</label>
                <select class="form-select spx-input" id="noteCourse" required>
                  <option value="">Select Course</option>
                  ${courses.map(c => `<option value="${c.id}">${c.title}</option>`).join('')}
                </select>
              </div>
              <div class="mb-3">
                <label class="spx-label">Batch Link *</label>
                <select class="form-select spx-input" id="noteBatch" required>
                  <option value="">Select Batch</option>
                  ${batches.map(b => `<option value="${b.id}">${b.batch_name}</option>`).join('')}
                </select>
              </div>
              <div class="mb-3">
                <label class="spx-label">Material Title *</label>
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
  const desc = document.getElementById('noteDesc').value.trim();
  if (!desc) {
    showToast('Description is required', 'error');
    return;
  }

  const formData = new FormData();
  formData.append('title', document.getElementById('noteTitle').value);
  formData.append('description', desc);
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
    highlightFormFieldError(document.getElementById('notesForm'), e.message);
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
            <div class="display-6 fw-bold text-dark mb-4">₹${parseFloat(wallet.wallet_balance).toLocaleString('en-IN')}</div>
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
                      <td class="text-dark fw-bold">₹${parseFloat(h.amount).toLocaleString('en-IN')}</td>
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
            <h4 class="text-dark fw-bold mb-1">${data.level || 'New Joiner'}</h4>
            <div class="text-muted small">Current Rating: <strong>${parseFloat(data.rating).toFixed(2)}</strong></div>
            
            <hr style="border-color:var(--border);margin:20px 0">
            
            <h6 class="fw-bold mb-3">Milestone Progress</h6>
            <div style="text-align:left;" class="small text-muted">
              <div class="d-flex justify-content-between mb-1"><span>Target Class Attendance:</span><strong class="text-dark">90%+</strong></div>
              <div class="d-flex justify-content-between mb-1"><span>Target Student Rating:</span><strong class="text-dark">4.5+</strong></div>
              <div class="d-flex justify-content-between mb-1"><span>Classes Held (this month):</span><strong class="text-dark">${data.sessions_count || 0}</strong></div>
              <div class="d-flex justify-content-between"><span>Active Students:</span><strong class="text-dark">${data.active_students || 0}</strong></div>
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
                      <td class="text-dark fw-bold">${h.level}</td>
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
    
    // Determine level badge details
    let levelBadgeHtml = '';
    if (profile.teacher_level === 'Platinum') {
      levelBadgeHtml = `<span class="badge" style="background:linear-gradient(135deg,#7C3AED,#C084FC);color:white;font-size:0.75rem;padding:6px 12px;border-radius:8px;"><i class="fas fa-trophy me-1"></i>Platinum Class Mentor</span>`;
    } else if (profile.teacher_level === 'Gold') {
      levelBadgeHtml = `<span class="badge" style="background:linear-gradient(135deg,#F59E0B,#FCD34D);color:#78350F;font-size:0.75rem;padding:6px 12px;border-radius:8px;"><i class="fas fa-award me-1"></i>Gold Class Mentor</span>`;
    } else if (profile.teacher_level === 'Silver') {
      levelBadgeHtml = `<span class="badge" style="background:linear-gradient(135deg,#64748B,#94A3B8);color:white;font-size:0.75rem;padding:6px 12px;border-radius:8px;"><i class="fas fa-medal me-1"></i>Silver Class Mentor</span>`;
    } else if (profile.teacher_level === 'Bronze') {
      levelBadgeHtml = `<span class="badge" style="background:linear-gradient(135deg,#B45309,#D97706);color:white;font-size:0.75rem;padding:6px 12px;border-radius:8px;"><i class="fas fa-certificate me-1"></i>Bronze Class Mentor</span>`;
    } else {
      levelBadgeHtml = `<span class="badge" style="background:linear-gradient(135deg,#64748B,#94A3B8);color:white;font-size:0.75rem;padding:6px 12px;border-radius:8px;"><i class="fas fa-user me-1"></i>New Joiner</span>`;
    }

    document.getElementById('pageContent').innerHTML = `
      <div class="row g-4">
        <!-- Teacher Profile Card -->
        <div class="col-lg-4">
          <div class="spx-card text-center position-relative overflow-hidden" style="border:1px solid rgba(60,189,176,0.2); background: radial-gradient(circle at top left, var(--bg-card), var(--bg-dark-alt));">
            <div style="position:absolute; top:0; left:0; right:0; height:6px; background:var(--gradient);"></div>
            
            <div class="position-relative d-inline-block mt-3">
              <div class="profile-avatar-wrapper" onclick="document.getElementById('teacherAvatarInput').click()">
                <img src="${profile.photo_url||defaultAvatar}" style="width:100px;height:100px;border-radius:50%;border:4px solid rgba(60,189,176,0.2);box-shadow: 0 8px 20px rgba(0,0,0,0.12); object-fit: cover;" alt="Teacher Photo" onerror="this.src=defaultAvatar">
                <div class="profile-avatar-overlay">
                  <i class="fas fa-camera"></i>
                </div>
              </div>
              <span class="position-absolute bottom-0 end-0 bg-success border border-white rounded-circle" style="width: 14px; height: 14px; border-width: 2px !important; z-index: 2;" title="Verified Educator"></span>
              <input type="file" id="teacherAvatarInput" accept="image/*" style="display:none;" onchange="uploadTeacherAvatar(this)">
            </div>
            
            <h4 class="fw-bold mt-3 mb-1" style="font-family:'Outfit',sans-serif;color:var(--text-primary);">${profile.name}</h4>
            <div class="text-muted small mb-2"><i class="fas fa-chalkboard-teacher text-primary me-1"></i>Speaxa Verified Educator</div>
            <div class="mb-3">${levelBadgeHtml}</div>
            
            <!-- Bio Showcase -->
            <div class="text-start p-3 mb-3 mx-1 rounded-3 border" style="background:rgba(255,255,255,0.02); font-size:0.8rem; line-height:1.55;">
              <strong style="color:var(--text-primary);">Teaching Philosophy:</strong>
              <p class="text-muted mb-0 mt-1" style="font-style: italic;">"${profile.bio || 'Inspiring students to explore, discover, and excel through interactive live-classroom environments.'}"</p>
            </div>

            <!-- Profile Summary Stats -->
            <div class="mt-4 text-start border-top pt-3 mx-1" style="font-size:0.85rem; border-color: rgba(255,255,255,0.08) !important;">
              <div class="mb-2 text-secondary"><i class="fas fa-graduation-cap text-primary me-2" style="width:16px;"></i>Credentials: <strong style="color:var(--text-primary);">${profile.qualification || '—'}</strong></div>
              <div class="mb-2 text-secondary"><i class="fas fa-book text-primary me-2" style="width:16px;"></i>Subject: <strong style="color:var(--text-primary);">${profile.subject_expertise || '—'}</strong></div>
              <div class="mb-2 text-secondary"><i class="fas fa-history text-primary me-2" style="width:16px;"></i>Experience: <strong style="color:var(--text-primary);">${profile.experience_years || 0} Years</strong></div>
              <div class="mb-2 text-secondary"><i class="fas fa-language text-primary me-2" style="width:16px;"></i>Languages: <strong style="color:var(--text-primary);">${profile.languages || '—'}</strong></div>
              <div class="mb-2 text-secondary"><i class="fas fa-mobile-screen-button text-primary me-2" style="width:16px;"></i>Mobile: <strong style="color:var(--text-primary);">${profile.phone || '—'}</strong> ${profile.phone_verified ? '<span class="badge bg-success ms-1"><i class="fas fa-check-circle me-1"></i>Verified</span>' : '<span class="badge bg-danger ms-1">Unverified</span>'}</div>
              <div class="mb-2 text-secondary"><i class="far fa-envelope text-primary me-2" style="width:16px;"></i>Email: <strong style="color:var(--text-primary);">${profile.email}</strong> ${profile.email_verified ? '<span class="badge bg-success ms-1"><i class="fas fa-check-circle me-1"></i>Verified</span>' : `<span class="badge bg-warning text-dark ms-1"><i class="fas fa-clock me-1"></i>Pending</span> <button class="btn btn-xs btn-outline-warning ms-1 py-0 px-2" style="font-size:0.75rem; border-radius:4px;" onclick="resendProfileEmailLink('${profile.email}')">Resend Link</button>`}</div>
              <div class="mb-2 text-secondary"><i class="far fa-envelope text-primary me-2" style="width:16px;"></i>Alt Email: <strong style="color:var(--text-primary);">${profile.alt_email || '—'}</strong></div>
              <div class="mb-2 text-secondary"><i class="fab fa-linkedin text-primary me-2" style="width:16px;"></i>LinkedIn: <strong style="color:var(--text-primary);">${profile.social_links?.linkedin ? `<a href="${profile.social_links.linkedin}" target="_blank" class="text-primary text-decoration-none fw-semibold">${profile.social_links.linkedin}</a>` : '—'}</strong></div>
              <div class="text-secondary"><i class="fab fa-twitter text-primary me-2" style="width:16px;"></i>Twitter/Other: <strong style="color:var(--text-primary);">${profile.social_links?.twitter ? `<a href="${profile.social_links.twitter}" target="_blank" class="text-primary text-decoration-none fw-semibold">${profile.social_links.twitter}</a>` : '—'}</strong></div>
            </div>
          </div>
        </div>
        
        <!-- Forms Card -->
        <div class="col-lg-8">
          <div class="spx-card" style="border:1px solid rgba(60,189,176,0.15);">
            <h5 class="fw-bold mb-4" style="font-family:'Outfit',sans-serif;color:var(--text-primary);"><i class="fas fa-user-edit text-primary me-2"></i>Update Educator Details</h5>
            <form onsubmit="updateProfile(event)">
              <div class="row g-3">
                <div class="col-md-6">
                  <label class="spx-label mb-1">Full Name</label>
                  <input class="form-control spx-input" id="profName" value="${profile.name||''}" required>
                </div>
                <div class="col-md-6">
                  <label class="spx-label mb-1">Contact Phone</label>
                  <input class="form-control spx-input" id="profPhone" value="${profile.phone||''}" required>
                </div>
                <div class="col-md-6">
                  <label class="spx-label mb-1">Alternative Email *</label>
                  <input class="form-control spx-input" id="profAltEmail" value="${profile.alt_email||''}" required>
                </div>
                <div class="col-md-6">
                  <label class="spx-label mb-1">WhatsApp / Mobile Number *</label>
                  <input class="form-control spx-input" id="profMobileNumber" value="${profile.mobile_number||''}" required>
                </div>
                <div class="col-md-6">
                  <label class="spx-label mb-1">LinkedIn Profile Link</label>
                  <input class="form-control spx-input" id="profLinkedIn" value="${profile.social_links?.linkedin||''}">
                </div>
                <div class="col-md-6">
                  <label class="spx-label mb-1">Twitter / Other Link</label>
                  <input class="form-control spx-input" id="profTwitter" value="${profile.social_links?.twitter||''}">
                </div>
                <div class="col-md-6">
                  <label class="spx-label mb-1">Highest Academic Qualification</label>
                  <input class="form-control spx-input" id="profQual" value="${profile.qualification||''}" placeholder="e.g. Ph.D in Chemistry, M.Sc. Mathematics">
                </div>
                <div class="col-md-6">
                  <label class="spx-label mb-1">Subject Expertise (e.g. Physics, Chemistry)</label>
                  <input class="form-control spx-input" id="profExp" value="${profile.subject_expertise||''}" placeholder="e.g. Physics, Mathematics">
                </div>
                <div class="col-md-6">
                  <label class="spx-label mb-1">Teaching Languages</label>
                  <input class="form-control spx-input" id="profLang" value="${profile.languages||''}" placeholder="e.g. English, Hindi, Spanish">
                </div>
                <div class="col-md-6">
                  <label class="spx-label mb-1">Years of Teaching Experience</label>
                  <input type="number" class="form-control spx-input" id="profYrs" value="${profile.experience_years||0}">
                </div>
                <div class="col-12">
                  <label class="spx-label mb-1">Professional Bio / Introduction</label>
                  <textarea class="form-control spx-input" id="profBio" rows="3" placeholder="Share your teaching philosophy, milestones, and introduction for students...">${profile.bio||''}</textarea>
                </div>
                <div class="col-12 mt-4">
                  <button type="submit" class="btn btn-spx px-4 py-2 fw-semibold"><i class="fas fa-save me-1"></i> Save Profile Details</button>
                </div>
              </div>
            </form>
            
            <hr style="border-color:rgba(60,189,176,0.15); margin:30px 0;">
            
            <h5 class="fw-bold mb-4" style="font-family:'Outfit',sans-serif;color:var(--text-primary);"><i class="fas fa-shield-alt text-primary me-2"></i>Change Security Password</h5>
            <form onsubmit="changePassword(event)">
              <div class="row g-3">
                <div class="col-md-6">
                  <label class="spx-label mb-1">Current Password</label>
                  <input class="form-control spx-input" id="currPass" type="password" placeholder="••••••••" required>
                </div>
                <div class="col-md-6">
                  <label class="spx-label mb-1">New Password</label>
                  <input class="form-control spx-input" id="newPass" type="password" placeholder="••••••••" required>
                </div>
                <div class="col-12 mt-4">
                  <button type="submit" class="btn btn-outline-primary px-4 py-2 fw-semibold"><i class="fas fa-key me-1"></i> Update Password</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;
    setupAutoSave('autosave_teacher_profile', [
      'profName', 'profPhone', 'profAltEmail', 'profMobileNumber',
      'profLinkedIn', 'profTwitter', 'profQual', 'profExp', 'profLang', 'profYrs', 'profBio'
    ]);
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
      bio: document.getElementById('profBio').value,
      alt_email: document.getElementById('profAltEmail').value,
      mobile_number: document.getElementById('profMobileNumber').value,
      social_links: {
        linkedin: document.getElementById('profLinkedIn').value,
        twitter: document.getElementById('profTwitter').value
      }
    };

    const data = await api('/auth/profile', {
      method:'PUT',
      body: JSON.stringify(payload)
    });

    if (data.error) throw new Error(data.error);
    clearAutoSave('autosave_teacher_profile');
    showToast('Profile updated successfully!');
    updateCachedUser(data.user);
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

let maxBatchCapacity = 30;

async function fetchPublicSettings() {
  try {
    const res = await fetch('/api/admin/settings/public');
    if (res.ok) {
      const data = await res.json();
      if (data.max_batch_capacity) {
        maxBatchCapacity = parseInt(data.max_batch_capacity) || 30;
      }
    }
  } catch (err) {
    console.error('Failed to load public settings', err);
  }
}

// ── Init ──────────────────────────────────────────────────────
async function initApp() {
  await fetchPublicSettings();
  if (token) {
    try {
      const profile = await api('/auth/profile');
      if (profile.role === 'teacher') {
        updateCachedUser(profile);
        showApp();
        const page = window.location.hash ? window.location.hash.substring(1) : 'home';
        navigateTo(page);
      } else {
        handleCrossRoleRedirect(token, profile);
      }
    } catch (e) {
      console.error('Failed to sync profile', e);
      logout();
    }
  } else {
    document.getElementById('authScreen').classList.remove('d-none');
    document.getElementById('teacherApp').classList.add('d-none');
  }
}

async function uploadTeacherAvatar(input) {
  const file = input.files[0];
  if (!file) return;

  // Max 5MB client-side check for avatars
  const maxAvatarSize = 5 * 1024 * 1024;
  if (file.size > maxAvatarSize) {
    showToast(`File "${file.name}" is too large. Maximum size allowed for avatar is 5MB.`, 'error');
    input.value = '';
    return;
  }

  const formData = new FormData();
  formData.append('avatar', file);

  try {
    showToast('Uploading profile photo...', 'info');
    const res = await fetch(`${API}/auth/upload-avatar`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData,
    });
    const data = await parseFetchResponse(res);
    if (data.error) throw new Error(data.error);
    showToast('Profile photo updated successfully!');
    
    // Update local cached user info
    updateCachedUser(data.user);
    // Refresh sidebar & header and profile cards
    showApp();
    renderProfile();
  } catch (e) {
    showToast(e.message, 'error');
  }
}

async function renderCertificates() {
  loading();
  try {
    const certs = await api('/teacher/certificates');
    
    let certListHtml = '';
    if (certs && certs.length > 0) {
      certListHtml = `
        <div class="certificates-grid">
          ${certs.map(c => {
            let iconClass = 'fa-award';
            if (c.certificate_type === 'sop_completed') iconClass = 'fa-clipboard-check';
            if (c.certificate_type === 'course_verified') iconClass = 'fa-certificate';
            
            return `
              <div class="certificate-card">
                <div class="certificate-badge-ribbon">
                  <i class="fas ${iconClass}"></i>
                </div>
                <div>
                  <div class="certificate-type-label">${c.certificate_type.replace('_', ' ')}</div>
                  <h6 class="certificate-title">${c.title}</h6>
                  <p class="certificate-desc">${c.description || 'Certificate of achievement issued by Speaxa platform.'}</p>
                </div>
                <div>
                  <div class="certificate-footer">
                    <div class="certificate-meta-item">
                      <span class="certificate-meta-label">Date Issued</span>
                      <span class="certificate-meta-val">${fmtDate(c.issued_at)}</span>
                    </div>
                    <div class="certificate-meta-item">
                      <span class="certificate-meta-label">Credential ID</span>
                      <span class="certificate-meta-val" style="font-family: monospace; font-size: 0.65rem;">${c.id}</span>
                    </div>
                  </div>
                  <div class="certificate-actions">
                    <button class="btn btn-sm btn-outline-primary w-100 mt-3 py-2" onclick="previewCertificate('${c.id}')">
                      <i class="fas fa-eye me-1"></i> Preview & Print
                    </button>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;
    } else {
      certListHtml = `
        <div class="spx-card text-center py-5">
          <div class="fs-1 text-muted mb-3"><i class="fas fa-award"></i></div>
          <h5 class="fw-bold mb-2">No Certificates Yet</h5>
          <p class="text-muted small mx-auto" style="max-width: 400px;">
            Certificates are issued automatically for milestones like completing SOP setup, course approvals, or custom performance awards.
          </p>
        </div>
      `;
    }

    document.getElementById('pageContent').innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h5 class="fw-bold mb-1">My Certificates & Achievements</h5>
          <p class="text-muted small mb-0">Credentials, course verifications, and compliance milestones issued by Speaxa</p>
        </div>
        <div class="badge bg-primary-subtle text-primary py-2 px-3 fw-bold" style="font-size:0.85rem;">
          Total Certificates: ${certs ? certs.length : 0}
        </div>
      </div>
      
      ${certListHtml}
      
      <!-- Dynamic Certificate Preview Modal Container -->
      <div class="modal fade" id="certPreviewModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-lg modal-dialog-centered">
          <div class="modal-content" style="background:#ffffff; border:1px solid var(--border); color:var(--text-primary); border-radius:16px; box-shadow:0 10px 40px rgba(0,0,0,0.15);">
            <div class="modal-header border-0 pb-0" style="padding:16px 24px;">
              <h5 class="modal-title fw-bold" style="font-family:'Outfit';">Certificate Preview</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close" style="filter:invert(0.5);"></button>
            </div>
            <div class="modal-body" style="padding:24px;" id="certPreviewModalBody">
              <!-- Content rendered dynamically -->
            </div>
            <div class="modal-footer border-0 pt-0" style="padding:16px 24px;">
              <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Close</button>
              <button type="button" class="btn btn-spx text-white" id="btnPrintCert"><i class="fas fa-print me-1"></i> Print Certificate</button>
            </div>
          </div>
        </div>
      </div>
    `;
    
    // Store certificates in window object so we can retrieve them by ID for preview
    window._teacherCertificates = certs || [];

  } catch (e) {
    document.getElementById('pageContent').innerHTML = `<div class="alert alert-danger">${e.message}</div>`;
  }
}

// Preview and Print functions
function previewCertificate(certId) {
  const cert = (window._teacherCertificates || []).find(c => c.id === certId);
  if (!cert) return showToast('Certificate details not found', 'error');

  const bodyEl = document.getElementById('certPreviewModalBody');
  const printBtn = document.getElementById('btnPrintCert');

  bodyEl.innerHTML = `
    <div class="certificate-preview-frame">
      <div class="certificate-preview-header">
        <img class="certificate-preview-logo" src="/logo.png" alt="Speaxa Logo" onerror="this.src='https://api.dicebear.com/7.x/identicon/svg?seed=speaxa'">
        <div class="certificate-preview-subtitle">Speaxa Certificate of Accomplishment</div>
      </div>
      <div class="certificate-preview-main-title">Certificate of Achievement</div>
      <div class="certificate-preview-recipient-label">This is proudly presented to</div>
      <div class="certificate-preview-recipient-name">${user.name}</div>
      <div class="certificate-preview-text">
        ${cert.description || 'For outstanding achievement and contribution to Speaxa.'}
      </div>
      <div class="certificate-preview-footer">
        <div class="certificate-preview-sig">
          <div style="font-family: 'Georgia', serif; font-style: italic; font-size: 1.2rem; color: #1a1a1a; font-weight: bold;">Speaxa Operations</div>
          <div class="certificate-preview-sig-line"></div>
          <div class="certificate-preview-sig-label">Authorized Signatory</div>
        </div>
        <div class="certificate-preview-seal-inline">
          SPEAXA<br>VERIFIED
        </div>
        <div class="certificate-preview-sig">
          <div style="font-family: 'Georgia', serif; font-style: italic; font-size: 1.2rem; color: #1a1a1a; font-weight: bold;">${fmtDate(cert.issued_at)}</div>
          <div class="certificate-preview-sig-line"></div>
          <div class="certificate-preview-sig-label">Date of Issuance</div>
        </div>
      </div>
    </div>
    <div class="mt-3 text-center text-muted" style="font-size: 0.72rem;">
      <i class="fas fa-shield-alt text-success me-1"></i> Authenticate this credential at: 
      <a href="${window.location.origin}/verify-certificate?id=${cert.id}" target="_blank" class="text-decoration-none fw-semibold" style="color:var(--primary);">${window.location.origin}/verify-certificate?id=${cert.id}</a>
    </div>
  `;

  // Attach dynamic print handler
  printBtn.onclick = () => printCertificate(cert);

  const modal = new bootstrap.Modal(document.getElementById('certPreviewModal'));
  modal.show();
}

function printCertificate(cert) {
  let printEl = document.getElementById('printArea');
  if (!printEl) {
    printEl = document.createElement('div');
    printEl.id = 'printArea';
    document.body.appendChild(printEl);
  }
  
  printEl.innerHTML = `
    <div class="certificate-preview-frame" style="page-break-inside: avoid; border: 12px double #D4AF37; padding: 40px; text-align: center; color: #2c2c2c; font-family: 'Outfit', sans-serif;">
      <div class="certificate-preview-header">
        <img class="certificate-preview-logo" src="/logo.png" alt="Speaxa Logo" style="height: 60px; margin-bottom: 12px;">
        <div class="certificate-preview-subtitle" style="font-size: 0.85rem; text-transform: uppercase; letter-spacing: 2px; color: #7a6030; font-weight: 600; margin-bottom: 20px;">Speaxa Certificate of Accomplishment</div>
      </div>
      <div class="certificate-preview-main-title" style="font-size: 2.2rem; font-weight: 800; color: #1a1a1a; margin-bottom: 10px; text-transform: uppercase; letter-spacing: -0.5px;">Certificate of Achievement</div>
      <div class="certificate-preview-recipient-label" style="font-size: 0.95rem; font-style: italic; color: #555; margin-bottom: 15px;">This is proudly presented to</div>
      <div class="certificate-preview-recipient-name" style="font-size: 1.8rem; font-weight: 700; color: #0c0c0c; border-bottom: 2px solid #D4AF37; display: inline-block; padding-bottom: 4px; margin-bottom: 15px; min-width: 250px;">${user.name}</div>
      <div class="certificate-preview-text" style="font-size: 0.95rem; line-height: 1.6; color: #4a4a4a; max-width: 580px; margin: 0 auto 30px auto;">
        ${cert.description || 'For outstanding achievement and contribution to Speaxa.'}
      </div>
      <div class="certificate-preview-footer" style="display: flex; justify-content: space-around; align-items: center; margin-top: 40px;">
        <div class="certificate-preview-sig" style="display: flex; flex-direction: column; align-items: center;">
          <div style="font-family: 'Georgia', serif; font-style: italic; font-size: 1.2rem; color: #1a1a1a; font-weight: bold;">Speaxa Operations</div>
          <div class="certificate-preview-sig-line" style="width: 140px; border-top: 1px solid #777; margin-top: 5px; margin-bottom: 2px;"></div>
          <div class="certificate-preview-sig-label" style="font-size: 0.75rem; color: #666; text-transform: uppercase; letter-spacing: 0.5px;">Authorized Signatory</div>
        </div>
        <div class="certificate-preview-seal-inline" style="width: 90px; height: 90px; background: radial-gradient(circle, #fcd34d 0%, #d97706 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 0.8rem; font-weight: bold; text-transform: uppercase; text-align: center; line-height: 1.1; border: 4px double white; opacity: 0.9; margin: 0 20px;">
          SPEAXA<br>VERIFIED
        </div>
        <div class="certificate-preview-sig" style="display: flex; flex-direction: column; align-items: center;">
          <div style="font-family: 'Georgia', serif; font-style: italic; font-size: 1.2rem; color: #1a1a1a; font-weight: bold;">${fmtDate(cert.issued_at)}</div>
          <div class="certificate-preview-sig-line" style="width: 140px; border-top: 1px solid #777; margin-top: 5px; margin-bottom: 2px;"></div>
          <div class="certificate-preview-sig-label" style="font-size: 0.75rem; color: #666; text-transform: uppercase; letter-spacing: 0.5px;">Date of Issuance</div>
        </div>
      </div>
      <div style="margin-top: 30px; font-size: 0.7rem; color: #666; text-align: center; border-top: 1px dashed #ddd; padding-top: 12px;">
        <i class="fas fa-shield-alt me-1"></i> Verify authenticity of this Speaxa credential at: <strong>${window.location.origin}/verify-certificate?id=${cert.id}</strong>
      </div>
    </div>
  `;
  
  window.print();
}

function openUploadPlannerModal(batchId, batchName) {
  let modalEl = document.getElementById('uploadPlannerModal');
  if (!modalEl) {
    modalEl = document.createElement('div');
    modalEl.id = 'uploadPlannerModal';
    modalEl.className = 'modal fade';
    modalEl.tabIndex = -1;
    modalEl.setAttribute('aria-hidden', 'true');
    document.body.appendChild(modalEl);
  }

  const batch = (window._batchesCache || []).find(b => b.id === batchId);
  const currentDesc = batch ? (batch.planner_desc || '') : '';

  modalEl.innerHTML = `
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content" style="background:#1e293b; border:1px solid var(--border); color:#ffffff; border-radius:16px; box-shadow:0 10px 40px rgba(0,0,0,0.3);">
        <div class="modal-header border-0 pb-0" style="padding:16px 24px;">
          <h5 class="modal-title fw-bold" style="font-family:'Outfit';">Update Syllabus Planner</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close" style="filter:invert(1);"></button>
        </div>
        <div class="modal-body" style="padding:24px;">
          <p class="text-secondary small mb-3">Update the syllabus description or upload a document file for <strong>${batchName}</strong>.</p>
          <form id="uploadPlannerForm" onsubmit="uploadPlanner(event, '${batchId}')">
            <div class="mb-3">
              <label class="spx-label mb-1">Learning Schedule / Syllabus Text</label>
              <textarea class="form-control spx-input" id="modalPlannerDesc" rows="4" placeholder="e.g. Week 1: Introduction" style="background:#0f172a; color:#ffffff; border:1px solid var(--border);">${currentDesc}</textarea>
            </div>
            <div class="mb-3">
              <label class="spx-label mb-1">Upload PDF/Doc Document File</label>
              <input type="file" class="form-control spx-input" id="plannerFile" accept=".pdf,.doc,.docx" style="background:#0f172a; color:#ffffff; border:1px solid var(--border);">
            </div>
            <button type="submit" class="btn btn-spx w-100">Save Changes</button>
          </form>
        </div>
      </div>
    </div>
  `;

  const modal = new bootstrap.Modal(modalEl);
  modal.show();
  window._uploadPlannerModalInstance = modal;
}

async function uploadPlanner(e, batchId) {
  e.preventDefault();
  const descVal = document.getElementById('modalPlannerDesc')?.value || '';
  const fileInput = document.getElementById('plannerFile');
  const file = fileInput.files[0];

  const formData = new FormData();
  if (file) {
    formData.append('planner', file);
  }
  formData.append('planner_desc', descVal);

  try {
    showToast('Saving planner changes...', 'info');
    const res = await fetch(`${API}/teacher/batches/${batchId}/planner`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    });

    if (res.status === 401) { logout(); throw new Error('Session expired'); }
    const data = await res.json();
    if (data.error) throw new Error(data.error);

    showToast(data.message || 'Planner updated successfully!');
    if (window._uploadPlannerModalInstance) {
      window._uploadPlannerModalInstance.hide();
    }
    renderBatches();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Custom Searchable Dropdown Select Component for Batch Creation Course List
const style = document.createElement('style');
style.innerHTML = `
  .custom-searchable-select-container {
    position: relative;
    width: 100%;
  }
  .custom-searchable-select-menu {
    position: absolute;
    top: 100%;
    left: 0;
    width: 100%;
    z-index: 1050;
    display: none;
    background: #0f172a;
    border: 1px solid var(--border);
    border-radius: 8px;
    box-shadow: 0 8px 30px rgba(0,0,0,0.6);
    padding: 8px;
    margin-top: 4px;
  }
  .custom-searchable-select-menu.show {
    display: block;
  }
  .custom-searchable-select-search-wrapper {
    margin-bottom: 8px;
  }
  .custom-searchable-select-options-list {
    max-height: 200px;
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: rgba(255,255,255,0.1) transparent;
  }
  .custom-searchable-select-option {
    padding: 10px 12px;
    cursor: pointer;
    border-radius: 6px;
    color: #f8fafc !important;
    background: #0f172a !important;
    transition: background 0.2s, color 0.2s;
    font-size: 0.88rem;
  }
  .custom-searchable-select-option:hover {
    background: rgba(13, 148, 136, 0.25) !important;
    color: #14b8a6 !important;
  }
  .custom-searchable-select-option.selected {
    background: rgba(13, 148, 136, 0.35) !important;
    color: #14b8a6 !important;
    font-weight: 700;
  }
  .custom-searchable-select-option.no-results {
    color: #94a3b8 !important;
    text-align: center;
    cursor: default;
    pointer-events: none;
  }
`;
document.head.appendChild(style);

function toggleCustomBatchCourseDropdown(event) {
  if (event) event.stopPropagation();
  const menu = document.getElementById('customBatchCourseMenu');
  if (!menu) return;
  const isShown = menu.classList.contains('show');
  
  // Close the menu if open, or open it if closed
  menu.classList.toggle('show', !isShown);
  
  if (!isShown) {
    const searchInput = document.getElementById('customCourseSearch');
    if (searchInput) {
      searchInput.value = '';
      filterCustomBatchCourses('');
      setTimeout(() => searchInput.focus(), 50);
    }
  }
}

function filterCustomBatchCourses(val) {
  const search = val.toLowerCase().trim();
  const optionsList = document.getElementById('customCourseOptionsList');
  if (!optionsList) return;
  const options = optionsList.querySelectorAll('.custom-searchable-select-option:not(.no-results)');
  let matches = 0;
  
  options.forEach(opt => {
    const text = opt.textContent.toLowerCase();
    if (text.includes(search)) {
      opt.style.display = '';
      matches++;
    } else {
      opt.style.display = 'none';
    }
  });
  
  let noResults = optionsList.querySelector('.no-results');
  if (matches === 0) {
    if (!noResults) {
      noResults = document.createElement('div');
      noResults.className = 'custom-searchable-select-option no-results';
      noResults.textContent = 'No matching courses found';
      optionsList.appendChild(noResults);
    } else {
      noResults.style.display = '';
    }
  } else if (noResults) {
    noResults.style.display = 'none';
  }
}

function selectCustomBatchCourse(id, labelText, event) {
  if (event) event.stopPropagation();
  
  const label = document.getElementById('customBatchCourseLabel');
  if (label) {
    label.textContent = labelText;
    label.style.setProperty('color', '#ffffff', 'important');
    label.style.setProperty('font-weight', '600', 'important');
  }
  
  const nativeSelect = document.getElementById('batchCourse');
  if (nativeSelect) {
    nativeSelect.value = id;
    nativeSelect.dispatchEvent(new Event('change'));
  }
  
  const optionsList = document.getElementById('customCourseOptionsList');
  if (optionsList) {
    const options = optionsList.querySelectorAll('.custom-searchable-select-option');
    options.forEach(opt => {
      if (opt.getAttribute('data-value') === id) {
        opt.classList.add('selected');
      } else {
        opt.classList.remove('selected');
      }
    });
  }
  
  const menu = document.getElementById('customBatchCourseMenu');
  if (menu) {
    menu.classList.remove('show');
  }
}

// Click outside logic to dismiss custom dropdown list
document.addEventListener('click', function(e) {
  const container = document.getElementById('customCourseContainer');
  if (container && !container.contains(e.target)) {
    const menu = document.getElementById('customBatchCourseMenu');
    if (menu) {
      menu.classList.remove('show');
    }
  }
});

// Bind custom functions to global window context
window.toggleCustomBatchCourseDropdown = toggleCustomBatchCourseDropdown;
window.filterCustomBatchCourses = filterCustomBatchCourses;
window.selectCustomBatchCourse = selectCustomBatchCourse;

async function renderReferrals() {
  loading();
  try {
    const [referralData, rewardsData] = await Promise.all([
      api('/teacher/referrals'),
      api('/teacher/rewards')
    ]);

    const code = referralData.referral_code;
    const stats = referralData.stats;
    const refStudents = referralData.referred_students || [];
    const refTeachers = referralData.referred_teachers || [];

    const cumulativeRevenue = rewardsData.cumulative_revenue || 0;
    const slabs = rewardsData.slabs || [];
    const allowances = rewardsData.allowance_history || [];
    const allowanceMap = rewardsData.allowance_map || {};
    const refSettings = rewardsData.settings || { student_referral_bonus_pct: 5, teacher_referral_bonus_pct: 1, teacher_referral_max_cap: 10 };
    const studentRefPct = refSettings.student_referral_bonus_pct;
    const teacherRefPct = refSettings.teacher_referral_bonus_pct;
    const maxCap = refSettings.teacher_referral_max_cap;

    // Find next slab
    const nextSlab = slabs.find(s => cumulativeRevenue < s.target) || slabs[slabs.length - 1];
    const prevSlabTarget = nextSlab ? (slabs[slabs.indexOf(nextSlab) - 1]?.target || 0) : 0;
    const progressPct = nextSlab ? Math.min(100, Math.max(0, ((cumulativeRevenue - prevSlabTarget) / (nextSlab.target - prevSlabTarget)) * 100)) : 100;

    const statement = await api('/teacher/wallet/statement');

    const shareLink = `${window.location.origin}/student?ref=${code}`;
    const teacherShareLink = `${window.location.origin}/teacher?ref=${code}`;

    document.getElementById('pageContent').innerHTML = `
      <!-- Referral Code and Links -->
      <div class="row g-4 mb-4">
        <div class="col-lg-6">
          <div class="spx-card h-100">
            <h6 class="fw-bold mb-3 text-primary"><i class="fas fa-share-nodes me-2"></i>Referral Links</h6>
            <p class="text-muted small">Share these codes with students or teachers to earn commissions on their activities.</p>
            
            <div class="mb-3">
              <label class="spx-label" style="font-size:0.75rem;">Your Referral Code</label>
              <div class="input-group">
                <input type="text" class="form-control spx-input" id="refCodeInput" value="${code}" readonly>
                <button class="btn btn-outline-primary" onclick="copyText('refCodeInput', 'Referral Code copied!')">
                  <i class="fas fa-copy"></i> Copy
                </button>
              </div>
            </div>

            <div class="mb-3">
              <label class="spx-label" style="font-size:0.75rem;">Student Referral Link (${studentRefPct}% Commission)</label>
              <div class="input-group">
                <input type="text" class="form-control spx-input" id="studentRefInput" value="${shareLink}" readonly>
                <button class="btn btn-outline-primary" onclick="copyText('studentRefInput', 'Student referral link copied!')">
                  <i class="fas fa-copy"></i>
                </button>
              </div>
            </div>

            <div>
              <label class="spx-label" style="font-size:0.75rem;">Teacher Referral Link (${teacherRefPct}% Commission - Max ${maxCap})</label>
              <div class="input-group">
                <input type="text" class="form-control spx-input" id="teacherRefInput" value="${teacherShareLink}" readonly>
                <button class="btn btn-outline-primary" onclick="copyText('teacherRefInput', 'Teacher referral link copied!')">
                  <i class="fas fa-copy"></i>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Referral Stats -->
        <div class="col-lg-6">
          <div class="spx-card h-100">
            <h6 class="fw-bold mb-3 text-primary"><i class="fas fa-chart-line me-2"></i>Referral Statistics</h6>
            <div class="row g-2 mb-3">
              <div class="col-6">
                <div class="p-3 rounded" style="background:var(--bg-dark); border:1px solid var(--border)">
                  <div class="text-dark fw-bold fs-5">${stats.total_referred_students}</div>
                  <div class="text-muted" style="font-size:0.7rem;">Students Referred</div>
                </div>
              </div>
              <div class="col-6">
                <div class="p-3 rounded" style="background:var(--bg-dark); border:1px solid var(--border)">
                  <div class="text-dark fw-bold fs-5">${stats.total_referred_teachers} / ${maxCap}</div>
                  <div class="text-muted" style="font-size:0.7rem;">Teachers Referred</div>
                </div>
              </div>
            </div>
            <div class="row g-2 mb-2">
              <div class="col-6">
                <div class="p-2 rounded text-success" style="background:var(--bg-dark); border:1px solid var(--border); font-size:0.8rem;">
                  <span>Student Earnings:</span> <strong class="float-end">₹${stats.student_referral_earnings.toLocaleString('en-IN')}</strong>
                </div>
              </div>
              <div class="col-6">
                <div class="p-2 rounded text-success" style="background:var(--bg-dark); border:1px solid var(--border); font-size:0.8rem;">
                  <span>Teacher Earnings:</span> <strong class="float-end">₹${stats.teacher_referral_earnings.toLocaleString('en-IN')}</strong>
                </div>
              </div>
            </div>
            <div class="p-3 rounded text-center mt-2" style="background:rgba(16,185,129,0.1); border:1px solid rgba(16,185,129,0.3)">
              <div class="text-muted small">Total Referral Commission Earned</div>
              <div class="text-success fw-bold fs-4" style="font-family:'Outfit',sans-serif;">₹${stats.total_referral_earnings.toLocaleString('en-IN')}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Cumulative Revenue Progress towards Next Performance Slab -->
      <div class="spx-card mb-4">
        <div class="d-flex align-items-center justify-content-between mb-2">
          <h6 class="fw-bold mb-0">Performance Slabs Progress</h6>
          <span class="badge bg-primary" style="font-size: 0.8rem;">Cumulative Revenue: ₹${cumulativeRevenue.toLocaleString('en-IN')}</span>
        </div>
        ${nextSlab ? `
          <div class="text-muted small mb-2 d-flex justify-content-between">
            <span>Next milestone: <strong>${nextSlab.name}</strong> (Target: ₹${nextSlab.target.toLocaleString('en-IN')})</span>
            <span>${progressPct.toFixed(1)}% Completed</span>
          </div>
          <div class="progress mb-2" style="height:10px; background:var(--bg-dark); border-radius:5px;">
            <div class="progress-bar" role="progressbar" style="width: ${progressPct}%; background:var(--gradient); border-radius:5px;" aria-valuenow="${progressPct}" aria-valuemin="0" aria-valuemax="100"></div>
          </div>
          <div class="text-muted" style="font-size:0.7rem;">
            * Earn ₹${(nextSlab.target - cumulativeRevenue).toLocaleString('en-IN')} more to unlock <strong>${nextSlab.name}</strong> reward: <strong>${nextSlab.item}</strong> (₹${nextSlab.reward.toLocaleString('en-IN')} cash payout).
          </div>
        ` : `<div class="text-success small">🎉 Amazing! You have achieved the highest milestone (Dean status) on Speaxa!</div>`}
      </div>

      <!-- Performance Slabs list -->
      <div class="spx-card mb-4">
        <h6 class="fw-bold mb-3"><i class="fas fa-medal me-2 text-primary"></i>Performance Rewards Checklist</h6>
        <div style="overflow-x:auto;">
          <table class="spx-table">
            <thead>
              <tr>
                <th>Tier / Slab Name</th>
                <th>Target Revenue</th>
                <th>Reward Amount</th>
                <th>Gift Item Reward</th>
                <th>Grooming Allowance</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${slabs.map(s => {
                let badgeClass = 'bg-secondary';
                let statusText = 'LOCKED';
                let iconHtml = '<i class="fas fa-lock text-muted"></i>';

                if (s.status === 'approved') {
                  badgeClass = 'bg-success';
                  statusText = 'APPROVED';
                  iconHtml = '<i class="fas fa-check-circle text-success fs-5"></i>';
                } else if (s.status === 'pending_review') {
                  badgeClass = 'bg-warning text-dark';
                  statusText = 'PENDING REVIEW';
                  iconHtml = '<i class="fas fa-spinner fa-spin text-warning fs-5"></i>';
                } else if (s.status === 'rejected') {
                  badgeClass = 'bg-danger';
                  statusText = 'REJECTED';
                  iconHtml = '<i class="fas fa-times-circle text-danger fs-5"></i>';
                } else if (cumulativeRevenue >= s.target) {
                  badgeClass = 'bg-info text-dark';
                  statusText = 'UNLOCKED';
                  iconHtml = '<i class="fas fa-unlock text-info fs-5"></i>';
                }

                const allowanceVal = allowanceMap[s.group] !== undefined ? allowanceMap[s.group] : 0.00;
                const allowanceText = allowanceVal > 0 ? `₹${allowanceVal.toLocaleString('en-IN')}/mo` : '₹0';

                return `
                  <tr style="${cumulativeRevenue >= s.target ? 'background:rgba(60,189,176,0.02);' : ''}">
                    <td><strong>${s.name}</strong></td>
                    <td>₹${s.target.toLocaleString('en-IN')}</td>
                    <td class="text-dark fw-bold">₹${s.reward.toLocaleString('en-IN')}</td>
                    <td>${s.item}</td>
                    <td><span class="text-muted">${allowanceText}</span></td>
                    <td>
                      <div class="d-flex align-items-center gap-2">
                        ${iconHtml}
                        <span class="badge ${badgeClass}" style="font-size:0.65rem;">${statusText}</span>
                      </div>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Grooming Allowance history & Referred Users lists -->
      <div class="row g-4 mb-4">
        <!-- Grooming Allowance History -->
        <div class="col-lg-6">
          <div class="spx-card h-100">
            <h6 class="fw-bold mb-3 text-primary"><i class="fas fa-user-gear me-2"></i>Monthly Grooming Allowance History</h6>
            <div style="overflow-y:auto; max-height: 250px;">
              <table class="spx-table" style="font-size:0.8rem;">
                <thead>
                  <tr>
                    <th>Month</th>
                    <th>Meeting Group</th>
                    <th>Allowance Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${allowances.map(a => `
                    <tr>
                      <td><strong>${a.payment_month}</strong></td>
                      <td>${a.group_name}</td>
                      <td class="text-success fw-bold">₹${parseFloat(a.allowance_amount).toLocaleString('en-IN')}</td>
                      <td><span class="badge bg-success">PAID</span></td>
                    </tr>
                  `).join('') || '<tr><td colspan="4" class="text-center text-muted py-3">No allowance payouts yet. Complete milestones to trigger allowances.</td></tr>'}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Referred Teachers list -->
        <div class="col-lg-6">
          <div class="spx-card h-100">
            <h6 class="fw-bold mb-3 text-primary"><i class="fas fa-chalkboard-teacher me-2"></i>Referred Teachers</h6>
            <div style="overflow-y:auto; max-height: 250px;">
              <table class="spx-table" style="font-size:0.8rem;">
                <thead>
                  <tr>
                    <th>Teacher Name</th>
                    <th>Joined On</th>
                    <th>Comm. Earned (1%)</th>
                    <th>Index</th>
                  </tr>
                </thead>
                <tbody>
                  ${refTeachers.map((t, idx) => `
                    <tr>
                      <td>
                        <div class="d-flex align-items-center gap-2">
                          <img src="${t.photo_url || defaultAvatar}" class="rounded-circle" style="width:24px; height:24px; object-fit:cover;" onerror="this.src=defaultAvatar">
                          <span class="text-dark">${t.name}</span>
                        </div>
                      </td>
                      <td>${fmtDate(t.created_at)}</td>
                      <td class="text-success fw-bold">₹${parseFloat(t.commission_earned).toLocaleString('en-IN')}</td>
                      <td>
                        ${idx < 10 
                          ? '<span class="badge bg-success-subtle text-success">Active</span>' 
                          : '<span class="badge bg-danger-subtle text-danger" title="Cap limit of 10 teachers exceeded. No commission generated from this teacher.">Cap Exceeded</span>'}
                      </td>
                    </tr>
                  `).join('') || '<tr><td colspan="4" class="text-center text-muted py-3">No teachers referred yet.</td></tr>'}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- Referred Students list & Ledger Statement -->
      <div class="row g-4">
        <!-- Referred Students -->
        <div class="col-lg-5">
          <div class="spx-card h-100">
            <h6 class="fw-bold mb-3 text-primary"><i class="fas fa-user-graduate me-2"></i>Referred Students</h6>
            <div style="overflow-y:auto; max-height: 350px;">
              <table class="spx-table" style="font-size:0.8rem;">
                <thead>
                  <tr>
                    <th>Student Name</th>
                    <th>Joined On</th>
                    <th>Comm. Earned (5%)</th>
                  </tr>
                </thead>
                <tbody>
                  ${refStudents.map(s => `
                    <tr>
                      <td>
                        <div class="d-flex align-items-center gap-2">
                          <img src="${s.photo_url || defaultAvatar}" class="rounded-circle" style="width:24px; height:24px; object-fit:cover;" onerror="this.src=defaultAvatar">
                          <span class="text-dark">${s.name}</span>
                        </div>
                      </td>
                      <td>${fmtDate(s.created_at)}</td>
                      <td class="text-success fw-bold">₹${parseFloat(s.commission_earned).toLocaleString('en-IN')}</td>
                    </tr>
                  `).join('') || '<tr><td colspan="3" class="text-center text-muted py-3">No students referred yet.</td></tr>'}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Ledger Statement -->
        <div class="col-lg-7">
          <div class="spx-card h-100">
            <h6 class="fw-bold mb-3 text-primary"><i class="fas fa-list-ul me-2"></i>Wallet Ledger Statement</h6>
            <div style="overflow-y:auto; max-height: 350px;">
              <table class="spx-table" style="font-size:0.8rem;">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Transaction Type</th>
                    <th>Description</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  ${statement.map(l => {
                    const isCredit = parseFloat(l.amount) >= 0;
                    const amountText = (isCredit ? '+' : '-') + '₹' + Math.abs(parseFloat(l.amount)).toLocaleString('en-IN');
                    const colorClass = isCredit ? 'text-success' : 'text-danger';
                    
                    let typeBadge = 'bg-secondary';
                    if (l.type === 'course_share') typeBadge = 'bg-primary';
                    else if (l.type === 'student_referral') typeBadge = 'bg-success';
                    else if (l.type === 'teacher_referral') typeBadge = 'bg-info text-dark';
                    else if (l.type === 'grooming_allowance') typeBadge = 'bg-warning text-dark';
                    else if (l.type === 'slab_reward') typeBadge = 'bg-danger';
                    else if (l.type === 'withdrawal') typeBadge = 'bg-dark border';

                    return `
                      <tr>
                        <td>${fmtDate(l.created_at)}</td>
                        <td><span class="badge ${typeBadge}" style="font-size:0.6rem;">${l.type.toUpperCase().replace('_', ' ')}</span></td>
                        <td><span class="text-muted" style="font-size:0.75rem;">${l.description}</span></td>
                        <td class="${colorClass} fw-bold">${amountText}</td>
                      </tr>
                    `;
                  }).join('') || '<tr><td colspan="4" class="text-center text-muted py-3">No transactions logged yet.</td></tr>'}
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

// Global copy function helper
window.copyText = function(inputId, message) {
  const copyText = document.getElementById(inputId);
  if (!copyText) return;
  copyText.select();
  copyText.setSelectionRange(0, 99999);
  navigator.clipboard.writeText(copyText.value);
  showToast(message, 'success');
}

function highlightFormFieldError(formElement, errorMessage) {
  if (!formElement || !errorMessage) return;

  // Clear existing errors
  formElement.querySelectorAll('.spx-field-error').forEach(el => el.remove());
  formElement.querySelectorAll('.spx-input-error').forEach(el => {
    el.classList.remove('spx-input-error');
    el.style.borderColor = '';
    el.style.boxShadow = '';
  });

  const msg = errorMessage.toLowerCase();
  let matchedInput = null;

  const rules = [
    { keys: ['course selection', 'course is required'], ids: ['batchCourse', 'noteCourse'] },
    { keys: ['batch name'], ids: ['batchName'] },
    { keys: ['subject'], ids: ['batchSubject', 'courseSubject', 'tCourseSubject'] },
    { keys: ['start date'], ids: ['batchStartD'] },
    { keys: ['end date'], ids: ['batchEndD'] },
    { keys: ['start time'], ids: ['batchStartT'] },
    { keys: ['end time'], ids: ['batchEndT'] },
    { keys: ['days', 'day of week'], ids: ['batchDaysContainer'] },
    { keys: ['capacity'], ids: ['batchCapacity'] },
    { keys: ['planner desc', 'schedule', 'syllabus text'], ids: ['batchPlannerDesc'] },
    { keys: ['planner file', 'planner document', 'planner upload'], ids: ['batchPlanner'] },
    { keys: ['teaching method', 'style', 'methodology'], ids: ['batchTeachingMethod'] },
    { keys: ['instructions', 'prerequisites'], ids: ['batchInstructions'] },
    { keys: ['demo video'], ids: ['batchDemoVideo'] },
    { keys: ['title'], ids: ['courseTitle', 'tCourseTitle', 'assignTitle', 'noteTitle'] },
    { keys: ['description'], ids: ['courseDesc', 'tCourseDesc', 'assignDesc', 'noteDesc'] },
    { keys: ['duration weeks'], ids: ['courseLearningDuration', 'tCourseLearningDuration'] },
    { keys: ['grade'], ids: ['courseGrade', 'tCourseGrade'] },
    { keys: ['board'], ids: ['courseBoard', 'tCourseBoard'] },
    { keys: ['fees', 'fee'], ids: ['courseFees'] },
    { keys: ['thumbnail', 'banner'], ids: ['tCourseFileInput'] },
    { keys: ['badge', 'tag line'], ids: ['courseCustomTag', 'tCourseCustomTag'] },
    { keys: ['objective'], ids: ['courseObjective', 'tCourseObjective'] },
    { keys: ['outcome'], ids: ['courseLearningOutcome', 'tCourseLearningOutcome'] },
    { keys: ['language'], ids: ['courseLanguageInstruction', 'tCourseLanguageInstruction'] },
    { keys: ['daily class', 'daily duration'], ids: ['courseDailyClassDuration', 'tCourseDailyClassDuration'] },
    { keys: ['assessment'], ids: ['courseAssessmentDays', 'tCourseAssessmentDays'] },
    { keys: ['due date', 'due'], ids: ['assignDue'] },
    { keys: ['marks'], ids: ['assignMax'] },
    { keys: ['attachment', 'file upload'], ids: ['assignFile', 'noteFile'] }
  ];

  for (const rule of rules) {
    if (rule.keys.some(k => msg.includes(k))) {
      for (const id of rule.ids) {
        const el = formElement.querySelector(`#${id}`);
        if (el) {
          matchedInput = el;
          break;
        }
      }
    }
    if (matchedInput) break;
  }

  if (!matchedInput) {
    const inputs = formElement.querySelectorAll('input, textarea, select');
    for (const input of inputs) {
      const id = input.id ? input.id.toLowerCase() : '';
      const name = input.name ? input.name.toLowerCase() : '';
      const placeholder = input.placeholder ? input.placeholder.toLowerCase() : '';
      if (rules.some(r => r.keys.some(k => msg.includes(k) && (id.includes(k) || name.includes(k) || placeholder.includes(k))))) {
        matchedInput = input;
        break;
      }
    }
  }

  if (matchedInput) {
    matchedInput.classList.add('spx-input-error');
    matchedInput.style.borderColor = '#ef4444';
    matchedInput.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.15)';

    const errDiv = document.createElement('div');
    errDiv.className = 'spx-field-error text-danger mt-1 small fw-semibold';
    errDiv.style.color = '#ef4444';
    errDiv.innerHTML = `<i class="fas fa-exclamation-circle me-1"></i>${errorMessage}`;

    if (matchedInput.nextSibling) {
      matchedInput.parentNode.insertBefore(errDiv, matchedInput.nextSibling);
    } else {
      matchedInput.parentNode.appendChild(errDiv);
    }

    matchedInput.scrollIntoView({ behavior: 'smooth', block: 'center' });

    const clearError = () => {
      matchedInput.classList.remove('spx-input-error');
      matchedInput.style.borderColor = '';
      matchedInput.style.boxShadow = '';
      errDiv.remove();
      matchedInput.removeEventListener('input', clearError);
      matchedInput.removeEventListener('change', clearError);
    };
    matchedInput.addEventListener('input', clearError);
    matchedInput.addEventListener('change', clearError);
  }
}

initApp();

async function renderChats() {
  loading();
  try {
    const res = await fetch(`${API}/teacher/connect/conversations`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const conversations = await res.json();
    
    document.getElementById('pageContent').innerHTML = `
      <div class="row g-4" style="height: calc(100vh - 180px); max-height: 800px;">
        <!-- Conversations List -->
        <div class="col-lg-4 d-flex flex-column h-100">
          <div class="card d-flex flex-column h-100 p-0" style="overflow: hidden; border: 1px solid var(--border); background: #ffffff;">
            <div class="p-3 border-bottom" style="background: rgba(15,23,42,0.01);">
              <h6 class="fw-bold mb-1">Parent Conversations</h6>
              <p class="text-muted mb-0 small">Select a parent query thread to reply</p>
            </div>
            <div id="conversationsListBody" style="flex:1; overflow-y:auto;" class="list-group list-group-flush">
              ${conversations.length === 0 ? `
                <div class="text-center py-5 text-muted small">
                  <div style="font-size: 2rem; margin-bottom: 8px;"><i class="fa-regular fa-comments"></i></div>
                  No active parent connection queries yet.
                </div>
              ` : conversations.map(c => {
                const initials = c.parent_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                const isActive = (window.teacherActiveParentId === c.parent_id && window.teacherActiveStudentId === c.student_id);
                const activeClass = isActive ? 'active' : '';
                const timeStr = c.last_message_at ? new Date(c.last_message_at).toLocaleDateString([], { month: 'short', day: 'numeric' }) : '';
                
                return `
                  <a href="#" onclick="selectTeacherConversation(event, '${c.parent_id}', '${c.parent_name.replace(/'/g, "\\'")}', '${c.student_id}', '${c.student_name.replace(/'/g, "\\'")}')" class="list-group-item list-group-item-action ${activeClass} p-3 d-flex align-items-start gap-3" style="border-bottom: 1px solid var(--border); text-decoration: none;">
                    <div class="user-avatar" style="width: 40px; height: 40px; border-radius: 50%; background: var(--gradient); color: white; display: flex; align-items: center; justify-content: center; font-weight: 700; flex-shrink: 0;">${initials}</div>
                    <div class="flex-grow-1 min-w-0" style="text-align: left;">
                      <div class="d-flex justify-content-between align-items-center mb-1">
                        <strong class="text-dark truncate" style="font-size: 0.88rem;">${c.parent_name}</strong>
                        <div class="d-flex align-items-center gap-1">
                          ${parseInt(c.unread_count || 0) > 0 ? `<span class="badge bg-danger rounded-pill px-2 py-0.5" style="font-size:0.65rem;">${c.unread_count} new</span>` : ''}
                          <span class="text-muted" style="font-size: 0.72rem;">${timeStr}</span>
                        </div>
                      </div>
                      <div class="text-muted small truncate mb-1" style="font-size:0.75rem;">
                        Child: <strong>${c.student_name}</strong> (${c.student_grade} • ${c.student_code})
                      </div>
                      <div class="text-muted text-truncate" style="font-size: 0.75rem;">
                        ${c.last_message || 'No messages yet'}
                      </div>
                    </div>
                  </a>
                `;
              }).join('')}
            </div>
          </div>
        </div>

        <!-- Chat History Pane -->
        <div class="col-lg-8 d-flex flex-column h-100" id="chatHistoryPane">
          <div class="card d-flex flex-column h-100 p-0 align-items-center justify-content-center text-muted" style="border: 1px solid var(--border); background: #ffffff;">
            <div style="font-size: 3rem; margin-bottom: 12px;"><i class="fa-regular fa-comments text-primary"></i></div>
            <h5>Select a Conversation</h5>
            <p class="small">Choose a parent query from the list to start chatting.</p>
          </div>
        </div>
      </div>
    `;
  } catch (e) {
    document.getElementById('pageContent').innerHTML = `<div class="alert alert-danger">${e.message}</div>`;
  }
}

window.teacherActiveParentId = null;
window.teacherActiveStudentId = null;
let teacherChatInterval = null;

window.selectTeacherConversation = function(event, parentId, parentName, studentId, studentName) {
  if (event) {
    event.preventDefault();
  }
  window.teacherActiveParentId = parentId;
  window.teacherActiveStudentId = studentId;

  // Render the chat history pane layout
  const pane = document.getElementById('chatHistoryPane');
  pane.innerHTML = `
    <div class="card d-flex flex-column h-100 p-0" style="border: 1px solid var(--border); overflow: hidden; background: #ffffff;">
      <!-- Header -->
      <div class="p-3 border-bottom d-flex align-items-center justify-content-between" style="background: rgba(15,23,42,0.01); flex-shrink: 0; text-align: left;">
        <div>
          <h6 class="fw-bold mb-0">${parentName}</h6>
          <p class="text-muted mb-0 small">Conversation regarding student: <strong>${studentName}</strong></p>
        </div>
      </div>

      <!-- Notice Banner for 10-Day Auto-Deletion -->
      <div class="px-3 py-2 border-bottom d-flex align-items-center justify-content-between" style="background:rgba(245,158,11,0.12); color:#92400E; font-size:0.75rem; flex-shrink:0;">
        <span><i class="fas fa-info-circle me-1 text-warning"></i><strong>10-Day Storage Policy:</strong> Shared images (max 5 MB) are auto-deleted after 10 days. Download important files.</span>
      </div>

      <!-- Messages body -->
      <div id="teacherChatMessagesBody" style="flex:1; overflow-y:auto; padding:20px; display:flex; flex-direction:column; gap:14px; background:rgba(15,23,42,0.01);">
        <div class="text-center text-muted py-4"><i class="fas fa-spinner fa-spin me-2"></i>Loading chat history...</div>
      </div>

      <!-- Image Preview Container -->
      <div id="teacherChatImagePreviewBar" class="px-3 py-2 border-top bg-light align-items-center justify-content-between" style="display:none; flex-shrink:0;">
        <div class="d-flex align-items-center gap-2">
          <img id="teacherChatImagePreviewImg" src="" style="width:36px; height:36px; object-fit:cover; border-radius:6px;">
          <div>
            <div id="teacherChatImagePreviewName" class="small fw-semibold text-dark text-truncate" style="max-width:180px; font-size:0.75rem;">image.png</div>
            <div id="teacherChatImagePreviewSize" class="text-muted" style="font-size:0.68rem;">1.2 MB</div>
          </div>
        </div>
        <button type="button" class="btn btn-sm btn-outline-danger py-0 px-2" style="font-size:0.7rem;" onclick="clearSelectedChatImage('teacherChatImagePreviewBar', 'teacherChatImageInput')"><i class="fas fa-times me-1"></i>Remove</button>
      </div>

      <!-- Quick Emoji Bar -->
      <div class="emoji-toolbar px-3 py-2 border-top d-flex align-items-center gap-2 overflow-auto" style="background:#f8fafc; flex-shrink:0;">
        <span class="small text-muted fw-semibold me-1" style="font-size:0.72rem; white-space:nowrap;">Quick Emojis:</span>
        <button type="button" class="btn btn-sm btn-light border p-1 rounded-circle px-2" style="font-size:1.1rem; line-height:1;" onclick="insertEmoji('teacherChatMessageInput', '😀')">😀</button>
        <button type="button" class="btn btn-sm btn-light border p-1 rounded-circle px-2" style="font-size:1.1rem; line-height:1;" onclick="insertEmoji('teacherChatMessageInput', '👍')">👍</button>
        <button type="button" class="btn btn-sm btn-light border p-1 rounded-circle px-2" style="font-size:1.1rem; line-height:1;" onclick="insertEmoji('teacherChatMessageInput', '👏')">👏</button>
        <button type="button" class="btn btn-sm btn-light border p-1 rounded-circle px-2" style="font-size:1.1rem; line-height:1;" onclick="insertEmoji('teacherChatMessageInput', '⭐')">⭐</button>
        <button type="button" class="btn btn-sm btn-light border p-1 rounded-circle px-2" style="font-size:1.1rem; line-height:1;" onclick="insertEmoji('teacherChatMessageInput', '📚')">📚</button>
        <button type="button" class="btn btn-sm btn-light border p-1 rounded-circle px-2" style="font-size:1.1rem; line-height:1;" onclick="insertEmoji('teacherChatMessageInput', '🎯')">🎯</button>
        <button type="button" class="btn btn-sm btn-light border p-1 rounded-circle px-2" style="font-size:1.1rem; line-height:1;" onclick="insertEmoji('teacherChatMessageInput', '🎓')">🎓</button>
        <button type="button" class="btn btn-sm btn-light border p-1 rounded-circle px-2" style="font-size:1.1rem; line-height:1;" onclick="insertEmoji('teacherChatMessageInput', '✍️')">✍️</button>
        <button type="button" class="btn btn-sm btn-light border p-1 rounded-circle px-2" style="font-size:1.1rem; line-height:1;" onclick="insertEmoji('teacherChatMessageInput', '💪')">💪</button>
        <button type="button" class="btn btn-sm btn-light border p-1 rounded-circle px-2" style="font-size:1.1rem; line-height:1;" onclick="insertEmoji('teacherChatMessageInput', '🙏')">🙏</button>
      </div>

      <!-- Footer input -->
      <form onsubmit="sendTeacherChatMessage(event)" style="padding:14px 16px; border-top:1px solid var(--border); display:flex; gap:8px; align-items:center; flex-shrink:0;">
        <input type="file" id="teacherChatImageInput" accept="image/*" style="display:none;" onchange="handleChatImageSelection(this, 'teacherChatImagePreviewBar', 'teacherChatImagePreviewImg', 'teacherChatImagePreviewName', 'teacherChatImagePreviewSize')">
        <button type="button" class="btn btn-light border p-2" style="border-radius:10px; font-size:1rem;" onclick="document.getElementById('teacherChatImageInput').click()" title="Attach image (Max 5 MB)">
          <i class="fa-solid fa-camera text-primary"></i>
        </button>
        <input type="text" id="teacherChatMessageInput" class="form-control spx-input" placeholder="Type your reply regarding ${studentName}..." style="flex:1; border-radius:10px;">
        <button type="submit" class="btn btn-spx px-4" style="border-radius:10px;"><i class="fa-solid fa-paper-plane me-1"></i> Send</button>
      </form>
    </div>
  `;

  // Highlight active conversation item in the list
  document.querySelectorAll('#conversationsListBody a').forEach(a => a.classList.remove('active'));
  if (event && event.currentTarget) {
    event.currentTarget.classList.add('active');
  }

  loadTeacherChatMessages();

  // Clear existing polling interval
  if (teacherChatInterval) clearInterval(teacherChatInterval);

  // Poll for replies every 4 seconds while the dashboard is showing chats
  teacherChatInterval = setInterval(() => {
    const pane = document.getElementById('teacherChatMessagesBody');
    const isShowingChats = document.querySelector('.nav-item.active')?.dataset.page === 'chats';
    if (pane && isShowingChats) {
      loadTeacherChatMessages(true); // silent fetch
    } else {
      clearInterval(teacherChatInterval);
    }
  }, 4000);
};

async function loadTeacherChatMessages(silent = false) {
  if (!window.teacherActiveParentId || !window.teacherActiveStudentId) return;
  try {
    const res = await fetch(`${API}/teacher/connect/messages?parentId=${window.teacherActiveParentId}&studentId=${window.teacherActiveStudentId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      const messages = await res.json();
      const body = document.getElementById('teacherChatMessagesBody');
      if (!body) return;

      if (messages.length === 0) {
        body.innerHTML = '<div class="text-center text-muted py-5 small">No messages in this chat.</div>';
        return;
      }

      const activeProfile = JSON.parse(localStorage.getItem('spx_teacher_profile') || '{}');
      const teacherName = activeProfile.name || 'Teacher';

      body.innerHTML = messages.map(m => {
        const isMe = m.sender_role === 'teacher';
        const bubbleClass = isMe ? 'sent' : 'received';
        const alignSelf = isMe ? 'align-self: flex-end;' : 'align-self: flex-start;';
        
        const bgColor = isMe ? 'background: var(--primary); color: white;' : 'background: #f1f5f9; color: var(--text-primary); border: 1px solid var(--border);';
        const radiusStyle = isMe ? 'border-bottom-right-radius: 4px;' : 'border-bottom-left-radius: 4px;';

        const timeStr = new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        const imgSrc = m.image_url ? (m.image_url.startsWith('/') ? m.image_url : '/' + m.image_url) : '';
        const imageHtml = imgSrc ? `
          <div class="my-1">
            <img src="${imgSrc}" style="max-width:240px; max-height:240px; border-radius:10px; cursor:pointer; object-fit:cover; border: 1px solid rgba(0,0,0,0.1);" onclick="window.open('${imgSrc}', '_blank')">
            <div class="mt-1 text-end">
              <a href="${imgSrc}" download="attachment_${m.id}.png" target="_blank" class="btn btn-sm btn-light border py-0 px-2" style="font-size:0.65rem; border-radius:6px;" title="Download image to local storage before 10-day auto-deletion">
                <i class="fas fa-download me-1 text-primary"></i>Download Image
              </a>
            </div>
          </div>
        ` : '';

        return `
          <div class="chat-bubble ${bubbleClass}" style="${alignSelf} ${bgColor} ${radiusStyle} max-width: 75%; padding: 12px 16px; border-radius: 14px; font-size: 0.85rem; line-height: 1.45; word-wrap: break-word; margin-bottom: 8px; text-align: left;">
            <div style="font-weight: 700; font-size: 0.7rem; opacity: 0.85; margin-bottom: 4px;">
              ${isMe ? teacherName : m.sender_name}
            </div>
            ${imageHtml}
            <div>${m.message}</div>
            <div style="font-size: 0.6rem; opacity: 0.7; text-align: right; margin-top: 4px;">
              ${timeStr}
            </div>
          </div>
        `;
      }).join('');

      // Scroll to bottom
      body.scrollTop = body.scrollHeight;

      // Refresh teacher notification counts & badges
      if (typeof loadTeacherNotificationCounts === 'function') loadTeacherNotificationCounts();
    }
  } catch (e) {
    console.error('Failed to load teacher messages:', e);
  }
}

window.insertEmoji = function(inputId, emoji) {
  const el = document.getElementById(inputId);
  if (!el) return;
  const start = el.selectionStart || el.value.length;
  const end = el.selectionEnd || el.value.length;
  el.value = el.value.substring(0, start) + emoji + el.value.substring(end);
  el.focus();
  el.selectionStart = el.selectionEnd = start + emoji.length;
};

window.handleChatImageSelection = function(input, previewBarId, previewImgId, nameId, sizeId) {
  const file = input.files[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) {
    showToast('⚠️ Image file size exceeds 5 MB limit. Please select a smaller image file.', 'error');
    input.value = '';
    return;
  }
  const previewBar = document.getElementById(previewBarId);
  const previewImg = document.getElementById(previewImgId);
  const nameEl = document.getElementById(nameId);
  const sizeEl = document.getElementById(sizeId);

  if (previewBar && previewImg) {
    const reader = new FileReader();
    reader.onload = e => previewImg.src = e.target.result;
    reader.readAsDataURL(file);
    if (nameEl) nameEl.textContent = file.name;
    if (sizeEl) sizeEl.textContent = (file.size / (1024 * 1024)).toFixed(2) + ' MB';
    previewBar.style.display = 'flex';
  }
};

window.clearSelectedChatImage = function(previewBarId, inputId) {
  const input = document.getElementById(inputId);
  const previewBar = document.getElementById(previewBarId);
  if (input) input.value = '';
  if (previewBar) previewBar.style.display = 'none';
};

function checkTeacherProhibitedContact(text) {
  if (!text) return false;
  const digitsOnly = text.replace(/\D/g, '');
  if (digitsOnly.length >= 10) return true;
  const phonePattern = /(?:\+?\d{1,4}[-.\s]*)?\(?\d{2,5}\)?[-.\s]*\d{3,5}[-.\s]*\d{3,5}/;
  if (phonePattern.test(text)) return true;
  const emailPattern = /[a-zA-Z0-9._%+-]+(?:\s*@\s*|\s*\[at\]\s*|\s*\(at\)\s*|\s+at\s+)[a-zA-Z0-9.-]+(?:\s*\.\s*|\s*\[dot\]\s*|\s*\(dot\)\s*|\s+dot\s+)[a-zA-Z]{2,}/i;
  if (emailPattern.test(text)) return true;
  const socialPattern = /(?:whatsapp|insta|instagram|facebook|fb|telegram|tg|snapchat|linkedin|twitter|x\.com|wa\.me|t\.me|connect on|add me|call me|message me|ping me|reach me|handle is|my id|my number|contact no|mobile no)[\s:]*@?[\w.-]+/i;
  if (socialPattern.test(text)) return true;
  const urlPattern = /(?:https?:\/\/|www\.)[^\s]+/i;
  if (urlPattern.test(text)) return true;
  return false;
}

window.sendTeacherChatMessage = async function(e) {
  if (e) e.preventDefault();
  const input = document.getElementById('teacherChatMessageInput');
  const fileInput = document.getElementById('teacherChatImageInput');
  const message = input.value.trim();
  const file = fileInput ? fileInput.files[0] : null;

  if ((!message && !file) || !window.teacherActiveParentId || !window.teacherActiveStudentId) return;

  if (message && checkTeacherProhibitedContact(message)) {
    showToast('⚠️ Privacy Notice: Sharing phone numbers, email IDs, or social handles is strictly prohibited. Keep messages focused on student progress.', 'error');
    return;
  }

  try {
    const formData = new FormData();
    formData.append('parentId', window.teacherActiveParentId);
    formData.append('studentId', window.teacherActiveStudentId);
    formData.append('message', message);
    if (file) formData.append('image', file);

    const res = await fetch(`${API}/teacher/connect/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });
    if (res.ok) {
      input.value = '';
      clearSelectedChatImage('teacherChatImagePreviewBar', 'teacherChatImageInput');
      loadTeacherChatMessages();
    } else {
      const err = await res.json();
      showToast(err.error || 'Failed to send message', 'error');
    }
  } catch (err) {
    showToast('Connection error', 'error');
  }
};

setupAutoSave('autosave_teacher_register', [
  'regName', 'regEmail', 'regPhone', 'regPassword', 'regAltEmail', 'regMobileNumber',
  'regLinkedIn', 'regTwitter', 'regQualification', 'regSubjects', 'regExp', 'regLanguages', 'regReferralCode'
]);

// Clear invalid validation markings dynamically on typing
document.addEventListener('input', (e) => {
  if (e.target && e.target.classList.contains('is-invalid')) {
    e.target.classList.remove('is-invalid', 'border-danger');
  }
});

function setupOtpBoxListeners(containerId, hiddenInputId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const boxes = Array.from(container.querySelectorAll('input'));
  const hiddenInput = document.getElementById(hiddenInputId);

  function syncHidden() {
    const val = boxes.map(b => b.value).join('');
    if (hiddenInput) hiddenInput.value = val;
  }

  boxes.forEach((box, idx) => {
    box.addEventListener('input', (e) => {
      const val = box.value.replace(/\D/g, '');
      box.value = val ? val.slice(-1) : '';
      if (box.value) {
        box.style.borderColor = '#0d7a6d';
        box.style.background = 'rgba(13, 122, 109, 0.06)';
        if (idx < boxes.length - 1) {
          boxes[idx + 1].focus();
        }
      } else {
        box.style.borderColor = '#cbd5e1';
        box.style.background = '#f8fafc';
      }
      syncHidden();
    });

    box.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !box.value && idx > 0) {
        boxes[idx - 1].focus();
        boxes[idx - 1].value = '';
        boxes[idx - 1].style.borderColor = '#cbd5e1';
        boxes[idx - 1].style.background = '#f8fafc';
        syncHidden();
      }
    });

    box.addEventListener('paste', (e) => {
      e.preventDefault();
      const pasteData = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '');
      if (pasteData) {
        for (let i = 0; i < boxes.length; i++) {
          if (i < pasteData.length) {
            boxes[i].value = pasteData[i];
            boxes[i].style.borderColor = '#0d7a6d';
            boxes[i].style.background = 'rgba(13, 122, 109, 0.06)';
          } else {
            boxes[i].value = '';
            boxes[i].style.borderColor = '#cbd5e1';
            boxes[i].style.background = '#f8fafc';
          }
        }
        const lastIdx = Math.min(pasteData.length - 1, boxes.length - 1);
        if (lastIdx >= 0) boxes[lastIdx].focus();
        syncHidden();
      }
    });
  });
}
