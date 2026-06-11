import { v4 as uuidv4 } from 'uuid';
import { UniqueConstraintError } from 'sequelize';
import sequelize from '../../../config/database';
import Empresa, { EmpresaEstado, EmpresaEstadoTributario } from '../models/Empresa.model';
import SaasPlan from '../../saas/models/SaasPlan.model';
import saasPlanDelegate from '../../saas/delegates/SaasPlanDelegate';
import suscripcionDelegate, { SuscripcionSummary } from '../../saas/delegates/SuscripcionDelegate';
import type { SuscripcionOrigen } from '../../saas/models/EmpresaSuscripcion.model';
import type { CheckoutSummary } from '../../saas/types/checkout';
import type { SuscripcionEstado } from '../../saas/models/EmpresaSuscripcion.model';
import EmpresaSuscripcion from '../../saas/models/EmpresaSuscripcion.model';
import type { SaasPlanFeatures } from '../../saas/constants/planCodes';
import Branch from '../../branch/models/Branch.model';
import Role from '../../auth/models/Role.model';
import User from '../../auth/models/User.model';
import { parseRut } from '../../../utils/rutChile';
import { allocateInformalRutPlaceholder, isInformalRutNumero } from '../../../utils/informalRut';
import {
  type FormalizacionProgreso,
  formalizacionProgressPercent,
  isEmpresaFormal,
  parseFormalizacionProgreso,
  planRequiresFormal,
} from '../utils/tributarioStatus';
import { slugify, uniqueSlug } from '../../../utils/slug';
import { readModelString } from '../../../utils/modelAttributes';
import { isValidEmail } from '../../../utils/empresaAccess';
import { decryptField, encryptField } from '../../../utils/cryptoField';
import { Result, ok, fail } from '../../../types/result';
import type { SaasPlanCodigo } from '../../saas/constants/planCodes';
import { getPlanDescription, getPlanDisplayName } from '../../saas/utils/planDisplay';
import * as argon2 from 'argon2';
import activationNotificationDelegate from '../../notifications/delegates/ActivationNotificationDelegate';

export interface EmpresaPlanSummary {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  valor: number;
  metodoPago: string;
  activo: boolean;
  maxSucursales: number;
  maxUsuarios: number;
  features: SaasPlanFeatures;
}

export interface EmpresaRecord {
  id: string;
  rutEmpresa: string;
  rutNumero: number;
  rutDv: string;
  razonSocial: string;
  nombreFantasia: string | null;
  giroSii: string | null;
  direccionComercial: string | null;
  correoFacturacion: string | null;
  urlLogo: string | null;
  slug: string;
  estado: EmpresaEstado;
  estadoTributario: EmpresaEstadoTributario;
  rubroNegocio: string | null;
  telefonoNegocio: string | null;
  formalizacionProgreso: FormalizacionProgreso;
  formalizacionPorcentaje: number;
  esNegocioEnMarcha: boolean;
  planId: string;
  plan: EmpresaPlanSummary;
  assistantAdminPhone: string | null;
  transferBankName: string | null;
  transferAccountType: string | null;
  transferAccount: string | null;
  transferHolderName: string | null;
  transferRut: string | null;
  suscripcion: SuscripcionSummary | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateEmpresaInput {
  modoRegistro?: 'FORMAL' | 'INFORMAL';
  rut?: string;
  razonSocial: string;
  rubroNegocio?: string;
  telefonoNegocio?: string;
  nombreFantasia?: string;
  giroSii?: string;
  direccionComercial?: string;
  correoFacturacion?: string;
  urlLogo?: string;
  slug?: string;
  estado?: EmpresaEstado;
  branchName?: string;
  /** Si se envían, crea admin inicial y deja empresa en ACTIVO. */
  adminEmail?: string;
  adminPassword?: string;
  adminFullName?: string;
  planId?: string;
  planCodigo?: string;
  /** Origen de la fila en `empresa_suscripciones` (ej. registro web). */
  suscripcionOrigen?: SuscripcionOrigen;
}

/** Campos editables por ADMIN del tenant (sin lifecycle). */
export interface UpdateEmpresaTenantInput {
  razonSocial?: string;
  nombreFantasia?: string | null;
  giroSii?: string | null;
  direccionComercial?: string | null;
  correoFacturacion?: string | null;
  urlLogo?: string | null;
  slug?: string;
  /** Perfil bancario para transferencias WSP (validación IA). */
  transferBankName?: string | null;
  transferAccountType?: string | null;
  transferAccount?: string | null;
  transferHolderName?: string | null;
  transferRut?: string | null;
}

/** Solo plataforma / onboarding interno (x-internal-key). */
export interface UpdateEmpresaPlatformInput extends UpdateEmpresaTenantInput {
  estado?: EmpresaEstado;
  planId?: string;
  planCodigo?: string;
  assistantAdminPhone?: string | null;
}

function normalizePhoneDigits(raw: string): string {
  return raw.replace(/\D/g, '').replace(/^0+/, '');
}

const ARGON2_OPTIONS: argon2.Options & { raw?: false } = {
  type: argon2.argon2id,
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 4,
};

const EMPRESA_PLAN_INCLUDE = [{ model: SaasPlan, as: 'plan', required: true }];

class EmpresaDelegate {
  private readonly sensitiveTransferKeys = new Set([
    'transferBankName',
    'transferAccountType',
    'transferAccount',
    'transferHolderName',
    'transferRut',
  ]);

