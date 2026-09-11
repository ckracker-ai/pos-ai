import { normalizeRubroCodigo } from '@/core/config/rubro-packs';

const SEARCH_TERM: Record<string, string> = {
  FERRETERIA: 'tornillo',
  MINIMARKET: 'bebida',
  ROPA: 'polera',
  MAYORISTA: 'caja',
  GASTRONOMIA: 'cafe',
};

/** Palabra de ejemplo para *buscar …* según el pack del tenant. */
export function catalogSearchTerm(rubroNegocio?: string | null): string {
  const codigo = normalizeRubroCodigo(rubroNegocio);
  if (!codigo) return 'producto';
  return SEARCH_TERM[codigo] ?? 'producto';
}

export function buscarExample(rubroNegocio?: string | null): string {
  return `buscar ${catalogSearchTerm(rubroNegocio)}`;
}

/** Chips de ayuda iguales para WSP y voz: comandos estándar, ejemplo del rubro. */
export function buildAssistantHelpCommands(rubroNegocio?: string | null): string[] {
  return [
    'ayuda',
    'sucursales',
    buscarExample(rubroNegocio),
    'categorias',
    'pedido 1x2',
    'mi pedido',
    'confirmar',
    'cancelar pedido',
  ];
}

export function buildAssistantDemoScenario(rubroNegocio?: string | null): string[] {
  return ['sucursales', '1', buscarExample(rubroNegocio), 'pedido 1x2', 'mi pedido', 'confirmar'];
}
