import fs from 'fs';
import path from 'path';

const projectRoot = path.resolve('c:/Users/thiag/.gemini/antigravity/scratch/Dealership Magnament');

const extensions = ['.js', '.cjs', '.html', '.json', '.md'];
const ignoredDirs = ['node_modules', '.git', '.agents'];

const spanishTargets = [
  'Gestión',
  'Vehículos',
  'Año',
  'Descripción',
  'Categoría',
  '₲'
];

console.log('=== SPANISH TEXT INTEGRITY INSPECTION ===\n');

function scanFile(filePath) {
  const relPath = path.relative(projectRoot, filePath);
  const content = fs.readFileSync(filePath, 'utf8');
  const buf = fs.readFileSync(filePath);
  
  spanishTargets.forEach(target => {
    let index = 0;
    while ((index = content.indexOf(target, index)) !== -1) {
      // Find line number
      const lineNo = content.substring(0, index).split('\n').length;
      const lineContent = content.split('\n')[lineNo - 1].trim();
      
      // Get UTF-8 bytes for target substring in this position
      const charCode = target.charCodeAt(0);
      console.log(`[PASS] Found '${target}' in ${relPath}:${lineNo}`);
      console.log(`       Line snippet: "${lineContent.substring(0, 80)}"`);
      
      index += target.length;
    }
  });
}

function scanDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!ignoredDirs.includes(entry.name)) {
        scanDir(fullPath);
      }
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (extensions.includes(ext)) {
        scanFile(fullPath);
      }
    }
  }
}

scanDir(projectRoot);
