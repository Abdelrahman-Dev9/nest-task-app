import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from './decorators/current-user.decorator';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResendOtpDto } from './dto/resend-otp.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import {
  ForgotPasswordUseCase,
  LoginUseCase,
  RegisterUseCase,
  ResendOtpUseCase,
  ResetPasswordUseCase,
  VerifyEmailUseCase,
  VerifyResetOtpUseCase,
} from './usecase';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly registerUseCase: RegisterUseCase,
    private readonly verifyEmailUseCase: VerifyEmailUseCase,
    private readonly loginUseCase: LoginUseCase,
    private readonly forgotPasswordUseCase: ForgotPasswordUseCase,
    private readonly verifyResetOtpUseCase: VerifyResetOtpUseCase,
    private readonly resetPasswordUseCase: ResetPasswordUseCase,
    private readonly resendOtpUseCase: ResendOtpUseCase,
  ) {}

  @Post('register')
  @ApiOperation({ summary: 'Register with name, email, password and send OTP' })
  register(@Body() dto: RegisterDto) {
    return this.registerUseCase.execute(dto);
  }

  @Post('verify-email')
  @ApiOperation({ summary: 'Verify registration OTP and return access token' })
  verifyEmail(@Body() dto: VerifyOtpDto) {
    return this.verifyEmailUseCase.execute(dto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Login with email and password' })
  login(@Body() dto: LoginDto) {
    return this.loginUseCase.execute(dto);
  }

  @Post('forgot-password')
  @ApiOperation({ summary: 'Send password-reset OTP to email' })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.forgotPasswordUseCase.execute(dto);
  }

  @Post('verify-reset-otp')
  @ApiOperation({ summary: 'Verify reset OTP and receive a reset token' })
  verifyResetOtp(@Body() dto: VerifyOtpDto) {
    return this.verifyResetOtpUseCase.execute(dto);
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Set a new password using the reset token' })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.resetPasswordUseCase.execute(dto);
  }

  @Post('resend-otp')
  @ApiOperation({ summary: 'Resend register or reset OTP' })
  resendOtp(@Body() dto: ResendOtpDto) {
    return this.resendOtpUseCase.execute(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the current authenticated user' })
  me(@CurrentUser() user: unknown) {
    return user;
  }
}
