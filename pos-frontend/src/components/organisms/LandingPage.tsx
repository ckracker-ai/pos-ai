import Image from 'next/image';
import Link from 'next/link';
import { PosAiLogo } from '@/components/atoms/PosAiLogo';
import { LandingContactForm } from '@/components/molecules/LandingContactForm';
import {
  LANDING_AI_PILLARS,
  LANDING_AI_STEPS,
  LANDING_HERO_BG,
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

function HeroSection() {
  return (
    <section className="landing-hero relative min-h-[100svh] overflow-hidden pt-[4.25rem]">
      <Image
        src={LANDING_HERO_BG}
        alt=""
        fill
        priority
        className="object-cover object-center"
        sizes="100vw"
      />
      <div className="landing-hero-overlay pointer-events-none absolute inset-0" aria-hidden />
      <div className="landing-hero-grid pointer-events-none absolute inset-0 opacity-40" aria-hidden />

      <div className="relative mx-auto flex min-h-[calc(100svh-4.25rem)] max-w-6xl flex-col justify-center px-4 py-16 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="landing-badge mb-6 inline-flex items-center gap-2 rounded-full border border-brand-linen/40 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-brand-linen backdrop-blur-sm">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-linen" aria-hidden />
            ERP con IA nativa · Chile
          </p>
          <h1 className="font-serif text-4xl font-semibold leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-6xl">
            Punto de venta inteligente para la próxima generación de PYMEs
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/85">
            POS-AI unifica caja, inventario, comandas y —cuando lo necesitas— un asistente de WhatsApp que
            entiende tu negocio, valida transferencias y opera con los mismos datos que tu equipo en tienda.
          </p>
          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <Link
              href="/registro"
              className="inline-flex min-w-[200px] items-center justify-center rounded-full bg-brand-linen px-8 py-3.5 text-base font-semibold text-brand-olive shadow-lg transition hover:bg-white"
            >
              Crear mi negocio
            </Link>
            <a
              href="#ia"
              className="inline-flex min-w-[200px] items-center justify-center rounded-full border border-white/40 bg-white/5 px-8 py-3.5 text-base font-semibold text-white backdrop-blur-sm transition hover:bg-white/15"
            >
              Ver cómo funciona la IA
            </a>
          </div>
        </div>

        <ul className="landing-stats mt-16 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:mt-20">
          {LANDING_STATS.map((s) => (
            <li
              key={s.label}
              className="rounded-2xl border border-white/15 bg-white/5 px-4 py-4 backdrop-blur-md"
            >
              <p className="font-serif text-2xl font-semibold text-brand-linen sm:text-3xl">{s.value}</p>
              <p className="mt-1 text-xs text-white/75">{s.label}</p>
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
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-brand-olive">Vanguardia operativa</p>
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
    <section id="servicios" className="border-t border-brand-linen/60 bg-white px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <h2 className="font-serif text-3xl font-semibold text-brand-ink sm:text-4xl">
              Todo lo que tu local necesita
            </h2>
            <p className="mt-4 text-brand-ink-muted">
              Diez módulos operativos en un solo SaaS — sin piezas sueltas. Diseñado para empanaderías,
              cafeterías y retail chico que quieren crecer con orden.
            </p>
          </div>
          <Link
            href="/registro"
            className="inline-flex shrink-0 items-center justify-center rounded-full border border-brand-olive px-6 py-3 text-sm font-semibold text-brand-olive transition hover:bg-brand-olive hover:text-white"
          >
            Probar gratis el onboarding
          </Link>
        </div>
        <ul className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {LANDING_MODULES.map((m) => (
            <li key={m.title} className="landing-module-card p-6">
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
        <div className="flex gap-6 text-sm">
          <Link href="/login" className="font-medium text-brand-linen hover:text-white">
            Acceso negocio
          </Link>
          <Link href="/platform/login" className="text-white/75 hover:text-white">
            Plataforma
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
