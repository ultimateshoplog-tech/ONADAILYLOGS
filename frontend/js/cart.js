// API_BASE set globally by nav.js — use window.API_BASE with fallback
const API_BASE = window.__API_BASE__ || window.API_BASE || 'http://localhost:5000/api';

// ─── Cart Helpers ──────────────────────────────────────────────────────────────
function getCart() {
  try { return JSON.parse(localStorage.getItem('daily_logs_cart') || '[]'); }
  catch { return []; }
}

function saveCart(cart) {
  localStorage.setItem('daily_logs_cart', JSON.stringify(cart));
  updateCartBadge();
}

function addToCart(product) {
  const cart = getCart();
  // Each log is unique — no quantity stacking
  if (cart.find(i => i.id === product.id)) {
    toast('This item is already in your cart!', 'warning');
    return false;
  }
  cart.push({
    id: product.id,
    name: product.name,
    category_name: product.category_name,
    price: product.price,
    tags: product.tags,
    short_description: product.short_description,
    description: product.description,
  });
  saveCart(cart);
  return true;
}

function removeFromCart(id) {
  saveCart(getCart().filter(i => i.id !== id));
  renderCart();
}

function clearCart() {
  localStorage.removeItem('daily_logs_cart');
  updateCartBadge();
}

function updateCartBadge() {
  const cart = getCart();
  document.querySelectorAll('.cart-badge').forEach(el => {
    el.textContent = cart.length;
    el.style.display = cart.length > 0 ? 'flex' : 'none';
  });
  document.querySelectorAll('.nav-cart-count').forEach(el => {
    el.textContent = `(${cart.length})`;
  });
}

// ─── Render Cart Page ──────────────────────────────────────────────────────────
function renderCart() {
  const cart = getCart();
  const container = document.getElementById('cart-items');
  const summary = document.getElementById('order-summary');
  if (!container) return;

  if (cart.length === 0) {
    container.className = '';
    container.style.gridColumn = '1 / -1';
    container.innerHTML = `
      <div class="empty-cart">
        <div style="font-size:3rem; margin-bottom:0.75rem;">🛒</div>
        <h3 style="font-size:1.25rem; color:var(--text-main); margin-bottom:0.4rem;">Your cart is empty</h3>
        <p style="color:var(--text-muted); font-size:0.9rem; margin-bottom:1.25rem;">Head to the store to browse available bank logs.</p>
        <a href="store.html" class="btn btn-primary">Browse Store</a>
      </div>
    `;
    if (summary) summary.style.display = 'none';
    return;
  }

  container.style.gridColumn = '';

  container.className = 'cart-items-panel';
  container.innerHTML = '';

  cart.forEach(item => {
    const initial = item.category_name ? item.category_name.charAt(0) : 'B';
    const shortName = item.category_name || item.name.split(/ log/i)[0].trim();

    // Parse balance from product name e.g. "PayPal Log — $81,773 Balance"
    const balanceMatch = item.name.match(/\$[\d,]+/);
    const balance = balanceMatch ? balanceMatch[0] : null;

    // Type = first segment of short_description before " | "
    const type = item.short_description
      ? item.short_description.split('|')[0].trim()
      : item.category_name || '';

    const div = document.createElement('div');
    div.className = 'cart-item';
    div.innerHTML = `
      <div class="cart-icon">${initial}</div>
      <div class="cart-item-body">
        <div class="cart-item-bank">${item.category_name || 'Bank'}</div>
        <div class="cart-item-name" title="${item.name}">${shortName}</div>
        <div class="cart-item-info">${item.description || ''}</div>
        <div class="cart-item-tags">
          ${balance ? `<span class="cart-tag">Balance: ${balance}</span>` : ''}
          ${type    ? `<span class="cart-tag">${type}</span>` : ''}
        </div>
      </div>
      <div class="cart-item-price">$${parseFloat(item.price).toFixed(2)}</div>
      <button class="remove-btn" title="Remove">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 6h18"></path>
          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
        </svg>
      </button>
    `;
    div.querySelector('.remove-btn').addEventListener('click', () => removeFromCart(item.id));
    container.appendChild(div);
  });

  // Update summary
  const total = cart.reduce((acc, i) => acc + parseFloat(i.price), 0);
  document.getElementById('summary-count').textContent = cart.length;
  document.getElementById('summary-subtotal').textContent = `$${total.toFixed(2)}`;
  document.getElementById('summary-total').textContent = `$${total.toFixed(2)}`;

  // Balance info
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  if (user) {
    const bal = parseFloat(user.balance || 0);
    const after = bal - total;
    document.getElementById('user-balance').textContent = `$${bal.toFixed(2)}`;
    const afterEl = document.getElementById('balance-after');
    afterEl.textContent = `$${after.toFixed(2)}`;
    afterEl.style.color = after < 0 ? '#b91c1c' : 'var(--success)';
  }

  if (summary) summary.style.display = 'block';
}

// ─── Checkout ──────────────────────────────────────────────────────────────────
async function checkout() {
  const token = localStorage.getItem('token');
  if (!token) { window.location.href = 'login.html'; return; }

  const cart = getCart();
  if (cart.length === 0) { toast('Your cart is empty.', 'warning'); return; }

  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const total = cart.reduce((acc, i) => acc + parseFloat(i.price), 0);
  if (user && parseFloat(user.balance) < total) {
    toast(`Insufficient balance. You need $${total.toFixed(2)} but have $${parseFloat(user.balance).toFixed(2)}. Top up first.`, 'error', 6000);
    return;
  }

  const btn = document.getElementById('checkout-btn');
  btn.textContent = 'Processing...';
  btn.disabled = true;

  const results = { success: [], successIds: [], failed: [] };
  let totalSpent = 0;

  for (const item of cart) {
    try {
      const res = await fetch(`${API_BASE}/orders/buy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ product_id: item.id, quantity: 1 })
      });
      const data = await res.json();
      if (data.success) {
        results.success.push(item.name);
        results.successIds.push(item.id);
        totalSpent += parseFloat(item.price);
        if (user) user.balance = data.new_balance !== undefined ? data.new_balance : user.balance - parseFloat(item.price);
      } else {
        results.failed.push(`${item.name}: ${data.message}`);
      }
    } catch {
      results.failed.push(`${item.name}: Network error`);
    }
  }


  if (user) localStorage.setItem('user', JSON.stringify(user));
  // Filter by ID, not name — names can collide or be truncated
  const remaining = getCart().filter(i => !results.successIds.includes(i.id));
  saveCart(remaining);


  if (results.failed.length === 0) {
    clearCart();
    const params = new URLSearchParams({ items: results.success.join('|'), total: totalSpent.toFixed(2), count: results.success.length });
    window.location.href = `order-confirm.html?${params.toString()}`;
  } else {
    if (results.success.length > 0) toast(`${results.success.length} item(s) purchased.`, 'success');
    if (results.failed.length > 0) toast(`${results.failed.length} item(s) failed. Check your balance.`, 'error', 6000);
    renderCart();
    btn.textContent = '✅ Confirm & Checkout';
    btn.disabled = false;
  }
}

// ─── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  updateCartBadge();
  renderCart();
  const checkoutBtn = document.getElementById('checkout-btn');
  if (checkoutBtn) checkoutBtn.addEventListener('click', checkout);
});

