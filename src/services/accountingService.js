// =====================================================
// AutoERP — Accounting Pure Domain Service
// =====================================================

import { CashBox, Vehicles, Sales, Sellers, generateId, now } from '../core/store.js';
import { getGlobalExchangeRate } from '../utils/formatters.js';

export function getCashBoxSummary(dateStr) {
  const todayStr = dateStr || new Date().toISOString().split('T')[0];
  const today = new Date(todayStr);

  const todayMovements = CashBox.all().filter(m => {
    const mDate = new Date(m.date).toISOString().split('T')[0];
    return mDate === todayStr;
  });

  const getUsdAmount = (m) => m.currency === 'PYG' ? m.amount / getGlobalExchangeRate() : m.amount;

  const incomeToday = todayMovements.filter(m => m.type === 'income').reduce((acc, m) => acc + getUsdAmount(m), 0);
  const expenseToday = todayMovements.filter(m => m.type === 'expense').reduce((acc, m) => acc + getUsdAmount(m), 0);
  const balanceToday = incomeToday - expenseToday;

  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  const monthMovements = CashBox.all().filter(m => {
    const d = new Date(m.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const incomeMonth = monthMovements.filter(m => m.type === 'income').reduce((acc, m) => acc + getUsdAmount(m), 0);
  const expenseMonth = monthMovements.filter(m => m.type === 'expense').reduce((acc, m) => acc + getUsdAmount(m), 0);
  const balanceMonth = incomeMonth - expenseMonth;

  return {
    incomeToday,
    expenseToday,
    balanceToday,
    incomeMonth,
    expenseMonth,
    balanceMonth,
    todayMovements,
    monthMovements,
    incomes: todayMovements.filter(m => m.type === 'income'),
    expenses: todayMovements.filter(m => m.type === 'expense'),
  };
}

export function getReportsData(period = 'current_month') {
  let endDate = new Date();
  endDate.setHours(23, 59, 59, 999);
  let startDate = new Date(0);

  if (period === 'current_month') {
    startDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
  } else if (period === 'last_month') {
    startDate = new Date(endDate.getFullYear(), endDate.getMonth() - 1, 1);
    endDate = new Date(endDate.getFullYear(), endDate.getMonth(), 0, 23, 59, 59);
  } else if (period === 'last_3_months') {
    startDate = new Date(endDate.getFullYear(), endDate.getMonth() - 3, 1);
  } else if (period === 'last_year') {
    startDate = new Date(endDate.getFullYear() - 1, endDate.getMonth(), 1);
  }

  const filteredMoves = CashBox.all().filter(m => {
    const d = new Date(m.date);
    return d >= startDate && d <= endDate;
  });

  const getUsdAmount = (m) => m.currency === 'PYG' ? m.amount / getGlobalExchangeRate() : m.amount;
  const incomeTotal = filteredMoves.filter(m => m.type === 'income').reduce((acc, m) => acc + getUsdAmount(m), 0);
  const expenseTotal = filteredMoves.filter(m => m.type === 'expense').reduce((acc, m) => acc + getUsdAmount(m), 0);
  const netProfit = incomeTotal - expenseTotal;

  const soldVehicles = Vehicles.all().filter(v => v.commercialStatus === 'sold' && (v.salePrice || v.suggestedPrice));
  let totalMargin = 0;
  const vehicleMargins = soldVehicles.map(v => {
    const cost = v.purchaseCost || v.price || 0;
    const prep = v.prepCost || v.preparationCost || 0;
    const totalCost = cost + prep;
    const sale = v.salePrice || v.suggestedPrice || 0;
    const margin = sale - totalCost;
    const marginPct = totalCost > 0 ? (margin / totalCost) * 100 : 0;
    totalMargin += margin;
    return {
      name: `${v.brand} ${v.model} (${v.year})`,
      totalCost,
      salePrice: sale,
      margin,
      marginPct
    };
  }).sort((a, b) => b.margin - a.margin);

  const avgMarginPct = totalMargin > 0 && soldVehicles.length > 0 ?
    (totalMargin / soldVehicles.reduce((a, b) => a + ((b.purchaseCost || b.price || 0) + (b.prepCost || b.preparationCost || 0)), 0)) * 100 : 0;

  const sellerSales = Sellers.all().map(s => {
    const sSales = Sales.all().filter(sale => sale.sellerId === s.id);
    const qty = sSales.length;
    const amount = sSales.reduce((acc, sale) => acc + (sale.totalPrice || sale.totalAmount || 0), 0);
    const avg = qty > 0 ? amount / qty : 0;
    return { name: s.name, qty, amount, avg };
  }).sort((a, b) => b.amount - a.amount);

  return {
    incomeTotal,
    expenseTotal,
    netProfit,
    avgMarginPct,
    vehicleMargins,
    sellerSales,
    filteredMoves,
  };
}

export function saveCashMovement(moveData) {
  const move = {
    id: generateId(),
    type: moveData.type,
    category: moveData.category,
    description: moveData.description,
    amount: parseFloat(moveData.amount),
    currency: moveData.currency,
    date: now(),
    registeredBy: moveData.registeredBy || 'admin'
  };
  return CashBox.save(move);
}
