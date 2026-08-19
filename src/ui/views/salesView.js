// =====================================================
// AutoERP — Sales View Renderer
// =====================================================

import { getSalesKPIs, getSalesByStage, getClientName, getVehicleName, getSellerName, advanceSaleStage, createSaleQuote, markSaleAsLost, reactivateSale, getLostSalesReport, registerTradeIn, LOST_REASONS, calculateEstimatedProfit, suggestDeposit, registerPayment } from '../../services/salesService.js';
import { Sales, Vehicles, Clients, Sellers, Invoices, Payments } from '../../core/store.js';
import { createInvoice } from '../../services/billingService.js';
import { openBillingPrintModal } from '../components/billingModal.js';
import { fmt, fmtDate, parseInputAmount, formatInputValue } from '../../utils/formatters.js';
import { safeCreateIcons } from '../../utils/dom.js';
import { showToast } from '../components/toast.js';
import { confirmDialog } from '../components/modal.js';
import { go } from '../../core/router.js';

export function renderSalesPipeline() {
  const content = document.getElementById('page-content');
  if (!content) return;

  const kpis = getSalesKPIs();
  const columns = getSalesByStage();
  const lostReport = getLostSalesReport();

  const stageIcons = {
    quote: 'file-text', reservation: 'bookmark',
    contract: 'file-signature', delivery: 'truck'
  };
  const stageColors = {
    quote: 'var(--info)', reservation: 'var(--warning)',
    contract: 'var(--gold)', delivery: 'var(--success)'
  };
  const stageLabels = { quote: 'Cotización', reservation: 'Reserva', contract: 'Contrato' };

  const renderCard = (sale, stageKey) => {
    const clientName = getClientName(sale.clientId);
    const vehicleName = getVehicleName(sale.vehicleId);
    const sellerName = getSellerName(sale.sellerId);
    const initials = clientName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    const color = stageColors[stageKey] || 'var(--danger)';

    return `
    <div class="sale-pipeline-card" data-sale-id="${sale.id}">
      <div class="sale-pipeline-card__header">
        <span class="sale-pipeline-card__number">${sale.saleNumber}</span>
        <span class="sale-pipeline-card__date">${fmtDate(sale.createdAt)}</span>
      </div>
      <div class="sale-pipeline-card__client">
        <div class="sale-pipeline-card__avatar" style="background: ${color}20; color: ${color};">${initials}</div>
        <div class="sale-pipeline-card__client-info">
          <div class="sale-pipeline-card__client-name">${clientName}</div>
          <div class="sale-pipeline-card__vehicle"><i data-lucide="car" style="width:13px;height:13px;"></i> ${vehicleName}</div>
        </div>
      </div>
      <div class="sale-pipeline-card__footer">
        <div>
          <div class="sale-pipeline-card__seller"><i data-lucide="user" style="width:12px;height:12px;"></i> ${sellerName}</div>
          <div class="sale-pipeline-card__price" style="color: ${color};">${fmt(sale.totalPrice)}</div>
        </div>
        ${stageKey !== 'delivery' ? `
          <button type="button" class="sale-pipeline-card__advance advance-btn" data-id="${sale.id}" data-stage="${sale.stage}" title="Avanzar etapa" style="color: ${color}; background: ${color}15; border: 1px solid ${color}30;">
            <i data-lucide="chevron-right" style="width:16px;height:16px;"></i>
          </button>
        ` : `
          <span class="sale-pipeline-card__delivered"><i data-lucide="check-circle" style="width:14px;height:14px;"></i></span>
        `}
      </div>
    </div>`;
  };

  const renderLostCard = (sale) => {
    const clientName = getClientName(sale.clientId);
    const vehicleName = getVehicleName(sale.vehicleId);
    const initials = clientName.split(' ').map(n => n[0]).join('').substring(0).toUpperCase();
    return `
    <div class="sale-pipeline-card" data-sale-id="${sale.id}" style="border-left: 3px solid var(--danger); opacity: 0.85;">
      <div class="sale-pipeline-card__header">
        <span class="sale-pipeline-card__number">${sale.saleNumber}</span>
        <span class="badge badge-danger" style="font-size:0.7rem;">${stageLabels[sale.stage] || sale.stage}</span>
      </div>
      <div class="sale-pipeline-card__client">
        <div class="sale-pipeline-card__avatar" style="background: rgba(239,68,68,0.15); color: var(--danger);">${initials}</div>
        <div class="sale-pipeline-card__client-info">
          <div class="sale-pipeline-card__client-name">${clientName}</div>
          <div class="sale-pipeline-card__vehicle" style="color: var(--text-muted); font-size:0.78rem;">${LOST_REASONS[sale.lostReason] || 'Motivo no especificado'}</div>
        </div>
      </div>
      <div class="sale-pipeline-card__footer">
        <div class="sale-pipeline-card__price" style="color: var(--text-muted); text-decoration:line-through;">${fmt(sale.totalPrice)}</div>
        <button type="button" class="btn btn-ghost btn-sm reactivate-btn" data-id="${sale.id}" title="Reactivar venta" style="color: var(--success); padding:4px 8px; font-size:0.75rem;">
          <i data-lucide="rotate-ccw" style="width:13px;height:13px;"></i>
        </button>
      </div>
    </div>`;
  };

  const activeColumnKeys = ['quote', 'reservation', 'contract', 'delivery'];

  let html = `
    <div class="page-header" style="margin-bottom: 1.75rem;">
      <div class="header-title">
        <h1>Pipeline de Ventas</h1>
        <p class="text-muted">Gestiona el ciclo de vida de cada operación</p>
      </div>
      <div class="header-actions">
        <button id="btn-new-sale" class="btn btn-primary"><i data-lucide="plus"></i> Nueva Cotización</button>
      </div>
    </div>

    <!-- KPIs -->
    <div class="kpi-grid" style="margin-bottom: 2rem;">
      <div class="card kpi-card">
        <div class="kpi-icon badge-info"><i data-lucide="layers"></i></div>
        <div class="kpi-content">
          <div class="kpi-label">Total Activas</div>
          <div class="kpi-value">${kpis.totalSales}</div>
        </div>
      </div>
      <div class="card kpi-card">
        <div class="kpi-icon badge-success"><i data-lucide="trending-up"></i></div>
        <div class="kpi-content">
          <div class="kpi-label">Monto Vendido</div>
          <div class="kpi-value" style="font-size:1.2rem;color:var(--success);">${fmt(kpis.totalAmountSold)}</div>
        </div>
      </div>
      <div class="card kpi-card">
        <div class="kpi-icon badge-warning"><i data-lucide="clock"></i></div>
        <div class="kpi-content">
          <div class="kpi-label">En Proceso</div>
          <div class="kpi-value">${kpis.inProcessSalesCount}</div>
        </div>
      </div>
      <div class="card kpi-card">
        <div class="kpi-icon badge-gold"><i data-lucide="check-circle"></i></div>
        <div class="kpi-content">
          <div class="kpi-label">Entregados</div>
          <div class="kpi-value">${kpis.deliveredSalesCount}</div>
        </div>
      </div>
      <div class="card kpi-card" style="border-left: 3px solid var(--danger);">
        <div class="kpi-icon" style="background:rgba(239,68,68,0.15);color:var(--danger);"><i data-lucide="x-circle"></i></div>
        <div class="kpi-content">
          <div class="kpi-label">Perdidas</div>
          <div class="kpi-value" style="color:var(--danger);">${kpis.lostSalesCount}</div>
        </div>
      </div>
    </div>

    <!-- Active Pipeline Stages -->
    <div class="sales-pipeline-board">
      ${activeColumnKeys.map(key => {
        const col = columns[key];
        const color = stageColors[key];
        const icon = stageIcons[key];
        return `
        <div class="sales-pipeline-stage">
          <div class="sales-pipeline-stage__header" style="--stage-color: ${color};">
            <div class="sales-pipeline-stage__title">
              <i data-lucide="${icon}" style="width:18px;height:18px;color:${color};"></i>
              <span>${col.title}</span>
              <span class="sales-pipeline-stage__count" style="background:${color}20;color:${color};">${col.items.length}</span>
            </div>
            <div class="sales-pipeline-stage__search">
              <i data-lucide="search" style="width:14px;height:14px;color:var(--text-muted);position:absolute;left:10px;top:50%;transform:translateY(-50%);"></i>
              <input type="text" class="stage-search" data-stage="${key}" placeholder="Buscar...">
            </div>
          </div>
          <div class="sales-pipeline-stage__body" id="stage-cards-${key}">
            ${col.items.map(s => renderCard(s, key)).join('')}
            ${col.items.length === 0 ? `
              <div class="sales-pipeline-stage__empty">
                <i data-lucide="inbox" style="width:28px;height:28px;color:var(--text-muted);opacity:0.4;"></i>
                <span>Sin operaciones</span>
              </div>` : ''}
          </div>
        </div>`;
      }).join('')}
    </div>

    <!-- Lost/Cancelled Section -->
    ${columns.lost.items.length > 0 ? `
    <div style="margin-top: 2.5rem;">
      <div style="display:flex; align-items:center; gap:1rem; margin-bottom:1rem;">
        <div style="flex:1; height:1px; background:var(--border);"></div>
        <span style="display:flex;align-items:center;gap:0.5rem;color:var(--danger);font-size:0.85rem;font-weight:600;white-space:nowrap;">
          <i data-lucide="x-circle" style="width:16px;height:16px;"></i>
          PERDIDAS / CANCELADAS (${columns.lost.items.length})
        </span>
        <div style="flex:1; height:1px; background:var(--border);"></div>
      </div>
      <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap:1rem;">
        ${columns.lost.items.map(s => renderLostCard(s)).join('')}
      </div>
    </div>` : ''}

    <!-- Conversion Report -->
    ${lostReport.total > 0 ? `
    <div class="card" style="margin-top: 2rem;">
      <div class="card-header">
        <h3 class="card-title" style="display:flex;align-items:center;gap:0.5rem;">
          <i data-lucide="bar-chart-2" style="width:18px;height:18px;color:var(--gold);"></i>
          Reporte de Conversión del Embudo
        </h3>
      </div>
      <div class="card-body" style="display:grid;grid-template-columns:1fr 1fr;gap:2rem;">
        <div>
          <div class="text-muted" style="font-size:0.8rem;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:0.75rem;">Perdidas por etapa</div>
          ${Object.entries({ quote: 'Cotización', reservation: 'Reserva', contract: 'Contrato' }).map(([k, label]) => `
          <div style="display:flex;align-items:center;justify-content:space-between;padding:0.5rem 0;border-bottom:1px solid var(--border);">
            <span>${label}</span>
            <span style="color:var(--danger);font-weight:600;">${lostReport.byStage[k] || 0}</span>
          </div>`).join('')}
        </div>
        <div>
          <div class="text-muted" style="font-size:0.8rem;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:0.75rem;">Perdidas por motivo</div>
          ${Object.entries(LOST_REASONS).map(([k, label]) => `
          <div style="display:flex;align-items:center;justify-content:space-between;padding:0.5rem 0;border-bottom:1px solid var(--border);">
            <span style="font-size:0.9rem;">${label}</span>
            <span style="color:var(--danger);font-weight:600;">${lostReport.byReason[k] || 0}</span>
          </div>`).join('')}
        </div>
      </div>
    </div>` : ''}
  `;

  content.innerHTML = html;
  safeCreateIcons({ nodes: [content] });

  document.getElementById('btn-new-sale')?.addEventListener('click', () => go('#/sales/new'));

  content.querySelectorAll('.stage-search').forEach(input => {
    input.addEventListener('input', (e) => {
      const term = e.target.value.toLowerCase();
      const stageKey = e.target.dataset.stage;
      const container = document.getElementById(`stage-cards-${stageKey}`);
      if (container) {
        container.querySelectorAll('.sale-pipeline-card').forEach(card => {
          card.style.display = card.textContent.toLowerCase().includes(term) ? '' : 'none';
        });
      }
    });
  });

  content.querySelectorAll('.sale-pipeline-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.advance-btn') || e.target.closest('.reactivate-btn')) return;
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

  content.querySelectorAll('.reactivate-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      confirmDialog('¿Reactivar esta venta al pipeline?', () => {
        reactivateSale(btn.dataset.id);
        showToast('Venta reactivada', 'success');
        renderSalesPipeline();
      });
    });
  });
}

