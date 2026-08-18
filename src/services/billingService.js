// =====================================================
// AutoERP — Billing Service (Facturación / SIFEN)
// =====================================================

import { generateId, Invoices, now } from '../core/store.js';

/**
 * Calcula el desglose de IVA según el régimen paraguayo.
 * - Vehículos Nuevos: IVA 10% sobre el 100% del valor.
 * - Vehículos Usados: IVA 10% sobre el 30% del valor (Regímenes Especiales). El 70% restante es Exento.
 *
 * @param {number} totalAmount Monto total cobrado.
 * @param {string} condition Condición del vehículo ('new', 'used').
 */
export function calculateInvoiceTaxes(totalAmount, condition = 'new') {
  if (condition === 'used') {
    // 30% gravado al 10%, 70% exento
    const gravado = totalAmount * 0.3;
    const exento = totalAmount * 0.7;
    // IVA es el 10% del monto gravado -> es decir, gravado / 11.
    const iva10 = Math.round(gravado / 11);
    const subtotalGravado = gravado - iva10;
    
    return {
      subtotalExento: exento,
      subtotal5: 0,
      subtotal10: subtotalGravado,
      iva5: 0,
      iva10: iva10,
      totalIva: iva10,
      total: totalAmount
    };
  } else {
    // Vehículo nuevo (100% gravado al 10%)
    const iva10 = Math.round(totalAmount / 11);
    const subtotalGravado = totalAmount - iva10;

    return {
      subtotalExento: 0,
      subtotal5: 0,
      subtotal10: subtotalGravado,
      iva5: 0,
      iva10: iva10,
      totalIva: iva10,
      total: totalAmount
    };
  }
}

/**
 * Genera un Código de Control (CDC) simulado de 44 dígitos
 * y un número de Timbrado de 8 dígitos.
 */
export function generateParaguayanDTE() {
  let cdc = '';
  for (let i = 0; i < 44; i++) {
    cdc += Math.floor(Math.random() * 10).toString();
  }

  let timbrado = '16'; 
  for (let i = 0; i < 6; i++) {
    timbrado += Math.floor(Math.random() * 10).toString();
  }

  const lastInvoice = Invoices.all().length + 1;
  const numeroFactura = `001-001-${String(lastInvoice).padStart(7, '0')}`;

  return { cdc, timbrado, numeroFactura };
}

/**
 * Registra una factura o ticket en el sistema.
 */
export function createInvoice(paymentData) {
  const { saleId, clientId, vehicleId, amount, condition, type = 'factura' } = paymentData;

  const taxes = calculateInvoiceTaxes(amount, condition);
  const dte = generateParaguayanDTE();

  const invoice = {
    id: generateId(),
    saleId,
    clientId,
    vehicleId,
    type, // 'factura' o 'ticket'
    amount,
    taxes,
    cdc: type === 'factura' ? dte.cdc : null,
    timbrado: type === 'factura' ? dte.timbrado : null,
    numeroFactura: type === 'factura' ? dte.numeroFactura : null,
    date: now(),
  };

  return Invoices.save(invoice);
}
