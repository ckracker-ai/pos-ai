import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios';
import { useBranchStore } from '@/store/branch';
import { useAuthStore } from '@/store/auth';
import { createReferenceId, getFriendlyApiError } from './api-error-messages';

let apiClient: AxiosInstance | null = null;
let isHandlingUnauthorized401 = false;


export class ApiError extends Error {
  status?: number;
  detail?: unknown;
  referenceId?: string;
  requestUrl?: string;
  rawCode?: string;

  constructor(
    message: string,
    status?: number,
    detail?: unknown,
    meta?: { referenceId?: string; requestUrl?: string; rawCode?: string }
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
    this.referenceId = meta?.referenceId;
    this.requestUrl = meta?.requestUrl;
    this.rawCode = meta?.rawCode;
  }
}

const getApiBaseUrl = () => {
  const configured = (process.env.NEXT_PUBLIC_API_URL ?? '').trim();
  if (!configured) return '';
  return configured.replace(/\/$/, '');
};

const extractApiErrorText = (data: unknown): string | null => {
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

const getFriendlyHttpMessage = (status?: number, networkCode?: string) => {
  if (!status) {
    if (networkCode === 'ECONNREFUSED' || networkCode === 'ERR_NETWORK') {
      return 'No se pudo conectar con el servidor API. Inicia pos-api-bff (puerto 2020) y pos-api-core (puerto 1010), luego recarga la página.';
    }
    return 'No se pudo conectar con el servidor. Comprueba que api-bff esté en ejecución.';
  }
  if (status === 401) return 'Tu sesion expiro o el token JWT no es valido. Vuelve a iniciar sesion.';
  if (status === 403) return 'No tienes permisos para esta accion o falta contexto de sucursal.';
  if (status === 404) return 'No encontramos el recurso solicitado. Revisa la ruta y los parametros enviados.';
  if (status === 409) return 'El registro ya existe o hay un conflicto con datos relacionados.';
  if (status === 422) return 'Los datos enviados no son validos. Revisa el formulario.';
  if (status >= 500) return 'El servicio no pudo procesar la solicitud. Intentalo nuevamente.';
  return 'No se pudo completar la solicitud. Revisa los datos e intentalo otra vez.';
};

export const getApiErrorMessage = (error: unknown, context?: import('./api-error-messages').ApiErrorContext) => {
  return getFriendlyApiError(error, context ?? 'generic').message;
};

export const unwrapApiData = <T>(payload: unknown): T => {
  if (
    payload &&
    typeof payload === 'object' &&
    'data' in payload &&
    ('success' in payload || 'code' in payload)
  ) {
    return (payload as { data: T }).data;
  }

  return payload as T;
};

export function initializeApiClient() {
  // Reset del guard solo cuando se (re)inicializa el cliente.
  isHandlingUnauthorized401 = false;
  apiClient = axios.create({
    baseURL: getApiBaseUrl(),
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Add interceptor to include branch ID and auth token in all requests
  apiClient.interceptors.request.use((config) => {
    const branchId = useBranchStore.getState().selectedBranchId;
    const token = useAuthStore.getState().token;
    const internalKey = process.env.NEXT_PUBLIC_INTERNAL_KEY || 'supersecretkey';

    // Aseguramos que existan los headers para que nunca se omitan
    // `x-branch-id` y `x-internal-key` (requeridos por api-bff/api-core).
    config.headers = config.headers ?? {};

    config.headers['x-branch-id'] = branchId;

    // Internal key required by BFF (except login, which uses a proxy route)
    config.headers['x-internal-key'] = internalKey;

    // Include auth token if available
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  // Add response interceptor to log technical details and surface friendly errors
  apiClient.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
      const referenceId = createReferenceId();
      const requestUrl = String(error.config?.url ?? '');
      console.error(`[${referenceId}] BFF API error:`, {
        method: error.config?.method,
        url: requestUrl,
        status: error.response?.status,
        data: error.response?.data,
      });

      if (error.response?.status === 401) {
        const apiError = String(
          (error.response?.data as { error?: string; message?: string } | undefined)?.error ??
            (error.response?.data as { message?: string } | undefined)?.message ??
            ''
        );
        const requestUrl = String(error.config?.url ?? '');

        // Solo cerrar sesión cuando el 401 indica problema de autenticación real.
        // Errores de configuración (p. ej. UNAUTHORIZED por x-internal-key en BFF→core)
        // no deben expulsar al usuario al login.
        const shouldForceLogout =
          /\/auth\//i.test(requestUrl) ||
          /token|sesion|session|expired|expir|ACCESS_TOKEN|UNAUTHENTICATED/i.test(apiError);

        if (shouldForceLogout && !isHandlingUnauthorized401) {
          isHandlingUnauthorized401 = true;

          useAuthStore.getState().logout();

          if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
            window.location.replace('/login');
          }

          setTimeout(() => {
            isHandlingUnauthorized401 = false;
          }, 5000);
        }
      }



      const data = error.response?.data;
      const rawText =
        extractApiErrorText(data) || getFriendlyHttpMessage(error.response?.status, error.code);

      return Promise.reject(
        new ApiError(rawText, error.response?.status, data, {
          referenceId,
          requestUrl,
        })
      );
    }
  );

  return apiClient;
}

export function getApiClient(): AxiosInstance {
  if (!apiClient) {
    initializeApiClient();
  }
  return apiClient!;
}

// API Methods
export const api = {
  health: (config?: AxiosRequestConfig) =>
    getApiClient().get('/pos/proxy/health', config),

  // Auth / Users
  login: (data: unknown, config?: AxiosRequestConfig) =>
    getApiClient().post('/pos/proxy/auth/login', data, config),
  register: (data: unknown, config?: AxiosRequestConfig) =>
    getApiClient().post('/pos/proxy/auth/register', data, config),
  getUsers: (config?: AxiosRequestConfig) =>
    getApiClient().get('/pos/proxy/auth/users', config),
  getRoles: (config?: AxiosRequestConfig) =>
    getApiClient().get('/pos/proxy/auth/roles', config),
  getUser: (id: string, config?: AxiosRequestConfig) =>
    getApiClient().get(`/pos/proxy/auth/users/${id}`, config),
  updateUser: (id: string, data: unknown, config?: AxiosRequestConfig) =>
    getApiClient().put(`/pos/proxy/auth/users/${id}`, data, config),
  resetUserPassword: (id: string, password: string, config?: AxiosRequestConfig) =>
    getApiClient().patch(`/pos/proxy/auth/users/${id}/password`, { password }, config),
  deleteUser: (id: string, config?: AxiosRequestConfig) =>
    getApiClient().delete(`/pos/proxy/auth/users/${id}`, config),
  restoreUser: (id: string, config?: AxiosRequestConfig) =>
    getApiClient().patch(`/pos/proxy/auth/users/${id}/restore`, {}, config),

  // Products
  getProducts: (config?: AxiosRequestConfig) => 
    getApiClient().get('/pos/proxy/catalog/products', config),
  getProductsByBranch: (branchId: string, config?: AxiosRequestConfig) =>
    getApiClient().get(`/pos/proxy/catalog/products/by-branch/${branchId}`, config),
  getProduct: (id: string, config?: AxiosRequestConfig) =>
    getApiClient().get(`/pos/proxy/catalog/products/${id}`, config),
  createProduct: (data: unknown, config?: AxiosRequestConfig) =>
    getApiClient().post('/pos/proxy/catalog/products', data, config),
  updateProduct: (id: string, data: unknown, config?: AxiosRequestConfig) =>
    getApiClient().put(`/pos/proxy/catalog/products/${id}`, data, config),
  deleteProduct: (id: string, config?: AxiosRequestConfig) =>
    getApiClient().delete(`/pos/proxy/catalog/products/${id}`, config),
  searchProducts: (query: string, config?: AxiosRequestConfig) =>
    getApiClient().get('/pos/proxy/catalog/products', { ...config, params: { q: query } }),
  getCategories: (config?: AxiosRequestConfig) =>
    getApiClient().get('/pos/proxy/catalog/categories', config),
  createCategory: (data: unknown, config?: AxiosRequestConfig) =>
    getApiClient().post('/pos/proxy/catalog/categories', data, config),
  updateCategory: (id: string, data: unknown, config?: AxiosRequestConfig) =>
    getApiClient().patch(`/pos/proxy/catalog/categories/${id}`, data, config),
  deleteCategory: (id: string, config?: AxiosRequestConfig) =>
    getApiClient().delete(`/pos/proxy/catalog/categories/${id}`, config),
  restoreCategory: (id: string, config?: AxiosRequestConfig) =>
    getApiClient().post(`/pos/proxy/catalog/categories/${id}/restore`, {}, config),
  getSuppliers: (config?: AxiosRequestConfig) =>
    getApiClient().get('/pos/proxy/catalog/suppliers', config),
  createSupplier: (data: unknown, config?: AxiosRequestConfig) =>
    getApiClient().post('/pos/proxy/catalog/suppliers', data, config),
  updateSupplier: (id: string, data: unknown, config?: AxiosRequestConfig) =>
    getApiClient().patch(`/pos/proxy/catalog/suppliers/${id}`, data, config),
  deleteSupplier: (id: string, config?: AxiosRequestConfig) =>
    getApiClient().delete(`/pos/proxy/catalog/suppliers/${id}`, config),
  restoreSupplier: (id: string, config?: AxiosRequestConfig) =>
    getApiClient().post(`/pos/proxy/catalog/suppliers/${id}/restore`, {}, config),

  // Inventory
  getInventoryByBranch: (branchId: string, config?: AxiosRequestConfig) =>
    getApiClient().get(`/pos/proxy/inventory/branch/${branchId}`, config),
  getInventoryProduct: (branchId: string, productId: string, config?: AxiosRequestConfig) =>
    getApiClient().get(`/pos/proxy/inventory/branch/${branchId}/product/${productId}`, config),
  getLowStock: (branchId: string, config?: AxiosRequestConfig) =>
    getApiClient().get(`/pos/proxy/inventory/branch/${branchId}/low-stock`, config),
  /** Establece la cantidad absoluta en inventory_stock (sucursal activa). */
  updateStock: (data: unknown, config?: AxiosRequestConfig) =>
    getApiClient().patch('/pos/proxy/inventory/stock', data, config),
  /** @deprecated Use updateStock */
  createStock: (data: unknown, config?: AxiosRequestConfig) =>
    getApiClient().patch('/pos/proxy/inventory/stock', data, config),
  /** Agrega un producto existente a la sucursal (solo crea fila de stock). */
  addProductToBranch: (branchId: string, data: unknown, config?: AxiosRequestConfig) =>
    getApiClient().post(`/pos/proxy/inventory/branch/${branchId}/stock`, data, config),
  adjustStock: (data: unknown, config?: AxiosRequestConfig) =>
    getApiClient().patch('/pos/proxy/inventory/stock/adjust', data, config),

  // Sales
  createSale: (data: unknown, config?: AxiosRequestConfig) =>
    getApiClient().post('/pos/proxy/sales/sales', data, config),
  getSale: (id: string, config?: AxiosRequestConfig) =>
    getApiClient().get(`/pos/proxy/sales/sales/${id}`, config),
  getSales: (config?: AxiosRequestConfig) =>
    getApiClient().get('/pos/proxy/sales/sales', config),
  getSalesByUserAndBranch: (userId: string, branchId: string, config?: AxiosRequestConfig) =>
    getApiClient().get(`/pos/proxy/sales/sales/user/${userId}/branch/${branchId}`, config),
  updateSale: (id: string, data: unknown, config?: AxiosRequestConfig) =>
    getApiClient().patch(`/pos/proxy/sales/sales/${id}`, data, config),
  deleteSale: (id: string, config?: AxiosRequestConfig) =>
    getApiClient().delete(`/pos/proxy/sales/sales/${id}`, config),
  salesAction: (data: unknown, config?: AxiosRequestConfig) =>
    getApiClient().post('/pos/proxy/sales/salesAction', data, config),

  // Branches
  getBranches: (config?: AxiosRequestConfig) =>
    getApiClient().get('/pos/proxy/branch', config),
  getBranch: (id: string, config?: AxiosRequestConfig) =>
    getApiClient().get(`/pos/proxy/branch/${id}`, config),
  createBranch: (data: unknown, config?: AxiosRequestConfig) =>
    getApiClient().post('/pos/proxy/branch', data, config),
  updateBranch: (id: string, data: unknown, config?: AxiosRequestConfig) =>
    getApiClient().patch(`/pos/proxy/branch/${id}`, data, config),
  deleteBranch: (id: string, config?: AxiosRequestConfig) =>
    getApiClient().delete(`/pos/proxy/branch/${id}`, config),
  restoreBranch: (id: string, config?: AxiosRequestConfig) =>
    getApiClient().post(`/pos/proxy/branch/${id}/restore`, {}, config),
  branchAction: (data: unknown, config?: AxiosRequestConfig) =>
    getApiClient().post('/pos/proxy/branch/branchAction', data, config),

  // Shrinkage
  getShrinkage: (config?: AxiosRequestConfig) =>
    getApiClient().get('/pos/proxy/shrinkage/shrinkage', config),
  createShrinkage: (data: unknown, config?: AxiosRequestConfig) =>
    getApiClient().post('/pos/proxy/shrinkage/shrinkage', data, config),
  approveShrinkage: (id: string, config?: AxiosRequestConfig) =>
    getApiClient().post(`/pos/proxy/shrinkage/shrinkage/${id}/approve`, {}, config),
  rejectShrinkage: (id: string, data?: unknown, config?: AxiosRequestConfig) =>
    getApiClient().post(`/pos/proxy/shrinkage/shrinkage/${id}/reject`, data ?? {}, config),
  getShrinkageByStatus: (status: string, config?: AxiosRequestConfig) =>
    getApiClient().get(`/pos/proxy/shrinkage/shrinkage/status/${status}`, config),
  getShrinkageItem: (id: string, config?: AxiosRequestConfig) =>
    getApiClient().get(`/pos/proxy/shrinkage/shrinkage/${id}`, config),
  updateShrinkage: (id: string, data: unknown, config?: AxiosRequestConfig) =>
    getApiClient().patch(`/pos/proxy/shrinkage/shrinkage/${id}`, data, config),
  deleteShrinkage: (id: string, config?: AxiosRequestConfig) =>
    getApiClient().delete(`/pos/proxy/shrinkage/shrinkage/${id}`, config),
  shrinkageAction: (data: unknown, config?: AxiosRequestConfig) =>
    getApiClient().post('/pos/proxy/shrinkage/shrinkageAction', data, config),

  // Reports
  getReportsDashboard: (config?: AxiosRequestConfig) =>
    getApiClient().get('/pos/proxy/reports/dashboard', config),
  getReportsSales: (config?: AxiosRequestConfig) =>
    getApiClient().get('/pos/proxy/reports/sales', config),
  getReportsInventory: (config?: AxiosRequestConfig) =>
    getApiClient().get('/pos/proxy/reports/inventory', config),
  getReportsShrinkage: (config?: AxiosRequestConfig) =>
    getApiClient().get('/pos/proxy/reports/shrinkage', config),

  // Empresa (tenant profile)
  getEmpresaMe: (config?: AxiosRequestConfig) =>
    getApiClient().get('/pos/proxy/empresas/me', config),
  updateEmpresa: (id: string, data: unknown, config?: AxiosRequestConfig) =>
    getApiClient().patch(`/pos/proxy/empresas/${id}`, data, config),

  // Bulk Import
  importProducts: (formData: FormData, config?: AxiosRequestConfig) =>
    getApiClient().post('/pos/proxy/catalog/products/import', formData, {
      ...config,
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};
