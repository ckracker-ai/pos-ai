# Sprint 4 — QA smoke y checklist pre-GitHub

Checklist para validar el monorepo antes del primer push a GitHub (ramas `dev` / `prod`).

## 1. Arranque limpio (Docker)

```powershell
cd d:\Proyectos\svm\node
docker compose down
docker compose up -d --build
docker compose ps
```

Esperar hasta que todos los servicios estén `healthy` (healthchecks en `docker-compose.yml`).

| Servicio   | Puerto (dev) | Healthcheck              |
|-----------|--------------|--------------------------|
| frontend  | 80           | HTTP 200 en `/`          |
| api-bff   | 3000         | `GET /api/health`        |
| api-core  | (interno)    | `GET /health`            |
| db-mysql  | (interno)    | `mysqladmin ping`        |

## 2. Smoke automatizado

**Windows (PowerShell):**

```powershell
.\scripts\qa-smoke.ps1
```

**Linux / VPS:**

```bash
chmod +x scripts/qa-smoke.sh
./scripts/qa-smoke.sh
```

Variables opcionales: `BASE_URL`, `FRONTEND_URL`, `INTERNAL_KEY`, credenciales admin/comanda.

El script valida:

- Health del BFF
- Frontend accesible
- Login ADMIN y COMANDA (incluye `branchId` en comanda)
- Listado categorías y usuarios (admin)
- Listado ventas/comandas (comanda)
- Ciclo soft delete + restore de categoría

## 3. Regresión manual por rol

### ADMIN (`admin@empanadascostaazul.cl`)

- [ ] Login y navegación al dashboard
- [ ] CRUD categorías / proveedores
- [ ] Desactivar registro → toast con **Deshacer** → restaurar
- [ ] Usuarios: desactivar / restaurar
- [ ] Reset password de un usuario de prueba

### AUDITOR

- [ ] Login
- [ ] Ver usuarios y reportes (solo lectura donde aplique)
- [ ] No puede operaciones reservadas a admin

### SELLER

- [ ] Login
- [ ] POS / ventas / catálogo según permisos
- [ ] Cambio de sucursal si aplica

### COMANDA (`comanda@empanadacostaazul.cl`)

- [ ] Login sin quedar en “Cargando…” infinito
- [ ] Ve sucursal asignada en pantalla
- [ ] Lista comandas/ventas de su sucursal (sin error 403)

## 4. Build de producción (local)

```powershell
cd frontend && npm run build
cd ..\api-bff && npm run build
cd ..\api-core && npm run build
```

Todos deben completar sin errores TypeScript.

## 5. Archivos sensibles (.gitignore raíz)

Verificar que **no** se commiteen:

- `.env`, `.env.local`, `.env.prod`
- `node_modules/`, `.next/`, `dist/`
- Certificados en `nginx/certs/live/`

Plantillas seguras: `.env.docker.example`, `.env.prod.example`.

## 6. Producción (VPS)

Ver también:

- [VPS-SSL.md](./VPS-SSL.md) — Nginx + Let's Encrypt
- [PROD-RESET-CLEAN-DB.md](./PROD-RESET-CLEAN-DB.md) — reset BD en prod

```bash
cp .env.prod.example .env.prod
# editar secretos y dominios
docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.prod up -d --build
./scripts/qa-smoke.sh   # BASE_URL=https://api.tudominio.cl si aplica
```

## 7. Criterio de salida Sprint 4

- [ ] `docker compose up --build` OK desde cero
- [ ] `qa-smoke.ps1` / `qa-smoke.sh` sin FAIL
- [ ] Builds TS/Next OK
- [ ] `.gitignore` raíz presente
- [ ] Checklist manual por rol revisado

**Siguiente paso:** crear repo GitHub monorepo, ramas `dev` y `prod`, primer push.
