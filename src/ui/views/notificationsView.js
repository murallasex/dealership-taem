// =====================================================
// AutoERP — Notifications View Renderer
// =====================================================

import { getNotificationsKPIs, filterEmailHistory, saveTemplateData, simulateDueNotificationEmails, simulateOverdueNotificationEmails } from '../../services/notificationsService.js';
import { EmailTemplates, EmailLog, Clients } from '../../core/store.js';
import { fmtDate } from '../../utils/formatters.js';
import { safeCreateIcons } from '../../utils/dom.js';
import { showToast } from '../components/toast.js';
import { openModal, closeModal } from '../components/modal.js';
import { go } from '../../core/router.js';

export function renderEmailTemplates() {
  const content = document.getElementById('page-content');
  if (!content) return;

  const kpis = getNotificationsKPIs();

  content.innerHTML = `
    <div class="page-header">
      <div>
        <h2 class="page-title">Configuración de Notificaciones</h2>
      </div>
      <div class="header-actions">
        <button class="btn btn-secondary" id="btn-history">
          <i data-lucide="history"></i> Ver Historial
        </button>
        <button class="btn btn-primary" id="btn-new-template">
          <i data-lucide="plus"></i> Nueva Plantilla
        </button>
      </div>
    </div>

    <div class="card bg-info" style="margin-bottom: 24px; padding: 16px; display: flex; align-items: center; gap: 12px; border: 1px solid var(--accent-info);">
      <i data-lucide="webhook" style="color: var(--accent-info); width: 24px; height: 24px;"></i>
      <div>
        <p style="margin: 0; color: var(--text-primary); font-weight: 500;">⚡ Preparado para conectar con n8n o cualquier plataforma de automatización.</p>
        <p style="margin: 0; font-size: 0.875rem; color: var(--text-secondary);">En el entorno de producción, los emails se envían automáticamente vía webhook.</p>
      </div>
    </div>

    <div class="metrics-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 24px;">
      <div class="metric-card card">
        <h3 class="metric-title">Plantillas Activas</h3>
        <p class="metric-value">${kpis.activeTemplates}</p>
      </div>
      <div class="metric-card card">
        <h3 class="metric-title">Emails Enviados</h3>
        <p class="metric-value">${kpis.totalSent}</p>
      </div>
      <div class="metric-card card">
        <h3 class="metric-title">Tasa de Éxito</h3>
        <p class="metric-value">${kpis.successRate}%</p>
      </div>
    </div>

    <div class="card" style="margin-bottom: 24px;">
      <div class="card-header">
        <h3 class="card-title">Automatizaciones programadas</h3>
      </div>
      <div class="card-body" style="padding: 16px; display: grid; gap: 16px;">
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px; background: var(--bg-base); border-radius: 8px;">
          <div>
            <h4 style="margin: 0 0 4px 0; font-weight: 500;">Recordatorio de cuota próxima a vencer</h4>
            <div style="display: flex; align-items: center; gap: 8px; font-size: 0.875rem; color: var(--text-secondary);">
              Enviar <input type="number" value="3" style="width: 50px; padding: 2px 4px; background: var(--bg-card); border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 4px;"> días antes
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 12px;">
            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
              <input type="checkbox" checked> Activo
            </label>
            <button class="btn btn-secondary btn-sm" id="btn-sim-due">Ejecutar ahora (simulado)</button>
          </div>
        </div>

        <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px; background: var(--bg-base); border-radius: 8px;">
          <div>
            <h4 style="margin: 0 0 4px 0; font-weight: 500;">Recordatorio de cuota vencida</h4>
            <div style="display: flex; align-items: center; gap: 8px; font-size: 0.875rem; color: var(--text-secondary);">
              Enviar cada <input type="number" value="5" style="width: 50px; padding: 2px 4px; background: var(--bg-card); border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 4px;"> días
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 12px;">
            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
              <input type="checkbox" checked> Activo
            </label>
            <button class="btn btn-secondary btn-sm" id="btn-sim-overdue">Ejecutar ahora (simulado)</button>
          </div>
        </div>
      </div>
    </div>

    <h3 style="margin-bottom: 16px;">Plantillas de Email</h3>
    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; margin-bottom: 32px;" id="templates-grid">
      ${EmailTemplates.all().map(t => `
        <div class="card" style="padding: 16px;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
            <div>
              <h4 style="margin: 0 0 4px 0; font-size: 1.1rem;">${t.name}</h4>
              <span class="badge badge-${getTypeColor(t.type)}">${t.type}</span>
            </div>
            <label style="display: flex; align-items: center; gap: 4px; font-size: 0.875rem;">
              <input type="checkbox" class="toggle-template" data-id="${t.id}" ${t.active ? 'checked' : ''}>
              Activo
            </label>
          </div>
          <p style="margin: 0 0 16px 0; font-size: 0.875rem; color: var(--text-secondary); text-overflow: ellipsis; white-space: nowrap; overflow: hidden;">
            <strong>Asunto:</strong> ${t.subject}
          </p>
          <div style="text-align: right;">
            <button class="btn btn-secondary btn-sm edit-template-btn" data-id="${t.id}">
              <i data-lucide="edit"></i> Editar
            </button>
          </div>
        </div>
      `).join('')}
    </div>

    <div class="card" style="margin-bottom: 24px;">
      <div class="card-header">
        <h3 class="card-title">Segmentación para Campañas</h3>
      </div>
      <div class="card-body" style="padding: 16px;">
        <div class="form-grid">
          <div class="form-group">
            <label>Plantilla</label>
            <select class="form-control" id="campaign-template">
              <option value="">Seleccionar plantilla...</option>
              ${EmailTemplates.all().filter(t => t.type === 'offer' && t.active).map(t => `
                <option value="${t.id}">${t.name}</option>
              `).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Segmento (Condición)</label>
            <select class="form-control" id="campaign-segment">
              <option value="all">Todos los clientes</option>
              <option value="vip">Clientes VIP (Más de 1 compra)</option>
              <option value="interested_new">Interesados en Nuevos</option>
            </select>
          </div>
        </div>
        <div style="margin-top: 16px; display: flex; gap: 12px;">
          <button class="btn btn-secondary" id="btn-preview-campaign">Previsualizar destinatarios</button>
          <button class="btn btn-primary" id="btn-send-campaign" disabled>Enviar campaña (simulado)</button>
        </div>
        <div id="campaign-preview" style="margin-top: 16px; display: none; padding: 12px; background: var(--bg-base); border-radius: 8px;">
        </div>
      </div>
    </div>
  `;

  safeCreateIcons({ nodes: [content] });

  document.getElementById('btn-history')?.addEventListener('click', () => go('#/notifications/history'));
  document.getElementById('btn-new-template')?.addEventListener('click', () => openTemplateModal());

  content.querySelectorAll('.edit-template-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.dataset.id;
      const t = EmailTemplates.find(id);
      openTemplateModal(t);
    });
  });

  content.querySelectorAll('.toggle-template').forEach(chk => {
    chk.addEventListener('change', (e) => {
      const id = e.target.dataset.id;
      const t = EmailTemplates.find(id);
      if (t) {
        t.active = e.target.checked;
        saveTemplateData(t);
        showToast('Estado de plantilla actualizado', 'success');
      }
    });
  });

  document.getElementById('btn-sim-due')?.addEventListener('click', () => {
    const count = simulateDueNotificationEmails();
    showToast(`Simulación: ${count} emails enviados`, 'success');
    renderEmailTemplates();
  });

  document.getElementById('btn-sim-overdue')?.addEventListener('click', () => {
    const count = simulateOverdueNotificationEmails();
    showToast(`Simulación: ${count} emails enviados`, 'success');
    renderEmailTemplates();
  });

  const previewBtn = document.getElementById('btn-preview-campaign');
  const sendBtn = document.getElementById('btn-send-campaign');
  const previewDiv = document.getElementById('campaign-preview');
  let campaignClients = [];

  previewBtn?.addEventListener('click', () => {
    const templateId = document.getElementById('campaign-template').value;
    if (!templateId) {
      showToast('Seleccione una plantilla', 'warning');
      return;
    }
    campaignClients = Clients.all();
    if (previewDiv) {
      previewDiv.style.display = 'block';
      previewDiv.innerHTML = `<p style="margin: 0; color: var(--text-success);"><strong>${campaignClients.length}</strong> clientes coinciden con el segmento seleccionado.</p>`;
    }
    if (sendBtn) sendBtn.disabled = false;
  });

  sendBtn?.addEventListener('click', () => {
    showToast(`Campaña enviada a ${campaignClients.length} clientes`, 'success');
    if (sendBtn) sendBtn.disabled = true;
    if (previewDiv) previewDiv.style.display = 'none';
  });
}

