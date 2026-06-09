import { Op, UniqueConstraintError } from 'sequelize';
import Category from '../models/Category.model';
import { Result, ok, fail } from '../../../types/result';
import { slugFromCategoryName } from '../utils/categorySlug';

export interface CategoryDto {
  id: string;
  empresaId: string;
  name: string;
  slug: string;
  description: string | null;
  parentId: string | null;
  parentName?: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CategoryTreeNode extends CategoryDto {
  children: CategoryTreeNode[];
}

export interface CreateCategoryInput {
  name: string;
  description?: string | null;
  parentId?: string | null;
  slug?: string | null;
}

export interface UpdateCategoryInput {
  name?: string;
  description?: string | null;
  parentId?: string | null;
  slug?: string | null;
  isActive?: boolean;
}

class CategoryDelegate {
  private toDto(row: Category): CategoryDto {
    const plain = row.get({ plain: true }) as Record<string, unknown>;
    return {
      id: String(plain.id ?? ''),
      empresaId: String(plain.empresaId ?? plain.empresa_id ?? ''),
      name: String(plain.name ?? ''),
      slug: String(plain.slug ?? ''),
      description: plain.description != null ? String(plain.description) : null,
      parentId:
        plain.parentId != null
          ? String(plain.parentId)
          : plain.parent_id != null
            ? String(plain.parent_id)
            : null,
      isActive: plain.isActive !== false && plain.is_active !== false,
      createdAt: plain.createdAt as Date,
      updatedAt: plain.updatedAt as Date,
    };
  }

  private async buildSlugBase(
    empresaId: string,
    name: string,
    parentId?: string | null,
    customSlug?: string | null
  ): Promise<string> {
    let base = slugFromCategoryName(customSlug?.trim() || name);
    if (parentId) {
      const parent = await this.getById(empresaId, parentId);
      if (parent) {
        const parentSlug = String(
          parent.getDataValue('slug') ??
            slugFromCategoryName(String(parent.getDataValue('name') ?? ''))
        );
        base = `${parentSlug}-${base}`;
      }
    }
    return base;
  }

  private async assertNameAvailable(
    empresaId: string,
    name: string,
    parentId: string | null,
    excludeId?: string
  ): Promise<Result<null>> {
    const existing = await Category.findOne({
      where: {
        empresaId,
        name,
        parentId,
        ...(excludeId ? { id: { [Op.ne]: excludeId } } : {}),
      },
    });
    if (existing) {
      return fail(
        parentId ? 'CATEGORY_NAME_TAKEN_SIBLING' : 'CATEGORY_NAME_TAKEN_ROOT'
      );
    }
    return ok(null);
  }

  private async ensureUniqueSlug(
    empresaId: string,
    baseSlug: string,
    excludeId?: string
  ): Promise<string> {
    let candidate = baseSlug;
    let n = 2;
    while (true) {
      const existing = await Category.findOne({
        where: {
          empresaId,
          slug: candidate,
          ...(excludeId ? { id: { [Op.ne]: excludeId } } : {}),
        },
      });
      if (!existing) return candidate;
      candidate = `${baseSlug}-${n}`;
      n += 1;
    }
  }

  private async getById(empresaId: string, id: string): Promise<Category | null> {
    return Category.findOne({ where: { id, empresaId } });
  }

  private async validateParent(
    empresaId: string,
    parentId: string | null | undefined,
    categoryId?: string
  ): Promise<Result<null>> {
    if (!parentId) return ok(null);

    const parent = await this.getById(empresaId, parentId);
    if (!parent) return fail('PARENT_CATEGORY_NOT_FOUND');
    if (categoryId && parentId === categoryId) return fail('CATEGORY_PARENT_CYCLE');

    const parentParentId = parent.getDataValue('parentId') as string | null | undefined;
    if (parentParentId) {
      return fail('CATEGORY_MAX_DEPTH_EXCEEDED');
    }

    if (categoryId) {
      const childIds = await Category.findAll({
        where: { empresaId, parentId: categoryId },
        attributes: ['id'],
      });
      if (childIds.some((c) => String(c.getDataValue('id')) === parentId)) {
        return fail('CATEGORY_PARENT_CYCLE');
      }
    }

    return ok(null);
  }

  async listFlat(empresaId: string): Promise<Result<CategoryDto[]>> {
    const rows = await Category.findAll({
      where: { empresaId },
      order: [
        ['parentId', 'ASC'],
        ['name', 'ASC'],
      ],
    });
    return ok(rows.map((r) => this.toDto(r)));
  }

  buildTree(rows: CategoryDto[], activeOnly = false): CategoryTreeNode[] {
    const filtered = activeOnly ? rows.filter((r) => r.isActive) : rows;
    const byParent = new Map<string | null, CategoryDto[]>();
    for (const row of filtered) {
      const key = row.parentId;
      const list = byParent.get(key) ?? [];
      list.push(row);
      byParent.set(key, list);
    }

    const attach = (parentId: string | null): CategoryTreeNode[] => {
      const nodes = byParent.get(parentId) ?? [];
      return nodes.map((n) => ({
        ...n,
        children: attach(n.id),
      }));
    };

    return attach(null);
  }

  async getTree(empresaId: string, activeOnly = false): Promise<Result<CategoryTreeNode[]>> {
    const flat = await this.listFlat(empresaId);
    if (!flat.success) return flat;
    return ok(this.buildTree(flat.value, activeOnly));
  }

