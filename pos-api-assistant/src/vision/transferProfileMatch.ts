/** Perfil bancario del comercio — referencia para validar comprobantes. */
export type TransferProfile = {
  bankName: string | null;
  accountType: string | null;
  accountNumber: string | null;
  holderName: string | null;
  holderRut: string | null;
};

export type DetectedRecipient = {
  rut: string | null;
  account: string | null;
  name: string | null;
  bank: string | null;
};

export type RecipientMatch = {
  configured: boolean;
  rutOk: boolean | null;
  accountOk: boolean | null;
  nameOk: boolean | null;
  bankOk: boolean | null;
  score: number;
  issues: string[];
};

export function normalizeRutKey(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[^0-9kK]/g, '').toUpperCase();
  if (cleaned.length < 2) return null;
  return cleaned;
}

export function digitsOnly(raw: string | null | undefined): string {
  return String(raw ?? '').replace(/\D/g, '');
}

function normalizeText(raw: string | null | undefined): string {
  return String(raw ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function bankTokens(raw: string): string[] {
  const n = normalizeText(raw);
  const aliases: Record<string, string[]> = {
    bancoestado: ['estado', 'banco estado', 'bancoestado'],
    bci: ['bci', 'banco de credito', 'credito e inversiones'],
    santander: ['santander'],
    itau: ['itau'],
    scotiabank: ['scotiabank', 'scotia'],
    mach: ['mach'],
    tenpo: ['tenpo'],
  };
  for (const tokens of Object.values(aliases)) {
    if (tokens.some((t) => n.includes(t))) return tokens;
  }
  return n.split(' ').filter(Boolean);
}

export function rutMatches(expected: string | null, detected: string | null): boolean | null {
  const exp = normalizeRutKey(expected);
  const det = normalizeRutKey(detected);
  if (!exp) return null;
  if (!det) return null;
  if (exp === det) return true;
  const expBody = exp.slice(0, -1);
  const detBody = det.slice(0, -1);
  if (expBody.length >= 7 && detBody.length >= 7) {
    return expBody === detBody || exp.includes(detBody) || det.includes(expBody);
  }
  return false;
}

export function accountMatches(expected: string | null, detected: string | null): boolean | null {
  const exp = digitsOnly(expected);
  const det = digitsOnly(detected);
  if (!exp) return null;
  if (!det) return null;
  if (exp === det) return true;
  if (det.length >= 4 && exp.endsWith(det.slice(-4))) return true;
  if (exp.length >= 4 && det.endsWith(exp.slice(-4))) return true;
  return false;
}

export function nameMatches(expected: string | null, detected: string | null): boolean | null {
  const exp = normalizeText(expected);
  const det = normalizeText(detected);
  if (!exp) return null;
  if (!det) return null;
  if (det.includes(exp) || exp.includes(det)) return true;
  const expWords = exp.split(' ').filter((w) => w.length > 3);
  if (expWords.length === 0) return null;
  const hits = expWords.filter((w) => det.includes(w));
  return hits.length >= Math.min(2, expWords.length);
}

export function bankMatches(expected: string | null, detected: string | null): boolean | null {
  if (!expected) return null;
  if (!detected) return null;
  const expTok = bankTokens(expected);
  const det = normalizeText(detected);
  return expTok.some((t) => det.includes(t));
}

export function isCuentaRut(profile: TransferProfile): boolean {
  const type = normalizeText(profile.accountType);
  return type.includes('rut') || type.includes('cuenta rut');
}

/** Compara destinatario detectado en imagen vs perfil del comercio. */
export function matchRecipient(
  profile: TransferProfile | null | undefined,
  detected: DetectedRecipient
): RecipientMatch {
  if (!profile) {
    return {
      configured: false,
      rutOk: null,
      accountOk: null,
      nameOk: null,
      bankOk: null,
      score: 0,
      issues: [],
    };
  }

  const hasConfig = Boolean(
    profile.holderRut || profile.accountNumber || profile.holderName || profile.bankName
  );
  if (!hasConfig) {
    return {
      configured: false,
      rutOk: null,
      accountOk: null,
      nameOk: null,
      bankOk: null,
      score: 0,
      issues: ['Perfil transferencia incompleto en comercio'],
    };
  }

  const rutOk = rutMatches(profile.holderRut, detected.rut);
  let accountOk = accountMatches(profile.accountNumber, detected.account);
  if (isCuentaRut(profile) && rutOk === true) {
    accountOk = true;
  }
  const nameOk = nameMatches(profile.holderName, detected.name);
  const bankOk = bankMatches(profile.bankName, detected.bank);

  const issues: string[] = [];
  if (rutOk === false) issues.push('RUT destino no coincide');
  if (accountOk === false) issues.push('N° cuenta destino no coincide');
  if (nameOk === false) issues.push('Nombre titular no coincide');
  if (bankOk === false) issues.push('Banco/app destino distinto al configurado');

  const checks = [rutOk, accountOk, nameOk, bankOk].filter((v) => v !== null);
  const positives = checks.filter((v) => v === true).length;
  const score = checks.length === 0 ? 0 : positives / checks.length;

  return {
    configured: true,
    rutOk,
    accountOk,
    nameOk,
    bankOk,
    score,
    issues,
  };
}

export function profileForPrompt(profile: TransferProfile): string {
  const lines = [
    profile.bankName ? `Banco: ${profile.bankName}` : null,
    profile.accountType ? `Tipo cuenta: ${profile.accountType}` : null,
    profile.accountNumber ? `N° cuenta: ${profile.accountNumber}` : null,
    profile.holderName ? `Titular: ${profile.holderName}` : null,
    profile.holderRut ? `RUT titular: ${profile.holderRut}` : null,
  ].filter(Boolean);
  return lines.join('\n');
}
