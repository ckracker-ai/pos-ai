import { ApiCoreBaseService } from './apiCoreBaseService.js';

export type UpdateEmpresaTenantInput = {
  razonSocial?: string;
  nombreFantasia?: string | null;
  giroSii?: string | null;
  direccionComercial?: string | null;
  correoFacturacion?: string | null;
  urlLogo?: string | null;
  slug?: string;
};

export class ApiCoreServiceEmpresa extends ApiCoreBaseService {
  async getMe(token: string, internalKey: string, branchId: string) {
    const response = await this.client.get('/empresas/me', {
      headers: this.authHeaders(token, internalKey, branchId),
    });
    return response.data;
  }

  async list(token: string, internalKey: string, branchId: string) {
    const response = await this.client.get('/empresas', {
      headers: this.authHeaders(token, internalKey, branchId),
    });
    return response.data;
  }

  async getById(id: string, token: string, internalKey: string, branchId: string) {
    const response = await this.client.get(`/empresas/${id}`, {
      headers: this.authHeaders(token, internalKey, branchId),
    });
    return response.data;
  }

  async updateForTenant(
    id: string,
    input: UpdateEmpresaTenantInput,
    token: string,
    internalKey: string,
    branchId: string
  ) {
    const response = await this.client.patch(`/empresas/${id}`, input, {
      headers: this.authHeaders(token, internalKey, branchId),
    });
    return response.data;
  }

  async updateFormalizacionProgreso(
    id: string,
    input: Record<string, unknown>,
    token: string,
    internalKey: string,
    branchId: string
  ) {
    const response = await this.client.patch(`/empresas/${id}/formalizacion-progreso`, input, {
      headers: this.authHeaders(token, internalKey, branchId),
    });
    return response.data;
  }

  async formalizarEmpresa(
    id: string,
    input: { rut: string; razonSocial?: string; giroSii?: string | null },
    token: string,
    internalKey: string,
    branchId: string
  ) {
    const response = await this.client.post(`/empresas/${id}/formalizar`, input, {
      headers: this.authHeaders(token, internalKey, branchId),
    });
    return response.data;
  }

  async getDataExport(id: string, token: string, internalKey: string, branchId: string) {
    const response = await this.client.get(`/empresas/${id}/data-export`, {
      headers: this.authHeaders(token, internalKey, branchId),
    });
    return response.data;
  }

  async getDataDeletionStatus(id: string, token: string, internalKey: string, branchId: string) {
    const response = await this.client.get(`/empresas/${id}/data-deletion-status`, {
      headers: this.authHeaders(token, internalKey, branchId),
    });
    return response.data;
  }

  async createDataDeletionRequest(
    id: string,
    input: { confirmationPhrase: string; notes?: string | null },
    token: string,
    internalKey: string,
    branchId: string
  ) {
    const response = await this.client.post(`/empresas/${id}/data-deletion-request`, input, {
      headers: this.authHeaders(token, internalKey, branchId),
    });
    return response.data;
  }

  async cancelDataDeletionRequest(
    id: string,
    input: { requestId?: string },
    token: string,
    internalKey: string,
    branchId: string
  ) {
    const response = await this.client.post(`/empresas/${id}/data-deletion-cancel`, input, {
      headers: this.authHeaders(token, internalKey, branchId),
    });
    return response.data;
  }
}
