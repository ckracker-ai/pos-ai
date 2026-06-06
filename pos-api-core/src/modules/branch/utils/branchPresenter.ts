import type Branch from '../models/Branch.model';
import Comuna from '../../territory/models/Comuna.model';
import Region from '../../territory/models/Region.model';

type ComunaWithRegion = Comuna & { region?: Region | null };
type BranchWithComuna = Branch & { comuna?: ComunaWithRegion | null };

export const branchListInclude = [
  {
    model: Comuna,
    as: 'comuna',
    required: false,
    include: [{ model: Region, as: 'region', required: false }],
  },
];

export function presentBranch(branch: BranchWithComuna) {
  const branchValues = branch.get({ plain: true }) as {
    id?: string;
    empresaId?: string;
    name?: string;
    address?: string | null;
    phone?: string | null;
    comunaId?: string | null;
    comuna_id?: string | null;
    codigoPostal?: string | null;
    codigo_postal?: string | null;
    isActive?: boolean;
    is_active?: boolean;
    createdAt?: string;
    created_at?: string;
    updatedAt?: string;
    updated_at?: string;
  };
  const comuna = branch.comuna;
  const comunaValues = comuna?.get({ plain: true }) as
    | { nombre?: string; regionId?: string; region_id?: string }
    | undefined;
  const regionValues = comuna?.region?.get({ plain: true }) as { nombre?: string } | undefined;
  return {
    id: String(branchValues.id ?? ''),
    empresaId: String(branchValues.empresaId ?? ''),
    name: String(branchValues.name ?? ''),
    address: branchValues.address ?? null,
    phone: branchValues.phone ?? null,
    comunaId: branchValues.comunaId ?? branchValues.comuna_id ?? null,
    codigoPostal: branchValues.codigoPostal ?? branchValues.codigo_postal ?? null,
    comunaNombre: comunaValues?.nombre ?? null,
    regionId: comunaValues?.regionId ?? comunaValues?.region_id ?? null,
    regionNombre: regionValues?.nombre ?? null,
    isActive: Boolean(branchValues.isActive ?? branchValues.is_active ?? false),
    createdAt: String(branchValues.createdAt ?? branchValues.created_at ?? ''),
    updatedAt: String(branchValues.updatedAt ?? branchValues.updated_at ?? ''),
  };
}
