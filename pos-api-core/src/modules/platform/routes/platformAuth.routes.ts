import { Router } from 'express';
import { sendOk, sendFail } from '../../../middleware/globalErrorHandler';
import platformAuthDelegate from '../delegates/PlatformAuthDelegate';

const router = Router();

router.post('/auth/login', async (req, res) => {
  const email = String(req.body?.email ?? '');
  const password = String(req.body?.password ?? '');
  if (!email || !password) {
    return sendFail(res, 'VALIDATION_ERROR: email and password required', 422);
  }

  const result = await platformAuthDelegate.login(email, password);
  if (result.success) return sendOk(res, { user: result.value });
  return sendFail(res, result.error, 401);
});

export default router;
