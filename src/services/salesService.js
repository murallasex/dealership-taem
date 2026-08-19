// =====================================================
// AutoERP — Sales Pure Domain Service
// =====================================================

import { Sales, Vehicles, Clients, Sellers, CashBox, Payments, Financing, generateId, now } from '../core/store.js';
import { generateFinancingPlan } from './financingService.js';

export function getSalesKPIs() {
  const allSales = Sales.all();
  const activeSales = allSales.filter(s => !s.lost);
  const deliveredSales = activeSales.filter(s => s.stage === 'delivery');
  const inProcessSales = activeSales.filter(s => s.stage !== 'delivery');
  const lostSales = allSales.filter(s => s.lost);

  const totalAmountSold = deliveredSales.reduce((sum, s) => {
    return sum + Number(s.totalPrice || 0);
  }, 0);

  return {
    totalSales: activeSales.length,
    deliveredSalesCount: deliveredSales.length,
    inProcessSalesCount: inProcessSales.length,
    lostSalesCount: lostSales.length,
    totalAmountSold,
  };
}

export function getSalesByStage() {
  const all = Sales.all();
  const active = all.filter(s => !s.lost);
  const lost = all.filter(s => s.lost);
  return {
    quote:       { title: 'Cotización', color: 'info',    items: active.filter(s => s.stage === 'quote') },
    reservation: { title: 'Reserva',   color: 'warning', items: active.filter(s => s.stage === 'reservation') },
    contract:    { title: 'Contrato',  color: 'gold',    items: active.filter(s => s.stage === 'contract') },
    delivery:    { title: 'Entrega',   color: 'success', items: active.filter(s => s.stage === 'delivery') },
    lost:        { title: 'Perdidas',  color: 'danger',  items: lost }
  };
}

export function getClientName(clientId) {
  const c = Clients.find(clientId);
  if (!c) return 'Desconocido';
  return c.name || `${c.firstName || ''} ${c.lastName || ''}`.trim() || 'Desconocido';
}

export function getVehicleName(vehicleId) {
  const v = Vehicles.find(vehicleId);
  return v ? `${v.brand} ${v.model}` : 'Desconocido';
}

export function getSellerName(sellerId) {
  const s = Sellers.find(sellerId);
  if (!s) return 'Desconocido';
  return s.name || `${s.firstName || ''} ${s.lastName || ''}`.trim() || 'Desconocido';
}

export function advanceSaleStage(saleId, currentStage) {
  const sale = Sales.find(saleId);
  if (!sale) return null;

  const vehicle = Vehicles.find(sale.vehicleId);
  const stageFlow = ['quote', 'reservation', 'contract', 'delivery'];
  const currentIndex = stageFlow.indexOf(currentStage);

  if (currentIndex >= 0 && currentIndex < stageFlow.length - 1) {
    const nextStage = stageFlow[currentIndex + 1];
    sale.stage = nextStage;
    sale.updatedAt = now();

    if (!sale.history) sale.history = [];
    sale.history.push({
      date: now(),
      stage: nextStage,
      by: 'Sistema',
      note: `Avanzado a ${nextStage}`
    });

    if (nextStage === 'reservation' && vehicle) {
      vehicle.commercialStatus = 'reserved';
      Vehicles.save(vehicle);
    } else if (nextStage === 'contract') {
      if (vehicle) {
        vehicle.commercialStatus = 'reserved';
        Vehicles.save(vehicle);
      }
      // R2: Trigger automated financing plan generation ONLY when advancing to 'contract' or 'delivery'
      syncFinancingForSale(sale);
    } else if (nextStage === 'delivery') {
      if (vehicle) {
        vehicle.commercialStatus = 'sold';
        Vehicles.save(vehicle);
      }
      sale.deliveryStatus = 'delivered';

      // R2: Ensure financing plan is generated if fast-tracked directly to delivery
      syncFinancingForSale(sale);

      CashBox.save({
        id: generateId(),
        date: now(),
        type: 'income',
        category: 'sale',
        amount: sale.totalPrice,
        currency: sale.currency,
        description: `Venta ${sale.saleNumber} - Vehículo ${vehicle?.brand || ''} ${vehicle?.model || ''}`,
        referenceId: sale.id
      });
    }

    Sales.save(sale);
    return { sale, nextStage };
  }

  return null;
}

/**
 * Helper to ensure a financing plan exists for financed sales without duplicates
 */
