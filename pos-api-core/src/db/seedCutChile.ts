import Region from '../modules/territory/models/Region.model';
import Comuna from '../modules/territory/models/Comuna.model';
import Branch from '../modules/branch/models/Branch.model';
import { CUT_COMUNAS, CUT_COMUNA_COUNT, CUT_REGIONS } from './cut/chileCutData';
import { normalizeSearchText } from '../modules/territory/utils/textNormalize';

export async function seedCutChile(): Promise<void> {
  try {
    await Region.count();
  } catch {
    console.warn('⚠️  CUT Chile: tablas territory no existen — ejecuta migración v1.8.0-001');
    return;
  }

  for (const r of CUT_REGIONS) {
    await Region.upsert({
      codigoCut: r.codigo,
      nombre: r.nombre,
      sigla: r.sigla,
      nombreBusqueda: normalizeSearchText(r.nombre),
    });
  }

  const comunaCount = await Comuna.count();
  if (comunaCount < CUT_COMUNA_COUNT) {
    const batchSize = 80;
    for (let i = 0; i < CUT_COMUNAS.length; i += batchSize) {
      const slice = CUT_COMUNAS.slice(i, i + batchSize);
      await Comuna.bulkCreate(
        slice.map((c) => ({
          codigoCut: c.codigo,
          nombre: c.nombre,
          regionId: c.regionId,
          nombreBusqueda: normalizeSearchText(c.nombre),
        })),
        {
          updateOnDuplicate: ['nombre', 'regionId', 'nombreBusqueda'],
        }
      );
    }
    console.log(`✅  CUT Chile: ${CUT_REGIONS.length} regiones, ${CUT_COMUNAS.length} comunas (upsert)`);
  } else {
    console.log(`✅  CUT Chile: catálogo completo (${comunaCount} comunas en BD)`);
  }

  try {
    await Branch.update(
      {
        comunaId: '13106',
        codigoPostal: '9160000',
        address: 'Av. Ecuador 123',
      },
      { where: { name: 'Sucursal Central', comunaId: null } }
    );
  } catch {
    /* columnas branch aún sin migrar */
  }
}
