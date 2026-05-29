# Limpieza de BD para producción

Este flujo deja la base en estado limpio y crea automáticamente el admin inicial.

## 1) Configurar variables

En `.env.prod` (o variables del entorno):

- `BOOTSTRAP_ADMIN_EMAIL=admin@empanadascostaazul.cl`
- `BOOTSTRAP_ADMIN_PASSWORD=@dmin123_`
- `BOOTSTRAP_ADMIN_BRANCH_NAME=Sucursal Central`
- `BOOTSTRAP_ADMIN_ENABLED=true`

## 2) Reiniciar stack con volumen limpio

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.prod down -v
docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

> `down -v` elimina datos actuales de MySQL. Ejecutar solo cuando quieras reinicializar totalmente.

## 3) Resultado esperado

- Esquema y triggers creados desde `db-init/init.sql`
- Datos semilla mínimos:
  - Sucursal: `Sucursal Central`
  - Roles: `ADMIN`, `AUDITOR`, `SELLER`, `COMANDA`
- Usuario admin inicial creado por `api-core` al arrancar:
  - Email: `admin@empanadascostaazul.cl`
  - Password: `@dmin123_`
  - Rol: `ADMIN`
  - Sucursal: `Sucursal Central`

## 4) Recomendación post go-live

1. Ingresar con el admin inicial.
2. Cambiar contraseña inmediatamente.
3. Crear usuarios operativos por rol.
4. Guardar credenciales en gestor seguro (no en texto plano).

