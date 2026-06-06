/**
 * Genera pos-api-core/src/db/cut/chileCutData.ts desde CUT SUBDERE (CSV bastianolea/cut_comunas).
 * Uso: node scripts/build-chile-cut-data.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const csvPath = path.join(root, 'data', 'cut', 'cut_comuna-subdere-2018.csv');
const outPath = path.join(root, 'pos-api-core', 'src', 'db', 'cut', 'chileCutData.ts');

function normalizeSearchKey(name) {
  return name
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function padRegion(code) {
  const s = String(code).trim();
  return s.length === 1 ? `0${s}` : s;
}

function padComuna(code) {
  const s = String(code).trim();
  if (s.length >= 5) return s;
  return s.padStart(5, '0');
}

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/).slice(1);
  const regions = new Map();
  const comunas = [];

  for (const line of lines) {
    const parts = line.split(';');
    if (parts.length < 7) continue;
    const [codReg, nombreReg, sigla, , , codComuna, nombreComuna] = parts;
    const regionId = padRegion(codReg);
    if (!regions.has(regionId)) {
      regions.set(regionId, { codigo: regionId, nombre: nombreReg.trim(), sigla: sigla.trim() });
    }
    comunas.push({
      codigo: padComuna(codComuna),
      nombre: nombreComuna.trim(),
      regionId,
    });
  }

  return {
    regions: [...regions.values()].sort((a, b) => a.codigo.localeCompare(b.codigo)),
    comunas,
  };
}

const csv = fs.readFileSync(csvPath, 'utf8');
const { regions, comunas } = parseCsv(csv);

if (comunas.length < 340) {
  console.error(`Expected ~346 comunas, got ${comunas.length}`);
  process.exit(1);
}

const header = `/** CUT Chile — generado desde data/cut/cut_comuna-subdere-2018.csv (${comunas.length} comunas). */\n`;
const body = `${header}
export type CutRegionRow = { codigo: string; nombre: string; sigla: string };
export type CutComunaRow = { codigo: string; nombre: string; regionId: string };

export const CUT_REGIONS: CutRegionRow[] = ${JSON.stringify(regions, null, 2)};

export const CUT_COMUNAS: CutComunaRow[] = ${JSON.stringify(comunas, null, 2)};

export const CUT_COMUNA_COUNT = ${comunas.length};
`;

fs.writeFileSync(outPath, body, 'utf8');
console.log(`OK: ${regions.length} regiones, ${comunas.length} comunas → ${outPath}`);
