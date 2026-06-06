import { z } from 'zod';
import config from '../config/index.js';
import { POS_CART_SYSTEM_PROMPT, buildPosUserMessage } from './systemPrompt.js';
import { interpretPosCartRules } from './rulesInterpreter.js';
import { sanitizePosAiResult } from './sanitizeResult.js';
import type { PosAiResult, PosInterpretInput } from './types.js';

const posAiResultSchema = z.object({
  intent: z.enum(['ADD_TO_CART', 'REMOVE_FROM_CART', 'CLEAR_CART', 'SUBMIT_SALE', 'UNKNOWN']),
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

function parseJsonContent(content: string): unknown {
  const trimmed = content.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const jsonText = fenced ? fenced[1].trim() : trimmed;
  return JSON.parse(jsonText);
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
    return sanitizePosAiResult(
      {
        intent: parsed.intent,
        actions: parsed.actions.map((a) => ({
          action: a.action,
          product_id: a.product_id,
          quantity: a.quantity,
          reason: a.reason || '',
        })),
        response_message: parsed.response_message,
        trigger_invoice: parsed.trigger_invoice,
      },
      input.stocks,
      input.cart
    );
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

  if (config.openAiApiKey) {
    const llm = await interpretWithOpenAi(input);
    if (llm && llm.intent !== 'UNKNOWN') return llm;
  }

  return rules;
}
