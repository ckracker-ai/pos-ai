# Propuesta comercial POS-AI

## Comenzar (PDF)

| Archivo | Descripción |
|---------|-------------|
| **`../COMENZAR-POS-AI.md`** | Guía maestra: planes, módulos, WSP, comprobantes, pagos web |
| **`COMENZAR-POS-AI.html`** | Misma guía — **Imprimir → Guardar como PDF** |

## Plan SaaS (borrador)

Ver **`PLAN-SAAS-POS-AI.md`**: Básico (10 módulos ERP), Estándar (+ asistente IA WhatsApp), Full (+ voz/teléfono + pagos online).

## Archivos

| Archivo | Descripción |
|---------|-------------|
| `PLAN-SAAS-POS-AI.md` | Matriz de planes y roadmap comercial ↔ producto |
| `PLANES-BD.md` | Planes en base de datos |
| `../assistant/SYSTEM-PROMPT.md` | Prompt del agente ventas (voz + WSP) |
| `propuesta-svm-erp.pdf` | Legacy SVM |
| `propuesta-svm-erp.html` | Legacy SVM (HTML) |

## Regenerar PDF comercial

**Recomendado (POS-AI):**

```powershell
start docs\comercial\COMENZAR-POS-AI.html
# Chrome/Edge → Ctrl+P → Guardar como PDF
```

Legacy SVM:

```powershell
cd d:\Proyectos\svm\node\docs\comercial
npm run pdf
```