const fs = require('fs');
const path = require('path');

const frontendDir = path.join(__dirname, '..', 'frontend');

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // Replace rgba(13,79,79, X) with rgba(90, 49, 244, X)
  const regex = /rgba\(\s*13\s*,\s*79\s*,\s*79\s*,\s*([\d.]+)\s*\)/g;
  content = content.replace(regex, (match, opacity) => {
    return `rgba(90, 49, 244, ${opacity})`;
  });

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Converted legacy teal colors in: ${path.basename(filePath)}`);
  }
}

function traverse(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      traverse(fullPath);
    } else if (file.endsWith('.html') || file.endsWith('.css') || file.endsWith('.js')) {
      processFile(fullPath);
    }
  }
}

traverse(frontendDir);
console.log('Teal conversion complete!');
