const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.js')) results.push(file);
    }
  });
  return results;
}

const files = walk('src');
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let updated = content;

  // STRICT regex:
  // arg1: no comma, no close paren, no newline
  // arg2: no close paren, no comma, no newline
  updated = updated.replace(/fmt\(([^,\)\n]+),\s*([^\)\n]+)\)/g, (match, arg1, arg2) => {
    if (arg2.trim() === 'reportsInPYG') {
      return match;
    }
    return 'fmt(' + arg1 + ')';
  });

  if(content !== updated) {
    fs.writeFileSync(file, updated);
    console.log('Updated ' + file);
  }
});
