import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { OtpPurpose, User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { BCRYPT_ROUNDS } from '../auth/constants';
import { OtpService } from '../auth/services/otp.service';
import { PrismaService } from '../prisma/prisma.service';
import { RequestEmailChangeDto } from './dto/request-email-change.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { VerifyEmailChangeDto } from './dto/verify-email-change.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly otpService: OtpService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
  }

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  create(data: {
    name: string;
    email: string;
    password: string;
  }): Promise<User> {
    return this.prisma.user.create({
      data: {
        name: data.name,
        email: data.email.toLowerCase(),
        password: data.password,
      },
    });
  }

  markEmailVerified(userId: string): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: { emailVerifiedAt: new Date() },
    });
  }

  updatePassword(userId: string, password: string): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: { password },
    });
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    if (!dto.name) {
      throw new BadRequestException('Nothing to update');
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { name: dto.name.trim() },
    });

    return this.toPublic(user);
  }

  async changePassword(userId: string, dto: UpdatePasswordDto) {
    const user = await this.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const matches = await bcrypt.compare(dto.currentPassword, user.password);
    if (!matches) {
      throw new BadRequestException('Current password is incorrect');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS);
    const updated = await this.updatePassword(userId, passwordHash);
    return {
      message: 'Password updated successfully',
      user: this.toPublic(updated),
    };
  }

  async updateAvatar(userId: string, file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Image file is required');
    }

    const user = await this.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const uploaded = await this.cloudinary.uploadImage(file, 'avatars');

    await this.cloudinary.deleteImage(user.avatarPublicId);

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        avatarUrl: uploaded.url,
        avatarPublicId: uploaded.publicId,
      },
    });

    return this.toPublic(updated);
  }

  async requestEmailChange(userId: string, dto: RequestEmailChangeDto) {
    const user = await this.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const newEmail = dto.newEmail.toLowerCase().trim();
    if (newEmail === user.email) {
      throw new BadRequestException('New email must be different');
    }

    const existing = await this.findByEmail(newEmail);
    if (existing) {
      throw new ConflictException('Email is already in use');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { pendingEmail: newEmail },
    });

    await this.otpService.issueAndSend(
      updated,
      OtpPurpose.CHANGE_EMAIL,
      newEmail,
    );

    return {
      message: 'OTP sent to your new email. Verify to complete the change.',
      email: newEmail,
    };
  }

  async verifyEmailChange(userId: string, dto: VerifyEmailChangeDto) {
    const user = await this.findById(userId);
    if (!user?.pendingEmail) {
      throw new BadRequestException('No pending email change');
    }

    const taken = await this.findByEmail(user.pendingEmail);
    if (taken) {
      throw new ConflictException('Email is already in use');
    }

    await this.otpService.consume(userId, dto.code, OtpPurpose.CHANGE_EMAIL);

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        email: user.pendingEmail,
        pendingEmail: null,
        emailVerifiedAt: new Date(),
      },
    });

    return {
      message: 'Email updated successfully',
      user: this.toPublic(updated),
    };
  }

  async resendEmailChangeOtp(userId: string) {
    const user = await this.findById(userId);
    if (!user?.pendingEmail) {
      throw new BadRequestException('No pending email change');
    }

    await this.otpService.issueAndSend(
      user,
      OtpPurpose.CHANGE_EMAIL,
      user.pendingEmail,
    );

    return {
      message: 'A new OTP has been sent to your new email.',
      email: user.pendingEmail,
    };
  }

  toPublic(user: User) {
    const { password: _, avatarPublicId: __, pendingEmail: ___, ...rest } =
      user;
    return rest;
  }
}
