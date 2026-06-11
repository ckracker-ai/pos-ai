import { Router } from 'express';
import { sendOk, sendFail } from '../../../middleware/globalErrorHandler';
import legalDelegate from '../delegates/LegalDelegate';

const mapErrorStatus = (error: string): number => {
  if (error === 'LEGAL_DOCUMENTS_NOT_CONFIGURED' || error === 'LEGAL_SLA_NOT_CONFIGURED') return 503;
  if (error === 'LEGAL_DOCUMENT_NOT_FOUND') return 404;
  if (error === 'LEGAL_VERSION_MISMATCH') return 409;
  if (error === 'TERMS_NOT_ACCEPTED') return 400;
  return 400;
};

export const legalPublicRoutes = Router();

legalPublicRoutes.get('/documents/sla/current', async (req, res) => {
  const locale = String(req.query.locale ?? 'es-CL');
  const result = await legalDelegate.getCurrentSlaDocument(locale);
  if (result.success) {
    return sendOk(res, {
      locale,
      sla: {
        id: result.value.id,
        version: result.value.version,
        title: result.value.title,
        contentMd: result.value.contentMd,
        contentHash: result.value.contentHash,
        effectiveAt: result.value.effectiveAt,
      },
    });
  }
  return sendFail(res, result.error, mapErrorStatus(result.error));
});

legalPublicRoutes.get('/documents/current', async (req, res) => {
  const locale = String(req.query.locale ?? 'es-CL');
  const result = await legalDelegate.getCurrentDocuments(locale);
  if (result.success) {
    return sendOk(res, {
      locale: result.value.locale,
      terms: {
        id: result.value.terms.id,
        version: result.value.terms.version,
        title: result.value.terms.title,
        contentMd: result.value.terms.contentMd,
        contentHash: result.value.terms.contentHash,
        effectiveAt: result.value.terms.effectiveAt,
      },
      privacy: {
        id: result.value.privacy.id,
        version: result.value.privacy.version,
        title: result.value.privacy.title,
        contentMd: result.value.privacy.contentMd,
        contentHash: result.value.privacy.contentHash,
        effectiveAt: result.value.privacy.effectiveAt,
      },
    });
  }
  return sendFail(res, result.error, mapErrorStatus(result.error));
});

export const legalProtectedRoutes = Router();

legalProtectedRoutes.post('/acceptances', async (req, res) => {
  const body = req.body ?? {};
  const termsVersion = String(body.termsVersion ?? '').trim();
  const privacyVersion = String(body.privacyVersion ?? '').trim();
  if (!termsVersion || !privacyVersion) {
    return sendFail(res, 'TERMS_NOT_ACCEPTED', 400);
  }

  const result = await legalDelegate.recordAcceptances({
    userId: body.userId ?? null,
    empresaId: body.empresaId ?? null,
    termsVersion,
    privacyVersion,
    ipAddress: body.ipAddress ?? null,
    userAgent: body.userAgent ?? null,
    channel: body.channel ?? 'REGISTRO',
  });

  if (result.success) {
    return sendOk(res, { acceptanceIds: result.value.acceptanceIds }, 201);
  }
  return sendFail(res, result.error, mapErrorStatus(result.error));
});
