const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '../../');

const checkFiles = ['PROJECT.md', 'style.css', 'package.json'];
checkFiles.forEach(f => {
  const p = path.join(projectRoot, f);
  if (fs.existsSync(p)) {
    const content = fs.readFileSync(p, 'utf8');
    const matches = content.match(/Ã|Â|\uFFFD/g);
    console.log(`${f}: ${matches ? matches.length + ' corrupted chars' : 'CLEAN'}`);
  }
});
