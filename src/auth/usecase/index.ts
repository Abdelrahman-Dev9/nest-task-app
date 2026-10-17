import { ForgotPasswordUseCase } from './forgot-password.usecase';
import { LoginUseCase } from './login.usecase';
import { RegisterUseCase } from './register.usecase';
import { ResendOtpUseCase } from './resend-otp.usecase';
import { ResetPasswordUseCase } from './reset-password.usecase';
import { VerifyEmailUseCase } from './verify-email.usecase';
import { VerifyResetOtpUseCase } from './verify-reset-otp.usecase';

export {
  ForgotPasswordUseCase,
  LoginUseCase,
  RegisterUseCase,
  ResendOtpUseCase,
  ResetPasswordUseCase,
  VerifyEmailUseCase,
  VerifyResetOtpUseCase,
};

export const AUTH_USE_CASES = [
  RegisterUseCase,
  LoginUseCase,
  VerifyEmailUseCase,
  ForgotPasswordUseCase,
  VerifyResetOtpUseCase,
  ResetPasswordUseCase,
  ResendOtpUseCase,
];
