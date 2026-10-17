import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly resend: Resend | null;
  private readonly from: string;
  private readonly appName: string;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('RESEND_API_KEY');
    this.resend = apiKey ? new Resend(apiKey) : null;
    this.from =
      this.config.get<string>('RESEND_FROM_EMAIL') ?? 'onboarding@resend.dev';
    this.appName = this.config.get<string>('APP_NAME') ?? 'Snap Task';
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

    if (!this.resend) {
      this.logger.warn(
        `RESEND_API_KEY missing — OTP for ${email}: ${code} (${purpose})`,
      );
      return;
    }

    const { error } = await this.resend.emails.send({
      from: this.from,
      to: email,
      subject,
      html,
    });

    if (error) {
      this.logger.error(`Failed to send OTP email: ${error.message}`);
      throw new InternalServerErrorException('Failed to send email');
    }
  }
}
