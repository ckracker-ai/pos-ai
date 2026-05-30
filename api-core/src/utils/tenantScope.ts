import Branch from '../modules/branch/models/Branch.model';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { readModelString } from './modelAttributes';

export function getEffectiveEmpresaId(req: AuthenticatedRequest): string {
  return req.user!.empresaId;
}

export async function branchBelongsToEmpresa(
  branchId: string,
  empresaId: string
): Promise<boolean> {
  const branch = await Branch.findOne({
    where: { id: branchId, empresaId },
    attributes: ['id'],
  });
  return Boolean(branch);
}

export async function resolveBranchInEmpresa(
  branchId: string,
  empresaId: string
): Promise<string | null> {
  const ok = await branchBelongsToEmpresa(branchId, empresaId);
  return ok ? branchId : null;
}

export async function readBranchEmpresaId(branchId: string): Promise<string | null> {
  const branch = await Branch.findByPk(branchId, { attributes: ['id', 'empresaId'] });
  if (!branch) return null;
  return readModelString(branch, 'empresaId') || null;
}
