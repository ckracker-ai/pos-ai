# POS-AI Frontend (v1.4)

Cliente web Next.js del ERP SaaS multi-tenant POS-AI.

Plataforma frontend moderna y responsive para gestión de ventas multisucursal con dashboards especializados por rol.

## Características Principales

- **Admin Dashboard**: Control total con métricas KPI, gestión de usuarios y sucursales
- **POS (Punto de Venta)**: Búsqueda ultrarápida con fuzzy search, carrito persistente y descuentos
- **Catálogo Cliente**: Vista pública de productos y disponibilidad por sucursal
- **Importación Masiva**: Drag & drop para Excel/CSV con previsualización de datos
- **Generación de Tickets**: Optimizado para impresoras térmicas
- **Contexto de Sucursal**: Soporte multi-sucursal con header global X-Branch-ID

## Stack Tecnológico

- **Framework**: Next.js 14 con App Router
- **UI**: React 19 + TypeScript
- **Estilos**: Tailwind CSS + Componentes shadcn/ui
- **Animaciones**: Framer Motion
- **Estado**: Zustand
- **Peticiones**: TanStack Query + Axios
- **Formularios**: React Hook Form + Zod
- **Búsqueda**: Fuse.js (Fuzzy Search)

## Estructura de Carpetas

```
├── app/                 # Next.js App Router
├── components/
│   ├── atoms/          # Componentes básicos (botones, inputs)
│   ├── molecules/      # Componentes compuestos (cards, headers)
│   └── organisms/      # Componentes complejos (dashboards, tablas)
├── lib/                # Utilidades y configuración
├── store/              # Zustand stores
├── hooks/              # Custom React hooks
├── types/              # TypeScript definitions
├── styles/             # Estilos globales
└── public/             # Assets estáticos
```

## Instalación

```bash
npm install
```

## Desarrollo

```bash
npm run dev
```

- Local con BFF: http://localhost:3000 (o el puerto que asigne Next)
- **Recomendado**: `docker compose up` → http://localhost:**8010**

## Build para Producción

```bash
npm run build
npm start
```

## Configuración de Variables de Entorno

Ver `AUTH_SYSTEM.md` y `.env.local.example` si existe.

```env
# Desarrollo directo al BFF
NEXT_PUBLIC_API_URL=http://localhost:2020
NEXT_PUBLIC_INTERNAL_KEY=supersecretkey
```

## Rutas de mantenedores (v1.4)

| Ruta | Roles | Notas |
|------|-------|-------|
| `/empresas` | admin, auditor | Perfil tenant; solo admin edita |
| `/branches` | admin, auditor | admin gestiona |
| `/users` | admin, auditor | admin gestiona |

## Tipo de Comprobación

```bash
npm run type-check
```

## Próximas Etapas

1. Implementar módulo de autenticación
2. Desarrollar layout base con navegación lateral
3. Crear módulo POS completo
4. Implementar dashboard de admin
5. Crear zona de importación de datos
6. Optimizar componentes de tickets para impresión

## Convenciones de Código

- Usar componentes funcionales con hooks
- Aplicar Atomic Design en componentes
- Usar TypeScript para seguridad de tipos
- Validar con Zod antes de enviar datos
- Persistir estado global con Zustand
