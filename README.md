# POS-AI — ERP SaaS multi-tenant

Stack: `pos-frontend` · `pos-api-bff` · `pos-api-core` · `pos-api-assistant` · MySQL (`db-init`).

## Ramas Git

| Rama | Uso |
|------|-----|
| **`master`** | Versión estable / releases |
| **`dev`** | Desarrollo diario (Docker local) |

Flujo: trabajar en **`dev`** → cuando cierra una versión, **merge a `master`** y tag de release.

No versionar en Git: `scripts/`, `docs/`, `deploy/`, `.env*` (solo en tu PC o en el VPS).

## Estructura (producto)

```
POS-AI/
├── pos-frontend/
├── pos-api-bff/
├── pos-api-core/
├── pos-api-assistant/
├── db-init/
├── nginx/
├── docker-compose.yml
└── docker-compose.prod.yml
```

## Arranque local (Docker)

```powershell
docker compose up -d --build
```

- UI: http://localhost:8010/
- BFF: http://localhost:2020/
- Core: http://localhost:1010/
- Assistant: http://localhost:3030/

Variables de entorno: archivo `.env` en la raíz (**no subir a Git**). En VPS usar `.env.prod` solo en el servidor.

## Producción (VPS)

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

Generar secretos nuevos en el servidor; no reutilizar valores de desarrollo.

## Limpiar el índice Git (una vez)

Si `deploy/`, `docs/` o `scripts/` ya estaban en GitHub, quítalos del tracking **sin borrar tus archivos locales**:

```powershell
cd d:\Proyectos\POS-AI
git rm -r --cached deploy docs scripts
git rm --cached SPRINT-PLAN.md CHANGELOG.md .env.docker.example .env.prod.example .env.sandbox.example 2>$null
git rm -r --cached .cursor 2>$null
git add .gitignore README.md
git commit -m "chore: repo solo producto; excluir scripts, docs, deploy y env"
```

## Ramas (dejar solo master + dev)

```powershell
# Desde tu rama de trabajo actual (ej. sprint/wsp-comprobantes-2026-06)
git checkout -B dev
git push -u origin dev

# master estable (solo merges de release)
git checkout master
git merge dev   # cuando cierre versión

# Borrar ramas locales obsoletas
git branch -d POS-AI sprint/wsp-comprobantes-2026-06
git push origin --delete POS-AI sprint/wsp-comprobantes-2026-06
```