  private decryptSensitiveMaybe(key: string, value: string | null): string | null {
    if (!value) return null;
    if (!this.sensitiveTransferKeys.has(key)) return value;
    return decryptField(value);
  }

  private planFromModel(plan: SaasPlan): EmpresaPlanSummary {
    const plain =
      typeof plan.toJSON === 'function'
        ? (plan.toJSON() as Record<string, unknown>)
        : (plan as unknown as Record<string, unknown>);
    const featuresRaw = plain.features;
    const features =
      featuresRaw && typeof featuresRaw === 'object'
        ? (featuresRaw as SaasPlanFeatures)
        : {
            modulosCore: true,
            assistantWhatsapp: false,
            assistantVoz: false,
            pagosOnline: false,
          };
    const valorRaw =
      plain.valor ?? plain.precioReferenciaClp ?? plain.precio_referencia_clp ?? 0;

    const codigo = String(plain.codigo ?? '') as SaasPlanCodigo;

    return {
      id: String(plain.id ?? plan.id ?? ''),
      codigo,
      nombre: getPlanDisplayName(codigo, String(plain.nombre ?? '')),
      descripcion: getPlanDescription(codigo, (plain.descripcion as string | null | undefined) ?? null),
      valor: Number(valorRaw),
      metodoPago: String(plain.metodoPago ?? plain.metodo_pago ?? 'TRANSFERENCIA'),
      activo: plain.isActive === true || plain.is_active === 1 || plain.is_active === true,
      maxSucursales: Number(plain.maxSucursales ?? plain.max_sucursales ?? 1),
      maxUsuarios: Number(plain.maxUsuarios ?? plain.max_usuarios ?? 5),
      features,
    };
  }

