const fs = require('fs');
const emilCSS = `

/* =====================================================
   EMIL KOWALSKI DESIGN ENGINEERING - UI Polish Layer
   ===================================================== */

/* Button Active Press Feedback */
.btn:active, .btn-icon-ghost:active, .kanban-card:active { transform: scale(0.97); }
.btn-icon-ghost { transition: background-color 150ms cubic-bezier(0.23,1,0.32,1), transform 150ms cubic-bezier(0.23,1,0.32,1), color 150ms cubic-bezier(0.23,1,0.32,1); }

/* Cards: layered shadow lift */
.card { transition: box-shadow 200ms cubic-bezier(0.23,1,0.32,1), transform 200ms cubic-bezier(0.23,1,0.32,1), border-color 200ms cubic-bezier(0.23,1,0.32,1); }
.card:hover { box-shadow: 0 0 0 1px rgba(201,162,39,0.35), 0 4px 12px rgba(0,0,0,.35), 0 12px 32px rgba(0,0,0,.25); transform: translateY(-1px); }

/* Kanban card lift */
.kanban-card { transition: box-shadow 200ms cubic-bezier(0.23,1,0.32,1), transform 200ms cubic-bezier(0.23,1,0.32,1), border-color 200ms cubic-bezier(0.23,1,0.32,1); }
.kanban-card:hover { box-shadow: 0 0 0 1px rgba(201,162,39,0.35), 0 8px 20px rgba(0,0,0,.4), 0 16px 40px rgba(0,0,0,.25); transform: translateY(-2px); cursor: pointer; }

/* Modal entrance - scale from 0.95 + translateY */
@keyframes modal-enter { from { opacity: 0; transform: scale(0.95) translateY(8px); } to { opacity: 1; transform: scale(1) translateY(0); } }
@keyframes overlay-enter { from { opacity: 0; } to { opacity: 1; } }
.modal-overlay:not(.hidden) { animation: overlay-enter 180ms cubic-bezier(0.23,1,0.32,1) forwards; }
.modal-container { animation: modal-enter 220ms cubic-bezier(0.23,1,0.32,1) forwards; transform-origin: center center; }

/* Toast slide from right */
@keyframes toast-enter { from { opacity: 0; transform: translateX(20px) translateY(4px); } to { opacity: 1; transform: none; } }
.toast { animation: toast-enter 200ms cubic-bezier(0.23,1,0.32,1) forwards; }

/* Page fade on navigation */
@keyframes page-enter { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
.page-content { animation: page-enter 180ms cubic-bezier(0.23,1,0.32,1) forwards; }

/* Table row hover */
.table tbody tr { transition: background-color 120ms cubic-bezier(0.23,1,0.32,1); }
.table tbody tr:hover { background-color: var(--bg-card-hover); }

/* Form focus glow */
.form-control { transition: border-color 150ms cubic-bezier(0.23,1,0.32,1), box-shadow 150ms cubic-bezier(0.23,1,0.32,1); }
.form-control:focus { box-shadow: 0 0 0 3px rgba(201,162,39,0.2); }

/* Nav item transitions */
.nav-item { transition: background-color 150ms cubic-bezier(0.23,1,0.32,1), color 150ms cubic-bezier(0.23,1,0.32,1), transform 150ms cubic-bezier(0.23,1,0.32,1); }

/* Login card entrance */
@keyframes login-enter { from { opacity:0; transform:translateY(16px) scale(0.98); } to { opacity:1; transform:none; } }
.login-card { animation: login-enter 280ms cubic-bezier(0.23,1,0.32,1) forwards; }

/* Currency buttons */
.currency-btn { transition: background-color 150ms cubic-bezier(0.23,1,0.32,1), color 150ms cubic-bezier(0.23,1,0.32,1), transform 120ms cubic-bezier(0.23,1,0.32,1); }
.currency-btn:active { transform: scale(0.95); }

/* Sidebar smooth */
.sidebar { transition: width 220ms cubic-bezier(0.32,0.72,0,1), transform 220ms cubic-bezier(0.32,0.72,0,1); }

/* Stagger sections */
.page-header { animation: page-enter 150ms cubic-bezier(0.23,1,0.32,1) both; }
.dashboard-grid { animation: page-enter 200ms 50ms cubic-bezier(0.23,1,0.32,1) both; }

/* Accessibility */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
}
`;

const current = fs.readFileSync('style.css', 'utf8');
fs.writeFileSync('style.css', current + emilCSS, 'utf8');
console.log('Emil CSS appended successfully. New size:', (current + emilCSS).length);
