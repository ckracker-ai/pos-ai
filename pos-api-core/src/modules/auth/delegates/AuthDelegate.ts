import * as argon2 from 'argon2';
import * as jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import User from '../models/User.model';
import Role from '../models/Role.model';
import Branch from '../../branch/models/Branch.model';
import UserService from '../services/UserService';
import { branchBelongsToEmpresa } from '../../../utils/tenantScope';
import { readModelString } from '../../../utils/modelAttributes';
import { Result, ok, fail } from '../../../types/result';

export interface RegisterInput {
  fullName: string;
  email: string;
  password: string;
  roleId: string;
  branchId: string;
  empresaId?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface UserPayload {
  id: string;
  fullName: string;
  email: string;
  roleId: string;
  roleName: string;
  empresaId: string;
  branchId: string;
  isActive: boolean;
}

interface AuthTokenPayload {
  userId: string;
  fullName: string;
  email: string;
  roleId: string;
  roleName: string;
  empresaId: string;
  branchId: string;
  isActive: boolean;
}

const ARGON2_OPTIONS: argon2.Options & { raw?: false } = {
  type: argon2.argon2id,
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 4,
};

class AuthDelegate {
  private async resolveEmpresaIdForRegister(input: RegisterInput): Promise<Result<string>> {
    if (input.empresaId?.trim()) {
      return ok(input.empresaId.trim());
    }

    const branch = await Branch.findByPk(input.branchId, { attributes: ['id', 'empresaId'] });
    if (!branch) return fail('BRANCH_NOT_FOUND');
    const empresaId = readModelString(branch, 'empresaId');
    if (!empresaId) return fail('TENANT_CONTEXT_REQUIRED');
    return ok(empresaId);
  }

  async register(input: RegisterInput): Promise<Result<UserPayload>> {
    const normalizedEmail = input.email.trim().toLowerCase();
    const empresaResult = await this.resolveEmpresaIdForRegister(input);
    if (!empresaResult.success) return empresaResult;

    const empresaId = empresaResult.value;
    const branchOk = await branchBelongsToEmpresa(input.branchId, empresaId);
    if (!branchOk) return fail('BRANCH_TENANT_MISMATCH');

    const role = await Role.findByPk(input.roleId);
    if (!role) {
      return fail('ROLE_NOT_FOUND: the provided roleId does not exist');
    }

    const existing = await UserService.findByEmailInEmpresa(normalizedEmail, empresaId);
    if (existing) {
      const existingPlain = typeof existing.toJSON === 'function' ? existing.toJSON() : existing;
      const existingIsActive =
        existingPlain.isActive === true ||
        existingPlain.isActive === 'true' ||
        existingPlain.isActive === 1;

      if (!existingIsActive) {
        const passwordHash = await argon2.hash(input.password, ARGON2_OPTIONS);
        await existing.update({
          fullName: input.fullName,
          email: normalizedEmail,
          password: passwordHash,
          roleId: input.roleId,
          branchId: input.branchId,
          empresaId,
          isActive: true,
        });
        return ok(this.toPayload(existing, role.name));
      }

      return fail('EMAIL_TAKEN: this email address is already registered');
    }

    const passwordHash = await argon2.hash(input.password, ARGON2_OPTIONS);

    const user = await UserService.createUser({
      id: uuidv4(),
      fullName: input.fullName,
      email: normalizedEmail,
      password: passwordHash,
      roleId: input.roleId,
      branchId: input.branchId,
      empresaId,
      isActive: true,
    });

    return ok(this.toPayload(user, role.name));
  }

