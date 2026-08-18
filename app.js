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

// Auth system
import {
  seedAuthData, attemptLogin, clearSession, getSession,
  getCurrentUser, getCurrentCompany, getCompany,
  isDeveloper, isManager, ROLES
} from './src/core/auth.js';

// Import all module renderers
import { renderDashboard } from './src/ui/views/dashboardView.js';
import { renderInventoryList, renderInventoryDetail, renderInventoryForm } from './src/ui/views/inventoryView.js';
import { renderSalesPipeline, renderSaleDetail, renderSaleForm } from './src/ui/views/salesView.js';
import { renderCRMList, renderCRMDetail, renderLeadPipeline } from './src/ui/views/crmView.js';
import { renderFinancingPlans, renderInstallments } from './src/ui/views/financingView.js';
import { renderSellersList, renderSellerDetail, renderGoals } from './src/ui/views/sellersView.js';
import { renderEmailTemplates, renderEmailHistory } from './src/ui/views/notificationsView.js';
import { renderCashBox, renderReports, renderExpenses } from './src/ui/views/accountingView.js';
import { renderCalendar } from './src/ui/views/calendarView.js';
import { renderUsers, renderSettings } from './src/ui/views/adminView.js';
import { renderPlatformView } from './src/ui/views/platformView.js';
import { renderTermsOfUse, renderSupport } from './src/ui/views/legalSupportView.js';

export { AppState, showToast, openModal, closeModal, confirmDialog, fmt, fmtDate, go };

// ─── Route Guard ─────────────────────────────────────────
// Returns true if the current user is allowed to view the route
function canAccess(route) {
  const user = getCurrentUser();
  if (!user) return false;
  const role = user.role;

  // Developer solo puede ver la plataforma (no accede a datos de empresas por temas legales)
  if (role === ROLES.DEVELOPER) {
    return route === 'platform';
  }

  // Platform view only for developer
  if (route === 'platform') return false;

  // Manager-only routes
  const managerRoutes = ['financing', 'sellers', 'accounting', 'accounting/reports', 'accounting/expenses', 'reports', 'notifications', 'notifications/history', 'admin', 'admin/settings', 'settings'];
  if (managerRoutes.some(r => route.startsWith(r))) {
    return role === ROLES.MANAGER;
  }

  // Seller and above can access everything else
  return true;
}

// ─── Route Table ──────────────────────────────────────────
const ROUTES = {
  'platform':                () => renderPlatformView(),
  'dashboard':               () => renderDashboard(),
  'inventory':               () => renderInventoryList(),
  'inventory/new':           () => renderInventoryForm(),
  'inventory/detail':        (p) => renderInventoryDetail(p[0]),
  'inventory/edit':          (p) => renderInventoryForm(p[0]),
  'sales':                   () => renderSalesPipeline(),
  'sales/new':               () => renderSaleForm(),
  'sales/detail':            (p) => renderSaleDetail(p[0]),
  'crm':                     () => renderCRMList(),
  'crm/leads':               () => renderLeadPipeline(),
  'crm/pipeline':            () => renderLeadPipeline(),
  'crm/detail':              (p) => renderCRMDetail(p[0]),
  'financing':               () => renderFinancingPlans(),
  'financing/installments':  () => renderInstallments(),
  'sellers':                 () => renderSellersList(),
  'sellers/detail':          (p) => renderSellerDetail(p[0]),
  'sellers/goals':           () => renderGoals(),
  'notifications':           () => renderEmailTemplates(),
  'notifications/history':   () => renderEmailHistory(),
  'accounting':              () => renderCashBox(),
  'accounting/expenses':     () => renderExpenses(),
  'accounting/reports':      () => renderReports(),
  'reports':                 () => renderReports(),
  'calendar':                () => renderCalendar(),
  'admin':                   () => renderUsers(),
  'admin/settings':          () => renderSettings(),
  'settings':                () => renderSettings(),
  'support':                 () => renderSupport(),
  'legal/terms':             () => renderTermsOfUse(),
};

