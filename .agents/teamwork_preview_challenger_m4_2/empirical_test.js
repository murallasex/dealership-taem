import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const projectRoot = path.resolve('c:/Users/thiag/.gemini/antigravity/scratch/Dealership Magnament');

console.log('=== EMPIRICAL UT8 & HARNESS VALIDATION SUITE ===\n');

// -------------------------------------------------------------
// TASK 1: Byte-level and character-level search for 'Ã' characters
// -------------------------------------------------------------
console.log('--- TASK 1: Byte-Level & Character-Level UTF-8 Scan ---');

const extensions = ['.js', '.cjs', '.mjs', '.html', '.json', '.md'];
const ignoredDirs = ['node_modules', '.git', '.agents'];

let filesScanned = 0;
let corruptFilesChar = [];
let corruptFilesByte = [];
let fffdFiles = [];
let fileList = [];

function scanDirectory(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!ignoredDirs.includes(entry.name)) {
        scanDirectory(fullPath);
      }
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (extensions.includes(ext)) {
        filesScanned++;
        fileList.push(fullPath);
        
        // 1. Character-level search
        const contentStr = fs.readFileSync(fullPath, 'utf8');
        if (contentStr.includes('Ã') || contentStr.includes('\u00C3')) {
          corruptFilesChar.push({ path: fullPath, count: (contentStr.match(/\u00C3/g) || []).length });
        }
        if (contentStr.includes('\uFFFD')) {
          fffdFiles.push(fullPath);
        }

        // 2. Byte-level search for 0xC3 0x83 (UTF-8 bytes for 'Ã')
        const buf = fs.readFileSync(fullPath);
        for (let i = 0; i < buf.length - 1; i++) {
          if (buf[i] === 0xC3 && buf[i + 1] === 0x83) {
            corruptFilesByte.push({ path: fullPath, offset: i });
            break;
          }
        }
      }
    }
  }
}

scanDirectory(projectRoot);

console.log(`Files scanned: ${filesScanned}`);
console.log(`Character-level 'Ã' matches: ${corruptFilesChar.length}`);
if (corruptFilesChar.length > 0) {
  console.log('Corrupted files (char level):', corruptFilesChar);
}
console.log(`Byte-level 0xC3 0x83 matches: ${corruptFilesByte.length}`);
if (corruptFilesByte.length > 0) {
  console.log('Corrupted files (byte level):', corruptFilesByte);
}
console.log(`Replacement char (\\uFFFD) matches: ${fffdFiles.length}`);

// -------------------------------------------------------------
// TASK 2: Spanish Text Integrity Verification
// -------------------------------------------------------------
console.log('\n--- TASK 2: Spanish Text Integrity Check ---');

const spanishKeywords = [
  'Gestión',
  'Vehículos',
  'Año',
  'Descripción',
  'Categoría',
  '₲',
  'Financiamiento',
  'Vendedores',
  'Notificaciones',
  'Configuración',
  'Estadísticas',
  'Teléfono',
  'Dirección'
];

let wordCounts = {};
spanishKeywords.forEach(k => wordCounts[k] = 0);

fileList.forEach(filePath => {
  const relPath = path.relative(projectRoot, filePath);
  const content = fs.readFileSync(filePath, 'utf8');
  spanishKeywords.forEach(keyword => {
    const matches = content.split(keyword).length - 1;
    if (matches > 0) {
      wordCounts[keyword] += matches;
    }
  });
});

console.log('Spanish Keyword Counts across project files:');
console.table(wordCounts);

// Check sample occurrences of special characters to verify exact byte sequences
const sampleFile = path.join(projectRoot, 'modules/inventory/inventory.js');
const indexHtmlFile = path.join(projectRoot, 'index.html');
const storeJsFile = path.join(projectRoot, 'data/store.js');

function verifySpecialCharBytes(filePath, label) {
  if (fs.existsSync(filePath)) {
    const buf = fs.readFileSync(filePath);
    const str = fs.readFileSync(filePath, 'utf8');
    console.log(`\nVerifying UTF-8 bytes in ${label} (${path.relative(projectRoot, filePath)}):`);
    
    // Check ₲ (Guaraní symbol: U+20B2 -> UTF-8 bytes 0xE2 0x82 0xB2)
    if (str.includes('₲')) {
      const idx = str.indexOf('₲');
      console.log(`  [PASS] '₲' found in ${label}. Visual char: '₲', CodePoint: U+${str.charCodeAt(idx).toString(16).toUpperCase()}`);
    }
    
    // Check 'ó' (U+00F3 -> UTF-8 bytes 0xC3 0xB3)
    if (str.includes('Gestión')) {
      console.log(`  [PASS] 'Gestión' found in ${label}. Correctly encoded UTF-8.`);
    }
    // Check 'í' (U+00ED -> UTF-8 bytes 0xC3 0xAD)
    if (str.includes('Vehículos')) {
      console.log(`  [PASS] 'Vehículos' found in ${label}. Correctly encoded UTF-8.`);
    }
    // Check 'ñ' (U+00F1 -> UTF-8 bytes 0xC3 0xB1)
    if (str.includes('Año')) {
      console.log(`  [PASS] 'Año' found in ${label}. Correctly encoded UTF-8.`);
    }
  }
}

verifySpecialCharBytes(sampleFile, 'inventory.js');
verifySpecialCharBytes(indexHtmlFile, 'index.html');
verifySpecialCharBytes(storeJsFile, 'store.js');

// -------------------------------------------------------------
// TASK 3: Verification of test.js Exit Code on Assertion Failure
// -------------------------------------------------------------
console.log('\n--- TASK 3: test.js Exit Code Validation ---');

// 3a. Run normal test.js
try {
  console.log('Executing standard `node test.js`...');
  const output = execSync('node test.js', { cwd: projectRoot, encoding: 'utf8' });
  console.log('Standard run status: SUCCESS (Exit code 0)');
} catch (err) {
  console.error('Standard run failed unexpectedly:', err.status);
}

// 3b. Test assertion failure behavior by modifying test.js temporarily or running a modified copy
const testJsPath = path.join(projectRoot, 'test.js');
const testJsContent = fs.readFileSync(testJsPath, 'utf8');

// Inject a failing assertion right before process.exit checks
const injectedContent = testJsContent.replace(
  "assert(corruptedFiles.length === 0,",
  "assert(false, 'ADVERSARIAL INJECTED FAILURE TEST'); assert(corruptedFiles.length === 0,"
);

const tempTestPath = path.join(projectRoot, 'temp_failing_test.js');
fs.writeFileSync(tempTestPath, injectedContent, 'utf8');

let failTestExitCode = null;
let failTestOutput = '';
try {
  console.log('Executing failing test harness `node temp_failing_test.js`...');
  failTestOutput = execSync('node temp_failing_test.js', { cwd: projectRoot, encoding: 'utf8', stdio: 'pipe' });
  failTestExitCode = 0;
} catch (err) {
  failTestExitCode = err.status;
  failTestOutput = err.stdout + '\n' + err.stderr;
} finally {
  if (fs.existsSync(tempTestPath)) {
    fs.unlinkSync(tempTestPath);
  }
}

console.log(`Failing test exit code received: ${failTestExitCode}`);
if (failTestExitCode === 1) {
  console.log('  [PASS] test.js correctly exits with exit code 1 when an assertion fails.');
} else {
  console.error(`  [FAIL] Expected exit code 1, but got ${failTestExitCode}`);
}

console.log('\n=== EMPIRICAL VALIDATION COMPLETE ===');