  private toRecord(row: Empresa, suscripcion?: SuscripcionSummary | null): EmpresaRecord {
    const plain =
      typeof row.toJSON === 'function'
        ? (row.toJSON() as Record<string, unknown>)
        : (row as unknown as Record<string, unknown>);

    return {
      id: String(plain.id ?? row.id ?? ''),
      rutEmpresa: String(readModelString(row, 'rutEmpresa') ?? plain.rutEmpresa ?? ''),
      rutNumero: Number(readModelString(row, 'rutNumero') ?? plain.rutNumero ?? 0),
      rutDv: String(readModelString(row, 'rutDv') ?? plain.rutDv ?? ''),
      razonSocial: String(plain.razonSocial ?? row.razonSocial ?? ''),
      nombreFantasia: (plain.nombreFantasia as string | null | undefined) ?? null,
      giroSii: (plain.giroSii as string | null | undefined) ?? null,
      direccionComercial: (plain.direccionComercial as string | null | undefined) ?? null,
      correoFacturacion: (plain.correoFacturacion as string | null | undefined) ?? null,
      urlLogo: (plain.urlLogo as string | null | undefined) ?? null,
      slug: String(plain.slug ?? row.slug ?? ''),
      estado: String(plain.estado ?? row.estado ?? 'PENDIENTE_ONBOARDING') as EmpresaEstado,
      estadoTributario: String(
        plain.estadoTributario ?? plain.estado_tributario ?? 'FORMAL'
      ).toUpperCase() as EmpresaEstadoTributario,
      rubroNegocio: (plain.rubroNegocio as string | null | undefined) ?? null,
      telefonoNegocio: (plain.telefonoNegocio as string | null | undefined) ?? null,
      formalizacionProgreso: parseFormalizacionProgreso(
        plain.formalizacionProgreso ?? plain.formalizacion_progreso
      ),
      formalizacionPorcentaje: formalizacionProgressPercent(
        parseFormalizacionProgreso(plain.formalizacionProgreso ?? plain.formalizacion_progreso)
      ),
      esNegocioEnMarcha: !isEmpresaFormal(
        String(plain.estadoTributario ?? plain.estado_tributario ?? 'FORMAL')
      ),
      planId: String(plain.planId ?? plain.plan_id ?? row.planId ?? ''),
      plan: this.planFromModel((row.get('plan') as SaasPlan) ?? ({} as SaasPlan)),
      assistantAdminPhone: (plain.assistantAdminPhone as string | null | undefined) ??
        (plain.assistant_admin_phone as string | null | undefined) ??
        null,
      transferBankName: this.decryptSensitiveMaybe(
        'transferBankName',
        ((plain.transferBankName as string | null | undefined) ??
          (plain.transfer_bank_name as string | null | undefined) ??
          null) as string | null
      ),
      transferAccountType: this.decryptSensitiveMaybe(
        'transferAccountType',
        ((plain.transferAccountType as string | null | undefined) ??
          (plain.transfer_account_type as string | null | undefined) ??
          null) as string | null
      ),
      transferAccount: this.decryptSensitiveMaybe(
        'transferAccount',
        ((plain.transferAccount as string | null | undefined) ??
          (plain.transfer_account as string | null | undefined) ??
          null) as string | null
      ),
      transferHolderName: this.decryptSensitiveMaybe(
        'transferHolderName',
        ((plain.transferHolderName as string | null | undefined) ??
          (plain.transfer_holder_name as string | null | undefined) ??
          null) as string | null
      ),
      transferRut: this.decryptSensitiveMaybe(
        'transferRut',
        ((plain.transferRut as string | null | undefined) ??
          (plain.transfer_rut as string | null | undefined) ??
          null) as string | null
      ),
      suscripcion: suscripcion ?? null,
      createdAt: plain.createdAt as Date,
      updatedAt: plain.updatedAt as Date,
    };
  }

  private async reloadWithPlan(row: Empresa): Promise<Empresa> {
    await row.reload({ include: EMPRESA_PLAN_INCLUDE });
    return row;
  }

  private async loadSuscripcion(empresaId: string): Promise<SuscripcionSummary | null> {
    const row = await suscripcionDelegate.findByEmpresaId(empresaId);
    return row ? suscripcionDelegate.toSummary(row) : null;
  }

  async findById(id: string, scopedEmpresaId?: string): Promise<Result<EmpresaRecord>> {
    if (scopedEmpresaId && id !== scopedEmpresaId) {
      return fail('EMPRESA_ACCESS_DENIED');
    }

    const row = await Empresa.findByPk(id, { include: EMPRESA_PLAN_INCLUDE });
    if (!row) return fail('EMPRESA_NOT_FOUND');
    const sub = await this.loadSuscripcion(id);
    return ok(this.toRecord(row, sub));
  }

  async listForTenant(empresaId: string): Promise<Result<EmpresaRecord[]>> {
    const row = await Empresa.findByPk(empresaId, { include: EMPRESA_PLAN_INCLUDE });
    if (!row) return fail('EMPRESA_NOT_FOUND');
    const sub = await this.loadSuscripcion(empresaId);
    return ok([this.toRecord(row, sub)]);
  }

