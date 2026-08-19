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
files.push('app.js');

async function check() {
  for (const file of files) {
    try {
      await import('file:///' + path.resolve(file).replace(/\\/g, '/'));
    } catch (e) {
      if (e instanceof SyntaxError) {
        console.log('SYNTAX ERROR IN:', file);
        console.log(e);
      }
    }
  }
}
check();
