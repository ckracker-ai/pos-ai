'use client';

const EXAMPLE_TEXT =
  '¡Hola! Configurar tu menú es muy fácil. Por ejemplo, imagina que tienes un restaurante llamado «Antojitos». Solo debes ir a tu módulo de WhatsApp, activar el menú virtual, añadir la categoría «Hamburguesas» y agregar tu famosa «Hamburguesa Especial con Queso». Automáticamente se generará un código QR único. Imprímelo, colócalo en tus mesas, ¡y listo! Tus clientes podrán escanearlo y ver tus platos al instante desde su celular.';

export function WspMenuHelpPanel() {
  return (
    <section className="rounded-2xl border border-brand-linen/80 bg-gradient-to-br from-brand-vainilla via-white to-brand-linen/20 p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="text-2xl" aria-hidden>
          👋
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-brand-ink">¿Cómo funciona el menú con QR?</h2>
          <p className="mt-2 text-sm leading-relaxed text-brand-ink-muted">
            Piensa en esto como la carta de tu local, pero en el celular de tus clientes. Tú armas el menú
            una vez; el sistema crea un enlace y un QR solo para tu sucursal.
          </p>

          <ol className="mt-4 space-y-2 text-sm text-brand-ink">
            <li className="flex gap-2">
              <span className="font-semibold text-brand-olive">1.</span>
              <span>
                Ve a <strong>WhatsApp y menú QR</strong> y pulsa <strong>Sincronizar desde catálogo</strong>{' '}
                (toma tus categorías y productos del ERP).
              </span>
            </li>
            <li className="flex gap-2">
              <span className="font-semibold text-brand-olive">2.</span>
              <span>
                Revisa el título, activa <strong>Menú virtual activo</strong> y guarda.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="font-semibold text-brand-olive">3.</span>
              <span>
                Descarga o imprime el QR y colócalo en mesas, barra o vitrina.
              </span>
            </li>
          </ol>

          <div className="mt-5 rounded-xl border border-brand-olive/20 bg-brand-olive/5 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-olive">Ejemplo práctico</p>
            <p className="mt-2 text-sm italic leading-relaxed text-brand-ink">{EXAMPLE_TEXT}</p>
          </div>

          <p className="mt-4 text-xs text-brand-ink-muted">
            Tip: si agregas platos nuevos en Catálogo, vuelve a sincronizar para actualizar el menú público.
          </p>
        </div>
      </div>
    </section>
  );
}

export { EXAMPLE_TEXT as WSP_MENU_HELP_EXAMPLE };