  /** Listado global — solo plataforma (x-internal-key). */
  async listForPlatform(): Promise<Result<EmpresaRecord[]>> {
    const rows = await Empresa.findAll({
      include: EMPRESA_PLAN_INCLUDE,
      order: [['createdAt', 'DESC']],
    });
    const subs = await EmpresaSuscripcion.findAll();
    const subByEmpresa = new Map(
      subs.map((s) => [String(s.getDataValue('empresaId') ?? ''), suscripcionDelegate.toSummary(s)])
    );
    return ok(
      rows.map((row) =>
        this.toRecord(row, subByEmpresa.get(String(row.getDataValue('id') ?? '')) ?? null)
      )
    );
  }

  async create(
    input: CreateEmpresaInput
  ): Promise<Result<{ empresa: EmpresaRecord; branch?: Branch; adminUserId?: string }>> {
    const modoInformal = input.modoRegistro === 'INFORMAL';
    let rut: Awaited<ReturnType<typeof parseRut>>;
    let estadoTributario: EmpresaEstadoTributario = 'FORMAL';

    if (modoInformal) {
      try {
        rut = await allocateInformalRutPlaceholder();
      } catch {
        return fail('INFORMAL_RUT_ALLOCATION_FAILED');
      }
      estadoTributario = 'INFORMAL';
      input.planCodigo = 'BASICO';
      input.planId = undefined;
    } else {
      rut = parseRut(input.rut ?? '');
      if (!rut) return fail('VALIDATION_ERROR: invalid RUT');
    }

    const razonSocial = input.razonSocial?.trim();
    if (!razonSocial) return fail('VALIDATION_ERROR: razonSocial is required');

    const correo = input.correoFacturacion?.trim();
    if (correo && !isValidEmail(correo)) {
      return fail('VALIDATION_ERROR: invalid correoFacturacion');
    }

    const adminEmail = input.adminEmail?.trim().toLowerCase();
    const adminPassword = input.adminPassword?.trim();
    const adminFullName = input.adminFullName?.trim() || 'Administrador';
    const wantsAdmin = Boolean(adminEmail || adminPassword);
    if (wantsAdmin) {
      if (!adminEmail || !adminPassword) {
        return fail('VALIDATION_ERROR: adminEmail and adminPassword are required together');
      }
      if (adminPassword.length < 8) {
        return fail('VALIDATION_ERROR: adminPassword must be at least 8 characters');
      }
      if (!isValidEmail(adminEmail)) {
        return fail('VALIDATION_ERROR: invalid adminEmail');
      }
    }

    const nombreFantasia = input.nombreFantasia?.trim() || null;
    const slugBase = input.slug?.trim() || nombreFantasia || razonSocial;
    const slugCandidate = slugify(slugBase);
    if (!slugCandidate) return fail('VALIDATION_ERROR: slug could not be generated');

    if (!modoInformal) {
      const existingRut = await Empresa.findOne({
        where: { rutNumero: rut.rutNumero, rutDv: rut.rutDv },
      });
      if (existingRut) return fail('RUT_ALREADY_REGISTERED');
    }

    const initialEstado: EmpresaEstado = wantsAdmin
      ? 'ACTIVO'
      : (input.estado ?? 'PENDIENTE_ONBOARDING');

    const planResolved = await saasPlanDelegate.resolvePlanId({
      planId: input.planId,
      planCodigo: input.planCodigo,
    });
    if (!planResolved.success) return planResolved;

    const transaction = await sequelize.transaction();
    try {
      const slug = await uniqueSlug(slugCandidate, async (candidate) => {
        const found = await Empresa.findOne({ where: { slug: candidate }, transaction });
        return Boolean(found);
      });

      const empresa = await Empresa.create(
        {
          id: uuidv4(),
          rutEmpresa: rut.rutEmpresa,
          rutNumero: rut.rutNumero,
          rutDv: rut.rutDv,
          razonSocial,
          nombreFantasia,
          giroSii: input.giroSii?.trim() || null,
          direccionComercial: input.direccionComercial?.trim() || null,
          correoFacturacion: correo || null,
          urlLogo: input.urlLogo?.trim() || null,
          slug,
          estado: initialEstado,
          estadoTributario,
          rubroNegocio: input.rubroNegocio?.trim() || null,
          telefonoNegocio: input.telefonoNegocio?.trim() || null,
          formalizacionProgreso: modoInformal
            ? { diagnostico: null, pasos: { sii: false, municipalidad: false, cuentaBancaria: false, capturaRut: false } }
            : null,
          planId: planResolved.value,
        },
        { transaction }
      );

      const empresaId = String(empresa.getDataValue('id') ?? empresa.id);

      let branch: Branch | undefined;
      const branchName = input.branchName?.trim() || 'Sucursal Central';
      if (branchName) {
        branch = await Branch.create(
          {
            id: uuidv4(),
            empresaId,
            name: branchName,
            address: input.direccionComercial?.trim() || 'Por definir',
            isActive: true,
          },
          { transaction }
        );
      }

      let adminUserId: string | undefined;
      if (wantsAdmin && branch) {
        const adminRole = await Role.findOne({ where: { name: 'ADMIN' }, transaction });
        if (!adminRole) {
          await transaction.rollback();
          return fail('ROLE_NOT_FOUND: ADMIN role missing');
        }

        const takenGlobal = await User.findOne({
          where: { email: adminEmail! },
          transaction,
        });
        if (takenGlobal) {
          await transaction.rollback();
          return fail('EMAIL_TAKEN: admin email already registered');
        }

        const passwordHash = await argon2.hash(adminPassword!, ARGON2_OPTIONS);
        const branchId = String(branch.getDataValue('id') ?? branch.id);
        adminUserId = uuidv4();
        await User.create(
          {
            id: adminUserId,
            fullName: adminFullName,
            email: adminEmail!,
            password: passwordHash,
            roleId: String(adminRole.getDataValue('id') ?? adminRole.id),
            empresaId,
            branchId,
            isActive: true,
          },
          { transaction }
        );
      }

      await transaction.commit();
      await this.reloadWithPlan(empresa);
      await suscripcionDelegate.ensureForEmpresa(empresaId, planResolved.value, {
        estado: initialEstado === 'ACTIVO' ? 'PILOTO' : 'VENCIDA',
        origen: input.suscripcionOrigen ?? 'PLATAFORMA',
        diasVigencia: wantsAdmin ? 90 : 30,
      });
      const sub = await this.loadSuscripcion(empresaId);
      return ok({ empresa: this.toRecord(empresa, sub), branch, adminUserId });
    } catch (error) {
      await transaction.rollback();
      if (error instanceof UniqueConstraintError) {
        return fail('EMPRESA_DUPLICATE: slug or RUT already exists');
      }
      throw error;
    }
  }

