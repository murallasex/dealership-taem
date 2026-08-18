// =====================================================
// Platform View — Developer-only Company Dashboard
// =====================================================
import { safeCreateIcons } from '../../utils/dom.js';
import { showToast } from '../components/toast.js';
import { confirmDialog } from '../components/modal.js';
import {
  getCompanies, upsertCompany, deleteCompany,
  pauseCompany, activateCompany,
  getPlatformUsers, upsertPlatformUser, getUsersByCompany,
  getAuditLog,
  ROLES
} from '../../core/auth.js';

function statusBadge(status) {
  const map = {
    active:  { label: 'Activo',    cls: 'badge-success' },
    paused:  { label: 'Pausado',   cls: 'badge-warning' },
    deleted: { label: 'Eliminado', cls: 'badge-danger'  },
  };
  const s = map[status] || { label: status, cls: 'badge-neutral' };
  return `<span class="badge ${s.cls}">${s.label}</span>`;
}

function planBadge(plan) {
  const map = { pro: 'badge-info', basic: 'badge-neutral', enterprise: 'badge-success' };
  return `<span class="badge ${map[plan] || 'badge-neutral'}" style="text-transform:capitalize;">${plan}</span>`;
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const diff = Math.ceil((new Date(dateStr) - new Date()) / 86400000);
  return diff;
}

