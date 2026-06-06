# Comprobantes y “vale” — variantes (plan Estándar)

Cuando el cliente confirma un pedido por WhatsApp (plan **Estándar**), recibe datos de transferencia y debe enviar comprobante. Este documento lista las variantes que el asistente reconoce y cómo responde.

## Flujo resumido

1. Cliente: `pedido <id> <cantidad>` → mensaje con datos bancarios.
2. Cliente envía **imagen** (o escribe *vale* / *ya pagué* sin foto).
3. IA (opcional `OPENAI_API_KEY`) clasifica el comprobante.
4. Se registra en `assistant_payment_proofs` y se notifica vendedor/admin por WSP.
5. **No** se confirma el pedido automáticamente; validación manual en POS.

## Texto sin imagen (“vale”, “ya pagué”)

| Entrada cliente | Respuesta |
|-----------------|-----------|
| `vale`, `ya pagué`, `listo`, `aquí va`, `comprobante`, `transferí` | Si hay pedido PENDING: pide foto + opcional caption con monto |
| `vale 5000`, `pago 5000` | Igual; el monto del caption ayuda si la foto es borrosa |
| Sin pedido pendiente | Indica que arme pedido con `buscar` + `pedido` |
| Plan Full (`pagosOnline`) | Redirige al link de pago |

## Perfil de transferencia por empresa

Cada comercio configura en **Plataforma → Empresas → Canal WhatsApp**:

- Banco, tipo de cuenta, N° cuenta, titular, RUT titular

Esos mismos datos se envían al cliente al confirmar pedido y la IA los usa como **referencia** al analizar el comprobante.

| Variante nueva | Cuándo |
|----------------|--------|
| `WRONG_RECIPIENT` | Monto OK pero RUT/cuenta/nombre destino no coincide con perfil |
| `AMOUNT_OK_RECIPIENT_UNCLEAR` | Monto OK; destinatario no legible en imagen |

Sin perfil configurado: solo validación de monto (comportamiento anterior).

Migración: `004-transfer-profile.sql` (incluida en `migrate-v1.7-assistant.ps1`).

## Variantes de imagen (clasificación)

| Variante | Cuándo | Cliente | Admin |
|----------|--------|---------|-------|
| `TRANSFER_OK` | Monto ≈ total (±500 CLP) | Comprobante recibido; equipo notificado | Notificación con ✅ |
| `TRANSFER_AMOUNT_MISMATCH` | Monto distinto al pedido | Revisión manual | ⚠️ monto no coincide |
| `TRANSFER_PARTIAL` | Monto menor al total | Aviso de pago parcial | ⚠️ pago parcial |
| `TRANSFER_OVERPAY` | Monto mayor al total | Revisión manual | ⚠️ sobrepago |
| `NO_AMOUNT` | No se lee monto | Pide reenvío o caption con monto | Registro + revisar |
| `UNCLEAR` | Foto borrosa/recortada | Pide foto más nítida | Registro + revisar |
| `NOT_PAYMENT` | Producto, chat, meme, etc. | Pide captura bancaria real | **No** registra proof |
| `WRONG_RECIPIENT` | Monto OK, destino distinto al comercio | Verifica cuenta/RUT del mensaje de pago | ❌ destinatario incorrecto |
| `AMOUNT_OK_RECIPIENT_UNCLEAR` | Monto OK, destino no legible | Revisión manual | ⚠️ |

## Origen del comprobante (Chile)

La visión está entrenada para detectar:

- Apps banco: BancoEstado, BCI, Santander, Itaú, Scotiabank, Banco de Chile, Security, Falabella, Ripley, Coopeuch.
- Fintech: Mach, Tenpo, Mercado Pago, Fintual, prepago.
- Captura de correo/web exportada como foto.
- Depósito / abono en cajero.

Formatos de monto: `$5.000`, `$5000`, `CLP 5000`, `5.000`.

## Meta WhatsApp — tipos de mensaje

| Tipo Meta | Soporte |
|-----------|---------|
| `image` + caption | ✅ Principal |
| `document` PDF | Mensaje: enviar captura JPG/PNG |
| `document` imagen | ✅ Se procesa como imagen |
| Solo texto “vale” | ✅ Pide foto |

## Caption útil

Al enviar la imagen, el cliente puede escribir:

- `vale`
- `vale 5000`
- `pago transferencia 5000`

Si la IA no lee el monto en la imagen, se usa el caption como respaldo.

## Simulador / dev

```powershell
# Texto "vale" sin imagen
Invoke-RestMethod -Uri "http://localhost:3030/webhooks/whatsapp" -Method POST -ContentType "application/json" -Body '{"from":"56900000001","text":"vale"}'

# Imagen base64 (truncada en ejemplo; usar imagen real)
Invoke-RestMethod -Uri "http://localhost:3030/webhooks/whatsapp" -Method POST -ContentType "application/json" -Body '{"from":"56900000001","imageBase64":"<base64>","caption":"vale 5000"}'
```

## Almacenamiento

`vision_summary` guarda prefijo `[VARIANTE]` + JSON con banco, RUT, fecha, confianza y alertas.

## Límites actuales

- Un comprobante activo por pedido (reenvío actualiza la imagen sin repetir WSP al admin).
- Notificación WSP: solo al **teléfono admin** del comercio (`assistant_admin_phone` o admin de sucursal), **una vez por pedido**.
- No confirma pedido automáticamente aunque `TRANSFER_OK`.
- Sin `OPENAI_API_KEY`: solo caption manual y revisión humana.
- PDF nativo no se analiza; se pide screenshot.
