// Type definitions for SVM Frontend

export interface Branch {
  id: string;
  name: string;
  code: string;
  address: string;
  city: string;
  comunaId?: string | null;
  codigoPostal?: string | null;
  comunaNombre?: string | null;
  regionId?: string | null;
  regionNombre?: string | null;
  phone: string;
  isActive: boolean;
}

export interface TerritoryRegion {
  codigoCut: string;
  nombre: string;
  sigla: string;
}

export interface TerritoryComuna {
  codigoCut: string;
  nombre: string;
  regionId: string;
  regionNombre?: string | null;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  cost: number;
  stock: number;
  sku: string;
  category: string;
  categoryId?: string;
  supplierId?: string;
  image?: string;
  isActive: boolean;
  /** Producto con fila en inventory_stock para la sucursal activa. */
  inBranch?: boolean;
  stockRecordId?: string;
  minStock?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CartItem {
  productId: string;
  product?: Product;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
}

export interface Sale {
  id: string;
  saleNumber: string;
  branchId: string;
  items: CartItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paymentMethod: 'cash' | 'card' | 'check' | 'other';
  status: 'pending' | 'completed' | 'cancelled';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// Authentication Types
export type UserRole = 'admin' | 'seller' | 'auditor' | 'comanda' | 'user';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  branchId?: string;
  whatsappPhone?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LegalAcceptancePayload {
  termsVersion: string;
  privacyVersion: string;
  accepted: true;
}

export interface LoginRequest {
  email: string;
  password: string;
  legalAcceptance?: LegalAcceptancePayload;
}

export type LoginLegalReauthBundle = {
  terms: { version: string; title: string };
  privacy: { version: string; title: string };
};

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken?: string;
}

export interface AuthApiUser {
  id?: string;
  email?: string;
  fullName?: string;
  name?: string;
  roleName: string;
  branchId?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthApiData {
  token: string;
  user: AuthApiUser;
}

export interface AuthApiResponse {
  success: boolean;
  data: AuthApiData;
  error: string | null;
  code: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface Supplier {
  id: string;
  name: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  parentId?: string | null;
  parentName?: string | null;
  depth?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RoleOption {
  id: string;
  name: string;
}

export type EmpresaEstado = 'ACTIVO' | 'SUSPENDIDO' | 'PENDIENTE_ONBOARDING';

export type EmpresaEstadoTributario = 'INFORMAL' | 'EN_TRAMITE' | 'FORMAL';

export type FormalizacionProgreso = {
  diagnostico?: 'ocasional' | 'sustento' | null;
  pasos?: {
    sii?: boolean;
    municipalidad?: boolean;
    cuentaBancaria?: boolean;
    capturaRut?: boolean;
  };
};

export type SuscripcionEstado = 'ACTIVA' | 'GRACIA' | 'VENCIDA' | 'CANCELADA' | 'PILOTO';

export interface EmpresaSuscripcionSummary {
  id: string;
  estado: SuscripcionEstado;
  origen: string;
  periodo: string;
  inicioEn: string;
  proximoCobroEn: string | null;
  venceEn: string | null;
  graceHasta: string | null;
  notas: string | null;
}

export type SaasPlanCodigo = 'BASICO' | 'ESTANDAR' | 'FULL';

export type SaasMetodoPago = 'TRANSFERENCIA' | 'WEBPAY' | 'MERCADO_PAGO' | 'FLOW' | 'MIXTO';

export interface SaasPlanFeatures {
  modulosCore: boolean;
  assistantWhatsapp: boolean;
  assistantVoz: boolean;
  pagosOnline: boolean;
}

export interface EmpresaPlanSummary {
  id: string;
  codigo: SaasPlanCodigo;
  nombre: string;
  descripcion: string | null;
  valor: number;
  metodoPago: SaasMetodoPago;
  activo: boolean;
  maxSucursales: number;
  maxUsuarios: number;
  features: SaasPlanFeatures;
}

export interface SaasPlan {
  id: string;
  codigo: SaasPlanCodigo;
  nombre: string;
  descripcion: string | null;
  valor: number;
  metodoPago: SaasMetodoPago;
  activo: boolean;
  maxSucursales: number;
  maxUsuarios: number;
  features: SaasPlanFeatures;
  orden: number;
}

export interface Empresa {
  id: string;
  rutEmpresa: string;
  razonSocial: string;
  nombreFantasia: string | null;
  giroSii: string | null;
  direccionComercial: string | null;
  correoFacturacion: string | null;
  urlLogo: string | null;
  slug: string;
  estado: EmpresaEstado;
  estadoTributario: EmpresaEstadoTributario;
  rubroNegocio: string | null;
  telefonoNegocio: string | null;
  formalizacionProgreso: FormalizacionProgreso | null;
  formalizacionPorcentaje: number;
  esNegocioEnMarcha: boolean;
  planId: string;
  plan: EmpresaPlanSummary;
  assistantAdminPhone?: string | null;
  transferBankName?: string | null;
  transferAccountType?: string | null;
  transferAccount?: string | null;
  transferHolderName?: string | null;
  transferRut?: string | null;
  suscripcion?: EmpresaSuscripcionSummary | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateEmpresaInput {
  razonSocial?: string;
  nombreFantasia?: string | null;
  giroSii?: string | null;
  direccionComercial?: string | null;
  correoFacturacion?: string | null;
  urlLogo?: string | null;
  slug?: string;
  transferBankName?: string | null;
  transferAccountType?: string | null;
  transferAccount?: string | null;
  transferHolderName?: string | null;
  transferRut?: string | null;
}

export interface KitchenOrderLine {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
}

export interface KitchenOrder {
  id: string;
  status: string;
  notes?: string;
  /** Referencia legible para cocina (ej. Venta #EF-01). */
  displayReference: string;
  /** Notas del cliente/cajero sin la línea de referencia de venta. */
  customerNotes?: string;
  createdAt: string;
  items: KitchenOrderLine[];
}
