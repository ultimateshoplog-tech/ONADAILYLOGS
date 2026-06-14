// ─── Config ───────────────────────────────────────────────────────────────────
// API_BASE is set by config.js (__API_BASE__) or nav.js (API_BASE).
const API_BASE = window.__API_BASE__ || window.API_BASE || 'http://localhost:5000/api';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function showError(msg) {
  let el = document.getElementById('auth-error');
  if (!el) {
    el = document.createElement('div');
    el.id = 'auth-error';
    el.style.cssText = `
      background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca;
      border-radius: 8px; padding: 0.75rem 1rem; margin-bottom: 1rem;
      font-size: 0.9rem; font-weight: 500;
    `;
    const form = document.querySelector('form');
    if (form) form.insertAdjacentElement('beforebegin', el);
  }
  el.textContent = msg;
  el.style.display = 'block';
}

function clearError() {
  const el = document.getElementById('auth-error');
  if (el) el.style.display = 'none';
}

function setLoading(btn, loading) {
  btn.disabled = loading;
  btn.textContent = loading ? 'Please wait…' : btn.dataset.label;
}

// ─── Login ────────────────────────────────────────────────────────────────────
const loginForm = document.getElementById('login-form');
if (loginForm) {
  const submitBtn = loginForm.querySelector('button[type="submit"]');
  submitBtn.dataset.label = submitBtn.textContent;

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearError();
    setLoading(submitBtn, true);

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    try {
      const res  = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        showError(data.message || 'Login failed. Please try again.');
        return;
      }

      // Save token & user info
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      // Redirect based on role
      const isAdminArea = window.location.pathname.includes('/admin/');
      
      if (data.user.role === 'admin') {
        window.location.href = isAdminArea ? 'index.html' : 'admin/index.html';
      } else {
        window.location.href = isAdminArea ? '../dashboard.html' : 'dashboard.html';
      }
    } catch (err) {
      showError('Cannot connect to server. Make sure the backend is running.');
    } finally {
      setLoading(submitBtn, false);
    }
  });
}

// ─── Register ─────────────────────────────────────────────────────────────────
const registerForm = document.getElementById('register-form');
if (registerForm) {
  const submitBtn = registerForm.querySelector('button[type="submit"]');
  submitBtn.dataset.label = submitBtn.textContent;

  // Real-time email validation
  const emailInput = document.getElementById('email');
  const emailFeedback = document.getElementById('email-feedback');
  const emailStatus = document.getElementById('email-check-status');

  const disposableDomains = [
    'yopmail.com', 'mailinator.com', 'tempmail.com', 'guerrillamail.com', 
    'sharklasers.com', 'dispostable.com', 'getairmail.com', 'maildrop.cc', 
    'temp-mail.org', 'throwawaymail.com', '10minutemail.com', 'crazymailing.com', 
    'trashmail.com', 'generator.email'
  ];

  let isEmailValid = false;

  if (emailInput && emailFeedback && emailStatus) {
    emailInput.addEventListener('input', () => {
      const email = emailInput.value.trim();
      if (!email) {
        emailFeedback.style.display = 'none';
        emailStatus.style.display = 'none';
        isEmailValid = false;
        return;
      }

      // Syntax check
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        emailFeedback.style.display = 'block';
        emailFeedback.style.color = '#ef4444';
        emailFeedback.textContent = 'Please enter a valid email address.';
        emailStatus.style.display = 'block';
        emailStatus.textContent = '❌';
        isEmailValid = false;
        return;
      }

      // Disposable check
      const domain = email.split('@')[1]?.toLowerCase();
      if (disposableDomains.includes(domain)) {
        emailFeedback.style.display = 'block';
        emailFeedback.style.color = '#ef4444';
        emailFeedback.textContent = 'Disposable or temporary emails are not allowed.';
        emailStatus.style.display = 'block';
        emailStatus.textContent = '❌';
        isEmailValid = false;
        return;
      }

      // Valid syntax & domain
      emailFeedback.style.display = 'block';
      emailFeedback.style.color = '#16a34a';
      emailFeedback.textContent = 'Email address format looks good.';
      emailStatus.style.display = 'block';
      emailStatus.textContent = '✅';
      isEmailValid = true;
    });
  }

  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearError();

    const username        = document.getElementById('username').value.trim();
    const email           = document.getElementById('email').value.trim();
    const password        = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    if (emailInput && emailFeedback && !isEmailValid) {
      showError('Please provide a valid, non-disposable email address.');
      return;
    }

    if (password !== confirmPassword) {
      showError('Passwords do not match.');
      return;
    }

    setLoading(submitBtn, true);

    try {
      const res  = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        showError(data.message || 'Registration failed. Please try again.');
        return;
      }

      // Save token & user info
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      window.location.href = 'dashboard.html';
    } catch (err) {
      showError('Cannot connect to server. Make sure the backend is running.');
    } finally {
      setLoading(submitBtn, false);
    }
  });
}

// --- Forgot Password ----------------------------------------------------------
const forgotPasswordForm = document.getElementById('forgot-password-form');
if (forgotPasswordForm) {
  const submitBtn = forgotPasswordForm.querySelector('button[type="submit"]');
  submitBtn.dataset.label = submitBtn.textContent;

  forgotPasswordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearError();

    const email = document.getElementById('email').value.trim();
    if (!email) {
      showError('Please enter your email address.');
      return;
    }

    setLoading(submitBtn, true);
    try {
      const res  = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.success) {
        if (typeof toast !== 'undefined') {
          toast('If that email exists, a reset link has been sent. Check your inbox (or ask your admin).', 'success');
        }
        setTimeout(() => { window.location.href = 'login.html'; }, 3500);
      } else {
        showError(data.message || 'Something went wrong. Please try again.');
      }
    } catch {
      showError('Cannot connect to server. Please try again.');
    } finally {
      setLoading(submitBtn, false);
    }
  });
}


