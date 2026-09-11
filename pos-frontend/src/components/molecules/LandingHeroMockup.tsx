/** Mock-up 2D de tablet con el POS — sin 3D ni oro. */
export function LandingHeroMockup() {
  return (
    <div className="landing-tablet mx-auto w-full max-w-lg">
      <div className="landing-tablet-bezel">
        <div className="landing-tablet-camera" aria-hidden />
        <div className="landing-tablet-screen">
          <div className="flex items-center justify-between border-b border-brand-linen px-3 py-2">
            <span className="text-[11px] font-semibold tracking-tight text-brand-ink">POS-AI · Hoy</span>
            <span className="text-[10px] text-brand-ink-muted">Sucursal Central</span>
          </div>
          <div className="grid grid-cols-3 gap-2 px-3 pt-3">
            {[
              { k: 'Ventas', v: '12' },
              { k: 'Ticket', v: '$4.9k' },
              { k: 'Stock', v: '3' },
            ].map((m) => (
              <div key={m.k} className="rounded-lg border border-brand-linen bg-brand-surface px-2 py-1.5">
                <p className="text-[9px] uppercase tracking-wide text-brand-ink-muted">{m.k}</p>
                <p className="mt-0.5 text-sm font-semibold text-brand-ink">{m.v}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 px-3">
            <div className="flex items-end justify-between gap-1.5 border-b border-brand-linen pb-2 pt-1">
              {[40, 62, 48, 78, 55, 88, 70].map((h, i) => (
                <div
                  key={i}
                  className="w-full max-w-[14px] rounded-sm bg-brand-olive/35"
                  style={{ height: `${h * 0.7}px` }}
                  aria-hidden
                />
              ))}
            </div>
            <p className="mt-2 text-[10px] text-brand-ink-muted">Ventas · 7 días</p>
          </div>
          <div className="mt-3 flex items-center justify-between px-3 pb-3">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-olive/30 bg-brand-olive/5 px-2 py-1 text-[10px] font-medium text-brand-ink">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-olive" aria-hidden />
              Insight de IA
            </span>
            <span className="text-[10px] text-brand-ink-muted">Pico 17:00</span>
          </div>
        </div>
      </div>
    </div>
  );
}
