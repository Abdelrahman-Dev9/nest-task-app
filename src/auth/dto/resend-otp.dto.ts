import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsIn } from 'class-validator';

export class ResendOtpDto {
  @ApiProperty({ example: 'jane@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ enum: ['register', 'reset'] })
  @IsIn(['register', 'reset'])
  purpose: 'register' | 'reset';
}
