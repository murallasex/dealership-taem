// =====================================================
// AutoERP — Accounting View Renderer
// =====================================================

import { getCashBoxSummary, getReportsData, saveCashMovement } from '../../services/accountingService.js';
import { fmt, fmtDate } from '../../utils/formatters.js';
import { safeCreateIcons } from '../../utils/dom.js';
import { showToast } from '../components/toast.js';
import { openModal, closeModal, confirmDialog } from '../components/modal.js';
import { go } from '../../core/router.js';
import { Expenses, generateId, now } from '../../core/store.js';

let currentDateFilter = new Date().toISOString().split('T')[0];
let currentReportPeriod = 'current_month';

// Cashbox View
export function renderCashBox() {
  const container = document.getElementById('page-content');
  if (!container) return;

  const summary = getCashBoxSummary(currentDateFilter);

  const html = `
    <div class="tabs-nav" style="margin-bottom: 2rem; border-bottom: 1px solid var(--border); display: flex; gap: 2rem;">
      <a href="#/accounting" class="tab-item active" style="padding: 0.5rem 0; color: var(--gold); text-decoration: none; border-bottom: 2px solid var(--gold); font-weight: 500;">Caja Diaria</a>
      <a href="#/accounting/expenses" class="tab-item" style="padding: 0.5rem 0; color: var(--text-muted); text-decoration: none; border-bottom: 2px solid transparent; font-weight: 500;">Egresos Empresariales</a>
      <a href="#/accounting/reports" class="tab-item" style="padding: 0.5rem 0; color: var(--text-muted); text-decoration: none; border-bottom: 2px solid transparent; font-weight: 500;">Reportes</a>
    </div>

    <div class="page-header">
      <div>
        <h1 class="page-title">Caja Diaria</h1>
        <p class="text-muted">Control de ingresos y egresos</p>
      </div>
      <div style="display: flex; gap: 10px; align-items: center;">
        <input type="date" id="dateFilter" class="form-control" value="${currentDateFilter}" style="padding: 8px; border-radius: 6px; border: 1px solid var(--border);">
        <button class="btn btn-secondary" id="btnReports"><i data-lucide="bar-chart-2"></i> Ver Reportes</button>
        <button class="btn btn-primary" id="btnRegisterMove"><i data-lucide="plus"></i> Registrar Movimiento</button>
      </div>
    </div>

    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 24px;">
      <div class="card">
        <div class="card-title text-muted" style="font-size: 0.9rem; margin-bottom: 5px;">Ingresos del día</div>
        <div style="font-size: 1.5rem; font-weight: 600; color: var(--success);">${fmt(summary.incomeToday)}</div>
      </div>
      <div class="card">
        <div class="card-title text-muted" style="font-size: 0.9rem; margin-bottom: 5px;">Egresos del día</div>
        <div style="font-size: 1.5rem; font-weight: 600; color: var(--danger);">${fmt(summary.expenseToday)}</div>
      </div>
      <div class="card">
        <div class="card-title text-muted" style="font-size: 0.9rem; margin-bottom: 5px;">Saldo del día</div>
        <div style="font-size: 1.5rem; font-weight: 600; color: ${summary.balanceToday >= 0 ? 'var(--success)' : 'var(--danger)'};">${fmt(summary.balanceToday)}</div>
      </div>
      <div class="card">
        <div class="card-title text-muted" style="font-size: 0.9rem; margin-bottom: 5px;">Acumulado del Mes</div>
        <div style="font-size: 1.5rem; font-weight: 600;">${fmt(summary.balanceMonth)}</div>
      </div>
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 32px;">
      <!-- Ingresos -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title" style="color: var(--success)">Ingresos</h3>
        </div>
        <div class="table-container">
          <div class="table-wrap">
            <table style="width: 100%; text-align: left; border-collapse: collapse;">
              <thead>
                <tr style="border-bottom: 1px solid var(--border);">
                  <th style="padding: 12px 16px; font-weight: 500; color: var(--text-muted);">Hora</th>
                  <th style="padding: 12px 16px; font-weight: 500; color: var(--text-muted);">Descripción</th>
                  <th style="padding: 12px 16px; font-weight: 500; color: var(--text-muted);">Categoría</th>
                  <th style="padding: 12px 16px; font-weight: 500; color: var(--text-muted); text-align: right;">Monto</th>
                </tr>
              </thead>
              <tbody>
                ${summary.incomes.length === 0 ? `<tr><td colspan="4" style="padding: 16px; text-align: center; color: var(--text-muted);">Sin ingresos</td></tr>` : ''}
                ${summary.incomes.map(m => `
                  <tr style="border-bottom: 1px solid var(--border);">
                    <td style="padding: 12px 16px;">${new Date(m.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                    <td style="padding: 12px 16px;">${m.description}</td>
                    <td style="padding: 12px 16px;"><span class="badge badge-success">${m.category}</span></td>
                    <td style="padding: 12px 16px; text-align: right; font-weight: 500;">${m.currency} ${fmt(m.amount).replace('PYG', '')}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Egresos -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title" style="color: var(--danger)">Egresos</h3>
        </div>
        <div class="table-container">
          <div class="table-wrap">
            <table style="width: 100%; text-align: left; border-collapse: collapse;">
              <thead>
                <tr style="border-bottom: 1px solid var(--border);">
                  <th style="padding: 12px 16px; font-weight: 500; color: var(--text-muted);">Hora</th>
                  <th style="padding: 12px 16px; font-weight: 500; color: var(--text-muted);">Descripción</th>
                  <th style="padding: 12px 16px; font-weight: 500; color: var(--text-muted);">Categoría</th>
                  <th style="padding: 12px 16px; font-weight: 500; color: var(--text-muted); text-align: right;">Monto</th>
                </tr>
              </thead>
              <tbody>
                ${summary.expenses.length === 0 ? `<tr><td colspan="4" style="padding: 16px; text-align: center; color: var(--text-muted);">Sin egresos</td></tr>` : ''}
                ${summary.expenses.map(m => `
                  <tr style="border-bottom: 1px solid var(--border);">
                    <td style="padding: 12px 16px;">${new Date(m.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                    <td style="padding: 12px 16px;">${m.description}</td>
                    <td style="padding: 12px 16px;"><span class="badge badge-danger">${m.category}</span></td>
                    <td style="padding: 12px 16px; text-align: right; font-weight: 500;">${m.currency} ${fmt(m.amount).replace('PYG', '')}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <h3 class="card-title">Movimientos del Mes</h3>
      </div>
      <div class="table-container">
        <div class="table-wrap">
          <table style="width: 100%; text-align: left; border-collapse: collapse;">
            <thead>
              <tr style="border-bottom: 1px solid var(--border);">
                <th style="padding: 12px 16px; font-weight: 500; color: var(--text-muted);">Fecha</th>
                <th style="padding: 12px 16px; font-weight: 500; color: var(--text-muted);">Tipo</th>
                <th style="padding: 12px 16px; font-weight: 500; color: var(--text-muted);">Categoría</th>
                <th style="padding: 12px 16px; font-weight: 500; color: var(--text-muted);">Descripción</th>
                <th style="padding: 12px 16px; font-weight: 500; color: var(--text-muted); text-align: right;">Monto</th>
              </tr>
            </thead>
            <tbody>
              ${summary.monthMovements.sort((a, b) => new Date(b.date) - new Date(a.date)).map(m => `
                <tr style="border-bottom: 1px solid var(--border);">
                  <td style="padding: 12px 16px;">${fmtDate(m.date)}</td>
                  <td style="padding: 12px 16px;">
                    <span class="badge ${m.type === 'income' ? 'badge-success' : 'badge-danger'}">
                      ${m.type === 'income' ? 'Ingreso' : 'Egreso'}
                    </span>
                  </td>
                  <td style="padding: 12px 16px;"><span class="badge badge-neutral">${m.category}</span></td>
                  <td style="padding: 12px 16px;">${m.description}</td>
                  <td style="padding: 12px 16px; text-align: right; font-weight: 500; color: ${m.type === 'income' ? 'var(--success)' : 'var(--danger)'};">
                    ${fmt(m.amount)}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  container.innerHTML = html;
  safeCreateIcons({ nodes: [container] });

  document.getElementById('dateFilter')?.addEventListener('change', (e) => {
    currentDateFilter = e.target.value;
    renderCashBox();
  });

  document.getElementById('btnReports')?.addEventListener('click', () => {
    go('#/accounting/reports');
  });

  document.getElementById('btnRegisterMove')?.addEventListener('click', () => {
    openMoveModal();
  });
}

function openMoveModal() {
  const modalHtml = `
    <form id="formMove">
      <div class="form-grid" style="grid-template-columns: 1fr;">
        <div class="form-group">
          <label>Tipo de Movimiento</label>
          <select name="type" class="form-control" required id="moveType">
            <option value="income">Ingreso</option>
            <option value="expense">Egreso</option>
          </select>
        </div>
        <div class="form-group">
          <label>Categoría</label>
          <select name="category" class="form-control" required id="moveCategory">
            <option value="sale">Venta / Cobro</option>
            <option value="advance">Seña / Anticipo</option>
            <option value="installment">Cuota</option>
            <option value="other">Otros</option>
          </select>
        </div>
        <div class="form-group">
          <label>Descripción</label>
          <input type="text" name="description" class="form-control" required placeholder="Ej. Cobro saldo Toyota Hilux">
        </div>
        <div class="form-group" style="display: grid; grid-template-columns: 1fr 2fr; gap: 10px;">
          <div>
            <label>Moneda</label>
            <select name="currency" class="form-control" required>
              <option value="PYG">PYG</option>
              <option value="USD">USD</option>
            </select>
          </div>
          <div>
            <label>Monto</label>
            <input type="number" name="amount" class="form-control" required min="1" step="1">
          </div>
        </div>
      </div>
      <div style="margin-top: 24px; display: flex; justify-content: flex-end; gap: 12px;">
        <button type="button" class="btn btn-ghost" onclick="window._closeModal()">Cancelar</button>
        <button type="submit" class="btn btn-primary">Guardar</button>
      </div>
    </form>
  `;

  openModal('Registrar Movimiento', modalHtml);

  document.getElementById('moveType')?.addEventListener('change', (e) => {
    const catSelect = document.getElementById('moveCategory');
    if (!catSelect) return;
    catSelect.innerHTML = '';
    if (e.target.value === 'income') {
      catSelect.innerHTML = `
        <option value="sale">Venta / Cobro</option>
        <option value="advance">Seña / Anticipo</option>
        <option value="installment">Cuota</option>
        <option value="other">Otros</option>
      `;
    } else {
      catSelect.innerHTML = `
        <option value="preparation">Preparación de Vehículo</option>
        <option value="import">Gastos de Importación</option>
        <option value="services">Servicios Básicos</option>
        <option value="other">Otros</option>
      `;
    }
  });

  document.getElementById('formMove')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    saveCashMovement({
      type: fd.get('type'),
      category: fd.get('category'),
      description: fd.get('description'),
      amount: fd.get('amount'),
      currency: fd.get('currency'),
      registeredBy: 'admin'
    });
    closeModal();
    showToast('Movimiento registrado con éxito', 'success');
    renderCashBox();
  });
}

// =====================================================
// Expenses (Egresos Empresariales)
// =====================================================
export function renderExpenses() {
  const container = document.getElementById('page-content');
  if (!container) return;

  const expenses = Expenses.all().sort((a, b) => new Date(b.date) - new Date(a.date));
  
  let totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  const html = `
    <div class="tabs-nav" style="margin-bottom: 2rem; border-bottom: 1px solid var(--border); display: flex; gap: 2rem;">
      <a href="#/accounting" class="tab-item" style="padding: 0.5rem 0; color: var(--text-muted); text-decoration: none; border-bottom: 2px solid transparent; font-weight: 500;">Caja Diaria</a>
      <a href="#/accounting/expenses" class="tab-item active" style="padding: 0.5rem 0; color: var(--gold); text-decoration: none; border-bottom: 2px solid var(--gold); font-weight: 500;">Egresos Empresariales</a>
      <a href="#/accounting/reports" class="tab-item" style="padding: 0.5rem 0; color: var(--text-muted); text-decoration: none; border-bottom: 2px solid transparent; font-weight: 500;">Reportes</a>
    </div>

    <div class="page-header">
      <div>
        <h1 class="page-title">Egresos Empresariales</h1>
        <p class="text-muted">Control de gastos fijos y variables de la empresa</p>
      </div>
      <div style="display: flex; gap: 10px; align-items: center;">
        <button class="btn btn-primary" id="btn-new-expense"><i data-lucide="plus"></i> Nuevo Egreso</button>
      </div>
    </div>

    <div class="card" style="margin-bottom: 24px;">
      <div class="card-title text-muted" style="font-size: 0.9rem; margin-bottom: 5px;">Total Egresos Registrados</div>
      <div style="font-size: 1.5rem; font-weight: 600; color: var(--danger);">${fmt(totalExpenses)}</div>
    </div>

    <div class="card">
      <div class="card-header">
        <h3 class="card-title">Listado de Gastos</h3>
      </div>
      <div class="table-container">
        <div class="table-wrap">
          <table style="width: 100%; text-align: left; border-collapse: collapse;">
            <thead>
              <tr style="border-bottom: 1px solid var(--border);">
                <th style="padding: 12px 16px; font-weight: 500; color: var(--text-muted);">Fecha</th>
                <th style="padding: 12px 16px; font-weight: 500; color: var(--text-muted);">Categoría</th>
                <th style="padding: 12px 16px; font-weight: 500; color: var(--text-muted);">Descripción</th>
                <th style="padding: 12px 16px; font-weight: 500; color: var(--text-muted); text-align: right;">Monto</th>
                <th style="padding: 12px 16px; font-weight: 500; color: var(--text-muted); text-align: center;">Acciones</th>
              </tr>
            </thead>
            <tbody>
              ${expenses.length === 0 ? '<tr><td colspan="5" style="text-align: center; padding: 2rem; color: var(--text-muted);">No hay egresos registrados</td></tr>' : ''}
              ${expenses.map(e => `
                <tr style="border-bottom: 1px solid var(--border);">
                  <td style="padding: 12px 16px;">${fmtDate(e.date)}</td>
                  <td style="padding: 12px 16px;"><span class="badge badge-neutral">${e.category}</span></td>
                  <td style="padding: 12px 16px;">${e.description}</td>
                  <td style="padding: 12px 16px; text-align: right; font-weight: 500; color: var(--danger);">${fmt(e.amount)}</td>
                  <td style="padding: 12px 16px; text-align: center;">
                    <button class="btn btn-ghost btn-sm btn-delete-exp" data-id="${e.id}" style="color: var(--danger-color); padding: 4px;"><i data-lucide="trash-2" style="width: 16px; height: 16px;"></i></button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  container.innerHTML = html;
  safeCreateIcons({ nodes: [container] });

  document.getElementById('btn-new-expense')?.addEventListener('click', openExpenseModal);

  container.querySelectorAll('.btn-delete-exp').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.dataset.id;
      confirmDialog('¿Seguro que deseas eliminar este egreso?', () => {
        Expenses.delete(id);
        showToast('Egreso eliminado', 'success');
        renderExpenses();
      });
    });
  });
}

