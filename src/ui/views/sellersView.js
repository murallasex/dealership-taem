// =====================================================
// AutoERP — Sellers View Renderer
// =====================================================

import { getSellerRanking, getSellersKPIs, getSellerDetailStats, saveSellerGoal } from '../../services/sellersService.js';
import { fmt, fmtDate } from '../../utils/formatters.js';
import { safeCreateIcons } from '../../utils/dom.js';
import { showToast } from '../components/toast.js';
import { go } from '../../core/router.js';

export function renderSellersList() {
  const container = document.getElementById('page-content');
  if (!container) return;

  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
  const kpis = getSellersKPIs(currentMonth);
  const ranking = kpis.ranking;

  let rankingHTML = `<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1rem; margin-bottom: 2rem;">`;

  ranking.forEach((seller, index) => {
    let rankIcon = '';
    let rankColor = '';
    if (index === 0) { rankIcon = 'trophy'; rankColor = 'gold'; }
    else if (index === 1) { rankIcon = 'medal'; rankColor = 'silver'; }
    else if (index === 2) { rankIcon = 'award'; rankColor = '#cd7f32'; }
    else { rankIcon = 'user'; rankColor = 'gray'; }

    rankingHTML += `
      <div class="card" style="border-top: 4px solid ${seller.color || '#ccc'}">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
          <div style="display: flex; align-items: center; gap: 1rem;">
            <div style="width: 50px; height: 50px; border-radius: 50%; background-color: ${seller.color || '#333'}; display: flex; justify-content: center; align-items: center; color: white; font-weight: bold; font-size: 1.2rem;">
              ${seller.avatar || (seller.name ? seller.name.substring(0, 2).toUpperCase() : 'VE')}
            </div>
            <div>
              <h3 style="margin:0">${seller.name || 'Sin nombre'}</h3>
              <small style="color:var(--text-muted)">${seller.email || ''}</small>
            </div>
          </div>
          <div style="color: ${rankColor}; text-align: center;">
            <i data-lucide="${rankIcon}" style="width: 24px; height: 24px;"></i>
            <div style="font-weight: bold; font-size: 1.2rem;">#${index + 1}</div>
          </div>
        </div>
        <div style="margin-bottom: 1rem;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
            <span>Ventas del mes:</span>
            <strong>${seller.salesCount}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
            <span>Monto total:</span>
            <strong>${fmt(seller.totalAmount)}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
            <span>Meta de mes:</span>
            <strong>${seller.targetText}</strong>
          </div>
        </div>
        <div>
          <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 0.25rem;">
            <span>Progreso</span>
            <span>${(seller.progress || 0).toFixed(0)}%</span>
          </div>
          <div style="width: 100%; height: 8px; background-color: var(--bg-base); border-radius: 4px; overflow: hidden; margin-bottom: 0.5rem;">
            <div style="height: 100%; width: ${seller.progress}%; background-color: ${seller.goalMet ? 'var(--color-success)' : 'var(--color-gold)'};"></div>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span class="badge ${seller.goalMet ? 'badge-success' : 'badge-warning'}">${seller.goalMet ? 'Meta Cumplida' : 'En Progreso'}</span>
            <button class="btn btn-sm btn-primary btn-ver-detalle" data-id="${seller.id}">Ver Detalle</button>
          </div>
        </div>
      </div>
    `;
  });
  rankingHTML += `</div>`;

  let tableHTML = `
    <div class="card">
      <div class="card-header">
        <h3 class="card-title">Resumen de Vendedores</h3>
      </div>
      <div class="table-wrap">
        <table class="table-container" style="width: 100%; text-align: left; border-collapse: collapse;">
          <thead>
            <tr style="border-bottom: 1px solid var(--border-color);">
              <th style="padding: 0.75rem;">Nombre</th>
              <th style="padding: 0.75rem;">Estado</th>
              <th style="padding: 0.75rem;">Ventas (Mes)</th>
              <th style="padding: 0.75rem;">Monto (Mes)</th>
              <th style="padding: 0.75rem;">Ingreso</th>
              <th style="padding: 0.75rem;">Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${ranking.map(s => `
              <tr style="border-bottom: 1px solid var(--border-color);">
                <td style="padding: 0.75rem;">
                  <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <div style="width: 24px; height: 24px; border-radius: 50%; background-color: ${s.color || '#333'}; display: flex; justify-content: center; align-items: center; color: white; font-size: 0.7rem;">${s.avatar || (s.name ? s.name.substring(0, 2).toUpperCase() : 'VE')}</div>
                    ${s.name || ''}
                  </div>
                </td>
                <td style="padding: 0.75rem;"><span class="badge ${s.active ? 'badge-success' : 'badge-neutral'}">${s.active ? 'Activo' : 'Inactivo'}</span></td>
                <td style="padding: 0.75rem;">${s.salesCount}</td>
                <td style="padding: 0.75rem;">${fmt(s.totalAmount)}</td>
                <td style="padding: 0.75rem;">${fmtDate(s.hireDate)}</td>
                <td style="padding: 0.75rem;">
                  <button class="btn btn-sm btn-ghost btn-ver-detalle" data-id="${s.id}"><i data-lucide="eye"></i></button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  const html = `
    <div class="page-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
      <h2>Vendedores</h2>
      <button class="btn btn-primary" id="btn-new-seller">
        <i data-lucide="plus"></i> Nuevo Vendedor
      </button>
    </div>
    
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem;">
      <div class="card">
        <div style="color:var(--text-muted); margin-bottom:0.5rem;">Total Vendedores</div>
        <div style="font-size: 2rem; font-weight: bold;">${kpis.activeSellersCount}</div>
      </div>
      <div class="card">
        <div style="color:var(--text-muted); margin-bottom:0.5rem;">Ventas este mes</div>
        <div style="font-size: 2rem; font-weight: bold;">${kpis.totalSalesThisMonth}</div>
      </div>
      <div class="card">
        <div style="color:var(--text-muted); margin-bottom:0.5rem;">Mejor Vendedor</div>
        <div style="font-size: 1.5rem; font-weight: bold; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${kpis.bestSeller}</div>
      </div>
      <div class="card">
        <div style="color:var(--text-muted); margin-bottom:0.5rem;">Promedio por vendedor</div>
        <div style="font-size: 2rem; font-weight: bold;">${kpis.avgPerSeller}</div>
      </div>
    </div>
    
    <h3 style="margin-bottom: 1rem;">Ranking del Mes</h3>
    ${rankingHTML}
    
    ${tableHTML}
  `;

  container.innerHTML = html;
  safeCreateIcons({ nodes: [container] });

  document.getElementById('btn-new-seller')?.addEventListener('click', () => {
    import('../components/modal.js').then(({ openModal, closeModal }) => {
      openModal('Nuevo Vendedor', `
        <form id="new-seller-form" class="form-grid">
          <div class="form-group"><label>Nombre Completo</label><input type="text" id="seller-name" class="form-control" required></div>
          <div class="form-group"><label>Email</label><input type="email" id="seller-email" class="form-control" required></div>
          <div class="form-group"><label>Teléfono</label><input type="text" id="seller-phone" class="form-control"></div>
          <div class="form-group"><label>Color Identificador</label><input type="color" id="seller-color" class="form-control" value="#c9a227"></div>
        </form>
      `, `
        <button class="btn btn-secondary" onclick="window._closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="document.getElementById('new-seller-form').dispatchEvent(new Event('submit'))">Guardar Vendedor</button>
      `);
      window._closeModal = closeModal;
      document.getElementById('new-seller-form').addEventListener('submit', (e) => {
        e.preventDefault();
        import('../../core/store.js').then(({ Sellers, generateId, now }) => {
          Sellers.save({
            id: generateId(),
            name: document.getElementById('seller-name').value,
            email: document.getElementById('seller-email').value,
            phone: document.getElementById('seller-phone').value,
            color: document.getElementById('seller-color').value,
            hireDate: now(),
            active: true
          });
          closeModal();
          showToast('Vendedor creado exitosamente', 'success');
          import('../../core/router.js').then(({ navigate }) => navigate('#/sellers'));
        });
      });
    });
  });

  container.querySelectorAll('.btn-ver-detalle').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      go('#/sellers/' + id);
    });
  });
}

