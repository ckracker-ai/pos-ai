import type { ReactNode } from 'react';

type NavGlyphProps = {
  name: string;
  className?: string;
  title?: string;
};

const svgClass = 'h-5 w-5 shrink-0';

function Svg({ children, className, title }: { children: ReactNode; className?: string; title?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className ?? svgClass}
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}

const ICONS: Record<string, (className?: string) => ReactNode> = {
  home: (c) => (
    <Svg className={c}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 10v10h14V10" />
      <path d="M10 20v-6h4v6" />
    </Svg>
  ),
  register: (c) => (
    <Svg className={c}>
      <rect x="3" y="4" width="18" height="14" rx="2" />
      <path d="M3 10h18" />
      <path d="M8 16h.01M12 16h.01M16 16h.01" />
    </Svg>
  ),
  orders: (c) => (
    <Svg className={c}>
      <path d="M8 6h13M8 12h13M8 18h13" />
      <path d="M3 6h.01M3 12h.01M3 18h.01" />
    </Svg>
  ),
  kitchen: (c) => (
    <Svg className={c}>
      <path d="M4 11h16v8H4z" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </Svg>
  ),
  truck: (c) => (
    <Svg className={c}>
      <path d="M3 7h11v10H3z" />
      <path d="M14 11h4l3 3v3h-7" />
      <circle cx="7" cy="18" r="1.5" />
      <circle cx="17" cy="18" r="1.5" />
    </Svg>
  ),
  chat: (c) => (
    <Svg className={c}>
      <path d="M5 5h14v10H8l-3 3z" />
    </Svg>
  ),
  qr: (c) => (
    <Svg className={c}>
      <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4z" />
      <path d="M14 14h2v2h-2zM18 14h2v2h-2zM14 18h2v2h-2zM18 18h2v2h-2z" />
    </Svg>
  ),
  chart: (c) => (
    <Svg className={c}>
      <path d="M4 19V5M4 19h16" />
      <path d="M8 15v-4M12 15V8M16 15v-7" />
    </Svg>
  ),
  waste: (c) => (
    <Svg className={c}>
      <path d="M4 7h16M9 7V5h6v2M7 7l1 12h8l1-12" />
    </Svg>
  ),
  catalog: (c) => (
    <Svg className={c}>
      <path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 0-3 3z" />
      <path d="M5 4v16" />
    </Svg>
  ),
  box: (c) => (
    <Svg className={c}>
      <path d="M3 8h18v11H3z" />
      <path d="M3 8 12 3l9 5M12 3v16" />
    </Svg>
  ),
  tag: (c) => (
    <Svg className={c}>
      <path d="M3 12 12 3h8v8l-9 9z" />
      <circle cx="16" cy="8" r="1" />
    </Svg>
  ),
  users: (c) => (
    <Svg className={c}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 19c0-3 3-5 6-5s6 2 6 5" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M21 19c0-2.2-1.8-4-4-4" />
    </Svg>
  ),
  store: (c) => (
    <Svg className={c}>
      <path d="M4 10h16v10H4z" />
      <path d="M4 10 6 5h12l2 5" />
      <path d="M10 20v-5h4v5" />
    </Svg>
  ),
  building: (c) => (
    <Svg className={c}>
      <path d="M5 21V5h10v16" />
      <path d="M15 10h4v11" />
      <path d="M8 8h2M8 12h2M8 16h2" />
    </Svg>
  ),
  business: (c) => (
    <Svg className={c}>
      <path d="M4 20V9l8-5 8 5v11" />
      <path d="M10 20v-6h4v6" />
    </Svg>
  ),
  help: (c) => (
    <Svg className={c}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.8.4-1.5 1-1.5 2.2V14" />
      <path d="M12 17h.01" />
    </Svg>
  ),
  currency: (c) => (
    <Svg className={c}>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 7v10M9 10h4.5a2 2 0 0 1 0 4H9" />
    </Svg>
  ),
  bag: (c) => (
    <Svg className={c}>
      <path d="M6 8h12l-1 12H7z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </Svg>
  ),
  warn: (c) => (
    <Svg className={c}>
      <path d="M12 4 3 20h18z" />
      <path d="M12 10v5M12 17h.01" />
    </Svg>
  ),
  chevron: (c) => (
    <Svg className={c}>
      <path d="M6 9l6 6 6-6" />
    </Svg>
  ),
};

export function NavGlyph({ name, className, title }: NavGlyphProps) {
  const render = ICONS[name] ?? ICONS.box;
  const icon = render(className);
  if (!title) return icon;
  return (
    <span className="inline-flex" title={title}>
      {icon}
    </span>
  );
}
