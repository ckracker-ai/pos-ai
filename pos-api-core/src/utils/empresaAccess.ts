import Empresa, { EmpresaEstado } from '../modules/tenant/models/Empresa.model';
import { readModelString } from './modelAttributes';
import { Result, ok, fail } from '../types/result';

export async function getEmpresaEstado(empresaId: string): Promise<EmpresaEstado | null> {
  const row = await Empresa.findByPk(empresaId, { attributes: ['id', 'estado'] });
  if (!row) return null;
  return String(readModelString(row, 'estado') ?? row.estado ?? '') as EmpresaEstado;
}

/** Login y operación tenant: solo empresas ACTIVO. */
export async function assertEmpresaAllowsLogin(empresaId: string): Promise<Result<true>> {
  const estado = await getEmpresaEstado(empresaId);
  if (!estado) return fail('EMPRESA_NOT_FOUND');
  if (estado === 'SUSPENDIDO') return fail('EMPRESA_SUSPENDED');
  if (estado === 'PENDIENTE_ONBOARDING') return fail('EMPRESA_PENDING_ONBOARDING');
  return ok(true);
}

export async function assertEmpresaAllowsOperation(empresaId: string): Promise<Result<true>> {
  return assertEmpresaAllowsLogin(empresaId);
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim());
}
