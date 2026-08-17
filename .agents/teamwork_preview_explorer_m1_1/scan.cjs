const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../..');
const ignoreDirs = ['node_modules', '.git', '.agents'];

const results = [];
const allCorruptions = [];

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
          // Detect any non-ASCII characters or double-encoded characters or mangled strings
          // UTF-8 double-encoding of latin characters usually starts with C3 or C2 or C5 etc, producing Ã, Â, etc.
          if (line.includes('Ã') || line.includes('Â') || line.includes('áDG') || line.includes('')) {
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

console.log(`Found ${results.length} suspect lines containing Ã, Â, áDG, or :`);
results.forEach(r => console.log(`${r.file}:${r.lineNum}: ${r.content}`));
