'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { useBranchStore } from '@/store/branch';
import { api, getApiErrorMessage } from '@/core/api/api-client';
import { fetchProductsForBranch } from '@/core/api/normalizers';
import { Product } from '@/core/interfaces';
import { DashboardLayout } from '@/components/molecules/DashboardLayout';
import { SidebarMenu } from '@/components/organisms/SidebarMenu';
import { Navbar } from '@/components/organisms/Navbar';
import { ProductQuickPicker } from '@/components/organisms/ProductQuickPicker';
import { coercePositiveIntInput } from '@/core/utils/numeric-input';
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
}

interface ReceiptData {
  items: PosLineItem[];
  subtotal: number;
  tax: number;
  total: number;
  createdAtIso: string;
  saleReference: string;
  paymentType: 'cash' | 'pos';
  branchName: string;
  sellerName: string;
}

export default function PosPage() {
  const { user } = useAuthStore();
  const branchId = useBranchStore((state) => state.selectedBranchId);
  const activeBranchName = useBranchStore((state) => state.activeBranchLabel);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [cart, setCart] = useState<PosLineItem[]>([]);
  const [notes, setNotes] = useState('');
  const [paymentType, setPaymentType] = useState<'cash' | 'pos'>('cash');
  const [saleNumberInput, setSaleNumberInput] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [pickerResetKey, setPickerResetKey] = useState(0);

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
        setMessageType('error');
        setMessage(getApiErrorMessage(error));
      }
    };

    loadProducts();
  }, [branchId]);



  const selectedProduct = products.find((product) => product.id === selectedProductId);
  const availableProducts = useMemo(
    () => products.filter((p) => Number(p.stock ?? 0) > 0),
    [products]
  );


  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.total, 0),
    [cart]
  );

  const tax = calculateIvaFromNet(subtotal);
  const total = calculateTotalWithIva(subtotal);

  const handleAddProduct = () => {
    if (!selectedProduct) return;
    if (quantity < 1) return;
    if (Number(selectedProduct.stock ?? 0) <= 0) {
      setMessageType('error');
      setMessage(`"${selectedProduct.name}" no tiene stock disponible en ${activeBranchName}.`);
      return;
    }

    setCart((current) => {
      const existing = current.find((item) => item.id === selectedProduct.id);
      if (existing) {
        return current.map((item) =>
          item.id === selectedProduct.id
            ? { ...item, quantity: item.quantity + quantity, total: (item.quantity + quantity) * item.unitPrice }
            : item
        );
      }

      return [
        ...current,
        {
          id: selectedProduct.id,
          name: selectedProduct.name,
          quantity,
          unitPrice: selectedProduct.price,
          total: selectedProduct.price * quantity,
        },
      ];
    });
    setSelectedProductId('');
    setQuantity(1);
    setPickerResetKey((k) => k + 1);
    setMessage(null);
    setMessageType('success');
  };

  const handleRemoveItem = (itemId: string) => {
    setCart((current) => current.filter((item) => item.id !== itemId));
  };

  const handleConfirmSale = async () => {
    if (cart.length === 0) {
      setMessageType('error');
      setMessage('Agrega al menos un producto al carrito.');
      return;
    }

    if (!saleNumberInput.trim()) {
      setMessageType('error');
      setMessage('Ingresa el número de venta (efectivo o POS) antes de confirmar.');
      return;
    }

    setIsSubmitting(true);
    setMessage(null);
    setMessageType('success');

    const paymentLabel = paymentType === 'cash' ? 'Efectivo' : 'POS de pago';
    const paymentNote = `Venta #${saleNumberInput.trim()} (${paymentLabel})`;
    const finalNotes = [notes.trim() || null, paymentNote].filter(Boolean).join(' • ');

    const salePayload = {
      total,
      discount: 0,
      status: 'PENDING',
      notes: finalNotes || undefined,
      details: cart.map((item) => ({
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
      setReceiptData({
        items: cart.map((item) => ({ ...item })),
        subtotal,
        tax,
        total,
        createdAtIso: nowIso,
        saleReference: reference,
        paymentType,
        branchName: activeBranchName,
        sellerName: user?.name || 'Usuario',
      });
      // En POS mostramos el número ingresado por caja.
      setCart([]);
      setShowReceipt(true);
      setMessageType('success');
      setMessage('Venta registrada. La comanda aparecerá en Cocina.');
    } catch (error: unknown) {
      setMessageType('error');
      setMessage(getApiErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <DashboardLayout sidebar={<SidebarMenu />} header={<Navbar />}>
      <div className="min-h-screen bg-slate-950 text-slate-100 px-4 py-6 sm:px-6 lg:px-8 overflow-x-hidden">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-slate-500">POS</p>
              <h1 className="mt-3 text-3xl font-semibold text-white">Registrar Venta</h1>
              <p className="mt-2 max-w-2xl text-slate-400">Sucursal activa: {activeBranchName}</p>
            </div>
            <div className="rounded-3xl border border-slate-800 bg-slate-900/80 px-5 py-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Vendedor</p>
              <p className="font-semibold text-white">{user?.name || 'Usuario'}</p>
            </div>
          </div>

          {message && (
            <div
              className={`rounded-3xl border p-4 mb-6 ${
                messageType === 'error'
                  ? 'border-rose-500/30 bg-rose-500/10 text-rose-200'
                  : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-100'
              }`}
            >
              {message}
            </div>
          )}

          <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
            <div className="space-y-6">
              <section className="rounded-3xl border border-slate-800 bg-slate-950/90 p-6 shadow-lg">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-white">Agregar Productos</h2>
                    <p className="mt-2 text-slate-400">
                      Solo se muestran productos con stock en {activeBranchName}.
                    </p>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-[1.7fr_0.9fr] items-end">
                  <label className="space-y-2 block">
                    <span className="text-sm text-slate-400">Producto</span>
                    <ProductQuickPicker
                      products={availableProducts}
                      selectedProductId={selectedProductId}
                      onSelect={(id) => setSelectedProductId(id)}
                      resetKey={pickerResetKey}
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm text-slate-400">Cantidad</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={quantity}
                      onChange={(event) => setQuantity(coercePositiveIntInput(event.target.value))}
                      className="w-full rounded-3xl border border-slate-800 bg-slate-900 px-4 py-3 text-white outline-none focus:border-amber-400"
                    />
                  </label>
                </div>
                {availableProducts.length === 0 && (
                  <p className="mt-3 text-xs text-amber-300">
                    No hay productos con stock para esta sucursal. Cambia la sucursal activa o carga inventario.
                  </p>
                )}

                <button
                  onClick={handleAddProduct}
                  className="mt-6 inline-flex items-center justify-center rounded-3xl bg-amber-500 px-6 py-3 text-sm font-semibold text-slate-950 shadow hover:bg-amber-400 transition"
                >
                  + Agregar
                </button>
              </section>

              <section className="rounded-3xl border border-slate-800 bg-slate-950/90 p-6 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-semibold text-white">Carrito</h2>
                    <p className="text-slate-400 text-sm">{cart.length} ítem(s)</p>
                  </div>
                  <span className="rounded-full bg-slate-800 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-400">
                    Total: ${total}
                  </span>
                </div>

                <div className="space-y-4">
                  {cart.length === 0 ? (
                    <div className="rounded-3xl border border-dashed border-slate-700 p-8 text-center text-slate-500">
                      Sin productos aún. Agrega uno arriba.
                    </div>
                  ) : (
                    cart.map((item) => (
                      <div key={item.id} className="rounded-3xl border border-slate-800 bg-slate-900/70 p-4 flex items-center justify-between gap-4">
                        <div>
                          <p className="font-semibold text-white">{item.name}</p>
                          <p className="text-sm text-slate-400">{item.quantity} × ${item.unitPrice}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-white">${item.total}</p>
                          <button
                            onClick={() => handleRemoveItem(item.id)}
                            className="mt-2 text-xs text-rose-400 hover:text-rose-300"
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="mt-6 space-y-4">
                  <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4">
                    <p className="text-sm text-slate-400">Pago (obligatorio)</p>
                    <div className="mt-3 grid gap-4 sm:grid-cols-2">
                      <label className="block text-sm text-slate-300">
                        Forma de pago
                        <select
                          value={paymentType}
                          onChange={(e) => setPaymentType(e.target.value as 'cash' | 'pos')}
                          className="mt-2 w-full rounded-3xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-amber-400"
                        >
                          <option value="cash">Efectivo</option>
                          <option value="pos">POS de pago</option>
                        </select>
                      </label>

                      <label className="block text-sm text-slate-300">
                        Número de venta
                        <input
                          value={saleNumberInput}
                          onChange={(e) => setSaleNumberInput(e.target.value)}
                          className="mt-2 w-full rounded-3xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-amber-400"
                          placeholder={paymentType === 'cash' ? 'Ej: EF-000123' : 'Ej: POS-000123'}
                        />
                      </label>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4">
                    <p className="text-sm text-slate-400">Notas (opcional)</p>
                    <textarea
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      placeholder="Agrega notas relevantes..."
                      className="mt-3 h-28 w-full rounded-3xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-amber-400"
                    />
                  </div>

                  <button
                    onClick={handleConfirmSale}
                    disabled={isSubmitting}
                    className="w-full rounded-3xl bg-amber-500 px-6 py-4 text-sm font-semibold text-slate-950 shadow hover:bg-amber-400 transition disabled:cursor-not-allowed disabled:bg-amber-700"
                  >
                    {isSubmitting ? 'Procesando venta...' : 'Confirmar Venta'}
                  </button>
                </div>
              </section>
            </div>

            <aside className="space-y-6">
              <div className="rounded-3xl border border-slate-800 bg-slate-950/90 p-6 shadow-lg">
                <h2 className="text-xl font-semibold text-white mb-4">Resumen</h2>
                <div className="space-y-3 text-sm text-slate-400">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>${subtotal}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{CHILE_IVA_LABEL}</span>
                    <span>${tax}</span>
                  </div>
                  <div className="flex justify-between text-white font-semibold text-lg">
                    <span>Total</span>
                    <span>${total}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-800 bg-slate-950/90 p-6 shadow-lg">
                <h2 className="text-xl font-semibold text-white mb-3">Instrucciones</h2>
                <p className="text-sm text-slate-400 leading-6">
                  Agrega productos al carrito, verifica el total y presiona confirmar venta. El ticket se imprimirá directamente en lugar de descargarse.
                </p>
              </div>
            </aside>
          </div>

          {showReceipt && receiptData && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 print:hidden">
              <div className="w-full max-w-3xl rounded-[2rem] bg-slate-900 border border-slate-700 p-6 shadow-2xl">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm uppercase text-amber-400 tracking-[0.28em]">Venta registrada exitosamente</p>
                    <h3 className="mt-3 text-2xl font-bold text-white">ERP Multi Sucursal</h3>
                    <p className="text-sm text-slate-400">Empanadas Costa Azul</p>
                  </div>
                  <button
                    onClick={() => setShowReceipt(false)}
                    className="rounded-full border border-slate-700 bg-slate-950 p-2 text-slate-300 hover:text-white transition"
                  >
                    ✕
                  </button>
                </div>

                <div className="mt-6 rounded-3xl bg-slate-950/80 border border-slate-800 p-6">
                  <div className="grid gap-4 sm:grid-cols-2 text-sm text-slate-400">
                    <div>
                      <p className="font-semibold text-slate-200">Sucursal</p>
                      <p>{receiptData.branchName}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-200">Vendedor</p>
                      <p>{receiptData.sellerName}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-200">Fecha</p>
                      <p>{new Date(receiptData.createdAtIso).toLocaleString('es-CO', { dateStyle: 'long', timeStyle: 'short' })}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-200">Folio</p>
                      <p>#{receiptData.saleReference}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-200">Pago</p>
                      <p>{receiptData.paymentType === 'cash' ? 'Efectivo' : 'POS de pago'}</p>
                    </div>
                  </div>

                  <div className="mt-6 space-y-4">
                    {receiptData.items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between rounded-3xl bg-slate-950/90 border border-slate-800 p-4">
                        <div>
                          <p className="font-semibold text-white">{item.name}</p>
                          <p className="text-sm text-slate-400">{item.quantity} × ${item.unitPrice}</p>
                        </div>
                        <p className="font-semibold text-white">${item.total}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 space-y-2 text-sm text-slate-400">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span>${receiptData.subtotal}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{CHILE_IVA_LABEL}</span>
                      <span>${receiptData.tax}</span>
                    </div>
                    <div className="flex justify-between text-white font-semibold text-lg">
                      <span>Total</span>
                      <span>${receiptData.total}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    onClick={handlePrint}
                    className="rounded-3xl bg-amber-500 px-6 py-3 text-sm font-semibold text-slate-950 hover:bg-amber-400 transition"
                  >
                    Imprimir
                  </button>
                  <button
                    onClick={() => setShowReceipt(false)}
                    className="rounded-3xl border border-slate-700 px-6 py-3 text-sm text-slate-200 hover:bg-slate-800 transition"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          )}

          <div id="ticket-print-area" className="hidden print:block">
            <div className="pos-ticket mx-auto bg-white p-3 text-slate-900">
              <div className="mb-6 text-center">
                <p className="text-sm font-semibold uppercase text-amber-600">ERP Multi Sucursal</p>
                <p className="mt-2 text-xs text-slate-500">Empanadas Costa Azul</p>
              </div>
              <div className="mb-6 grid gap-4 sm:grid-cols-2 text-xs text-slate-600">
                <div>
                  <p className="font-semibold text-slate-900">Sucursal</p>
                  <p>{receiptData?.branchName}</p>
                </div>
                <div>
                  <p className="font-semibold text-slate-900">Vendedor</p>
                  <p>{receiptData?.sellerName}</p>
                </div>
                <div>
                  <p className="font-semibold text-slate-900">Fecha</p>
                  <p>{receiptData ? new Date(receiptData.createdAtIso).toLocaleString('es-CO', { dateStyle: 'long', timeStyle: 'short' }) : ''}</p>
                </div>
                <div>
                  <p className="font-semibold text-slate-900">Folio</p>
                  <p>#{receiptData?.saleReference}</p>
                </div>
                <div>
                  <p className="font-semibold text-slate-900">Pago</p>
                  <p>{receiptData?.paymentType === 'cash' ? 'Efectivo' : 'POS de pago'}</p>
                </div>
              </div>
              <div className="mb-6 border-t border-slate-200 pt-4">
                {(receiptData?.items ?? []).map((item) => (
                  <div key={item.id} className="mb-4 flex justify-between text-sm">
                    <div>
                      <p className="font-semibold text-slate-900">{item.name}</p>
                      <p className="text-slate-600">{item.quantity} x ${item.unitPrice}</p>
                    </div>
                    <p className="font-semibold text-slate-900">${item.total}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Subtotal</span>
                  <span className="font-semibold text-slate-900">${receiptData?.subtotal ?? 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">{CHILE_IVA_LABEL}</span>
                  <span className="font-semibold text-slate-900">${receiptData?.tax ?? 0}</span>
                </div>
                <div className="flex justify-between text-base font-semibold text-slate-900">
                  <span>Total</span>
                  <span>${receiptData?.total ?? 0}</span>
                </div>
              </div>
              <p className="mt-8 text-center text-xs text-slate-500">Gracias por su compra · Conserve este comprobante</p>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          @page {
            size: 80mm auto;
            margin: 0;
          }
          body * {
            visibility: hidden;
          }
          #ticket-print-area,
          #ticket-print-area * {
            visibility: visible;
          }
          #ticket-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 80mm;
          }
          #ticket-print-area .pos-ticket {
            width: 80mm;
            max-width: 80mm;
            padding: 3mm;
            font-size: 11px;
            line-height: 1.25;
          }
        }
      `}</style>
    </DashboardLayout>
  );
}

