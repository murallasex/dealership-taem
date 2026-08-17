import fs from 'fs';
import path from 'path';

const rootDir = 'c:/Users/thiag/.gemini/antigravity/scratch/Dealership Magnament';
const excludedDirs = ['node_modules', '.git', '.agents'];
const validExts = ['.js', '.html', '.css', '.json'];

let fileList = [];
function scan(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (excludedDirs.includes(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) scan(fullPath);
    else if (validExts.includes(path.extname(entry.name).toLowerCase())) fileList.push(fullPath);
  }
}
scan(rootDir);

const terms = ['cancel', 'ciudad', 'visualiz', 'concesion'];
for (const term of terms) {
  console.log(`\n--- Searching for term substring: "${term}" ---`);
  for (const file of fileList) {
    const text = fs.readFileSync(file, 'utf8');
    const matches = text.match(new RegExp(`\\b\\w*${term}\\w*\\b`, 'gi')) || [];
    if (matches.length > 0) {
      console.log(`[${path.relative(rootDir, file)}] -> Unique matches: ${[...new Set(matches)].join(', ')}`);
    }
  }
}