  async login(input: LoginInput): Promise<Result<{ token: string; user: UserPayload }>> {
    const normalizedEmail = input.email.trim().toLowerCase();
    const user = await UserService.findByEmailWithPassword(normalizedEmail);

    if (!user) {
      return fail('INVALID_CREDENTIALS');
    }

    const userPlain = typeof user.toJSON === 'function' ? user.toJSON() : user;
    const accountIsActive =
      userPlain.isActive === true || userPlain.isActive === 'true' || userPlain.isActive === 1;

    if (!accountIsActive) {
      return fail('ACCOUNT_DISABLED: contact an administrator');
    }

    if (!userPlain.password) {
      return fail('INVALID_CREDENTIALS');
    }

    const isValid = await argon2.verify(userPlain.password, input.password);
    if (!isValid) {
      return fail('INVALID_CREDENTIALS');
    }

    const role = await Role.findByPk(userPlain.roleId);
    const rolePlain = role
      ? typeof role.toJSON === 'function'
        ? role.toJSON()
        : role
      : { name: 'UNKNOWN' };

    const roleName = rolePlain.name;
    const empresaId = String(readModelString(user, 'empresaId') ?? userPlain.empresaId ?? '');
    if (!empresaId) {
      return fail('TENANT_CONTEXT_REQUIRED');
    }

    const userPayload = this.toPayload(user, roleName);

    const tokenPayload: AuthTokenPayload = {
      userId: userPlain.id,
      fullName: userPlain.fullName,
      email: userPlain.email,
      roleId: userPlain.roleId,
      roleName: roleName,
      empresaId,
      branchId: String(userPlain.branchId),
      isActive: accountIsActive,
    };

    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET ?? 'default_secret', {
      expiresIn: '24h',
    });

    return ok({ token, user: userPayload });
  }

  async findById(userId: string, empresaId?: string): Promise<Result<UserPayload>> {
    const user = await (empresaId
      ? UserService.findByIdInEmpresa(userId, empresaId)
      : User.findByPk(userId, {
          include: [{ model: Role, as: 'role', attributes: ['name'] }],
        }));

    if (!user) {
      return fail('USER_NOT_FOUND');
    }

    const userPlain =
      typeof (user as User).toJSON === 'function' ? (user as User).toJSON() : (user as User);
    const roleName =
      (userPlain as { role?: { name?: string } }).role?.name ??
      (await Role.findByPk(userPlain.roleId))?.name;

    if (!roleName) {
      return fail('ROLE_NOT_FOUND');
    }

    return ok(this.toPayload(user as User, roleName));
  }

  async deactivate(
    userId: string,
    actorUserId?: string,
    empresaId?: string
  ): Promise<Result<{ deactivated: true }>> {
    if (actorUserId && actorUserId === userId) {
      return fail('CANNOT_DEACTIVATE_SELF');
    }

    const user = await (empresaId
      ? UserService.findByIdInEmpresa(userId, empresaId)
      : User.findByPk(userId, {
          include: [{ model: Role, as: 'role', attributes: ['name'] }],
        }));

    if (!user) return fail('USER_NOT_FOUND');

    if (!user.isActive) {
      return ok({ deactivated: true });
    }

    const roleName = String((user as { role?: { name?: string } }).role?.name ?? '').toUpperCase();
    if (roleName === 'ADMIN') {
      const adminRole = await Role.findOne({ where: { name: 'ADMIN' } });
      if (adminRole) {
        const activeAdmins = await User.count({
          where: {
            roleId: adminRole.id,
            isActive: true,
            ...(empresaId ? { empresaId } : {}),
          },
        });
        if (activeAdmins <= 1) {
          return fail('CANNOT_DEACTIVATE_LAST_ADMIN');
        }
      }
    }

    await user.update({ isActive: false });
    return ok({ deactivated: true });
  }

  async restore(userId: string, empresaId?: string): Promise<Result<UserPayload>> {
    const user = await (empresaId
      ? UserService.findByIdInEmpresa(userId, empresaId)
      : User.findByPk(userId, {
          include: [{ model: Role, as: 'role', attributes: ['name'] }],
        }));

    if (!user) return fail('USER_NOT_FOUND');

    await user.update({ isActive: true });
    const roleName = String(
      (user as { role?: { name?: string } }).role?.name ?? 'UNKNOWN'
    );
    return ok(this.toPayload(user, roleName));
  }

  private toPayload(user: User, roleName: string): UserPayload {
    const plain =
      typeof user.toJSON === 'function'
        ? (user.toJSON() as Record<string, unknown>)
        : ({} as Record<string, unknown>);

    return {
      id: String(plain.id ?? user.id ?? ''),
      fullName: String(plain.fullName ?? user.fullName ?? ''),
      email: String(plain.email ?? user.email ?? ''),
      roleId: String(plain.roleId ?? user.roleId ?? ''),
      roleName,
      empresaId: String(readModelString(user, 'empresaId') ?? plain.empresaId ?? ''),
      branchId: String(plain.branchId ?? ''),
      isActive: plain.isActive !== false,
    };
  }
}

export default new AuthDelegate();
