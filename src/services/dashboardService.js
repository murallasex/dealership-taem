// =====================================================
// AutoERP — Dashboard Pure Domain Service
// =====================================================

import { Vehicles, Sales, Clients, Financing, Sellers, Goals } from '../core/store.js';

export function getDashboardKPIs() {
  const availableVehicles = Vehicles.all().filter(v => v.commercialStatus === 'available').length;

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const salesThisMonth = Sales.all().filter(s => {
    const d = new Date(s.date || s.createdAt);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });
  const salesCountThisMonth = salesThisMonth.length;

  const deliveredSalesThisMonth = salesThisMonth.filter(s => s.stage === 'delivery');
  const amountSoldThisMonth = deliveredSalesThisMonth.reduce((sum, s) => {
    const price = Number(s.totalPrice);
    return sum + (!isNaN(price) && isFinite(price) ? price : 0);
  }, 0);

  const activeClients = Clients.all().filter(c => c.segment === 'active' || c.status === 'active').length;

  const allInstallments = Financing.all().flatMap(f =>
    (f.payments || []).map(inst => {
      const amt = Number(inst.amount);
      const safeAmount = (!isNaN(amt) && isFinite(amt)) ? amt : 0;
      return {
        ...inst,
        amount: safeAmount,
        client: Clients.all().find(c => c.id === f.clientId),
        financing: f
      };
    })
  );
  const overdueInstallments = allInstallments.filter(i => i.status === 'overdue' || (i.status === 'pending' && new Date(i.dueDate) < new Date()));
  const overdueCount = overdueInstallments.length;

  const soldVehicles = Vehicles.all().filter(v => v.commercialStatus === 'sold' && v.purchaseCost && v.suggestedPrice);
  const totalMargin = soldVehicles.reduce((sum, v) => sum + (((v.suggestedPrice - v.purchaseCost) / v.purchaseCost) * 100), 0);
  const avgMargin = soldVehicles.length > 0 ? (totalMargin / soldVehicles.length).toFixed(1) : 0;

  return {
    availableVehicles,
    salesCountThisMonth,
    amountSoldThisMonth,
    activeClients,
    overdueCount,
    overdueInstallments,
    avgMargin,
  };
}

export function getSalesChartData(monthsCount = 6) {
  const monthsLabels = [];
  const salesData = [];
  for (let i = monthsCount - 1; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    monthsLabels.push(d.toLocaleString('es-PY', { month: 'short' }).toUpperCase());

    const mCount = Sales.all().filter(s => {
      const sd = new Date(s.date || s.createdAt);
      return sd.getMonth() === d.getMonth() && sd.getFullYear() === d.getFullYear();
    }).length;
    salesData.push(mCount);
  }
  return { monthsLabels, salesData };
}

export function getPipelineStats() {
  const pipeline = {
    quote: Sales.all().filter(s => s.stage === 'quote').length,
    reservation: Sales.all().filter(s => s.stage === 'reservation').length,
    contract: Sales.all().filter(s => s.stage === 'contract').length,
    delivery: Sales.all().filter(s => s.stage === 'delivery').length
  };
  const totalSales = Sales.all().length || 1;
  return { pipeline, totalSales };
}

export function getTopSellersStats(limit = 3) {
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const currentPeriod = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;

  const salesThisMonth = Sales.all().filter(s => {
    const d = new Date(s.date || s.createdAt);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  return Sellers.all().map(seller => {
    const sales = salesThisMonth.filter(s => s.sellerId === seller.id);
    const goal = Goals.all().find(g => g.sellerId === seller.id && g.period === currentPeriod);
    const goalTarget = (goal && goal.target > 0) ? goal.target : 1;
    const salesAmount = sales.reduce((sum, s) => {
      const price = Number(s.totalPrice);
      return sum + (!isNaN(price) && isFinite(price) ? price : 0);
    }, 0);
    const rawProgress = (sales.length / goalTarget) * 100;
    const progress = Math.min(100, Math.round(isNaN(rawProgress) ? 0 : rawProgress));
    return {
      ...seller,
      salesCount: sales.length,
      salesAmount,
      progress
    };
  }).sort((a, b) => b.salesCount - a.salesCount).slice(0, limit);
}

export function getRecentActivity(limit = 5) {
  const allHistory = Sales.all().flatMap(s => (s.history || []).map(h => ({
    ...h,
    saleId: s.id,
    client: Clients.all().find(c => c.id === s.clientId)
  })));
  allHistory.sort((a, b) => new Date(b.date) - new Date(a.date));
  return allHistory.slice(0, limit);
}

export function getAvailableVehiclesData(limit = 4) {
  return Vehicles.all()
    .filter(v => v.commercialStatus === 'available')
    .sort((a, b) => new Date(b.receptionDate || b.createdAt) - new Date(a.receptionDate || a.createdAt))
    .slice(0, limit);
}
