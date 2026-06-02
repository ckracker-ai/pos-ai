import { Request, Response, NextFunction } from 'express';
import { sendFail } from '../../../middleware/globalErrorHandler';
import Empresa from '../../tenant/models/Empresa.model';
import SaasPlan from '../../saas/models/SaasPlan.model';
import type { SaasPlanFeatures } from '../../saas/constants/planCodes';

export type AssistantRequest = Request & {
  assistantEmpresaId?: string;
  assistantFeatures?: SaasPlanFeatures;
};

export async function loadAssistantPlan(
  req: AssistantRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const empresaId = String(req.headers['x-empresa-id'] ?? '').trim();
  if (!empresaId) {
    sendFail(res, 'EMPRESA_ID_REQUIRED', 400);
    return;
  }

  const empresa = await Empresa.findByPk(empresaId, {
    include: [{ model: SaasPlan, as: 'plan', required: true }],
  });
  if (!empresa) {
    sendFail(res, 'EMPRESA_NOT_FOUND', 404);
    return;
  }

  const plan = await SaasPlan.findByPk(String(empresa.getDataValue('planId') ?? empresa.planId));
  if (!plan) {
    sendFail(res, 'PLAN_NOT_FOUND', 404);
    return;
  }
  const codigo = String(plan.getDataValue('codigo') ?? '').toUpperCase();
  const raw = plan.getDataValue('features') as Record<string, unknown> | null;
  const whatsappOk =
    raw?.assistantWhatsapp === true ||
    raw?.assistantWhatsapp === 1 ||
    codigo === 'ESTANDAR' ||
    codigo === 'FULL';
  if (!whatsappOk) {
    sendFail(res, 'ASSISTANT_PLAN_REQUIRED: upgrade to Estándar or Full', 403);
    return;
  }
  const features = (raw ?? {}) as SaasPlanFeatures;

  req.assistantEmpresaId = empresaId;
  req.assistantFeatures = features;
  next();
}
