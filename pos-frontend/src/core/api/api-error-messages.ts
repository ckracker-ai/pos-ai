import { AxiosError } from 'axios';
import { ApiError } from './api-client';

/** Contexto de la acción en UI (para título de toast y mensajes por defecto). */
export type ApiErrorContext =
  | 'auth.login'
  | 'auth.register'
  | 'users.list'
  | 'users.save'
  | 'users.delete'
  | 'users.resetPassword'
  | 'users.restore'
  | 'branches.list'
  | 'branches.save'
  | 'branches.delete'
  | 'branches.restore'
  | 'empresas.load'
  | 'empresas.save'
  | 'categories.list'
  | 'categories.save'
  | 'categories.delete'
  | 'categories.restore'
  | 'suppliers.list'
  | 'suppliers.save'
  | 'suppliers.delete'
  | 'suppliers.restore'
  | 'products.list'
  | 'products.save'
  | 'products.delete'
  | 'products.stock'
  | 'mermas.list'
  | 'mermas.create'
  | 'mermas.approve'
  | 'mermas.reject'
  | 'inventory.stock'
  | 'sales.create'
  | 'comandas.list'
  | 'comandas.update'
  | 'reports.load'
  | 'generic';

export type FriendlyApiError = {
  title: string;
  message: string;
  referenceId?: string;
  status?: number;
  rawCode?: string;
};

const CONTEXT_TITLES: Record<ApiErrorContext, string> = {
  'auth.login': 'No se pudo iniciar sesión',
  'auth.register': 'No se pudo registrar el usuario',
  'users.list': 'No se pudieron cargar los usuarios',
  'users.save': 'No se pudo guardar el usuario',
  'users.delete': 'No se pudo eliminar el usuario',
  'users.resetPassword': 'No se pudo restablecer la contraseña',
  'users.restore': 'No se pudo restaurar el usuario',
  'categories.restore': 'No se pudo restaurar la categoría',
  'suppliers.restore': 'No se pudo restaurar el proveedor',
  'branches.list': 'No se pudieron cargar las sucursales',
  'branches.save': 'No se pudo guardar la sucursal',
  'branches.delete': 'No se pudo desactivar la sucursal',
  'branches.restore': 'No se pudo restaurar la sucursal',
  'empresas.load': 'No se pudo cargar el perfil de la empresa',
  'empresas.save': 'No se pudo guardar el perfil de la empresa',
  'categories.list': 'No se pudieron cargar las categorías',
  'categories.save': 'No se pudo guardar la categoría',
  'categories.delete': 'No se pudo eliminar la categoría',
  'suppliers.list': 'No se pudieron cargar los proveedores',
  'suppliers.save': 'No se pudo guardar el proveedor',
  'suppliers.delete': 'No se pudo eliminar el proveedor',
  'products.list': 'No se pudieron cargar los productos',
  'products.save': 'No se pudo guardar el producto',
  'products.delete': 'No se pudo eliminar el producto',
  'products.stock': 'No se pudo actualizar el stock',
  'mermas.list': 'No se pudieron cargar las mermas',
  'mermas.create': 'No se pudo registrar la merma',
  'mermas.approve': 'No se pudo aprobar la merma',
  'mermas.reject': 'No se pudo rechazar la merma',
  'inventory.stock': 'No se pudo actualizar el inventario',
  'sales.create': 'No se pudo registrar la venta',
  'comandas.list': 'No se pudieron cargar las comandas',
  'comandas.update': 'No se pudo actualizar la comanda',
  'reports.load': 'No se pudieron cargar los reportes',
  generic: 'No se pudo completar la operación',
};

