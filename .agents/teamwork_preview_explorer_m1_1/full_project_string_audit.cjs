const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../..');
const ignoreDirs = ['node_modules', '.git', '.agents'];

const findings = [];

function scanFile(relPath) {
  const fullPath = path.join(root, relPath);
  if (!fs.existsSync(fullPath)) return;
  const content = fs.readFileSync(fullPath, 'utf8');
  const lines = content.split('\n');

  lines.forEach((line, idx) => {
    const lineNum = idx + 1;

    // Check 1: UTF-8 double encoding / mojibake (Ã, Â, etc.)
    const c3Match = line.match(/\u00C3[\u0080-\u00BF]/g) || line.match(/Ã[³±\-¡©º\s\w]/g);
    if (c3Match || line.includes('Ã')) {
      findings.push({
        category: 'UTF-8 Double Encoding (Mojibake)',
        file: relPath,
        lineNum,
        corrupted: c3Match ? c3Match.join(', ') : 'Ã',
        fullLine: line.trim()
      });
    }

    // Check 2: Naive ASCII mangled patterns (e.g. DescripciA3n, VehA-culo, 5YJSáDG)
    if (line.includes('5YJSáDG')) {
      findings.push({
        category: 'Naive Script Collateral Damage (Mangled VIN)',
        file: relPath,
        lineNum,
        corrupted: '5YJSáDG0DFP00123',
        corrected: '5YJSA1DG0DFP00123',
        fullLine: line.trim()
      });
    }

    if (relPath === 'fix_encoding.cjs') {
      if (/[A-Z0-9]{2}/.test(line) && line.includes(':')) {
        findings.push({
          category: 'Naive Encoding Repair Utility Artifact',
          file: relPath,
          lineNum,
          corrupted: line.trim(),
          fullLine: line.trim()
        });
      }
    }
  });
}

function scanDirectory(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(root, fullPath).replace(/\\/g, '/');
    if (entry.isDirectory()) {
      if (!ignoreDirs.includes(entry.name)) {
        scanDirectory(fullPath);
      }
    } else {
      const ext = path.extname(relPath);
      if (['.js', '.html', '.json', '.css', '.md', '.cjs'].includes(ext)) {
        scanFile(relPath);
      }
    }
  }
}

scanDirectory(root);

console.log(`=== FULL PROJECT ENCODING AUDIT FINDINGS (${findings.length} items) ===\n`);
findings.forEach(f => {
  console.log(`Category: ${f.category}`);
  console.log(`File: ${f.file}:${f.lineNum}`);
  console.log(`Corrupted/Target: ${f.corrupted}`);
  if (f.corrected) console.log(`Corrected: ${f.corrected}`);
  console.log(`Line Content: ${f.fullLine}\n---`);
});
