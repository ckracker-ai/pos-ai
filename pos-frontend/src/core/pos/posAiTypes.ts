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

export type PosAiResult = {
  intent: PosAiIntent;
  actions: PosAiAction[];
  response_message: string;
  trigger_invoice: boolean;
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
};
