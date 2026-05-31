import config from '../config/index.js';
import { ApiCoreBaseService } from './apiCoreBaseService.js';
import type { UpdateEmpresaTenantInput } from './apiCoreServiceEmpresa.js';

export type CreateEmpresaPlatformInput = {
  rut: string;
  razonSocial: string;
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
};

export type UpdateEmpresaPlatformInput = UpdateEmpresaTenantInput & {
  estado?: 'ACTIVO' | 'SUSPENDIDO' | 'PENDIENTE_ONBOARDING';
};

export class ApiCoreServicePlatformEmpresa extends ApiCoreBaseService {
  private corePlatformHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'x-internal-key': config.internalApiKey,
    };
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
}