export function syncFinancingForSale(sale) {
  if (!sale) return null;
  const isFinanced = sale.paymentType === 'financed_own' || 
                     sale.paymentType === 'financed_bank' || 
                     sale.paymentType === 'financed' ||
                     sale.paymentType === 'Financiado';
  if (!isFinanced) return null;

  // Deduplication check: Do not re-create if a plan already exists for this sale
  const existingPlan = Financing.bySale(sale.id);
  if (existingPlan) return existingPlan;

  // Calculate trade-in total
  const tradeInTotal = (sale.tradeIns || []).reduce((sum, ti) => sum + Number(ti.appraisalValue || 0), 0);
  const downPayment = Number(sale.downPayment || 0);
  const financedAmount = Math.max(0, Number(sale.totalPrice || 0) - downPayment - tradeInTotal);

  if (financedAmount <= 0) return null;

  const months = parseInt(sale.financing?.months) || 12;
  const rate = sale.financing?.monthlyRate !== undefined ? sale.financing.monthlyRate : 0.015;
  const currency = sale.currency || 'PYG';

  return generateFinancingPlan(sale.id, financedAmount, months, rate, currency);
}

export function createSaleQuote(saleData) {
  const currentYear = new Date().getFullYear();
  const count = Sales.all().length + 1;
  const saleNumber = `VT-${currentYear}-${count.toString().padStart(4, '0')}`;

  const finMonths = parseInt(saleData.finMonths || saleData.financing?.months) || 12;
  const finRateRaw = parseFloat(saleData.finRate !== undefined ? saleData.finRate : (saleData.financing?.monthlyRate !== undefined ? saleData.financing.monthlyRate : 1.5));
  const finRate = finRateRaw >= 1 ? finRateRaw / 100 : finRateRaw;

  const newSale = {
    id: generateId(),
    saleNumber,
    vehicleId: saleData.vehicleId,
    clientId: saleData.clientId,
    sellerId: saleData.sellerId,
    stage: 'quote',
    paymentType: saleData.paymentType || 'cash',
    totalPrice: Number(saleData.totalPrice || 0),
    downPayment: Number(saleData.downPayment || 0),
    advanceAmount: 0,
    currency: saleData.currency || 'PYG',
    notes: saleData.notes || '',
    tradeInVehicleId: null,
    tradeIns: saleData.tradeIns || [],
    financing: {
      months: finMonths,
      monthlyRate: finRate,
      bankName: saleData.finBankName || saleData.financing?.bankName || '',
      insurance: Number(saleData.finInsurance || saleData.financing?.insurance || 0),
      adminFee: Number(saleData.finAdminFee || saleData.financing?.adminFee || 0),
      installmentAmount: Number(saleData.finInstallment || saleData.financing?.installmentAmount || 0)
    },
    contractGenerated: false,
    deliveryStatus: 'pending',
    createdAt: now(),
    updatedAt: now(),
    history: [{
      date: now(),
      stage: 'quote',
      by: 'Usuario Actual',
      note: 'Cotización creada'
    }]
  };

  return Sales.save(newSale);
}

export const LOST_REASONS = {
  price:        'Precio no competitivo',
  financing:    'Financiación no aprobada',
  competitor:   'Compró en otro lado',
  no_response:  'No respondió',
  changed_mind: 'Se arrepintió',
  other:        'Otro motivo'
};

export function markSaleAsLost(saleId, reason, note = '') {
  const sale = Sales.find(saleId);
  if (!sale || sale.stage === 'delivery') return null;

  sale.lost = true;
  sale.lostReason = reason;
  sale.lostNote = note;
  sale.lostAt = now();
  sale.updatedAt = now();
  sale.history = sale.history || [];
  sale.history.push({
    date: now(),
    stage: sale.stage,
    by: 'Usuario',
    note: `Venta marcada como perdida — Motivo: ${LOST_REASONS[reason] || reason}${note ? '. ' + note : ''}`
  });

  // Liberar vehículo si estaba reservado
  const vehicle = Vehicles.find(sale.vehicleId);
  if (vehicle && vehicle.commercialStatus !== 'sold') {
    vehicle.commercialStatus = 'available';
    Vehicles.save(vehicle);
  }

  return Sales.save(sale);
}

