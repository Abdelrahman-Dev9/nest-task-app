import {
  Injectable,
  InternalServerErrorException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null = null;
  private readonly from: string;
  private readonly appName: string;
  private readonly mailUser: string | null;
  private readonly mailPass: string | null;

  constructor(private readonly config: ConfigService) {
    this.mailUser = this.config.get<string>('MAIL_USER')?.trim() || null;
    this.mailPass =
      this.config.get<string>('MAIL_PASSWORD')?.replace(/\s+/g, '').trim() ||
      null;
    this.appName = this.config.get<string>('APP_NAME') ?? 'Snap Task';
    this.from =
      this.config.get<string>('MAIL_FROM')?.trim() ||
      this.mailUser ||
      this.appName;

    if (this.mailUser && this.mailPass) {
      this.transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
          user: this.mailUser,
          pass: this.mailPass,
        },
      });
    } else {
      this.logger.warn(
        'MAIL_USER / MAIL_PASSWORD missing — OTP emails cannot be sent',
      );
    }
  }

  async onModuleInit() {
    if (!this.transporter) return;

    try {
      await this.transporter.verify();
      this.logger.log(`Gmail SMTP ready for ${this.mailUser}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Gmail SMTP verify failed: ${message}`);
    }
  }

  async sendOtp(
    email: string,
    code: string,
    purpose: 'register' | 'reset' | 'change-email',
  ) {
    if (!this.transporter || !this.mailUser || !this.mailPass) {
      throw new InternalServerErrorException(
        'Email is not configured. Set MAIL_USER and MAIL_PASSWORD.',
      );
    }

    const subject =
      purpose === 'register'
        ? `Verify your ${this.appName} account`
        : purpose === 'change-email'
          ? `Confirm your new ${this.appName} email`
          : `Reset your ${this.appName} password`;

    const intro =
      purpose === 'register'
        ? 'Use this code to verify your email and finish registration.'
        : purpose === 'change-email'
          ? 'Use this code to confirm your new email address.'
          : 'Use this code to reset your password.';

    const html = `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>${this.appName}</h2>
        <p>${intro}</p>
        <p style="font-size: 28px; letter-spacing: 6px; font-weight: bold;">${code}</p>
        <p style="color: #666;">This code expires in 15 minutes. If you did not request this, you can ignore this email.</p>
        <p style="color: #666;">If you requested another code, use only the newest one.</p>
      </div>
    `;

    try {
      const info = await this.transporter.sendMail({
        from: `"${this.appName}" <${this.from}>`,
        to: email,
        subject,
        text: `${intro}\n\nYour code: ${code}\n\nThis code expires in 15 minutes.`,
        html,
      });

      this.logger.log(
        `OTP email sent to ${email} (${purpose}) id=${info.messageId}`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to send OTP email: ${message}`);
      throw new InternalServerErrorException('Failed to send email');
    }
  }
}
