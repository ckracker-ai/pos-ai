import type { Empresa } from '@/core/interfaces';
import { resolvePlanFeatures } from '@/core/config/plan-access';
import { isRubroPackSelected } from '@/core/config/rubro-packs';

export type EmpresaSetupTab =
  | 'general'
  | 'formalizar'
  | 'facturacion'
  | 'transferencia'
  | 'plan'
  | 'privacidad';

export type EmpresaSetupStep = {
  id: string;
  title: string;
  hint: string;
  done: boolean;
  tab: EmpresaSetupTab;
  href?: string;
};

function filled(value: string | null | undefined): boolean {
  return Boolean(value && value.trim());
}

/** Pasos para dejar el tenant listo (legal → transferencia → plan → QR). */
export function buildEmpresaSetupSteps(
  empresa: Empresa,
  extras?: { wspMenuEnabled?: boolean | null }
): EmpresaSetupStep[] {
  const features = resolvePlanFeatures(empresa.plan);
  const transferDone =
    filled(empresa.transferBankName) &&
    filled(empresa.transferAccount) &&
    filled(empresa.transferHolderName) &&
    filled(empresa.transferRut);

  const legalDone =
    empresa.estadoTributario === 'FORMAL' ||
    (empresa.esNegocioEnMarcha && (empresa.formalizacionPorcentaje ?? 0) >= 100);

  const planDone = ['ACTIVA', 'PILOTO'].includes(
    String(empresa.suscripcion?.estado ?? '').toUpperCase()
  );

  const steps: EmpresaSetupStep[] = [
    {
      id: 'identidad',
      title: 'Datos del negocio',
      hint: 'Razón social y nombre con el que te reconocen los clientes.',
      done: filled(empresa.razonSocial) && filled(empresa.nombreFantasia),
      tab: 'general',
    },
    {
      id: 'rubro',
      title: 'Tipo de negocio (rubro)',
      hint: 'Define caja, cocina y envíos según el pack (minimarket, ferretería, ropa…).',
      done: isRubroPackSelected(empresa.rubroNegocio),
      tab: 'general',
    },
    {
      id: 'legal',
      title: 'Situación legal',
      hint: empresa.esNegocioEnMarcha
        ? 'Completa el avance de formalización o marca el negocio como formal.'
        : 'RUT y estado tributario listos para facturar.',
      done: legalDone,
      tab: 'formalizar',
    },
    {
      id: 'facturacion',
      title: 'Facturación',
      hint: 'Correo de facturación para envíos y soporte.',
      done: filled(empresa.correoFacturacion),
      tab: 'facturacion',
    },
    {
      id: 'transferencia',
      title: 'Cuenta para transferencias',
      hint: features.assistantWhatsapp
        ? 'Obligatorio para que la IA valide comprobantes de WhatsApp.'
        : 'Déjala lista por si activas WhatsApp (Estándar o Full).',
      done: transferDone,
      tab: 'transferencia',
    },
    {
      id: 'plan',
      title: 'Plan y suscripción',
      hint: 'Plan vigente o piloto activo.',
      done: planDone || empresa.estado === 'ACTIVO',
      tab: 'plan',
    },
  ];

  if (features.assistantWhatsapp) {
    steps.push({
      id: 'wsp',
      title: 'Menú QR WhatsApp',
      hint: 'Activa el menú de la sucursal y descarga el QR.',
      done: extras?.wspMenuEnabled === true,
      tab: 'plan',
      href: '/wsp',
    });
  }

  return steps;
}

export function empresaSetupProgress(steps: EmpresaSetupStep[]): { done: number; total: number } {
  return { done: steps.filter((s) => s.done).length, total: steps.length };
}
