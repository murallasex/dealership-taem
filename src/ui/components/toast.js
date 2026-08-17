// =====================================================
// AutoERP — Toast Component
// =====================================================

import { safeCreateIcons } from '../../utils/dom.js';

export function dismissToast(div) {
  if (!div || div.classList.contains('toast-exiting')) return;
  div.classList.add('toast-exiting');
  setTimeout(() => {
    if (div.parentNode) div.remove();
  }, 160);
}

export function showToast(message, type = 'info', duration = 3500) {
  const icons = { success: 'check-circle', error: 'x-circle', warning: 'alert-triangle', info: 'info' };
  const container = document.getElementById('toast-container');
  if (!container) return;
  const id = 'toast-' + Date.now();
  const div = document.createElement('div');
  div.className = `toast toast-${type}`;
  div.id = id;
  div.innerHTML = `
    <i data-lucide="${icons[type] || 'info'}"></i>
    <span class="toast-message">${message}</span>
    <span class="toast-close">
      <i data-lucide="x"></i>
    </span>
  `;
  const closeBtn = div.querySelector('.toast-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => dismissToast(div));
  }
  container.appendChild(div);
  safeCreateIcons({ nodes: [div] });
  setTimeout(() => dismissToast(div), duration);
}
