const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../..');
const files = [
  'app.js',
  'data/store.js',
  'fix_encoding.cjs',
  'index.html',
  'modules/accounting/accounting.js',
  'modules/admin/admin.js',
  'modules/crm/crm.js',
  'modules/dashboard/dashboard.js',
  'modules/financing/financing.js',
  'modules/inventory/inventory.js',
  'modules/notifications/notifications.js',
  'modules/sales/sales.js',
  'modules/sellers/sellers.js',
  'PROJECT.md',
  'style.css',
  'test.js'
];

console.log('=== DETAILED SPANISH & ENCODING AUDIT ===\n');

const results = [];

files.forEach(file => {
  const fullPath = path.join(root, file);
  if (!fs.existsSync(fullPath)) return;
  const content = fs.readFileSync(fullPath, 'utf8');
  const lines = content.split('\n');

  lines.forEach((line, idx) => {
    const lineNum = idx + 1;

    // 1. Check for literal Ã or Â or UTF-8 double-encoding artifacts
    if (line.includes('Ã') || line.includes('Â') || line.includes('\uFFFD')) {
      results.push({ type: 'UTF-8 Double-Encoding / Mojibake', file, lineNum, text: line.trim() });
    }

    // 2. Check for ASCII replacement artifacts from naive scripts like fix_encoding.cjs (A3, A1, A-, A9, AD, B1, etc.)
    if (/[a-zA-Z0-9]A3/.test(line) || /[a-zA-Z0-9]A1/.test(line) || /[a-zA-Z0-9]A-/.test(line) || /[a-zA-Z0-9]A9/.test(line) || /[a-zA-Z0-9]AD/.test(line) || /[a-zA-Z0-9]B1/.test(line)) {
      if (!file.endsWith('fix_encoding.cjs') && !file.endsWith('package-lock.json') && !file.endsWith('style.css')) {
        results.push({ type: 'ASCII/Script-Mangled Pattern', file, lineNum, text: line.trim() });
      }
    }

    // 3. Check for specific corrupted VIN in data/store.js: 5YJSáDG0DFP00123
    if (line.includes('5YJSáDG')) {
      results.push({ type: 'Mangled VIN Artifact', file, lineNum, text: line.trim() });
    }
  });
});

console.log(`Total findings: ${results.length}`);
results.forEach(r => console.log(`[${r.type}] ${r.file}:${r.lineNum}: ${r.text}`));
