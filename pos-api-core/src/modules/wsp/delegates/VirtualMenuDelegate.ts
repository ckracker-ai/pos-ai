import { randomBytes } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import VirtualMenu from '../models/VirtualMenu.model';
import VirtualMenuCategory from '../models/VirtualMenuCategory.model';
import VirtualMenuProduct from '../models/VirtualMenuProduct.model';
import Branch from '../../branch/models/Branch.model';
import Empresa from '../../tenant/models/Empresa.model';
import Product from '../../catalog/models/Product.model';
import categoryDelegate from '../../catalog/delegates/CategoryDelegate';
import catalogProductDelegate from '../../catalog/delegates/CatalogProductDelegate';
import { Result, ok, fail } from '../../../types/result';
import { readModelBool, readModelId, readModelString } from '../../../utils/modelAttributes';

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

function randomSlugSuffix(): string {
  return randomBytes(4).toString('hex');
}

function toNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export type VirtualMenuProductView = {
  id: string;
  productId: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  price: number;
  isFeatured: boolean;
  sortOrder: number;
};

export type VirtualMenuCategoryView = {
  id: string;
  name: string;
  description: string | null;
  sortOrder: number;
  products: VirtualMenuProductView[];
};

export type VirtualMenuDetail = {
  id: string;
  empresaId: string;
  branchId: string;
  branchName: string;
  empresaNombre: string;
  title: string;
  subtitle: string | null;
  publicSlug: string;
  isEnabled: boolean;
  categories: VirtualMenuCategoryView[];
};

export type PublicMenuPayload = {
  title: string;
  subtitle: string | null;
  branchName: string;
  empresaNombre: string;
  categories: VirtualMenuCategoryView[];
};

class VirtualMenuDelegate {
  private async assertBranch(empresaId: string, branchId: string): Promise<Result<Branch>> {
    const branch = await Branch.findOne({ where: { id: branchId, empresaId, isActive: true } });
    if (!branch) return fail('BRANCH_NOT_FOUND');
    return ok(branch);
  }

  private async getOrCreateMenu(empresaId: string, branchId: string): Promise<Result<VirtualMenu>> {
    const branchResult = await this.assertBranch(empresaId, branchId);
    if (!branchResult.success) return branchResult;

    const branch = branchResult.value;
    let menu = await VirtualMenu.findOne({ where: { branchId } });
    if (menu) return ok(menu);

    const empresa = await Empresa.findByPk(empresaId);
    const branchName = readModelString(branch, 'name') || 'Sucursal';
    const empresaName =
      (empresa ? readModelString(empresa, 'nombreFantasia') || readModelString(empresa, 'razonSocial') : '') ||
      'Menú';
    const base = slugify(`${empresaName}-${branchName}`) || 'menu';
    let publicSlug = `${base}-${randomSlugSuffix()}`.toLowerCase();

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const taken = await VirtualMenu.findOne({ where: { publicSlug } });
      if (!taken) break;
      publicSlug = `${base}-${randomSlugSuffix()}`.toLowerCase();
    }

    menu = await VirtualMenu.create({
      id: uuidv4(),
      empresaId,
      branchId,
      title: `Menú ${branchName}`,
      subtitle: empresaName,
      publicSlug,
      isEnabled: false,
    });

