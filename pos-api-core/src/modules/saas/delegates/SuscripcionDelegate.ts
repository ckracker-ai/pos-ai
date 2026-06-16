import { Op } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import EmpresaSuscripcion, {
  SuscripcionEstado,
  SuscripcionOrigen,
  SuscripcionPeriodo,
} from '../models/EmpresaSuscripcion.model';
import Empresa from '../../tenant/models/Empresa.model';
import { Result, ok, fail } from '../../../types/result';
import { SUBSCRIPTION_GRACE_DAYS } from '../constants/billing';
import { computeExpiryTransition } from '../utils/subscriptionExpiry';
import subscriptionBillingNotificationDelegate from '../../notifications/delegates/SubscriptionBillingNotificationDelegate';

export type SuscripcionSummary = {
  id: string;
  estado: SuscripcionEstado;
  origen: SuscripcionOrigen;
  periodo: SuscripcionPeriodo;
  inicioEn: string;
  proximoCobroEn: string | null;
  venceEn: string | null;
  graceHasta: string | null;
  notas: string | null;
};

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

function toIso(d: Date | null | undefined): string | null {
  if (!d) return null;
  return d instanceof Date ? d.toISOString() : String(d);
}

class SuscripcionDelegate {
  toSummary(row: EmpresaSuscripcion): SuscripcionSummary {
    return {
      id: String(row.getDataValue('id') ?? ''),
      estado: String(row.getDataValue('estado') ?? 'PILOTO') as SuscripcionEstado,
      origen: String(row.getDataValue('origen') ?? 'PLATAFORMA') as SuscripcionOrigen,
      periodo: String(row.getDataValue('periodo') ?? 'MENSUAL') as SuscripcionPeriodo,
      inicioEn: toIso(row.getDataValue('inicioEn') as Date) ?? new Date().toISOString(),
      proximoCobroEn: toIso(row.getDataValue('proximoCobroEn') as Date | null),
      venceEn: toIso(row.getDataValue('venceEn') as Date | null),
      graceHasta: toIso(row.getDataValue('graceHasta') as Date | null),
      notas: (row.getDataValue('notas') as string | null) ?? null,
    };
  }

  async findByEmpresaId(empresaId: string): Promise<EmpresaSuscripcion | null> {
    return EmpresaSuscripcion.findOne({ where: { empresaId } });
  }

  async ensureForEmpresa(
    empresaId: string,
    planId: string,
    options?: {
      estado?: SuscripcionEstado;
      origen?: SuscripcionOrigen;
      periodo?: SuscripcionPeriodo;
      diasVigencia?: number;
    }
  ): Promise<Result<SuscripcionSummary>> {
    const existing = await this.findByEmpresaId(empresaId);
    if (existing) return ok(this.toSummary(existing));

    const now = new Date();
    const dias = options?.diasVigencia ?? 90;
    const row = await EmpresaSuscripcion.create({
      id: uuidv4(),
      empresaId,
      planId,
      estado: options?.estado ?? 'PILOTO',
      origen: options?.origen ?? 'PLATAFORMA',
      periodo: options?.periodo ?? 'MENSUAL',
      inicioEn: now,
      proximoCobroEn: addDays(now, 30),
      venceEn: addDays(now, dias),
      graceHasta: null,
      notas: null,
    });
    return ok(this.toSummary(row));
  }

  async syncPlanChange(empresaId: string, planId: string): Promise<Result<SuscripcionSummary>> {
    const row = await this.findByEmpresaId(empresaId);
    if (!row) {
      return this.ensureForEmpresa(empresaId, planId, { estado: 'PILOTO', diasVigencia: 90 });
    }
    await row.update({ planId });
    return ok(this.toSummary(row));
  }

