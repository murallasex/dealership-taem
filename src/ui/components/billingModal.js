// =====================================================
// AutoERP — Billing Modal & Print Component
// =====================================================

import { openModal, closeModal } from './modal.js';
import { fmt, fmtDate } from '../../utils/formatters.js';
import { Clients, Vehicles, Config, Invoices } from '../../core/store.js';

/**
 * Shows a modal to choose the print format after a payment.
 * @param {Object} invoice The generated invoice object
 */
export function openBillingPrintModal(invoice) {
  const html = `
    <div style="text-align: center; padding: 2rem 0;">
      <i data-lucide="check-circle" style="width: 64px; height: 64px; color: var(--success); margin-bottom: 1rem;"></i>
      <h2 style="margin-bottom: 0.5rem;">Pago Registrado</h2>
      <p class="text-muted" style="margin-bottom: 2rem;">¿Qué formato de comprobante deseas generar?</p>
      
      <div style="display: flex; gap: 1rem; justify-content: center;">
        <button id="btn-print-ticket" class="btn btn-secondary" style="flex-direction: column; padding: 1.5rem; height: auto; gap: 0.5rem; width: 140px;">
          <i data-lucide="receipt" style="width: 32px; height: 32px;"></i>
          <span>Ticket (80mm)</span>
        </button>
        <button id="btn-print-kude" class="btn btn-primary" style="flex-direction: column; padding: 1.5rem; height: auto; gap: 0.5rem; width: 140px;">
          <i data-lucide="file-text" style="width: 32px; height: 32px;"></i>
          <span>Factura (A4)</span>
        </button>
      </div>
      <div style="margin-top: 1.5rem;">
        <button class="btn btn-ghost" onclick="window._closeModal()">Cerrar</button>
      </div>
    </div>
  `;

  openModal('Comprobante', html);

  setTimeout(() => {
    document.getElementById('btn-print-ticket')?.addEventListener('click', () => {
      printInvoice(invoice, 'ticket');
    });
    document.getElementById('btn-print-kude')?.addEventListener('click', () => {
      printInvoice(invoice, 'kude');
    });
  }, 100);
}

/**
 * Renders the invoice HTML into the body, calls window.print(), then removes it.
 */
