/** Versión de producto SVM ERP (semver). */
export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? '1.4.0';

/** Etiqueta corta para UI, ej. v1.2 */
export function formatAppVersionLabel(version = APP_VERSION): string {
  const [major, minor, patch] = version.split('.');
  if (patch === '0' || patch === undefined) {
    return `v${major}.${minor}`;
  }
  return `v${version}`;
}

export const APP_VERSION_LABEL = formatAppVersionLabel();