function openExpenseModal() {
  const html = `
    <form id="expense-form">
      <div class="form-grid">
        <div class="form-group">
          <label>Fecha</label>
          <input type="date" id="exp-date" class="form-control" required value="${new Date().toISOString().split('T')[0]}">
        </div>
        <div class="form-group">
          <label>Categoría</label>
          <select id="exp-category" class="form-control" required>
            <option value="Servicios">Servicios (Agua, Luz, Internet)</option>
            <option value="Nómina">Nómina / Salarios</option>
            <option value="Marketing">Marketing / Publicidad</option>
            <option value="Mantenimiento">Mantenimiento y Reparaciones</option>
            <option value="Compras">Compras Generales</option>
            <option value="Otros">Otros</option>
          </select>
        </div>
        <div class="form-group" style="grid-column: span 2;">
          <label>Descripción</label>
          <input type="text" id="exp-description" class="form-control" required placeholder="Detalles del gasto">
        </div>
        <div class="form-group">
          <label>Monto</label>
          <input type="number" id="exp-amount" class="form-control" required min="1" placeholder="Ej: 500000">
        </div>
      </div>
      <div style="display:flex; justify-content:flex-end; gap:1rem; margin-top:2rem;">
        <button type="button" class="btn btn-ghost" onclick="window._closeModal()">Cancelar</button>
        <button type="submit" class="btn btn-primary">Guardar Egreso</button>
      </div>
    </form>
  `;

  openModal('Nuevo Egreso', html);

  document.getElementById('expense-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = {
      id: generateId(),
      date: document.getElementById('exp-date').value,
      category: document.getElementById('exp-category').value,
      description: document.getElementById('exp-description').value,
      amount: parseFloat(document.getElementById('exp-amount').value),
      currency: 'PYG'
    };

    Expenses.save(data);
    showToast('Egreso registrado exitosamente', 'success');
    closeModal();
    renderExpenses();
  });
}

