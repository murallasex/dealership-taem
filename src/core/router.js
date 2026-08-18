// =====================================================
// AutoERP — Core Hash Router
// =====================================================

import { safeCreateIcons } from '../utils/dom.js';

let routesTable = {};
let routeGuard = null;

export function registerRoutes(routes) {
  routesTable = { ...routesTable, ...routes };
}

export function parseRoute(hash) {
  const cleanHash = (hash || '').replace('#/', '');
  const path = cleanHash.split('/').filter(Boolean);
  const base = path[0] || 'dashboard';
  const sub = path[1];
  const key = sub ? `${base}/${sub}` : base;
  const params = path.slice(2);
  return { key, base, params };
}

export function navigate(hash, notifCallback = null) {
  if (!hash || hash === '#') hash = '#/dashboard';
  const { key, base, params } = parseRoute(hash);

  if (routeGuard) {
    const allowed = routeGuard(key, base, hash, notifCallback);
    if (!allowed) return;
  }

  // Update active nav item
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  const activeNav = document.querySelector(`.nav-item[data-route="${base}"]`);
  if (activeNav) activeNav.classList.add('active');

  // Update breadcrumb
  const routeNames = {
    dashboard: 'Dashboard', inventory: 'Inventario', sales: 'Ventas',
    crm: 'Clientes / CRM', financing: 'Financiación', sellers: 'Vendedores',
    accounting: 'Contabilidad', notifications: 'Notificaciones', admin: 'Administración'
  };
  const breadcrumbEl = document.getElementById('breadcrumb-root');
  if (breadcrumbEl) breadcrumbEl.textContent = routeNames[base] || base;

  const content = document.getElementById('page-content');
  if (content) {
    content.classList.add('is-swapping');
    content.innerHTML = `<div class="loading-spinner"><div class="spinner"></div><p>Cargando...</p></div>`;
  }

  const removeSwap = () => {
    if (content) {
      setTimeout(() => content.classList.remove('is-swapping'), 50);
    }
  };

  const handler = routesTable[key] || routesTable[base];
  if (handler) {
    try {
      const result = handler(params);
      if (result instanceof Promise) {
        result.then(html => {
          if (html && content) { content.innerHTML = html; }
          if (content) safeCreateIcons({ nodes: [content] });
          removeSwap();
        })
        .catch(err => {
          if (content) content.innerHTML = `<div class="empty-state"><p>Error al cargar el módulo.</p></div>`;
          console.error(err);
          removeSwap();
        });
      } else {
        if (result && content) { content.innerHTML = result; }
        if (content) safeCreateIcons({ nodes: [content] });
        removeSwap();
      }
    } catch (err) {
      console.error(err);
      if (content) content.innerHTML = `<div class="empty-state"><p>Error al cargar el módulo.</p></div>`;
      removeSwap();
    }
  } else {
    if (content) {
      content.innerHTML = `<div class="empty-state"><div class="empty-state-icon"><i data-lucide="map-pin-off"></i></div><h3>Página no encontrada</h3><p>La ruta "${hash}" no existe.</p></div>`;
      safeCreateIcons({ nodes: [content] });
    }
    removeSwap();
  }

  if (typeof notifCallback === 'function') {
    notifCallback();
  }
}

export function go(hash) {
  window.location.hash = hash;
}

export function initRouter(routes, notifCallback = null, guardFn = null) {
  registerRoutes(routes);
  routeGuard = guardFn;
  window.addEventListener('hashchange', () => navigate(window.location.hash, notifCallback));
}
