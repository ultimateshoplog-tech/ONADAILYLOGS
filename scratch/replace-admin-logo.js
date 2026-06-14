const fs = require('fs');
const path = require('path');

const adminDir = path.join(__dirname, '..', 'frontend', 'admin');

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // Replace <span style="font-size: 1.3rem;">🔵</span> or similar
  content = content.replace(/<span style="font-size:\s*1\.[36]rem;[^"]*">🔵<\/span>/g, '<img src="../images/logo.jpg" class="a-brand-img" alt="Logo">');
  // Also match standard non-inline styled spans if any
  content = content.replace(/<span>🔵<\/span>/g, '<img src="../images/logo.jpg" class="a-brand-img" alt="Logo">');

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Replaced logo in admin file: ${path.basename(filePath)}`);
  }
}

fs.readdirSync(adminDir).forEach(file => {
  if (file.endsWith('.html')) {
    processFile(path.join(adminDir, file));
  }
});

console.log('Admin logo replacement complete!');
