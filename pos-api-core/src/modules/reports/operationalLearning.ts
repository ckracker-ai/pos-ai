/** S14: aprendizaje operativo (SKU calientes + reorden draft). */

export function santiagoHour(now = new Date()): number {
  const raw = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/Santiago',
    hour: '2-digit',
    hour12: false,
    hourCycle: 'h23',
  }).format(now);
  const hour = Number.parseInt(raw, 10);
  if (!Number.isFinite(hour)) return now.getUTCHours();
  return ((hour % 24) + 24) % 24;
}

/** Unidades a pedir para cubrir 7 días de venta, el mínimo, o el umbral de alerta (5 si no hay mín.). */
export function computeReorderDraftQty(stock: number, minStock: number, qtySold7d: number): number {
  const s = Number.isFinite(stock) ? Math.max(0, stock) : 0;
  const min = Number.isFinite(minStock) ? Math.max(0, minStock) : 0;
  const sold = Number.isFinite(qtySold7d) ? Math.max(0, qtySold7d) : 0;
  const avgDaily = sold / 7;
  const alertFloor = min > 0 ? min : 5;
  const weekTarget = sold;
  const liftAboveAlert = s <= alertFloor ? alertFloor + 1 : 0;
  const target = Math.max(min, weekTarget, liftAboveAlert);
  const gap = Math.ceil(target - s);
  if (gap <= 0) return 0;
  if (s <= alertFloor) return gap;
  if (avgDaily > 0 && s / avgDaily < 7) return gap;
  return 0;
}