// Reports View
export function renderReports() {
  const container = document.getElementById('page-content');
  if (!container) return;

  const data = getReportsData(currentReportPeriod);

  const html = `
    <div class="tabs-nav" style="margin-bottom: 2rem; border-bottom: 1px solid var(--border); display: flex; gap: 2rem;">
      <a href="#/accounting" class="tab-item" style="padding: 0.5rem 0; color: var(--text-muted); text-decoration: none; border-bottom: 2px solid transparent; font-weight: 500;">Caja Diaria</a>
      <a href="#/accounting/expenses" class="tab-item" style="padding: 0.5rem 0; color: var(--text-muted); text-decoration: none; border-bottom: 2px solid transparent; font-weight: 500;">Egresos Empresariales</a>
      <a href="#/accounting/reports" class="tab-item active" style="padding: 0.5rem 0; color: var(--gold); text-decoration: none; border-bottom: 2px solid var(--gold); font-weight: 500;">Reportes</a>
    </div>

    <div class="page-header">
      <div>
        <h1 class="page-title">Reportes Financieros</h1>
        <p class="text-muted">Análisis de rendimiento y ganancias</p>
      </div>
      <div style="display: flex; gap: 10px; align-items: center;">
        <select id="periodFilter" class="form-control" style="padding: 8px; border-radius: 6px; border: 1px solid var(--border);">
          <option value="current_month" ${currentReportPeriod === 'current_month' ? 'selected' : ''}>Mes actual</option>
          <option value="last_month" ${currentReportPeriod === 'last_month' ? 'selected' : ''}>Mes anterior</option>
          <option value="last_3_months" ${currentReportPeriod === 'last_3_months' ? 'selected' : ''}>Últimos 3 meses</option>
          <option value="last_year" ${currentReportPeriod === 'last_year' ? 'selected' : ''}>Último año</option>
        </select>
        <button class="btn btn-primary" id="btnPdf"><i data-lucide="file-text"></i> Generar Reporte PDF</button>
      </div>
    </div>

    <!-- KPIs -->
    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 24px;">
      <div class="card">
        <div class="card-title text-muted" style="font-size: 0.9rem; margin-bottom: 5px;">Ingresos Totales</div>
        <div style="font-size: 1.5rem; font-weight: 600; color: var(--success);">${fmt(data.incomeTotal)}</div>
      </div>
      <div class="card">
        <div class="card-title text-muted" style="font-size: 0.9rem; margin-bottom: 5px;">Egresos Totales</div>
        <div style="font-size: 1.5rem; font-weight: 600; color: var(--danger);">${fmt(data.expenseTotal)}</div>
      </div>
      <div class="card">
        <div class="card-title text-muted" style="font-size: 0.9rem; margin-bottom: 5px;">Ganancia Neta</div>
        <div style="font-size: 1.5rem; font-weight: 600; color: ${data.netProfit >= 0 ? 'var(--success)' : 'var(--danger)'};">${fmt(data.netProfit)}</div>
      </div>
      <div class="card">
        <div class="card-title text-muted" style="font-size: 0.9rem; margin-bottom: 5px;">Margen Promedio</div>
        <div style="font-size: 1.5rem; font-weight: 600; color: var(--gold);">${data.avgMarginPct.toFixed(2)}%</div>
      </div>
    </div>

    <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 20px; margin-bottom: 32px;">
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Ventas e Ingresos (Últimos 6 meses)</h3>
        </div>
        <div style="padding: 16px; height: 300px;">
          <canvas id="chartHistory"></canvas>
        </div>
      </div>
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Distribución de Ingresos</h3>
        </div>
        <div style="padding: 16px; height: 300px; display:flex; justify-content:center;">
          <canvas id="chartIncomeDist"></canvas>
        </div>
      </div>
    </div>

    <div style="display: grid; grid-template-columns: 1fr; gap: 20px; margin-bottom: 32px;">
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Margen por Vehículo Vendido</h3>
        </div>
        <div class="table-container">
          <div class="table-wrap">
            <table style="width: 100%; text-align: left; border-collapse: collapse;">
              <thead>
                <tr style="border-bottom: 1px solid var(--border);">
                  <th style="padding: 12px 16px; font-weight: 500; color: var(--text-muted);">Vehículo</th>
                  <th style="padding: 12px 16px; font-weight: 500; color: var(--text-muted); text-align: right;">Costo Total</th>
                  <th style="padding: 12px 16px; font-weight: 500; color: var(--text-muted); text-align: right;">Precio Venta</th>
                  <th style="padding: 12px 16px; font-weight: 500; color: var(--text-muted); text-align: right;">Margen</th>
                  <th style="padding: 12px 16px; font-weight: 500; color: var(--text-muted); text-align: right;">%</th>
                </tr>
              </thead>
              <tbody>
                ${data.vehicleMargins.map(vm => `
                  <tr style="border-bottom: 1px solid var(--border);">
                    <td style="padding: 12px 16px;">${vm.name}</td>
                    <td style="padding: 12px 16px; text-align: right;">${fmt(vm.totalCost)}</td>
                    <td style="padding: 12px 16px; text-align: right;">${fmt(vm.salePrice)}</td>
                    <td style="padding: 12px 16px; text-align: right; font-weight: 600; color: ${vm.margin >= 0 ? 'var(--success)' : 'var(--danger)'};">${fmt(vm.margin)}</td>
                    <td style="padding: 12px 16px; text-align: right;">
                      <span class="badge ${vm.marginPct > 15 ? 'badge-success' : (vm.marginPct > 0 ? 'badge-warning' : 'badge-danger')}">
                        ${vm.marginPct.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                `).join('')}
                ${data.vehicleMargins.length > 0 ? `
                  <tr style="background: rgba(255,255,255,0.02); font-weight: bold;">
                    <td style="padding: 12px 16px;">TOTALES</td>
                    <td style="padding: 12px 16px; text-align: right;">${fmt(data.vehicleMargins.reduce((a, b) => a + b.totalCost, 0))}</td>
                    <td style="padding: 12px 16px; text-align: right;">${fmt(data.vehicleMargins.reduce((a, b) => a + b.salePrice, 0))}</td>
                    <td style="padding: 12px 16px; text-align: right; color: var(--success);">${fmt(data.vehicleMargins.reduce((a, b) => a + b.margin, 0))}</td>
                    <td style="padding: 12px 16px; text-align: right;"></td>
                  </tr>
                ` : '<tr><td colspan="5" style="padding: 16px; text-align: center;">No hay vehículos vendidos</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Rendimiento por Vendedor</h3>
        </div>
        <div class="table-container">
          <div class="table-wrap">
            <table style="width: 100%; text-align: left; border-collapse: collapse;">
              <thead>
                <tr style="border-bottom: 1px solid var(--border);">
                  <th style="padding: 12px 16px; font-weight: 500; color: var(--text-muted);">Vendedor</th>
                  <th style="padding: 12px 16px; font-weight: 500; color: var(--text-muted); text-align: center;">Ventas</th>
                  <th style="padding: 12px 16px; font-weight: 500; color: var(--text-muted); text-align: right;">Monto Total</th>
                  <th style="padding: 12px 16px; font-weight: 500; color: var(--text-muted); text-align: right;">Promedio por Venta</th>
                </tr>
              </thead>
              <tbody>
                ${data.sellerSales.map(ss => `
                  <tr style="border-bottom: 1px solid var(--border);">
                    <td style="padding: 12px 16px; font-weight: 500;">${ss.name}</td>
                    <td style="padding: 12px 16px; text-align: center;">${ss.qty}</td>
                    <td style="padding: 12px 16px; text-align: right;">${fmt(ss.amount)}</td>
                    <td style="padding: 12px 16px; text-align: right;">${fmt(ss.avg)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `;

  container.innerHTML = html;
  safeCreateIcons({ nodes: [container] });

  document.getElementById('periodFilter')?.addEventListener('change', (e) => {
    currentReportPeriod = e.target.value;
    renderReports();
  });

  document.getElementById('btnPdf')?.addEventListener('click', () => {
    if (typeof window.jspdf === 'undefined') {
      showToast('Librería PDF no cargada aún', 'danger');
      return;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('REPORTE CONTABLE: ' + (currentReportPeriod === 'last_month' ? 'Mes Pasado' : currentReportPeriod === 'ytd' ? 'Año Actual' : 'Este Mes'), 105, 20, { align: 'center' });
    doc.setFontSize(12);
    doc.text('Ingresos Totales: ' + fmt(reportData.income), 20, 40);
    doc.text('Egresos Totales: ' + fmt(reportData.expenses), 20, 50);
    doc.text('Balance Neto: ' + fmt(reportData.balance), 20, 60);
    
    let y = 80;
    doc.setFontSize(14);
    doc.text('Desglose por Categoría (Egresos)', 20, y);
    doc.setFontSize(12);
    y += 10;
    reportData.expensesByCategory.forEach(cat => {
      doc.text(cat.category + ': ' + fmt(cat.amount), 30, y);
      y += 10;
    });

    doc.save('Reporte_Contable_' + currentReportPeriod + '.pdf');
    showToast('Reporte generado exitosamente', 'success');
  });

  if (typeof window !== 'undefined') {
    if (window._charts) window._charts.forEach(c => c.destroy());
    window._charts = [];

    if (typeof window.Chart !== 'undefined') {
      const histEl = document.getElementById('chartHistory');
      if (histEl) {
        const ctxHist = histEl.getContext('2d');
        const labels = ['Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago'];
        const dataIn = [120000000, 150000000, 90000000, 210000000, 180000000, 250000000];
        const dataOut = [100000000, 120000000, 110000000, 140000000, 130000000, 160000000];

        const chartHist = new window.Chart(ctxHist, {
          type: 'bar',
          data: {
            labels: labels,
            datasets: [
              { label: 'Ingresos', data: dataIn, backgroundColor: '#10b981' },
              { label: 'Egresos', data: dataOut, backgroundColor: '#ef4444' }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { labels: { color: '#94a3b8' } } },
            scales: {
              x: { ticks: { color: '#94a3b8' }, grid: { color: '#1e293b' } },
              y: { ticks: { color: '#94a3b8' }, grid: { color: '#1e293b' } }
            }
          }
        });
        window._charts.push(chartHist);
      }

      const distEl = document.getElementById('chartIncomeDist');
      if (distEl) {
        const ctxDist = distEl.getContext('2d');
        const incomeCats = {};
        data.filteredMoves.filter(m => m.type === 'income').forEach(m => {
          incomeCats[m.category] = (incomeCats[m.category] || 0) + (m.amount * (m.currency === 'USD' ? 7500 : 1));
        });

        const distLabels = Object.keys(incomeCats).length > 0 ? Object.keys(incomeCats) : ['Sin datos'];
        const distData = Object.keys(incomeCats).length > 0 ? Object.values(incomeCats) : [1];

        const chartDist = new window.Chart(ctxDist, {
          type: 'doughnut',
          data: {
            labels: distLabels,
            datasets: [{
              data: distData,
              backgroundColor: ['#c9a227', '#10b981', '#3b82f6', '#8b5cf6', '#64748b'],
              borderWidth: 0
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'right', labels: { color: '#94a3b8' } } }
          }
        });
        window._charts.push(chartDist);
      }
    }
  }
}
