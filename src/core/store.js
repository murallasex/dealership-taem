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
// DEMO DATA SEEDER (Realista - Auto Central PY)
// =====================================================
export function seedDemoData(force = false) {
  if (!force && dbGet('erp_seeded_v6') && Vehicles.all().length > 0) return;

  // Configuración de la Empresa
  dbSet(DB_KEYS.config, {
    companyName: 'Auto Central PY',
    branch: 'Casa Central — Asunción',
    ruc: '80054321-8',
    phone: '+595 21 600-700',
    address: 'Avda. Mcal. López 2850 esq. San Martín, Asunción, Paraguay',
    email: 'gerente@autocentral.com',
    currency: 'USD',
    globalExchangeRate: 7500,
    logoInitials: 'AC',
    dnitCredentials: 'DEMO_MODE',
  });

  // Usuarios del Sistema
  const usersData = [
    { id: 'usr_mgr1', name: 'Gerardo Martínez', email: 'gerente@autocentral.com', password: 'manager123', role: 'manager', active: true, avatar: 'GM', createdAt: '2025-01-01T00:00:00Z' },
    { id: 'usr_sel1', name: 'Roberto López', email: 'roberto@autocentral.com', password: 'seller123', role: 'seller', active: true, avatar: 'RL', sellerId: 's1', createdAt: '2025-01-15T00:00:00Z' },
    { id: 'usr_sel2', name: 'Ana Giménez', email: 'ana@autocentral.com', password: 'seller123', role: 'seller', active: true, avatar: 'AG', sellerId: 's2', createdAt: '2025-02-01T00:00:00Z' },
    { id: 'usr_sel3', name: 'Marcos Benítez', email: 'marcos@autocentral.com', password: 'seller123', role: 'seller', active: true, avatar: 'MB', sellerId: 's3', createdAt: '2025-03-10T00:00:00Z' },
    { id: 'usr_dev', name: 'Dev Admin', email: 'dev@platform.com', password: 'dev123', role: 'developer', active: true, avatar: 'DA', createdAt: '2025-01-01T00:00:00Z' },
  ];
  dbSet(DB_KEYS.users, usersData);

  // Vendedores
  const sellersData = [
    { id: 's1', name: 'Roberto López', userId: 'usr_sel1', phone: '+595 981 333-444', email: 'roberto@autocentral.com', avatar: 'RL', color: '#3b82f6', active: true, hireDate: '2025-01-15T00:00:00Z' },
    { id: 's2', name: 'Ana Giménez', userId: 'usr_sel2', phone: '+595 981 555-777', email: 'ana@autocentral.com', avatar: 'AG', color: '#c9a227', active: true, hireDate: '2025-02-01T00:00:00Z' },
    { id: 's3', name: 'Marcos Benítez', userId: 'usr_sel3', phone: '+595 981 888-999', email: 'marcos@autocentral.com', avatar: 'MB', color: '#22c55e', active: true, hireDate: '2025-03-10T00:00:00Z' },
  ];
  dbSet(DB_KEYS.sellers, sellersData);

  // Metas (Octubre 2026 y meses previos)
  const goalsData = [
    { id: 'g1', sellerId: 's1', period: '2026-10', type: 'units', target: 5, result: 2, status: 'active' },
    { id: 'g2', sellerId: 's2', period: '2026-10', type: 'units', target: 4, result: 1, status: 'active' },
    { id: 'g3', sellerId: 's3', period: '2026-10', type: 'units', target: 4, result: 1, status: 'active' },
    { id: 'g4', sellerId: 's1', period: '2026-09', type: 'units', target: 5, result: 5, status: 'completed' },
    { id: 'g5', sellerId: 's2', period: '2026-09', type: 'units', target: 4, result: 4, status: 'completed' },
    { id: 'g6', sellerId: 's3', period: '2026-09', type: 'units', target: 3, result: 4, status: 'completed' },
    { id: 'g7', sellerId: 's1', period: '2026-08', type: 'units', target: 5, result: 4, status: 'completed' },
    { id: 'g8', sellerId: 's2', period: '2026-08', type: 'units', target: 4, result: 5, status: 'completed' },
    { id: 'g9', sellerId: 's3', period: '2026-08', type: 'units', target: 3, result: 3, status: 'completed' },
  ];
  dbSet(DB_KEYS.goals, goalsData);

  // Clientes
  const clientsData = [
    { id: 'c1', name: 'Juan Carlos Pérez', email: 'jcperez@gmail.com', phone: '+595 981 222-333', document: '4.567.890', docType: 'CI', address: 'San Lorenzo, Paraguay', segment: 'active', interestedIn: 'Jeep Compass', leadOrigin: 'referral', createdAt: '2026-01-10T00:00:00Z', notes: 'Cliente frecuente, compra cada 2 años.', birthDate: '1985-08-20' },
    { id: 'c2', name: 'Ana Lucía Rodríguez', email: 'ana.rodriguez@outlook.com', phone: '+595 981 444-555', document: '5.678.901', docType: 'CI', address: 'Asunción, Paraguay', segment: 'active', interestedIn: 'Kia Sportage', leadOrigin: 'web', createdAt: '2026-02-05T00:00:00Z', notes: 'Reserva confirmada con entrega inicial.', birthDate: '1992-05-15' },
    { id: 'c3', name: 'Empresa Logística SA', email: 'compras@logisticasa.com.py', phone: '+595 21 666-777', document: '80098765-4', docType: 'RUC', address: 'Luque, Paraguay', segment: 'active', interestedIn: 'Volkswagen Amarok', leadOrigin: 'walkin', createdAt: '2026-03-01T00:00:00Z', notes: 'Compra para renovación de flota gerencial.' },
    { id: 'c4', name: 'Miguel Ángel Ortiz', email: 'miguel.ortiz@yahoo.com', phone: '+595 981 777-888', document: '6.789.012', docType: 'CI', address: 'Fernando de la Mora, Paraguay', segment: 'prospect', interestedIn: 'Toyota Corolla Cross', leadOrigin: 'social', createdAt: '2026-06-01T00:00:00Z', notes: 'Esperando aprobación de crédito bancario.', birthDate: '1978-11-03' },
    { id: 'c5', name: 'Patricia González', email: 'patri.gonzalez@gmail.com', phone: '+595 981 999-000', document: '7.890.123', docType: 'CI', address: 'Capiatá, Paraguay', segment: 'prospect', interestedIn: 'Chevrolet Tracker', leadOrigin: 'referral', createdAt: '2026-07-10T00:00:00Z', notes: 'Solicitó cotización con entrega de usado.', birthDate: '1995-02-28' },
    { id: 'c6', name: 'Fernando Villalba', email: 'fvillalba@empresa.com', phone: '+595 981 100-200', document: '3.456.789', docType: 'CI', address: 'Asunción, Paraguay', segment: 'active', interestedIn: 'Nissan Kicks', leadOrigin: 'walkin', createdAt: '2026-04-20T00:00:00Z', notes: 'Posee plan de financiamiento al día.' },
    { id: 'c7', name: 'Constructora Itapúa SRL', email: 'admin@constructora-itapua.com', phone: '+595 71 222-333', document: '80055443-1', docType: 'RUC', address: 'Encarnación, Paraguay', segment: 'active', interestedIn: 'Toyota Hilux', leadOrigin: 'referral', createdAt: '2025-08-01T00:00:00Z', notes: 'Cliente corporativo para pickups de obra.' },
    { id: 'c8', name: 'Dr. Roberto Cantero', email: 'rcantero@medicos.com.py', phone: '+595 981 334-998', document: '2.984.112', docType: 'CI', address: 'Barrio Herrera, Asunción', segment: 'active', interestedIn: 'BMW X5', leadOrigin: 'referral', createdAt: '2026-05-12T00:00:00Z', notes: 'Comprador de segmento premium al contado.', birthDate: '1974-03-18' },
    { id: 'c9', name: 'Ganadera Chaco Central SA', email: 'info@ganaderachaco.com.py', phone: '+595 21 789-012', document: '80044123-9', docType: 'RUC', address: 'Avda. Aviadores del Chaco, Asunción', segment: 'active', interestedIn: 'Ford Ranger V6', leadOrigin: 'direct', createdAt: '2026-06-15T00:00:00Z', notes: 'Flota ganadera en el Chaco Central.' },
    { id: 'c10', name: 'Lic. Sofía Alvarenga', email: 'sofia.alvarenga@gmail.com', phone: '+595 982 456-789', document: '4.887.321', docType: 'CI', address: 'Lambaré, Paraguay', segment: 'prospect', interestedIn: 'Chevrolet Tracker', leadOrigin: 'web', createdAt: '2026-08-10T00:00:00Z', notes: 'Cotizó SUV compacta para uso familiar.', birthDate: '1990-12-04' }
  ];
  dbSet(DB_KEYS.clients, clientsData);

  // Vehículos (Inventario Realista)
  const vehiclesData = [
    {
      id: 'v1', vin: '8AJBA3CD4P1928371', brand: 'Toyota', model: 'Hilux', version: 'SRX 2.8 4x4 AT', year: 2024,
      color: 'Blanco Perlado', mileage: 14500, condition: 'used', origin: 'trade_in', commercialStatus: 'available',
      fuelType: 'Diésel', transmission: 'Automática', purchaseCost: 44000, importCosts: 0, prepCost: 500, commission: 800, suggestedPrice: 52000,
      currency: 'USD', branch: 'Casa Central — Asunción', receptionDate: '2026-09-01T10:00:00Z', createdAt: '2026-09-01T10:00:00Z',
      photos: [], documents: [], history: [{ date: '2026-09-01T10:00:00Z', action: 'Ingreso al inventario por toma de usado', by: 'Roberto López' }]
    },
    {
      id: 'v2', vin: 'KMHJT81DBPU827364', brand: 'Hyundai', model: 'Tucson', version: 'GLS 2.0 AT', year: 2023,
      color: 'Gris Plata', mileage: 28500, condition: 'used', origin: 'direct', commercialStatus: 'available',
      fuelType: 'Nafta', transmission: 'Automática', purchaseCost: 22000, importCosts: 0, prepCost: 350, commission: 500, suggestedPrice: 27500,
      currency: 'USD', branch: 'Casa Central — Asunción', receptionDate: '2026-09-10T11:00:00Z', createdAt: '2026-09-10T11:00:00Z',
      photos: [], documents: [], history: [{ date: '2026-09-10T11:00:00Z', action: 'Compra directa a propietario', by: 'Ana Giménez' }]
    },
    {
      id: 'v3', vin: '9BRBL46EXRP091823', brand: 'Toyota', model: 'Corolla Cross', version: 'XRE 2.0 CVT', year: 2025,
      color: 'Plata Metalizado', mileage: 0, condition: 'new', origin: 'imported', commercialStatus: 'available',
      fuelType: 'Flex', transmission: 'Automática', purchaseCost: 31000, importCosts: 2500, prepCost: 400, commission: 600, suggestedPrice: 38500,
      currency: 'USD', branch: 'Casa Central — Asunción', receptionDate: '2026-10-01T08:00:00Z', createdAt: '2026-10-01T08:00:00Z',
      photos: [], documents: [], history: [{ date: '2026-10-01T08:00:00Z', action: 'Desaduanamiento e ingreso 0km', by: 'Gerardo Martínez' }]
    },
    {
      id: 'v4', vin: 'WV1ZZZ2HZPP123456', brand: 'Volkswagen', model: 'Amarok', version: 'V6 Extreme 4Motion', year: 2023,
      color: 'Azul Atlántico', mileage: 34000, condition: 'used', origin: 'direct', commercialStatus: 'reserved',
      fuelType: 'Diésel', transmission: 'Automática', purchaseCost: 40000, importCosts: 0, prepCost: 600, commission: 800, suggestedPrice: 47000,
      currency: 'USD', branch: 'Casa Central — Asunción', receptionDate: '2026-09-15T09:00:00Z', createdAt: '2026-09-15T09:00:00Z',
      photos: [], documents: [], history: [{ date: '2026-10-06T11:00:00Z', action: 'Reserva y Contrato con Empresa Logística SA', by: 'Roberto López' }]
    },
    {
      id: 'v5', vin: 'KNAFX411AP6789012', brand: 'Kia', model: 'Sportage', version: 'EX 2.0 AWD', year: 2024,
      color: 'Negro Cosmos', mileage: 16200, condition: 'used', origin: 'trade_in', commercialStatus: 'reserved',
      fuelType: 'Nafta', transmission: 'Automática', purchaseCost: 28000, importCosts: 0, prepCost: 400, commission: 600, suggestedPrice: 34000,
      currency: 'USD', branch: 'Casa Central — Asunción', receptionDate: '2026-09-20T14:00:00Z', createdAt: '2026-09-20T14:00:00Z',
      photos: [], documents: [], history: [{ date: '2026-10-09T14:00:00Z', action: 'Seña de reserva recibida de Ana Lucía Rodríguez', by: 'Marcos Benítez' }]
    },
    {
      id: 'v6', vin: '9BG118EB8RP334455', brand: 'Chevrolet', model: 'Tracker', version: 'Premier 1.2 Turbo', year: 2024,
      color: 'Rojo Carmín', mileage: 9500, condition: 'used', origin: 'consignment', commercialStatus: 'available',
      fuelType: 'Flex', transmission: 'Automática', purchaseCost: 19500, importCosts: 0, prepCost: 300, commission: 500, suggestedPrice: 23900,
      currency: 'USD', branch: 'Casa Central — Asunción', receptionDate: '2026-09-25T16:00:00Z', createdAt: '2026-09-25T16:00:00Z',
      photos: [], documents: [], history: [{ date: '2026-09-25T16:00:00Z', action: 'Ingreso en consignación de cliente VIP', by: 'Ana Giménez' }]
    },
    {
      id: 'v7', vin: 'WBAJU8108N9876543', brand: 'BMW', model: 'X5', version: 'xDrive30d M Sport', year: 2022,
      color: 'Blanco Mineral', mileage: 48000, condition: 'used', origin: 'direct', commercialStatus: 'sold',
      fuelType: 'Diésel', transmission: 'Automática', purchaseCost: 62000, importCosts: 0, prepCost: 800, commission: 1200, suggestedPrice: 74000,
      currency: 'USD', branch: 'Casa Central — Asunción', receptionDate: '2026-08-10T12:00:00Z', createdAt: '2026-08-10T12:00:00Z',
      photos: [], documents: [], history: [{ date: '2026-10-10T11:45:00Z', action: 'Venta concretada y entregada a Dr. Roberto Cantero', by: 'Marcos Benítez' }]
    },
    {
      id: 'v8', vin: '8AFAR28G8R0112233', brand: 'Ford', model: 'Ranger', version: 'Limited V6 3.0 4x4', year: 2024,
      color: 'Gris Grafito', mileage: 14000, condition: 'used', origin: 'trade_in', commercialStatus: 'sold',
      fuelType: 'Diésel', transmission: 'Automática', purchaseCost: 47000, importCosts: 0, prepCost: 500, commission: 900, suggestedPrice: 55000,
      currency: 'USD', branch: 'Casa Central — Asunción', receptionDate: '2026-08-20T10:00:00Z', createdAt: '2026-08-20T10:00:00Z',
      photos: [], documents: [], history: [{ date: '2026-10-04T16:00:00Z', action: 'Entrega final a Ganadera Chaco Central SA', by: 'Roberto López' }]
    },
    {
      id: 'v9', vin: '988636123RP556677', brand: 'Jeep', model: 'Compass', version: 'Longitude 1.3T', year: 2023,
      color: 'Verde Militar', mileage: 22000, condition: 'used', origin: 'direct', commercialStatus: 'sold',
      fuelType: 'Nafta', transmission: 'Automática', purchaseCost: 25000, importCosts: 0, prepCost: 400, commission: 600, suggestedPrice: 30500,
      currency: 'USD', branch: 'Casa Central — Asunción', receptionDate: '2026-09-02T11:00:00Z', createdAt: '2026-09-02T11:00:00Z',
      photos: [], documents: [], history: [{ date: '2026-10-07T15:30:00Z', action: 'Entrega con financiamiento propio a Juan Carlos Pérez', by: 'Ana Giménez' }]
    },
    {
      id: 'v10', vin: '8AJBA3EE5P4455667', brand: 'Toyota', model: 'Fortuner', version: 'Diamond 2.8 4x4 AT', year: 2024,
      color: 'Negro Eclipse', mileage: 18000, condition: 'used', origin: 'direct', commercialStatus: 'in_preparation',
      fuelType: 'Diésel', transmission: 'Automática', purchaseCost: 51000, importCosts: 0, prepCost: 1200, commission: 900, suggestedPrice: 59900,
      currency: 'USD', branch: 'Casa Central — Asunción', receptionDate: '2026-10-08T09:00:00Z', createdAt: '2026-10-08T09:00:00Z',
      photos: [], documents: [], history: [{ date: '2026-10-08T09:00:00Z', action: 'En taller para detailing, pulido y service completo', by: 'Gerardo Martínez' }]
    },
    {
      id: 'v11', vin: '3N1CP5CU8NL889900', brand: 'Nissan', model: 'Kicks', version: 'Exclusive 1.6 CVT', year: 2022,
      color: 'Gris Plata', mileage: 39000, condition: 'used', origin: 'trade_in', commercialStatus: 'in_transit',
      fuelType: 'Nafta', transmission: 'Automática', purchaseCost: 16000, importCosts: 0, prepCost: 300, commission: 400, suggestedPrice: 19800,
      currency: 'USD', branch: 'Casa Central — Asunción', receptionDate: '2026-10-10T15:00:00Z', createdAt: '2026-10-10T15:00:00Z',
      photos: [], documents: [], history: [{ date: '2026-10-10T15:00:00Z', action: 'En traslado desde sucursal Ciudad del Este', by: 'Roberto López' }]
    },
    {
      id: 'v12', vin: 'WDD2060421F334455', brand: 'Mercedes-Benz', model: 'C200', version: 'AMG Line 1.5 Turbo', year: 2023,
      color: 'Plata Iridio', mileage: 19500, condition: 'used', origin: 'direct', commercialStatus: 'available',
      fuelType: 'Nafta', transmission: 'Automática', purchaseCost: 43000, importCosts: 0, prepCost: 600, commission: 900, suggestedPrice: 51500,
      currency: 'USD', branch: 'Casa Central — Asunción', receptionDate: '2026-09-18T10:00:00Z', createdAt: '2026-09-18T10:00:00Z',
      photos: [], documents: [], history: [{ date: '2026-09-18T10:00:00Z', action: 'Ingreso vehículo seleccionado VIP', by: 'Gerardo Martínez' }]
    },
    {
      id: 'v13', vin: '9BG148FB7P8899112', brand: 'Chevrolet', model: 'S10', version: 'High Country 2.8 4x4', year: 2022,
      color: 'Blanco Summit', mileage: 42000, condition: 'used', origin: 'trade_in', commercialStatus: 'sold',
      fuelType: 'Diésel', transmission: 'Automática', purchaseCost: 32000, importCosts: 0, prepCost: 500, commission: 700, suggestedPrice: 38000,
      currency: 'USD', branch: 'Casa Central — Asunción', receptionDate: '2026-08-15T10:00:00Z', createdAt: '2026-08-15T10:00:00Z',
      photos: [], documents: [], history: [{ date: '2026-09-22T10:00:00Z', action: 'Vendido y entregado a Constructora Itapúa SRL', by: 'Roberto López' }]
    },
    {
      id: 'v14', vin: '3CZRU6857PM445566', brand: 'Honda', model: 'HR-V', version: 'EXL 1.5 CVT', year: 2023,
      color: 'Azul Noche', mileage: 21000, condition: 'used', origin: 'direct', commercialStatus: 'available',
      fuelType: 'Nafta', transmission: 'Automática', purchaseCost: 24000, importCosts: 0, prepCost: 400, commission: 500, suggestedPrice: 29500,
      currency: 'USD', branch: 'Casa Central — Asunción', receptionDate: '2026-09-28T14:00:00Z', createdAt: '2026-09-28T14:00:00Z',
      photos: [], documents: [], history: [{ date: '2026-09-28T14:00:00Z', action: 'Ingreso directo al showroom', by: 'Ana Giménez' }]
    }
  ];
  dbSet(DB_KEYS.vehicles, vehiclesData);

  // Tablas transaccionales base
  dbSet(DB_KEYS.sales, []);
  dbSet(DB_KEYS.financing, []);
  dbSet(DB_KEYS.leads, []);
  dbSet(DB_KEYS.cashbox, []);

  // Plantillas de Correo
  const templatesData = [
    {
      id: 'tpl1', name: 'Recordatorio de cuota próxima a vencer', type: 'installment_due',
      subject: 'Recordatorio: Su cuota vence en {{dias_restantes}} días',
      body: `Estimado/a {{nombre_cliente}},

Le recordamos que su cuota N° {{numero_cuota}} por el valor de {{monto_cuota}} vence el {{fecha_vencimiento}}.

Por favor, acérquese a nuestras oficinas o realice su pago online para evitar recargos por mora.

Ante cualquier consulta, no dude en contactarnos al {{telefono_empresa}}.

Atentamente,
El equipo de {{nombre_empresa}}`,
      active: true, createdAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'tpl2', name: 'Recordatorio de cuota vencida', type: 'installment_overdue',
      subject: 'Aviso de Mora: Cuota vencida pendiente de pago',
      body: `Estimado/a {{nombre_cliente}},

Le informamos que su cuota N° {{numero_cuota}} por {{monto_cuota}} se encuentra vencida desde el {{fecha_vencimiento}}.

Le solicitamos regularizar su situación a la brevedad para evitar recargos adicionales.

Contáctenos al {{telefono_empresa}} para coordinar su plan de pago.

Atentamente,
{{nombre_empresa}}`,
      active: true, createdAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'tpl3', name: 'Oferta especial para clientes activos', type: 'offer',
      subject: '¡Nuevas unidades disponibles para usted en {{nombre_empresa}}!',
      body: `Estimado/a {{nombre_cliente}},

Tenemos excelentes novedades en nuestro showroom con condiciones especiales de financiamiento.

¡Visítenos en {{direccion_empresa}} y conozca nuestras unidades!

Atentamente,
{{nombre_empresa}}`,
      active: true, createdAt: '2026-01-01T00:00:00Z',
    },
  ];
  dbSet(DB_KEYS.emailTemplates, templatesData);

  // Historial de Envíos de Correo
  const emailLogData = [
    { id: 'el1', templateId: 'tpl1', clientId: 'c6', clientName: 'Fernando Villalba', email: 'fvillalba@empresa.com', subject: 'Recordatorio: Su cuota vence en 1 día', status: 'sent', sentAt: '2026-10-12T08:00:00Z' },
    { id: 'el2', templateId: 'tpl2', clientId: 'c1', clientName: 'Juan Carlos Pérez', email: 'jcperez@gmail.com', subject: 'Aviso de Mora: Cuota vencida pendiente de pago', status: 'sent', sentAt: '2026-10-08T09:00:00Z' },
    { id: 'el3', templateId: 'tpl3', clientId: 'c4', clientName: 'Miguel Ángel Ortiz', email: 'miguel.ortiz@yahoo.com', subject: 'Nuevas unidades disponibles para usted', status: 'sent', sentAt: '2026-10-10T10:00:00Z' },
    { id: 'el4', templateId: 'tpl1', clientId: 'c2', clientName: 'Ana Lucía Rodríguez', email: 'ana.rodriguez@outlook.com', subject: 'Recordatorio de cuota', status: 'sent', sentAt: '2026-10-09T08:30:00Z' },
  ];
  dbSet(DB_KEYS.emailLog, emailLogData);

  // Notificaciones del Sistema
  const notifData = [
    { id: 'n1', type: 'installment_overdue', title: 'Cuota Vencida', message: 'Juan Carlos Pérez tiene la cuota #2 vencida desde el 07/10/2026.', read: false, createdAt: '2026-10-08T08:00:00Z', link: '#/financing' },
    { id: 'n2', type: 'sale_stage', title: 'Venta Avanzada a Contrato', message: 'La venta VT-0104 de Empresa Logística SA avanzó a Contrato.', read: false, createdAt: '2026-10-06T11:05:00Z', link: '#/sales' },
    { id: 'n3', type: 'lead_new', title: 'Nuevo Prospecto Asignado', message: 'Carlos Benítez fue asignado a Roberto López desde Redes Sociales.', read: false, createdAt: '2026-10-13T09:00:00Z', link: '#/crm' },
    { id: 'n4', type: 'installment_due', title: 'Cuota Próxima a Vencer', message: 'Fernando Villalba tiene una cuota que vence el 14/10/2026.', read: true, createdAt: '2026-10-11T08:00:00Z', link: '#/financing' },
  ];
  dbSet(DB_KEYS.notifications, notifData);

  // Calendario de Eventos
  const eventsData = [
    { id: 'e1', title: 'Test Drive Amarok V6 - Ing. Romero', date: '2026-10-14', recurrence: 'none', color: '#3b82f6', type: 'appointment' },
    { id: 'e2', title: 'Entrega de Unidad Kia Sportage (VT-0103)', date: '2026-10-16', recurrence: 'none', color: '#22c55e', type: 'delivery' },
    { id: 'e3', title: 'Firma en Escribanía - Empresa Logística SA', date: '2026-10-19', recurrence: 'none', color: '#c9a227', type: 'contract' },
    { id: 'e4', title: 'Reunión Mensual de Cierre de Metas', date: '2026-10-24', recurrence: 'none', color: '#8b5cf6', type: 'meeting' },
    { id: 'e5', title: 'Cierre de Balance Contable y Pago de Comisiones', date: '2026-10-31', recurrence: 'monthly', color: '#ef4444', type: 'finance' }
  ];
  dbSet(DB_KEYS.events, eventsData);

  // Gastos Fijos y Operativos
  const expensesData = [
    { id: 'exp1', date: '2026-10-05', category: 'Servicios', amount: 1500, description: 'Pago de Energía Eléctrica ANDE y Agua', currency: 'USD' },
    { id: 'exp2', date: '2026-10-08', category: 'Marketing', amount: 2800, description: 'Campaña Publicitaria Meta & Google Ads', currency: 'USD' },
    { id: 'exp3', date: '2026-10-10', category: 'Taller', amount: 1450, description: 'Mantenimiento preventivo y repuestos', currency: 'USD' },
  ];
  dbSet(DB_KEYS.expenses, expensesData);

  // Pagos
  dbSet(DB_KEYS.payments, []);

  // Marcar como inicializado
  dbSet('erp_seeded_v6', true);
}

