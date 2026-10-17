import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter | null;
  private readonly from: string;
  private readonly appName: string;

  constructor(private readonly config: ConfigService) {
    const user = this.config.get<string>('MAIL_USER');
    const pass = this.config.get<string>('MAIL_PASSWORD')?.replace(/\s+/g, '');
    this.appName = this.config.get<string>('APP_NAME') ?? 'Snap Task';
    this.from = this.config.get<string>('MAIL_FROM') ?? user ?? this.appName;

    if (user && pass) {
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user, pass },
      });
    } else {
      this.transporter = null;
      this.logger.warn(
        'MAIL_USER / MAIL_PASSWORD missing — OTP emails will be logged only',
      );
    }
  }

  async sendOtp(email: string, code: string, purpose: 'register' | 'reset') {
    const subject =
      purpose === 'register'
        ? `Verify your ${this.appName} account`
        : `Reset your ${this.appName} password`;

    const intro =
      purpose === 'register'
        ? 'Use this code to verify your email and finish registration.'
        : 'Use this code to reset your password.';

    const html = `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>${this.appName}</h2>
        <p>${intro}</p>
        <p style="font-size: 28px; letter-spacing: 6px; font-weight: bold;">${code}</p>
        <p style="color: #666;">This code expires in 15 minutes. If you did not request this, you can ignore this email.</p>
      </div>
    `;

    if (!this.transporter) {
      this.logger.warn(`OTP for ${email}: ${code} (${purpose})`);
      return;
    }

    try {
      await this.transporter.sendMail({
        from: `"${this.appName}" <${this.from}>`,
        to: email,
        subject,
        html,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to send OTP email: ${message}`);
      throw new InternalServerErrorException('Failed to send email');
    }
  }
}
