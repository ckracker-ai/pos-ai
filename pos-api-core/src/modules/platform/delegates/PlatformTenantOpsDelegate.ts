import * as argon2 from 'argon2';
import { v4 as uuidv4 } from 'uuid';
import User from '../../auth/models/User.model';
import Role from '../../auth/models/Role.model';
import Branch from '../../branch/models/Branch.model';
import Empresa from '../../tenant/models/Empresa.model';
import authDelegate from '../../auth/delegates/AuthDelegate';
import legalDelegate from '../../legal/delegates/LegalDelegate';
import LegalAcceptance from '../../legal/models/LegalAcceptance.model';
import { branchListInclude, presentBranch } from '../../branch/utils/branchPresenter';
import { assertCanAddActiveBranch } from '../../saas/utils/planLimits';
import { readModelString } from '../../../utils/modelAttributes';
import { Result, ok, fail } from '../../../types/result';

const ARGON2_OPTIONS: argon2.Options & { raw?: false } = {
  type: argon2.argon2id,
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 4,
};

const ROLE_CODIGOS = ['ADMIN', 'AUDITOR', 'SELLER', 'COMANDA'] as const;
type RoleCodigo = (typeof ROLE_CODIGOS)[number];

export type PlatformTenantUserRow = {
  id: string;
  fullName: string;
  email: string;
  roleId: string;
  roleName: string;
  branchId: string;
  branchName: string | null;
  isActive: boolean;
  whatsappPhone: string | null;
  legalCurrent: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PlatformTenantBranchRow = ReturnType<typeof presentBranch> & {
  userCount: number;
};

export type CreatePlatformTenantUserInput = {
  fullName: string;
  email: string;
  password: string;
  roleCodigo?: RoleCodigo;
  roleId?: string;
  branchId?: string;
};

class PlatformTenantOpsDelegate {
  private async assertEmpresa(empresaId: string): Promise<Result<Empresa>> {
    const empresa = await Empresa.findByPk(empresaId);
    if (!empresa) return fail('EMPRESA_NOT_FOUND');
    return ok(empresa);
  }

  async listUsers(empresaId: string): Promise<Result<PlatformTenantUserRow[]>> {
    const empresaResult = await this.assertEmpresa(empresaId);
    if (!empresaResult.success) return empresaResult;

    const users = await User.findAll({
      where: { empresaId },
      attributes: [
        'id',
        'fullName',
        'email',
        'roleId',
        'branchId',
        'empresaId',
        'isActive',
        'whatsappPhone',
        'createdAt',
        'updatedAt',
      ],
      include: [
        { model: Role, as: 'role', attributes: ['id', 'name'] },
        { model: Branch, as: 'branch', attributes: ['id', 'name'] },
      ],
      order: [['createdAt', 'ASC']],
    });

    const rows: PlatformTenantUserRow[] = [];
    for (const u of users) {
      const plain = u.toJSON() as {
        id: string;
        fullName: string;
        email: string;
        roleId: string;
        branchId: string;
        isActive: boolean;
        whatsappPhone: string | null;
        createdAt: Date;
        updatedAt: Date;
        role?: { name?: string };
        branch?: { name?: string };
      };
      const legalOk = await legalDelegate.userHasCurrentAcceptances(plain.id);
      rows.push({
        id: plain.id,
        fullName: plain.fullName,
        email: plain.email,
        roleId: plain.roleId,
        roleName: String(plain.role?.name ?? 'UNKNOWN'),
        branchId: plain.branchId,
        branchName: plain.branch?.name ?? null,
        isActive: Boolean(plain.isActive),
        whatsappPhone: plain.whatsappPhone ?? null,
        legalCurrent: legalOk.success ? legalOk.value : false,
        createdAt: plain.createdAt.toISOString(),
        updatedAt: plain.updatedAt.toISOString(),
      });
    }

    return ok(rows);
  }

  async resetPassword(
    empresaId: string,
    userId: string,
    password: string
  ): Promise<Result<{ updated: true }>> {
    const empresaResult = await this.assertEmpresa(empresaId);
    if (!empresaResult.success) return empresaResult;

    const trimmed = password.trim();
    if (trimmed.length < 8) {
      return fail('VALIDATION_ERROR: password must be at least 8 characters');
    }

    const user = await User.findOne({ where: { id: userId, empresaId } });
    if (!user) return fail('USER_NOT_FOUND');

    const passwordHash = await argon2.hash(trimmed, ARGON2_OPTIONS);
    await user.update({ password: passwordHash, isActive: true });
    return ok({ updated: true });
  }

  private async resolveRoleId(input: {
    roleCodigo?: RoleCodigo;
    roleId?: string;
  }): Promise<Result<string>> {
    if (input.roleId?.trim()) {
      const role = await Role.findByPk(input.roleId.trim());
      if (!role) return fail('ROLE_NOT_FOUND');
      return ok(String(readModelString(role, 'id') ?? role.id));
    }

    const codigo = (input.roleCodigo ?? 'ADMIN').toUpperCase();
    if (!ROLE_CODIGOS.includes(codigo as RoleCodigo)) {
      return fail('VALIDATION_ERROR: invalid roleCodigo');
    }
    const role = await Role.findOne({ where: { name: codigo } });
    if (!role) return fail('ROLE_NOT_FOUND');
    return ok(String(readModelString(role, 'id') ?? role.id));
  }

  private async resolveBranchId(
    empresaId: string,
    branchId?: string
  ): Promise<Result<string>> {
    if (branchId?.trim()) {
      const branch = await Branch.findOne({
        where: { id: branchId.trim(), empresaId },
      });
      if (!branch) return fail('BRANCH_NOT_FOUND');
      return ok(String(readModelString(branch, 'id') ?? branch.id));
    }

    const branch = await Branch.findOne({
      where: { empresaId, isActive: true },
      order: [['createdAt', 'ASC']],
    });
    if (!branch) return fail('BRANCH_NOT_FOUND: tenant has no active branch');
    return ok(String(readModelString(branch, 'id') ?? branch.id));
  }

  async createUser(
    empresaId: string,
    input: CreatePlatformTenantUserInput
  ): Promise<Result<PlatformTenantUserRow>> {
    const empresaResult = await this.assertEmpresa(empresaId);
    if (!empresaResult.success) return empresaResult;

    const fullName = input.fullName?.trim();
    const email = input.email?.trim();
    const password = input.password?.trim();
    if (!fullName || !email || !password) {
      return fail('VALIDATION_ERROR: fullName, email and password are required');
    }
    if (password.length < 8) {
      return fail('VALIDATION_ERROR: password must be at least 8 characters');
    }

    const roleResult = await this.resolveRoleId(input);
    if (!roleResult.success) return roleResult;

    const branchResult = await this.resolveBranchId(empresaId, input.branchId);
    if (!branchResult.success) return branchResult;

    const registered = await authDelegate.register({
      fullName,
      email,
      password,
      roleId: roleResult.value,
      branchId: branchResult.value,
      empresaId,
    });
    if (!registered.success) return registered;

    const listed = await this.listUsers(empresaId);
    if (!listed.success) return listed;
    const row = listed.value.find((u) => u.id === registered.value.id);
    if (!row) return fail('USER_NOT_FOUND');
    return ok(row);
  }

  async listBranches(empresaId: string): Promise<Result<PlatformTenantBranchRow[]>> {
    const empresaResult = await this.assertEmpresa(empresaId);
    if (!empresaResult.success) return empresaResult;

    const rows = await Branch.findAll({
      where: { empresaId },
      include: branchListInclude,
      order: [
        ['isActive', 'DESC'],
        ['name', 'ASC'],
      ],
    });

    const branches: PlatformTenantBranchRow[] = [];
    for (const b of rows) {
      const presented = presentBranch(b);
      const userCount = await User.count({ where: { empresaId, branchId: presented.id } });
      branches.push({ ...presented, userCount });
    }
    return ok(branches);
  }

  async createBranch(
    empresaId: string,
    input: { name: string; address?: string; phone?: string }
  ): Promise<Result<PlatformTenantBranchRow>> {
    const empresaResult = await this.assertEmpresa(empresaId);
    if (!empresaResult.success) return empresaResult;

    const name = input.name?.trim();
    if (!name) return fail('VALIDATION_ERROR: branch name is required');

    const limit = await assertCanAddActiveBranch(empresaId);
    if (!limit.success) return limit;

    const branch = await Branch.create({
      id: uuidv4(),
      empresaId,
      name,
      address: input.address?.trim() || 'Por definir',
      phone: input.phone?.trim() || null,
      isActive: true,
    });
    await branch.reload({ include: branchListInclude });
    const presented = presentBranch(branch);
    return ok({ ...presented, userCount: 0 });
  }

  async patchBranch(
    empresaId: string,
    branchId: string,
    input: { name?: string; address?: string; phone?: string; isActive?: boolean }
  ): Promise<Result<PlatformTenantBranchRow>> {
    const empresaResult = await this.assertEmpresa(empresaId);
    if (!empresaResult.success) return empresaResult;

    const branch = await Branch.findOne({ where: { id: branchId, empresaId } });
    if (!branch) return fail('BRANCH_NOT_FOUND');

    if (input.isActive === true && !branch.isActive) {
      const limit = await assertCanAddActiveBranch(empresaId);
      if (!limit.success) return limit;
    }

    const name = input.name !== undefined ? input.name.trim() : undefined;
    if (name !== undefined && !name) return fail('VALIDATION_ERROR: branch name cannot be empty');

    await branch.update({
      ...(name !== undefined ? { name } : {}),
      ...(input.address !== undefined ? { address: input.address.trim() || null } : {}),
      ...(input.phone !== undefined ? { phone: input.phone.trim() || null } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    });
    await branch.reload({ include: branchListInclude });
    const presented = presentBranch(branch);
    const userCount = await User.count({ where: { empresaId, branchId: presented.id } });
    return ok({ ...presented, userCount });
  }

  async resetUserLegal(
    empresaId: string,
    userId: string
  ): Promise<Result<{ deleted: number }>> {
    const empresaResult = await this.assertEmpresa(empresaId);
    if (!empresaResult.success) return empresaResult;

    const user = await User.findOne({ where: { id: userId, empresaId } });
    if (!user) return fail('USER_NOT_FOUND');

    const deleted = await LegalAcceptance.destroy({ where: { userId } });
    return ok({ deleted });
  }

  async grantUserLegal(
    empresaId: string,
    userId: string
  ): Promise<Result<{ acceptanceIds: string[] }>> {
    const empresaResult = await this.assertEmpresa(empresaId);
    if (!empresaResult.success) return empresaResult;

    const user = await User.findOne({ where: { id: userId, empresaId } });
    if (!user) return fail('USER_NOT_FOUND');

    const current = await legalDelegate.getCurrentDocuments();
    if (!current.success) return current;

    return legalDelegate.recordAcceptances({
      userId,
      empresaId,
      termsVersion: current.value.terms.version,
      privacyVersion: current.value.privacy.version,
      channel: 'ADMIN_IMPORT',
      ipAddress: null,
      userAgent: 'platform-tenant-ops',
    });
  }
}

export default new PlatformTenantOpsDelegate();
