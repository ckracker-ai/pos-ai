# Propuesta comercial SVM ERP

## Archivos

| Archivo | Descripción |
|---------|-------------|
| `propuesta-svm-erp.pdf` | **Documento para presentar al cliente** (5 páginas) |
| `propuesta-svm-erp.html` | Fuente editable (diseño, textos, precios) |

## Regenerar el PDF

```powershell
cd d:\Proyectos\svm\node\docs\comercial
npm run pdf
```

Alternativa sin Node: abrir `propuesta-svm-erp.html` en Chrome/Edge → **Imprimir** → **Guardar como PDF**.

## Personalizar

Edite en el HTML: nombre de contacto, logo, promoción piloto y montos. Luego ejecute `npm run pdf`.
