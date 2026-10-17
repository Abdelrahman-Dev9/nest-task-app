import { ConflictException, Injectable } from '@nestjs/common';
import { OtpPurpose, User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { UsersService } from '../../users/users.service';
import { BCRYPT_ROUNDS } from '../constants';
import { RegisterDto } from '../dto/register.dto';
import { OtpService } from '../services/otp.service';

@Injectable()
export class RegisterUseCase {
  constructor(
    private readonly usersService: UsersService,
    private readonly prisma: PrismaService,
    private readonly otpService: OtpService,
  ) {}

  async execute(dto: RegisterDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing?.emailVerifiedAt) {
      throw new ConflictException('Email is already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    let user: User;
    if (existing && !existing.emailVerifiedAt) {
      user = await this.prisma.user.update({
        where: { id: existing.id },
        data: {
          name: dto.name,
          password: passwordHash,
        },
      });
    } else {
      user = await this.usersService.create({
        name: dto.name,
        email: dto.email,
        password: passwordHash,
      });
    }

    await this.otpService.issueAndSend(user, OtpPurpose.REGISTER);

    return {
      message:
        'Registration started. Check your email for the verification OTP.',
      email: user.email,
    };
  }
}
