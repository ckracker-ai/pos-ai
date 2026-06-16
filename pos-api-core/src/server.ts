import 'dotenv/config';
import { timingSafeEqual } from 'crypto';
import express, { Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';

import sequelize from './config/database';
import { defineAssociations } from './db/associations';
import { seedRoles } from './db/seedRoles';
import { seedBootstrapAdmin } from './db/seedBootstrapAdmin';
import { seedBootstrapDemoUsers } from './db/seedBootstrapDemoUsers';
import { globalErrorHandler, sendOk } from './middleware/globalErrorHandler';

import authRoutes from './modules/auth/routes/auth.routes';
import inventoryRoutes from './modules/inventory/routes/inventory.routes';
import catalogRoutes from './modules/catalog/routes/catalog.routes';
import salesRoutes from './modules/sales/routes/sales.routes';
import shrinkageRoutes from './modules/shrinkage/routes/shrinkage.routes';
import branchRoutes from './modules/branch/routes/branch.routes';
import reportsRoutes from './modules/reports/routes/reports.routes';
import empresaRoutes from './modules/tenant/routes/empresa.routes';
import assistantRoutes from './modules/assistant/routes/assistant.routes';
import paymentProofRoutes from './modules/assistant/routes/paymentProof.routes';
import platformAuthRoutes from './modules/platform/routes/platformAuth.routes';
import { seedBootstrapPlatformAdmin } from './db/seedBootstrapPlatformAdmin';
import { seedCutChile } from './db/seedCutChile';
import { APP_NAME, APP_VERSION } from './version';
import territoryRoutes from './modules/territory/routes/territory.routes';
import paymentRoutes from './modules/payments/routes/payment.routes';
import { legalPublicRoutes, legalProtectedRoutes } from './modules/legal/routes/legal.routes';
import { startTenantDeletionJob } from './jobs/tenantDeletionJob';
import { getRedis, isRedisConfigured } from './lib/redis';


const internalKeyGuard = (req: Request, res: Response, next: express.NextFunction) => {
  const expected = process.env.INTERNAL_API_KEY ?? '';
  const provided = String(req.headers['x-internal-key'] ?? '');
  if (!expected) {
    res.status(401).json({ success: false, data: null, error: 'UNAUTHORIZED', code: 401 });
    return;
  }
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(provided, 'utf8');
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    res.status(401).json({ success: false, data: null, error: 'UNAUTHORIZED', code: 401 });
    return;
  }
  next();
};

function warnInsecureSecrets(): void {
  const jwt = process.env.JWT_SECRET ?? 'default_secret';
  if (jwt === 'default_secret' || jwt.length < 32) {
    console.warn('⚠️  JWT_SECRET is missing, default, or shorter than 32 chars — use a strong secret in production.');
  }
  const ik = process.env.INTERNAL_API_KEY ?? '';
  if (!ik || ik === 'supersecretkey' || ik.length < 24) {
    console.warn('⚠️  INTERNAL_API_KEY is missing, default, or weak — rotate before production.');
  }
  if (!process.env.FIELD_ENCRYPTION_KEY?.trim() && !process.env.FIELD_ENCRYPTION_KEY_B64?.trim()) {
    console.warn('⚠️  FIELD_ENCRYPTION_KEY missing — transfer fields cannot be encrypted/decrypted.');
  }
}

async function bootstrap(): Promise<void> {
  warnInsecureSecrets();
  defineAssociations();

  try {
    await sequelize.authenticate();
    console.log('✅  Database connection established');

    // El esquema lo define db-init/init.sql en Docker; alter en ENUM rompe MySQL.
    if (process.env.DB_SYNC_ALTER === 'true') {
      await sequelize.sync({ alter: true });
      console.log('✅  Models synced (alter)');
    }

    if (process.env.DB_SEED_ROLES !== 'false') {
      await seedRoles();
    }

    await seedBootstrapAdmin();
    await seedBootstrapDemoUsers();
    await seedBootstrapPlatformAdmin();
    await seedCutChile();

    if (isRedisConfigured()) {
      await getRedis();
    } else {
      console.info('[redis] REDIS_URL not set — auth cache and job locks run in single-instance mode');
    }
  } catch (err) {
    console.error('❌  Unable to connect to the database:', err);
    process.exit(1);
  }

  const app = express();

  app.use(helmet());
  app.use(cors({ origin: false }));
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  app.get('/health', (_req, res) =>
    sendOk(res, { status: 'ok', service: APP_NAME, version: APP_VERSION, ts: new Date().toISOString() })
  );

  // Public routes (no internal key guard)
  app.use('/auth', authRoutes);
  app.use('/platform', platformAuthRoutes);
  app.use('/legal', legalPublicRoutes);

  // Protected routes (require internal key)
  app.use(internalKeyGuard);
  app.use('/legal', legalProtectedRoutes);
  app.use('/inventory', inventoryRoutes);
  app.use('/catalog', catalogRoutes);
  app.use('/branch', branchRoutes);
  app.use('/territory', territoryRoutes);
  
  app.use('/sales', salesRoutes);
  app.use('/shrinkage', shrinkageRoutes);
  app.use('/reports', reportsRoutes);
  app.use('/empresas', empresaRoutes);
  app.use('/assistant', assistantRoutes);
  app.use('/payments', paymentRoutes);
  app.use('/payment-proofs', paymentProofRoutes);

  app.use(globalErrorHandler);

  const PORT = Number(process.env.PORT ?? process.env.CORE_PORT ?? 1010);
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀  ${APP_NAME} v${APP_VERSION} listening on port ${PORT}`);
    startTenantDeletionJob();
  });
}

bootstrap().catch((err) => {
  console.error('Bootstrap failed:', err);
  process.exit(1);
});
