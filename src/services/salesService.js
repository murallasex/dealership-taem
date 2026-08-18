// =====================================================
// AutoERP — Sales Pure Domain Service
// =====================================================

import { Sales, Vehicles, Clients, Sellers, CashBox, generateId, now } from '../core/store.js';

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
    } else if (nextStage === 'contract' && vehicle) {
      vehicle.commercialStatus = 'reserved';
      Vehicles.save(vehicle);
    } else if (nextStage === 'delivery') {
      if (vehicle) {
        vehicle.commercialStatus = 'sold';
        Vehicles.save(vehicle);
      }
      sale.deliveryStatus = 'delivered';

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

export function createSaleQuote(saleData) {
  const currentYear = new Date().getFullYear();
  const count = Sales.all().length + 1;
  const saleNumber = `VT-${currentYear}-${count.toString().padStart(4, '0')}`;

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
