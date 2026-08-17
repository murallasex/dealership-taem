import fs from 'fs';
import path from 'path';
import { JSDOM } from 'jsdom';

let hasError = false;
function assert(condition, message) {
  if (!condition) {
    console.error(`[FAIL] ${message}`);
    hasError = true;
  } else {
    console.log(`[PASS] ${message}`);
  }
}

// 1. Initialize JSDOM with index.html shell
const htmlPath = path.resolve('index.html');
const htmlContent = fs.readFileSync(htmlPath, 'utf8');

const dom = new JSDOM(htmlContent, {
  url: 'http://localhost/',
  referrer: 'http://localhost/',
  contentType: 'text/html'
});

global.window = dom.window;
global.document = dom.window.document;
global.location = dom.window.location;
global.HTMLElement = dom.window.HTMLElement;
try {
  Object.defineProperty(global, 'navigator', { value: dom.window.navigator, configurable: true, writable: true });
} catch (e) {
  // Ignore if global.navigator is not redefinable
}

// Mock localStorage with in-memory storage dictionary
const storage = new Map();
global.localStorage = {
  getItem: (k) => storage.get(k) || null,
  setItem: (k, v) => storage.set(k, String(v)),
  removeItem: (k) => storage.delete(k),
  clear: () => storage.clear()
};
try {
  Object.defineProperty(dom.window, 'localStorage', { value: global.localStorage, configurable: true, writable: true });
} catch (e) {}

// Mock lucide icons global
global.lucide = { createIcons: () => {} };
dom.window.lucide = global.lucide;

console.log('JSDOM and global test environment initialized.');

// 2. Dynamic module loading to prevent ESM static import hoisting failures
try {
  const { seedDemoData } = await import('./data/store.js');
  seedDemoData();

  const { renderInventoryList } = await import('./modules/inventory/inventory.js');
  const { renderDashboard } = await import('./modules/dashboard/dashboard.js');
  const { renderSellersList, renderSellerDetail, renderGoals } = await import('./modules/sellers/sellers.js');

  // Test UTF-8 Encoding Check across all .js and .html files
  console.log('\n--- Running UTF-8 Encoding Checks ---');
  let corruptedFiles = [];
  const targetCorruptChar = '\u00C3';
  function scanDir(dir) {
    const files = fs.readdirSync(dir);
    files.forEach(f => {
      const full = path.join(dir, f);
      if (f === 'node_modules' || f === '.git' || f === '.agents' || f === 'fix_utf8.js') return;
      const stat = fs.statSync(full);
      if (stat.isDirectory()) {
        scanDir(full);
      } else if (f.endsWith('.js') || f.endsWith('.html')) {
        const text = fs.readFileSync(full, 'utf8');
        if (text.includes(targetCorruptChar)) {
          corruptedFiles.push(full);
        }
      }
    });
  }
  scanDir(process.cwd());
  assert(corruptedFiles.length === 0, `0 '\\u00C3' characters exist across all .js and .html files (found ${corruptedFiles.length} corrupted files: ${corruptedFiles.join(', ')})`);

  // Test Inventory Module Rendering
  console.log('\n--- Testing Inventory Module Rendering ---');
  try {
    renderInventoryList();
    const content = document.getElementById('page-content')?.innerHTML || '';
    assert(content.length > 0, 'renderInventoryList populated #page-content');
    assert(!content.includes('Error al cargar el módulo'), 'renderInventoryList executed without error state');
  } catch (err) {
    console.error('Inventory module exception:', err);
    hasError = true;
  }

  // Test Dashboard Module Rendering
  console.log('\n--- Testing Dashboard Module Rendering ---');
  try {
    renderDashboard();
    const content = document.getElementById('page-content')?.innerHTML || '';
    assert(content.length > 0, 'renderDashboard populated #page-content');
    assert(!content.includes('Error al cargar el módulo'), 'renderDashboard executed without error screen');
    assert(!content.includes('NaN'), 'renderDashboard output contains no NaN strings');
    assert(!content.includes('undefined'), 'renderDashboard output contains no undefined strings');
    assert(!content.includes('[object Object]'), 'renderDashboard output contains no [object Object] artifacts');
    assert(content.includes('Buenos días') || content.includes('Buenas tardes'), 'renderDashboard contains expected greeting header');
  } catch (err) {
    console.error('Dashboard module exception:', err);
    hasError = true;
  }

  // Test Sellers Module Rendering
  console.log('\n--- Testing Sellers Module Rendering ---');
  try {
    renderSellersList();
    const content = document.getElementById('page-content')?.innerHTML || '';
    assert(content.length > 0, 'renderSellersList populated #page-content');
    assert(!content.includes('Error al cargar el módulo'), 'renderSellersList executed without error screen');
    assert(!content.includes('NaN'), 'renderSellersList output contains no NaN strings');
    assert(!content.includes('undefined'), 'renderSellersList output contains no undefined strings');
    assert(!content.includes('[object Object]'), 'renderSellersList output contains no [object Object] artifacts');
  } catch (err) {
    console.error('Sellers list module exception:', err);
    hasError = true;
  }

  try {
    renderSellerDetail('s1');
    const content = document.getElementById('page-content')?.innerHTML || '';
    assert(content.length > 0, 'renderSellerDetail populated #page-content');
    assert(!content.includes('Error al cargar el módulo'), 'renderSellerDetail executed without error screen');
    assert(!content.includes('NaN'), 'renderSellerDetail output contains no NaN strings');
    assert(!content.includes('undefined'), 'renderSellerDetail output contains no undefined strings');
    assert(!content.includes('[object Object]'), 'renderSellerDetail output contains no [object Object] artifacts');
    assert(content.includes('₲ 370.000.000'), 'renderSellerDetail calculates non-zero total sales amount (₲ 370.000.000)');
  } catch (err) {
    console.error('Seller detail module exception:', err);
    hasError = true;
  }

  try {
    renderGoals();
    const content = document.getElementById('page-content')?.innerHTML || '';
    assert(content.length > 0, 'renderGoals populated #page-content');
    assert(!content.includes('Error al cargar el módulo'), 'renderGoals executed without error screen');
    assert(!content.includes('NaN'), 'renderGoals output contains no NaN strings');
    assert(!content.includes('undefined'), 'renderGoals output contains no undefined strings');
    assert(!content.includes('[object Object]'), 'renderGoals output contains no [object Object] artifacts');
  } catch (err) {
    console.error('Goals module exception:', err);
    hasError = true;
  }

} catch (err) {
  console.error('Fatal test setup exception:', err);
  hasError = true;
}

if (hasError) {
  console.error('\n❌ TEST RUN FAILED');
  process.exit(1);
} else {
  console.log('\n✅ ALL TESTS PASSED SUCCESSFULLY');
  process.exit(0);
}
