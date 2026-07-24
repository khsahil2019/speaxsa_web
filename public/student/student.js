// SPEAXA Student Portal JS
const API = '/api';
const defaultAvatar = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2NiZDVlMSI+PHBhdGggZD0iTTEyIDEyYzIuMjEgMCA0LTEuNzkgNC00cy0xLjc5LTQtNC00LTQgMS53OS00IDQgMS53OSA0IDQgNHptMCAyYy0yLjY3IDAtOCAxLjM0LTggNHYyaDE2di0yYzAtMi42Ni01LjMzLTQtOC00eiIvPjwvc3ZnPg==';
let token = localStorage.getItem('student_token') || sessionStorage.getItem('student_token');
let user = JSON.parse(localStorage.getItem('student_user') || sessionStorage.getItem('student_user') || 'null');

const Toast = new bootstrap.Toast(document.getElementById('toastEl'), { delay: 3000 });

function showToast(msg, type = 'success') {
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
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', ...opts.headers },
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
    setupOtpBoxListeners('sLoginOtpBoxes', 'loginOtpVal');
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
    setupOtpBoxListeners('sLoginOtpBoxes', 'loginOtpVal');
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
      body: JSON.stringify({ email: emailVal, password: passVal, role: 'student' })
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

let _regOtpPending = null;

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
      grade: document.getElementById('regGrade')?.value || '',
      board: document.getElementById('regBoard')?.value || '',
      referred_by_code: document.getElementById('regReferralCode') ? document.getElementById('regReferralCode').value.trim() : '',
      role: 'student',
    };

    // List of required fields for student registration validation
    const requiredFields = [
      { id: 'regName', label: 'Full Name' },
      { id: 'regEmail', label: 'Email Address' },
      { id: 'regPhone', label: 'Phone' },
      { id: 'regPassword', label: 'Password' },
      { id: 'regGrade', label: 'Grade' },
      { id: 'regBoard', label: 'Board' }
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
    }

    if (document.getElementById('regTermsAgree') && !document.getElementById('regTermsAgree').checked) {
      const termsEl = document.getElementById('regTermsAgree');
      termsEl.focus();
      termsEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      throw new Error('You must agree to the Terms of Service & Privacy Policy');
    }

    if (window._regPhoneOtpPending) {
      payload.phoneOtp = window._regPhoneOtpPending;
    }
    if (window._regEmailOtpPending) {
      payload.emailOtp = window._regEmailOtpPending;
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
      window._regPhoneOtpPending = null;
      window._regEmailOtpPending = null;
      return;
    }

    if (data.status === 'otp_sent') {
      document.getElementById('registerSection').classList.add('d-none');
      document.getElementById('registerOtpSection').classList.remove('d-none');
      const phoneDisp = document.getElementById('regPhoneDisplay');
      if (phoneDisp) {
        phoneDisp.textContent = payload.phone ? ('+91 ' + payload.phone.replace(/^91/, '')) : 'Mobile Number';
      }
      setupOtpBoxListeners('sRegOtpBoxes', 'regEmailOtpInput');
      return;
    }

    window._regPhoneOtpPending = null;
    window._regEmailOtpPending = null;
    clearAutoSave('autosave_student_register');
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
        otpErr.innerHTML = toFriendlyError(e.message);
        otpErr.classList.remove('d-none');
      }
    } else {
      window._regPhoneOtpPending = null;
      window._regEmailOtpPending = null;
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
  window._regPhoneOtpPending = null;
  window._regEmailOtpPending = emailOtpVal;
  doRegister();
}

function cancelRegisterOtp() {
  window._regPhoneOtpPending = null;
  window._regEmailOtpPending = null;
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
  window._regPhoneOtpPending = null;
  window._regEmailOtpPending = null;
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

  if (usr.role !== 'student') {
    handleCrossRoleRedirect(tok, usr);
    return;
  }

  const remember = document.getElementById('rememberMe')?.checked;
  if (remember) {
    localStorage.setItem('student_token', tok);
    localStorage.setItem('student_user', JSON.stringify(usr));
    sessionStorage.removeItem('student_token');
    sessionStorage.removeItem('student_user');
  } else {
    sessionStorage.setItem('student_token', tok);
    sessionStorage.setItem('student_user', JSON.stringify(usr));
    localStorage.removeItem('student_token');
    localStorage.removeItem('student_user');
  }
  showApp();
  navigateTo('home');
}

function updateCachedUser(usr) {
  user = usr;
  if (localStorage.getItem('student_token')) {
    localStorage.setItem('student_user', JSON.stringify(usr));
  } else {
    sessionStorage.setItem('student_user', JSON.stringify(usr));
  }
}

function logout() {
  localStorage.removeItem('student_token');
  localStorage.removeItem('student_user');
  sessionStorage.removeItem('student_token');
  sessionStorage.removeItem('student_user');
  token = null;
  user = null;
  document.getElementById('authScreen').classList.remove('d-none');
  document.getElementById('studentApp').classList.add('d-none');
}

