'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { PosAiLogo } from '@/components/atoms/PosAiLogo';
import { LegalAcceptanceField } from '@/components/molecules/LegalAcceptanceField';
import { posProxyPath } from '@/core/constants/api-path';
import type { SaasPlanCodigo } from '@/core/interfaces';
import { formatRutInput, parseRut } from '@/core/utils/rutChile';
import { formatPlanValor } from '@/core/constants/saas-plan';
import type { LandingPlan } from '@/core/constants/landing-plans';
import type { PublicLegalCurrent } from '@/core/api/public-legal';

const PLAN_CODIGOS: SaasPlanCodigo[] = ['BASICO', 'ESTANDAR', 'FULL'];

const STEPS = [
  { id: 'empresa', label: 'Datos empresa' },
  { id: 'tenant', label: 'Configuración tenant' },
  { id: 'plan', label: 'Plan SaaS' },
] as const;

type StepId = (typeof STEPS)[number]['id'];

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
  if (error.includes('PLAN_NOT_FOUND')) {
    return 'El plan seleccionado no está disponible. Recarga la página o elige otro plan.';
  }
  if (error.includes('socket hang up') || error.includes('ECONNRESET')) {
    return 'El servidor se reinició durante el registro. Espera unos segundos e intenta de nuevo.';
  }
  return error || 'No se pudo completar el registro. Intenta más tarde.';
}

function slugPreview(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 32);
  return base || 'mi-negocio';
}

function RegistroStepTabs({
  step,
  maxReached,
  onGoTo,
}: {
  step: number;
  maxReached: number;
  onGoTo: (index: number) => void;
}) {
  return (
    <nav aria-label="Pasos del registro" className="mb-6">
      <ol className="flex items-center gap-1 rounded-xl border border-brand-linen/80 bg-brand-surface/40 p-1">
        {STEPS.map((s, i) => {
          const active = step === i;
          const done = i < step;
          const reachable = i <= maxReached;
          return (
            <li key={s.id} className="flex-1">
              <button
                type="button"
                disabled={!reachable}
                onClick={() => reachable && onGoTo(i)}
                className={`w-full rounded-lg px-2 py-2.5 text-center text-[11px] font-semibold transition sm:text-xs ${
                  active
                    ? 'bg-brand-olive text-white shadow-sm'
                    : done
                      ? 'text-brand-olive hover:bg-white/80'
                      : reachable
                        ? 'text-brand-ink-muted hover:bg-white/60'
                        : 'cursor-not-allowed text-brand-ink-muted/50'
                }`}
              >
                <span className="hidden sm:inline">{s.label}</span>
                <span className="sm:hidden">{i + 1}. {s.label.split(' ')[0]}</span>
              </button>
            </li>
          );
        })}
      </ol>
      <p className="mt-2 text-center text-xs text-brand-ink-muted">
        Paso {step + 1} de {STEPS.length} — {STEPS[step].label}
      </p>
    </nav>
  );
}