// =====================================================
// FULL LIVE DEMO SEEDER
// Carga ventas, financiamiento, caja y leads reales para el navegador
// =====================================================
export function seedFullDemoData(force = false) {
  if (!force && dbGet('erp_full_seeded_v6') && Sales.all().length > 0) return;

  seedDemoData(force);

  // 1. Actualizar estados comerciales de vehículos
  const vehicles = Vehicles.all();
  const updateStatus = (id, status) => {
    const v = vehicles.find(x => x.id === id);
    if (v) v.commercialStatus = status;
  };
  updateStatus('v4', 'reserved');
  updateStatus('v5', 'reserved');
  updateStatus('v7', 'sold');
  updateStatus('v8', 'sold');
  updateStatus('v9', 'sold');
  updateStatus('v13', 'sold');
  dbSet(DB_KEYS.vehicles, vehicles);

  // 2. Ventas Realistas
  const salesData = [
    {
      id: 's_101', saleNumber: 'VT-0101', vehicleId: 'v3', clientId: 'c4', sellerId: 's1',
      stage: 'quote', paymentType: 'financed_bank', totalPrice: 38500, downPayment: 8500, advanceAmount: 0,
      currency: 'USD', notes: 'Cliente aguarda respuesta de pre-aprobación del Banco Continental.',
      date: '2026-10-12T10:30:00Z', createdAt: '2026-10-12T10:30:00Z', updatedAt: '2026-10-12T10:30:00Z',
      financing: { months: 36, rate: 0.012, bankName: 'Banco Continental' },
      history: [{ date: '2026-10-12T10:30:00Z', stage: 'quote', by: 'Roberto López', note: 'Cotización emitida para Corolla Cross 0km' }]
    },
    {
      id: 's_102', saleNumber: 'VT-0102', vehicleId: 'v6', clientId: 'c10', sellerId: 's2',
      stage: 'quote', paymentType: 'cash', totalPrice: 23900, downPayment: 23900, advanceAmount: 0,
      currency: 'USD', notes: 'Interesada en pago al contado mediante transferencia bancaria.',
      date: '2026-10-13T09:15:00Z', createdAt: '2026-10-13T09:15:00Z', updatedAt: '2026-10-13T09:15:00Z',
      history: [{ date: '2026-10-13T09:15:00Z', stage: 'quote', by: 'Ana Giménez', note: 'Cotización inicial tras visita al salón' }]
    },
    {
      id: 's_103', saleNumber: 'VT-0103', vehicleId: 'v5', clientId: 'c2', sellerId: 's3',
      stage: 'reservation', paymentType: 'financed_own', totalPrice: 34000, downPayment: 10000, advanceAmount: 2000,
      currency: 'USD', notes: 'Seña de reserva de $2.000 depositada en caja. Restante de entrega al firmar contrato.',
      date: '2026-10-09T14:00:00Z', createdAt: '2026-10-09T14:00:00Z', updatedAt: '2026-10-09T14:00:00Z',
      financing: { months: 24, rate: 0.015 },
      history: [
        { date: '2026-10-07T11:00:00Z', stage: 'quote', by: 'Marcos Benítez', note: 'Cotización creada' },
        { date: '2026-10-09T14:00:00Z', stage: 'reservation', by: 'Marcos Benítez', note: 'Seña recibida y unidad reservada' }
      ]
    },
    {
      id: 's_104', saleNumber: 'VT-0104', vehicleId: 'v4', clientId: 'c3', sellerId: 's1',
      stage: 'contract', paymentType: 'financed_own', totalPrice: 47000, downPayment: 12000, advanceAmount: 12000,
      currency: 'USD', notes: 'Contrato firmado con entrega de usado Chevrolet S10 2017 tasado en $10.000.',
      date: '2026-10-06T11:00:00Z', createdAt: '2026-10-06T11:00:00Z', updatedAt: '2026-10-06T11:00:00Z',
      contractGenerated: true,
      tradeIns: [
        { brand: 'Chevrolet', model: 'S10', version: 'LTZ 2.8', year: 2017, color: 'Gris', mileage: 125000, condition: 'used', appraisalValue: 10000 }
      ],
      financing: { months: 24, rate: 0.015 },
      history: [
        { date: '2026-10-02T10:00:00Z', stage: 'quote', by: 'Roberto López', note: 'Propuesta corporativa para Amarok V6' },
        { date: '2026-10-04T15:00:00Z', stage: 'reservation', by: 'Roberto López', note: 'Aprobación de directorio y reserva' },
        { date: '2026-10-06T11:00:00Z', stage: 'contract', by: 'Roberto López', note: 'Firma de contrato y tasación de parte de pago' }
      ]
    },
    {
      id: 's_098', saleNumber: 'VT-0098', vehicleId: 'v8', clientId: 'c9', sellerId: 's1',
      stage: 'delivery', paymentType: 'cash', totalPrice: 55000, downPayment: 55000, advanceAmount: 55000,
      deliveryStatus: 'delivered', currency: 'USD', notes: 'Pago completo recibido por transferencia. Unidad entregada con éxito.',
      date: '2026-10-04T16:00:00Z', createdAt: '2026-10-04T16:00:00Z', updatedAt: '2026-10-04T16:00:00Z',
      history: [
        { date: '2026-09-28T09:00:00Z', stage: 'quote', by: 'Roberto López', note: 'Cotización Ranger V6' },
        { date: '2026-09-30T14:00:00Z', stage: 'reservation', by: 'Roberto López', note: 'Reserva' },
        { date: '2026-10-02T10:00:00Z', stage: 'contract', by: 'Roberto López', note: 'Contrato y pago' },
        { date: '2026-10-04T16:00:00Z', stage: 'delivery', by: 'Roberto López', note: 'Entrega en salón principal' }
      ]
    },
    {
      id: 's_099', saleNumber: 'VT-0099', vehicleId: 'v9', clientId: 'c1', sellerId: 's2',
      stage: 'delivery', paymentType: 'financed_own', totalPrice: 30500, downPayment: 10500, advanceAmount: 10500,
      deliveryStatus: 'delivered', currency: 'USD', notes: 'Entrega inicial de $10.500 y 24 cuotas de financiación propia.',
      date: '2026-10-07T15:30:00Z', createdAt: '2026-10-07T15:30:00Z', updatedAt: '2026-10-07T15:30:00Z',
      financing: { months: 24, rate: 0.015 },
      history: [
        { date: '2026-10-01T11:00:00Z', stage: 'quote', by: 'Ana Giménez', note: 'Cotización Compass' },
        { date: '2026-10-03T16:00:00Z', stage: 'reservation', by: 'Ana Giménez', note: 'Reserva' },
        { date: '2026-10-05T10:00:00Z', stage: 'contract', by: 'Ana Giménez', note: 'Contrato firmado' },
        { date: '2026-10-07T15:30:00Z', stage: 'delivery', by: 'Ana Giménez', note: 'Vehículo entregado al cliente' }
      ]
    },
    {
      id: 's_100', saleNumber: 'VT-0100', vehicleId: 'v7', clientId: 'c8', sellerId: 's3',
      stage: 'delivery', paymentType: 'cash', totalPrice: 74000, downPayment: 74000, advanceAmount: 74000,
      deliveryStatus: 'delivered', currency: 'USD', notes: 'Venta de alta gama de contado. Cliente satisfecho.',
      date: '2026-10-10T11:45:00Z', createdAt: '2026-10-10T11:45:00Z', updatedAt: '2026-10-10T11:45:00Z',
      history: [
        { date: '2026-10-05T15:00:00Z', stage: 'quote', by: 'Marcos Benítez', note: 'Cotización BMW X5' },
        { date: '2026-10-07T11:00:00Z', stage: 'reservation', by: 'Marcos Benítez', note: 'Reserva' },
        { date: '2026-10-09T09:30:00Z', stage: 'contract', by: 'Marcos Benítez', note: 'Contrato y transferencia' },
        { date: '2026-10-10T11:45:00Z', stage: 'delivery', by: 'Marcos Benítez', note: 'Entrega con brindis en showroom' }
      ]
    },
    {
      id: 's_094', saleNumber: 'VT-0094', vehicleId: 'v13', clientId: 'c7', sellerId: 's1',
      stage: 'delivery', paymentType: 'cash', totalPrice: 38000, downPayment: 38000, deliveryStatus: 'delivered',
      currency: 'USD', date: '2026-09-22T10:00:00Z', createdAt: '2026-09-22T10:00:00Z', updatedAt: '2026-09-22T10:00:00Z'
    },
    {
      id: 's_093', saleNumber: 'VT-0093', vehicleId: 'v2', clientId: 'c6', sellerId: 's2',
      stage: 'delivery', paymentType: 'financed_own', totalPrice: 27500, downPayment: 9500, deliveryStatus: 'delivered',
      currency: 'USD', date: '2026-09-14T14:00:00Z', createdAt: '2026-09-14T14:00:00Z', updatedAt: '2026-09-14T14:00:00Z',
      financing: { months: 18, rate: 0.015 }
    },
    {
      id: 's_092', saleNumber: 'VT-0092', vehicleId: 'v1', clientId: 'c3', sellerId: 's1',
      stage: 'delivery', paymentType: 'cash', totalPrice: 46000, downPayment: 46000, deliveryStatus: 'delivered',
      currency: 'USD', date: '2026-09-08T11:00:00Z', createdAt: '2026-09-08T11:00:00Z', updatedAt: '2026-09-08T11:00:00Z'
    },
    {
      id: 's_091', saleNumber: 'VT-0091', vehicleId: 'v14', clientId: 'c1', sellerId: 's3',
      stage: 'delivery', paymentType: 'cash', totalPrice: 32000, downPayment: 32000, deliveryStatus: 'delivered',
      currency: 'USD', date: '2026-09-03T16:00:00Z', createdAt: '2026-09-03T16:00:00Z', updatedAt: '2026-09-03T16:00:00Z'
    },
    {
      id: 's_090', saleNumber: 'VT-0090', vehicleId: 'v6', clientId: 'c2', sellerId: 's2',
      stage: 'delivery', paymentType: 'cash', totalPrice: 27000, downPayment: 27000, deliveryStatus: 'delivered',
      currency: 'USD', date: '2026-08-25T15:00:00Z', createdAt: '2026-08-25T15:00:00Z', updatedAt: '2026-08-25T15:00:00Z'
    },
    {
      id: 's_089', saleNumber: 'VT-0089', vehicleId: 'v7', clientId: 'c8', sellerId: 's1',
      stage: 'delivery', paymentType: 'cash', totalPrice: 51000, downPayment: 51000, deliveryStatus: 'delivered',
      currency: 'USD', date: '2026-08-18T10:00:00Z', createdAt: '2026-08-18T10:00:00Z', updatedAt: '2026-08-18T10:00:00Z'
    },
    {
      id: 's_088', saleNumber: 'VT-0088', vehicleId: 'v8', clientId: 'c9', sellerId: 's3',
      stage: 'delivery', paymentType: 'cash', totalPrice: 48000, downPayment: 48000, deliveryStatus: 'delivered',
      currency: 'USD', date: '2026-08-05T12:00:00Z', createdAt: '2026-08-05T12:00:00Z', updatedAt: '2026-08-05T12:00:00Z'
    },
    {
      id: 's_087', saleNumber: 'VT-0087', vehicleId: 'v5', clientId: 'c6', sellerId: 's2',
      stage: 'delivery', paymentType: 'cash', totalPrice: 35000, downPayment: 35000, deliveryStatus: 'delivered',
      currency: 'USD', date: '2026-07-28T16:00:00Z', createdAt: '2026-07-28T16:00:00Z', updatedAt: '2026-07-28T16:00:00Z'
    },
    {
      id: 's_086', saleNumber: 'VT-0086', vehicleId: 'v4', clientId: 'c7', sellerId: 's1',
      stage: 'delivery', paymentType: 'cash', totalPrice: 42000, downPayment: 42000, deliveryStatus: 'delivered',
      currency: 'USD', date: '2026-07-15T11:00:00Z', createdAt: '2026-07-15T11:00:00Z', updatedAt: '2026-07-15T11:00:00Z'
    },
    {
      id: 's_085', saleNumber: 'VT-0085', vehicleId: 'v9', clientId: 'c1', sellerId: 's3',
      stage: 'delivery', paymentType: 'cash', totalPrice: 26000, downPayment: 26000, deliveryStatus: 'delivered',
      currency: 'USD', date: '2026-06-20T10:00:00Z', createdAt: '2026-06-20T10:00:00Z', updatedAt: '2026-06-20T10:00:00Z'
    },
    {
      id: 's_084', saleNumber: 'VT-0084', vehicleId: 'v13', clientId: 'c4', sellerId: 's1',
      stage: 'delivery', paymentType: 'cash', totalPrice: 33000, downPayment: 33000, deliveryStatus: 'delivered',
      currency: 'USD', date: '2026-05-18T14:00:00Z', createdAt: '2026-05-18T14:00:00Z', updatedAt: '2026-05-18T14:00:00Z'
    }
  ];
  dbSet(DB_KEYS.sales, salesData);

  // 3. Planes de Financiamiento
  const financingData = [
    {
      id: 'fin_104',
      saleId: 's_104',
      clientId: 'c3',
      vehicleId: 'v4',
      totalAmount: 47000,
      downPayment: 22000,
      financedAmount: 25000,
      installments: 24,
      monthlyRate: 0.015,
      installmentAmount: 1246,
      currency: 'USD',
      paymentType: 'financed_own',
      bankName: '',
      createdAt: '2026-10-06T11:00:00Z',
      payments: Array.from({ length: 24 }, (_, idx) => {
        const d = new Date('2026-10-06T11:00:00Z');
        d.setMonth(d.getMonth() + idx + 1);
        return {
          id: `pay_104_${idx + 1}`,
          number: idx + 1,
          dueDate: d.toISOString(),
          amount: 1246,
          status: 'pending',
          paidAt: null
        };
      })
    },
    {
      id: 'fin_099',
      saleId: 's_099',
      clientId: 'c1',
      vehicleId: 'v9',
      totalAmount: 30500,
      downPayment: 10500,
      financedAmount: 20000,
      installments: 24,
      monthlyRate: 0.015,
      installmentAmount: 997,
      currency: 'USD',
      paymentType: 'financed_own',
      bankName: '',
      createdAt: '2026-09-07T15:30:00Z',
      payments: Array.from({ length: 24 }, (_, idx) => {
        const d = new Date('2026-09-07T15:30:00Z');
        d.setMonth(d.getMonth() + idx);
        let status = 'pending';
        let paidAt = null;
        if (idx === 0) {
          status = 'paid';
          paidAt = '2026-09-05T10:00:00Z';
        } else if (idx === 1) {
          status = 'overdue';
        }
        return {
          id: `pay_099_${idx + 1}`,
          number: idx + 1,
          dueDate: d.toISOString(),
          amount: 997,
          status,
          paidAt
        };
      })
    },
    {
      id: 'fin_093',
      saleId: 's_093',
      clientId: 'c6',
      vehicleId: 'v2',
      totalAmount: 27500,
      downPayment: 9500,
      financedAmount: 18000,
      installments: 18,
      monthlyRate: 0.015,
      installmentAmount: 1147,
      currency: 'USD',
      paymentType: 'financed_own',
      bankName: '',
      createdAt: '2026-08-14T14:00:00Z',
      payments: Array.from({ length: 18 }, (_, idx) => {
        const d = new Date('2026-08-14T14:00:00Z');
        d.setMonth(d.getMonth() + idx + 1);
        let status = 'pending';
        let paidAt = null;
        if (idx === 0) {
          status = 'paid';
          paidAt = '2026-09-12T10:00:00Z';
        } else if (idx === 1) {
          status = 'paid';
          paidAt = '2026-10-13T08:30:00Z';
        }
        return {
          id: `pay_093_${idx + 1}`,
          number: idx + 1,
          dueDate: d.toISOString(),
          amount: 1147,
          status,
          paidAt
        };
      })
    }
  ];
  dbSet(DB_KEYS.financing, financingData);

  // 4. CRM Leads
  const leadsData = [
    { id: 'lead_1', name: 'Carlos Benítez', email: 'carlos.benitez@gmail.com', phone: '+595 981 445-566', interestedIn: 'Toyota Hilux SRX', origin: 'social', stage: 'new', assignedTo: 's1', notes: 'Preguntó por financiación propia y requisitos.', createdAt: '2026-10-13T09:00:00Z' },
    { id: 'lead_2', name: 'Dra. Valeria Duarte', email: 'vduarte@salud.com.py', phone: '+595 981 778-899', interestedIn: 'Toyota Corolla Cross', origin: 'web', stage: 'interested', assignedTo: 's2', notes: 'Solicitó cotización detallada con entrega de usado.', createdAt: '2026-10-12T14:20:00Z' },
    { id: 'lead_3', name: 'Ing. Esteban Romero', email: 'eromero@obras.com.py', phone: '+595 982 112-233', interestedIn: 'Volkswagen Amarok V6', origin: 'walkin', stage: 'quoted', assignedTo: 's1', notes: 'Agendó test drive para mañana 14/10.', createdAt: '2026-10-11T10:00:00Z' },
    { id: 'lead_4', name: 'Mariana Franco', email: 'mfranco@diseno.com.py', phone: '+595 983 334-455', interestedIn: 'Chevrolet Tracker', origin: 'referral', stage: 'negotiation', assignedTo: 's3', notes: 'Negociando tasa de crédito bancario.', createdAt: '2026-10-09T16:00:00Z' },
    { id: 'lead_5', name: 'Juan Carlos Pérez', email: 'jcperez@gmail.com', phone: '+595 981 222-333', interestedIn: 'Jeep Compass', origin: 'referral', stage: 'won', assignedTo: 's2', notes: 'Venta concretada y entregada con VT-0099.', createdAt: '2026-10-01T11:00:00Z' },
    { id: 'lead_6', name: 'Jorge Giménez', email: 'jgimenez@inversiones.com.py', phone: '+595 981 990-011', interestedIn: 'BMW X5', origin: 'social', stage: 'lost', assignedTo: 's3', notes: 'Optó por una opción de menor valor.', createdAt: '2026-09-28T15:00:00Z' }
  ];
  dbSet(DB_KEYS.leads, leadsData);

  // 5. Caja Diaria
  const cashData = [
    { id: 'cb_today_1', date: '2026-10-13T09:30:00Z', type: 'income', category: 'advance', description: 'Seña de Reserva VT-0103 - Kia Sportage (Ana Lucía Rodríguez)', amount: 2000, currency: 'USD' },
    { id: 'cb_today_2', date: '2026-10-13T10:15:00Z', type: 'income', category: 'installment', description: 'Cobro Cuota #2 Financiación VT-0093 (Fernando Villalba)', amount: 1147, currency: 'USD' },
    { id: 'cb_today_3', date: '2026-10-13T11:00:00Z', type: 'expense', category: 'services', description: 'Combustible y traslados de unidades showroom', amount: 350, currency: 'USD' },
    { id: 'cb_today_4', date: '2026-10-13T12:30:00Z', type: 'expense', category: 'preparation', description: 'Lavadero y detailing pre-entrega', amount: 220, currency: 'USD' },
    { id: 'cb_oct_1', date: '2026-10-04T16:00:00Z', type: 'income', category: 'sale', description: 'Cobro Venta VT-0098 - Ford Ranger V6 (Ganadera Chaco Central)', amount: 55000, currency: 'USD' },
    { id: 'cb_oct_2', date: '2026-10-07T15:30:00Z', type: 'income', category: 'advance', description: 'Entrega Inicial Venta VT-0099 - Jeep Compass (Juan Carlos Pérez)', amount: 10500, currency: 'USD' },
    { id: 'cb_oct_3', date: '2026-10-10T11:45:00Z', type: 'income', category: 'sale', description: 'Cobro Venta VT-0100 - BMW X5 M Sport (Dr. Roberto Cantero)', amount: 74000, currency: 'USD' },
    { id: 'cb_oct_4', date: '2026-10-05T14:00:00Z', type: 'expense', category: 'services', description: 'Campaña Publicitaria Meta Ads y Google Ads Octubre', amount: 2800, currency: 'USD' },
    { id: 'cb_oct_5', date: '2026-10-08T16:00:00Z', type: 'expense', category: 'preparation', description: 'Mantenimiento mecánico y repuestos de flota', amount: 1450, currency: 'USD' }
  ];
  dbSet(DB_KEYS.cashbox, cashData);

  dbSet('erp_full_seeded_v6', true);
}

