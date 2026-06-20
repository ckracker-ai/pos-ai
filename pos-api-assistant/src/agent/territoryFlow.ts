/** Flujo WSP: buscar comuna (STT) y elegir sucursal por territorio. */

import {
  wspComunaSearchResults,
  wspTerritoryResolveReply,
  type ComunaOption,
} from './wspMessages.js';

export type { ComunaOption };

export function parseComunaQuery(text: string): string | null {
  const t = text.trim();
  const m = t.match(/^(?:buscar\s+)?comuna\s+(.+)$/i);
  if (m) return m[1].trim();
  if (/^comuna\s+/i.test(t)) return t.replace(/^comuna\s+/i, '').trim();
  return null;
}

export function formatComunaSearchResults(options: ComunaOption[]): string {
  return wspComunaSearchResults(options);
}

export function formatTerritoryResolveReply(options: {
  comunaNombre: string;
  branches: Array<{ name: string; address: string | null }>;
  empresaNombre: string;
}): string {
  return wspTerritoryResolveReply(options);
}
