const fs = require('fs');
const path = require('path');

const frontendDir = path.join(__dirname, '../frontend');

// Files with encoding bugs + API_BASE redeclarations
const fixes = [
  {
    file: 'deposit.html',
    replacements: [
      ["Top Up Balance â€" On A Daily Logs", "Top Up Balance – On A Daily Logs"],
      ["Loadingâ€¦", "Loading…"],
      ["Address not configured â€" contact admin.", "Address not configured – contact admin."],
      ["const API_BASE = 'http://localhost:5000/api';", "const API_BASE = window.API_BASE || 'http://localhost:5000/api';"],
      // toast.js must load BEFORE inline script — move it to head or load before body closes correctly
    ]
  },
  {
    file: 'order-detail.html',
    replacements: [
      ["Order Details â€" On A Daily Logs", "Order Details – On A Daily Logs"],
      ["const API_BASE = 'http://localhost:5000/api';", "const API_BASE = window.API_BASE || 'http://localhost:5000/api';"],
    ]
  },
  {
    file: 'dashboard.html',
    replacements: [
      ["http://localhost:5000/api/orders/my-orders?limit=100", `\${window.API_BASE || 'http://localhost:5000/api'}/orders/my-orders?limit=100`],
    ]
  }
];

for (const { file, replacements } of fixes) {
  const filePath = path.join(frontendDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  for (const [from, to] of replacements) {
    content = content.split(from).join(to);
  }
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`✅ Fixed: ${file}`);
}

console.log('All encoding and API_BASE fixes applied.');
