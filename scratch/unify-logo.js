const fs = require('fs');
const path = require('path');

const frontendDir = path.join(__dirname, '..', 'frontend');

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // Pattern: <a href="index.html" class="logo">...</a>
  // We want to replace whatever is inside <a href="index.html" class="logo">...</a> with the unified one.
  const regex = /<a href="index\.html" class="logo"([^>]*)>([\s\S]*?)<\/a>/g;
  
  content = content.replace(regex, (match, attrs, inner) => {
    // Keep custom style attributes on the <a> if any, but clean inside
    return `<a href="index.html" class="logo"${attrs}>
        <span class="logo-dot"></span>
        <span>On A Daily Logs</span>
      </a>`;
  });

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated logo in: ${path.basename(filePath)}`);
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
console.log('Logo unification complete!');
