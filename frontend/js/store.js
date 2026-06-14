// API_BASE set globally by nav.js — use window.API_BASE
let currentCategory = '';
let currentSearch = '';
let currentSort = 'name_asc';
let currentPage = 1;
let allCategories = [];

// ─── Fetch Categories (Banks) ──────────────────────────────────────────────────
async function loadCategories() {
  try {
    const res = await fetch(`${API_BASE}/products/categories`);
    const data = await res.json();
    if (data.success) {
      allCategories = data.categories.sort((a, b) => a.name.localeCompare(b.name));
      renderCategories(allCategories);
      const total = allCategories.reduce((acc, c) => acc + parseInt(c.product_count || 0), 0);
      const tEl = document.getElementById('total-count');
      if (tEl) tEl.textContent = total;
    }
  } catch (err) {
    console.error('Failed to load categories:', err);
    document.getElementById('bank-list').innerHTML = '<div style="padding:1rem;color:red;">Error loading banks.</div>';
  }
}

function renderCategories(categories) {
  const container = document.getElementById('bank-list');
  container.innerHTML = `
    <div class="bank-item ${currentCategory === '' ? 'active' : ''}" data-slug="">
      <span>All Institutions</span>
      <span class="count" id="total-count">--</span>
    </div>
  `;

  const total = allCategories.reduce((acc, c) => acc + parseInt(c.product_count || 0), 0);
  const tEl = document.getElementById('total-count');
  if (tEl) tEl.textContent = total;

  categories.forEach(cat => {
    const item = document.createElement('div');
    item.className = `bank-item ${currentCategory === cat.slug ? 'active' : ''}`;
    item.dataset.slug = cat.slug;
    item.innerHTML = `
      <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding-right: 0.5rem;" title="${cat.name}">${cat.name}</span>
      <span class="count">${cat.product_count || 0}</span>
    `;
    item.addEventListener('click', () => {
      document.querySelectorAll('.bank-item').forEach(b => b.classList.remove('active'));
      item.classList.add('active');
      currentCategory = cat.slug;
      currentPage = 1;
      loadProducts();
    });
    container.appendChild(item);
  });

  container.firstElementChild.addEventListener('click', (e) => {
    document.querySelectorAll('.bank-item').forEach(b => b.classList.remove('active'));
    e.currentTarget.classList.add('active');
    currentCategory = '';
    currentPage = 1;
    loadProducts();
  });
}

// ─── Fetch Products ────────────────────────────────────────────────────────────
async function loadProducts() {
  const grid = document.getElementById('product-grid');
  grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 4rem 2rem; color: var(--text-muted);">Loading secure inventory...</div>';
  try {
    let url = `${API_BASE}/products?page=${currentPage}&limit=20&sort=${currentSort}`;
    if (currentCategory) url += `&category=${currentCategory}`;
    if (currentSearch) url += `&search=${encodeURIComponent(currentSearch)}`;

    const res = await fetch(url);
    const data = await res.json();

    if (data.success) {
      grid.innerHTML = '';
      if (data.products.length === 0) {
        grid.innerHTML = `
          <div style="grid-column: 1/-1; text-align: center; padding: 4rem 2rem; border: 1px dashed var(--border-soft); border-radius: 16px; background: var(--bg-card);">
            <h3 style="font-size: 1.25rem; margin-bottom: 0.5rem; color: var(--text-main);">No logs found</h3>
            <p style="color: var(--text-muted);">Try selecting a different institution or adjust your search.</p>
          </div>
        `;
      } else {
        data.products.forEach((p, index) => {
          const initial = p.category_name ? p.category_name.charAt(0) : 'B';

          // Parse balance from product name e.g. "Chase Bank Log — $43,988 Balance"
          const balanceMatch = p.name.match(/\$[\d,]+/);
          const balance = balanceMatch ? balanceMatch[0].replace('$', '') : 'N/A';

          // Type = first part of short_description before " | "
          const type = p.short_description
            ? p.short_description.split('|')[0].trim()
            : p.category_name || 'Bank Log';

          const shortName = (p.category_name || p.name).split(' Log')[0].trim();

          const card = document.createElement('div');
          const delayClass = `delay-${Math.min((index % 4) + 1, 4)}`;
          card.className = `card product-card anim-slide-up ${delayClass}`;
          card.innerHTML = `
            <div class="product-card-header">
              <div class="bank-logo-placeholder">${initial}</div>
              <div style="overflow: hidden; min-width: 0;">
                <span style="font-size: 0.7rem; text-transform: uppercase; font-weight: 700; color: var(--primary); display: block; letter-spacing: 0.05em; margin-bottom: 0.1rem;">${p.category_name || 'Uncategorized'}</span>
                <h3 style="font-size: 0.95rem; color: var(--primary-deep); margin: 0; line-height: 1.3; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 700;">${shortName}</h3>
              </div>
            </div>
            
            <div style="margin: 0.5rem 0 1rem; flex-grow: 1;">
              <div style="display: flex; justify-content: space-between; font-size: 0.82rem; margin-bottom: 0.25rem;">
                <span style="color: var(--text-muted);">Balance</span>
                <span style="color: var(--primary-deep); font-weight: 700; font-family: monospace;">$${balance}</span>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 0.82rem;">
                <span style="color: var(--text-muted);">Type</span>
                <span style="color: var(--text-main); font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 140px;">${type}</span>
              </div>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-soft); padding-top: 0.75rem; margin-top: auto;">
              <span style="font-size: 1.1rem; font-weight: 800; color: var(--primary-deep);">$${p.price.toFixed(2)}</span>
              <button class="btn btn-outline" style="padding: 0.4rem 1rem; font-size: 0.8rem; border-radius: var(--radius-pill);" data-product-id="${p.id}">Details</button>
            </div>
          `;

          // Attach click using stored product object — no inline JSON risk
          card.querySelector('button').addEventListener('click', () => openDetails(p));
          grid.appendChild(card);
        });
      }
      renderPagination(data.pagination);
    }
  } catch (err) {
    console.error('Failed to load products:', err);
    grid.innerHTML = '<div style="grid-column: 1/-1; color: #b91c1c; text-align: center;">Error loading secure inventory.</div>';
  }
}

