// =====================================================
// AutoERP — Core AppState, Store & Reactive Pub/Sub
// =====================================================

import { getActiveCurrency, setActiveCurrency, fmt, formatCurrency, fmtDate, formatDate, formatDatetime, daysAgo, addDays, parseInputAmount, formatInputValue } from '../utils/formatters.js';

export { getActiveCurrency, setActiveCurrency, fmt, formatCurrency, fmtDate, formatDate, formatDatetime, daysAgo, addDays, parseInputAmount, formatInputValue };

// Global Application State
export const AppState = {
  currentUser: null,
  currency: 'PYG',
};

// Reactive Pub/Sub Event System
const listeners = new Map();

export function subscribe(event, callback) {
  if (!listeners.has(event)) {
    listeners.set(event, new Set());
  }
  listeners.get(event).add(callback);
  return () => unsubscribe(event, callback);
}

export function unsubscribe(event, callback) {
  if (listeners.has(event)) {
    listeners.get(event).delete(callback);
  }
}

export function notify(event, data) {
  if (listeners.has(event)) {
    listeners.get(event).forEach(cb => {
      try {
        cb(data);
      } catch (err) {
        console.error(`Error in event listener for ${event}:`, err);
      }
    });
  }
}

// Database Keys
export const DB_KEYS = {
  config: 'erp_config',
  users: 'erp_users',
  vehicles: 'erp_vehicles',
  clients: 'erp_clients',
  sales: 'erp_sales',
  financing: 'erp_financing',
  sellers: 'erp_sellers',
  goals: 'erp_goals',
  cashbox: 'erp_cashbox',
  notifications: 'erp_notifications',
  emailTemplates: 'erp_email_templates',
  emailLog: 'erp_email_log',
  leads: 'erp_leads',
  events: 'erp_events',
  expenses: 'erp_expenses',
  invoices: 'erp_invoices',
  payments: 'erp_payments',
};

// =====================================================
// Core Storage CRUD Helpers
// =====================================================
export function dbGet(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function dbSet(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
  notify(`change:${key}`, value);
  notify('change', { key, value });
}

export function dbGetAll(key) {
  return dbGet(key) || [];
}

export function dbSave(key, item) {
  const all = dbGetAll(key);
  if (!item.id) {
    item.id = generateId();
  }
  const idx = all.findIndex(x => x.id === item.id);
  if (idx >= 0) all[idx] = item;
  else all.push(item);
  dbSet(key, all);
  return item;
}

export function dbDelete(key, id) {
  const all = dbGetAll(key).filter(x => x.id !== id);
  dbSet(key, all);
}

export function dbFind(key, id) {
  return dbGetAll(key).find(x => x.id === id) || null;
}

export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
}

export function now() {
  return new Date().toISOString();
}

// =====================================================
// Specific Model Store Accessors
// =====================================================
export const Vehicles = {
  all: () => dbGetAll(DB_KEYS.vehicles),
  find: (id) => dbFind(DB_KEYS.vehicles, id),
  getById: (id) => dbFind(DB_KEYS.vehicles, id),
  save: (v) => dbSave(DB_KEYS.vehicles, v),
  delete: (id) => dbDelete(DB_KEYS.vehicles, id),
  available: () => dbGetAll(DB_KEYS.vehicles).filter(v => v.commercialStatus === 'available'),
};

export const Clients = {
  all: () => dbGetAll(DB_KEYS.clients),
  find: (id) => dbFind(DB_KEYS.clients, id),
  getById: (id) => dbFind(DB_KEYS.clients, id),
  save: (c) => dbSave(DB_KEYS.clients, c),
  delete: (id) => dbDelete(DB_KEYS.clients, id),
};

export const Sales = {
  all: () => dbGetAll(DB_KEYS.sales),
  find: (id) => dbFind(DB_KEYS.sales, id),
  getById: (id) => dbFind(DB_KEYS.sales, id),
  save: (s) => dbSave(DB_KEYS.sales, s),
  delete: (id) => dbDelete(DB_KEYS.sales, id),
};

export const Financing = {
  all: () => dbGetAll(DB_KEYS.financing),
  find: (id) => dbFind(DB_KEYS.financing, id),
  getById: (id) => dbFind(DB_KEYS.financing, id),
  save: (f) => dbSave(DB_KEYS.financing, f),
  bySale: (saleId) => dbGetAll(DB_KEYS.financing).find(f => f.saleId === saleId),
};

