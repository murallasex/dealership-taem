// =====================================================
// AutoERP — Notifications Pure Domain Service
// =====================================================

import { EmailTemplates, EmailLog, Clients, Financing, Notifications, generateId, now } from '../core/store.js';

export function getNotificationsKPIs() {
  const activeTemplates = EmailTemplates.all().filter(t => t.active).length;
  const totalSent = EmailLog.all().length;
  const successSent = EmailLog.all().filter(l => l.status === 'sent').length;
  const failedSent = EmailLog.all().filter(l => l.status === 'failed').length;
  const successRate = totalSent > 0 ? ((successSent / totalSent) * 100).toFixed(1) : 0;

  return {
    activeTemplates,
    totalSent,
    successSent,
    failedSent,
    successRate,
  };
}

export function getUnreadCount() {
  return Notifications.unread().length;
}

export function markNotificationRead(id) {
  Notifications.markRead(id);
}

export function markAllNotificationsRead() {
  Notifications.markAllRead();
}

export function filterEmailHistory(status = '', type = '', dateStr = '') {
  let filtered = EmailLog.all().sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt));

  if (status) {
    filtered = filtered.filter(l => l.status === status);
  }
  if (type) {
    filtered = filtered.filter(l => {
      const t = EmailTemplates.find(l.templateId);
      return t && t.type === type;
    });
  }
  if (dateStr) {
    filtered = filtered.filter(l => l.sentAt && l.sentAt.startsWith(dateStr));
  }
  return filtered;
}

export function saveTemplateData(templateData) {
  return EmailTemplates.save(templateData);
}

export function simulateDueNotificationEmails() {
  const template = EmailTemplates.all().find(t => t.type === 'installment_due' && t.active);
  if (!template) return 0;

  let count = 0;
  Financing.all().forEach(fin => {
    const client = Clients.find(fin.clientId);
    if (!client) return;
    const dueInstallments = (fin.payments || []).filter(i => i.status === 'pending');
    if (dueInstallments.length > 0) {
      EmailLog.save({
        id: generateId(),
        templateId: template.id,
        clientId: client.id,
        clientName: client.name,
        email: client.email || 'correo@ejemplo.com',
        subject: template.subject,
        status: 'sent',
        sentAt: now()
      });
      count++;
    }
  });
  return count;
}

export function simulateOverdueNotificationEmails() {
  const template = EmailTemplates.all().find(t => t.type === 'installment_overdue' && t.active);
  if (!template) return 0;

  let count = 0;
  Financing.all().forEach(fin => {
    const client = Clients.find(fin.clientId);
    if (!client) return;
    const overdueInstallments = (fin.payments || []).filter(i => i.status === 'overdue');
    if (overdueInstallments.length > 0) {
      EmailLog.save({
        id: generateId(),
        templateId: template.id,
        clientId: client.id,
        clientName: client.name,
        email: client.email || 'correo@ejemplo.com',
        subject: template.subject,
        status: 'sent',
        sentAt: now()
      });
      count++;
    }
  });
  return count;
}
