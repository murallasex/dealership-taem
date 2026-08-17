const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../..');
const ignoreDirs = ['node_modules', '.git', '.agents'];

const occurrences = [];

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
        // Skip fix_encoding.cjs if it contains literal mapping strings for detection, but let's check it too if needed
        const content = fs.readFileSync(fullPath, 'utf8');
        const lines = content.split('\n');
        lines.forEach((line, idx) => {
          if (line.includes('Ã') || line.includes('\u00C3') || line.includes('\uFFFD')) {
            occurrences.push({
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

console.log(JSON.stringify(occurrences, null, 2));
