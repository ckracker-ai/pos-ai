# Sprint S7 — Infraestructura legal SaaS (TDD + entregables)

**Estado:** 📋 Diseño / borrador legal  
**Fecha:** 2026-06  
**Roadmap:** complementa v1.9–v2.0 (checkout self-service, planes, pasarela)  
**Relacionado:** [`../comercial/PLAN-SAAS-POS-AI.md`](../comercial/PLAN-SAAS-POS-AI.md) · [`../comercial/PYME-INFORMAL-MODULO.md`](../comercial/PYME-INFORMAL-MODULO.md) · [`../comercial/VISION-v2.0-SAAS.md`](../comercial/VISION-v2.0-SAAS.md)

> **Aviso:** Este documento es un **borrador técnico-comercial** para orientar implementación y revisión con **abogado habilitado en Chile**. No constituye asesoría legal vinculante.

---

## Variables del proyecto (completadas para POS-AI)

| Variable | Valor |
|----------|--------|
| **Nombre del SaaS** | **POS-AI** |
| **Tipo / propósito** | ERP multi-sucursal para PYME (gastronomía y retail): POS, catálogo, inventario, comandas, mermas, reportes, delivery, asistente IA WhatsApp (plan Estándar/Full), cobro online vía pasarela externa (plan Full) |
| **Tipo de cliente** | **B2B** — empresas y emprendimientos (incluye flujo “negocio en marcha” sin RUT hasta formalización) |
| **Modelo de negocio** | Suscripción **mensual o anual** por plan (**Básico / Estándar / Full**), con límites de sucursales y usuarios; add-ons futuros (sucursal/usuario extra) |
| **Jurisdicción principal** | **Chile** (leyes chilenas aplicables). Expansión futura: principios GDPR + eventual estructura **Delaware (Stripe Atlas)** para facturación internacional |
| **Infraestructura y datos** | Datos en nube (contenedores Docker / proveedor hosting). BD `pos-ai-db` (MySQL). Datos operativos del tenant: ventas, stock, usuarios, comprobantes de pago (imágenes), conversaciones WSP, territorio CUT Chile. **No** almacena PAN de tarjetas; pagos vía **Transbank Webpay** u otros PSP tokenizados |

---

## Objetivo del sprint

Diseñar la **base legal y técnica** para que POS-AI opere con:

1. Código y PI protegidos (licencia SaaS, no venta de software).
2. Responsabilidad limitada ante caídas, pérdida de datos o lucro cesante.
3. Cumplimiento **Ley 19.628** (Chile) y buenas prácticas alineadas a **GDPR** para expansión.
4. Evidencia auditable de aceptación de términos (TDD implementable en Core/BFF/Frontend).

---

## TDD mínimo (criterios de aceptación S7)

| ID | Historia | Test / evidencia |
|----|----------|------------------|
| S7-T1 | Versión vigente de ToS publicada | API `GET /legal/terms/current` retorna `version`, `effectiveAt`, `url` |
| S7-T2 | Aceptación registrada en registro/checkout | `POST /legal/acceptances` persiste `userId`, `empresaId`, `documentVersion`, `ip`, `userAgent`, `acceptedAt` |
| S7-T3 | Bloqueo sin aceptación | Login/registro/checkout rechaza si `termsAccepted < currentVersion` |
| S7-T4 | Exportación datos tenant | `GET /empresas/:id/data-export` genera paquete JSON/CSV (derecho portabilidad) |
| S7-T5 | Solicitud eliminación | `POST /empresas/:id/data-deletion-request` crea ticket + estado |
| S7-T6 | SLA uptime calculable | Métrica mensual `uptime_percent` excluye ventanas en `maintenance_windows` |
| S7-T7 | Crédito SLA automático | Si uptime < umbral plan, job crea `service_credit` en próxima factura |

---

# ENTREGABLE 1 — Estructura completa de Términos de Servicio (ToS)

## Por qué importa

El ToS es el contrato marco B2B. Sin él, un cliente podría argumentar compra del software, sublicenciar cuentas o exigir indemnización ilimitada por caídas.

## Índice de cláusulas (17 bloques)

