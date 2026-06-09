'use client';

import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { paginateList, TablePagination } from '@/components/molecules/TablePagination';
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
import { AppPageContent } from '@/components/molecules/AppPageContent';
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
  const [modalError, setModalError] = useState<string | null>(null);
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
    action: null | (() => Promise<boolean>);
  }>({
    open: false,
    title: '',
    message: '',
    confirmLabel: 'Confirmar',
    variant: 'primary',
    action: null,
  });
  const [onlyAssignedToBranch, setOnlyAssignedToBranch] = useState(false);
  const [productPage, setProductPage] = useState(1);
  const [stockPage, setStockPage] = useState(1);
  const isActionLocked = isSaving || isConfirming || !!confirmModal.open;

  const PRODUCT_PAGE_SIZE = 10;
  const STOCK_PAGE_SIZE = 5;

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

  const paginatedProducts = useMemo(
    () => paginateList(filteredProducts, productPage, PRODUCT_PAGE_SIZE),
    [filteredProducts, productPage]
  );

  useEffect(() => {
    setProductPage(1);
  }, [searchTerm, onlyAssignedToBranch]);

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
        const [categoriesRes, suppliersRes] = await Promise.all([
          api.getCategoryLeaves(),
          api.getSuppliers(),
        ]);

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
      } catch (error) {
        const { displayMessage } = notifyApiError('categories.list', error, { toast: true });
        setErrorMessage(displayMessage);
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

  const resolveProductCategoryId = (product: Product) => {
    if (product.categoryId) return product.categoryId;
    const match = categories.find(
      (c) =>
        c.name === product.category ||
        (c.parentName ? `${c.parentName} → ${c.name}` : c.name) === product.category
    );
    return match?.id ?? '';
  };

  const openEditProduct = (product: Product) => {
    setEditingProduct(product);
    setSelectedProduct(product);
    setSuccessMessage(null);
    setModalError(null);
    setFormNumericWarning(null);
    setForm({
      name: product.name ?? '',
      sku: product.sku ?? '',
      categoryId: resolveProductCategoryId(product),
      supplierId: product.supplierId ?? suppliers[0]?.id ?? '',
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

  const setFormFeedback = (message: string | null) => {
    setErrorMessage(message);
    setModalError(message);
  };

  const validateProductForm = (): string | null => {
    if (!branchId?.trim()) {
      return 'Selecciona una sucursal activa en el menú superior antes de guardar.';
    }
    if (!form.name.trim()) {
      return 'Ingresa el nombre del producto.';
    }
    if (editingProduct) {
      if (!form.sku.trim()) return 'Ingresa el SKU del producto.';
      if (!form.categoryId.trim()) {
        return 'Selecciona una subcategoría (hoja). Si no hay opciones, créala en Categorías.';
      }
      if (!form.supplierId.trim()) {
        return 'Selecciona un proveedor. Si no hay opciones, créalo en Proveedores.';
      }
      if (parsePositiveDecimal(form.price) === null) {
        return 'El precio debe ser un número mayor a 0 (sin símbolos como $).';
      }
      const stockDeltaNum = parseNonNegativeInt(form.stock);
      if (stockDeltaNum === null) {
        return 'El ingreso de stock debe ser un número mayor o igual a 0.';
      }
      const minStockNum = parseNonNegativeInt(form.minStock);
      if (minStockNum === null) {
        return 'El stock mínimo debe ser un número mayor o igual a 0.';
      }
      return null;
    }

    if (!form.sku.trim()) return 'Ingresa el SKU del producto.';
    if (!form.categoryId.trim()) {
      return 'Selecciona una subcategoría (hoja). Si no hay opciones, créala en Categorías.';
    }
    if (!form.supplierId.trim()) {
      return 'Selecciona un proveedor. Si no hay opciones, créalo en Proveedores.';
    }
    if (parsePositiveDecimal(form.price) === null) {
      return 'El precio debe ser un número mayor a 0 (sin símbolos como $).';
    }
    if (parseNonNegativeInt(form.stock) === null) {
      return 'El stock inicial debe ser un número mayor o igual a 0.';
    }
    if (parseNonNegativeInt(form.minStock) === null) {
      return 'El stock mínimo debe ser un número mayor o igual a 0.';
    }
    return null;
  };

  const requestSaveProduct = () => {
    const validationError = validateProductForm();
    if (validationError) {
      setFormFeedback(validationError);
      return;
    }
    setFormFeedback(null);
    askConfirmation(
      editingProduct ? 'Guardar cambios del producto' : 'Crear producto',
      editingProduct
        ? '¿Confirmas la modificación del producto y su inventario de sucursal?'
        : '¿Confirmas la creación de este producto con su stock inicial?',
      editingProduct ? 'Guardar cambios' : 'Crear producto',
      'primary',
      editingProduct ? handleUpdateProduct : handleCreateProduct
    );
  };

  const handleUpdateProduct = async (): Promise<boolean> => {
    if (!editingProduct) return false;

    setIsSaving(true);
    setFormFeedback(null);
    setSuccessMessage(null);

    try {
      const priceNum = parsePositiveDecimal(form.price)!;
      const costNum = parsePositiveDecimal(form.cost) ?? Number(editingProduct.cost ?? 0);

      await api.updateProduct(editingProduct.id, {
        name: form.name.trim(),
        sku: form.sku.trim(),
        categoryId: form.categoryId.trim(),
        supplierId: form.supplierId.trim(),
        price: priceNum,
        cost: costNum,
      });
      await saveBranchInventory(editingProduct.id, Number(editingProduct.stock ?? 0));

      await reloadProducts();
      setSuccessMessage('Producto actualizado. Catálogo e inventario guardados.');
      notifySuccess('Producto actualizado');
      setShowModal(false);
      setEditingProduct(null);
      setModalError(null);
      return true;
    } catch (error) {
      if (error instanceof Error && !(error as ApiError).status) {
        setFormFeedback(error.message);
        return false;
      }
      const { displayMessage } = notifyApiError('products.save', error);
      setFormFeedback(displayMessage);
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProduct = async (productId: string): Promise<boolean> => {
    try {
      await api.deleteProduct(productId);
      await reloadProducts();
      setFormFeedback(null);
      notifySuccess('Producto eliminado');
      return true;
    } catch (error) {
      const { displayMessage } = notifyApiError('products.delete', error);
      setFormFeedback(displayMessage);
      return false;
    }
  };

  const handleCreateProduct = async (): Promise<boolean> => {
    const name = form.name.trim();
    const sku = form.sku.trim();
    const categoryId = form.categoryId.trim();
    const supplierId = form.supplierId.trim();
    const priceNum = parsePositiveDecimal(form.price)!;
    const stockNum = parseNonNegativeInt(form.stock)!;
    const minStockNum = parseNonNegativeInt(form.minStock) ?? 0;

    const payload = {
      name,
      sku,
      categoryId,
      supplierId,
      price: priceNum,
      initialStock: stockNum,
      minStock: minStockNum,
    };

    setIsSaving(true);
    setFormFeedback(null);

    try {
      await api.createProduct(payload);

      await reloadProducts();
      setShowModal(false);
      setEditingProduct(null);
      setForm({
        name: '',
        sku: '',
        categoryId: categories[0]?.id ?? '',
        supplierId: suppliers[0]?.id ?? '',
        price: '',
        cost: '',
        stock: '0',
        minStock: '0',
      });
      setSuccessMessage('Producto creado con stock inicial en la sucursal activa.');
      setModalError(null);
      notifySuccess('Producto creado');
      return true;
    } catch (error) {
      const { displayMessage } = notifyApiError('products.save', error);
      setFormFeedback(displayMessage);
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setProductPage(1);
  };

  const askConfirmation = (
    title: string,
    message: string,
    confirmLabel: string,
    variant: 'primary' | 'danger',
    action: () => Promise<boolean>
  ) => {
    setConfirmModal({ open: true, title, message, confirmLabel, variant, action });
  };

  const handleConfirmAction = async () => {
    if (!confirmModal.action) return;
    try {
      setIsConfirming(true);
      const ok = await confirmModal.action();
      if (ok) {
        setConfirmModal((m) => ({ ...m, open: false, action: null }));
      }
    } finally {
      setIsConfirming(false);
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

  const paginatedStockProducts = useMemo(
    () => paginateList(quickStockProducts, stockPage, STOCK_PAGE_SIZE),
    [quickStockProducts, stockPage]
  );

  useEffect(() => {
    setStockPage(1);
  }, [quickSearchTerm, quickCategoryFilter, onlyAssignedToBranch]);

  const saveQuickStock = async (product: Product): Promise<boolean> => {
    if (!product.id?.trim()) {
      setFormFeedback('No se pudo actualizar inventario: productId inválido.');
      return false;
    }
    const rawQty = quickStockDraft[product.id] ?? '0';
    const rawMin = quickMinStockDraft[product.id] ?? String(product.minStock ?? 0);
    const quantityDelta = parseNonNegativeInt(rawQty);
    const minStock = parseNonNegativeInt(rawMin);

    if (quantityDelta === null) {
      setFormFeedback('El ingreso de stock debe ser un número mayor o igual a 0.');
      return false;
    }
    if (minStock === null) {
      setFormFeedback('El stock mínimo debe ser un número mayor o igual a 0.');
      return false;
    }

    try {
      setQuickSavingId(product.id);
      setFormFeedback(null);
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
      return true;
    } catch (error) {
      const { displayMessage } = notifyApiError('products.stock', error);
      setFormFeedback(displayMessage);
      return false;
    } finally {
      setQuickSavingId(null);
    }
  };

  return (
    <DashboardLayout sidebar={<SidebarMenu />} header={<Navbar />}>
      <AppPageContent className="overflow-x-hidden">
          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="app-eyebrow">Productos</p>
              <h1 className="app-heading-page">Mantenedor de productos</h1>
              <p className="mt-2 max-w-2xl app-text-muted">
                Catálogo e inventario por sucursal (selector en la barra superior). Stock según sucursal activa.
              </p>
              <p className="mt-1 text-sm text-[#6b7280]">Sucursal: {activeBranchName}</p>
              {currentUser && (
                <p className="mt-3 text-sm text-[#6b7280]">Sesión iniciada como: {currentUser.name}</p>
              )}
              {errorMessage && <p className="mt-3 app-alert-error">{errorMessage}</p>}
              {successMessage && <p className="mt-3 app-alert-success">{successMessage}</p>}
              {isLoading && <p className="mt-3 text-sm text-[#6b7280]">Cargando productos desde BFF...</p>}
            </div>

            <button
              onClick={() => {
                if (!categories.length) {
                  setFormFeedback(
                    'No hay subcategorías disponibles. Crea una subcategoría en Categorías antes de agregar productos.'
                  );
                  return;
                }
                if (!suppliers.length) {
                  setFormFeedback('No hay proveedores. Crea al menos uno en Proveedores.');
                  return;
                }
                setEditingProduct(null);
                setForm({
                  name: '',
                  sku: suggestedSku,
                  categoryId: categories[0]?.id ?? '',
                  supplierId: suppliers[0]?.id ?? '',
                  price: '',
                  cost: '',
                  stock: '0',
                  minStock: '0',
                });
                setSuccessMessage(null);
                setModalError(null);
                setFormNumericWarning(null);
                setShowModal(true);
              }}
              disabled={isActionLocked}
              className="app-btn-primary inline-flex items-center justify-center rounded-3xl px-6 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
            >
              + Nuevo producto
            </button>
          </div>

          <div className="grid w-full grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,0.9fr)]">
            <section className="app-card rounded-3xl p-6">
              <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-[#3d4532]">Inventario de productos</h2>
                  <p className="text-sm app-text-muted">Busca, filtra y actualiza los productos.</p>
                </div>
                <div className="w-full md:w-[420px]">
                  <label className="mb-2 flex items-center gap-2 text-xs app-text-muted">
                    <input
                      type="checkbox"
                      checked={onlyAssignedToBranch}
                      onChange={(e) => setOnlyAssignedToBranch(e.target.checked)}
                      className="rounded border-[rgba(209,199,189,0.9)]"
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
                        <div className="text-xs app-text-muted">
                          {product.sku} · {product.category}
                        </div>
                      </div>
                    )}
                  />
                </div>
              </div>

              {selectedProduct && (
                <div className="app-panel mb-6 p-4">
                  <p className="text-sm app-text-muted">Producto seleccionado</p>
                  <h3 className="mt-2 text-lg font-semibold text-[#3d4532]">{selectedProduct.name}</h3>
                  <p className="text-sm app-text-muted">
                    {selectedProduct.sku} · {selectedProduct.category}
                  </p>
                </div>
              )}

              <div className="app-table-wrap overflow-x-auto">
                <table className="app-table min-w-full text-left text-sm">
                  <thead>
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
                  <tbody>
                    {filteredProducts.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-6 py-8 text-center text-[#6b7280]">
                          No se encontraron productos.
                        </td>
                      </tr>
                    ) : (
                      paginatedProducts.items.map((product) => (
                        <tr key={product.id}>
                          <td className="px-6 py-5">
                            <p className="font-semibold text-[#3d4532]">{product.name}</p>
                            <p className="text-xs text-[#6b7280]">{product.description}</p>
                            {!productHasStockInBranch(product) && (
                              <p className="mt-1 text-xs text-amber-700">Sin fila en esta sucursal</p>
                            )}
                          </td>
                          <td className="px-6 py-5">{product.sku}</td>
                          <td className="px-6 py-5">{product.category}</td>
                          <td className="px-6 py-5">{product.stock ?? 0}</td>
                          <td className="px-6 py-5">{product.minStock ?? 0}</td>
                          <td className="px-6 py-5">${product.price}</td>
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
                <TablePagination
                  page={paginatedProducts.page}
                  pageSize={PRODUCT_PAGE_SIZE}
                  totalItems={filteredProducts.length}
                  onPageChange={setProductPage}
                />
              </div>

              <div className="app-panel mt-6 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-base font-semibold text-[#3d4532]">Edición rápida de stock</h3>
                    <p className="mt-1 text-sm app-text-muted">
                      Registra ingresos de stock en la sucursal activa (se suman al stock actual).
                    </p>
                    {quickNumericWarning && (
                      <p className="mt-2 text-xs text-rose-700">{quickNumericWarning}</p>
                    )}
                  </div>
                  <span className="rounded-full border border-[rgba(74,83,60,0.25)] bg-[rgba(74,83,60,0.08)] px-3 py-1 text-xs text-[#4a533c]">
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
                      className="app-input md:max-w-sm"
                    />
                    <select
                      value={quickCategoryFilter}
                      onChange={(e) => setQuickCategoryFilter(e.target.value)}
                      className="app-select md:w-64"
                    >
                      <option value="all">Todas las categorías</option>
                      {Array.from(new Set(products.map((p) => p.category).filter(Boolean))).map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                    <span className="text-xs text-[#6b7280]">
                      {quickStockProducts.length} producto(s) · {STOCK_PAGE_SIZE} por página
                    </span>
                  </div>
                  <table className="app-table min-w-full text-left text-sm">
                    <thead>
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
                    <tbody>
                      {paginatedStockProducts.items.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-4 py-6 text-center text-xs text-[#6b7280]">
                            No hay productos con ese filtro. Ajusta la búsqueda o categoría.
                          </td>
                        </tr>
                      ) : (
                      paginatedStockProducts.items.map((p) => {
                        const draft = quickStockDraft[p.id];
                        const minDraft = quickMinStockDraft[p.id];
                        return (
                          <tr key={p.id}>
                            <td className="px-4 py-3">
                              <p className="max-w-[180px] truncate font-semibold text-[#3d4532]">{p.name}</p>
                            </td>
                            <td className="px-4 py-3">{p.sku}</td>
                            <td className="px-4 py-3">{p.stock ?? 0}</td>
                            <td className="px-4 py-3">{p.minStock ?? 0}</td>
                            <td className="px-4 py-3">
                              <input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                className="app-input w-28"
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
                                className="app-input w-24"
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
                                className="app-btn-primary px-3 py-2 text-xs disabled:opacity-50"
                              >
                                {quickSavingId === p.id ? 'Guardando…' : 'Guardar'}
                              </button>
                            </td>
                          </tr>
                        );
                      }))}
                    </tbody>
                  </table>
                  <TablePagination
                    page={paginatedStockProducts.page}
                    pageSize={STOCK_PAGE_SIZE}
                    totalItems={quickStockProducts.length}
                    onPageChange={setStockPage}
                  />
                </div>
              </div>
            </section>

            <aside className="space-y-6">
              <div className="app-card rounded-3xl p-6">
                <p className="app-eyebrow text-[0.7rem] tracking-[0.28em]">Información</p>
                <p className="mt-4 text-sm leading-6 app-text-muted">
                  En este mantenedor puedes revisar todos los productos, buscar por SKU o categoría y agregar nuevos registros.
                </p>
              </div>

              <div className="app-card rounded-3xl p-6">
                <p className="app-eyebrow text-[0.7rem] tracking-[0.28em]">Resumen rápido</p>
                <div className="mt-4 space-y-3">
                  <div className="app-panel p-4">
                    <p className="text-sm app-text-muted">Productos totales</p>
                    <p className="mt-1 text-2xl font-semibold text-[#3d4532]">{products.length}</p>
                  </div>
                  <div className="app-panel p-4">
                    <p className="text-sm app-text-muted">Producto activo</p>
                    <p className="mt-1 text-2xl font-semibold text-[#3d4532]">{filteredProducts.length}</p>
                  </div>
                </div>
              </div>

              <div className="app-card rounded-3xl p-6">
                <p className="app-eyebrow text-[0.7rem] tracking-[0.28em]">Mermas</p>
                <p className="mt-4 text-sm leading-6 app-text-muted">
                  Registra mermas por producto para mantener el inventario consistente.
                </p>
              </div>
            </aside>
          </div>
      </AppPageContent>

      {showModal && (

        <div className="app-modal-overlay">
          <div className="app-modal-panel max-w-2xl">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="app-eyebrow text-xs tracking-[0.28em]">
                  {editingProduct ? 'Editar producto' : 'Nuevo producto'}
                </p>
                <h2 className="mt-3 text-2xl font-semibold text-[#3d4532]">
                  {editingProduct ? 'Actualizar producto' : 'Agregar producto al catálogo'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  setEditingProduct(null);
                }}
                className="app-btn-secondary rounded-full px-4 py-2"
              >
                ✕
              </button>
            </div>

            {modalError && (
              <p className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                {modalError}
              </p>
            )}

            <div className="grid gap-6 md:grid-cols-2">
              <label className="block text-sm text-[#3d4532]">
                Nombre
                <input
                  value={form.name}
                  onChange={(event) => handleInputChange('name', event.target.value)}
                  className="app-input mt-2"
                  placeholder="Nombre del producto"
                />
              </label>
              <label className="block text-sm text-[#3d4532]">
                SKU
                <input
                  value={form.sku}
                  onChange={(event) => handleInputChange('sku', event.target.value)}
                  className="app-input mt-2"
                  placeholder={suggestedSku}
                />
                {!editingProduct && (
                  <p className="mt-2 text-xs text-[#6b7280]">Sugerido: {suggestedSku}</p>
                )}
              </label>
              <label className="block text-sm text-[#3d4532]">
                Subcategoría (hoja)
                <select
                  value={form.categoryId}
                  onChange={(event) => handleInputChange('categoryId', event.target.value)}
                  disabled={categories.length === 0}
                  className="app-input mt-2"
                >
                  {categories.length === 0 ? (
                    <option value="">Sin subcategorías — crea una en Categorías</option>
                  ) : (
                    <>
                      {!form.categoryId && (
                        <option value="">Selecciona subcategoría…</option>
                      )}
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.parentName ? `${c.parentName} → ${c.name}` : c.name}
                        </option>
                      ))}
                    </>
                  )}
                </select>
                <span className="mt-1 block text-xs text-[#6b7280]">
                  {editingProduct
                    ? 'Puedes cambiar la subcategoría (ej. Carne o Pollo bajo otra familia).'
                    : 'Asigna el producto a una subcategoría o categoría sin hijos.'}
                </span>
              </label>
              <label className="block text-sm text-[#3d4532]">
                Proveedor
                <select
                  value={form.supplierId}
                  onChange={(event) => handleInputChange('supplierId', event.target.value)}
                  disabled={suppliers.length === 0}
                  className="app-input mt-2"
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
              <label className="block text-sm text-[#3d4532]">
                Precio
                <input
                  value={form.price}
                  onChange={(event) => handleInputChange('price', event.target.value)}
                  className="app-input mt-2"
                  placeholder="Precio de venta"
                  type="text"
                  inputMode="decimal"
                />
              </label>
              <label className="block text-sm text-[#3d4532]">
                Costo
                <input
                  value={form.cost}
                  onChange={(event) => handleInputChange('cost', event.target.value)}
                  className="app-input mt-2"
                  placeholder="Costo"
                  type="text"
                  inputMode="decimal"
                />
              </label>
            </div>

            <div className="mt-6 rounded-2xl border border-[rgba(74,83,60,0.25)] bg-[rgba(74,83,60,0.06)] p-5 md:col-span-2">
              <p className="app-eyebrow text-xs tracking-[0.28em]">Inventario por sucursal</p>
              <h3 className="mt-2 text-lg font-semibold text-[#3d4532]">{activeBranchName}</h3>
              <p className="mt-1 text-sm app-text-muted">
                {editingProduct
                  ? productHasStockInBranch(editingProduct)
                    ? 'Registra ingreso de stock en esta sucursal (se suma al stock actual, no modifica el catálogo global).'
                    : 'Este producto aún no está habilitado en la sucursal. Ingresa cantidad para crear el registro de inventario.'
                  : 'Al crear el producto se registrará el stock inicial en la sucursal activa.'}
              </p>
              {formNumericWarning && (
                <p className="mt-2 text-xs text-rose-700">{formNumericWarning}</p>
              )}

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="block text-sm text-[#3d4532]">
                  {editingProduct ? 'Ingreso de stock' : 'Stock inicial'}
                  <input
                    value={form.stock}
                    onChange={(event) => handleInputChange('stock', event.target.value)}
                    className="app-input mt-2"
                    placeholder="0"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                  />
                </label>
                <label className="block text-sm text-[#3d4532]">
                  Stock mínimo (alerta)
                  <input
                    value={form.minStock}
                    onChange={(event) => handleInputChange('minStock', event.target.value)}
                    className="app-input mt-2"
                    placeholder="0"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                  />
                </label>
              </div>

              {editingProduct && (
                <p className="mt-3 text-xs text-[#6b7280]">
                  Stock actual en sistema: {editingProduct.stock ?? 0} unidades
                </p>
              )}
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                onClick={() => setShowModal(false)}
                disabled={isSaving || isConfirming}
                className="app-btn-secondary disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={requestSaveProduct}
                disabled={isSaving || isConfirming}
                className="app-btn-primary rounded-3xl px-6 py-3 text-sm font-semibold transition disabled:opacity-50"
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

