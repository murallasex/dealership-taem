const fs = require('fs');
const path = require('path');

const storePath = path.resolve(__dirname, '../../data/store.js');
const content = fs.readFileSync(storePath, 'utf8');
const lines = content.split('\n');

console.log('=== STORE.JS STRING LITERAL AUDIT ===\n');

lines.forEach((line, idx) => {
  const lineNum = idx + 1;
  // Match string literals
  const strMatches = line.match(/(['"`])((?:\\.|[^\\])*?)\1/g);
  if (strMatches) {
    strMatches.forEach(str => {
      // Check for suspicious characters, mangled words, or VINs with accents
      if (str.includes('Ã') || str.includes('Â') || str.includes('áDG') || /[a-zA-Z]A[319D-]/.test(str)) {
        console.log(`Line ${lineNum}: ${str}  ---> Full line: ${line.trim()}`);
      }
    });
  }
});
