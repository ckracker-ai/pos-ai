/** Loaded before Core tests so Sequelize can construct without a live DB. */
process.env.DB_USER ??= 'usr_pos_test';
process.env.DB_PASSWORD ??= 'usr_pos_test_password_32charsx';
process.env.DB_NAME ??= 'pos-ai-db';
process.env.JWT_SECRET ??= 'pos_ai_jwt_secret_key_2026_dev_only_32';
process.env.INTERNAL_API_KEY ??= 'pos_ai_internal_dev_only_key_32bxx';
