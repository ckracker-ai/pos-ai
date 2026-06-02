export const SAAS_PLAN_IDS = {
  BASICO: 'a0000000-0000-4000-8000-000000000001',
  ESTANDAR: 'a0000000-0000-4000-8000-000000000002',
  FULL: 'a0000000-0000-4000-8000-000000000003',
} as const;

export type SaasPlanCodigo = keyof typeof SAAS_PLAN_IDS;

export const DEFAULT_SAAS_PLAN_CODIGO: SaasPlanCodigo = 'BASICO';

export type SaasPlanFeatures = {
  modulosCore: boolean;
  assistantWhatsapp: boolean;
  assistantVoz: boolean;
  pagosOnline: boolean;
};
