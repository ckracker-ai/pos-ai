'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { useBranchStore } from '@/store/branch';
import { api, ApiError, getApiErrorMessage } from '@/core/api/api-client';
import {
  extractEntity,
  extractList,
  fetchProductsForBranch,
  normalizeCategoryTreeNode,
  normalizeEmpresa,
  normalizeTradeCustomer,
  unwrapApiEnvelope,
} from '@/core/api/normalizers';
import {
  buildCategoryFilterMaps,
  buildCategoryLabelMap,
  productMatchesPrincipalCategory,
  type PrincipalCategoryOption,
} from '@/core/utils/category-filter';
import { Product } from '@/core/interfaces';
import { AppPageContent } from '@/components/molecules/AppPageContent';
import { AppPageHeader } from '@/components/molecules/AppPageHeader';
import { DashboardLayout } from '@/components/molecules/DashboardLayout';
import { SidebarMenu } from '@/components/organisms/SidebarMenu';
import { Navbar } from '@/components/organisms/Navbar';
import { PosActionAlert } from '@/components/molecules/PosActionAlert';
import { ProductQuickPicker } from '@/components/organisms/ProductQuickPicker';
import { interpretPosCartClient } from '@/core/pos/posAiRulesClient';
import { applySynonyms, mergeGlossary, parseTenantAiGlossary } from '@/core/pos/rubro-ai';
import { normalizePosVoiceCommand } from '@/core/pos/posSaleAssist';
import {
  PosAiCommandPanel,
  type PosAiCommandPanelHandle,
} from '@/components/molecules/PosAiCommandPanel';
import { applyPosAiActions } from '@/core/pos/applyPosAiActions';
import type { PosAiResult } from '@/core/pos/posAiTypes';
import { unwrapApiData } from '@/core/api/api-client';
import {
  enrichPosAiResult,
  findProductByExactSku,
  formatProductCartLabel,
  roundSaleQty,
  validateAddToCart,
  validateSaleForm,
} from '@/core/pos/posSaleAssist';
import { applyDecimalInput, applyDigitsOnlyInput, parsePositiveDecimal, parsePositiveInt } from '@/core/utils/numeric-input';
import { isWeightUnit, resolveRubroCapabilities } from '@/core/config/rubro-packs';
import { useTenantEmpresa } from '@/core/hooks/useTenantEmpresa';
import { packUnitsForSaleQty } from '@/core/pos/unit-equivalence';
import { buildVariantMatrix, canSellVariantCell } from '@/core/pos/product-variants';
import { creditAllowsSale, creditBlockMessage, priceForQty } from '@/core/pos/wholesale';
import type { TradeCustomer } from '@/core/interfaces';
import {
  CHILE_IVA_LABEL,
  calculateIvaFromNet,
  calculateTotalWithIva,
} from '@/core/constants/tax';




interface PosLineItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
  unit?: string;
}

interface ReceiptData {
  items: PosLineItem[];
  subtotal: number;
  deliveryAmount: number;
  tax: number;
  total: number;
  createdAtIso: string;
  saleReference: string;
  paymentType: 'cash' | 'pos' | 'credit';
  requiresDelivery: boolean;
  deliveryCustomerName?: string;
  deliveryPhone?: string;
  deliveryAddress?: string;
  branchName: string;
  sellerName: string;
  empresaName?: string;
  isQuote?: boolean;
}

const LAST_TICKET_KEY = 'pos-ai.last-ticket';

function formatTicketMoney(value: number) {
  return `$${Math.round(value).toLocaleString('es-CL')}`;
}

function formatTicketDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' });
}

function paymentTypeLabel(type: 'cash' | 'pos' | 'credit') {
  if (type === 'cash') return 'Efectivo';
  if (type === 'credit') return 'Crédito';
  return 'POS de pago';
}

