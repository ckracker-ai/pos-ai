/** S15: respuestas de negocio solo con agregados; si no hay dato, no inventa. */

export type BusinessMixItem = {
  productName: string;
  qtySold: number;
};

export type BusinessInsights = {
  mix7d: BusinessMixItem[];
  peakHour: number | null;
  peakSaleCount: number;
  mermaQty7d: number;
  mermaQty28d: number;
  todaySales: number;
  todayRevenue: number;
};

function asMix(row: unknown): BusinessMixItem | null {
  if (!row || typeof row !== 'object') return null;
  const r = row as Record<string, unknown>;
  const productName = String(r.productName ?? r.name ?? '').trim();
  const qtySold = Number(r.qtySold ?? r.qty_sold ?? 0);
  if (!productName) return null;
  return { productName, qtySold: Number.isFinite(qtySold) ? qtySold : 0 };
}

/** Une el payload de dashboard con ventas de hoy. */
export function coerceBusinessInsights(
  raw: unknown,
  today: { todaySales: number; todayRevenue: number }
): BusinessInsights {
  const r = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const mixSrc = Array.isArray(r.mix7d) ? r.mix7d : Array.isArray(r.mix) ? r.mix : [];
  const peakHourRaw = r.peakHour ?? r.peak_hour;
  const peakHour =
    peakHourRaw == null || peakHourRaw === '' ? null : Math.min(23, Math.max(0, Math.trunc(Number(peakHourRaw))));
  return {
    mix7d: mixSrc.map(asMix).filter((row): row is BusinessMixItem => row != null).slice(0, 5),
    peakHour: peakHour != null && Number.isFinite(peakHour) ? peakHour : null,
    peakSaleCount: Number(r.peakSaleCount ?? r.peak_sale_count ?? 0) || 0,
    mermaQty7d: Number(r.mermaQty7d ?? r.merma_qty_7d ?? 0) || 0,
    mermaQty28d: Number(r.mermaQty28d ?? r.merma_qty_28d ?? 0) || 0,
    todaySales: Number(today.todaySales ?? r.todaySales ?? 0) || 0,
    todayRevenue: Number(today.todayRevenue ?? r.todayRevenue ?? 0) || 0,
  };
}

function formatQty(n: number): string {
  if (!Number.isFinite(n)) return '0';
  return Number.isInteger(n) ? String(n) : n.toLocaleString('es-CL', { maximumFractionDigits: 2 });
}

function formatClp(n: number): string {
  return `$${Math.round(n).toLocaleString('es-CL')}`;
}

export function answerBusinessQuestion(question: string, insights: BusinessInsights | null): string {
  const q = question.trim().toLowerCase();
  if (!q) return 'Pregunta mix, hora pico o merma.';
  if (!insights) {
    return 'No tengo agregados de esta sucursal. Abre Hoy de nuevo; no invento cifras.';
  }

  if (/\b(stock|inventario|cuántas hay|cuantas hay|quedan)\b/.test(q)) {
    return 'No invento stock. Usa Reorden o Reportes → inventario. Solo cito mix, pico y merma agregados.';
  }

  if (/\b(mix|mezcla|más vend|mas vend|top|qué se vende|que se vende)\b/.test(q)) {
    if (insights.mix7d.length === 0) {
      return 'No hay mix: no hay ventas en los últimos 7 días en esta sucursal. No invento productos.';
    }
    const listed = insights.mix7d
      .slice(0, 5)
      .map((m, i) => `${i + 1}. ${m.productName} (${formatQty(m.qtySold)} u.)`)
      .join(' ');
    return `Mix 7 días (ventas registradas): ${listed}`;
  }

  if (/\b(pico|hora pico|peak|a qué hora|a que hora)\b/.test(q)) {
    if (insights.peakHour == null) {
      return 'No hay hora pico: no hay ventas en los últimos 28 días para esta sucursal.';
    }
    const hh = String(insights.peakHour).padStart(2, '0');
    return `Hora pico (28 días, hora Chile): ${hh}:00, con ${insights.peakSaleCount} ventas en esa franja.`;
  }

  if (/\b(merma|desperdicio|mermas)\b/.test(q)) {
    const avg = insights.mermaQty28d / 4;
    const over = avg > 0 && insights.mermaQty7d > avg * 1.5;
    const extra = over ? ' Esta semana supera la media de 4 semanas.' : '';
    return `Merma aprobada 7 días: ${formatQty(insights.mermaQty7d)} u. Media semanal (28 días): ${formatQty(avg)} u.${extra} Son mermas, no stock.`;
  }

  if (/\b(hoy|ticket|ventas del día|ventas del dia)\b/.test(q)) {
    return `Hoy (agregado): ${insights.todaySales} ventas, ${formatClp(insights.todayRevenue)}.`;
  }

  return 'Solo cito mix, hora pico o merma de los agregados. Si no está ahí, no lo sé.';
}
