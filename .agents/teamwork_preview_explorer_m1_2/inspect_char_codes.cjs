const fs = require('fs');
const content = fs.readFileSync('modules/sales/sales.js', 'utf8');
const lines = content.split(/\r?\n/);
[410, 424].forEach(lNum => {
  const line = lines[lNum - 1];
  console.log(`Line ${lNum}: "${line}"`);
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c.charCodeAt(0) > 127) {
      console.log(`  Char at ${i}: '${c}' (U+${c.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')})`);
    }
  }
});
