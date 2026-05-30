# POS-AI API BFF (v1.4)

Backend-for-frontend que orquesta el tráfico entre `pos-frontend` y `pos-api-core`.

## Objetivos

- Exponer rutas seguras y validadas para el frontend.
- Gestionar `X-Branch-ID` en cada petición.
- Validar permisos JWT y RBAC.
- Orquestar necesidades de stock, ventas y auditoría.
- Enriquecer respuestas del Core API.
- Contener la infraestructura con Docker y redes aisladas.

## Comandos

- `npm install`
- `npm run dev`
- `npm run build`
- `npm start`

## Estructura principal

- `src/app.ts`: configuración del servidor y plugins.
- `src/server.ts`: arranque de la aplicación.
- `src/routes/`: rutas de la API.
- `src/middlewares/`: middleware de contexto y seguridad.
- `src/services/`: orquestación contra Core API.
- `src/schemas/`: validaciones Zod.
- `src/utils/`: utilidades de resultados y errores.
- `docker-compose.yml`: red pública / backend interno.
