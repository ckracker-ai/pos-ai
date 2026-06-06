import Image from 'next/image';
import Link from 'next/link';
import { PosAiLogo } from '@/components/atoms/PosAiLogo';
import { LandingContactForm } from '@/components/molecules/LandingContactForm';
import {
  LANDING_AI_PILLARS,
  LANDING_AI_STEPS,
  LANDING_BRAND,
  LANDING_STATS,
} from '@/core/constants/landing-content';
import type { LandingPlan } from '@/core/constants/landing-plans';
import { LANDING_MODULES } from '@/core/constants/landing-plans';

type LandingPageProps = {
  plans: LandingPlan[];
};

function LandingNav() {
  return (
    <header className="landing-header fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-brand-olive/75 backdrop-blur-xl">
      <div className="mx-auto flex min-h-[4.25rem] max-w-6xl items-center justify-between gap-4 px-4 py-2 sm:px-6 lg:px-8">
        <Link href="/" className="flex shrink-0 items-center" aria-label="POS-AI inicio">
          <PosAiLogo height={40} width={72} priority className="brightness-0 invert" />
        </Link>
        <nav className="hidden items-center gap-7 text-sm font-medium text-white/85 md:flex">
          <a href="#ia" className="transition hover:text-white">
            Inteligencia
          </a>
          <a href="#servicios" className="transition hover:text-white">
            Servicios
          </a>
          <a href="#planes" className="transition hover:text-white">
            Planes
          </a>
          <a href="#contacto" className="transition hover:text-white">
            Contacto
          </a>
        </nav>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/registro"
            className="hidden rounded-full border border-white/35 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10 sm:inline-block"
          >
            Registrarse
          </Link>
          <Link
            href="/login"
            className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-brand-olive shadow-sm transition hover:bg-brand-linen"
          >
            Iniciar sesión
          </Link>
        </div>
      </div>
    </header>
  );
}

function HeroProductPreview() {
  return (
    <div className="landing-hero-preview relative p-4 sm:p-5 lg:max-w-md lg:justify-self-end">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-linen/90">Vista POS IA</p>
        <span className="rounded-full border border-emerald-400/30 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-200">
          En vivo
        </span>
      </div>
      <div className="landing-hero-preview-inner space-y-3 p-4">
        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
          <span className="text-brand-linen" aria-hidden>
            🎤
          </span>
          <p className="text-sm text-white/90">&quot;agrega 2 empanadas de pino&quot;</p>
        </div>
        <ul className="space-y-2 text-sm">
          <li className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2 text-white/90">
            <span>Empanada de pino</span>
            <span className="font-semibold text-brand-linen">×2</span>
          </li>
          <li className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2 text-white/90">
            <span>Café tradicional</span>
            <span className="font-semibold text-brand-linen">×1</span>
          </li>
        </ul>
        <div className="flex items-center justify-between border-t border-white/10 pt-3">
          <span className="text-xs text-white/60">Total estimado</span>
          <span className="font-serif text-lg font-semibold text-brand-linen">$4.850</span>
        </div>
      </div>
      <div className="mt-3 flex items-start gap-2 rounded-xl border border-[#25D366]/25 bg-[#25D366]/10 px-3 py-2.5">
        <span className="mt-0.5 text-xs font-bold text-[#25D366]" aria-hidden>
          WSP
        </span>
        <p className="text-xs leading-relaxed text-white/80">
          Comprobante validado · monto y cuenta coinciden con tu perfil de transferencia.
        </p>
      </div>
    </div>
  );
}