/** Códigos devueltos por api-core / api-bff → mensaje para el negocio. */
const ERROR_CODE_MESSAGES: Record<string, string> = {
  INVALID_CREDENTIALS: 'Correo o contraseña incorrectos. Verifica los datos e inténtalo de nuevo.',
  ACCOUNT_DISABLED: 'Tu cuenta está desactivada. Pide a un administrador que la reactive.',
  EMAIL_TAKEN: 'Ese correo ya está registrado. Usa otro correo o recupera el usuario existente.',
  USER_NOT_FOUND: 'No encontramos ese usuario.',
  CANNOT_DEACTIVATE_SELF: 'No puedes desactivar tu propia cuenta mientras estás conectado.',
  CANNOT_DEACTIVATE_LAST_ADMIN: 'Debe quedar al menos un administrador activo en el sistema.',
  ROLE_NOT_FOUND: 'El rol seleccionado no es válido.',
  UNAUTHORIZED: 'No autorizado. Verifica la clave interna del sistema o vuelve a iniciar sesión.',
  UNAUTHENTICATED: 'Tu sesión expiró. Vuelve a iniciar sesión.',
  ACCESS_TOKEN_REQUIRED: 'Falta el token de sesión. Inicia sesión nuevamente.',
  INVALID_TOKEN: 'Sesión inválida. Cierra sesión e ingresa otra vez.',
  INSUFFICIENT_PERMISSIONS: 'No tienes permisos para esta acción.',
  BRANCH_ID_INVALID: 'La sucursal activa no es válida. Selecciona una sucursal en la barra superior.',
  BRANCH_ACCESS_DENIED: 'No puedes operar en esta sucursal con tu usuario actual.',
  BRANCH_NOT_FOUND: 'No encontramos la sucursal indicada.',
  EMPRESA_NOT_FOUND: 'No encontramos los datos de la empresa.',
  EMPRESA_ACCESS_DENIED: 'No puedes acceder a los datos de otra empresa.',
  EMPRESA_SUSPENDED: 'La empresa está suspendida. Contacta al soporte de la plataforma.',
  EMPRESA_PENDING_ONBOARDING: 'La empresa aún no completó el onboarding.',
  SLUG_ALREADY_TAKEN: 'Ese identificador (slug) ya está en uso. Elige otro.',
  RUT_ALREADY_REGISTERED: 'Ese RUT ya está registrado en la plataforma.',
  PRODUCT_NOT_FOUND: 'No encontramos el producto.',
  PRODUCT_CREATE_FAILED: 'No se pudo crear el producto. Revisa SKU, categoría y proveedor.',
  SUPPLIER_NOT_FOUND: 'No encontramos el proveedor.',
  CATEGORY_NOT_FOUND: 'No encontramos la categoría.',
  SALE_NOT_FOUND: 'No encontramos la venta.',
  STOCK_RECORD_NOT_FOUND: 'Este producto aún no tiene stock en la sucursal activa.',
  ERROR_UPDATING_PASSWORD: 'No se pudo actualizar la contraseña.',
  ERROR_UPDATING_USER: 'No se pudo actualizar el usuario.',
  ERROR_CREATING_SUPPLIER: 'No se pudo crear el proveedor.',
  ERROR_UPDATING_SUPPLIER: 'No se pudo actualizar el proveedor.',
  ERROR_DELETING_SUPPLIER: 'No se pudo eliminar el proveedor.',
  ERROR_FETCHING_SUPPLIERS: 'No se pudieron cargar los proveedores.',
  ERROR_CREATING_CATEGORY: 'No se pudo crear la categoría.',
  ERROR_UPDATING_CATEGORY: 'No se pudo actualizar la categoría.',
  ERROR_DELETING_CATEGORY: 'No se pudo eliminar la categoría.',
  ERROR_DELETING_PRODUCT: 'No se pudo eliminar el producto.',
  ERROR_FETCHING_SALES: 'No se pudieron cargar las ventas.',
  INSUFFICIENT_STOCK: 'No hay stock suficiente para completar la operación.',
  SHRINKAGE_NOT_FOUND: 'No encontramos esa merma en la sucursal activa.',
  SHRINKAGE_NOT_PENDING: 'Esta merma ya fue aprobada o rechazada.',
  SHRINKAGE_BRANCH_MISMATCH:
    'La merma pertenece a otra sucursal. Cambia la sucursal activa en el encabezado e inténtalo de nuevo.',
};

const ENDPOINT_HINTS: Array<{ pattern: RegExp; hint: string }> = [
  { pattern: /\/auth\/login/i, hint: 'Revisa correo y contraseña (sin espacios extra).' },
  { pattern: /\/auth\/users\/[^/]+\/password/i, hint: 'La contraseña debe tener al menos 8 caracteres.' },
  { pattern: /\/auth\/users/i, hint: 'Revisa nombre, correo, rol y sucursal del usuario.' },
  { pattern: /\/catalog\/suppliers/i, hint: 'Revisa nombre y datos de contacto del proveedor.' },
  { pattern: /\/catalog\/categories/i, hint: 'Revisa el nombre de la categoría.' },
  { pattern: /\/catalog\/products/i, hint: 'Revisa SKU, categoría, proveedor y precio.' },
  { pattern: /\/inventory\/stock/i, hint: 'Revisa cantidades de stock (números mayores o iguales a 0).' },
  { pattern: /\/branch/i, hint: 'Revisa nombre, código, ciudad y teléfono de la sucursal.' },
  { pattern: /\/shrinkage/i, hint: 'Revisa producto, cantidad y motivo de la merma.' },
  { pattern: /\/sales/i, hint: 'Revisa productos del carrito y stock disponible.' },
];

const HTTP_STATUS_MESSAGES: Record<number, string> = {
  400: 'La solicitud no es válida. Revisa los datos enviados.',
  401: 'No autorizado. Verifica tu sesión o credenciales.',
  403: 'No tienes permisos para esta acción o falta la sucursal activa.',
  404: 'No encontramos el recurso solicitado.',
  409: 'Ya existe un registro con esos datos o hay un conflicto.',
  422: 'Los datos del formulario no son válidos.',
  500: 'El servidor no pudo procesar la solicitud. Inténtalo en unos minutos.',
  501: 'Esta función aún no está disponible en el servidor.',
};