1. Identificación de las partes y definiciones  
2. Aceptación y capacidad  
3. Descripción del servicio  
4. **Concesión de licencia (SaaS)** ← crítica  
5. Cuentas, credenciales y seguridad  
6. Planes, precios y facturación  
7. **Propiedad intelectual** ← crítica  
8. Datos del cliente y privacidad (remisión a Política)  
9. **Uso aceptable (AUP)** ← crítica  
10. Nivel de servicio (remisión a SLA)  
11. Soporte y mantenimiento  
12. Suspensión y terminación  
13. **Limitación de responsabilidad** ← crítica  
14. Indemnización del cliente  
15. Fuerza mayor  
16. Ley aplicable y jurisdicción  
17. Modificaciones, notificaciones y contacto  

---

## Cláusulas críticas — texto sugerido (borrador)

### 4. Concesión de licencia (SaaS)

```text
4.1. Concesión. Sujeto al pago oportuno de la suscripción y al cumplimiento de estos Términos,
el Proveedor otorga al Cliente una licencia limitada, no exclusiva, intransferible, no sublicenciable
y revocable para acceder y utilizar POS-AI exclusivamente mediante la interfaz web y APIs autorizadas,
durante el Período de Suscripción vigente y únicamente para las operaciones internas del negocio del Cliente.

4.2. Naturaleza del servicio. El Cliente reconoce y acepta que POS-AI se presta como servicio
en la nube (Software as a Service). En ningún caso estos Términos implican venta, cesión o transferencia
del software, del código fuente, de la arquitectura, de los modelos de inteligencia artificial,
de las bases de datos del Proveedor ni de derechos de propiedad intelectual distintos de la licencia
de uso aquí descrita.

4.3. Restricciones. Queda expresamente prohibido, directa o indirectamente: (i) copiar, modificar,
adaptar, traducir o crear obras derivadas del Servicio; (ii) descompilar, realizar ingeniería inversa
o intentar obtener el código fuente, salvo en la medida que la ley imperativa lo permita y previo aviso;
(iii) alquilar, arrendar, prestar, vender, sublicenciar o transferir el acceso; (iv) utilizar el Servicio
para procesar datos de terceros fuera del giro del Cliente sin autorización escrita; (v) eludir límites
técnicos de plan (sucursales, usuarios, features).

4.4. Revocación. El Proveedor podrá revocar o suspender la licencia de forma inmediata ante
incumplimiento grave, fraude, riesgo de seguridad o impago, sin perjuicio de otras acciones.
```

**Nota técnica:** En checkout y onboarding, el checkbox debe decir *“Acepto los Términos de Servicio”* con enlace a versión `vX.Y` — no “compro el software”.

---

### 7. Propiedad intelectual

```text
7.1. Propiedad del Proveedor. POS-AI, su código, diseño, documentación, marcas, logos, flujos de IA,
prompts, integraciones, estructuras de base de datos del sistema (esquemas, no contenido del Cliente)
y mejoras sucesivas son y permanecerán de exclusiva propiedad del Proveedor o sus licenciantes.

7.2. Datos del Cliente. El Cliente conserva la titularidad sobre los Datos del Cliente (ventas,
inventario, usuarios operativos, imágenes de comprobantes/mermas, configuración comercial, etc.).

7.3. Licencia sobre Datos del Cliente. El Cliente otorga al Proveedor una licencia mundial, no exclusiva,
libre de regalías, necesaria para alojar, procesar, respaldar, transmitir, mostrar y utilizar los Datos
del Cliente únicamente para: (a) prestar el Servicio; (b) soporte y seguridad; (c) cumplimiento legal;
(d) estadísticas agregadas y anónimas que no identifiquen al Cliente. El Proveedor no venderá los Datos
del Cliente a terceros.

7.4. Feedback. Sugerencias o ideas que el Cliente entregue gratuitamente podrán ser utilizadas por el
Proveedor sin obligación de compensación, salvo pacto escrito en contrario.
```

---

### 9. Uso aceptable (AUP)