  private async applyExpiryTransition(
    row: EmpresaSuscripcion,
    options?: { notify?: boolean }
  ): Promise<'none' | 'grace' | 'vencida'> {
    const now = new Date();
    const plan = computeExpiryTransition({
      now,
      venceEn: (row.getDataValue('venceEn') as Date | null) ?? null,
      estado: String(row.getDataValue('estado') ?? 'PILOTO') as SuscripcionEstado,
      graceHasta: (row.getDataValue('graceHasta') as Date | null) ?? null,
      graceDays: SUBSCRIPTION_GRACE_DAYS,
    });

    if (plan.transition === 'none') {
      if (plan.nextEstado) {
        await row.update({ estado: plan.nextEstado });
      }
      return 'none';
    }

    const patch: Partial<{
      estado: SuscripcionEstado;
      graceHasta: Date | null;
    }> = {};
    if (plan.nextEstado) patch.estado = plan.nextEstado;
    if (plan.nextGraceHasta !== undefined) patch.graceHasta = plan.nextGraceHasta;
    await row.update(patch);

    if (options?.notify && plan.transition === 'grace') {
      await row.reload();
      const empresaId = String(row.getDataValue('empresaId') ?? '');
      const empresa = await Empresa.findByPk(empresaId, {
        attributes: ['nombreFantasia', 'razonSocial'],
      });
      const negocio =
        String(empresa?.getDataValue('nombreFantasia') ?? '').trim() ||
        String(empresa?.getDataValue('razonSocial') ?? '').trim() ||
        'Tu negocio';
      void subscriptionBillingNotificationDelegate
        .notifyGracePeriod({
          empresaId,
          negocio,
          suscripcion: this.toSummary(row),
        })
        .catch((err: unknown) => console.warn('[EMAIL] grace notify error:', err));
    }

    return plan.transition;
  }

  private async refreshVencimiento(row: EmpresaSuscripcion): Promise<EmpresaSuscripcion> {
    await this.applyExpiryTransition(row);
    return row;
  }

  private async suspendEmpresaIfNeeded(empresaId: string): Promise<boolean> {
    const empresa = await Empresa.findByPk(empresaId, { attributes: ['id', 'estado', 'nombreFantasia', 'razonSocial'] });
    if (!empresa) return false;
    const estado = String(empresa.getDataValue('estado') ?? '');
    if (estado !== 'ACTIVO') return false;
    await empresa.update({ estado: 'SUSPENDIDO' });
    const negocio =
      String(empresa.getDataValue('nombreFantasia') ?? '').trim() ||
      String(empresa.getDataValue('razonSocial') ?? '').trim() ||
      'Tu negocio';
    void subscriptionBillingNotificationDelegate
      .notifySuspended({ empresaId, negocio })
      .catch((err: unknown) => console.warn('[EMAIL] suspend notify error:', err));
    return true;
  }

  async assertAllowsTenantAccess(empresaId: string): Promise<Result<true>> {
    let row = await this.findByEmpresaId(empresaId);
    if (!row) {
      const empresa = await Empresa.findByPk(empresaId, { attributes: ['id', 'planId', 'estado'] });
      if (!empresa) return fail('EMPRESA_NOT_FOUND');
      const ensured = await this.ensureForEmpresa(
        empresaId,
        String(empresa.getDataValue('planId') ?? ''),
        {
          estado: String(empresa.getDataValue('estado') ?? '') === 'ACTIVO' ? 'PILOTO' : 'VENCIDA',
          diasVigencia: 90,
        }
      );
      if (!ensured.success) return ensured;
      row = await this.findByEmpresaId(empresaId);
      if (!row) return fail('SUBSCRIPTION_NOT_FOUND');
    }

    row = await this.refreshVencimiento(row);
    const estado = String(row.getDataValue('estado') ?? '') as SuscripcionEstado;

    if (estado === 'CANCELADA') {
      return fail('SUBSCRIPTION_CANCELLED');
    }

    if (estado === 'GRACIA') {
      return ok(true);
    }

    if (estado === 'VENCIDA') {
      return fail('SUBSCRIPTION_EXPIRED');
    }

    return ok(true);
  }

  async extendVigencia(
    empresaId: string,
    extendDays: number
  ): Promise<Result<SuscripcionSummary>> {
    if (!Number.isFinite(extendDays) || extendDays <= 0) {
      return fail('VALIDATION_ERROR: extendDays must be positive');
    }
    const row = await this.findByEmpresaId(empresaId);
    if (!row) return fail('SUBSCRIPTION_NOT_FOUND');

    const base = (row.getDataValue('venceEn') as Date | null) ?? new Date();
    const newVence = addDays(base > new Date() ? base : new Date(), extendDays);
    await row.update({
      venceEn: newVence,
      estado: 'PILOTO',
      graceHasta: null,
    });
    return ok(this.toSummary(row));
  }

