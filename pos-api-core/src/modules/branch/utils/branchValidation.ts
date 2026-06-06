import Comuna from '../../territory/models/Comuna.model';
import { isValidCodigoPostal } from '../../territory/utils/textNormalize';

export async function validateBranchTerritory(input: {
  comunaId?: string | null;
  codigoPostal?: string | null;
  requireTerritory?: boolean;
}): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const require = input.requireTerritory !== false;
  const comunaId = String(input.comunaId ?? '').trim();
  const cp = String(input.codigoPostal ?? '').trim();

  if (!require) {
    if (comunaId) {
      const exists = await Comuna.findByPk(comunaId);
      if (!exists) return { ok: false, error: 'COMUNA_NOT_FOUND', status: 422 };
    }
    if (cp && !isValidCodigoPostal(cp)) {
      return { ok: false, error: 'INVALID_POSTAL_CODE', status: 422 };
    }
    return { ok: true };
  }

  if (!comunaId) return { ok: false, error: 'COMUNA_REQUIRED', status: 422 };
  if (!isValidCodigoPostal(cp)) return { ok: false, error: 'INVALID_POSTAL_CODE', status: 422 };

  const comuna = await Comuna.findByPk(comunaId);
  if (!comuna) return { ok: false, error: 'COMUNA_NOT_FOUND', status: 422 };

  return { ok: true };
}
