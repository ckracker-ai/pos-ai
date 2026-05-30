export type PasswordStrength = 'weak' | 'fair' | 'good';

export type PasswordValidation = {
  strength: PasswordStrength;
  label: string;
  checks: Array<{ label: string; ok: boolean }>;
  isValid: boolean;
};

const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const LOWER = 'abcdefghijkmnopqrstuvwxyz';
const DIGITS = '23456789';
const SYMBOLS = '!@#$%&*';

export function evaluatePasswordStrength(password: string): PasswordValidation {
  const checks = [
    { label: 'Al menos 8 caracteres', ok: password.length >= 8 },
    { label: 'Incluye una letra', ok: /[a-zA-Z]/.test(password) },
    { label: 'Incluye un número', ok: /\d/.test(password) },
    { label: 'Incluye mayúscula y minúscula', ok: /[a-z]/.test(password) && /[A-Z]/.test(password) },
  ];

  const passed = checks.filter((c) => c.ok).length;
  let strength: PasswordStrength = 'weak';
  let label = 'Débil';

  if (passed >= 3) {
    strength = 'fair';
    label = 'Aceptable';
  }
  if (passed === 4 && password.length >= 10) {
    strength = 'good';
    label = 'Segura';
  }

  return {
    strength,
    label,
    checks,
    isValid: checks.every((c) => c.ok),
  };
}

export function generateTemporaryPassword(length = 12): string {
  const targetLength = Math.max(12, length);
  const all = UPPER + LOWER + DIGITS + SYMBOLS;
  const required = [
    UPPER[Math.floor(Math.random() * UPPER.length)],
    LOWER[Math.floor(Math.random() * LOWER.length)],
    DIGITS[Math.floor(Math.random() * DIGITS.length)],
    SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
  ];

  const rest: string[] = [];
  for (let i = required.length; i < targetLength; i += 1) {
    rest.push(all[Math.floor(Math.random() * all.length)]);
  }

  const merged = [...required, ...rest];
  for (let i = merged.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [merged[i], merged[j]] = [merged[j], merged[i]];
  }

  return merged.join('');
}
