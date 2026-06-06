# Territorio CUT y sucursal — WhatsApp / voz

Sprint **S2** — comuna oficial Chile + código postal en sucursales.

## Flujo WSP

| Paso | Cliente | Bot |
|------|---------|-----|
| 1 | `comuna estacion central` | Lista comunas (tolerante a tildes) |
| 2 | `1` | Sucursales en esa comuna (o auto-selección si hay una) |
| 3 | `buscar empanada` | Catálogo en sucursal activa |

Alternativa clásica: `sucursales` → número.

## API assistant (core, `x-empresa-id`)

- `GET /assistant/territory/comunas/search?q=`
- `POST /assistant/territory/resolve` — body `{ comunaId?, comunaText?, codigoPostal? }`

## API tenant (BFF)

- `GET /pos/proxy/territory/regions`
- `GET /pos/proxy/territory/comunas?regionId=13`
- `GET /pos/proxy/territory/comunas/search?q=`
- `POST /pos/proxy/territory/resolve`

Cache BFF: `territoryCache.ts` (regiones + comunas por región).

## Datos CUT

- Fuente: SUBDERE (CSV en `data/cut/cut_comuna-subdere-2018.csv`)
- Regenerar TS: `node scripts/build-chile-cut-data.mjs`
- Seed al arranque core: `seedCutChile()` — 16 regiones, **346 comunas**

## Tests

```powershell
cd pos-api-core; npm run test:territory
cd pos-api-assistant; npm run test:wsp-territory
.\scripts\qa-smoke.ps1 -IncludeS2
```
