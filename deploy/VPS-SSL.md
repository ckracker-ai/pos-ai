# Despliegue VPS con Nginx y SSL (SVM ERP)

## Arquitectura

```
Internet :80 / :443
        │
    ┌───▼───┐
    │ Nginx │  public_gateway
    └───┬───┘
        ├── app.<dominio>  → frontend:80  (+ /api/ → api-bff:3000)
        └── api.<dominio>  → api-bff:3000

api-bff ──► api-core:4000 ──► db-mysql
              (internal_backend, sin puertos al host)
```

- **api-core** y **MySQL** no se exponen al exterior.
- **Desarrollo local** sigue usando solo `docker compose up` (sin Nginx).
- **Producción** usa overlay: `docker-compose.prod.yml`.

## Fases

### 1. Sin certificados (HTTP)

1. Copiar variables: `cp .env.prod.example .env.prod`
2. Poner dominios reales o temporales en `APP_DOMAIN` / `API_DOMAIN`
3. Apuntar DNS A/AAAA del VPS a esos hostnames
4. Levantar stack:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

Nginx sirve en **HTTP** hasta que existan certificados en `nginx/certs/live/<dominio>/`.

### 2. Let's Encrypt (cuando tengas dominio)

Con Nginx en HTTP y DNS propagado:

```bash
chmod +x scripts/certbot-issue.sh
./scripts/certbot-issue.sh
docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.prod restart nginx
```

`SSL_MODE=auto` detecta los `.pem` y activa HTTPS + redirección 80→443.

Renovación (cron en el VPS, ejemplo diario 3am):

```cron
0 3 * * * cd /opt/svm/node && docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.prod run --rm certbot renew && docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.prod restart nginx
```

### 3. Prueba local con HTTPS autofirmado

```bash
APP_DOMAIN=app.localhost API_DOMAIN=api.localhost ./scripts/generate-self-signed-certs.sh
# En .env.prod: SSL_MODE=on
```

Añadir en `/etc/hosts` (o `C:\Windows\System32\drivers\etc\hosts`):

```
127.0.0.1 app.localhost api.localhost
```

## Variables clave (.env.prod)

| Variable | Descripción |
|----------|-------------|
| `APP_DOMAIN` | Host del frontend |
| `API_DOMAIN` | Host del BFF (clientes externos / móvil) |
| `NEXT_PUBLIC_API_URL` | Vacío = `/api` mismo origen; o `https://api...` |
| `SSL_MODE` | `auto` \| `on` \| `off` |
| `INTERNAL_API_KEY` | Debe coincidir en frontend build y api-core |

## Firewall VPS (ufw)

```bash
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

## Notas de seguridad

- Cambiar todos los secretos de `.env.prod.example` antes de producción.
- No commitear `.env.prod` ni `nginx/certs/` (solo `.gitkeep`).
- El BFF sigue validando JWT en **api-core**; Nginx solo termina TLS y enruta tráfico.
