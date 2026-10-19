import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { MailModule } from '../mail/mail.module';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { ClerkOrJwtAuthGuard } from './guards/clerk-or-jwt-auth.guard';
import { ClerkService } from './services/clerk.service';
import { OtpService } from './services/otp.service';
import { TokenService } from './services/token.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { AUTH_USE_CASES } from './usecase';

@Module({
  imports: [
    forwardRef(() => UsersModule),
    MailModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn:
            Number(config.get('JWT_EXPIRES_IN_SECONDS')) || 60 * 60 * 24 * 7,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    OtpService,
    TokenService,
    JwtStrategy,
    ClerkService,
    ClerkOrJwtAuthGuard,
    ...AUTH_USE_CASES,
  ],
  exports: [OtpService, ClerkService, ClerkOrJwtAuthGuard],
})
export class AuthModule {}
