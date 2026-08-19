const fs = require('fs');
const path = require('path');
function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    if (fs.statSync(file).isDirectory()) results = results.concat(walk(file));
    else if (file.endsWith('.js')) results.push(file);
  });
  return results;
}
const files = walk('src');

const exportsMap = {};
for (const f of files) {
  const content = fs.readFileSync(f, 'utf8');
  const expMatch = [...content.matchAll(/export\s+(const|let|var|function|class)\s+([a-zA-Z0-9_]+)/g)];
  if (!exportsMap[f]) exportsMap[f] = [];
  for (const m of expMatch) exportsMap[f].push(m[2]);
}

let missing = 0;
for (const f of files.concat(['app.js'])) {
  const content = fs.readFileSync(f, 'utf8');
  const matches = [...content.matchAll(/import\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]/g)];
  for (const m of matches) {
    if (m[2].startsWith('.')) {
      const p = path.resolve(path.dirname(f), m[2]);
      const fileExports = exportsMap[p] || [];
      const importedNames = m[1].split(',').map(s => s.trim().split(/\s+as\s+/)[0]);
      for (const name of importedNames) {
        if (!fileExports.includes(name)) {
          console.log('Missing export:', name, 'from', m[2], 'in', f);
          missing++;
        }
      }
    }
  }
}
if (missing === 0) console.log('All exports exist!');
