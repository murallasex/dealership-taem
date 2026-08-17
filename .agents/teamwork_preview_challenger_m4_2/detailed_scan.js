import fs from 'fs';
import path from 'path';

const projectRoot = path.resolve('c:/Users/thiag/.gemini/antigravity/scratch/Dealership Magnament');

const extensions = ['.js', '.cjs', '.mjs', '.html', '.json', '.md'];
const ignoredDirs = ['node_modules', '.git', '.agents'];

let report = [];

function scan(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!ignoredDirs.includes(entry.name)) {
        scan(fullPath);
      }
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (extensions.includes(ext)) {
        const relPath = path.relative(projectRoot, fullPath);
        const text = fs.readFileSync(fullPath, 'utf8');
        const buf = fs.readFileSync(fullPath);
        
        let charMatches = 0;
        for (let i = 0; i < text.length; i++) {
          if (text[i] === 'Ã' || text.charCodeAt(i) === 0xC3) {
            charMatches++;
          }
        }
        
        let byteMatches = 0;
        for (let i = 0; i < buf.length - 1; i++) {
          if (buf[i] === 0xC3 && buf[i + 1] === 0x83) {
            byteMatches++;
          }
        }
        
        report.push({
          file: relPath,
          ext: ext,
          charMatches,
          byteMatches,
          sizeBytes: buf.length
        });
      }
    }
  }
}

scan(projectRoot);

console.log('Detailed File Inventory & Ã Search Results:');
console.table(report);
