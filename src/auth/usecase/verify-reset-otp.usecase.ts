import { BadRequestException, Injectable } from '@nestjs/common';
import { OtpPurpose } from '@prisma/client';
import { UsersService } from '../../users/users.service';
import { VerifyOtpDto } from '../dto/verify-otp.dto';
import { OtpService } from '../services/otp.service';
import { TokenService } from '../services/token.service';

@Injectable()
export class VerifyResetOtpUseCase {
  constructor(
    private readonly usersService: UsersService,
    private readonly otpService: OtpService,
    private readonly tokenService: TokenService,
  ) {}

  async execute(dto: VerifyOtpDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new BadRequestException('Invalid email or OTP');
    }

    if (!user.emailVerifiedAt) {
      throw new BadRequestException('Email is not verified');
    }

    await this.otpService.consume(
      user.id,
      dto.code,
      OtpPurpose.RESET_PASSWORD,
    );

    const resetToken = await this.tokenService.createResetToken(user);

    return {
      message: 'OTP verified. Use the reset token to set a new password.',
      resetToken,
    };
  }
}
