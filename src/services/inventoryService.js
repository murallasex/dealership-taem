// =====================================================
// AutoERP — Inventory Pure Domain Service
// =====================================================

import { Vehicles } from '../core/store.js';

export function calculateMargin(vehicle) {
  if (!vehicle) return 0;
  const cost = (vehicle.purchaseCost || 0) + (vehicle.importCosts || 0) + (vehicle.prepCost || 0) + (vehicle.commission || 0);
  const suggested = vehicle.suggestedPrice || 0;
  return suggested - cost;
}

export function getInventoryKPIs() {
  const all = Vehicles.all();
  const available = all.filter(v => v.commercialStatus === 'available');
  
  let totalDays = 0;
  const now = new Date();
  available.forEach(v => {
    const d = new Date(v.receptionDate || v.createdAt);
    if (!isNaN(d)) {
      totalDays += Math.max(0, Math.floor((now - d) / (1000 * 60 * 60 * 24)));
    }
  });
  const avgDaysInStock = available.length > 0 ? Math.round(totalDays / available.length) : 0;

  return {
    total: all.length,
    available: available.length,
    reserved: all.filter(v => v.commercialStatus === 'reserved').length,
    sold: all.filter(v => v.commercialStatus === 'sold').length,
    avgDaysInStock
  };
}

export function filterVehicles(query = '', condition = '', status = '') {
  const q = (query || '').toLowerCase();
  return Vehicles.all().filter(v => {
    const matchQ = !q || (v.brand && v.brand.toLowerCase().includes(q)) ||
                       (v.model && v.model.toLowerCase().includes(q)) ||
                       (v.vin && v.vin.toLowerCase().includes(q));
    const matchCond = !condition || v.condition === condition;
    const matchStat = !status || v.commercialStatus === status;
    return matchQ && matchCond && matchStat;
  });
}

export function getVehicleById(id) {
  return Vehicles.find(id);
}

export function saveVehicle(vehicleData) {
  return Vehicles.save(vehicleData);
}

export function deleteVehicle(id) {
  return Vehicles.delete(id);
}
