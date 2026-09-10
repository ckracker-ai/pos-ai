'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/core/api/api-client';
import { extractList, normalizeTradeCustomer, unwrapApiEnvelope } from '@/core/api/normalizers';
import type { TradeCustomer } from '@/core/interfaces';
import { AppPageContent } from '@/components/molecules/AppPageContent';
import { AppPageHeader } from '@/components/molecules/AppPageHeader';
import { DashboardLayout } from '@/components/molecules/DashboardLayout';
import { SidebarMenu } from '@/components/organisms/SidebarMenu';
import { Navbar } from '@/components/organisms/Navbar';
import { ConfirmActionModal } from '@/components/molecules/ConfirmActionModal';
import { notifyApiError, notifySuccess } from '@/store/ui';
import { useAuthStore } from '@/store/auth';
import { getRoleProfile } from '@/core/config/role-access';

export default function ClientesPage() {
  const role = useAuthStore((s) => s.user?.role);
  const canCredit = getRoleProfile(role).canApproveShrinkages || getRoleProfile(role).canManageEmpresa;
  const [rows, setRows] = useState<TradeCustomer[]>([]);
  const [search, setSearch] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<TradeCustomer | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    rut: '',
    creditLimit: '0',
    isOverdue: false,
    notes: '',
  });
  const [confirmOpen, setConfirmOpen] = useState(false);

  const load = async () => {
    try {
      const res = await api.getTradeCustomers();
      const list = extractList<Record<string, unknown>>(unwrapApiEnvelope(res.data), ['customers']);
      setRows(list.map(normalizeTradeCustomer));
      setErrorMessage(null);
    } catch (error) {
      const { displayMessage } = notifyApiError('clientes.list', error, { toast: false });
      setErrorMessage(displayMessage);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows.filter((r) => r.isActive);
    return rows.filter(
      (r) =>
        r.isActive &&
        [r.name, r.rut, r.notes].join(' ').toLowerCase().includes(q)
    );
  }, [rows, search]);

  const openNew = () => {
    setEditing(null);
    setForm({ name: '', rut: '', creditLimit: '0', isOverdue: false, notes: '' });
    setShowModal(true);
  };

  const openEdit = (row: TradeCustomer) => {
    setEditing(row);
    setForm({
      name: row.name,
      rut: row.rut ?? '',
      creditLimit: String(row.creditLimit ?? 0),
      isOverdue: row.isOverdue,
      notes: row.notes ?? '',
    });
    setShowModal(true);
  };

  const persist = async () => {
    const payload = {
      name: form.name.trim(),
      rut: form.rut.trim() || null,
      notes: form.notes.trim() || null,
      creditLimit: Number(form.creditLimit.replace(',', '.')) || 0,
      isOverdue: form.isOverdue,
    };
    if (!payload.name) return;
    setSaving(true);
    try {
      if (editing) await api.updateTradeCustomer(editing.id, payload);
      else await api.createTradeCustomer(payload);
      notifySuccess(editing ? 'Cliente actualizado' : 'Cliente creado');
      setShowModal(false);
      await load();
    } catch (error) {
      notifyApiError('clientes.save', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout sidebar={<SidebarMenu />} header={<Navbar />}>
      <AppPageContent>
        <AppPageHeader
          kicker="Mayorista"
          title="Clientes"
          meta={<p>Cupo de crédito y mora. El POS usa este listado para el precio y el crédito.</p>}
          actions={
            <button type="button" className="app-btn-primary rounded-3xl px-6 py-3 text-sm" onClick={openNew}>
              + Nuevo cliente
            </button>
          }
        />
        {errorMessage ? <p className="mb-4 app-alert-error">{errorMessage}</p> : null}
        <input
          className="app-input mt-2"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar cliente o RUT"
        />
        <div className="mt-4 overflow-x-auto rounded-3xl border border-brand-linen bg-white">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-brand-ink-muted">
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">RUT</th>
                <th className="px-4 py-3">Cupo</th>
                <th className="px-4 py-3">Usado</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.id} className="border-t border-brand-linen/70">
                  <td className="px-4 py-3 font-semibold">{row.name}</td>
                  <td className="px-4 py-3">{row.rut || '—'}</td>
                  <td className="px-4 py-3">${Math.round(row.creditLimit).toLocaleString('es-CL')}</td>
                  <td className="px-4 py-3">${Math.round(row.creditUsed).toLocaleString('es-CL')}</td>
                  <td className="px-4 py-3">{row.isOverdue ? 'Mora' : 'Al día'}</td>
                  <td className="px-4 py-3 text-right">
                    <button type="button" className="app-btn-secondary text-xs" onClick={() => openEdit(row)}>
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 ? <p className="px-4 py-6 text-sm text-brand-ink-muted">Sin clientes activos.</p> : null}
        </div>

        {showModal ? (
          <div className="app-modal-overlay">
            <div className="app-modal-panel max-w-lg">
              <h2 className="text-xl font-semibold">{editing ? 'Editar cliente' : 'Nuevo cliente'}</h2>
              <div className="mt-4 grid gap-4">
                <label className="text-sm">
                  Nombre
                  <input className="app-input mt-2" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </label>
                <label className="text-sm">
                  RUT
                  <input className="app-input mt-2" value={form.rut} onChange={(e) => setForm({ ...form, rut: e.target.value })} />
                </label>
                {canCredit ? (
                  <>
                    <label className="text-sm">
                      Cupo de crédito
                      <input className="app-input mt-2" value={form.creditLimit} onChange={(e) => setForm({ ...form, creditLimit: e.target.value })} />
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={form.isOverdue}
                        onChange={(e) => setForm({ ...form, isOverdue: e.target.checked })}
                      />
                      Cliente en mora (bloquea crédito)
                    </label>
                  </>
                ) : null}
                <label className="text-sm">
                  Notas
                  <input className="app-input mt-2" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                </label>
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <button type="button" className="app-btn-secondary" onClick={() => setShowModal(false)}>
                  Cancelar
                </button>
                <button type="button" className="app-btn-primary" disabled={saving} onClick={() => setConfirmOpen(true)}>
                  Guardar
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <ConfirmActionModal
          open={confirmOpen}
          title="Guardar cliente"
          message="¿Confirmas los datos de crédito de este cliente?"
          confirmLabel="Guardar"
          variant="primary"
          onCancel={() => setConfirmOpen(false)}
          onConfirm={() => {
            setConfirmOpen(false);
            void persist();
          }}
        />
      </AppPageContent>
    </DashboardLayout>
  );
}
