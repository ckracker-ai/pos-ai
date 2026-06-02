import SaasPlan from '../models/SaasPlan.model';
import {
  DEFAULT_SAAS_PLAN_CODIGO,
  SaasPlanCodigo,
  SaasPlanFeatures,
} from '../constants/planCodes';
import {
  DEFAULT_SAAS_METODO_PAGO,
  isSaasMetodoPago,
  SaasMetodoPago,
} from '../constants/metodoPago';
import { Result, ok, fail } from '../../../types/result';

export interface SaasPlanRecord {
  id: string;
  codigo: SaasPlanCodigo;
  nombre: string;
  descripcion: string | null;
  valor: number;
  metodoPago: SaasMetodoPago;
  activo: boolean;
  maxSucursales: number;
  maxUsuarios: number;
  features: SaasPlanFeatures;
  orden: number;
}

export interface UpdateSaasPlanInput {
  descripcion?: string | null;
  valor?: number;
  metodoPago?: SaasMetodoPago;
  activo?: boolean;
}

function parseFeatures(raw: unknown): SaasPlanFeatures {
  const base: SaasPlanFeatures = {
    modulosCore: true,
    assistantWhatsapp: false,
    assistantVoz: false,
    pagosOnline: false,
  };
  if (!raw || typeof raw !== 'object') return base;
  const o = raw as Record<string, unknown>;
  return {
    modulosCore: o.modulosCore !== false,
    assistantWhatsapp: o.assistantWhatsapp === true,
    assistantVoz: o.assistantVoz === true,
    pagosOnline: o.pagosOnline === true,
  };
}

function parseMetodoPago(raw: unknown): SaasMetodoPago {
  const value = String(raw ?? DEFAULT_SAAS_METODO_PAGO).toUpperCase();
  return isSaasMetodoPago(value) ? value : DEFAULT_SAAS_METODO_PAGO;
}

class SaasPlanDelegate {
  private toRecord(row: SaasPlan): SaasPlanRecord {
    const plain =
      typeof row.toJSON === 'function'
        ? (row.toJSON() as Record<string, unknown>)
        : (row as unknown as Record<string, unknown>);

    const valorRaw =
      plain.valor ?? plain.precioReferenciaClp ?? plain.precio_referencia_clp ?? 0;

    return {
      id: String(plain.id ?? row.id ?? ''),
      codigo: String(plain.codigo ?? row.codigo ?? DEFAULT_SAAS_PLAN_CODIGO) as SaasPlanCodigo,
      nombre: String(plain.nombre ?? row.nombre ?? ''),
      descripcion: (plain.descripcion as string | null | undefined) ?? null,
      valor: Number(valorRaw),
      metodoPago: parseMetodoPago(plain.metodoPago ?? plain.metodo_pago),
      activo: plain.isActive !== false && plain.is_active !== 0,
      maxSucursales: Number(plain.maxSucursales ?? plain.max_sucursales ?? 1),
      maxUsuarios: Number(plain.maxUsuarios ?? plain.max_usuarios ?? 5),
      features: parseFeatures(plain.features),
      orden: Number(plain.orden ?? 0),
    };
  }

  async listActive(): Promise<Result<SaasPlanRecord[]>> {
    const rows = await SaasPlan.findAll({
      where: { isActive: true },
      order: [
        ['orden', 'ASC'],
        ['nombre', 'ASC'],
      ],
    });
    return ok(rows.map((row) => this.toRecord(row)));
  }

  /** Catálogo completo — plataforma (incluye inactivos). */
  async listCatalog(): Promise<Result<SaasPlanRecord[]>> {
    const rows = await SaasPlan.findAll({
      order: [
        ['orden', 'ASC'],
        ['nombre', 'ASC'],
      ],
    });
    return ok(rows.map((row) => this.toRecord(row)));
  }

  async update(id: string, input: UpdateSaasPlanInput): Promise<Result<SaasPlanRecord>> {
    const row = await SaasPlan.findByPk(id);
    if (!row) return fail('PLAN_NOT_FOUND');

    const patch: Record<string, unknown> = {};

    if (input.descripcion !== undefined) {
      patch.descripcion = input.descripcion?.trim() || null;
    }
    if (input.valor !== undefined) {
      const valor = Number(input.valor);
      if (!Number.isFinite(valor) || valor < 0) {
        return fail('VALIDATION_ERROR: valor must be a non-negative number');
      }
      patch.valor = Math.round(valor);
    }
    if (input.metodoPago !== undefined) {
      const metodo = String(input.metodoPago).toUpperCase();
      if (!isSaasMetodoPago(metodo)) {
        return fail('VALIDATION_ERROR: invalid metodoPago');
      }
      patch.metodoPago = metodo;
    }
    if (input.activo !== undefined) {
      patch.isActive = Boolean(input.activo);
    }

    if (Object.keys(patch).length === 0) {
      return fail('VALIDATION_ERROR: no fields to update');
    }

    await row.update(patch);
    await row.reload();
    return ok(this.toRecord(row));
  }

  async resolvePlanId(input: {
    planId?: string;
    planCodigo?: string;
  }): Promise<Result<string>> {
    const planId = input.planId?.trim();
    const planCodigo = input.planCodigo?.trim().toUpperCase();

    if (planId) {
      const byId = await SaasPlan.findOne({ where: { id: planId, isActive: true } });
      if (!byId) return fail('PLAN_NOT_FOUND');
      return ok(String(byId.id));
    }

    const codigo = (planCodigo || DEFAULT_SAAS_PLAN_CODIGO) as SaasPlanCodigo;
    const byCodigo = await SaasPlan.findOne({ where: { codigo, isActive: true } });
    if (!byCodigo) return fail('PLAN_NOT_FOUND');
    return ok(String(byCodigo.id));
  }
}

export default new SaasPlanDelegate();