export function renderSellerDetail(sellerId) {
  const stats = getSellerDetailStats(sellerId);
  const container = document.getElementById('page-content');
  if (!container) return;

  if (!stats) {
    showToast('Vendedor no encontrado', 'danger');
    go('#/sellers');
    return;
  }

  const { seller, sellerSales, totalSalesCount, totalAmount, estimatedCommission, salesByMonth, bestMonth, goals } = stats;

  const html = `
    <div class="page-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
      <div style="display: flex; align-items: center; gap: 1rem;">
        <button class="btn btn-ghost btn-back">
          <i data-lucide="arrow-left"></i>
        </button>
        <h2>${seller.name || ''}</h2>
      </div>
    </div>
    
    <div class="card" style="margin-bottom: 2rem; display: flex; gap: 2rem; align-items: center; background-color: var(--bg-card);">
      <div style="width: 100px; height: 100px; border-radius: 50%; background-color: ${seller.color || '#333'}; display: flex; justify-content: center; align-items: center; color: white; font-weight: bold; font-size: 2.5rem;">
        ${seller.avatar || (seller.name ? seller.name.substring(0, 2).toUpperCase() : 'VE')}
      </div>
      <div>
        <h2 style="margin: 0 0 0.5rem 0;">${seller.name || ''}</h2>
        <div style="display: flex; gap: 1.5rem; color: var(--text-muted);">
          <span style="display: flex; align-items: center; gap: 0.5rem;"><i data-lucide="mail" style="width:16px;"></i> ${seller.email || ''}</span>
          <span style="display: flex; align-items: center; gap: 0.5rem;"><i data-lucide="phone" style="width:16px;"></i> ${seller.phone || ''}</span>
          <span style="display: flex; align-items: center; gap: 0.5rem;"><i data-lucide="calendar" style="width:16px;"></i> Activo desde ${fmtDate(seller.hireDate)}</span>
          <span class="badge ${seller.active ? 'badge-success' : 'badge-neutral'}">${seller.active ? 'Activo' : 'Inactivo'}</span>
        </div>
      </div>
    </div>

    <div style="display: flex; gap: 1rem; border-bottom: 1px solid var(--border-color); margin-bottom: 1.5rem;" id="seller-tabs">
      <button class="btn btn-ghost tab-btn active" data-tab="resumen" style="border-bottom: 2px solid var(--color-gold); border-radius: 0;">Resumen</button>
      <button class="btn btn-ghost tab-btn" data-tab="ventas" style="border-radius: 0;">Ventas</button>
      <button class="btn btn-ghost tab-btn" data-tab="metas" style="border-radius: 0;">Metas</button>
      <button class="btn btn-ghost tab-btn" data-tab="config" style="border-radius: 0;">Configurar Meta</button>
    </div>

    <div id="tab-resumen" class="tab-content" style="display: block;">
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem;">
        <div class="card">
          <div style="color:var(--text-muted); margin-bottom:0.5rem;">Ventas Totales</div>
          <div style="font-size: 1.5rem; font-weight: bold;">${totalSalesCount}</div>
        </div>
        <div class="card">
          <div style="color:var(--text-muted); margin-bottom:0.5rem;">Monto Total</div>
          <div style="font-size: 1.5rem; font-weight: bold;">${fmt(totalAmount)}</div>
        </div>
        <div class="card">
          <div style="color:var(--text-muted); margin-bottom:0.5rem;">Comisión Estimada (2%)</div>
          <div style="font-size: 1.5rem; font-weight: bold; color: var(--color-success);">${fmt(estimatedCommission)}</div>
        </div>
        <div class="card">
          <div style="color:var(--text-muted); margin-bottom:0.5rem;">Mejor Mes</div>
          <div style="font-size: 1.5rem; font-weight: bold;">${bestMonth}</div>
        </div>
      </div>
      
      <div class="card">
        <h3 class="card-title" style="margin-bottom: 1rem;">Ventas (Últimos 6 meses)</h3>
        <canvas id="salesChart" style="width: 100%; height: 300px;"></canvas>
      </div>
    </div>

    <div id="tab-ventas" class="tab-content" style="display: none;">
      <div class="card">
        <div class="table-wrap">
          <table class="table-container" style="width: 100%; text-align: left; border-collapse: collapse;">
            <thead>
              <tr style="border-bottom: 1px solid var(--border-color);">
                <th style="padding: 0.75rem;">Fecha</th>
                <th style="padding: 0.75rem;">Cliente</th>
                <th style="padding: 0.75rem;">Vehículo</th>
                <th style="padding: 0.75rem;">Monto</th>
                <th style="padding: 0.75rem;">Estado</th>
              </tr>
            </thead>
            <tbody>
              ${sellerSales.map(s => {
                const badgeClass = s.stage === 'delivery' ? 'badge-success' : s.stage === 'contract' ? 'badge-gold' : 'badge-info';
                return `
                <tr style="border-bottom: 1px solid var(--border-color);">
                  <td style="padding: 0.75rem;">${fmtDate(s.date || s.createdAt)}</td>
                  <td style="padding: 0.75rem;">${s.clientId || ''}</td>
                  <td style="padding: 0.75rem;">${s.vehicleId || 'N/A'}</td>
                  <td style="padding: 0.75rem;">${fmt(s.totalPrice || 0)}</td>
                  <td style="padding: 0.75rem;"><span class="badge ${badgeClass}">${s.stage}</span></td>
                </tr>
                `;
              }).join('')}
              ${sellerSales.length === 0 ? `<tr><td colspan="5" style="padding: 1rem; text-align:center; color:var(--text-muted);">No hay ventas registradas</td></tr>` : ''}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div id="tab-metas" class="tab-content" style="display: none;">
      <div class="card">
        <div class="table-wrap">
          <table class="table-container" style="width: 100%; text-align: left; border-collapse: collapse;">
            <thead>
              <tr style="border-bottom: 1px solid var(--border-color);">
                <th style="padding: 0.75rem;">Periodo</th>
                <th style="padding: 0.75rem;">Tipo</th>
                <th style="padding: 0.75rem;">Objetivo</th>
                <th style="padding: 0.75rem;">Resultado</th>
                <th style="padding: 0.75rem;">Progreso</th>
                <th style="padding: 0.75rem;">Estado</th>
              </tr>
            </thead>
            <tbody>
              ${goals.map(g => {
                const target = g.target || 0;
                const result = g.result || 0;
                const progress = target > 0 ? Math.min(100, Math.round((result / target) * 100)) : 0;
                const isMet = progress >= 100;
                return `
                <tr style="border-bottom: 1px solid var(--border-color);">
                  <td style="padding: 0.75rem;">${g.period || ''}</td>
                  <td style="padding: 0.75rem;">${g.type || ''}</td>
                  <td style="padding: 0.75rem;">${g.type === 'units' ? (g.target || 0) : fmt(g.target || 0)}</td>
                  <td style="padding: 0.75rem;">${g.type === 'units' ? (g.result || 0) : fmt(g.result || 0)}</td>
                  <td style="padding: 0.75rem;">
                    <div style="display:flex; align-items:center; gap:0.5rem;">
                      <div style="width: 100px; height: 6px; background-color: var(--bg-base); border-radius: 3px; overflow: hidden;">
                        <div style="height: 100%; width: ${progress}%; background-color: ${isMet ? 'var(--color-success)' : 'var(--color-gold)'};"></div>
                      </div>
                      <span>${progress.toFixed(0)}%</span>
                    </div>
                  </td>
                  <td style="padding: 0.75rem;">
                    <span class="badge ${g.status === 'completed' || isMet ? 'badge-success' : 'badge-warning'}">${g.status === 'completed' || isMet ? 'Cumplida' : 'Activa'}</span>
                  </td>
                </tr>
                `;
              }).join('')}
              ${goals.length === 0 ? `<tr><td colspan="6" style="padding: 1rem; text-align:center; color:var(--text-muted);">No hay metas configuradas</td></tr>` : ''}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div id="tab-config" class="tab-content" style="display: none;">
      <div class="card" style="max-width: 600px;">
        <h3 class="card-title">Configurar Meta</h3>
        <form id="goal-form" class="form-grid">
          <div class="form-group">
            <label>Periodo (YYYY-MM)</label>
            <input type="month" id="goal-period" class="form-control" required value="${new Date().toISOString().slice(0, 7)}">
          </div>
          <div class="form-group">
            <label>Tipo de Meta</label>
            <select id="goal-type" class="form-control">
              <option value="units">Unidades</option>
              <option value="amount">Monto en Ventas</option>
              <option value="margin">Margen de Ganancia</option>
            </select>
          </div>
          <div class="form-group">
            <label>Objetivo</label>
            <input type="number" id="goal-target" class="form-control" required min="1">
          </div>
          <div class="form-group" style="grid-column: 1 / -1;">
            <button type="submit" class="btn btn-primary">Guardar Meta</button>
          </div>
        </form>
      </div>
    </div>
  `;

  container.innerHTML = html;
  safeCreateIcons({ nodes: [container] });

  container.querySelector('.btn-back')?.addEventListener('click', () => {
    go('#/sellers');
  });

  const tabBtns = container.querySelectorAll('.tab-btn');
  const tabContents = container.querySelectorAll('.tab-content');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => {
        b.classList.remove('active');
        b.style.borderBottom = 'none';
      });
      tabContents.forEach(c => c.style.display = 'none');

      btn.classList.add('active');
      btn.style.borderBottom = '2px solid var(--color-gold)';
      const tabId = btn.getAttribute('data-tab');
      const targetEl = document.getElementById(`tab-${tabId}`);
      if (targetEl) targetEl.style.display = 'block';
    });
  });

  document.getElementById('goal-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const period = document.getElementById('goal-period').value;
    const type = document.getElementById('goal-type').value;
    const target = parseFloat(document.getElementById('goal-target').value);
    saveSellerGoal({ sellerId, period, type, target, result: 0, status: 'active' });
    showToast('Meta guardada exitosamente', 'success');
  });

  if (typeof window !== 'undefined' && window.Chart) {
    const chartEl = document.getElementById('salesChart');
    if (chartEl) {
      const ctx = chartEl.getContext('2d');
      const labels = [];
      const data = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const m = d.toISOString().slice(0, 7);
        labels.push(m);
        data.push(salesByMonth[m] || 0);
      }

      new window.Chart(ctx, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [{
            label: 'Ventas (Unidades)',
            data: data,
            backgroundColor: '#c9a227',
            borderRadius: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { beginAtZero: true, ticks: { stepSize: 1, color: '#ccc' }, grid: { color: 'rgba(255,255,255,0.1)' } },
            x: { ticks: { color: '#ccc' }, grid: { display: false } }
          }
        }
      });
    }
  }
}

