import { v4 as uuidv4 } from 'uuid';
import { UniqueConstraintError } from 'sequelize';
import sequelize from '../../../config/database';
import Empresa, { EmpresaEstado } from '../models/Empresa.model';
import Branch from '../../branch/models/Branch.model';
import Role from '../../auth/models/Role.model';
import User from '../../auth/models/User.model';
import { parseRut } from '../../../utils/rutChile';
import { slugify, uniqueSlug } from '../../../utils/slug';
import { readModelString } from '../../../utils/modelAttributes';
import { isValidEmail } from '../../../utils/empresaAccess';
import { Result, ok, fail } from '../../../types/result';
import * as argon2 from 'argon2';

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
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateEmpresaInput {
  rut: string;
  razonSocial: string;
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
}

/** Solo plataforma / onboarding interno (x-internal-key). */
export interface UpdateEmpresaPlatformInput extends UpdateEmpresaTenantInput {
  estado?: EmpresaEstado;
}

const ARGON2_OPTIONS: argon2.Options & { raw?: false } = {
  type: argon2.argon2id,
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 4,
};

class EmpresaDelegate {
  private toRecord(row: Empresa): EmpresaRecord {
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
      createdAt: plain.createdAt as Date,
      updatedAt: plain.updatedAt as Date,
    };
  }

  async findById(id: string, scopedEmpresaId?: string): Promise<Result<EmpresaRecord>> {
    if (scopedEmpresaId && id !== scopedEmpresaId) {
      return fail('EMPRESA_ACCESS_DENIED');
    }

    const row = await Empresa.findByPk(id);
    if (!row) return fail('EMPRESA_NOT_FOUND');
    return ok(this.toRecord(row));
  }

  async listForTenant(empresaId: string): Promise<Result<EmpresaRecord[]>> {
    const row = await Empresa.findByPk(empresaId);
    if (!row) return fail('EMPRESA_NOT_FOUND');
    return ok([this.toRecord(row)]);
  }

  /** Listado global — solo plataforma (x-internal-key). */
  async listForPlatform(): Promise<Result<EmpresaRecord[]>> {
    const rows = await Empresa.findAll({ order: [['createdAt', 'DESC']] });
    return ok(rows.map((row) => this.toRecord(row)));
  }

  async create(
    input: CreateEmpresaInput
  ): Promise<Result<{ empresa: EmpresaRecord; branch?: Branch; adminUserId?: string }>> {
    const rut = parseRut(input.rut);
    if (!rut) return fail('VALIDATION_ERROR: invalid RUT');

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

    const existingRut = await Empresa.findOne({
      where: { rutNumero: rut.rutNumero, rutDv: rut.rutDv },
    });
    if (existingRut) return fail('RUT_ALREADY_REGISTERED');

    const initialEstado: EmpresaEstado = wantsAdmin
      ? 'ACTIVO'
      : (input.estado ?? 'PENDIENTE_ONBOARDING');

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

        const taken = await User.findOne({
          where: { email: adminEmail!, empresaId },
          transaction,
        });
        if (taken) {
          await transaction.rollback();
          return fail('EMAIL_TAKEN: admin email already registered in this empresa');
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
      return ok({ empresa: this.toRecord(empresa), branch, adminUserId });
    } catch (error) {
      await transaction.rollback();
      if (error instanceof UniqueConstraintError) {
        return fail('EMPRESA_DUPLICATE: slug or RUT already exists');
      }
      throw error;
    }
  }

  private async applyPatch(
    row: Empresa,
    input: UpdateEmpresaTenantInput | UpdateEmpresaPlatformInput,
    allowEstado: boolean
  ): Promise<Result<EmpresaRecord>> {
    const patch: Record<string, unknown> = {};

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

    if (input.slug !== undefined) {
      const slug = slugify(input.slug);
      if (!slug) return fail('VALIDATION_ERROR: invalid slug');
      const taken = await Empresa.findOne({ where: { slug } });
      if (taken && String(taken.id) !== String(row.id)) return fail('SLUG_ALREADY_TAKEN');
      patch.slug = slug;
    }

    if (Object.keys(patch).length === 0) {
      return fail('VALIDATION_ERROR: no fields to update');
    }

    try {
      await row.update(patch);
      await row.reload();
      return ok(this.toRecord(row));
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

    const row = await Empresa.findByPk(id);
    if (!row) return fail('EMPRESA_NOT_FOUND');

    return this.applyPatch(row, input, false);
  }

  async updatePlatform(id: string, input: UpdateEmpresaPlatformInput): Promise<Result<EmpresaRecord>> {
    const row = await Empresa.findByPk(id);
    if (!row) return fail('EMPRESA_NOT_FOUND');
    return this.applyPatch(row, input, true);
  }

  async suspendPlatform(id: string): Promise<Result<EmpresaRecord>> {
    const row = await Empresa.findByPk(id);
    if (!row) return fail('EMPRESA_NOT_FOUND');
    await row.update({ estado: 'SUSPENDIDO' });
    await row.reload();
    return ok(this.toRecord(row));
  }

  async activatePlatform(id: string): Promise<Result<EmpresaRecord>> {
    const row = await Empresa.findByPk(id);
    if (!row) return fail('EMPRESA_NOT_FOUND');
    await row.update({ estado: 'ACTIVO' });
    await row.reload();
    return ok(this.toRecord(row));
  }
}

export default new EmpresaDelegate();
