// =====================================================
// AutoERP — Sales Pure Domain Service
// =====================================================

import { Sales, Vehicles, Clients, Sellers, CashBox, generateId, now } from '../core/store.js';

export function getSalesKPIs() {
  const allSales = Sales.all();
  const totalSales = allSales.length;
  const deliveredSales = allSales.filter(s => s.stage === 'delivery');
  const inProcessSales = allSales.filter(s => s.stage !== 'delivery');

  const totalAmountSold = deliveredSales.reduce((sum, s) => {
    return sum + Number(s.totalPrice || 0);
  }, 0);

  return {
    totalSales,
    deliveredSalesCount: deliveredSales.length,
    inProcessSalesCount: inProcessSales.length,
    totalAmountSold,
  };
}

export function getSalesByStage() {
  const all = Sales.all();
  return {
    quote: { title: 'Cotización', color: 'info', items: all.filter(s => s.stage === 'quote') },
    reservation: { title: 'Reserva', color: 'warning', items: all.filter(s => s.stage === 'reservation') },
    contract: { title: 'Contrato', color: 'gold', items: all.filter(s => s.stage === 'contract') },
    delivery: { title: 'Entrega', color: 'success', items: all.filter(s => s.stage === 'delivery') }
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
