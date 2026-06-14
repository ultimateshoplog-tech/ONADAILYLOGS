const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../frontend/orders.html');
let content = fs.readFileSync(filePath, 'utf8');

// Fix all mojibake sequences
const fixes = [
  ['My Orders â\x80\x93 On A Daily Logs', 'My Orders – On A Daily Logs'],
  ['Loading\xe2\x80\xa6', 'Loading…'],
  ['\xe2\x80\x93', '–'],
  ['\xe2\x80\x94', '—'],
  ['\xe2\x80\xa6', '…'],
  ['\xc3\xb0\xc5\xb8\x9c\xa6', '📦'],
  ['\xc3\xb0\xc5\xb8\x92\xb5', '💵'],
  ['\xc3\xb0\xc5\xb8\x92\xb3', '💳'],
  // Fix API_BASE redeclaration
  ["const API_BASE  = 'http://localhost:5000/api'", "const API_BASE = window.API_BASE || 'http://localhost:5000/api'"],
];

// Use regex to find all the double-encoded sequences
content = content
  .replace(/My Orders â€" On A Daily Logs/g, 'My Orders – On A Daily Logs')
  .replace(/Loadingâ€¦/g, 'Loading…')
  .replace(/ðŸ"¦/g, '📦')
  .replace(/ðŸ'µ/g, '💵')
  .replace(/ðŸ'³/g, '💳')
  .replace(/â€"/g, '—')
  .replace(/â€¦/g, '…')
  .replace(/â†'/g, '→')
  .replace(/â†/g, '←')
  .replace(/â—/g, '◉')
  .replace(/â†©/g, '↩')
  .replace(/âœ•/g, '✕')
  .replace(/const API_BASE\s+=\s+'http:\/\/localhost:5000\/api';/g,
           "const API_BASE = window.API_BASE || 'http://localhost:5000/api';");

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ orders.html encoding fixed');
