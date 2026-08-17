#!/usr/bin/env node
// fix_all_encoding.cjs - Fix all UTF-8 encoding corruption in the project
const fs = require('fs');
const path = require('path');

// Complete mapping of corrupted sequences to correct Spanish characters
const REPLACEMENTS = [
  ['Ã³', 'ó'], ['Ã±', 'ñ'], ['Ã­', 'í'], ['Ã¡', 'á'], ['Ã©', 'é'],
  ['Ãº', 'ú'], ['Ã¼', 'ü'],
  ['â€™', "'"], ['â€œ', '\u201c'], ['â€\u009d', '\u201d'], ['â€"', '\u2014'], ['â€"', '\u2013'],
  ['Â¡', '!'], ['Â¿', '?'], ['Â°', '°'],
];


// Files to scan (not node_modules)
const DIRS_TO_SCAN = [
  'src',
  'data', 
  'modules',
];
const ROOT_FILES = ['app.js', 'index.html'];

function fixFile(filePath) {
  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch (e) {
    console.log(`  SKIP (read error): ${filePath}`);
    return;
  }
  
  let original = content;
  for (const [from, to] of REPLACEMENTS) {
    content = content.split(from).join(to);
  }
  
  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`  FIXED: ${path.relative(process.cwd(), filePath)}`);
  }
}

function scanDir(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules') scanDir(fullPath);
    } else if (entry.isFile() && /\.(js|html|css)$/.test(entry.name)) {
      fixFile(fullPath);
    }
  }
}

console.log('🔧 Fixing UTF-8 encoding corruption...\n');

for (const dir of DIRS_TO_SCAN) {
  scanDir(dir);
}
for (const file of ROOT_FILES) {
  if (fs.existsSync(file)) fixFile(file);
}

console.log('\n✅ Encoding fix complete!');

// Verify
const remaining = [];
function verifyDir(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules') verifyDir(fullPath);
    } else if (entry.isFile() && /\.(js|html)$/.test(entry.name)) {
      const c = fs.readFileSync(fullPath, 'utf8');
      if (c.includes('Ã')) remaining.push(path.relative(process.cwd(), fullPath));
    }
  }
}
for (const dir of DIRS_TO_SCAN) verifyDir(dir);
for (const file of ROOT_FILES) {
  if (fs.existsSync(file)) {
    const c = fs.readFileSync(file, 'utf8');
    if (c.includes('Ã')) remaining.push(file);
  }
}

if (remaining.length === 0) {
  console.log('✅ VERIFICATION PASSED: Zero Ã sequences remaining.');
} else {
  console.log(`⚠️  ${remaining.length} files still have Ã sequences:`);
  remaining.forEach(f => console.log('  -', f));
}