  private readRowString(row: Empresa, key: string): string | null {
    const raw = row.getDataValue(key);
    if (raw == null || raw === '') return null;
    const current = String(raw).trim() || null;
    return this.decryptSensitiveMaybe(key, current);
  }

  private async applyPatch(
    row: Empresa,
    input: UpdateEmpresaTenantInput | UpdateEmpresaPlatformInput,
    allowEstado: boolean
  ): Promise<Result<EmpresaRecord>> {
    const patch: Record<string, unknown> = {};
    const normOptional = (v: string | null | undefined): string | null =>
      v == null ? null : v.trim() || null;

    if (input.razonSocial !== undefined) {
      const value = input.razonSocial.trim();
      if (!value) return fail('VALIDATION_ERROR: razonSocial cannot be empty');
      patch.razonSocial = value;
    }
    if (input.nombreFantasia !== undefined) patch.nombreFantasia = input.nombreFantasia?.trim() || null;
    if (input.giroSii !== undefined) patch.giroSii = input.giroSii?.trim() || null;
    if (input.direccionComercial !== undefined) {
      patch.direccionComercial = input.direccionComercial?.trim() || null;
    }
    if (input.correoFacturacion !== undefined) {
      const correo = input.correoFacturacion?.trim() || null;
      if (correo && !isValidEmail(correo)) {
        return fail('VALIDATION_ERROR: invalid correoFacturacion');
      }
      patch.correoFacturacion = correo;
    }
    if (input.urlLogo !== undefined) patch.urlLogo = input.urlLogo?.trim() || null;

    if (allowEstado && 'estado' in input && input.estado !== undefined) {
      patch.estado = input.estado;
    }

    if (allowEstado && ('planId' in input || 'planCodigo' in input)) {
      const platformInput = input as UpdateEmpresaPlatformInput;
      if (platformInput.planId !== undefined || platformInput.planCodigo !== undefined) {
        const planResolved = await saasPlanDelegate.resolvePlanId({
          planId: platformInput.planId,
          planCodigo: platformInput.planCodigo,
        });
        if (!planResolved.success) return planResolved;

        const targetPlan = await SaasPlan.findByPk(planResolved.value);
        const targetCodigo = String(targetPlan?.getDataValue('codigo') ?? '');
        const estadoTrib = String(row.getDataValue('estadoTributario') ?? 'FORMAL');
        if (!isEmpresaFormal(estadoTrib) && planRequiresFormal(targetCodigo)) {
          return fail(
            'TRIBUTARIO_FORMAL_REQUIRED: formaliza tu negocio (RUT) antes de plan Estándar o Full'
          );
        }

        patch.planId = planResolved.value;
      }
    }

    if (allowEstado && 'assistantAdminPhone' in input) {
      const phone = (input as UpdateEmpresaPlatformInput).assistantAdminPhone;
      const next =
        phone !== undefined && phone !== null && phone !== ''
          ? normalizePhoneDigits(String(phone))
          : null;
      const cur = this.readRowString(row, 'assistantAdminPhone');
      if (next !== cur) patch.assistantAdminPhone = next;
    }
    if ('transferBankName' in input) {
      const next = normOptional(input.transferBankName);
      if (next !== this.readRowString(row, 'transferBankName')) patch.transferBankName = encryptField(next);
    }
    if ('transferAccountType' in input) {
      const next = normOptional(input.transferAccountType);
      if (next !== this.readRowString(row, 'transferAccountType')) {
        patch.transferAccountType = encryptField(next);
      }
    }
    if ('transferAccount' in input) {
      const next = normOptional(input.transferAccount);
      if (next !== this.readRowString(row, 'transferAccount')) patch.transferAccount = encryptField(next);
    }
    if ('transferHolderName' in input) {
      const next = normOptional(input.transferHolderName);
      if (next !== this.readRowString(row, 'transferHolderName')) {
        patch.transferHolderName = encryptField(next);
      }
    }
    if ('transferRut' in input) {
      const next = normOptional(input.transferRut);
      if (next !== this.readRowString(row, 'transferRut')) patch.transferRut = encryptField(next);
    }

    if (input.slug !== undefined) {
      const slug = slugify(input.slug);
      if (!slug) return fail('VALIDATION_ERROR: invalid slug');
      const taken = await Empresa.findOne({ where: { slug } });
      if (taken && String(taken.id) !== String(row.id)) return fail('SLUG_ALREADY_TAKEN');
      patch.slug = slug;
    }

    if (Object.keys(patch).length === 0) {
      if (allowEstado) {
        const sub = await this.loadSuscripcion(String(row.getDataValue('id') ?? ''));
        return ok(this.toRecord(row, sub));
      }
      return fail('VALIDATION_ERROR: no fields to update');
    }

    const planChanged = typeof patch.planId === 'string';

    try {
      await row.update(patch);
      await this.reloadWithPlan(row);
      if (planChanged) {
        await suscripcionDelegate.syncPlanChange(String(row.getDataValue('id') ?? ''), String(patch.planId));
      }
      const sub = await this.loadSuscripcion(String(row.getDataValue('id') ?? ''));
      return ok(this.toRecord(row, sub));
    } catch (error) {
      if (error instanceof UniqueConstraintError) {
        return fail('EMPRESA_DUPLICATE: slug already exists');
      }
      throw error;
    }
  }

