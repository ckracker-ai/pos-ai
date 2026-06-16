/** Días de gracia tras vencer `vence_en` antes de bloquear acceso (env en prod). */
export const SUBSCRIPTION_GRACE_DAYS = Math.max(
  1,
  Number.parseInt(process.env.SUBSCRIPTION_GRACE_DAYS ?? '7', 10) || 7
);
