// =====================================================
// AutoERP — Inventory View Renderer
// =====================================================

import { calculateMargin, getInventoryKPIs, filterVehicles, getVehicleById, saveVehicle, deleteVehicle } from '../../services/inventoryService.js';
import { fmt, fmtDate } from '../../utils/formatters.js';
import { safeCreateIcons } from '../../utils/dom.js';
import { showToast } from '../components/toast.js';
import { confirmDialog } from '../components/modal.js';
import { go } from '../../core/router.js';

const conditionColors = {
  new: 'badge-gold',
  used: 'badge-neutral',
  consigned: 'badge-info'
};

const conditionLabels = {
  new: 'Nuevo',
  used: 'Usado',
  consigned: 'Consignación'
};

const statusColors = {
  available: 'badge-success',
  reserved: 'badge-warning',
  sold: 'badge-neutral',
  in_preparation: 'badge-info',
  in_transit: 'badge-gold'
};

const statusLabels = {
  available: 'Disponible',
  reserved: 'Reservado',
  sold: 'Vendido',
  in_preparation: 'En Preparación',
  in_transit: 'En Tránsito'
};

const originLabels = {
  direct: 'Directo',
  imported: 'Importado',
  trade_in: 'Parte de Pago',
  consignment: 'Consignación'
};

