import { Op } from 'sequelize';
import Region from '../models/Region.model';
import Comuna from '../models/Comuna.model';
import Branch from '../../branch/models/Branch.model';
import { normalizeSearchText, isValidCodigoPostal } from '../utils/textNormalize';

export type TerritoryResult<T> = { success: true; data: T } | { success: false; error: string };

function mapRegion(r: Region) {
  const values = r.get({ plain: true }) as {
    codigoCut?: string;
    codigo_cut?: string;
    nombre?: string;
    sigla?: string;
  };
  return {
    codigoCut: String(values.codigoCut ?? values.codigo_cut ?? ''),
    nombre: String(values.nombre ?? ''),
    sigla: String(values.sigla ?? ''),
  };
}

function mapComuna(c: Comuna, region?: Region | null) {
  const comunaValues = c.get({ plain: true }) as {
    codigoCut?: string;
    codigo_cut?: string;
    nombre?: string;
    regionId?: string;
    region_id?: string;
  };
  const regionValues = region?.get({ plain: true }) as { nombre?: string } | undefined;
  return {
    codigoCut: String(comunaValues.codigoCut ?? comunaValues.codigo_cut ?? ''),
    nombre: String(comunaValues.nombre ?? ''),
    regionId: String(comunaValues.regionId ?? comunaValues.region_id ?? ''),
    regionNombre: regionValues?.nombre ?? null,
  };
}

export const territoryDelegate = {
  async listRegions(): Promise<TerritoryResult<{ regions: ReturnType<typeof mapRegion>[] }>> {
    const regions = await Region.findAll({ order: [['nombre', 'ASC']] });
    return { success: true, data: { regions: regions.map(mapRegion) } };
  },

  async listComunasByRegion(
    regionId: string
  ): Promise<TerritoryResult<{ comunas: ReturnType<typeof mapComuna>[] }>> {
    const comunas = await Comuna.findAll({
      where: { regionId },
      order: [['nombre', 'ASC']],
    });
    return { success: true, data: { comunas: comunas.map((c) => mapComuna(c)) } };
  },

  async searchComunas(
    query: string,
    limit = 8
  ): Promise<TerritoryResult<{ comunas: ReturnType<typeof mapComuna>[] }>> {
    const q = normalizeSearchText(query);
    if (!q) return { success: true, data: { comunas: [] } };

    const digits = q.replace(/\s/g, '');
    if (/^\d{4,5}$/.test(digits)) {
      const code = digits.length < 5 ? digits.padStart(5, '0') : digits;
      const exact = await Comuna.findByPk(code, { include: [{ model: Region, as: 'region' }] });
      if (exact) {
        return {
          success: true,
          data: { comunas: [mapComuna(exact, (exact as Comuna & { region?: Region }).region)] },
        };
      }
    }

    const comunas = await Comuna.findAll({
      where: {
        [Op.or]: [
          { nombreBusqueda: { [Op.like]: `%${q}%` } },
          { codigoCut: { [Op.like]: `${q}%` } },
        ],
      },
      include: [{ model: Region, as: 'region' }],
      order: [['nombre', 'ASC']],
      limit: Math.min(limit, 20),
    });

    return {
      success: true,
      data: {
        comunas: comunas.map((c) => mapComuna(c, (c as Comuna & { region?: Region }).region)),
      },
    };
  },

  async resolveLocation(input: {
    comunaText?: string;
    comunaId?: string;
    codigoPostal?: string;
    empresaId?: string;
  }): Promise<
    TerritoryResult<{
      comunas: ReturnType<typeof mapComuna>[];
      branches: Array<{
        id: string;
        name: string;
        address: string | null;
        comunaId: string | null;
        codigoPostal: string | null;
      }>;
    }>
  > {
    const comunas: ReturnType<typeof mapComuna>[] = [];

    const cp = String(input.codigoPostal ?? '').trim();
    if (cp && !isValidCodigoPostal(cp)) {
      return { success: false, error: 'INVALID_POSTAL_CODE' };
    }

    const comunaId = String(input.comunaId ?? '').trim();
    if (comunaId) {
      const exact = await Comuna.findByPk(comunaId, { include: [{ model: Region, as: 'region' }] });
      if (exact) {
        comunas.push(mapComuna(exact, (exact as Comuna & { region?: Region }).region));
      }
    } else {
      const text = String(input.comunaText ?? '').trim();
      if (text) {
        const found = await this.searchComunas(text, 5);
        if (found.success) comunas.push(...found.data.comunas);
      }
    }

    let branches: Array<{
      id: string;
      name: string;
      address: string | null;
      comunaId: string | null;
      codigoPostal: string | null;
    }> = [];

    if (input.empresaId && comunas.length >= 1) {
      const target = comunas[0]!;
      const where: Record<string, unknown> = {
        empresaId: input.empresaId,
        isActive: true,
        comunaId: target.codigoCut,
      };
      if (cp) where.codigoPostal = cp;

      const rows = await Branch.findAll({ where, limit: 10 });
      branches = rows.map((b) => ({
        id: b.id,
        name: b.name,
        address: b.address ?? null,
        comunaId: b.comunaId ?? null,
        codigoPostal: b.codigoPostal ?? null,
      }));
    }

    return { success: true, data: { comunas, branches } };
  },
};
