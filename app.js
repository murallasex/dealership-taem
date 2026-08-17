// =====================================================
// AutoERP — Main Application Router & Bootstrap
// =====================================================

import { seedDemoData, Users, Config, AppState } from './src/core/store.js';
import { fmt, fmtDate, getActiveCurrency, setActiveCurrency } from './src/utils/formatters.js';
import { safeCreateIcons } from './src/utils/dom.js';
import { showToast } from './src/ui/components/toast.js';
import { openModal, closeModal, confirmDialog, initModalSystem } from './src/ui/components/modal.js';
import { initSidebar } from './src/ui/components/sidebar.js';
import { updateNotifBadge } from './src/ui/components/header.js';
import { initRouter, navigate, go } from './src/core/router.js';

// Import all module renderers from src/ui/views/
import { renderDashboard } from './src/ui/views/dashboardView.js';
import { renderInventoryList, renderInventoryDetail, renderInventoryForm } from './src/ui/views/inventoryView.js';
import { renderSalesPipeline, renderSaleDetail, renderSaleForm } from './src/ui/views/salesView.js';
import { renderCRMList, renderCRMDetail, renderLeadPipeline } from './src/ui/views/crmView.js';
import { renderFinancingPlans, renderInstallments } from './src/ui/views/financingView.js';
import { renderSellersList, renderSellerDetail, renderGoals } from './src/ui/views/sellersView.js';
import { renderEmailTemplates, renderEmailHistory } from './src/ui/views/notificationsView.js';
import { renderCashBox, renderReports } from './src/ui/views/accountingView.js';
import { renderUsers, renderSettings } from './src/ui/views/adminView.js';

// Re-export utilities & modal system for backward compatibility
export { AppState, showToast, openModal, closeModal, confirmDialog, fmt, fmtDate, go };

// Route Table Mapping
const ROUTES = {
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
};

// =====================================================
// Currency Switcher
// =====================================================
function initCurrencySwitch() {
  const cfg = Config.get();
  AppState.currency = cfg.currency || 'PYG';

  const pygBtn = document.getElementById('btn-pyg');
  const usdBtn = document.getElementById('btn-usd');
  if (!pygBtn || !usdBtn) return;

  function update(cur) {
    AppState.currency = cur;
    setActiveCurrency(cur);
    pygBtn.classList.toggle('active', cur === 'PYG');
    usdBtn.classList.toggle('active', cur === 'USD');
    navigate(window.location.hash, updateNotifBadge);
  }

  pygBtn.addEventListener('click', () => update('PYG'));
  usdBtn.addEventListener('click', () => update('USD'));
}

// =====================================================
// Login System
// =====================================================
function initLogin() {
  const form = document.getElementById('login-form');
  if (!form) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email')?.value.trim();
    const password = document.getElementById('login-password')?.value;
    const user = Users.byEmail(email);
    if (user && user.password === password) {
      AppState.currentUser = user;
      document.getElementById('login-screen')?.classList.add('hidden');
      document.getElementById('app')?.classList.remove('hidden');
      
      ['sidebar-user-name', 'header-user-name'].forEach(id => { const el = document.getElementById(id); if (el) el.textContent = user.name; });
      ['user-avatar-sidebar', 'header-user-avatar'].forEach(id => { const el = document.getElementById(id); if (el) el.textContent = user.avatar || user.name[0]; });
      const roleEl = document.getElementById('user-role-sidebar');
      if (roleEl) roleEl.textContent = { admin: 'Administrador', seller: 'Vendedor', administrative: 'Administrativo' }[user.role] || user.role;
      
      const cfg = Config.get();
      const compEl = document.getElementById('company-name-sidebar');
      if (compEl) compEl.textContent = cfg.companyName || 'AutoERP';

      navigate(window.location.hash || '#/dashboard', updateNotifBadge);
    } else {
      showToast('Credenciales incorrectas. Intente nuevamente.', 'error');
    }
  });
}

// =====================================================
// Logout System
// =====================================================
function initLogout() {
  const logoutBtn = document.getElementById('logout-btn');
  if (!logoutBtn) return;
  logoutBtn.addEventListener('click', () => {
    AppState.currentUser = null;
    document.getElementById('app')?.classList.add('hidden');
    document.getElementById('login-screen')?.classList.remove('hidden');
  });
}

// =====================================================
// Bootstrap Application
// =====================================================
async function boot() {
  // Seed demo data first
  seedDemoData();

  // Init UI components & handlers
  initSidebar();
  initCurrencySwitch();
  initModalSystem();

  // Init auth
  initLogin();
  initLogout();

  // Init Router with notification badge updater
  initRouter(ROUTES, updateNotifBadge);

  // Init lucide icons on login screen
  safeCreateIcons({});

  // Header notification button
  document.getElementById('header-notif-btn')?.addEventListener('click', () => go('#/notifications/history'));

  // Theme Toggle
  const btn = document.getElementById('theme-toggle-btn');
  const body = document.body;
  if (typeof localStorage !== 'undefined') {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
      body.classList.add('theme-light');
      if (btn) btn.innerHTML = '<i data-lucide="moon"></i>';
    }
  }
  if (btn) {
    btn.addEventListener('click', () => {
      body.classList.toggle('theme-light');
      const isLight = body.classList.contains('theme-light');
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('theme', isLight ? 'light' : 'dark');
      }
      btn.innerHTML = isLight ? '<i data-lucide="moon"></i>' : '<i data-lucide="sun"></i>';
      safeCreateIcons({ nodes: [btn] });
    });
  }

  // Initial navigation
  if (typeof window !== 'undefined' && window.location) {
    navigate(window.location.hash, updateNotifBadge);
  }
}

boot();
