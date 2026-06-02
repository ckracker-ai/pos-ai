import * as argon2 from 'argon2';
import { v4 as uuidv4 } from 'uuid';
import PlatformUser from '../modules/platform/models/PlatformUser.model';

const ARGON2_OPTIONS: argon2.Options & { raw?: false } = {
  type: argon2.argon2id,
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 4,
};

export async function seedBootstrapPlatformAdmin(): Promise<void> {
  if (process.env.BOOTSTRAP_PLATFORM_ADMIN_ENABLED === 'false') return;

  const email = (process.env.PLATFORM_ADMIN_EMAIL ?? 'platform@pos-ai.local').trim().toLowerCase();
  const password = process.env.PLATFORM_ADMIN_PASSWORD ?? 'PlatformAdmin2026!';
  const fullName = process.env.PLATFORM_ADMIN_FULL_NAME ?? 'Platform Admin';
  const forceReset = process.env.BOOTSTRAP_PLATFORM_ADMIN_RESET_PASSWORD === 'true';

  const existing = await PlatformUser.scope('withPassword').findOne({ where: { email } });
  const passwordHash = await argon2.hash(password, ARGON2_OPTIONS);

  if (!existing) {
    await PlatformUser.create({
      id: uuidv4(),
      email,
      password: passwordHash,
      fullName,
      isActive: true,
    });
    console.log(`✅  Platform admin seeded: ${email}`);
    return;
  }

  if (forceReset) {
    await existing.update({ password: passwordHash, fullName, isActive: true });
    console.log(`✅  Platform admin password reset: ${email}`);
  }
}
