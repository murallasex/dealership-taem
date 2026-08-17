// =====================================================
// Milestone 4 - Challenger 2: Interactive State & DOM Stress Tester
// Empirical JS Stress Test Script using JSDOM
// =====================================================

import fs from 'fs';
import path from 'path';
import { JSDOM } from 'jsdom';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
let uncaughtErrors = [];

function assert(condition, message) {
  totalTests++;
  if (!condition) {
    failedTests++;
    console.error(`  ❌ [FAIL] ${message}`);
  } else {
    passedTests++;
    console.log(`  ✅ [PASS] ${message}`);
  }
}

// -----------------------------------------------------
// 1. Initialize JSDOM Environment
// -----------------------------------------------------
console.log('\n=====================================================');
console.log('1. INITIALIZING JSDOM & GLOBAL BROWSER MOCKS');
console.log('=====================================================');

const htmlPath = path.resolve('index.html');
const htmlContent = fs.readFileSync(htmlPath, 'utf8');

const dom = new JSDOM(htmlContent, {
  url: 'http://localhost/',
  referrer: 'http://localhost/',
  contentType: 'text/html',
  runScripts: 'dangerously',
  resources: 'usable'
});

global.window = dom.window;
global.document = dom.window.document;
global.location = dom.window.location;
global.HTMLElement = dom.window.HTMLElement;

try {
  Object.defineProperty(global, 'navigator', { value: dom.window.navigator, configurable: true, writable: true });
} catch (e) {}

// In-memory localStorage mock
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

// Mock lucide icons
global.lucide = { createIcons: () => {} };
dom.window.lucide = global.lucide;

// Global error handlers
dom.window.onerror = function (msg, url, line, col, error) {
  uncaughtErrors.push({ msg, url, line, col, error });
  console.error('[UNCAUGHT WINDOW ERROR]', msg, error);
};

process.on('uncaughtException', (err) => {
  uncaughtErrors.push({ msg: err.message, error: err });
  console.error('[UNCAUGHT PROCESS EXCEPTION]', err);
});

assert(global.document.getElementById('page-content') !== null, 'HTML shell loaded and #page-content container exists');

// -----------------------------------------------------
// 2. Dynamic Module Imports & Seeding
// -----------------------------------------------------
console.log('\n=====================================================');
console.log('2. LOADING APPLICATION MODULES & SEEDING DEMO DATA');
console.log('=====================================================');

let seedDemoData, AppState, subscribe, unsubscribe, notify, DB_KEYS, dbSet, dbGet, dbGetAll;
let Vehicles, Sales, Goals, Clients, Leads, CashBox, Notifications, Config, Sellers;
let navigate, parseRoute, registerRoutes;
let showToast, dismissToast;
let openModal, closeModal, confirmDialog;
let renderDashboard, renderInventoryList, renderInventoryDetail, renderInventoryForm;
let renderSalesPipeline, renderSaleDetail, renderSaleForm;
let renderSellersList, renderSellerDetail, renderGoals;
let renderCRMList, renderCRMDetail, renderLeadPipeline;
let renderFinancingPlans, renderInstallments;
let renderCashBox, renderReports;
let renderUsers, renderSettings;
let renderEmailTemplates, renderEmailHistory;
let filterVehicles, saveVehicle, deleteVehicle;
let advanceSaleStage, createSaleQuote;
let saveSellerGoal;

