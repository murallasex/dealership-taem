// =====================================================
// AutoERP — Payment History View
// =====================================================

import { Payments, Sales, Clients } from '../../core/store.js';
import { safeCreateIcons } from '../../utils/dom.js';
import { fmt, fmtDate } from '../../utils/formatters.js';

export function renderPaymentHistory() {
  const content = document.getElementById('page-content');
  if (!content) return;

  const payments = Payments.all().sort((a, b) => new Date(b.date) - new Date(a.date));

  // KPIs
  const totalReceived = payments.reduce((sum, p) => sum + p.amount, 0);
  const totalDeposits = payments.filter(p => p.type === 'deposit').reduce((sum, p) => sum + p.amount, 0);
  const totalOthers = payments.filter(p => p.type !== 'deposit').reduce((sum, p) => sum + p.amount, 0);

  const getTypeLabel = (type) => {
    const types = { deposit: 'Seña / Anticipo', installment: 'Cuota', final: 'Saldo Final' };
    return types[type] || type;
  };
  const getMethodLabel = (method) => {
    const methods = { cash: 'Efectivo', transfer: 'Transferencia', card: 'Tarjeta' };
    return methods[method] || method;
  };

  let html = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Historial de Cobros</h1>
        <p class="text-muted">Registro de señas, cuotas y cancelaciones de ventas.</p>
      </div>
    </div>

    <!-- KPIs -->
    <div class="kpi-grid" style="margin-bottom: 2rem;">
      <div class="card kpi-card">
        <div class="kpi-icon badge-success"><i data-lucide="banknote"></i></div>
        <div class="kpi-content">
          <div class="kpi-label">Total Cobrado (Histórico)</div>
          <div class="kpi-value" style="font-size:1.2rem;color:var(--success);">${fmt(totalReceived)}</div>
        </div>
      </div>
      <div class="card kpi-card">
        <div class="kpi-icon badge-info"><i data-lucide="bookmark"></i></div>
        <div class="kpi-content">
          <div class="kpi-label">En Concepto de Señas</div>
          <div class="kpi-value">${fmt(totalDeposits)}</div>
        </div>
      </div>
      <div class="card kpi-card">
        <div class="kpi-icon badge-gold"><i data-lucide="calendar-check"></i></div>
        <div class="kpi-content">
          <div class="kpi-label">Cuotas y Saldos</div>
          <div class="kpi-value">${fmt(totalOthers)}</div>
        </div>
      </div>
    </div>

    <!-- Toolbar -->
    <div class="table-toolbar card" style="display: flex; gap: 1rem; align-items: center; padding: 1rem; margin-bottom: 1rem;">
      <div class="filter-input-wrapper" style="flex: 1;">
        <input type="text" id="search-payments" class="filter-input" placeholder="Buscar por venta, cliente...">
        <i data-lucide="search"></i>
      </div>
    </div>

    <!-- Table -->
    <div class="card table-container">
      <table class="table">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Venta Ref.</th>
            <th>Cliente</th>
            <th>Concepto</th>
            <th>Método</th>
            <th style="text-align: right;">Monto</th>
          </tr>
        </thead>
        <tbody id="payments-table-body">
          ${payments.length === 0 ? `<tr><td colspan="6" class="text-center text-muted py-4">No hay pagos registrados</td></tr>` : 
            payments.map(p => {
              const client = Clients.find(p.clientId);
              const clientName = client ? (client.name || `${client.firstName || ''} ${client.lastName || ''}`.trim()) : 'N/A';
              return `
                <tr class="payment-row">
                  <td>${fmtDate(p.date)}</td>
                  <td><a href="#/sales/detail/${p.saleId}" style="color:var(--gold);text-decoration:none;font-weight:600;">${p.saleNumber || 'Venta'}</a></td>
                  <td class="searchable">${clientName}</td>
                  <td><span class="badge ${p.type === 'deposit' ? 'badge-primary' : 'badge-neutral'}">${getTypeLabel(p.type)}</span></td>
                  <td>${getMethodLabel(p.method)}</td>
                  <td style="text-align: right; font-weight: 700; color: var(--success);">${fmt(p.amount)}</td>
                </tr>
              `;
            }).join('')
          }
        </tbody>
      </table>
    </div>
  `;

  content.innerHTML = html;
  safeCreateIcons({ nodes: [content] });

  // Search filter
  document.getElementById('search-payments')?.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    document.querySelectorAll('.payment-row').forEach(row => {
      const text = row.textContent.toLowerCase();
      row.style.display = text.includes(term) ? '' : 'none';
    });
  });
}
