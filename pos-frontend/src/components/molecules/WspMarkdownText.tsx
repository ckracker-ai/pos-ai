'use client';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Renderiza copys WSP (*negrita*, _cursiva_ y `monoespaciado` estilo WhatsApp). */
export function WspMarkdownText({ text }: { text: string }) {
  const html = escapeHtml(text)
    .replace(/`([^`\n]+)`/g, '<code class="wsp-inline-code">$1</code>')
    .replace(/\*([^*\n]+)\*/g, '<strong>$1</strong>')
    .replace(/_([^_\n]+)_/g, '<em>$1</em>');
  return (
    <span
      className="whitespace-pre-wrap break-words"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
