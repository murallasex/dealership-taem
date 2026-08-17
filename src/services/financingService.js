// =====================================================
// AutoERP — Financing Pure Domain Service
// =====================================================

import { Financing, Sales, CashBox, generateId, now } from '../core/store.js';

export function generateFinancingPlan(saleId, financedAmount, installmentsCount, monthlyRate, currency) {
  const sale = Sales.find(saleId);
  if (!sale) return null;

  let r = monthlyRate;
  let n = installmentsCount;
  let P = financedAmount;
  let installmentAmount = P;

  if (r > 0) {
    installmentAmount = P * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  } else {
    installmentAmount = P / n;
  }

  const plan = {
    id: generateId(),
    saleId,
    clientId: sale.clientId,
    vehicleId: sale.vehicleId,
    totalAmount: sale.totalPrice || sale.totalAmount || 0,
    downPayment: (sale.totalPrice || sale.totalAmount || 0) - P,
    financedAmount: P,
    installments: n,
    monthlyRate: r,
    installmentAmount,
    currency,
    payments: [],
    createdAt: now()
  };

  let currentDate = new Date(now());
  for (let i = 1; i <= n; i++) {
    currentDate = new Date(currentDate.getTime());
    currentDate.setMonth(currentDate.getMonth() + 1);
    plan.payments.push({
      id: generateId(),
      number: i,
      dueDate: currentDate.toISOString(),
      amount: installmentAmount,
      status: 'pending',
      paidAt: null
    });
  }

  Financing.save(plan);
  return plan;
}

export function getFinancingKPIs() {
  const allPlans = Financing.all();
  const totalPlans = allPlans.length;
  const totalFinanced = allPlans.reduce((sum, p) => sum + (p.financedAmount || 0), 0);

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  let paidThisMonth = 0;
  let overdueCount = 0;

  allPlans.forEach(plan => {
    (plan.payments || []).forEach(pay => {
      if (pay.status === 'paid') {
        const pDate = new Date(pay.paidAt);
        if (pDate.getMonth() === currentMonth && pDate.getFullYear() === currentYear) {
          paidThisMonth++;
        }
      } else if (pay.status === 'overdue' || (pay.status === 'pending' && new Date(pay.dueDate) < new Date())) {
        overdueCount++;
        if (pay.status === 'pending') pay.status = 'overdue';
      }
    });
  });

  return {
    totalPlans,
    totalFinanced,
    paidThisMonth,
    overdueCount,
  };
}

export function recordInstallmentPayment(planId, paymentId) {
  const plan = Financing.find(planId);
  if (!plan) return false;
  const payment = (plan.payments || []).find(p => p.id === paymentId);
  if (!payment) return false;

  payment.status = 'paid';
  payment.paidAt = now();
  Financing.save(plan);

  CashBox.save({
    id: generateId(),
    date: now(),
    type: 'income',
    category: 'installment',
    amount: payment.amount,
    currency: plan.currency,
    description: `Pago cuota ${payment.number}/${plan.installments} - Plan ${plan.id}`,
    referenceId: plan.id
  });

  return true;
}