```text
9.1. El Cliente y sus Usuarios Autorizados no podrán:

(a) Realizar ingeniería inversa, desensamblar o intentar extraer lógica de negocio o modelos del Servicio;
(b) Ejecutar escaneos de vulnerabilidades, pruebas de penetración o cargas sintéticas agresivas sin
    autorización previa y por escrito del Proveedor;
(c) Introducir malware, inyecciones SQL/NoSQL, XSS u otro código malicioso;
(d) Compartir credenciales entre empresas, revender acceso o “subarrendar” cuentas;
(e) Usar el asistente IA o WhatsApp para spam, acoso, contenido ilícito o suplantación;
(f) Procesar datos personales sensibles sin base legal y sin configurar medidas contractuales con el Proveedor;
(g) Exceder límites de plan mediante automatización no autorizada.

9.2. El Proveedor podrá suspender el acceso ante indicios razonables de violación del AUP,
preservando registros para auditoría.
```

---

### 13. Limitación de responsabilidad

```text
13.1. Exclusión de daños indirectos. En la máxima medida permitida por la ley chilena, el Proveedor
no será responsable por lucro cesante, pérdida de fondo de comercio, pérdida de datos (salvo dolo o
culpa grave demostrada), daños indirectos, incidentales, especiales o consecuenciales.

13.2. Tope agregado. La responsabilidad total acumulada del Proveedor por cualquier causa relacionada
con el Servicio, en los doce (12) meses anteriores al hecho que origine la reclamación, no excederá
el monto efectivamente pagado por el Cliente por suscripciones de POS-AI en dicho período.

13.3. Servicio “tal cual”. Salvo garantías expresas en el SLA, el Servicio se entrega “as is” /
“según disponibilidad”, sin garantía de resultados comerciales del Cliente (ventas, márgenes, cumplimiento
tributario del negocio del Cliente).

13.4. Pasarelas y terceros. El Proveedor no responde por indisponibilidad de Transbank, Meta/WhatsApp,
proveedores de hosting o internet del Cliente.

13.5. Copias de seguridad. El Cliente es responsable de exportar periódicamente sus datos críticos.
El Proveedor mantiene respaldos operativos pero no garantiza recuperación punto-a-punto salvo SLA/Add-on DRP.
```

**Por qué 12 meses:** Estándar SaaS B2B; en Chile revisar con abogado si conviene 3 o 6 meses para PYME (más digerible comercialmente).

---

## Cláusulas complementarias recomendadas (POS-AI)

| Tema | Contenido |
|------|-----------|
| Planes y features | Básico sin IA; Estándar WSP; Full pasarela — feature flags contractuales |
| Negocio informal | Sin RUT: documentos internos, no boleta electrónica; formalización desbloquea planes |
| IA | Salidas de IA son asistencia operativa, no asesoría legal/tributaria |
| WhatsApp | Cliente debe tener relación válida con sus clientes finales; cumplir políticas Meta |
| Pagos | Cobro POS al consumidor final ≠ suscripción SaaS al Proveedor |

---

# ENTREGABLE 2 — Acuerdo de Nivel de Servicio (SLA)

## Alcance

Aplica a clientes **B2B con plan de pago activo** (Básico, Estándar, Full). Pilotos gratuitos: SLA best-effort documentado aparte.

## Uptime garantizado

| Plan | Uptime mensual | Ventana medición |
|------|----------------|------------------|
| Básico | **99,0%** | 24×7, UTC-4 Chile continental |
| Estándar | **99,5%** | idem |
| Full | **99,5%** + soporte prioritario | idem |

### Fórmula formal

```text
Uptime % = ((Total minutos del mes − Minutos de indisponibilidad no excluida) / Total minutos del mes) × 100

Minutos excluidos (no cuentan como downtime):
  (a) Mantenimiento programado notificado con ≥ 48 h de anticipación, máx. 4 h/mes;
  (b) Indisponibilidad causada por el Cliente, su red o integraciones no autorizadas;
  (c) Fuerza mayor;
  (d) Indisponibilidad de terceros fuera del control razonable del Proveedor (PSP, Meta, DNS del Cliente).
```

## Compensación — solo créditos de servicio (no indemnización en efectivo)

| Uptime mensual alcanzado | Crédito en siguiente factura |
|--------------------------|------------------------------|
| ≥ umbral contractual | 0% |
| 99,0% – 99,49% (solo Estándar/Full) | **5%** del valor mensual del plan |
| 98,0% – 98,99% | **10%** |
| 95,0% – 97,99% | **20%** |
| < 95,0% | **30%** (tope mensual) |