  async updateForTenant(
    id: string,
    scopedEmpresaId: string,
    input: UpdateEmpresaTenantInput
  ): Promise<Result<EmpresaRecord>> {
    if (id !== scopedEmpresaId) return fail('EMPRESA_ACCESS_DENIED');

    const row = await Empresa.findByPk(id, { include: EMPRESA_PLAN_INCLUDE });
    if (!row) return fail('EMPRESA_NOT_FOUND');

    return this.applyPatch(row, input, false);
  }

  async updatePlatform(id: string, input: UpdateEmpresaPlatformInput): Promise<Result<EmpresaRecord>> {
    const row = await Empresa.findByPk(id, { include: EMPRESA_PLAN_INCLUDE });
    if (!row) return fail('EMPRESA_NOT_FOUND');
    return this.applyPatch(row, input, true);
  }

  async suspendPlatform(id: string): Promise<Result<EmpresaRecord>> {
    const row = await Empresa.findByPk(id, { include: EMPRESA_PLAN_INCLUDE });
    if (!row) return fail('EMPRESA_NOT_FOUND');
    await row.update({ estado: 'SUSPENDIDO' });
    await this.reloadWithPlan(row);
    const sub = await this.loadSuscripcion(id);
    return ok(this.toRecord(row, sub));
  }

