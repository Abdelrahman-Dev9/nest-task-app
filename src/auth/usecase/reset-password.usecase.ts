import { Injectable, UnauthorizedException } from '@nestjs/common';
import { OtpPurpose } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../../users/users.service';
import { BCRYPT_ROUNDS } from '../constants';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import { OtpService } from '../services/otp.service';
import { TokenService } from '../services/token.service';

@Injectable()
export class ResetPasswordUseCase {
  constructor(
    private readonly usersService: UsersService,
    private readonly tokenService: TokenService,
    private readonly otpService: OtpService,
  ) {}

  async execute(dto: ResetPasswordDto) {
    let payload: { sub: string };
    try {
      payload = await this.tokenService.verifyResetToken(dto.resetToken);
    } catch {
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS);
    await this.usersService.updatePassword(user.id, passwordHash);
    await this.otpService.invalidateUnused(user.id, OtpPurpose.RESET_PASSWORD);

    return { message: 'Password updated successfully. You can log in now.' };
  }
}