const normalizeErrorCode = (raw: string): string => {
  const trimmed = raw.trim();
  const withoutPrefix = trimmed.replace(/^VALIDATION_ERROR:\s*/i, '').trim();
  const codePart = withoutPrefix.split(':')[0]?.trim() ?? withoutPrefix;
  return codePart.replace(/\s+/g, '_').toUpperCase();
};

const extractRawErrorText = (data: unknown): string | null => {
  if (!data || typeof data !== 'object') return null;
  const record = data as Record<string, unknown>;
  if (typeof record.error === 'string' && record.error.trim()) return record.error.trim();
  if (typeof record.message === 'string' && record.message.trim()) return record.message.trim();
  if (Array.isArray(record.issues)) {
    const first = record.issues[0] as { message?: string } | undefined;
    if (first?.message) return first.message;
  }
  return null;
};

const mapCodeToMessage = (rawText: string): { message: string; code?: string } => {
  const upper = rawText.toUpperCase();
  const code = normalizeErrorCode(rawText);

  if (ERROR_CODE_MESSAGES[code]) {
    return { message: ERROR_CODE_MESSAGES[code], code };
  }

  for (const [key, msg] of Object.entries(ERROR_CODE_MESSAGES)) {
    if (upper.includes(key)) {
      return { message: msg, code: key };
    }
  }

  if (/^VALIDATION_ERROR:/i.test(rawText)) {
    const detail = rawText.replace(/^VALIDATION_ERROR:\s*/i, '').trim();
    return {
      message: detail || 'Revisa los campos del formulario.',
      code: 'VALIDATION_ERROR',
    };
  }

  if (/Route\s+\w+:/i.test(rawText) && /not found/i.test(rawText)) {
    return {
      message: 'El servicio no tiene configurada esta ruta. Contacta soporte técnico.',
      code: 'ROUTE_NOT_FOUND',
    };
  }

  if (/Failed to fetch|Network Error|ECONNREFUSED|ERR_NETWORK/i.test(rawText)) {
    return {
      message:
        'No se pudo conectar con el servidor. Verifica que pos-api-bff (puerto 2020) y pos-api-core (1010) estén activos.',
      code: 'NETWORK',
    };
  }

  return { message: rawText, code };
};

const resolveEndpointHint = (url?: string): string | undefined => {
  if (!url) return undefined;
  for (const { pattern, hint } of ENDPOINT_HINTS) {
    if (pattern.test(url)) return hint;
  }
  return undefined;
};

const createReferenceId = () =>
  `ERR-${Date.now().toString(36).slice(-5)}${Math.random().toString(36).slice(2, 4)}`.toUpperCase();

export const formatErrorForDisplay = (friendly: FriendlyApiError): string => {
  if (friendly.referenceId) {
    return `${friendly.message} (Ref: ${friendly.referenceId})`;
  }
  return friendly.message;
};

export function getFriendlyApiError(
  error: unknown,
  context: ApiErrorContext = 'generic'
): FriendlyApiError {
  const title = CONTEXT_TITLES[context] ?? CONTEXT_TITLES.generic;

  if (error instanceof ApiError) {
    const rawText = error.message?.trim() || '';
    const mapped = rawText ? mapCodeToMessage(rawText) : { message: '' };
    let message =
      mapped.message ||
      (error.status ? HTTP_STATUS_MESSAGES[error.status] : undefined) ||
      'Ocurrió un error inesperado.';

    const hint = resolveEndpointHint(error.requestUrl);
    if (hint && !message.includes(hint)) {
      message = `${message} ${hint}`;
    }

    return {
      title,
      message,
      referenceId: error.referenceId,
      status: error.status,
      rawCode: mapped.code,
    };
  }

  if (error instanceof AxiosError) {
    const rawText = extractRawErrorText(error.response?.data);
    const status = error.response?.status;
    const url = String(error.config?.url ?? '');

    if (rawText) {
      const mapped = mapCodeToMessage(rawText);
      let message = mapped.message;
      const hint = resolveEndpointHint(url);
      if (hint) message = `${message} ${hint}`;
      return {
        title,
        message,
        status,
        rawCode: mapped.code,
      };
    }

    const networkMessage =
      !status && (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK')
        ? 'No se pudo conectar con el servidor API. Verifica que api-bff esté en ejecución.'
        : status
          ? HTTP_STATUS_MESSAGES[status] ?? 'No se pudo completar la solicitud.'
          : 'No se pudo conectar con el servidor.';

    return { title, message: networkMessage, status };
  }

  if (error instanceof Error && error.message.trim()) {
    const mapped = mapCodeToMessage(error.message);
    return { title, message: mapped.message, rawCode: mapped.code };
  }

  return {
    title,
    message: 'Ocurrió un error inesperado. Inténtalo nuevamente.',
  };
}

export { createReferenceId };
