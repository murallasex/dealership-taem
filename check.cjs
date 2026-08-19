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
for (const f of files) {
  try {
    require('child_process').execSync('node -c "' + f + '"', { stdio: 'pipe' });
  } catch (e) {
    console.log('Syntax Error in:', f);
    console.log(e.stderr.toString());
  }
}