try {
  const storeModule = await import('./src/core/store.js');
  seedDemoData = storeModule.seedDemoData;
  AppState = storeModule.AppState;
  subscribe = storeModule.subscribe;
  unsubscribe = storeModule.unsubscribe;
  notify = storeModule.notify;
  DB_KEYS = storeModule.DB_KEYS;
  dbSet = storeModule.dbSet;
  dbGet = storeModule.dbGet;
  dbGetAll = storeModule.dbGetAll;
  Vehicles = storeModule.Vehicles;
  Sales = storeModule.Sales;
  Goals = storeModule.Goals;
  Clients = storeModule.Clients;
  Leads = storeModule.Leads;
  CashBox = storeModule.CashBox;
  Notifications = storeModule.Notifications;
  Config = storeModule.Config;
  Sellers = storeModule.Sellers;

  const routerModule = await import('./src/core/router.js');
  navigate = routerModule.navigate;
  parseRoute = routerModule.parseRoute;
  registerRoutes = routerModule.registerRoutes;

  const toastModule = await import('./src/ui/components/toast.js');
  showToast = toastModule.showToast;
  dismissToast = toastModule.dismissToast;

  const modalModule = await import('./src/ui/components/modal.js');
  openModal = modalModule.openModal;
  closeModal = modalModule.closeModal;
  confirmDialog = modalModule.confirmDialog;

  const dashView = await import('./src/ui/views/dashboardView.js');
  renderDashboard = dashView.renderDashboard;

  const invView = await import('./src/ui/views/inventoryView.js');
  renderInventoryList = invView.renderInventoryList;
  renderInventoryDetail = invView.renderInventoryDetail;
  renderInventoryForm = invView.renderInventoryForm;

  const salesView = await import('./src/ui/views/salesView.js');
  renderSalesPipeline = salesView.renderSalesPipeline;
  renderSaleDetail = salesView.renderSaleDetail;
  renderSaleForm = salesView.renderSaleForm;

  const sellersView = await import('./src/ui/views/sellersView.js');
  renderSellersList = sellersView.renderSellersList;
  renderSellerDetail = sellersView.renderSellerDetail;
  renderGoals = sellersView.renderGoals;

  const crmView = await import('./src/ui/views/crmView.js');
  renderCRMList = crmView.renderCRMList;
  renderCRMDetail = crmView.renderCRMDetail;
  renderLeadPipeline = crmView.renderLeadPipeline;

  const finView = await import('./src/ui/views/financingView.js');
  renderFinancingPlans = finView.renderFinancingPlans;
  renderInstallments = finView.renderInstallments;

  const accView = await import('./src/ui/views/accountingView.js');
  renderCashBox = accView.renderCashBox;
  renderReports = accView.renderReports;

  const admView = await import('./src/ui/views/adminView.js');
  renderUsers = admView.renderUsers;
  renderSettings = admView.renderSettings;

  const notifView = await import('./src/ui/views/notificationsView.js');
  renderEmailTemplates = notifView.renderEmailTemplates;
  renderEmailHistory = notifView.renderEmailHistory;

  const invService = await import('./src/services/inventoryService.js');
  filterVehicles = invService.filterVehicles;
  saveVehicle = invService.saveVehicle;
  deleteVehicle = invService.deleteVehicle;

  const salesService = await import('./src/services/salesService.js');
  advanceSaleStage = salesService.advanceSaleStage;
  createSaleQuote = salesService.createSaleQuote;

  const sellersService = await import('./src/services/sellersService.js');
  saveSellerGoal = sellersService.saveSellerGoal;

  // Seed demo data
  seedDemoData();
  assert(Vehicles.all().length > 0, `Store seeded successfully with ${Vehicles.all().length} vehicles`);
  assert(Sales.all().length > 0, `Store seeded successfully with ${Sales.all().length} sales`);

  // Register routes table in router
  registerRoutes({
    'dashboard': () => renderDashboard(),
    'inventory': () => renderInventoryList(),
    'inventory/new': () => renderInventoryForm(),
    'inventory/detail': (params) => renderInventoryDetail(params[0]),
    'inventory/edit': (params) => renderInventoryForm(params[0]),
    'sales': () => renderSalesPipeline(),
    'sales/new': () => renderSaleForm(),
    'sales/detail': (params) => renderSaleDetail(params[0]),
    'crm': () => renderCRMList(),
    'crm/leads': () => renderLeadPipeline(),
    'crm/pipeline': () => renderLeadPipeline(),
    'crm/detail': (params) => renderCRMDetail(params[0]),
    'financing': () => renderFinancingPlans(),
    'financing/installments': () => renderInstallments(),
    'sellers': () => renderSellersList(),
    'sellers/detail': (params) => renderSellerDetail(params[0]),
    'sellers/goals': () => renderGoals(),
    'notifications': () => renderEmailTemplates(),
    'notifications/history': () => renderEmailHistory(),
    'accounting': () => renderCashBox(),
    'accounting/reports': () => renderReports(),
    'reports': () => renderReports(),
    'admin': () => renderUsers(),
    'admin/settings': () => renderSettings(),
    'settings': () => renderSettings(),
  });

} catch (err) {
  console.error('Module loading exception:', err);
  assert(false, `Module loading succeeded: ${err.message}`);
}

// -----------------------------------------------------
// 3. SPA Route Navigation Stress Test
// -----------------------------------------------------
console.log('\n=====================================================');
console.log('3. SPA ROUTE NAVIGATION STRESS TEST');
console.log('=====================================================');