    return ok(menu);
  }

  private async buildMenuDetail(menu: VirtualMenu): Promise<VirtualMenuDetail> {
    const menuId = readModelId(menu);
    const branch = await Branch.findByPk(readModelString(menu, 'branchId'));
    const empresa = await Empresa.findByPk(readModelString(menu, 'empresaId'));

    const categories = await VirtualMenuCategory.findAll({
      where: { menuId, isActive: true },
      order: [['sortOrder', 'ASC'], ['name', 'ASC']],
    });

    const categoryViews: VirtualMenuCategoryView[] = [];

    for (const cat of categories) {
      const categoryId = readModelId(cat);
      const items = await VirtualMenuProduct.findAll({
        where: { menuCategoryId: categoryId, isActive: true },
        order: [['isFeatured', 'DESC'], ['sortOrder', 'ASC']],
      });

      const products: VirtualMenuProductView[] = [];
      for (const item of items) {
        const product = await Product.findByPk(readModelString(item, 'productId'));
        if (!product || !readModelBool(product, 'isActive', true)) continue;

        const priceOverride = item.getDataValue('priceOverride');
        products.push({
          id: readModelId(item),
          productId: readModelId(product),
          name: readModelString(item, 'displayName') || readModelString(product, 'name'),
          description: readModelString(item, 'description') || readModelString(product, 'description') || null,
          imageUrl: readModelString(item, 'imageUrl') || null,
          price: priceOverride != null ? toNumber(priceOverride) : toNumber(product.getDataValue('price')),
          isFeatured: readModelBool(item, 'isFeatured', false),
          sortOrder: Number(item.getDataValue('sortOrder') ?? 0),
        });
      }

      categoryViews.push({
        id: categoryId,
        name: readModelString(cat, 'name'),
        description: readModelString(cat, 'description') || null,
        sortOrder: Number(cat.getDataValue('sortOrder') ?? 0),
        products,
      });
    }

    return {
      id: menuId,
      empresaId: readModelString(menu, 'empresaId'),
      branchId: readModelString(menu, 'branchId'),
      branchName: branch ? readModelString(branch, 'name') : '',
      empresaNombre: empresa
        ? readModelString(empresa, 'nombreFantasia') || readModelString(empresa, 'razonSocial')
        : '',
      title: readModelString(menu, 'title') || 'Menú',
      subtitle: readModelString(menu, 'subtitle') || null,
      publicSlug: readModelString(menu, 'publicSlug'),
      isEnabled: readModelBool(menu, 'isEnabled', false),
      categories: categoryViews,
    };
  }

  async getByBranch(empresaId: string, branchId: string): Promise<Result<VirtualMenuDetail>> {
    const menuResult = await this.getOrCreateMenu(empresaId, branchId);
    if (!menuResult.success) return menuResult;
    return ok(await this.buildMenuDetail(menuResult.value));
  }

  async updateMenu(
    empresaId: string,
    branchId: string,
    input: { title?: string; subtitle?: string | null; isEnabled?: boolean }
  ): Promise<Result<VirtualMenuDetail>> {
    const menuResult = await this.getOrCreateMenu(empresaId, branchId);
    if (!menuResult.success) return menuResult;

    const menu = menuResult.value;
    await menu.update({
      title: input.title?.trim() || readModelString(menu, 'title') || 'Menú',
      subtitle: input.subtitle === undefined ? menu.getDataValue('subtitle') : input.subtitle,
      isEnabled: input.isEnabled === undefined ? readModelBool(menu, 'isEnabled', false) : input.isEnabled,
    });

    return ok(await this.buildMenuDetail(menu));
  }

  async upsertCategory(
    empresaId: string,
    branchId: string,
    input: {
      id?: string;
      name: string;
      description?: string | null;
      sortOrder?: number;
      catalogCategoryId?: string | null;
    }
  ): Promise<Result<VirtualMenuDetail>> {
    const menuResult = await this.getOrCreateMenu(empresaId, branchId);
    if (!menuResult.success) return menuResult;
    const menu = menuResult.value;
    const menuId = readModelId(menu);

    const name = input.name.trim();
    if (!name) return fail('VALIDATION_ERROR: category name required');

    if (input.id) {
      const existing = await VirtualMenuCategory.findOne({
        where: { id: input.id, menuId },
      });
      if (!existing) return fail('MENU_CATEGORY_NOT_FOUND');
      await existing.update({
        name,
        description: input.description ?? existing.getDataValue('description'),
        sortOrder: input.sortOrder ?? existing.getDataValue('sortOrder'),
        catalogCategoryId: input.catalogCategoryId ?? existing.getDataValue('catalogCategoryId'),
      });
    } else {
      await VirtualMenuCategory.create({
        id: uuidv4(),
        menuId,
        name,
        description: input.description ?? null,
        sortOrder: input.sortOrder ?? 0,
        catalogCategoryId: input.catalogCategoryId ?? null,
      });
    }

    return ok(await this.buildMenuDetail(menu));
  }

  async upsertProduct(
    empresaId: string,
    branchId: string,
    input: {
      menuCategoryId: string;
      productId: string;
      id?: string;
      displayName?: string | null;
      description?: string | null;
      imageUrl?: string | null;
      priceOverride?: number | null;
      sortOrder?: number;
      isFeatured?: boolean;
    }
  ): Promise<Result<VirtualMenuDetail>> {
    const menuResult = await this.getOrCreateMenu(empresaId, branchId);
    if (!menuResult.success) return menuResult;
    const menu = menuResult.value;
    const menuId = readModelId(menu);

    const category = await VirtualMenuCategory.findOne({
      where: { id: input.menuCategoryId, menuId, isActive: true },
    });
    if (!category) return fail('MENU_CATEGORY_NOT_FOUND');

    const categoryId = readModelId(category);
    const product = await Product.findOne({
      where: { id: input.productId, empresaId, isActive: true },
    });
    if (!product) return fail('PRODUCT_NOT_FOUND');

    const productId = readModelId(product);

    if (input.id) {
      const existing = await VirtualMenuProduct.findOne({
        where: { id: input.id, menuCategoryId: categoryId },
      });
      if (!existing) return fail('MENU_PRODUCT_NOT_FOUND');
      await existing.update({
        productId,
        displayName: input.displayName ?? existing.getDataValue('displayName'),
        description: input.description ?? existing.getDataValue('description'),
        imageUrl: input.imageUrl ?? existing.getDataValue('imageUrl'),
        priceOverride: input.priceOverride ?? existing.getDataValue('priceOverride'),
        sortOrder: input.sortOrder ?? existing.getDataValue('sortOrder'),
        isFeatured: input.isFeatured ?? existing.getDataValue('isFeatured'),
      });
    } else {
      await VirtualMenuProduct.create({
        id: uuidv4(),
        menuCategoryId: categoryId,
        productId,
        displayName: input.displayName ?? null,
        description: input.description ?? null,
        imageUrl: input.imageUrl ?? null,
        priceOverride: input.priceOverride ?? null,
        sortOrder: input.sortOrder ?? 0,
        isFeatured: input.isFeatured ?? false,
      });
    }

    return ok(await this.buildMenuDetail(menu));
  }

  async syncFromCatalog(empresaId: string, branchId: string): Promise<Result<VirtualMenuDetail>> {
    const menuResult = await this.getOrCreateMenu(empresaId, branchId);
    if (!menuResult.success) return menuResult;
    const menu = menuResult.value;
    const menuId = readModelId(menu);

    const leavesResult = await categoryDelegate.getLeaves(empresaId, true);
    if (!leavesResult.success) return leavesResult;

    const productsResult = await catalogProductDelegate.listByBranch(empresaId, branchId);
    if (!productsResult.success) return productsResult;

    const leafIds = new Set(leavesResult.value.map((leaf) => leaf.id));
    const syncedProductIds = new Set(productsResult.value.map((product) => product.id));
    const categoryMap = new Map<string, VirtualMenuCategory>();

    for (const [index, leaf] of leavesResult.value.entries()) {
      let menuCat = await VirtualMenuCategory.findOne({
        where: { menuId, catalogCategoryId: leaf.id },
      });

      if (!menuCat) {
        menuCat = await VirtualMenuCategory.create({
          id: uuidv4(),
          menuId,
          catalogCategoryId: leaf.id,
          name: leaf.name,
          description: leaf.description ?? null,
          sortOrder: index,
        });
      } else {
        await menuCat.update({ name: leaf.name, sortOrder: index, isActive: true });
      }

      categoryMap.set(leaf.id, menuCat);
    }

    for (const [pIndex, product] of productsResult.value.entries()) {
      const menuCat = categoryMap.get(product.categoryId);
      if (!menuCat) continue;

      const menuCategoryId = readModelId(menuCat);
      const existing = await VirtualMenuProduct.findOne({
        where: { menuCategoryId, productId: product.id },
      });

      if (existing) {
        await existing.update({ isActive: true, sortOrder: pIndex });
      } else {
        await VirtualMenuProduct.create({
          id: uuidv4(),
          menuCategoryId,
          productId: product.id,
          displayName: product.name,
          description: product.description ?? null,
          sortOrder: pIndex,
          isFeatured: false,
        });
      }
    }

    const existingCategories = await VirtualMenuCategory.findAll({ where: { menuId } });
    for (const menuCat of existingCategories) {
      const catalogCategoryId = readModelString(menuCat, 'catalogCategoryId');
      if (catalogCategoryId && !leafIds.has(catalogCategoryId)) {
        await menuCat.update({ isActive: false });
      }
    }

    const menuCategoryIds = [...categoryMap.values()].map((menuCat) => readModelId(menuCat));
    if (menuCategoryIds.length > 0) {
      const activeItems = await VirtualMenuProduct.findAll({
        where: { menuCategoryId: menuCategoryIds, isActive: true },
      });
      for (const item of activeItems) {
        const productId = readModelString(item, 'productId');
        if (!syncedProductIds.has(productId)) {
          await item.update({ isActive: false });
        }
      }
    }

    return ok(await this.buildMenuDetail(menu));
  }

  async getPublicBySlug(slug: string): Promise<Result<PublicMenuPayload>> {
    const normalized = slug.trim().toLowerCase();
    if (!normalized) return fail('MENU_NOT_FOUND');

    const menu = await VirtualMenu.findOne({
      where: { publicSlug: normalized, isEnabled: true },
    });
    if (!menu) return fail('MENU_NOT_FOUND');

    const detail = await this.buildMenuDetail(menu);
    return ok({
      title: detail.title,
      subtitle: detail.subtitle,
      branchName: detail.branchName,
      empresaNombre: detail.empresaNombre,
      categories: detail.categories.filter((c) => c.products.length > 0),
    });
  }
}

export default new VirtualMenuDelegate();
