import * as argon2 from 'argon2';
import * as jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import User from '../models/User.model';
import Role from '../models/Role.model';
import UserService from '../services/UserService';
import { Result, ok, fail } from '../../../types/result';


export interface RegisterInput {
  fullName: string;
  email: string;
  password: string;
  roleId: string;
  branchId: string;
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
  branchId: string;
  isActive: boolean;
}

interface AuthTokenPayload {
  userId: string;
  fullName: string;
  email: string;
  roleId: string;
  roleName: string;
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
  async register(input: RegisterInput): Promise<Result<UserPayload>> {
    const normalizedEmail = input.email.trim().toLowerCase();
    const role = await Role.findByPk(input.roleId);
    if (!role) {
      return fail('ROLE_NOT_FOUND: the provided roleId does not exist');
    }

    const existing = await UserService.findByEmailWithPassword(normalizedEmail);
    if (existing) {
      const existingPlain = typeof existing.toJSON === 'function' ? existing.toJSON() : existing;
      const existingIsActive =
        existingPlain.isActive === true ||
        existingPlain.isActive === 'true' ||
        existingPlain.isActive === 1;

      // Flujo permanente: si el correo existe pero está inactivo, se reactiva
      // con los nuevos datos para evitar bloqueos en creación de usuarios.
      if (!existingIsActive) {
        const passwordHash = await argon2.hash(input.password, ARGON2_OPTIONS);
        await existing.update({
          fullName: input.fullName,
          email: normalizedEmail,
          password: passwordHash,
          roleId: input.roleId,
          branchId: input.branchId,
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
      isActive: true,
    });

    return ok(this.toPayload(user, role.name));
  }

  async login(input: LoginInput): Promise<Result<{ token: string; user: UserPayload }>> {
    const normalizedEmail = input.email.trim().toLowerCase();
    const user = await UserService.findByEmailWithPassword(normalizedEmail);

    // 1. Validar existencia del usuario
    if (!user) {
      return fail('INVALID_CREDENTIALS');
    }

    // 2. Extracción segura de datos planos
    const userPlain = typeof user.toJSON === 'function' ? user.toJSON() : user;
    const accountIsActive = userPlain.isActive === true || userPlain.isActive === "true" || userPlain.isActive === 1;
    
    // 3. Validar si la cuenta está activa
    if (!accountIsActive) {
      return fail('ACCOUNT_DISABLED: contact an administrator');
    }

    // 4. Validar y verificar la contraseña con Argon2
    if (!userPlain.password) {
      return fail('INVALID_CREDENTIALS');
    }

    const isValid = await argon2.verify(userPlain.password, input.password);
    if (!isValid) {
      return fail('INVALID_CREDENTIALS');
    }

    // 5. Obtener el rol del usuario de forma segura
    const role = await Role.findByPk(userPlain.roleId);
    const rolePlain = role 
      ? (typeof role.toJSON === 'function' ? role.toJSON() : role)
      : { name: 'UNKNOWN' };

    const roleName = rolePlain.name;
    const userPayload = this.toPayload(user, roleName);

    // 6. Construcción del Payload y firma del JWT
    const tokenPayload: AuthTokenPayload = {
      userId: userPlain.id,
      fullName: userPlain.fullName,
      email: userPlain.email,
      roleId: userPlain.roleId,
      roleName: roleName,
      branchId: String(userPlain.branchId),
      isActive: accountIsActive,
    };

    const token = jwt.sign(
      tokenPayload,
      process.env.JWT_SECRET ?? 'default_secret',
      { expiresIn: '24h' }
    );

    return ok({ token, user: userPayload });
}

  async findById(userId: string): Promise<Result<UserPayload>> {
    const user = await User.findByPk(userId, {
      include: [
        {
          model: Role,
          as: 'role',
          attributes: ['name'],
        },
      ],
    });

    if (!user) {
      return fail('USER_NOT_FOUND');
    }

    const userPlain = typeof (user as any).toJSON === 'function' ? (user as any).toJSON() : (user as any);
    const roleName = userPlain?.role?.name;

    if (!roleName) {
      return fail('ROLE_NOT_FOUND');
    }

    return ok({
      id: userPlain.id,
      fullName: userPlain.fullName,
      email: userPlain.email,
      roleId: userPlain.roleId,
      roleName,
      branchId: String(userPlain.branchId ?? ''),
      isActive: userPlain.isActive,
    });
  }


  async deactivate(userId: string): Promise<Result<{ deactivated: true }>> {
    const user = await User.findByPk(userId);
    if (!user) return fail('USER_NOT_FOUND');
    await user.update({ isActive: false });
    return ok({ deactivated: true });
  }

  async restore(userId: string): Promise<Result<UserPayload>> {
    const user = await User.findByPk(userId, {
      include: [{ model: Role, as: 'role', attributes: ['name'] }],
    });
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
      branchId: String(plain.branchId ?? ''),
      isActive: plain.isActive !== false,
    };
  }
}

export default new AuthDelegate();
