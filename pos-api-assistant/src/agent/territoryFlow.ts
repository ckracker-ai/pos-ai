/** Flujo WSP: buscar comuna (STT) y elegir sucursal por territorio. */

export type ComunaOption = {
  codigoCut: string;
  nombre: string;
  regionNombre?: string | null;
};

export function parseComunaQuery(text: string): string | null {
  const t = text.trim();
  const m = t.match(/^(?:buscar\s+)?comuna\s+(.+)$/i);
  if (m) return m[1].trim();
  if (/^comuna\s+/i.test(t)) return t.replace(/^comuna\s+/i, '').trim();
  return null;
}

export function formatComunaSearchResults(options: ComunaOption[]): string {
  if (options.length === 0) {
    return 'No encontré esa comuna. Prueba *comuna estacion central* o el código CUT (ej. *13106*).';
  }
  const lines = options.map(
    (c, i) =>
      `*${i + 1}.* ${c.nombre}${c.regionNombre ? ` (${c.regionNombre})` : ''} — \`${c.codigoCut}\``
  );
  return (
    `Comunas encontradas:\n\n${lines.join('\n')}\n\n` +
    'Responde con el *número* para ver sucursales en esa comuna.\n' +
    'También: *sucursales* para listar locales sin comuna.'
  );
}

export function formatTerritoryResolveReply(options: {
  comunaNombre: string;
  branches: Array<{ name: string; address: string | null }>;
  empresaNombre: string;
}): string {
  const { comunaNombre, branches, empresaNombre } = options;
  if (branches.length === 0) {
    return (
      `En *${comunaNombre}* no hay sucursal activa de ${empresaNombre} con esos datos.\n` +
      'Prueba *sucursales* o otra comuna.'
    );
  }
  if (branches.length === 1) {
    return (
      `Sucursal en *${comunaNombre}*: *${branches[0]!.name}*.\n` +
      `${branches[0]!.address ? `${branches[0]!.address}\n\n` : ''}` +
      'Ya puedes *buscar* productos. Ej: *buscar empanada*'
    );
  }
  const lines = branches.map((b, i) => `${i + 1}. ${b.name}${b.address ? ` — ${b.address}` : ''}`);
  return (
    `Sucursales en *${comunaNombre}*:\n\n${lines.join('\n')}\n\n` +
    'Responde con el *número* para elegir sucursal (igual que *sucursales*).'
  );
}
