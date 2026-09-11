import { Inter } from 'next/font/google';
import Image from 'next/image';
import Link from 'next/link';
import { LANDING_STAT_ICONS } from '@/components/atoms/LandingStatIcons';
import { PosAiLogo } from '@/components/atoms/PosAiLogo';
import { LandingContactForm } from '@/components/molecules/LandingContactForm';
import { LandingFeatureCarousel } from '@/components/molecules/LandingFeatureCarousel';
import { LandingHeroMockup } from '@/components/molecules/LandingHeroMockup';
import {
  LANDING_AI_PILLARS,
  LANDING_AI_STEPS,
  LANDING_BRAND,
  LANDING_MEDIA,
  LANDING_STATS,
} from '@/core/constants/landing-content';
import type { LandingPlan } from '@/core/constants/landing-plans';
import { LANDING_MODULES } from '@/core/constants/landing-plans';

type LandingPageProps = {
  plans: LandingPlan[];
};

const landingSans = Inter({
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600'],
});

function LandingNav() {
  return (
    <header className="landing-header fixed inset-x-0 top-0 z-50 border-b border-brand-linen/80 bg-brand-surface/90 backdrop-blur-md">
      <div className="mx-auto flex min-h-[4.75rem] max-w-6xl items-center justify-between gap-4 px-4 py-2 sm:px-6 lg:px-8">
        <Link href="/" className="flex shrink-0 items-center" aria-label="POS-AI inicio">
          <PosAiLogo height={56} priority />
        </Link>
        <nav className="hidden items-center gap-7 text-[13px] font-medium text-brand-ink-muted md:flex">
          <a href="#producto" className="transition hover:text-brand-olive">
            Producto
          </a>
          <a href="#ia" className="transition hover:text-brand-olive">
            Inteligencia
          </a>
          <a href="#servicios" className="transition hover:text-brand-olive">
            Servicios
          </a>
          <a href="#planes" className="transition hover:text-brand-olive">
            Planes
          </a>
          <a href="#contacto" className="transition hover:text-brand-olive">
            Contacto
          </a>
        </nav>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/registro"
            className="hidden rounded-full border border-brand-linen px-4 py-2 text-[13px] font-medium text-brand-ink transition hover:border-brand-olive sm:inline-block"
          >
            Registrarse
          </Link>
          <Link
            href="/login"
            className="rounded-full bg-brand-olive px-4 py-2 text-[13px] font-medium text-white transition hover:bg-[#3d4532]"
          >
            Iniciar sesión
          </Link>
        </div>
      </div>
    </header>
  );
}

function LandingHeroImageFrame({ priority = false, className = '' }: { priority?: boolean; className?: string }) {
  return (
    <div className={`relative aspect-[3/2] w-full overflow-hidden rounded-2xl border border-brand-linen shadow-md shadow-brand-olive/10 ${className}`}>
      <Image
        src={LANDING_MEDIA.heroSlide}
        alt="POS-AI — copiloto de negocio con IA en caja, WhatsApp y ERP"
        fill
        priority={priority}
        className="object-cover object-center"
        sizes="(max-width: 1024px) 90vw, 520px"
      />
    </div>
  );
}

