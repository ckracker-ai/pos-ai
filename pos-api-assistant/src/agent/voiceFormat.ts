/** Adapta texto WSP/markdown a respuesta hablada (≤25 palabras por turno). */

const CLP_WORDS: Record<number, string> = {
  1000: 'mil',
  1000000: 'millón',
  1000000000: 'mil millones',
};

function numberToSpanishWords(n: number): string {
  if (!Number.isFinite(n) || n < 0) return String(n);
  if (n === 0) return 'cero';
  if (n < 1000) return String(Math.round(n));

  const millions = Math.floor(n / 1_000_000);
  const thousands = Math.floor((n % 1_000_000) / 1000);
  const rest = Math.round(n % 1000);

  const parts: string[] = [];
  if (millions > 0) {
    parts.push(millions === 1 ? 'un millón' : `${millions} millones`);
  }
  if (thousands > 0) {
    parts.push(thousands === 1 ? 'mil' : `${thousands} mil`);
  }
  if (rest > 0) {
    parts.push(String(rest));
  }
  return parts.join(' ');
}

function priceToSpeech(raw: string): string {
  const digits = raw.replace(/\./g, '');
  const value = Number(digits);
  if (!Number.isFinite(value)) return raw;
  return `${numberToSpanishWords(value)} pesos`;
}

export function stripMarkdownForVoice(text: string): string {
  return text
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/[•·▪▫️✅❌📍💰👋📷🎙️]/gu, '')
    .replace(/#\w+/g, '')
    .replace(/\n+/g, '. ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function speechifyPrices(text: string): string {
  return text.replace(/\$\s?([\d.]+)/g, (_, amount: string) => priceToSpeech(amount));
}

export function truncateForVoice(text: string, maxWords = 25): string {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return text;
  return `${words.slice(0, maxWords).join(' ')}. ¿Seguimos?`;
}

export function formatVoiceReply(text: string): string {
  const cleaned = speechifyPrices(stripMarkdownForVoice(text));
  return truncateForVoice(cleaned);
}

export function isVoiceChannel(channel: string | undefined): boolean {
  return String(channel ?? '').toUpperCase() === 'VOZ';
}
