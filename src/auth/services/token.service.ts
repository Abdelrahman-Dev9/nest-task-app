import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import { UsersService } from '../../users/users.service';
import {
  DEFAULT_ACCESS_TOKEN_TTL_SECONDS,
  RESET_TOKEN_TTL_SECONDS,
} from '../constants';

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly usersService: UsersService,
  ) {}

  async createAccessToken(user: User) {
    const accessToken = await this.jwtService.signAsync(
      {
        sub: user.id,
        email: user.email,
        purpose: 'access',
      },
      {
        expiresIn:
          Number(this.config.get('JWT_EXPIRES_IN_SECONDS')) ||
          DEFAULT_ACCESS_TOKEN_TTL_SECONDS,
        secret: this.config.getOrThrow<string>('JWT_SECRET'),
      },
    );

    return {
      accessToken,
      user: this.usersService.toPublic(user),
    };
  }

  async createResetToken(user: User) {
    return this.jwtService.signAsync(
      {
        sub: user.id,
        email: user.email,
        purpose: 'reset',
      },
      {
        expiresIn: RESET_TOKEN_TTL_SECONDS,
        secret: this.config.getOrThrow<string>('JWT_SECRET'),
      },
    );
  }

  async verifyResetToken(token: string): Promise<{ sub: string }> {
    const payload = await this.jwtService.verifyAsync<{
      sub: string;
      purpose?: string;
    }>(token, {
      secret: this.config.getOrThrow<string>('JWT_SECRET'),
    });

    if (payload.purpose !== 'reset') {
      throw new Error('Invalid reset token purpose');
    }

    return { sub: payload.sub };
  }
}
