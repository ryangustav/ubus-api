import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { UBUS_LOGO_BASE64 } from './constants';
import type { Transporter } from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: Transporter | null = null;

  constructor(private config: ConfigService) {
    const host = this.config.get<string>('SMTP_HOST');
    const port = this.config.get<number>('SMTP_PORT', 587);
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASS');

    if (host) {
      const auth = user && pass ? { user, pass } : undefined;
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth,
        tls: {
          rejectUnauthorized: false,
        },
      });
    }
  }

  private getEmailLayout(
    title: string,
    content: string,
    securityNote?: string,
  ): string {
    return `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${title} — UBUS</title>
  <style type="text/css">
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; display: block; }
    body {
      margin: 0 !important;
      padding: 0 !important;
      width: 100% !important;
      background-color: #F2F3F5;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }
  </style>
</head>
<body style="margin: 0 !important; padding: 0 !important; background-color: #F2F3F5;">

  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #F2F3F5;">
    <tr>
      <td align="center" style="padding: 40px 16px 48px 16px;">

        <!-- CARD -->
        <table align="center" border="0" cellpadding="0" cellspacing="0" width="580"
          style="border-collapse: collapse; background-color: #ffffff; border: 1px solid #DDE0E5; border-radius: 4px;">
          <!-- Logo strip -->
          <tr>
            <td style="padding: 24px 40px 20px 40px; border-bottom: 1px solid #DDE0E5;">
              <table border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align: middle;">
                    <img src="data:image/svg+xml;base64,${UBUS_LOGO_BASE64}" width="65" height="44" alt="UBUS" style="display:block;" />
                  </td>
                  <td style="padding-left: 12px; vertical-align: middle;">
                    <span style="font-family: 'Inter', sans-serif; font-size: 26px; font-weight: 800; color: #111111; letter-spacing: -1.25px; line-height: 1;">ubus</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>


          <!-- Body -->
          <tr>
            <td style="padding: 36px 40px 32px 40px;">
              ${content}

              ${
                securityNote
                  ? `
                <!-- Divider -->
                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 32px 0 0 0;">
                  <tr><td height="1" style="background-color: #EEF0F3; font-size: 0; line-height: 0;">&nbsp;</td></tr>
                </table>

                <!-- Security note -->
                <p style="margin: 20px 0 0 0; font-family: 'Inter', sans-serif; font-size: 13px; line-height: 1.6; color: #64748B;">
                  ${securityNote}
                </p>
              `
                  : ''
              }
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px; background-color: #F8F9FB; border-top: 1px solid #DDE0E5; border-radius: 0 0 4px 4px;">
              <p style="margin: 0 0 3px 0; font-family: 'Inter', sans-serif; font-size: 11px; color: #94A3B8; line-height: 1.5;">
                Esta mensagem foi gerada automaticamente pelo sistema UBUS. Por favor, não responda a este e-mail.
              </p>
              <p style="margin: 0; font-family: 'Inter', sans-serif; font-size: 11px; color: #CBD5E1;">
                &copy; ${new Date().getFullYear()} UBUS Platform. Todos os direitos reservados.
              </p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>
    `.trim();
  }

  getRegistrationEmailHtml(userName: string): string {
    const title = 'Bem-vindo ao UBUS';
    const content = `
      <p style="margin: 0 0 20px 0; font-family: 'Inter', sans-serif; font-size: 14px; color: #475569;">Olá, ${userName}!</p>
      <p style="margin: 0 0 14px 0; font-family: 'Inter', sans-serif; font-size: 15px; line-height: 1.65; color: #1E293B;">
        Seu cadastro no UBUS foi realizado com sucesso. Estamos muito felizes em ter você conosco!
      </p>
      <div style="margin: 28px 0; padding: 20px; background-color: #EFF6FF; border-radius: 4px; border: 1px solid #BFDBFE;">
        <p style="margin: 0; font-family: 'Inter', sans-serif; font-size: 14px; color: #1E40AF; font-weight: 500;">
          Status: Seu cadastro está pendente de aprovação pela administração. Você será notificado assim que puder utilizar todos os serviços.
        </p>
      </div>
    `;
    return this.getEmailLayout(title, content);
  }

  getVerificationEmailHtml(userName: string, code: string): string {
    const title = 'Verifique seu e-mail';
    const content = `
      <p style="margin: 0 0 20px 0; font-family: 'Inter', sans-serif; font-size: 14px; color: #475569;">Olá, ${userName}!</p>
      <p style="margin: 0 0 14px 0; font-family: 'Inter', sans-serif; font-size: 15px; line-height: 1.65; color: #1E293B;">
        Use o código abaixo para confirmar seu endereço de e-mail e completar seu cadastro no UBUS:
      </p>
      <div style="margin: 28px 0; padding: 32px; background-color: #F8FAFC; border-radius: 4px; border: 2px dashed #E2E8F0; text-align: center;">
        <span style="font-family: 'Inter', -apple-system, system-ui, sans-serif; font-size: 36px; font-weight: 800; color: #1A56DB; letter-spacing: 12px; margin-left: 12px;">${code}</span>
      </div>
      <p style="margin: 0; font-family: 'Inter', sans-serif; font-size: 14px; line-height: 1.6; color: #64748B;">
        Este código é válido por <strong style="color: #0F172A; font-weight: 600;">24 horas</strong>.
      </p>
    `;
    return this.getEmailLayout(title, content, 'Se você não solicitou este registro, por favor ignore esta mensagem.');
  }

  async sendVerificationCode(
    to: string,
    userName: string,
    code: string,
  ): Promise<void> {
    const from = this.config.get<string>('SMTP_FROM', 'noreply@ubus.local');
    const subject = `Código de Verificação: ${code}`;
    const html = this.getVerificationEmailHtml(userName, code);

    if (this.transporter) {
      await this.transporter.sendMail({ from, to, subject, html });
    } else {
      console.log(`[EmailService] Verification code for ${to}: ${code}`);
    }
  }

  getPasswordResetEmailHtml(resetUrl: string): string {
    const title = 'Redefinição de Senha';
    const content = `
      <p style="margin: 0 0 20px 0; font-family: 'Inter', sans-serif; font-size: 14px; color: #475569;">Olá,</p>
      <p style="margin: 0 0 14px 0; font-family: 'Inter', sans-serif; font-size: 15px; line-height: 1.65; color: #1E293B;">
        Recebemos uma solicitação de redefinição de senha para a sua conta.
      </p>
      <p style="margin: 0 0 28px 0; font-family: 'Inter', sans-serif; font-size: 15px; line-height: 1.65; color: #1E293B;">
        Para criar uma nova senha, clique no botão abaixo. O link é válido por <strong style="color: #0F172A; font-weight: 600;">1 hora</strong> a partir do envio deste e-mail.
      </p>

      <!-- CTA -->
      <table border="0" cellpadding="0" cellspacing="0">
        <tr>
          <td align="center" style="border-radius: 3px; background-color: #1A56DB;">
            <a href="${resetUrl}"
              target="_blank"
              style="display: inline-block; padding: 12px 28px; font-family: 'Inter', sans-serif; font-size: 14px; font-weight: 500; color: #ffffff; text-decoration: none; border-radius: 3px;">
              Redefinir senha
            </a>
          </td>
        </tr>
      </table>
    `;
    const securityNote = 'Se você não solicitou esta alteração, nenhuma ação é necessária — sua senha permanece inalterada. Caso suspeite de acesso não autorizado à sua conta, entre em contato com o suporte.';
    return this.getEmailLayout(title, content, securityNote);
  }

  async sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
    const from = this.config.get<string>('SMTP_FROM', 'noreply@ubus.local');
    const subject = 'Password Reset - UBUS';
    const html = this.getPasswordResetEmailHtml(resetUrl);

    if (this.transporter) {
      await this.transporter.sendMail({
        from,
        to,
        subject,
        html,
      });
    } else {
      console.log(`[EmailService] Password reset link for ${to}: ${resetUrl}`);
    }
  }
}
