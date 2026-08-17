// =====================================================
// AutoERP — Modal Component
// =====================================================

import { safeCreateIcons } from '../../utils/dom.js';

export function openModal(title, bodyHTML = '', footerHTML = '', sizeClass = '') {
  const overlay = document.getElementById('global-modal');
  const container = document.getElementById('modal-container');
  if (!overlay || !container) return;

  // Support single argument modal calls (e.g. openModal(fullHTMLString))
  if (arguments.length === 1 && typeof title === 'string' && (title.includes('<') || !title.includes(' '))) {
    const bodyEl = document.getElementById('modal-body');
    if (bodyEl) bodyEl.innerHTML = title;
    overlay.classList.remove('hidden');
    safeCreateIcons({ nodes: [overlay] });
    return;
  }

  const titleEl = document.getElementById('modal-title');
  const bodyEl = document.getElementById('modal-body');
  const footerEl = document.getElementById('modal-footer');
  if (titleEl) titleEl.textContent = title;
  if (bodyEl) bodyEl.innerHTML = bodyHTML;
  if (footerEl) footerEl.innerHTML = footerHTML;
  container.className = 'modal-container ' + sizeClass;
  overlay.classList.remove('hidden');
  safeCreateIcons({ nodes: [overlay] });
}

export function closeModal(modalId = null) {
  if (modalId && typeof modalId === 'string') {
    const target = document.getElementById(modalId);
    if (target && typeof target.close === 'function') {
      target.close();
      return;
    }
    if (target) {
      target.classList.add('hidden');
      target.classList.remove('active');
      return;
    }
  }

  const overlay = document.getElementById('global-modal');
  if (!overlay || overlay.classList.contains('hidden')) return;

  overlay.classList.add('modal-exiting');
  setTimeout(() => {
    overlay.classList.add('hidden');
    overlay.classList.remove('modal-exiting');
  }, 200);
}

export function confirmDialog(message, onConfirm, title = 'Confirmar acción') {
  openModal(title, `
    <div style="display:flex;gap:1rem;align-items:flex-start;">
      <div style="background:var(--danger-dim);border-radius:50%;width:44px;height:44px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
        <i data-lucide="alert-triangle" style="width:22px;height:22px;color:var(--danger)"></i>
      </div>
      <p style="color:var(--text-secondary);line-height:1.7;padding-top:0.25rem;">${message}</p>
    </div>
  `, `
    <button class="btn btn-secondary" onclick="window._closeModal()">Cancelar</button>
    <button class="btn btn-danger" id="confirm-btn">Confirmar</button>
  `, 'modal-sm');
  window._closeModal = closeModal;
  const btn = document.getElementById('confirm-btn');
  if (btn) btn.onclick = () => { closeModal(); onConfirm(); };
}

export function initModalSystem() {
  const closeBtn = document.getElementById('modal-close-btn');
  if (closeBtn) closeBtn.addEventListener('click', () => closeModal());
  const modalOverlay = document.getElementById('global-modal');
  if (modalOverlay) {
    modalOverlay.addEventListener('click', (e) => {
      if (e.target.id === 'global-modal') closeModal();
    });
  }
}
