// =====================================================
// AutoERP — Financing View Renderer
// =====================================================

import { getFinancingKPIs, recordInstallmentPayment } from '../../services/financingService.js';
import { Financing, Clients, Vehicles } from '../../core/store.js';
import { fmt, fmtDate, getActiveCurrency } from '../../utils/formatters.js';
import { safeCreateIcons } from '../../utils/dom.js';
import { showToast } from '../components/toast.js';
import { openModal, closeModal, confirmDialog } from '../components/modal.js';
import { go } from '../../core/router.js';

export function renderFinancingPlans() {
  const container = document.getElementById('page-content');
  if (!container) return;

  const kpis = getFinancingKPIs();

  let html = `
    <div class="page-header">
      <h1 class="page-title">Planes de Pago</h1>
      <div class="page-actions">
        <button id="btn-view-overdue" class="btn btn-danger">
          <i data-lucide="alert-circle"></i>
          Ver Cuotas Vencidas
        </button>
      </div>
    </div>

    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-title">Total Planes</div>
        <div class="kpi-value">${kpis.totalPlans}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-title">Monto Financiado Total</div>
        <div class="kpi-value" style="font-family:'Outfit',sans-serif;">${fmt(kpis.totalFinanced)}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-title">Cuotas Cobradas (Mes)</div>
        <div class="kpi-value text-success">${kpis.paidThisMonth}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-title">Cuotas Vencidas</div>
        <div class="kpi-value text-danger">${kpis.overdueCount}</div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <h2 class="card-title">Listado de Financiamientos</h2>
      </div>
      <div class="table-container">
        <table class="table">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Vehículo</th>
              <th>Total Financiado</th>
              <th>Cuotas</th>
              <th>Próx. Vencimiento</th>
              <th>Progreso</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
  `;

  Financing.all().forEach(plan => {
    const client = Clients.find(plan.clientId);
    const vehicle = Vehicles.find(plan.vehicleId);

    let clientName = client ? (client.name || `${client.firstName || ''} ${client.lastName || ''}`.trim()) : 'Desconocido';
    let vehicleName = vehicle ? `${vehicle.brand || vehicle.make || ''} ${vehicle.model || ''}` : 'Desconocido';

    let paidCount = (plan.payments || []).filter(p => p.status === 'paid').length;
    let overduePlanCount = (plan.payments || []).filter(p => p.status === 'overdue').length;

    let statusBadge = '';
    if (paidCount === plan.installments) {
      statusBadge = '<span class="badge badge-success">Completado</span>';
    } else if (overduePlanCount > 0) {
      statusBadge = '<span class="badge badge-danger">En Riesgo</span>';
    } else {
      statusBadge = '<span class="badge badge-info">Activo</span>';
    }

    let nextPayment = (plan.payments || []).find(p => p.status !== 'paid');
    let nextDateStr = nextPayment ? fmtDate(nextPayment.dueDate) : '-';

    html += `
      <tr>
        <td>${clientName}</td>
        <td>${vehicleName}</td>
        <td>${fmt(plan.financedAmount, plan.currency)}</td>
        <td>${plan.installments}</td>
        <td>${nextDateStr}</td>
        <td>${paidCount} / ${plan.installments}</td>
        <td>${statusBadge}</td>
        <td>
          <button class="btn btn-sm btn-ghost btn-view-plan" data-id="${plan.id}" title="Ver Detalles">
            <i data-lucide="eye"></i>
          </button>
        </td>
      </tr>
    `;
  });

  if (Financing.all().length === 0) {
    html += `<tr><td colspan="8" class="text-center text-muted">No hay planes de financiamiento registrados.</td></tr>`;
  }

  html += `
          </tbody>
        </table>
      </div>
    </div>
  `;

  container.innerHTML = html;
  safeCreateIcons({ nodes: [container] });

  document.getElementById('btn-view-overdue')?.addEventListener('click', () => {
    go('#/financing/installments');
  });

  container.querySelectorAll('.btn-view-plan').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const planId = e.currentTarget.getAttribute('data-id');
      openPlanModal(planId);
    });
  });
}

