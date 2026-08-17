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
    } else if (file.endsWith('.js') || file.endsWith('.html')) {
      results.push(full);
    }
  });
  return results;
}

const files = walk(projectRoot);
console.log(`Found ${files.length} JS/HTML files.`);

const corruptedByteSequences = new Map();
const fileCorruptions = [];

files.forEach(f => {
  if (f.includes('scan.js')) return;
  const relPath = path.relative(projectRoot, f);
  const content = fs.readFileSync(f, 'utf8');
  const lines = content.split(/\r?\n/);
  const fileMatches = [];

  lines.forEach((line, idx) => {
    // Check for Ã or Â or other mis-decoded UTF-8 sequences
    if (line.includes('Ã') || line.includes('Â') || line.includes('')) {
      fileMatches.push({
        lineNum: idx + 1,
        content: line
      });

      // Extract corrupted tokens with Ã or Â
      const matches = line.match(/(Ã.|Â.|[ÃÂ][\x80-\xFF]|\uFFFD)/g);
      if (matches) {
        matches.forEach(m => {
          const count = corruptedByteSequences.get(m) || 0;
          corruptedByteSequences.set(m, count + 1);
        });
      }
    }
  });

  if (fileMatches.length > 0) {
    fileCorruptions.push({
      filePath: relPath,
      matches: fileMatches
    });
  }
});

console.log('=== CORRUPTED BYTE SEQUENCES CATALOG ===');
for (const [seq, count] of corruptedByteSequences.entries()) {
  const hex = Array.from(seq).map(c => '0x' + c.charCodeAt(0).toString(16).toUpperCase()).join(' ');
  console.log(`Sequence: "${seq}" (Hex: ${hex}) - Occurrences: ${count}`);
}

console.log('\n=== AFFECTED FILES ===');
fileCorruptions.forEach(fc => {
  console.log(`\nFile: ${fc.filePath} (${fc.matches.length} corrupted lines)`);
  fc.matches.forEach(m => {
    console.log(`  L${m.lineNum}: ${m.content}`);
  });
});
