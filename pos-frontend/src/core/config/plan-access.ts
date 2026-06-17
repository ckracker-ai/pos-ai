import type { Empresa, EmpresaPlanSummary, SaasPlanFeatures } from '@/core/interfaces';

export type ResolvedPlanFeatures = SaasPlanFeatures & { codigo: string };

/** Features efectivas del plan (fallback por código si BD incompleta). */
export function resolvePlanFeatures(plan?: EmpresaPlanSummary | null): ResolvedPlanFeatures {
  const codigo = String(plan?.codigo ?? 'BASICO').toUpperCase();
  const f = plan?.features;
  return {
    modulosCore: f?.modulosCore ?? true,
    assistantWhatsapp:
      f?.assistantWhatsapp === true || codigo === 'ESTANDAR' || codigo === 'FULL',
    assistantVoz: f?.assistantVoz === true || codigo === 'FULL',
    pagosOnline: f?.pagosOnline === true || codigo === 'FULL',
    codigo,
  };
}

const MODULE_PLAN_REQUIREMENTS: Partial<Record<string, keyof SaasPlanFeatures>> = {
  comprobantes: 'assistantWhatsapp',
};

export function isPlanModuleEnabled(
  moduleKey: string,
  plan?: EmpresaPlanSummary | null
): boolean {
  const required = MODULE_PLAN_REQUIREMENTS[moduleKey];
  if (!required) return true;
  return resolvePlanFeatures(plan)[required] === true;
}

export type SubscriptionAlertTone = 'info' | 'warning' | 'danger';

export type SubscriptionAlert = {
  tone: SubscriptionAlertTone;
  title: string;
  message: string;
  showCheckout: boolean;
};

function daysUntil(iso: string): number {
  const end = new Date(iso);
  const now = new Date();
  return Math.ceil((end.getTime() - now.getTime()) / 86_400_000);
}

function formatDateCl(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' });
}

const CHECKOUT_ELIGIBLE = new Set(['PILOTO', 'GRACIA', 'VENCIDA']);

export function canRenewSubscription(empresa: Empresa | null | undefined): boolean {
  const estado = String(empresa?.suscripcion?.estado ?? '').toUpperCase();
  return CHECKOUT_ELIGIBLE.has(estado);
}

/** Banner tenant según estado de suscripción (gracia, piloto por vencer). */
export function getSubscriptionAlert(empresa: Empresa | null | undefined): SubscriptionAlert | null {
  const sub = empresa?.suscripcion;
  if (!sub) return null;

  const estado = String(sub.estado ?? '').toUpperCase();

  if (estado === 'GRACIA') {
    return {
      tone: 'warning',
      title: 'Suscripción en período de gracia',
      message: sub.graceHasta
        ? `Renueva antes del ${formatDateCl(sub.graceHasta)} para evitar la suspensión del servicio.`
        : 'Renueva tu suscripción para evitar la suspensión del servicio.',
      showCheckout: true,
    };
  }

  if (estado === 'PILOTO' && sub.venceEn) {
    const days = daysUntil(sub.venceEn);
    if (days <= 14) {
      return {
        tone: days <= 7 ? 'warning' : 'info',
        title: days <= 0 ? 'Período piloto vencido' : `Piloto vence en ${days} día(s)`,
        message:
          days <= 0
            ? 'Activa tu suscripción para seguir usando POS-AI sin interrupciones.'
            : `El piloto termina el ${formatDateCl(sub.venceEn)}. Activa tu plan cuando estés listo.`,
        showCheckout: true,
      };
    }
  }

  if (estado === 'ACTIVA' && sub.proximoCobroEn) {
    const days = daysUntil(sub.proximoCobroEn);
    if (days >= 0 && days <= 7) {
      return {
        tone: 'info',
        title: 'Próximo cobro de suscripción',
        message: `La renovación está programada para el ${formatDateCl(sub.proximoCobroEn)}.`,
        showCheckout: false,
      };
    }
  }

  return null;
}