  async getLeaves(empresaId: string, activeOnly = true): Promise<Result<CategoryDto[]>> {
    const flat = await this.listFlat(empresaId);
    if (!flat.success) return flat;

    const childCount = new Map<string, number>();
    for (const c of flat.value) {
      if (!c.parentId) continue;
      childCount.set(c.parentId, (childCount.get(c.parentId) ?? 0) + 1);
    }

    const byId = new Map(flat.value.map((c) => [c.id, c]));
    const leaves = flat.value
      .filter((c) => {
        if (activeOnly && !c.isActive) return false;
        return (childCount.get(c.id) ?? 0) === 0;
      })
      .map((c) => ({
        ...c,
        parentName: c.parentId ? (byId.get(c.parentId)?.name ?? null) : null,
      }));

    return ok(leaves);
  }

  async assertValidProductCategory(empresaId: string, categoryId: string): Promise<Result<CategoryDto>> {
    const category = await this.getById(empresaId, categoryId);
    if (!category) return fail('CATEGORY_NOT_FOUND');
    if (!category.getDataValue('isActive')) return fail('CATEGORY_INACTIVE');

    const childActive = await Category.count({
      where: { empresaId, parentId: categoryId, isActive: true },
    });
    if (childActive > 0) {
      return fail('CATEGORY_NOT_LEAF');
    }

    return ok(this.toDto(category));
  }

  async create(empresaId: string, input: CreateCategoryInput): Promise<Result<CategoryDto>> {
    const name = input.name?.trim() ?? '';
    if (!name) return fail('VALIDATION_ERROR: Category.name is required');

    const parentId = input.parentId ?? null;
    const parentCheck = await this.validateParent(empresaId, parentId);
    if (!parentCheck.success) return parentCheck;

    const nameCheck = await this.assertNameAvailable(empresaId, name, parentId);
    if (!nameCheck.success) return nameCheck;

    const baseSlug = await this.buildSlugBase(empresaId, name, parentId, input.slug);
    const slug = await this.ensureUniqueSlug(empresaId, baseSlug);

    try {
      const row = await Category.create({
        empresaId,
        name,
        slug,
        description: input.description?.trim() || null,
        parentId,
        isActive: true,
      });
      return ok(this.toDto(row));
    } catch (err) {
      if (err instanceof UniqueConstraintError) {
        const fields = err.errors.map((e) => e.path).join(',');
        if (fields.includes('name')) {
          return fail(parentId ? 'CATEGORY_NAME_TAKEN_SIBLING' : 'CATEGORY_NAME_TAKEN_ROOT');
        }
        if (fields.includes('slug')) return fail('SLUG_ALREADY_TAKEN');
      }
      throw err;
    }
  }

  async update(
    empresaId: string,
    id: string,
    input: UpdateCategoryInput
  ): Promise<Result<CategoryDto>> {
    const category = await this.getById(empresaId, id);
    if (!category) return fail('CATEGORY_NOT_FOUND');

    const patch: Record<string, unknown> = {};

    if (input.parentId !== undefined) {
      const parentCheck = await this.validateParent(empresaId, input.parentId, id);
      if (!parentCheck.success) return parentCheck;
      patch.parentId = input.parentId;
    }

    if (input.name !== undefined) {
      const name = input.name.trim();
      if (!name) return fail('VALIDATION_ERROR: Category.name is required');
      patch.name = name;
    }

    if (input.description !== undefined) {
      patch.description = input.description?.trim() || null;
    }

    if (input.isActive !== undefined) {
      patch.isActive = input.isActive;
    }

    const nextParentId =
      input.parentId !== undefined
        ? input.parentId
        : (category.getDataValue('parentId') as string | null);
    const nextName =
      input.name !== undefined ? (patch.name as string) : String(category.getDataValue('name') ?? '');

    if (input.name !== undefined || input.parentId !== undefined) {
      const nameCheck = await this.assertNameAvailable(
        empresaId,
        nextName.trim(),
        nextParentId ?? null,
        id
      );
      if (!nameCheck.success) return nameCheck;
    }

    if (input.slug !== undefined) {
      const baseSlug = await this.buildSlugBase(empresaId, nextName, nextParentId, input.slug);
      patch.slug = await this.ensureUniqueSlug(empresaId, baseSlug, id);
    } else if (input.name !== undefined || input.parentId !== undefined) {
      const baseSlug = await this.buildSlugBase(empresaId, nextName, nextParentId, null);
      patch.slug = await this.ensureUniqueSlug(empresaId, baseSlug, id);
    }

    if (Object.keys(patch).length === 0) {
      return fail('VALIDATION_ERROR: no fields to update');
    }

    await category.update(patch);

    if (input.isActive === false) {
      await Category.update(
        { isActive: false },
        { where: { empresaId, parentId: id } }
      );
    }

    await category.reload();
    return ok(this.toDto(category));
  }

  async deactivate(empresaId: string, id: string): Promise<Result<{ category: CategoryDto }>> {
    const category = await this.getById(empresaId, id);
    if (!category) return fail('CATEGORY_NOT_FOUND');

    const activeChildren = await Category.count({
      where: { empresaId, parentId: id, isActive: true },
    });
    if (activeChildren > 0) {
      await Category.update({ isActive: false }, { where: { empresaId, parentId: id } });
    }

    await category.update({ isActive: false });
    await category.reload();
    return ok({ category: this.toDto(category) });
  }

  async restore(empresaId: string, id: string): Promise<Result<CategoryDto>> {
    const category = await this.getById(empresaId, id);
    if (!category) return fail('CATEGORY_NOT_FOUND');

    const parentId = category.getDataValue('parentId') as string | null;
    if (parentId) {
      const parent = await this.getById(empresaId, parentId);
      if (!parent || !parent.getDataValue('isActive')) {
        return fail('PARENT_CATEGORY_INACTIVE');
      }
    }

    await category.update({ isActive: true });
    await category.reload();
    return ok(this.toDto(category));
  }
}

export default new CategoryDelegate();