function HeroSection() {
  return (
    <section className="landing-hero relative overflow-hidden pt-[4.75rem]">
      <div className="landing-hero-photo pointer-events-none absolute inset-0" aria-hidden>
        <Image
          src={LANDING_MEDIA.heroBackground}
          alt=""
          fill
          priority
          className="object-cover object-center"
          sizes="100vw"
        />
      </div>
      <div className="relative mx-auto max-w-6xl px-4 pb-8 pt-16 sm:px-6 sm:pt-20 lg:px-8 lg:pt-24">
        <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
          <div className="max-w-xl">
            <p className="mb-5 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-linen">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-linen" aria-hidden />
              ERP con IA · Chile
            </p>
            <h1 className="text-[1.85rem] font-semibold leading-[1.2] tracking-tight text-white sm:text-[2.2rem] lg:text-[2.45rem]">
              {LANDING_BRAND.tagline}
            </h1>
            <p className="mt-5 text-base leading-relaxed text-white/85 sm:text-lg">
              Caja, inventario, comandas y asistente WhatsApp con stock real por sucursal. Un solo ERP en la nube
              para operar y crecer con orden.
            </p>
            <Link
              href="/registro"
              className="mt-8 inline-flex items-center justify-center rounded-full bg-white px-7 py-3 text-sm font-semibold text-brand-olive shadow-sm transition hover:bg-brand-linen"
            >
              Crear mi negocio
            </Link>
          </div>

          <div className="landing-hero-visual w-full">
            <LandingHeroMockup />
          </div>
        </div>
      </div>

      <div className="relative border-t border-white/15 bg-[#3d4532]/35 backdrop-blur-[6px]">
        <ul className="mx-auto grid max-w-6xl grid-cols-2 gap-3 px-4 py-8 sm:grid-cols-4 sm:gap-4 sm:px-6 lg:px-8">
          {LANDING_STATS.map((s) => {
            const Icon = LANDING_STAT_ICONS[s.value as keyof typeof LANDING_STAT_ICONS];
            return (
              <li
                key={s.label}
                className="rounded-2xl border border-brand-linen bg-white px-4 py-5 shadow-sm"
              >
                <span className="text-brand-olive">{Icon ? <Icon /> : null}</span>
                <p className="mt-3 text-lg font-semibold tracking-tight text-brand-ink">{s.value}</p>
                <p className="mt-1 text-xs leading-snug text-brand-ink-muted">{s.label}</p>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

function ProductImageSection() {
  return (
    <section id="producto" className="border-t border-brand-linen/70 bg-white px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
      <div className="mx-auto max-w-6xl text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-olive">Vista del producto</p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-brand-ink sm:text-3xl">
          El POS que piensa, aprende y hace crecer tu negocio
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-brand-ink-muted">
          IA en el core, WhatsApp, telefonía y ERP completo — diseñado para PYMEs chilenas.
        </p>
        <div className="mx-auto mt-12 max-w-4xl">
          <LandingHeroImageFrame />
        </div>
      </div>
    </section>
  );
}

function FeatureSlidesSection() {
  return (
    <section id="servicios" className="border-t border-brand-linen/70 bg-brand-surface px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-olive">Capacidades</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-brand-ink sm:text-3xl">
            IA en el core, WhatsApp y voz
          </h2>
          <p className="mt-4 text-brand-ink-muted">
            Desliza o elige una pestaña para ver cada canal de inteligencia artificial.
          </p>
        </div>

        <div className="mt-10">
          <LandingFeatureCarousel slides={LANDING_MEDIA.featureSlides} />
        </div>
      </div>
    </section>
  );
}

function AiSection() {
  return (
    <section id="ia" className="relative border-t border-brand-linen/70 bg-white px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-2xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-olive">Vanguardia operativa</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-brand-ink sm:text-3xl">
            IA que no improvisa: conoce tu stock, tu plan y tus datos de pago
          </h2>
          <p className="mt-4 text-brand-ink-muted">
            No es un chatbot suelto. El asistente POS-AI lee el catálogo por sucursal, arma pedidos reales y
            contrasta comprobantes de transferencia contra el perfil bancario que configuras en tu empresa.
          </p>
        </div>

        <ul className="mt-14 grid gap-4 lg:grid-cols-3">
          {LANDING_AI_PILLARS.map((p) => (
            <li key={p.title} className="rounded-2xl border border-brand-linen bg-brand-surface p-7">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-brand-olive/10 text-sm text-brand-olive" aria-hidden>
                {p.icon}
              </span>
              <h3 className="mt-5 text-base font-semibold text-brand-ink">{p.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-brand-ink-muted">{p.desc}</p>
            </li>
          ))}
        </ul>

        <ol className="mt-16 grid gap-8 md:grid-cols-3">
          {LANDING_AI_STEPS.map((s) => (
            <li key={s.step} className="border-l-2 border-brand-olive/25 pl-5">
              <span className="text-xs font-semibold text-brand-olive">{s.step}</span>
              <h3 className="mt-2 font-semibold text-brand-ink">{s.title}</h3>
              <p className="mt-2 text-sm text-brand-ink-muted">{s.desc}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function ModulesSection() {
  return (
    <section className="border-t border-brand-linen/70 bg-brand-surface px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-olive">Módulos operativos</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-brand-ink sm:text-3xl">
              Todo lo que tu local necesita
            </h2>
            <p className="mt-4 text-brand-ink-muted">
              Diez módulos operativos en un solo SaaS — sin piezas sueltas. Diseñado para PYMEs que quieren crecer
              con orden.
            </p>
          </div>
          <Link
            href="/registro"
            className="inline-flex shrink-0 items-center justify-center rounded-full border border-brand-olive bg-white px-5 py-2.5 text-sm font-semibold text-brand-olive transition hover:bg-brand-olive hover:text-white"
          >
            Probar gratis el onboarding
          </Link>
        </div>
        <ul className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {LANDING_MODULES.map((m) => (
            <li key={m.title} className="rounded-2xl border border-brand-linen bg-white p-6">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-brand-olive text-sm font-bold text-white">
                {m.title.charAt(0)}
              </span>
              <h3 className="mt-4 text-base font-semibold text-brand-ink">{m.title}</h3>
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
    <section id="planes" className="border-t border-brand-linen/70 bg-white px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <h2 className="text-2xl font-semibold tracking-tight text-brand-ink sm:text-3xl">
            Planes claros, precio predecible
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-brand-ink-muted">
            Mensualidad en pesos chilenos + IVA. Sube de plan cuando necesites más sucursales, usuarios o
            canales — sin sorpresas.
          </p>
        </div>
        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {plans.map((plan) => (
            <article
              key={plan.codigo}
              className={`relative flex flex-col rounded-2xl border bg-white p-8 ${
                plan.destacado ? 'border-brand-olive shadow-md shadow-brand-olive/10' : 'border-brand-linen'
              }`}
            >
              {plan.destacado ? (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-olive px-3 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                  Con IA WhatsApp
                </span>
              ) : null}
              <h3 className="text-lg font-semibold text-brand-ink">{plan.nombre}</h3>
              <p className="mt-2 text-sm text-brand-ink-muted">{plan.tagline}</p>
              <p className="mt-6 text-2xl font-semibold text-brand-olive">{plan.valorLabel}</p>
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
                className={`mt-8 block rounded-full py-2.5 text-center text-sm font-semibold transition ${
                  plan.destacado
                    ? 'bg-brand-olive text-white hover:bg-[#3d4532]'
                    : 'border border-brand-linen text-brand-ink hover:border-brand-olive'
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
    <section id="contacto" className="border-t border-brand-linen/70 bg-brand-surface px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="text-center">
          <h2 className="text-2xl font-semibold tracking-tight text-brand-ink">¿Listo para ordenar tu operación?</h2>
          <p className="mt-4 text-brand-ink-muted">
            Regístrate en minutos o escríbenos si buscas piloto, integración o precio especial para tu cadena.
          </p>
        </div>
        <div className="mt-10 rounded-2xl border border-brand-linen bg-white p-6 sm:p-8">
          <LandingContactForm planOptions={planOptions} />
        </div>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/login"
            className="inline-flex rounded-full border border-brand-linen px-6 py-2.5 text-sm font-semibold text-brand-ink transition hover:border-brand-olive"
          >
            Ya tengo cuenta — iniciar sesión
          </Link>
          <Link
            href="/registro"
            className="inline-flex rounded-full bg-brand-olive px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#3d4532]"
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
    <footer className="border-t border-brand-olive bg-brand-olive px-4 py-10 text-white sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 sm:flex-row">
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-center">
          <PosAiLogo height={52} withBackground />
          <span className="text-center text-sm text-white/80 sm:text-left">
            © {new Date().getFullYear()} {LANDING_BRAND.tagline}
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
          <Link href="/legal/sla" className="text-white/75 hover:text-white">
            SLA
          </Link>
        </div>
      </div>
    </footer>
  );
}

export function LandingPage({ plans }: LandingPageProps) {
  return (
    <div className={`${landingSans.className} landing-page min-h-screen text-brand-ink`}>
      <LandingNav />
      <main>
        <HeroSection />
        <ProductImageSection />
        <FeatureSlidesSection />
        <AiSection />
        <ModulesSection />
        <PlansSection plans={plans} />
        <ContactSection plans={plans} />
      </main>
      <LandingFooter />
    </div>
  );
}
