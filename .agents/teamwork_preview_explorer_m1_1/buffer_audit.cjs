const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../..');
const ignoreDirs = ['node_modules', '.git', '.agents'];

const fileList = [];

function getFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!ignoreDirs.includes(entry.name)) {
        getFiles(fullPath);
      }
    } else {
      const relPath = path.relative(root, fullPath).replace(/\\/g, '/');
      const ext = path.extname(relPath);
      if (['.js', '.html', '.json', '.css', '.md', '.cjs'].includes(ext)) {
        fileList.push(relPath);
      }
    }
  }
}

getFiles(root);

console.log('=== BUFFER AUDIT FOR UTF-8 DOUBLE ENCODING & MOJIBAKE ===\n');

fileList.forEach(file => {
  const fullPath = path.join(root, file);
  const buf = fs.readFileSync(fullPath);
  const utf8Str = buf.toString('utf8');
  const latin1Str = buf.toString('latin1');

  // Check 1: Does UTF-8 string contain \u00C3 (Ã) or \u00C2 (Â)?
  const c3Matches = [];
  const lines = utf8Str.split('\n');
  lines.forEach((line, idx) => {
    if (/\u00C3[\u0080-\u00BF]/.test(line) || /\u00C2[\u0080-\u00BF]/.test(line) || line.includes('Ã') || line.includes('Â')) {
      c3Matches.push({ lineNum: idx + 1, text: line.trim() });
    }
  });

  // Check 2: Check for ASCII-mangled patterns like A3, A1, A-, AD, B1, etc.
  const asciiMangled = [];
  lines.forEach((line, idx) => {
    if (/[a-zA-Z]A[319D-][a-zA-Z]/.test(line) || /[a-zA-Z]B1[a-zA-Z]/.test(line) || line.includes('5YJSáDG')) {
      asciiMangled.push({ lineNum: idx + 1, text: line.trim() });
    }
  });

  if (c3Matches.length > 0 || asciiMangled.length > 0) {
    console.log(`FILE: ${file}`);
    if (c3Matches.length > 0) {
      console.log(`  [UTF-8 Mojibake / Double-Encoding (Ã/Â)] (${c3Matches.length} occurrences):`);
      c3Matches.forEach(m => console.log(`    Line ${m.lineNum}: ${m.text}`));
    }
    if (asciiMangled.length > 0) {
      console.log(`  [ASCII/Script Mangled Corruptions] (${asciiMangled.length} occurrences):`);
      asciiMangled.forEach(m => console.log(`    Line ${m.lineNum}: ${m.text}`));
    }
    console.log('');
  }
});