function openTemplateModal(template = null) {
  const isEdit = !!template;
  const t = template || { name: '', type: 'offer', subject: '', body: '', active: true };

  const html = `
    <div class="form-grid" style="grid-template-columns: 1fr;">
      <div class="form-group">
        <label>Nombre de la Plantilla</label>
        <input type="text" class="form-control" id="t-name" value="${t.name}">
      </div>
      <div class="form-group">
        <label>Tipo</label>
        <select class="form-control" id="t-type">
          <option value="offer" ${t.type === 'offer' ? 'selected' : ''}>Oferta / Campaña</option>
          <option value="installment_due" ${t.type === 'installment_due' ? 'selected' : ''}>Cuota por Vencer</option>
          <option value="installment_overdue" ${t.type === 'installment_overdue' ? 'selected' : ''}>Cuota Vencida</option>
        </select>
      </div>
      <div class="form-group">
        <label>Asunto del Email</label>
        <input type="text" class="form-control" id="t-subject" value="${t.subject}">
      </div>
      <div class="form-group">
        <label>Cuerpo del Email</label>
        <textarea class="form-control" id="t-body" rows="6" style="resize: vertical;">${t.body}</textarea>
      </div>
      <div class="form-group">
        <label style="display: flex; align-items: center; gap: 8px;">
          <input type="checkbox" id="t-active" ${t.active ? 'checked' : ''}> Plantilla Activa
        </label>
      </div>
    </div>
    <div style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 24px;">
      <button class="btn btn-secondary" onclick="window._closeModal()">Cancelar</button>
      <button class="btn btn-primary" id="btn-save-template">Guardar Plantilla</button>
    </div>
  `;

  openModal(isEdit ? 'Editar Plantilla' : 'Nueva Plantilla', html);

  document.getElementById('btn-save-template')?.addEventListener('click', () => {
    const name = document.getElementById('t-name').value;
    const type = document.getElementById('t-type').value;
    const subject = document.getElementById('t-subject').value;
    const body = document.getElementById('t-body').value;
    const active = document.getElementById('t-active').checked;

    if (!name || !subject || !body) {
      showToast('Complete los campos obligatorios', 'warning');
      return;
    }

    saveTemplateData({ id: template?.id, name, type, subject, body, active });
    closeModal();
    showToast('Plantilla guardada', 'success');
    renderEmailTemplates();
  });
}

