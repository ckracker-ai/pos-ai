/** Flujo carrito WSP: varias búsquedas y agregar ítems antes de *confirmar*. */

import {
  wspBranchSelected,
  wspFormatAddedLinesReply,
  wspSearchResultsFooter,
} from './wspMessages.js';

export type CartLineSummary = { nombre: string; quantity: number; subtotal: number };

export function canAppendToOpenCart(awaitingCustomerConfirm: boolean): boolean {
  return awaitingCustomerConfirm;
}

export function branchSelectedSearchPrompt(branchName: string): string {
  return wspBranchSelected(branchName);
}

export function searchResultsFooter(hasOpenCart: boolean): string {
  return wspSearchResultsFooter(hasOpenCart);
}

export function formatAddedLinesReply(options: {
  pedidoId: string;
  total: number;
  addedLines: CartLineSummary[];
  appended: boolean;
  formatPrice: (n: number) => string;
}): string {
  return wspFormatAddedLinesReply(options);
}
