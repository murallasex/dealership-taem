// =====================================================
// AutoERP — Formatters Utility Module
// =====================================================

let activeCurrency = 'PYG';

export function getActiveCurrency() {
  try {
    const raw = localStorage.getItem('erp_config');
    if (raw) {
      const cfg = JSON.parse(raw);
      if (cfg && cfg.currency) return cfg.currency;
    }
  } catch (err) {}
  return activeCurrency;
}

export function setActiveCurrency(currency) {
  activeCurrency = currency;
  try {
    const raw = localStorage.getItem('erp_config');
    const cfg = raw ? JSON.parse(raw) : {};
    cfg.currency = currency;
    localStorage.setItem('erp_config', JSON.stringify(cfg));
  } catch (err) {}
}

export function fmt(amount, currency = null) {
  // Always respect the global active currency for display
  const cur = getActiveCurrency();
  const rawNum = Number(amount);
  let num = (!isNaN(rawNum) && isFinite(rawNum)) ? rawNum : 0;
  
  // Basic mock exchange rate for demo purposes
  // Assuming base data is stored in PYG
  if (cur === 'USD' && currency !== 'USD') {
    num = num / 7500;
  } else if (cur === 'PYG' && currency === 'USD') {
    num = num * 7500;
  }

  if (cur === 'USD') {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(num);
  }
  // PYG - Guaraníes
  return '₲ ' + new Intl.NumberFormat('es-PY', { minimumFractionDigits: 0 }).format(num);
}

export function formatCurrency(amount, currency = null) {
  return fmt(amount, currency);
}

export function fmtDate(isoStr) {
  if (!isoStr) return '—';
  try {
    return new Intl.DateTimeFormat('es-PY', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(isoStr));
  } catch (e) {
    return '—';
  }
}

export function formatDate(isoStr) {
  return fmtDate(isoStr);
}

export function formatDatetime(isoStr) {
  if (!isoStr) return '—';
  try {
    return new Intl.DateTimeFormat('es-PY', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(isoStr));
  } catch (e) {
    return '—';
  }
}

export function daysAgo(isoStr) {
  if (!isoStr) return 0;
  const diff = Date.now() - new Date(isoStr).getTime();
  return Math.floor(diff / 86400000);
}

export function addDays(isoStr, days) {
  const d = new Date(isoStr);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

export function fmtPercent(value) {
  const val = Number(value) || 0;
  return `${val.toFixed(1)}%`;
}
