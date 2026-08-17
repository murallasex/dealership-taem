const fs = require('fs');
const path = require('path');

const audit = JSON.parse(fs.readFileSync(path.join(__dirname, 'full_audit.json'), 'utf8'));

console.log('=== VERIFYING RECONSTRUCTED SPANISH TEXT ===\n');

let totalUnresolved = 0;

audit.forEach(file => {
  if (file.corruptedLineCount > 0) {
    console.log(`=== FILE: ${file.filePath} ===`);
    file.corruptedLines.forEach(l => {
      // Check if fixed still has suspicious characters
      const remainingMojibake = l.fixed.match(/Ã|Â|\uFFFD/g);
      if (remainingMojibake) {
        totalUnresolved++;
        console.log(`[UNRESOLVED] L${l.lineNum}:`);
        console.log(`  ORIG: ${l.original.trim()}`);
        console.log(`  FIX : ${l.fixed.trim()}`);
      } else {
        console.log(`  L${l.lineNum}: ${l.fixed.trim()}`);
      }
    });
    console.log('\n');
  }
});

console.log(`Total unresolved lines: ${totalUnresolved}`);
