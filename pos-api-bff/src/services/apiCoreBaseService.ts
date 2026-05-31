import axios, { AxiosInstance } from 'axios';
import config from '../config/index.js';

export abstract class ApiCoreBaseService {
  protected client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: config.coreApiBaseUrl,
      timeout: 5000,
    });
  }

  /** Cabeceras para endpoints públicos (login, register). */
  protected publicHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
    };
  }

  /**
   * Cabeceras estrictas requeridas por el contrato del Core API.
   */
  protected authHeaders(token: string, internalKey: string, branchId: string): Record<string, string> {
    if (!token) throw new Error(`${this.constructor.name}: missing token`);
    if (!internalKey) throw new Error(`${this.constructor.name}: missing x-internal-key`);
    if (!branchId) throw new Error(`${this.constructor.name}: missing x-branch-id`);

    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'x-internal-key': internalKey,
      'x-branch-id': branchId,
    };
  }

  /**
   * Cabeceras flexibles cuando internalKey y/o branchId son opcionales.
   */
  protected flexibleHeaders(
    token: string,
    internalKey?: string,
    branchId?: string
  ): Record<string, string> {
    if (!token) throw new Error(`${this.constructor.name}: missing token`);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    if (internalKey) headers['x-internal-key'] = internalKey;
    if (branchId) headers['x-branch-id'] = branchId;

    return headers;
  }

  /** Llamadas plataforma al core (solo x-internal-key del servidor BFF). */
  protected platformHeaders(): Record<string, string> {
    const key = config.internalApiKey;
    if (!key) throw new Error(`${this.constructor.name}: missing INTERNAL_API_KEY`);
    return {
      'Content-Type': 'application/json',
      'x-internal-key': key,
    };
  }
}
