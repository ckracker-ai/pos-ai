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
import type { PublicLegalCurrent } from '@/core/api/public-legal';

const PLAN_CODIGOS: SaasPlanCodigo[] = ['BASICO', 'ESTANDAR', 'FULL'];

type RegistroFormProps = {
  plans: LandingPlan[];
  legal: PublicLegalCurrent | null;
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
  if (error.includes('LEGAL_VERSION_MISMATCH')) {
    return 'Los términos legales se actualizaron. Recarga la página y acepta de nuevo.';
  }
  if (error.includes('TERMS_NOT_ACCEPTED')) {
    return 'Debes aceptar los Términos de Servicio y la Política de Privacidad.';
  }
  return error || 'No se pudo completar el registro. Intenta más tarde.';
}

export function RegistroForm({ plans, legal }: RegistroFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialPlan = resolvePlanFromQuery(searchParams.get('plan'));

  const [modoRegistro, setModoRegistro] = useState<'FORMAL' | 'INFORMAL'>('FORMAL');
  const [rut, setRut] = useState('');
  const [razonSocial, setRazonSocial] = useState('');
  const [nombreFantasia, setNombreFantasia] = useState('');
  const [rubroNegocio, setRubroNegocio] = useState('');
  const [telefonoNegocio, setTelefonoNegocio] = useState('');
  const [adminFullName, setAdminFullName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [planCodigo, setPlanCodigo] = useState<SaasPlanCodigo>(initialPlan);
  const [branchName, setBranchName] = useState('Sucursal Central');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [acceptedLegal, setAcceptedLegal] = useState(false);

  const selectedPlan = useMemo(
    () => plans.find((p) => p.codigo === planCodigo) ?? plans[0],
    [plans, planCodigo]
  );

  const inputClass =
    'mt-1 w-full rounded-lg border border-brand-linen bg-white px-3 py-2.5 text-brand-ink outline-none transition focus:border-brand-olive focus:ring-2 focus:ring-brand-olive/20';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const informal = modoRegistro === 'INFORMAL';
    let rutPayload: string | undefined;

    if (!informal) {
      const parsed = parseRut(rut);
      if (!parsed?.valid) {
        setError('Ingresa un RUT chileno válido.');
        return;
      }
      rutPayload = parsed.rutEmpresa;
    }

    if (!razonSocial.trim()) {
      setError(informal ? 'Ingresa el nombre de tu negocio.' : 'Ingresa la razón social.');
      return;
    }

    if (!legal?.terms?.version || !legal?.privacy?.version) {
      setError('No se pudieron cargar los documentos legales. Recarga la página.');
      return;
    }

    if (!acceptedLegal) {
      setError('Debes aceptar los Términos de Servicio y la Política de Privacidad.');
      return;
    }

    const legalAcceptance = {
      termsVersion: legal.terms.version,
      privacyVersion: legal.privacy.version,
      accepted: true as const,
    };

    setLoading(true);
    try {
      const res = await fetch(posProxyPath('public/registro'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          informal
            ? {
                modoRegistro: 'INFORMAL',
                razonSocial: razonSocial.trim(),
                nombreFantasia: nombreFantasia.trim() || undefined,
                rubroNegocio: rubroNegocio.trim() || undefined,
                telefonoNegocio: telefonoNegocio.trim() || undefined,
                adminEmail: adminEmail.trim().toLowerCase(),
                adminPassword,
                adminFullName: adminFullName.trim() || undefined,
                branchName: branchName.trim() || 'Sucursal Central',
                legalAcceptance,
              }
            : {
                modoRegistro: 'FORMAL',
                rut: rutPayload,
                razonSocial: razonSocial.trim(),
                nombreFantasia: nombreFantasia.trim() || undefined,
                adminEmail: adminEmail.trim().toLowerCase(),
                adminPassword,
                adminFullName: adminFullName.trim() || undefined,
                planCodigo,
                branchName: branchName.trim() || 'Sucursal Central',
                legalAcceptance,
              }
        ),
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
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-brand-ink">¿Tienes RUT de empresa?</legend>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setModoRegistro('FORMAL')}
                className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                  modoRegistro === 'FORMAL'
                    ? 'border-brand-olive bg-brand-olive text-white'
                    : 'border-brand-linen bg-white text-brand-ink'
                }`}
              >
                Sí, tengo RUT
              </button>
              <button
                type="button"
                onClick={() => {
                  setModoRegistro('INFORMAL');
                  setPlanCodigo('BASICO');
                }}
                className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                  modoRegistro === 'INFORMAL'
                    ? 'border-brand-olive bg-brand-olive text-white'
                    : 'border-brand-linen bg-white text-brand-ink'
                }`}
              >
                Aún no — negocio en marcha
              </button>
            </div>
            {modoRegistro === 'INFORMAL' ? (
              <p className="text-xs text-brand-ink-muted">
                Plan Básico (1 sucursal, 3 usuarios). Podrás formalizar después en Perfil de empresa.
              </p>
            ) : null}
          </fieldset>

          {modoRegistro === 'FORMAL' ? (
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
          ) : null}

          {modoRegistro === 'FORMAL' ? (
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
          ) : null}

          <div>
            <label className="text-sm font-medium text-brand-ink">
              {modoRegistro === 'INFORMAL' ? 'Nombre del negocio *' : 'Razón social *'}
            </label>
            <input
              className={inputClass}
              required
              value={razonSocial}
              onChange={(e) => setRazonSocial(e.target.value)}
            />
          </div>

          {modoRegistro === 'INFORMAL' ? (
            <>
              <div>
                <label className="text-sm font-medium text-brand-ink">Rubro (opcional)</label>
                <input
                  className={inputClass}
                  value={rubroNegocio}
                  onChange={(e) => setRubroNegocio(e.target.value)}
                  placeholder="Ej: empanadas, feria, cafetería"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-brand-ink">Teléfono del negocio (opcional)</label>
                <input
                  className={inputClass}
                  value={telefonoNegocio}
                  onChange={(e) => setTelefonoNegocio(e.target.value)}
                  placeholder="+56 9 …"
                />
              </div>
            </>
          ) : null}

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

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-brand-linen/80 bg-brand-surface/30 px-4 py-3 text-sm text-brand-ink">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-brand-linen accent-brand-olive"
              checked={acceptedLegal}
              onChange={(e) => setAcceptedLegal(e.target.checked)}
              disabled={!legal}
              required
            />
            <span>
              He leído y acepto los{' '}
              <Link href="/legal/terminos" target="_blank" className="font-medium text-brand-olive hover:underline">
                Términos de Servicio
              </Link>{' '}
              y la{' '}
              <Link href="/legal/privacidad" target="_blank" className="font-medium text-brand-olive hover:underline">
                Política de Privacidad
              </Link>
              {legal ? (
                <span className="block text-xs text-brand-ink-muted">
                  Versión {legal.terms.version} / {legal.privacy.version}
                </span>
              ) : (
                <span className="block text-xs text-amber-800">Cargando documentos legales…</span>
              )}
            </span>
          </label>

          {error ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loading || !legal || !acceptedLegal}
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
