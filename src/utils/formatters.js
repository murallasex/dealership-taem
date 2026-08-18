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

export function fmt(amount) {
  // Always respect the global active currency for display
  const cur = getActiveCurrency();
  const rawNum = Number(amount);
  let num = (!isNaN(rawNum) && isFinite(rawNum)) ? rawNum : 0;
  
  // Get global exchange rate
  let exchangeRate = 7500;
  try {
    const raw = localStorage.getItem('erp_config');
    if (raw) {
      const cfg = JSON.parse(raw);
      if (cfg && cfg.globalExchangeRate) exchangeRate = Number(cfg.globalExchangeRate);
    }
  } catch (err) {}
  
  // Base data is stored in PYG
  if (cur === 'USD') {
    num = num / exchangeRate;
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(num);
  }
  
  // PYG - Guaraníes
  return '₲ ' + new Intl.NumberFormat('es-PY', { minimumFractionDigits: 0 }).format(num);
}

export function formatCurrency(amount) {
  return fmt(amount);
}

export function fmtDate(isoStr) {
  if (!isoStr) return '—';
  try {
    return new Intl.DateTimeFormat('es-PY', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(isoStr));
  } catch (e) {
    return '—';
  }
}

export function getGlobalExchangeRate() {
  let exchangeRate = 7500;
  try {
    const raw = localStorage.getItem('erp_config');
    if (raw) {
      const cfg = JSON.parse(raw);
      if (cfg && cfg.globalExchangeRate) exchangeRate = Number(cfg.globalExchangeRate);
    }
  } catch (err) {}
  return exchangeRate;
}

export function parseInputAmount(val) {
  const num = parseFloat(String(val).replace(/\D/g, '')) || 0;
  if (getActiveCurrency() === 'USD') {
    return num * getGlobalExchangeRate();
  }
  return num;
}

export function formatInputValue(rawAmountFromDB) {
  let num = Number(rawAmountFromDB) || 0;
  if (getActiveCurrency() === 'USD') {
    num = Math.round(num / getGlobalExchangeRate());
  }
  return num.toLocaleString('es-PY');
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