export function renderEmailHistory() {
  const content = document.getElementById('page-content');
  if (!content) return;

  const kpis = getNotificationsKPIs();

  content.innerHTML = `
    <div class="page-header">
      <div>
        <h2 class="page-title">Historial de Envíos</h2>
      </div>
      <div class="header-actions">
        <button class="btn btn-secondary" id="btn-back">
          <i data-lucide="arrow-left"></i> Volver a Plantillas
        </button>
      </div>
    </div>

    <div class="metrics-grid" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px;">
      <div class="metric-card card">
        <h3 class="metric-title">Total Enviados</h3>
        <p class="metric-value">${kpis.totalSent}</p>
      </div>
      <div class="metric-card card">
        <h3 class="metric-title">Exitosos</h3>
        <p class="metric-value" style="color: var(--text-success);">${kpis.successSent}</p>
      </div>
      <div class="metric-card card">
        <h3 class="metric-title">Fallidos</h3>
        <p class="metric-value" style="color: var(--text-danger);">${kpis.failedSent}</p>
      </div>
      <div class="metric-card card">
        <h3 class="metric-title">Tasa de Éxito</h3>
        <p class="metric-value">${kpis.successRate}%</p>
      </div>
    </div>

    <div class="card">
      <div class="table-toolbar">
        <div class="table-filters" style="display: flex; gap: 12px; margin-bottom: 16px; padding: 16px; border-bottom: 1px solid var(--border-color);">
          <select class="form-control" id="filter-status" style="max-width: 200px;">
            <option value="">Todos los estados</option>
            <option value="sent">Exitoso</option>
            <option value="failed">Fallido</option>
          </select>
          <select class="form-control" id="filter-type" style="max-width: 200px;">
            <option value="">Cualquier tipo</option>
            <option value="offer">Ofertas</option>
            <option value="installment_due">Cuota por Vencer</option>
            <option value="installment_overdue">Cuota Vencida</option>
          </select>
          <input type="date" class="form-control" id="filter-date" style="max-width: 200px;">
        </div>
      </div>
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>Destinatario</th>
              <th>Email</th>
              <th>Plantilla</th>
              <th>Asunto</th>
              <th>Estado</th>
              <th>Fecha/Hora</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody id="history-tbody">
          </tbody>
        </table>
      </div>
    </div>
  `;

  safeCreateIcons({ nodes: [content] });

  document.getElementById('btn-back')?.addEventListener('click', () => go('#/notifications'));

  function renderTable() {
    const statusFilter = document.getElementById('filter-status').value;
    const typeFilter = document.getElementById('filter-type').value;
    const dateFilter = document.getElementById('filter-date').value;

    const filtered = filterEmailHistory(statusFilter, typeFilter, dateFilter);

    const tbody = document.getElementById('history-tbody');
    if (!tbody) return;

    tbody.innerHTML = filtered.map(log => {
      const template = EmailTemplates.find(log.templateId);
      const templateName = template ? template.name : 'Desconocida';

      return `
        <tr>
          <td>${log.clientName}</td>
          <td>${log.email}</td>
          <td>${templateName}</td>
          <td>${log.subject}</td>
          <td>
            <span class="badge badge-${log.status === 'sent' ? 'success' : 'danger'}">
              ${log.status === 'sent' ? 'Enviado' : 'Fallido'}
            </span>
          </td>
          <td>${fmtDate(log.sentAt)}</td>
          <td>
            <div style="display: flex; gap: 8px;">
              <button class="btn btn-secondary btn-sm view-log-btn" data-id="${log.id}" title="Ver contenido">
                <i data-lucide="eye"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 24px;">No hay registros de envío</td></tr>`;
    }

    safeCreateIcons({ nodes: [tbody] });

    tbody.querySelectorAll('.view-log-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        const log = EmailLog.all().find(l => l.id === id);
        const template = EmailTemplates.find(log?.templateId);

        const html = `
          <div style="margin-bottom: 16px;">
            <p><strong>Para:</strong> ${log?.clientName || ''} &lt;${log?.email || ''}&gt;</p>
            <p><strong>Asunto:</strong> ${log?.subject || ''}</p>
          </div>
          <div style="padding: 16px; background: var(--bg-base); border-radius: 8px; border: 1px solid var(--border-color); white-space: pre-wrap;">${template ? template.body : 'Contenido no disponible'}</div>
        `;
        openModal('Contenido del Email', html);
      });
    });
  }

  document.getElementById('filter-status')?.addEventListener('change', renderTable);
  document.getElementById('filter-type')?.addEventListener('change', renderTable);
  document.getElementById('filter-date')?.addEventListener('change', renderTable);

  renderTable();
}

function getTypeColor(type) {
  if (type === 'offer') return 'info';
  if (type === 'installment_due') return 'warning';
  if (type === 'installment_overdue') return 'danger';
  return 'neutral';
}
