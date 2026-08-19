// =====================================================
// AutoERP — Admin View Renderer (User Management)
// =====================================================

import { getUsersList, saveUserData, toggleUserActiveStatus, deleteUserData, getCompanyConfig, saveCompanyConfig } from '../../services/adminService.js';
import { fmt, fmtDate } from '../../utils/formatters.js';
import { safeCreateIcons } from '../../utils/dom.js';
import { showToast } from '../components/toast.js';
import { openModal, closeModal, confirmDialog } from '../components/modal.js';
import { go } from '../../core/router.js';
import { getCurrentUser } from '../../core/auth.js';

// All available modules that can be assigned
const ALL_MODULES = [
  { key: 'dashboard',     label: 'Dashboard',          icon: 'layout-dashboard', alwaysOn: true },
  { key: 'inventory',     label: 'Inventario',          icon: 'car',              alwaysOn: true },
  { key: 'sales',         label: 'Ventas',              icon: 'handshake',        alwaysOn: true },
  { key: 'payments',      label: 'Historial de Cobros', icon: 'wallet',           alwaysOn: true },
  { key: 'crm',           label: 'Clientes / CRM',      icon: 'users',            alwaysOn: true },
  { key: 'calendar',      label: 'Calendario',          icon: 'calendar',         alwaysOn: true },
  { key: 'financing',     label: 'Financiación',        icon: 'credit-card',      alwaysOn: false },
  { key: 'sellers',       label: 'Vendedores',          icon: 'trophy',           alwaysOn: false },
  { key: 'accounting',    label: 'Contabilidad',        icon: 'bar-chart-3',      alwaysOn: false },
  { key: 'notifications', label: 'Notificaciones',      icon: 'bell',             alwaysOn: false },
];

const DEFAULT_MODULES = ALL_MODULES.filter(m => m.alwaysOn).map(m => m.key);

function getRoleLabel(role) {
  const map = { manager: 'Gerente', seller: 'Vendedor', admin: 'Admin', administrative: 'Administrativo' };
  return map[role] || role;
}

function getRoleBadge(role) {
  const cls = role === 'manager' || role === 'admin' ? 'badge-gold' : role === 'seller' ? 'badge-info' : 'badge-neutral';
  return `<span class="badge ${cls}">${getRoleLabel(role)}</span>`;
}

function getModuleChips(allowedModules) {
  if (!allowedModules || allowedModules.length === 0) return '<span style="color:var(--text-muted);font-size:0.78rem;">Sin módulos</span>';
  const names = allowedModules.map(k => {
    const m = ALL_MODULES.find(x => x.key === k);
    return m ? m.label : k;
  });
  if (names.length <= 4) return names.map(n => `<span class="badge badge-neutral" style="font-size:0.7rem;">${n}</span>`).join(' ');
  return names.slice(0, 3).map(n => `<span class="badge badge-neutral" style="font-size:0.7rem;">${n}</span>`).join(' ') +
    ` <span class="badge badge-neutral" style="font-size:0.7rem;">+${names.length - 3} más</span>`;
}

