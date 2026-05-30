import 'dotenv/config';
import express, { Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';

import sequelize from './config/database';
import { defineAssociations } from './db/associations';
import { seedRoles } from './db/seedRoles';
import { seedBootstrapAdmin } from './db/seedBootstrapAdmin';
import { globalErrorHandler, sendOk } from './middleware/globalErrorHandler';

import authRoutes from './modules/auth/routes/auth.routes';
import inventoryRoutes from './modules/inventory/routes/inventory.routes';
import catalogRoutes from './modules/catalog/routes/catalog.routes';
import salesRoutes from './modules/sales/routes/sales.routes';
import shrinkageRoutes from './modules/shrinkage/routes/shrinkage.routes';
import branchRoutes from './modules/branch/routes/branch.routes';
import reportsRoutes from './modules/reports/routes/reports.routes';
import empresaRoutes from './modules/tenant/routes/empresa.routes';
import { APP_NAME, APP_VERSION } from './version';


const internalKeyGuard = (req: Request, res: Response, next: express.NextFunction) => {
  const key = req.headers['x-internal-key'];
  if (!process.env.INTERNAL_API_KEY || key !== process.env.INTERNAL_API_KEY) {
    res.status(401).json({ success: false, data: null, error: 'UNAUTHORIZED', code: 401 });
    return;
  }
  next();
};

async function bootstrap(): Promise<void> {
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

  // Protected routes (require internal key)
  app.use(internalKeyGuard);
  app.use('/inventory', inventoryRoutes);
  app.use('/catalog', catalogRoutes);
  app.use('/branch', branchRoutes);
  
  app.use('/sales', salesRoutes);
  app.use('/shrinkage', shrinkageRoutes);
  app.use('/reports', reportsRoutes);
  app.use('/empresas', empresaRoutes);


  app.use(globalErrorHandler);

  const PORT = Number(process.env.CORE_PORT ?? 4000);
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀  SVM Core API v${APP_VERSION} listening on port ${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error('Bootstrap failed:', err);
  process.exit(1);
});