export function renderPlatformView() {
  const content = document.getElementById('page-content');
  if (!content) return;

  const companies = getCompanies().filter(c => c.status !== 'deleted');
  const allUsers = getPlatformUsers();
  const activeCount = companies.filter(c => c.status === 'active').length;
  const pausedCount = companies.filter(c => c.status === 'paused').length;
  const logs = getAuditLog().sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10);

  content.innerHTML = `
    <div class="page-header">
      <div class="header-title">
        <h1>Panel de Plataforma</h1>
        <p class="text-muted">Control total del sistema multi-empresa</p>
      </div>
      <div class="header-actions">
        <button class="btn btn-primary" id="btn-new-company">
          <i data-lucide="plus"></i> Nueva Empresa
        </button>
      </div>
    </div>

    <!-- KPIs -->
    <div class="kpi-grid" style="margin-bottom:2rem;">
      <div class="card kpi-card">
        <div class="kpi-icon badge-info"><i data-lucide="building-2"></i></div>
        <div class="kpi-content">
          <div class="kpi-label">Total Empresas</div>
          <div class="kpi-value">${companies.length}</div>
        </div>
      </div>
      <div class="card kpi-card">
        <div class="kpi-icon badge-success"><i data-lucide="check-circle"></i></div>
        <div class="kpi-content">
          <div class="kpi-label">Activas</div>
          <div class="kpi-value">${activeCount}</div>
        </div>
      </div>
      <div class="card kpi-card">
        <div class="kpi-icon badge-warning"><i data-lucide="pause-circle"></i></div>
        <div class="kpi-content">
          <div class="kpi-label">Pausadas</div>
          <div class="kpi-value">${pausedCount}</div>
        </div>
      </div>
      <div class="card kpi-card">
        <div class="kpi-icon badge-neutral"><i data-lucide="users"></i></div>
        <div class="kpi-content">
          <div class="kpi-label">Usuarios Totales</div>
          <div class="kpi-value">${allUsers.filter(u => u.role !== ROLES.DEVELOPER).length}</div>
        </div>
      </div>
    </div>

    <!-- Companies Table -->
    <div class="card table-container">
      <div class="card-header">
        <h3>Empresas Registradas</h3>
      </div>
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>Empresa</th>
              <th>Plan</th>
              <th>Estado</th>
              <th>Vencimiento</th>
              <th>Usuarios</th>
              <th class="text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${companies.map(c => {
              const users = getUsersByCompany(c.id);
              const days = daysUntil(c.subscriptionDue);
              const isOverdue = days !== null && days < 0;
              const dueClass = isOverdue ? 'color:var(--danger);font-weight:700;' : (days !== null && days < 7 ? 'color:var(--warning)' : '');
              return `
              <tr>
                <td>
                  <div style="display:flex;align-items:center;gap:0.75rem;">
                    <div style="width:36px;height:36px;border-radius:8px;background:${c.color||'var(--gold)'};display:flex;align-items:center;justify-content:center;font-weight:700;color:#fff;font-size:1rem;">
                      ${(c.name||'?')[0]}
                    </div>
                    <div>
                      <div style="font-weight:600;">${c.name}</div>
                      <div style="font-size:0.78rem;color:var(--text-muted);">${c.slug}</div>
                    </div>
                  </div>
                </td>
                <td>${planBadge(c.plan)}</td>
                <td>
                  ${statusBadge(c.status)}
                  ${c.status === 'active' && isOverdue ? '<span class="badge badge-danger" style="margin-left:4px;font-size:0.65rem;">VENCIDO</span>' : ''}
                </td>
                <td>
                  <div style="${dueClass};font-size:0.85rem;">
                    ${c.subscriptionDue ? new Date(c.subscriptionDue).toLocaleDateString('es-PY') : '—'}
                    ${days !== null && !isOverdue ? `<br><small>${days} días restantes</small>` : ''}
                  </div>
                </td>
                <td>
                  <div style="font-size:0.85rem;">
                    <span style="font-weight:600;">${users.length}</span> usuarios
                    <br><small style="color:var(--text-muted);">${users.filter(u=>u.role===ROLES.MANAGER).length} gerente / ${users.filter(u=>u.role===ROLES.SELLER).length} vendedor</small>
                  </div>
                </td>
                <td>
                  <div style="display:flex;gap:0.5rem;justify-content:center;flex-wrap:wrap;">
                    <button class="btn btn-sm btn-ghost" data-action="view-company" data-id="${c.id}" title="Ver detalle">
                      <i data-lucide="eye"></i>
                    </button>
                    ${c.status === 'active'
                      ? `<button class="btn btn-sm" style="background:rgba(234,179,8,0.15);color:var(--warning);border:1px solid var(--warning);" data-action="pause-company" data-id="${c.id}" title="Pausar">
                           <i data-lucide="pause"></i> Pausar
                         </button>`
                      : `<button class="btn btn-sm" style="background:rgba(34,197,94,0.12);color:var(--success);border:1px solid var(--success);" data-action="resume-company" data-id="${c.id}" title="Reactivar">
                           <i data-lucide="play"></i> Reactivar
                         </button>`
                    }
                    <button class="btn btn-sm btn-danger" data-action="delete-company" data-id="${c.id}" title="Eliminar empresa">
                      <i data-lucide="trash-2"></i>
                    </button>
                  </div>
                </td>
              </tr>`;
            }).join('')}
            ${companies.length === 0 ? `<tr><td colspan="6" class="text-center text-muted" style="padding:3rem;">No hay empresas registradas</td></tr>` : ''}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Audit Log -->
    <div class="card table-container" style="margin-top:2rem;">
      <div class="card-header">
        <h3>Registro de Auditoría (Últimas 10 acciones)</h3>
      </div>
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Acción</th>
              <th>Empresa</th>
              <th>Autor</th>
            </tr>
          </thead>
          <tbody>
            ${logs.map(log => {
              const actionColors = { PAUSE: 'var(--warning)', RESUME: 'var(--success)', DELETE: 'var(--danger)', CREATE: 'var(--info)' };
              return `
              <tr>
                <td class="text-muted" style="font-size:0.85rem;">${new Date(log.date).toLocaleString('es-PY')}</td>
                <td><span style="color:${actionColors[log.action]||'inherit'};font-weight:600;">${log.action}</span></td>
                <td>${log.companyId}</td>
                <td>${log.actor}</td>
              </tr>`;
            }).join('')}
            ${logs.length === 0 ? `<tr><td colspan="4" class="text-center text-muted" style="padding:2rem;">No hay registros recientes</td></tr>` : ''}
          </tbody>
        </table>
      </div>
    </div>
  `;

  safeCreateIcons({ nodes: [content] });

  // Actions
  content.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    const id = btn.dataset.id;

    if (action === 'pause-company') {
      confirmDialog(`¿Pausar el sistema de esta empresa? Los usuarios no podrán acceder.`, () => {
        pauseCompany(id);
        showToast('Empresa pausada. Los usuarios verán la pantalla de servicio suspendido.', 'warning');
        renderPlatformView();
      });
    }
    if (action === 'resume-company') {
      activateCompany(id);
      showToast('Empresa reactivada exitosamente.', 'success');
      renderPlatformView();
    }
    if (action === 'delete-company') {
      confirmDialog(`⚠️ ELIMINAR empresa permanentemente. Esto borrará todos sus datos. ¿Continuar?`, () => {
        deleteCompany(id);
        showToast('Empresa eliminada del sistema.', 'danger');
        renderPlatformView();
      });
    }
    if (action === 'view-company') {
      renderCompanyDetail(id);
    }
  });

  document.getElementById('btn-new-company')?.addEventListener('click', () => renderNewCompanyForm());
}

