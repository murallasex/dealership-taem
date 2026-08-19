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

let missing = 0;
for (const f of files.concat(['app.js'])) {
  const content = fs.readFileSync(f, 'utf8');
  const matches = [...content.matchAll(/from\s+['"]([^'"]+)['"]/g), ...content.matchAll(/import\s+['"]([^'"]+)['"]/g)];
  for (const m of matches) {
    if (m[1].startsWith('.')) {
      const p = path.resolve(path.dirname(f), m[1]);
      
      // Check exact case
      const dir = path.dirname(p);
      const base = path.basename(p);
      if (fs.existsSync(dir)) {
          const actualFiles = fs.readdirSync(dir);
          if (!actualFiles.includes(base)) {
              console.log('Case mismatch or missing on Linux:', m[1], 'in', f);
              missing++;
          }
      }
    }
  }
}
if (missing === 0) console.log('All imports match case!');
