# Sprint — WhatsApp y comprobantes (jun 2026)

**Rama:** `sprint/wsp-comprobantes-2026-06`  
**Estado base:** WSP operativo en simulador; falta afinar calidad, UI y datos históricos.  
**Demo:** teléfono `56900000001` · empresa Costa Azul · sucursal Central · plataforma `platform@pos-ai.local`

---

## Hecho en esta rama (antes del sprint)

- Simulador WSP (`/platform/whatsapp`): teléfono editable, atajos, caption monto.
- Flujo bot: `sucursales` → `buscar` → `pedido` → **`confirmar`** → datos transferencia → `vale 5000` → foto.
- Comprobantes: un registro activo por pedido (upsert + consolidar duplicados + borrar imágenes extra).
- UI comprobantes: Confirmar / Rechazar / Descartar según estado del pedido.
- Plataforma super-admin: mismo shell que tenant (sidebar, tablas `app-table`, modales claros).
- Manual `/manual` por rol actualizado.
- BFF rutas assistant, vision sin “foto borrosa” si falla OpenAI (revisión manual + caption).
- Docker rebuild: frontend, core, bff, assistant.

---

## Backlog del sprint (orden sugerido)

| # | Ítem | Prioridad | Notas del usuario / contexto |
|---|------|-----------|------------------------------|
| **1** | **Checklist E2E WSP + comprobantes** | P0 | Validar flujo completo en simulador y tenant; documentar pasos y criterios de OK. |
| 2 | OpenAI: créditos + `OPENAI_API_KEY` válida | P0 | Key inválida (401) dejaba revisión manual; cargar créditos en billing OpenAI y reiniciar `pos-api-assistant`. |
| 3 | Limpieza datos demo | P1 | Pedido `#20ebce1c` con duplicados viejos; usar **Limpiar duplicados** + **Actualizar** o `cancelar pedido` en WSP. |
| 4 | Estilos tablas tenant (slate → marca) | P1 | Usuarios, productos, mermas, reportes, etc. aún con tema oscuro; alinear con `app-table` / olivo. |
| 5 | Carrito WSP (varios ítems antes de `confirmar`) | P2 | Usuario pidió poder armar pedido con varios productos antes de pagar. |
| 6 | Mensajes bot y variantes IA | P2 | Afinar textos `confirmar`, rechazo, destinatario ilegible; menos confusión al reenviar foto. |
| 7 | Datos transferencia | P1 | Empresa → pestaña Transferencia (tenant) y plataforma Empresas → canal WSP; deben coincidir con lo que ve el cliente. |
| 8 | Notificaciones admin WSP | P2 | Solo una notificación por pedido al subir comprobante (no re-spam al reenviar). |
| 9 | Encoding planes SaaS en BD | P3 | `B??sico` en dropdown → corregir charset en seed/BD o seguir con `getPlanDisplayName`. |
| 10 | Registro público / checkout SaaS | P3 | Fuera de WSP pero mencionado en docs comerciales. |

---

## Ítem 1 — Checklist E2E (en curso)

### Pre-requisitos

- [ ] `docker compose ps` — core, bff, assistant, frontend healthy.
- [ ] Binding WSP `56900000001` en Plataforma → Empresas.
- [ ] Usuario tenant admin con sucursal Central.

### Simulador (`/platform/whatsapp`)

- [ ] `sucursales` → `1`
- [ ] `buscar empanada` → listado numerado (sin UUID al cliente)
- [ ] `pedido 1 2` → resumen **sin** datos de pago todavía
- [ ] `confirmar` → banco, cuenta, RUT, “envía foto”
- [ ] `vale 5000` → anota monto
- [ ] 📷 imagen → un solo mensaje de recibido; no pide comprobante antes de `confirmar`

### Tenant (`/comprobantes`)

- [ ] Una sola fila por pedido tras **Actualizar**
- [ ] Botones **Confirmar pago** y **Rechazar** visibles si pedido `PENDING`
- [ ] Confirmar → pedido `COMPLETED`, cliente notificado
- [ ] Rechazar → pedido cancelado, stock liberado

### Criterio de cierre ítem 1

Flujo completo sin duplicados en pantalla ni errores 4xx/5xx en red.

---

## Comandos útiles

```powershell
docker compose build pos-frontend pos-api-core pos-api-bff pos-api-assistant
docker compose up -d --force-recreate pos-frontend pos-api-core pos-api-bff pos-api-assistant
```

URLs: UI http://localhost:8010 · BFF http://localhost:2020/pos/proxy/health · Core http://localhost:1010/health

---

## Próximo paso tras ítem 1

Ítem **2** (OpenAI) para que la IA lea comprobantes y reduzca “destinatario ilegible” / revisión manual.