function handleCrossRoleRedirect(tok, usr) {
  // Clear student credentials
  localStorage.removeItem('student_token');
  localStorage.removeItem('student_user');
  sessionStorage.removeItem('student_token');
  sessionStorage.removeItem('student_user');

  const role = usr.role;
  const remember = document.getElementById('rememberMe')?.checked;

  if (role === 'teacher') {
    if (remember) {
      localStorage.setItem('teacher_token', tok);
      localStorage.setItem('teacher_user', JSON.stringify(usr));
    } else {
      sessionStorage.setItem('teacher_token', tok);
      sessionStorage.setItem('teacher_user', JSON.stringify(usr));
    }
    showToast('Redirecting to Teacher Portal...', 'info');
    setTimeout(() => { window.location.href = '/teacher/'; }, 1000);
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
  document.getElementById('studentApp').classList.remove('d-none');
  if (user) {
    const av = user.photo_url || defaultAvatar;
    document.getElementById('avatarSidebar').src = av;
    document.getElementById('avatarHeader').src = av;
    document.getElementById('nameSidebar').textContent = user.name;
    document.getElementById('codeSidebar').textContent = user.student_code || user.role;
  }
  checkEmailVerificationReminder();
  loadFCMToken();
}

function startEmailVerificationCooldown(durationSeconds = 300) {
  const btnBanner = document.getElementById('btnBannerResendEmail');
  const btnModal = document.getElementById('btnModalResendEmail');

  // Real-time calculation based on last sent timestamp
  const lastSent = parseInt(localStorage.getItem('spx_last_email_sent_time') || sessionStorage.getItem('last_auto_email_link_time') || '0', 10);
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
  const lastSent = parseInt(localStorage.getItem('spx_last_email_sent_time') || sessionStorage.getItem('last_auto_email_link_time') || '0', 10);

  if (lastSent === 0 || now - lastSent > 300000) {
    localStorage.setItem('spx_last_email_sent_time', String(now));
    sessionStorage.setItem('last_auto_email_link_time', String(now));
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
  const now = Date.now();
  localStorage.setItem('spx_last_email_sent_time', String(now));
  sessionStorage.setItem('last_auto_email_link_time', String(now));
  startEmailVerificationCooldown(300);

  try {
    const emailToUse = user ? user.email : '';
    const res = await fetch('/api/auth/send-email-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: emailToUse })
    });
    const data = await res.json();
    if (res.ok) {
      showToast(data.message || `Verification link sent to ${emailToUse || 'your email'}. Please check your primary inbox.`, 'success');
    } else {
      showToast(data.error || 'Failed to send verification link', 'error');
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function resendProfileEmailLink(emailToUse, evtBtn) {
  const btn = evtBtn || event?.target;
  if (window.startResendCooldown && btn) {
    window.startResendCooldown(btn, 300);
  }
  try {
    const targetEmail = emailToUse || (user ? user.email : '');
    const res = await fetch('/api/auth/send-email-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: targetEmail })
    });
    const data = await res.json();
    if (res.ok) {
      showToast(data.message || `Verification link sent to ${targetEmail} (valid for 30 mins)`, 'success');
    } else {
      showToast(data.error || 'Failed to send verification link', 'error');
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
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
  const titles = { home:'Dashboard', courses:'Browse Courses', mybatches:'My Batches', 'upcoming-classes':'Upcoming Classes',
    attendance:'Attendance', assignments:'Assignments', recordings:'Recordings',
    reports:'Monthly Reports', notifications:'Notifications', profile:'My Profile', parents:'Parent Access Requests' };
  document.getElementById('pageTitle').textContent = titles[page] || page;
  const renders = { home:renderHome, courses:renderCourses, mybatches:renderMyBatches, 'upcoming-classes':renderUpcomingClasses,
    attendance:renderAttendance, assignments:renderAssignments, recordings:renderRecordings,
    reports:renderReports, notifications:renderNotifications, profile:renderProfile, parents:renderParents };
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

function fmtDateTime(dt) {
  if (!dt) return '—';
  const d = new Date(dt);
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

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
            </div>
            ${batches.length ? batches.slice(0,4).map(b => `
              <div class="d-flex align-items-center gap-3 p-3 mb-2 rounded-3" style="background:var(--bg-dark);border:1px solid var(--border)">
                <div style="width:44px;height:44px;border-radius:12px;background:var(--gradient);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">📚</div>
                <div class="flex-grow-1">
                  <div class="fw-semibold text-dark small">${b.course_title||b.batch_name}</div>
                  <div class="text-muted" style="font-size:.75rem">${b.teacher_name||''} • ${(b.days_of_week||[]).join(', ')} ${b.start_time||''}</div>
                </div>
                <div style="width:110px; text-align:right; flex-shrink:0;">
                  ${b.status === 'active' ? `<button onclick="viewBatchDetails('${b.id}')" class="btn btn-sm btn-spx w-100" style="font-size:.75rem">View Details</button>` : '<span class="text-muted small d-block text-center">Inactive</span>'}
                </div>
              </div>`).join('') : '<p class="text-muted small text-center py-3">No batches enrolled yet</p>'}
          </div>
        </div>
        <div class="col-lg-4">
          <div class="spx-card">
            <div class="d-flex align-items-center justify-content-between mb-3">
              <h6 class="mb-0">Notifications (${notifs.length})</h6>
              <a onclick="navigateTo('notifications')" class="text-primary small" style="cursor:pointer">View All →</a>
            </div>
            ${notifs.slice(0,5).map(n => `
              <div class="mb-3 p-2 rounded" style="background:var(--bg-dark)">
                <div class="fw-semibold small text-dark">${n.title}</div>
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
        <div class="course-thumb" style="${c.thumbnail_url ? `background: url(${c.thumbnail_url}) center/cover no-repeat;` : ''}">
          ${c.thumbnail_url ? '' : icons[c.subject]||'📖'}
        </div>
        <div class="p-3">
          <div class="d-flex gap-2 mb-2">
            <span style="font-size:.7rem;background:rgba(60,189,176,.15);color:#3CBDB0;border-radius:6px;padding:2px 8px">${c.subject||'General'}</span>
            <span style="font-size:.7rem;background:rgba(16,185,129,.15);color:#10B981;border-radius:6px;padding:2px 8px">${c.grade||''}</span>
          </div>
          <div class="fw-bold text-dark mb-1">${c.title}</div>
          <div class="text-muted" style="font-size:.8rem;margin:0">${formatCollapsibleText(c.description, 80) || ''}</div>
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

    const [batches, myBatches, modules] = await Promise.all([
      api(`/student/batches?courseId=${courseId}`),
      api('/student/my-batches'),
      api(`/courses/${courseId}/modules`)
    ]);

    const myBatchIds = myBatches.map(mb => mb.id);
    const bodyEl = document.getElementById('courseDetailsBody');
    
    // Course Details metadata
    let extraDetailsHtml = '';
    if (course.learning_duration) {
      extraDetailsHtml += `<div class="d-flex justify-content-between mb-2 small text-muted"><span>Learning Duration:</span><strong style="color:var(--text-primary);">${course.learning_duration}</strong></div>`;
    }
    if (course.language_instruction) {
      extraDetailsHtml += `<div class="d-flex justify-content-between mb-2 small text-muted"><span>Language of Instruction:</span><strong style="color:var(--text-primary);">${course.language_instruction}</strong></div>`;
    }
    if (course.daily_class_duration) {
      extraDetailsHtml += `<div class="d-flex justify-content-between mb-2 small text-muted"><span>Daily Class Duration:</span><strong style="color:var(--text-primary);">${course.daily_class_duration}</strong></div>`;
    }
    if (course.assessment_days) {
      extraDetailsHtml += `<div class="d-flex justify-content-between mb-2 small text-muted"><span>Assessments:</span><strong style="color:var(--text-primary);">${course.assessment_days}</strong></div>`;
    }
    if (course.custom_tag) {
      extraDetailsHtml += `<div class="d-flex justify-content-between mb-2 small text-muted"><span>Special Tag:</span><strong style="color:var(--primary);">${course.custom_tag}</strong></div>`;
    }

    let objectiveHtml = '';
    if (course.objective) {
      objectiveHtml = `
        <div class="mt-3 p-3 rounded-3" style="background: rgba(60, 189, 176, 0.03); border: 1px solid var(--border);">
          <h6 class="fw-bold mb-2 small text-primary"><i class="fas fa-bullseye me-2"></i>Course Objective</h6>
          <div class="text-muted small mb-0" style="line-height:1.5;">${formatCollapsibleText(course.objective, 120)}</div>
        </div>
      `;
    }

    let learningOutcomeHtml = '';
    if (course.learning_outcome) {
      learningOutcomeHtml = `
        <div class="mt-3 p-3 rounded-3" style="background: rgba(16, 185, 129, 0.03); border: 1px solid var(--border);">
          <h6 class="fw-bold mb-2 small text-success"><i class="fas fa-trophy me-2"></i>Learning Outcomes</h6>
          <div class="text-muted small mb-0" style="line-height:1.5;">${formatCollapsibleText(course.learning_outcome, 120)}</div>
        </div>
      `;
    }

    let syllabusHtml = '';
    if (modules && modules.length > 0) {
      syllabusHtml = `
        <hr style="border-color:var(--border); margin: 1.5rem 0;">
        <h6 class="fw-bold mb-2 text-primary" style="font-size: 0.85rem;"><i class="fas fa-book-open me-2"></i>Syllabus & Sections</h6>
        <div class="d-flex flex-column gap-2" style="max-height: 180px; overflow-y: auto;">
          ${modules.map((m, idx) => `
            <div class="p-2 rounded" style="background:rgba(255,255,255,0.01); border:1px solid var(--border);">
              <div class="fw-bold small text-white" style="font-size: 0.75rem;">${idx + 1}. ${m.title}</div>
              <div class="text-muted" style="font-size: 0.65rem;">${formatCollapsibleText(m.description, 100) || ''}</div>
            </div>
          `).join('')}
        </div>
      `;
    }

    bodyEl.innerHTML = `
      <div class="row g-4">
        <div class="col-md-5">
          <div class="p-4 rounded-3 shadow-sm" style="background:var(--bg-card); border:1px solid var(--border);">
            <span class="badge bg-primary mb-2 px-3 py-2 rounded-2" style="font-size:0.75rem; font-weight:600; letter-spacing:0.5px;">${course.subject}</span>
            <h4 class="fw-bold mb-3" style="color:var(--text-primary); font-family:'Outfit',sans-serif;">${course.title}</h4>
            <div class="text-muted small mb-4" style="line-height:1.6;">${formatCollapsibleText(course.description) || 'No description provided.'}</div>
            <div class="d-flex justify-content-between mb-2 small text-muted">
              <span>Grade & Board:</span>
              <strong style="color:var(--text-primary);">${course.grade} (${course.board})</strong>
            </div>
            <div class="d-flex justify-content-between mb-2 small text-muted">
              <span>Duration:</span>
              <strong style="color:var(--text-primary);">${course.duration_weeks || 12} weeks</strong>
            </div>
            ${extraDetailsHtml}
            ${objectiveHtml}
            ${learningOutcomeHtml}
            
            <hr style="border-color:var(--border); margin: 1.5rem 0;">
            <div class="d-flex justify-content-between align-items-center mb-3">
              <span class="text-muted small">Course Fee:</span>
              <span class="fs-4 fw-bold text-success" style="font-family:'Outfit',sans-serif; font-weight:800;">₹${parseFloat(course.fees).toLocaleString('en-IN')}</span>
            </div>
            
            ${syllabusHtml}
          </div>
        </div>
        
        <div class="col-md-7">
          <h6 class="fw-bold mb-3" style="color:var(--text-primary);"><i class="fas fa-layer-group me-2 text-primary"></i>Available Batches</h6>
          <div class="d-flex flex-column gap-3 batch-list" style="max-height: 520px; overflow-y: auto; padding-right: 4px;">
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

              // Batch timeline and method
              let batchTimelineHtml = '';
              if (b.start_date || b.end_date) {
                const sDate = b.start_date ? fmtDate(b.start_date) : '—';
                const eDate = b.end_date ? fmtDate(b.end_date) : '—';
                batchTimelineHtml = `<div><i class="far fa-calendar-check me-2 text-primary" style="width: 14px;"></i>Timeline: <strong>${sDate}</strong> to <strong>${eDate}</strong></div>`;
              }
              
              let methodologyHtml = '';
              if (b.teaching_method) {
                methodologyHtml = `<div class="mt-2 p-2 rounded text-secondary small" style="background: rgba(255,255,255,0.01); border: 1px solid var(--border);"><i class="fas fa-chalkboard-teacher me-2 text-primary" style="width: 14px;"></i><strong>Methodology:</strong><div class="mt-1">${formatCollapsibleText(b.teaching_method)}</div></div>`;
              }

              let instructionsHtml = '';
              if (b.batch_instructions) {
                instructionsHtml = `
                  <div class="p-2.5 rounded-3 mb-2 small text-muted" style="background: rgba(255, 255, 255, 0.015); border: 1px solid var(--border); font-size: 0.72rem; line-height: 1.4;">
                    <strong class="text-primary d-block mb-1"><i class="fas fa-info-circle me-1"></i>Batch Instructions & Policies:</strong>
                    ${formatCollapsibleText(b.batch_instructions)}
                  </div>
                `;
              }

              let plannerHtml = '';
              if (b.planner_url) {
                plannerHtml = `
                  <a href="${b.planner_url}" target="_blank" class="btn btn-sm btn-outline-primary px-3 py-1.5 fw-bold" style="font-size: 0.7rem;">
                    <i class="fas fa-file-pdf me-1"></i>Download Syllabus Planner
                  </a>
                `;
              }

              let demoVideoHtml = '';
              if (b.demo_video_url) {
                demoVideoHtml = `
                  <button class="btn btn-sm btn-outline-warning px-3 py-1.5 fw-bold" style="font-size: 0.7rem;" onclick="playBatchDemoVideo('${b.demo_video_url}', '${b.batch_name.replace(/'/g, "\\'")}', event)">
                    <i class="fas fa-play-circle me-1"></i>Watch Demo Video
                  </button>
                `;
              }

              let actionsRowHtml = '';
              if (plannerHtml || demoVideoHtml) {
                actionsRowHtml = `
                  <div class="mb-3 d-flex flex-wrap gap-2 justify-content-end">
                    ${demoVideoHtml}
                    ${plannerHtml}
                  </div>
                `;
              }

              const demoBadge = b.is_free_demo 
                ? `<span class="badge bg-warning-subtle text-warning border px-2 py-1" style="font-size:0.65rem; border-color: currentColor !important; font-weight:600;"><i class="fas fa-gift me-1"></i>Free Demo Class Available</span>`
                : '';

              return `
                <div class="batch-card p-3 mb-3" style="background: var(--bg-dark-alt); border: 1px solid var(--border); border-radius: 14px;">
                  <div class="d-flex justify-content-between align-items-start mb-2">
                    <div>
                      <div class="d-flex align-items-center gap-2 flex-wrap mb-1">
                        <h6 class="fw-bold mb-0" style="color:var(--text-primary);">${b.batch_name}</h6>
                        ${demoBadge}
                      </div>
                      <div class="text-muted" style="font-size: 0.75rem; margin-bottom: 2px;">
                        <i class="fas fa-user-tie me-1 text-primary"></i> Mentor: <strong style="color:var(--text-secondary);">${b.teacher_name || 'Expert'}</strong> (${b.teacher_level || 'Gold'} • <i class="fas fa-star text-warning"></i> ${parseFloat(b.teacher_rating || 5).toFixed(1)})
                      </div>
                      <button class="btn btn-link p-0 text-primary text-decoration-none fw-semibold mb-2" onclick="toggleTeacherProfile(event, '${b.id}')" style="font-size: 0.72rem; border: none; background: transparent; outline: none; box-shadow: none;">
                        <i class="fas fa-info-circle me-1"></i>View Mentor Bio & Qualifications
                      </button>
                    </div>
                    <span class="badge ${seatsLeft <= 5 ? 'bg-danger-subtle text-danger' : 'bg-success-subtle text-success'} px-2 py-1" style="font-size:0.7rem; font-weight:600; border: 1px solid currentColor;">
                      ${seatsLeft} / ${b.capacity} Seats Left
                    </span>
                  </div>
                  
                  <div class="small text-muted mb-3 d-flex flex-column gap-2" style="font-size: 0.76rem;">
                    <div><i class="far fa-clock me-2 text-primary" style="width: 14px;"></i>Timings: <strong>${b.start_time.substr(0,5)} - ${b.end_time.substr(0,5)}</strong></div>
                    <div><i class="far fa-calendar-alt me-2 text-primary" style="width: 14px;"></i>Schedule: <strong>${b.days_of_week.join(', ')}</strong></div>
                    ${batchTimelineHtml}
                    ${methodologyHtml}
                  </div>
                  
                  ${instructionsHtml}
                  ${actionsRowHtml}
                  
                  <!-- Expandable Teacher Info Section -->
                  <div id="teacher-profile-${b.id}" class="mt-3 pt-3 border-top mb-3" style="display: none; border-color: rgba(255, 255, 255, 0.08) !important;">
                     <div class="d-flex align-items-center gap-2 mb-2">
                       <img src="${b.teacher_photo || defaultAvatar}" class="rounded-circle border" style="width: 40px; height: 40px; object-fit: cover; border-color: rgba(60, 189, 176, 0.25) !important;" alt="${b.teacher_name}" onerror="this.src=defaultAvatar">
                       <div>
                         <div class="fw-bold text-white" style="font-size: 0.78rem;">${b.teacher_name}</div>
                         <div style="font-size: 0.68rem; color: var(--text-secondary);"><span class="badge bg-primary-subtle text-primary py-0 px-2" style="font-size: 0.65rem; font-weight: 600;">${b.teacher_level || 'Gold'} Mentor</span></div>
                       </div>
                     </div>
                     <p class="mb-2 text-secondary" style="font-size: 0.78rem; line-height: 1.5;">
                       <strong style="color: var(--text-primary) !important;">Bio:</strong> ${b.teacher_bio || 'A verified expert educator committed to helping students achieve conceptual clarity and academic excellence.'}
                     </p>
                     <div class="d-flex flex-wrap gap-2 mt-2">
                       <span class="badge bg-dark-subtle text-secondary border px-2 py-1" style="font-size: 0.65rem; font-weight: 500; border-color: rgba(255, 255, 255, 0.08) !important;">
                         <i class="fas fa-graduation-cap text-primary me-1"></i>${b.teacher_qualification || 'Verified Mentor'}
                       </span>
                       <span class="badge bg-dark-subtle text-secondary border px-2 py-1" style="font-size: 0.65rem; font-weight: 500; border-color: rgba(255, 255, 255, 0.08) !important;">
                         <i class="fas fa-briefcase text-primary me-1"></i>${b.teacher_experience || 5}+ Yrs Exp
                       </span>
                       <span class="badge bg-dark-subtle text-secondary border px-2 py-1" style="font-size: 0.65rem; font-weight: 500; border-color: rgba(255, 255, 255, 0.08) !important;">
                         <i class="fas fa-book text-primary me-1"></i>${b.teacher_expertise || 'General'} Expert
                       </span>
                     </div>
                  </div>
                  
                  <div class="mt-2">${btnHtml}</div>
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
      <div class="row g-4">
        ${batches.map(b => `
          <div class="col-md-6 d-flex align-items-stretch">
            <div class="spx-card w-100 d-flex flex-column justify-content-between">
              <div class="d-flex align-items-start gap-3 mb-3">
                <div style="width:50px;height:50px;border-radius:12px;background:var(--gradient);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0">📚</div>
                <div>
                  <div class="fw-bold text-white mb-1" style="font-size: 1rem;">${b.course_title||b.batch_name}</div>
                  <div class="text-primary fw-semibold small mb-2"><i class="fas fa-tags me-1" style="font-size:0.7rem;"></i>${b.batch_name}</div>
                  <div class="d-flex flex-column gap-2 text-muted" style="font-size: 0.78rem;">
                    <span><i class="fas fa-user me-2 text-primary" style="width: 14px;"></i>${b.teacher_name||'—'}</span>
                    <span><i class="fas fa-calendar me-2 text-primary" style="width: 14px;"></i>${(b.days_of_week||[]).join(', ')}</span>
                    <span><i class="fas fa-clock me-2 text-primary" style="width: 14px;"></i>${b.start_time ? formatTime(b.start_time) : '—'}</span>
                  </div>
                </div>
              </div>
              <div class="mt-auto pt-2">
                <button class="btn btn-sm btn-spx w-100" onclick="viewBatchDetails('${b.id}')"><i class="fas fa-eye me-1"></i> View Batch Details</button>
              </div>
            </div>
          </div>`).join('') || '<div class="col-12 text-center text-muted py-5">No batches enrolled. <a onclick="navigateTo(\'courses\')" style="cursor:pointer;color:var(--primary)">Browse Courses</a></div>'}
      </div>`;
  } catch(e) { document.getElementById('pageContent').innerHTML = `<div class="alert alert-danger">${e.message}</div>`; }
}

async function renderUpcomingClasses() {
  loading();
  try {
    const batches = await api('/student/my-batches');
    const allLiveClassesPromises = batches.map(async b => {
      try {
        const list = await api(`/student/batches/${b.id}/live-classes`);
        return list.map(c => ({
          ...c,
          batchId: b.id,
          courseName: b.course_title || 'General Course',
          batchName: b.batch_name,
          teacherName: c.teacher_name || b.teacher_name || 'Expert Educator'
        }));
      } catch (err) {
        console.error(`Error loading classes for batch ${b.id}:`, err);
        return [];
      }
    });

    const results = await Promise.all(allLiveClassesPromises);
    const upcoming = results.flat().filter(c => c.status === 'scheduled' || c.status === 'live');

    // Sort by scheduled date and time
    upcoming.sort((a, b) => {
      const getSafeDate = (c) => {
        if (!c.class_date) return new Date(0);
        const dateStr = typeof c.class_date === 'string' ? c.class_date.split('T')[0] : new Date(c.class_date).toISOString().split('T')[0];
        const timeStr = c.class_time || '00:00:00';
        return new Date(`${dateStr}T${timeStr}`);
      };
      return getSafeDate(a) - getSafeDate(b);
    });

    document.getElementById('pageContent').innerHTML = `
      <div class="row g-4">
        ${upcoming.map(c => {
          let badgeHtml = '';
          let actionBtnHtml = '';
          if (c.status === 'live') {
            badgeHtml = `<span class="badge bg-danger text-white border-0 fw-semibold px-2.5 py-1 pulse-dot">LIVE</span>`;
            actionBtnHtml = `<a href="/live/room.html?classId=${c.id}&role=student" class="btn btn-sm btn-danger px-3 py-2 text-white fw-bold pulse-animation"><i class="fas fa-video me-1"></i> Join Live</a>`;
          } else {
            badgeHtml = `<span class="badge bg-primary-subtle text-primary px-2.5 py-1" style="font-size: 0.7rem; border: 1px solid currentColor;">Scheduled</span>`;
            actionBtnHtml = `<a href="/live/room.html?classId=${c.id}&role=student" class="btn btn-sm btn-outline-primary px-3 py-2 fw-bold"><i class="fas fa-video me-1"></i> Join Room</a>`;
          }

          return `
            <div class="col-md-6 col-lg-4 d-flex align-items-stretch">
              <div class="spx-card w-100 d-flex flex-column justify-content-between">
                <div>
                  <div class="d-flex justify-content-between align-items-start mb-3">
                    <span class="badge bg-primary-subtle text-primary px-2.5 py-1" style="font-size: 0.7rem; border: 1px solid currentColor;">
                      <i class="fas fa-calendar-alt me-1"></i>Upcoming Class
                    </span>
                    ${badgeHtml}
                  </div>
                  <h6 class="fw-bold text-dark mb-2" style="font-size: 1rem;">${c.title || 'Untitled Lecture'}</h6>
                  <div class="mb-3 d-flex flex-wrap gap-2">
                    <span class="badge text-start" style="font-size: 0.7rem; border-radius: 6px; background-color: rgba(60, 189, 176, 0.1) !important; color: #3CBDB0 !important; border: 1px solid rgba(60, 189, 176, 0.3) !important; padding: 5px 10px; font-weight: 600; white-space: normal; line-height: 1.3;">
                      <i class="fas fa-graduation-cap me-1"></i>Course Name: ${c.courseName}
                    </span>
                    <span class="badge text-start" style="font-size: 0.7rem; border-radius: 6px; background-color: rgba(168, 85, 247, 0.1) !important; color: #a855f7; border: 1px solid rgba(168, 85, 247, 0.3) !important; padding: 5px 10px; font-weight: 600; white-space: normal; line-height: 1.3;">
                      <i class="fas fa-users me-1"></i>Batch Name: ${c.batchName}
                    </span>
                  </div>
                  <div class="d-flex flex-column gap-2 text-muted mb-4" style="font-size: 0.78rem;">
                    <span><i class="fas fa-chalkboard-teacher me-2 text-primary" style="width: 14px;"></i>Teacher Name: <strong class="text-dark" style="color: var(--text-primary) !important;">${c.teacherName}</strong></span>
                    <span><i class="far fa-calendar-alt me-2 text-primary" style="width: 14px;"></i>Date: ${fmtDate(c.class_date)}</span>
                    <span><i class="far fa-clock me-2 text-primary" style="width: 14px;"></i>Time: ${formatTime(c.class_time)}</span>
                  </div>
                </div>
                <div class="mt-auto pt-2">
                  ${actionBtnHtml}
                </div>
              </div>
            </div>
          `;
        }).join('') || `<div class="col-12 text-center text-muted py-5"><i class="fas fa-calendar-times mb-3 d-block text-primary" style="font-size: 2.5rem;"></i>No upcoming classes scheduled.</div>`}
      </div>
    `;
  } catch(e) {
    document.getElementById('pageContent').innerHTML = `<div class="alert alert-danger">${e.message}</div>`;
  }
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
          <thead><tr><th>Date</th><th>Class</th><th>Batch</th><th>Status</th><th><i class="fas fa-sign-in-alt me-1 text-primary"></i>Join Time</th><th><i class="fas fa-sign-out-alt me-1 text-danger"></i>Exit Time</th><th>Duration</th></tr></thead>
          <tbody>
            ${records.map(r => `
              <tr>
                <td>${fmtDate(r.attendance_date)}</td>
                <td class="text-white">${r.class_title||'—'}</td>
                <td>${r.batch_name||'—'}</td>
                <td><span class="badge-${r.status||'absent'}">${r.status||'absent'}</span></td>
                <td style="white-space:nowrap; color: #10B981; font-weight: 500;">${r.join_time ? fmtDateTime(r.join_time) : '<span class="text-muted small">—</span>'}</td>
                <td style="white-space:nowrap; color: #EF4444; font-weight: 500;">${r.exit_time ? fmtDateTime(r.exit_time) : '<span class="text-muted small">—</span>'}</td>
                <td>${r.duration_mins ? `<span class="badge" style="background:rgba(60,189,176,.12);color:#3CBDB0;border:1px solid rgba(60,189,176,.3);font-size:0.72rem;">${r.duration_mins} min</span>` : '<span class="text-muted small">—</span>'}</td>
              </tr>`).join('') || '<tr><td colspan="7" class="text-center text-muted py-3">No attendance records</td></tr>'}
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
                  <div class="text-muted small mb-2">${a.batch_name||'—'} • Due: ${fmtDate(a.due_date)} • Max Marks: ${a.max_marks || 100}</div>
                  <div class="text-muted small mb-2">${formatCollapsibleText(a.description, 100)}</div>
                  ${a.file_url ? `
                    <div class="mb-2">
                      <a href="${a.file_url}" target="_blank" class="btn btn-sm btn-outline-primary py-1 px-3 fw-bold" style="font-size:0.75rem; border-radius:6px;">
                        <i class="fas fa-paperclip me-1"></i>View Teacher Attachment
                      </a>
                    </div>
                  ` : ''}
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
                <div style="width:70px;height:45px;border-radius:8px;background:${r.thumbnail_url ? `url(${r.thumbnail_url}) center/cover no-repeat` : 'rgba(60,189,176,.2)'};display:flex;align-items:center;justify-content:center;color:#3CBDB0;font-size:18px;flex-shrink:0;border:1px solid var(--border)">
                  ${r.thumbnail_url ? '' : '<i class="fas fa-play-circle"></i>'}
                </div>
                <div class="flex-grow-1">
                  <div class="fw-bold text-dark">${r.title||r.class_title||'Recording'}</div>
                  <div class="text-muted small">${r.batch_name||'—'} • ${fmtDate(r.recorded_at||r.class_date)} • ${r.duration_mins||0} min</div>
                </div>
                <button onclick="playBatchDemoVideo('${r.recording_url}', '${r.title || r.class_title || 'Lecture Recording'}')" class="btn btn-sm btn-spx">Watch</button>
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
                  <div class="fw-bold text-dark">${r.batch_name||'—'}</div>
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
let currentNotificationLimit = 10;
let cachedNotifications = [];

async function renderNotifications() {
  loading();
  try {
    const notifs = await api('/student/notifications');
    cachedNotifications = notifs;
    currentNotificationLimit = 10; // reset limit
    displayNotificationsList();
  } catch(e) {
    document.getElementById('pageContent').innerHTML = `<div class="alert alert-danger">${e.message}</div>`;
  }
}

function displayNotificationsList() {
  const notifs = cachedNotifications;
  const totalCount = notifs.length;
  const visibleNotifs = notifs.slice(0, currentNotificationLimit);
  
  const notifsHtml = visibleNotifs.map(n => `
    <div class="p-3 mb-2 rounded-3" style="background:var(--bg-dark);border:1px solid var(--border)">
      <div class="d-flex align-items-start justify-content-between gap-3">
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
        <button onclick="deleteNotification('${n.id}')" class="btn btn-sm btn-outline-danger border-0 px-2 py-1" title="Delete Notification" style="font-size: 0.8rem;">
          <i class="fas fa-trash-alt"></i>
        </button>
      </div>
    </div>
  `).join('');

  const viewMoreBtn = (totalCount > currentNotificationLimit) 
    ? `<div class="text-center mt-3">
        <button onclick="loadMoreNotifications()" class="btn btn-sm btn-outline-primary px-4 py-2 fw-semibold">
          <i class="fas fa-arrow-down me-1"></i> View More
        </button>
       </div>`
    : '';

  document.getElementById('pageContent').innerHTML = `
    <div class="spx-card">
      <div class="d-flex align-items-center justify-content-between mb-4">
        <h6 class="mb-0 fw-bold">Notifications (Total: ${totalCount})</h6>
      </div>
      <div id="notificationsItemsContainer">
        ${notifsHtml || '<p class="text-muted text-center py-4">No notifications</p>'}
      </div>
      ${viewMoreBtn}
    </div>
  `;
}

function loadMoreNotifications() {
  currentNotificationLimit += 10;
  displayNotificationsList();
}

async function deleteNotification(id) {
  if (!confirm('Are you sure you want to delete this notification?')) return;
  try {
    await api(`/student/notifications/${id}`, { method: 'DELETE' });
    showToast('Notification deleted successfully');
    cachedNotifications = cachedNotifications.filter(n => n.id !== id);
    displayNotificationsList();
  } catch(e) {
    showToast(e.message, 'error');
  }
}

// ── Profile ────────────────────────────────────────────────────
async function renderProfile() {
  loading();
  try {
    const profile = await api('/auth/profile');
    document.getElementById('pageContent').innerHTML = `
      <div class="row g-4">
        <!-- Student Info Sidebar Card -->
        <div class="col-lg-4">
          <div class="spx-card text-center position-relative overflow-hidden" style="border:1px solid rgba(60,189,176,0.2); background: radial-gradient(circle at top left, var(--bg-card), var(--bg-dark-alt));">
            <!-- Top Gradient Accent -->
            <div style="position:absolute; top:0; left:0; right:0; height:6px; background:var(--gradient);"></div>
            
            <div class="position-relative d-inline-block mt-3">
              <div class="profile-avatar-wrapper" onclick="document.getElementById('studentAvatarInput').click()">
                <img src="${profile.photo_url||defaultAvatar}" style="width:100px;height:100px;border-radius:50%;border:4px solid rgba(60,189,176,0.25);box-shadow: 0 8px 20px rgba(0,0,0,0.15); object-fit: cover;" alt="Student Avatar" onerror="this.src=defaultAvatar">
                <div class="profile-avatar-overlay">
                  <i class="fas fa-camera"></i>
                </div>
              </div>
              <span class="position-absolute bottom-0 end-0 bg-success border border-white rounded-circle" style="width: 14px; height: 14px; border-width: 2px !important; z-index: 2;" title="Active"></span>
              <input type="file" id="studentAvatarInput" accept="image/*" style="display:none;" onchange="uploadStudentAvatar(this)">
            </div>
            
            <h4 class="fw-bold mt-3 mb-1" style="font-family:'Outfit',sans-serif;color:var(--text-primary);">${profile.name}</h4>
            <div class="badge px-3 py-1 mb-3" style="background:rgba(60,189,176,0.1); color:#0F766E; font-size:0.72rem; font-weight:600; border-radius:8px;">
              <i class="fas fa-graduation-cap me-1"></i>Student Portal
            </div>
            
            <!-- Learning Streak Dashboard Feature -->
            <div class="p-3 mb-3 mx-2 text-center rounded-3" style="background: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245, 158, 11, 0.2); display: flex; align-items: center; justify-content: center; gap: 8px;">
              <span style="font-size: 1.4rem;">🔥</span>
              <div class="text-start">
                <div class="fw-bold text-warning" style="font-size: 0.95rem; line-height: 1.2;">${profile.learning_streak || 0} Day Streak</div>
                <div class="text-muted" style="font-size: 0.68rem;">Keep learning to build your streak!</div>
              </div>
            </div>

            <!-- Student Code with Copy Button -->
            <div class="mt-2 mb-3">
              <span class="small text-muted d-block mb-1">Student Unique Code</span>
              <div class="d-inline-flex align-items-center bg-dark-alt px-3 py-2 rounded-3 border" style="background:rgba(255,255,255,0.03);">
                <code style="color:#3CBDB0; font-size:0.9rem; font-weight:600; font-family:monospace; letter-spacing:0.5px;">${profile.student_code||'—'}</code>
                <button class="btn btn-link text-primary p-0 ms-2 lh-1" onclick="navigator.clipboard.writeText('${profile.student_code}'); showToast('Student Code copied to clipboard!')" title="Copy Code" style="border:none;background:transparent;box-shadow:none;">
                  <i class="far fa-copy" style="font-size: 0.85rem;"></i>
                </button>
              </div>
            </div>
            
            <div class="mt-4 text-start border-top pt-3 mx-2" style="font-size:0.85rem; border-color: rgba(255,255,255,0.08) !important;">
              <div class="mb-2 text-secondary"><i class="fas fa-layer-group text-primary me-2" style="width:16px;"></i>Academic Level: <strong style="color:var(--text-primary);">${profile.grade||'—'} (${profile.board||'—'})</strong></div>
              <div class="mb-2 text-secondary"><i class="fas fa-mobile-screen-button text-primary me-2" style="width:16px;"></i>Mobile: <strong style="color:var(--text-primary);">${profile.phone||'—'}</strong> ${profile.phone_verified ? '<span class="badge bg-success ms-1"><i class="fas fa-check-circle me-1"></i>Verified</span>' : '<span class="badge bg-danger ms-1">Unverified</span>'}</div>
              <div class="mb-2 text-secondary"><i class="far fa-envelope text-primary me-2" style="width:16px;"></i>Email: <strong style="color:var(--text-primary);">${profile.email}</strong> ${profile.email_verified ? '<span class="badge bg-success ms-1"><i class="fas fa-check-circle me-1"></i>Verified</span>' : `<span class="badge bg-warning text-dark ms-1"><i class="fas fa-clock me-1"></i>Pending</span> <button class="btn btn-xs btn-outline-warning ms-1 py-0 px-2" style="font-size:0.75rem; border-radius:4px;" onclick="resendProfileEmailLink('${profile.email}')">Resend Link</button>`}</div>
            </div>
          </div>
        </div>
        
        <!-- Forms Card -->
        <div class="col-lg-8">
          <div class="spx-card" style="border:1px solid rgba(60,189,176,0.15);">
            <h5 class="fw-bold mb-4" style="font-family:'Outfit',sans-serif;color:var(--text-primary);"><i class="fas fa-user-edit text-primary me-2"></i>Edit Student Profile</h5>
            <form onsubmit="updateProfile(event)">
              <div class="row g-3">
                <div class="col-md-6">
                  <label class="spx-label mb-1">Full Name</label>
                  <input class="form-control spx-input" id="profName" value="${profile.name||''}" required>
                </div>
                <div class="col-md-6">
                  <label class="spx-label mb-1">Phone</label>
                  <input class="form-control spx-input" id="profPhone" value="${profile.phone||''}" required>
                </div>
                <div class="col-md-6">
                  <label class="spx-label mb-1">Grade / Class</label>
                  <select class="form-select spx-input" id="profGrade">
                    ${['Class 6','Class 7','Class 8','Class 9','Class 10','Class 11','Class 12'].map(g=>`<option ${profile.grade===g?'selected':''}>${g}</option>`).join('')}
                  </select>
                </div>
                <div class="col-md-6">
                  <label class="spx-label mb-1">Syllabus Board</label>
                  <select class="form-select spx-input" id="profBoard">
                    ${['CBSE','ICSE','State Board'].map(b=>`<option ${profile.board===b?'selected':''}>${b}</option>`).join('')}
                  </select>
                </div>
                <div class="col-12 mt-4">
                  <button type="submit" class="btn btn-spx px-4 py-2 fw-semibold"><i class="fas fa-save me-1"></i> Save Changes</button>
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

            <hr class="my-4" style="border-color: rgba(255,255,255,0.08);">

            <h5 class="fw-bold mb-3" style="font-family:'Outfit',sans-serif;color:var(--text-primary);"><i class="fas fa-gavel text-primary me-2"></i>Student Guidelines & Code of Conduct</h5>
            <p class="text-muted small mb-3">Official guidelines for live classroom participation, examination integrity, and platform usage.</p>
            <div class="list-group gap-2">
              <a href="/policies/community-guidelines-code-of-conduct-digital-classroom-behaviour-policy.html" target="_blank" class="list-group-item list-group-item-action d-flex align-items-center justify-content-between p-3 rounded-3 border">
                <div>
                  <div class="fw-bold text-dark small"><i class="fas fa-users-slash text-teal me-2"></i>Community Guidelines & Digital Classroom Behavior Policy</div>
                  <div class="text-muted small" style="font-size:0.72rem;">Live class chat decorum, respect for teachers & peer interaction rules</div>
                </div>
                <i class="fas fa-external-link-alt text-muted small"></i>
              </a>

              <a href="/policies/live-class-recording-digital-consent-online-examination-policy.html" target="_blank" class="list-group-item list-group-item-action d-flex align-items-center justify-content-between p-3 rounded-3 border">
                <div>
                  <div class="fw-bold text-dark small"><i class="fas fa-video text-warning me-2"></i>Live Class Recording & Online Examination Policy</div>
                  <div class="text-muted small" style="font-size:0.72rem;">Classroom session recordings, exam proctoring & digital consent</div>
                </div>
                <i class="fas fa-external-link-alt text-muted small"></i>
              </a>

              <a href="/policies/artificial-intelligence-ai-academic-integrity-responsible-technology-policy.html" target="_blank" class="list-group-item list-group-item-action d-flex align-items-center justify-content-between p-3 rounded-3 border">
                <div>
                  <div class="fw-bold text-dark small"><i class="fas fa-robot text-primary me-2"></i>AI, Academic Integrity & Responsible Technology Policy</div>
                  <div class="text-muted small" style="font-size:0.72rem;">Academic honesty, original submission rules & AI assistance guidelines</div>
                </div>
                <i class="fas fa-external-link-alt text-muted small"></i>
              </a>
            </div>
          </div>
        </div>
      </div>`;
      setupAutoSave('autosave_student_profile', ['profName', 'profPhone', 'profGrade', 'profBoard']);
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
    clearAutoSave('autosave_student_profile');
    showToast('Profile updated');
    updateCachedUser(data.user);
    if (user) {
      document.getElementById('nameSidebar').textContent = user.name;
      const av = user.photo_url || defaultAvatar;
      document.getElementById('avatarSidebar').src = av;
      document.getElementById('avatarHeader').src = av;
    }
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
                          <span class="text-success small fw-semibold"><i class="fas fa-lock me-1"></i>Permanent Access</span>
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

function formatTime(timeStr) {
  if (!timeStr) return '';
  const [hours, minutes] = timeStr.split(':');
  const hrs = parseInt(hours);
  const ampm = hrs >= 12 ? 'PM' : 'AM';
  const displayHrs = hrs % 12 || 12;
  return `${displayHrs}:${minutes} ${ampm}`;
}

// ── Batch Details & Materials ──────────────────────────────────
window.filterLiveClasses = function(status) {
  // Update active class on filter buttons
  const buttons = document.querySelectorAll('.btn-filter');
  buttons.forEach(btn => {
    if (btn.getAttribute('onclick').includes(`'${status}'`)) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  const cards = document.querySelectorAll('.live-class-card');
  let visibleCount = 0;
  cards.forEach(card => {
    if (status === 'all' || card.getAttribute('data-status') === status) {
      card.classList.remove('d-none');
      visibleCount++;
    } else {
      card.classList.add('d-none');
    }
  });

  const emptyEl = document.getElementById('noClassesMessage');
  if (emptyEl) {
    if (visibleCount === 0) {
      emptyEl.classList.remove('d-none');
    } else {
      emptyEl.classList.add('d-none');
    }
  }
};

async function openMyBatchDetailsModal(batchId) {
  try {
    const myBatches = await api('/student/my-batches');
    const batch = myBatches.find(b => b.id === batchId);
    if (!batch) {
      showToast('Batch details not found', 'error');
      return;
    }

    const [notes, modules, liveClasses] = await Promise.all([
      api(`/student/batches/${batchId}/notes`),
      api(`/courses/${batch.course_id}/modules`),
      api(`/student/batches/${batchId}/live-classes`)
    ]);

    const titleEl = document.getElementById('batchDetailsTitle');
    const bodyEl = document.getElementById('batchDetailsBody');

    titleEl.textContent = `${batch.course_title || batch.batch_name} — Details`;

    let demoVideoRowHtml = '';
    if (batch.demo_video_url) {
      demoVideoRowHtml = `
        <div class="col-12 mt-2 pt-2 border-top" style="border-color: rgba(255,255,255,0.08) !important;">
          <button class="btn btn-sm btn-outline-warning fw-bold px-3 py-1.5" onclick="playBatchDemoVideo('${batch.demo_video_url}', '${(batch.batch_name || batch.course_title).replace(/'/g, "\\'")}', event)" style="font-size: 0.72rem;">
            <i class="fas fa-play-circle me-1"></i>Watch Batch Demo Video
          </button>
        </div>
      `;
    }

    const hasModules = modules && modules.length > 0;
    const hasNotes = notes && notes.length > 0;
    const hasMaterialsTab = hasModules || hasNotes;

    let modulesColHtml = '';
    let notesColHtml = '';
    if (hasMaterialsTab) {
      const colClass = (hasModules && hasNotes) ? 'col-md-6' : 'col-12';
      
      if (hasModules) {
        modulesColHtml = `
          <div class="${colClass}">
            <h6 class="fw-bold mb-3" style="color:var(--text-primary);"><i class="fas fa-book-open me-2 text-primary"></i>Course Syllabus & Sections</h6>
            <div class="d-flex flex-column gap-2 mb-3" style="max-height: 280px; overflow-y: auto; padding-right: 4px;">
              ${modules.map((m, idx) => `
                <div class="p-2 rounded-3" style="background:rgba(255,255,255,0.01); border:1px solid var(--border);">
                  <div class="fw-bold text-dark" style="font-size:0.75rem;">${idx + 1}. ${m.title}</div>
                  <div class="text-muted" style="font-size:0.7rem;">${formatCollapsibleText(m.description, 100) || ''}</div>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }

      if (hasNotes) {
        const borderStyle = (hasModules && hasNotes) ? 'border-left: 1px solid var(--border);' : '';
        notesColHtml = `
          <div class="${colClass}" style="${borderStyle}">
            <h6 class="fw-bold mb-3" style="color:var(--text-primary);"><i class="fas fa-file-alt me-2 text-primary"></i>Study Materials & Notes</h6>
            <div class="d-flex flex-column gap-3" style="max-height: 280px; overflow-y: auto; padding-right: 4px;">
              ${notes.map(n => `
                <div class="p-3 rounded-3" style="background:rgba(255,255,255,0.01); border:1px solid var(--border);">
                  <div class="d-flex justify-content-between align-items-start mb-2">
                    <div>
                      <h6 class="fw-bold text-dark small mb-1">${n.title}</h6>
                      <div class="text-muted" style="font-size: 0.7rem;">${formatCollapsibleText(n.description, 100) || ''}</div>
                    </div>
                    <span class="badge bg-secondary-subtle text-secondary px-2 py-1" style="font-size: 0.65rem; border: 1px solid currentColor;">
                      ${(n.file_type || 'link').toUpperCase()}
                    </span>
                  </div>
                  <div class="d-flex justify-content-between align-items-center mt-3">
                    <span class="text-muted" style="font-size: 0.65rem;">Uploaded: ${fmtDate(n.uploaded_at)}</span>
                    <a href="${n.file_url}" target="_blank" class="btn btn-sm btn-spx py-1 px-3" style="font-size: 0.75rem;">
                      <i class="fas fa-download me-1"></i> Access
                    </a>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }
    }

    bodyEl.innerHTML = `
      <!-- Batch Summary Information -->
      <div class="p-3 rounded-3 mb-4" style="background:var(--bg-card); border:1px solid var(--border);">
        <div class="row g-3">
          <div class="col-sm-4">
            <small class="text-muted d-block" style="font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.5px;">Mentor</small>
            <strong class="text-white small">${batch.teacher_name || 'Expert Teacher'}</strong>
          </div>
          <div class="col-sm-4">
            <small class="text-muted d-block" style="font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.5px;">Days & Schedule</small>
            <strong class="text-white small">${(batch.days_of_week || []).join(', ')}</strong>
          </div>
          <div class="col-sm-4">
            <small class="text-muted d-block" style="font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.5px;">Time Slot</small>
            <strong class="text-white small">${batch.start_time ? formatTime(batch.start_time) : ''} - ${batch.end_time ? formatTime(batch.end_time) : ''}</strong>
          </div>
          ${demoVideoRowHtml}
        </div>
      </div>

      <!-- Tab Navigation -->
      <ul class="nav nav-tabs spx-nav-tabs mb-4" id="batchDetailsTabs" role="tablist">
        <li class="nav-item" role="presentation">
          <button class="nav-link active" id="live-tab" data-bs-toggle="tab" data-bs-target="#live-panel" type="button" role="tab" aria-controls="live-panel" aria-selected="true">
            <i class="fas fa-video me-2"></i>Live Classes Schedule
          </button>
        </li>
        ${hasMaterialsTab ? `
          <li class="nav-item" role="presentation">
            <button class="nav-link" id="materials-tab" data-bs-toggle="tab" data-bs-target="#materials-panel" type="button" role="tab" aria-controls="materials-panel" aria-selected="false">
              <i class="fas fa-book-open me-2"></i>Syllabus & Materials
            </button>
          </li>
        ` : ''}
      </ul>

      <!-- Tab Panels -->
      <div class="tab-content" id="batchDetailsTabContent">
        <!-- Panel 1: Live Classes -->
        <div class="tab-pane fade show active" id="live-panel" role="tabpanel" aria-labelledby="live-tab">
          <!-- Filter Buttons -->
          <div class="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
            <h6 class="fw-bold mb-0" style="color:var(--text-primary);"><i class="fas fa-calendar-alt me-2 text-primary"></i>Live Sessions</h6>
            <div class="d-flex gap-2">
              <button class="btn btn-sm btn-outline-primary btn-filter active" onclick="filterLiveClasses('all')">All</button>
              <button class="btn btn-sm btn-outline-danger btn-filter" onclick="filterLiveClasses('live')">Live</button>
              <button class="btn btn-sm btn-outline-primary btn-filter" onclick="filterLiveClasses('scheduled')">Upcoming</button>
              <button class="btn btn-sm btn-outline-secondary btn-filter" onclick="filterLiveClasses('ended')">Completed</button>
            </div>
          </div>

          <!-- Schedule List -->
          <div class="d-flex flex-column gap-2" style="max-height: 280px; overflow-y: auto; padding-right: 4px;">
            ${liveClasses.length ? liveClasses.map(c => {
              let badgeHtml = '';
              let actionBtnHtml = '';
              if (c.status === 'live') {
                badgeHtml = `<span class="badge bg-danger text-white border-0 fw-semibold px-2 py-1 pulse-dot">LIVE</span>`;
                actionBtnHtml = `<a href="/live/room.html?classId=${c.id}&role=student" class="btn btn-sm btn-danger px-3 py-1 text-white fw-bold pulse-animation" style="font-size: 0.75rem;"><i class="fas fa-video me-1"></i> Join Live</a>`;
              } else if (c.status === 'scheduled') {
                badgeHtml = `<span class="badge bg-primary-subtle text-primary px-2 py-1" style="font-size: 0.65rem; border: 1px solid currentColor;">Scheduled</span>`;
                actionBtnHtml = `<a href="/live/room.html?classId=${c.id}&role=student" class="btn btn-sm btn-outline-primary px-3 py-1 fw-bold" style="font-size: 0.75rem;"><i class="fas fa-video me-1"></i> Join Room</a>`;
              } else {
                badgeHtml = `<span class="badge bg-secondary-subtle text-secondary px-2 py-1" style="font-size: 0.65rem; border: 1px solid currentColor;">Completed</span>`;
                actionBtnHtml = `<span class="text-muted small">Ended</span>`;
              }

              return `
                <div class="live-class-card p-3 rounded-3" data-status="${c.status}" style="background:rgba(255,255,255,0.01); border:1px solid var(--border);">
                  <div class="d-flex justify-content-between align-items-start mb-2">
                    <div>
                      <div class="fw-bold text-dark small mb-1">${c.title || 'Untitled Session'}</div>
                      <div class="mb-2 d-flex flex-wrap gap-2">
                        <span class="badge" style="font-size: 0.65rem; border-radius: 4px; background-color: rgba(60, 189, 176, 0.1) !important; color: #3CBDB0 !important; border: 1px solid rgba(60, 189, 176, 0.3) !important; padding: 3px 6px; font-weight: 600;">
                          <i class="fas fa-graduation-cap me-1"></i>Course Name: ${batch.course_title || 'General Course'}
                        </span>
                        <span class="badge" style="font-size: 0.65rem; border-radius: 4px; background-color: rgba(168, 85, 247, 0.1) !important; color: #a855f7; border: 1px solid rgba(168, 85, 247, 0.3) !important; padding: 3px 6px; font-weight: 600;">
                          <i class="fas fa-users me-1"></i>Batch Name: ${batch.batch_name}
                        </span>
                      </div>
                      <div class="text-muted" style="font-size: 0.75rem;">
                        <i class="far fa-calendar-alt me-1"></i>${fmtDate(c.class_date)} &nbsp;
                        <i class="far fa-clock me-1"></i>${formatTime(c.class_time)}
                      </div>
                      <div class="text-muted mt-1" style="font-size: 0.75rem;">
                        <i class="fas fa-user-chalkboard me-1 text-primary"></i>Teacher Name: <strong class="text-dark" style="color: var(--text-primary) !important;">${c.teacher_name || batch.teacher_name || 'Expert Educator'}</strong>
                      </div>
                    </div>
                    ${badgeHtml}
                  </div>
                  <div class="d-flex justify-content-end align-items-center mt-2">
                    ${actionBtnHtml}
                  </div>
                </div>
              `;
            }).join('') : ''}
            
            <p class="text-muted small text-center py-4 ${liveClasses.length ? 'd-none' : ''}" id="noClassesMessage">
              No live classes matching this filter.
            </p>
          </div>
        </div>

        ${hasMaterialsTab ? `
          <!-- Panel 2: Syllabus & Materials -->
          <div class="tab-pane fade" id="materials-panel" role="tabpanel" aria-labelledby="materials-tab">
            <div class="row g-4">
              ${modulesColHtml}
              ${notesColHtml}
            </div>
          </div>
        ` : ''}
      </div>
    `;

    const modal = new bootstrap.Modal(document.getElementById('batchDetailsModal'));
    modal.show();
  } catch(e) {
    showToast(e.message, 'error');
  }
}


// ── Init ──────────────────────────────────────────────────────
async function initApp() {
  if (token) {
    try {
      const profile = await api('/auth/profile');
      if (profile.role === 'student') {
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
    document.getElementById('studentApp').classList.add('d-none');
    if (window.location.hash === '#register') {
      switchTab('register');
    }
  }
}

async function uploadStudentAvatar(input) {
  const file = input.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append('avatar', file);

  try {
    showToast('Uploading profile photo...', 'info');
    const res = await fetch(`${API}/auth/upload-avatar`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData,
    });
    const data = await res.json();
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

initApp();

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

async function joinLiveClass(batchId) {
  try {
    const activeClasses = await api('/live-classes/active');
    const classForBatch = activeClasses.find(c => c.batch_id === batchId);
    if (!classForBatch) {
      showToast('No active live class for this batch at the moment.', 'warning');
      return;
    }
    window.location.href = `/live/room.html?classId=${classForBatch.id}&role=student`;
  } catch (err) {
    showToast('Failed to check active classes: ' + err.message, 'error');
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
  setupAutoSave('autosave_student_register', [
    'regName', 'regEmail', 'regPhone', 'regPassword', 'regGrade', 'regBoard', 'regReferralCode'
  ]);
  
  // Clear invalid validation markings dynamically on typing
  document.addEventListener('input', (e) => {
    if (e.target && e.target.classList.contains('is-invalid')) {
      e.target.classList.remove('is-invalid', 'border-danger');
    }
  });
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
