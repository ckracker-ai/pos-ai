import { Result, ok, fail } from '../types/result';

export type SendEmailInput = {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
  cc?: string | string[];
};

function parseRecipients(value: string | string[] | undefined): string[] {
  if (!value) return [];
  const list = Array.isArray(value) ? value : [value];
  return list.map((s) => s.trim()).filter((s) => s.includes('@'));
}

class EmailService {
  isConfigured(): boolean {
    return Boolean(process.env.SMTP_HOST?.trim());
  }

  async send(input: SendEmailInput): Promise<Result<{ sent: boolean; devLog?: boolean }>> {
    const to = parseRecipients(input.to);
    if (to.length === 0) return fail('VALIDATION_ERROR: no recipients');

    const cc = parseRecipients(input.cc);
    const payload = {
      to,
      cc,
      subject: input.subject,
      text: input.text,
      html: input.html ?? input.text.replace(/\n/g, '<br/>'),
    };

    if (!this.isConfigured()) {
      console.log('[EMAIL:DEV] SMTP no configurado — correo simulado:\n', JSON.stringify(payload, null, 2));
      return ok({ sent: false, devLog: true });
    }

    try {
      const nodemailer = await import('nodemailer');
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT ?? 587),
        secure: process.env.SMTP_SECURE === 'true',
        auth: process.env.SMTP_USER
          ? {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASS ?? '',
            }
          : undefined,
      });

      await transporter.sendMail({
        from: process.env.SMTP_FROM ?? 'POS-AI <noreply@pos-ai.local>',
        to: to.join(', '),
        cc: cc.length > 0 ? cc.join(', ') : undefined,
        subject: input.subject,
        text: input.text,
        html: payload.html,
      });
      return ok({ sent: true });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'EMAIL_SEND_FAILED';
      console.error('[EMAIL] send failed:', msg);
      return fail(`EMAIL_SEND_FAILED: ${msg}`);
    }
  }
}

export default new EmailService();
