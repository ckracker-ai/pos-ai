import { Sequelize } from 'sequelize';
import { resolveDbSsl } from './dbSsl';

const FORBIDDEN_DB_USERS = new Set(['root', 'mysql.sys', 'mysql.session', 'mysql.infoschema', 'debian-sys-maint']);

function resolveDbUser(): string {
  const user = String(process.env.DB_USER ?? '').trim();
  if (!user || FORBIDDEN_DB_USERS.has(user.toLowerCase())) {
    throw new Error(
      'DB_USER must be a dedicated least-privilege account (not root or a MySQL system user).'
    );
  }
  return user;
}

function resolveDbPassword(): string {
  const password = process.env.DB_PASSWORD ?? '';
  if (!password) {
    throw new Error('DB_PASSWORD is required for the application database user.');
  }
  return password;
}

const dbSsl = resolveDbSsl();

const sequelize = new Sequelize(
  process.env.DB_NAME ?? 'pos-ai-db',
  resolveDbUser(),
  resolveDbPassword(),
  {
    host: process.env.DB_HOST ?? '127.0.0.1',
    port: Number(process.env.DB_PORT ?? 3306),
    dialect: 'mysql',
    logging: false,
    define: {
      underscored: true,
      freezeTableName: false,
      timestamps: true,
    },
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
    dialectOptions: {
      decimalNumbers: true,
      charset: 'utf8mb4',
      ...(dbSsl ? { ssl: dbSsl } : {}),
    },
  }
);

export default sequelize;
