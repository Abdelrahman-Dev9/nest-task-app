import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequestEmailChangeDto } from './dto/request-email-change.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { VerifyEmailChangeDto } from './dto/verify-email-change.dto';
import { UsersService } from './users.service';

type AuthUser = {
  id: string;
  name: string;
  email: string;
};

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get the current authenticated user' })
  me(@CurrentUser() user: AuthUser) {
    return user;
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update profile name' })
  updateProfile(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(user.id, dto);
  }

  @Patch('me/password')
  @ApiOperation({ summary: 'Change password with current password' })
  changePassword(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdatePasswordDto,
  ) {
    return this.usersService.changePassword(user.id, dto);
  }

  @Post('me/avatar')
  @ApiOperation({ summary: 'Upload or replace profile avatar' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
      required: ['file'],
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  updateAvatar(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.usersService.updateAvatar(user.id, file);
  }

  @Post('me/email/request')
  @ApiOperation({ summary: 'Request email change and send OTP to new email' })
  requestEmailChange(
    @CurrentUser() user: AuthUser,
    @Body() dto: RequestEmailChangeDto,
  ) {
    return this.usersService.requestEmailChange(user.id, dto);
  }

  @Post('me/email/verify')
  @ApiOperation({ summary: 'Verify email-change OTP' })
  verifyEmailChange(
    @CurrentUser() user: AuthUser,
    @Body() dto: VerifyEmailChangeDto,
  ) {
    return this.usersService.verifyEmailChange(user.id, dto);
  }

  @Post('me/email/resend')
  @ApiOperation({ summary: 'Resend email-change OTP' })
  resendEmailChange(@CurrentUser() user: AuthUser) {
    return this.usersService.resendEmailChangeOtp(user.id);
  }
}
