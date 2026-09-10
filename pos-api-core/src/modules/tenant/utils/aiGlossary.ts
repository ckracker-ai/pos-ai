export type EmpresaAiGlossary = {
  businessDescription: string;
  synonyms: Array<{ from: string; to: string }>;
};

export function parseEmpresaAiGlossary(raw: unknown): EmpresaAiGlossary {
  const empty: EmpresaAiGlossary = { businessDescription: '', synonyms: [] };
  if (raw == null || raw === '') return empty;
  let obj: Record<string, unknown> = {};
  if (typeof raw === 'string') {
    try {
      obj = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return { ...empty, businessDescription: String(raw).slice(0, 500) };
    }
  } else if (typeof raw === 'object') {
    obj = raw as Record<string, unknown>;
  } else {
    return empty;
  }
  const synonyms = Array.isArray(obj.synonyms)
    ? (obj.synonyms as Array<Record<string, unknown>>)
        .map((row) => ({
          from: String(row.from ?? '').trim(),
          to: String(row.to ?? '').trim(),
        }))
        .filter((row) => row.from && row.to)
        .slice(0, 20)
    : [];
  return {
    businessDescription: String(obj.businessDescription ?? '').trim().slice(0, 500),
    synonyms,
  };
}
