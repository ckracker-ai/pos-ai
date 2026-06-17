import { Op } from 'sequelize';
import Empresa from '../../tenant/models/Empresa.model';
import SaasPlan from '../models/SaasPlan.model';
import type { SaasPlanCodigo } from '../constants/planCodes';
import { getPlanDisplayName } from './planDisplay';
import Branch from '../../branch/models/Branch.model';
import User from '../../auth/models/User.model';
import AssistantChannelBinding from '../../assistant/models/AssistantChannelBinding.model';
import AssistantPaymentProof from '../../assistant/models/AssistantPaymentProof.model';
import EmpresaSuscripcion from '../models/EmpresaSuscripcion.model';
import { Result, ok, fail } from '../../../types/result';

async function loadPlanLimits(
  empresaId: string
): Promise<Result<{ maxSucursales: number; maxUsuarios: number; planCodigo: string }>> {
  const empresa = await Empresa.findByPk(empresaId, {
    include: [{ model: SaasPlan, as: 'plan', required: true }],
  });
  if (!empresa) return fail('EMPRESA_NOT_FOUND');

  const plan = empresa.get('plan') as SaasPlan | undefined;
  if (!plan) return fail('PLAN_NOT_FOUND');

  const plain =
    typeof plan.toJSON === 'function'
      ? (plan.toJSON() as Record<string, unknown>)
      : (plan as unknown as Record<string, unknown>);

  return ok({
    maxSucursales: Number(plain.maxSucursales ?? plain.max_sucursales ?? 1),
    maxUsuarios: Number(plain.maxUsuarios ?? plain.max_usuarios ?? 5),
    planCodigo: String(plain.codigo ?? ''),
  });
}

export async function assertCanAddActiveBranch(empresaId: string): Promise<Result<void>> {
  const limits = await loadPlanLimits(empresaId);
  if (!limits.success) return limits;

  const activeCount = await Branch.count({ where: { empresaId, isActive: true } });
  if (activeCount >= limits.value.maxSucursales) {
    return fail(
      `PLAN_LIMIT_BRANCHES: plan ${limits.value.planCodigo} permite máximo ${limits.value.maxSucursales} sucursal(es) activa(s)`
    );
  }
  return ok(undefined);
}

export async function assertCanAddActiveUser(empresaId: string): Promise<Result<void>> {
  const limits = await loadPlanLimits(empresaId);
  if (!limits.success) return limits;

  const activeCount = await User.count({ where: { empresaId, isActive: true } });
  if (activeCount >= limits.value.maxUsuarios) {
    return fail(
      `PLAN_LIMIT_USERS: plan ${limits.value.planCodigo} permite máximo ${limits.value.maxUsuarios} usuario(s) activo(s)`
    );
  }
  return ok(undefined);
}

export async function countPlatformStats(): Promise<
  Result<{
    empresasActivas: number;
    empresasSuspendidas: number;
    empresasPendientes: number;
    porPlan: Array<{ codigo: string; nombre: string; count: number }>;
    bindingsWhatsapp: number;
    comprobantesPendientes: number;
    suscripcionesVencidas: number;
    suscripcionesEnGracia: number;
    suscripcionesActivas: number;
    mrrEstimadoClp: number;
  }>
> {
  const empresas = await Empresa.findAll({ include: [{ model: SaasPlan, as: 'plan', required: true }] });

  let activas = 0;
  let suspendidas = 0;
  let pendientes = 0;
  const planCounts = new Map<string, { codigo: string; nombre: string; count: number }>();

  for (const row of empresas) {
    const estado = String(row.getDataValue('estado') ?? '');
    if (estado === 'ACTIVO') activas += 1;
    else if (estado === 'SUSPENDIDO') suspendidas += 1;
    else pendientes += 1;

    const plan = row.get('plan') as SaasPlan | undefined;
    const codigo = String(plan?.getDataValue('codigo') ?? '—') as SaasPlanCodigo;
    const nombre = getPlanDisplayName(codigo, String(plan?.getDataValue('nombre') ?? codigo));
    const prev = planCounts.get(codigo);
    planCounts.set(codigo, { codigo, nombre, count: (prev?.count ?? 0) + 1 });
  }

  const bindingsWhatsapp = await AssistantChannelBinding.count({
    where: { channel: 'WHATSAPP', isActive: true },
  });

  const comprobantesPendientes = await AssistantPaymentProof.count({
    where: { status: { [Op.in]: ['RECEIVED', 'NOTIFIED_ADMIN'] } },
  });

  const suscripcionesVencidas = await EmpresaSuscripcion.count({
    where: { estado: 'VENCIDA' },
  });

  const suscripcionesEnGracia = await EmpresaSuscripcion.count({
    where: { estado: 'GRACIA' },
  });

  const activeEmpresaIds = empresas
    .filter((row) => String(row.getDataValue('estado') ?? '') === 'ACTIVO')
    .map((row) => String(row.getDataValue('id')));

  const payingSubs = await EmpresaSuscripcion.findAll({
    where: {
      empresaId: { [Op.in]: activeEmpresaIds },
      estado: { [Op.in]: ['ACTIVA', 'PILOTO', 'GRACIA'] },
    },
  });

  const valorByEmpresaId = new Map<string, number>();
  for (const row of empresas) {
    const id = String(row.getDataValue('id'));
    const plan = row.get('plan') as SaasPlan | undefined;
    const valor = Number(plan?.getDataValue('valor') ?? 0);
    valorByEmpresaId.set(id, Number.isFinite(valor) ? valor : 0);
  }

  let mrrEstimadoClp = 0;
  for (const sub of payingSubs) {
    const empresaId = String(sub.getDataValue('empresaId'));
    mrrEstimadoClp += valorByEmpresaId.get(empresaId) ?? 0;
  }

  const suscripcionesActivas = payingSubs.filter(
    (sub) => String(sub.getDataValue('estado')) === 'ACTIVA'
  ).length;

  return ok({
    empresasActivas: activas,
    empresasSuspendidas: suspendidas,
    empresasPendientes: pendientes,
    porPlan: [...planCounts.values()].sort((a, b) => a.codigo.localeCompare(b.codigo)),
    bindingsWhatsapp,
    comprobantesPendientes,
    suscripcionesVencidas,
    suscripcionesEnGracia,
    suscripcionesActivas,
    mrrEstimadoClp,
  });
}
