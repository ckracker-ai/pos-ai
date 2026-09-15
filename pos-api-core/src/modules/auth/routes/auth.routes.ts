import { Router } from 'express';
import * as argon2 from 'argon2';
import AuthController from '../controllers/AuthController';
import { sendOk } from '../../../middleware/globalErrorHandler';
import { authenticateToken, requireAdmin, requireAuditor, AuthenticatedRequest } from '../../../middleware/auth.middleware';
import { getEffectiveEmpresaId } from '../../../utils/tenantScope';
import User from '../models/User.model';
import Role from '../models/Role.model';
import { invalidateAuthUserCache } from '../../../lib/authUserCache';
import { loginRateLimiter } from '../../../middleware/rateLimit';
import { validate } from '../../../middleware/validate';
import {
  idParamSchema,
  loginBodySchema,
  passwordBodySchema,
  registerBodySchema,
  userUpdateBodySchema,
} from '../schemas/auth.schemas';

const router = Router();

const ARGON2_OPTIONS: argon2.Options & { raw?: false } = {
  type: argon2.argon2id,
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 4,
};


router.post(
  '/register',
  authenticateToken,
  requireAdmin,
  validate(registerBodySchema, 'body'),
  AuthController.register
);
router.post('/login', loginRateLimiter, validate(loginBodySchema, 'body'), AuthController.login);

// Protected routes
router.get(
  '/users/:id',
  authenticateToken,
  validate(idParamSchema, 'params'),
  AuthController.findById
);
router.patch(
  '/users/:id/deactivate',
  authenticateToken,
  requireAdmin,
  validate(idParamSchema, 'params'),
  AuthController.deactivate
);
router.patch(
  '/users/:id/restore',
  authenticateToken,
  requireAdmin,
  validate(idParamSchema, 'params'),
  AuthController.restore
);

// Admin only: CRUD users
router.get('/roles', authenticateToken, requireAuditor, async (_req, res) => {
  const roles = await Role.findAll({ attributes: ['id', 'name'] });
  sendOk(res, { roles });
});

router.get('/users', authenticateToken, requireAuditor, async (req: AuthenticatedRequest, res) => {
  const empresaId = getEffectiveEmpresaId(req);
  const users = await User.findAll({
    where: { empresaId },
    attributes: ['id', 'fullName', 'email', 'roleId', 'branchId', 'empresaId', 'isActive', 'createdAt', 'updatedAt'],
    include: [{ model: Role, as: 'role', attributes: ['id', 'name'] }],
  });
  sendOk(res, { users });
});



router.post(
  '/users',
  authenticateToken,
  requireAdmin,
  validate(registerBodySchema, 'body'),
  AuthController.register
);
router.put(
  '/users/:id',
  authenticateToken,
  requireAdmin,
  validate(idParamSchema, 'params'),
  validate(userUpdateBodySchema, 'body'),
  async (req: AuthenticatedRequest, res) => {
  try {
    const empresaId = getEffectiveEmpresaId(req);
    const user = await User.findOne({ where: { id: req.params.id, empresaId } });
    if (!user) return res.status(404).json({ success: false, data: null, error: 'USER_NOT_FOUND', code: 404 });

    const { fullName, email, roleId, branchId, isActive, whatsappPhone } = req.body ?? {};

    let normalizedWhatsapp: string | null | undefined;
    if (whatsappPhone !== undefined) {
      const digits = String(whatsappPhone ?? '')
        .replace(/\D/g, '')
        .replace(/^0+/, '');
      normalizedWhatsapp = digits.length >= 8 ? digits : null;
    }

    await user.update({
      ...(fullName !== undefined ? { fullName } : {}),
      ...(email !== undefined ? { email } : {}),
      ...(roleId !== undefined ? { roleId } : {}),
      ...(branchId !== undefined ? { branchId } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
      ...(normalizedWhatsapp !== undefined ? { whatsappPhone: normalizedWhatsapp } : {}),
    });
    await invalidateAuthUserCache(String(user.id));

    const updated = await User.findOne({ where: { id: req.params.id, empresaId } });
    return sendOk(res, { user: updated });
  } catch {
    return res.status(400).json({ success: false, data: null, error: 'ERROR_UPDATING_USER', code: 400 });
  }
});

router.patch(
  '/users/:id/password',
  authenticateToken,
  requireAdmin,
  validate(idParamSchema, 'params'),
  validate(passwordBodySchema, 'body'),
  async (req: AuthenticatedRequest, res) => {
  try {
    const empresaId = getEffectiveEmpresaId(req);
    const user = await User.findOne({ where: { id: req.params.id, empresaId } });
    if (!user) return res.status(404).json({ success: false, data: null, error: 'USER_NOT_FOUND', code: 404 });

    const passwordHash = await argon2.hash(req.body.password, ARGON2_OPTIONS);
    await user.update({ password: passwordHash, isActive: true });
    await invalidateAuthUserCache(String(user.id));
    return sendOk(res, { updated: true });
  } catch {
    return res.status(400).json({ success: false, data: null, error: 'ERROR_UPDATING_PASSWORD', code: 400 });
  }
});

router.delete(
  '/users/:id',
  authenticateToken,
  requireAdmin,
  validate(idParamSchema, 'params'),
  AuthController.deactivate
);

export default router;
