/**
 * Email Service for VendHub OS
 * SMTP-based email delivery via NodeMailer with graceful degradation
 */

import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as nodemailer from "nodemailer";
import { SendEmailDto } from "./dto/send-email.dto";

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private readonly configService: ConfigService) {}

  // ============================================================================
  // Configuration Helpers
  // ============================================================================

  /**
   * Check whether SMTP is configured (host must be set)
   */
  isConfigured(): boolean {
    return !!this.configService.get<string>("SMTP_HOST");
  }

  /**
   * Get or lazily create the NodeMailer transport
   */
  private getTransporter(): nodemailer.Transporter | null {
    if (this.transporter) {
      return this.transporter;
    }

    if (!this.isConfigured()) {
      this.logger.warn(
        "SMTP is not configured (SMTP_HOST missing). Emails will not be sent.",
      );
      return null;
    }

    const host = this.configService.get<string>("SMTP_HOST");
    const port = this.configService.get<number>("SMTP_PORT", 587);
    const user = this.configService.get<string>("SMTP_USER");
    const pass = this.configService.get<string>("SMTP_PASSWORD");

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth:
        user && pass
          ? {
              user,
              pass,
            }
          : undefined,
    });

    this.logger.log(`SMTP transport created: ${host}:${port}`);
    return this.transporter;
  }

  /**
   * Build the "from" address from env vars
   */
  private getFromAddress(): string {
    const email = this.configService.get<string>(
      "SMTP_FROM_EMAIL",
      "noreply@vendhub.com",
    );
    const name = this.configService.get<string>("SMTP_FROM_NAME", "VendHub");
    return `"${name}" <${email}>`;
  }

  /**
   * Get frontend URL for links in emails
   */
  private getFrontendUrl(): string {
    return this.configService.get<string>(
      "FRONTEND_URL",
      "http://localhost:3000",
    );
  }

  // ============================================================================
  // Public API
  // ============================================================================

  /**
   * Send a generic email
   */
  async sendEmail(
    options: SendEmailDto,
  ): Promise<{ messageId: string; accepted: string[] }> {
    const transporter = this.getTransporter();

    if (!transporter) {
      this.logger.warn(
        `Email not sent (SMTP not configured): subject="${options.subject}"`,
      );
      return { messageId: "", accepted: [] };
    }

    const to = Array.isArray(options.to) ? options.to.join(", ") : options.to;

    try {
      const info = await transporter.sendMail({
        from: this.getFromAddress(),
        to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });

      this.logger.log(
        `Email sent: messageId=${info.messageId}, to=${to}, subject="${options.subject}"`,
      );

      return {
        messageId: info.messageId,
        accepted: Array.isArray(info.accepted) ? info.accepted.map(String) : [],
      };
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(
        `Failed to send email to=${to}, subject="${options.subject}": ${err.message}`,
        err.stack,
      );
      throw error;
    }
  }

  /**
   * Send welcome/onboarding email (Russian template)
   */
  async sendWelcomeEmail(
    to: string,
    name: string,
    role: string,
  ): Promise<void> {
    const frontendUrl = this.getFrontendUrl();

    const bodyContent = `
      <h2 style="color: #1e293b; margin: 0 0 16px;">
        Добро пожаловать в VendHub! / VendHub-ga xush kelibsiz!
      </h2>
      <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 12px;">
        Здравствуйте, <strong>${name}</strong>!
      </p>
      <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 12px;">
        Ваш аккаунт в системе VendHub успешно создан. Вам назначена роль: <strong>${role}</strong>.
      </p>
      <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
        Sizning VendHub tizimidagi akkauntingiz muvaffaqiyatli yaratildi. Sizga tayinlangan rol: <strong>${role}</strong>.
      </p>
      <div style="text-align: center; margin: 24px 0;">
        <a href="${frontendUrl}" style="background-color: #2563EB; color: #ffffff; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block;">
          Войти в систему / Tizimga kirish
        </a>
      </div>
      <p style="color: #94a3b8; font-size: 14px; margin: 24px 0 0;">
        Если вы не регистрировались в VendHub, проигнорируйте это письмо.
      </p>
    `;

    await this.sendEmail({
      to,
      subject: "Добро пожаловать в VendHub / VendHub-ga xush kelibsiz",
      html: this.buildHtmlTemplate(
        "Добро пожаловать / Xush kelibsiz",
        bodyContent,
      ),
      text: `Здравствуйте, ${name}! Ваш аккаунт в VendHub создан. Роль: ${role}. Войдите: ${frontendUrl}`,
    });
  }

  /**
   * Send password reset email with reset link
   */
  async sendPasswordResetEmail(
    to: string,
    name: string,
    resetToken: string,
  ): Promise<void> {
    const frontendUrl = this.getFrontendUrl();
    const resetUrl = `${frontendUrl}/auth/reset-password?token=${resetToken}`;

    const bodyContent = `
      <h2 style="color: #1e293b; margin: 0 0 16px;">
        Сброс пароля / Parolni tiklash
      </h2>
      <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 12px;">
        Здравствуйте, <strong>${name}</strong>!
      </p>
      <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 12px;">
        Мы получили запрос на сброс вашего пароля. Нажмите на кнопку ниже, чтобы создать новый пароль.
      </p>
      <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
        Biz sizning parolingizni tiklash so'rovini oldik. Yangi parol yaratish uchun quyidagi tugmani bosing.
      </p>
      <div style="text-align: center; margin: 24px 0;">
        <a href="${resetUrl}" style="background-color: #2563EB; color: #ffffff; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block;">
          Сбросить пароль / Parolni tiklash
        </a>
      </div>
      <p style="color: #94a3b8; font-size: 14px; margin: 24px 0 0;">
        Ссылка действительна в течение 1 часа. Если вы не запрашивали сброс пароля, проигнорируйте это письмо.<br/>
        Havola 1 soat davomida amal qiladi. Agar siz parolni tiklashni so'ramagan bo'lsangiz, bu xatni e'tiborsiz qoldiring.
      </p>
    `;

    await this.sendEmail({
      to,
      subject: "Сброс пароля VendHub / VendHub parolni tiklash",
      html: this.buildHtmlTemplate(
        "Сброс пароля / Parolni tiklash",
        bodyContent,
      ),
      text: `Здравствуйте, ${name}! Для сброса пароля перейдите по ссылке: ${resetUrl}. Ссылка действительна 1 час.`,
    });
  }

  /**
   * Send task notification email
   */
  async sendTaskNotification(
    to: string,
    taskType: string,
    machineNumber: string,
    dueDate?: Date,
  ): Promise<void> {
    const dueDateStr = dueDate
      ? dueDate.toLocaleDateString("ru-RU", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "Asia/Tashkent",
        })
      : "Не указан / Belgilanmagan";

    const bodyContent = `
      <h2 style="color: #1e293b; margin: 0 0 16px;">
        Новая задача / Yangi vazifa
      </h2>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; color: #64748b; font-size: 14px; width: 40%;">
            Тип задачи / Vazifa turi
          </td>
          <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; color: #1e293b; font-size: 14px; font-weight: 600;">
            ${taskType}
          </td>
        </tr>
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; color: #64748b; font-size: 14px;">
            Автомат / Avtomat
          </td>
          <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; color: #1e293b; font-size: 14px; font-weight: 600;">
            ${machineNumber}
          </td>
        </tr>
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; color: #64748b; font-size: 14px;">
            Срок / Muddat
          </td>
          <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; color: #1e293b; font-size: 14px; font-weight: 600;">
            ${dueDateStr}
          </td>
        </tr>
      </table>
      <div style="text-align: center; margin: 24px 0;">
        <a href="${this.getFrontendUrl()}/tasks" style="background-color: #2563EB; color: #ffffff; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block;">
          Открыть задачи / Vazifalarni ochish
        </a>
      </div>
    `;

    await this.sendEmail({
      to,
      subject: `Новая задача: ${taskType} — ${machineNumber} / Yangi vazifa`,
      html: this.buildHtmlTemplate(
        "Уведомление о задаче / Vazifa haqida xabar",
        bodyContent,
      ),
      text: `Новая задача: ${taskType}, автомат: ${machineNumber}, срок: ${dueDateStr}`,
    });
  }

  /**
   * Send low stock alert email
   */
  async sendLowStockAlert(
    to: string,
    machineNumber: string,
    items: { name: string; current: number; min: number }[],
  ): Promise<void> {
    const itemRows = items
      .map(
        (item) => `
        <tr>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; color: #1e293b; font-size: 14px;">
            ${item.name}
          </td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; color: #dc2626; font-size: 14px; font-weight: 600; text-align: center;">
            ${item.current}
          </td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; color: #64748b; font-size: 14px; text-align: center;">
            ${item.min}
          </td>
        </tr>
      `,
      )
      .join("");

    const bodyContent = `
      <h2 style="color: #dc2626; margin: 0 0 8px;">
        &#9888; Низкий остаток / Kam qoldiq
      </h2>
      <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
        Автомат / Avtomat: <strong>${machineNumber}</strong>
      </p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <thead>
          <tr style="background-color: #f8fafc;">
            <th style="padding: 10px 12px; text-align: left; color: #64748b; font-size: 13px; font-weight: 600; border-bottom: 2px solid #e2e8f0;">
              Товар / Mahsulot
            </th>
            <th style="padding: 10px 12px; text-align: center; color: #64748b; font-size: 13px; font-weight: 600; border-bottom: 2px solid #e2e8f0;">
              Текущий / Joriy
            </th>
            <th style="padding: 10px 12px; text-align: center; color: #64748b; font-size: 13px; font-weight: 600; border-bottom: 2px solid #e2e8f0;">
              Мин. / Min.
            </th>
          </tr>
        </thead>
        <tbody>
          ${itemRows}
        </tbody>
      </table>
      <div style="text-align: center; margin: 24px 0;">
        <a href="${this.getFrontendUrl()}/inventory" style="background-color: #dc2626; color: #ffffff; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block;">
          Проверить остатки / Qoldiqlarni tekshirish
        </a>
      </div>
    `;

    await this.sendEmail({
      to,
      subject: `Низкий остаток: ${machineNumber} (${items.length} поз.) / Kam qoldiq`,
      html: this.buildHtmlTemplate(
        "Оповещение об остатках / Qoldiq haqida ogohlantirish",
        bodyContent,
      ),
      text: `Низкий остаток в автомате ${machineNumber}: ${items.map((i) => `${i.name} (${i.current}/${i.min})`).join(", ")}`,
    });
  }

  /**
   * Verify SMTP connection
   */
  async verifyConnection(): Promise<boolean> {
    const transporter = this.getTransporter();

    if (!transporter) {
      this.logger.warn("Cannot verify SMTP connection: not configured");
      return false;
    }

    try {
      await transporter.verify();
      this.logger.log("SMTP connection verified successfully");
      return true;
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(
        `SMTP connection verification failed: ${err.message}`,
        err.stack,
      );
      return false;
    }
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  /**
   * Build a consistent HTML email wrapper with VendHub branding
   */
  private buildHtmlTemplate(title: string, bodyContent: string): string {
    return `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f1f5f9;">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">
          <!-- Header -->
          <tr>
            <td style="background-color: #2563EB; padding: 24px 32px; border-radius: 12px 12px 0 0; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">
                VendHub
              </h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="background-color: #ffffff; padding: 32px; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0;">
              ${bodyContent}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 20px 32px; border-radius: 0 0 12px 12px; border: 1px solid #e2e8f0; border-top: none; text-align: center;">
              <p style="color: #94a3b8; font-size: 12px; margin: 0; line-height: 1.5;">
                &copy; ${new Date().getFullYear()} VendHub. Все права защищены / Barcha huquqlar himoyalangan.<br/>
                Это автоматическое сообщение. Не отвечайте на него.<br/>
                Bu avtomatik xabar. Unga javob bermang.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }
}