  async activatePlatform(id: string): Promise<Result<EmpresaRecord>> {
    const row = await Empresa.findByPk(id, { include: EMPRESA_PLAN_INCLUDE });
    if (!row) return fail('EMPRESA_NOT_FOUND');
    await row.update({ estado: 'ACTIVO' });
    await suscripcionDelegate.extendVigencia(id, 30);
    await this.reloadWithPlan(row);
    const sub = await this.loadSuscripcion(id);
    return ok(this.toRecord(row, sub));
  }

  async patchSuscripcionPlatform(
    empresaId: string,
    input: { extendDays?: number; graceDays?: number; cancel?: boolean; note?: string }
  ): Promise<Result<SuscripcionSummary>> {
    if (input.cancel) {
      return suscripcionDelegate.cancel(empresaId, input.note ?? null);
    }
    if (input.graceDays != null) {
      return suscripcionDelegate.setGracePeriod(empresaId, input.graceDays);
    }
    if (input.extendDays != null) {
      return suscripcionDelegate.extendVigencia(empresaId, input.extendDays);
    }
    return fail('VALIDATION_ERROR: extendDays, graceDays or cancel required');
  }

  async getCheckoutSummary(empresaId: string): Promise<Result<CheckoutSummary>> {
    const row = await Empresa.findByPk(empresaId, { include: EMPRESA_PLAN_INCLUDE });
    if (!row) return fail('EMPRESA_NOT_FOUND');

    const sub = await suscripcionDelegate.findByEmpresaId(empresaId);
    const estado = String(sub?.getDataValue('estado') ?? 'PILOTO') as SuscripcionEstado;
    const canPay = estado === 'PILOTO' || estado === 'GRACIA' || estado === 'VENCIDA';

    const plan = row.get('plan') as SaasPlan | undefined;
    const planSummary = plan ? this.planFromModel(plan) : null;
    const neto = planSummary?.valor ?? 0;
    const iva = Math.round(neto * 0.19);
    const total = neto + iva;

    return ok({
      empresaId,
      razonSocial: String(row.getDataValue('razonSocial') ?? ''),
      planCodigo: planSummary?.codigo ?? 'BASICO',
      planNombre: planSummary?.nombre ?? 'Plan',
      netoClp: neto,
      ivaClp: iva,
      totalClp: total,
      suscripcionEstado: estado,
      canPay,
    });
  }