export const Sellers = {
  all: () => dbGetAll(DB_KEYS.sellers),
  find: (id) => dbFind(DB_KEYS.sellers, id),
  getById: (id) => dbFind(DB_KEYS.sellers, id),
  save: (s) => dbSave(DB_KEYS.sellers, s),
  delete: (id) => dbDelete(DB_KEYS.sellers, id),
};

export const Goals = {
  all: () => dbGetAll(DB_KEYS.goals),
  find: (id) => dbFind(DB_KEYS.goals, id),
  getById: (id) => dbFind(DB_KEYS.goals, id),
  save: (g) => dbSave(DB_KEYS.goals, g),
  bySeller: (sellerId) => dbGetAll(DB_KEYS.goals).filter(g => g.sellerId === sellerId),
};

export const CashBox = {
  all: () => dbGetAll(DB_KEYS.cashbox),
  save: (entry) => dbSave(DB_KEYS.cashbox, entry),
  today: () => {
    const todayStr = new Date().toDateString();
    return dbGetAll(DB_KEYS.cashbox).filter(e => new Date(e.date).toDateString() === todayStr);
  },
};

export const Notifications = {
  all: () => dbGetAll(DB_KEYS.notifications),
  unread: () => dbGetAll(DB_KEYS.notifications).filter(n => !n.read),
  save: (n) => dbSave(DB_KEYS.notifications, n),
  markRead: (id) => {
    const all = dbGetAll(DB_KEYS.notifications);
    const idx = all.findIndex(n => n.id === id);
    if (idx >= 0) {
      all[idx].read = true;
      dbSet(DB_KEYS.notifications, all);
    }
  },
  markAllRead: () => {
    const all = dbGetAll(DB_KEYS.notifications).map(n => ({ ...n, read: true }));
    dbSet(DB_KEYS.notifications, all);
  },
};

export const EmailTemplates = {
  all: () => dbGetAll(DB_KEYS.emailTemplates),
  find: (id) => dbFind(DB_KEYS.emailTemplates, id),
  getById: (id) => dbFind(DB_KEYS.emailTemplates, id),
  save: (t) => dbSave(DB_KEYS.emailTemplates, t),
};

export const EmailLog = {
  all: () => dbGetAll(DB_KEYS.emailLog),
  save: (entry) => dbSave(DB_KEYS.emailLog, entry),
};

export const Leads = {
  all: () => dbGetAll(DB_KEYS.leads),
  find: (id) => dbFind(DB_KEYS.leads, id),
  getById: (id) => dbFind(DB_KEYS.leads, id),
  save: (l) => dbSave(DB_KEYS.leads, l),
  delete: (id) => dbDelete(DB_KEYS.leads, id),
};

export const Users = {
  all: () => dbGetAll(DB_KEYS.users),
  find: (id) => dbFind(DB_KEYS.users, id),
  getById: (id) => dbFind(DB_KEYS.users, id),
  save: (u) => dbSave(DB_KEYS.users, u),
  delete: (id) => dbDelete(DB_KEYS.users, id),
  byEmail: (email) => dbGetAll(DB_KEYS.users).find(u => u.email === email),
};

export const Config = {
  get: () => dbGet(DB_KEYS.config) || {},
  set: (cfg) => dbSet(DB_KEYS.config, cfg),
  update: (patch) => {
    const cfg = dbGet(DB_KEYS.config) || {};
    dbSet(DB_KEYS.config, { ...cfg, ...patch });
  },
};

export const CalendarEvents = {
  all: () => dbGetAll(DB_KEYS.events),
  save: (e) => dbSave(DB_KEYS.events, e),
  delete: (id) => dbDelete(DB_KEYS.events, id),
};

export const Expenses = {
  all: () => dbGetAll(DB_KEYS.expenses),
  save: (e) => dbSave(DB_KEYS.expenses, e),
  delete: (id) => dbDelete(DB_KEYS.expenses, id),
};

export const Invoices = {
  all: () => dbGetAll(DB_KEYS.invoices),
  find: (id) => dbFind(DB_KEYS.invoices, id),
  save: (i) => dbSave(DB_KEYS.invoices, i),
};