// ─── Currency Switcher ────────────────────────────────────
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

// ─── Apply Role Visibility to Sidebar ────────────────────
function applySidebarRoles() {
  const user = getCurrentUser();
  if (!user) return;
  const role = user.role;

  document.querySelectorAll('[data-role-required]').forEach(el => {
    const required = el.dataset.roleRequired;
    let visible = false;

    if (role === ROLES.DEVELOPER) {
      visible = (required === 'developer'); // Developer solo ve panel developer
    } else if (required === 'developer') {
      visible = false; // solo developer puede ver esto
    } else if (required === 'manager') {
      visible = role === ROLES.MANAGER;
    } else if (required === 'seller') {
      visible = true; // seller y manager ven esto
    }

    el.style.display = visible ? '' : 'none';
  });
}

// ─── Show App after login ─────────────────────────────────
function showApp(user, company) {
  document.getElementById('login-screen')?.classList.add('hidden');
  document.getElementById('suspended-screen')?.classList.add('hidden');
  document.getElementById('app')?.classList.remove('hidden');

  // Fill in user info on sidebar/header
  ['user-name-sidebar', 'header-user-name'].forEach(id => {
    const el = document.getElementById(id); if (el) el.textContent = user.name;
  });
  ['user-avatar-sidebar', 'header-user-avatar'].forEach(id => {
    const el = document.getElementById(id); if (el) el.textContent = user.avatar || user.name[0];
  });

  const roleLabels = { developer: 'Developer', manager: 'Gerente', seller: 'Vendedor' };
  const roleEl = document.getElementById('user-role-sidebar');
  if (roleEl) roleEl.textContent = roleLabels[user.role] || user.role;

  const compEl = document.getElementById('company-name-sidebar');
  if (compEl) compEl.textContent = user.role === ROLES.DEVELOPER ? 'Plataforma' : (company?.name || 'Empresa');

  // Apply role-based sidebar visibility
  applySidebarRoles();

  // Navigate
  const defaultRoute = user.role === ROLES.DEVELOPER ? '#/platform' : '#/dashboard';
  navigate(window.location.hash || defaultRoute, updateNotifBadge);
}

// ─── Show Suspended Screen ────────────────────────────────
function showSuspended(company) {
  document.getElementById('login-screen')?.classList.add('hidden');
  document.getElementById('app')?.classList.add('hidden');
  document.getElementById('suspended-screen')?.classList.remove('hidden');
  const nameEl = document.getElementById('suspended-company-name');
  if (nameEl) nameEl.textContent = company?.name || 'esta empresa';
  safeCreateIcons({ nodes: [document.getElementById('suspended-screen')] });
}

