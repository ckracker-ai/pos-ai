// Type definitions for SVM Frontend

export interface Branch {
  id: string;
  name: string;
  code: string;
  address: string;
  city: string;
  phone: string;
  isActive: boolean;
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
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

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
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RoleOption {
  id: string;
  name: string;
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
