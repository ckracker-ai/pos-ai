/** Comando WSP: link del menú virtual gastronómico (QR / carta web). */

export function wantsVirtualMenuCommand(text: string): boolean {
  const lower = text.trim().toLowerCase();
  return /^(menu(\s+(web|virtual|online|qr))?|ver\s+menu|link\s+menu|carta(\s+digital)?)$/.test(
    lower
  );
}
