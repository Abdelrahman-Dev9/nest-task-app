import { Injectable } from '@nestjs/common';
import { OtpPurpose } from '@prisma/client';
import { UsersService } from '../../users/users.service';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { OtpService } from '../services/otp.service';

@Injectable()
export class ForgotPasswordUseCase {
  constructor(
    private readonly usersService: UsersService,
    private readonly otpService: OtpService,
  ) {}

  async execute(dto: ForgotPasswordDto) {
    const user = await this.usersService.findByEmail(dto.email);

    if (user?.emailVerifiedAt) {
      await this.otpService.issueAndSend(user, OtpPurpose.RESET_PASSWORD);
    }

    return {
      message:
        'If an account exists for that email, a password reset OTP has been sent.',
    };
  }
}