  async setGracePeriod(
    empresaId: string,
    graceDays: number
  ): Promise<Result<SuscripcionSummary>> {
    if (!Number.isFinite(graceDays) || graceDays <= 0) {
      return fail('VALIDATION_ERROR: graceDays must be positive');
    }
    const row = await this.findByEmpresaId(empresaId);
    if (!row) return fail('SUBSCRIPTION_NOT_FOUND');

    await row.update({
      graceHasta: addDays(new Date(), graceDays),
      estado: 'GRACIA',
    });
    return ok(this.toSummary(row));
  }

  async cancel(empresaId: string, note?: string | null): Promise<Result<SuscripcionSummary>> {
    const row = await this.findByEmpresaId(empresaId);
    if (!row) return fail('SUBSCRIPTION_NOT_FOUND');
    const prev = String(row.getDataValue('notas') ?? '');
    const line = note?.trim() ? `Cancelada: ${note.trim()}` : 'Cancelada por plataforma';
    await row.update({
      estado: 'CANCELADA',
      notas: prev ? `${prev}\n${line}` : line,
    });
    return ok(this.toSummary(row));
  }

  /** Job batch: marca VENCIDA según `vence_en` / `grace_hasta` (mismo criterio que login). */
  async confirmSubscriptionPayment(
    empresaId: string,
    input: { provider: string; reference: string; extendDays?: number }
  ): Promise<Result<SuscripcionSummary>> {
    const provider = input.provider?.trim();
    const reference = input.reference?.trim();
    if (!provider || !reference) {
      return fail('VALIDATION_ERROR: provider and reference are required');
    }

    const row = await this.findByEmpresaId(empresaId);
    if (!row) return fail('SUBSCRIPTION_NOT_FOUND');

    const estado = String(row.getDataValue('estado') ?? '') as SuscripcionEstado;
    if (estado === 'CANCELADA') {
      return fail('SUBSCRIPTION_CANCELLED');
    }

    const days = Number.isFinite(input.extendDays) && input.extendDays! > 0 ? input.extendDays! : 30;
    const now = new Date();
    const vence = addDays(now, days);
    const prevNotes = String(row.getDataValue('notas') ?? '').trim();
    const line = `Pago ${provider} ref ${reference} (${now.toISOString().slice(0, 10)})`;
    const notas = prevNotes ? `${prevNotes}\n${line}` : line;

    await row.update({
      estado: 'ACTIVA',
      venceEn: vence,
      proximoCobroEn: vence,
      graceHasta: null,
      externalSubscriptionId: reference,
      notas,
    });

    await Empresa.update(
      { estado: 'ACTIVO' },
      { where: { id: empresaId, estado: { [Op.in]: ['SUSPENDIDO'] } } }
    );

    return ok(this.toSummary(row));
  }

  async refreshAllExpired(): Promise<
    Result<{
      scanned: number;
      enteredGrace: number;
      markedVencida: number;
      suspendedEmpresas: number;
    }>
  > {
    return this.processBillingLifecycle();
  }

  /** Job diario: gracia automática → VENCIDA → suspende empresa. */
  async processBillingLifecycle(): Promise<
    Result<{
      scanned: number;
      enteredGrace: number;
      markedVencida: number;
      suspendedEmpresas: number;
    }>
  > {
    const now = new Date();
    const candidates = await EmpresaSuscripcion.findAll({
      where: {
        venceEn: { [Op.lt]: now },
        estado: { [Op.in]: ['ACTIVA', 'PILOTO', 'GRACIA'] as SuscripcionEstado[] },
      },
      limit: 200,
    });

    let enteredGrace = 0;
    let markedVencida = 0;
    let suspendedEmpresas = 0;

    for (const row of candidates) {
      const transition = await this.applyExpiryTransition(row, { notify: true });
      if (transition === 'grace') enteredGrace += 1;
      if (transition === 'vencida') {
        markedVencida += 1;
        const empresaId = String(row.getDataValue('empresaId') ?? '');
        if (await this.suspendEmpresaIfNeeded(empresaId)) {
          suspendedEmpresas += 1;
        }
      }
    }

    return ok({
      scanned: candidates.length,
      enteredGrace,
      markedVencida,
      suspendedEmpresas,
    });
  }
}

export default new SuscripcionDelegate();
