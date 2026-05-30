import * as argon2 from 'argon2';
import { v4 as uuidv4 } from 'uuid';

import User from '../modules/auth/models/User.model';
import Role from '../modules/auth/models/Role.model';
import Branch from '../modules/branch/models/Branch.model';

const ARGON2_OPTIONS: argon2.Options & { raw?: false } = {
  type: argon2.argon2id,
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 4,
};

export async function seedBootstrapAdmin(): Promise<void> {
  if (process.env.BOOTSTRAP_ADMIN_ENABLED === 'false') return;

  const adminEmail = process.env.BOOTSTRAP_ADMIN_EMAIL ?? 'admin@empanadascostaazul.cl';
  const adminPassword = process.env.BOOTSTRAP_ADMIN_PASSWORD ?? '@dmin123_';
  const adminFullName = process.env.BOOTSTRAP_ADMIN_FULL_NAME ?? 'Administrador Costa Azul';
  const branchName = process.env.BOOTSTRAP_ADMIN_BRANCH_NAME ?? 'Sucursal Central';
  const forceResetPassword = process.env.BOOTSTRAP_ADMIN_RESET_PASSWORD === 'true';

  const role = await Role.findOne({ where: { name: 'ADMIN' } });
  if (!role) {
    console.warn('⚠️  Bootstrap admin skipped: ADMIN role not found');
    return;
  }

  const branch = await Branch.findOne({ where: { name: branchName } });
  if (!branch) {
    console.warn(`⚠️  Bootstrap admin skipped: branch "${branchName}" not found`);
    return;
  }

  const roleId = String(role.getDataValue('id') ?? '');
  const branchId = String(branch.getDataValue('id') ?? '');
  const empresaId = String(branch.getDataValue('empresaId') ?? branch.getDataValue('empresa_id') ?? '');

  if (!roleId || !branchId || !empresaId) {
    console.warn('⚠️  Bootstrap admin skipped: roleId/branchId/empresaId unresolved');
    return;
  }

  const existing = await User.scope('withPassword').findOne({
    where: { email: adminEmail, empresaId },
  });
  const passwordHash = await argon2.hash(adminPassword, ARGON2_OPTIONS);

  if (!existing) {
    await User.create({
      id: uuidv4(),
      fullName: adminFullName,
      email: adminEmail,
      password: passwordHash,
      roleId,
      branchId,
      empresaId,
      isActive: true,
    });
    console.log(`✅  Bootstrap admin created: ${adminEmail}`);
    return;
  }

  const updates: Partial<{
    fullName: string;
    roleId: string;
    branchId: string;
    empresaId: string;
    isActive: boolean;
    password: string;
  }> = {};

  if (existing.fullName !== adminFullName) updates.fullName = adminFullName;
  if (existing.roleId !== roleId) updates.roleId = roleId;
  if (existing.branchId !== branchId) updates.branchId = branchId;
  if (existing.getDataValue('empresaId') !== empresaId) updates.empresaId = empresaId;
  if (!existing.isActive) updates.isActive = true;
  if (forceResetPassword) updates.password = passwordHash;

  if (Object.keys(updates).length > 0) {
    await existing.update(updates);
    console.log(`✅  Bootstrap admin updated: ${adminEmail}`);
  }
}
