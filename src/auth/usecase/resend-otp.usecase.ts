import { Injectable } from '@nestjs/common';
import { OtpPurpose } from '@prisma/client';
import { UsersService } from '../../users/users.service';
import { ResendOtpDto } from '../dto/resend-otp.dto';
import { OtpService } from '../services/otp.service';

@Injectable()
export class ResendOtpUseCase {
  constructor(
    private readonly usersService: UsersService,
    private readonly otpService: OtpService,
  ) {}

  async execute(dto: ResendOtpDto) {
    const user = await this.usersService.findByEmail(dto.email);
    const purpose =
      dto.purpose === 'register'
        ? OtpPurpose.REGISTER
        : OtpPurpose.RESET_PASSWORD;

    if (dto.purpose === 'register') {
      if (user && !user.emailVerifiedAt) {
        await this.otpService.issueAndSend(user, purpose);
      }
    } else if (user?.emailVerifiedAt) {
      await this.otpService.issueAndSend(user, purpose);
    }

    return {
      message: 'If eligible, a new OTP has been sent to your email.',
    };
  }
}
