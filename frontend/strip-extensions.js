const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      results.push(file);
    }
  });
  return results;
}

const backendDir = path.join(__dirname, 'backend');
if (fs.existsSync(backendDir)) {
  const files = walk(backendDir);
  console.log(`Found ${files.length} TypeScript files to process.`);

  files.forEach(filePath => {
    let content = fs.readFileSync(filePath, 'utf8');
    // Replace relative imports (starting with ./ or ../) ending with .js
    // Matching from './foo.js' -> from './foo'
    const updatedContent = content.replace(/(from\s+['"]\.\.?\/[^'"]+)\.js(['"])/g, '$1$2');
    
    if (updatedContent !== content) {
      fs.writeFileSync(filePath, updatedContent, 'utf8');
      console.log(`Updated relative imports in: ${path.relative(__dirname, filePath)}`);
    }
  });
} else {
  console.error('Backend directory not found!');
}
