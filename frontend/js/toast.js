// ─── Toast Notification System ────────────────────────────────────────────────
// Usage: toast('Message', 'success' | 'error' | 'info' | 'warning')

(function () {
  const style = document.createElement('style');
  style.textContent = `
    #toast-container {
      position: fixed; top: 1.25rem; right: 1.25rem;
      z-index: 9999; display: flex; flex-direction: column; gap: 0.65rem;
      pointer-events: none; max-width: 360px;
    }
    .toast {
      display: flex; align-items: flex-start; gap: 0.75rem;
      background: #fff; border-radius: 12px; padding: 1rem 1.25rem;
      box-shadow: 0 8px 30px rgba(0,0,0,0.12);
      border-left: 4px solid var(--primary);
      pointer-events: all; cursor: pointer;
      animation: toastIn 0.35s cubic-bezier(.21,1.02,.73,1) forwards;
      transition: opacity 0.3s, transform 0.3s;
    }
    .toast.toast-success { border-color: #16a34a; }
    .toast.toast-error   { border-color: #b91c1c; }
    .toast.toast-warning { border-color: #d97706; }
    .toast.toast-info    { border-color: var(--primary); }
    .toast.toast-hiding  { opacity: 0; transform: translateX(30px); }
    .toast-icon { font-size: 1.25rem; flex-shrink: 0; margin-top: 0.05rem; }
    .toast-body { flex: 1; }
    .toast-title { font-weight: 700; font-size: 0.9rem; color: #1a1a1a; margin-bottom: 0.15rem; }
    .toast-msg   { font-size: 0.82rem; color: #555; line-height: 1.4; }
    @keyframes toastIn {
      from { opacity: 0; transform: translateX(30px); }
      to   { opacity: 1; transform: translateX(0); }
    }
  `;
  document.head.appendChild(style);

  let container = null;
  function getContainer() {
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      (document.body || document.documentElement).appendChild(container);
    }
    return container;
  }

  const icons = { success: '✅', error: '❌', warning: '⚠️', info: '💡' };
  const titles = { success: 'Success', error: 'Error', warning: 'Warning', info: 'Info' };

  window.toast = function (msg, type = 'info', duration = 3500) {
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.innerHTML = `
      <span class="toast-icon">${icons[type] || '💡'}</span>
      <div class="toast-body">
        <div class="toast-title">${titles[type] || 'Notice'}</div>
        <div class="toast-msg">${msg}</div>
      </div>
    `;
    el.addEventListener('click', () => dismiss(el));
    getContainer().appendChild(el);

    const timer = setTimeout(() => dismiss(el), duration);
    el._timer = timer;

    function dismiss(el) {
      clearTimeout(el._timer);
      el.classList.add('toast-hiding');
      setTimeout(() => el.remove(), 320);
    }
  };
})();