  async updateFormalizacionProgreso(
    id: string,
    scopedEmpresaId: string,
    input: FormalizacionProgreso & { estadoTributario?: 'EN_TRAMITE' }
  ): Promise<Result<EmpresaRecord>> {
    if (id !== scopedEmpresaId) return fail('EMPRESA_ACCESS_DENIED');

    const row = await Empresa.findByPk(id, { include: EMPRESA_PLAN_INCLUDE });
    if (!row) return fail('EMPRESA_NOT_FOUND');

    const currentTrib = String(row.getDataValue('estadoTributario') ?? 'FORMAL');
    if (isEmpresaFormal(currentTrib)) {
      return fail('VALIDATION_ERROR: empresa already formal');
    }

    const merged = parseFormalizacionProgreso(row.getDataValue('formalizacionProgreso'));
    const next: FormalizacionProgreso = {
      diagnostico: input.diagnostico ?? merged.diagnostico ?? null,
      pasos: {
        ...merged.pasos,
        ...input.pasos,
      },
    };

    const patch: Record<string, unknown> = {
      formalizacionProgreso: next,
    };

    if (input.estadoTributario === 'EN_TRAMITE' && currentTrib === 'INFORMAL') {
      patch.estadoTributario = 'EN_TRAMITE';
    }

    await row.update(patch);
    await this.reloadWithPlan(row);
    const sub = await this.loadSuscripcion(id);
    return ok(this.toRecord(row, sub));
  }

  async formalizarEmpresa(
    id: string,
    scopedEmpresaId: string,
    input: { rut: string; razonSocial?: string; giroSii?: string | null }
  ): Promise<Result<EmpresaRecord>> {
    if (id !== scopedEmpresaId) return fail('EMPRESA_ACCESS_DENIED');

    const row = await Empresa.findByPk(id, { include: EMPRESA_PLAN_INCLUDE });
    if (!row) return fail('EMPRESA_NOT_FOUND');

    const currentTrib = String(row.getDataValue('estadoTributario') ?? 'FORMAL');
    if (isEmpresaFormal(currentTrib)) {
      return fail('VALIDATION_ERROR: empresa already formal');
    }

    const rut = parseRut(input.rut);
    if (!rut) return fail('VALIDATION_ERROR: invalid RUT');
    if (isInformalRutNumero(rut.rutNumero)) {
      return fail('VALIDATION_ERROR: invalid RUT');
    }

    const existingRut = await Empresa.findOne({
      where: { rutNumero: rut.rutNumero, rutDv: rut.rutDv },
    });
    if (existingRut && String(existingRut.id) !== String(row.id)) {
      return fail('RUT_ALREADY_REGISTERED');
    }

    const razonSocial = input.razonSocial?.trim() || String(row.getDataValue('razonSocial') ?? '');
    if (!razonSocial) return fail('VALIDATION_ERROR: razonSocial is required');

    const prevProgress = parseFormalizacionProgreso(row.getDataValue('formalizacionProgreso'));

    await row.update({
      rutEmpresa: rut.rutEmpresa,
      rutNumero: rut.rutNumero,
      rutDv: rut.rutDv,
      razonSocial,
      giroSii: input.giroSii?.trim() || row.getDataValue('giroSii'),
      estadoTributario: 'FORMAL',
      formalizacionProgreso: {
        ...prevProgress,
        pasos: { ...prevProgress.pasos, capturaRut: true },
      },
    });

    await this.reloadWithPlan(row);
    const sub = await this.loadSuscripcion(id);
    return ok(this.toRecord(row, sub));
  }

  async confirmCheckoutPayment(
    empresaId: string,
    input: { provider: string; reference: string; extendDays?: number }
  ): Promise<Result<{ suscripcion: SuscripcionSummary; empresa: EmpresaRecord }>> {
    const summary = await this.getCheckoutSummary(empresaId);
    if (!summary.success) return summary;
    if (!summary.value.canPay) {
      return fail('SUBSCRIPTION_ALREADY_ACTIVE');
    }

    const paid = await suscripcionDelegate.confirmSubscriptionPayment(empresaId, input);
    if (!paid.success) return paid;

    const empresa = await this.findById(empresaId);
    if (!empresa.success) return empresa;

    void activationNotificationDelegate
      .notifySubscriptionActivated({
        empresa: empresa.value,
        suscripcion: paid.value,
        paymentRef: input.reference,
        provider: input.provider,
      })
      .catch((err: unknown) => {
        console.warn('[EMAIL] notifySubscriptionActivated error:', err);
      });

    return ok({ suscripcion: paid.value, empresa: empresa.value });
  }
}

export default new EmpresaDelegate();
