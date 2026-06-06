import { Router } from 'express';
import {
  authenticateToken,
  requireComanda,
  AuthenticatedRequest,
} from '../../../middleware/auth.middleware';
import { sendOk, sendFail } from '../../../middleware/globalErrorHandler';
import { getEffectiveEmpresaId } from '../../../utils/tenantScope';
import { territoryDelegate } from '../delegates/TerritoryDelegate';

const router = Router();

router.use(authenticateToken);
router.use(requireComanda);

router.get('/regions', async (_req, res) => {
  const result = await territoryDelegate.listRegions();
  if (!result.success) return sendFail(res, result.error, 400);
  return sendOk(res, result.data);
});

router.get('/comunas', async (req, res) => {
  const regionId = String(req.query.regionId ?? '').trim();
  if (!regionId) return sendFail(res, 'regionId required', 422);
  const result = await territoryDelegate.listComunasByRegion(regionId);
  if (!result.success) return sendFail(res, result.error, 400);
  return sendOk(res, result.data);
});

router.get('/comunas/search', async (req, res) => {
  const q = String(req.query.q ?? '');
  const limit = Number(req.query.limit ?? 8);
  const result = await territoryDelegate.searchComunas(q, limit);
  if (!result.success) return sendFail(res, result.error, 400);
  return sendOk(res, result.data);
});

router.post('/resolve', async (req: AuthenticatedRequest, res) => {
  const body = req.body as { comunaText?: string; comunaId?: string; codigoPostal?: string };
  const empresaId = getEffectiveEmpresaId(req);
  const result = await territoryDelegate.resolveLocation({
    comunaText: body.comunaText,
    comunaId: body.comunaId,
    codigoPostal: body.codigoPostal,
    empresaId,
  });
  if (!result.success) {
    if (result.error === 'INVALID_POSTAL_CODE') {
      return sendFail(res, 'Código postal debe tener 7 dígitos', 422);
    }
    return sendFail(res, result.error, 400);
  }
  return sendOk(res, result.data);
});

export default router;