function HeroSection() {
  return (
    <section className="landing-hero relative min-h-[100svh] overflow-hidden pt-[4.25rem]">
      <div className="landing-hero-base pointer-events-none absolute inset-0" aria-hidden />
      <div className="landing-hero-mesh pointer-events-none absolute inset-0" aria-hidden />
      <div className="landing-hero-orb landing-hero-orb--1" aria-hidden />
      <div className="landing-hero-orb landing-hero-orb--2" aria-hidden />
      <div className="landing-hero-grid pointer-events-none absolute inset-0 opacity-60" aria-hidden />

      <div className="relative mx-auto flex min-h-[calc(100svh-4.25rem)] max-w-6xl flex-col justify-center px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-10">
          <div className="max-w-xl">
            <p className="landing-badge mb-6 inline-flex items-center gap-2 rounded-full border border-brand-linen/35 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-brand-linen backdrop-blur-sm">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-linen" aria-hidden />
              ERP con IA nativa · Chile
            </p>
            <h1 className="font-serif text-4xl font-semibold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-[3.35rem]">
              Punto de venta inteligente para la próxima generación de PYMEs
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-white/82">
              Habla o escribe como en el mostrador. POS-AI une caja, inventario, comandas y —en plan Estándar—
              un asistente WhatsApp que conoce tu catálogo y valida transferencias con los datos de tu empresa.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:gap-4">
              <Link
                href="/registro"
                className="inline-flex min-w-[200px] items-center justify-center rounded-full bg-brand-linen px-8 py-3.5 text-base font-semibold text-brand-olive shadow-lg transition hover:bg-white"
              >
                Crear mi negocio
              </Link>
              <a
                href="#ia"
                className="inline-flex min-w-[200px] items-center justify-center rounded-full border border-white/35 bg-white/5 px-8 py-3.5 text-base font-semibold text-white backdrop-blur-sm transition hover:bg-white/12"
              >
                Ver cómo funciona la IA
              </a>
            </div>
          </div>

          <HeroProductPreview />
        </div>

        <ul className="landing-stats mt-14 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4 lg:mt-16">
          {LANDING_STATS.map((s) => (
            <li key={s.label} className="landing-stat-card rounded-2xl px-4 py-3.5 sm:py-4">
              <p className="landing-stat-value font-serif text-2xl font-semibold sm:text-3xl">{s.value}</p>
              <p className="landing-stat-label mt-1.5 text-xs leading-snug">{s.label}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function AiSection() {
  return (
    <section id="ia" className="relative border-t border-brand-linen/50 bg-brand-surface px-4 py-24 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute right-0 top-0 h-64 w-64 rounded-full bg-brand-olive/5 blur-3xl" />
      <div className="mx-auto max-w-6xl">
        <div className="max-w-2xl">
          <p className="landing-section-eyebrow text-xs font-semibold uppercase text-brand-olive">
            Vanguardia operativa
          </p>
          <h2 className="mt-3 font-serif text-3xl font-semibold text-brand-ink sm:text-4xl">
            IA que no improvisa: conoce tu stock, tu plan y tus datos de pago
          </h2>
          <p className="mt-4 text-brand-ink-muted">
            No es un chatbot suelto. El asistente POS-AI lee el catálogo por sucursal, arma pedidos reales y
            contrasta comprobantes de transferencia contra el perfil bancario que configuras en tu empresa.
          </p>
        </div>

        <ul className="mt-14 grid gap-6 lg:grid-cols-3">
          {LANDING_AI_PILLARS.map((p) => (
            <li key={p.title} className="landing-glass-card group p-8">
              <span
                className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand-olive/10 font-serif text-lg text-brand-olive transition group-hover:bg-brand-olive group-hover:text-white"
                aria-hidden
              >
                {p.icon}
              </span>
              <h3 className="mt-5 text-lg font-semibold text-brand-ink">{p.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-brand-ink-muted">{p.desc}</p>
            </li>
          ))}
        </ul>

        <ol className="mt-16 grid gap-8 md:grid-cols-3">
          {LANDING_AI_STEPS.map((s) => (
            <li key={s.step} className="relative border-l-2 border-brand-olive/25 pl-6">
              <span className="font-mono text-xs font-bold text-brand-olive">{s.step}</span>
              <h3 className="mt-2 font-semibold text-brand-ink">{s.title}</h3>
              <p className="mt-2 text-sm text-brand-ink-muted">{s.desc}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function ServicesSection() {
  return (
    <section id="servicios" className="landing-services relative overflow-hidden border-t border-brand-linen/60 px-4 py-24 sm:px-6 lg:px-8">
      <Image
        src={LANDING_BRAND.heroAccent}
        alt=""
        fill
        className="object-cover object-center"
        sizes="100vw"
      />
      <div className="landing-services-overlay pointer-events-none absolute inset-0" aria-hidden />
      <div className="landing-hero-grid pointer-events-none absolute inset-0 opacity-25" aria-hidden />

      <div className="relative mx-auto max-w-6xl">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="landing-section-eyebrow text-xs font-semibold uppercase text-brand-olive">
              Módulos operativos
            </p>
            <h2 className="mt-3 font-serif text-3xl font-semibold text-brand-ink sm:text-4xl">
              Todo lo que tu local necesita
            </h2>
            <p className="mt-4 text-brand-ink-muted">
              Diez módulos operativos en un solo SaaS — sin piezas sueltas. Diseñado para empanaderías,
              cafeterías y retail chico que quieren crecer con orden.
            </p>
          </div>
          <Link
            href="/registro"
            className="inline-flex shrink-0 items-center justify-center rounded-full border border-brand-olive bg-white/90 px-6 py-3 text-sm font-semibold text-brand-olive shadow-sm backdrop-blur-sm transition hover:bg-brand-olive hover:text-white"
          >
            Probar gratis el onboarding
          </Link>
        </div>
        <ul className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {LANDING_MODULES.map((m) => (
            <li key={m.title} className="landing-module-card landing-module-card--on-image p-6">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-olive text-sm font-bold text-white">
                {m.title.charAt(0)}
              </span>
              <h3 className="mt-4 text-lg font-semibold text-brand-ink">{m.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-brand-ink-muted">{m.desc}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function PlansSection({ plans }: { plans: LandingPlan[] }) {
  return (
    <section id="planes" className="landing-plans px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <h2 className="font-serif text-3xl font-semibold text-brand-ink sm:text-4xl">
            Planes claros, precio predecible
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-brand-ink-muted">
            Mensualidad en pesos chilenos + IVA. Sube de plan cuando necesites más sucursales, usuarios o
            canales — sin sorpresas.
          </p>
        </div>
        <div className="mt-14 grid gap-8 lg:grid-cols-3">
          {plans.map((plan) => (
            <article
              key={plan.codigo}
              className={`relative flex flex-col rounded-2xl border bg-white p-8 shadow-sm transition hover:shadow-xl ${
                plan.destacado
                  ? 'border-brand-olive ring-2 ring-brand-olive/25 lg:-translate-y-1'
                  : 'border-brand-linen'
              }`}
            >
              {plan.destacado ? (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-olive px-4 py-1 text-xs font-semibold uppercase tracking-wide text-white">
                  Con IA WhatsApp
                </span>
              ) : null}
              <h3 className="text-xl font-semibold text-brand-ink">{plan.nombre}</h3>
              <p className="mt-2 text-sm text-brand-ink-muted">{plan.tagline}</p>
              <p className="mt-6 font-serif text-3xl font-semibold text-brand-olive">{plan.valorLabel}</p>
              <p className="mt-1 text-xs text-brand-ink-muted">
                {plan.sucursales} · {plan.usuarios}
              </p>
              <p className="mt-1 text-xs text-brand-ink-muted">{plan.roles}</p>
              <ul className="mt-8 flex-1 space-y-3 text-sm text-brand-ink">
                {plan.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <span className="mt-0.5 text-brand-olive" aria-hidden>
                      ✓
                    </span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                href={`/registro?plan=${plan.codigo}`}
                className={`mt-8 block rounded-full py-3 text-center text-sm font-semibold transition ${
                  plan.destacado
                    ? 'bg-brand-olive text-white hover:bg-[#3d4532]'
                    : 'border border-brand-linen text-brand-ink hover:border-brand-olive hover:bg-brand-surface'
                }`}
              >
                Comenzar
              </Link>
            </article>
          ))}
        </div>
        <p className="mt-10 text-center text-xs text-brand-ink-muted">
          Piloto de lanzamiento: 20–30% de descuento los primeros 3 meses. Plan anual con ~2 meses de regalo.
        </p>
      </div>
    </section>
  );
}

function ContactSection({ plans }: { plans: LandingPlan[] }) {
  const planOptions = plans.map((p) => ({ codigo: p.codigo, nombre: p.nombre }));
  return (
    <section id="contacto" className="border-t border-brand-linen/60 bg-white px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="text-center">
          <h2 className="font-serif text-3xl font-semibold text-brand-ink">¿Listo para ordenar tu operación?</h2>
          <p className="mt-4 text-brand-ink-muted">
            Regístrate en minutos o escríbenos si buscas piloto, integración o precio especial para tu cadena.
          </p>
        </div>
        <div className="landing-glass-card mt-10 p-6 sm:p-8">
          <LandingContactForm planOptions={planOptions} />
        </div>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/login"
            className="inline-flex rounded-full border border-brand-linen px-8 py-3 text-sm font-semibold text-brand-ink transition hover:border-brand-olive hover:bg-brand-surface"
          >
            Ya tengo cuenta — iniciar sesión
          </Link>
          <Link
            href="/registro"
            className="inline-flex rounded-full bg-brand-olive px-8 py-3 text-sm font-semibold text-white transition hover:bg-[#3d4532]"
          >
            Crear cuenta ahora
          </Link>
        </div>
      </div>
    </section>
  );
}

function LandingFooter() {
  return (
    <footer className="border-t border-brand-linen bg-brand-olive px-4 py-12 text-white sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 sm:flex-row">
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-center">
          <PosAiLogo width={88} className="brightness-0 invert" />
          <span className="text-center text-sm text-white/75 sm:text-left">
            © {new Date().getFullYear()} POS-AI · Punto de venta Inteligente
          </span>
        </div>
        <div className="flex flex-wrap justify-center gap-4 text-sm sm:gap-6">
          <Link href="/login" className="font-medium text-brand-linen hover:text-white">
            Acceso negocio
          </Link>
          <Link href="/platform/login" className="text-white/75 hover:text-white">
            Plataforma
          </Link>
          <Link href="/legal/terminos" className="text-white/75 hover:text-white">
            Términos
          </Link>
          <Link href="/legal/privacidad" className="text-white/75 hover:text-white">
            Privacidad
          </Link>
        </div>
      </div>
    </footer>
  );
}

export function LandingPage({ plans }: LandingPageProps) {
  return (
    <div className="landing-page min-h-screen">
      <LandingNav />
      <main>
        <HeroSection />
        <AiSection />
        <ServicesSection />
        <PlansSection plans={plans} />
        <ContactSection plans={plans} />
      </main>
      <LandingFooter />
    </div>
  );
}
