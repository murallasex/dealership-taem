// =====================================================
// Auth & Role System — Frontend Demo (localStorage)
// =====================================================

export const ROLES = {
  DEVELOPER: 'developer',
  MANAGER: 'manager',
  SELLER: 'seller',
};

const SESSION_KEY = 'erp_session';
const COMPANIES_KEY = 'erp_companies';
const PLATFORM_USERS_KEY = 'erp_platform_users';

// ─── Session ──────────────────────────────────────────
export function getSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function setSession(data) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(data));
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

export function isLoggedIn() {
  return !!getSession();
}

export function getCurrentUser() {
  return getSession()?.user || null;
}

export function getCurrentCompany() {
  return getSession()?.company || null;
}

export function hasRole(role) {
  const user = getCurrentUser();
  if (!user) return false;
  if (user.role === ROLES.DEVELOPER) return true; // developer has all roles
  return user.role === role;
}

export function isDeveloper() { return getCurrentUser()?.role === ROLES.DEVELOPER; }
export function isManager() { return getCurrentUser()?.role === ROLES.MANAGER || isDeveloper(); }
export function isSeller() { return !!getCurrentUser(); }

// ─── Companies Store ──────────────────────────────────
export function getCompanies() {
  try {
    const raw = localStorage.getItem(COMPANIES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function saveCompanies(companies) {
  localStorage.setItem(COMPANIES_KEY, JSON.stringify(companies));
}

export function getCompany(id) {
  return getCompanies().find(c => c.id === id) || null;
}

export function upsertCompany(company) {
  const list = getCompanies();
  const idx = list.findIndex(c => c.id === company.id);
  if (idx >= 0) list[idx] = company;
  else list.push(company);
  saveCompanies(list);
}

export function deleteCompany(id) {
  const list = getCompanies().filter(c => c.id !== id);
  saveCompanies(list);
}

export function pauseCompany(id) {
  const c = getCompany(id);
  if (c) { c.status = 'paused'; upsertCompany(c); }
}

export function activateCompany(id) {
  const c = getCompany(id);
  if (c) { c.status = 'active'; upsertCompany(c); }
}

// ─── Platform Users Store (all users across companies) ─
export function getPlatformUsers() {
  try {
    const raw = localStorage.getItem(PLATFORM_USERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function savePlatformUsers(users) {
  localStorage.setItem(PLATFORM_USERS_KEY, JSON.stringify(users));
}

export function findUserByEmail(email) {
  return getPlatformUsers().find(u => u.email === email) || null;
}

export function getUsersByCompany(companyId) {
  return getPlatformUsers().filter(u => u.companyId === companyId);
}

export function upsertPlatformUser(user) {
  const list = getPlatformUsers();
  const idx = list.findIndex(u => u.id === user.id);
  if (idx >= 0) list[idx] = user;
  else list.push(user);
  savePlatformUsers(list);
}

// ─── Seed Demo Data ────────────────────────────────────
export function seedAuthData() {
  const existing = getCompanies();
  if (existing.length > 0) return; // already seeded

  const companies = [
    {
      id: 'comp_alpha',
      name: 'Auto Central PY',
      slug: 'auto-central-py',
      status: 'active',
      plan: 'pro',
      subscriptionDue: '2025-09-01',
      createdAt: new Date(Date.now() - 90 * 86400000).toISOString(),
      color: '#c9a227',
    },
    {
      id: 'comp_beta',
      name: 'Garage Norte',
      slug: 'garage-norte',
      status: 'active',
      plan: 'basic',
      subscriptionDue: '2025-08-15',
      createdAt: new Date(Date.now() - 45 * 86400000).toISOString(),
      color: '#3b82f6',
    },
    {
      id: 'comp_gamma',
      name: 'Premier Motors',
      slug: 'premier-motors',
      status: 'paused',
      plan: 'basic',
      subscriptionDue: '2025-07-01',
      createdAt: new Date(Date.now() - 120 * 86400000).toISOString(),
      color: '#ef4444',
    },
  ];
  saveCompanies(companies);

  const users = [
    // Developer (no company)
    {
      id: 'usr_dev',
      companyId: null,
      name: 'Dev Admin',
      email: 'dev@platform.com',
      password: 'dev123',
      role: ROLES.DEVELOPER,
      avatar: 'D',
    },
    // Auto Central PY
    {
      id: 'usr_mgr1',
      companyId: 'comp_alpha',
      name: 'Gerardo Martínez',
      email: 'gerente@autocentral.com',
      password: 'manager123',
      role: ROLES.MANAGER,
      avatar: 'G',
    },
    {
      id: 'usr_sel1',
      companyId: 'comp_alpha',
      name: 'Roberto López',
      email: 'roberto@autocentral.com',
      password: 'seller123',
      role: ROLES.SELLER,
      avatar: 'R',
    },
    {
      id: 'usr_sel2',
      companyId: 'comp_alpha',
      name: 'Ana Giménez',
      email: 'ana@autocentral.com',
      password: 'seller123',
      role: ROLES.SELLER,
      avatar: 'A',
    },
    // Garage Norte
    {
      id: 'usr_mgr2',
      companyId: 'comp_beta',
      name: 'Carlos Rodas',
      email: 'gerente@garagenorte.com',
      password: 'manager123',
      role: ROLES.MANAGER,
      avatar: 'C',
    },
    {
      id: 'usr_sel3',
      companyId: 'comp_beta',
      name: 'Luis Fernández',
      email: 'luis@garagenorte.com',
      password: 'seller123',
      role: ROLES.SELLER,
      avatar: 'L',
    },
  ];
  savePlatformUsers(users);
}

// ─── Login Logic ───────────────────────────────────────
export function attemptLogin(email, password) {
  const user = findUserByEmail(email);
  if (!user || user.password !== password) {
    return { success: false, error: 'Credenciales incorrectas' };
  }

  let company = null;
  if (user.companyId) {
    company = getCompany(user.companyId);
    if (!company) return { success: false, error: 'Empresa no encontrada' };
  }

  setSession({ user, company });
  return { success: true, user, company };
}
