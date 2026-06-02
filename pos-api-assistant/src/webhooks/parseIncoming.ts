import { z } from 'zod';

const devMessageSchema = z.object({
  from: z.string().min(8),
  text: z.string().min(1),
});

const devImageSchema = z.object({
  from: z.string().min(8),
  imageBase64: z.string().min(100),
  mimeType: z.string().optional(),
  caption: z.string().optional(),
});

export type ParsedIncoming =
  | { kind: 'text'; from: string; text: string; channel: 'dev' | 'meta' }
  | { kind: 'image'; from: string; mediaId: string; channel: 'dev' | 'meta'; caption?: string }
  | { kind: 'image-dev'; from: string; imageBase64: string; mimeType: string; channel: 'dev'; caption?: string }
  | {
      kind: 'document';
      from: string;
      mediaId: string;
      mimeType: string;
      channel: 'dev' | 'meta';
      caption?: string;
    };

export function parseIncomingMessage(body: Record<string, unknown>): ParsedIncoming | null {
  if (body.from && body.imageBase64) {
    const parsed = devImageSchema.safeParse(body);
    if (!parsed.success) return null;
    return {
      kind: 'image-dev',
      from: parsed.data.from.replace(/\D/g, ''),
      imageBase64: parsed.data.imageBase64,
      mimeType: parsed.data.mimeType ?? 'image/jpeg',
      channel: 'dev',
      caption: parsed.data.caption?.trim() || undefined,
    };
  }

  if (body.from && body.text) {
    const parsed = devMessageSchema.safeParse(body);
    if (!parsed.success) return null;
    return {
      kind: 'text',
      from: parsed.data.from.replace(/\D/g, ''),
      text: parsed.data.text,
      channel: 'dev',
    };
  }

  const entry = (body.entry as unknown[])?.[0] as Record<string, unknown> | undefined;
  const change = (entry?.changes as unknown[])?.[0] as Record<string, unknown> | undefined;
  const value = change?.value as Record<string, unknown> | undefined;
  const msg = (value?.messages as unknown[])?.[0] as Record<string, unknown> | undefined;

  if (!msg) return null;

  const from = String(msg.from ?? '').replace(/\D/g, '');
  const type = String(msg.type ?? 'text');

  if (type === 'image') {
    const mediaId = String((msg.image as Record<string, unknown> | undefined)?.id ?? '');
    const caption = String((msg.image as Record<string, unknown> | undefined)?.caption ?? '').trim();
    if (!from || !mediaId) return null;
    return { kind: 'image', from, mediaId, channel: 'meta', caption: caption || undefined };
  }

  if (type === 'document') {
    const doc = msg.document as Record<string, unknown> | undefined;
    const mediaId = String(doc?.id ?? '');
    const mimeType = String(doc?.mime_type ?? 'application/pdf');
    const caption = String(doc?.caption ?? msg.caption ?? '').trim();
    if (!from || !mediaId) return null;
    return { kind: 'document', from, mediaId, mimeType, channel: 'meta', caption: caption || undefined };
  }

  if (type !== 'text') return null;

  const text = String((msg.text as Record<string, unknown> | undefined)?.body ?? '').trim();
  if (!from || !text) return null;

  return { kind: 'text', from, text, channel: 'meta' };
}
