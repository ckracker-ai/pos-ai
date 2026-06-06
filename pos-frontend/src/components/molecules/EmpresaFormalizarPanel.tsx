'use client';

import { useMemo, useState } from 'react';
import { api } from '@/core/api/api-client';
import { extractEntity, normalizeEmpresa, unwrapApiEnvelope } from '@/core/api/normalizers';
import { FORMALIZACION_PASOS } from '@/core/constants/formalizacion-checklist';
import type { Empresa, EmpresaEstadoTributario, FormalizacionProgreso } from '@/core/interfaces';
import { formatRutInput, parseRut } from '@/core/utils/rutChile';
import { notifyApiError, notifySuccess } from '@/store/ui';

type Props = {
  empresa: Empresa;
  canManage: boolean;
  onUpdated: (empresa: Empresa) => void;
};

const inputClass =
  'w-full rounded-lg border border-brand-linen bg-white px-3 py-2 text-sm text-brand-ink outline-none focus:border-brand-olive focus:ring-2 focus:ring-brand-olive/20';

export function EmpresaFormalizarPanel({ empresa, canManage, onUpdated }: Props) {
  const [progreso, setProgreso] = useState<FormalizacionProgreso>(
    empresa.formalizacionProgreso ?? { pasos: {} }
  );
  const [rutInput, setRutInput] = useState('');
  const [razonSocial, setRazonSocial] = useState(empresa.razonSocial);
  const [giroSii, setGiroSii] = useState(empresa.giroSii ?? '');
  const [saving, setSaving] = useState(false);
  const [formalizing, setFormalizing] = useState(false);

  const porcentaje = empresa.formalizacionPorcentaje ?? 0;
  const estadoTributario = empresa.estadoTributario as EmpresaEstadoTributario;

  const pasos = useMemo(() => progreso.pasos ?? {}, [progreso.pasos]);

  const togglePaso = async (pasoId: (typeof FORMALIZACION_PASOS)[number]['id'], checked: boolean) => {
    if (!canManage) return;
    const next: FormalizacionProgreso = {
      ...progreso,
      pasos: { ...pasos, [pasoId]: checked },
    };
    setProgreso(next);
    setSaving(true);
    try {
      const res = await api.updateEmpresaFormalizacionProgreso(empresa.id, {
        pasos: next.pasos,
        diagnostico: progreso.diagnostico ?? null,
        ...(estadoTributario === 'INFORMAL' && (checked || progreso.diagnostico)
          ? { estadoTributario: 'EN_TRAMITE' as const }
          : {}),
      });
      const raw = extractEntity<Record<string, unknown>>(unwrapApiEnvelope(res.data), ['empresa']);
      if (raw) onUpdated(normalizeEmpresa(raw));
    } catch (error) {
      notifyApiError('empresas.formalizacion', error, { toast: true });
      setProgreso(empresa.formalizacionProgreso ?? { pasos: {} });
    } finally {
      setSaving(false);
    }
  };

  const setDiagnostico = async (value: 'ocasional' | 'sustento') => {
    if (!canManage) return;
    const next: FormalizacionProgreso = { ...progreso, diagnostico: value };
    setProgreso(next);
    setSaving(true);
    try {
      const res = await api.updateEmpresaFormalizacionProgreso(empresa.id, {
        diagnostico: value,
        pasos,
        ...(estadoTributario === 'INFORMAL' ? { estadoTributario: 'EN_TRAMITE' as const } : {}),
      });
      const raw = extractEntity<Record<string, unknown>>(unwrapApiEnvelope(res.data), ['empresa']);
      if (raw) onUpdated(normalizeEmpresa(raw));
    } catch (error) {
      notifyApiError('empresas.formalizacion', error, { toast: true });
    } finally {
      setSaving(false);
    }
  };

  const handleFormalizar = async () => {
    if (!canManage) return;
    const parsed = parseRut(rutInput);
    if (!parsed?.valid) {
      notifyApiError('empresas.formalizar', new Error('RUT inválido'), { toast: true });
      return;
    }
    setFormalizing(true);
    try {
      const res = await api.formalizarEmpresa(empresa.id, {
        rut: parsed.rutEmpresa,
        razonSocial: razonSocial.trim() || undefined,
        giroSii: giroSii.trim() || null,
      });
      const raw = extractEntity<Record<string, unknown>>(unwrapApiEnvelope(res.data), ['empresa']);
      if (raw) {
        onUpdated(normalizeEmpresa(raw));
        notifySuccess('Negocio formalizado', 'Ya puedes contratar planes con IA y pasarela.');
      }
    } catch (error) {
      notifyApiError('empresas.formalizar', error, { toast: true });
    } finally {
      setFormalizing(false);
    }
  };

  if (estadoTributario === 'FORMAL') {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-900">
        Tu negocio está <strong>formalizado</strong> (RUT {empresa.rutEmpresa}). Puedes usar todos los
        planes y canales según tu suscripción.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-950">
        <p className="font-semibold">Negocio en marcha</p>
        <p className="mt-1 text-amber-900/90">
          Operas con plan Básico sin RUT tributario. Formaliza cuando estés listo para WhatsApp IA,
          multi-sucursal o pasarela de pagos.
        </p>
        {empresa.rubroNegocio ? (
          <p className="mt-2 text-xs text-amber-800">Rubro: {empresa.rubroNegocio}</p>
        ) : null}
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium text-brand-ink">Progreso hacia formalización</span>
          <span className="text-brand-olive">{porcentaje}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-brand-linen/60">
          <div
            className="h-full rounded-full bg-brand-olive transition-all"
            style={{ width: `${Math.min(100, porcentaje)}%` }}
          />
        </div>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-brand-ink">¿Cómo vendes hoy?</legend>
        <div className="flex flex-wrap gap-2">
          {(['ocasional', 'sustento'] as const).map((opt) => (
            <button
              key={opt}
              type="button"
              disabled={!canManage || saving}
              onClick={() => setDiagnostico(opt)}
              className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${
                progreso.diagnostico === opt
                  ? 'border-brand-olive bg-brand-olive text-white'
                  : 'border-brand-linen bg-white text-brand-ink hover:border-brand-olive/40'
              }`}
            >
              {opt === 'ocasional' ? 'Venta ocasional' : 'Es mi sustento'}
            </button>
          ))}
        </div>
      </fieldset>

      <ul className="space-y-3">
        {FORMALIZACION_PASOS.map((paso) => (
          <li
            key={paso.id}
            className="flex gap-3 rounded-xl border border-brand-linen/80 bg-brand-surface/40 px-4 py-3"
          >
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-brand-linen"
              checked={Boolean(pasos[paso.id])}
              disabled={!canManage || saving}
              onChange={(e) => togglePaso(paso.id, e.target.checked)}
            />
            <div>
              <p className="text-sm font-semibold text-brand-ink">{paso.title}</p>
              <p className="mt-0.5 text-xs text-brand-ink-muted">{paso.hint}</p>
            </div>
          </li>
        ))}
      </ul>

      <div className="rounded-2xl border border-brand-olive/25 bg-white p-4">
        <p className="text-sm font-semibold text-brand-ink">Registrar RUT y pasar a formal</p>
        <p className="mt-1 text-xs text-brand-ink-muted">
          POS-AI no reemplaza asesoría tributaria. Este paso habilita planes Estándar/Full y canales IA.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block text-sm sm:col-span-2">
            <span className="mb-1 block font-medium text-brand-ink">RUT empresa *</span>
            <input
              className={inputClass}
              value={rutInput}
              onChange={(e) => setRutInput(formatRutInput(e.target.value))}
              placeholder="12.345.678-9"
              disabled={!canManage}
            />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="mb-1 block font-medium text-brand-ink">Razón social</span>
            <input
              className={inputClass}
              value={razonSocial}
              onChange={(e) => setRazonSocial(e.target.value)}
              disabled={!canManage}
            />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="mb-1 block font-medium text-brand-ink">Giro (opcional)</span>
            <input
              className={inputClass}
              value={giroSii}
              onChange={(e) => setGiroSii(e.target.value)}
              disabled={!canManage}
            />
          </label>
        </div>
        <button
          type="button"
          disabled={!canManage || formalizing || !rutInput.trim()}
          onClick={() => void handleFormalizar()}
          className="mt-4 rounded-xl bg-brand-olive px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#3d4532] disabled:opacity-50"
        >
          {formalizing ? 'Guardando…' : 'Formalizar negocio'}
        </button>
      </div>
    </div>
  );
}
