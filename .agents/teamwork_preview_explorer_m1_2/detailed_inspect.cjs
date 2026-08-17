const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '../../');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const full = path.join(dir, file);
    if (file === '.agents' || file === 'node_modules' || file === '.git') return;
    const stat = fs.statSync(full);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(full));
    } else if (file.endsWith('.js') || file.endsWith('.html') || file.endsWith('.cjs')) {
      results.push(full);
    }
  });
  return results;
}

const files = walk(projectRoot);

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

  // Single UTF-8 corruptions
  { pattern: /Ã³/g, replacement: 'ó' },
  { pattern: /Ã±/g, replacement: 'ñ' },
  { pattern: /Ã¡/g, replacement: 'á' },
  { pattern: /Ã©/g, replacement: 'é' },
  { pattern: /Ãº/g, replacement: 'ú' },
  { pattern: /Ã­/g, replacement: 'í' }, // soft-hyphen
  { pattern: /Ã-/g, replacement: 'Í' },
  { pattern: /Â¿/g, replacement: '¿' },
  { pattern: /Âº/g, replacement: 'º' }
];

const auditResults = [];

files.forEach(f => {
  if (f.includes('.agents')) return;
  const relPath = path.relative(projectRoot, f);
  const content = fs.readFileSync(f, 'utf8');
  const lines = content.split(/\r?\n/);

  const corruptedLines = [];

  lines.forEach((line, idx) => {
    const lineNum = idx + 1;
    if (/Ã|Â|\uFFFD/.test(line)) {
      let fixedLine = line;

      replacementRules.forEach(rule => {
        fixedLine = fixedLine.replace(rule.pattern, rule.replacement);
      });

      corruptedLines.push({
        lineNum,
        original: line,
        fixed: fixedLine
      });
    }
  });

  auditResults.push({
    filePath: relPath,
    totalLines: lines.length,
    corruptedLineCount: corruptedLines.length,
    corruptedLines
  });
});

fs.writeFileSync(
  path.join(__dirname, 'full_audit.json'),
  JSON.stringify(auditResults, null, 2),
  'utf8'
);

let unresolved = 0;
auditResults.forEach(f => {
  f.corruptedLines.forEach(l => {
    if (/Ã|Â|\uFFFD/.test(l.fixed)) {
      unresolved++;
      console.log(`UNRESOLVED: ${f.filePath}:${l.lineNum} -> "${l.fixed}"`);
    }
  });
});

console.log(`AUDIT COMPLETE. Unresolved count: ${unresolved}`);
