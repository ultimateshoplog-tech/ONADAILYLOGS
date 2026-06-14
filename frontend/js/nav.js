/**
 * nav.js — Universal navigation & auth guard
 * Add to every non-admin HTML page.
 * Body attributes:
 *   data-require-auth="true"   → redirect to login if not logged in
 *   data-redirect-auth="page"  → redirect to page if already logged in
 */

// Set API_BASE as window property so other scripts share it without redeclaring.
// The actual URL is defined in js/config.js — change it there for production.
window.API_BASE = window.__API_BASE__ || 'http://localhost:5000/api';

// ── Auto-clear expired JWT tokens ─────────────────────────────────────────────
(function clearExpiredToken() {
  const token = localStorage.getItem('token');
  if (!token) return;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.exp && Date.now() / 1000 > payload.exp) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('daily_logs_cart');
    }
  } catch {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }
})();



(function () {
  function getCartCount() {
    try { return JSON.parse(localStorage.getItem('daily_logs_cart') || '[]').length; }
    catch { return 0; }
  }

  // ── Inject styles for dropdown ───────────────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
    .nav-actions { display: flex; align-items: center; gap: 0.85rem; }
    .nav-links   { display: flex; align-items: center; gap: 1.75rem; list-style: none; }
    .nav-links a { font-weight: 600; font-size: 0.9rem; color: var(--text-main); text-decoration: none; transition: color var(--transition-smooth); }
    .nav-links a:hover { color: var(--primary); }

    .nav-store-link {
      font-weight: 600; font-size: 0.88rem; color: var(--text-muted);
      text-decoration: none; transition: all var(--transition-smooth);
      padding: 0.45rem 0.8rem; border-radius: 10px;
    }
    .nav-store-link:hover { color: var(--primary); background: rgba(90, 49, 244, 0.05); }

    .nav-balance {
      display: inline-flex; align-items: center; gap: 0.4rem;
      background: rgba(16, 185, 129, 0.06); border: 1px solid rgba(16, 185, 129, 0.15);
      border-radius: 12px; padding: 0.45rem 0.95rem;
      font-size: 0.85rem; font-weight: 700; color: #10B981;
      text-decoration: none; transition: all var(--transition-smooth);
    }
    .nav-balance:hover { background: rgba(16, 185, 129, 0.12); border-color: rgba(16, 185, 129, 0.3); transform: translateY(-1px); }

    .nav-cart {
      position: relative; display: inline-flex; align-items: center;
      justify-content: center; gap: 0.25rem;
      background: var(--bg-card); border: 1px solid var(--border-soft);
      border-radius: 12px; font-size: 0.88rem; font-weight: 600; text-decoration: none;
      color: var(--text-main);
      transition: all var(--transition-smooth);
      box-shadow: var(--shadow-sm);
      padding: 0.45rem 0.85rem;
    }
    .nav-cart:hover { background: var(--bg-accent); border-color: var(--primary); transform: translateY(-1px); }

    .nav-user { position: relative; }
    .nav-user-btn {
      display: flex; align-items: center; gap: 0.65rem;
      background: var(--bg-card); border: 1px solid var(--border-soft);
      border-radius: 12px; padding: 0.35rem 0.95rem 0.35rem 0.35rem;
      cursor: pointer; font-size: 0.88rem; font-weight: 600;
      color: var(--text-main); transition: all var(--transition-smooth);
      box-shadow: var(--shadow-sm);
    }
    .nav-user-btn:hover { background: var(--bg-accent); border-color: var(--primary); transform: translateY(-1px); }
    .nav-user-avatar {
      width: 30px; height: 30px; border-radius: 50%;
      background: linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%); color: #fff;
      display: flex; align-items: center; justify-content: center;
      font-size: 0.85rem; font-weight: 800; flex-shrink: 0;
      box-shadow: 0 2px 6px rgba(90, 49, 244, 0.2);
    }
    .nav-dropdown {
      position: absolute; top: calc(100% + 8px); right: 0;
      background: var(--bg-card); border: 1px solid var(--border-soft);
      border-radius: 14px; box-shadow: var(--shadow-lg);
      min-width: 200px; overflow: hidden;
      opacity: 0; pointer-events: none; transform: translateY(-6px);
      transition: opacity 0.2s, transform 0.2s; z-index: 999;
    }
    .nav-dropdown.open { opacity: 1; pointer-events: all; transform: translateY(0); }
    .nav-dropdown a {
      display: flex; align-items: center; gap: 0.65rem;
      padding: 0.75rem 1.1rem; font-size: 0.88rem; font-weight: 500;
      color: var(--text-main) !important; text-decoration: none;
      transition: background 0.15s;
    }
    .nav-dropdown a:hover { background: var(--bg-accent); }
    .nav-dropdown-sep { height: 1px; background: var(--border-soft); margin: 0.25rem 0; }
    .nav-dropdown .logout-link { color: #b91c1c !important; }
    .nav-dropdown .logout-link:hover { background: #fef2f2; }

    /* ── Hamburger Button ────────────────────────────────────── */
    #nav-hamburger {
      display: none;
      flex-direction: column; justify-content: center; align-items: center;
      gap: 4px; width: 40px; height: 40px; cursor: pointer;
      background: var(--bg-accent); border: 1px solid var(--border-soft);
      border-radius: 10px; padding: 8px; transition: background 0.2s;
      flex-shrink: 0;
    }
    #nav-hamburger:hover { background: rgba(90, 49, 244, 0.08); border-color: var(--primary); }
    #nav-hamburger .bar {
      display: block; width: 20px; height: 2px;
      background: var(--text-main); border-radius: 2px;
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }
    #nav-hamburger.open .bar:nth-child(1) { transform: translateY(6px) rotate(45deg); }
    #nav-hamburger.open .bar:nth-child(2) { opacity: 0; transform: scaleX(0); }
    #nav-hamburger.open .bar:nth-child(3) { transform: translateY(-6px) rotate(-45deg); }
    #nav-hamburger.open .bar:nth-child(4) { opacity: 0; transform: scaleX(0); }

    /* ── Mobile Slide-Down Menu Panel ─────────────────── */
    #nav-mobile-panel {
      display: none; position: absolute; top: 100%; left: 0; right: 0;
      background: var(--bg-card); border-bottom: 1px solid var(--border-soft);
      box-shadow: 0 16px 48px rgba(0, 0, 0, 0.08); z-index: 998;
      overflow: hidden; max-height: 0;
      transition: max-height 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease;
      opacity: 0;
    }
    #nav-mobile-panel.open { max-height: 600px; opacity: 1; }
    .nav-mobile-inner {
      padding: 1.5rem;
      display: flex; flex-direction: column; gap: 1.25rem;
    }

    /* Professional profile row */
    .nav-mobile-profile {
      display: flex; align-items: center; gap: 1rem;
      padding-bottom: 1.1rem; border-bottom: 1px solid var(--border-soft);
    }
    .nav-mobile-avatar {
      width: 44px; height: 44px; border-radius: 50%;
      background: var(--primary); color: #fff;
      display: flex; align-items: center; justify-content: center;
      font-weight: 700; font-size: 1.1rem;
      box-shadow: 0 4px 12px rgba(90, 49, 244, 0.15);
    }
    .nav-mobile-user-details {
      display: flex; flex-direction: column; gap: 0.15rem;
    }
    .nav-mobile-username {
      font-size: 0.95rem; font-weight: 700; color: var(--text-main);
    }
    .nav-mobile-user-balance {
      font-size: 0.82rem; font-weight: 600; color: var(--primary-deep);
    }

    /* Clean navigation listing */
    .nav-mobile-list {
      display: flex; flex-direction: column;
    }
    .nav-mobile-item {
      display: flex; align-items: center; justify-content: space-between;
      padding: 0.9rem 0; text-decoration: none;
      font-size: 0.95rem; font-weight: 600; color: var(--text-main);
      transition: all 0.2s ease;
      border-bottom: 1px solid var(--border-soft);
    }
    .nav-mobile-item:last-child {
      border-bottom: none;
    }
    .nav-mobile-item:hover {
      color: var(--primary);
    }
    .nav-mobile-item-chevron {
      font-size: 0.85rem; color: var(--text-muted); flex-shrink: 0;
      transition: all 0.2s ease;
    }
    .nav-mobile-item:hover .nav-mobile-item-chevron {
      transform: translateX(3px); color: var(--primary);
    }

    .nav-mobile-divider {
      height: 1px; background: var(--border-soft); margin: 0.5rem 0;
    }

    /* Footer links */
    .nav-mobile-footer-list {
      display: flex; flex-direction: column;
    }
    .nav-mobile-support-link {
      display: flex; align-items: center; justify-content: space-between;
      padding: 0.9rem 0; text-decoration: none;
      font-size: 0.95rem; font-weight: 600; color: #0088cc;
      transition: all 0.2s ease;
      border-bottom: 1px solid var(--border-soft);
    }
    .nav-mobile-support-link:hover {
      color: var(--primary);
    }
    .nav-mobile-logout-btn {
      display: flex; align-items: center; justify-content: space-between;
      padding: 0.9rem 0;
      font-size: 0.95rem; font-weight: 600; color: #dc2626;
      cursor: pointer; background: none; border: none;
      width: 100%; text-align: left; font-family: var(--font-main);
      transition: all 0.2s ease;
    }
    .nav-mobile-logout-btn:hover {
      color: #b91c1c;
    }

    /* Guest View Layout */
    .nav-mobile-guest-links {
      display: flex; flex-direction: column; gap: 0.75rem;
    }
    .nav-mobile-guest-btn {
      display: block; width: 100%; text-align: center;
      padding: 0.85rem 1rem; border-radius: var(--radius-pill);
      font-size: 0.95rem; font-weight: 700; text-decoration: none;
      transition: all 0.2s; box-sizing: border-box;
    }
    .nav-mobile-guest-outline {
      background: transparent; border: 1.5px solid var(--border-soft);
      color: var(--text-main);
    }
    .nav-mobile-guest-outline:hover {
      border-color: var(--text-main);
      background: var(--bg-accent);
    }
    .nav-mobile-guest-primary {
      background: var(--primary); color: #fff; border: 1.5px solid var(--primary);
    }
    .nav-mobile-guest-primary:hover {
      background: var(--primary-hover); border-color: var(--primary-hover);
      box-shadow: 0 6px 20px rgba(90, 49, 244, 0.25);
    }


    /* Live Ticker Styling */
    #live-verification-popup {
      position: fixed; bottom: 24px; left: 24px;
      background: var(--bg-card); border: 1px solid var(--border-soft);
      border-radius: 14px; padding: 0.75rem 1.25rem;
      box-shadow: var(--shadow-lg); display: flex; align-items: center;
      gap: 0.75rem; z-index: 1000; transform: translateY(120%);
      opacity: 0; transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
      max-width: 320px;
    }
    #live-verification-popup.show { transform: translateY(0); opacity: 1; }
    
    .live-dot-pulse {
      width: 8px; height: 8px; background: #10B981; border-radius: 50%;
      position: relative; flex-shrink: 0;
    }
    .live-dot-pulse::after {
      content: ''; position: absolute; inset: -4px; border-radius: 50%;
      background: #10B981; opacity: 0.4; animation: pulseDot 2s infinite;
    }
    @keyframes pulseDot {
      0% { transform: scale(1); opacity: 0.4; }
      100% { transform: scale(2.5); opacity: 0; }
    }

    /* Floating Support Widget */
    #support-widget-container {
      position: fixed; bottom: 24px; right: 24px; z-index: 1000;
    }
    #support-widget-btn {
      width: 48px; height: 48px; border-radius: 50%;
      background: var(--primary); color: #fff; border: none;
      font-size: 1.4rem; cursor: pointer; box-shadow: 0 8px 24px rgba(90, 49, 244, 0.25);
      display: flex; align-items: center; justify-content: center;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1); outline: none;
    }
    #support-widget-btn:hover { transform: scale(1.08) rotate(5deg); background: var(--primary-hover); }
    #support-widget-panel {
      position: absolute; bottom: 60px; right: 0;
      width: 300px; background: var(--bg-card);
      border: 1px solid var(--border-soft); border-radius: 14px;
      box-shadow: var(--shadow-lg); display: flex; flex-direction: column;
      opacity: 0; pointer-events: none; transform: translateY(10px) scale(0.95);
      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1); overflow: hidden;
    }
    #support-widget-panel.open { opacity: 1; pointer-events: all; transform: translateY(0) scale(1); }
    .support-panel-header {
      background: var(--primary-deep); color: #fff; padding: 0.9rem 1.1rem;
      display: flex; justify-content: space-between; align-items: center; font-size: 0.88rem;
    }
    .support-panel-body { padding: 1.1rem; max-height: 380px; overflow-y: auto; }
    .support-faq-item { margin-bottom: 0.75rem; border-bottom: 1px solid var(--border-soft); padding-bottom: 0.6rem; }
    .support-faq-item strong { display: block; font-size: 0.8rem; color: var(--text-main); margin-bottom: 0.2rem; }
    .support-faq-item span { display: block; font-size: 0.75rem; color: var(--text-muted); line-height: 1.4; }

    /* ── Responsive Breakpoints ──────────────────────────────── */
    @media (max-width: 768px) {
      .header { padding: 0 !important; position: relative !important; }
      .nav-container {
        display: flex !important; flex-direction: row !important;
        flex-wrap: nowrap !important; align-items: center !important;
        justify-content: space-between !important;
        padding: 0.55rem 1rem !important; gap: 0 !important;
        min-height: 52px;
      }
      .nav-container > nav { display: none !important; }
      .nav-actions { display: none !important; }
      .logo { flex-shrink: 0; }
      #nav-hamburger { display: flex !important; margin-left: auto; }
      #nav-mobile-panel { display: block; }
      #live-verification-popup {
        left: 12px; bottom: 84px; right: 12px; max-width: calc(100% - 24px);
      }
      #support-widget-container { bottom: 16px; right: 16px; }
      #support-widget-panel { width: calc(100vw - 32px); max-width: 310px; right: 0; }
    }

    @media (min-width: 769px) {
      #nav-hamburger { display: none !important; }
      #nav-mobile-panel { display: none !important; }
    }
  `;
  document.head.appendChild(style);

  // ── Everything runs after DOM is ready ───────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    const user  = JSON.parse(localStorage.getItem('user') || 'null');
    const body  = document.body;

    // Auth guards — body is guaranteed to exist here
    if (body.dataset.requireAuth === 'true' && !token) {
      window.location.href = 'login.html';
      return;
    }
    if (body.dataset.redirectAuth && token) {
      window.location.href = body.dataset.redirectAuth;
      return;
    }

    const mainNav = document.getElementById('main-nav');
    if (!mainNav) return;

    // Inject hamburger button into the header nav container
    const headerEl = document.querySelector('.header');
    const navContainer = document.querySelector('.nav-container');

    // Create hamburger button (4 bars → animates to X)
    const hamburger = document.createElement('button');
    hamburger.id = 'nav-hamburger';
    hamburger.setAttribute('aria-label', 'Toggle menu');
    hamburger.innerHTML = `<span class="bar"></span><span class="bar"></span><span class="bar"></span><span class="bar"></span>`;
    navContainer.appendChild(hamburger);

    // Create mobile panel (appended to header, slides down below)
    const mobilePanel = document.createElement('div');
    mobilePanel.id = 'nav-mobile-panel';
    headerEl.appendChild(mobilePanel);

    const parent = mainNav.parentElement;

    if (token && user) {
      const cartCount = getCartCount();
      const initial   = (user.username || 'U').charAt(0).toUpperCase();
      const dashLink  = user.role === 'admin' ? 'admin/index.html' : 'dashboard.html';
      const balance   = `$${parseFloat(user.balance || 0).toFixed(2)}`;
      const onStorePage = window.location.pathname.split('/').pop() === 'store.html';

      // ── Desktop nav-actions ─────────────────────────────────────
      parent.innerHTML = `
        <div class="nav-actions">
          ${!onStorePage ? `<a href="store.html" class="nav-store-link" title="Store">Store</a>` : ''}
          <a href="deposit.html" class="nav-balance nav-balance-amount" title="Add funds">
            ${balance}
          </a>
          <a href="cart.html" class="nav-cart" title="Cart">
            Cart <span class="nav-cart-count">(${cartCount})</span>
          </a>
          <div class="nav-user" id="nav-user-wrap">
            <button class="nav-user-btn" id="nav-user-btn">
              <span class="nav-user-avatar">${initial}</span>
              <span>${user.username || 'Account'}</span>
              <span style="font-size:0.7rem;opacity:0.6;">▾</span>
            </button>
            <div class="nav-dropdown" id="nav-dropdown">
              <a href="${dashLink}">Dashboard</a>
              <a href="profile.html">Profile</a>
              <a href="orders.html">My Orders</a>
              <a href="add-funds.html">Add Funds</a>
              <div class="nav-dropdown-sep"></div>
              ${user.role === 'admin' ? '<a href="admin/index.html">Admin Panel</a><div class="nav-dropdown-sep"></div>' : ''}
              <a href="https://t.me/UltimateDailyLogs" target="_blank" rel="noopener" style="color:#0088cc !important;">Support</a>
              <div class="nav-dropdown-sep"></div>
              <a href="#" id="nav-logout" class="logout-link">Logout</a>
            </div>
          </div>
        </div>
      `;

      // ── Mobile panel (logged in) ────────────────────────────────
      mobilePanel.innerHTML = `
        <div class="nav-mobile-inner">
          <div class="nav-mobile-profile">
            <div class="nav-mobile-avatar">${initial}</div>
            <div class="nav-mobile-user-details">
              <span class="nav-mobile-username">${user.username || 'Account'}</span>
              <span class="nav-mobile-user-balance">Balance: ${balance}</span>
            </div>
          </div>

          <div class="nav-mobile-list">
            <a href="index.html" class="nav-mobile-item"><span>Home</span><span class="nav-mobile-item-chevron">›</span></a>
            <a href="${dashLink}" class="nav-mobile-item"><span>Dashboard</span><span class="nav-mobile-item-chevron">›</span></a>
            <a href="orders.html" class="nav-mobile-item"><span>My Orders</span><span class="nav-mobile-item-chevron">›</span></a>
            <a href="cart.html" class="nav-mobile-item">
              <span>Cart</span>
              <span style="display:flex;align-items:center;gap:0.5rem;">${cartCount > 0 ? `<span style="background:var(--primary);color:#fff;border-radius:999px;padding:0.1rem 0.5rem;font-size:0.72rem;font-weight:800;">${cartCount}</span>` : ''}<span class="nav-mobile-item-chevron">›</span></span>
            </a>
            <a href="add-funds.html" class="nav-mobile-item"><span>Add Funds</span><span class="nav-mobile-item-chevron">›</span></a>
            <a href="profile.html" class="nav-mobile-item"><span>Profile</span><span class="nav-mobile-item-chevron">›</span></a>
            ${user.role === 'admin' ? '<a href="admin/index.html" class="nav-mobile-item"><span>Admin Panel</span><span class="nav-mobile-item-chevron">›</span></a>' : ''}
          </div>

          <div class="nav-mobile-divider"></div>

          <div class="nav-mobile-footer-list">
            <a href="https://t.me/UltimateDailyLogs" target="_blank" class="nav-mobile-support-link"><span>Support</span><span class="nav-mobile-item-chevron" style="color:#0088cc;">›</span></a>
            <button class="nav-mobile-logout-btn" id="nav-mobile-logout"><span>Logout</span><span class="nav-mobile-item-chevron" style="color:#dc2626;">›</span></button>
          </div>
        </div>
      `;

      // Balance sync
      function syncAuth() {
        fetch(`${window.API_BASE || 'http://localhost:5000/api'}/auth/me`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(res => res.json())
        .then(data => {
          if (data && data.success && data.user) {
            localStorage.setItem('user', JSON.stringify(data.user));
            const newBalance = parseFloat(data.user.balance || 0).toFixed(2);
            document.querySelectorAll('.nav-balance-amount').forEach(el => {
              el.textContent = `$${newBalance}`;
            });
            const statBal = document.getElementById('stat-balance');
            if(statBal) statBal.textContent = `$${newBalance}`;
          }
        })
        .catch(() => {});
      }
      syncAuth();
      setInterval(syncAuth, 15000);

      // Desktop dropdown
      const btn      = document.getElementById('nav-user-btn');
      const dropdown = document.getElementById('nav-dropdown');
      if(btn && dropdown) {
        btn.addEventListener('click', (e) => { e.stopPropagation(); dropdown.classList.toggle('open'); });
        document.addEventListener('click', () => dropdown.classList.remove('open'));
      }

      // Desktop logout
      const logoutBtn = document.getElementById('nav-logout');
      if(logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
          e.preventDefault();
          localStorage.removeItem('token'); localStorage.removeItem('user'); localStorage.removeItem('daily_logs_cart');
          window.location.href = 'index.html';
        });
      }

      // Mobile logout
      const mobileLogout = document.getElementById('nav-mobile-logout');
      if(mobileLogout) {
        mobileLogout.addEventListener('click', () => {
          localStorage.removeItem('token'); localStorage.removeItem('user'); localStorage.removeItem('daily_logs_cart');
          window.location.href = 'index.html';
        });
      }

    } else {
      // ── Desktop guest actions ───────────────────────────────────
      parent.innerHTML = `
        <div class="nav-actions">
          <a href="login.html" class="btn btn-outline" style="padding:0.45rem 1.1rem; font-size:0.9rem;">Login</a>
          <a href="register.html" class="btn btn-primary" style="padding:0.45rem 1.1rem; font-size:0.9rem;">Register</a>
        </div>
      `;

      // ── Mobile panel (guest) ────────────────────────────────────
      mobilePanel.innerHTML = `
        <div class="nav-mobile-inner">
          <div class="nav-mobile-list">
            <a href="index.html" class="nav-mobile-item"><span>Home</span><span class="nav-mobile-item-chevron">›</span></a>
            <a href="login.html" class="nav-mobile-item"><span>Login</span><span class="nav-mobile-item-chevron">›</span></a>
          </div>
          <div class="nav-mobile-divider"></div>
          <div class="nav-mobile-guest-links">
            <a href="register.html" class="nav-mobile-guest-btn nav-mobile-guest-primary">Get Started</a>
          </div>
        </div>
      `;
    }

    // ── Hamburger toggle logic ──────────────────────────────────────
    hamburger.addEventListener('click', (e) => {
      e.stopPropagation();
      hamburger.classList.toggle('open');
      mobilePanel.classList.toggle('open');
    });
    document.addEventListener('click', (e) => {
      if (!hamburger.contains(e.target) && !mobilePanel.contains(e.target)) {
        hamburger.classList.remove('open');
        mobilePanel.classList.remove('open');
      }
    });

    // Highlight active link
    const current = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav-links a, .nav-mobile-item').forEach(a => {
      if ((a.getAttribute('href') || '') === current) {
        a.style.color = 'var(--primary-deep)';
        a.style.fontWeight = '700';
      }
    });

    // ── Live Verification Activity Ticker ───────────────────────────────────
    const liveActivities = [
      { type: 'card', name: 'Visa Gold Credit Card', detail: '$5,000 Limit', time: '3m ago' },
      { type: 'log', name: 'Chase Bank Log', detail: '$24,950 Balance', time: '5m ago' },
      { type: 'card', name: 'Mastercard Platinum', detail: '$8,500 Limit', time: '8m ago' },
      { type: 'log', name: 'Bank of America Log', detail: '$12,400 Balance', time: '11m ago' },
      { type: 'card', name: 'Amex Business Card', detail: '$15,000 Limit', time: '14m ago' },
      { type: 'log', name: 'Wells Fargo Log', detail: '$43,120 Balance', time: '17m ago' },
      { type: 'card', name: 'Visa Infinite Card', detail: '$25,000 Limit', time: '20m ago' },
      { type: 'log', name: 'PNC Bank Log', detail: '$9,850 Balance', time: '24m ago' }
    ];

    const currentFilename = window.location.pathname.split('/').pop() || 'index.html';
    if (currentFilename === 'index.html' || currentFilename === 'store.html') {
      const tickerDiv = document.createElement('div');
      tickerDiv.id = 'live-verification-popup';
      document.body.appendChild(tickerDiv);

      let activityIndex = 0;
      function showNextActivity() {
        const act = liveActivities[activityIndex];
        const icon = act.type === 'card' 
          ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>`
          : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 8v8M9 12h6"></path></svg>`;

        tickerDiv.innerHTML = `
          <span class="live-dot-pulse"></span>
          <div style="display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; background: var(--bg-accent); border-radius: 50%; flex-shrink: 0;">
            ${icon}
          </div>
          <div style="flex-grow: 1; min-width: 0;">
            <div style="font-size: 0.8rem; font-weight: 700; color: var(--primary-deep); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
              ${act.name} Verified
            </div>
            <div style="font-size: 0.72rem; color: var(--text-muted); font-family: monospace;">
              ${act.detail} • ${act.time}
            </div>
          </div>
        `;

        tickerDiv.classList.add('show');

        setTimeout(() => {
          tickerDiv.classList.remove('show');
        }, 5000);

        activityIndex = (activityIndex + 1) % liveActivities.length;
      }

      setTimeout(() => {
        showNextActivity();
        setInterval(showNextActivity, 12000);
      }, 3500);
    }

    // ── Floating FAQ & Support Chat Widget ─────────────────────────────────
    if (!window.location.pathname.includes('/admin/')) {
      const supportWidget = document.createElement('div');
      supportWidget.id = 'support-widget-container';
      supportWidget.innerHTML = `
        <button id="support-widget-btn" title="Need help?">💬</button>
        <div id="support-widget-panel">
          <div class="support-panel-header">
            <strong style="font-weight: 700;">Help & Support</strong>
            <span style="font-size: 0.72rem; color: #10B981; font-weight: 600; display: flex; align-items: center; gap: 0.25rem;">
              <span style="display: inline-block; width: 6px; height: 6px; background: #10B981; border-radius: 50%;"></span> Live
            </span>
          </div>
          <div class="support-panel-body">
            <div class="support-faq-item">
              <strong>How does automatic delivery work?</strong>
              <span>Verified logs and card credentials decrypt directly inside your dashboard immediately after payment verification.</span>
            </div>
            <div class="support-faq-item">
              <strong>Which credit cards are available?</strong>
              <span>We offer premium debit/credit cards with guaranteed limits. All cards are balance-checked prior to listing.</span>
            </div>
            <div class="support-faq-item">
              <strong>Which cryptos are accepted?</strong>
              <span>We accept BTC and USDT (TRC-20) for secure, instantaneous deposits to your wallet.</span>
            </div>
            <a href="https://t.me/UltimateDailyLogs" target="_blank" class="btn btn-primary" style="width: 100%; padding: 0.65rem; font-size: 0.8rem; margin-top: 0.75rem; border-radius: var(--radius-pill); text-decoration: none;">
              Contact Support on Telegram
            </a>
          </div>
        </div>
      `;
      document.body.appendChild(supportWidget);

      const supportBtn = document.getElementById('support-widget-btn');
      const supportPanel = document.getElementById('support-widget-panel');
      if (supportBtn && supportPanel) {
        supportBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          supportPanel.classList.toggle('open');
        });
        document.addEventListener('click', () => {
          supportPanel.classList.remove('open');
        });
        supportPanel.addEventListener('click', (e) => e.stopPropagation());
      }
    }
  });
})();