const routesToTest = [
  '#/dashboard',
  '#/inventory',
  '#/inventory/new',
  '#/inventory/detail/v1',
  '#/inventory/edit/v1',
  '#/inventory/detail/non_existent_id',
  '#/sales',
  '#/sales/new',
  '#/sales/detail/sale1',
  '#/sales/detail/non_existent_sale',
  '#/sellers',
  '#/sellers/detail/s1',
  '#/sellers/detail/non_existent_seller',
  '#/sellers/goals',
  '#/crm',
  '#/crm/leads',
  '#/crm/pipeline',
  '#/crm/detail/c1',
  '#/crm/detail/non_existent_client',
  '#/financing',
  '#/financing/installments',
  '#/accounting',
  '#/accounting/reports',
  '#/reports',
  '#/admin',
  '#/admin/settings',
  '#/settings',
  '#/notifications',
  '#/notifications/history',
  '#/unknown/route/404'
];

routesToTest.forEach((routeHash) => {
  try {
    navigate(routeHash);
    const content = document.getElementById('page-content');
    const html = content ? content.innerHTML : '';

    const hasContent = html.length > 0;
    const hasNoObjectString = !html.includes('[object Object]');
    const hasNoNaNString = !html.includes('NaN');
    const isFallback = routeHash.includes('unknown') && html.includes('Página no encontrada');
    const isModuleError = html.includes('Error al cargar el módulo');

    assert(hasContent && hasNoObjectString && hasNoNaNString && !isModuleError, 
      `Route "${routeHash}" rendered cleanly (Length: ${html.length} chars, No [object Object], No NaN)`);
  } catch (err) {
    assert(false, `Route "${routeHash}" caused exception: ${err.message}`);
  }
});

// -----------------------------------------------------
// 4. State Management & Reactive Pub/Sub Stress Test
// -----------------------------------------------------
console.log('\n=====================================================');
console.log('4. CORE STORE REACTIVE PUB/SUB & CRUD STRESS TEST');
console.log('=====================================================');

let genericChangeFired = 0;
let salesChangeFired = 0;
let vehiclesChangeFired = 0;

const unsub1 = subscribe('change', (data) => { genericChangeFired++; });
const unsub2 = subscribe(`change:${DB_KEYS.sales}`, (data) => { salesChangeFired++; });
const unsub3 = subscribe(`change:${DB_KEYS.vehicles}`, (data) => { vehiclesChangeFired++; });

// Test fault tolerance in subscribers (callback throwing error should not block others)
let faultToleranceSubscriberFired = false;
subscribe('change', () => { throw new Error('Simulated subscriber exception'); });
subscribe('change', () => { faultToleranceSubscriberFired = true; });

// Perform dbSet calls
dbSet(DB_KEYS.vehicles, Vehicles.all());
dbSet(DB_KEYS.sales, Sales.all());

assert(genericChangeFired >= 2, `Generic 'change' event listener fired ${genericChangeFired} times`);
assert(salesChangeFired >= 1, `Specific 'change:erp_sales' listener fired ${salesChangeFired} times`);
assert(vehiclesChangeFired >= 1, `Specific 'change:erp_vehicles' listener fired ${vehiclesChangeFired} times`);
assert(faultToleranceSubscriberFired === true, 'Pub/Sub system is fault-tolerant (failing subscriber did not block subsequent subscribers)');

// Test Unsubscribe
unsub1();
const countBefore = genericChangeFired;
dbSet(DB_KEYS.config, Config.get());
assert(genericChangeFired === countBefore, 'Unsubscribe successfully detached listener');

// -----------------------------------------------------
// 5. Dynamic State Mutations & Reactive DOM Updates
// -----------------------------------------------------
console.log('\n=====================================================');
console.log('5. DYNAMIC STATE MUTATIONS & DOM RE-RENDERING STRESS');
console.log('=====================================================');