export function renderGoals() {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const periods = [currentMonth, '2023-07', '2023-06'];

  const renderData = (selectedPeriod) => {
    const ranking = getSellerRanking(selectedPeriod);

    let leaderboardHTML = `<div style="display: flex; gap: 1rem; margin-bottom: 2rem; align-items: flex-end; justify-content: center;">`;
    const top3 = [ranking[1], ranking[0], ranking[2]].filter(Boolean);

    top3.forEach((s) => {
      const isFirst = ranking[0] && s.id === ranking[0].id;
      const rankPos = isFirst ? 1 : (ranking[1] && s.id === ranking[1].id ? 2 : 3);
      const height = isFirst ? '200px' : (rankPos === 2 ? '160px' : '140px');
      const color = isFirst ? 'gold' : (rankPos === 2 ? 'silver' : '#cd7f32');

      leaderboardHTML += `
        <div style="display: flex; flex-direction: column; align-items: center; width: 150px;">
          <div style="width: 60px; height: 60px; border-radius: 50%; background-color: ${s.color || '#333'}; display: flex; justify-content: center; align-items: center; color: white; font-weight: bold; font-size: 1.5rem; margin-bottom: 0.5rem; border: 3px solid ${color};">
            ${s.avatar || (s.name ? s.name.substring(0, 2).toUpperCase() : 'VE')}
          </div>
          <div style="text-align: center; margin-bottom: 0.5rem; font-weight: bold;">${s.name || ''}</div>
          <div style="width: 100%; background-color: var(--bg-card); border-radius: 8px 8px 0 0; display: flex; flex-direction: column; justify-content: flex-end; align-items: center; padding-bottom: 1rem; border-top: 4px solid ${color}; height: ${height}; transition: all 0.5s;">
            <i data-lucide="${isFirst ? 'trophy' : 'medal'}" style="color: ${color}; width: 32px; height: 32px; margin-bottom: 0.5rem;"></i>
            <span style="font-size: 1.2rem; font-weight: bold;">${(s.progress || 0).toFixed(0)}%</span>
          </div>
        </div>
      `;
    });
    leaderboardHTML += `</div>`;

    let tableHTML = `
      <div class="card">
        <div class="table-wrap">
          <table class="table-container" style="width: 100%; text-align: left; border-collapse: collapse;">
            <thead>
              <tr style="border-bottom: 1px solid var(--border-color);">
                <th style="padding: 0.75rem;">Rank</th>
                <th style="padding: 0.75rem;">Vendedor</th>
                <th style="padding: 0.75rem;">Tipo</th>
                <th style="padding: 0.75rem;">Progreso de Meta</th>
                <th style="padding: 0.75rem;">Estado</th>
              </tr>
            </thead>
            <tbody>
              ${ranking.map((s, idx) => {
                const isMet = s.progress >= 100;
                return `
                <tr style="border-bottom: 1px solid var(--border-color);">
                  <td style="padding: 0.75rem; font-weight:bold; color:var(--text-muted)">#${idx + 1}</td>
                  <td style="padding: 0.75rem;">
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                      <div style="width: 24px; height: 24px; border-radius: 50%; background-color: ${s.color || '#333'}; display: flex; justify-content: center; align-items: center; color: white; font-size: 0.7rem;">${s.avatar || (s.name ? s.name.substring(0, 2) : 'VE').toUpperCase()}</div>
                      ${s.name || ''}
                    </div>
                  </td>
                  <td style="padding: 0.75rem;">Unidades</td>
                  <td style="padding: 0.75rem;">
                    <div style="display: flex; flex-direction: column; gap: 0.25rem;">
                      <div style="display: flex; justify-content: space-between; font-size: 0.8rem;">
                        <span>${s.targetText}</span>
                        <span>${(s.progress || 0).toFixed(0)}%</span>
                      </div>
                      <div style="width: 100%; height: 6px; background-color: var(--bg-base); border-radius: 3px; overflow: hidden;">
                        <div style="height: 100%; width: ${s.progress}%; background-color: ${isMet ? 'var(--color-success)' : 'var(--color-gold)'};"></div>
                      </div>
                    </div>
                  </td>
                  <td style="padding: 0.75rem;">
                    <span class="badge ${isMet ? 'badge-success' : 'badge-warning'}">${isMet ? 'Cumplida' : 'En Progreso'}</span>
                  </td>
                </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    const html = `
      <div class="page-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
        <h2>Metas y Ranking</h2>
        <div style="display: flex; gap: 1rem; align-items: center;">
          <select id="period-selector" class="form-control" style="width: auto;">
            ${periods.map(p => `<option value="${p}" ${p === selectedPeriod ? 'selected' : ''}>${p}</option>`).join('')}
          </select>
          <button class="btn btn-primary" id="btn-config-goals">
            <i data-lucide="settings"></i> Configurar Metas
          </button>
        </div>
      </div>
      
      ${leaderboardHTML}
      ${tableHTML}
    `;

    const container = document.getElementById('page-content');
    if (!container) return;
    container.innerHTML = html;
    safeCreateIcons({ nodes: [container] });

    document.getElementById('period-selector')?.addEventListener('change', (e) => {
      renderData(e.target.value);
    });

    document.getElementById('btn-config-goals')?.addEventListener('click', () => {
      import('../components/modal.js').then(({ openModal, closeModal }) => {
        openModal('Configurar Metas Generales', `
          <p style="color:var(--text-muted); margin-bottom:1rem;">Esta función aplicará una meta por defecto a todos los vendedores activos para un periodo específico.</p>
          <form id="global-goals-form" class="form-grid">
            <div class="form-group">
              <label>Periodo (YYYY-MM)</label>
              <input type="month" id="global-goal-period" class="form-control" required value="${new Date().toISOString().slice(0, 7)}">
            </div>
            <div class="form-group">
              <label>Tipo de Meta</label>
              <select id="global-goal-type" class="form-control">
                <option value="units">Unidades</option>
                <option value="amount">Monto en Ventas</option>
              </select>
            </div>
            <div class="form-group">
              <label>Objetivo</label>
              <input type="number" id="global-goal-target" class="form-control" required min="1">
            </div>
          </form>
        `, `
          <button class="btn btn-secondary" onclick="window._closeModal()">Cancelar</button>
          <button class="btn btn-primary" onclick="document.getElementById('global-goals-form').dispatchEvent(new Event('submit'))">Aplicar a todos</button>
        `);
        window._closeModal = closeModal;
        document.getElementById('global-goals-form').addEventListener('submit', (e) => {
          e.preventDefault();
          const period = document.getElementById('global-goal-period').value;
          const type = document.getElementById('global-goal-type').value;
          const target = parseFloat(document.getElementById('global-goal-target').value);
          import('../../core/store.js').then(({ Sellers }) => {
            Sellers.all().filter(s => s.active).forEach(s => {
              saveSellerGoal({ sellerId: s.id, period, type, target, result: 0, status: 'active' });
            });
            closeModal();
            showToast('Metas aplicadas a todos los vendedores activos', 'success');
            const p = document.getElementById('period-selector');
            if (p) { p.value = period; p.dispatchEvent(new Event('change')); }
          });
        });
      });
    });
  };

  renderData(currentMonth);
}
