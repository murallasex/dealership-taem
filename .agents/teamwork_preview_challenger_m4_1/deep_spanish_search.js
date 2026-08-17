import fs from 'fs';
import path from 'path';

const rootDir = 'c:/Users/thiag/.gemini/antigravity/scratch/Dealership Magnament';
const excludedDirs = ['node_modules', '.git', '.agents'];
const validExts = ['.js', '.html', '.css', '.json'];

const targetWords = [
  'Vehículos', 'Financiación', 'Cancelado', 'Categoría',
  'Comisión', 'Asunción', 'Ciudad del Este', 'Encarnación',
  'Simulación', 'Visualización', 'Concesionario', 'Gestión'
];

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

console.log('--- CASE SENSITIVE AND INSENSITIVE SEARCH ---');
for (const word of targetWords) {
  let exactCount = 0;
  let ciCount = 0;
  let matchingFiles = [];
  const wordLower = word.toLowerCase();
  
  for (const file of fileList) {
    const text = fs.readFileSync(file, 'utf8');
    const exactMatches = (text.match(new RegExp(word, 'g')) || []).length;
    const ciMatches = (text.toLowerCase().match(new RegExp(wordLower, 'g')) || []).length;
    exactCount += exactMatches;
    ciCount += ciMatches;
    if (exactMatches > 0 || ciMatches > 0) {
      matchingFiles.push({ file: path.relative(rootDir, file), exactMatches, ciMatches });
    }
  }
  console.log(`Word: "${word}" | Exact Case: ${exactCount} | Case-Insensitive: ${ciCount} | Files: ${matchingFiles.length}`);
  if (matchingFiles.length > 0) {
    matchingFiles.forEach(m => console.log(`   - ${m.file} (exact: ${m.exactMatches}, ci: ${m.ciMatches})`));
  }
}
