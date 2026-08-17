// =====================================================
// AutoERP — Header Component & Notification Badge
// =====================================================

import { Notifications } from '../../core/store.js';

export function updateNotifBadge() {
  const unread = Notifications.unread().length;
  ['notif-badge', 'header-notif-count'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = unread;
    el.style.display = unread > 0 ? '' : 'none';
  });
}
