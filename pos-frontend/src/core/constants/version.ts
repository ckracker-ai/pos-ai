/** Versión de producto POS-AI — formato `major.minor.YYYY-MM-DD` en releases UX. */
export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? '1.20.2026-06-16';

/** Etiqueta corta para UI, ej. `v1.9 · 2026-06-08` o `v1.4.2` */
export function formatAppVersionLabel(version = APP_VERSION): string {
  const dated = version.match(/^(\d+)\.(\d+)\.(\d{4}-\d{2}-\d{2})$/);
  if (dated) {
    return `v${dated[1]}.${dated[2]} · ${dated[3]}`;
  }
  const [major, minor, patch] = version.split('.');
  if (patch === '0' || patch === undefined) {
    return `v${major}.${minor}`;
  }
  return `v${version}`;
}

export const APP_VERSION_LABEL = formatAppVersionLabel();
