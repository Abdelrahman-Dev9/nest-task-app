import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({
    description: 'Short-lived token returned from verify-reset-otp',
  })
  @IsString()
  @MinLength(10)
  resetToken: string;

  @ApiProperty({
    example: 'NewSecret1!',
    description:
      'Min 8 chars, with uppercase, lowercase, number, and special character',
  })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/, {
    message:
      'password must be at least 8 characters and include uppercase, lowercase, number, and special character',
  })
  newPassword: string;
}
