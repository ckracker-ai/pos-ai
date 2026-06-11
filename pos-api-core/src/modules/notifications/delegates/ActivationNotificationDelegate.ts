import User from '../../auth/models/User.model';
import Role from '../../auth/models/Role.model';
import emailService from '../../../services/emailService';
import type { EmpresaRecord } from '../../tenant/delegates/EmpresaDelegate';
import type { SuscripcionSummary } from '../../saas/delegates/SuscripcionDelegate';
import { getPlanDisplayName } from '../../saas/utils/planDisplay';
import type { SaasPlanCodigo } from '../../saas/constants/planCodes';

class ActivationNotificationDelegate {
  private loginUrl(): string {
    const base = (process.env.FRONTEND_PUBLIC_URL ?? 'http://127.0.0.1:8010').replace(/\/$/, '');
    return `${base}/login`;
  }

  private platformInbox(): string | null {
    const email = process.env.PLATFORM_ADMIN_EMAIL?.trim();
    return email && email.includes('@') ? email : null;
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

  async notifySubscriptionActivated(input: {
    empresa: EmpresaRecord;
    suscripcion: SuscripcionSummary;
    paymentRef: string;
    provider: string;
  }): Promise<void> {
    const admin = await this.findPrimaryAdmin(input.empresa.id);
    if (!admin) {
      console.warn(`[EMAIL] Sin admin activo para empresa ${input.empresa.id} — omitiendo bienvenida`);
      return;
    }

    const negocio =
      input.empresa.nombreFantasia?.trim() || input.empresa.razonSocial?.trim() || 'Tu negocio';
    const planCodigo = (input.empresa.plan?.codigo ?? 'BASICO') as SaasPlanCodigo;
    const planLabel = input.empresa.plan
      ? getPlanDisplayName(planCodigo, input.empresa.plan.nombre)
      : 'Plan POS-AI';

    const loginUrl = this.loginUrl();
    const platformCc = this.platformInbox();

    const tenantText = [
      `Hola ${admin.fullName},`,
      '',
      `¡${negocio} ya está activo en POS-AI!`,
      '',
      `Plan: ${planLabel}`,
      `Referencia de pago: ${input.provider} · ${input.paymentRef}`,
      '',
      'Acceso al sistema:',
      `  URL: ${loginUrl}`,
      `  Correo: ${admin.email}`,
      '  Contraseña: la que definiste al registrarte (si la olvidaste, contacta soporte).',
      '',
      'Próximos pasos: inicia sesión, revisa tu catálogo y configura la sucursal activa en el encabezado.',
      '',
      '— Equipo POS-AI',
    ].join('\n');

    const tenantResult = await emailService.send({
      to: admin.email,
      subject: `POS-AI — ${negocio} activo · ${planLabel}`,
      text: tenantText,
    });
    if (!tenantResult.success) {
      console.warn('[EMAIL] Bienvenida tenant falló:', tenantResult.error);
    }

    if (!platformCc) return;

    const opsText = [
      'Nueva empresa activada (checkout SaaS)',
      '',
      `Negocio: ${negocio}`,
      `RUT: ${input.empresa.rutEmpresa}`,
      `Slug: ${input.empresa.slug}`,
      `Plan: ${planLabel}`,
      `Admin: ${admin.fullName} <${admin.email}>`,
      `Pago: ${input.provider} · ${input.paymentRef}`,
      `Suscripción: ${input.suscripcion.estado} · vence ${input.suscripcion.venceEn ?? '—'}`,
      '',
      'Verificar: pago en pasarela/sandbox, plan asignado, binding WSP si aplica.',
      `Panel: ${loginUrl.replace('/login', '/platform/empresas')}`,
    ].join('\n');

    const opsResult = await emailService.send({
      to: platformCc,
      subject: `[POS-AI Ops] Alta activa — ${negocio}`,
      text: opsText,
    });
    if (!opsResult.success) {
      console.warn('[EMAIL] Aviso plataforma falló:', opsResult.error);
    }
  }
}

export default new ActivationNotificationDelegate();
