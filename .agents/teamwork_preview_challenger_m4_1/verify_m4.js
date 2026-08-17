import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const rootDir = 'c:/Users/thiag/.gemini/antigravity/scratch/Dealership Magnament';

// Exclusions: node_modules, .git, .agents
const excludedDirs = ['node_modules', '.git', '.agents'];
const validExts = ['.js', '.html', '.css', '.json'];

let scannedFiles = [];
let mojibakeFindings = [];
let wordCounts = {
  'Vehículos': 0,
  'Financiación': 0,
  'Cancelado': 0,
  'Categoría': 0,
  'Comisión': 0,
  'Asunción': 0,
  'Ciudad del Este': 0,
  'Encarnación': 0,
  'Simulación': 0,
  'Visualización': 0,
  'Concesionario': 0,
  'Gestión': 0
};
let wordFileMatches = {};
for (const key in wordCounts) wordFileMatches[key] = [];

function scan(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (excludedDirs.includes(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      scan(fullPath);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (validExts.includes(ext)) {
        scannedFiles.push(fullPath);
        const content = fs.readFileSync(fullPath, 'utf8');
        
        // 1. Check for Mojibake / garbled characters (\u00C3, Ã, etc.)
        if (content.includes('\u00C3') || content.includes('Ã') || content.includes('ï¿½') || content.includes('\uFFFD')) {
          mojibakeFindings.push({ file: fullPath });
        }
        
        // 2. Count Spanish accent mark target words
        for (const word in wordCounts) {
          if (content.includes(word)) {
            // Count occurrences
            const matches = content.split(word).length - 1;
            wordCounts[word] += matches;
            wordFileMatches[word].push({ file: path.relative(rootDir, fullPath), count: matches });
          }
        }
      }
    }
  }
}

console.log('--- STARTING VERIFICATION SCAN ---');
scan(rootDir);

console.log(`Total active project files scanned: ${scannedFiles.length}`);
console.log(`Mojibake / \\u00C3 occurrences found: ${mojibakeFindings.length}`);

console.log('\n--- SPANISH ACCENT MARK TARGET WORDS ---');
for (const [word, count] of Object.entries(wordCounts)) {
  console.log(`Word "${word}": ${count} total occurrences across ${wordFileMatches[word].length} files`);
}

// 3. Test Vehicle v5 VIN
console.log('\n--- VEHICLE V5 VIN ASSERTION ---');
const storeModulePath = path.join(rootDir, 'data/store.js');
// Import JSDOM environment for store initialization
import { JSDOM } from 'jsdom';
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', { url: 'http://localhost/' });
global.window = dom.window;
global.document = dom.window.document;
global.localStorage = {
  store: {},
  getItem(k) { return this.store[k] || null; },
  setItem(k, v) { this.store[k] = String(v); },
  removeItem(k) { delete this.store[k]; },
  clear() { this.store = {}; }
};

const store = await import('file:///' + storeModulePath.replace(/\\/g, '/'));
store.seedDemoData();
const v5 = store.Vehicles.find('v5');
console.log('v5 retrieved:', v5);
console.log(`v5.vin === '5YJSA1DG0DFP00123':`, v5 ? v5.vin === '5YJSA1DG0DFP00123' : false);

// 4. Test test.js output analysis
console.log('\n--- EXECUTING NODE TEST.JS ---');
let testOutput = '';
let exitCode = 0;
try {
  testOutput = execSync('node test.js', { cwd: rootDir, encoding: 'utf8' });
} catch (err) {
  testOutput = err.stdout + '\n' + err.stderr;
  exitCode = err.status || 1;
}

console.log(`Exit code: ${exitCode}`);
console.log(`Contains NaN strings: ${testOutput.includes('NaN')}`);
console.log(`Contains undefined strings: ${testOutput.includes('undefined')}`);
console.log(`Contains [object Object] strings: ${testOutput.includes('[object Object]')}`);

const passMatches = (testOutput.match(/\[PASS\]/g) || []).length;
console.log(`Total [PASS] assertion count: ${passMatches}`);
