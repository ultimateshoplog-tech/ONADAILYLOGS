const fs = require('fs');
const path = require('path');

const frontendDir = path.join(__dirname, '..', 'frontend');

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // Replace <span class="logo-dot"></span> with <img src="images/logo.jpg" class="logo-img" alt="Logo">
  content = content.replace(/<span class="logo-dot"><\/span>/g, '<img src="images/logo.jpg" class="logo-img" alt="Logo">');

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Replaced logo dot in: ${path.basename(filePath)}`);
  }
}

function traverse(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      traverse(fullPath);
    } else if (file.endsWith('.html')) {
      processFile(fullPath);
    }
  }
}

traverse(frontendDir);
console.log('Logo image insertion complete!');
