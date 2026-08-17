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

function fixString(str) {
  let prev = str;
  let current = str;
  // Try up to 3 passes of latin1 -> utf8 conversion if corrupted chars exist
  for (let pass = 0; pass < 3; pass++) {
    if (/[\xC2-\xDF][\x80-\xBF]|Ã|Â|Ãƒ|Ã‚|Ã¢/.test(current)) {
      try {
        const decoded = Buffer.from(current, 'binary').toString('utf8');
        // If decoding produced replacement character, don't use it
        if (!decoded.includes('\uFFFD') && decoded !== current) {
          current = decoded;
        } else {
          break;
        }
      } catch (e) {
        break;
      }
    } else {
      break;
    }
  }
  return current;
}

const fileReport = [];
const byteSeqMap = new Map();

files.forEach(f => {
  if (f.includes('.agents')) return;
  const relPath = path.relative(projectRoot, f);
  const content = fs.readFileSync(f, 'utf8');
  const lines = content.split(/\r?\n/);
  
  const corruptedLines = [];

  lines.forEach((line, idx) => {
    // Check if line contains corruption signatures
    if (/Ã|Â|Ãƒ|Ã‚|Ã¢|\uFFFD/.test(line)) {
      const fixed = fixString(line);

      // Extract specific corruption tokens (e.g. Ã³, Ã±, ÃƒÂ³, etc.)
      const matches = line.match(/(ÃƒÂ[³±¡©º]|Ãƒâ€°|Ã¢Å¡Â¡|Ã‚Â¿|Ã[³±¡©º­-]|Â[¿º]|Ãƒ[â€\x80-\xFF]+)/g) || [];
      matches.forEach(m => {
        const entry = byteSeqMap.get(m) || { count: 0, fixed: fixString(m) };
        entry.count++;
        byteSeqMap.set(m, entry);
      });

      corruptedLines.push({
        line: idx + 1,
        original: line.trim(),
        fixed: fixed.trim()
      });
    }
  });

  if (corruptedLines.length > 0) {
    fileReport.push({
      file: relPath,
      totalCorruptedLines: corruptedLines.length,
      lines: corruptedLines
    });
  }
});

const reportData = {
  totalFilesAnalyzed: files.length,
  totalAffectedFiles: fileReport.length,
  corruptedSequencesCatalog: Array.from(byteSeqMap.entries()).map(([seq, info]) => ({
    sequence: seq,
    hex: Array.from(seq).map(c => '0x' + c.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')).join(' '),
    count: info.count,
    suggestedFix: info.fixed
  })),
  affectedFiles: fileReport
};

fs.writeFileSync(
  path.join(__dirname, 'scan_report.json'),
  JSON.stringify(reportData, null, 2),
  'utf8'
);

console.log(`Scan completed. Analyzed ${files.length} files. ${fileReport.length} files affected.`);
