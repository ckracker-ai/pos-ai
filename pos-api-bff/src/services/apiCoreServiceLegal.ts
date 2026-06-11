import config from '../config/index.js';
import { ApiCoreBaseService } from './apiCoreBaseService.js';

export type RecordLegalAcceptanceInput = {
  userId?: string | null;
  empresaId?: string | null;
  termsVersion: string;
  privacyVersion: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  channel?: 'REGISTRO' | 'CHECKOUT' | 'LOGIN_REAUTH' | 'ADMIN_IMPORT';
};

export class ApiCoreServiceLegal extends ApiCoreBaseService {
  private coreHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'x-internal-key': config.internalApiKey,
    };
  }

  async getCurrentDocuments(locale = 'es-CL') {
    const response = await this.client.get('/legal/documents/current', {
      params: { locale },
    });
    return response.data;
  }

  async getCurrentSlaDocument(locale = 'es-CL') {
    const response = await this.client.get('/legal/documents/sla/current', {
      params: { locale },
    });
    return response.data;
  }

  async recordAcceptances(input: RecordLegalAcceptanceInput) {
    const response = await this.client.post('/legal/acceptances', input, {
      headers: this.coreHeaders(),
    });
    return response.data;
  }
}
