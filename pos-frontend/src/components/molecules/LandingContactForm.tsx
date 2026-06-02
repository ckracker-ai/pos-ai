'use client';

import { useState } from 'react';
import type { SaasPlanCodigo } from '@/core/interfaces';

const CONTACT_EMAIL =
  process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() || 'contacto@pos-ai.local';

type LandingContactFormProps = {
  planOptions: { codigo: SaasPlanCodigo; nombre: string }[];
};

export function LandingContactForm({ planOptions }: LandingContactFormProps) {
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [empresa, setEmpresa] = useState('');
  const [plan, setPlan] = useState<SaasPlanCodigo>('ESTANDAR');
  const [mensaje, setMensaje] = useState('');
  const [sent, setSent] = useState(false);

  const inputClass =
    'mt-1 w-full rounded-lg border border-brand-linen bg-white px-3 py-2.5 text-brand-ink outline-none transition focus:border-brand-olive focus:ring-2 focus:ring-brand-olive/20';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const planLabel = planOptions.find((p) => p.codigo === plan)?.nombre ?? plan;
    const body = [
      `Nombre: ${nombre}`,
      `Correo: ${email}`,
      `Empresa: ${empresa}`,
      `Plan de interés: ${planLabel}`,
      '',
      mensaje,
    ].join('\n');
    const subject = encodeURIComponent(`Consulta POS-AI — ${empresa || nombre}`);
    const bodyEnc = encodeURIComponent(body);
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${bodyEnc}`;
    setSent(true);
  };

  if (sent) {
    return (
      <p className="rounded-xl border border-brand-linen bg-brand-surface/80 px-6 py-8 text-brand-ink-muted">
        Si tu cliente de correo no se abrió, escríbenos a{' '}
        <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-brand-olive hover:underline">
          {CONTACT_EMAIL}
        </a>
        . Te responderemos a la brevedad.
      </p>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto max-w-lg rounded-2xl border border-brand-linen bg-white p-6 shadow-sm sm:p-8"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-1">
          <label className="text-sm font-medium text-brand-ink">Nombre</label>
          <input
            className={inputClass}
            required
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            autoComplete="name"
          />
        </div>
        <div className="sm:col-span-1">
          <label className="text-sm font-medium text-brand-ink">Correo</label>
          <input
            type="email"
            className={inputClass}
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="text-sm font-medium text-brand-ink">Empresa / negocio</label>
          <input
            className={inputClass}
            value={empresa}
            onChange={(e) => setEmpresa(e.target.value)}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="text-sm font-medium text-brand-ink">Plan de interés</label>
          <select
            className={inputClass}
            value={plan}
            onChange={(e) => setPlan(e.target.value as SaasPlanCodigo)}
          >
            {planOptions.map((p) => (
              <option key={p.codigo} value={p.codigo}>
                {p.nombre}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="text-sm font-medium text-brand-ink">Mensaje</label>
          <textarea
            className={`${inputClass} min-h-[100px] resize-y`}
            rows={4}
            value={mensaje}
            onChange={(e) => setMensaje(e.target.value)}
            placeholder="Cuéntanos tu operación (locales, equipo, WhatsApp…)"
          />
        </div>
      </div>
      <button
        type="submit"
        className="mt-6 w-full rounded-full bg-brand-olive py-3 text-sm font-semibold text-white transition hover:bg-[#3d4532]"
      >
        Enviar consulta
      </button>
      <p className="mt-3 text-center text-xs text-brand-ink-muted">
        Se abrirá tu correo con el mensaje preparado. También puedes{' '}
        <a href="/registro" className="font-medium text-brand-olive hover:underline">
          registrarte en línea
        </a>
        .
      </p>
    </form>
  );
}
