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
  // Double UTF-8 corruptions
  { id: 'DOUBLE_O_ACCENT', pattern: /ÃƒÂ³/g, replacement: 'ó' },
  { id: 'DOUBLE_N_TILDE', pattern: /ÃƒÂ±/g, replacement: 'ñ' },
  { id: 'DOUBLE_A_ACCENT', pattern: /ÃƒÂ¡/g, replacement: 'á' },
  { id: 'DOUBLE_E_ACCENT', pattern: /ÃƒÂ©/g, replacement: 'é' },
  { id: 'DOUBLE_I_ACCENT', pattern: /ÃƒÂ­/g, replacement: 'í' },
  { id: 'DOUBLE_U_ACCENT', pattern: /ÃƒÂº/g, replacement: 'ú' },
  { id: 'DOUBLE_CAP_U_ACCENT', pattern: /ÃƒÅ¡/g, replacement: 'Ú' },
  { id: 'DOUBLE_CAP_E_ACCENT', pattern: /Ãƒâ€°/g, replacement: 'É' },
  { id: 'DOUBLE_CAP_I_ACCENT', pattern: /ÃƒÂ\x8D|ÃƒÂ CULO/g, replacement: 'Í CULO' }, // Special case for VEHÍCULO
  { id: 'DOUBLE_LIGHTNING', pattern: /Ã¢Å¡Â¡/g, replacement: '⚡' },
  { id: 'DOUBLE_INV_QUESTION', pattern: /Ã‚Â¿/g, replacement: '¿' },

  // Single UTF-8 corruptions
  { id: 'SINGLE_O_ACCENT', pattern: /Ã³/g, replacement: 'ó' },
  { id: 'SINGLE_N_TILDE', pattern: /Ã±/g, replacement: 'ñ' },
  { id: 'SINGLE_A_ACCENT', pattern: /Ã¡/g, replacement: 'á' },
  { id: 'SINGLE_E_ACCENT', pattern: /Ã©/g, replacement: 'é' },
  { id: 'SINGLE_U_ACCENT', pattern: /Ãº/g, replacement: 'ú' },
  { id: 'SINGLE_I_ACCENT_1', pattern: /Ã­/g, replacement: 'í' },
  { id: 'SINGLE_I_ACCENT_2', pattern: /Ã-/g, replacement: 'Í' },
  { id: 'SINGLE_INV_QUESTION', pattern: /Â¿/g, replacement: '¿' },
  { id: 'SINGLE_DEGREE_SYMBOL', pattern: /Âº/g, replacement: 'º' },

  // Specific context anomalies
  { id: 'WORD_COMPRAVENTA', pattern: /COMPRÃ­VENTA/g, replacement: 'COMPRAVENTA' },
  { id: 'WORD_COMPRADOR', pattern: /COMPRÃ­OR/g, replacement: 'COMPRADOR' }
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
    // Test if line has any corruption character
    if (/Ã|Â|\uFFFD/.test(line)) {
      let fixedLine = line;

      // Apply rules
      fixedLine = fixedLine.replace(/COMPRÃ­VENTA/g, 'COMPRAVENTA');
      fixedLine = fixedLine.replace(/COMPRÃ­OR/g, 'COMPRADOR');
      fixedLine = fixedLine.replace(/VEHÃƒÂ CULO/g, 'VEHÍCULO');
      fixedLine = fixedLine.replace(/ÃƒÂ³/g, 'ó');
      fixedLine = fixedLine.replace(/ÃƒÂ±/g, 'ñ');
      fixedLine = fixedLine.replace(/ÃƒÂ¡/g, 'á');
      fixedLine = fixedLine.replace(/ÃƒÂ©/g, 'é');
      fixedLine = fixedLine.replace(/ÃƒÂ­/g, 'í');
      fixedLine = fixedLine.replace(/ÃƒÂº/g, 'ú');
      fixedLine = fixedLine.replace(/ÃƒÅ¡/g, 'Ú');
      fixedLine = fixedLine.replace(/Ãƒâ€°/g, 'É');
      fixedLine = fixedLine.replace(/Ã¢Å¡Â¡/g, '⚡');
      fixedLine = fixedLine.replace(/Ã‚Â¿/g, '¿');
      fixedLine = fixedLine.replace(/Ã³/g, 'ó');
      fixedLine = fixedLine.replace(/Ã±/g, 'ñ');
      fixedLine = fixedLine.replace(/Ã¡/g, 'á');
      fixedLine = fixedLine.replace(/Ã©/g, 'é');
      fixedLine = fixedLine.replace(/Ãº/g, 'ú');
      fixedLine = fixedLine.replace(/Ã­/g, 'í');
      fixedLine = fixedLine.replace(/Ã-/g, 'Í');
      fixedLine = fixedLine.replace(/Â¿/g, '¿');
      fixedLine = fixedLine.replace(/Âº/g, 'º');

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

console.log('AUDIT COMPLETE.');
console.log(`Scanned ${auditResults.length} files.`);
auditResults.forEach(r => {
  console.log(`${r.filePath.padEnd(45)} | Total Lines: ${r.totalLines.toString().padStart(4)} | Corrupted Lines: ${r.corruptedLineCount.toString().padStart(3)}`);
});
