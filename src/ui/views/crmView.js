// =====================================================
// AutoERP — CRM View Renderer
// =====================================================

import { getCRMKPIs, filterClientsList, getLeadPipelineData, saveClientRecord, deleteClientRecord, saveLeadRecord } from '../../services/crmService.js';
import { Clients, Leads, Sellers, Sales, generateId, now } from '../../core/store.js';
import { fmt, fmtDate } from '../../utils/formatters.js';
import { safeCreateIcons } from '../../utils/dom.js';
import { showToast } from '../components/toast.js';
import { openModal, closeModal, confirmDialog } from '../components/modal.js';
import { go } from '../../core/router.js';

export function renderCRMList() {
  const content = document.getElementById('page-content');
  if (!content) return;

  const kpis = getCRMKPIs();
  const clients = filterClientsList();

  let html = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Clientes / CRM</h1>
        <div class="page-subtitle">Gestión de clientes y prospectos</div>
      </div>
      <div class="page-actions">
        <button id="btn-pipeline" class="btn btn-secondary">Ver Prospectos</button>
        <button id="btn-new-client" class="btn btn-primary"><i data-lucide="plus"></i> Nuevo Cliente</button>
      </div>
    </div>

    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin-bottom: 1.5rem;">
      <div class="card" style="padding: 1.25rem;">
        <div style="font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); margin-bottom: 0.5rem;">Total Clientes</div>
        <div style="font-size: 2rem; font-weight: 700; color: var(--gold); font-family: 'Outfit', sans-serif; line-height: 1;">${kpis.total}</div>
      </div>
      <div class="card" style="padding: 1.25rem;">
        <div style="font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); margin-bottom: 0.5rem;">Activos</div>
        <div style="font-size: 2rem; font-weight: 700; color: var(--success); font-family: 'Outfit', sans-serif; line-height: 1;">${kpis.activos}</div>
      </div>
      <div class="card" style="padding: 1.25rem;">
        <div style="font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); margin-bottom: 0.5rem;">Prospectos</div>
        <div style="font-size: 2rem; font-weight: 700; color: var(--warning); font-family: 'Outfit', sans-serif; line-height: 1;">${kpis.prospectos}</div>
      </div>
      <div class="card" style="padding: 1.25rem;">
        <div style="font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); margin-bottom: 0.5rem;">Inactivos</div>
        <div style="font-size: 2rem; font-weight: 700; color: var(--text-muted); font-family: 'Outfit', sans-serif; line-height: 1;">${kpis.inactivos}</div>
      </div>
    </div>

    <div class="card table-container">
      <div class="table-toolbar" style="display:flex; gap:1rem; margin-bottom:1rem; align-items: center;">
        <div class="filter-input-wrapper" style="flex:1;">
          <input type="text" id="search-client" class="filter-input" placeholder="Buscar cliente...">
          <i data-lucide="search"></i>
        </div>
        <select id="filter-segment" class="form-control filter-select" style="width:200px;">
          <option value="">Todos los Segmentos</option>
          <option value="active">Activos</option>
          <option value="prospect">Prospectos</option>
          <option value="inactive">Inactivos</option>
        </select>
        <select id="filter-origin" class="form-control filter-select" style="width:200px;">
          <option value="">Todos los Orígenes</option>
          <option value="social">Redes Sociales</option>
          <option value="referral">Referido</option>
          <option value="web">Sitio Web</option>
          <option value="walkin">Visita</option>
        </select>
      </div>
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Documento</th>
              <th>Email / Teléfono</th>
              <th>Interés en</th>
              <th>Origen</th>
              <th>Segmento</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody id="clients-tbody">
            ${renderClientsRows(clients)}
          </tbody>
        </table>
      </div>
    </div>
  `;

  content.innerHTML = html;
  safeCreateIcons({ nodes: [content] });

  document.getElementById('btn-pipeline')?.addEventListener('click', () => go('#/crm/leads'));
  document.getElementById('btn-new-client')?.addEventListener('click', () => openClientModal());

  const searchInput = document.getElementById('search-client');
  const segmentFilter = document.getElementById('filter-segment');
  const originFilter = document.getElementById('filter-origin');

  const filterClients = () => {
    const query = searchInput.value;
    const seg = segmentFilter.value;
    const ori = originFilter.value;
    const filtered = filterClientsList(query, seg, ori);
    const tbody = document.getElementById('clients-tbody');
    if (tbody) {
      tbody.innerHTML = renderClientsRows(filtered);
      safeCreateIcons({ nodes: [tbody] });
      attachRowEvents();
    }
  };

  searchInput?.addEventListener('input', filterClients);
  segmentFilter?.addEventListener('change', filterClients);
  originFilter?.addEventListener('change', filterClients);

  attachRowEvents();
}

function renderClientsRows(clientsList) {
  if (clientsList.length === 0) {
    return `<tr><td colspan="7" style="text-align:center; padding: 1rem;">No hay clientes registrados</td></tr>`;
  }

  return clientsList.map(c => `
    <tr>
      <td>
        <div style="font-weight:bold; cursor:pointer;" class="client-link" data-id="${c.id}">${c.name}</div>
      </td>
      <td>${c.docType} ${c.document}</td>
      <td>
        <div>${c.email}</div>
        <div style="font-size:0.875rem; color:var(--text-muted);">${c.phone}</div>
      </td>
      <td>${c.interestedIn || '-'}</td>
      <td>${getOriginBadge(c.leadOrigin)}</td>
      <td>${getSegmentBadge(c.segment)}</td>
      <td>
        <button class="btn btn-sm btn-ghost btn-view" data-id="${c.id}"><i data-lucide="eye"></i></button>
        <button class="btn btn-sm btn-ghost btn-edit" data-id="${c.id}"><i data-lucide="edit"></i></button>
        <button class="btn btn-sm btn-ghost btn-delete" data-id="${c.id}" style="color:var(--danger);"><i data-lucide="trash-2"></i></button>
      </td>
    </tr>
  `).join('');
}

function attachRowEvents() {
  document.querySelectorAll('.client-link, .btn-view').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.dataset.id;
      go('#/crm/detail/' + id);
    });
  });

  document.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.dataset.id;
      openClientModal(id);
    });
  });

  document.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.dataset.id;
      confirmDialog('¿Esta acción no se puede deshacer.', () => {
        deleteClientRecord(id);
        showToast('Cliente eliminado', 'success');
        renderCRMList();
      }, '¿Eliminar cliente?');
    });
  });
}

function getSegmentBadge(seg) {
  const map = {
    'active': { cls: 'badge-success', txt: 'Activo' },
    'prospect': { cls: 'badge-gold', txt: 'Prospecto' },
    'inactive': { cls: 'badge-neutral', txt: 'Inactivo' }
  };
  const b = map[seg] || { cls: 'badge-neutral', txt: seg };
  return `<span class="badge ${b.cls}">${b.txt}</span>`;
}

function getOriginBadge(ori) {
  const map = {
    'social': 'Redes',
    'referral': 'Referido',
    'web': 'Web',
    'walkin': 'Visita'
  };
  return `<span class="badge badge-info">${map[ori] || ori || 'Desconocido'}</span>`;
}

export function renderCRMDetail(clientId) {
  const client = Clients.find(clientId);
  const content = document.getElementById('page-content');
  if (!content) return;

  if (!client) {
    content.innerHTML = `<div class="card"><div class="card-body">Cliente no encontrado.</div></div>`;
    return;
  }

  const initials = client.name ? client.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'CL';
  const clientSales = Sales.all().filter(s => s.clientId === clientId);
  const notes = client.notes || [];

  let html = `
    <div class="page-header">
      <div>
        <button id="btn-back" class="btn btn-ghost" style="margin-bottom: 0.5rem;"><i data-lucide="arrow-left"></i> Volver</button>
        <h1 class="page-title">${client.name}</h1>
        <div class="page-subtitle">Perfil del cliente</div>
      </div>
      <div class="page-actions">
        <button id="btn-new-quote" class="btn btn-secondary"><i data-lucide="file-text"></i> Nueva Cotización</button>
        <button id="btn-edit-client" class="btn btn-primary"><i data-lucide="edit"></i> Editar Cliente</button>
      </div>
    </div>

    <div class="card" style="margin-bottom: 2rem;">
      <div class="card-body" style="display:flex; gap:2rem; align-items:center;">
        <div style="width: 80px; height: 80px; border-radius: 50%; background: var(--bg-hover); display:flex; align-items:center; justify-content:center; font-size: 2rem; font-weight:bold; color: var(--gold);">
          ${initials}
        </div>
        <div style="flex:1;">
          <div style="display:flex; gap:1rem; margin-bottom: 0.5rem;">
            ${getSegmentBadge(client.segment)}
            ${getOriginBadge(client.leadOrigin)}
          </div>
          <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap: 0.5rem;">
            <div>
              <div style="font-size: 0.875rem; color: var(--text-muted);">Documento</div>
              <div>${client.docType} ${client.document}</div>
            </div>
            <div>
              <div style="font-size: 0.875rem; color: var(--text-muted);">Email</div>
              <div>${client.email}</div>
            </div>
            <div>
              <div style="font-size: 0.875rem; color: var(--text-muted);">Teléfono</div>
              <div style="display:flex; align-items:center; gap: 0.5rem;">
                ${client.phone}
                ${client.phone ? `<a href="https://wa.me/${client.phone.replace(/\D/g, '')}?text=Hola%20${encodeURIComponent(client.name)},%20te%20escribimos%20de%20Dealership%20TAEM" target="_blank" class="btn btn-sm" style="background:#25D366; color:#fff; border:none; padding: 2px 8px; font-size: 0.75rem;"><i data-lucide="message-circle" style="width: 14px; height: 14px; margin-right: 4px;"></i> WhatsApp</a>` : ''}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="dashboard-grid">
      <div class="card" style="grid-column: span 8;">
        <div class="card-header" style="display:flex; justify-space-between;">
          <h3 class="card-title">Interacciones / Notas</h3>
          <button id="btn-add-note" class="btn btn-sm btn-ghost"><i data-lucide="plus"></i> Nueva Interacción</button>
        </div>
        <div class="card-body">
          ${notes.length === 0 ? '<div style="color:var(--text-muted);">No hay interacciones registradas.</div>' : ''}
          <div style="display:flex; flex-direction:column; gap:1rem;">
            ${(typeof notes === 'string' ? [{ date: now(), type: 'Nota', content: notes }] : notes)
              .sort((a, b) => new Date(b.date) - new Date(a.date))
              .map(n => `
                <div style="padding: 0.75rem; background: var(--bg-hover); border-radius: 8px;">
                  <div style="display:flex; justify-content:space-between; margin-bottom:0.5rem; font-size:0.875rem;">
                    <strong style="color:var(--gold);">${n.type || 'Nota'}</strong>
                    <span style="color:var(--text-muted);">${fmtDate(n.date)}</span>
                  </div>
                  <div>${n.content}</div>
                </div>
              `).join('')}
          </div>
        </div>
      </div>

      <div class="card" style="grid-column: span 4;">
        <div class="card-header"><h3 class="card-title">Compras</h3></div>
        <div class="card-body">
          ${clientSales.length === 0 ? '<div style="color:var(--text-muted);">No hay compras registradas.</div>' : ''}
          ${clientSales.map(s => `
            <div style="padding: 0.75rem; border-bottom: 1px solid var(--border-color);">
              <div style="display:flex; justify-content:space-between; margin-bottom: 0.25rem;">
                <strong>Venta #${(s.saleNumber || s.id).substring(0, 8)}</strong>
                <span class="badge ${s.stage === 'delivery' ? 'badge-success' : (s.stage === 'contract' ? 'badge-gold' : 'badge-info')}">${s.stage}</span>
              </div>
              <div style="font-size:0.875rem; color:var(--text-muted);">${fmtDate(s.createdAt || s.date)}</div>
              <div style="font-weight:bold; color:var(--success);">${fmt(s.totalPrice || s.total)}</div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;

  content.innerHTML = html;
  safeCreateIcons({ nodes: [content] });

  document.getElementById('btn-back')?.addEventListener('click', () => go('#/crm'));
  document.getElementById('btn-edit-client')?.addEventListener('click', () => openClientModal(clientId));
  document.getElementById('btn-new-quote')?.addEventListener('click', () => go('#/sales/new?client=' + clientId));
  document.getElementById('btn-add-note')?.addEventListener('click', () => openNoteModal(clientId));
}

function openClientModal(id = null) {
  let client = { name: '', email: '', phone: '', document: '', docType: 'CI', address: '', segment: 'prospect', interestedIn: '', leadOrigin: 'walkin', notes: [] };
  if (id) {
    client = Clients.find(id) || client;
  }

  const modalHtml = `
    <form id="client-form">
      <div class="form-grid">
        <div class="form-group" style="grid-column: span 2;">
          <label>Nombre Completo</label>
          <input type="text" id="c-name" class="form-control" required value="${client.name}">
        </div>
        
        <div class="form-group">
          <label>Tipo Doc</label>
          <select id="c-doctype" class="form-control" required>
            <option value="CI" ${client.docType === 'CI' ? 'selected' : ''}>CI</option>
            <option value="RUC" ${client.docType === 'RUC' ? 'selected' : ''}>RUC</option>
            <option value="PASSPORT" ${client.docType === 'PASSPORT' ? 'selected' : ''}>Pasaporte</option>
          </select>
        </div>
        <div class="form-group">
          <label>Documento</label>
          <input type="text" id="c-doc" class="form-control" required value="${client.document}">
        </div>
        
        <div class="form-group">
          <label>Email</label>
          <input type="email" id="c-email" class="form-control" required value="${client.email}">
        </div>
        <div class="form-group">
          <label>Teléfono</label>
          <input type="text" id="c-phone" class="form-control" required value="${client.phone}">
        </div>

        <div class="form-group" style="grid-column: span 2;">
          <label>Dirección</label>
          <input type="text" id="c-address" class="form-control" value="${client.address || ''}">
        </div>

        <div class="form-group">
          <label>Segmento</label>
          <select id="c-segment" class="form-control" required>
            <option value="active" ${client.segment === 'active' ? 'selected' : ''}>Activo</option>
            <option value="prospect" ${client.segment === 'prospect' ? 'selected' : ''}>Prospecto</option>
            <option value="inactive" ${client.segment === 'inactive' ? 'selected' : ''}>Inactivo</option>
          </select>
        </div>
        <div class="form-group">
          <label>Origen</label>
          <select id="c-origin" class="form-control" required>
            <option value="social" ${client.leadOrigin === 'social' ? 'selected' : ''}>Redes Sociales</option>
            <option value="referral" ${client.leadOrigin === 'referral' ? 'selected' : ''}>Referido</option>
            <option value="web" ${client.leadOrigin === 'web' ? 'selected' : ''}>Sitio Web</option>
            <option value="walkin" ${client.leadOrigin === 'walkin' ? 'selected' : ''}>Visita</option>
          </select>
        </div>
        <div class="form-group" style="grid-column: span 2;">
          <label>Interés En (Vehículo / Marca)</label>
          <input type="text" id="c-interested" class="form-control" value="${client.interestedIn || ''}">
        </div>
      </div>
      <div style="display:flex; justify-content:flex-end; gap:1rem; margin-top:2rem;">
        <button type="button" class="btn btn-ghost" onclick="window._closeModal()">Cancelar</button>
        <button type="submit" class="btn btn-primary">Guardar</button>
      </div>
    </form>
  `;

  openModal(id ? 'Editar Cliente' : 'Nuevo Cliente', modalHtml);

  document.getElementById('client-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = {
      id: id || generateId(),
      name: document.getElementById('c-name').value,
      docType: document.getElementById('c-doctype').value,
      document: document.getElementById('c-doc').value,
      email: document.getElementById('c-email').value,
      phone: document.getElementById('c-phone').value,
      address: document.getElementById('c-address').value,
      segment: document.getElementById('c-segment').value,
      leadOrigin: document.getElementById('c-origin').value,
      interestedIn: document.getElementById('c-interested').value,
      notes: client.notes || [],
      createdAt: id ? client.createdAt : now()
    };

    saveClientRecord(data);
    showToast(id ? 'Cliente actualizado' : 'Cliente creado', 'success');
    closeModal();
    renderCRMList();
  });
}

function openNoteModal(clientId) {
  const html = `
    <form id="note-form">
      <div class="form-group">
        <label>Tipo de Interacción</label>
        <select id="n-type" class="form-control">
          <option value="Llamada">Llamada</option>
          <option value="Email">Email</option>
          <option value="Reunión">Reunión</option>
          <option value="Whatsapp">WhatsApp</option>
          <option value="Otro">Otro</option>
        </select>
      </div>
      <div class="form-group">
        <label>Nota / Detalle</label>
        <textarea id="n-content" class="form-control" rows="4" required></textarea>
      </div>
      <div style="display:flex; justify-content:flex-end; gap:1rem; margin-top:1rem;">
        <button type="button" class="btn btn-ghost" onclick="window._closeModal()">Cancelar</button>
        <button type="submit" class="btn btn-primary">Guardar</button>
      </div>
    </form>
  `;
  openModal('Nueva Interacción', html);

  document.getElementById('note-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const type = document.getElementById('n-type').value;
    const content = document.getElementById('n-content').value;

    const client = Clients.find(clientId);
    if (client) {
      if (!Array.isArray(client.notes)) client.notes = [];
      client.notes.push({ id: generateId(), date: now(), type, content });
      saveClientRecord(client);
    }
    closeModal();
    showToast('Interacción agregada', 'success');
    renderCRMDetail(clientId);
  });
}

export function renderLeadPipeline() {
  const content = document.getElementById('page-content');
  if (!content) return;

  const { stages, grouped } = getLeadPipelineData();

  let html = `
    <div class="page-header">
      <div>
        <button id="btn-back-crm" class="btn btn-ghost" style="margin-bottom: 0.5rem;"><i data-lucide="arrow-left"></i> Ver Clientes</button>
        <h1 class="page-title">Pipeline de Prospectos</h1>
        <div class="page-subtitle">Seguimiento de Leads</div>
      </div>
      <div class="page-actions">
        <button id="btn-new-lead" class="btn btn-primary"><i data-lucide="plus"></i> Nuevo Prospecto</button>
      </div>
    </div>

    <div class="pipeline-stacked" style="margin-top: 2rem;">
      ${stages.map(st => {
        const stageLeads = grouped[st.id] || [];
        return `
          <div class="pipeline-stage" style="margin-bottom: 2.5rem;">
            <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid var(--border-color); padding-bottom: 0.75rem; margin-bottom: 1.25rem;">
              <h3 style="margin: 0; font-size: 1.5rem; display: flex; align-items: center; gap: 0.5rem; color: var(--text-primary); font-weight: 400;">
                <span style="color: var(--${st.cls.replace('badge-', '')});">${st.name}</span> 
                <span style="color: var(--text-muted); font-size: 1.1rem;">(${stageLeads.length})</span>
              </h3>
              <div style="position: relative; width: 320px;">
                <input type="text" class="form-control crm-stage-search" data-stage="${st.id}" placeholder="Buscar prospectos..." style="padding-left: 2.5rem; padding-right: 1rem; background: var(--bg-card); border-radius: 24px; border: 1px solid var(--border-color); box-shadow: var(--shadow-sm); height: 40px; transition: box-shadow 0.2s, border-color 0.2s;" onfocus="this.style.boxShadow='var(--shadow-md)'; this.style.borderColor='var(--gold)';" onblur="this.style.boxShadow='var(--shadow-sm)'; this.style.borderColor='var(--border-color)';">
                <i data-lucide="search" style="position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: var(--text-muted); width: 18px; height: 18px;"></i>
              </div>
            </div>
            <div class="stage-cards" id="crm-stage-cards-${st.id}" style="display: flex; gap: 1.25rem; overflow-x: auto; padding-bottom: 1rem; min-height: 120px;">
              ${stageLeads.map(l => {
                const seller = Sellers.find(l.assignedTo);
                const sInitials = seller ? seller.name.substring(0, 2).toUpperCase() : 'NA';
                return `
                  <div class="card kanban-card" data-id="${l.id}" style="cursor: pointer; min-width: 280px; padding: 1.25rem; transition: transform 0.2s, box-shadow 0.2s;" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='var(--shadow-md)';" onmouseout="this.style.transform='none'; this.style.boxShadow='var(--shadow)';">
                    <div style="font-weight:700; font-size: 1.1rem; margin-bottom:0.25rem;">${l.name}</div>
                    <div style="font-size:0.9rem; color:var(--text-muted); margin-bottom:0.75rem;">${l.interestedIn || 'Sin interés específico'}</div>
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                      ${getOriginBadge(l.origin)}
                      <div title="Vendedor: ${seller?.name || 'Ninguno'}" style="width:28px; height:28px; border-radius:50%; background:var(--bg-hover); font-size:11px; display:flex; align-items:center; justify-content:center; color:var(--gold); font-weight: 600;">
                        ${sInitials}
                      </div>
                    </div>
                  </div>
                `;
              }).join('')}
              ${stageLeads.length === 0 ? '<div style="color: var(--text-muted); padding: 2rem 0; font-size: 1rem;">No hay prospectos en esta etapa</div>' : ''}
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;

  content.innerHTML = html;
  safeCreateIcons({ nodes: [content] });

  document.getElementById('btn-back-crm')?.addEventListener('click', () => go('#/crm'));
  document.getElementById('btn-new-lead')?.addEventListener('click', () => openLeadModal());

  content.querySelectorAll('.crm-stage-search').forEach(input => {
    input.addEventListener('input', (e) => {
      const term = e.target.value.toLowerCase();
      const stageId = e.target.dataset.stage;
      const container = document.getElementById(`crm-stage-cards-${stageId}`);
      if (container) {
        container.querySelectorAll('.kanban-card').forEach(card => {
          const text = card.textContent.toLowerCase();
          card.style.display = text.includes(term) ? 'block' : 'none';
        });
      }
    });
  });

  content.querySelectorAll('.kanban-card').forEach(card => {
    card.addEventListener('click', (e) => {
      openLeadDetailModal(e.currentTarget.dataset.id);
    });
  });
}

function openLeadModal(id = null) {
  let lead = { name: '', email: '', phone: '', interestedIn: '', origin: 'walkin', stage: 'new', assignedTo: '', notes: '' };
  if (id) lead = Leads.find(id) || lead;

  const html = `
    <form id="lead-form">
      <div class="form-grid">
        <div class="form-group" style="grid-column:span 2;">
          <label>Nombre del Prospecto</label>
          <input type="text" id="l-name" class="form-control" required value="${lead.name}">
        </div>
        <div class="form-group">
          <label>Email</label>
          <input type="email" id="l-email" class="form-control" value="${lead.email}">
        </div>
        <div class="form-group">
          <label>Teléfono</label>
          <input type="text" id="l-phone" class="form-control" required value="${lead.phone}">
        </div>
        <div class="form-group" style="grid-column:span 2;">
          <label>Interés (Vehículo/Marca)</label>
          <input type="text" id="l-interest" class="form-control" value="${lead.interestedIn}">
        </div>
        <div class="form-group">
          <label>Origen</label>
          <select id="l-origin" class="form-control">
            <option value="social" ${lead.origin === 'social' ? 'selected' : ''}>Redes</option>
            <option value="referral" ${lead.origin === 'referral' ? 'selected' : ''}>Referido</option>
            <option value="web" ${lead.origin === 'web' ? 'selected' : ''}>Web</option>
            <option value="walkin" ${lead.origin === 'walkin' ? 'selected' : ''}>Visita</option>
          </select>
        </div>
        <div class="form-group">
          <label>Asignado A (Vendedor)</label>
          <select id="l-assigned" class="form-control">
            <option value="">Sin Asignar</option>
            ${Sellers.all().map(s => `<option value="${s.id}" ${lead.assignedTo === s.id ? 'selected' : ''}>${s.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Etapa</label>
          <select id="l-stage" class="form-control">
            <option value="new" ${lead.stage === 'new' ? 'selected' : ''}>Nuevo Contacto</option>
            <option value="interested" ${lead.stage === 'interested' ? 'selected' : ''}>Interesado</option>
            <option value="quoted" ${lead.stage === 'quoted' ? 'selected' : ''}>Cotizado</option>
            <option value="negotiation" ${lead.stage === 'negotiation' ? 'selected' : ''}>Negociación</option>
            <option value="won" ${lead.stage === 'won' ? 'selected' : ''}>Ganado</option>
            <option value="lost" ${lead.stage === 'lost' ? 'selected' : ''}>Perdido</option>
          </select>
        </div>
        <div class="form-group" style="grid-column:span 2;">
          <label>Notas Iniciales</label>
          <textarea id="l-notes" class="form-control" rows="3">${lead.notes}</textarea>
        </div>
      </div>
      <div style="display:flex; justify-content:flex-end; gap:1rem; margin-top:2rem;">
        <button type="button" class="btn btn-ghost" onclick="window._closeModal()">Cancelar</button>
        <button type="submit" class="btn btn-primary">Guardar</button>
      </div>
    </form>
  `;
  openModal(id ? 'Editar Prospecto' : 'Nuevo Prospecto', html);

  document.getElementById('lead-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = {
      id: id || generateId(),
      name: document.getElementById('l-name').value,
      email: document.getElementById('l-email').value,
      phone: document.getElementById('l-phone').value,
      interestedIn: document.getElementById('l-interest').value,
      origin: document.getElementById('l-origin').value,
      assignedTo: document.getElementById('l-assigned').value,
      stage: document.getElementById('l-stage').value,
      notes: document.getElementById('l-notes').value,
      createdAt: id ? lead.createdAt : now()
    };
    saveLeadRecord(data);
    showToast(id ? 'Prospecto actualizado' : 'Prospecto creado', 'success');
    closeModal();
    renderLeadPipeline();
  });
}

function openLeadDetailModal(id) {
  const lead = Leads.find(id);
  if (!lead) return;
  const seller = Sellers.find(lead.assignedTo);
  const sName = seller ? seller.name : 'Sin asignar';

  const stages = {
    new: 'Nuevo Contacto', interested: 'Interesado', quoted: 'Cotizado',
    negotiation: 'Negociación', won: 'Ganado', lost: 'Perdido'
  };

  const html = `
    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:1rem; margin-bottom:1.5rem;">
      <div><strong style="color:var(--text-muted); font-size:0.875rem;">Nombre:</strong><div>${lead.name}</div></div>
      <div><strong style="color:var(--text-muted); font-size:0.875rem;">Contacto:</strong><div>${lead.phone} <br> ${lead.email}</div></div>
      <div><strong style="color:var(--text-muted); font-size:0.875rem;">Interés:</strong><div>${lead.interestedIn || '-'}</div></div>
      <div><strong style="color:var(--text-muted); font-size:0.875rem;">Origen:</strong><div>${getOriginBadge(lead.origin)}</div></div>
      <div><strong style="color:var(--text-muted); font-size:0.875rem;">Vendedor Asignado:</strong><div>${sName}</div></div>
      <div><strong style="color:var(--text-muted); font-size:0.875rem;">Etapa Actual:</strong><div><span class="badge badge-info">${stages[lead.stage]}</span></div></div>
    </div>

    <div class="form-group">
      <label>Actualizar Etapa</label>
      <select id="ld-stage" class="form-control">
        <option value="new" ${lead.stage === 'new' ? 'selected' : ''}>Nuevo Contacto</option>
        <option value="interested" ${lead.stage === 'interested' ? 'selected' : ''}>Interesado</option>
        <option value="quoted" ${lead.stage === 'quoted' ? 'selected' : ''}>Cotizado</option>
        <option value="negotiation" ${lead.stage === 'negotiation' ? 'selected' : ''}>Negociación</option>
        <option value="won" ${lead.stage === 'won' ? 'selected' : ''}>Ganado</option>
        <option value="lost" ${lead.stage === 'lost' ? 'selected' : ''}>Perdido</option>
      </select>
    </div>
    <div class="form-group">
      <label>Notas</label>
      <textarea id="ld-notes" class="form-control" rows="4">${lead.notes}</textarea>
    </div>

    <div style="display:flex; justify-content:space-between; margin-top:2rem;">
      <button id="btn-ld-edit" class="btn btn-ghost"><i data-lucide="edit"></i> Editar Todo</button>
      <div style="display:flex; gap:1rem;">
        ${lead.stage === 'won' ? `<button id="btn-ld-convert" class="btn btn-success"><i data-lucide="user-check"></i> Convertir a Cliente</button>` : ''}
        <button id="btn-ld-save" class="btn btn-primary">Guardar Cambios</button>
      </div>
    </div>
  `;

  openModal('Detalle del Prospecto', html);

  document.getElementById('btn-ld-save')?.addEventListener('click', () => {
    const nStage = document.getElementById('ld-stage').value;
    const nNotes = document.getElementById('ld-notes').value;
    saveLeadRecord({ ...lead, stage: nStage, notes: nNotes });
    closeModal();
    showToast('Prospecto actualizado', 'success');
    renderLeadPipeline();
  });

  document.getElementById('btn-ld-edit')?.addEventListener('click', () => {
    closeModal();
    openLeadModal(id);
  });

  const convertBtn = document.getElementById('btn-ld-convert');
  if (convertBtn) {
    convertBtn.addEventListener('click', () => {
      closeModal();
      const nClient = {
        id: generateId(),
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        docType: 'CI',
        document: '',
        address: '',
        segment: 'prospect',
        interestedIn: lead.interestedIn,
        leadOrigin: lead.origin,
        notes: lead.notes ? [{ id: generateId(), date: now(), type: 'Nota', content: lead.notes }] : [],
        createdAt: now()
      };
      saveClientRecord(nClient);
      Leads.delete(id);
      showToast('Prospecto convertido a cliente', 'success');
      go('#/crm/detail/' + nClient.id);
    });
  }
}
