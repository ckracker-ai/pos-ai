import { Router } from 'express';
import * as argon2 from 'argon2';
import AuthController from '../controllers/AuthController';
import { sendOk } from '../../../middleware/globalErrorHandler';
import { authenticateToken, requireAdmin, requireAuditor, AuthenticatedRequest } from '../../../middleware/auth.middleware';
import { getEffectiveEmpresaId } from '../../../utils/tenantScope';
import User from '../models/User.model';
import Role from '../models/Role.model';

const router = Router();

const ARGON2_OPTIONS: argon2.Options & { raw?: false } = {
  type: argon2.argon2id,
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 4,
};


router.post('/register', AuthController.register);
router.post('/login', AuthController.login);

// Protected routes
router.get('/users/:id', authenticateToken, AuthController.findById);
router.patch('/users/:id/deactivate', authenticateToken, requireAdmin, AuthController.deactivate);
router.patch('/users/:id/restore', authenticateToken, requireAdmin, AuthController.restore);

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



router.post('/users', authenticateToken, requireAdmin, AuthController.register);
router.put('/users/:id', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const empresaId = getEffectiveEmpresaId(req);
    const user = await User.findOne({ where: { id: req.params.id, empresaId } });
    if (!user) return res.status(404).json({ success: false, data: null, error: 'USER_NOT_FOUND', code: 404 });

    const { fullName, email, roleId, branchId, isActive } = req.body ?? {};

    await user.update({
      ...(fullName !== undefined ? { fullName } : {}),
      ...(email !== undefined ? { email } : {}),
      ...(roleId !== undefined ? { roleId } : {}),
      ...(branchId !== undefined ? { branchId } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
    });

    const updated = await User.findOne({ where: { id: req.params.id, empresaId } });
    return sendOk(res, { user: updated });
  } catch {
    return res.status(400).json({ success: false, data: null, error: 'ERROR_UPDATING_USER', code: 400 });
  }
});

router.patch('/users/:id/password', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const empresaId = getEffectiveEmpresaId(req);
    const user = await User.findOne({ where: { id: req.params.id, empresaId } });
    if (!user) return res.status(404).json({ success: false, data: null, error: 'USER_NOT_FOUND', code: 404 });

    const newPasswordRaw = typeof req.body?.password === 'string' ? req.body.password : '';
    const newPassword = newPasswordRaw.trim();
    if (newPassword.length < 8) {
      return res.status(422).json({
        success: false,
        data: null,
        error: 'VALIDATION_ERROR: password must be at least 8 characters',
        code: 422,
      });
    }

    const passwordHash = await argon2.hash(newPassword, ARGON2_OPTIONS);
    await user.update({ password: passwordHash, isActive: true });
    return sendOk(res, { updated: true });
  } catch {
    return res.status(400).json({ success: false, data: null, error: 'ERROR_UPDATING_PASSWORD', code: 400 });
  }
});

router.delete('/users/:id', authenticateToken, requireAdmin, AuthController.deactivate);

export default router;
