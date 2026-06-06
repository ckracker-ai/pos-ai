'use client';

type Point = { date: string; revenue: number };

function formatShortDate(isoDate: string) {
  const d = new Date(`${isoDate}T12:00:00`);
  return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
}

export function RevenueTrendChart({ points }: { points: Point[] }) {
  const width = 640;
  const height = 220;
  const padding = { top: 16, right: 16, bottom: 32, left: 48 };

  const maxRevenue = Math.max(...points.map((p) => p.revenue), 1);
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const coords = points.map((p, i) => {
    const x = padding.left + (i / Math.max(points.length - 1, 1)) * innerW;
    const y = padding.top + innerH - (p.revenue / maxRevenue) * innerH;
    return { x, y, ...p };
  });

  const linePath = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(' ');
  const areaPath = `${linePath} L ${coords[coords.length - 1]?.x ?? padding.left} ${padding.top + innerH} L ${coords[0]?.x ?? padding.left} ${padding.top + innerH} Z`;

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => ({
    y: padding.top + innerH - t * innerH,
    label: Math.round(maxRevenue * t).toLocaleString('es-CO'),
  }));

  const xLabelIndexes = [0, Math.floor(points.length / 2), points.length - 1].filter(
    (v, i, arr) => arr.indexOf(v) === i && v >= 0 && v < points.length
  );

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full" role="img" aria-label="Tendencia de ingresos">
      {yTicks.map((tick) => (
        <g key={tick.label}>
          <line
            x1={padding.left}
            x2={width - padding.right}
            y1={tick.y}
            y2={tick.y}
            stroke="currentColor"
            className="text-[rgba(74,83,60,0.2)]"
            strokeDasharray="4 4"
          />
          <text x={padding.left - 8} y={tick.y + 4} textAnchor="end" className="fill-[#6b7280] text-[10px]">
            {tick.label}
          </text>
        </g>
      ))}

      <path d={areaPath} className="fill-[rgba(74,83,60,0.12)]" />
      <path d={linePath} fill="none" className="stroke-[#4a533c]" strokeWidth={2.5} strokeLinecap="round" />

      {coords.map((c) => (
        <circle key={c.date} cx={c.x} cy={c.y} r={3} className="fill-[#6b7a52]" />
      ))}

      {xLabelIndexes.map((idx) => (
        <text
          key={points[idx].date}
          x={coords[idx].x}
          y={height - 8}
          textAnchor="middle"
          className="fill-[#6b7280] text-[10px]"
        >
          {formatShortDate(points[idx].date)}
        </text>
      ))}
    </svg>
  );
}
