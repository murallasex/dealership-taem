const fs = require('fs');
const path = require('path');
function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) results = results.concat(walk(file));
    else if (file.endsWith('.js')) results.push(file);
  });
  return results;
}
const files = walk('src');
files.push('app.js');

let missing = 0;
for (const f of files) {
  const content = fs.readFileSync(f, 'utf8');
  const matches = [...content.matchAll(/from\s+['"]([^'"]+)['"]/g), ...content.matchAll(/import\s+['"]([^'"]+)['"]/g)];
  for (const m of matches) {
    if (m[1].startsWith('.')) {
      const p = path.resolve(path.dirname(f), m[1]);
      if (!fs.existsSync(p)) {
        console.log('Missing import:', m[1], 'in', f);
        missing++;
      }
    }
  }
}
if (missing === 0) console.log('All imports exist!');
