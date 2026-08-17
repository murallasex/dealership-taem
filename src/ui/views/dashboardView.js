// =====================================================
// AutoERP — Dashboard View Renderer
// =====================================================

import { getDashboardKPIs, getSalesChartData, getPipelineStats, getTopSellersStats, getRecentActivity, getAvailableVehiclesData } from '../../services/dashboardService.js';
import { fmt, fmtDate } from '../../utils/formatters.js';
import { safeCreateIcons } from '../../utils/dom.js';

export function renderDashboard() {
  const container = document.getElementById('page-content');
  if (!container) return;

  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? 'Buenos días' : 'Buenas tardes';
  const currentDateStr = new Date().toLocaleDateString('es-PY', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  // Get data from service
  const kpis = getDashboardKPIs();
  const { monthsLabels, salesData } = getSalesChartData(6);
  const { pipeline, totalSales } = getPipelineStats();
  const sellerStats = getTopSellersStats(3);
  const recentActivity = getRecentActivity(5);
  const recentVehicles = getAvailableVehiclesData(4);

  const html = `
    <div class="page-header">
      <div>
        <h1 class="page-title">${greeting}, Usuario</h1>
        <p class="text-muted" style="text-transform: capitalize;">${currentDateStr}</p>
      </div>
    </div>

    <!-- KPIs -->
    <div class="form-grid" style="grid-template-columns: repeat(6, 1fr); margin-bottom: 24px;">
      <div class="card p-4">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
          <h3 class="text-muted" style="font-size: 0.875rem; font-weight: 500; margin: 0;">Stock</h3>
          <i data-lucide="car" style="color: var(--text-muted); width: 20px; height: 20px;"></i>
        </div>
        <div style="font-size: 1.5rem; font-weight: 700; color: var(--text-light);">${kpis.availableVehicles}</div>
      </div>

      <div class="card p-4">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
          <h3 class="text-muted" style="font-size: 0.875rem; font-weight: 500; margin: 0;">Ventas Mes</h3>
          <i data-lucide="shopping-cart" style="color: var(--text-muted); width: 20px; height: 20px;"></i>
        </div>
        <div style="font-size: 1.5rem; font-weight: 700; color: var(--text-light);">${kpis.salesCountThisMonth}</div>
      </div>

      <div class="card p-4">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
          <h3 class="text-muted" style="font-size: 0.875rem; font-weight: 500; margin: 0;">Monto Mes</h3>
          <i data-lucide="dollar-sign" style="color: var(--text-muted); width: 20px; height: 20px;"></i>
        </div>
        <div style="font-size: 1.5rem; font-weight: 700; color: var(--text-light);">${fmt(kpis.amountSoldThisMonth)}</div>
      </div>

      <div class="card p-4">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
          <h3 class="text-muted" style="font-size: 0.875rem; font-weight: 500; margin: 0;">Clientes Activos</h3>
          <i data-lucide="users" style="color: var(--text-muted); width: 20px; height: 20px;"></i>
        </div>
        <div style="font-size: 1.5rem; font-weight: 700; color: var(--text-light);">${kpis.activeClients}</div>
      </div>

      <div class="card p-4">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
          <h3 class="text-muted" style="font-size: 0.875rem; font-weight: 500; margin: 0;">Cuotas Vencidas</h3>
          <i data-lucide="alert-circle" style="color: ${kpis.overdueCount > 0 ? 'var(--danger)' : 'var(--text-muted)'}; width: 20px; height: 20px;"></i>
        </div>
        <div style="font-size: 1.5rem; font-weight: 700; color: ${kpis.overdueCount > 0 ? 'var(--danger)' : 'var(--text-light)'};">${kpis.overdueCount}</div>
      </div>

      <div class="card p-4">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
          <h3 class="text-muted" style="font-size: 0.875rem; font-weight: 500; margin: 0;">Margen Promedio</h3>
          <i data-lucide="percent" style="color: var(--text-muted); width: 20px; height: 20px;"></i>
        </div>
        <div style="font-size: 1.5rem; font-weight: 700; color: var(--text-light);">${kpis.avgMargin}%</div>
      </div>
    </div>

    <!-- Charts Row -->
    <div style="display: grid; grid-template-columns: 60% 40%; gap: 24px; margin-bottom: 24px;">
      <div class="card p-4">
        <h3 class="card-title" style="margin-bottom: 16px;">Ventas por mes (6 meses)</h3>
        <div style="height: 280px; position: relative;">
          <canvas id="salesChart"></canvas>
        </div>
      </div>

      <div class="card p-4">
        <h3 class="card-title" style="margin-bottom: 16px;">Pipeline de Ventas</h3>
        <div style="display: flex; flex-direction: column; gap: 16px; margin-top: 24px;">
          ${Object.entries(pipeline).map(([stage, count]) => {
            const labels = { quote: 'Cotización', reservation: 'Reserva', contract: 'Contrato', delivery: 'Entrega' };
            const colors = { quote: 'var(--info)', reservation: 'var(--warning)', contract: 'var(--gold)', delivery: 'var(--success)' };
            const perc = Math.round((count / totalSales) * 100);
            return `
            <div style="cursor: pointer;" onclick="window.location.hash = '#/sales'">
              <div style="display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 0.875rem;">
                <span class="text-light">${labels[stage]}</span>
                <span class="text-muted">${count} (${perc}%)</span>
              </div>
              <div style="height: 8px; background: var(--bg-base); border-radius: 4px; overflow: hidden;">
                <div style="height: 100%; width: ${perc}%; background: ${colors[stage]}; border-radius: 4px;"></div>
              </div>
            </div>`;
          }).join('')}
        </div>
      </div>
    </div>

    <!-- 3rd Row -->
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px;">
      <div class="card p-4">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <h3 class="card-title">Top Vendedores del Mes</h3>
          <button class="btn btn-ghost btn-sm" onclick="window.location.hash='#/sellers'">Ver completo</button>
        </div>
        <div style="display: flex; flex-direction: column; gap: 16px;">
          ${sellerStats.map((s, i) => {
            const medalColors = ['var(--gold)', '#C0C0C0', '#CD7F32'];
            return `
            <div style="display: flex; align-items: center; gap: 12px; padding: 12px; background: var(--bg-base); border-radius: 8px;">
              <div style="width: 32px; height: 32px; border-radius: 50%; background: ${medalColors[i] || 'var(--bg-card)'}; display: flex; align-items: center; justify-content: center; color: #000; font-weight: bold;">
                ${i + 1}
              </div>
              <div style="flex: 1;">
                <div class="text-light" style="font-weight: 500;">${s.name}</div>
                <div class="text-muted" style="font-size: 0.75rem;">${s.salesCount} ventas</div>
              </div>
              <div style="text-align: right;">
                <div class="text-light" style="font-weight: 500;">${fmt(s.salesAmount)}</div>
                <div class="text-muted" style="font-size: 0.75rem;">Meta: ${s.progress}%</div>
              </div>
            </div>
            `;
          }).join('')}
        </div>
      </div>

      <div class="card p-4">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <h3 class="card-title">Alertas del Sistema</h3>
          <button class="btn btn-ghost btn-sm" onclick="window.location.hash='#/financing'">Ver todas</button>
        </div>
        <div style="display: flex; flex-direction: column; gap: 12px;">
          ${kpis.overdueInstallments.length === 0 ?
            `<div style="padding: 16px; background: rgba(34, 197, 94, 0.1); border: 1px solid var(--success); border-radius: 8px; color: var(--success); display: flex; align-items: center; gap: 8px;">
               <i data-lucide="check-circle"></i> Sin cuotas vencidas
             </div>` :
            kpis.overdueInstallments.slice(0, 3).map(inst => `
            <div style="padding: 12px; background: rgba(239, 68, 68, 0.1); border-left: 4px solid var(--danger); border-radius: 4px;">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px;">
                <span class="text-light" style="font-weight: 500;">${inst.client?.name || 'Cliente'}</span>
                <span class="text-danger" style="font-weight: bold;">${fmt(inst.amount || 0)}</span>
              </div>
              <div class="text-muted" style="font-size: 0.875rem;">
                Venció: ${fmtDate(inst.dueDate)}
              </div>
            </div>
            `).join('')}
        </div>
      </div>
    </div>

    <!-- 4th Row -->
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px;">
      <div class="card p-4">
        <h3 class="card-title" style="margin-bottom: 16px;">Actividad Reciente</h3>
        <div style="display: flex; flex-direction: column; gap: 16px; position: relative; padding-left: 12px;">
          <div style="position: absolute; left: 27px; top: 10px; bottom: 10px; width: 2px; background: var(--bg-base);"></div>
          ${recentActivity.map(act => `
            <div style="display: flex; gap: 16px; position: relative; z-index: 1;">
              <div style="width: 32px; height: 32px; border-radius: 50%; background: var(--bg-card); border: 2px solid var(--gold); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                <i data-lucide="clock" style="width: 16px; height: 16px; color: var(--gold);"></i>
              </div>
              <div>
                <div class="text-light" style="font-weight: 500; text-transform: capitalize;">${act.stage}</div>
                <div class="text-muted" style="font-size: 0.875rem;">${act.notes || act.note || ''}</div>
                <div class="text-muted" style="font-size: 0.75rem;">${fmtDate(act.date)} ${act.client?.name ? '- ' + act.client.name : ''}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="card p-4">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <h3 class="card-title">Vehículos Disponibles</h3>
          <button class="btn btn-ghost btn-sm" onclick="window.location.hash='#/inventory'">Ver inventario</button>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          ${recentVehicles.map(v => `
            <div style="background: var(--bg-base); padding: 12px; border-radius: 8px; border: 1px solid var(--border);">
              <div style="font-weight: 500; color: var(--text-light); margin-bottom: 4px;">${v.brand} ${v.model}</div>
              <div class="text-muted" style="font-size: 0.875rem; margin-bottom: 8px;">${v.year}</div>
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="color: var(--gold); font-weight: bold;">${fmt(v.suggestedPrice || v.salePrice || 0)}</span>
                <span class="badge ${v.condition === 'new' ? 'badge-gold' : v.condition === 'used' ? 'badge-neutral' : 'badge-info'}">
                  ${v.condition === 'new' ? 'Nuevo' : v.condition === 'used' ? 'Usado' : 'Consignado'}
                </span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;

  container.innerHTML = html;
  safeCreateIcons({ nodes: [container] });

  // Initialize Chart if Chart.js is present
  if (typeof window !== 'undefined') {
    if (window._charts) {
      window._charts.forEach(c => c.destroy());
    }
    window._charts = [];

    const ctx = document.getElementById('salesChart');
    if (ctx && window.Chart) {
      const gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 300);
      gradient.addColorStop(0, 'rgba(201, 162, 39, 0.4)');
      gradient.addColorStop(1, 'rgba(201, 162, 39, 0)');

      const chart = new window.Chart(ctx, {
        type: 'line',
        data: {
          labels: monthsLabels,
          datasets: [{
            label: 'Ventas',
            data: salesData,
            borderColor: '#c9a227',
            backgroundColor: gradient,
            borderWidth: 2,
            fill: true,
            tension: 0.4,
            pointBackgroundColor: '#14171f',
            pointBorderColor: '#c9a227',
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#14171f',
              titleColor: '#f8fafc',
              bodyColor: '#c9a227',
              borderColor: '#2e3340',
              borderWidth: 1
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              grid: { display: false, drawBorder: false },
              ticks: { color: '#94a3b8', stepSize: 1 }
            },
            x: {
              grid: { display: false, drawBorder: false },
              ticks: { color: '#94a3b8' }
            }
          }
        }
      });
      window._charts.push(chart);
    }
  }
}
