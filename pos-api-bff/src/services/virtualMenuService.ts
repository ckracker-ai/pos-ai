import QRCode from 'qrcode';
import config from '../config/index.js';
import { ApiCoreServiceVirtualMenu } from './apiCoreServiceVirtualMenu.js';
import { ok, err, type Result } from '../utils/result.js';

export type MenuQrPayload = {
  publicUrl: string;
  publicSlug: string;
  qrDataUrl: string;
};

export type VirtualMenuView = {
  id: string;
  branchId: string;
  branchName: string;
  empresaNombre: string;
  title: string;
  subtitle: string | null;
  publicSlug: string;
  isEnabled: boolean;
  categories: Array<{
    id: string;
    name: string;
    description: string | null;
    sortOrder: number;
    products: Array<{
      id: string;
      productId: string;
      name: string;
      description: string | null;
      imageUrl: string | null;
      price: number;
      isFeatured: boolean;
      sortOrder: number;
    }>;
  }>;
};

function unwrapMenu(coreResponse: unknown): VirtualMenuView | undefined {
  const envelope = coreResponse as { data?: { menu?: VirtualMenuView } };
  return envelope.data?.menu;
}

export class VirtualMenuService {
  private core = new ApiCoreServiceVirtualMenu();

  buildPublicUrl(slug: string): string {
    const base = config.frontendPublicUrl.replace(/\/$/, '');
    return `${base}/menu/${encodeURIComponent(slug)}`;
  }

  async generateQrPayload(slug: string): Promise<Result<MenuQrPayload>> {
    const normalized = slug.trim();
    if (!normalized) return err('VALIDATION_ERROR: slug required', 400);

    const publicUrl = this.buildPublicUrl(normalized);
    try {
      const qrDataUrl = await QRCode.toDataURL(publicUrl, {
        margin: 1,
        width: 320,
        color: { dark: '#4A533C', light: '#F4F4F3' },
      });
      return ok({
        data: { publicUrl, publicSlug: normalized, qrDataUrl },
      });
    } catch {
      return err('QR_GENERATION_FAILED', 500);
    }
  }

  async getPublicMenu(slug: string): Promise<Result<{ menu: unknown }>> {
    try {
      const response = await this.core.getPublicMenu(slug);
      const menu = unwrapMenu(response);
      if (!menu) return err('MENU_NOT_FOUND', 404);
      return ok({ data: { menu } });
    } catch (e: unknown) {
      const status = (e as { response?: { status?: number } })?.response?.status ?? 500;
      return err(status === 404 ? 'MENU_NOT_FOUND' : 'FAILED_TO_LOAD_MENU', status);
    }
  }

  async getMenuByBranch(
    branchId: string,
    token: string,
    internalKey: string
  ): Promise<Result<{ menu: VirtualMenuView; qr?: MenuQrPayload }>> {
    try {
      const response = await this.core.getMenuByBranch(branchId, token, internalKey);
      const menu = unwrapMenu(response);
      if (!menu) return err('MENU_NOT_FOUND', 404);

      let qr: MenuQrPayload | undefined;
      if (menu.publicSlug) {
        const qrResult = await this.generateQrPayload(menu.publicSlug);
        if (qrResult.ok) qr = qrResult.data;
      }

      return ok({ data: { menu, qr } });
    } catch (e: unknown) {
      const status = (e as { response?: { status?: number } })?.response?.status ?? 500;
      return err('FAILED_TO_LOAD_MENU', status);
    }
  }

  async updateMenu(
    branchId: string,
    body: { title?: string; subtitle?: string | null; isEnabled?: boolean },
    token: string,
    internalKey: string
  ): Promise<Result<{ menu: VirtualMenuView; qr?: MenuQrPayload }>> {
    try {
      const response = await this.core.updateMenu(branchId, body, token, internalKey);
      const menu = unwrapMenu(response);
      if (!menu) return err('MENU_UPDATE_FAILED', 500);

      let qr: MenuQrPayload | undefined;
      if (menu.publicSlug) {
        const qrResult = await this.generateQrPayload(menu.publicSlug);
        if (qrResult.ok) qr = qrResult.data;
      }

      return ok({ data: { menu, qr } });
    } catch (e: unknown) {
      const status = (e as { response?: { status?: number } })?.response?.status ?? 500;
      return err('MENU_UPDATE_FAILED', status);
    }
  }

  async syncFromCatalog(
    branchId: string,
    token: string,
    internalKey: string
  ): Promise<Result<{ menu: VirtualMenuView; qr?: MenuQrPayload }>> {
    try {
      const response = await this.core.syncFromCatalog(branchId, token, internalKey);
      const menu = unwrapMenu(response);
      if (!menu) return err('MENU_SYNC_FAILED', 500);

      let qr: MenuQrPayload | undefined;
      if (menu.publicSlug) {
        const qrResult = await this.generateQrPayload(menu.publicSlug);
        if (qrResult.ok) qr = qrResult.data;
      }

      return ok({ data: { menu, qr } });
    } catch (e: unknown) {
      const status = (e as { response?: { status?: number } })?.response?.status ?? 500;
      return err('MENU_SYNC_FAILED', status);
    }
  }
}

export const virtualMenuService = new VirtualMenuService();
