export type PosStockItem = {
  id: string;
  nombre: string;
  sku: string;
  precio: number;
  stock_actual: number;
};

export type PosCartItem = {
  id_producto: string;
  cantidad: number;
  precio_unitario: number;
};

export type PosAiActionType = 'ADD' | 'UPDATE' | 'REMOVE';

export type PosAiIntent =
  | 'ADD_TO_CART'
  | 'REMOVE_FROM_CART'
  | 'CLEAR_CART'
  | 'SUBMIT_SALE'
  | 'UNKNOWN';

export type PosAiAction = {
  action: PosAiActionType;
  product_id: string;
  quantity: number;
  reason: string;
};

export type PosAiResult = {
  intent: PosAiIntent;
  actions: PosAiAction[];
  response_message: string;
  trigger_invoice: boolean;
};

export type PosInterpretInput = {
  userText: string;
  stocks: PosStockItem[];
  cart: PosCartItem[];
};