```text
El crédito se aplica automáticamente a la factura siguiente, no es reembolsable en efectivo,
no es transferible y constituye la única y exclusiva compensación por incumplimiento de uptime,
salvo dolo o culpa grave del Proveedor conforme a la ley.
```

**Solicitud:** El Cliente debe reclamar el crédito dentro de **15 días** corridos post fin de mes, vía ticket soporte con referencia a incidentes.

---

# ENTREGABLE 3 — Política de privacidad y tratamiento de datos

## Marco legal aplicable

| Norma | Aplicación en POS-AI |
|-------|---------------------|
| **Ley 19.628** (Chile) | Tratamiento de datos personales de usuarios del tenant y datos de clientes finales que el negocio cargue |
| **GDPR** (principios) | Preparación expansión UE / contratos con subprocesadores estándar |
| **Meta / WhatsApp** | Políticas de mensajería business |
| **PCI-DSS** | Delegada al PSP (no almacenar PAN en POS-AI) |

## Roles

| Rol | Quién |
|-----|--------|
| **Responsable** (hacia usuarios finales del negocio) | La **empresa cliente** (ej. empanadería) |
| **Encargado / Proveedor** | **POS-AI** procesa por cuenta del cliente según instrucciones del servicio |

## Categorías de datos tratados

| Categoría | Ejemplos | Finalidad | Base |
|-----------|----------|-----------|------|
| Identificación usuarios tenant | Nombre, email, rol, teléfono WSP operador | Autenticación, RBAC | Ejecución contrato |
| Datos empresa | RUT, razón social, giro, datos transferencia (cifrados) | Operación ERP, validación comprobantes IA | Contrato |
| Operacionales | Ventas, stock, mermas, comandas | Servicio core | Contrato |
| Comprobantes / imágenes | Fotos transferencia, mermas | Validación IA, auditoría | Contrato / interés legítimo |
| Conversaciones WSP | Mensajes cliente final ↔ bot | Pedidos IA | Contrato + política cliente |
| Logs técnicos | IP, user-agent, aceptación términos | Seguridad, auditoría legal | Interés legítimo |
| Pagos SaaS | Token PSP, estado transacción | Suscripción | Contrato |

**No tratamos:** número completo de tarjeta, CVV almacenado.

## Subprocesadores (lista viva en `/legal/subprocessors`)

| Subprocesador | Finalidad | Ubicación datos |
|---------------|-----------|-----------------|
| Proveedor hosting / cloud | Infra BD y APIs | [Región — completar] |
| Transbank / Webpay | Cobro suscripción y ventas Full | Chile |
| OpenAI (si aplica) | IA comprobantes / POS IA | EE.UU. — DPA requerido |
| Meta WhatsApp Cloud API | Mensajería | EE.UU./UE según contrato Meta |

## Derechos del titular (ARCO+)

Implementar flujo:

1. **Acceso** — exportación self-service admin empresa.  
2. **Rectificación** — edición perfil / ticket soporte.  
3. **Cancelación/eliminación** — solicitud con plazo respuesta **10 días hábiles** (19.628).  
4. **Oposición** — marketing (si existiera).  
5. **Portabilidad** — export JSON/CSV estándar.

## Retención

| Dato | Plazo sugerido |
|------|----------------|
| Ventas / auditoría | 6 años (referencia tributaria cliente — aclarar con abogado) |
| Logs aceptación legal | 5 años |
| Conversaciones WSP | 12 meses operativos, luego anonimizar |
| Cuenta cancelada | 30 días gracia export → borrado lógico → purge físico 90 días |

## Transferencia internacional

Cláusula tipo: transferencia a subprocesadores fuera de Chile con **cláusulas contractuales tipo** y medidas técnicas (cifrado en tránsito/reposo).

---

# ENTREGABLE 4 — Checklist operativo y técnico (desarrollador)

## 4.1 Base de datos (migración sugerida `v1.15-legal`)

