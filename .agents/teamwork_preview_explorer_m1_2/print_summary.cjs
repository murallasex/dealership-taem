const fs = require('fs');
const path = require('path');

const report = JSON.parse(fs.readFileSync(path.join(__dirname, 'scan_report.json'), 'utf8'));

console.log('=== SUMMARY OF CORRUPTED SEQUENCES ===');
report.corruptedSequencesCatalog.forEach(item => {
  console.log(`Seq: "${item.sequence}" | Hex: ${item.hex} | Count: ${item.count} | Suggested Fix: "${item.suggestedFix}"`);
});

console.log('\n=== AFFECTED FILES ===');
report.affectedFiles.forEach(f => {
  console.log(`\n--------------------------------------------------`);
  console.log(`FILE: ${f.file} (${f.totalCorruptedLines} lines)`);
  console.log(`--------------------------------------------------`);
  f.lines.forEach(l => {
    console.log(`Line ${l.line}:`);
    console.log(`  ORIG: ${l.original}`);
    console.log(`  FIX : ${l.fixed}`);
  });
});
