// =====================================================
// AutoERP — CRM Pure Domain Service
// =====================================================

import { Clients, Leads } from '../core/store.js';

export function getCRMKPIs() {
  const allClients = Clients.all();
  const total = allClients.length;
  const activos = allClients.filter(c => c.segment === 'active').length;
  const prospectos = allClients.filter(c => c.segment === 'prospect').length;
  const inactivos = allClients.filter(c => c.segment === 'inactive').length;

  return {
    total,
    activos,
    prospectos,
    inactivos,
  };
}

export function filterClientsList(searchQuery = '', segment = '', origin = '') {
  const query = (searchQuery || '').toLowerCase();
  return Clients.all().filter(c => {
    const matchSearch = !query ||
      (c.name && c.name.toLowerCase().includes(query)) ||
      (c.document && c.document.includes(query)) ||
      (c.email && c.email.toLowerCase().includes(query));
    const matchSeg = segment ? c.segment === segment : true;
    const matchOri = origin ? c.leadOrigin === origin : true;
    return matchSearch && matchSeg && matchOri;
  });
}

export function getLeadPipelineData() {
  const stages = [
    { id: 'new', name: 'Nuevo Contacto', cls: 'badge-info' },
    { id: 'interested', name: 'Interesado', cls: 'badge-warning' },
    { id: 'quoted', name: 'Cotizado', cls: 'badge-gold' },
    { id: 'negotiation', name: 'Negociación', cls: 'badge-gold' },
    { id: 'won', name: 'Ganado', cls: 'badge-success' },
    { id: 'lost', name: 'Perdido', cls: 'badge-danger' }
  ];

  const grouped = {};
  stages.forEach(st => {
    grouped[st.id] = Leads.all().filter(l => l.stage === st.id);
  });

  return { stages, grouped };
}

export function saveClientRecord(clientData) {
  return Clients.save(clientData);
}

export function deleteClientRecord(id) {
  return Clients.delete(id);
}

export function saveLeadRecord(leadData) {
  return Leads.save(leadData);
}

export function deleteLeadRecord(id) {
  return Leads.delete(id);
}
