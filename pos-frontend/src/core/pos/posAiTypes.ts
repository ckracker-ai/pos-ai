export type PosAiIntent =
  | 'ADD_TO_CART'
  | 'REMOVE_FROM_CART'
  | 'CLEAR_CART'
  | 'SUBMIT_SALE'
  | 'UNKNOWN';

export type PosAiAction = {
  action: 'ADD' | 'UPDATE' | 'REMOVE';
  product_id: string;
  quantity: number;
  reason?: string;
};

export type PosAiProductOption = {
  id: string;
  nombre: string;
  categoria?: string;
  sku?: string;
  precio: number;
  stock_actual: number;
};

export type PosAiResult = {
  intent: PosAiIntent;
  actions: PosAiAction[];
  response_message: string;
  trigger_invoice: boolean;
  /** Variantes o resultados de búsqueda para elegir con un clic. */
  product_options?: PosAiProductOption[];
  /** Cantidad detectada en el último comando (ej. «agrega 2 …»). */
  pending_quantity?: number;
};

export type PosAiCartLine = {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
};

export type PosAiProduct = {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
  category?: string;
};