export function renderSaleDetail(saleId) {
  const content = document.getElementById('page-content');
  if (!content) return;

  const sale = Sales.find(saleId);
  if (!sale) {
    content.innerHTML = `<div class="empty-state"><div class="empty-state-icon"><i data-lucide="alert-triangle"></i></div><h3>Venta no encontrada</h3><button class="btn btn-primary" onclick="window.location.hash='#/sales'">Volver al Pipeline</button></div>`;
    safeCreateIcons({ nodes: [content] });
    return;
  }

  const client = Clients.find(sale.clientId) || {};
  const vehicle = Vehicles.find(sale.vehicleId) || {};
  const seller = Sellers.find(sale.sellerId) || {};
  const clientName = client.name || `${client.firstName || ''} ${client.lastName || ''}`.trim() || 'N/A';
  const sellerName = seller.name || `${seller.firstName || ''} ${seller.lastName || ''}`.trim() || 'N/A';
  const clientInitials = clientName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  const stageFlow = [
    { id: 'quote', label: 'Cotización', icon: 'file-text', color: 'var(--info)' },
    { id: 'reservation', label: 'Reserva', icon: 'bookmark', color: 'var(--warning)' },
    { id: 'contract', label: 'Contrato', icon: 'file-signature', color: 'var(--gold)' },
    { id: 'delivery', label: 'Entrega', icon: 'truck', color: 'var(--success)' }
  ];

  const currentStageIndex = stageFlow.findIndex(s => s.id === sale.stage);

  const paymentLabels = {
    cash: 'Contado',
    financed_own: 'Financiación Propia',
    financed_bank: 'Financiación Bancaria'
  };

  const paymentIcons = {
    cash: 'banknote',
    financed_own: 'landmark',
    financed_bank: 'building'
  };

  let html = `
    <div class="page-header" style="margin-bottom:0;">
      <div>
        <button class="btn btn-ghost" id="btn-back-pipeline" style="margin-bottom:0.5rem;"><i data-lucide="arrow-left"></i> Pipeline</button>
        <div style="display:flex;align-items:center;gap:1rem;flex-wrap:wrap;">
          <h1 class="page-title" style="margin:0;">${sale.saleNumber}</h1>
          <span class="badge badge-neutral" style="font-size:0.8rem;">${fmtDate(sale.createdAt)}</span>
          ${sale.lost ? `<span class="badge badge-danger" style="font-size:0.85rem;"><i data-lucide="x-circle" style="width:13px;height:13px;"></i> Perdida / Cancelada</span>` : ''}
        </div>
        ${sale.lost ? `<div style="margin-top:0.5rem;color:var(--text-muted);font-size:0.9rem;"><i data-lucide="info" style="width:14px;height:14px;"></i> Motivo: <strong>${LOST_REASONS[sale.lostReason] || 'No especificado'}</strong>${sale.lostNote ? ` — ${sale.lostNote}` : ''}</div>` : ''}
      </div>
      <div class="header-actions">
        ${!sale.lost && sale.stage !== 'delivery' ? `
          <button class="btn btn-ghost" id="btn-mark-lost" style="color:var(--danger);border-color:var(--danger);"><i data-lucide="x-circle"></i> Marcar Perdida</button>
          <button class="btn btn-primary" id="btn-advance">
            Avanzar a ${stageFlow[currentStageIndex + 1]?.label || ''} <i data-lucide="arrow-right"></i>
          </button>
        ` : ''}
        ${sale.lost ? `<button class="btn btn-secondary" id="btn-reactivate" style="color:var(--success);border-color:var(--success);"><i data-lucide="rotate-ccw"></i> Reactivar Venta</button>` : ''}
        <button class="btn btn-secondary" id="btn-billing" style="background: var(--gold); color: #000; border: none;"><i data-lucide="receipt"></i> Factura / Ticket</button>
        <button class="btn btn-secondary" id="btn-pdf"><i data-lucide="file-text"></i> Contrato PDF</button>
      </div>
    </div>

    <!-- Stage Stepper -->
    <div class="sale-stepper" style="margin: 1.75rem 0 2rem;">
      <div class="sale-stepper__track">
        ${stageFlow.map((stage, idx) => {
          const isCompleted = idx < currentStageIndex;
          const isCurrent = idx === currentStageIndex;
          const isPending = idx > currentStageIndex;
          let stateClass = 'pending';
          if (isCompleted) stateClass = 'completed';
          if (isCurrent) stateClass = 'current';
          const isLostHere = sale.lost && isCurrent;
          const dotColor = isLostHere ? 'var(--danger)' : stage.color;
          return `
          <div class="sale-stepper__step sale-stepper__step--${stateClass}">
            <div class="sale-stepper__dot" style="--step-color: ${dotColor}; ${isLostHere ? 'background:var(--danger)!important;' : ''}">
              ${isLostHere ? '<i data-lucide="x" style="width:14px;height:14px;color:#fff;"></i>' :
                isCompleted ? '<i data-lucide="check" style="width:14px;height:14px;color:#fff;"></i>' :
                isCurrent ? `<i data-lucide="${stage.icon}" style="width:14px;height:14px;color:#fff;"></i>` : 
                `<span style="width:8px;height:8px;border-radius:50%;background:var(--text-muted);opacity:0.4;display:block;"></span>`}
            </div>
            ${idx < stageFlow.length - 1 ? `<div class="sale-stepper__line ${isCompleted ? 'sale-stepper__line--filled' : ''}"></div>` : ''}
            <div class="sale-stepper__label" style="color: ${isLostHere ? 'var(--danger)' : isPending ? 'var(--text-muted)' : 'var(--text-primary)'};">${stage.label}${isLostHere ? ' ✕' : ''}</div>
          </div>`;
        }).join('')}
      </div>
    </div>

    <!-- Main Content Grid -->
    <div class="sale-detail-grid">
      <!-- Left Column -->
      <div class="sale-detail-grid__left">

        <!-- Vehicle Card -->
        <div class="card sale-detail-card">
          <div class="sale-detail-card__header">
            <div class="sale-detail-card__icon" style="background:var(--info-dim);color:var(--info);"><i data-lucide="car"></i></div>
            <div>
              <h3 class="sale-detail-card__title">Vehículo</h3>
              <p class="sale-detail-card__subtitle">${vehicle.brand || ''} ${vehicle.model || ''} ${vehicle.version || ''}</p>
            </div>
          </div>
          <div class="sale-detail-card__body">
            <div class="sale-detail-data-grid">
              <div class="sale-detail-data-item">
                <span class="sale-detail-data-item__label">Marca</span>
                <span class="sale-detail-data-item__value">${vehicle.brand || '-'}</span>
              </div>
              <div class="sale-detail-data-item">
                <span class="sale-detail-data-item__label">Modelo</span>
                <span class="sale-detail-data-item__value">${vehicle.model || '-'}</span>
              </div>
              <div class="sale-detail-data-item">
                <span class="sale-detail-data-item__label">Versión</span>
                <span class="sale-detail-data-item__value">${vehicle.version || '-'}</span>
              </div>
              <div class="sale-detail-data-item">
                <span class="sale-detail-data-item__label">Año</span>
                <span class="sale-detail-data-item__value">${vehicle.year || '-'}</span>
              </div>
              <div class="sale-detail-data-item">
                <span class="sale-detail-data-item__label">Color</span>
                <span class="sale-detail-data-item__value">${vehicle.color || '-'}</span>
              </div>
              <div class="sale-detail-data-item">
                <span class="sale-detail-data-item__label">VIN</span>
                <span class="sale-detail-data-item__value" style="font-family:monospace;font-size:0.8rem;letter-spacing:0.03em;">${vehicle.vin || '-'}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Client Card -->
        <div class="card sale-detail-card">
          <div class="sale-detail-card__header">
            <div class="sale-detail-card__avatar" style="background:var(--gold-dim);color:var(--gold);">${clientInitials}</div>
            <div>
              <h3 class="sale-detail-card__title">Cliente</h3>
              <p class="sale-detail-card__subtitle">${clientName}</p>
            </div>
          </div>
          <div class="sale-detail-card__body">
            <div class="sale-detail-data-grid sale-detail-data-grid--2">
              <div class="sale-detail-data-item">
                <span class="sale-detail-data-item__label">Documento</span>
                <span class="sale-detail-data-item__value">${client.document || '-'}</span>
              </div>
              <div class="sale-detail-data-item">
                <span class="sale-detail-data-item__label">Teléfono</span>
                <span class="sale-detail-data-item__value">${client.phone || '-'}</span>
              </div>
              <div class="sale-detail-data-item" style="grid-column:1/-1;">
                <span class="sale-detail-data-item__label">Email</span>
                <span class="sale-detail-data-item__value">${client.email || '-'}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Seller Card -->
        <div class="card sale-detail-card">
          <div class="sale-detail-card__header">
            <div class="sale-detail-card__icon" style="background:var(--success-dim);color:var(--success);"><i data-lucide="user-check"></i></div>
            <div>
              <h3 class="sale-detail-card__title">Vendedor</h3>
              <p class="sale-detail-card__subtitle">${sellerName}</p>
            </div>
          </div>
          <div class="sale-detail-card__body">
            <div class="sale-detail-data-grid sale-detail-data-grid--2">
              <div class="sale-detail-data-item">
                <span class="sale-detail-data-item__label">Nombre</span>
                <span class="sale-detail-data-item__value">${sellerName}</span>
              </div>
              <div class="sale-detail-data-item">
                <span class="sale-detail-data-item__label">Email</span>
                <span class="sale-detail-data-item__value">${seller.email || '-'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Right Column -->
      <div class="sale-detail-grid__right">

        <!-- Financial Summary -->
        <div class="card sale-detail-card">
          <div class="sale-detail-card__header">
            <div class="sale-detail-card__icon" style="background:var(--gold-dim);color:var(--gold);"><i data-lucide="receipt"></i></div>
            <div>
              <h3 class="sale-detail-card__title">Resumen Económico</h3>
              <p class="sale-detail-card__subtitle">${paymentLabels[sale.paymentType] || sale.paymentType}</p>
            </div>
          </div>
          <div class="sale-detail-card__body">
            <div class="sale-detail-financial">
              <div class="sale-detail-financial__row sale-detail-financial__row--highlight">
                <span>Precio Total</span>
                <span class="sale-detail-financial__amount" style="color:var(--gold);font-size:1.3rem;">${fmt(sale.totalPrice)}</span>
              </div>
              <div class="sale-detail-financial__row">
                <span>Entrega Inicial</span>
                <span class="sale-detail-financial__amount">${fmt(sale.downPayment || 0)}</span>
              </div>
              <div class="sale-detail-financial__row">
                <span>Saldo / Financiado</span>
                <span class="sale-detail-financial__amount">${fmt(sale.totalPrice - (sale.downPayment || 0) - (sale.advanceAmount || 0))}</span>
              </div>
              <div class="sale-detail-financial__divider"></div>
              <div class="sale-detail-financial__row">
                <span style="display:flex;align-items:center;gap:0.4rem;"><i data-lucide="${paymentIcons[sale.paymentType] || 'credit-card'}" style="width:14px;height:14px;"></i> Tipo de Pago</span>
                <span class="badge ${sale.paymentType === 'cash' ? 'badge-success' : 'badge-gold'}">${paymentLabels[sale.paymentType] || sale.paymentType}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Delivery Status -->
        <div class="card sale-detail-card">
          <div class="sale-detail-card__header">
            <div class="sale-detail-card__icon" style="background:${sale.deliveryStatus === 'delivered' ? 'var(--success-dim)' : 'var(--warning-dim)'};color:${sale.deliveryStatus === 'delivered' ? 'var(--success)' : 'var(--warning)'};"><i data-lucide="${sale.deliveryStatus === 'delivered' ? 'check-circle' : 'clock'}"></i></div>
            <div>
              <h3 class="sale-detail-card__title">Estado de Entrega</h3>
              <p class="sale-detail-card__subtitle">${sale.deliveryStatus === 'delivered' ? 'Vehículo entregado al cliente' : 'Pendiente de entrega'}</p>
            </div>
          </div>
          <div class="sale-detail-card__body" style="padding-top:0;">
            <div style="display:flex;align-items:center;gap:0.75rem;padding:0.75rem 1rem;background:${sale.deliveryStatus === 'delivered' ? 'var(--success-dim)' : 'var(--warning-dim)'};border-radius:var(--radius);border:1px solid ${sale.deliveryStatus === 'delivered' ? 'rgba(34,197,94,0.25)' : 'rgba(245,158,11,0.25)'};">
              <i data-lucide="${sale.deliveryStatus === 'delivered' ? 'package-check' : 'package'}" style="width:20px;height:20px;color:${sale.deliveryStatus === 'delivered' ? 'var(--success)' : 'var(--warning)'};"></i>
              <span style="font-weight:600;color:${sale.deliveryStatus === 'delivered' ? 'var(--success)' : 'var(--warning)'};">${sale.deliveryStatus === 'delivered' ? 'Entregado' : 'Pendiente'}</span>
            </div>
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="card sale-detail-card">
          <div class="sale-detail-card__header">
            <div class="sale-detail-card__icon" style="background:rgba(139,92,246,0.15);color:#8b5cf6;"><i data-lucide="zap"></i></div>
            <h3 class="sale-detail-card__title">Acciones</h3>
          </div>
          <div class="sale-detail-card__body" style="padding-top:0;">
            <div style="display:flex;flex-direction:column;gap:0.5rem;">
              ${sale.paymentType === 'financed_own' ? `
                <button class="btn btn-ghost w-full" id="btn-finance" style="justify-content:flex-start;gap:0.75rem;padding:0.65rem 1rem;">
                  <i data-lucide="calculator" style="width:16px;height:16px;"></i> Configurar Financiación
                </button>
              ` : ''}
            </div>
          </div>
        </div>

        <!-- Trade-In Card -->
        <div class="card sale-detail-card">
          <div class="sale-detail-card__header" style="justify-content:space-between;">
            <div style="display:flex;align-items:center;gap:0.75rem;">
              <div class="sale-detail-card__icon" style="background:rgba(251,146,60,0.15);color:#f97316;"><i data-lucide="arrow-left-right"></i></div>
              <div>
                <h3 class="sale-detail-card__title">Parte de Pago</h3>
                <p class="sale-detail-card__subtitle">${(sale.tradeIns || []).length} vehículo(s) recibido(s)</p>
              </div>
            </div>
            <button class="btn btn-ghost btn-sm" id="btn-tradein" title="Agregar vehículo" style="color:#f97316;border:1px solid rgba(249,115,22,0.3);">
              <i data-lucide="plus" style="width:14px;height:14px;"></i> Agregar
            </button>
          </div>
          <div class="sale-detail-card__body" style="padding-top:0;">
            ${(sale.tradeIns || []).length === 0 ? `
              <div style="text-align:center;padding:1.25rem;color:var(--text-muted);font-size:0.9rem;">
                <i data-lucide="car" style="width:32px;height:32px;opacity:0.3;display:block;margin:0 auto 0.5rem;"></i>
                Sin vehículos en parte de pago
              </div>
            ` : (sale.tradeIns || []).map(ti => `
              <div style="border:1px solid var(--border);border-radius:var(--radius);padding:0.75rem;margin-bottom:0.5rem;background:rgba(249,115,22,0.04);">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;">
                  <div>
                    <div style="font-weight:600;">${ti.brand} ${ti.model} (${ti.year})</div>
                    <div style="font-size:0.82rem;color:var(--text-muted);margin-top:2px;">
                      ${ti.color ? `Color: ${ti.color}` : ''} ${ti.mileage ? `· ${Number(ti.mileage).toLocaleString()} km` : ''}
                      ${ti.condition ? `· ${ti.condition}` : ''}
                    </div>
                  </div>
                  <div style="text-align:right;">
                    <div style="font-weight:700;color:#f97316;">${fmt(ti.appraisalValue)}</div>
                    <div style="font-size:0.75rem;color:var(--text-muted);">tasación</div>
                  </div>
                </div>
              </div>
            `).join('')}
            ${(sale.tradeIns || []).length > 0 ? `
              <div style="display:flex;justify-content:space-between;padding-top:0.5rem;font-size:0.9rem;">
                <span style="color:var(--text-muted);">Total tasado:</span>
                <strong style="color:#f97316;">${fmt((sale.tradeIns || []).reduce((s) => s + Number(t.appraisalValue || 0), 0))}</strong>
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    </div>

    <!-- Timeline -->
    <div class="card sale-detail-card" style="margin-top:1.5rem;">
      <div class="sale-detail-card__header">
        <div class="sale-detail-card__icon" style="background:rgba(139,92,246,0.15);color:#8b5cf6;"><i data-lucide="history"></i></div>
        <h3 class="sale-detail-card__title">Historial de la Operación</h3>
      </div>
      <div class="sale-detail-card__body">
        <div class="sale-timeline">
          ${(sale.history || []).map((h, idx) => {
            const stageData = stageFlow.find(s => s.id === h.stage) || { color: 'var(--gold)', icon: 'circle' };
            return `
            <div class="sale-timeline__item ${idx === 0 ? 'sale-timeline__item--first' : ''}">
              <div class="sale-timeline__dot" style="background:${stageData.color};"></div>
              <div class="sale-timeline__content">
                <div class="sale-timeline__date">${fmtDate(h.date)}</div>
                <div class="sale-timeline__action">${h.note || `Avanzado a ${h.stage}`}</div>
                <div class="sale-timeline__actor">por ${h.by || 'Sistema'}</div>
              </div>
            </div>`;
          }).join('')}
          ${(!sale.history || sale.history.length === 0) ? '<div class="text-muted" style="padding:1rem 0;">Sin historial registrado</div>' : ''}
        </div>
      </div>
    </div>
  `;

  content.innerHTML = html;
  safeCreateIcons({ nodes: [content] });

  document.getElementById('btn-back-pipeline')?.addEventListener('click', () => go('#/sales'));

  document.getElementById('btn-advance')?.addEventListener('click', () => {
    if (sale.stage === 'quote') {
      import('../components/modal.js').then(({ openModal, closeModal }) => {
        // Suggest deposit for reservation
        const calc = calculateEstimatedProfit(sale.vehicleId, sale.totalPrice, 0);
        const suggested = suggestDeposit(sale.totalPrice, calc.profit);

        openModal('Registrar Seña para Reserva', `
          <p style="margin-bottom:1rem;">Para avanzar a <strong>Reserva</strong>, registra la seña acordada con el cliente.</p>
          <form id="deposit-form" class="form-grid">
            <div class="form-group" style="grid-column:span 2;">
              <label>Monto de la Seña <span class="text-muted">(Sugerido: ${fmt(suggested)})</span></label>
              <input type="text" id="deposit-amount" class="form-control" value="${formatInputValue(sale.downPayment || suggested)}" required>
            </div>
            <div class="form-group">
              <label>Método de Pago</label>
              <select id="deposit-method" class="form-control">
                <option value="cash">Efectivo (Caja)</option>
                <option value="transfer">Transferencia</option>
                <option value="card">Tarjeta</option>
              </select>
            </div>
            <div class="form-group" style="grid-column:span 2;">
              <label>Nota / Ref.</label>
              <input type="text" id="deposit-note" class="form-control" placeholder="Ej: Transferencia Banco Itaú #1234">
            </div>
            <div style="grid-column:span 2;display:flex;justify-content:flex-end;gap:1rem;margin-top:1rem;">
              <button type="button" class="btn btn-ghost" onclick="window._closeModal()">Cancelar</button>
              <button type="submit" class="btn btn-primary">Registrar Seña y Reservar</button>
            </div>
          </form>
        `);
        window._closeModal = closeModal;
        
        const depInput = document.getElementById('deposit-amount');
        if (depInput) {
          depInput.addEventListener('input', (e) => {
            const val = parseFloat(String(e.target.value).replace(/\D/g, '')) || 0;
            if (val === 0 && e.target.value === '') return;
            const start = e.target.selectionStart;
            const oldLen = e.target.value.length;
            e.target.value = val.toLocaleString('es-PY');
            const newLen = e.target.value.length;
            e.target.setSelectionRange(start + (newLen - oldLen), start + (newLen - oldLen));
          });
        }

        document.getElementById('deposit-form').addEventListener('submit', (e) => {
          e.preventDefault();
          const amount = parseInputAmount(document.getElementById('deposit-amount').value);
          const method = document.getElementById('deposit-method').value;
          const note = document.getElementById('deposit-note').value;
          
          if (amount > 0) {
            registerPayment(saleId, amount, 'deposit', method, note);
          }
          
          const res = advanceSaleStage(saleId, sale.stage);
          if (res) {
            showToast('Vehículo reservado exitosamente', 'success');
            closeModal();
            renderSaleDetail(saleId);
          }
        });
      });
    } else {
      confirmDialog(`¿Avanzar venta a la siguiente etapa?`, () => {
        const res = advanceSaleStage(saleId, sale.stage);
        if (res) {
          showToast(`Venta avanzada a ${res.nextStage}`, 'success');
          renderSaleDetail(saleId);
          
          // Si avanzó a Entrega (cobrado), sugerir facturación
          if (res.nextStage === 'delivery') {
            handleFacturacion(sale, vehicle, client);
          }
        }
      });
    }
  });

  document.getElementById('btn-billing')?.addEventListener('click', () => {
    handleFacturacion(sale, vehicle, client);
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
    doc.text('Cliente: ' + (client ? clientName : 'N/A'), 20, 80);
    doc.text('Precio Total: ' + sale.totalPrice, 20, 100);
    doc.text('_____________________________', 40, 150);
    doc.text('Firma Vendedor', 55, 160);
    doc.text('_____________________________', 120, 150);
    doc.text('Firma Comprador', 135, 160);
    doc.save('Contrato_' + (sale.saleNumber || sale.id) + '.pdf');
    showToast('Contrato PDF generado exitosamente', 'success');
  });

  // === MARK AS LOST ===
  document.getElementById('btn-mark-lost')?.addEventListener('click', () => {
    import('../components/modal.js').then(({ openModal, closeModal }) => {
      const reasonOptions = Object.entries(LOST_REASONS).map(([k, v]) =>
        `<option value="${k}">${v}</option>`
      ).join('');

      openModal('Marcar Venta como Perdida', `
        <form id="lost-form" class="form-grid">
          <div class="form-group" style="grid-column:span 2;">
            <label>Motivo de Pérdida <span style="color:var(--danger)">*</span></label>
            <select id="lost-reason" class="form-control" required>
              <option value="">— Seleccioná un motivo —</option>
              ${reasonOptions}
            </select>
          </div>
          <div class="form-group" style="grid-column:span 2;">
            <label>Nota adicional (opcional)</label>
            <textarea id="lost-note" class="form-control" rows="2" placeholder="Comentario interno..."></textarea>
          </div>
          <div style="grid-column:span 2;display:flex;justify-content:flex-end;gap:1rem;">
            <button type="button" class="btn btn-ghost" onclick="window._closeModal()">Cancelar</button>
            <button type="submit" class="btn" style="background:var(--danger);color:#fff;">Marcar como Perdida</button>
          </div>
        </form>
      `);
      window._closeModal = closeModal;

      document.getElementById('lost-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const reason = document.getElementById('lost-reason').value;
        const note = document.getElementById('lost-note').value;
        if (!reason) { showToast('Seleccioná un motivo', 'danger'); return; }
        markSaleAsLost(saleId, reason, note);
        closeModal();
        showToast('Venta marcada como perdida', 'warning');
        renderSaleDetail(saleId);
      });
    });
  });

  // === REACTIVATE ===
  document.getElementById('btn-reactivate')?.addEventListener('click', () => {
    confirmDialog('¿Reactivar esta venta al pipeline activo?', () => {
      reactivateSale(saleId);
      showToast('Venta reactivada', 'success');
      renderSaleDetail(saleId);
    });
  });

  // === TRADE-IN ===
  document.getElementById('btn-tradein')?.addEventListener('click', () => {
    import('../components/modal.js').then(({ openModal, closeModal }) => {
      openModal('Agregar Vehículo en Parte de Pago', `
        <form id="tradein-form" class="form-grid">
          <div class="form-group"><label>Marca</label><input type="text" id="ti-brand" class="form-control" required placeholder="Toyota"></div>
          <div class="form-group"><label>Modelo</label><input type="text" id="ti-model" class="form-control" required placeholder="Corolla"></div>
          <div class="form-group"><label>Año</label><input type="number" id="ti-year" class="form-control" required min="1990" max="2030"></div>
          <div class="form-group"><label>Color</label><input type="text" id="ti-color" class="form-control" placeholder="Plata"></div>
          <div class="form-group"><label>Kilometraje (km)</label><input type="number" id="ti-mileage" class="form-control" min="0" placeholder="85000"></div>
          <div class="form-group"><label>Condición</label>
            <select id="ti-condition" class="form-control">
              <option value="used">Usado</option>
              <option value="new">Nuevo</option>
              <option value="consigned">Consignado</option>
            </select>
          </div>
          <div class="form-group" style="grid-column:span 2;">
            <label>Valor de Tasación <span style="color:var(--danger)">*</span></label>
            <input type="number" id="ti-value" class="form-control" required min="0" placeholder="25000000">
          </div>
          <div style="grid-column:span 2;display:flex;justify-content:flex-end;gap:1rem;">
            <button type="button" class="btn btn-ghost" onclick="window._closeModal()">Cancelar</button>
            <button type="submit" class="btn btn-primary">Registrar Vehículo</button>
          </div>
        </form>
      `);
      window._closeModal = closeModal;

      document.getElementById('tradein-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const data = {
          brand: document.getElementById('ti-brand').value,
          model: document.getElementById('ti-model').value,
          year: document.getElementById('ti-year').value,
          color: document.getElementById('ti-color').value,
          mileage: document.getElementById('ti-mileage').value,
          condition: document.getElementById('ti-condition').value,
          appraisalValue: parseFloat(document.getElementById('ti-value').value) || 0
        };
        registerTradeIn(saleId, data);
        closeModal();
        showToast('Vehículo en parte de pago registrado', 'success');
        renderSaleDetail(saleId);
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
                  <div style="color: var(--success); font-weight: 700; font-size: 1.2rem; font-family: 'Outfit', sans-serif;">${fmt(v.suggestedPrice || v.price)}</div>
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
            <div class="form-grid" style="grid-template-columns: repeat(auto-fit));">
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

        <!-- Step 3: Detalles y Cotización -->
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
            <label>Precio de Venta Sugerido / Acordado</label>
            <input type="text" name="totalPrice" id="sale-total-price" class="form-control format-currency" required>
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

        <div style="background: var(--bg-card); border-radius: 8px; border: 1px solid var(--border-color); padding: 1rem; margin-bottom: 1.5rem; display: flex; align-items: center; justify-content: space-between;">
          <div style="flex:1">
            <h4 style="margin:0 0 0.25rem 0; font-size:0.95rem; display:flex; align-items:center; gap:0.5rem;">
               <i data-lucide="trending-up" style="width:16px;height:16px;color:var(--success);"></i> Proyección de Ganancia Bruta
            </h4>
            <p class="text-muted" style="margin:0; font-size:0.8rem;">Basado en costos del vehículo y precio de venta actual</p>
          </div>
          <div style="text-align:right">
            <div id="proj-profit" style="font-size:1.4rem; font-weight:800; color:var(--success); font-family: 'Outfit', sans-serif;">-</div>
            <div id="proj-margin" style="font-size:0.85rem; color:var(--text-muted);">Margen: 0%</div>
          </div>
        </div>

        <!-- Step 4: Parte de Pago y Entrega -->
        <h3 style="margin-bottom: 1rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem;">Paso 4: Entregas y Parte de Pago (Opcional)</h3>
        
        <div style="display:flex; flex-direction:column; gap:1rem; margin-bottom:2rem;">
            <div class="card" style="padding:1rem; background:rgba(249,115,22,0.05); border:1px dashed rgba(249,115,22,0.3);">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 0.5rem;">
                <h4 style="margin:0; color:#f97316; font-size:0.95rem; display:flex; align-items:center; gap:0.5rem;">
                  <i data-lucide="arrow-left-right" style="width:16px;height:16px;"></i> Vehículo en Parte de Pago Inicial
                </h4>
              </div>
              <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:1rem;">Al confirmar la venta, este vehículo pasará al inventario automáticamente.</p>
              
              <div class="form-grid" style="grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));">
                <div class="form-group"><label>Marca</label><input type="text" id="initial-ti-brand" class="form-control" placeholder="Ej: Toyota"></div>
                <div class="form-group"><label>Modelo</label><input type="text" id="initial-ti-model" class="form-control" placeholder="Ej: Tacoma"></div>
                <div class="form-group"><label>Año</label><input type="number" id="initial-ti-year" class="form-control" placeholder="2020"></div>
                <div class="form-group"><label>Color</label><input type="text" id="initial-ti-color" class="form-control" placeholder="Ej: Blanco"></div>
                <div class="form-group"><label>Kilometraje</label><input type="text" id="initial-ti-mileage" class="form-control format-currency" placeholder="0"></div>
                <div class="form-group"><label>Tasación Estimada</label><input type="text" id="initial-ti-value" class="form-control format-currency" placeholder="0"></div>
              </div>
            </div>

            <div class="form-group">
                <label>Monto de Entrega Inicial (Seña / Anticipo)</label>
                <input type="text" name="downPayment" id="sale-down-payment" class="form-control format-currency" value="0">
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
              <input type="text" id="fin-amount" class="form-control format-currency" readonly style="background: var(--bg-card); font-weight: 700; color: var(--gold);">
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
              <input type="text" id="fin-insurance" class="form-control format-currency" value="0">
            </div>
            <div class="form-group" id="fin-bank-group" style="display:none;">
              <label>Banco / Entidad</label>
              <input type="text" id="fin-bank-name" class="form-control" placeholder="Ej: Banco Continental">
            </div>
            <div class="form-group" id="fin-admin-group" style="display:none;">
              <label>Gastos Administrativos</label>
              <input type="text" id="fin-admin-fee" class="form-control format-currency" value="0">
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
        if (priceInput) { priceInput.value = formatInputValue(v.suggestedPrice || v.price || 0); }
        updateSaleCalc();
      }
    });
  });

  // Auto-format currency inputs
  const parseCurrency = (val) => parseFloat(String(val).replace(/\D/g, '')) || 0;
  
  const formatCurrencyInputs = () => {
    document.querySelectorAll('.format-currency').forEach(input => {
      input.addEventListener('input', (e) => {
        const val = parseCurrency(e.target.value);
        if (val === 0 && e.target.value === '') return;
        
        const start = e.target.selectionStart;
        const oldLen = e.target.value.length;
        
        e.target.value = val.toLocaleString('es-PY');
        
        const newLen = e.target.value.length;
        e.target.setSelectionRange(start + (newLen - oldLen), start + (newLen - oldLen));
      });
    });
  };
  formatCurrencyInputs();

  // Update financing amount and profit projection whenever price or down payment changes
  const updateSaleCalc = () => {
    const price = parseInputAmount(document.getElementById('sale-total-price')?.value);
    const down = parseInputAmount(document.getElementById('sale-down-payment')?.value);
    
    // Profit calc
    const selectedVehicleRadio = document.querySelector('input[name="vehicleId"]:checked');
    if (selectedVehicleRadio) {
      const vId = selectedVehicleRadio.value;
      const calc = calculateEstimatedProfit(vId, price, 0);
      
      const pEl = document.getElementById('proj-profit');
      const mEl = document.getElementById('proj-margin');
      if (pEl && mEl) {
        if (price > 0 && calc.profit > 0) {
          pEl.textContent = fmt(calc.profit);
          pEl.style.color = 'var(--success)';
          mEl.textContent = `Margen: ${calc.margin.toFixed(1)}%`;
        } else if (price > 0) {
          pEl.textContent = fmt(calc.profit);
          pEl.style.color = 'var(--danger)';
          mEl.textContent = `Margen: ${calc.margin.toFixed(1)}%`;
        } else {
          pEl.textContent = '-';
          pEl.style.color = 'var(--text-primary)';
          mEl.textContent = 'Margen: 0%';
        }
      }
      
      // Auto-suggest down payment if not set manually yet
      const downInput = document.getElementById('sale-down-payment');
      if (downInput && price > 0 && !downInput.dataset.manual) {
        const suggested = suggestDeposit(price);
        downInput.value = formatInputValue(suggested);
        // Need to update the local 'down' var for financing calc below
        const downUpdated = suggested;
        const financed = Math.max(0, price - downUpdated);
        const finAmount = document.getElementById('fin-amount');
        if (finAmount) finAmount.value = formatInputValue(financed);
      } else {
        const financed = Math.max(0, price - down);
        const finAmount = document.getElementById('fin-amount');
        if (finAmount) finAmount.value = formatInputValue(financed);
      }
    }

    calcFinancing();
  };
  
  // Track manual changes to down payment so we don't overwrite it
  document.getElementById('sale-down-payment')?.addEventListener('input', (e) => {
    e.target.dataset.manual = "true";
  });

  // Financing calculator (French amortization)
  const calcFinancing = () => {
    const amount = parseInputAmount(document.getElementById('fin-amount')?.value);
    const months = parseInt(document.getElementById('fin-months')?.value) || 12;
    const rateMonthly = (parseFloat(document.getElementById('fin-rate')?.value) || 0) / 100;
    const insurance = parseInputAmount(document.getElementById('fin-insurance')?.value);
    const adminFee = parseInputAmount(document.getElementById('fin-admin-fee')?.value);

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

    const el = (id) => document.getElementById(id);
    if(el('res-installment')) el('res-installment').textContent = fmt(cuotaTotal);
    if(el('res-total')) el('res-total').textContent = fmt(totalPago);
    if(el('res-interest')) el('res-interest').textContent = fmt(Math.max(0));
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
    
    // Parse currency fields back to numbers
    if (data.totalPrice) data.totalPrice = parseInputAmount(data.totalPrice);
    if (data.downPayment) data.downPayment = parseInputAmount(data.downPayment);

    const finishCreation = (clientId) => {
      data.clientId = clientId;
      const sale = createSaleQuote(data);
      
      // Register initial trade-in if provided
      const tiBrand = document.getElementById('initial-ti-brand')?.value?.trim();
      const tiModel = document.getElementById('initial-ti-model')?.value?.trim();
      const tiYear = document.getElementById('initial-ti-year')?.value?.trim();
      const tiColor = document.getElementById('initial-ti-color')?.value?.trim();
      const tiMileage = parseCurrency(document.getElementById('initial-ti-mileage')?.value);
      const tiValue = parseInputAmount(document.getElementById('initial-ti-value')?.value);
      
      if (tiModel && tiValue > 0) {
        registerTradeIn(sale.id, { brand: tiBrand, model: tiModel, year: tiYear, color: tiColor, mileage: tiMileage, appraisalValue: tiValue });
      }

      showToast('Cotización creada exitosamente', 'success');
      go('#/sales');
    };

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
        finishCreation(newClient.id);
      });
    } else {
      if (!data.clientId) { showToast('Por favor selecciona un cliente', 'danger'); return; }
      finishCreation(data.clientId);
    }
  });
}

/**
 * Handles generating or retrieving an invoice and opening the print modal
 */
function handleFacturacion(sale, vehicle, client) {
  let invoice = Invoices.all().find(i => i.saleId === sale.id);
  
  if (!invoice) {
    // Generate new invoice
    invoice = createInvoice({
      saleId: sale.id,
      clientId: client.id,
      vehicleId: vehicle.id,
      amount: sale.totalAmount || sale.salePrice || 0,
      condition: vehicle.condition || 'used',
      type: 'factura'
    });
  }
  
  openBillingPrintModal(invoice);
}
