import { ApiCoreBaseService } from './apiCoreBaseService.js';
import {
  getCachedComunas,
  getCachedRegions,
  setCachedComunas,
  setCachedRegions,
  territoryComunasCacheKey,
  territoryRegionsCacheKey,
} from '../cache/territoryCache.js';

export class ApiCoreServiceTerritory extends ApiCoreBaseService {
  async listRegions(token: string, internalKey?: string, branchId?: string) {
    const key = territoryRegionsCacheKey(token);
    const cached = getCachedRegions(key);
    if (cached != null) return cached;

    const response = await this.client.get('/territory/regions', {
      headers: this.flexibleHeaders(token, internalKey, branchId),
    });
    setCachedRegions(key, response.data);
    return response.data;
  }

  async listComunas(regionId: string, token: string, internalKey?: string, branchId?: string) {
    const key = territoryComunasCacheKey(token, regionId);
    const cached = getCachedComunas(key);
    if (cached != null) return cached;

    const response = await this.client.get('/territory/comunas', {
      params: { regionId },
      headers: this.flexibleHeaders(token, internalKey, branchId),
    });
    setCachedComunas(key, response.data);
    return response.data;
  }

  async searchComunas(q: string, token: string, internalKey?: string, branchId?: string) {
    const response = await this.client.get('/territory/comunas/search', {
      params: { q, limit: 10 },
      headers: this.flexibleHeaders(token, internalKey, branchId),
    });
    return response.data;
  }

  async resolve(
    body: { comunaText?: string; codigoPostal?: string },
    token: string,
    internalKey?: string,
    branchId?: string
  ) {
    const response = await this.client.post('/territory/resolve', body, {
      headers: this.flexibleHeaders(token, internalKey, branchId),
    });
    return response.data;
  }
}