// ─── Company Detail (users list) ───────────────────────
function renderCompanyDetail(companyId) {
  const content = document.getElementById('page-content');
  const company = getCompanies().find(c => c.id === companyId);
  if (!company || !content) return;

  const users = getUsersByCompany(companyId);

  content.innerHTML = `
    <div class="mb-4">
      <button class="btn btn-ghost" id="btn-back-platform"><i data-lucide="arrow-left"></i> Volver a Plataforma</button>
    </div>
    <div class="page-header">
      <div style="display:flex;align-items:center;gap:1rem;">
        <div style="width:52px;height:52px;border-radius:12px;background:${company.color||'var(--gold)'};display:flex;align-items:center;justify-content:center;font-size:1.5rem;font-weight:800;color:#fff;">
          ${(company.name||'?')[0]}
        </div>
        <div>
          <h1>${company.name}</h1>
          <p class="text-muted">${company.slug} · ${statusBadge(company.status)} · ${planBadge(company.plan)}</p>
        </div>
      </div>
      <div class="header-actions">
        <button class="btn btn-primary" id="btn-add-user-company" data-company-id="${companyId}">
          <i data-lucide="user-plus"></i> Agregar Usuario
        </button>
      </div>
    </div>

    <div class="card table-container" style="margin-top:1.5rem;">
      <div class="card-header"><h3>Usuarios de ${company.name}</h3></div>
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr><th>Usuario</th><th>Email</th><th>Rol</th><th class="text-center">Acciones</th></tr>
          </thead>
          <tbody>
            ${users.map(u => `
              <tr>
                <td>
                  <div style="display:flex;align-items:center;gap:0.75rem;">
                    <div style="width:34px;height:34px;border-radius:50%;background:var(--gold);display:flex;align-items:center;justify-content:center;font-weight:700;color:#111;">${u.avatar||u.name[0]}</div>
                    <span style="font-weight:600;">${u.name}</span>
                  </div>
                </td>
                <td style="color:var(--text-muted);">${u.email}</td>
                <td>${roleBadge(u.role)}</td>
                <td>
                  <div style="display:flex;gap:0.5rem;justify-content:center;">
                    <button class="btn btn-sm btn-danger" data-action="remove-user" data-uid="${u.id}"><i data-lucide="trash-2"></i></button>
                  </div>
                </td>
              </tr>
            `).join('')}
            ${users.length === 0 ? `<tr><td colspan="4" class="text-center text-muted" style="padding:2rem;">Sin usuarios</td></tr>` : ''}
          </tbody>
        </table>
      </div>
    </div>
  `;

  safeCreateIcons({ nodes: [content] });
  document.getElementById('btn-back-platform')?.addEventListener('click', () => renderPlatformView());
  document.getElementById('btn-add-user-company')?.addEventListener('click', () => renderAddUserForm(companyId));

  content.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action="remove-user"]');
    if (!btn) return;
    const uid = btn.dataset.uid;
    confirmDialog('¿Eliminar este usuario?', () => {
      const users = getPlatformUsers().filter(u => u.id !== uid);
      localStorage.setItem('erp_platform_users', JSON.stringify(users));
      showToast('Usuario eliminado', 'success');
      renderCompanyDetail(companyId);
    });
  });
}

function roleBadge(role) {
  const map = {
    developer: { label: 'Developer', cls: 'badge-info' },
    manager:   { label: 'Gerente',   cls: 'badge-warning' },
    seller:    { label: 'Vendedor',  cls: 'badge-success' },
  };
  const s = map[role] || { label: role, cls: 'badge-neutral' };
  return `<span class="badge ${s.cls}">${s.label}</span>`;
}