```sql
-- Documentos legales versionados
legal_documents (id, type ENUM('TOS','PRIVACY','SLA','AUP','COOKIES'), version, locale, content_md, content_hash, effective_at, is_current)

-- Aceptaciones auditables
legal_acceptances (id, user_id, empresa_id, document_id, document_version, ip_address, user_agent, acceptance_channel ENUM('REGISTRO','CHECKOUT','LOGIN_REAUTH','ADMIN_IMPORT'), accepted_at)

-- Ventanas mantenimiento (SLA)
maintenance_windows (id, starts_at, ends_at, notified_at, description, excludes_from_sla BOOLEAN)

-- Créditos SLA
service_credits (id, empresa_id, period_yyyy_mm, uptime_percent, credit_percent, applied_to_invoice_id, created_at)

-- Solicitudes privacidad
data_subject_requests (id, empresa_id, request_type ENUM('EXPORT','DELETE','RECTIFY'), status, requested_by, created_at, completed_at)
```

## 4.2 Backend (`pos-api-core` / BFF)

| Flujo | Implementación |
|-------|----------------|
| Versión vigente | `GET /legal/terms/current`, `/legal/privacy/current` |
| Aceptación | `POST /legal/acceptances` — **transacción** junto a registro/checkout |
| Gate login | Si `user.lastTermsVersion < current` → redirect `/legal/accept` |
| Registro público v2.0 | Checkbox obligatorio + guardar acceptance antes de crear empresa |
| Export datos | Job async `DataExportDelegate` — ZIP con ventas, productos, usuarios |
| Borrado | Soft-delete tenant + cola purge; **no** borrar ledger pagos sin retención legal |
| SLA | Cron mensual: calcular uptime desde healthchecks + status page incidents |
| Subprocesadores | Página estática generada desde JSON en repo |

## 4.3 Frontend

| Pantalla | Requisito |
|----------|-----------|
| Landing footer | Enlaces ToS, Privacidad, SLA |
| `/registro` | Checkbox **obligatorio** + links `target=_blank` + versión visible |
| Checkout SaaS | Mismo checkbox + resumen plan + renovación automática |
| Primer login post-cambio ToS | Modal bloqueante “Términos actualizados” |
| `/empresas` o `/legal` | Histórico aceptaciones (solo admin) |
| Cookies | Banner si se usan analytics (plausible/GA) |

## 4.4 Evidencia legal mínima (logs)

Guardar en `legal_acceptances`:

- `document_version` (ej. `tos-2026-06-01`)
- `content_hash` SHA-256 del documento mostrado
- IP + User-Agent
- Canal (`REGISTRO`, `CHECKOUT`, etc.)
- Timestamp UTC

**TDD S7-T2:** test integración que registro sin acceptance → `400 TERMS_NOT_ACCEPTED`.

## 4.5 Textos UI (no sustituyen al ToS)

```text
Checkbox registro:
  "He leído y acepto los [Términos de Servicio] y la [Política de Privacidad] de POS-AI (versión {version})."

Tooltip IA:
  "Las sugerencias de IA son de apoyo operativo y no constituyen asesoría legal ni tributaria."
```

## 4.6 Orden de implementación sugerido

1. Tablas + seed documento v1.0.0  
2. API acceptances + gate registro existente  
3. Páginas markdown renderizadas `/legal/terms`  
4. Export datos admin  
5. SLA métricas + créditos manuales  
6. Revisión abogado → v1.0.1 → re-aceptación si cambio material  

---

## Fuera de alcance S7 (backlog)

- DPA firmado enterprise por cliente grande  
- Seguro ciberriesgo  
- Certificación ISO 27001  
- Localización completa EN para Delaware  

---

## DoD Sprint S7

- [ ] Documento ToS v1.0 revisado por abogado Chile  
- [x] Política privacidad publicada (`/legal/privacidad`, seed v1.0.0)  
- [ ] SLA publicado por plan (borrador en doc; sin página pública aún)  
- [x] Migración `legal_*` aplicada (`v1.15.0`)  
- [x] Tests S7-T1 parcial + `legal-versions.test.ts`  
- [x] Checkbox registro + log `legal_acceptances`  
- [x] Entrada en `SPRINT-PLAN.md`  

---

## Referencias de implementación en repo

| Área | Archivo / ruta |
|------|----------------|
| Registro público | `pos-frontend/src/components/organisms/RegistroForm.tsx` |
| Planes SaaS | `docs/comercial/PLANES-BD.md` |
| Pagos / PSP | `docs/comercial/PASARELA-SDK-ALCANCE-v1.8.md` |
| Checkout | `docs/comercial/SAAS-CHECKOUT-SANDBOX.md` |
