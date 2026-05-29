import 'dotenv/config';
import sequelize from '../config/database';
import { defineAssociations } from './associations';
import { seedRoles } from './seedRoles';

async function syncDatabase(): Promise<void> {
  defineAssociations();
  await sequelize.authenticate();
  console.log('✅  Connected to the database');

  await sequelize.sync();
  console.log('✅  Database schema synchronized');

  await seedRoles();
  console.log('✅  Roles verified (ADMIN, AUDITOR, SELLER, COMANDA)');
}

syncDatabase().catch((error) => {
  console.error('❌  Failed to sync database:', error);
  process.exit(1);
});
