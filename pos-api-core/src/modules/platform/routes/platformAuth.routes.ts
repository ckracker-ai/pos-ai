import { Router } from 'express';
import { sendOk, sendFail } from '../../../middleware/globalErrorHandler';
import platformAuthDelegate from '../delegates/PlatformAuthDelegate';
import { loginRateLimiter } from '../../../middleware/rateLimit';
import { validate } from '../../../middleware/validate';
import { loginBodySchema } from '../../auth/schemas/auth.schemas';

const router = Router();

router.post('/auth/login', loginRateLimiter, validate(loginBodySchema, 'body'), async (req, res) => {
  const email = String(req.body.email);
  const password = String(req.body.password);

  const result = await platformAuthDelegate.login(email, password);
  if (result.success) return sendOk(res, { user: result.value });
  return sendFail(res, result.error, 401);
});

export default router;
