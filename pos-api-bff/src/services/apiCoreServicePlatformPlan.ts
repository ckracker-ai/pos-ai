import config from '../config/index.js';
import { ApiCoreBaseService } from './apiCoreBaseService.js';

export class ApiCoreServicePlatformPlan extends ApiCoreBaseService {
  private corePlatformHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'x-internal-key': config.internalApiKey,
    };
  }

  async list() {
    const response = await this.client.get('/empresas/planes/list', {
      headers: this.corePlatformHeaders(),
    });
    return response.data;
  }

  async catalog() {
    const response = await this.client.get('/empresas/planes/catalog', {
      headers: this.corePlatformHeaders(),
    });
    return response.data;
  }

  async update(
    id: string,
    body: {
      descripcion?: string | null;
      valor?: number;
      metodoPago?: string;
      activo?: boolean;
    }
  ) {
    const response = await this.client.patch(`/empresas/planes/${id}`, body, {
      headers: this.corePlatformHeaders(),
    });
    return response.data;
  }
}

export const apiCoreServicePlatformPlan = new ApiCoreServicePlatformPlan();
