import config from '../config/index.js';
import { ApiCoreBaseService } from './apiCoreBaseService.js';

export class ApiCoreServiceSupport extends ApiCoreBaseService {
  private corePlatformHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'x-internal-key': config.internalApiKey,
    };
  }

  async platformList(query: Record<string, string> = {}) {
    const response = await this.client.get('/support/platform/casos', {
      headers: this.corePlatformHeaders(),
      params: query,
    });
    return response.data;
  }

  async platformGet(id: string) {
    const response = await this.client.get(`/support/platform/casos/${id}`, {
      headers: this.corePlatformHeaders(),
    });
    return response.data;
  }

  async platformCreate(input: {
    empresaId: string;
    subject: string;
    body: string;
    severity?: string;
    createdById?: string | null;
  }) {
    const response = await this.client.post('/support/platform/casos', input, {
      headers: this.corePlatformHeaders(),
    });
    return response.data;
  }

  async platformAddMessage(id: string, input: { body: string; authorId?: string | null }) {
    const response = await this.client.post(`/support/platform/casos/${id}/mensajes`, input, {
      headers: this.corePlatformHeaders(),
    });
    return response.data;
  }

  async platformPatch(id: string, input: { status: string }) {
    const response = await this.client.patch(`/support/platform/casos/${id}`, input, {
      headers: this.corePlatformHeaders(),
    });
    return response.data;
  }

  async tenantList(token: string, internalKey: string, branchId: string) {
    const response = await this.client.get('/support/casos', {
      headers: this.authHeaders(token, internalKey, branchId),
    });
    return response.data;
  }

  async tenantManual(token: string, internalKey: string, branchId: string) {
    const response = await this.client.get('/support/manual', {
      headers: this.authHeaders(token, internalKey, branchId),
    });
    return response.data;
  }

  async tenantManualSearch(q: string, token: string, internalKey: string, branchId: string) {
    const response = await this.client.get('/support/manual/search', {
      headers: this.authHeaders(token, internalKey, branchId),
      params: { q },
    });
    return response.data;
  }

  async tenantGet(id: string, token: string, internalKey: string, branchId: string) {
    const response = await this.client.get(`/support/casos/${id}`, {
      headers: this.authHeaders(token, internalKey, branchId),
    });
    return response.data;
  }

  async tenantAsk(
    input: { subject: string; body: string },
    token: string,
    internalKey: string,
    branchId: string
  ) {
    const response = await this.client.post('/support/casos/ask', input, {
      headers: this.authHeaders(token, internalKey, branchId),
    });
    return response.data;
  }

  async tenantAddMessage(
    id: string,
    input: { body: string },
    token: string,
    internalKey: string,
    branchId: string
  ) {
    const response = await this.client.post(`/support/casos/${id}/mensajes`, input, {
      headers: this.authHeaders(token, internalKey, branchId),
    });
    return response.data;
  }

  async tenantCopilot(
    id: string,
    input: { body: string },
    token: string,
    internalKey: string,
    branchId: string
  ) {
    const response = await this.client.post(`/support/casos/${id}/copilot`, input, {
      headers: this.authHeaders(token, internalKey, branchId),
    });
    return response.data;
  }
}
