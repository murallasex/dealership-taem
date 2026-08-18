// =====================================================
// AutoERP — Core AppState, Store & Reactive Pub/Sub
// =====================================================

import { getActiveCurrency, setActiveCurrency, fmt, formatCurrency, fmtDate, formatDate, formatDatetime, daysAgo, addDays } from '../utils/formatters.js';

export { getActiveCurrency, setActiveCurrency, fmt, formatCurrency, fmtDate, formatDate, formatDatetime, daysAgo, addDays };

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

// =====================================================
// DEMO DATA SEEDER (UTF-8 Clean)
// =====================================================
export function seedDemoData() {
  if (dbGet('erp_seeded_v3')) return;

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

  // Vehicles (Note: VIN for vehicle v5 is '5YJSA1DG0DFP00123')
  const vehiclesData = [
    {
      id: 'v1', vin: '1HGBH41JXMN109186', brand: 'Toyota', model: 'Hilux', version: 'SRX 4x4 AT', year: 2024,
      color: 'Blanco Perlado', mileage: 0, condition: 'new', origin: 'imported',
      commercialStatus: 'available', purchaseCost: 185000000, importCosts: 12000000, prepCost: 1500000, commission: 5000000,
      suggestedPrice: 215000000, currency: 'PYG', branch: 'Casa Central', photos: [], documents: [],
      history: [
        { date: '2026-06-01T00:00:00Z', action: 'Ingreso al inventario', by: 'Carlos Méndez' },
        { date: '2026-06-02T00:00:00Z', action: 'Verificación técnica completada', by: 'Taller' },
      ],
      createdAt: '2026-06-01T00:00:00Z',
    },
    {
      id: 'v2', vin: '2T1BURHE0JC012345', brand: 'Toyota', model: 'Corolla', version: 'XEi CVT', year: 2023,
      color: 'Gris Oscuro', mileage: 28500, condition: 'used', origin: 'trade_in',
      commercialStatus: 'available', purchaseCost: 95000000, importCosts: 0, prepCost: 2000000, commission: 3000000,
      suggestedPrice: 112000000, currency: 'PYG', branch: 'Casa Central', photos: [], documents: [],
      history: [
        { date: '2026-05-15T00:00:00Z', action: 'Ingresado como parte de pago de venta #VT-0012', by: 'María Fernández' },
        { date: '2026-05-16T00:00:00Z', action: 'Tasación técnica realizada', by: 'Carlos Méndez' },
      ],
      createdAt: '2026-05-15T00:00:00Z',
    },
    {
      id: 'v3', vin: '3GNAXUEV8JS123456', brand: 'Chevrolet', model: 'Tracker', version: 'Premier Turbo', year: 2024,
      color: 'Rojo Cereza', mileage: 0, condition: 'new', origin: 'direct',
      commercialStatus: 'reserved', purchaseCost: 130000000, importCosts: 0, prepCost: 800000, commission: 4000000,
      suggestedPrice: 152000000, currency: 'PYG', branch: 'Casa Central', photos: [], documents: [],
      history: [
        { date: '2026-07-01T00:00:00Z', action: 'Ingreso al inventario', by: 'Carlos Méndez' },
        { date: '2026-08-01T00:00:00Z', action: 'Reservado por cliente Ana Lucía Rodríguez', by: 'Roberto López' },
      ],
      createdAt: '2026-07-01T00:00:00Z',
    },
    {
      id: 'v4', vin: '4T1BF1FK0HU123789', brand: 'Toyota', model: 'Fortuner', version: 'SR5 4x4', year: 2025,
      color: 'Negro', mileage: 0, condition: 'new', origin: 'imported',
      commercialStatus: 'available', purchaseCost: 260000000, importCosts: 18000000, prepCost: 2000000, commission: 8000000,
      suggestedPrice: 310000000, currency: 'PYG', branch: 'Casa Central', photos: [], documents: [],
      history: [
        { date: '2026-07-20T00:00:00Z', action: 'Ingreso al inventario desde importación', by: 'Carlos Méndez' },
      ],
      createdAt: '2026-07-20T00:00:00Z',
    },
    {
      id: 'v5', vin: '5YJSA1DG0DFP00123', brand: 'Volkswagen', model: 'Amarok', version: 'V6 Extreme 4Motion', year: 2024,
      color: 'Plata Metalizado', mileage: 0, condition: 'new', origin: 'imported',
      commercialStatus: 'available', purchaseCost: 280000000, importCosts: 20000000, prepCost: 1800000, commission: 9000000,
      suggestedPrice: 335000000, currency: 'PYG', branch: 'Casa Central', photos: [], documents: [],
      history: [
        { date: '2026-06-15T00:00:00Z', action: 'Ingreso al inventario', by: 'Carlos Méndez' },
      ],
      createdAt: '2026-06-15T00:00:00Z',
    },
    {
      id: 'v6', vin: '6FPAAAJ36FH123456', brand: 'Honda', model: 'CR-V', version: 'EX-L Hybrid', year: 2023,
      color: 'Azul Oscuro', mileage: 18000, condition: 'used', origin: 'direct',
      commercialStatus: 'sold', purchaseCost: 130000000, importCosts: 0, prepCost: 3000000, commission: 4000000,
      suggestedPrice: 155000000, currency: 'PYG', branch: 'Casa Central', photos: [], documents: [],
      history: [
        { date: '2026-04-01T00:00:00Z', action: 'Ingreso al inventario', by: 'Carlos Méndez' },
        { date: '2026-05-10T00:00:00Z', action: 'Vendido a Juan Carlos Pérez', by: 'María Fernández' },
        { date: '2026-05-15T00:00:00Z', action: 'Entregado al cliente', by: 'María Fernández' },
      ],
      createdAt: '2026-04-01T00:00:00Z',
    },
    {
      id: 'v7', vin: '7SAYGDEE0PF123456', brand: 'Nissan', model: 'Frontier', version: 'Pro-4X AT 4WD', year: 2024,
      color: 'Gris Grafito', mileage: 0, condition: 'new', origin: 'direct',
      commercialStatus: 'in_preparation', purchaseCost: 175000000, importCosts: 5000000, prepCost: 2500000, commission: 5500000,
      suggestedPrice: 205000000, currency: 'PYG', branch: 'Casa Central', photos: [], documents: [],
      history: [
        { date: '2026-07-25T00:00:00Z', action: 'Ingreso al inventario', by: 'Carlos Méndez' },
        { date: '2026-08-01T00:00:00Z', action: 'Enviado a preparación y detailing', by: 'Diego Sánchez' },
      ],
      createdAt: '2026-07-25T00:00:00Z',
    },
    {
      id: 'v8', vin: '8JNBAAEV6JW123456', brand: 'Chevrolet', model: 'S10', version: 'High Country 4x4', year: 2023,
      color: 'Blanco', mileage: 42000, condition: 'consigned', origin: 'consignment',
      commercialStatus: 'available', purchaseCost: 105000000, importCosts: 0, prepCost: 1200000, commission: 3500000,
      suggestedPrice: 122000000, currency: 'PYG', branch: 'Casa Central', photos: [], documents: [],
      history: [
        { date: '2026-06-28T00:00:00Z', action: 'Ingresado en consignación por cliente particular', by: 'Diego Sánchez' },
      ],
      createdAt: '2026-06-28T00:00:00Z',
    },
  ];
  dbSet(DB_KEYS.vehicles, vehiclesData);

  // Sales
  const salesData = [
    {
      id: 'sale1', saleNumber: 'VT-0015', vehicleId: 'v3', clientId: 'c2', sellerId: 's2',
      stage: 'reservation', paymentType: 'financed_own', downPayment: 30000000, totalPrice: 152000000,
      currency: 'PYG', advanceAmount: 10000000, notes: 'Cliente solicita patente incluida.',
      tradeInVehicleId: null, contractGenerated: false, deliveryStatus: 'pending',
      createdAt: '2026-08-01T00:00:00Z', updatedAt: '2026-08-05T00:00:00Z',
      history: [
        { date: '2026-08-01T00:00:00Z', stage: 'quote', by: 'Roberto López', note: 'Cotización inicial enviada al cliente.' },
        { date: '2026-08-05T00:00:00Z', stage: 'reservation', by: 'Roberto López', note: 'Seña recibida: ₲ 10.000.000' },
      ],
    },
    {
      id: 'sale2', saleNumber: 'VT-0014', vehicleId: 'v1', clientId: 'c3', sellerId: 's1',
      stage: 'contract', paymentType: 'financed_bank', downPayment: 50000000, totalPrice: 215000000,
      currency: 'PYG', advanceAmount: 20000000, notes: 'Financiado con Banco Continental.',
      tradeInVehicleId: null, contractGenerated: true, deliveryStatus: 'pending',
      createdAt: '2026-07-20T00:00:00Z', updatedAt: '2026-08-02T00:00:00Z',
      history: [
        { date: '2026-07-20T00:00:00Z', stage: 'quote', by: 'María Fernández', note: 'Cotización para flota de Empresa Logística SA.' },
        { date: '2026-07-25T00:00:00Z', stage: 'reservation', by: 'María Fernández', note: 'Reserva con seña ₲ 20.000.000.' },
        { date: '2026-08-02T00:00:00Z', stage: 'contract', by: 'María Fernández', note: 'Contrato de compraventa firmado.' },
      ],
    },
    {
      id: 'sale3', saleNumber: 'VT-0013', vehicleId: 'v6', clientId: 'c1', sellerId: 's1',
      stage: 'delivery', paymentType: 'cash', downPayment: 155000000, totalPrice: 155000000,
      currency: 'PYG', advanceAmount: 0, notes: 'Pago contado. Incluye 1er service gratis.',
      tradeInVehicleId: 'v2', contractGenerated: true, deliveryStatus: 'delivered',
      createdAt: '2026-05-10T00:00:00Z', updatedAt: '2026-05-15T00:00:00Z',
      history: [
        { date: '2026-05-10T00:00:00Z', stage: 'quote', by: 'María Fernández', note: 'Cotización inicial.' },
        { date: '2026-05-11T00:00:00Z', stage: 'reservation', by: 'María Fernández', note: 'Vehículo reservado.' },
        { date: '2026-05-12T00:00:00Z', stage: 'contract', by: 'María Fernández', note: 'Contrato firmado. Toyota Corolla aceptado como parte de pago.' },
        { date: '2026-05-15T00:00:00Z', stage: 'delivery', by: 'María Fernández', note: 'Vehículo entregado. Trámite de transferencia iniciado.' },
      ],
    },
    {
      id: 'sale4', saleNumber: 'VT-0016', vehicleId: 'v5', clientId: 'c4', sellerId: 's3',
      stage: 'quote', paymentType: 'financed_own', downPayment: 100000000, totalPrice: 335000000,
      currency: 'PYG', advanceAmount: 0, notes: 'Cliente evaluando opciones de financiación.',
      tradeInVehicleId: null, contractGenerated: false, deliveryStatus: 'pending',
      createdAt: '2026-08-05T00:00:00Z', updatedAt: '2026-08-05T00:00:00Z',
      history: [
        { date: '2026-08-05T00:00:00Z', stage: 'quote', by: 'Diego Sánchez', note: 'Primera cotización enviada.' },
      ],
    },
  ];
  dbSet(DB_KEYS.sales, salesData);

  // Financing plans
  const todayDate = new Date();
  const mkDate = (offsetDays) => {
    const d = new Date(todayDate);
    d.setDate(d.getDate() + offsetDays);
    return d.toISOString();
  };

  const financingData = [
    {
      id: 'fin1', saleId: 'sale1', clientId: 'c2', vehicleId: 'v3',
      totalAmount: 152000000, downPayment: 30000000, financedAmount: 122000000,
      installments: 24, monthlyRate: 0.018,
      currency: 'PYG',
      installmentAmount: Math.round(122000000 * 0.018 * Math.pow(1.018, 24) / (Math.pow(1.018, 24) - 1)),
      payments: Array.from({ length: 24 }, (_, i) => ({
        id: `fin1-p${i+1}`,
        number: i + 1,
        dueDate: mkDate((i + 1) * 30),
        amount: Math.round(122000000 * 0.018 * Math.pow(1.018, 24) / (Math.pow(1.018, 24) - 1)),
        status: i < 0 ? 'paid' : 'pending',
        paidAt: null,
      })),
      createdAt: '2026-08-05T00:00:00Z',
    },
    {
      id: 'fin2', saleId: 'sale4', clientId: 'c4', vehicleId: 'v5',
      totalAmount: 335000000, downPayment: 100000000, financedAmount: 235000000,
      installments: 36, monthlyRate: 0.02,
      currency: 'PYG',
      installmentAmount: Math.round(235000000 * 0.02 * Math.pow(1.02, 36) / (Math.pow(1.02, 36) - 1)),
      payments: Array.from({ length: 36 }, (_, i) => ({
        id: `fin2-p${i+1}`,
        number: i + 1,
        dueDate: mkDate((i + 1) * 30 - 60),
        amount: Math.round(235000000 * 0.02 * Math.pow(1.02, 36) / (Math.pow(1.02, 36) - 1)),
        status: i < 2 ? 'paid' : (i === 2 ? 'overdue' : 'pending'),
        paidAt: i < 2 ? mkDate(i * 30 - 70) : null,
      })),
      createdAt: '2026-06-07T00:00:00Z',
    },
  ];
  dbSet(DB_KEYS.financing, financingData);

  // Leads
  const leadsData = [
    { id: 'lead1', name: 'Gabriel Rojas', email: 'gabriel.rojas@gmail.com', phone: '+595 981 321-123', interestedIn: 'Toyota Hilux', origin: 'social', stage: 'new', assignedTo: 's1', notes: 'Vio el vehículo en Instagram.', createdAt: '2026-08-06T00:00:00Z' },
    { id: 'lead2', name: 'Natalia Bogado', email: 'nbogado@empresa.py', phone: '+595 981 654-456', interestedIn: 'Chevrolet Tracker', origin: 'web', stage: 'interested', assignedTo: 's2', notes: 'Completó formulario online.', createdAt: '2026-08-04T00:00:00Z' },
    { id: 'lead3', name: 'Lucas Estigarribia', email: 'lucas@gmail.com', phone: '+595 981 987-789', interestedIn: 'Nissan Frontier', origin: 'walkin', stage: 'quoted', assignedTo: 's3', notes: 'Vino sin cita, muy interesado.', createdAt: '2026-08-02T00:00:00Z' },
    { id: 'lead4', name: 'Sofía Almada', email: 'sofia.almada@outlook.com', phone: '+595 981 111-999', interestedIn: 'Honda CR-V', origin: 'referral', stage: 'negotiation', assignedTo: 's1', notes: 'Referida por cliente Juan Pérez.', createdAt: '2026-07-28T00:00:00Z' },
    { id: 'lead5', name: 'Carlos Brítez', email: 'c.britez@gmail.com', phone: '+595 981 222-888', interestedIn: 'VW Amarok', origin: 'social', stage: 'won', assignedTo: 's2', notes: 'Cerró cotización.', createdAt: '2026-07-20T00:00:00Z' },
    { id: 'lead6', name: 'Rosa Giménez', email: 'rgimenez@gmail.com', phone: '+595 981 333-777', interestedIn: 'Toyota Corolla', origin: 'walkin', stage: 'lost', assignedTo: 's3', notes: 'Se fue con la competencia.', createdAt: '2026-07-15T00:00:00Z' },
  ];
  dbSet(DB_KEYS.leads, leadsData);

  // Cash box entries
  const cashData = [
    { id: 'cash1', type: 'income', category: 'sale', description: 'Pago contado venta VT-0013 - Juan Carlos Pérez', amount: 155000000, currency: 'PYG', saleId: 'sale3', date: '2026-05-15T00:00:00Z', registeredBy: 'Carlos Méndez' },
    { id: 'cash2', type: 'expense', category: 'preparation', description: 'Gastos de detailing - Toyota Corolla v2', amount: 2000000, currency: 'PYG', date: '2026-05-16T00:00:00Z', registeredBy: 'Carlos Méndez' },
    { id: 'cash3', type: 'income', category: 'advance', description: 'Seña reserva VT-0014 - Empresa Logística SA', amount: 20000000, currency: 'PYG', saleId: 'sale2', date: '2026-07-25T00:00:00Z', registeredBy: 'Carlos Méndez' },
    { id: 'cash4', type: 'expense', category: 'import', description: 'Gastos de importación Toyota Fortuner', amount: 18000000, currency: 'PYG', date: '2026-07-22T00:00:00Z', registeredBy: 'Carlos Méndez' },
    { id: 'cash5', type: 'income', category: 'advance', description: 'Seña reserva VT-0015 - Ana Rodríguez', amount: 10000000, currency: 'PYG', saleId: 'sale1', date: '2026-08-05T00:00:00Z', registeredBy: 'Carlos Méndez' },
    { id: 'cash6', type: 'expense', category: 'services', description: 'Servicio de limpieza y mantenimiento local', amount: 1500000, currency: 'PYG', date: '2026-08-01T00:00:00Z', registeredBy: 'Carlos Méndez' },
    { id: 'cash7', type: 'income', category: 'installment', description: 'Pago cuota 1 - Financiación VT-0016', amount: 9820000, currency: 'PYG', date: '2026-07-07T00:00:00Z', registeredBy: 'Andrea Torres' },
    { id: 'cash8', type: 'income', category: 'installment', description: 'Pago cuota 2 - Financiación VT-0016', amount: 9820000, currency: 'PYG', date: '2026-08-06T00:00:00Z', registeredBy: 'Andrea Torres' },
  ];
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

  // Mark seeded
  dbSet('erp_seeded_v3', true);
}
