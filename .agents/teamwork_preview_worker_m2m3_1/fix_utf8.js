import fs from 'fs';
import path from 'path';

const replacementRules = [
  // Context-specific contract fixes
  { pattern: /COMPRÃ­VENTA/g, replacement: 'COMPRAVENTA' },
  { pattern: /COMPRÃ­OR/g, replacement: 'COMPRADOR' },

  // Currency & Special Symbols (Double UTF-8)
  { pattern: /Ã¢â€šÂ²/g, replacement: '₲' },
  { pattern: /Ã¢Å¡Â¡/g, replacement: '⚡' },
  { pattern: /Ã‚Â¿/g, replacement: '¿' },
  { pattern: /Ã‚Â¡/g, replacement: '¡' },
  { pattern: /Ã‚Â°/g, replacement: 'º' },

  // Double UTF-8 Vowels & Letters
  { pattern: /ÃƒÂ³/g, replacement: 'ó' },
  { pattern: /ÃƒÂ±/g, replacement: 'ñ' },
  { pattern: /ÃƒÂ¡/g, replacement: 'á' },
  { pattern: /ÃƒÂ©/g, replacement: 'é' },
  { pattern: /ÃƒÂ­/g, replacement: 'í' },
  { pattern: /ÃƒÂº/g, replacement: 'ú' },
  { pattern: /ÃƒÅ¡/g, replacement: 'Ú' },
  { pattern: /Ãƒâ€°/g, replacement: 'É' },
  { pattern: /ÃƒÂ\x8D/g, replacement: 'Í' },
  { pattern: /ÃƒÂÍ/g, replacement: 'Í' },

  // Single UTF-8 Corruptions
  { pattern: /Ã³/g, replacement: 'ó' },
  { pattern: /Ã±/g, replacement: 'ñ' },
  { pattern: /Ã¡/g, replacement: 'á' },
  { pattern: /Ã©/g, replacement: 'é' },
  { pattern: /Ãº/g, replacement: 'ú' },
  { pattern: /Ã­/g, replacement: 'í' },
  { pattern: /Ã-/g, replacement: 'Í' },
  { pattern: /Â¿/g, replacement: '¿' },
  { pattern: /Âº/g, replacement: 'º' }
];

const targetFiles = [
  'modules/accounting/accounting.js',
  'modules/admin/admin.js',
  'modules/crm/crm.js',
  'modules/dashboard/dashboard.js',
  'modules/financing/financing.js',
  'modules/inventory/inventory.js',
  'modules/notifications/notifications.js',
  'modules/sales/sales.js',
  'modules/sellers/sellers.js',
  'PROJECT.md'
];

const projectRoot = 'c:/Users/thiag/.gemini/antigravity/scratch/Dealership Magnament';

let totalFixed = 0;
targetFiles.forEach(relPath => {
  const fullPath = path.join(projectRoot, relPath);
  if (fs.existsSync(fullPath)) {
    let content = fs.readFileSync(fullPath, 'utf8');
    let original = content;
    replacementRules.forEach(rule => {
      content = content.replace(rule.pattern, rule.replacement);
    });
    if (content !== original) {
      fs.writeFileSync(fullPath, content, 'utf8');
      console.log(`Fixed encoding in ${relPath}`);
      totalFixed++;
    }
  } else {
    console.log(`File not found: ${fullPath}`);
  }
});

console.log(`Total files updated: ${totalFixed}`);

// Verify if any 'Ã' characters remain in all .js and .html files
let remainingCorruptions = [];
function scanDir(dir) {
  const files = fs.readdirSync(dir);
  files.forEach(f => {
    const full = path.join(dir, f);
    if (f === 'node_modules' || f === '.git' || f === '.agents') return;
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      scanDir(full);
    } else if (f.endsWith('.js') || f.endsWith('.html') || f === 'PROJECT.md') {
      const text = fs.readFileSync(full, 'utf8');
      if (text.includes('Ã')) {
        remainingCorruptions.push(full);
      }
    }
  });
}
scanDir(projectRoot);

console.log(`Remaining files with 'Ã': ${remainingCorruptions.length}`);
if (remainingCorruptions.length > 0) {
  console.log('Files with remaining Ã:', remainingCorruptions);
}
