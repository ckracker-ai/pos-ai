import config from '../config/index.js';
import { ApiCoreBaseService } from './apiCoreBaseService.js';
import type { UpdateEmpresaTenantInput } from './apiCoreServiceEmpresa.js';

export type CreateEmpresaPlatformInput = {
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
  branchName?: string;
  adminEmail?: string;
  adminPassword?: string;
  adminFullName?: string;
  planId?: string;
  planCodigo?: string;
  suscripcionOrigen?: 'PLATAFORMA' | 'CHECKOUT' | 'COMERCIAL';
};

export type UpdateEmpresaPlatformInput = UpdateEmpresaTenantInput & {
  estado?: 'ACTIVO' | 'SUSPENDIDO' | 'PENDIENTE_ONBOARDING';
  planId?: string;
  planCodigo?: string;
  assistantAdminPhone?: string | null;
  transferBankName?: string | null;
  transferAccountType?: string | null;
  transferAccount?: string | null;
  transferHolderName?: string | null;
  transferRut?: string | null;
};

export class ApiCoreServicePlatformEmpresa extends ApiCoreBaseService {
  private corePlatformHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'x-internal-key': config.internalApiKey,
    };
  }

  async getDashboard() {
    const response = await this.client.get('/empresas/platform/dashboard', {
      headers: this.corePlatformHeaders(),
    });
    return response.data;
  }

  async list() {
    const response = await this.client.get('/empresas/platform/list', {
      headers: this.corePlatformHeaders(),
    });
    return response.data;
  }

  async getById(id: string) {
    const response = await this.client.get(`/empresas/platform/${id}`, {
      headers: this.corePlatformHeaders(),
    });
    return response.data;
  }

  async create(input: CreateEmpresaPlatformInput) {
    const response = await this.client.post('/empresas', input, {
      headers: this.corePlatformHeaders(),
    });
    return response.data;
  }

  async updatePlatform(id: string, input: UpdateEmpresaPlatformInput) {
    const response = await this.client.patch(`/empresas/${id}/platform`, input, {
      headers: this.corePlatformHeaders(),
    });
    return response.data;
  }

  async suspend(id: string) {
    const response = await this.client.post(`/empresas/${id}/suspend`, {}, {
      headers: this.corePlatformHeaders(),
    });
    return response.data;
  }

  async activate(id: string) {
    const response = await this.client.post(`/empresas/${id}/activate`, {}, {
      headers: this.corePlatformHeaders(),
    });
    return response.data;
  }

  async listAssistantBindings() {
    const response = await this.client.get('/empresas/platform/assistant-bindings', {
      headers: this.corePlatformHeaders(),
    });
    return response.data;
  }

  async getCheckout(empresaId: string) {
    const response = await this.client.get(`/empresas/platform/${empresaId}/checkout`, {
      headers: this.corePlatformHeaders(),
    });
    return response.data;
  }

  async confirmCheckout(
    empresaId: string,
    body: { provider: string; reference: string; extendDays?: number }
  ) {
    const response = await this.client.post(
      `/empresas/platform/${empresaId}/checkout/confirm-payment`,
      body,
      { headers: this.corePlatformHeaders() }
    );
    return response.data;
  }

  async patchSuscripcion(
    empresaId: string,
    input: { extendDays?: number; graceDays?: number; cancel?: boolean; note?: string }
  ) {
    const response = await this.client.patch(
      `/empresas/platform/${empresaId}/suscripcion`,
      input,
      { headers: this.corePlatformHeaders() }
    );
    return response.data;
  }

  async upsertAssistantBinding(
    empresaId: string,
    input: { externalId: string; defaultBranchId?: string | null }
  ) {
    const response = await this.client.post(
      `/empresas/platform/${empresaId}/assistant-bindings`,
      input,
      { headers: this.corePlatformHeaders() }
    );
    return response.data;
  }

  async listBranchesForEmpresa(empresaId: string) {
    const response = await this.client.get(`/empresas/platform/${empresaId}/branches`, {
      headers: this.corePlatformHeaders(),
    });
    return response.data;
  }

  async setBindingSessionBranch(bindingId: string, branchId: string | null) {
    const response = await this.client.patch(
      `/empresas/platform/assistant-bindings/${bindingId}/session-branch`,
      { branchId },
      { headers: this.corePlatformHeaders() }
    );
    return response.data;
  }
}