// 5.1 Sales Mutations
console.log('--- 5.1 Sales State Mutations ---');
try {
  const initialSalesCount = Sales.all().length;
  const newSale = createSaleQuote({
    vehicleId: 'v1',
    clientId: 'c1',
    sellerId: 's1',
    totalPrice: 220000000,
    downPayment: 40000000,
    paymentType: 'financed_own',
    currency: 'PYG',
    notes: 'Stress test newly created sale'
  });

  assert(Sales.all().length === initialSalesCount + 1, `Sales count incremented from ${initialSalesCount} to ${Sales.all().length}`);
  
  // Advance stage
  const advanced = advanceSaleStage(newSale.id, 'quote');
  assert(advanced && advanced.nextStage === 'reservation', `Sale ${newSale.id} advanced stage from quote -> reservation`);

  // Re-render Sales Pipeline and verify DOM
  renderSalesPipeline();
  let domContent = document.getElementById('page-content').innerHTML;
  assert(domContent.includes(newSale.saleNumber), `Sales Pipeline DOM contains new sale number ${newSale.saleNumber}`);
  assert(!domContent.includes('[object Object]') && !domContent.includes('NaN'), 'Sales Pipeline DOM has no [object Object] or NaN');

  // Re-render Sale Detail
  renderSaleDetail(newSale.id);
  domContent = document.getElementById('page-content').innerHTML;
  assert(domContent.includes('₲ 220.000.000'), 'Sale Detail DOM formats 220.000.000 PYG total price correctly');
  assert(!domContent.includes('[object Object]') && !domContent.includes('NaN'), 'Sale Detail DOM has no [object Object] or NaN');

} catch (err) {
  assert(false, `Sales state mutation exception: ${err.message}`);
}

// 5.2 Seller Goals Mutations
console.log('--- 5.2 Seller Goals & Ranking Mutations ---');
try {
  saveSellerGoal({
    sellerId: 's1',
    period: new Date().toISOString().slice(0, 7),
    type: 'units',
    target: 10,
    result: 8,
    status: 'active'
  });

  // Test edge case: Goal with 0 target (prevent Division by Zero / NaN)
  saveSellerGoal({
    sellerId: 's2',
    period: new Date().toISOString().slice(0, 7),
    type: 'units',
    target: 0,
    result: 0,
    status: 'active'
  });

  renderGoals();
  let domContent = document.getElementById('page-content').innerHTML;
  assert(!domContent.includes('NaN'), 'renderGoals handles 0-target goal without NaN output');
  assert(domContent.includes('Metas y Ranking'), 'renderGoals rendered header correctly');

  renderSellerDetail('s1');
  domContent = document.getElementById('page-content').innerHTML;
  assert(!domContent.includes('NaN') && !domContent.includes('[object Object]'), 'renderSellerDetail rendered clean DOM for s1');

} catch (err) {
  assert(false, `Seller Goals mutation exception: ${err.message}`);
}

// 5.3 Vehicle Inventory Mutations
console.log('--- 5.3 Inventory Vehicle Mutations ---');
try {
  const createdVehicle = saveVehicle({
    vin: 'TESTVIN99988877766',
    brand: 'Audi',
    model: 'Q7',
    version: 'V6 TFSI',
    year: 2025,
    color: 'Negro Mamba',
    mileage: 0,
    condition: 'new',
    origin: 'imported',
    commercialStatus: 'available',
    purchaseCost: 350000000,
    importCosts: 25000000,
    prepCost: 3000000,
    commission: 10000000,
    suggestedPrice: 420000000,
    currency: 'PYG',
    branch: 'Casa Central'
  });

  assert(createdVehicle && createdVehicle.id, `Created vehicle with ID ${createdVehicle?.id}`);

  // Test Inventory List rendering with filter
  renderInventoryList();
  let domContent = document.getElementById('page-content').innerHTML;
  assert(domContent.includes('Audi Q7'), 'Inventory List includes newly created Audi Q7');

  // Test filtering
  const filtered = filterVehicles('Audi', 'new', 'available');
  assert(filtered.length === 1 && filtered[0].model === 'Q7', 'filterVehicles correctly retrieved Audi Q7');

  // Test deletion
  deleteVehicle(createdVehicle.id);
  assert(Vehicles.find(createdVehicle.id) === null, 'deleteVehicle successfully removed Audi Q7 from store');

} catch (err) {
  assert(false, `Inventory Vehicle mutation exception: ${err.message}`);
}

// -----------------------------------------------------
// 6. Modal Dialogs & Toast Component Stress Test
// -----------------------------------------------------
console.log('\n=====================================================');
console.log('6. MODAL DIALOGS & TOAST COMPONENT STRESS TEST');
console.log('=====================================================');

