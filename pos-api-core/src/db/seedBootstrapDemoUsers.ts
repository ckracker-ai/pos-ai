import * as argon2 from 'argon2';
import { v4 as uuidv4 } from 'uuid';

import User from '../modules/auth/models/User.model';
import Role from '../modules/auth/models/Role.model';
import Branch from '../modules/branch/models/Branch.model';
import Empresa from '../modules/tenant/models/Empresa.model';

export const ARGON2_OPTIONS: argon2.Options & { raw?: false } = {
  type: argon2.argon2id,
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 4,
};

type DemoUserSpec = {
  email: string;
  password: string;
  fullName: string;
  roleName: 'SELLER' | 'COMANDA' | 'AUDITOR' | 'DELIVERY';
  whatsappPhone?: string | null;
};

async function upsertDemoUser(
  empresaId: string,
  branchId: string,
  spec: DemoUserSpec,
  forceResetPassword: boolean
): Promise<void> {
  const role = await Role.findOne({ where: { name: spec.roleName } });
  if (!role) {
    console.warn(`⚠️  Demo user skipped (${spec.email}): role ${spec.roleName} not found`);
    return;
  }

  const roleId = String(role.getDataValue('id') ?? '');
  const passwordHash = await argon2.hash(spec.password, ARGON2_OPTIONS);

  const existing = await User.scope('withPassword').findOne({
    where: { email: spec.email.trim().toLowerCase(), empresaId },
  });

  if (!existing) {
    await User.create({
      id: uuidv4(),
      fullName: spec.fullName,
      email: spec.email.trim().toLowerCase(),
      password: passwordHash,
      roleId,
      branchId,
      empresaId,
      isActive: true,
      whatsappPhone: spec.whatsappPhone ?? null,
    });
    console.log(`✅  Demo user created: ${spec.email} (${spec.roleName})`);
    return;
  }

  const updates: Partial<{
    fullName: string;
    roleId: string;
    branchId: string;
    isActive: boolean;
    password: string;
    whatsappPhone: string | null;
  }> = {};

  if (existing.fullName !== spec.fullName) updates.fullName = spec.fullName;
  if (existing.roleId !== roleId) updates.roleId = roleId;
  if (existing.branchId !== branchId) updates.branchId = branchId;
  if (!existing.isActive) updates.isActive = true;
  if (forceResetPassword) updates.password = passwordHash;
  if (spec.whatsappPhone !== undefined) {
    const current = existing.getDataValue('whatsappPhone') as string | null | undefined;
    if (current !== spec.whatsappPhone) updates.whatsappPhone = spec.whatsappPhone;
  }

  if (Object.keys(updates).length > 0) {
    await existing.update(updates);
    console.log(`✅  Demo user updated: ${spec.email}`);
  }
}

/** Usuarios demo Costa Azul (vendedor, comanda) para QA y comprobantes WSP. */
export async function seedBootstrapDemoUsers(): Promise<void> {
  if (process.env.BOOTSTRAP_DEMO_USERS_ENABLED === 'false') return;

  const empresaSlug = process.env.BOOTSTRAP_DEMO_EMPRESA_SLUG ?? 'costa-azul';
  const branchName = process.env.BOOTSTRAP_DEMO_BRANCH_NAME ?? 'Sucursal Central';
  const forceResetPassword = process.env.BOOTSTRAP_DEMO_USERS_RESET_PASSWORD === 'true';

  const empresa = await Empresa.findOne({ where: { slug: empresaSlug } });
  if (!empresa) {
    console.warn(`⚠️  Demo users skipped: empresa slug "${empresaSlug}" not found`);
    return;
  }

  const empresaId = String(empresa.getDataValue('id') ?? '');

  const branch = await Branch.findOne({ where: { empresaId, name: branchName, isActive: true } });
  if (!branch) {
    console.warn(`⚠️  Demo users skipped: branch "${branchName}" not found for ${empresaSlug}`);
    return;
  }

  const branchId = String(branch.getDataValue('id') ?? '');

  const sellerEmail = process.env.BOOTSTRAP_SELLER_EMAIL ?? 'vendedor@empanadascostaazul.cl';
  const sellerPassword = process.env.BOOTSTRAP_SELLER_PASSWORD ?? 'Vendedor@12345';
  const comandaEmail = process.env.BOOTSTRAP_COMANDA_EMAIL ?? 'comanda@empanadascostaazul.cl';
  const comandaPassword = process.env.BOOTSTRAP_COMANDA_PASSWORD ?? 'Comanda@12345';
  const deliveryEmail = process.env.BOOTSTRAP_DELIVERY_EMAIL ?? 'repartidor@empanadascostaazul.cl';
  const deliveryPassword = process.env.BOOTSTRAP_DELIVERY_PASSWORD ?? 'Repartidor@12345';

  await upsertDemoUser(
    empresaId,
    branchId,
    {
      email: sellerEmail,
      password: sellerPassword,
      fullName: process.env.BOOTSTRAP_SELLER_FULL_NAME ?? 'Vendedor Costa Azul',
      roleName: 'SELLER',
      whatsappPhone: process.env.BOOTSTRAP_SELLER_WHATSAPP?.replace(/\D/g, '') || '56900000003',
    },
    forceResetPassword
  );

  await upsertDemoUser(
    empresaId,
    branchId,
    {
      email: comandaEmail,
      password: comandaPassword,
      fullName: process.env.BOOTSTRAP_COMANDA_FULL_NAME ?? 'Comanda Costa Azul',
      roleName: 'COMANDA',
    },
    forceResetPassword
  );

  await upsertDemoUser(
    empresaId,
    branchId,
    {
      email: deliveryEmail,
      password: deliveryPassword,
      fullName: process.env.BOOTSTRAP_DELIVERY_FULL_NAME ?? 'Repartidor Costa Azul',
      roleName: 'DELIVERY',
      whatsappPhone: process.env.BOOTSTRAP_DELIVERY_WHATSAPP?.replace(/\D/g, '') || null,
    },
    forceResetPassword
  );
}
