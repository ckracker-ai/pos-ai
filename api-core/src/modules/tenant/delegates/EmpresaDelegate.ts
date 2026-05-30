import { v4 as uuidv4 } from 'uuid';
import { UniqueConstraintError } from 'sequelize';
import sequelize from '../../../config/database';
import Empresa, { EmpresaEstado } from '../models/Empresa.model';
import Branch from '../../branch/models/Branch.model';
import { parseRut } from '../../../utils/rutChile';
import { slugify, uniqueSlug } from '../../../utils/slug';
import { readModelString } from '../../../utils/modelAttributes';
import { Result, ok, fail } from '../../../types/result';

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
}

export interface UpdateEmpresaInput {
  razonSocial?: string;
  nombreFantasia?: string | null;
  giroSii?: string | null;
  direccionComercial?: string | null;
  correoFacturacion?: string | null;
  urlLogo?: string | null;
  slug?: string;
  estado?: EmpresaEstado;
}

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

  async create(input: CreateEmpresaInput): Promise<Result<{ empresa: EmpresaRecord; branch?: Branch }>> {
    const rut = parseRut(input.rut);
    if (!rut) return fail('VALIDATION_ERROR: invalid RUT');

    const razonSocial = input.razonSocial?.trim();
    if (!razonSocial) return fail('VALIDATION_ERROR: razonSocial is required');

    const nombreFantasia = input.nombreFantasia?.trim() || null;
    const slugBase = input.slug?.trim() || nombreFantasia || razonSocial;
    const slugCandidate = slugify(slugBase);
    if (!slugCandidate) return fail('VALIDATION_ERROR: slug could not be generated');

    const existingRut = await Empresa.findOne({
      where: { rutNumero: rut.rutNumero, rutDv: rut.rutDv },
    });
    if (existingRut) return fail('RUT_ALREADY_REGISTERED');

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
          correoFacturacion: input.correoFacturacion?.trim() || null,
          urlLogo: input.urlLogo?.trim() || null,
          slug,
          estado: input.estado ?? 'PENDIENTE_ONBOARDING',
        },
        { transaction }
      );

      let branch: Branch | undefined;
      const branchName = input.branchName?.trim() || 'Sucursal Central';
      if (branchName) {
        branch = await Branch.create(
          {
            id: uuidv4(),
            empresaId: String(empresa.getDataValue('id') ?? empresa.id),
            name: branchName,
            address: input.direccionComercial?.trim() || 'Por definir',
            isActive: true,
          },
          { transaction }
        );
      }

      await transaction.commit();
      return ok({ empresa: this.toRecord(empresa), branch });
    } catch (error) {
      await transaction.rollback();
      if (error instanceof UniqueConstraintError) {
        return fail('EMPRESA_DUPLICATE: slug or RUT already exists');
      }
      throw error;
    }
  }

  async update(
    id: string,
    scopedEmpresaId: string,
    input: UpdateEmpresaInput
  ): Promise<Result<EmpresaRecord>> {
    if (id !== scopedEmpresaId) return fail('EMPRESA_ACCESS_DENIED');

    const row = await Empresa.findByPk(id);
    if (!row) return fail('EMPRESA_NOT_FOUND');

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
      patch.correoFacturacion = input.correoFacturacion?.trim() || null;
    }
    if (input.urlLogo !== undefined) patch.urlLogo = input.urlLogo?.trim() || null;
    if (input.estado !== undefined) patch.estado = input.estado;

    if (input.slug !== undefined) {
      const slug = slugify(input.slug);
      if (!slug) return fail('VALIDATION_ERROR: invalid slug');
      const taken = await Empresa.findOne({ where: { slug } });
      if (taken && String(taken.id) !== id) return fail('SLUG_ALREADY_TAKEN');
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

  async deactivate(id: string, scopedEmpresaId: string): Promise<Result<EmpresaRecord>> {
    return this.update(id, scopedEmpresaId, { estado: 'SUSPENDIDO' });
  }

  async restore(id: string, scopedEmpresaId: string): Promise<Result<EmpresaRecord>> {
    return this.update(id, scopedEmpresaId, { estado: 'ACTIVO' });
  }
}

export default new EmpresaDelegate();
