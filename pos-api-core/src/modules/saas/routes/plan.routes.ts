import { Router } from 'express';
import { sendOk, sendFail } from '../../../middleware/globalErrorHandler';
import saasPlanDelegate from '../delegates/SaasPlanDelegate';

const router = Router();

const mapErrorStatus = (error: string): number => {
  if (error === 'PLAN_NOT_FOUND') return 404;
  if (error.startsWith('VALIDATION_ERROR')) return 422;
  return 400;
};

/** Catálogo activo — asignación a empresas. */
router.get('/list', async (_req, res) => {
  const result = await saasPlanDelegate.listActive();
  if (result.success) return sendOk(res, { planes: result.value });
  return sendFail(res, result.error, mapErrorStatus(result.error));
});

/** Catálogo completo — mantenedor plataforma. */
router.get('/catalog', async (_req, res) => {
  const result = await saasPlanDelegate.listCatalog();
  if (result.success) return sendOk(res, { planes: result.value });
  return sendFail(res, result.error, mapErrorStatus(result.error));
});

router.patch('/:id', async (req, res) => {
  const result = await saasPlanDelegate.update(req.params.id, req.body ?? {});
  if (result.success) return sendOk(res, { plan: result.value });
  return sendFail(res, result.error, mapErrorStatus(result.error));
});

export default router;
