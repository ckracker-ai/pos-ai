import { z } from 'zod';
import config from '../config/index.js';
import { POS_CART_SYSTEM_PROMPT, buildPosUserMessage } from './systemPrompt.js';
import { interpretPosCartRules } from './rulesInterpreter.js';
import { sanitizePosAiResult } from './sanitizeResult.js';
import type { PosAiResult, PosInterpretInput } from './types.js';

const llmIntentSchema = z.enum([
  'ADD_TO_CART',
  'UPDATE_CART',
  'REMOVE_FROM_CART',
  'CLEAR_CART',
  'SUBMIT_SALE',
  'PROMPT_CLARIFICATION',
  'UNKNOWN',
]);

const posAiResultSchema = z.object({
  intent: llmIntentSchema,
  actions: z
    .array(
      z.object({
        action: z.enum(['ADD', 'UPDATE', 'REMOVE']),
        product_id: z.string(),
        quantity: z.number(),
        reason: z.string().optional().default(''),
      })
    )
    .default([]),
  response_message: z.string().default(''),
  trigger_invoice: z.boolean().default(false),
});

/** Mapea intents del LLM al contrato interno del POS (reglas + frontend). */
function normalizeLlmResult(parsed: z.infer<typeof posAiResultSchema>): PosAiResult {
  if (parsed.intent === 'PROMPT_CLARIFICATION') {
    return {
      intent: 'UNKNOWN',
      actions: [],
      response_message:
        parsed.response_message?.trim() ||
        'Hay varias opciones similares. Indica la variante que necesitas (ej. de pollo o de carne).',
      trigger_invoice: false,
    };
  }

  if (parsed.intent === 'UNKNOWN' && parsed.actions.length === 0) {
    return {
      intent: 'UNKNOWN',
      actions: [],
      response_message:
        parsed.response_message?.trim() || 'No pude interpretar el pedido. Intenta con el nombre del producto.',
      trigger_invoice: false,
    };
  }

  const intent =
    parsed.intent === 'UPDATE_CART'
      ? 'ADD_TO_CART'
      : parsed.intent === 'REMOVE_FROM_CART'
        ? 'REMOVE_FROM_CART'
        : parsed.intent;

  return {
    intent,
    actions: parsed.actions.map((a) => ({
      action: a.action,
      product_id: a.product_id,
      quantity: a.quantity,
      reason: a.reason || '',
    })),
    response_message: parsed.response_message,
    trigger_invoice: parsed.trigger_invoice,
  };
}

function parseJsonContent(content: string): unknown {
  const trimmed = content.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const jsonText = fenced ? fenced[1].trim() : trimmed;
  return JSON.parse(jsonText);
}

/** Pedidos de catálogo: reglas locales son más fiables que el LLM (typos, variantes, desambiguación). */
function isPosProductCommand(userText: string): boolean {
  const t = userText.trim();
  if (!t) return false;
  const n = t
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (/^(?:agrega|agregar|anade|anadir|buscar|busca|quita|quitar|quiero|dame|necesito)\b/i.test(t)) {
    return true;
  }
  if (
    /\b(familiar|personal|pollo|carne|pepperon|peperon|español|italian|hamburguesa|pizza|empanada|cafe|bebida)\b/i.test(
      n
    )
  ) {
    return true;
  }
  return /^\d{1,3}\s+\S/.test(n);
}

async function interpretWithOpenAi(input: PosInterpretInput): Promise<PosAiResult | null> {
  const stocksJson = JSON.stringify(input.stocks);
  const cartJson = JSON.stringify(input.cart);

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.openAiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.openAiModel,
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: POS_CART_SYSTEM_PROMPT },
        {
          role: 'user',
          content: buildPosUserMessage({
            userText: input.userText,
            stocksJson,
            cartJson,
          }),
        },
      ],
      max_tokens: 600,
    }),
  });

  if (!res.ok) return null;

  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = json.choices?.[0]?.message?.content?.trim();
  if (!content) return null;

  try {
    const parsed = posAiResultSchema.parse(parseJsonContent(content));
    const normalized = normalizeLlmResult(parsed);
    if (normalized.intent === 'UNKNOWN' && normalized.actions.length === 0) {
      return normalized;
    }
    return sanitizePosAiResult(normalized, input.stocks, input.cart);
  } catch {
    return null;
  }
}

export async function interpretPosCart(input: PosInterpretInput): Promise<PosAiResult> {
  const userText = input.userText.trim();
  if (!userText) {
    return {
      intent: 'UNKNOWN',
      actions: [],
      response_message: 'Escribe qué quieres hacer en la venta.',
      trigger_invoice: false,
    };
  }

  const rules = interpretPosCartRules(input);
  if (rules.intent !== 'UNKNOWN') return rules;
  if (
    (rules.product_options?.length ?? 0) > 0 ||
    /^Comandos POS IA:/i.test(rules.response_message) ||
    /Elige un producto de la lista/i.test(rules.response_message) ||
    /Elige el producto correcto en la lista/i.test(rules.response_message)
  ) {
    return rules;
  }

  if (!isPosProductCommand(userText) && config.openAiApiKey) {
    const llm = await interpretWithOpenAi(input);
    if (llm && llm.intent !== 'UNKNOWN') return llm;
  }

  return rules;
}