// ─── Login System ─────────────────────────────────────────
function initLogin() {
  // Populate demo accounts
  const demoContainer = document.getElementById('demo-accounts');
  if (demoContainer) {
    const demos = [
      { email: 'dev@platform.com',          pass: 'dev123',      label: 'Developer (plataforma completa)', color: '#3b82f6' },
      { email: 'gerente@autocentral.com',   pass: 'manager123',  label: 'Gerente — Auto Central PY',       color: '#c9a227' },
      { email: 'roberto@autocentral.com',   pass: 'seller123',   label: 'Vendedor — Auto Central PY',      color: '#10b981' },
      { email: 'gerente@garagenorte.com',   pass: 'manager123',  label: 'Gerente — Garage Norte',          color: '#8b5cf6' },
    ];
    demoContainer.innerHTML = demos.map(d => `
      <button type="button" class="demo-account-btn" data-email="${d.email}" data-pass="${d.pass}"
        style="display:flex;align-items:center;gap:0.6rem;background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:8px;padding:0.45rem 0.75rem;cursor:pointer;text-align:left;font-size:0.78rem;width:100%;transition:border-color 150ms;">
        <span style="width:8px;height:8px;border-radius:50%;background:${d.color};flex-shrink:0;"></span>
        <span style="color:var(--text-muted);">${d.label}</span>
      </button>
    `).join('');

    demoContainer.addEventListener('click', (e) => {
      const btn = e.target.closest('.demo-account-btn');
      if (!btn) return;
      document.getElementById('login-email').value = btn.dataset.email;
      document.getElementById('login-password').value = btn.dataset.pass;
    });
  }

  const form = document.getElementById('login-form');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email')?.value.trim();
    const password = document.getElementById('login-password')?.value;
    const errorEl = document.getElementById('login-error');

    const result = attemptLogin(email, password);
    if (!result.success) {
      if (errorEl) { errorEl.textContent = result.error; errorEl.style.display = 'block'; }
      return;
    }
    if (errorEl) errorEl.style.display = 'none';

    const { user, company } = result;
    AppState.currentUser = user;

    // Check if company is suspended (non-developer users only)
    if (user.role !== ROLES.DEVELOPER && company?.status === 'paused') {
      showSuspended(company);
      return;
    }

    showApp(user, company);
  });

  // Suspended screen logout
  document.getElementById('btn-suspended-logout')?.addEventListener('click', () => {
    clearSession();
    document.getElementById('suspended-screen')?.classList.add('hidden');
    document.getElementById('login-screen')?.classList.remove('hidden');
  });
}

// ─── Logout System ────────────────────────────────────────
function initLogout() {
  document.getElementById('logout-btn')?.addEventListener('click', () => {
    clearSession();
    AppState.currentUser = null;
    document.getElementById('app')?.classList.add('hidden');
    document.getElementById('login-screen')?.classList.remove('hidden');
  });
}

// ─── Route Guard (before each navigation) ────────────────
function routeGuard(key, base, hash, notifCallback) {
  const user = getCurrentUser();
  if (!user) return true; // Let it navigate, maybe to login or dashboard where it handles no-user

  // 1. Check if company is paused
  if (user.role !== ROLES.DEVELOPER) {
    const company = getCompany(user.companyId);
    if (company && company.status === 'paused') {
      showSuspended(company);
      // Change hash without triggering infinite loop, or just stay
      if (window.location.hash !== '') {
        history.replaceState(null, null, ' ');
      }
      return false; // block navigation
    }
  }

  // 2. Check Role permissions
  if (!canAccess(key) && !canAccess(base)) {
    const fallback = user.role === ROLES.DEVELOPER ? '#/platform' : '#/dashboard';
    showToast('No tienes permiso para acceder a esta sección', 'warning');
    go(fallback);
    return false; // block current navigation
  }

  return true; // allow
}

// ─── Bootstrap ────────────────────────────────────────────
async function boot() {
  // Seed auth demo data before anything else
  seedAuthData();
  seedDemoData();

  // Init UI components
  initSidebar();
  initCurrencySwitch();
  initModalSystem();
  initLogin();
  initLogout();

  // Custom router with role guard
  initRouter(ROUTES, updateNotifBadge, routeGuard);

  // Init lucide icons
  safeCreateIcons({});

  // Header notif button
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
      if (typeof localStorage !== 'undefined') localStorage.setItem('theme', isLight ? 'light' : 'dark');
      btn.innerHTML = isLight ? '<i data-lucide="moon"></i>' : '<i data-lucide="sun"></i>';
      safeCreateIcons({ nodes: [btn] });
    });
  }

  // Check if there's a persisted session
  const session = getSession();
  if (session) {
    const { user, company } = session;
    AppState.currentUser = user;

    // Re-check company status in case it was paused since last login
    const freshCompany = user.companyId ? getCompany(user.companyId) : null;
    if (user.role !== ROLES.DEVELOPER && freshCompany?.status === 'paused') {
      showSuspended(freshCompany);
    } else {
      showApp(user, freshCompany || company);
    }
  } else {
    navigate(window.location.hash, updateNotifBadge);
  }
}

boot();
