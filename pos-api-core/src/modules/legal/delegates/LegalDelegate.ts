import { v4 as uuidv4 } from 'uuid';
import LegalDocument, { type LegalDocType } from '../models/LegalDocument.model';
import LegalAcceptance, { type LegalAcceptanceChannel } from '../models/LegalAcceptance.model';
import { versionsMatchCurrent } from '../utils/legalVersions';

type Result<T> = { success: true; value: T } | { success: false; error: string };

const ok = <T>(value: T): Result<T> => ({ success: true, value });
const fail = (error: string): Result<never> => ({ success: false, error });

export type LegalDocumentDto = {
  id: string;
  docType: LegalDocType;
  version: string;
  locale: string;
  title: string;
  contentMd: string;
  contentHash: string;
  effectiveAt: string;
};

export type LegalCurrentBundle = {
  locale: string;
  terms: LegalDocumentDto;
  privacy: LegalDocumentDto;
};

function toDto(row: LegalDocument): LegalDocumentDto {
  return {
    id: String(row.getDataValue('id')),
    docType: row.getDataValue('docType') as LegalDocType,
    version: String(row.getDataValue('version')),
    locale: String(row.getDataValue('locale')),
    title: String(row.getDataValue('title')),
    contentMd: String(row.getDataValue('contentMd')),
    contentHash: String(row.getDataValue('contentHash')),
    effectiveAt: new Date(row.getDataValue('effectiveAt')).toISOString(),
  };
}

class LegalDelegate {
  async getCurrentSlaDocument(locale = 'es-CL'): Promise<Result<LegalDocumentDto>> {
    const row = await LegalDocument.findOne({
      where: { locale, isCurrent: true, docType: 'SLA' },
    });
    if (!row) return fail('LEGAL_SLA_NOT_CONFIGURED');
    return ok(toDto(row));
  }

  async getCurrentDocuments(locale = 'es-CL'): Promise<Result<LegalCurrentBundle>> {
    const rows = await LegalDocument.findAll({
      where: { locale, isCurrent: true, docType: ['TOS', 'PRIVACY'] },
    });
    const tos = rows.find((r) => r.getDataValue('docType') === 'TOS');
    const privacy = rows.find((r) => r.getDataValue('docType') === 'PRIVACY');
    if (!tos || !privacy) return fail('LEGAL_DOCUMENTS_NOT_CONFIGURED');
    return ok({
      locale,
      terms: toDto(tos),
      privacy: toDto(privacy),
    });
  }

  async getDocumentByTypeAndVersion(
    docType: LegalDocType,
    version: string,
    locale = 'es-CL'
  ): Promise<Result<LegalDocumentDto>> {
    const row = await LegalDocument.findOne({ where: { docType, version, locale } });
    if (!row) return fail('LEGAL_DOCUMENT_NOT_FOUND');
    return ok(toDto(row));
  }

  async recordAcceptances(input: {
    userId?: string | null;
    empresaId?: string | null;
    termsVersion: string;
    privacyVersion: string;
    ipAddress?: string | null;
    userAgent?: string | null;
    channel: LegalAcceptanceChannel;
  }): Promise<Result<{ acceptanceIds: string[] }>> {
    const current = await this.getCurrentDocuments();
    if (!current.success) return current;

    if (
      !versionsMatchCurrent(
        { termsVersion: input.termsVersion, privacyVersion: input.privacyVersion },
        {
          tosVersion: current.value.terms.version,
          privacyVersion: current.value.privacy.version,
        }
      )
    ) {
      return fail('LEGAL_VERSION_MISMATCH');
    }

    const now = new Date();
    const rows = [
      {
        doc: current.value.terms,
        version: input.termsVersion,
      },
      {
        doc: current.value.privacy,
        version: input.privacyVersion,
      },
    ];

    const acceptanceIds: string[] = [];
    for (const item of rows) {
      const id = uuidv4();
      await LegalAcceptance.create({
        id,
        userId: input.userId ?? null,
        empresaId: input.empresaId ?? null,
        documentId: item.doc.id,
        documentVersion: item.version,
        contentHash: item.doc.contentHash,
        ipAddress: input.ipAddress?.slice(0, 45) ?? null,
        userAgent: input.userAgent?.slice(0, 512) ?? null,
        acceptanceChannel: input.channel,
        acceptedAt: now,
      });
      acceptanceIds.push(id);
    }

    return ok({ acceptanceIds });
  }

  async userHasCurrentAcceptances(userId: string): Promise<Result<boolean>> {
    const current = await this.getCurrentDocuments();
    if (!current.success) return current;

    for (const doc of [current.value.terms, current.value.privacy]) {
      const row = await LegalAcceptance.findOne({
        where: {
          userId,
          documentId: doc.id,
          documentVersion: doc.version,
        },
      });
      if (!row) return ok(false);
    }

    return ok(true);
  }

  async getLoginReauthBundle(): Promise<
    Result<{
      terms: { version: string; title: string };
      privacy: { version: string; title: string };
    }>
  > {
    const current = await this.getCurrentDocuments();
    if (!current.success) return current;
    return ok({
      terms: { version: current.value.terms.version, title: current.value.terms.title },
      privacy: { version: current.value.privacy.version, title: current.value.privacy.title },
    });
  }
}

const legalDelegate = new LegalDelegate();
export default legalDelegate;
