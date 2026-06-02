import config, { isMetaSendConfigured } from '../config/index.js';

export { isMetaSendConfigured };

export async function sendWhatsAppText(to: string, body: string): Promise<void> {
  if (!isMetaSendConfigured()) {
    throw new Error('WHATSAPP_SEND_NOT_CONFIGURED');
  }

  const toDigits = to.replace(/\D/g, '');
  if (toDigits.length < 8) {
    throw new Error('VALIDATION_ERROR: invalid recipient phone');
  }

  const text = body.trim();
  if (!text) return;

  const url = `https://graph.facebook.com/${config.whatsappApiVersion}/${config.whatsappPhoneNumberId}/messages`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.whatsappAccessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: toDigits,
      type: 'text',
      text: { body: text.slice(0, 4096) },
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`WHATSAPP_SEND_FAILED: HTTP ${res.status} ${detail}`);
  }
}
