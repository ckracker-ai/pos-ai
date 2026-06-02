import config from '../config/index.js';

export async function downloadMetaMedia(mediaId: string): Promise<{ buffer: Buffer; mimeType: string }> {
  const version = config.whatsappApiVersion;
  const token = config.whatsappAccessToken;
  if (!token) throw new Error('WHATSAPP_ACCESS_TOKEN missing');

  const metaRes = await fetch(`https://graph.facebook.com/${version}/${mediaId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!metaRes.ok) {
    throw new Error(`META_MEDIA_META_FAILED: ${metaRes.status}`);
  }

  const metaJson = (await metaRes.json()) as { url?: string; mime_type?: string };
  if (!metaJson.url) throw new Error('META_MEDIA_URL_MISSING');

  const fileRes = await fetch(metaJson.url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!fileRes.ok) throw new Error(`META_MEDIA_DOWNLOAD_FAILED: ${fileRes.status}`);

  const buffer = Buffer.from(await fileRes.arrayBuffer());
  return { buffer, mimeType: metaJson.mime_type ?? 'image/jpeg' };
}
