// =====================================================
// AutoERP — Sales View Renderer
// =====================================================

import { getSalesKPIs, getSalesByStage, getClientName, getVehicleName, getSellerName, advanceSaleStage, createSaleQuote } from '../../services/salesService.js';
import { Sales, Vehicles, Clients, Sellers } from '../../core/store.js';
import { fmt, fmtDate } from '../../utils/formatters.js';
import { safeCreateIcons } from '../../utils/dom.js';
import { showToast } from '../components/toast.js';
import { confirmDialog } from '../components/modal.js';
import { go } from '../../core/router.js';

export function renderSalesPipeline() {
  const content = document.getElementById('page-content');
  if (!content) return;

  const kpis = getSalesKPIs();
  const columns = getSalesByStage();

  const renderCard = (sale) => `
    <div class="card mb-2" style="cursor: pointer;" data-sale-id="${sale.id}">
      <div class="card-body p-2">
        <div class="d-flex justify-content-between align-items-start mb-2">
          <span class="badge badge-neutral">${sale.saleNumber}</span>
          <span class="text-xs text-muted">${fmtDate(sale.createdAt)}</span>
        </div>
        <h5 class="m-0 mb-1" style="font-size: 1rem;">${getClientName(sale.clientId)}</h5>
        <div class="text-sm text-muted mb-2"><i data-lucide="car" class="icon-sm"></i> ${getVehicleName(sale.vehicleId)}</div>
        <div class="text-sm mb-2"><i data-lucide="user" class="icon-sm"></i> ${getSellerName(sale.sellerId)}</div>
        <div class="d-flex justify-content-between align-items-center mt-3">
          <span class="font-bold text-${columns[sale.stage].color}">${fmt(sale.totalPrice, sale.currency)}</span>
          ${sale.stage !== 'delivery' ? `
            <button type="button" class="btn btn-ghost btn-sm advance-btn" data-id="${sale.id}" data-stage="${sale.stage}">
              <i data-lucide="arrow-right"></i>
            </button>
          ` : ''}
        </div>
      </div>
    </div>
  `;

  let html = `
    <div class="page-header d-flex justify-content-between align-items-center mb-4">
      <h2 class="m-0">Pipeline de Ventas</h2>
      <button id="btn-new-sale" class="btn btn-primary">
        <i data-lucide="plus"></i> Nueva Cotización
      </button>
    </div>

    <!-- KPIs -->
    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin-bottom: 1.5rem;">
      <div class="card" style="padding: 1.25rem;">
        <div style="font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); margin-bottom: 0.5rem;">Total Ventas</div>
        <div style="font-size: 2rem; font-weight: 700; color: var(--text-primary); font-family: 'Outfit', sans-serif; line-height: 1;">${kpis.totalSales}</div>
      </div>
      <div class="card" style="padding: 1.25rem;">
        <div style="font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); margin-bottom: 0.5rem;">Monto Vendido</div>
        <div style="font-size: 1.5rem; font-weight: 700; color: var(--success); font-family: 'Outfit', sans-serif; line-height: 1;">${fmt(kpis.totalAmountSold, 'PYG')}</div>
      </div>
      <div class="card" style="padding: 1.25rem;">
        <div style="font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); margin-bottom: 0.5rem;">En Proceso</div>
        <div style="font-size: 2rem; font-weight: 700; color: var(--warning); font-family: 'Outfit', sans-serif; line-height: 1;">${kpis.inProcessSalesCount}</div>
      </div>
      <div class="card" style="padding: 1.25rem;">
        <div style="font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); margin-bottom: 0.5rem;">Entregados</div>
        <div style="font-size: 2rem; font-weight: 700; color: var(--gold); font-family: 'Outfit', sans-serif; line-height: 1;">${kpis.deliveredSalesCount}</div>
      </div>
    </div>

    <!-- Stacked Pipeline Board (per user sketch) -->
    <div class="pipeline-stacked" style="margin-top: 2rem;">
      ${Object.entries(columns).map(([key, col]) => `
        <div class="pipeline-stage" style="margin-bottom: 2.5rem;">
          <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid var(--border-color); padding-bottom: 0.75rem; margin-bottom: 1.25rem;">
            <h3 style="margin: 0; font-size: 1.5rem; display: flex; align-items: center; gap: 0.5rem; color: var(--text-primary); font-weight: 400;">
              <span style="color: var(--${col.color});">${col.title}</span> 
              <span style="color: var(--text-muted); font-size: 1.1rem;">(${col.items.length})</span>
            </h3>
            <div style="position: relative; width: 320px;">
              <input type="text" class="form-control stage-search" data-stage="${key}" placeholder="Buscar vehículo, cliente..." style="padding-left: 2.5rem; padding-right: 1rem; background: var(--bg-card); border-radius: 24px; border: 1px solid var(--border-color); box-shadow: var(--shadow-sm); height: 40px; transition: box-shadow 0.2s, border-color 0.2s;" onfocus="this.style.boxShadow='var(--shadow-md)'; this.style.borderColor='var(--gold)';" onblur="this.style.boxShadow='var(--shadow-sm)'; this.style.borderColor='var(--border-color)';">
              <i data-lucide="search" style="position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: var(--text-muted); width: 18px; height: 18px;"></i>
            </div>
          </div>
          <div class="stage-cards" id="stage-cards-${key}" style="display: flex; gap: 1.25rem; overflow-x: auto; padding-bottom: 1rem; min-height: 120px;">
            ${col.items.map(renderCard).join('')}
            ${col.items.length === 0 ? '<div style="color: var(--text-muted); padding: 2rem 0; font-size: 1rem;">No hay ventas en esta etapa</div>' : ''}
          </div>
        </div>
      `).join('')}
    </div>
  `;

  content.innerHTML = html;
  safeCreateIcons({ nodes: [content] });

  document.getElementById('btn-new-sale')?.addEventListener('click', () => {
    go('#/sales/new');
  });

  content.querySelectorAll('.stage-search').forEach(input => {
    input.addEventListener('input', (e) => {
      const term = e.target.value.toLowerCase();
      const stageKey = e.target.dataset.stage;
      const container = document.getElementById(`stage-cards-${stageKey}`);
      if (container) {
        container.querySelectorAll('.card[data-sale-id]').forEach(card => {
          const text = card.textContent.toLowerCase();
          card.style.display = text.includes(term) ? 'block' : 'none';
        });
      }
    });
  });

  content.querySelectorAll('.card[data-sale-id]').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.advance-btn')) return;
      go(`#/sales/detail/${card.dataset.saleId}`);
    });
  });

  content.querySelectorAll('.advance-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const saleId = btn.dataset.id;
      const currentStage = btn.dataset.stage;
      confirmDialog(`¿Avanzar venta a la siguiente etapa?`, () => {
        const res = advanceSaleStage(saleId, currentStage);
        if (res) {
          showToast(`Venta avanzada a ${res.nextStage}`, 'success');
          renderSalesPipeline();
        }
      });
    });
  });
}