// ─── New Company Form ───────────────────────────────────
function renderNewCompanyForm() {
  const content = document.getElementById('page-content');
  content.innerHTML = `
    <div class="mb-4">
      <button class="btn btn-ghost" id="btn-back-platform"><i data-lucide="arrow-left"></i> Cancelar</button>
    </div>
    <h2 style="margin-bottom:1.5rem;">Nueva Empresa</h2>
    <form id="new-company-form" class="card" style="max-width:600px;">
      <div class="card-body">
        <div class="form-grid" style="grid-template-columns:1fr 1fr;">
          <div class="form-group">
            <label>Nombre de la Empresa *</label>
            <input type="text" id="nc-name" class="form-control" required placeholder="Ej: Auto Central PY">
          </div>
          <div class="form-group">
            <label>Slug (identificador URL) *</label>
            <input type="text" id="nc-slug" class="form-control" required placeholder="Ej: auto-central-py">
          </div>
          <div class="form-group">
            <label>Plan</label>
            <select id="nc-plan" class="form-control">
              <option value="basic">Basic</option>
              <option value="pro" selected>Pro</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>
          <div class="form-group">
            <label>Fecha de Vencimiento</label>
            <input type="date" id="nc-due" class="form-control">
          </div>
        </div>
        <hr style="border-color:var(--border);margin:1.5rem 0;">
        <div style="font-weight:700;margin-bottom:1rem;color:var(--gold);">Usuario Gerente Inicial</div>
        <div class="form-grid" style="grid-template-columns:1fr 1fr;">
          <div class="form-group">
            <label>Nombre del Gerente *</label>
            <input type="text" id="nc-mgr-name" class="form-control" required placeholder="Nombre completo">
          </div>
          <div class="form-group">
            <label>Email *</label>
            <input type="email" id="nc-mgr-email" class="form-control" required placeholder="gerente@empresa.com">
          </div>
          <div class="form-group">
            <label>Contraseña *</label>
            <input type="password" id="nc-mgr-password" class="form-control" required placeholder="Mínimo 6 caracteres">
          </div>
        </div>
        <div style="text-align:right;margin-top:1.5rem;">
          <button type="submit" class="btn btn-primary"><i data-lucide="save"></i> Crear Empresa</button>
        </div>
      </div>
    </form>
  `;
  safeCreateIcons({ nodes: [content] });
  document.getElementById('btn-back-platform')?.addEventListener('click', () => renderPlatformView());

  document.getElementById('new-company-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('nc-name').value.trim();
    const slug = document.getElementById('nc-slug').value.trim();
    const plan = document.getElementById('nc-plan').value;
    const due  = document.getElementById('nc-due').value;
    const mgrName = document.getElementById('nc-mgr-name').value.trim();
    const mgrEmail = document.getElementById('nc-mgr-email').value.trim();
    const mgrPass  = document.getElementById('nc-mgr-password').value;

    const companyId = 'comp_' + Date.now();
    const colors = ['#c9a227','#3b82f6','#8b5cf6','#10b981','#f59e0b','#ef4444'];
    upsertCompany({
      id: companyId, name, slug, status: 'active', plan,
      subscriptionDue: due || null,
      createdAt: new Date().toISOString(),
      color: colors[Math.floor(Math.random() * colors.length)],
    });
    upsertPlatformUser({
      id: 'usr_' + Date.now(), companyId, name: mgrName,
      email: mgrEmail, password: mgrPass,
      role: ROLES.MANAGER, avatar: mgrName[0],
    });
    showToast(`Empresa "${name}" creada exitosamente`, 'success');
    renderPlatformView();
  });
}

// ─── Add User Form ─────────────────────────────────────
function renderAddUserForm(companyId) {
  const content = document.getElementById('page-content');
  const company = getCompanies().find(c => c.id === companyId);
  content.innerHTML = `
    <div class="mb-4">
      <button class="btn btn-ghost" id="btn-back-detail"><i data-lucide="arrow-left"></i> Volver</button>
    </div>
    <h2 style="margin-bottom:1.5rem;">Agregar Usuario a ${company?.name}</h2>
    <form id="add-user-form" class="card" style="max-width:500px;">
      <div class="card-body">
        <div class="form-group"><label>Nombre *</label><input type="text" id="au-name" class="form-control" required></div>
        <div class="form-group"><label>Email *</label><input type="email" id="au-email" class="form-control" required></div>
        <div class="form-group"><label>Contraseña *</label><input type="password" id="au-password" class="form-control" required></div>
        <div class="form-group">
          <label>Rol *</label>
          <select id="au-role" class="form-control">
            <option value="manager">Gerente</option>
            <option value="seller" selected>Vendedor</option>
          </select>
        </div>
        <div style="text-align:right;margin-top:1.5rem;">
          <button type="submit" class="btn btn-primary"><i data-lucide="user-plus"></i> Agregar Usuario</button>
        </div>
      </div>
    </form>
  `;
  safeCreateIcons({ nodes: [content] });
  document.getElementById('btn-back-detail')?.addEventListener('click', () => renderCompanyDetail(companyId));
  document.getElementById('add-user-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    upsertPlatformUser({
      id: 'usr_' + Date.now(), companyId,
      name: document.getElementById('au-name').value.trim(),
      email: document.getElementById('au-email').value.trim(),
      password: document.getElementById('au-password').value,
      role: document.getElementById('au-role').value,
      avatar: document.getElementById('au-name').value.trim()[0],
    });
    showToast('Usuario agregado exitosamente', 'success');
    renderCompanyDetail(companyId);
  });
}
