import User from '../../auth/models/User.model';
import Role from '../../auth/models/Role.model';
import emailService from '../../../services/emailService';
import type { SuscripcionSummary } from '../../saas/delegates/SuscripcionDelegate';

class SubscriptionBillingNotificationDelegate {
  private loginUrl(): string {
    const base = (process.env.FRONTEND_PUBLIC_URL ?? 'http://127.0.0.1:8010').replace(/\/$/, '');
    return `${base}/login`;
  }

  private checkoutUrl(empresaId: string): string {
    const base = (process.env.FRONTEND_PUBLIC_URL ?? 'http://127.0.0.1:8010').replace(/\/$/, '');
    return `${base}/checkout?empresaId=${encodeURIComponent(empresaId)}`;
  }

  private async findPrimaryAdmin(empresaId: string): Promise<{ fullName: string; email: string } | null> {
    const adminRole = await Role.findOne({ where: { name: 'ADMIN' } });
    if (!adminRole) return null;
    const roleId = String(adminRole.getDataValue('id') ?? adminRole.id);
    const user = await User.findOne({
      where: { empresaId, roleId, isActive: true },
      order: [['createdAt', 'ASC']],
      attributes: ['fullName', 'email'],
    });
    if (!user) return null;
    return { fullName: user.fullName, email: user.email.trim().toLowerCase() };
  }

  async notifyGracePeriod(input: {
    empresaId: string;
    negocio: string;
    suscripcion: SuscripcionSummary;
  }): Promise<void> {
    const admin = await this.findPrimaryAdmin(input.empresaId);
    if (!admin) return;

    const graceDate = input.suscripcion.graceHasta
      ? new Date(input.suscripcion.graceHasta).toLocaleDateString('es-CL')
      : '—';

    const text = [
      `Hola ${admin.fullName},`,
      '',
      `La suscripción de ${input.negocio} en POS-AI venció, pero tienes un período de gracia hasta ${graceDate}.`,
      '',
      'Renueva antes de esa fecha para evitar la suspensión del acceso:',
      `  ${this.checkoutUrl(input.empresaId)}`,
      '',
      `O inicia sesión: ${this.loginUrl()}`,
      '',
      '— Equipo POS-AI',
    ].join('\n');

    const result = await emailService.send({
      to: admin.email,
      subject: `POS-AI — período de gracia · ${input.negocio}`,
      text,
    });
    if (!result.success) {
      console.warn('[EMAIL] grace notice failed:', result.error);
    }
  }

  async notifySuspended(input: {
    empresaId: string;
    negocio: string;
  }): Promise<void> {
    const admin = await this.findPrimaryAdmin(input.empresaId);
    if (!admin) return;

    const text = [
      `Hola ${admin.fullName},`,
      '',
      `El acceso de ${input.negocio} a POS-AI fue suspendido por suscripción vencida.`,
      '',
      'Para reactivar, completa el pago de renovación:',
      `  ${this.checkoutUrl(input.empresaId)}`,
      '',
      'Si ya pagaste y el acceso no se restauró, contacta soporte.',
      '',
      '— Equipo POS-AI',
    ].join('\n');

    const result = await emailService.send({
      to: admin.email,
      subject: `POS-AI — acceso suspendido · ${input.negocio}`,
      text,
    });
    if (!result.success) {
      console.warn('[EMAIL] suspend notice failed:', result.error);
    }
  }
}

export default new SubscriptionBillingNotificationDelegate();
