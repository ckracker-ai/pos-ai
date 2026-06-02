import config from '../config/index.js';
import {
  parseAmountFromCaption,
  parseChileanPesos,
  resolveReceiptVariant,
  type TransferAnalysis,
} from './transferAnalysis.js';
import {
  matchRecipient,
  profileForPrompt,
  type TransferProfile,
} from './transferProfileMatch.js';

const VISION_PROMPT = `Eres extractor de datos de comprobantes de pago en Chile (transferencias bancarias y apps).

Extrae datos del DESTINATARIO (comercio que recibe), no del pagador.

VARIANTES comunes: BancoEstado, BCI, Santander, Itaú, Mach, Tenpo, Mercado Pago, depósito, captura web.

Responde SOLO JSON:
{
  "receiptType": "transfer|deposit|app_screenshot|not_payment|unclear",
  "detected": {
    "amount": number|null,
    "recipient_rut": string|null,
    "recipient_account": string|null,
    "recipient_name": string|null,
    "bank": string|null
  },
  "date": string|null,
  "confidence": 0-1,
  "summary": "frase corta en español",
  "warnings": []
}`;

function manualAnalysis(
  expectedTotal: number,
  transferProfile: TransferProfile | null,
  amountFromCaption: number | null,
  extraWarnings: string[] = [],
  summaryNote?: string
): TransferAnalysis {
  const amount = amountFromCaption;
  const recipient = matchRecipient(transferProfile, {
    rut: null,
    account: null,
    name: null,
    bank: null,
  });
  const receiptType = amount != null ? 'app_screenshot' : 'transfer';
  const confidence = amount != null ? 0.55 : 0.4;
  const variant = resolveReceiptVariant(
    expectedTotal,
    amount,
    receiptType,
    confidence,
    recipient
  );
  const warnings = [...extraWarnings];
  if (amountFromCaption) warnings.push('Monto sugerido por texto del cliente');

  return {
    receiptType,
    variant,
    amount,
    rut: null,
    bank: null,
    date: null,
    match: variant === 'TRANSFER_OK',
    confidence,
    summary:
      summaryNote ??
      (amount != null
        ? 'Comprobante recibido; monto del caption — revisión manual.'
        : 'Comprobante recibido; indica el monto al enviar la foto (ej. vale 5000).'),
    warnings,
    recipientScore: recipient.configured ? recipient.score : null,
    recipientIssues: recipient.issues,
  };
}

export async function analyzeTransferImage(
  imageBase64: string,
  mimeType: string,
  expectedTotal: number,
  transferProfile: TransferProfile | null,
  captionHint?: string
): Promise<TransferAnalysis> {
  const amountFromCaption = captionHint ? parseAmountFromCaption(captionHint) : null;

  if (!config.openAiApiKey) {
    return manualAnalysis(expectedTotal, transferProfile, amountFromCaption, [
      'Visión IA desactivada (OPENAI_API_KEY)',
    ]);
  }

  const profileBlock = transferProfile
    ? `\n\nDATOS ESPERADOS DEL COMERCIO (destinatario correcto):\n${profileForPrompt(transferProfile)}`
    : '\n\n(Sin perfil bancario configurado — solo extrae lo visible).';

  let res: Response;
  try {
    res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.openAiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.openAiModel,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text:
                  `${VISION_PROMPT}${profileBlock}\n\nMonto esperado del pedido: ${expectedTotal} CLP.` +
                  (captionHint ? `\nTexto del cliente con la imagen: "${captionHint}"` : ''),
              },
              {
                type: 'image_url',
                image_url: { url: `data:${mimeType};base64,${imageBase64}` },
              },
            ],
          },
        ],
        max_tokens: 600,
      }),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'network error';
    return manualAnalysis(expectedTotal, transferProfile, amountFromCaption, [
      `Visión IA no disponible (${msg})`,
    ]);
  }

  if (!res.ok) {
    const detail = await res.text();
    const short =
      res.status === 401
        ? 'API key OpenAI inválida — revisa OPENAI_API_KEY en .env'
        : `HTTP ${res.status}`;
    return manualAnalysis(expectedTotal, transferProfile, amountFromCaption, [
      `Visión IA falló (${short})`,
    ], `Comprobante guardado para revisión manual (${short}).`);
  }

  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const raw = json.choices?.[0]?.message?.content ?? '{}';
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return manualAnalysis(expectedTotal, transferProfile, amountFromCaption, [
      'Respuesta IA no parseable',
    ]);
  }

  const detectedRaw = (parsed.detected as Record<string, unknown> | undefined) ?? parsed;

  const visionAmount = parseChileanPesos(detectedRaw.amount ?? parsed.amount);
  const amount = visionAmount ?? amountFromCaption;
  const receiptType = String(parsed.receiptType ?? 'transfer');
  const confidence = Number(parsed.confidence ?? 0);

  const detected = {
    rut:
      detectedRaw.recipient_rut != null
        ? String(detectedRaw.recipient_rut)
        : parsed.rut != null
          ? String(parsed.rut)
          : null,
    account:
      detectedRaw.recipient_account != null
        ? String(detectedRaw.recipient_account)
        : parsed.account != null
          ? String(parsed.account)
          : null,
    name:
      detectedRaw.recipient_name != null
        ? String(detectedRaw.recipient_name)
        : parsed.recipient_name != null
          ? String(parsed.recipient_name)
          : null,
    bank:
      detectedRaw.bank != null
        ? String(detectedRaw.bank)
        : parsed.bank != null
          ? String(parsed.bank)
          : null,
  };

  const recipient = matchRecipient(transferProfile, detected);
  const variant = resolveReceiptVariant(expectedTotal, amount, receiptType, confidence, recipient);

  const warnings = Array.isArray(parsed.warnings)
    ? parsed.warnings.map((w) => String(w))
    : [];
  if (amountFromCaption && visionAmount && Math.abs(amountFromCaption - visionAmount) > 100) {
    warnings.push('Monto en caption difiere del detectado en imagen');
  }
  warnings.push(...recipient.issues);

  return {
    receiptType,
    variant,
    amount,
    rut: detected.rut,
    bank: detected.bank,
    date: parsed.date != null ? String(parsed.date) : null,
    match: variant === 'TRANSFER_OK',
    confidence,
    summary: String(parsed.summary ?? 'Comprobante analizado'),
    warnings,
    recipientScore: recipient.configured ? recipient.score : null,
    recipientIssues: recipient.issues,
  };
}
