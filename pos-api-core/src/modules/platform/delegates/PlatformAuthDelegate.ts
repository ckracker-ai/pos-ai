import * as argon2 from 'argon2';
import PlatformUser from '../models/PlatformUser.model';
import { Result, ok, fail } from '../../../types/result';

export type PlatformUserPayload = {
  id: string;
  email: string;
  fullName: string;
  roleName: 'PLATFORM_ADMIN';
};

class PlatformAuthDelegate {
  async login(email: string, password: string): Promise<Result<PlatformUserPayload>> {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await PlatformUser.scope('withPassword').findOne({
      where: { email: normalizedEmail },
    });

    if (!user || !user.getDataValue('isActive')) {
      return fail('INVALID_CREDENTIALS');
    }

    const hash = String(user.getDataValue('password') ?? '');
    if (!hash) return fail('INVALID_CREDENTIALS');

    const valid = await argon2.verify(hash, password);
    if (!valid) return fail('INVALID_CREDENTIALS');

    return ok({
      id: String(user.getDataValue('id') ?? ''),
      email: String(user.getDataValue('email') ?? ''),
      fullName: String(user.getDataValue('fullName') ?? 'Platform Admin'),
      roleName: 'PLATFORM_ADMIN',
    });
  }
}

export default new PlatformAuthDelegate();