export default function PosPage() {
  const { user } = useAuthStore();
  const { empresa } = useTenantEmpresa();
  const rubroCaps = resolveRubroCapabilities(empresa?.rubroNegocio);
  const branchId = useBranchStore((state) => state.selectedBranchId);
  const activeBranchName = useBranchStore((state) => state.activeBranchLabel);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantityInput, setQuantityInput] = useState('1');
  const [cart, setCart] = useState<PosLineItem[]>([]);
  const [notes, setNotes] = useState('');
  const [paymentType, setPaymentType] = useState<'cash' | 'pos' | 'credit'>('cash');
  const [tradeCustomers, setTradeCustomers] = useState<TradeCustomer[]>([]);
  const [tradeCustomerId, setTradeCustomerId] = useState('');
  const [requiresDelivery, setRequiresDelivery] = useState(false);
  const [deliveryCustomerName, setDeliveryCustomerName] = useState('');
  const [deliveryPhone, setDeliveryPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryAmountInput, setDeliveryAmountInput] = useState('0');
  const [saleNumberInput, setSaleNumberInput] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [messageKey, setMessageKey] = useState(0);
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [pickerResetKey, setPickerResetKey] = useState(0);
  const [principalCategories, setPrincipalCategories] = useState<PrincipalCategoryOption[]>([]);
  const [leafToPrincipal, setLeafToPrincipal] = useState<Map<string, string>>(new Map());
  const [categoryLabelById, setCategoryLabelById] = useState<Map<string, string>>(new Map());
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [aiLoading, setAiLoading] = useState(false);
  const [lastAiResult, setLastAiResult] = useState<PosAiResult | null>(null);
  const [showManualProductForm, setShowManualProductForm] = useState(false);
  const [empresaDisplayName, setEmpresaDisplayName] = useState('Mi negocio');
  const [isInformalTicket, setIsInformalTicket] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [sellAsPack, setSellAsPack] = useState(false);
  const posAiPanelRef = useRef<PosAiCommandPanelHandle>(null);
  const barcodeRef = useRef<HTMLInputElement>(null);

  const dismissPosMessage = useCallback(() => {
    setMessage(null);
  }, []);

  const showPosFeedback = useCallback((type: 'success' | 'error', text: string) => {
    setMessageType(type);
    setMessage(text);
    setMessageKey((k) => k + 1);
  }, []);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(LAST_TICKET_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as ReceiptData;
      if (parsed?.saleReference && Array.isArray(parsed.items)) {
        setReceiptData(parsed);
      }
    } catch {
      /* ticket previo no usable */
    }
  }, []);

  useEffect(() => {
    const loadEmpresa = async () => {
      try {
        const res = await api.getEmpresaMe();
        const raw = extractEntity<Record<string, unknown>>(unwrapApiEnvelope(res.data), ['empresa']);
        if (!raw) return;
        const empresa = normalizeEmpresa(raw);
        setEmpresaDisplayName(empresa.nombreFantasia?.trim() || empresa.razonSocial);
        setIsInformalTicket(empresa.estadoTributario !== 'FORMAL');
      } catch {
        /* ticket sigue usable sin perfil empresa */
      }
    };
    void loadEmpresa();
  }, []);

  useEffect(() => {
    const loadCategoryTree = async () => {
      try {
        const res = await api.getCategoryTree();
        const envelope = unwrapApiEnvelope(res.data) as { tree?: unknown[] };
        const tree = Array.isArray(envelope?.tree)
          ? envelope.tree
              .filter((n): n is Record<string, unknown> => Boolean(n) && typeof n === 'object')
              .map((n) => normalizeCategoryTreeNode(n))
          : [];
        const { principals, leafToPrincipal: map } = buildCategoryFilterMaps(tree);
        setPrincipalCategories(principals);
        setLeafToPrincipal(map);
        setCategoryLabelById(buildCategoryLabelMap(tree));
      } catch {
        setPrincipalCategories([]);
        setLeafToPrincipal(new Map());
        setCategoryLabelById(new Map());
      }
    };
    loadCategoryTree();
  }, []);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const catalog = await fetchProductsForBranch(
          branchId,
          () => api.getProductsByBranch(branchId),
          (id) => api.getInventoryByBranch(id)
        );
        setProducts(catalog);
        setSelectedProductId('');
      } catch (error) {
        showPosFeedback('error', getApiErrorMessage(error));
      }
    };

    loadProducts();
  }, [branchId, showPosFeedback]);



  const selectedProduct = products.find((product) => product.id === selectedProductId);
  const variantMatrix = useMemo(() => {
    if (!rubroCaps.variants || !selectedProduct) return null;
    return buildVariantMatrix(products, selectedProduct);
  }, [products, rubroCaps.variants, selectedProduct]);

  const availableProducts = useMemo(() => {
    return products.filter((p) => {
      const isParentStyle = products.some((child) => child.parentProductId === p.id);
      if (Number(p.stock ?? 0) <= 0 && !isParentStyle) return false;
      return productMatchesPrincipalCategory(p.categoryId, categoryFilter, leafToPrincipal);
    });
  }, [products, categoryFilter, leafToPrincipal]);

  useEffect(() => {
    if (!availableProducts.some((p) => p.id === selectedProductId)) {
      setSelectedProductId('');
    }
  }, [availableProducts, selectedProductId]);

  useEffect(() => {
    if (!rubroCaps.wholesale) return;
    const loadCustomers = async () => {
      try {
        const res = await api.getTradeCustomers();
        const list = extractList<Record<string, unknown>>(unwrapApiEnvelope(res.data), ['customers']);
        setTradeCustomers(list.map(normalizeTradeCustomer).filter((c) => c.isActive));
      } catch {
        setTradeCustomers([]);
      }
    };
    void loadCustomers();
  }, [rubroCaps.wholesale]);

  const selectedTradeCustomer = tradeCustomers.find((c) => c.id === tradeCustomerId) ?? null;

  useEffect(() => {
    if (!rubroCaps.delivery && requiresDelivery) {
      setRequiresDelivery(false);
    }
  }, [requiresDelivery, rubroCaps.delivery]);

  useEffect(() => {
    if (selectedTradeCustomer?.isOverdue && paymentType === 'credit') {
      setPaymentType('cash');
    }
  }, [selectedTradeCustomer, paymentType]);


  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.total, 0),
    [cart]
  );
  const deliveryAmount = useMemo(() => {
    if (!requiresDelivery) return 0;
    const n = Number(deliveryAmountInput || 0);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  }, [requiresDelivery, deliveryAmountInput]);

  const tax = calculateIvaFromNet(subtotal);
  const totalProducts = calculateTotalWithIva(subtotal);
  const total = totalProducts + deliveryAmount;

  const addProductToCart = (product: Product, qty: number) => {
    const check = validateAddToCart({
      product: {
        id: product.id,
        name: product.name,
        price: product.price,
        stock: Number(product.stock ?? 0),
        categoryId: product.categoryId,
        category: product.category,
      },
      quantity: qty,
      cart: cart.map((item) => ({ id: item.id, quantity: item.quantity })),
    });
    if (!check.ok) {
      showPosFeedback('error', check.message);
      return;
    }

    setCart((current) => {
      const existing = current.find((item) => item.id === product.id);
      const nextQty = existing ? roundSaleQty(existing.quantity + qty) : roundSaleQty(qty);
      const unitPrice = rubroCaps.wholesale
        ? priceForQty(product.price, nextQty, product.priceTiers)
        : product.price;
      if (existing) {
        return current.map((item) =>
          item.id === product.id
            ? {
                ...item,
                quantity: nextQty,
                unitPrice,
                total: nextQty * unitPrice,
              }
            : item
        );
      }

      const lineName = formatProductCartLabel({
        name: product.name,
        category: product.category,
        price: product.price,
        sku: product.sku,
      });

      return [
        ...current,
        {
          id: product.id,
          name: lineName,
          quantity: roundSaleQty(qty),
          unitPrice,
          total: unitPrice * roundSaleQty(qty),
          unit: product.unit,
        },
      ];
    });
    setSelectedProductId('');
    setQuantityInput('1');
    setPickerResetKey((k) => k + 1);
    showPosFeedback(
      'success',
      `Agregado ${qty} × ${formatProductCartLabel({
        name: product.name,
        category: product.category,
        price: product.price,
        sku: product.sku,
      })}.`
    );
  };

  const handleAddProduct = () => {
    if (!selectedProduct) return;
    if (
      rubroCaps.variants &&
      variantMatrix &&
      selectedProduct.id === variantMatrix.parentId &&
      !selectedProduct.variantSize &&
      !selectedProduct.variantColor
    ) {
      showPosFeedback('error', 'Elige talla y color en la matriz. No se vende la celda en 0.');
      return;
    }
    const allowDecimal = isWeightUnit(selectedProduct.unit);
    const typedQty = allowDecimal
      ? parsePositiveDecimal(quantityInput)
      : parsePositiveInt(quantityInput) ?? 1;
    if (!typedQty) {
      showPosFeedback('error', 'Ingresa una cantidad válida.');
      return;
    }
    const packQty = Number(selectedProduct.packQty ?? 1) || 1;
    const qty = roundSaleQty(
      rubroCaps.unitEquivalence
        ? packUnitsForSaleQty(typedQty, packQty, sellAsPack && packQty > 1)
        : typedQty
    );
    addProductToCart(selectedProduct, qty);
  };

  const handleBarcodeCommit = () => {
    const code = barcodeInput.trim();
    if (!code) return;
    const product = findProductByExactSku(products, code);
    setBarcodeInput('');
    if (!product) {
      showPosFeedback('error', `No hay producto con SKU ${code}.`);
      return;
    }
    const allowDecimal = isWeightUnit(product.unit);
    const qty = allowDecimal
      ? parsePositiveDecimal(quantityInput) ?? 1
      : parsePositiveInt(quantityInput) ?? 1;
    addProductToCart(product, roundSaleQty(qty));
    barcodeRef.current?.focus();
  };

  const handleQuickAddSuggestion = (productId: string, qty = 1) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    addProductToCart(product, Math.max(1, qty));
  };

  const resolveProductCategoryLabel = useCallback(
    (product: Product) => {
      if (product.categoryId && categoryLabelById.has(product.categoryId)) {
        return categoryLabelById.get(product.categoryId)!;
      }
      return product.category?.trim() ?? '';
    },
    [categoryLabelById]
  );

  const posAiProducts = useMemo(
    () =>
      products.map((p) => ({
        id: p.id,
        name: p.name,
        sku: p.sku ?? '',
        price: p.price,
        stock: Number(p.stock ?? 0),
        category: resolveProductCategoryLabel(p),
      })),
    [products, resolveProductCategoryLabel]
  );

  const handlePosAiCommand = async (userText: string) => {
    const normalizedText = normalizePosVoiceCommand(userText);
    const glossary = parseTenantAiGlossary(empresa?.aiGlossary);
    const interpretedText = applySynonyms(
      normalizedText,
      mergeGlossary(empresa?.rubroNegocio, glossary)
    );
    setAiLoading(true);
    const stocksPayload = posAiProducts.map((p) => ({
      id: p.id,
      nombre: p.name,
      sku: p.sku,
      precio: p.price,
      stock_actual: p.stock,
      categoria: posAiProducts.find((x) => x.id === p.id)?.category ?? p.category,
    }));
    const cartPayload = cart.map((item) => ({
      id_producto: item.id,
      cantidad: item.quantity,
      precio_unitario: item.unitPrice,
    }));

    try {
      const clientResult = enrichPosAiResult(
        interpretPosCartClient({
          userText: interpretedText,
          stocks: stocksPayload,
          cart: cartPayload,
        }),
        posAiProducts
      );

      let result = clientResult;

      const clientAdds =
        clientResult.intent === 'ADD_TO_CART' && clientResult.actions.length > 0;

      if (!clientAdds) {
        try {
          const res = await api.interpretPosCommand({
            userText: interpretedText,
            stocks: stocksPayload,
            cart: cartPayload,
          });
          const apiResult = enrichPosAiResult(
            unwrapApiData<PosAiResult>(res.data),
            posAiProducts
          );
          const apiAdds =
            apiResult.intent === 'ADD_TO_CART' && apiResult.actions.length > 0;
          if (apiAdds) {
            result = apiResult;
          } else if (
            (clientResult.product_options?.length ?? 0) === 0 &&
            (apiResult.product_options?.length ?? 0) > 0
          ) {
            result = apiResult;
          }
        } catch (apiError) {
          const status = apiError instanceof ApiError ? apiError.status : undefined;
          if (status !== 404 && status !== 502 && status !== 503) {
            throw apiError;
          }
        }
      }

      setLastAiResult(result);
      const outcome = applyPosAiActions({
        result,
        cart,
        products: posAiProducts,
      });
      const cartChanged =
        outcome.cleared ||
        outcome.cart.length !== cart.length ||
        outcome.cart.some(
          (line, i) =>
            line.quantity !== cart[i]?.quantity || line.id !== cart[i]?.id
        );
      setCart(outcome.cart);
      const hasProductPicker = (result.product_options?.length ?? 0) > 0;
      const feedbackMessage =
        hasProductPicker && !cartChanged
          ? 'Elige la variante en la lista (ej. Carne o Pollo) y pulsa + Agregar.'
          : outcome.message;
      showPosFeedback(cartChanged || hasProductPicker ? 'success' : 'error', feedbackMessage);
      if (outcome.shouldSubmitSale) {
        await handleConfirmSale(outcome.cart);
      }
    } catch (error) {
      showPosFeedback('error', getApiErrorMessage(error));
    } finally {
      setAiLoading(false);
    }
  };

  const handleRemoveItem = (itemId: string) => {
    setCart((current) => current.filter((item) => item.id !== itemId));
  };

  const setCartLineQuantity = (itemId: string, rawQty: number) => {
    const qty = roundSaleQty(Number(rawQty));
    if (!Number.isFinite(qty) || qty <= 0) {
      handleRemoveItem(itemId);
      return;
    }
    const product = products.find((p) => p.id === itemId);
    const allowDecimal = isWeightUnit(product?.unit);
    const nextQty = allowDecimal ? qty : Math.max(1, Math.floor(qty));
    const stock = Number(product?.stock ?? 0);
    if (product && stock > 0 && nextQty > stock) {
      showPosFeedback('error', `Stock máximo de "${product.name}": ${stock}.`);
      return;
    }
    setCart((current) =>
      current.map((item) => {
        if (item.id !== itemId) return item;
        const unitPrice =
          product && rubroCaps.wholesale
            ? priceForQty(product.price, nextQty, product.priceTiers)
            : item.unitPrice;
        return { ...item, quantity: nextQty, unitPrice, total: nextQty * unitPrice };
      })
    );
  };

  const handleConfirmSale = async (cartOverride?: PosLineItem[]) => {
    const saleCart = cartOverride ?? cart;
    const saleSubtotal = saleCart.reduce((sum, item) => sum + item.total, 0);
    const saleTax = calculateIvaFromNet(saleSubtotal);
    const saleTotalProducts = calculateTotalWithIva(saleSubtotal);
    const saleTotal = saleTotalProducts + deliveryAmount;

    const formCheck = validateSaleForm({
      cart: saleCart.map((item) => ({ id: item.id, quantity: item.quantity })),
      saleNumber: saleNumberInput,
      requiresDelivery,
      deliveryCustomerName,
      deliveryPhone,
      deliveryAddress,
      deliveryAmount,
    });
    if (!formCheck.ok) {
      showPosFeedback('error', formCheck.messages[0] ?? 'Revisa el formulario de venta.');
      return;
    }

    if (rubroCaps.wholesale && !tradeCustomerId) {
      showPosFeedback('error', 'Selecciona el cliente mayorista antes de cobrar.');
      return;
    }
    const onCredit = paymentType === 'credit';
    if (onCredit) {
      const credit = creditAllowsSale(selectedTradeCustomer, saleTotal, true);
      if (!credit.ok) {
        showPosFeedback('error', creditBlockMessage(credit.reason));
        return;
      }
    }

    setIsSubmitting(true);
    dismissPosMessage();

    const paymentLabel = paymentTypeLabel(paymentType);
    const paymentNote = `Venta #${saleNumberInput.trim()} (${paymentLabel})`;
    const finalNotes = [notes.trim() || null, paymentNote].filter(Boolean).join(' • ');

    const salePayload = {
      total: saleTotal,
      discount: 0,
      status: 'PENDING',
      requiresDelivery,
      deliveryCustomerName: requiresDelivery ? deliveryCustomerName.trim() : undefined,
      deliveryPhone: requiresDelivery ? deliveryPhone.trim() : undefined,
      deliveryAddress: requiresDelivery ? deliveryAddress.trim() : undefined,
      deliveryAmount: requiresDelivery ? deliveryAmount : 0,
      notes: finalNotes || undefined,
      tradeCustomerId: tradeCustomerId || undefined,
      onCredit,
      details: saleCart.map((item) => ({
        productId: item.id,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal: item.total,
      })),
    };

    try {
      await api.createSale(salePayload);
      const reference = saleNumberInput.trim();
      const nowIso = new Date().toISOString();
      const ticket: ReceiptData = {
        items: saleCart.map((item) => ({ ...item })),
        subtotal: saleSubtotal,
        deliveryAmount,
        tax: saleTax,
        total: saleTotal,
        createdAtIso: nowIso,
        saleReference: reference,
        paymentType,
        requiresDelivery,
        deliveryCustomerName: requiresDelivery ? deliveryCustomerName.trim() : undefined,
        deliveryPhone: requiresDelivery ? deliveryPhone.trim() : undefined,
        deliveryAddress: requiresDelivery ? deliveryAddress.trim() : undefined,
        branchName: activeBranchName,
        sellerName: user?.name || 'Usuario',
        empresaName: empresaDisplayName,
      };
      setReceiptData(ticket);
      try {
        sessionStorage.setItem(LAST_TICKET_KEY, JSON.stringify(ticket));
      } catch {
        /* ignore quota */
      }
      // En POS mostramos el número ingresado por caja.
      setCart([]);
      setRequiresDelivery(false);
      setDeliveryCustomerName('');
      setDeliveryPhone('');
      setDeliveryAddress('');
      setDeliveryAmountInput('0');
      setShowReceipt(true);
      showPosFeedback('success', 'Venta registrada. La comanda aparecerá en Cocina.');
    } catch (error: unknown) {
      showPosFeedback('error', getApiErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveQuote = () => {
    if (cart.length === 0) {
      showPosFeedback('error', 'Agrega productos para cotizar.');
      return;
    }
    const nowIso = new Date().toISOString();
    const ticket: ReceiptData = {
      items: cart.map((item) => ({ ...item })),
      subtotal,
      deliveryAmount,
      tax,
      total,
      createdAtIso: nowIso,
      saleReference: `COT-${Date.now().toString().slice(-6)}`,
      paymentType,
      requiresDelivery,
      deliveryCustomerName: requiresDelivery ? deliveryCustomerName.trim() : undefined,
      deliveryPhone: requiresDelivery ? deliveryPhone.trim() : undefined,
      deliveryAddress: requiresDelivery ? deliveryAddress.trim() : undefined,
      branchName: activeBranchName,
      sellerName: user?.name || 'Usuario',
      empresaName: empresaDisplayName,
      isQuote: true,
    };
    setReceiptData(ticket);
    setCart([]);
    setShowReceipt(true);
    showPosFeedback('success', 'Cotización lista. No descuenta stock ni crea venta.');
  };

  const handlePrint = () => {
    window.print();
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'F9') return;
      e.preventDefault();
      if (!isSubmitting && cart.length > 0) {
        void handleConfirmSale();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [cart.length, handleConfirmSale, isSubmitting]);

  return (
    <DashboardLayout sidebar={<SidebarMenu />} header={<Navbar />}>
      <AppPageContent className="overflow-x-hidden">
          <AppPageHeader
            kicker="POS"
            title="Registrar Venta"
            meta={<p>Sucursal activa: {activeBranchName}</p>}
            actions={
              <div className="flex flex-wrap items-center gap-2">
                {receiptData ? (
                  <button
                    type="button"
                    onClick={() => {
                      setShowReceipt(true);
                    }}
                    className="app-btn-secondary text-sm"
                  >
                    Último ticket
                  </button>
                ) : null}
                <div className="app-card rounded-2xl px-5 py-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-brand-ink-muted">Vendedor</p>
                  <p className="font-semibold text-brand-ink">{user?.name || 'Usuario'}</p>
                  <p className="mt-1 text-[10px] text-brand-ink-muted">F9 confirma la venta</p>
                </div>
              </div>
            }
          />

          {rubroCaps.wholesale ? (
            <section className="app-card mb-6 rounded-3xl p-4 sm:p-6">
              <label className="block space-y-2">
                <span className="text-sm font-semibold text-brand-ink">Cliente mayorista</span>
                <p className="text-xs text-brand-ink-muted">
                  Obligatorio para cobrar. El precio por tramo se aplica en el carrito; el crédito se valida al
                  confirmar.
                </p>
                <select
                  value={tradeCustomerId}
                  onChange={(e) => setTradeCustomerId(e.target.value)}
                  className="app-select"
                >
                  <option value="">Selecciona cliente</option>
                  {tradeCustomers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {c.rut ? ` · ${c.rut}` : ''}
                      {c.isOverdue ? ' · mora' : ''}
                    </option>
                  ))}
                </select>
              </label>
              {selectedTradeCustomer ? (
                <p className="mt-3 text-xs text-brand-ink-muted">
                  Cupo ${Math.round(selectedTradeCustomer.creditLimit).toLocaleString('es-CL')} · usado $
                  {Math.round(selectedTradeCustomer.creditUsed).toLocaleString('es-CL')}
                  {selectedTradeCustomer.isOverdue ? ' · crédito bloqueado por mora' : ''}
                </p>
              ) : null}
            </section>
          ) : null}

          {rubroCaps.barcode ? (
            <section className="app-card mb-6 rounded-3xl p-4 sm:p-6">
              <label className="block space-y-2">
                <span className="text-sm font-semibold text-brand-ink">Código de barras / SKU</span>
                <p className="text-xs text-brand-ink-muted">
                  Enfoca este campo y escanea. Enter agrega el producto con coincidencia exacta de SKU.
                </p>
                <input
                  ref={barcodeRef}
                  type="text"
                  value={barcodeInput}
                  autoComplete="off"
                  inputMode="numeric"
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleBarcodeCommit();
                    }
                  }}
                  className="app-input font-mono"
                  placeholder="Escanear o pegar SKU"
                />
              </label>
            </section>
          ) : null}

          <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
            <div className="space-y-6">
              <label className="flex cursor-pointer items-center gap-2 rounded-2xl border border-brand-linen/80 bg-brand-surface/40 px-4 py-3 text-sm text-brand-ink">
                <input
                  type="checkbox"
                  checked={showManualProductForm}
                  onChange={(e) => setShowManualProductForm(e.target.checked)}
                  className="h-4 w-4 rounded border-brand-linen accent-brand-olive"
                />
                Mostrar formulario clásico para agregar productos
              </label>

              <PosAiCommandPanel
                ref={posAiPanelRef}
                disabled={!branchId || products.length === 0}
                loading={aiLoading}
                lastResult={lastAiResult}
                products={posAiProducts.map((p) => ({
                  id: p.id,
                  name: p.name,
                  price: p.price,
                  stock: p.stock,
                  sku: p.sku,
                  categoryId: products.find((x) => x.id === p.id)?.categoryId,
                  category: p.category,
                }))}
                onSubmit={handlePosAiCommand}
                onQuickAdd={handleQuickAddSuggestion}
              />

              {showManualProductForm && (
              <section className="app-card rounded-3xl p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-[#3d4532]">Agregar productos</h2>
                    <p className="mt-2 text-sm app-text-muted">
                      Solo se muestran productos con stock en {activeBranchName}.
                    </p>
                  </div>
                  {principalCategories.length > 0 && (
                    <label className="text-sm app-text-muted">
                      Familia
                      <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="app-select mt-2 min-w-[12rem]"
                      >
                        <option value="all">Todas las familias</option>
                        {principalCategories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-[1.7fr_0.9fr] items-end">
                  <label className="space-y-2 block">
                    <span className="text-sm app-text-muted">Producto</span>
                    <ProductQuickPicker
                      products={availableProducts}
                      selectedProductId={selectedProductId}
                      onSelect={(id) => setSelectedProductId(id)}
                      resetKey={pickerResetKey}
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm app-text-muted">
                      Cantidad{isWeightUnit(selectedProduct?.unit) ? ' (kg / lt)' : ''}
                    </span>
                    <input
                      type="text"
                      inputMode={isWeightUnit(selectedProduct?.unit) ? 'decimal' : 'numeric'}
                      pattern={isWeightUnit(selectedProduct?.unit) ? undefined : '[0-9]*'}
                      value={quantityInput}
                      onChange={(event) => {
                        if (isWeightUnit(selectedProduct?.unit)) {
                          const { value } = applyDecimalInput(event.target.value);
                          setQuantityInput(value);
                          return;
                        }
                        const { value } = applyDigitsOnlyInput(event.target.value);
                        setQuantityInput(value);
                      }}
                      onBlur={() => {
                        if (isWeightUnit(selectedProduct?.unit)) {
                          const qty = parsePositiveDecimal(quantityInput);
                          setQuantityInput(qty ? String(roundSaleQty(qty)) : '0.1');
                          return;
                        }
                        const qty = parsePositiveInt(quantityInput);
                        setQuantityInput(qty ? String(qty) : '1');
                      }}
                      className="app-input"
                    />
                  </label>
                </div>
                {rubroCaps.unitEquivalence && Number(selectedProduct?.packQty ?? 1) > 1 ? (
                  <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm text-brand-ink">
                    <input
                      type="checkbox"
                      checked={sellAsPack}
                      onChange={(e) => setSellAsPack(e.target.checked)}
                      className="h-4 w-4 rounded border-brand-linen accent-brand-olive"
                    />
                    Cantidad en cajas ({selectedProduct?.packQty} u. c/u)
                  </label>
                ) : null}
                {rubroCaps.variants && variantMatrix ? (
                  <div className="mt-4 overflow-x-auto">
                    <p className="mb-2 text-xs text-brand-ink-muted">
                      Matriz talla × color. Celdas en 0 no se cobran.
                    </p>
                    <table className="min-w-full border-collapse text-sm">
                      <thead>
                        <tr>
                          <th className="px-2 py-1 text-left text-xs text-brand-ink-muted"> </th>
                          {variantMatrix.sizes.map((size) => (
                            <th key={size} className="px-2 py-1 text-xs font-semibold text-brand-ink">
                              {size}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {variantMatrix.colors.map((color) => (
                          <tr key={color}>
                            <th className="px-2 py-1 text-left text-xs font-semibold text-brand-ink">
                              {color}
                            </th>
                            {variantMatrix.sizes.map((size) => {
                              const cell = variantMatrix.cell(size, color);
                              const ok = canSellVariantCell(cell?.stock);
                              const selected = cell?.id === selectedProductId;
                              return (
                                <td key={`${size}-${color}`} className="px-1 py-1">
                                  <button
                                    type="button"
                                    disabled={!ok || !cell}
                                    onClick={() => cell && setSelectedProductId(cell.id)}
                                    className={`w-full rounded-xl px-2 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-40 ${
                                      selected
                                        ? 'bg-brand-olive text-white'
                                        : 'border border-brand-linen bg-white text-brand-ink'
                                    }`}
                                  >
                                    {ok ? cell?.stock : '0'}
                                  </button>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}
                {availableProducts.length === 0 && (
                  <p className="mt-3 text-xs text-brand-olive">
                    No hay productos con stock para esta sucursal. Cambia la sucursal activa o carga inventario.
                  </p>
                )}

                <button
                  onClick={handleAddProduct}
                  className="app-btn-primary mt-6 inline-flex items-center justify-center rounded-3xl px-6 py-3 text-sm font-semibold shadow transition"
                >
                  + Agregar
                </button>
              </section>
              )}

              <section className="app-card rounded-3xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-semibold text-[#3d4532]">Carrito</h2>
                    <p className="text-sm app-text-muted">{cart.length} ítem(s)</p>
                  </div>
                  <span className="rounded-full border border-[rgba(74,83,60,0.25)] bg-[rgba(74,83,60,0.08)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#4a533c]">
                    Total: ${total}
                  </span>
                </div>

                <div className="space-y-4">
                  {cart.length === 0 ? (
                    <div className="app-panel rounded-3xl border border-dashed p-8 text-center text-[#6b7280]">
                      Sin productos aún. Agrega uno arriba.
                    </div>
                  ) : (
                    cart.map((item) => (
                      <div key={item.id} className="app-panel flex flex-wrap items-center justify-between gap-3 rounded-3xl p-4">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-[#3d4532]">{item.name}</p>
                          <p className="text-sm app-text-muted">{formatTicketMoney(item.unitPrice)} c/u</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className="flex h-9 w-9 items-center justify-center rounded-xl border border-brand-linen text-lg"
                            onClick={() =>
                              setCartLineQuantity(
                                item.id,
                                item.quantity - (isWeightUnit(item.unit) ? 0.1 : 1)
                              )
                            }
                            aria-label="Menos"
                          >
                            −
                          </button>
                          <input
                            type="text"
                            inputMode={isWeightUnit(item.unit) ? 'decimal' : 'numeric'}
                            value={item.quantity}
                            onChange={(e) => {
                              const n = isWeightUnit(item.unit)
                                ? parsePositiveDecimal(e.target.value)
                                : parsePositiveInt(e.target.value);
                              if (n) setCartLineQuantity(item.id, n);
                              if (e.target.value === '') setCartLineQuantity(item.id, 0);
                            }}
                            className="app-input w-14 py-1 text-center"
                            aria-label={`Cantidad de ${item.name}`}
                          />
                          <button
                            type="button"
                            className="flex h-9 w-9 items-center justify-center rounded-xl border border-brand-linen text-lg"
                            onClick={() =>
                              setCartLineQuantity(
                                item.id,
                                item.quantity + (isWeightUnit(item.unit) ? 0.1 : 1)
                              )
                            }
                            aria-label="Más"
                          >
                            +
                          </button>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-[#3d4532]">{formatTicketMoney(item.total)}</p>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.id)}
                            className="mt-2 text-xs text-rose-700 hover:text-rose-900"
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="mt-6 space-y-4">
                  <div className="app-panel p-4">
                    <p className="text-sm app-text-muted">Pago (obligatorio)</p>
                    <div className="mt-3 grid gap-4 sm:grid-cols-2">
                      <label className="block text-sm text-[#3d4532]">
                        Forma de pago
                        <select
                          value={paymentType}
                          onChange={(e) => setPaymentType(e.target.value as 'cash' | 'pos' | 'credit')}
                          className="app-select mt-2"
                        >
                          <option value="cash">Efectivo</option>
                          <option value="pos">POS de pago</option>
                          {rubroCaps.credit ? <option value="credit">Crédito</option> : null}
                        </select>
                      </label>

                      <label className="block text-sm text-[#3d4532]">
                        Número de venta
                        <input
                          value={saleNumberInput}
                          onChange={(e) => setSaleNumberInput(e.target.value)}
                          className="app-input mt-2"
                          placeholder={
                            paymentType === 'cash'
                              ? 'Ej: EF-000123'
                              : paymentType === 'credit'
                                ? 'Ej: CR-000123'
                                : 'Ej: POS-000123'
                          }
                        />
                      </label>
                    </div>
                  </div>

                  <div className="app-panel p-4">
                    <p className="text-sm app-text-muted">Notas (opcional)</p>
                    <textarea
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      placeholder="Agrega notas relevantes..."
                      className="app-textarea mt-3 h-28"
                    />
                  </div>

                  {rubroCaps.delivery ? (
                  <div
                    className={`rounded-2xl border p-4 transition ${
                      requiresDelivery
                        ? 'border-amber-300 bg-amber-50 shadow-sm'
                        : 'border-amber-200/80 bg-amber-50/50'
                    }`}
                  >
                    <label className="inline-flex cursor-pointer items-center gap-2.5 text-sm font-semibold text-amber-950">
                      <input
                        type="checkbox"
                        checked={requiresDelivery}
                        onChange={(e) => setRequiresDelivery(e.target.checked)}
                        className="h-4 w-4 rounded border-amber-400 accent-amber-600"
                      />
                      <span>Esta venta requiere delivery</span>
                    </label>
                    {requiresDelivery && (
                      <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        <label className="block text-sm text-[#3d4532]">
                          Nombre cliente
                          <input
                            value={deliveryCustomerName}
                            onChange={(e) => setDeliveryCustomerName(e.target.value)}
                            className="app-input mt-2"
                            placeholder="Ej: Juan Pérez"
                          />
                        </label>
                        <label className="block text-sm text-[#3d4532]">
                          Número teléfono
                          <input
                            value={deliveryPhone}
                            onChange={(e) => setDeliveryPhone(e.target.value)}
                            className="app-input mt-2"
                            placeholder="Ej: 56912345678"
                          />
                        </label>
                        <label className="block text-sm text-[#3d4532] sm:col-span-2">
                          Dirección
                          <input
                            value={deliveryAddress}
                            onChange={(e) => setDeliveryAddress(e.target.value)}
                            className="app-input mt-2"
                            placeholder="Ej: Av. Providencia 1234, Depto 34"
                          />
                        </label>
                        <label className="block text-sm text-[#3d4532]">
                          Monto delivery
                          <input
                            type="number"
                            min={0}
                            step={100}
                            value={deliveryAmountInput}
                            onChange={(e) => setDeliveryAmountInput(e.target.value)}
                            className="app-input mt-2"
                            placeholder="Ej: 2000"
                          />
                        </label>
                      </div>
                    )}
                  </div>
                  ) : null}

                  <button
                    onClick={() => handleConfirmSale()}
                    disabled={isSubmitting}
                    className="app-btn-primary w-full rounded-3xl px-6 py-4 text-sm font-semibold shadow transition disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSubmitting ? 'Procesando venta...' : 'Confirmar Venta'}
                  </button>
                  {rubroCaps.unitEquivalence ? (
                    <button
                      type="button"
                      onClick={handleSaveQuote}
                      disabled={isSubmitting || cart.length === 0}
                      className="app-btn-secondary mt-3 w-full rounded-3xl px-6 py-3 text-sm font-semibold disabled:opacity-60"
                    >
                      Guardar cotización (sin stock)
                    </button>
                  ) : null}
                </div>
              </section>
            </div>

            <aside className="space-y-6">
              <div className="app-card rounded-3xl p-6">
                <h2 className="mb-4 text-xl font-semibold text-[#3d4532]">Resumen</h2>
                <div className="space-y-3 text-sm app-text-muted">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>${subtotal}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{CHILE_IVA_LABEL}</span>
                    <span>${tax}</span>
                  </div>
                  {requiresDelivery && (
                    <div className="flex justify-between">
                      <span>Delivery</span>
                      <span>${deliveryAmount}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-semibold text-[#3d4532]">
                    <span>Total</span>
                    <span>${total}</span>
                  </div>
                </div>
              </div>

              <div className="app-card rounded-3xl p-6">
                <h2 className="mb-3 text-xl font-semibold text-[#3d4532]">Instrucciones</h2>
                <p className="text-sm leading-6 app-text-muted">
                  Agrega productos al carrito, verifica el total y presiona confirmar venta. El ticket se imprimirá directamente en lugar de descargarse.
                </p>
              </div>
            </aside>
          </div>

          {showReceipt && receiptData && (
            <div className="app-modal-overlay print:hidden">
              <div className="app-modal-panel max-w-3xl">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="app-eyebrow text-sm tracking-[0.28em] text-[#4a533c]">
                      {receiptData.isQuote ? 'Cotización (no es venta)' : 'Venta registrada exitosamente'}
                    </p>
                    <h3 className="mt-3 text-2xl font-bold text-[#3d4532]">
                      {empresaDisplayName}
                    </h3>
                    {isInformalTicket && (
                      <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                        Documento interno — no constituye boleta electrónica ni documento tributario.
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowReceipt(false)}
                    className="app-btn-secondary rounded-full px-3 py-2"
                  >
                    ✕
                  </button>
                </div>

                <div className="app-panel mt-6 p-6">
                  <div className="grid gap-4 sm:grid-cols-2 text-sm app-text-muted">
                    <div>
                      <p className="font-semibold text-[#3d4532]">Sucursal</p>
                      <p>{receiptData.branchName}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-[#3d4532]">Vendedor</p>
                      <p>{receiptData.sellerName}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-[#3d4532]">Fecha</p>
                      <p>{new Date(receiptData.createdAtIso).toLocaleString('es-CL', { dateStyle: 'long', timeStyle: 'short' })}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-[#3d4532]">Folio</p>
                      <p>#{receiptData.saleReference}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-[#3d4532]">Pago</p>
                      <p>{paymentTypeLabel(receiptData.paymentType)}</p>
                    </div>
                    {receiptData.requiresDelivery && (
                      <>
                        <div>
                          <p className="font-semibold text-[#3d4532]">Cliente delivery</p>
                          <p>{receiptData.deliveryCustomerName}</p>
                        </div>
                        <div>
                          <p className="font-semibold text-[#3d4532]">Teléfono delivery</p>
                          <p>{receiptData.deliveryPhone}</p>
                        </div>
                        <div className="sm:col-span-2">
                          <p className="font-semibold text-[#3d4532]">Dirección delivery</p>
                          <p>{receiptData.deliveryAddress}</p>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="mt-6 space-y-4">
                    {receiptData.items.map((item) => (
                      <div key={item.id} className="app-stat-inner flex items-center justify-between rounded-2xl p-4">
                        <div>
                          <p className="font-semibold text-[#3d4532]">{item.name}</p>
                          <p className="text-sm app-text-muted">{item.quantity} × ${item.unitPrice}</p>
                        </div>
                        <p className="font-semibold text-[#3d4532]">${item.total}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 space-y-2 text-sm app-text-muted">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span>${receiptData.subtotal}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{CHILE_IVA_LABEL}</span>
                      <span>${receiptData.tax}</span>
                    </div>
                  {receiptData.requiresDelivery && (
                    <div className="flex justify-between">
                      <span>Delivery</span>
                      <span>${receiptData.deliveryAmount}</span>
                    </div>
                  )}
                    <div className="flex justify-between text-lg font-semibold text-[#3d4532]">
                      <span>Total</span>
                      <span>${receiptData.total}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    type="button"
                    onClick={handlePrint}
                    className="app-btn-primary rounded-3xl px-6 py-3 text-sm font-semibold transition"
                  >
                    Imprimir
                  </button>
                  <button type="button" onClick={() => setShowReceipt(false)} className="app-btn-secondary">
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          )}

          <div id="ticket-print-area" className="hidden print:block">
            <div className="pos-ticket">
              <p className="pos-ticket-center pos-ticket-strong">
                {receiptData?.empresaName || empresaDisplayName}
              </p>
              {isInformalTicket ? (
                <p className="pos-ticket-center">Documento interno — no es boleta SII</p>
              ) : null}
              {receiptData?.isQuote ? (
                <p className="pos-ticket-center pos-ticket-strong">COTIZACIÓN — no descuenta stock</p>
              ) : null}
              <p className="pos-ticket-rule">--------------------------------</p>
              <p>Sucursal: {receiptData?.branchName}</p>
              <p>Vendedor: {receiptData?.sellerName}</p>
              <p>Fecha: {receiptData ? formatTicketDate(receiptData.createdAtIso) : ''}</p>
              <p>Folio: #{receiptData?.saleReference}</p>
              <p>Pago: {receiptData ? paymentTypeLabel(receiptData.paymentType) : ''}</p>
              {receiptData?.requiresDelivery ? (
                <>
                  <p>Delivery: {receiptData.deliveryCustomerName}</p>
                  <p>Tel: {receiptData.deliveryPhone}</p>
                  <p>{receiptData.deliveryAddress}</p>
                </>
              ) : null}
              <p className="pos-ticket-rule">--------------------------------</p>
              {(receiptData?.items ?? []).map((item) => (
                <div key={item.id} className="pos-ticket-line">
                  <p>{item.name}</p>
                  <p>
                    {item.quantity} x {formatTicketMoney(item.unitPrice)}  {formatTicketMoney(item.total)}
                  </p>
                </div>
              ))}
              <p className="pos-ticket-rule">--------------------------------</p>
              <p>Subtotal {formatTicketMoney(receiptData?.subtotal ?? 0)}</p>
              <p>
                {CHILE_IVA_LABEL} {formatTicketMoney(receiptData?.tax ?? 0)}
              </p>
              {receiptData?.requiresDelivery ? (
                <p>Delivery {formatTicketMoney(receiptData.deliveryAmount ?? 0)}</p>
              ) : null}
              <p className="pos-ticket-strong">TOTAL {formatTicketMoney(receiptData?.total ?? 0)}</p>
              <p className="pos-ticket-center pos-ticket-footer">
                {isInformalTicket
                  ? 'Comprobante interno · Conserve este documento'
                  : 'Gracias por su compra'}
              </p>
            </div>
          </div>
      </AppPageContent>

      <style jsx global>{`
        @media print {
          @page {
            size: 80mm auto;
            margin: 2mm;
          }
          body * {
            visibility: hidden;
          }
          #ticket-print-area,
          #ticket-print-area * {
            visibility: visible !important;
          }
          #ticket-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 80mm;
            color: #000 !important;
            background: #fff !important;
          }
          #ticket-print-area,
          #ticket-print-area .pos-ticket,
          #ticket-print-area .pos-ticket * {
            font-family: 'Courier New', Courier, ui-monospace, monospace !important;
            font-size: 12px !important;
            line-height: 1.3 !important;
            color: #000 !important;
            background: #fff !important;
          }
          #ticket-print-area .pos-ticket {
            width: 72mm;
            max-width: 72mm;
            padding: 0;
          }
          #ticket-print-area .pos-ticket-center {
            text-align: center;
          }
          #ticket-print-area .pos-ticket-strong {
            font-weight: 700;
          }
          #ticket-print-area .pos-ticket-rule,
          #ticket-print-area .pos-ticket-footer {
            margin: 6px 0;
          }
          #ticket-print-area .pos-ticket-line {
            margin-bottom: 6px;
          }
        }
      `}</style>

      <PosActionAlert
        message={message}
        messageKey={messageKey}
        type={messageType}
        onDismiss={dismissPosMessage}
        durationMs={messageType === 'error' ? 6500 : message?.includes('Venta registrada') ? 7000 : 4500}
      />
    </DashboardLayout>
  );
}