export function renderUsers() {
  const container = document.getElementById('page-content');
  if (!container) return;

  const users = getUsersList();
  const currentUser = getCurrentUser();

  const content = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Gestión de Usuarios</h1>
        <p class="text-muted">Administrá los usuarios de tu empresa y sus accesos</p>
      </div>
      <div class="header-actions">
        <button class="btn btn-primary" id="btn-add-user">
          <i data-lucide="user-plus"></i> Nuevo Usuario
        </button>
      </div>
    </div>

    <!-- Role summary cards -->
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:1rem;margin-bottom:1.5rem;">
      <div class="card" style="padding:1rem;border-left:4px solid var(--gold);">
        <div style="font-size:0.78rem;color:var(--text-muted);margin-bottom:0.25rem;">Total Usuarios</div>
        <div style="font-size:1.6rem;font-weight:700;">${users.length}</div>
      </div>
      <div class="card" style="padding:1rem;border-left:4px solid var(--success);">
        <div style="font-size:0.78rem;color:var(--text-muted);margin-bottom:0.25rem;">Activos</div>
        <div style="font-size:1.6rem;font-weight:700;color:var(--success);">${users.filter(u => u.active !== false).length}</div>
      </div>
      <div class="card" style="padding:1rem;border-left:4px solid var(--info);">
        <div style="font-size:0.78rem;color:var(--text-muted);margin-bottom:0.25rem;">Vendedores</div>
        <div style="font-size:1.6rem;font-weight:700;">${users.filter(u => u.role === 'seller').length}</div>
      </div>
      <div class="card" style="padding:1rem;border-left:4px solid var(--warning);">
        <div style="font-size:0.78rem;color:var(--text-muted);margin-bottom:0.25rem;">Gerentes</div>
        <div style="font-size:1.6rem;font-weight:700;">${users.filter(u => u.role === 'manager' || u.role === 'admin').length}</div>
      </div>
    </div>

    <!-- Users table -->
    <div class="card">
      <div style="overflow-x:auto;">
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr style="border-bottom:1px solid var(--border);">
              <th style="padding:0.875rem 1rem;text-align:left;font-weight:500;color:var(--text-muted);font-size:0.8rem;">USUARIO</th>
              <th style="padding:0.875rem 1rem;text-align:left;font-weight:500;color:var(--text-muted);font-size:0.8rem;">ROL</th>
              <th style="padding:0.875rem 1rem;text-align:left;font-weight:500;color:var(--text-muted);font-size:0.8rem;">MÓDULOS ACTIVOS</th>
              <th style="padding:0.875rem 1rem;text-align:left;font-weight:500;color:var(--text-muted);font-size:0.8rem;">ESTADO</th>
              <th style="padding:0.875rem 1rem;text-align:right;font-weight:500;color:var(--text-muted);font-size:0.8rem;">ACCIONES</th>
            </tr>
          </thead>
          <tbody>
            ${users.map(u => {
              const isActive = u.active !== false;
              const isManager = u.role === 'manager' || u.role === 'admin';
              const modules = isManager ? ALL_MODULES.map(m => m.key) : (u.allowedModules || DEFAULT_MODULES);
              return `
              <tr style="border-bottom:1px solid var(--border);">
                <td style="padding:0.875rem 1rem;">
                  <div style="display:flex;align-items:center;gap:0.75rem;">
                    <div style="width:36px;height:36px;border-radius:50%;background:var(--bg-base);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;font-weight:600;font-size:0.82rem;color:var(--text-muted);flex-shrink:0;">
                      ${u.name.substring(0,2).toUpperCase()}
                    </div>
                    <div>
                      <div style="font-weight:500;font-size:0.9rem;">${u.name}</div>
                      <div style="font-size:0.78rem;color:var(--text-muted);">${u.email}</div>
                    </div>
                  </div>
                </td>
                <td style="padding:0.875rem 1rem;">${getRoleBadge(u.role)}</td>
                <td style="padding:0.875rem 1rem;">
                  <div style="display:flex;flex-wrap:wrap;gap:0.25rem;">
                    ${isManager ? '<span class="badge badge-gold" style="font-size:0.7rem;">Acceso Total</span>' : getModuleChips(modules)}
                  </div>
                </td>
                <td style="padding:0.875rem 1rem;">
                  <span class="badge ${isActive ? 'badge-success' : 'badge-danger'}">${isActive ? 'Activo' : 'Inactivo'}</span>
                </td>
                <td style="padding:0.875rem 1rem;text-align:right;">
                  <button class="btn btn-sm btn-ghost btn-edit-user" data-id="${u.id}" title="Editar permisos">
                    <i data-lucide="edit-2"></i>
                  </button>
                  <button class="btn btn-sm btn-ghost btn-toggle-user" data-id="${u.id}" title="${isActive ? 'Desactivar' : 'Activar'}">
                    <i data-lucide="power"></i>
                  </button>
                  <button class="btn btn-sm btn-ghost btn-delete-user" data-id="${u.id}" title="Eliminar" style="color:var(--danger);">
                    <i data-lucide="trash-2"></i>
                  </button>
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  container.innerHTML = content;
  safeCreateIcons({ nodes: [container] });

  document.getElementById('btn-add-user')?.addEventListener('click', () => openUserModal());

  container.querySelectorAll('.btn-edit-user').forEach(btn => {
    btn.addEventListener('click', () => openUserModal(btn.dataset.id));
  });

  container.querySelectorAll('.btn-toggle-user').forEach(btn => {
    btn.addEventListener('click', () => {
      const user = toggleUserActiveStatus(btn.dataset.id);
      if (user) {
        showToast(`Usuario ${user.active ? 'activado' : 'desactivado'}`, 'info');
        renderUsers();
      }
    });
  });

  container.querySelectorAll('.btn-delete-user').forEach(btn => {
    btn.addEventListener('click', () => {
      confirmDialog('¿Estás seguro de eliminar este usuario?', () => {
        deleteUserData(btn.dataset.id);
        showToast('Usuario eliminado', 'success');
        renderUsers();
      }, 'Eliminar Usuario');
    });
  });
}

function openUserModal(userId = null) {
  const users = getUsersList();
  const user = userId ? users.find(u => u.id === userId) : null;
  const isEdit = !!user;
  const isManagerRole = user && (user.role === 'manager' || user.role === 'admin');
  const currentModules = isEdit ? (user.allowedModules || DEFAULT_MODULES) : [...DEFAULT_MODULES];

  const modulesGrid = ALL_MODULES.map(m => {
    const checked = isManagerRole || currentModules.includes(m.key);
    const disabled = m.alwaysOn || isManagerRole;
    return `
      <label style="display:flex;align-items:center;gap:0.6rem;padding:0.5rem 0.625rem;border-radius:7px;background:var(--bg-base);cursor:${disabled ? 'default' : 'pointer'};border:1px solid var(--border);opacity:${disabled ? '0.6' : '1'};">
        <input type="checkbox" name="module-perm" value="${m.key}" ${checked ? 'checked' : ''} ${disabled ? 'disabled' : ''}
          style="width:15px;height:15px;accent-color:var(--gold);cursor:${disabled ? 'default' : 'pointer'};">
        <span style="font-size:0.8rem;">${m.label}</span>
      </label>
    `;
  }).join('');

  const modalHtml = `
    <div style="padding:1.5rem;max-height:80vh;overflow-y:auto;">
      <div class="form-grid" style="margin-bottom:1.25rem;">
        <div class="form-group" style="grid-column:span 2;">
          <label>Nombre completo</label>
          <input type="text" id="user-name" class="form-control" value="${isEdit ? user.name : ''}" required placeholder="Ej: Roberto López">
        </div>
        <div class="form-group">
          <label>Correo electrónico</label>
          <input type="email" id="user-email" class="form-control" value="${isEdit ? user.email : ''}" required placeholder="usuario@empresa.com">
        </div>
        <div class="form-group">
          <label>Contraseña ${isEdit ? '(dejar vacío para no cambiar)' : ''}</label>
          <input type="password" id="user-pass" class="form-control" ${isEdit ? '' : 'required'} placeholder="${isEdit ? '••••••••' : 'Contraseña'}">
        </div>
        <div class="form-group" style="grid-column:span 2;">
          <label>Rol</label>
          <select id="user-role" class="form-control">
            <option value="seller" ${isEdit && user.role === 'seller' ? 'selected' : ''}>Vendedor</option>
            <option value="manager" ${isEdit && (user.role === 'manager' || user.role === 'admin') ? 'selected' : ''}>Gerente</option>
          </select>
        </div>
      </div>

      <div id="modules-section" style="margin-bottom:1.25rem;${isManagerRole ? 'opacity:0.5;pointer-events:none;' : ''}">
        <div style="font-size:0.82rem;font-weight:600;color:var(--text-muted);margin-bottom:0.625rem;text-transform:uppercase;letter-spacing:0.05em;">
          Módulos con acceso
        </div>
        <div id="modules-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:0.4rem;">
          ${modulesGrid}
        </div>
        <p style="font-size:0.72rem;color:var(--text-muted);margin-top:0.5rem;">Los módulos en gris son accesos mínimos obligatorios y no se pueden desactivar.</p>
      </div>

      <div style="display:flex;justify-content:flex-end;gap:0.75rem;padding-top:0.75rem;border-top:1px solid var(--border);">
        <button class="btn btn-ghost" onclick="window._closeModal()">Cancelar</button>
        <button class="btn btn-primary" id="btn-save-user"><i data-lucide="save"></i> Guardar</button>
      </div>
    </div>
  `;

  openModal(isEdit ? 'Editar Usuario' : 'Nuevo Usuario', modalHtml, { width: '600px' });
  safeCreateIcons({ nodes: [document.getElementById('global-modal')] });

  // When role changes, update modules section
  document.getElementById('user-role')?.addEventListener('change', (e) => {
    const sec = document.getElementById('modules-section');
    if (!sec) return;
    if (e.target.value === 'manager') {
      sec.style.opacity = '0.5';
      sec.style.pointerEvents = 'none';
      document.querySelectorAll('input[name="module-perm"]').forEach(cb => cb.checked = true);
    } else {
      sec.style.opacity = '1';
      sec.style.pointerEvents = '';
      // Reset to defaults for seller
      document.querySelectorAll('input[name="module-perm"]').forEach(cb => {
        const mod = ALL_MODULES.find(m => m.key === cb.value);
        if (!mod?.alwaysOn) cb.checked = false;
      });
    }
  });

  document.getElementById('btn-save-user')?.addEventListener('click', () => {
    const name = document.getElementById('user-name').value.trim();
    const email = document.getElementById('user-email').value.trim();
    const pass = document.getElementById('user-pass').value;
    const role = document.getElementById('user-role').value;

    if (!name || !email || (!isEdit && !pass)) {
      showToast('Completá los campos obligatorios', 'warning');
      return;
    }

    const checkedModules = [...document.querySelectorAll('input[name="module-perm"]:checked')].map(cb => cb.value);
    const allowedModules = role === 'manager' ? ALL_MODULES.map(m => m.key) : checkedModules;

    saveUserData({ id: userId, name, email, password: pass, role, active: true, allowedModules });
    showToast(isEdit ? 'Usuario actualizado' : 'Usuario creado', 'success');
    closeModal();
    renderUsers();
  });
}

// ─── Settings View (separate module) ──────────────────
export function renderSettings() {
  const container = document.getElementById('page-content');
  if (!container) return;

  const config = getCompanyConfig();

  const content = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Configuración</h1>
        <p class="text-muted">Parámetros generales de tu empresa</p>
      </div>
      <div class="header-actions">
        <button class="btn btn-primary" id="btn-save-settings">
          <i data-lucide="save"></i> Guardar Cambios
        </button>
      </div>
    </div>

    <div class="card" style="margin-bottom:1.5rem;">
      <div style="display:flex;border-bottom:1px solid var(--border);">
        <button class="btn btn-ghost tab-btn active" data-tab="tab-empresa" style="border-radius:0;border-bottom:2px solid var(--gold);">Empresa</button>
        <button class="btn btn-ghost tab-btn" data-tab="tab-moneda" style="border-radius:0;">Moneda y Formato</button>
        <button class="btn btn-ghost tab-btn" data-tab="tab-dnit" style="border-radius:0;">DNIT / Facturación</button>
        <button class="btn btn-ghost tab-btn" data-tab="tab-sucursales" style="border-radius:0;">Sucursales</button>
      </div>

      <!-- TAB EMPRESA -->
      <div class="tab-content" id="tab-empresa" style="padding:1.5rem;">
        <div class="form-grid">
          <div class="form-group">
            <label>Nombre de la Empresa</label>
            <input type="text" id="cfg-companyName" class="form-control" value="${config.companyName || ''}">
          </div>
          <div class="form-group">
            <label>Iniciales del Logo</label>
            <input type="text" id="cfg-logoInitials" class="form-control" value="${config.logoInitials || ''}">
          </div>
          <div class="form-group">
            <label>RUC</label>
            <input type="text" id="cfg-ruc" class="form-control" value="${config.ruc || ''}">
          </div>
          <div class="form-group">
            <label>Teléfono</label>
            <input type="text" id="cfg-phone" class="form-control" value="${config.phone || ''}">
          </div>
          <div class="form-group" style="grid-column:span 2;">
            <label>Dirección</label>
            <input type="text" id="cfg-address" class="form-control" value="${config.address || ''}">
          </div>
          <div class="form-group" style="grid-column:span 2;">
            <label>Email de Contacto</label>
            <input type="email" id="cfg-email" class="form-control" value="${config.email || ''}">
          </div>
        </div>
      </div>

      <!-- TAB MONEDA -->
      <div class="tab-content" id="tab-moneda" style="padding:1.5rem;display:none;">
        <div class="form-grid">
          <div class="form-group">
            <label>Moneda Principal</label>
            <select id="cfg-currency" class="form-control">
              <option value="PYG" ${config.currency === 'PYG' ? 'selected' : ''}>Guaraníes (PYG)</option>
              <option value="USD" ${config.currency === 'USD' ? 'selected' : ''}>Dólares (USD)</option>
            </select>
          </div>
          <div class="form-group">
            <label>Cotización Base (PYG por USD)</label>
            <input type="number" id="cfg-exchange-rate" class="form-control" value="${config.globalExchangeRate || 7500}">
            <small style="color:var(--text-muted);">Se usa para unificar métricas en reportes.</small>
          </div>
        </div>
        <div style="margin-top:1rem;padding:1rem;background:var(--bg-base);border-radius:0.5rem;border:1px solid var(--border);">
          <p style="color:var(--text-muted);margin-bottom:0.5rem;">Vista Previa:</p>
          <p style="font-size:1.2rem;font-weight:600;" id="currency-preview">${fmt(12500000)}</p>
        </div>
      </div>

      <!-- TAB DNIT -->
      <div class="tab-content" id="tab-dnit" style="padding:1.5rem;display:none;">
        <div style="padding:1rem;background:rgba(59,130,246,0.08);border-left:4px solid var(--info);border-radius:4px;margin-bottom:1.5rem;display:flex;align-items:center;justify-content:space-between;">
          <div>
            <h4 style="color:var(--info);margin-bottom:0.25rem;">Integración DNIT</h4>
            <p style="color:var(--text-muted);font-size:0.9rem;">Modo demo. En producción se conectará con credenciales oficiales.</p>
          </div>
          <span class="badge badge-warning">MODO DEMO</span>
        </div>
        <div class="form-grid">
          <div class="form-group">
            <label>RUC Emisor SIFEN</label>
            <input type="text" class="form-control" value="${config.ruc || ''}" readonly style="background:var(--bg-base);cursor:not-allowed;">
          </div>
          <div class="form-group">
            <label>Ambiente</label>
            <select class="form-control">
              <option value="test">Testing (Sifen Test)</option>
              <option value="prod" disabled>Producción</option>
            </select>
          </div>
        </div>
      </div>

      <!-- TAB SUCURSALES -->
      <div class="tab-content" id="tab-sucursales" style="padding:1.5rem;display:none;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;">
          <h3 style="font-size:1.1rem;font-weight:500;">Sucursales Activas</h3>
          <button class="btn btn-sm btn-secondary" id="btn-new-branch"><i data-lucide="plus"></i> Nueva Sucursal</button>
        </div>
        <div class="card table-container">
          <table style="width:100%;border-collapse:collapse;">
            <thead>
              <tr style="border-bottom:1px solid var(--border);">
                <th style="padding:0.75rem;">Nombre</th>
                <th style="padding:0.75rem;">Dirección</th>
                <th style="padding:0.75rem;">Estado</th>
                <th style="padding:0.75rem;text-align:right;">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="padding:0.75rem;">${config.branch || 'Casa Matriz'}</td>
                <td style="padding:0.75rem;">${config.address || 'Central'}</td>
                <td style="padding:0.75rem;"><span class="badge badge-success">Activa</span></td>
                <td style="padding:0.75rem;text-align:right;">
                  <button class="btn btn-sm btn-ghost"><i data-lucide="edit"></i></button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  container.innerHTML = content;
  safeCreateIcons({ nodes: [container] });

  // Tabs
  container.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      container.querySelectorAll('.tab-btn').forEach(b => { b.classList.remove('active'); b.style.borderBottom = 'none'; });
      container.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
      e.currentTarget.classList.add('active');
      e.currentTarget.style.borderBottom = '2px solid var(--gold)';
      const el = document.getElementById(e.currentTarget.dataset.tab);
      if (el) el.style.display = 'block';
    });
  });

  document.getElementById('btn-save-settings')?.addEventListener('click', () => {
    const patch = {
      companyName: document.getElementById('cfg-companyName').value,
      logoInitials: document.getElementById('cfg-logoInitials').value,
      ruc: document.getElementById('cfg-ruc').value,
      phone: document.getElementById('cfg-phone').value,
      address: document.getElementById('cfg-address').value,
      email: document.getElementById('cfg-email').value,
      currency: document.getElementById('cfg-currency')?.value,
      globalExchangeRate: parseFloat(document.getElementById('cfg-exchange-rate')?.value) || 7500,
    };
    saveCompanyConfig(patch);
    showToast('Configuración guardada', 'success');
  });
}
