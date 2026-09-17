import { v4 as uuidv4 } from 'uuid';
import { Op } from 'sequelize';
import Empresa from '../../tenant/models/Empresa.model';
import SupportCase from '../models/SupportCase.model';
import SupportMessage from '../models/SupportMessage.model';
import { Result, fail, ok } from '../../../types/result';
import {
  statusAfterMessage,
  type SupportAuthorKind,
  type SupportCaseOrigin,
  type SupportCaseStatus,
  type SupportSeverity,
} from '../supportStatus';

export type SupportMessageDto = {
  id: string;
  authorKind: SupportAuthorKind;
  authorId: string | null;
  body: string;
  createdAt: string;
};

export type SupportCaseListItem = {
  id: string;
  empresaId: string;
  empresaRazonSocial: string;
  empresaEstado: string | null;
  status: SupportCaseStatus;
  origin: SupportCaseOrigin;
  severity: SupportSeverity;
  subject: string;
  lastMessageAt: string;
  createdAt: string;
};

export type SupportCaseDetail = SupportCaseListItem & {
  createdByKind: string;
  createdById: string | null;
  resolvedAt: string | null;
  messages: SupportMessageDto[];
};

function asIso(value: unknown): string {
  const d = value instanceof Date ? value : new Date(String(value ?? ''));
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

function toListItem(row: SupportCase): SupportCaseListItem {
  const empresa = row.get('empresa') as Empresa | undefined;
  return {
    id: String(row.getDataValue('id')),
    empresaId: String(row.getDataValue('empresaId')),
    empresaRazonSocial: String(empresa?.getDataValue('razonSocial') ?? empresa?.razonSocial ?? ''),
    empresaEstado: empresa?.getDataValue('estado') ? String(empresa.getDataValue('estado')) : null,
    status: row.getDataValue('status'),
    origin: row.getDataValue('origin'),
    severity: row.getDataValue('severity'),
    subject: String(row.getDataValue('subject')),
    lastMessageAt: asIso(row.getDataValue('lastMessageAt')),
    createdAt: asIso(row.getDataValue('createdAt')),
  };
}

function toMessageDto(row: SupportMessage): SupportMessageDto {
  return {
    id: String(row.getDataValue('id')),
    authorKind: row.getDataValue('authorKind'),
    authorId: row.getDataValue('authorId'),
    body: String(row.getDataValue('body')),
    createdAt: asIso(row.getDataValue('createdAt')),
  };
}

const EMPRESA_INCLUDE = {
  model: Empresa,
  as: 'empresa',
  attributes: ['id', 'razonSocial', 'nombreFantasia', 'estado'],
};

class SupportDelegate {
  async list(filters: {
    empresaId?: string;
    status?: SupportCaseStatus;
    openOnly?: boolean;
  }): Promise<Result<{ casos: SupportCaseListItem[]; openCount: number }>> {
    const where: Record<string, unknown> = {};
    if (filters.empresaId) where.empresaId = filters.empresaId;
    if (filters.status) where.status = filters.status;
    else if (filters.openOnly) where.status = { [Op.ne]: 'RESUELTO' };

    const rows = await SupportCase.findAll({
      where,
      include: [EMPRESA_INCLUDE],
      order: [['lastMessageAt', 'DESC']],
      limit: 200,
    });
    const openCount = await SupportCase.count({
      where: {
        ...(filters.empresaId ? { empresaId: filters.empresaId } : {}),
        status: { [Op.ne]: 'RESUELTO' },
      },
    });
    return ok({ casos: rows.map(toListItem), openCount });
  }

  async getById(id: string, empresaId?: string): Promise<Result<SupportCaseDetail>> {
    const row = await SupportCase.findOne({
      where: { id, ...(empresaId ? { empresaId } : {}) },
      include: [EMPRESA_INCLUDE],
    });
    if (!row) return fail('SUPPORT_CASE_NOT_FOUND');
    const messages = await SupportMessage.findAll({
      where: { casoId: id },
      order: [['createdAt', 'ASC']],
    });
    return ok({
      ...toListItem(row),
      createdByKind: String(row.getDataValue('createdByKind')),
      createdById: row.getDataValue('createdById'),
      resolvedAt: row.getDataValue('resolvedAt')
        ? asIso(row.getDataValue('resolvedAt'))
        : null,
      messages: messages.map(toMessageDto),
    });
  }

  async create(input: {
    empresaId: string;
    subject: string;
    body: string;
    origin?: SupportCaseOrigin;
    severity?: SupportSeverity;
    createdByKind?: 'USER' | 'PLATFORM' | 'SYSTEM';
    createdById?: string | null;
    authorKind?: SupportAuthorKind;
  }): Promise<Result<SupportCaseDetail>> {
    const empresa = await Empresa.findByPk(input.empresaId);
    if (!empresa) return fail('EMPRESA_NOT_FOUND');
    const subject = input.subject.trim().slice(0, 200);
    const body = input.body.trim();
    if (!subject) return fail('VALIDATION_ERROR: subject required');
    if (!body) return fail('VALIDATION_ERROR: body required');

    const now = new Date();
    const casoId = uuidv4();
    const authorKind = input.authorKind ?? (input.createdByKind === 'PLATFORM' ? 'PLATFORM' : 'USER');
    const status = statusAfterMessage('ABIERTO', authorKind);

    await SupportCase.create({
      id: casoId,
      empresaId: input.empresaId,
      status,
      origin: input.origin ?? 'TENANT',
      severity: input.severity ?? 'MEDIA',
      subject,
      createdByKind: input.createdByKind ?? 'USER',
      createdById: input.createdById ?? null,
      lastMessageAt: now,
      resolvedAt: null,
    });
    await SupportMessage.create({
      id: uuidv4(),
      casoId,
      authorKind,
      authorId: input.createdById ?? null,
      body,
    });
    return this.getById(casoId);
  }

  async addMessage(input: {
    casoId: string;
    body: string;
    authorKind: SupportAuthorKind;
    authorId?: string | null;
    empresaId?: string;
  }): Promise<Result<SupportCaseDetail>> {
    const body = input.body.trim();
    if (!body) return fail('VALIDATION_ERROR: body required');
    const row = await SupportCase.findOne({
      where: { id: input.casoId, ...(input.empresaId ? { empresaId: input.empresaId } : {}) },
    });
    if (!row) return fail('SUPPORT_CASE_NOT_FOUND');

    const casoId = String(row.getDataValue('id'));
    await SupportMessage.create({
      id: uuidv4(),
      casoId,
      authorKind: input.authorKind,
      authorId: input.authorId ?? null,
      body,
    });
    const status = statusAfterMessage(row.getDataValue('status'), input.authorKind);
    await row.update({
      status,
      lastMessageAt: new Date(),
      resolvedAt: status === 'RESUELTO' ? row.getDataValue('resolvedAt') : null,
    });
    return this.getById(casoId);
  }

  async patchStatus(
    casoId: string,
    status: SupportCaseStatus,
    empresaId?: string
  ): Promise<Result<SupportCaseDetail>> {
    const row = await SupportCase.findOne({
      where: { id: casoId, ...(empresaId ? { empresaId } : {}) },
    });
    if (!row) return fail('SUPPORT_CASE_NOT_FOUND');
    await row.update({
      status,
      resolvedAt: status === 'RESUELTO' ? new Date() : null,
    });
    return this.getById(String(row.getDataValue('id')));
  }

  async ensureOpenSignal(input: {
    empresaId: string;
    subject: string;
    body: string;
    severity?: SupportSeverity;
  }): Promise<Result<SupportCaseDetail>> {
    const existing = await SupportCase.findOne({
      where: {
        empresaId: input.empresaId,
        origin: 'SIGNAL',
        status: { [Op.ne]: 'RESUELTO' },
        subject: input.subject,
      },
      order: [['createdAt', 'DESC']],
    });
    if (existing) {
      return this.addMessage({
        casoId: String(existing.getDataValue('id')),
        body: input.body,
        authorKind: 'SYSTEM',
      });
    }
    return this.create({
      empresaId: input.empresaId,
      subject: input.subject,
      body: input.body,
      origin: 'SIGNAL',
      severity: input.severity ?? 'ALTA',
      createdByKind: 'SYSTEM',
      authorKind: 'SYSTEM',
    });
  }
}

export default new SupportDelegate();
