export function buildEmailOtpMessage(input: {
  greetingName?: string;
  code: string;
  ttlMinutes: number;
}): { subject: string; text: string; html: string } {
  const name = input.greetingName?.trim() || 'hola';
  const spaced = input.code.split('').join(' ');
  const subject = 'Tu código de verificación POS-AI';
  const text = `Hola ${name}, necesitamos verificar tu dirección de correo electrónico.\n\nEste código expira en ${input.ttlMinutes} minutos:\n\n${input.code}\n\nSi no solicitaste este código, puedes ignorar este mensaje.`;
  const html = `<!DOCTYPE html>
<html lang="es">
<body style="margin:0;padding:24px;background:#f4f1ea;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#2f3628;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e6dfd2;">
    <tr>
      <td style="padding:24px 28px 8px 28px;">
        <p style="margin:0;font-size:18px;font-weight:700;color:#3d4532;">POS-AI</p>
        <p style="margin:4px 0 0;font-size:13px;color:#7a8470;">El POS con inteligencia artificial</p>
      </td>
    </tr>
    <tr>
      <td style="padding:8px 28px 28px 28px;">
        <h1 style="margin:16px 0 8px;font-size:22px;line-height:1.3;color:#3d4532;">Tu código de verificación</h1>
        <p style="margin:0 0 16px;font-size:15px;line-height:1.5;">Hola ${name}, necesitamos verificar tu dirección de correo electrónico.</p>
        <p style="margin:0 0 12px;font-size:14px;color:#5c6654;">Este código expira en ${input.ttlMinutes} minutos:</p>
        <div style="margin:16px 0 20px;padding:18px 12px;text-align:center;background:#f7f5f0;border-radius:14px;letter-spacing:0.35em;font-size:28px;font-weight:700;color:#2f3628;">${spaced}</div>
        <p style="margin:0;font-size:13px;color:#7a8470;">Si no solicitaste este código, puedes ignorar este mensaje.</p>
      </td>
    </tr>
  </table>
  <p style="max-width:520px;margin:16px auto 0;text-align:center;font-size:11px;color:#9aa392;">Este correo fue enviado automáticamente.</p>
</body>
</html>`;
  return { subject, text, html };
}
