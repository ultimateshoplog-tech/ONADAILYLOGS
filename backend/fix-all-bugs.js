/**
 * fix-all-bugs.js
 * Fixes: encoding mojibake, API_BASE redeclarations, toast.js load-order bug in deposit.html
 */
const fs = require('fs');
const path = require('path');

const frontend = path.join(__dirname, '../frontend');

function fix(relPath, patches) {
  const full = path.join(frontend, relPath);
  let c = fs.readFileSync(full, 'utf8');
  for (const [from, to] of patches) {
    if (typeof from === 'string') {
      c = c.split(from).join(to);
    } else {
      // regex
      c = c.replace(from, to);
    }
  }
  fs.writeFileSync(full, c, 'utf8');
  console.log('Fixed:', relPath);
}

// ─── deposit.html ─────────────────────────────────────────────────────────────
fix('deposit.html', [
  // Title encoding
  ['Top Up Balance \u00e2\u20ac\u201c On A Daily Logs', 'Top Up Balance \u2013 On A Daily Logs'],
  // Loading text
  ['Loading\u00e2\u20ac\u00a6', 'Loading\u2026'],
  // Address not configured em-dash
  ['not configured \u00e2\u20ac\u201c contact', 'not configured \u2013 contact'],
  // API_BASE
  ["const API_BASE = 'http://localhost:5000/api';", "const API_BASE = window.API_BASE || 'http://localhost:5000/api';"],
  // toast.js is loaded AFTER the inline script that calls toast() — swap order
  // Move <script src="js/toast.js"> to BEFORE the inline script
  ['<script>\n    const API_BASE', '<script src="js/toast.js"></script>\n  <script>\n    const API_BASE'],
  ['</script>\n  <script src="js/toast.js"></script>\n</body>', '</script>\n</body>'],
]);

// ─── order-detail.html ────────────────────────────────────────────────────────
fix('order-detail.html', [
  ['Order Details \u00e2\u20ac\u201c On A Daily Logs', 'Order Details \u2013 On A Daily Logs'],
  ["const API_BASE = 'http://localhost:5000/api';", "const API_BASE = window.API_BASE || 'http://localhost:5000/api';"],
]);

// ─── dashboard.html ───────────────────────────────────────────────────────────
fix('dashboard.html', [
  ["await fetch('http://localhost:5000/api/orders/my-orders?limit=100'",
   "await fetch(`${window.API_BASE || 'http://localhost:5000/api'}/orders/my-orders?limit=100`"],
]);

// ─── Admin HTML files — fix all emoji mojibake in sidebars ───────────────────
const adminFiles = [
  'admin/add-product.html',
  'admin/deposits.html',
  'admin/existing-products.html',
  'admin/index.html',
  'admin/orders.html',
  'admin/settings.html',
  'admin/users.html',
  'admin/refunded-logs.html',
];

const adminPatches = [
  ['Add Product \u00e2\u20ac\u201c', 'Add Product \u2013'],
  ['\u00f0\u0178\u201c\u00a6', '\ud83d\udcc2'],   // 📦 broken
  ['\u00f0\u0178\u2019\u00a5', '\ud83d\udca5'],   // emoji
  ['\u00f0\u0178\u0161\u2019', '\ud83d\uded2'],   // 🛒
  ['\u00f0\u0178\u2019\u00b0', '\ud83d\udcb0'],   // 💰
  ['\u00f0\u0178\u201d\u0160', '\ud83d\udcca'],   // 📊
  ['\u00e2\u009e\u2022', '\u2795'],              // ➕
  ['\u00f0\u0178\u2018\u00a5', '\ud83d\udc65'],  // 👥
  ['\u00f0\u0178\u009a\u00aa', '\ud83d\udea9'],  // 
  ['\u00e2\u009a\u00af\u00ef\u00bf\u00bd', '\u2699\ufe0f'], // ⚙️
  ['\u00f0\u0178\u009a\u00aa', '\ud83d\udea9'],
  ['Sign Out\u003c', 'Sign Out<'],
];

for (const f of adminFiles) {
  try {
    fix(f, adminPatches);
  } catch(e) {
    console.error('Error fixing', f, e.message);
  }
}

console.log('\nAll fixes applied successfully!');