function printInvoice(invoice, format) {
  const cfg = Config.get();
  const companyName = cfg.companyName || 'AutoERP Dealership';
  const companyRuc = cfg.companyRuc || '80000001-1';
  const companyAddress = cfg.companyAddress || 'Asunción, Paraguay';

  const client = Clients.find(invoice.clientId) || { name: 'Consumidor Final', document: 'XXX' };
  const vehicle = Vehicles.find(invoice.vehicleId);
  const vName = vehicle ? `${vehicle.brand} ${vehicle.model} ${vehicle.version}` : 'Vehículo / Servicio';

  let printHtml = '';

  if (format === 'ticket') {
    printHtml = `
      <div class="print-area print-ticket" id="print-container">
        <div style="text-align: center; margin-bottom: 10px; border-bottom: 1px dashed #000; padding-bottom: 10px;">
          <h2 style="margin: 0; font-size: 16px;">${companyName}</h2>
          <div style="font-size: 11px;">RUC: ${companyRuc}</div>
          <div style="font-size: 11px;">${companyAddress}</div>
          <div style="font-size: 11px; margin-top: 5px;">Timbrado: ${invoice.timbrado || 'N/A'}</div>
          <div style="font-size: 11px;">Nro: ${invoice.numeroFactura || invoice.id}</div>
        </div>
        
        <div style="margin-bottom: 10px; font-size: 11px;">
          <div>Fecha: ${new Date(invoice.date).toLocaleString()}</div>
          <div>Cliente: ${client.name}</div>
          <div>RUC/CI: ${client.document}</div>
        </div>
        
        <table style="width: 100%; font-size: 11px; margin-bottom: 10px; border-collapse: collapse;">
          <tr style="border-bottom: 1px dashed #000;">
            <th style="text-align: left; padding-bottom: 3px;">Cant</th>
            <th style="text-align: left; padding-bottom: 3px;">Desc</th>
            <th style="text-align: right; padding-bottom: 3px;">Total</th>
          </tr>
          <tr>
            <td style="padding-top: 3px;">1</td>
            <td style="padding-top: 3px;">${vName}</td>
            <td style="text-align: right; padding-top: 3px;">${fmt(invoice.amount)}</td>
          </tr>
        </table>
        
        <div style="text-align: right; font-weight: bold; font-size: 14px; margin-bottom: 10px; border-bottom: 1px dashed #000; padding-bottom: 10px;">
          TOTAL: ${fmt(invoice.amount)}
        </div>
        
        ${invoice.type === 'factura' ? `
        <div style="font-size: 10px; text-align: center; margin-bottom: 10px;">
          <div>CDC:</div>
          <div style="word-break: break-all;">${invoice.cdc}</div>
        </div>
        ` : ''}
        
        <div style="text-align: center; font-size: 11px;">
          ¡Gracias por su preferencia!
        </div>
      </div>
    `;
  } else {
    // KUDE A4
    printHtml = `
      <div class="print-area print-a4" id="print-container">
        <div style="display: flex; justify-content: space-between; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 20px;">
          <div style="width: 45%;">
            <h1 style="margin: 0; font-size: 24px;">${companyName}</h1>
            <div style="margin-top: 5px;">RUC: ${companyRuc}</div>
            <div>${companyAddress}</div>
          </div>
          <div style="width: 45%; text-align: right;">
            <div style="font-weight: bold; font-size: 18px;">KuDE - Factura Electrónica</div>
            <div>Nro: ${invoice.numeroFactura || invoice.id}</div>
            <div>Timbrado: ${invoice.timbrado || 'N/A'}</div>
            <div>Fecha: ${new Date(invoice.date).toLocaleString()}</div>
          </div>
        </div>

        <div style="margin-bottom: 30px; border: 1px solid #000; padding: 10px; border-radius: 4px;">
          <div style="font-weight: bold; margin-bottom: 5px;">Datos del Receptor:</div>
          <div>Nombre/Razón Social: ${client.name}</div>
          <div>RUC/CI: ${client.document}</div>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
          <thead>
            <tr style="background: #f0f0f0;">
              <th style="border: 1px solid #000; padding: 8px; text-align: left;">Descripción</th>
              <th style="border: 1px solid #000; padding: 8px; text-align: right;">Cantidad</th>
              <th style="border: 1px solid #000; padding: 8px; text-align: right;">Precio Unitario</th>
              <th style="border: 1px solid #000; padding: 8px; text-align: right;">Exentas</th>
              <th style="border: 1px solid #000; padding: 8px; text-align: right;">5%</th>
              <th style="border: 1px solid #000; padding: 8px; text-align: right;">10%</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="border: 1px solid #000; padding: 8px;">${vName}</td>
              <td style="border: 1px solid #000; padding: 8px; text-align: right;">1</td>
              <td style="border: 1px solid #000; padding: 8px; text-align: right;">${fmt(invoice.amount)}</td>
              <td style="border: 1px solid #000; padding: 8px; text-align: right;">${fmt(invoice.taxes?.subtotalExento || 0)}</td>
              <td style="border: 1px solid #000; padding: 8px; text-align: right;">${fmt(invoice.taxes?.subtotal5 || 0)}</td>
              <td style="border: 1px solid #000; padding: 8px; text-align: right;">${fmt(invoice.taxes?.subtotal10 || invoice.amount)}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <th colspan="3" style="border: 1px solid #000; padding: 8px; text-align: right;">SUBTOTALES</th>
              <th style="border: 1px solid #000; padding: 8px; text-align: right;">${fmt(invoice.taxes?.subtotalExento || 0)}</th>
              <th style="border: 1px solid #000; padding: 8px; text-align: right;">${fmt(invoice.taxes?.subtotal5 || 0)}</th>
              <th style="border: 1px solid #000; padding: 8px; text-align: right;">${fmt(invoice.taxes?.subtotal10 || invoice.amount)}</th>
            </tr>
            <tr>
              <th colspan="5" style="border: 1px solid #000; padding: 8px; text-align: right;">TOTAL A PAGAR</th>
              <th style="border: 1px solid #000; padding: 8px; text-align: right; font-size: 16px;">${fmt(invoice.amount)}</th>
            </tr>
          </tfoot>
        </table>

        <div style="border: 1px solid #000; padding: 10px; border-radius: 4px; margin-bottom: 20px;">
          <div style="font-weight: bold; margin-bottom: 5px;">Liquidación del IVA:</div>
          <div style="display: flex; gap: 20px;">
            <div>(5%): ${fmt(invoice.taxes?.iva5 || 0)}</div>
            <div>(10%): ${fmt(invoice.taxes?.iva10 || 0)}</div>
            <div>Total IVA: ${fmt(invoice.taxes?.totalIva || 0)}</div>
          </div>
        </div>

        <div style="display: flex; align-items: center; justify-content: space-between; border: 1px solid #000; padding: 15px; border-radius: 4px;">
          <div style="width: 75%;">
            <div style="font-weight: bold; margin-bottom: 5px;">CDC:</div>
            <div style="font-family: monospace; font-size: 14px; letter-spacing: 2px;">${invoice.cdc}</div>
            <div style="margin-top: 10px; font-size: 10px; color: #555;">
              Consulte la validez de esta Factura Electrónica con el número de CDC impreso abajo en:
              https://ekuatia.set.gov.py/consultas/
            </div>
          </div>
          <div style="width: 100px; height: 100px; border: 1px solid #ccc; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #999;">
            [QR Code]
          </div>
        </div>
      </div>
    `;
  }

  // Inject to DOM
  document.body.classList.add('printing-invoice');
  const printDiv = document.createElement('div');
  printDiv.innerHTML = printHtml;
  document.body.appendChild(printDiv);

  // Print
  setTimeout(() => {
    window.print();
    // Cleanup
    document.body.classList.remove('printing-invoice');
    document.body.removeChild(printDiv);
    closeModal();
  });
}