export function RegistroForm({ plans, legal: initialLegal }: RegistroFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialPlan = resolvePlanFromQuery(searchParams.get('plan'));

  const [step, setStep] = useState(0);
  const [maxReached, setMaxReached] = useState(0);

  const [modoRegistro, setModoRegistro] = useState<'FORMAL' | 'INFORMAL'>('FORMAL');
  const [rut, setRut] = useState('');
  const [razonSocial, setRazonSocial] = useState('');
  const [nombreFantasia, setNombreFantasia] = useState('');
  const [giroSii, setGiroSii] = useState('');
  const [rubroNegocio, setRubroNegocio] = useState('');
  const [telefonoNegocio, setTelefonoNegocio] = useState('');
  const [adminFullName, setAdminFullName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminPasswordConfirm, setAdminPasswordConfirm] = useState('');
  const [planCodigo, setPlanCodigo] = useState<SaasPlanCodigo>(initialPlan);
  const [branchName, setBranchName] = useState('Sucursal Central');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [acceptedLegal, setAcceptedLegal] = useState(false);
  const [legal, setLegal] = useState<PublicLegalCurrent | null>(initialLegal);

  const selectedPlan = useMemo(
    () => plans.find((p) => p.codigo === planCodigo) ?? plans[0],
    [plans, planCodigo]
  );

  const informal = modoRegistro === 'INFORMAL';
  const workspaceSlug = slugPreview(nombreFantasia || razonSocial);

  const inputClass =
    'mt-1 w-full rounded-lg border border-brand-linen bg-white px-3 py-2.5 text-sm text-brand-ink outline-none transition focus:border-brand-olive focus:ring-2 focus:ring-brand-olive/20';

  const validateStep = (stepId: StepId): string | null => {
    if (stepId === 'empresa') {
      if (!informal) {
        const parsed = parseRut(rut);
        if (!parsed?.valid) return 'Ingresa un RUT chileno válido.';
      }
      if (!razonSocial.trim()) {
        return informal ? 'Ingresa el nombre de tu negocio.' : 'Ingresa la razón social.';
      }
      if (informal && !rubroNegocio.trim()) return 'Indica el rubro de tu negocio.';
      return null;
    }

    if (stepId === 'tenant') {
      if (!adminFullName.trim()) return 'Ingresa tu nombre como administrador.';
      if (!adminEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail.trim())) {
        return 'Ingresa un correo válido.';
      }
      if (adminPassword.length < 8) return 'La contraseña debe tener al menos 8 caracteres.';
      if (adminPassword !== adminPasswordConfirm) return 'Las contraseñas no coinciden.';
      if (!branchName.trim()) return 'Ingresa el nombre de la primera sucursal.';
      return null;
    }

    if (!legal?.terms?.version || !legal?.privacy?.version) {
      return 'No se pudieron cargar los documentos legales. Usa «Reintentar» o recarga la página.';
    }
    if (!acceptedLegal) {
      return 'Debes aceptar los Términos de Servicio y la Política de Privacidad.';
    }
    return null;
  };

  const goNext = () => {
    setError('');
    const err = validateStep(STEPS[step].id);
    if (err) {
      setError(err);
      return;
    }
    const next = Math.min(step + 1, STEPS.length - 1);
    setStep(next);
    setMaxReached((m) => Math.max(m, next));
  };

  const goBack = () => {
    setError('');
    setStep((s) => Math.max(0, s - 1));
  };

  const goToStep = (index: number) => {
    if (index > step) {
      for (let i = step; i < index; i++) {
        const err = validateStep(STEPS[i].id);
        if (err) {
          setError(err);
          setStep(i);
          return;
        }
      }
    }
    setError('');
    setStep(index);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    for (const s of STEPS) {
      const err = validateStep(s.id);
      if (err) {
        setError(err);
        setStep(STEPS.findIndex((x) => x.id === s.id));
        return;
      }
    }

    let rutPayload: string | undefined;
    if (!informal) {
      const parsed = parseRut(rut);
      rutPayload = parsed?.rutEmpresa;
    }

    const legalAcceptance = {
      termsVersion: legal!.terms.version,
      privacyVersion: legal!.privacy.version,
      accepted: true as const,
    };

    const sharedPayload = {
      razonSocial: razonSocial.trim(),
      nombreFantasia: nombreFantasia.trim() || undefined,
      rubroNegocio: rubroNegocio.trim() || undefined,
      telefonoNegocio: telefonoNegocio.trim() || undefined,
      adminEmail: adminEmail.trim().toLowerCase(),
      adminPassword,
      adminFullName: adminFullName.trim(),
      branchName: branchName.trim() || 'Sucursal Central',
      legalAcceptance,
    };

    setLoading(true);
    try {
      const res = await fetch(posProxyPath('public/registro'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          informal
            ? { modoRegistro: 'INFORMAL', ...sharedPayload }
            : {
                modoRegistro: 'FORMAL',
                rut: rutPayload,
                giroSii: giroSii.trim() || undefined,
                planCodigo,
                ...sharedPayload,
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

  const isLastStep = step === STEPS.length - 1;
  const canSubmit = Boolean(legal) && acceptedLegal && !loading;

  return (
    <div className="w-full max-w-lg mx-auto">
      <div className="login-card rounded-2xl bg-white/95 p-6 backdrop-blur-sm sm:p-8">
        <div className="mb-5 flex flex-col items-center text-center">
          <Link href="/">
            <PosAiLogo width={160} priority className="mb-2" />
          </Link>
          <h1 className="text-lg font-semibold text-brand-olive">Registro piloto</h1>
          <p className="mt-1 text-sm text-brand-ink-muted">
            90 días de piloto — completa los 3 pasos
          </p>
        </div>

        <RegistroStepTabs step={step} maxReached={maxReached} onGoTo={goToStep} />

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* —— Paso 1: Datos empresa —— */}
          {step === 0 ? (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-brand-ink">¿Tienes RUT de empresa?</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setModoRegistro('FORMAL')}
                    className={`rounded-lg border px-3 py-2.5 text-xs font-semibold transition ${
                      !informal
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
                    className={`rounded-lg border px-3 py-2.5 text-xs font-semibold transition ${
                      informal
                        ? 'border-brand-olive bg-brand-olive text-white'
                        : 'border-brand-linen bg-white text-brand-ink'
                    }`}
                  >
                    Aún no — en marcha
                  </button>
                </div>
              </div>

              {!informal ? (
                <div>
                  <label className="text-sm font-medium text-brand-ink">RUT empresa *</label>
                  <input
                    className={inputClass}
                    value={rut}
                    onChange={(e) => setRut(formatRutInput(e.target.value))}
                    placeholder="12.345.678-9"
                    autoComplete="off"
                  />
                </div>
              ) : null}

              <div>
                <label className="text-sm font-medium text-brand-ink">
                  {informal ? 'Nombre del negocio *' : 'Razón social *'}
                </label>
                <input
                  className={inputClass}
                  value={razonSocial}
                  onChange={(e) => setRazonSocial(e.target.value)}
                  placeholder={informal ? 'Ej: Empanadas de la Plaza' : 'Ej: Inversiones SpA'}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-brand-ink">Nombre fantasía</label>
                <input
                  className={inputClass}
                  value={nombreFantasia}
                  onChange={(e) => setNombreFantasia(e.target.value)}
                  placeholder="Cómo te conocen tus clientes"
                />
              </div>

              {!informal ? (
                <div>
                  <label className="text-sm font-medium text-brand-ink">Giro SII</label>
                  <input
                    className={inputClass}
                    value={giroSii}
                    onChange={(e) => setGiroSii(e.target.value)}
                    placeholder="Ej: Restaurante, venta de comida preparada"
                  />
                  <p className="mt-1 text-xs text-brand-ink-muted">
                    Puedes completarlo después en Perfil de empresa.
                  </p>
                </div>
              ) : null}

              <div>
                <label className="text-sm font-medium text-brand-ink">
                  Rubro {informal ? '*' : '(opcional)'}
                </label>
                <input
                  className={inputClass}
                  value={rubroNegocio}
                  onChange={(e) => setRubroNegocio(e.target.value)}
                  placeholder="Ej: empanadas, feria, cafetería"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-brand-ink">Teléfono del negocio</label>
                <input
                  className={inputClass}
                  type="tel"
                  value={telefonoNegocio}
                  onChange={(e) => setTelefonoNegocio(e.target.value)}
                  placeholder="+56 9 1234 5678"
                  autoComplete="tel"
                />
              </div>
            </div>
          ) : null}

          {/* —— Paso 2: Configuración tenant —— */}
          {step === 1 ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-brand-linen/80 bg-brand-surface/30 px-4 py-3 text-sm">
                <p className="font-medium text-brand-olive">Tu espacio de trabajo</p>
                <p className="mt-1 text-brand-ink-muted">
                  Identificador:{' '}
                  <span className="font-mono text-xs text-brand-ink">{workspaceSlug}</span>
                </p>
                <p className="mt-1 text-xs text-brand-ink-muted">
                  Zona horaria: América/Santiago · Moneda: CLP
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-brand-ink">Nombre primera sucursal *</label>
                <input
                  className={inputClass}
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  placeholder="Sucursal Central"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-brand-ink">Administrador — nombre *</label>
                <input
                  className={inputClass}
                  value={adminFullName}
                  onChange={(e) => setAdminFullName(e.target.value)}
                  placeholder="Ej: María González"
                  autoComplete="name"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-brand-ink">Correo de acceso *</label>
                <input
                  type="email"
                  className={inputClass}
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="tu@negocio.cl"
                  autoComplete="email"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-brand-ink">Contraseña *</label>
                  <input
                    type="password"
                    className={inputClass}
                    minLength={8}
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-brand-ink">Confirmar *</label>
                  <input
                    type="password"
                    className={inputClass}
                    minLength={8}
                    value={adminPasswordConfirm}
                    onChange={(e) => setAdminPasswordConfirm(e.target.value)}
                    autoComplete="new-password"
                  />
                </div>
              </div>
            </div>
          ) : null}

          {/* —— Paso 3: Plan SaaS —— */}
          {step === 2 ? (
            <div className="space-y-4">
              {informal ? (
                <div className="rounded-xl border-2 border-brand-olive bg-brand-olive/5 px-4 py-3">
                  <p className="text-sm font-semibold text-brand-olive">Plan Básico</p>
                  <p className="mt-1 text-xs text-brand-ink-muted">
                    1 sucursal, 3 usuarios. Formaliza tu RUT cuando quieras en Perfil de empresa.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-brand-ink">Elige tu plan</p>
                  <div className="space-y-2">
                    {plans.map((p) => {
                      const selected = planCodigo === p.codigo;
                      return (
                        <button
                          key={p.codigo}
                          type="button"
                          onClick={() => setPlanCodigo(p.codigo)}
                          className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                            selected
                              ? 'border-brand-olive bg-brand-olive/5 ring-1 ring-brand-olive/30'
                              : 'border-brand-linen bg-white hover:border-brand-olive/40'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-sm font-semibold text-brand-ink">{p.nombre}</span>
                            <span className="shrink-0 text-xs font-medium text-brand-olive">
                              {formatPlanValor(p.valor)}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-brand-ink-muted">{p.tagline}</p>
                          {p.destacado ? (
                            <span className="mt-2 inline-block rounded-full bg-brand-olive/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-olive">
                              Recomendado
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {selectedPlan && !informal ? (
                <div className="rounded-lg border border-brand-linen/60 bg-brand-surface/20 px-3 py-2 text-xs text-brand-ink-muted">
                  <strong className="text-brand-ink">{razonSocial || 'Tu negocio'}</strong>
                  {' · '}
                  {selectedPlan.nombre} — {selectedPlan.sucursales}, {selectedPlan.usuarios}
                </div>
              ) : null}

              <LegalAcceptanceField
                initialLegal={initialLegal}
                accepted={acceptedLegal}
                onAcceptedChange={setAcceptedLegal}
                onLegalReady={setLegal}
              />
            </div>
          ) : null}

          {error ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
            </p>
          ) : null}

          <div className="flex gap-3 pt-1">
            {step > 0 ? (
              <button
                type="button"
                onClick={goBack}
                disabled={loading}
                className="flex-1 rounded-lg border border-brand-linen py-2.5 text-sm font-semibold text-brand-ink transition hover:border-brand-olive hover:bg-brand-surface disabled:opacity-60"
              >
                Atrás
              </button>
            ) : (
              <div className="flex-1" />
            )}

            {isLastStep ? (
              <button
                type="submit"
                disabled={!canSubmit}
                className="flex-[2] rounded-lg bg-brand-olive py-2.5 text-sm font-semibold text-white transition hover:bg-[#3d4532] disabled:opacity-60"
              >
                {loading ? 'Creando cuenta…' : 'Crear mi negocio'}
              </button>
            ) : (
              <button
                type="button"
                onClick={goNext}
                className="flex-[2] rounded-lg bg-brand-olive py-2.5 text-sm font-semibold text-white transition hover:bg-[#3d4532]"
              >
                Continuar
              </button>
            )}
          </div>
        </form>

        <p className="mt-5 text-center text-sm text-brand-ink-muted">
          ¿Ya tienes cuenta?{' '}
          <Link href="/login" className="font-medium text-brand-olive hover:underline">
            Iniciar sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