// --- List View ---
export function renderInventoryList() {
  const pageContent = document.getElementById('page-content');
  if (!pageContent) return;

  const kpis = getInventoryKPIs();
  const vehicles = filterVehicles();

  const html = `
    <div class="page-header">
      <div class="header-title">
        <h1>Inventario de Vehículos</h1>
        <p class="text-muted">Gestiona el stock de vehículos disponibles</p>
      </div>
      <div class="header-actions">
        <button id="btn-new-vehicle" class="btn btn-primary">
          <i data-lucide="plus"></i> Nuevo Vehículo
        </button>
      </div>
    </div>

    <div class="kpi-grid">
      <div class="card kpi-card">
        <div class="kpi-icon badge-info"><i data-lucide="car"></i></div>
        <div class="kpi-content">
          <div class="kpi-label">Total Vehículos</div>
          <div class="kpi-value">${kpis.total}</div>
        </div>
      </div>
      <div class="card kpi-card">
        <div class="kpi-icon badge-success"><i data-lucide="check-circle"></i></div>
        <div class="kpi-content">
          <div class="kpi-label">Disponibles</div>
          <div class="kpi-value">${kpis.available}</div>
        </div>
      </div>
      <div class="card kpi-card">
        <div class="kpi-icon badge-warning"><i data-lucide="clock"></i></div>
        <div class="kpi-content">
          <div class="kpi-label">Reservados</div>
          <div class="kpi-value">${kpis.reserved}</div>
        </div>
      </div>
      <div class="card kpi-card">
        <div class="kpi-icon badge-neutral"><i data-lucide="tag"></i></div>
        <div class="kpi-content">
          <div class="kpi-label">Vendidos</div>
          <div class="kpi-value">${kpis.sold}</div>
        </div>
      </div>
      <div class="card kpi-card">
        <div class="kpi-icon badge-warning"><i data-lucide="calendar"></i></div>
        <div class="kpi-content">
          <div class="kpi-label">Stock Promedio (Días)</div>
          <div class="kpi-value">${kpis.avgDaysInStock}</div>
        </div>
      </div>
    </div>

    <div class="card table-container">
      <div class="table-toolbar" style="display:flex; gap:1rem; margin-bottom:1rem; align-items: center;">
        <div class="filter-input-wrapper" style="flex: 1; max-width: 400px;">
          <input type="text" id="search-inventory" placeholder="Buscar por marca, modelo, VIN..." class="filter-input">
          <i data-lucide="search"></i>
        </div>
        <select id="filter-condition" class="form-control filter-select" style="width: 160px;">
          <option value="">Condición...</option>
          <option value="new">Nuevo</option>
          <option value="used">Usado</option>
          <option value="consigned">Consignado</option>
        </select>
        <select id="filter-status" class="form-control filter-select" style="width: 160px;">
          <option value="">Estado...</option>
          <option value="available">Disponible</option>
          <option value="reserved">Reservado</option>
          <option value="sold">Vendido</option>
          <option value="in_preparation">En Prep.</option>
          <option value="in_transit">En Tránsito</option>
        </select>
      </div>

      <div class="table-wrap">
        <table class="table" id="inventory-table">
          <thead>
            <tr>
              <th>Vehículo</th>
              <th>Año/Color/KM</th>
              <th>Condición</th>
              <th>Estado</th>
              <th>Origen</th>
              <th class="text-right">Precio Sug.</th>
              <th class="text-right">Margen Est.</th>
              <th class="text-center">Acciones</th>
            </tr>
          </thead>
          <tbody id="inventory-tbody">
            <!-- Rows rendered by JS -->
          </tbody>
        </table>
      </div>
    </div>
  `;

  pageContent.innerHTML = html;

  const renderRows = (data) => {
    const tbody = document.getElementById('inventory-tbody');
    if (!tbody) return;
    if (data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted">No hay vehículos registrados</td></tr>`;
      safeCreateIcons({ nodes: [tbody] });
      return;
    }

    tbody.innerHTML = data.map(v => {
      const margin = calculateMargin(v);
      const marginClass = margin >= 0 ? 'text-success' : 'text-danger';
      return `
        <tr>
          <td>
            <div style="font-weight: 500;">${v.brand} ${v.model}</div>
            <div class="text-muted text-sm">${v.version || ''} • ${v.vin}</div>
          </td>
          <td>
            <div>${v.year} • ${v.color}</div>
            <div class="text-muted text-sm">${v.mileage} km</div>
          </td>
          <td><span class="badge ${conditionColors[v.condition]}">${conditionLabels[v.condition] || v.condition}</span></td>
          <td><span class="badge ${statusColors[v.commercialStatus]}">${statusLabels[v.commercialStatus] || v.commercialStatus}</span></td>
          <td>${originLabels[v.origin] || v.origin}</td>
          <td class="text-right">${fmt(v.suggestedPrice, v.currency)}</td>
          <td class="text-right ${marginClass}">${fmt(margin, v.currency)}</td>
          <td class="text-center">
            <div class="action-buttons" style="justify-content: center;">
              <button class="btn btn-ghost btn-sm btn-view" data-id="${v.id}" title="Ver"><i data-lucide="eye"></i></button>
              <button class="btn btn-ghost btn-sm btn-edit" data-id="${v.id}" title="Editar"><i data-lucide="edit-2"></i></button>
              <button class="btn btn-ghost btn-sm text-danger btn-delete" data-id="${v.id}" title="Eliminar"><i data-lucide="trash-2"></i></button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    safeCreateIcons({ nodes: [tbody] });

    tbody.querySelectorAll('.btn-view').forEach(btn => {
      btn.addEventListener('click', () => go('#/inventory/detail/' + btn.dataset.id));
    });
    tbody.querySelectorAll('.btn-edit').forEach(btn => {
      btn.addEventListener('click', () => go('#/inventory/edit/' + btn.dataset.id));
    });
    tbody.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', () => {
        confirmDialog('¿Estás seguro de que deseas eliminar este vehículo?', () => {
          deleteVehicle(btn.dataset.id);
          showToast('Vehículo eliminado con éxito', 'success');
          renderInventoryList();
        }, 'Eliminar Vehículo');
      });
    });
  };

  renderRows(vehicles);
  safeCreateIcons({ nodes: [pageContent] });

  document.getElementById('btn-new-vehicle')?.addEventListener('click', () => {
    go('#/inventory/new');
  });

  const filterData = () => {
    const q = document.getElementById('search-inventory').value;
    const cond = document.getElementById('filter-condition').value;
    const stat = document.getElementById('filter-status').value;
    renderRows(filterVehicles(q, cond, stat));
  };

  document.getElementById('search-inventory')?.addEventListener('input', filterData);
  document.getElementById('filter-condition')?.addEventListener('change', filterData);
  document.getElementById('filter-status')?.addEventListener('change', filterData);
}

// --- Detail View ---
export function renderInventoryDetail(vehicleId) {
  const pageContent = document.getElementById('page-content');
  if (!pageContent) return;

  const vehicle = getVehicleById(vehicleId);

  if (!vehicle) {
    pageContent.innerHTML = `<div class="card"><div class="card-title">Vehículo no encontrado</div><button class="btn btn-primary" id="btn-back">Volver</button></div>`;
    document.getElementById('btn-back')?.addEventListener('click', () => go('#/inventory'));
    return;
  }

  const cost = (vehicle.purchaseCost || 0) + (vehicle.importCosts || 0) + (vehicle.prepCost || 0) + (vehicle.commission || 0);
  const margin = calculateMargin(vehicle);
  const marginClass = margin >= 0 ? 'text-success' : 'text-danger';

  const html = `
    <div class="page-header">
      <div class="header-title" style="display: flex; align-items: center; gap: 1rem;">
        <button class="btn btn-ghost" id="btn-back"><i data-lucide="arrow-left"></i></button>
        <div>
          <h1 style="display: flex; align-items: center; gap: 0.5rem;">
            ${vehicle.brand} ${vehicle.model} ${vehicle.version || ''} 
            <span class="badge ${statusColors[vehicle.commercialStatus]}">${statusLabels[vehicle.commercialStatus] || vehicle.commercialStatus}</span>
            <span class="badge ${conditionColors[vehicle.condition]}">${conditionLabels[vehicle.condition] || vehicle.condition}</span>
          </h1>
          <p class="text-muted">VIN: ${vehicle.vin}</p>
        </div>
      </div>
      <div class="header-actions">
        <button id="btn-edit" class="btn btn-secondary"><i data-lucide="edit-2"></i> Editar</button>
        <button id="btn-status" class="btn btn-primary"><i data-lucide="refresh-cw"></i> Cambiar Estado</button>
      </div>
    </div>

    <div style="display: flex; gap: 1rem; margin-bottom: 1.5rem;">
      <div class="card" style="flex: 1; display: flex; align-items: center; justify-content: center; background: var(--bg-base); min-height: 200px;">
        <i data-lucide="car" style="width: 64px; height: 64px; color: var(--border);"></i>
      </div>
      <div class="card" style="flex: 2;">
        <h3 class="card-title">Resumen</h3>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem;">
          <div>
            <div class="text-muted text-sm">Año</div>
            <div style="font-weight: 500;">${vehicle.year}</div>
          </div>
          <div>
            <div class="text-muted text-sm">Color</div>
            <div style="font-weight: 500;">${vehicle.color}</div>
          </div>
          <div>
            <div class="text-muted text-sm">Kilometraje</div>
            <div style="font-weight: 500;">${vehicle.mileage} km</div>
          </div>
          <div>
            <div class="text-muted text-sm">Origen</div>
            <div style="font-weight: 500;">${originLabels[vehicle.origin] || vehicle.origin}</div>
          </div>
          <div>
            <div class="text-muted text-sm">Sucursal</div>
            <div style="font-weight: 500;">${vehicle.branch || 'Principal'}</div>
          </div>
          <div>
            <div class="text-muted text-sm">Precio Sugerido</div>
            <div style="font-weight: 500; color: var(--gold);">${fmt(vehicle.suggestedPrice, vehicle.currency)}</div>
          </div>
        </div>
      </div>
    </div>

    <div class="card">
      <div style="display: flex; border-bottom: 1px solid var(--border); margin-bottom: 1rem; gap: 1rem;" id="tabs-header">
        <div class="tab-item active" style="padding: 0.5rem 1rem; cursor: pointer; border-bottom: 2px solid var(--gold); color: var(--gold);" data-tab="info">Información</div>
        <div class="tab-item" style="padding: 0.5rem 1rem; cursor: pointer;" data-tab="costs">Costos y Margen</div>
        <div class="tab-item" style="padding: 0.5rem 1rem; cursor: pointer;" data-tab="history">Historial</div>
        <div class="tab-item" style="padding: 0.5rem 1rem; cursor: pointer;" data-tab="docs">Documentos</div>
      </div>
      
      <div id="tab-info" class="tab-content" style="display: block;">
        <div class="form-grid">
          <div><label class="text-muted">Marca</label><div>${vehicle.brand}</div></div>
          <div><label class="text-muted">Modelo</label><div>${vehicle.model}</div></div>
          <div><label class="text-muted">Versión</label><div>${vehicle.version || '-'}</div></div>
          <div><label class="text-muted">VIN</label><div>${vehicle.vin}</div></div>
          <div><label class="text-muted">Año</label><div>${vehicle.year}</div></div>
          <div><label class="text-muted">Color</label><div>${vehicle.color}</div></div>
          <div><label class="text-muted">Kilometraje</label><div>${vehicle.mileage} km</div></div>
          <div><label class="text-muted">Condición</label><div>${conditionLabels[vehicle.condition] || vehicle.condition}</div></div>
          <div><label class="text-muted">Estado</label><div>${statusLabels[vehicle.commercialStatus] || vehicle.commercialStatus}</div></div>
          <div><label class="text-muted">Origen</label><div>${originLabels[vehicle.origin] || vehicle.origin}</div></div>
          <div><label class="text-muted">Sucursal</label><div>${vehicle.branch || 'Principal'}</div></div>
        </div>
      </div>

      <div id="tab-costs" class="tab-content" style="display: none;">
        <table class="table">
          <tbody>
            <tr><td>Costo de Compra</td><td class="text-right">${fmt(vehicle.purchaseCost, vehicle.currency)}</td></tr>
            <tr><td>Costos de Importación</td><td class="text-right">${fmt(vehicle.importCosts, vehicle.currency)}</td></tr>
            <tr><td>Costo de Preparación</td><td class="text-right">${fmt(vehicle.prepCost, vehicle.currency)}</td></tr>
            <tr><td>Comisión</td><td class="text-right">${fmt(vehicle.commission, vehicle.currency)}</td></tr>
            <tr style="border-top: 2px solid var(--border); font-weight: bold;">
              <td>Costo Total Estimado</td><td class="text-right">${fmt(cost, vehicle.currency)}</td>
            </tr>
            <tr style="font-weight: bold;">
              <td>Precio Sugerido</td><td class="text-right" style="color: var(--gold);">${fmt(vehicle.suggestedPrice, vehicle.currency)}</td>
            </tr>
            <tr style="font-weight: bold;">
              <td>Margen Estimado</td><td class="text-right ${marginClass}">${fmt(margin, vehicle.currency)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div id="tab-history" class="tab-content" style="display: none;">
        <ul style="list-style: none; padding: 0;">
          ${(vehicle.history || []).map(h => `
            <li style="margin-bottom: 1rem; border-left: 2px solid var(--gold); padding-left: 1rem;">
              <div class="text-muted text-sm">${fmtDate(h.date)}</div>
              <div>${h.action} - <span class="text-muted">por ${h.by}</span></div>
            </li>
          `).join('') || '<div class="text-muted">No hay historial registrado.</div>'}
        </ul>
      </div>

      <div id="tab-docs" class="tab-content" style="display: none;">
        <div class="text-muted">No hay documentos adjuntos.</div>
      </div>
    </div>
    
    <div class="card" style="margin-top: 1.5rem;">
      <div class="card-header"><h3 class="card-title">Galería de fotos</h3></div>
      <div style="display: flex; gap: 1rem; overflow-x: auto; padding: 1rem 0;">
        <div style="width: 150px; height: 100px; background: var(--bg-base); display: flex; align-items: center; justify-content: center; border: 1px dashed var(--border); border-radius: 4px; color: var(--text-muted); cursor: pointer;">
          <i data-lucide="plus"></i> Agregar Foto
        </div>
      </div>
    </div>
  `;

  pageContent.innerHTML = html;
  safeCreateIcons({ nodes: [pageContent] });

  document.getElementById('btn-back')?.addEventListener('click', () => go('#/inventory'));
  document.getElementById('btn-edit')?.addEventListener('click', () => go('#/inventory/edit/' + vehicle.id));
  document.getElementById('btn-status')?.addEventListener('click', () => {
    showToast('Funcionalidad para cambiar estado en desarrollo', 'info');
  });

  const tabs = pageContent.querySelectorAll('.tab-item');
  const contents = pageContent.querySelectorAll('.tab-content');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => {
        t.classList.remove('active');
        t.style.borderBottom = 'none';
        t.style.color = 'var(--text-main)';
      });
      contents.forEach(c => c.style.display = 'none');
      
      tab.classList.add('active');
      tab.style.borderBottom = '2px solid var(--gold)';
      tab.style.color = 'var(--gold)';
      const targetContent = document.getElementById('tab-' + tab.dataset.tab);
      if (targetContent) targetContent.style.display = 'block';
    });
  });
}

// --- Form View ---
export function renderInventoryForm(vehicleId = null) {
  const pageContent = document.getElementById('page-content');
  if (!pageContent) return;

  let vehicle = vehicleId ? getVehicleById(vehicleId) : {};

  if (vehicleId && !vehicle) {
    pageContent.innerHTML = `<div class="card"><div class="card-title">Vehículo no encontrado</div><button class="btn btn-primary" id="btn-back">Volver</button></div>`;
    document.getElementById('btn-back')?.addEventListener('click', () => go('#/inventory'));
    return;
  }

  const isEdit = !!vehicleId;
  const title = isEdit ? 'Editar Vehículo' : 'Nuevo Vehículo';

  const html = `
    <div class="page-header">
      <div class="header-title">
        <h1>${title}</h1>
      </div>
      <div class="header-actions">
        <button id="btn-cancel" class="btn btn-ghost">Cancelar</button>
        <button id="btn-save" class="btn btn-primary"><i data-lucide="save"></i> Guardar</button>
      </div>
    </div>

    <form id="vehicle-form">
      <div class="card" style="margin-bottom: 1.5rem;">
        <div class="card-header"><h3 class="card-title">Información Base</h3></div>
        <div class="form-grid">
          <div class="form-group">
            <label>VIN <span class="text-danger">*</span></label>
            <input type="text" id="v-vin" class="form-control" required value="${vehicle.vin || ''}">
          </div>
          <div class="form-group">
            <label>Marca <span class="text-danger">*</span></label>
            <input type="text" id="v-brand" class="form-control" required value="${vehicle.brand || ''}">
          </div>
          <div class="form-group">
            <label>Modelo <span class="text-danger">*</span></label>
            <input type="text" id="v-model" class="form-control" required value="${vehicle.model || ''}">
          </div>
          <div class="form-group">
            <label>Versión</label>
            <input type="text" id="v-version" class="form-control" value="${vehicle.version || ''}">
          </div>
          <div class="form-group">
            <label>Año <span class="text-danger">*</span></label>
            <input type="number" id="v-year" class="form-control" required value="${vehicle.year || new Date().getFullYear()}">
          </div>
          <div class="form-group">
            <label>Color</label>
            <input type="text" id="v-color" class="form-control" value="${vehicle.color || ''}">
          </div>
          <div class="form-group">
            <label>Kilometraje <span class="text-danger">*</span></label>
            <input type="number" id="v-mileage" class="form-control" required value="${vehicle.mileage || 0}">
          </div>
        </div>
      </div>

      <div class="card" style="margin-bottom: 1.5rem;">
        <div class="card-header"><h3 class="card-title">Origen y Estado</h3></div>
        <div class="form-grid">
          <div class="form-group">
            <label>Condición</label>
            <select id="v-condition" class="form-control">
              <option value="new" ${vehicle.condition === 'new' ? 'selected' : ''}>Nuevo</option>
              <option value="used" ${vehicle.condition === 'used' ? 'selected' : (!vehicle.condition ? 'selected' : '')}>Usado</option>
              <option value="consigned" ${vehicle.condition === 'consigned' ? 'selected' : ''}>Consignado</option>
            </select>
          </div>
          <div class="form-group">
            <label>Origen</label>
            <select id="v-origin" class="form-control">
              <option value="direct" ${vehicle.origin === 'direct' ? 'selected' : ''}>Directo</option>
              <option value="imported" ${vehicle.origin === 'imported' ? 'selected' : ''}>Importado</option>
              <option value="trade_in" ${vehicle.origin === 'trade_in' ? 'selected' : ''}>Parte de Pago</option>
              <option value="consignment" ${vehicle.origin === 'consignment' ? 'selected' : ''}>Consignación</option>
            </select>
          </div>
          <div class="form-group">
            <label>Estado Comercial</label>
            <select id="v-status" class="form-control">
              <option value="available" ${vehicle.commercialStatus === 'available' ? 'selected' : ''}>Disponible</option>
              <option value="reserved" ${vehicle.commercialStatus === 'reserved' ? 'selected' : ''}>Reservado</option>
              <option value="sold" ${vehicle.commercialStatus === 'sold' ? 'selected' : ''}>Vendido</option>
              <option value="in_preparation" ${vehicle.commercialStatus === 'in_preparation' ? 'selected' : ''}>En Preparación</option>
              <option value="in_transit" ${vehicle.commercialStatus === 'in_transit' ? 'selected' : ''}>En Tránsito</option>
            </select>
          </div>
          <div class="form-group">
            <label>Sucursal</label>
            <input type="text" id="v-branch" class="form-control" value="${vehicle.branch || 'Asunción'}">
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header"><h3 class="card-title">Precios y Costos</h3></div>
        <div class="form-grid">
          <div class="form-group">
            <label>Moneda</label>
            <select id="v-currency" class="form-control">
              <option value="USD" ${vehicle.currency === 'USD' ? 'selected' : ''}>USD</option>
              <option value="PYG" ${vehicle.currency === 'PYG' ? 'selected' : ''}>PYG</option>
            </select>
          </div>
          <div class="form-group">
            <label>Costo de Compra</label>
            <input type="number" id="v-purchaseCost" class="form-control" value="${vehicle.purchaseCost || 0}">
          </div>
          <div class="form-group">
            <label>Costos de Importación</label>
            <input type="number" id="v-importCosts" class="form-control" value="${vehicle.importCosts || 0}">
          </div>
          <div class="form-group">
            <label>Costo de Preparación</label>
            <input type="number" id="v-prepCost" class="form-control" value="${vehicle.prepCost || 0}">
          </div>
          <div class="form-group">
            <label>Comisión</label>
            <input type="number" id="v-commission" class="form-control" value="${vehicle.commission || 0}">
          </div>
          <div class="form-group">
            <label>Precio Sugerido</label>
            <input type="number" id="v-suggestedPrice" class="form-control" value="${vehicle.suggestedPrice || 0}">
          </div>
        </div>
      </div>
    </form>
  `;

  pageContent.innerHTML = html;
  safeCreateIcons({ nodes: [pageContent] });

  document.getElementById('btn-cancel')?.addEventListener('click', () => {
    if (isEdit) go('#/inventory/detail/' + vehicleId);
    else go('#/inventory');
  });

  document.getElementById('btn-save')?.addEventListener('click', () => {
    const form = document.getElementById('vehicle-form');
    if (form && !form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const data = {
      vin: document.getElementById('v-vin').value,
      brand: document.getElementById('v-brand').value,
      model: document.getElementById('v-model').value,
      version: document.getElementById('v-version').value,
      year: parseInt(document.getElementById('v-year').value, 10),
      color: document.getElementById('v-color').value,
      mileage: parseInt(document.getElementById('v-mileage').value, 10),
      condition: document.getElementById('v-condition').value,
      origin: document.getElementById('v-origin').value,
      commercialStatus: document.getElementById('v-status').value,
      branch: document.getElementById('v-branch').value,
      currency: document.getElementById('v-currency').value,
      purchaseCost: parseFloat(document.getElementById('v-purchaseCost').value) || 0,
      importCosts: parseFloat(document.getElementById('v-importCosts').value) || 0,
      prepCost: parseFloat(document.getElementById('v-prepCost').value) || 0,
      commission: parseFloat(document.getElementById('v-commission').value) || 0,
      suggestedPrice: parseFloat(document.getElementById('v-suggestedPrice').value) || 0
    };

    if (isEdit) {
      saveVehicle({ ...getVehicleById(vehicleId), ...data });
      showToast('Vehículo actualizado', 'success');
      go('#/inventory/detail/' + vehicleId);
    } else {
      saveVehicle(data);
      showToast('Vehículo creado', 'success');
      go('#/inventory');
    }
  });
}
