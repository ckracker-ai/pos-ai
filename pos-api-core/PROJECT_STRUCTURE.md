# SVM Core API – Project Structure

```
svm-core/
├── Dockerfile                          # Multi-stage: builder → production (node:20-alpine)
├── docker-compose.yml                  # DB + Core API, redes aisladas
├── .env.example                        # Variables de entorno (nunca commitear .env)
├── package.json
├── tsconfig.json
├── init.sql                            # Schema SQL + triggers + seed de roles
│
└── src/
    ├── server.ts                       # Bootstrap: Express, DB, rutas, error handler
    │
    ├── types/
    │   └── result.ts                   # Result<T,E> | ok() | fail() | isOk() | isFail()
    │
    ├── config/
    │   └── database.ts                 # Sequelize instance (pool, dialect, logging)
    │
    ├── db/
    │   └── associations.ts             # TODAS las relaciones Sequelize centralizadas
    │
    ├── middleware/
    │   └── globalErrorHandler.ts       # Captura Sequelize errors + sendOk/sendFail helpers
    │
    └── modules/
        │
        ├── auth/
        │   ├── models/
        │   │   ├── Role.model.ts       # ENUM('ADMIN','AUDITOR','SELLER','COMANDA')
        │   │   └── User.model.ts       # defaultScope excluye password; scope('withPassword')
        │   ├── delegates/
        │   │   └── AuthDelegate.ts     # register() + login() con Argon2id + Result Pattern
        │   └── routes/
        │       └── auth.routes.ts      # POST /auth/register, /auth/login | GET /auth/users/:id
        │
        ├── catalog/
        │   ├── models/
        │   │   ├── Category.model.ts
        │   │   ├── Supplier.model.ts
        │   │   └── Product.model.ts    # FK → category_id, supplier_id (RESTRICT)
        │   └── delegates/
        │       └── CatalogDelegate.ts  # (a implementar: CRUD productos, categorías)
        │
        ├── branch/
        │   └── models/
        │       └── Branch.model.ts
        │
        ├── inventory/
        │   ├── models/
        │   │   └── InventoryStock.model.ts  # M:N products ↔ branches (UNIQUE product+branch)
        │   ├── delegates/
        │   │   └── InventoryDelegate.ts     # getByBranch, upsert, adjust(delta), getLowStock
        │   └── routes/
        │       └── inventory.routes.ts
        │
        ├── shrinkage/
        │   ├── models/
        │   │   └── Shrinkage.model.ts       # ENUM status: PENDING | APPROVED | REJECTED
        │   └── delegates/
        │       └── ShrinkageDelegate.ts     # (a implementar: reporte, aprobación)
        │
        └── sales/
            ├── models/
            │   ├── Sale.model.ts            # FK → branch_id, seller_id (RESTRICT)
            │   └── SaleDetail.model.ts      # FK → sale_id (CASCADE), product_id (RESTRICT)
            └── delegates/
                └── SalesDelegate.ts         # (a implementar: crear venta + descontar stock)
```

## Relaciones de Integridad Referencial

| Tabla              | FK              | Referencia       | ON DELETE    |
|--------------------|-----------------|------------------|--------------|
| users              | role_id         | roles.id         | RESTRICT     |
| products           | category_id     | categories.id    | RESTRICT     |
| products           | supplier_id     | suppliers.id     | RESTRICT     |
| inventory_stock    | product_id      | products.id      | RESTRICT     |
| inventory_stock    | branch_id       | branches.id      | RESTRICT     |
| shrinkages         | product_id      | products.id      | RESTRICT     |
| shrinkages         | branch_id       | branches.id      | RESTRICT     |
| shrinkages         | reported_by     | users.id         | RESTRICT     |
| shrinkages         | approved_by     | users.id         | SET NULL     |
| sales              | branch_id       | branches.id      | RESTRICT     |
| sales              | seller_id       | users.id         | RESTRICT     |
| sale_details       | sale_id         | sales.id         | **CASCADE**  |
| sale_details       | product_id      | products.id      | RESTRICT     |

> `CASCADE` solo en `sale_details → sales`: si se cancela/borra una venta,
> sus detalles se eliminan. Todos los demás son `RESTRICT` para proteger
> la integridad contable.

## Principios Aplicados

- **UUID v4** como PK en todas las tablas (`DataTypes.UUIDV4`)
- **Argon2id** (memoryCost 64MiB, timeCost 3, parallelism 4) en `AuthDelegate`
- **Result Pattern** `{ success, value, error }` — sin excepciones en lógica de negocio
- **defaultScope** excluye `password` de todas las queries de `User`
- **Business Delegate** — los controladores nunca importan Sequelize directamente
- **internalKeyGuard** — el Core API rechaza tráfico que no venga del BFF
- **globalErrorHandler** — clasifica errores de Sequelize y responde con el envelope unificado
