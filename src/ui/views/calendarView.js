// =====================================================
// AutoERP — Calendar View
// =====================================================

import { CalendarEvents, Clients, Sellers, Sales, generateId, now } from '../../core/store.js';
import { safeCreateIcons } from '../../utils/dom.js';
import { showToast } from '../components/toast.js';
import { openModal, closeModal, confirmDialog } from '../components/modal.js';

let currentDate = new Date();

export function renderCalendar() {
  const container = document.getElementById('page-content');
  if (!container) return;

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  
  // Calculate days in month and first day of month
  const firstDay = new Date(year, month, 1).getDay(); // 0 = Sunday, 1 = Monday
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  // Adjust so Monday is first day of grid
  const startOffset = firstDay === 0 ? 6 : firstDay - 1;

  // Retrieve events
  const allEvents = CalendarEvents.all();
  const allClients = Clients.all();
  const allSales = Sales.all(); 
  
  // To say "cliente de Mauricio Rodas", we need to see which seller sold to them.
  const clientToSellerMap = {};
  allSales.forEach(s => {
    if (!clientToSellerMap[s.clientId]) {
      const seller = Sellers.find(s.sellerId);
      if (seller) clientToSellerMap[s.clientId] = seller.name;
    }
  });

  // Prepare calendar grid days
  const days = [];
  
  // Fill empty slots before 1st of month
  for (let i = 0; i < startOffset; i++) {
    days.push({ empty: true });
  }
  
  // Fill actual days
  for (let d = 1; d <= daysInMonth; d++) {
    const dateObj = new Date(year, month, d);
    const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    
    // Find events for this day
    const dayEvents = [];

    // Explicit events
    allEvents.forEach(ev => {
      if (ev.recurrence === 'none' && ev.date === dateString) {
        dayEvents.push(ev);
      } else if (ev.recurrence === 'monthly') {
        const evDay = parseInt(ev.date.split('-')[2]);
        if (evDay === d && new Date(ev.date) <= dateObj) {
          dayEvents.push(ev);
        }
      } else if (ev.recurrence === 'yearly') {
        const evMonth = parseInt(ev.date.split('-')[1]) - 1;
        const evDay = parseInt(ev.date.split('-')[2]);
        if (evMonth === month && evDay === d && new Date(ev.date) <= dateObj) {
          dayEvents.push(ev);
        }
      }
    });

    // Client birthdays (Virtual Events)
    allClients.forEach(c => {
      if (c.birthDate) {
        const bMonth = parseInt(c.birthDate.split('-')[1]) - 1;
        const bDay = parseInt(c.birthDate.split('-')[2]);
        
        if (bMonth === month && bDay === d) {
          const sellerName = clientToSellerMap[c.id] ? ` (Cliente de ${clientToSellerMap[c.id]})` : '';
          dayEvents.push({
            id: 'virtual_bday_' + c.id,
            title: `Cumpleaños de ${c.name}${sellerName}`,
            color: '#eab308',
            isVirtual: true
          });
        }
      }
    });

    days.push({
      date: d,
      fullDate: dateString,
      events: dayEvents,
      isToday: dateString === new Date().toISOString().split('T')[0]
    });
  }

  // HTML Rendering
  let content = `
    <div class="page-header" style="margin-bottom: 1.5rem; display: flex; justify-content: space-between; align-items: center;">
      <div>
        <h1 class="page-title">Calendario</h1>
        <div class="page-subtitle">Eventos de la empresa y cumpleaños de clientes</div>
      </div>
      <div style="display: flex; gap: 1rem; align-items: center;">
        <div class="calendar-nav" style="display: flex; gap: 0.5rem; align-items: center; margin-right: 1rem;">
          <button class="btn btn-sm btn-ghost" id="btn-prev-month"><i data-lucide="chevron-left"></i></button>
          <span style="font-size: 1.1rem; font-weight: 600; min-width: 150px; text-align: center;">${monthNames[month]} ${year}</span>
          <button class="btn btn-sm btn-ghost" id="btn-next-month"><i data-lucide="chevron-right"></i></button>
          <button class="btn btn-sm btn-secondary" id="btn-today" style="margin-left: 0.5rem;">Hoy</button>
        </div>
        <button class="btn btn-primary" id="btn-new-event">
          <i data-lucide="plus"></i> Nuevo Evento
        </button>
      </div>
    </div>

    <div class="card" style="padding: 0; overflow: hidden; border: 1px solid var(--border);">
      <div class="calendar-grid">
        <div class="calendar-header-row" style="display: grid; grid-template-columns: repeat(7, 1fr); background: var(--bg-hover); border-bottom: 1px solid var(--border); text-align: center; padding: 0.75rem 0; font-weight: 600; color: var(--text-muted); font-size: 0.85rem; text-transform: uppercase;">
          <div>Lunes</div>
          <div>Martes</div>
          <div>Miércoles</div>
          <div>Jueves</div>
          <div>Viernes</div>
          <div>Sábado</div>
          <div>Domingo</div>
        </div>
        <div class="calendar-days" style="display: grid; grid-template-columns: repeat(7, 1fr); min-height: 600px; background: var(--border); gap: 1px;">
          ${days.map(day => {
            if (day.empty) return `<div class="calendar-day empty" style="background: var(--bg-card); min-height: 120px; opacity: 0.5;"></div>`;
            return `
              <div class="calendar-day ${day.isToday ? 'today' : ''}" data-date="${day.fullDate}" style="background: var(--bg-card); min-height: 120px; padding: 0.5rem; transition: background 0.2s; cursor: pointer; ${day.isToday ? 'background: rgba(201, 162, 39, 0.05);' : ''}">
                <div class="calendar-day-num" style="display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 50%; font-size: 0.85rem; font-weight: 600; margin-bottom: 0.5rem; ${day.isToday ? 'background: var(--gold); color: #000;' : 'color: var(--text-muted);'}">${day.date}</div>
                <div class="calendar-events" style="display: flex; flex-direction: column; gap: 0.25rem;">
                  ${day.events.map(e => `
                    <div class="calendar-event" style="border-left: 3px solid ${e.color}; background: ${e.color}15; padding: 0.25rem 0.5rem; border-radius: 0 4px 4px 0; font-size: 0.75rem; color: ${e.color}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; cursor: pointer;" data-id="${e.id}" data-virtual="${e.isVirtual ? 'true' : 'false'}" title="${e.title}">
                      ${e.title}
                    </div>
                  `).join('')}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>
  `;

  container.innerHTML = content;
  safeCreateIcons({ nodes: [container] });

  // Event Listeners
  document.getElementById('btn-prev-month').addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar();
  });
  
  document.getElementById('btn-next-month').addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar();
  });
  
  document.getElementById('btn-today').addEventListener('click', () => {
    currentDate = new Date();
    renderCalendar();
  });

  document.getElementById('btn-new-event').addEventListener('click', () => {
    openEventModal();
  });

  container.querySelectorAll('.calendar-event').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = el.dataset.id;
      const isVirtual = el.dataset.virtual === 'true';
      if (!isVirtual) {
        openEventModal(id);
      } else {
        showToast('Este es un evento automático generado a partir de la fecha de nacimiento del cliente.', 'info');
      }
    });
  });
  
  container.querySelectorAll('.calendar-day:not(.empty)').forEach(el => {
    el.addEventListener('click', () => {
      openEventModal(null, el.dataset.date);
    });
    el.addEventListener('mouseenter', () => { el.style.background = 'var(--bg-hover)'; });
    el.addEventListener('mouseleave', () => { el.style.background = el.classList.contains('today') ? 'rgba(201, 162, 39, 0.05)' : 'var(--bg-card)'; });
  });
}

function openEventModal(id = null, defaultDate = null) {
  let ev = { title: '', date: defaultDate || new Date().toISOString().split('T')[0], recurrence: 'none', color: '#3b82f6', type: 'company' };
  
  if (id) {
    ev = CalendarEvents.find(id) || ev;
  }

  const modalHtml = `
    <form id="event-form">
      <div class="form-grid">
        <div class="form-group" style="grid-column: span 2;">
          <label>Título del Evento</label>
          <input type="text" id="ev-title" class="form-control" required value="${ev.title}">
        </div>
        
        <div class="form-group">
          <label>Fecha</label>
          <input type="date" id="ev-date" class="form-control" required value="${ev.date}">
        </div>
        
        <div class="form-group">
          <label>Recurrencia</label>
          <select id="ev-recurrence" class="form-control">
            <option value="none" ${ev.recurrence === 'none' ? 'selected' : ''}>Una sola vez</option>
            <option value="monthly" ${ev.recurrence === 'monthly' ? 'selected' : ''}>Mensual</option>
            <option value="yearly" ${ev.recurrence === 'yearly' ? 'selected' : ''}>Anual</option>
          </select>
        </div>

        <div class="form-group">
          <label>Color</label>
          <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem;">
            ${['#3b82f6', '#ef4444', '#22c55e', '#a855f7', '#eab308'].map(c => `
              <div class="color-picker-btn" data-color="${c}" style="width: 24px; height: 24px; border-radius: 50%; background: ${c}; cursor: pointer; border: 2px solid ${ev.color === c ? '#fff' : 'transparent'};"></div>
            `).join('')}
          </div>
          <input type="hidden" id="ev-color" value="${ev.color}">
        </div>
      </div>
      
      <div style="display:flex; justify-content: space-between; align-items:center; margin-top: 2rem;">
        ${id ? `<button type="button" class="btn btn-ghost" id="btn-delete-event" style="color: var(--danger-color);"><i data-lucide="trash-2"></i> Eliminar</button>` : '<div></div>'}
        <div style="display:flex; gap:1rem;">
          <button type="button" class="btn btn-ghost" onclick="window._closeModal()">Cancelar</button>
          <button type="submit" class="btn btn-primary">Guardar Evento</button>
        </div>
      </div>
    </form>
  `;

  openModal(id ? 'Editar Evento' : 'Nuevo Evento', modalHtml);

  // Color picker logic
  const colorBtns = document.querySelectorAll('.color-picker-btn');
  const colorInput = document.getElementById('ev-color');
  colorBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      colorBtns.forEach(b => b.style.border = '2px solid transparent');
      e.target.style.border = '2px solid #fff';
      colorInput.value = e.target.dataset.color;
    });
  });

  document.getElementById('event-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const data = {
      id: id || generateId(),
      title: document.getElementById('ev-title').value,
      date: document.getElementById('ev-date').value,
      recurrence: document.getElementById('ev-recurrence').value,
      color: document.getElementById('ev-color').value,
      type: 'company'
    };

    CalendarEvents.save(data);
    showToast(id ? 'Evento actualizado' : 'Evento creado', 'success');
    closeModal();
    renderCalendar();
  });

  if (id) {
    document.getElementById('btn-delete-event').addEventListener('click', () => {
      confirmDialog('¿Estás seguro de eliminar este evento?', () => {
        CalendarEvents.delete(id);
        showToast('Evento eliminado', 'success');
        closeModal();
        renderCalendar();
      });
    });
  }
}
