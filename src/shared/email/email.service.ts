import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: Transporter | null = null;

  constructor(private config: ConfigService) {
    const host = this.config.get<string>('SMTP_HOST');
    const port = this.config.get<number>('SMTP_PORT', 587);
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASS');

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
    }
  }

  getPasswordResetEmailHtml(resetUrl: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password reset - UBUS</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5;">
  <div style="max-width: 480px; margin: 24px auto; padding: 24px; background: #fff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
    <h1 style="margin: 0 0 16px; font-size: 20px; color: #333;">Redefinição de senha</h1>
    <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.5; color: #555;">
      Você solicitou a redefinição de senha. Clique no botão abaixo para criar uma nova senha.
    </p>
    <p style="margin: 0 0 24px; font-size: 13px; color: #888;">
      O link expira em 1 hora.
    </p>
    <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background: #2563eb; color: #fff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">Redefinir senha</a>
    <p style="margin: 24px 0 0; font-size: 13px; color: #888; border-top: 1px solid #eee; padding-top: 16px;">
      Se você não solicitou isso, ignore este e-mail.
    </p>
  </div>
</body>
</html>
    `.trim();
  }

  async sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
    const from = this.config.get<string>('SMTP_FROM', 'noreply@ubus.local');
    const subject = 'Redefinição de senha - UBUS';
    const html = this.getPasswordResetEmailHtml(resetUrl);

    if (this.transporter) {
      await this.transporter.sendMail({
        from,
        to,
        subject,
        html,
      });
    } else {
      // Development: log the link when SMTP is not configured
      console.log(`[EmailService] Password reset link for ${to}: ${resetUrl}`);
    }
  }
}
