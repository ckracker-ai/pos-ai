# POS-AI v1.4 — QA smoke y checklist pre-release

Checklist para validar el monorepo antes de merge o deploy.

## 1. Arranque limpio (Docker)

```powershell
cd d:\Proyectos\POS-AI
docker compose down
docker compose up -d --build
docker compose ps
```

Esperar hasta que todos los servicios estén `healthy`.

| Servicio | Puerto (host) | Healthcheck |
|----------|---------------|-------------|
| pos-frontend | **8010** | HTTP 200 en `/` |
| pos-api-bff | **2020** | `GET /pos/proxy/health` → `version: 1.4.0` |
| pos-api-core | **1010** | `GET /health` → `version: 1.4.0` |
| pos-ai-db-mysql | **3308** | `mysqladmin ping` |

> MySQL host **3308** (SVM usa 3306 en el mismo equipo).

## 2. Smoke automatizado

**Windows (PowerShell):**

```powershell
.\scripts\qa-smoke.ps1
```

**Linux / Git Bash / VPS:**

```bash
chmod +x scripts/qa-smoke.sh
./scripts/qa-smoke.sh
```

Variables opcionales: `BASE_URL` (default `http://localhost:2020`), `PROXY_PREFIX` (`/pos/proxy`), `FRONTEND_URL` (`http://localhost:8010`), `INTERNAL_KEY`, credenciales admin/comanda.

El script valida:

- Health del BFF (`/pos/proxy/health`)
- Frontend accesible (8010)
- Login ADMIN y COMANDA
- **GET /empresas/me** y **PATCH /empresas/:id** vía BFF
- Listado categorías y usuarios (admin)
- Listado ventas/comandas (comanda)
- Ciclo soft delete + restore de categoría

**Postman / Newman (core directo):**

```bash
npx newman run pos-api-core/pos-api-core.postman_collection.json \
  --folder "Empresas" \
  --env-var "baseUrl=http://localhost:1010" \
  --env-var "keyInternal=supersecretkey"
```

Ver también `pos-api-core/QA-EMPRESAS-v1.4.md`.

## 3. Regresión manual por rol

### ADMIN (`admin@empanadascostaazul.cl` / `@dmin123_`)

- [ ] Login y navegación al dashboard
- [ ] **Mantenedores → Empresa**: editar nombre fantasía → guardar → recargar
- [ ] CRUD categorías / proveedores
- [ ] Desactivar registro → toast con **Deshacer** → restaurar
- [ ] Usuarios: desactivar / restaurar
- [ ] Reset password de un usuario de prueba

### AUDITOR

- [ ] Login
- [ ] **Empresa**: formulario en solo lectura (sin botón Guardar)
- [ ] Ver usuarios y reportes (solo lectura donde aplique)

### SELLER

- [ ] Login
- [ ] POS / ventas según permisos
- [ ] No ve menú Empresa

### COMANDA (`comanda@empanadacostaazul.cl`)

- [ ] Login sin quedar en “Cargando…” infinito
- [ ] Lista comandas/ventas de su sucursal (sin error 403)

## 4. Build de producción (local)

```powershell
cd pos-frontend
npm install
npm run build
cd ..\pos-api-bff
npm run build
cd ..\pos-api-core
npm run build
```

En Docker, `docker compose build` es la vía recomendada.

## 5. URLs de referencia

| Recurso | URL |
|---------|-----|
| UI | http://localhost:8010 |
| BFF health | http://localhost:2020/pos/proxy/health |
| Core health | http://localhost:1010/health |
