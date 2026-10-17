import { BadRequestException, Injectable } from '@nestjs/common';
import { OtpPurpose, User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomInt } from 'crypto';
import { MailService } from '../../mail/mail.service';
import { PrismaService } from '../../prisma/prisma.service';
import { BCRYPT_ROUNDS, OTP_TTL_MS } from '../constants';

@Injectable()
export class OtpService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  async issueAndSend(user: User, purpose: OtpPurpose) {
    await this.prisma.otp.updateMany({
      where: { userId: user.id, purpose, usedAt: null },
      data: { usedAt: new Date() },
    });

    const code = randomInt(100000, 1000000).toString();
    const codeHash = await bcrypt.hash(code, BCRYPT_ROUNDS);

    await this.prisma.otp.create({
      data: {
        userId: user.id,
        purpose,
        codeHash,
        expiresAt: new Date(Date.now() + OTP_TTL_MS),
      },
    });

    const mailPurpose =
      purpose === OtpPurpose.REGISTER ? 'register' : 'reset';
    await this.mailService.sendOtp(user.email, code, mailPurpose);
  }

  async consume(userId: string, code: string, purpose: OtpPurpose) {
    const otp = await this.prisma.otp.findFirst({
      where: {
        userId,
        purpose,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otp) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    const matches = await bcrypt.compare(code, otp.codeHash);
    if (!matches) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    await this.prisma.otp.update({
      where: { id: otp.id },
      data: { usedAt: new Date() },
    });
  }

  async invalidateUnused(userId: string, purpose: OtpPurpose) {
    await this.prisma.otp.updateMany({
      where: { userId, purpose, usedAt: null },
      data: { usedAt: new Date() },
    });
  }
}
