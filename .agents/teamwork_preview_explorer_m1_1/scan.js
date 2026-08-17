const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../..');
const ignoreDirs = ['node_modules', '.git', '.agents'];

const results = [];

function scanDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!ignoreDirs.includes(entry.name)) {
        scanDir(fullPath);
      }
    } else {
      const relPath = path.relative(root, fullPath).replace(/\\/g, '/');
      const ext = path.extname(relPath);
      if (['.js', '.html', '.json', '.css', '.md', '.cjs'].includes(ext)) {
        const content = fs.readFileSync(fullPath, 'utf8');
        const lines = content.split('\n');
        lines.forEach((line, idx) => {
          // Check for Ã or UTF-8 double-encoding artifacts or mangled sequences
          if (line.includes('Ã') || line.includes('') || line.includes('áDG') || /[A-Za-z0-9]A[319D-][A-Za-z0-9]/.test(line)) {
            results.push({
              file: relPath,
              lineNum: idx + 1,
              content: line.trim()
            });
          }
        });
      }
    }
  }
}

scanDir(root);

console.log(`Found ${results.length} suspect lines:`);
results.forEach(r => console.log(`${r.file}:${r.lineNum}: ${r.content}`));
