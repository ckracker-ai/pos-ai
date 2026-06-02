'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { PosAiLogo } from '@/components/atoms/PosAiLogo';
import { posProxyPath } from '@/core/constants/api-path';
import type { SaasPlanCodigo } from '@/core/interfaces';
import { formatRutInput, parseRut } from '@/core/utils/rutChile';
import { formatPlanValor } from '@/core/constants/saas-plan';
import type { LandingPlan } from '@/core/constants/landing-plans';

const PLAN_CODIGOS: SaasPlanCodigo[] = ['BASICO', 'ESTANDAR', 'FULL'];

type RegistroFormProps = {
  plans: LandingPlan[];
};

function resolvePlanFromQuery(raw: string | null): SaasPlanCodigo {
  const up = String(raw ?? '').toUpperCase();
  return PLAN_CODIGOS.includes(up as SaasPlanCodigo) ? (up as SaasPlanCodigo) : 'BASICO';
}

function mapApiError(error: string): string {
  if (error.includes('RUT_ALREADY_REGISTERED')) {
    return 'Ese RUT ya está registrado. Si ya tienes cuenta, inicia sesión.';
  }
  if (error.includes('EMAIL_TAKEN')) {
    return 'Ese correo ya está en uso. Prueba con otro o inicia sesión.';
  }
  if (error.includes('invalid RUT')) {
    return 'RUT inválido. Revisa el número y el dígito verificador.';
  }
  if (error.startsWith('VALIDATION_ERROR')) {
    return 'Revisa los datos del formulario.';
  }
  return error || 'No se pudo completar el registro. Intenta más tarde.';
}

export function RegistroForm({ plans }: RegistroFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialPlan = resolvePlanFromQuery(searchParams.get('plan'));

  const [rut, setRut] = useState('');
  const [razonSocial, setRazonSocial] = useState('');
  const [nombreFantasia, setNombreFantasia] = useState('');
  const [adminFullName, setAdminFullName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [planCodigo, setPlanCodigo] = useState<SaasPlanCodigo>(initialPlan);
  const [branchName, setBranchName] = useState('Sucursal Central');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const selectedPlan = useMemo(
    () => plans.find((p) => p.codigo === planCodigo) ?? plans[0],
    [plans, planCodigo]
  );

  const inputClass =
    'mt-1 w-full rounded-lg border border-brand-linen bg-white px-3 py-2.5 text-brand-ink outline-none transition focus:border-brand-olive focus:ring-2 focus:ring-brand-olive/20';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const parsed = parseRut(rut);
    if (!parsed?.valid) {
      setError('Ingresa un RUT chileno válido.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(posProxyPath('public/registro'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rut: parsed.rutEmpresa,
          razonSocial: razonSocial.trim(),
          nombreFantasia: nombreFantasia.trim() || undefined,
          adminEmail: adminEmail.trim().toLowerCase(),
          adminPassword,
          adminFullName: adminFullName.trim() || undefined,
          planCodigo,
          branchName: branchName.trim() || 'Sucursal Central',
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(mapApiError(String(json.error ?? '')));
        return;
      }

      const empresaId = json.data?.empresa?.id ?? null;

      if (empresaId) {
        router.push(`/checkout?empresaId=${encodeURIComponent(String(empresaId))}`);
        return;
      }

      router.push(`/login?registered=1&email=${encodeURIComponent(adminEmail.trim().toLowerCase())}`);
    } catch {
      setError('No se pudo conectar con el servidor. ¿Está el sistema en línea?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto">
      <div className="login-card rounded-2xl bg-white/95 p-8 backdrop-blur-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <Link href="/">
            <PosAiLogo width={180} priority className="mb-3" />
          </Link>
          <h1 className="text-lg font-semibold text-brand-olive">Registro piloto</h1>
          <p className="mt-1 text-sm text-brand-ink-muted">
            Crea tu negocio en POS-AI — 90 días de piloto sin pago web (por ahora)
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-brand-ink">Plan</label>
            <select
              className={inputClass}
              value={planCodigo}
              onChange={(e) => setPlanCodigo(e.target.value as SaasPlanCodigo)}
            >
              {plans.map((p) => (
                <option key={p.codigo} value={p.codigo}>
                  {p.nombre} — {formatPlanValor(p.valor)}
                </option>
              ))}
            </select>
            {selectedPlan ? (
              <p className="mt-1 text-xs text-brand-ink-muted">{selectedPlan.tagline}</p>
            ) : null}
          </div>

          <div>
            <label className="text-sm font-medium text-brand-ink">RUT empresa</label>
            <input
              className={inputClass}
              required
              value={rut}
              onChange={(e) => setRut(formatRutInput(e.target.value))}
              placeholder="12.345.678-9"
              autoComplete="off"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-brand-ink">Razón social</label>
            <input
              className={inputClass}
              required
              value={razonSocial}
              onChange={(e) => setRazonSocial(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-brand-ink">Nombre fantasía (opcional)</label>
            <input
              className={inputClass}
              value={nombreFantasia}
              onChange={(e) => setNombreFantasia(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-brand-ink">Nombre administrador</label>
            <input
              className={inputClass}
              value={adminFullName}
              onChange={(e) => setAdminFullName(e.target.value)}
              placeholder="Administrador"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-brand-ink">Correo administrador</label>
            <input
              type="email"
              className={inputClass}
              required
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              autoComplete="email"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-brand-ink">Contraseña (mín. 8)</label>
            <input
              type="password"
              className={inputClass}
              required
              minLength={8}
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-brand-ink">Nombre primera sucursal</label>
            <input
              className={inputClass}
              value={branchName}
              onChange={(e) => setBranchName(e.target.value)}
            />
          </div>

          {error ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-brand-olive py-3 text-sm font-semibold text-white transition hover:bg-[#3d4532] disabled:opacity-60"
          >
            {loading ? 'Creando cuenta…' : 'Crear mi negocio'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-brand-ink-muted">
          ¿Ya tienes cuenta?{' '}
          <Link href="/login" className="font-medium text-brand-olive hover:underline">
            Iniciar sesión
          </Link>
          <span className="mx-2 text-brand-linen">·</span>
          <Link href="/" className="font-medium text-brand-olive hover:underline">
            Inicio
          </Link>
        </p>
      </div>
    </div>
  );
}