export function renderSaleDetail(saleId) {
  const content = document.getElementById('page-content');
  if (!content) return;

  const sale = Sales.find(saleId);
  if (!sale) {
    content.innerHTML = `<div class="p-4 text-center">Venta no encontrada. <button class="btn btn-primary" onclick="window.location.hash='#/sales'">Volver</button></div>`;
    return;
  }

  const client = Clients.find(sale.clientId) || {};
  const vehicle = Vehicles.find(sale.vehicleId) || {};
  const seller = Sellers.find(sale.sellerId) || {};

  const stageFlow = [
    { id: 'quote', label: 'Cotización' },
    { id: 'reservation', label: 'Reserva' },
    { id: 'contract', label: 'Contrato' },
    { id: 'delivery', label: 'Entrega' }
  ];

  const currentStageIndex = stageFlow.findIndex(s => s.id === sale.stage);

  let html = `
    <div class="mb-4">
      <button class="btn btn-ghost mb-2" id="btn-back-pipeline">
        <i data-lucide="arrow-left"></i> Volver al Pipeline
      </button>
      <div class="d-flex justify-content-between align-items-center">
        <h2 class="m-0">Detalle de Venta: ${sale.saleNumber}</h2>
        <span class="badge badge-neutral">${fmtDate(sale.createdAt)}</span>
      </div>
    </div>

    <!-- Pipeline Breadcrumb -->
    <div class="card mb-4">
      <div class="card-body p-4">
        <div class="d-flex justify-content-between position-relative">
          <div class="position-absolute" style="top: 15px; left: 0; right: 0; height: 2px; background: var(--border-color); z-index: 1;"></div>
          ${stageFlow.map((stage, idx) => {
            const isCompleted = idx <= currentStageIndex;
            const color = isCompleted ? 'var(--gold)' : 'var(--bg-card)';
            const border = isCompleted ? 'var(--gold)' : 'var(--border-color)';
            const textColor = isCompleted ? 'var(--text-color)' : 'var(--text-muted)';
            return `
              <div class="text-center position-relative" style="z-index: 2; width: 25%;">
                <div class="mx-auto mb-2 d-flex align-items-center justify-content-center" style="width: 32px; height: 32px; border-radius: 50%; background: ${color}; border: 2px solid ${border};">
                  ${isCompleted ? '<i data-lucide="check" style="width: 16px; height: 16px; color: #000;"></i>' : ''}
                </div>
                <div class="font-bold text-sm" style="color: ${textColor}">${stage.label}</div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>

    <div class="row">
      <!-- Left Column -->
      <div class="col-md-6 mb-4">
        <!-- Vehículo -->
        <div class="card mb-4">
          <div class="card-header"><h3 class="card-title">Vehículo</h3></div>
          <div class="card-body">
            <p><strong>Marca:</strong> ${vehicle.brand || '-'}</p>
            <p><strong>Modelo:</strong> ${vehicle.model || '-'}</p>
            <p><strong>Versión:</strong> ${vehicle.version || '-'}</p>
            <p><strong>Año:</strong> ${vehicle.year || '-'}</p>
            <p><strong>Color:</strong> ${vehicle.color || '-'}</p>
            <p><strong>VIN:</strong> ${vehicle.vin || '-'}</p>
          </div>
        </div>

        <!-- Cliente -->
        <div class="card mb-4">
          <div class="card-header"><h3 class="card-title">Cliente</h3></div>
          <div class="card-body">
            <p><strong>Nombre:</strong> ${client.name || `${client.firstName || ''} ${client.lastName || ''}`.trim()}</p>
            <p><strong>Documento:</strong> ${client.document || '-'}</p>
            <p><strong>Email:</strong> ${client.email || '-'}</p>
            <p><strong>Teléfono:</strong> ${client.phone || '-'}</p>
          </div>
        </div>

        <!-- Vendedor -->
        <div class="card mb-4">
          <div class="card-header"><h3 class="card-title">Vendedor</h3></div>
          <div class="card-body">
            <p><strong>Nombre:</strong> ${seller.name || `${seller.firstName || ''} ${seller.lastName || ''}`.trim()}</p>
            <p><strong>Email:</strong> ${seller.email || '-'}</p>
          </div>
        </div>
      </div>

      <!-- Right Column -->
      <div class="col-md-6 mb-4">
        <!-- Resumen económico -->
        <div class="card mb-4">
          <div class="card-header"><h3 class="card-title">Resumen Económico</h3></div>
          <div class="card-body">
            <p><strong>Precio Total:</strong> <span class="font-bold text-success">${fmt(sale.totalPrice, sale.currency)}</span></p>
            <p><strong>Entrega Inicial:</strong> ${fmt(sale.downPayment, sale.currency)}</p>
            <p><strong>Monto Financiado / Saldo:</strong> ${fmt(sale.totalPrice - (sale.downPayment || 0) - (sale.advanceAmount || 0), sale.currency)}</p>
            <p><strong>Tipo de Pago:</strong> 
              ${sale.paymentType === 'cash' ? 'Contado' : 
                sale.paymentType === 'financed_own' ? 'Financiación Propia' : 'Financiación Bancaria'}
            </p>
          </div>
        </div>

        <!-- Estado de entrega -->
        <div class="card mb-4">
          <div class="card-header"><h3 class="card-title">Estado de Entrega</h3></div>
          <div class="card-body">
            <p>
              ${sale.deliveryStatus === 'pending' ? 
                '<span class="badge badge-warning">Pendiente de entrega</span>' : 
                '<span class="badge badge-success">Entregado</span>'}
            </p>
          </div>
        </div>

        <!-- Acciones -->
        <div class="card mb-4">
          <div class="card-header"><h3 class="card-title">Acciones</h3></div>
          <div class="card-body d-flex flex-column gap-2">
            ${sale.stage !== 'delivery' ? `
              <button class="btn btn-primary w-100 mb-2" id="btn-advance">
                Avanzar a ${stageFlow[currentStageIndex + 1]?.label || ''} <i data-lucide="arrow-right"></i>
              </button>
            ` : ''}
            
            <button class="btn btn-secondary w-100 mb-2" id="btn-pdf">
              <i data-lucide="file-text"></i> Generar Contrato PDF
            </button>
            
            <button class="btn btn-ghost w-100 mb-2" id="btn-tradein">
              <i data-lucide="car"></i> Registrar Parte de Pago
            </button>

            ${sale.paymentType === 'financed_own' ? `
              <button class="btn btn-ghost w-100 mb-2" id="btn-finance">
                <i data-lucide="credit-card"></i> Configurar Financiación
              </button>
            ` : ''}
          </div>
        </div>
      </div>
    </div>

    <!-- History Timeline -->
    <div class="card">
      <div class="card-header"><h3 class="card-title">Historial</h3></div>
      <div class="card-body">
        <ul style="list-style: none; padding-left: 0; margin-bottom: 0;">
          ${(sale.history || []).map(h => `
            <li class="mb-3 d-flex align-items-start">
              <div class="me-3 mt-1" style="width: 10px; height: 10px; border-radius: 50%; background: var(--gold);"></div>
              <div>
                <div class="text-sm font-bold">${fmtDate(h.date)} - ${h.stage}</div>
                <div class="text-muted text-sm">${h.note || ''} (por ${h.by || 'Sistema'})</div>
              </div>
            </li>
          `).join('')}
        </ul>
      </div>
    </div>
  `;

  content.innerHTML = html;
  safeCreateIcons({ nodes: [content] });

  document.getElementById('btn-back-pipeline')?.addEventListener('click', () => go('#/sales'));

  document.getElementById('btn-advance')?.addEventListener('click', () => {
    confirmDialog(`¿Avanzar venta a la siguiente etapa?`, () => {
      const res = advanceSaleStage(saleId, sale.stage);
      if (res) {
        showToast(`Venta avanzada a ${res.nextStage}`, 'success');
        renderSaleDetail(saleId);
      }
    });
  });

  document.getElementById('btn-pdf')?.addEventListener('click', () => {
    if (typeof window.jspdf === 'undefined') {
      showToast('Librería PDF no cargada aún', 'danger');
      return;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('CONTRATO DE COMPRA-VENTA DE VEHÍCULO AUTOMOTOR', 105, 20, { align: 'center' });
    doc.setFontSize(12);
    doc.text('Venta: ' + (sale.saleNumber || sale.id), 20, 40);
    doc.text('Fecha: ' + new Date(sale.createdAt).toLocaleDateString(), 20, 50);
    doc.text('Vehículo: ' + (vehicle ? (vehicle.brand + ' ' + vehicle.model) : 'N/A'), 20, 70);
    doc.text('Cliente: ' + (client ? client.name : 'N/A'), 20, 80);
    doc.text('Precio Total: ' + sale.totalPrice, 20, 100);
    doc.text('_____________________________', 40, 150);
    doc.text('Firma Vendedor', 55, 160);
    doc.text('_____________________________', 120, 150);
    doc.text('Firma Comprador', 135, 160);
    doc.save('Contrato_' + (sale.saleNumber || sale.id) + '.pdf');
    showToast('Contrato PDF generado exitosamente', 'success');
  });

  document.getElementById('btn-tradein')?.addEventListener('click', () => {
    import('../components/modal.js').then(({ openModal, closeModal }) => {
      openModal('Recibir Vehículo en Parte de Pago', `
        <form id="tradein-form" class="form-grid">
          <div class="form-group"><label>Marca y Modelo</label><input type="text" id="tradein-model" class="form-control" required></div>
          <div class="form-group"><label>Año</label><input type="number" id="tradein-year" class="form-control" required></div>
          <div class="form-group"><label>Valor de Tasación</label><input type="number" id="tradein-value" class="form-control" required></div>
        </form>
      `, `
        <button class="btn btn-secondary" onclick="window._closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="document.getElementById('tradein-form').dispatchEvent(new Event('submit'))">Registrar</button>
      `);
      window._closeModal = closeModal;
      document.getElementById('tradein-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const model = document.getElementById('tradein-model').value;
        const year = document.getElementById('tradein-year').value;
        const value = parseFloat(document.getElementById('tradein-value').value);
        import('../../core/store.js').then(({ Sales, now }) => {
          const sToUpdate = Sales.find(saleId);
          if (sToUpdate) {
            sToUpdate.tradeIn = { model, year, value };
            sToUpdate.history.push({ date: now(), stage: sToUpdate.stage, by: 'Sistema', note: 'Agregado vehículo en parte de pago: ' + model });
            Sales.save(sToUpdate);
            closeModal();
            showToast('Vehículo en parte de pago registrado', 'success');
            renderSaleDetail(saleId);
          }
        });
      });
    });
  });

  document.getElementById('btn-finance')?.addEventListener('click', () => {
    import('../components/modal.js').then(({ openModal, closeModal }) => {
      openModal('Configurar Financiación', `
        <form id="finance-form" class="form-grid">
          <div class="form-group"><label>Monto a Financiar</label><input type="number" id="finance-amount" class="form-control" value="${sale.totalPrice || 0}" required></div>
          <div class="form-group"><label>Cantidad de Cuotas</label><input type="number" id="finance-installments" class="form-control" value="12" required></div>
          <div class="form-group"><label>Tasa Mensual (%)</label><input type="number" step="0.01" id="finance-rate" class="form-control" value="1.5" required></div>
        </form>
      `, `
        <button class="btn btn-secondary" onclick="window._closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="document.getElementById('finance-form').dispatchEvent(new Event('submit'))">Generar Plan</button>
      `);
      window._closeModal = closeModal;
      document.getElementById('finance-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const amount = parseFloat(document.getElementById('finance-amount').value);
        const installments = parseInt(document.getElementById('finance-installments').value);
        const rate = parseFloat(document.getElementById('finance-rate').value) / 100;
        
        import('../../services/financingService.js').then(({ generateFinancingPlan }) => {
          import('../../core/store.js').then(({ Sales, now }) => {
            generateFinancingPlan(saleId, amount, installments, rate, sale.currency || 'PYG');
            const sToUpdate = Sales.find(saleId);
            if (sToUpdate) {
                sToUpdate.paymentType = 'financed_own';
                sToUpdate.history.push({ date: now(), stage: sToUpdate.stage, by: 'Sistema', note: 'Plan de financiación generado' });
                Sales.save(sToUpdate);
            }
            closeModal();
            showToast('Plan de financiación generado', 'success');
            renderSaleDetail(saleId);
          });
        });
      });
    });
  });
}

export function renderSaleForm() {
  const content = document.getElementById('page-content');
  if (!content) return;

  const availableVehicles = Vehicles.available();

  let html = `
    <div class="mb-4">
      <button class="btn btn-ghost mb-2" id="btn-back">
        <i data-lucide="arrow-left"></i> Volver
      </button>
      <h2>Nueva Cotización</h2>
    </div>

    <form id="new-sale-form" class="card">
      <div class="card-body">
        
        <!-- Step 1: Vehicle -->
        <h3 style="margin-bottom: 1rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem;">Paso 1: Seleccionar Vehículo</h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem; margin-bottom: 2rem; max-height: 350px; overflow-y: auto; padding: 0.5rem; background: var(--bg-base); border-radius: 8px; border: 1px solid var(--border-color);">
          ${availableVehicles.map(v => `
            <label class="card" style="cursor: pointer; padding: 1rem; transition: all 0.2s; border: 2px solid transparent; margin: 0; box-shadow: 0 4px 6px rgba(0,0,0,0.05);" onmouseover="this.style.borderColor='var(--gold)'" onmouseout="if(!this.querySelector('input').checked) this.style.borderColor='transparent'">
              <div style="display: flex; gap: 0.75rem; align-items: flex-start;">
                <input type="radio" name="vehicleId" value="${v.id}" required style="margin-top: 0.25rem; transform: scale(1.2); accent-color: var(--gold);" onchange="document.querySelectorAll('input[name=vehicleId]').forEach(i => i.closest('.card').style.borderColor = 'transparent'); this.closest('.card').style.borderColor = 'var(--gold)';">
                <div style="flex: 1;">
                  <div style="font-weight: 700; font-size: 1.1rem; margin-bottom: 0.25rem;">${v.brand} ${v.model}</div>
                  <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.5rem;">Año: ${v.year} | Color: ${v.color}</div>
                  <div style="color: var(--success); font-weight: 700; font-size: 1.2rem; font-family: 'Outfit', sans-serif;">${fmt(v.suggestedPrice || v.price, v.currency)}</div>
                </div>
              </div>
            </label>
          `).join('')}
          ${availableVehicles.length === 0 ? '<div style="color: var(--text-muted); grid-column: 1 / -1; text-align: center; padding: 2rem;">No hay vehículos disponibles</div>' : ''}
        </div>

        <!-- Step 2: Client -->
        <h3 style="margin-bottom: 1rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem;">Paso 2: Seleccionar Cliente</h3>
        <div style="margin-bottom: 2rem;">
          <div style="display: flex; gap: 1.5rem; margin-bottom: 1rem; align-items: center;">
            <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; font-weight: 600;">
              <input type="radio" name="clientMode" value="existing" checked style="accent-color: var(--gold);">
              Cliente Existente
            </label>
            <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; font-weight: 600; color: var(--gold);">
              <input type="radio" name="clientMode" value="new" style="accent-color: var(--gold);">
              <i data-lucide="user-plus" style="width:16px;height:16px;"></i> Nuevo Cliente
            </label>
          </div>

          <div id="existing-client-panel">
            <select name="clientId" id="clientId" class="form-control" style="max-width: 500px;">
              <option value="">Seleccione un cliente...</option>
              ${Clients.all().map(c => `<option value="${c.id}">${c.name || `${c.firstName || ''} ${c.lastName || ''}`.trim()} (${c.document})</option>`).join('')}
            </select>
          </div>

          <div id="new-client-panel" style="display: none; background: var(--bg-base); border: 1px solid var(--gold); border-radius: 10px; padding: 1.25rem; margin-top: 0.75rem; max-width: 700px;">
            <div style="font-weight: 700; margin-bottom: 1rem; color: var(--gold); font-size: 0.9rem; text-transform: uppercase; letter-spacing: 0.05em;">Datos del Nuevo Cliente</div>
            <div class="form-grid" style="grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));">
              <div class="form-group">
                <label>Nombre Completo *</label>
                <input type="text" id="nc-name" class="form-control" placeholder="Ej: Juan Pérez">
              </div>
              <div class="form-group">
                <label>Documento / RUC *</label>
                <input type="text" id="nc-document" class="form-control" placeholder="Ej: 3.456.789">
              </div>
              <div class="form-group">
                <label>Teléfono</label>
                <input type="text" id="nc-phone" class="form-control" placeholder="+595 981 000000">
              </div>
              <div class="form-group">
                <label>Email</label>
                <input type="email" id="nc-email" class="form-control" placeholder="cliente@email.com">
              </div>
            </div>
          </div>
        </div>

        <!-- Step 3: Details -->
        <h3 style="margin-bottom: 1rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem;">Paso 3: Detalles de la Venta</h3>
        <div class="form-grid" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); margin-bottom: 1rem;">
          <div class="form-group">
            <label>Vendedor Asignado</label>
            <select name="sellerId" class="form-control" required>
              <option value="">Seleccione un vendedor...</option>
              ${Sellers.all().map(s => `<option value="${s.id}">${s.name || `${s.firstName || ''} ${s.lastName || ''}`.trim()}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Moneda</label>
            <select name="currency" id="sale-currency" class="form-control" required>
              <option value="USD">USD</option>
              <option value="PYG" selected>PYG</option>
            </select>
          </div>
          <div class="form-group">
            <label>Precio del Vehículo</label>
            <input type="number" name="totalPrice" id="sale-total-price" class="form-control" required min="0">
          </div>
          <div class="form-group">
            <label>Entrega Inicial</label>
            <input type="number" name="downPayment" id="sale-down-payment" class="form-control" value="0" min="0">
          </div>
          <div class="form-group">
            <label>Tipo de Pago</label>
            <select name="paymentType" id="paymentType" class="form-control" required>
              <option value="cash">Contado</option>
              <option value="financed_own">Financiación Propia</option>
              <option value="financed_bank">Financiación Bancaria</option>
            </select>
          </div>
        </div>

        <!-- Financing Panel -->
        <div id="financing-panel" style="display: none; background: var(--bg-base); border: 2px solid var(--gold); border-radius: 12px; padding: 1.5rem; margin-bottom: 1.5rem;">
          <div style="display: inline-flex; align-items: center; gap: 0.5rem; background: rgba(201,162,39,0.12); border: 1px solid var(--gold); border-radius: 20px; padding: 0.3rem 0.85rem; font-size: 0.85rem; font-weight: 700; color: var(--gold); margin-bottom: 1.25rem;">
            <i data-lucide="landmark" style="width:14px; height:14px;"></i>
            <span id="financing-type-label">Financiación</span>
          </div>

          <div class="form-grid" style="grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); margin-bottom: 1.25rem;">
            <div class="form-group">
              <label>Monto a Financiar</label>
              <input type="number" id="fin-amount" class="form-control" readonly style="background: var(--bg-card); font-weight: 700; color: var(--gold);">
            </div>
            <div class="form-group">
              <label>Plazo (meses)</label>
              <select id="fin-months" class="form-control">
                <option value="6">6 meses</option>
                <option value="12" selected>12 meses</option>
                <option value="18">18 meses</option>
                <option value="24">24 meses</option>
                <option value="36">36 meses</option>
                <option value="48">48 meses</option>
                <option value="60">60 meses</option>
                <option value="72">72 meses</option>
              </select>
            </div>
            <div class="form-group">
              <label>Tasa Mensual (%)</label>
              <input type="number" id="fin-rate" class="form-control" value="1.5" step="0.01" min="0">
            </div>
            <div class="form-group">
              <label>Seguro Mensual <small style="color:var(--text-muted)">(opcional)</small></label>
              <input type="number" id="fin-insurance" class="form-control" value="0" min="0">
            </div>
            <div class="form-group" id="fin-bank-group" style="display:none;">
              <label>Banco / Entidad</label>
              <input type="text" id="fin-bank-name" class="form-control" placeholder="Ej: Banco Continental">
            </div>
            <div class="form-group" id="fin-admin-group" style="display:none;">
              <label>Gastos Administrativos</label>
              <input type="number" id="fin-admin-fee" class="form-control" value="0" min="0">
            </div>
          </div>

          <div style="background: var(--bg-card); border-radius: 10px; padding: 1.25rem; display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 0;">
            <div style="text-align: center; padding: 0.75rem;">
              <div style="font-size: 0.7rem; color: var(--text-muted); margin-bottom: 0.25rem; text-transform: uppercase; letter-spacing: 0.06em;">Cuota Mensual</div>
              <div id="res-installment" style="font-size: 1.4rem; font-weight: 800; color: var(--gold); font-family: 'Outfit', sans-serif;">-</div>
            </div>
            <div style="text-align: center; padding: 0.75rem; border-left: 1px solid var(--border-color);">
              <div style="font-size: 0.7rem; color: var(--text-muted); margin-bottom: 0.25rem; text-transform: uppercase; letter-spacing: 0.06em;">Total a Pagar</div>
              <div id="res-total" style="font-size: 1.4rem; font-weight: 800; color: var(--text-primary); font-family: 'Outfit', sans-serif;">-</div>
            </div>
            <div style="text-align: center; padding: 0.75rem; border-left: 1px solid var(--border-color);">
              <div style="font-size: 0.7rem; color: var(--text-muted); margin-bottom: 0.25rem; text-transform: uppercase; letter-spacing: 0.06em;">Interés Total</div>
              <div id="res-interest" style="font-size: 1.4rem; font-weight: 800; color: var(--warning); font-family: 'Outfit', sans-serif;">-</div>
            </div>
            <div style="text-align: center; padding: 0.75rem; border-left: 1px solid var(--border-color);">
              <div style="font-size: 0.7rem; color: var(--text-muted); margin-bottom: 0.25rem; text-transform: uppercase; letter-spacing: 0.06em;">TNA Efectiva</div>
              <div id="res-tna" style="font-size: 1.4rem; font-weight: 800; color: var(--info); font-family: 'Outfit', sans-serif;">-</div>
            </div>
          </div>
          <input type="hidden" name="finMonths" id="fin-months-hidden">
          <input type="hidden" name="finRate" id="fin-rate-hidden">
          <input type="hidden" name="finBankName" id="fin-bank-name-hidden">
          <input type="hidden" name="finInstallment" id="fin-installment-hidden">
        </div>

        <div class="form-group" style="margin-top: 1rem;">
          <label>Notas / Observaciones</label>
          <textarea name="notes" class="form-control" rows="3"></textarea>
        </div>

        <div style="margin-top: 1.5rem; text-align: right;">
          <button type="submit" class="btn btn-primary">
            <i data-lucide="save"></i> Crear Cotización
          </button>
        </div>
      </div>
    </form>
  `;

  content.innerHTML = html;
  safeCreateIcons({ nodes: [content] });

  document.getElementById('btn-back')?.addEventListener('click', () => go('#/sales'));

  // Toggle between new/existing client
  document.querySelectorAll('input[name="clientMode"]').forEach(r => {
    r.addEventListener('change', () => {
      const mode = document.querySelector('input[name="clientMode"]:checked')?.value;
      document.getElementById('existing-client-panel').style.display = mode === 'existing' ? 'block' : 'none';
      document.getElementById('new-client-panel').style.display = mode === 'new' ? 'block' : 'none';
    });
  });

  // Auto-fill price when vehicle selected
  document.querySelectorAll('input[name="vehicleId"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      const v = Vehicles.find(e.target.value);
      if (v) {
        const priceInput = document.getElementById('sale-total-price');
        if (priceInput) { priceInput.value = v.suggestedPrice || v.price || 0; }
        updateSaleCalc();
      }
    });
  });

  // Update financing amount whenever price or down payment changes
  const updateSaleCalc = () => {
    const price = parseFloat(document.getElementById('sale-total-price')?.value) || 0;
    const down = parseFloat(document.getElementById('sale-down-payment')?.value) || 0;
    const financed = Math.max(0, price - down);
    const finAmount = document.getElementById('fin-amount');
    if (finAmount) finAmount.value = financed;
    calcFinancing();
  };

  // Financing calculator (French amortization)
  const calcFinancing = () => {
    const currency = document.getElementById('sale-currency')?.value || 'PYG';
    const amount = parseFloat(document.getElementById('fin-amount')?.value) || 0;
    const months = parseInt(document.getElementById('fin-months')?.value) || 12;
    const rateMonthly = (parseFloat(document.getElementById('fin-rate')?.value) || 0) / 100;
    const insurance = parseFloat(document.getElementById('fin-insurance')?.value) || 0;
    const adminFee = parseFloat(document.getElementById('fin-admin-fee')?.value) || 0;

    document.getElementById('fin-months-hidden').value = months;
    document.getElementById('fin-rate-hidden').value = (rateMonthly * 100).toFixed(4);
    document.getElementById('fin-bank-name-hidden').value = document.getElementById('fin-bank-name')?.value || '';

    if (amount <= 0) {
      ['res-installment','res-total','res-interest','res-tna'].forEach(id => { const el = document.getElementById(id); if(el) el.textContent = '-'; });
      return;
    }

    let cuota;
    if (rateMonthly === 0) {
      cuota = amount / months;
    } else {
      cuota = amount * (rateMonthly * Math.pow(1 + rateMonthly, months)) / (Math.pow(1 + rateMonthly, months) - 1);
    }
    const cuotaTotal = cuota + insurance;
    const totalPago = (cuotaTotal * months) + adminFee;
    const totalInteres = (cuota * months) - amount;
    const tna = rateMonthly * 12 * 100;

    const fmtNum = (n) => {
      if (currency === 'USD') return '$ ' + n.toLocaleString('es-PY', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
      return 'Gs. ' + n.toLocaleString('es-PY', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    };

    const el = (id) => document.getElementById(id);
    if(el('res-installment')) el('res-installment').textContent = fmtNum(cuotaTotal);
    if(el('res-total')) el('res-total').textContent = fmtNum(totalPago);
    if(el('res-interest')) el('res-interest').textContent = fmtNum(Math.max(0, totalInteres));
    if(el('res-tna')) el('res-tna').textContent = tna.toFixed(1) + '% TNA';
    if(el('fin-installment-hidden')) el('fin-installment-hidden').value = cuotaTotal.toFixed(0);
  };

  // Show/hide financing panel on payment type change
  document.getElementById('paymentType')?.addEventListener('change', (e) => {
    const type = e.target.value;
    const panel = document.getElementById('financing-panel');
    const bankGroup = document.getElementById('fin-bank-group');
    const adminGroup = document.getElementById('fin-admin-group');
    const label = document.getElementById('financing-type-label');
    if (type === 'financed_own' || type === 'financed_bank') {
      panel.style.display = 'block';
      safeCreateIcons({ nodes: [panel] });
      if (type === 'financed_bank') {
        if(bankGroup) bankGroup.style.display = 'block';
        if(adminGroup) adminGroup.style.display = 'block';
        if(label) label.textContent = 'Financiación Bancaria';
      } else {
        if(bankGroup) bankGroup.style.display = 'none';
        if(adminGroup) adminGroup.style.display = 'none';
        if(label) label.textContent = 'Financiación Propia';
      }
      updateSaleCalc();
    } else {
      panel.style.display = 'none';
    }
  });

  // Wire live recalculation inputs
  ['sale-total-price','sale-down-payment'].forEach(id => document.getElementById(id)?.addEventListener('input', updateSaleCalc));
  ['fin-months','fin-rate','fin-insurance','fin-admin-fee'].forEach(id => document.getElementById(id)?.addEventListener('input', calcFinancing));
  ['fin-months'].forEach(id => document.getElementById(id)?.addEventListener('change', calcFinancing));

  document.getElementById('new-sale-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());

    const clientMode = document.querySelector('input[name="clientMode"]:checked')?.value;
    if (clientMode === 'new') {
      const name = document.getElementById('nc-name')?.value?.trim();
      const docNum = document.getElementById('nc-document')?.value?.trim();
      if (!name || !docNum) {
        showToast('Por favor completa el nombre y documento del nuevo cliente', 'danger');
        return;
      }
      import('../../core/store.js').then(({ Clients: CS, now }) => {
        const newClient = { id: 'cli_' + Date.now(), name, document: docNum, phone: document.getElementById('nc-phone')?.value || '', email: document.getElementById('nc-email')?.value || '', segment: 'active', createdAt: now() };
        CS.save(newClient);
        data.clientId = newClient.id;
        createSaleQuote(data);
        showToast('Cliente creado y cotización registrada', 'success');
        go('#/sales');
      });
    } else {
      if (!data.clientId) { showToast('Por favor selecciona un cliente', 'danger'); return; }
      createSaleQuote(data);
      showToast('Cotización creada exitosamente', 'success');
      go('#/sales');
    }
  });
}
