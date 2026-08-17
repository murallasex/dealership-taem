import fs from 'fs';
import path from 'path';
import { JSDOM } from 'jsdom';

// Initialize JSDOM
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
} catch (e) {}

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

global.lucide = { createIcons: () => {} };
dom.window.lucide = global.lucide;

// Import store and module functions
const { seedDemoData, dbSet } = await import('../../data/store.js');
const { renderDashboard } = await import('../../modules/dashboard/dashboard.js');
const { renderSellersList, renderSellerDetail, renderGoals } = await import('../../modules/sellers/sellers.js');

const results = [];

function runTest(testName, setupFn, renderFn) {
  try {
    localStorage.clear();
    setupFn();
    renderFn();
    const content = document.getElementById('page-content')?.innerHTML || '';
    
    const errors = [];
    if (content.includes('NaN')) errors.push('Contains "NaN" string');
    if (content.includes('undefined')) errors.push('Contains "undefined" string');
    if (content.includes('[object Object]')) errors.push('Contains "[object Object]" artifact');
    if (content.includes('Error al cargar el módulo')) errors.push('Rendered error screen');

    if (errors.length > 0) {
      results.push({ testName, status: 'FAIL_OUTPUT_ARTIFACT', details: errors.join(', ') });
      console.log(`❌ [FAIL ARTIFACT] ${testName}: ${errors.join(', ')}`);
    } else {
      results.push({ testName, status: 'PASS', details: 'Rendered cleanly' });
      console.log(`✅ [PASS] ${testName}`);
    }
  } catch (err) {
    results.push({ testName, status: 'EXCEPTION', details: `${err.name}: ${err.message}\n${err.stack}` });
    console.log(`💥 [EXCEPTION] ${testName}: ${err.name} - ${err.message}`);
  }
}

console.log('=== STARTING EMPIRICAL ADVERSARIAL STRESS SUITE PART 2 ===\n');

// 1. String zero purchasePrice in Dashboard margin calculation
runTest('Dashboard - String purchasePrice "0"', () => {
  dbSet('erp_seeded', true);
  dbSet('erp_vehicles', [{ id: 'v1', commercialStatus: 'sold', purchasePrice: '0', salePrice: 100 }]);
}, renderDashboard);

// 2. Goal target = 0 with result = 0 in renderGoals()
runTest('Goals - Goal target=0, result=0', () => {
  dbSet('erp_seeded', true);
  dbSet('erp_sellers', [{ id: 's1', name: 'Seller 1', email: 's1@test.com', active: true }]);
  dbSet('erp_goals', [{ id: 'g1', sellerId: 's1', period: new Date().toISOString().slice(0, 7), type: 'units', target: 0, result: 0 }]);
  dbSet('erp_sales', []);
}, renderGoals);

// 3. Goal target = 0 in renderSellersList()
runTest('Sellers List - Goal target=0', () => {
  dbSet('erp_seeded', true);
  dbSet('erp_sellers', [{ id: 's1', name: 'Seller 1', email: 's1@test.com', active: true, hireDate: '2026-01-01' }]);
  dbSet('erp_goals', [{ id: 'g1', sellerId: 's1', period: new Date().toISOString().slice(0, 7), type: 'units', target: 0, result: 0 }]);
  dbSet('erp_sales', []);
}, renderSellersList);

// 4. Seller missing email in renderSellersList()
runTest('Sellers List - Seller missing email', () => {
  dbSet('erp_seeded', true);
  dbSet('erp_sellers', [{ id: 's1', name: 'Seller 1', active: true, hireDate: '2026-01-01' }]);
  dbSet('erp_goals', []);
  dbSet('erp_sales', []);
}, renderSellersList);

// 5. Sale with date property missing in renderSellersList (using seed sales structure)
runTest('Sellers List - Sales with createdAt only (no date property)', () => {
  dbSet('erp_seeded', true);
  dbSet('erp_sellers', [{ id: 's1', name: 'Seller 1', email: 's1@test.com', active: true, hireDate: '2026-01-01' }]);
  dbSet('erp_sales', [{ id: 'sale1', sellerId: 's1', stage: 'contract', createdAt: new Date().toISOString() }]);
}, renderSellersList);

// 6. Seller detail with sales missing date property (using seed sales structure)
runTest('Seller Detail - Sales with createdAt only (no date property)', () => {
  dbSet('erp_seeded', true);
  dbSet('erp_sellers', [{ id: 's1', name: 'Seller 1', email: 's1@test.com', active: true, hireDate: '2026-01-01' }]);
  dbSet('erp_sales', [{ id: 'sale1', sellerId: 's1', stage: 'contract', createdAt: new Date().toISOString() }]);
}, () => renderSellerDetail('s1'));

console.log('\n=== TEST SUITE SUMMARY ===');
let failCount = 0;
results.forEach(r => {
  if (r.status !== 'PASS') {
    failCount++;
    console.log(`\n[${r.status}] ${r.testName}`);
    console.log(`Details: ${r.details}`);
  }
});

console.log(`\nTotal Tests: ${results.length} | Passed: ${results.length - failCount} | Failed/Exceptions: ${failCount}`);
