'use client';

import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { useAuthStore } from '@/store/auth';
import { useBranchStore } from '@/store/branch';
import { api, ApiError } from '@/core/api/api-client';
import {
  extractList,
  fetchProductsForBranch,
  normalizeCategory,
  normalizeSupplier,
  unwrapApiEnvelope,
} from '@/core/api/normalizers';
import { Category, Product, Supplier } from '@/core/interfaces';
import { DashboardLayout } from '@/components/molecules/DashboardLayout';
import { SidebarMenu } from '@/components/organisms/SidebarMenu';
import { Navbar } from '@/components/organisms/Navbar';
import { SearchInput } from '@/components/molecules/SearchInput';
import { StatusBadge } from '@/components/atoms/StatusBadge';
import { TableActions } from '@/components/molecules/TableActions';
import { ConfirmActionModal } from '@/components/molecules/ConfirmActionModal';
import { notifyApiError, notifySuccess } from '@/store/ui';
import {
  applyDecimalInput,
  applyDigitsOnlyInput,
  INVALID_NUMERIC_INPUT_MESSAGE,
  parseNonNegativeInt,
  parsePositiveDecimal,
} from '@/core/utils/numeric-input';






















export default function ProductsPage() {

  const currentUser = useAuthStore((state) => state.user);
  const branchId = useBranchStore((state) => state.selectedBranchId);
  const activeBranchName = useBranchStore((state) => state.activeBranchLabel);

const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Modal: Nuevo producto
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    name: '',
    sku: '',
    categoryId: '',
    supplierId: '',
    price: '',
    cost: '',
    stock: '',
    minStock: '0',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Edición rápida de inventario (cantidad) por sucursal activa
  const [quickStockDraft, setQuickStockDraft] = useState<Record<string, string>>({});
  const [quickMinStockDraft, setQuickMinStockDraft] = useState<Record<string, string>>({});
  const [quickNumericWarning, setQuickNumericWarning] = useState<string | null>(null);
  const [formNumericWarning, setFormNumericWarning] = useState<string | null>(null);
  const [quickSavingId, setQuickSavingId] = useState<string | null>(null);
  const [quickSearchTerm, setQuickSearchTerm] = useState('');
  const [quickCategoryFilter, setQuickCategoryFilter] = useState('all');
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    variant: 'primary' | 'danger';
    action: null | (() => Promise<void>);
  }>({
    open: false,
    title: '',
    message: '',
    confirmLabel: 'Confirmar',
    variant: 'primary',
    action: null,
  });
  const [onlyAssignedToBranch, setOnlyAssignedToBranch] = useState(false);
  const isActionLocked = isSaving || isConfirming || !!confirmModal.open;

  const filteredProducts = useMemo(() => {
    const isAssignedToActiveBranch = (product: Product) =>
      Boolean(product.stockRecordId) ||
      product.inBranch === true ||
      Number(product.stock ?? 0) > 0 ||
      Number(product.minStock ?? 0) > 0;

    const source = onlyAssignedToBranch
      ? products.filter((p) => isAssignedToActiveBranch(p))
      : products;

    if (!searchTerm.trim()) return source;

    const lowerQuery = searchTerm.toLowerCase();
    return source.filter((product) =>
      [product.name, product.sku, product.category, product.description]
        .join(' ')
        .toLowerCase()
        .includes(lowerQuery)
    );
  }, [products, searchTerm, onlyAssignedToBranch]);

  const suggestedSku = useMemo(() => {
    const normalizedBranch = activeBranchName
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .toUpperCase();
    const prefix = `PROD-${normalizedBranch || 'SUCURSAL'}-`;
    const suffixes = products
      .map((p) => p.sku)
      .filter((sku) => sku.startsWith(prefix))
      .map((sku) => Number(sku.slice(prefix.length)))
      .filter((n) => Number.isFinite(n));
    const next = String((suffixes.length ? Math.max(...suffixes) : 0) + 1).padStart(2, '0');
    return `${prefix}${next}`;
  }, [activeBranchName, products]);

  const handleInputChange = (field: string, value: string) => {
    if (field === 'stock' || field === 'minStock') {
      const { value: next, hadInvalid } = applyDigitsOnlyInput(value);
      setFormNumericWarning(hadInvalid ? INVALID_NUMERIC_INPUT_MESSAGE : null);
      setForm((current) => ({ ...current, [field]: next }));
      return;
    }
    if (field === 'price' || field === 'cost') {
      const { value: next, hadInvalid } = applyDecimalInput(value);
      setFormNumericWarning(hadInvalid ? INVALID_NUMERIC_INPUT_MESSAGE : null);
      setForm((current) => ({ ...current, [field]: next }));
      return;
    }
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleQuickDigitsChange = (
    raw: string,
    setter: Dispatch<SetStateAction<Record<string, string>>>,
    productId: string
  ) => {
    const { value, hadInvalid } = applyDigitsOnlyInput(raw);
    if (hadInvalid) {
      setQuickNumericWarning(INVALID_NUMERIC_INPUT_MESSAGE);
    } else {
      setQuickNumericWarning(null);
    }
    setter((d) => ({ ...d, [productId]: value }));
  };

  useEffect(() => {
    // Carga de metadatos para el alta de productos (categorías / proveedores).
    const loadCatalogMeta = async () => {
      try {
        const [categoriesRes, suppliersRes] = await Promise.all([api.getCategories(), api.getSuppliers()]);

        const categoryRows = extractList<Record<string, unknown>>(
          unwrapApiEnvelope(categoriesRes.data),
          ['categories']
        );
        const supplierRows = extractList<Record<string, unknown>>(
          unwrapApiEnvelope(suppliersRes.data),
          ['suppliers']
        );

        const loadedCategories = categoryRows.map((row) => normalizeCategory(row));
        const loadedSuppliers = supplierRows.map((row) => normalizeSupplier(row));

        setCategories(loadedCategories);
        setSuppliers(loadedSuppliers);

        setForm((c) => ({
          ...c,
          categoryId: c.categoryId || loadedCategories[0]?.id || '',
          supplierId: c.supplierId || loadedSuppliers[0]?.id || '',
        }));
      } catch {
        // No bloquea el módulo: si falla, el select quedará vacío.
      }
    };

    loadCatalogMeta();
  }, []);

  useEffect(() => {
    const loadProducts = async () => {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const catalog = await fetchProductsForBranch(
          branchId,
          () => api.getProductsByBranch(branchId),
          (id) => api.getInventoryByBranch(id)
        );
        setProducts(catalog);
      } catch (error) {
        const { displayMessage } = notifyApiError('products.list', error, { toast: false });
        setErrorMessage(displayMessage);
      } finally {
        setIsLoading(false);
      }
    };

    loadProducts();
  }, [branchId]);

  const reloadProducts = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const catalog = await fetchProductsForBranch(
        branchId,
        () => api.getProductsByBranch(branchId),
        (id) => api.getInventoryByBranch(id)
      );
      setProducts(catalog);
    } catch (error) {
      const { displayMessage } = notifyApiError('products.list', error, { toast: false });
      setErrorMessage(displayMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const productHasStockInBranch = (product: Product) =>
    Boolean(product.stockRecordId) || product.inBranch === true;

  const openEditProduct = (product: Product) => {
    setEditingProduct(product);
    setSelectedProduct(product);
    setSuccessMessage(null);
    setFormNumericWarning(null);
    setForm({
      name: product.name ?? '',
      sku: product.sku ?? '',
      categoryId: '',
      supplierId: '',
      price: String(product.price ?? ''),
      cost: String(product.cost ?? ''),
      stock: '0',
      minStock: String(product.minStock ?? 0),
    });
    setShowModal(true);
  };

  // Upsert del stock en la sucursal activa: si existe actualiza, si no existe crea la fila.
  // Esto evita errores cuando `stockRecordId/inBranch` viene incompleto desde la API.
  const saveBranchInventory = async (productId: string, currentStock = 0) => {
    if (!productId?.trim()) {
      throw new Error('No se pudo actualizar inventario: productId inválido.');
    }
    const stockDeltaNum = parseNonNegativeInt(form.stock);
    const minStockNum = parseNonNegativeInt(form.minStock);

    if (stockDeltaNum === null) {
      throw new Error('El ingreso de stock debe ser un número mayor o igual a 0.');
    }
    if (minStockNum === null) {
      throw new Error('El stock mínimo debe ser un número mayor o igual a 0.');
    }

    await api.updateStock({
      productId,
      quantity: Number(currentStock) + stockDeltaNum,
      minStock: minStockNum,
    });
  };

  const handleUpdateProduct = async () => {
    if (!editingProduct) return;
    if (!form.name.trim()) return;

    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await api.updateProduct(editingProduct.id, { name: form.name.trim() });
      await saveBranchInventory(editingProduct.id, Number(editingProduct.stock ?? 0));

      await reloadProducts();
      setSuccessMessage('Producto actualizado. El ingreso de stock se sumó al inventario actual.');
      notifySuccess('Producto actualizado');
      setShowModal(false);
      setEditingProduct(null);
    } catch (error) {
      if (error instanceof Error && !(error as ApiError).status) {
        setErrorMessage(error.message);
        return;
      }
      const { displayMessage } = notifyApiError('products.save', error);
      setErrorMessage(displayMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    try {
      await api.deleteProduct(productId);
      await reloadProducts();
      setErrorMessage(null);
      notifySuccess('Producto eliminado');
    } catch (error) {
      const { displayMessage } = notifyApiError('products.delete', error);
      setErrorMessage(displayMessage);
    }
  };

  const handleCreateProduct = async () => {
    const name = form.name?.trim();
    const sku = form.sku?.trim();
    const categoryId = form.categoryId?.trim();
    const supplierId = form.supplierId?.trim();
    const priceNum = parsePositiveDecimal(form.price);
    const stockNum = parseNonNegativeInt(form.stock);

    if (!name || !sku || !categoryId || !supplierId) return;
    if (priceNum === null) {
      setErrorMessage('El precio debe ser un número mayor a 0 (sin símbolos como $).');
      return;
    }
    if (stockNum === null) {
      setErrorMessage('El stock inicial debe ser un número mayor o igual a 0.');
      return;
    }

    const minStockNum = parseNonNegativeInt(form.minStock);

    const payload = {
      name,
      sku,
      categoryId,
      supplierId,
      price: priceNum,
      initialStock: stockNum,
      minStock: minStockNum ?? 0,
    };

    setIsSaving(true);
    setErrorMessage(null);

    try {
      await api.createProduct(payload);

      await reloadProducts();
      setShowModal(false);
      setEditingProduct(null);
      setForm({
        name: '',
        sku: '',
        categoryId: '',
        supplierId: '',
        price: '',
        cost: '',
        stock: '',
        minStock: '0',
      });
      setSuccessMessage('Producto creado con stock inicial en la sucursal activa.');
      setErrorMessage(null);
      notifySuccess('Producto creado');
    } catch (error) {
      const { displayMessage } = notifyApiError('products.save', error);
      setErrorMessage(displayMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
  };

  const askConfirmation = (
    title: string,
    message: string,
    confirmLabel: string,
    variant: 'primary' | 'danger',
    action: () => Promise<void>
  ) => {
    setConfirmModal({ open: true, title, message, confirmLabel, variant, action });
  };

  const handleConfirmAction = async () => {
    if (!confirmModal.action) return;
    try {
      setIsConfirming(true);
      await confirmModal.action();
    } finally {
      setIsConfirming(false);
      setConfirmModal((m) => ({ ...m, open: false, action: null }));
    }
  };

  const quickStockProducts = useMemo(() => {
    const source = onlyAssignedToBranch
      ? products.filter((p) => productHasStockInBranch(p))
      : products;

    const q = quickSearchTerm.trim().toLowerCase();
    return source.filter((p) => {
      const categoryOk = quickCategoryFilter === 'all' || p.category === quickCategoryFilter;
      if (!categoryOk) return false;
      if (!q) return true;
      return [p.name, p.sku, p.category, p.description].join(' ').toLowerCase().includes(q);
    });
  }, [products, onlyAssignedToBranch, quickSearchTerm, quickCategoryFilter]);

  const saveQuickStock = async (product: Product) => {
    if (!product.id?.trim()) {
      setErrorMessage('No se pudo actualizar inventario: productId inválido.');
      return;
    }
    const rawQty = quickStockDraft[product.id] ?? '0';
    const rawMin = quickMinStockDraft[product.id] ?? String(product.minStock ?? 0);
    const quantityDelta = parseNonNegativeInt(rawQty);
    const minStock = parseNonNegativeInt(rawMin);

    if (quantityDelta === null) {
      setErrorMessage('El ingreso de stock debe ser un número mayor o igual a 0.');
      return;
    }
    if (minStock === null) {
      setErrorMessage('El stock mínimo debe ser un número mayor o igual a 0.');
      return;
    }

    try {
      setQuickSavingId(product.id);
      setErrorMessage(null);
      setSuccessMessage(null);
      await api.updateStock({
        productId: product.id,
        quantity: Number(product.stock ?? 0) + quantityDelta,
        minStock,
      });
      await reloadProducts();
      setQuickStockDraft((d) => {
        const next = { ...d };
        delete next[product.id];
        return next;
      });
      setQuickMinStockDraft((d) => {
        const next = { ...d };
        delete next[product.id];
        return next;
      });
      setSuccessMessage('Ingreso aplicado. El stock se sumó correctamente.');
      notifySuccess('Stock actualizado');
    } catch (error) {
      const { displayMessage } = notifyApiError('products.stock', error);
      setErrorMessage(displayMessage);
    } finally {
      setQuickSavingId(null);
    }
  };

  return (
    <DashboardLayout sidebar={<SidebarMenu />} header={<Navbar />}>
      <div className="min-h-screen bg-slate-950 text-slate-100 px-4 py-6 sm:px-6 lg:px-8 overflow-x-hidden">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Productos</p>
              <h1 className="mt-3 text-3xl font-semibold text-white">Mantenedor de productos</h1>
              <p className="mt-2 max-w-2xl text-slate-400">
                Catálogo e inventario por sucursal (selector en la barra superior). Stock según sucursal activa.
              </p>
              <p className="mt-1 text-sm text-slate-500">Sucursal: {activeBranchName}</p>
              {currentUser && (
                <p className="mt-3 text-sm text-slate-500">Sesión iniciada como: {currentUser.name}</p>
              )}
              {errorMessage && (
                <p className="mt-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                  {errorMessage}
                </p>
              )}
              {successMessage && (
                <p className="mt-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                  {successMessage}
                </p>
              )}
              {isLoading && <p className="mt-3 text-sm text-slate-500">Cargando productos desde BFF...</p>}
            </div>

            <button
              onClick={() => {
                setEditingProduct(null);
                setForm({
                  name: '',
                  sku: suggestedSku,
                  categoryId: categories[0]?.id ?? '',
                  supplierId: suppliers[0]?.id ?? '',
                  price: '',
                  cost: '',
                  stock: '',
                  minStock: '0',
                });
                setSuccessMessage(null);
                setFormNumericWarning(null);
                setShowModal(true);
              }}
              disabled={isActionLocked}
              className="inline-flex items-center justify-center rounded-3xl bg-sky-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              + Nuevo producto
            </button>
          </div>

          <div className="grid w-full grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,0.9fr)]">
            <section className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 shadow-lg">
              <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-white">Inventario de productos</h2>
                  <p className="text-sm text-slate-400">Busca, filtra y actualiza los productos.</p>
                </div>
                <div className="w-full md:w-[420px]">
                  <label className="mb-2 flex items-center gap-2 text-xs text-slate-400">
                    <input
                      type="checkbox"
                      checked={onlyAssignedToBranch}
                      onChange={(e) => setOnlyAssignedToBranch(e.target.checked)}
                      className="rounded border-slate-600"
                    />
                    Mostrar solo productos asignados a la sucursal activa
                  </label>
                  <SearchInput
                    placeholder="Buscar por nombre, SKU o categoría"
                    items={filteredProducts}
                    searchKeys={['name', 'sku', 'category', 'description']}
                    onSearch={handleSearch}
                    onSelect={(product) => setSelectedProduct(product)}
                    renderItem={(product) => (
                      <div>
                        <span className="font-medium">{product.name}</span>
                        <div className="text-xs text-slate-400">
                          {product.sku} · {product.category}
                        </div>
                      </div>
                    )}
                  />
                </div>
              </div>

              {selectedProduct && (
                <div className="mb-6 rounded-3xl border border-slate-800 bg-slate-950 p-4">
                  <p className="text-sm text-slate-400">Producto seleccionado</p>
                  <h3 className="mt-2 text-lg font-semibold text-white">{selectedProduct.name}</h3>
                  <p className="text-sm text-slate-400">
                    {selectedProduct.sku} · {selectedProduct.category}
                  </p>
                </div>
              )}

              <div className="rounded-3xl border border-slate-800 overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-800 text-left text-sm">
                  <thead className="bg-slate-950/80 text-slate-400">
                    <tr>
                      <th className="px-6 py-4">Producto</th>
                      <th className="px-6 py-4">SKU</th>
                      <th className="px-6 py-4">Categoría</th>
                      <th className="px-6 py-4">Stock</th>
                      <th className="px-6 py-4">Mínimo</th>
                      <th className="px-6 py-4">Precio</th>
                      <th className="px-6 py-4">Estado</th>
                      <th className="px-6 py-4">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 bg-slate-900">
                    {filteredProducts.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-6 py-8 text-center text-slate-500">
                          No se encontraron productos.
                        </td>
                      </tr>
                    ) : (
                      filteredProducts.map((product) => (
                        <tr key={product.id} className="hover:bg-slate-950/80 transition">
                          <td className="px-6 py-5">
                            <p className="font-semibold text-white">{product.name}</p>
                            <p className="text-xs text-slate-500">{product.description}</p>
                            {!productHasStockInBranch(product) && (
                              <p className="mt-1 text-xs text-amber-400">Sin fila en esta sucursal</p>
                            )}
                          </td>
                          <td className="px-6 py-5 text-slate-300">{product.sku}</td>
                          <td className="px-6 py-5 text-slate-300">{product.category}</td>
                          <td className="px-6 py-5 text-slate-300">{product.stock ?? 0}</td>
                          <td className="px-6 py-5 text-slate-300">{product.minStock ?? 0}</td>
                          <td className="px-6 py-5 text-slate-300">${product.price}</td>
                          <td className="px-6 py-5">
                            <StatusBadge active={product.isActive} />
                          </td>
                          <td className="px-6 py-5">
                            <TableActions
                              disabled={isActionLocked}
                              onEdit={() => openEditProduct(product)}
                              onDelete={() =>
                                askConfirmation(
                                  'Eliminar producto',
                                  '¿Deseas eliminar este producto? Esta acción no se puede deshacer.',
                                  'Eliminar',
                                  'danger',
                                  () => handleDeleteProduct(product.id)
                                )
                              }
                            />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mt-6 rounded-3xl border border-slate-800 bg-slate-950/60 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-base font-semibold text-white">Edición rápida de stock</h3>
                    <p className="mt-1 text-sm text-slate-400">
                      Registra ingresos de stock en la sucursal activa (se suman al stock actual).
                    </p>
                    {quickNumericWarning && (
                      <p className="mt-2 text-xs text-rose-300">{quickNumericWarning}</p>
                    )}
                  </div>
                  <span className="rounded-full bg-slate-900 px-3 py-1 text-xs text-slate-400">
                    Sucursal: {activeBranchName}
                  </span>
                </div>

                <div className="mt-4 overflow-x-auto">
                  <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center">
                    <input
                      type="text"
                      value={quickSearchTerm}
                      onChange={(e) => setQuickSearchTerm(e.target.value)}
                      placeholder="Buscar por nombre, SKU o categoría"
                      className="w-full rounded-2xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500 md:max-w-sm"
                    />
                    <select
                      value={quickCategoryFilter}
                      onChange={(e) => setQuickCategoryFilter(e.target.value)}
                      className="rounded-2xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500 md:w-64"
                    >
                      <option value="all">Todas las categorías</option>
                      {Array.from(new Set(products.map((p) => p.category).filter(Boolean))).map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                    <span className="text-xs text-slate-500">{quickStockProducts.length} producto(s)</span>
                  </div>
                  <table className="min-w-full divide-y divide-slate-800 text-left text-sm">
                    <thead className="bg-slate-950/80 text-slate-400">
                      <tr>
                        <th className="px-4 py-3">Producto</th>
                        <th className="px-4 py-3">SKU</th>
                        <th className="px-4 py-3">Stock actual</th>
                        <th className="px-4 py-3">Mín. actual</th>
                        <th className="px-4 py-3">Ingreso stock</th>
                        <th className="px-4 py-3">Nuevo mín.</th>
                        <th className="px-4 py-3">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 bg-slate-900/60">
                      {quickStockProducts.slice(0, 50).map((p) => {
                        const draft = quickStockDraft[p.id];
                        const minDraft = quickMinStockDraft[p.id];
                        return (
                          <tr key={p.id} className="hover:bg-slate-950/80 transition">
                            <td className="px-4 py-3">
                              <p className="font-semibold text-white truncate max-w-[180px]">{p.name}</p>
                            </td>
                            <td className="px-4 py-3 text-slate-300">{p.sku}</td>
                            <td className="px-4 py-3 text-slate-300">{p.stock ?? 0}</td>
                            <td className="px-4 py-3 text-slate-300">{p.minStock ?? 0}</td>
                            <td className="px-4 py-3">
                              <input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                className="w-28 rounded-2xl border border-slate-800 bg-slate-900 px-3 py-2 text-white outline-none focus:border-emerald-500"
                                value={draft ?? '0'}
                                onChange={(e) =>
                                  handleQuickDigitsChange(e.target.value, setQuickStockDraft, p.id)
                                }
                              />
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                className="w-24 rounded-2xl border border-slate-800 bg-slate-900 px-3 py-2 text-white outline-none focus:border-emerald-500"
                                value={minDraft ?? String(p.minStock ?? 0)}
                                onChange={(e) =>
                                  handleQuickDigitsChange(e.target.value, setQuickMinStockDraft, p.id)
                                }
                              />
                            </td>
                            <td className="px-4 py-3">
                              <button
                                type="button"
                                disabled={quickSavingId === p.id}
                                onClick={() =>
                                  askConfirmation(
                                    'Aplicar cambio de stock',
                                    `¿Confirmas el ingreso de stock para "${p.name}" en la sucursal activa?`,
                                    'Aplicar',
                                    'primary',
                                    () => saveQuickStock(p)
                                  )
                                }
                                className="rounded-2xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                              >
                                {quickSavingId === p.id ? 'Guardando…' : 'Guardar'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {quickStockProducts.length > 50 && (
                        <tr>
                          <td colSpan={7} className="px-4 py-4 text-center text-xs text-slate-500">
                            Mostrando primeros 50 productos por rendimiento. Usa los filtros para acotar más.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            <aside className="space-y-6">
              <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 shadow-lg">
                <p className="text-sm uppercase tracking-[0.28em] text-slate-500">Información</p>
                <p className="mt-4 text-slate-400 text-sm leading-6">
                  En este mantenedor puedes revisar todos los productos, buscar por SKU o categoría y agregar nuevos registros.
                </p>
              </div>

              <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 shadow-lg">
                <p className="text-sm uppercase tracking-[0.28em] text-slate-500">Resumen rápido</p>
                <div className="mt-4 space-y-3 text-slate-300">
                  <div className="rounded-3xl bg-slate-950/80 p-4">
                    <p className="text-sm">Productos totales</p>
                    <p className="mt-1 text-2xl font-semibold text-white">{products.length}</p>
                  </div>
                  <div className="rounded-3xl bg-slate-950/80 p-4">
                    <p className="text-sm">Producto activo</p>
                    <p className="mt-1 text-2xl font-semibold text-white">{filteredProducts.length}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 shadow-lg">
                <p className="text-sm uppercase tracking-[0.28em] text-slate-500">Mermas / Shrinkage</p>
                <p className="mt-4 text-slate-400 text-sm leading-6">
                  Registra mermas por producto para mantener el inventario consistente.
                </p>
              </div>
            </aside>
          </div>
        </div>
      </div>

      {showModal && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
          <div className="w-full max-w-2xl rounded-[2rem] bg-slate-950 border border-slate-800 p-8 shadow-2xl">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-slate-500">
                  {editingProduct ? 'Editar producto' : 'Nuevo producto'}
                </p>
                <h2 className="mt-3 text-2xl font-semibold text-white">
                  {editingProduct ? 'Actualizar producto' : 'Agregar producto al catálogo'}
                </h2>
              </div>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingProduct(null);
                }}
                className="rounded-full bg-slate-900/80 px-4 py-2 text-slate-300 hover:bg-slate-800 transition"
              >
                ✕
              </button>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <label className="block text-sm text-slate-300">
                Nombre
                <input
                  value={form.name}
                  onChange={(event) => handleInputChange('name', event.target.value)}
                  className="mt-2 w-full rounded-3xl border border-slate-800 bg-slate-900 px-4 py-3 text-white outline-none focus:border-sky-500"
                  placeholder="Nombre del producto"
                />
              </label>
              <label className="block text-sm text-slate-300">
                SKU
                <input
                  value={form.sku}
                  onChange={(event) => handleInputChange('sku', event.target.value)}
                  className="mt-2 w-full rounded-3xl border border-slate-800 bg-slate-900 px-4 py-3 text-white outline-none focus:border-sky-500"
                  placeholder={suggestedSku}
                />
                {!editingProduct && (
                  <p className="mt-2 text-xs text-slate-500">Sugerido: {suggestedSku}</p>
                )}
              </label>
              <label className="block text-sm text-slate-300">
                Categoría
                <select
                  value={form.categoryId}
                  onChange={(event) => handleInputChange('categoryId', event.target.value)}
                  disabled={!!editingProduct || categories.length === 0}
                  className="mt-2 w-full rounded-3xl border border-slate-800 bg-slate-900 px-4 py-3 text-white outline-none focus:border-sky-500"
                >
                  {categories.length === 0 ? (
                    <option value="">Cargando...</option>
                  ) : (
                    categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))
                  )}
                </select>
              </label>
              <label className="block text-sm text-slate-300">
                Proveedor
                <select
                  value={form.supplierId}
                  onChange={(event) => handleInputChange('supplierId', event.target.value)}
                  disabled={!!editingProduct || suppliers.length === 0}
                  className="mt-2 w-full rounded-3xl border border-slate-800 bg-slate-900 px-4 py-3 text-white outline-none focus:border-sky-500"
                >
                  {suppliers.length === 0 ? (
                    <option value="">Cargando...</option>
                  ) : (
                    suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))
                  )}
                </select>
              </label>
              <label className="block text-sm text-slate-300">
                Precio
                <input
                  value={form.price}
                  onChange={(event) => handleInputChange('price', event.target.value)}
                  className="mt-2 w-full rounded-3xl border border-slate-800 bg-slate-900 px-4 py-3 text-white outline-none focus:border-sky-500"
                  placeholder="Precio de venta"
                  type="text"
                  inputMode="decimal"
                />
              </label>
              <label className="block text-sm text-slate-300">
                Costo
                <input
                  value={form.cost}
                  onChange={(event) => handleInputChange('cost', event.target.value)}
                  className="mt-2 w-full rounded-3xl border border-slate-800 bg-slate-900 px-4 py-3 text-white outline-none focus:border-sky-500"
                  placeholder="Costo"
                  type="text"
                  inputMode="decimal"
                />
              </label>
            </div>

            <div className="mt-6 rounded-3xl border border-emerald-500/30 bg-emerald-500/5 p-5 md:col-span-2">
              <p className="text-xs uppercase tracking-[0.28em] text-emerald-400/90">Inventario por sucursal</p>
              <h3 className="mt-2 text-lg font-semibold text-white">{activeBranchName}</h3>
              <p className="mt-1 text-sm text-slate-400">
                {editingProduct
                  ? productHasStockInBranch(editingProduct)
                    ? 'Registra ingreso de stock en esta sucursal (se suma al stock actual, no modifica el catálogo global).'
                    : 'Este producto aún no está habilitado en la sucursal. Ingresa cantidad para crear el registro de inventario.'
                  : 'Al crear el producto se registrará el stock inicial en la sucursal activa.'}
              </p>
              {formNumericWarning && (
                <p className="mt-2 text-xs text-rose-300">{formNumericWarning}</p>
              )}

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="block text-sm text-slate-300">
                  {editingProduct ? 'Ingreso de stock' : 'Stock inicial'}
                  <input
                    value={form.stock}
                    onChange={(event) => handleInputChange('stock', event.target.value)}
                    className="mt-2 w-full rounded-3xl border border-slate-800 bg-slate-900 px-4 py-3 text-white outline-none focus:border-emerald-500"
                    placeholder="0"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                  />
                </label>
                <label className="block text-sm text-slate-300">
                  Stock mínimo (alerta)
                  <input
                    value={form.minStock}
                    onChange={(event) => handleInputChange('minStock', event.target.value)}
                    className="mt-2 w-full rounded-3xl border border-slate-800 bg-slate-900 px-4 py-3 text-white outline-none focus:border-emerald-500"
                    placeholder="0"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                  />
                </label>
              </div>

              {editingProduct && (
                <p className="mt-3 text-xs text-slate-500">
                  Stock actual en sistema: {editingProduct.stock ?? 0} unidades
                </p>
              )}
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                onClick={() => setShowModal(false)}
                disabled={isSaving || isConfirming}
                className="rounded-3xl border border-slate-700 px-6 py-3 text-sm text-slate-300 hover:bg-slate-800 transition disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={() =>
                  askConfirmation(
                    editingProduct ? 'Guardar cambios del producto' : 'Crear producto',
                    editingProduct
                      ? '¿Confirmas la modificación del producto y su inventario de sucursal?'
                      : '¿Confirmas la creación de este producto con su stock inicial?',
                    editingProduct ? 'Guardar cambios' : 'Crear producto',
                    'primary',
                    editingProduct ? handleUpdateProduct : handleCreateProduct
                  )
                }
                disabled={isSaving || isConfirming}
                className="rounded-3xl bg-sky-600 px-6 py-3 text-sm font-semibold text-white hover:bg-sky-500 transition disabled:opacity-50"
              >
                {isSaving
                  ? 'Guardando…'
                  : editingProduct
                    ? 'Guardar producto e inventario'
                    : 'Guardar producto'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmActionModal
        open={confirmModal.open}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmLabel={confirmModal.confirmLabel}
        variant={confirmModal.variant}
        isProcessing={isConfirming}
        onCancel={() => setConfirmModal((m) => ({ ...m, open: false, action: null }))}
        onConfirm={handleConfirmAction}
      />

    </DashboardLayout>
  );
}