// 6.1 Modal Component
try {
  openModal('Stress Test Modal Title', '<p id="modal-test-body">Body HTML Content</p>', '<button id="modal-test-btn">Action</button>', 'modal-lg');
  const overlay = document.getElementById('global-modal');
  const titleEl = document.getElementById('modal-title');
  const bodyEl = document.getElementById('modal-body');

  assert(!overlay.classList.contains('hidden'), 'openModal opened global overlay (removed .hidden)');
  assert(titleEl.textContent === 'Stress Test Modal Title', 'openModal set modal title correctly');
  assert(bodyEl.innerHTML.includes('Body HTML Content'), 'openModal injected body HTML content');

  // Single argument openModal call
  openModal('<div id="single-arg-modal">Single Argument Content</div>');
  assert(bodyEl.innerHTML.includes('Single Argument Content'), 'openModal handles single HTML string argument');

  // Confirm dialog
  let confirmed = false;
  confirmDialog('Are you sure you want to test confirmation?', () => { confirmed = true; }, 'Confirm Test');
  const confirmBtn = document.getElementById('confirm-btn');
  assert(confirmBtn !== null, 'confirmDialog created #confirm-btn element');
  if (confirmBtn) confirmBtn.click();
  assert(confirmed === true, 'confirmDialog callback executed upon clicking confirm button');

  // Close modal
  closeModal();
  setTimeout(() => {
    assert(overlay.classList.contains('hidden'), 'closeModal hides modal overlay');
  }, 250);

} catch (err) {
  assert(false, `Modal component stress exception: ${err.message}`);
}

// 6.2 Toast Component
try {
  const toastTypes = ['info', 'success', 'warning', 'error'];
  for (let i = 0; i < 20; i++) {
    const type = toastTypes[i % toastTypes.length];
    showToast(`Rapid Stress Toast Message #${i+1}`, type, 1000);
  }

  const toastContainer = document.getElementById('toast-container');
  const toastCount = toastContainer ? toastContainer.querySelectorAll('.toast').length : 0;
  assert(toastCount >= 20, `showToast generated ${toastCount} toast DOM elements in rapid succession`);

} catch (err) {
  assert(false, `Toast component stress exception: ${err.message}`);
}

// -----------------------------------------------------
// 7. High-Frequency Rapid Interaction Harness
// -----------------------------------------------------
console.log('\n=====================================================');
console.log('7. HIGH-FREQUENCY AGGRESSIVE STRESS HARNESS (150 ITERATIONS)');
console.log('=====================================================');

try {
  let harnessErrors = 0;
  const sampleRoutes = ['#/dashboard', '#/inventory', '#/sales', '#/sellers', '#/crm', '#/financing', '#/accounting', '#/admin', '#/notifications'];

  for (let i = 0; i < 150; i++) {
    // 1. Pick a random route
    const targetRoute = sampleRoutes[i % sampleRoutes.length];
    navigate(targetRoute);

    // 2. Perform a state change every 10 iterations
    if (i % 10 === 0) {
      saveVehicle({
        vin: `STRESSVIN${i}`,
        brand: `Brand${i}`,
        model: `Model${i}`,
        year: 2024,
        mileage: i * 1000,
        condition: 'used',
        origin: 'direct',
        commercialStatus: 'available',
        purchaseCost: 50000000 + i * 1000000,
        suggestedPrice: 65000000 + i * 1000000,
        currency: 'PYG'
      });
    }

    // 3. Trigger toasts
    if (i % 15 === 0) {
      showToast(`Harness Toast #${i}`, 'info', 500);
    }

    // 4. Verify DOM validity
    const content = document.getElementById('page-content');
    if (content) {
      const html = content.innerHTML;
      if (html.includes('[object Object]') || html.includes('NaN') || html.includes('Error al cargar el módulo')) {
        harnessErrors++;
        console.error(`  [Harness Corruption at Iteration ${i} on ${targetRoute}]`);
      }
    }
  }

  assert(harnessErrors === 0, `Completed 150 aggressive stress iterations with 0 DOM corruptions or errors`);

} catch (err) {
  assert(false, `High-frequency stress harness exception: ${err.message}`);
}

// -----------------------------------------------------
// 8. Final Verdict & Report Generation
// -----------------------------------------------------
console.log('\n=====================================================');
console.log('8. EMPIRICAL STRESS TEST RESULTS');
console.log('=====================================================');
console.log(`Total Assertions Run: ${totalTests}`);
console.log(`Passed: ${passedTests}`);
console.log(`Failed: ${failedTests}`);
console.log(`Uncaught Exception Count: ${uncaughtErrors.length}`);

if (failedTests > 0 || uncaughtErrors.length > 0) {
  console.error('\n❌ STRESS TEST VERDICT: FAIL');
  process.exit(1);
} else {
  console.log('\n✅ STRESS TEST VERDICT: PASS');
  process.exit(0);
}
