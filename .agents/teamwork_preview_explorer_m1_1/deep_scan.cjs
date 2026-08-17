const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../..');
const ignoreDirs = ['node_modules', '.git', '.agents'];

const fileList = [];

function getFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!ignoreDirs.includes(entry.name)) {
        getFiles(fullPath);
      }
    } else {
      const relPath = path.relative(root, fullPath).replace(/\\/g, '/');
      const ext = path.extname(relPath);
      if (['.js', '.html', '.json', '.css', '.md', '.cjs'].includes(ext)) {
        fileList.push(relPath);
      }
    }
  }
}

getFiles(root);

console.log('Project Files List:');
fileList.forEach(f => console.log(' - ' + f));

const nonAsciiReport = [];

fileList.forEach(file => {
  const fullPath = path.join(root, file);
  const content = fs.readFileSync(fullPath, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    // find non-ASCII characters
    const nonAsciiMatches = line.match(/[^\x00-\x7F]/g);
    // find suspect patterns like A3, A1, A-, AD, B1 in middle of words
    const suspectPatterns = line.match(/[a-zA-Z]A[319D-][a-zA-Z]/g) || line.match(/[a-zA-Z]B1[a-zA-Z]/g);
    
    if (nonAsciiMatches || suspectPatterns) {
      nonAsciiReport.push({
        file,
        line: idx + 1,
        nonAscii: nonAsciiMatches ? [...new Set(nonAsciiMatches)].join('') : null,
        suspect: suspectPatterns ? suspectPatterns.join(', ') : null,
        text: line.trim()
      });
    }
  });
});

console.log(`\nTotal lines with non-ASCII or suspect patterns: ${nonAsciiReport.length}`);
fs.writeFileSync(path.join(__dirname, 'non_ascii_report.json'), JSON.stringify(nonAsciiReport, null, 2));
