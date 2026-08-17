// =====================================================
// AutoERP — Sellers Pure Domain Service
// =====================================================

import { Sellers, Goals, Sales, Vehicles } from '../core/store.js';

export function getSellerRanking(period = null) {
  const currentMonth = period || new Date().toISOString().slice(0, 7); // YYYY-MM

  return Sellers.all().map(seller => {
    const sellerSales = Sales.all().filter(s => s.sellerId === seller.id);
    const thisMonthSales = sellerSales.filter(s => {
      const d = s?.date || s?.createdAt || '';
      let dateStr = '';
      if (d instanceof Date) {
        dateStr = d.toISOString();
      } else if (typeof d === 'number' && !isNaN(d)) {
        dateStr = new Date(d < 1e11 ? d * 1000 : d).toISOString();
      } else {
        dateStr = String(d || '');
      }
      return dateStr.startsWith(currentMonth) && (s.stage === 'contract' || s.stage === 'delivery');
    });

    const totalAmountThisMonth = thisMonthSales.reduce((sum, s) => {
      const v = Vehicles.find(s.vehicleId);
      return sum + (s.totalPrice || (v ? v.suggestedPrice : 0));
    }, 0);

    let goalList = [];
    if (typeof Goals.bySeller === 'function') {
      goalList = Goals.bySeller(seller.id).filter(g => g.period === currentMonth);
    } else {
      goalList = Goals.all().filter(g => g.sellerId === seller.id && g.period === currentMonth);
    }
    const goal = goalList.length > 0 ? goalList[0] : { target: 1, type: 'units' };

    let progress = 0;
    let result = 0;
    let targetText = '';
    const target = goal.target || 0;

    if (goal.type === 'units') {
      result = thisMonthSales.length;
      progress = target > 0 ? Math.min(100, Math.round((result / target) * 100)) : 0;
      targetText = `${result} / ${target} uds`;
    } else {
      result = totalAmountThisMonth;
      progress = target > 0 ? Math.min(100, Math.round((result / target) * 100)) : 0;
      targetText = `${result} / ${target}`;
    }
    if (isNaN(progress) || !isFinite(progress)) progress = 0;

    return {
      ...seller,
      salesCount: thisMonthSales.length,
      totalAmount: totalAmountThisMonth,
      progress: Math.min(100, progress),
      targetText,
      goalMet: progress >= 100,
    };
  }).sort((a, b) => b.salesCount - a.salesCount);
}

export function getSellersKPIs(period = null) {
  const currentMonth = period || new Date().toISOString().slice(0, 7);
  const activeSellers = Sellers.all().filter(s => s.active);
  const ranking = getSellerRanking(currentMonth);

  const totalSalesThisMonth = ranking.reduce((acc, s) => acc + s.salesCount, 0);
  const bestSeller = ranking[0]?.name || 'N/A';
  const avgPerSeller = activeSellers.length > 0 ? (totalSalesThisMonth / activeSellers.length).toFixed(1) : 0;

  return {
    activeSellersCount: activeSellers.length,
    totalSalesThisMonth,
    bestSeller,
    avgPerSeller,
    ranking,
  };
}

export function getSellerDetailStats(sellerId) {
  const seller = Sellers.find(sellerId);
  if (!seller) return null;

  const sellerSales = Sales.all().filter(s => s.sellerId === seller.id);
  const completedSales = sellerSales.filter(s => s.stage === 'contract' || s.stage === 'delivery');
  const totalSalesCount = completedSales.length;

  const totalAmount = completedSales.reduce((sum, s) => {
    const v = Vehicles.find(s.vehicleId);
    return sum + (s.totalPrice || (v ? v.suggestedPrice : 0));
  }, 0);

  const estimatedCommission = totalAmount * 0.02;

  const salesByMonth = completedSales.reduce((acc, s) => {
    const d = s?.date || s?.createdAt || '';
    let dateStr = '';
    if (d instanceof Date) {
      dateStr = d.toISOString();
    } else if (typeof d === 'number' && !isNaN(d)) {
      dateStr = new Date(d < 1e11 ? d * 1000 : d).toISOString();
    } else {
      dateStr = String(d || '');
    }
    const month = dateStr.slice(0, 7);
    if (month && month.length === 7) {
      acc[month] = (acc[month] || 0) + 1;
    }
    return acc;
  }, {});

  let bestMonth = '-';
  let maxSales = 0;
  for (const [m, count] of Object.entries(salesByMonth)) {
    if (count > maxSales) {
      maxSales = count;
      bestMonth = m;
    }
  }

  const goals = Goals.all().filter(g => g.sellerId === seller.id);

  return {
    seller,
    sellerSales,
    completedSales,
    totalSalesCount,
    totalAmount,
    estimatedCommission,
    salesByMonth,
    bestMonth,
    goals,
  };
}

export function saveSellerGoal(goalData) {
  return Goals.save(goalData);
}
