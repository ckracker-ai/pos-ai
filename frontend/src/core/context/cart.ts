import { create } from 'zustand';
import { CartItem, Product } from '@/core/interfaces';

interface CartStore {
  items: CartItem[];
  addItem: (product: Product, quantity: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  applyDiscount: (productId: string, discount: number) => void;
  clearCart: () => void;
  getTotal: () => number;
  getSubtotal: () => number;
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  
  addItem: (product: Product, quantity: number) => {
    const state = get();
    const existingItem = state.items.find(item => item.productId === product.id);
    
    if (existingItem) {
      set({
        items: state.items.map(item =>
          item.productId === product.id
            ? {
                ...item,
                quantity: item.quantity + quantity,
                total: (item.quantity + quantity) * item.unitPrice - item.discount,
              }
            : item
        ),
      });
    } else {
      set({
        items: [
          ...state.items,
          {
            productId: product.id,
            product,
            quantity,
            unitPrice: product.price,
            discount: 0,
            total: quantity * product.price,
          },
        ],
      });
    }
  },
  
  removeItem: (productId: string) => {
    set(state => ({
      items: state.items.filter(item => item.productId !== productId),
    }));
  },
  
  updateQuantity: (productId: string, quantity: number) => {
    if (quantity <= 0) {
      get().removeItem(productId);
      return;
    }
    set(state => ({
      items: state.items.map(item =>
        item.productId === productId
          ? {
              ...item,
              quantity,
              total: quantity * item.unitPrice - item.discount,
            }
          : item
      ),
    }));
  },
  
  applyDiscount: (productId: string, discount: number) => {
    set(state => ({
      items: state.items.map(item =>
        item.productId === productId
          ? {
              ...item,
              discount,
              total: item.quantity * item.unitPrice - discount,
            }
          : item
      ),
    }));
  },
  
  clearCart: () => {
    set({ items: [] });
  },
  
  getSubtotal: () => {
    return get().items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  },
  
  getTotal: () => {
    return get().items.reduce((sum, item) => sum + item.total, 0);
  },
}));