// ─── Product Details Modal ─────────────────────────────────────────────────────
function openDetails(p) {
  // Parse balance from product name e.g. "Chase Bank Log — $43,988 Balance"
  const balanceMatch = p.name.match(/\$[\d,]+/);
  const balance = balanceMatch ? balanceMatch[0] : 'N/A';

  // Type = first segment of short_description before " | "
  const type = p.short_description
    ? p.short_description.split('|')[0].trim()
    : 'Checking / Savings';

  const modal = document.getElementById('product-modal');
  document.getElementById('modal-bank').textContent = p.category_name || 'Bank';
  document.getElementById('modal-name').textContent = p.name.split(/ with Description| \/ Balance/i)[0].trim();
  document.getElementById('modal-price').textContent = `$${p.price.toFixed(2)}`;
  document.getElementById('modal-balance').textContent = `$${balance}`;
  document.getElementById('modal-type').textContent = type;
  document.getElementById('modal-description').textContent = p.description || 'Premium access details included.';
  document.getElementById('modal-buy-btn').onclick = () => {
    const added = addToCart(p);
    if (added) {
      document.getElementById('modal-buy-btn').textContent = '✅ Added!';
      document.getElementById('modal-buy-btn').disabled = true;
      setTimeout(() => closeModal(), 900);
    }
  };
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('product-modal').style.display = 'none';
  document.body.style.overflow = '';
}

async function confirmBuy(id, price, name) {
  const token = localStorage.getItem('token');
  if (!token) {
    closeModal();
    window.location.href = 'login.html';
    return;
  }

  const btn = document.getElementById('modal-buy-btn');
  btn.textContent = 'Processing...';
  btn.disabled = true;

  try {
    const res = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ product_id: id, quantity: 1 })
    });
    const data = await res.json();

    if (data.success) {
      closeModal();
      const user = JSON.parse(localStorage.getItem('user'));
      if (user && data.order) {
        user.balance -= parseFloat(data.order.total);
        localStorage.setItem('user', JSON.stringify(user));
      }
      toast('Purchase successful! Redirecting to your orders...', 'success');
      setTimeout(() => window.location.href = 'orders.html', 1500);
    } else {
      toast(data.message || 'Error processing purchase.', 'error');
      btn.textContent = 'Confirm Purchase';
      btn.disabled = false;
    }
  } catch (err) {
    console.error(err);
    toast('Server connection error.', 'error');
    btn.textContent = 'Confirm Purchase';
    btn.disabled = false;
  }
}

// ─── Pagination ────────────────────────────────────────────────────────────────
function renderPagination(pg) {
  const container = document.getElementById('pagination');
  container.innerHTML = '';
  if (pg.pages <= 1) return;

  // ← Back button
  const prevBtn = document.createElement('button');
  prevBtn.className = 'btn btn-outline';
  prevBtn.style.padding = '0.45rem 1.2rem';
  prevBtn.innerHTML = '&larr; Back';
  prevBtn.disabled = pg.page === 1;
  prevBtn.addEventListener('click', () => { 
    if (currentPage > 1) { currentPage--; loadProducts(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  });
  container.appendChild(prevBtn);

  // Page X of Y label
  const label = document.createElement('span');
  label.style.cssText = 'font-size:0.82rem;font-weight:600;color:var(--text-muted);display:flex;align-items:center;padding:0 0.75rem;';
  label.textContent = `Page ${pg.page} of ${pg.pages}`;
  container.appendChild(label);

  // Next → button
  const nextBtn = document.createElement('button');
  nextBtn.className = 'btn btn-outline';
  nextBtn.style.padding = '0.45rem 1.2rem';
  nextBtn.innerHTML = 'Next &rarr;';
  nextBtn.disabled = pg.page === pg.pages;
  nextBtn.addEventListener('click', () => { 
    if (currentPage < pg.pages) { currentPage++; loadProducts(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  });
  container.appendChild(nextBtn);
}

// ─── Initialization ────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadCategories();
  loadProducts();

  document.getElementById('product-search').addEventListener('input', (e) => {
    clearTimeout(window._searchTimeout);
    window._searchTimeout = setTimeout(() => {
      currentSearch = e.target.value.trim();
      currentPage = 1;
      loadProducts();
    }, 500);
  });

  document.getElementById('sort-select').addEventListener('change', (e) => {
    currentSort = e.target.value;
    currentPage = 1;
    loadProducts();
  });

  document.getElementById('bank-search').addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase().trim();
    renderCategories(term ? allCategories.filter(c => c.name.toLowerCase().includes(term)) : allCategories);
  });

  // Close modal on backdrop click
  document.getElementById('product-modal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeModal();
  });
});
