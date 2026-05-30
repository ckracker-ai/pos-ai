# Sistema de Autenticación — POS-AI Frontend (v1.4)

## Descripción
Sistema de autenticación con:
- **Store**: Zustand + persistencia en localStorage
- **API**: BFF en `/pos/proxy/auth/*` (Next reescribe al puerto 2020 en Docker)
- **Protección de rutas**: RouteGuard + `role-access`
- **Headers**: `Authorization`, `x-internal-key`, `x-branch-id` en cada request autenticada

## Estructura Creada

### 1. **Store de Autenticación** (`store/auth.ts`)
```typescript
useAuthStore()
- user: User | null          // Usuario autenticado
- token: string | null       // JWT Token
- isAuthenticated: boolean   // Estado de autenticación
- login(credentials)         // Método para iniciar sesión
- logout()                   // Cerrar sesión
- hydrate()                  // Hidratar desde localStorage
```

### 2. **Páginas**
- **`/login`** - Formulario de login
- **`/dashboard`** - Dashboard principal (protegido)
- **`/`** - Redirección automática

### 3. **Componentes**
- **LoginForm** - Formulario con validación
- **Navbar** - Barra de navegación con usuario
- **RouteGuard** - Protección automática de rutas

### 4. **Tipos** (`types/index.ts`)
```typescript
User {
  id: string
  email: string
  name: string
  role: 'admin' | 'manager' | 'seller' | 'user'
  branchId?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

LoginRequest {
  email: string
  password: string
}

AuthResponse {
  user: User
  token: string
  refreshToken?: string
}
```

## Flujo de Autenticación

1. **Usuario accede a la app** → RouteGuard verifica si hay token
2. **Si no hay token** → Redirige a `/login`
3. **Usuario ingresa credenciales** → POST `/pos/proxy/auth/login`
4. **Backend retorna user + token** → Se guarda en Zustand + localStorage
5. **Redirige a dashboard** → Rutas protegidas accesibles
6. **API client incluye token** → En header `Authorization: Bearer <token>`
7. **Si token expira** → Interceptor 401 hace logout automático

## API Esperada

### POST `/pos/proxy/auth/login`
**Request:**
```json
{
  "email": "usuario@email.com",
  "password": "contraseña"
}
```

**Response (200):**
```json
{
  "user": {
    "id": "1",
    "email": "usuario@email.com",
    "name": "Nombre Completo",
    "role": "seller",
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  },
  "token": "eyJhbGc..."
}
```

**Response (401):**
```json
{
  "message": "Credenciales inválidas"
}
```

## Variables de Entorno

```env
# .env.local (desarrollo local contra BFF)
NEXT_PUBLIC_API_URL=http://localhost:2020
NEXT_PUBLIC_INTERNAL_KEY=supersecretkey
```

En **Docker** (`docker compose`), `NEXT_PUBLIC_API_URL` va vacío: el frontend usa rewrites de Next hacia `pos-api-bff:2020` y expone la UI en **http://localhost:8010**.

## Rutas Protegidas

- ✅ `/dashboard` - Requiere autenticación
- ✅ `/` - Redirige a dashboard o login
- ❌ `/login` - Pública, redirige a dashboard si está autenticado
- ❌ `/login` — Pública
- Rutas de módulos según rol (`/empresas` solo admin/auditor; edición solo admin)

### Perfil empresa (tenant)

- `GET /pos/proxy/empresas/me` — Perfil del tenant
- `PATCH /pos/proxy/empresas/:id` — Actualizar datos comerciales (ADMIN)

## Uso en Componentes

### Obtener usuario actual
```typescript
import { useAuthStore } from '@/store/auth';

export function MiComponente() {
  const { user, isAuthenticated } = useAuthStore();
  
  return <div>{user?.name}</div>;
}
```

### Logout
```typescript
const { logout } = useAuthStore();

function handleLogout() {
  logout();
  router.push('/login');
}
```

### Hacer requests autenticados
```typescript
import { getApiClient } from '@/lib/api-client';

const apiClient = getApiClient();
const response = await apiClient.get('/api/productos');
// Token se incluye automáticamente en el header
```

## Flujo de Desarrollo

### 1. Implementar Backend
Necesitas crear en tu backend:
- `POST /api/auth/login` - Validar credenciales y retornar token JWT
- Validar Token en requests protegidos
- Retornar 401 cuando el token expire

### 2. Credenciales de Prueba
Espera a que el backend genere usuarios iniciales o usa herramientas como:
- Admin dashboard del backend
- CLI del backend
- Script de seeding

### 3. Testing
```bash
npm run dev
# Visita http://localhost:3000
# Debe redirigir a /login
# Ingresa email: test@example.com
# Ingresa password: test123
```

## Seguridad

✅ **Implementado:**
- Token enviado en header Authorization
- Token persistido en localStorage (con precaución)
- Auto-logout en 401
- Rutas protegidas del lado del cliente

⚠️ **Falta en producción:**
- HTTPS obligatorio
- Cookie HttpOnly (más seguro que localStorage)
- Refresh token rotation
- CSRF protection
- Rate limiting

## Próximos Pasos

1. **Backend Integration**
   - Validar endpoint `/api/auth/login`
   - Configurar JWT signing
   - Implementar refresh tokens

2. **Features Adicionales**
   - Forgot password
   - Sign up
   - Two-factor authentication
   - Role-based access control (RBAC)

3. **Mejoras de Seguridad**
   - Migrar a cookies HttpOnly
   - Implementar CSRF tokens
   - Rate limiting
   - Account lockout

4. **UX**
   - Persistent login (recordarme)
   - Validaciones más robustas
   - Loading states mejorados
   - Error messages más descriptivos
