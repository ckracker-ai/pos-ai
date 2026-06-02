# Seguridad — backlog pendiente

**Estado:** pendiente (no bloquea MVP funcional)  
**Registrado:** 2026-06-01  
**Contexto:** revisión técnica auth (sin refresh token), datos sensibles en BD en claro, secretos solo en servidor.

---

## Principio operativo (servidor)

- Los **`.env` reales no se suben al repo** — solo plantillas (`.env.docker.example`, etc.).
- Secretos y keys viven en el **servidor** según la estructura de despliegue actual (misma política que el resto del stack POS-AI).
- Rotación y permisos de archivos `.env` en el host (solo usuario del servicio / deploy).

---

## Checklist de fortalecimiento

| # | Tema | Pendiente | Notas actuales |
|---|------|-----------|----------------|
| 1 | **Secrets / keys** | Rotar `JWT_SECRET`, `INTERNAL_API_KEY`, `OPENAI_API_KEY`, Meta, webhooks; prohibir valores demo en prod | BFF tiene `JWT_REFRESH_SECRET` sin uso |
| 2 | **Auth sesiones** | Refresh token o sesión server-side; expiración corta access + rotación | Hoy: un JWT 24h tenant; platform JWT Fastify |
| 3 | **Datos en BD** | Cifrado por campo o vault para: cuenta bancaria, RUT titular, imágenes comprobante | Contraseñas: Argon2id ✅; PII/cuentas/comprobantes: texto plano |
| 4 | **Tránsito** | TLS obligatorio prod (terminación nginx/traefik) | — |
| 5 | **Rate limiting** | Límites en **servidor** (BFF y/o reverse proxy): login, webhooks, assistant, APIs públicas | No implementado en código hoy |
| 6 | **Headers / hardening** | Helmet, CORS estricto, tamaño body, timeout | Revisar por servicio |
| 7 | **Auditoría** | Log de intentos login fallidos, cambios sensibles empresa/transferencia | — |
| 8 | **IA externa** | Política de qué datos salen a OpenAI; anonimizar comprobantes si aplica | Assistant usa API cloud, no GPU local |

---

## Rate limit (servidor) — alcance sugerido

Aplicar en **reverse proxy** (nginx, Caddy, cloud WAF) y/o middleware BFF:

| Ruta / recurso | Límite orientativo |
|----------------|-------------------|
| `POST /auth/login`, `POST /platform/auth/login` | p. ej. 10 req/min por IP |
| `POST /webhooks/*` | por IP + validación firma (no solo rate) |
| `POST /platform/assistant/simulate` | solo plataforma autenticada + límite bajo |
| APIs públicas (`/public/*`) | p. ej. 60 req/min por IP |

Documentar reglas en el runbook del servidor cuando se implementen.

---

## Cifrado de datos — prioridad sugerida

1. **Comprobantes** (`proof_image_data`) → object storage cifrado (SSE) o cifrado app + clave en KMS/secret manager.  
2. **Transferencia empresa** (banco, cuenta, RUT titular) → AES-GCM con clave en servidor, no en git.  
3. **PII** (teléfonos, emails) → según requisito legal; mínimo cifrado en reposo del volumen BD.

---

## Criterio de “hecho” (futuro sprint `v1.9-sec` o similar)

- [ ] `.env` prod verificado fuera de git y con permisos restrictivos en server  
- [ ] Secrets de ejemplo reemplazados en producción  
- [ ] Rate-limit activo en login + webhooks (proxy o BFF)  
- [ ] Diseño aprobado para cifrado de comprobantes + datos bancarios  
- [ ] Refresh token o alternativa documentada y desplegada  

---

## Referencias código

| Área | Ubicación |
|------|-----------|
| JWT tenant | `pos-api-core` → `AuthDelegate.login`, `auth.middleware` |
| JWT platform | `pos-api-bff` → `platform/auth`, `requirePlatformAuth` |
| Plantilla env | `.env.docker.example` |
| Comprobantes BD | `AssistantPaymentProof`, `AssistantDelegate` |
| OpenAI | `pos-api-assistant` → `OPENAI_API_KEY` |
