# POS-AI Core API — Project Structure

```
pos-api-core/
├── Dockerfile                          # Multi-stage, puerto 1010
├── .env.example
├── package.json
├── tsconfig.json
├── pos-api-core.postman_collection.json
│
└── src/
    ├── server.ts                       # Bootstrap Express + rutas
    ├── config/database.ts              # Sequelize → pos-ai-db
    ├── version.ts
    ├── modules/
    │   ├── auth/
    │   ├── catalog/
    │   ├── tenant/                     # Empresas (multi-tenant v1.4)
    │   └── ...
    └── utils/tenantScope.ts
```

Schema SQL en `../db-init/init.sql` → base `pos-ai-db`.