function openPlanModal(planId) {
  const plan = Financing.find(planId);
  if (!plan) return;

  const client = Clients.find(plan.clientId);
  const vehicle = Vehicles.find(plan.vehicleId);

  let html = `
    <div class="form-grid mb-4">
      <div class="form-group">
        <label>Cliente</label>
        <div class="text-white">${client ? (client.name || `${client.firstName || ''} ${client.lastName || ''}`.trim()) : 'Desconocido'}</div>
      </div>
      <div class="form-group">
        <label>Vehículo</label>
        <div class="text-white">${vehicle ? (vehicle.brand || vehicle.make || '') + ' ' + vehicle.model : 'Desconocido'}</div>
      </div>
      <div class="form-group">
        <label>Monto Financiado</label>
        <div class="text-white">${fmt(plan.financedAmount, plan.currency)}</div>
      </div>
      <div class="form-group">
        <label>Valor de Cuota</label>
        <div class="text-white">${fmt(plan.installmentAmount, plan.currency)}</div>
      </div>
    </div>

    <div class="table-container">
      <table class="table">
        <thead>
          <tr>
            <th>Nº</th>
            <th>Vencimiento</th>
            <th>Monto</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
  `;

  (plan.payments || []).forEach(pay => {
    let isOverdue = pay.status === 'overdue' || (pay.status === 'pending' && new Date(pay.dueDate) < new Date());
    if (isOverdue && pay.status === 'pending') pay.status = 'overdue';

    let rowClass = isOverdue && pay.status !== 'paid' ? 'style="color: var(--color-danger);"' : '';
    let badge = '';
    if (pay.status === 'paid') badge = '<span class="badge badge-success">Pagado</span>';
    else if (pay.status === 'overdue') badge = '<span class="badge badge-danger">Vencido</span>';
    else badge = '<span class="badge badge-warning">Pendiente</span>';

    html += `
      <tr ${rowClass}>
        <td>${pay.number}</td>
        <td>${fmtDate(pay.dueDate)}</td>
        <td>${fmt(pay.amount, plan.currency)}</td>
        <td>${badge}</td>
        <td>
          ${pay.status !== 'paid' ? `
            <button class="btn btn-sm btn-primary btn-pay-installment" data-plan-id="${plan.id}" data-payment-id="${pay.id}">
              Pagar
            </button>
          ` : `
            <span class="text-muted">Pagado el ${fmtDate(pay.paidAt)}</span>
          `}
        </td>
      </tr>
    `;
  });

  html += `
        </tbody>
      </table>
    </div>
  `;

  openModal('Detalles del Plan de Pago', html);

  document.querySelectorAll('.btn-pay-installment').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const pid = e.currentTarget.getAttribute('data-plan-id');
      const payid = e.currentTarget.getAttribute('data-payment-id');
      payInstallment(pid, payid);
    });
  });
}

function payInstallment(planId, paymentId) {
  confirmDialog('¿Confirmar pago de esta cuota?', () => {
    const ok = recordInstallmentPayment(planId, paymentId);
    if (ok) {
      showToast('Cuota marcada como pagada', 'success');
      closeModal();
      renderFinancingPlans();
    }
  });
}