export function reactivateSale(saleId) {
  const sale = Sales.find(saleId);
  if (!sale) return null;

  sale.lost = false;
  sale.lostReason = null;
  sale.lostNote = null;
  sale.lostAt = null;
  sale.updatedAt = now();
  sale.history = sale.history || [];
  sale.history.push({
    date: now(),
    stage: sale.stage,
    by: 'Usuario',
    note: 'Venta reactivada al pipeline'
  });

  return Sales.save(sale);
}

export function getLostSalesReport() {
  const lost = Sales.all().filter(s => s.lost);
  const byStage = { quote: 0, reservation: 0, contract: 0 };
  const byReason = {};

  lost.forEach(s => {
    if (byStage[s.stage] !== undefined) byStage[s.stage]++;
    const r = s.lostReason || 'other';
    byReason[r] = (byReason[r] || 0) + 1;
  });

  return { total: lost.length, byStage, byReason };
}

export function registerTradeIn(saleId, tradeInData) {
  const sale = Sales.find(saleId);
  if (!sale) return null;

  // tradeInData: { brand, model, year, color, mileage, condition, appraisalValue }
  sale.tradeIns = sale.tradeIns || [];
  const entry = { ...tradeInData, id: generateId(), registeredAt: now() };
  sale.tradeIns.push(entry);
  sale.updatedAt = now();
  sale.history = sale.history || [];
  sale.history.push({
    date: now(),
    stage: sale.stage,
    by: 'Usuario',
    note: `Parte de pago registrado: ${tradeInData.brand} ${tradeInData.model} (${tradeInData.year}) — Tasación: ${tradeInData.appraisalValue}`
  });

  return Sales.save(sale);
}

export function calculateEstimatedProfit(vehicleId, salePrice, tradeInTotal = 0) {
  const v = Vehicles.find(vehicleId);
  if (!v) return { cost: 0, profit: 0, margin: 0 };
  
  // En base a la moneda del sistema (global)
  // Como simplificamos el sistema, asumimos que todos los montos ya están en la misma moneda base (PYG)
  const totalCost = (v.purchaseCost || 0) + (v.importCosts || 0) + (v.prepCost || 0) + (v.commission || 0);
  
  const totalIncome = parseFloat(salePrice) + parseFloat(tradeInTotal);
  const profit = totalIncome - totalCost;
  const margin = totalCost > 0 ? (profit / totalCost) * 100 : 100;
  
  return {
    cost: totalCost,
    profit,
    margin
  };
}

export function suggestDeposit(salePrice, estimatedProfit) {
  const price = Number(salePrice || 0);
  const profit = Number(estimatedProfit || 0);
  
  // Paraguay typical deposit: no strict rule. We suggest 20% or the profit margin, whichever is higher
  const standardDeposit = price * 0.20; 
  let suggested = standardDeposit;

  if (profit > standardDeposit) {
    suggested = profit; 
  }

  // Cap at 30% if we don't want it to be too high, or leave it as is.
  // Let's cap the suggestion at 30% to be reasonable.
  if (suggested > price * 0.30) {
    suggested = price * 0.30;
  }

  return Math.ceil(suggested);
}

export function registerPayment(saleId, amount, type = 'deposit', method = 'cash', notes = '') {
  const sale = Sales.find(saleId);
  if (!sale) return null;

  const paymentId = generateId();
  const payment = {
    id: paymentId,
    saleId,
    saleNumber: sale.saleNumber,
    clientId: sale.clientId,
    type,
    amount: Number(amount),
    currency: sale.currency,
    method,
    notes,
    registeredBy: 'Usuario Actual',
    date: now(),
    createdAt: now()
  };

  Payments.save(payment);

  // Add to cashbox if cash or transfer
  if (method === 'cash' || method === 'transfer') {
    CashBox.save({
      id: generateId(),
      date: now(),
      type: 'income',
      category: type === 'deposit' ? 'reservation' : 'sale',
      amount: Number(amount),
      currency: sale.currency,
      description: `Pago ${type === 'deposit' ? 'Seña' : 'Cuota/Saldo'} Venta ${sale.saleNumber}`,
      referenceId: paymentId
    });
  }

  // Update sale history
  sale.history = sale.history || [];
  sale.history.push({
    date: now(),
    stage: sale.stage,
    by: 'Usuario',
    note: `Pago registrado: ${type === 'deposit' ? 'Seña' : 'Cuota/Saldo'} - Monto: ${amount} ${sale.currency}`
  });
  Sales.save(sale);

  return payment;
}
