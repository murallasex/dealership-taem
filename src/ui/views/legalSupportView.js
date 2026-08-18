// =====================================================
// TAEM — Términos de Uso & Soporte Técnico
// =====================================================

import { safeCreateIcons } from '../../utils/dom.js';

export function renderTermsOfUse() {
  const container = document.getElementById('page-content');
  if (!container) return;

  container.innerHTML = `
    <div class="page-header" style="margin-bottom: 0.5rem;">
      <div>
        <h1 class="page-title" style="color: var(--gold);">Términos de Uso</h1>
        <p class="text-muted">Condiciones y términos de servicio del sistema.</p>
      </div>
    </div>

    <div class="card tos-card" style="padding: 2.5rem 2.5rem 2rem; margin-top: 1.5rem;">

      <section class="tos-section">
        <h2 class="tos-heading">1. Aceptación de los Términos</h2>
        <p class="tos-text">
          Al acceder y utilizar este sistema de gestión de concesionarias, usted acepta estar sujeto a estos Términos de Uso.
          Este software ha sido desarrollado y diseñado exclusivamente por <strong>TAEM (Technologies Automation Engineering Management)</strong>
          para la optimización de procesos internos, ventas y gestión de clientes.
        </p>
      </section>

      <section class="tos-section">
        <h2 class="tos-heading">2. Uso y Privacidad de la Información</h2>
        <p class="tos-text">
          Los datos ingresados, incluyendo pero no limitado a: información de clientes, empresas corporativas, detalles de ventas,
          cobros y estadísticas financieras, son propiedad estricta de la empresa. Está determinantemente prohibida la exportación,
          duplicación o divulgación de información confidencial sin la autorización previa de los administradores del sistema.
        </p>
      </section>

      <section class="tos-section">
        <h2 class="tos-heading">3. Responsabilidades del Usuario</h2>
        <p class="tos-text">
          El usuario se compromete a realizar un uso ético y laboral del sistema. Cualquier manipulación indebida, intento de fraude,
          o alteración no autorizada de los datos registrados será considerada una falta grave y será responsabilidad directa de la
          cuenta que ejecutó la acción.
        </p>
      </section>

      <section class="tos-section">
        <h2 class="tos-heading">4. Propiedad Intelectual</h2>
        <p class="tos-text">
          Todo el código, diseño, arquitectura de base de datos e interfaz gráfica de esta plataforma son propiedad intelectual de
          <strong>TAEM (Technologies Automation Engineering Management)</strong>. Queda prohibida la reproducción parcial o total del
          software para su comercialización a terceros sin un acuerdo legal.
        </p>
      </section>

      <section class="tos-section" style="border-bottom: none; padding-bottom: 0;">
        <h2 class="tos-heading">5. Actualizaciones y Soporte</h2>
        <p class="tos-text">
          El equipo de desarrollo se reserva el derecho de implementar actualizaciones, realizar mantenimiento o modificar funciones
          del sistema para garantizar el mejor rendimiento. En caso de experimentar anomalías, por favor diríjase al apartado de
          "Soporte Técnico".
        </p>
      </section>
    </div>

    <div class="tos-footer">
      <div class="tos-footer-line"></div>
      <p class="tos-footer-text">
        Desarrollado y diseñado con pasión por <strong>TAEM (Technologies Automation Engineering Management)</strong>
      </p>
      <p class="tos-footer-copy">© 2026 Tripify. Todos los derechos reservados.</p>
    </div>
  `;

  safeCreateIcons({ nodes: [container] });
}

export function renderSupport() {
  const container = document.getElementById('page-content');
  if (!container) return;

  const today = new Date();
  const formattedDate = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;

  container.innerHTML = `
    <div class="page-header" style="margin-bottom: 0.5rem;">
      <div>
        <h1 class="page-title" style="color: var(--gold);">Soporte Técnico</h1>
        <p class="text-muted">¿Tienes algún problema con el sistema? Contáctanos para ayudarte.</p>
      </div>
    </div>

    <div class="support-grid" style="margin-top: 1.5rem;">

      <!-- Contacto Directo -->
      <div class="card support-card">
        <div class="support-card__header">
          <h3 class="support-card__title">Contacto Directo</h3>
        </div>
        <div class="support-card__body">
          <p class="support-card__desc">
            Si experimentas alguna falla técnica, error de visualización o requieres asistencia con el manejo del sistema,
            puedes comunicarte directamente con el equipo de desarrollo a cargo de <strong>TAEM (Technologies Automation Engineering Management)</strong>.
          </p>

          <div class="support-contacts">
            <div class="support-contact-item">
              <i data-lucide="phone" class="support-contact-icon"></i>
              <span><strong>+595 0994 450 320</strong> - Axel Gonzalez</span>
            </div>
            <div class="support-contact-item">
              <i data-lucide="phone" class="support-contact-icon"></i>
              <span><strong>+595 0995 666 020</strong> - Enzo Ruffinelli</span>
            </div>
            <div class="support-contact-item">
              <i data-lucide="phone" class="support-contact-icon"></i>
              <span><strong>+595 0992 985 714</strong> - Lucas Riveros</span>
            </div>
            <div class="support-contact-item">
              <i data-lucide="phone" class="support-contact-icon"></i>
              <span><strong>+595 0972 116 345</strong> - Thiago Fernandez</span>
            </div>

            <div class="support-contact-item" style="margin-top: 0.5rem;">
              <i data-lucide="mail" class="support-contact-icon"></i>
              <span><strong>contacto.taem@gmail.com</strong></span>
            </div>
          </div>

          <p class="support-schedule">
            * Horario de atención para soporte: Lunes a Viernes, de 08:00 a 18:00 hs. Las fallas críticas pueden ser
            reportadas por WhatsApp 24/7.
          </p>

          <a href="https://wa.me/5950994450320?text=Hola%20TAEM%2C%20necesito%20soporte%20t%C3%A9cnico" target="_blank" rel="noopener" class="support-cta-btn">
            Contactar Soporte Principal
          </a>
        </div>
      </div>

      <!-- Detalles del Sistema -->
      <div class="card support-card">
        <div class="support-card__header">
          <h3 class="support-card__title">Detalles del Sistema</h3>
        </div>
        <div class="support-card__body">
          <div class="support-system-info">
            <div class="support-info-row">
              <span class="support-info-label">Versión del Software:</span>
              <span class="support-info-value">v2.0.4 (Estable)</span>
            </div>
            <div class="support-info-row">
              <span class="support-info-label">Licencia:</span>
              <span class="support-info-value" style="color: var(--success);">Activa</span>
            </div>
            <div class="support-info-row">
              <span class="support-info-label">Desarrollado por:</span>
              <span class="support-info-value">TAEM (Technologies Automation Engineering Management)</span>
            </div>
            <div class="support-info-row" style="border-bottom: none;">
              <span class="support-info-label">Última actualización:</span>
              <span class="support-info-value">${formattedDate}</span>
            </div>
          </div>

          <div class="support-status-banner">
            <i data-lucide="check-circle" style="width: 18px; height: 18px; color: var(--success); flex-shrink: 0;"></i>
            <span>Tu sistema se encuentra en su versión más reciente y operando con normalidad.</span>
          </div>
        </div>
      </div>
    </div>
  `;

  safeCreateIcons({ nodes: [container] });
}