export function renderInstallments() {
  const container = document.getElementById('page-content');
  if (!container) return;

  let upcomingPayments = [];
  let overduePayments = [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  Financing.all().forEach(plan => {
    const client = Clients.find(plan.clientId);
    const vehicle = Vehicles.find(plan.vehicleId);
    let clientName = client ? (client.name || `${client.firstName || ''} ${client.lastName || ''}`.trim()) : 'Desconocido';
    let vehicleName = vehicle ? `${vehicle.brand || vehicle.make || ''} ${vehicle.model || ''}` : 'Desconocido';
    let email = client ? client.email : '';

    (plan.payments || []).forEach(pay => {
      if (pay.status === 'paid') return;

      let dDate = new Date(pay.dueDate);
      dDate.setHours(0, 0, 0, 0);

      let timeDiff = dDate.getTime() - today.getTime();
      let daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

      let pData = {
        planId: plan.id,
        paymentId: pay.id,
        clientName,
        vehicleName,
        email,
        number: pay.number,
        amount: pay.amount,
        currency: plan.currency,
        dueDate: pay.dueDate,
        daysDiff
      };

      if (pay.status === 'overdue' || daysDiff < 0) {
        if (pay.status === 'pending') pay.status = 'overdue';
        overduePayments.push(pData);
      } else if (daysDiff >= 0 && daysDiff <= 30) {
        upcomingPayments.push(pData);
      }
    });
  });

  upcomingPayments.sort((a, b) => a.daysDiff - b.daysDiff);
  overduePayments.sort((a, b) => a.daysDiff - b.daysDiff);

  let html = `
    <div class="page-header">
      <h1 class="page-title">Cuotas Próximas / Vencidas</h1>
      <div class="page-actions">
        <button id="btn-back-financing" class="btn btn-secondary">
          <i data-lucide="arrow-left"></i>
          Volver a Planes
        </button>
      </div>
    </div>

    <div class="card mb-4">
      <div class="card-header">
        <h2 class="card-title text-warning">Cuotas por Vencer (próximos 30 días)</h2>
      </div>
      <div class="table-container">
        <table class="table">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Vehículo</th>
              <th>Cuota Nº</th>
              <th>Monto</th>
              <th>Vencimiento</th>
              <th>Días Restantes</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
  `;

  if (upcomingPayments.length === 0) {
    html += `<tr><td colspan="7" class="text-center text-muted">No hay cuotas por vencer en los próximos 30 días.</td></tr>`;
  } else {
    upcomingPayments.forEach(p => {
      let daysBadge = p.daysDiff < 7
        ? `<span class="badge badge-warning">${p.daysDiff} días</span>`
        : `<span class="badge badge-info">${p.daysDiff} días</span>`;

      html += `
        <tr>
          <td>${p.clientName}</td>
          <td>${p.vehicleName}</td>
          <td>${p.number}</td>
          <td>${fmt(p.amount, p.currency)}</td>
          <td>${fmtDate(p.dueDate)}</td>
          <td>${daysBadge}</td>
          <td>
            <button class="btn btn-sm btn-primary btn-pay-inst" data-pid="${p.planId}" data-payid="${p.paymentId}">
              Marcar Pagada
            </button>
          </td>
        </tr>
      `;
    });
  }

  html += `
          </tbody>
        </table>
      </div>
    </div>

    <div class="card" style="border: 1px solid var(--color-danger);">
      <div class="card-header">
        <h2 class="card-title text-danger">Cuotas Vencidas</h2>
      </div>
      <div class="table-container">
        <table class="table">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Vehículo</th>
              <th>Cuota Nº</th>
              <th>Monto</th>
              <th>Vencimiento</th>
              <th>Días Vencidos</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
  `;

  if (overduePayments.length === 0) {
    html += `<tr><td colspan="7" class="text-center text-muted">No hay cuotas vencidas. ¡Excelente!</td></tr>`;
  } else {
    overduePayments.forEach(p => {
      let daysOverdue = Math.abs(p.daysDiff);

      html += `
        <tr style="background: rgba(239, 68, 68, 0.05);">
          <td>${p.clientName}</td>
          <td>${p.vehicleName}</td>
          <td>${p.number}</td>
          <td>${fmt(p.amount, p.currency)}</td>
          <td>${fmtDate(p.dueDate)}</td>
          <td><span class="badge badge-danger">${daysOverdue} días</span></td>
          <td style="display: flex; gap: 0.5rem;">
            <button class="btn btn-sm btn-primary btn-pay-inst" data-pid="${p.planId}" data-payid="${p.paymentId}">
              Marcar Pagada
            </button>
            <button class="btn btn-sm btn-ghost btn-remind-inst" data-email="${p.email}">
              <i data-lucide="bell"></i>
              Enviar Recordatorio
            </button>
          </td>
        </tr>
      `;
    });
  }

  html += `
          </tbody>
        </table>
      </div>
    </div>
  `;

  container.innerHTML = html;
  safeCreateIcons({ nodes: [container] });

  document.getElementById('btn-back-financing')?.addEventListener('click', () => {
    go('#/financing');
  });

  document.querySelectorAll('.btn-pay-inst').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const pid = e.currentTarget.getAttribute('data-pid');
      const payid = e.currentTarget.getAttribute('data-payid');
      payInstallment(pid, payid);
    });
  });

  document.querySelectorAll('.btn-remind-inst').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const email = e.currentTarget.getAttribute('data-email');
      showToast(`Recordatorio simulado enviado a ${email || 'cliente'}`, 'success');
    });
  });
}
