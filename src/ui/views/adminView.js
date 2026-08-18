// =====================================================
// AutoERP — Admin View Renderer
// =====================================================

import { getUsersList, saveUserData, toggleUserActiveStatus, deleteUserData, getCompanyConfig, saveCompanyConfig } from '../../services/adminService.js';
import { fmt, fmtDate } from '../../utils/formatters.js';
import { safeCreateIcons } from '../../utils/dom.js';
import { showToast } from '../components/toast.js';
import { openModal, closeModal, confirmDialog } from '../components/modal.js';
import { go } from '../../core/router.js';

export function renderUsers() {
  const container = document.getElementById('page-content');
  if (!container) return;

  const users = getUsersList();

  let content = `
    <div class="page-header">
      <h1 class="page-title">Gestión de Usuarios</h1>
      <div class="header-actions">
        <button class="btn btn-secondary" id="btn-goto-settings">
          <i data-lucide="settings"></i> Configuración
        </button>
        <button class="btn btn-primary" id="btn-add-user">
          <i data-lucide="plus"></i> Nuevo Usuario
        </button>
      </div>
    </div>

    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem; margin-bottom: 1.5rem;">
      <div class="card">
        <div class="card-header">
          <h3 class="card-title"><i data-lucide="shield"></i> Admin</h3>
        </div>
        <div style="padding: 1rem; color: var(--text-muted);">Acceso total a todas las funciones y configuraciones.</div>
      </div>
      <div class="card">
        <div class="card-header">
          <h3 class="card-title"><i data-lucide="user"></i> Vendedor</h3>
        </div>
        <div style="padding: 1rem; color: var(--text-muted);">Inventario (lectura), Ventas, CRM, y gestión de sus propias ventas.</div>
      </div>
      <div class="card">
        <div class="card-header">
          <h3 class="card-title"><i data-lucide="file-text"></i> Administrativo</h3>
        </div>
        <div style="padding: 1rem; color: var(--text-muted);">Contabilidad, Financiación, y permisos de lectura general.</div>
      </div>
    </div>

    <div class="card">
      <div class="table-container">
        <table class="table-wrap">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Email</th>
              <th>Rol</th>
              <th>Estado</th>
              <th>Último Acceso</th>
              <th style="text-align: right;">Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${users.map(u => `
              <tr>
                <td>
                  <div style="display: flex; align-items: center; gap: 0.75rem;">
                    <div style="width: 32px; height: 32px; border-radius: 50%; background: var(--bg-card); display: flex; align-items: center; justify-content: center; border: 1px solid var(--border); font-weight: 600; font-size: 0.8rem; color: var(--text-muted);">
                      ${u.name.substring(0, 2).toUpperCase()}
                    </div>
                    ${u.name}
                  </div>
                </td>
                <td>${u.email}</td>
                <td>
                  <span class="badge ${u.role === 'admin' ? 'badge-gold' : u.role === 'seller' ? 'badge-info' : 'badge-neutral'}">
                    ${u.role === 'admin' ? 'Admin' : u.role === 'seller' ? 'Vendedor' : 'Administrativo'}
                  </span>
                </td>
                <td>
                  <span class="badge ${u.active ? 'badge-success' : 'badge-danger'}">
                    ${u.active ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td>${u.createdAt ? fmtDate(u.createdAt) : fmtDate(new Date())}</td>
                <td style="text-align: right;">
                  <button class="btn btn-sm btn-ghost btn-edit-user" data-id="${u.id}" title="Editar">
                    <i data-lucide="edit"></i>
                  </button>
                  <button class="btn btn-sm btn-ghost btn-toggle-user" data-id="${u.id}" title="Cambiar Estado">
                    <i data-lucide="power"></i>
                  </button>
                  <button class="btn btn-sm btn-ghost btn-delete-user" data-id="${u.id}" title="Eliminar" style="color: var(--danger-color);">
                    <i data-lucide="trash-2"></i>
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
    <div style="margin-top: 1.5rem; text-align: center; color: var(--text-muted); font-size: 0.9rem;">
      La gestión avanzada de permisos estará disponible en la versión empresarial.
    </div>
  `;

  container.innerHTML = content;
  safeCreateIcons({ nodes: [container] });

  document.getElementById('btn-goto-settings')?.addEventListener('click', () => {
    go('#/admin/settings');
  });

  document.getElementById('btn-add-user')?.addEventListener('click', () => {
    openUserModal();
  });

  container.querySelectorAll('.btn-edit-user').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.closest('button').dataset.id;
      openUserModal(id);
    });
  });

  container.querySelectorAll('.btn-toggle-user').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.closest('button').dataset.id;
      const user = toggleUserActiveStatus(id);
      if (user) {
        showToast(`Usuario marcado como ${user.active ? 'Activo' : 'Inactivo'}`, 'info');
        renderUsers();
      }
    });
  });

  container.querySelectorAll('.btn-delete-user').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.closest('button').dataset.id;
      confirmDialog('¿Está seguro de eliminar este usuario?', () => {
        deleteUserData(id);
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

  const modalHtml = `
    <div style="padding: 1.5rem;">
      <h2>${isEdit ? 'Editar Usuario' : 'Nuevo Usuario'}</h2>
      <div class="form-grid" style="margin-top: 1rem;">
        <div class="form-group" style="grid-column: span 2;">
          <label>Nombre</label>
          <input type="text" id="user-name" class="form-control" value="${isEdit ? user.name : ''}" required>
        </div>
        <div class="form-group">
          <label>Email</label>
          <input type="email" id="user-email" class="form-control" value="${isEdit ? user.email : ''}" required>
        </div>
        <div class="form-group">
          <label>Contraseña</label>
          <input type="password" id="user-pass" class="form-control" placeholder="${isEdit ? 'Dejar en blanco para no cambiar' : ''}" ${isEdit ? '' : 'required'}>
        </div>
        <div class="form-group">
          <label>Rol</label>
          <select id="user-role" class="form-control">
            <option value="admin" ${isEdit && user.role === 'admin' ? 'selected' : ''}>Admin</option>
            <option value="seller" ${isEdit && user.role === 'seller' ? 'selected' : ''}>Vendedor</option>
            <option value="administrative" ${isEdit && user.role === 'administrative' ? 'selected' : ''}>Administrativo</option>
          </select>
        </div>
        <div class="form-group" style="display: flex; align-items: center; gap: 0.5rem; margin-top: 1.5rem;">
          <input type="checkbox" id="user-active" ${!isEdit || user.active ? 'checked' : ''}>
          <label for="user-active" style="margin: 0;">Usuario Activo</label>
        </div>
      </div>
      <div style="display: flex; justify-content: flex-end; gap: 1rem; margin-top: 2rem;">
        <button class="btn btn-secondary" onclick="window._closeModal()">Cancelar</button>
        <button class="btn btn-primary" id="btn-save-user">Guardar</button>
      </div>
    </div>
  `;

  openModal(isEdit ? 'Editar Usuario' : 'Nuevo Usuario', modalHtml);

  document.getElementById('btn-save-user')?.addEventListener('click', () => {
    const name = document.getElementById('user-name').value;
    const email = document.getElementById('user-email').value;
    const pass = document.getElementById('user-pass').value;
    const role = document.getElementById('user-role').value;
    const active = document.getElementById('user-active').checked;

    if (!name || !email || (!isEdit && !pass)) {
      showToast('Por favor, complete los campos obligatorios', 'error');
      return;
    }

    saveUserData({ id: userId, name, email, password: pass, role, active });
    showToast(isEdit ? 'Usuario actualizado exitosamente' : 'Usuario creado exitosamente', 'success');
    closeModal();
    renderUsers();
  });
}

export function renderSettings() {
  const container = document.getElementById('page-content');
  if (!container) return;

  const config = getCompanyConfig();

  let content = `
    <div class="page-header">
      <h1 class="page-title">Configuración de la Empresa</h1>
      <div class="header-actions">
        <button class="btn btn-primary" id="btn-save-settings">
          <i data-lucide="save"></i> Guardar Cambios
        </button>
      </div>
    </div>

    <div class="card" style="margin-bottom: 1.5rem;">
      <div style="display: flex; border-bottom: 1px solid var(--border);">
        <button class="btn btn-ghost tab-btn active" data-tab="tab-empresa" style="border-radius: 0; border-bottom: 2px solid var(--primary-color);">Empresa</button>
        <button class="btn btn-ghost tab-btn" data-tab="tab-moneda" style="border-radius: 0;">Moneda y Formato</button>
        <button class="btn btn-ghost tab-btn" data-tab="tab-dnit" style="border-radius: 0;">DNIT / Facturación Electrónica</button>
        <button class="btn btn-ghost tab-btn" data-tab="tab-sucursales" style="border-radius: 0;">Sucursales</button>
      </div>

      <!-- TAB EMPRESA -->
      <div class="tab-content" id="tab-empresa" style="padding: 1.5rem;">
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
          <div class="form-group" style="grid-column: span 2;">
            <label>Dirección</label>
            <input type="text" id="cfg-address" class="form-control" value="${config.address || ''}">
          </div>
          <div class="form-group" style="grid-column: span 2;">
            <label>Email de Contacto</label>
            <input type="email" id="cfg-email" class="form-control" value="${config.email || ''}">
          </div>
        </div>
      </div>

      <!-- TAB MONEDA -->
      <div class="tab-content" id="tab-moneda" style="padding: 1.5rem; display: none;">
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
            <small style="color: var(--text-muted);">Se usa para unificar las métricas en reportes.</small>
          </div>
        </div>
        <div style="margin-top: 1rem; padding: 1rem; background: var(--bg-base); border-radius: 0.5rem; border: 1px solid var(--border);">
          <p style="color: var(--text-muted); margin-bottom: 0.5rem;">Vista Previa de Formato:</p>
          <p style="font-size: 1.2rem; font-weight: 600;" id="currency-preview">${fmt(12500000)}</p>
        </div>
      </div>

      <!-- TAB DNIT -->
      <div class="tab-content" id="tab-dnit" style="padding: 1.5rem; display: none;">
        <div style="padding: 1rem; background: rgba(59, 130, 246, 0.1); border-left: 4px solid var(--info-color); margin-bottom: 1.5rem; display: flex; align-items: center; justify-content: space-between;">
          <div>
            <h4 style="color: var(--info-color); margin-bottom: 0.25rem;">Integración DNIT</h4>
            <p style="color: var(--text-muted); font-size: 0.9rem;">Integración DNIT en modo demo. En producción se conectará con las credenciales oficiales.</p>
          </div>
          <span class="badge badge-warning">MODO DEMO</span>
        </div>
        <div class="form-grid">
          <div class="form-group">
            <label>RUC Emisor SIFEN</label>
            <input type="text" class="form-control" value="${config.ruc || ''}" readonly style="background: var(--bg-base); cursor: not-allowed;">
          </div>
          <div class="form-group">
            <label>Ambiente</label>
            <select class="form-control">
              <option value="test">Testing (Sifen Test)</option>
              <option value="prod" disabled>Producción</option>
            </select>
          </div>
          <div class="form-group" style="grid-column: span 2;">
            <label>Certificado Digital (P12)</label>
            <input type="file" class="form-control" disabled style="background: var(--bg-base); cursor: not-allowed;">
            <small style="color: var(--text-muted);">Deshabilitado en modo demo</small>
          </div>
        </div>
      </div>

      <!-- TAB SUCURSALES -->
      <div class="tab-content" id="tab-sucursales" style="padding: 1.5rem; display: none;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
          <h3 style="font-size: 1.1rem; font-weight: 500;">Sucursales Activas</h3>
          <button class="btn btn-sm btn-secondary" id="btn-new-branch"><i data-lucide="plus"></i> Nueva Sucursal</button>
        </div>
        <div class="table-container">
          <table class="table-wrap">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Dirección</th>
                <th>Estado</th>
                <th style="text-align: right;">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>${config.branch || 'Casa Matriz'}</td>
                <td>${config.address || 'Central'}</td>
                <td><span class="badge badge-success">Activa</span></td>
                <td style="text-align: right;">
                  <button class="btn btn-sm btn-ghost" title="Editar"><i data-lucide="edit"></i></button>
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

  container.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      container.querySelectorAll('.tab-btn').forEach(b => {
        b.classList.remove('active');
        b.style.borderBottom = 'none';
      });
      container.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');

      const targetId = e.currentTarget.dataset.tab;
      e.currentTarget.classList.add('active');
      e.currentTarget.style.borderBottom = '2px solid var(--primary-color)';
      const targetEl = document.getElementById(targetId);
      if (targetEl) targetEl.style.display = 'block';
    });
  });

  document.getElementById('cfg-currency')?.addEventListener('change', (e) => {
    const val = e.target.value;
    const p = document.getElementById('currency-preview');
    if (p) {
      p.textContent = val === 'USD' ? '$ 12,500,000.00' : '₲ 12.500.000';
    }
  });

  document.getElementById('btn-save-settings')?.addEventListener('click', () => {
    const patch = {
      companyName: document.getElementById('cfg-companyName').value,
      logoInitials: document.getElementById('cfg-logoInitials').value,
      ruc: document.getElementById('cfg-ruc').value,
      phone: document.getElementById('cfg-phone').value,
      address: document.getElementById('cfg-address').value,
      email: document.getElementById('cfg-email').value,
      currency: document.getElementById('cfg-currency').value,
      globalExchangeRate: parseFloat(document.getElementById('cfg-exchange-rate').value) || 7500,
    };
    saveCompanyConfig(patch);

    const logoText = document.querySelector('.logo-text');
    if (logoText) {
      logoText.textContent = patch.companyName;
    }

    showToast('Configuración guardada exitosamente', 'success');
  });

  document.getElementById('btn-new-branch')?.addEventListener('click', () => {
    import('../components/modal.js').then(({ openModal, closeModal }) => {
      openModal('Nueva Sucursal', `
        <form id="new-branch-form" class="form-grid">
          <div class="form-group"><label>Nombre de Sucursal</label><input type="text" id="branch-name" class="form-control" required></div>
          <div class="form-group"><label>Dirección</label><input type="text" id="branch-address" class="form-control" required></div>
          <div class="form-group"><label>Teléfono</label><input type="text" id="branch-phone" class="form-control"></div>
        </form>
      `, `
        <button class="btn btn-secondary" onclick="window._closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="document.getElementById('new-branch-form').dispatchEvent(new Event('submit'))">Guardar Sucursal</button>
      `);
      window._closeModal = closeModal;
      document.getElementById('new-branch-form').addEventListener('submit', (e) => {
        e.preventDefault();
        closeModal();
        import('../components/toast.js').then(({ showToast }) => {
          showToast('Sucursal creada exitosamente', 'success');
        });
      });
    });
  });
}