export const Payments = {
  all: () => dbGetAll(DB_KEYS.payments),
  find: (id) => dbFind(DB_KEYS.payments, id),
  save: (p) => dbSave(DB_KEYS.payments, p),
  bySale: (saleId) => dbGetAll(DB_KEYS.payments).filter(p => p.saleId === saleId),
};

// =====================================================
// DEMO DATA SEEDER (UTF-8 Clean)
// =====================================================
export function seedDemoData() {
  if (dbGet('erp_seeded_v4')) return;

  // Config
  dbSet(DB_KEYS.config, {
    companyName: 'Automotores del Sur S.A.',
    branch: 'Casa Central — Asunción',
    ruc: '80012345-6',
    phone: '+595 21 555-1234',
    address: 'Avda. España 1250, Asunción, Paraguay',
    email: 'info@automotoresdelsur.com.py',
    currency: 'PYG',
    logoInitials: 'AS',
    dnitCredentials: 'DEMO_MODE',
  });

  // Users
  const usersData = [
    { id: 'u1', name: 'Carlos Méndez', email: 'admin@autoerp.com', password: 'admin123', role: 'admin', active: true, avatar: 'CM', createdAt: '2025-01-01T00:00:00Z' },
    { id: 'u2', name: 'María Fernández', email: 'maria@autoerp.com', password: '1234', role: 'seller', active: true, avatar: 'MF', sellerId: 's1', createdAt: '2025-01-15T00:00:00Z' },
    { id: 'u3', name: 'Roberto López', email: 'roberto@autoerp.com', password: '1234', role: 'seller', active: true, avatar: 'RL', sellerId: 's2', createdAt: '2025-02-01T00:00:00Z' },
    { id: 'u4', name: 'Andrea Torres', email: 'andrea@autoerp.com', password: '1234', role: 'admin', active: true, avatar: 'AT', createdAt: '2025-03-01T00:00:00Z' },
    { id: 'u5', name: 'Diego Sánchez', email: 'diego@autoerp.com', password: '1234', role: 'seller', active: true, avatar: 'DS', sellerId: 's3', createdAt: '2025-04-01T00:00:00Z' },
  ];
  dbSet(DB_KEYS.users, usersData);

  // Sellers
  const sellersData = [
    { id: 's1', name: 'María Fernández', userId: 'u2', phone: '+595 981 111-222', email: 'maria@autoerp.com', avatar: 'MF', color: '#c9a227', active: true, hireDate: '2025-01-15T00:00:00Z' },
    { id: 's2', name: 'Roberto López', userId: 'u3', phone: '+595 981 333-444', email: 'roberto@autoerp.com', avatar: 'RL', color: '#3b82f6', active: true, hireDate: '2025-02-01T00:00:00Z' },
    { id: 's3', name: 'Diego Sánchez', userId: 'u5', phone: '+595 981 555-666', email: 'diego@autoerp.com', avatar: 'DS', color: '#22c55e', active: true, hireDate: '2025-04-01T00:00:00Z' },
  ];
  dbSet(DB_KEYS.sellers, sellersData);

  // Goals
  const goalsData = [
    { id: 'g1', sellerId: 's1', period: '2026-08', type: 'units', target: 6, result: 4, status: 'active' },
    { id: 'g2', sellerId: 's2', period: '2026-08', type: 'units', target: 5, result: 3, status: 'active' },
    { id: 'g3', sellerId: 's3', period: '2026-08', type: 'units', target: 4, result: 2, status: 'active' },
    { id: 'g4', sellerId: 's1', period: '2026-07', type: 'units', target: 6, result: 7, status: 'completed' },
    { id: 'g5', sellerId: 's2', period: '2026-07', type: 'units', target: 5, result: 4, status: 'completed' },
    { id: 'g6', sellerId: 's3', period: '2026-07', type: 'units', target: 4, result: 5, status: 'completed' },
  ];
  dbSet(DB_KEYS.goals, goalsData);

  // Clients
  const clientsData = [
    { id: 'c1', name: 'Juan Carlos Pérez', email: 'jcperez@gmail.com', phone: '+595 981 222-333', document: '4.567.890', docType: 'CI', address: 'San Lorenzo, Paraguay', segment: 'active', interestedIn: 'Toyota', leadOrigin: 'referral', createdAt: '2026-01-10T00:00:00Z', notes: 'Cliente frecuente, compra cada 2 años.', birthDate: '1985-08-20' },
    { id: 'c2', name: 'Ana Lucía Rodríguez', email: 'ana.rodriguez@outlook.com', phone: '+595 981 444-555', document: '5.678.901', docType: 'CI', address: 'Asunción, Paraguay', segment: 'active', interestedIn: 'Honda', leadOrigin: 'web', createdAt: '2026-02-05T00:00:00Z', notes: '', birthDate: '1992-05-15' },
    { id: 'c3', name: 'Empresa Logística SA', email: 'compras@logisticasa.com.py', phone: '+595 21 666-777', document: '80098765-4', docType: 'RUC', address: 'Luque, Paraguay', segment: 'active', interestedIn: 'Toyota', leadOrigin: 'walkin', createdAt: '2026-03-01T00:00:00Z', notes: 'Compra flota corporativa.' },
    { id: 'c4', name: 'Miguel Ángel Ortiz', email: 'miguel.ortiz@yahoo.com', phone: '+595 981 777-888', document: '6.789.012', docType: 'CI', address: 'Fernando de la Mora, Paraguay', segment: 'prospect', interestedIn: 'Volkswagen', leadOrigin: 'social', createdAt: '2026-06-01T00:00:00Z', notes: 'Interesado en Amarok 0km.', birthDate: '1978-11-03' },
    { id: 'c5', name: 'Patricia González', email: 'patri.gonzalez@gmail.com', phone: '+595 981 999-000', document: '7.890.123', docType: 'CI', address: 'Capiatá, Paraguay', segment: 'prospect', interestedIn: 'Chevrolet', leadOrigin: 'referral', createdAt: '2026-07-10T00:00:00Z', notes: '', birthDate: '1995-02-28' },
    { id: 'c6', name: 'Fernando Villalba', email: 'fvillalba@empresa.com', phone: '+595 981 100-200', document: '3.456.789', docType: 'CI', address: 'Asunción, Paraguay', segment: 'active', interestedIn: 'Nissan', leadOrigin: 'walkin', createdAt: '2026-04-20T00:00:00Z', notes: '' },
    { id: 'c7', name: 'Constructora Itapúa SRL', email: 'admin@constructora-itapua.com', phone: '+595 71 222-333', document: '80055443-1', docType: 'RUC', address: 'Encarnación, Paraguay', segment: 'inactive', interestedIn: 'Toyota', leadOrigin: 'referral', createdAt: '2025-08-01T00:00:00Z', notes: 'Ex-cliente, no renueva desde 2025.' },
  ];
  dbSet(DB_KEYS.clients, clientsData);

  // Vehicles
  const vehiclesData = [];
  dbSet(DB_KEYS.vehicles, vehiclesData);

  // Sales
  const salesData = [];
  dbSet(DB_KEYS.sales, salesData);

  // Financing plans
  const financingData = [];
  dbSet(DB_KEYS.financing, financingData);

  // Leads
  const leadsData = [];
  dbSet(DB_KEYS.leads, leadsData);

  // Cash box entries
  const cashData = [];
  dbSet(DB_KEYS.cashbox, cashData);

  // Email Templates
  const templatesData = [
    {
      id: 'tpl1', name: 'Recordatorio de cuota próxima a vencer', type: 'installment_due',
      subject: 'Recordatorio: Su cuota vence en {{dias_restantes}} días',
      body: `Estimado/a {{nombre_cliente}},

Le recordamos que su cuota N° {{numero_cuota}} por el valor de {{monto_cuota}} vence el {{fecha_vencimiento}}.

Por favor, acérquese a nuestras oficinas o realice su pago online para evitar recargos por mora.

Ante cualquier consulta, no dude en contactarnos.

Atentamente,
El equipo de {{nombre_empresa}}
{{telefono_empresa}}`,
      active: true, createdAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'tpl2', name: 'Recordatorio de cuota vencida', type: 'installment_overdue',
      subject: 'Aviso: Cuota vencida - Su pago está pendiente',
      body: `Estimado/a {{nombre_cliente}},

Le informamos que su cuota N° {{numero_cuota}} por {{monto_cuota}} se encuentra vencida desde el {{fecha_vencimiento}}.

Le solicitamos regularizar su situación a la brevedad para evitar recargos adicionales.

Contáctenos al {{telefono_empresa}} para coordinar su pago.

Atentamente,
{{nombre_empresa}}`,
      active: true, createdAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'tpl3', name: 'Oferta especial para clientes activos', type: 'offer',
      subject: '¡Tenemos el vehículo que buscás, {{nombre_cliente}}!',
      body: `Estimado/a {{nombre_cliente}},

Sabemos que estás interesado/a en {{modelo_interes}}. Queremos contarte que tenemos nuevas unidades disponibles con condiciones especiales.

¡Visitanos y aprovechá esta oportunidad antes de que se agoten!

Horarios: Lunes a Sábados de 8:00 a 18:00 hs.

{{nombre_empresa}}
{{telefono_empresa}}
{{direccion_empresa}}`,
      active: true, createdAt: '2026-01-01T00:00:00Z',
    },
  ];
  dbSet(DB_KEYS.emailTemplates, templatesData);

  // Email Log
  const emailLogData = [
    { id: 'el1', templateId: 'tpl1', clientId: 'c2', clientName: 'Ana Lucía Rodríguez', email: 'ana.rodriguez@outlook.com', subject: 'Recordatorio: Su cuota vence en 5 días', status: 'sent', sentAt: '2026-08-02T08:00:00Z' },
    { id: 'el2', templateId: 'tpl2', clientId: 'c4', clientName: 'Miguel Ángel Ortiz', email: 'miguel.ortiz@yahoo.com', subject: 'Aviso: Cuota vencida - Su pago está pendiente', status: 'sent', sentAt: '2026-08-03T08:00:00Z' },
    { id: 'el3', templateId: 'tpl3', clientId: 'c5', clientName: 'Patricia González', email: 'patri.gonzalez@gmail.com', subject: '¡Tenemos el vehículo que buscás, Patricia!', status: 'sent', sentAt: '2026-08-04T09:00:00Z' },
    { id: 'el4', templateId: 'tpl1', clientId: 'c2', clientName: 'Ana Lucía Rodríguez', email: 'invalid-email-address', subject: 'Recordatorio cuota', status: 'failed', sentAt: '2026-08-05T08:00:00Z' },
  ];
  dbSet(DB_KEYS.emailLog, emailLogData);

  // Notifications
  const notifData = [
    { id: 'n1', type: 'installment_overdue', title: 'Cuota vencida', message: 'Miguel Ángel Ortiz tiene una cuota vencida desde hace 3 días.', read: false, createdAt: '2026-08-04T08:00:00Z', link: '#/financing' },
    { id: 'n2', type: 'sale_stage', title: 'Venta avanzó a Contrato', message: 'La venta VT-0014 de Empresa Logística SA fue movida a Contrato.', read: false, createdAt: '2026-08-02T14:00:00Z', link: '#/sales' },
    { id: 'n3', type: 'lead_new', title: 'Nuevo prospecto asignado', message: 'Gabriel Rojas fue asignado como nuevo lead para María Fernández.', read: false, createdAt: '2026-08-06T10:00:00Z', link: '#/crm' },
    { id: 'n4', type: 'installment_due', title: 'Cuota próxima a vencer', message: 'Ana Lucía Rodríguez tiene una cuota que vence en 5 días.', read: true, createdAt: '2026-08-02T08:00:00Z', link: '#/financing' },
  ];
  dbSet(DB_KEYS.notifications, notifData);

  // Events
  const eventsData = [
    { id: 'e1', title: 'Reunión de Ventas', date: '2026-08-15', recurrence: 'none', color: '#3b82f6', type: 'company' },
    { id: 'e2', title: 'Pago de Salarios', date: '2026-08-30', recurrence: 'monthly', color: '#ef4444', type: 'company' }
  ];
  dbSet(DB_KEYS.events, eventsData);

  // Expenses
  const expensesData = [
    { id: 'exp1', date: '2026-08-05', category: 'Servicios', amount: 1500000, description: 'Pago ANDE y Essap', currency: 'PYG' },
    { id: 'exp2', date: '2026-08-10', category: 'Marketing', amount: 3500000, description: 'Campaña Redes Sociales', currency: 'PYG' },
  ];
  dbSet(DB_KEYS.expenses, expensesData);

  // Config
  dbSet(DB_KEYS.config, {
    currency: 'PYG',
    globalExchangeRate: 7500, // Default PYG per USD
  });

  // Payments (Empty)
  dbSet(DB_KEYS.payments, []);

  // Mark seeded
  dbSet('erp_seeded_v4', true);
}
